# MILKYWAY_SDK_HARDENING.md
## SDK Hardening — Six Additions
### For Claude Code

Read alongside MILKYWAY_CLI.md and MILKYWAY_X402_SDK.md.
All changes are in `sdk/packages/agent-sdk/src/`.
No changes to contracts, backend, or frontend.

Six hardening additions:
  1. Input coercion
  2. Idempotency (job_id deduplication)
  3. Handler timeout
  4. Output validation
  5. Graceful shutdown
  6. Request logging

---

## 1. Input Coercion

### The Problem
A field declared as `number` receives `"10"` (a string).
Currently fails validation with a confusing error.
It's obviously intended as 10. Coerce it safely.

### Coercion Rules

```
Source type → Target type    Action
──────────────────────────────────────────────────
string      → number         parseFloat — fail if NaN
string      → boolean        "true"/"1" → true, "false"/"0" → false
number      → string         String(value)
number      → boolean        0 → false, anything else → true
boolean     → string         "true" / "false"
boolean     → number         1 / 0
array       → array          no coercion — pass through
object      → object         no coercion — pass through
```

Unsafe coercions (object → number etc.) are rejected with a clear error.

### Implementation

**File: `sdk/packages/agent-sdk/src/validator.ts`**

Add `coerceInput()` function. Call it BEFORE `validateInput()`:

```typescript
import { AgentSchema, FieldDef } from "./types";
import { ValidationError }       from "./errors";

// Coerce input fields to their declared types where safely possible
export function coerceInput(
  input:  Record<string, any>,
  schema: AgentSchema
): Record<string, any> {
  const coerced: Record<string, any> = { ...input };

  for (const [field, def] of Object.entries(schema)) {
    const value = coerced[field];
    if (value === undefined || value === null) continue;

    const targetType = (def as FieldDef).type;
    const sourceType = Array.isArray(value) ? "array" : typeof value;

    if (sourceType === targetType) continue;  // already correct type

    try {
      coerced[field] = coerce(value, sourceType, targetType, field);
    } catch (err: any) {
      throw new ValidationError(err.message);
    }
  }

  return coerced;
}

function coerce(
  value:      any,
  sourceType: string,
  targetType: string,
  field:      string
): any {
  // string → number
  if (sourceType === "string" && targetType === "number") {
    const n = parseFloat(value);
    if (isNaN(n)) {
      throw new Error(
        `Field "${field}": cannot coerce "${value}" to number`
      );
    }
    return n;
  }

  // string → boolean
  if (sourceType === "string" && targetType === "boolean") {
    if (value === "true"  || value === "1") return true;
    if (value === "false" || value === "0") return false;
    throw new Error(
      `Field "${field}": cannot coerce "${value}" to boolean. ` +
      `Use "true", "false", "1", or "0"`
    );
  }

  // number → string
  if (sourceType === "number" && targetType === "string") {
    return String(value);
  }

  // number → boolean
  if (sourceType === "number" && targetType === "boolean") {
    return value !== 0;
  }

  // boolean → string
  if (sourceType === "boolean" && targetType === "string") {
    return String(value);
  }

  // boolean → number
  if (sourceType === "boolean" && targetType === "number") {
    return value ? 1 : 0;
  }

  // Anything else — unsafe
  throw new Error(
    `Field "${field}": cannot coerce ${sourceType} to ${targetType}`
  );
}
```

**Update `router.ts`** — add coercion step before validation:

```typescript
// In buildExecuteHandler, replace:
const validatedInput = validateInput(body.task?.input || {}, capabilityDef.input_schema);

// With:
const coercedInput  = coerceInput(body.task?.input || {}, capabilityDef.input_schema);
const validatedInput = validateInput(coercedInput, capabilityDef.input_schema);
```

---

## 2. Idempotency — Job ID Deduplication

### The Problem
The execution engine retries failed requests.
If a request reaches the agent, the handler runs, but the
network drops before the response arrives — the engine retries.
The handler runs twice. The developer's logic executes twice.
For actions like sending a message or executing a trade — this is catastrophic.

### Solution
Cache results by `job_id`. Same job_id always returns the same result.

### Implementation

**New file: `sdk/packages/agent-sdk/src/idempotency.ts`**

```typescript
interface CachedResult {
  response:   any;
  cachedAt:   number;
}

// In-memory cache — fine for single process
// Replace with Redis for multi-instance production
const cache = new Map<string, CachedResult>();

// TTL: 10 minutes
// Long enough to handle retries
// Short enough not to leak memory forever
const TTL_MS = 10 * 60 * 1000;

export function getCachedResult(jobId: string): any | null {
  const entry = cache.get(jobId);
  if (!entry) return null;

  // Expired
  if (Date.now() - entry.cachedAt > TTL_MS) {
    cache.delete(jobId);
    return null;
  }

  return entry.response;
}

export function cacheResult(jobId: string, response: any): void {
  cache.set(jobId, { response, cachedAt: Date.now() });

  // Clean up expired entries periodically
  // Don't let the cache grow unbounded
  if (cache.size > 10_000) {
    pruneCache();
  }
}

function pruneCache(): void {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (now - entry.cachedAt > TTL_MS) {
      cache.delete(key);
    }
  }
}

export function clearCache(): void {
  cache.clear();
}
```

**Update `router.ts`** — check cache before running handler:

```typescript
import { getCachedResult, cacheResult } from "./idempotency";

// In buildExecuteHandler, add BEFORE capability routing:

const jobId = body.job_id;

// Check idempotency cache
if (jobId) {
  const cached = getCachedResult(jobId);
  if (cached) {
    // Return exact same response — handler not called again
    return res.json(cached);
  }
}

// ... run handler as normal ...

// After handler succeeds, cache the result:
const response = {
  milkyway_version: "1.0",
  job_id:           jobId,
  status:           "completed",
  output,
  completed_at: Math.floor(Date.now() / 1000)
};

if (jobId) {
  cacheResult(jobId, response);
}

res.json(response);
```

---

## 3. Handler Timeout

### The Problem
The SDK checks the deadline on the incoming request.
But if the developer's handler runs past the deadline —
the SDK waits forever.
The user's payment window expires. The facilitator's
authorization becomes invalid. The whole flow breaks.

### Solution
Wrap every handler call in a `Promise.race` against a deadline timer.
If the handler doesn't finish before the deadline — cancel it,
return 408, skip payment settlement.

### Implementation

**New file: `sdk/packages/agent-sdk/src/timeout.ts`**

```typescript
import { DeadlineError } from "./errors";

export function withTimeout<T>(
  promise:       Promise<T>,
  deadlineEpoch: number        // unix seconds
): Promise<T> {
  const msRemaining = (deadlineEpoch * 1000) - Date.now() - 1000;
  // -1000ms buffer — give 1 second for response transmission

  if (msRemaining <= 0) {
    return Promise.reject(new DeadlineError());
  }

  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new DeadlineError()),
        msRemaining
      )
    )
  ]);
}
```

**Update `router.ts`** — wrap handler in timeout:

```typescript
import { withTimeout } from "./timeout";

// Replace:
const output = await handler(validatedInput);

// With:
const output = await withTimeout(
  handler(validatedInput),
  body.deadline
);
```

That's it. If the handler takes too long:
- `DeadlineError` is thrown
- Caught by the existing error handler
- Returns HTTP 408
- Payment settlement is skipped (per MILKYWAY_SETTLE_PATCH.md)
- User's USDC never moves

---

## 4. Output Validation

### The Problem
The SDK validates inputs rigorously.
But it never checks that the handler's return value
matches `output_schema`.
A handler returning `{ result: 42 }` when `result: string`
is declared passes through silently.
External agents and the visual builder break on unexpected types.

### Solution
Validate handler output against `output_schema`.
In dev mode: warn and pass through (don't break development).
In production: enforce strictly and return 500 if schema violated.

### Implementation

**Add to `sdk/packages/agent-sdk/src/validator.ts`:**

```typescript
import { AgentSchema, FieldDef } from "./types";
import { InternalError }         from "./errors";

// Validate output against output_schema
// mode "warn"   → log warning, return output as-is (dev mode)
// mode "strict" → throw InternalError if schema violated (production)
export function validateOutput(
  output:  Record<string, any>,
  schema:  AgentSchema,
  mode:    "warn" | "strict" = "strict"
): Record<string, any> {
  const violations: string[] = [];

  for (const [field, def] of Object.entries(schema)) {
    const d     = def as FieldDef;
    const value = output[field];

    // Missing field
    if (value === undefined) {
      violations.push(`output missing field: "${field}" (expected ${d.type})`);
      continue;
    }

    // Wrong type
    const actualType = Array.isArray(value) ? "array" : typeof value;
    if (actualType !== d.type) {
      violations.push(
        `output field "${field}": ` +
        `expected ${d.type}, got ${actualType}`
      );
    }
  }

  if (violations.length === 0) return output;

  const message = `Output schema violation: ${violations.join("; ")}`;

  if (mode === "warn") {
    console.warn(`[MilkyWay SDK] ⚠️  ${message}`);
    return output;  // pass through in dev mode
  }

  throw new InternalError(message);
}
```

**Update `router.ts`** — validate output after handler:

```typescript
import { validateOutput } from "./validator";

// After handler returns output:
const rawOutput = await withTimeout(handler(validatedInput), body.deadline);

// Validate output
const devMode  = process.env.MILKYWAY_DEV_MODE === "true";
const output   = validateOutput(
  rawOutput,
  capabilityDef.output_schema,
  devMode ? "warn" : "strict"
);
```

---

## 5. Graceful Shutdown

### The Problem
In production, Railway and other platforms send SIGTERM
before stopping the container.
If the server dies instantly — in-flight requests are dropped.
Payments may have been verified but results never returned.
The user paid but got nothing.

### Solution
On SIGTERM:
1. Stop accepting new requests immediately
2. Wait for all in-flight requests to complete (up to 30 seconds)
3. Exit cleanly

### Implementation

**Update `sdk/packages/agent-sdk/src/agent.ts`:**

```typescript
// Track in-flight requests
let inFlightCount = 0;
let isShuttingDown = false;

// Add shutdown middleware to Express app
app.use((req: Request, res: Response, next: NextFunction) => {
  if (isShuttingDown) {
    res.setHeader("Connection", "close");
    return res.status(503).json({
      error: "Server is shutting down — please retry"
    });
  }

  inFlightCount++;

  // Decrement when response finishes
  res.on("finish", () => { inFlightCount--; });
  res.on("close",  () => { inFlightCount--; });

  next();
});

// Graceful shutdown handler
function setupGracefulShutdown(server: any, agentName: string) {
  const DRAIN_TIMEOUT_MS = 30_000;  // 30 seconds max drain time

  async function shutdown(signal: string) {
    console.log(`\n[${agentName}] ${signal} received — shutting down gracefully`);
    isShuttingDown = true;

    // Stop accepting new connections
    server.close();

    // Wait for in-flight requests
    const start = Date.now();

    while (inFlightCount > 0) {
      if (Date.now() - start > DRAIN_TIMEOUT_MS) {
        console.warn(
          `[${agentName}] Drain timeout — ` +
          `${inFlightCount} requests still in flight. Forcing exit.`
        );
        break;
      }
      console.log(
        `[${agentName}] Draining — ${inFlightCount} request(s) in flight...`
      );
      await sleep(500);
    }

    console.log(`[${agentName}] Shutdown complete`);
    process.exit(0);
  }

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT",  () => shutdown("SIGINT"));
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

// Update the listen function in createAgent to use graceful shutdown:
listen: (port: number, callback?: () => void) => {
  const server = app.listen(port, callback || (() => {
    console.log(`\n✓ ${config.name} running on port ${port}`);
    // ... existing startup logs
  }));

  // Wire graceful shutdown
  setupGracefulShutdown(server, config.name);

  return server;
}
```

---

## 6. Request Logging

### The Problem
Developers have zero visibility into what's happening.
In dev mode they're flying blind.
In production they can't debug failures.

### Solution
Log every request with:
- Timestamp
- Capability called
- Payment status (verified / bypassed / rejected)
- Handler duration
- Status (completed / failed / expired)
- Job ID for correlation

Dev mode: coloured, human-readable terminal output.
Production: structured JSON (machine-readable for log aggregators).

### Implementation

**New file: `sdk/packages/agent-sdk/src/logger.ts`**

```typescript
type LogLevel = "info" | "warn" | "error" | "debug";

interface RequestLog {
  timestamp:    string;
  jobId:        string;
  capability:   string;
  payment:      "verified" | "bypassed" | "rejected" | "free";
  status:       "completed" | "failed" | "expired" | "cached";
  durationMs:   number;
  error?:       string;
}

const isDev        = process.env.NODE_ENV !== "production";
const isDevMode    = process.env.MILKYWAY_DEV_MODE === "true";

// ANSI colours for dev mode
const COLOURS = {
  reset:   "\x1b[0m",
  green:   "\x1b[32m",
  yellow:  "\x1b[33m",
  red:     "\x1b[31m",
  blue:    "\x1b[34m",
  grey:    "\x1b[90m",
  bold:    "\x1b[1m"
};

function c(colour: keyof typeof COLOURS, text: string): string {
  if (!isDev) return text;
  return `${COLOURS[colour]}${text}${COLOURS.reset}`;
}

export function logRequest(log: RequestLog): void {
  if (process.env.MILKYWAY_SILENT === "true") return;

  if (isDev) {
    // Human-readable dev output
    const statusIcon = {
      completed: c("green",  "✓"),
      failed:    c("red",    "✗"),
      expired:   c("yellow", "⏱"),
      cached:    c("blue",   "⚡")
    }[log.status];

    const paymentIcon = {
      verified:  c("green",  "paid"),
      bypassed:  c("yellow", "dev"),
      rejected:  c("red",    "rejected"),
      free:      c("grey",   "free")
    }[log.payment];

    const duration = log.durationMs < 1000
      ? `${log.durationMs}ms`
      : `${(log.durationMs / 1000).toFixed(1)}s`;

    let line =
      c("grey",  log.timestamp.split("T")[1].split(".")[0]) + "  " +
      statusIcon + "  " +
      c("bold",  log.capability.padEnd(20)) +
      paymentIcon.padEnd(12) +
      c("grey",  duration.padEnd(10)) +
      c("grey",  log.jobId.slice(0, 8) + "...");

    if (log.error) {
      line += "\n   " + c("red", `└ ${log.error}`);
    }

    console.log(line);

  } else {
    // Structured JSON for production log aggregators
    console.log(JSON.stringify({
      level:     log.status === "failed" ? "error" : "info",
      ...log
    }));
  }
}

export function logStartup(name: string, port: number, capabilities: string[]): void {
  if (isDev) {
    console.log(c("bold", `\n✦ ${name}`));
    console.log(`  Port:         ${c("blue", String(port))}`);
    console.log(`  Capabilities: ${capabilities.map(c => c("blue", c)).join(", ")}`);
    console.log(`  Payment:      ${isDevMode
      ? c("yellow", "DEV MODE — bypassed")
      : c("green",  "enabled (x402)")
    }`);
    console.log();
    console.log(c("grey",
      "time       status  capability           payment     duration   job"
    ));
    console.log(c("grey", "─".repeat(72)));
  } else {
    console.log(JSON.stringify({
      level: "info",
      event: "startup",
      name,
      port,
      capabilities
    }));
  }
}

export function logError(context: string, err: Error): void {
  if (isDev) {
    console.error(c("red", `[error] ${context}: ${err.message}`));
  } else {
    console.error(JSON.stringify({
      level:   "error",
      context,
      error:   err.message,
      stack:   err.stack
    }));
  }
}
```

**Update `router.ts`** — add logging around handler execution:

```typescript
import { logRequest } from "./logger";

// In buildExecuteHandler:

const requestStart  = Date.now();
let   paymentStatus: "verified" | "bypassed" | "rejected" | "free" = "free";
let   resultStatus:  "completed" | "failed" | "expired" | "cached"  = "completed";

// Set paymentStatus based on pricing and dev mode:
if (capabilityDef.pricing.model === "free") {
  paymentStatus = "free";
} else if (devMode) {
  paymentStatus = "bypassed";
} else {
  paymentStatus = "verified";  // only reached if payment passed
}

// Check idempotency cache
if (jobId) {
  const cached = getCachedResult(jobId);
  if (cached) {
    logRequest({
      timestamp:  new Date().toISOString(),
      jobId:      jobId || "—",
      capability: capabilityName,
      payment:    paymentStatus,
      status:     "cached",
      durationMs: Date.now() - requestStart
    });
    return res.json(cached);
  }
}

// ... run handler ...

// On success:
logRequest({
  timestamp:  new Date().toISOString(),
  jobId:      jobId || "—",
  capability: capabilityName,
  payment:    paymentStatus,
  status:     "completed",
  durationMs: Date.now() - requestStart
});

// On error (in catch block):
logRequest({
  timestamp:  new Date().toISOString(),
  jobId:      jobId || "—",
  capability: capabilityName,
  payment:    paymentStatus,
  status:     err instanceof DeadlineError ? "expired" : "failed",
  durationMs: Date.now() - requestStart,
  error:      err.message
});
```

**Update `agent.ts`** — log startup:

```typescript
import { logStartup } from "./logger";

// In listen callback:
listen: (port: number, callback?: () => void) => {
  const server = app.listen(port, callback || (() => {
    logStartup(
      config.name,
      port,
      Object.keys(config.capabilities)
    );
  }));
  setupGracefulShutdown(server, config.name);
  return server;
}
```

---

## What Dev Mode Output Looks Like

```
✦ Research Agent
  Port:         3000
  Capabilities: research, summarise
  Payment:      DEV MODE — bypassed

time       status  capability           payment     duration   job
────────────────────────────────────────────────────────────────────
14:32:01   ✓  research             dev         1.2s       abc123...
14:32:15   ✓  summarise            dev         0.8s       def456...
14:32:44   ✗  research             dev         0.1s       ghi789...
   └ Field "query": required but missing
14:33:01   ⚡  research             dev         0ms        abc123...
   (cached — same job_id returned instantly)
14:33:22   ⏱  research             dev         30.0s      jkl012...
   (handler exceeded deadline)
```

Production JSON output:
```json
{"level":"info","timestamp":"2026-05-27T14:32:01Z","jobId":"abc123","capability":"research","payment":"verified","status":"completed","durationMs":1200}
{"level":"error","timestamp":"2026-05-27T14:32:44Z","jobId":"ghi789","capability":"research","payment":"verified","status":"failed","durationMs":100,"error":"Field \"query\": required but missing"}
```

---

## Files Changed Summary

```
sdk/packages/agent-sdk/src/
  validator.ts      add coerceInput(), validateOutput()
  router.ts         wire coercion, timeout, output validation,
                    idempotency check, logging
  agent.ts          graceful shutdown, updated startup logging
  idempotency.ts    NEW — job_id cache
  timeout.ts        NEW — Promise.race deadline wrapper
  logger.ts         NEW — structured request logging
  index.ts          export clearCache (for testing)
```

---

## Build Order for Claude Code

```
1.  Write sdk/packages/agent-sdk/src/idempotency.ts
2.  Write sdk/packages/agent-sdk/src/timeout.ts
3.  Write sdk/packages/agent-sdk/src/logger.ts
4.  Update sdk/packages/agent-sdk/src/validator.ts
    → add coerceInput() and validateOutput()
5.  Update sdk/packages/agent-sdk/src/router.ts
    → add coercion before validation
    → add idempotency check at top of handler
    → wrap handler in withTimeout()
    → add validateOutput() after handler
    → add logRequest() on success and error paths
6.  Update sdk/packages/agent-sdk/src/agent.ts
    → add in-flight counter middleware
    → add setupGracefulShutdown()
    → update listen() to use logStartup()
7.  Update sdk/packages/agent-sdk/src/index.ts
    → export clearCache from idempotency
8.  npm run build — must pass with zero errors
9.  Test each addition:
    → coercion:  send "10" for a number field → passes
    → idempotency: send same job_id twice → handler runs once
    → timeout:   set deadline to now+1s, slow handler → 408
    → output:    return wrong type in dev mode → warning logged
    → output:    return wrong type in production → 500 returned
    → shutdown:  send SIGTERM mid-request → request completes first
    → logging:   every request appears in terminal with correct format
```

---

## Common Mistakes — Never Make These

- **Coercion happens before validation, not after.**
  The order is: coerce → validate → run handler → validate output.
  Never validate first — coercion fixes what validation would reject.

- **The idempotency cache is in-memory.**
  It resets on restart. This is correct for a single process.
  For multi-instance deployments, replace with Redis.
  Document this clearly in the README.

- **The TTL is 10 minutes.**
  Long enough for network retries.
  Short enough to not cache stale results forever.
  Do not make it shorter — retries can take minutes.

- **Handler timeout uses deadline from the request, not a fixed value.**
  The caller sets the deadline. The SDK enforces it.
  Never use a hardcoded timeout — it ignores what the caller asked for.

- **Output validation in dev mode warns and passes through.**
  Never throw in dev mode — it breaks development flow.
  In production, throw strictly — bad output is a contract violation.

- **Graceful shutdown must decrement inFlightCount on BOTH finish and close.**
  `finish` = response sent successfully.
  `close` = connection dropped (client disconnected).
  Both end the request. Both must decrement.

- **Never log in MILKYWAY_SILENT=true mode.**
  Some developers pipe agent output to other tools.
  The SILENT flag lets them suppress SDK logs entirely.
  Always check it before any console output.

---

*MilkyWay SDK Hardening*
*Six additions. Production-grade from day one.*
