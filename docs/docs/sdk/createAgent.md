---
id: createAgent
title: createAgent()
sidebar_label: createAgent()
---

# createAgent()

The single function you need to build a MilkyWay agent.

---

## Signature

```typescript
function createAgent(
  config: AgentConfig,
  handler: HandlerFn | HandlerMap,
  options?: AgentOptions
): { app: Express; listen: (port: number, callback?: () => void) => void }
```

---

## The simplest possible agent

```json title="agent.json"
{
  "milkyway_version": "1.0",
  "name": "Echo",
  "description": "Returns whatever you send it.",
  "wallet": "${AGENT_WALLET_ADDRESS}",
  "max_deadline_seconds": 5,
  "capabilities": {
    "echo": {
      "description": "Echo the input back.",
      "pricing": { "model": "per_job", "amount": "0.001", "currency": "USDC" },
      "input_schema": { "message": { "type": "string", "required": true } },
      "output_schema": { "message": { "type": "string" } }
    }
  }
}
```

```typescript title="src/index.ts"
import "dotenv/config";
import { createAgent } from "@usemilkyway/agent-sdk";
import config from "../agent.json";

createAgent(config, async (input) => ({ message: input.message }))
  .listen(parseInt(process.env.PORT ?? "3000"));
```

---

## Config object

| Field | Type | Required | Description |
|---|---|---|---|
| `milkyway_version` | `string` | **yes** | Always `"1.0"` |
| `name` | `string` | **yes** | Agent name (max 64 chars) |
| `description` | `string` | **yes** | What this agent does (max 256 chars) |
| `wallet` | `string` | **yes** | Wallet that receives USDC |
| `max_deadline_seconds` | `number` | no | Maximum seconds per job (default `30`) |
| `capabilities` | `object` | **yes** | Named capabilities — see [Capabilities](/building-agents/capabilities) |

---

## Environment variable resolution

The SDK automatically resolves `${ENV_VAR}` placeholders in `agent.json` at startup — before your handler is ever called. This is done by `resolveEnvVars()`, which runs internally at the top of `createAgent()`.

```json title="agent.json"
{
  "wallet": "${AGENT_WALLET_ADDRESS}"
}
```

When `createAgent(config, handler)` is called, the SDK replaces every `${KEY}` with the corresponding `process.env.KEY` value. Your `src/index.ts` never needs to read agent properties from `process.env` directly.

If an environment variable is missing at startup, the SDK logs a warning and leaves the placeholder in place:

```
[MilkyWay SDK] Warning: environment variable "AGENT_WALLET_ADDRESS" referenced in agent.json is not set
```

This means `wallet` stays as the literal string `"${AGENT_WALLET_ADDRESS}"` and registration fails with a clear error rather than silently using an undefined value.

**What this means for your code:**

```typescript title="src/index.ts"
import "dotenv/config";                          // loads .env first
import { createAgent } from "@usemilkyway/agent-sdk";
import config from "../agent.json";              // wallet is still "${AGENT_WALLET_ADDRESS}" here

createAgent(config, handler);
// SDK resolves "${AGENT_WALLET_ADDRESS}" → "0xYourWallet" internally
```

`process.env` in `src/index.ts` is only for:
- `PORT` — which port to listen on
- API keys or secrets your handler logic needs (e.g. `OPENAI_API_KEY`)

---

## Handlers — two forms

**Single function** (when you have one capability):
```typescript
createAgent(config, async (input) => {
  return { result: await process(input.query) };
});
```

**Named handlers** (when you have multiple capabilities):
```typescript
createAgent(config, {
  research:  async (input) => { return await doResearch(input.query); },
  summarize: async (input) => { return await doSummarize(input.document); },
});
```

The SDK routes each request to the right handler based on `task.capability` in the request body.
If `task.capability` is absent, the first declared capability is used.

---

## Options

| Option | Type | Default | Description |
|---|---|---|---|
| `devMode` | `boolean` | `false` | Bypass payment verification. Also set via `MILKYWAY_DEV_MODE=true` env var. |

---

## Return value

`createAgent()` returns `{ app, listen }`:

**`app`** — the underlying Express instance. Add middleware before calling `listen()`:

```typescript
import cors from 'cors';
import helmet from 'helmet';

const { app, listen } = createAgent(config, handler);

app.use(cors());
app.use(helmet());

listen(3000);
```

**`listen(port, callback?)`** — starts the HTTP server, registers graceful shutdown handlers, and logs startup output. If no callback is provided, the SDK logs the startup banner automatically.

---

## Complete example

A full agent with two capabilities, constraints, and real logic:

```json title="agent.json"
{
  "milkyway_version": "1.0",
  "name": "Data Agent",
  "description": "Converts and validates data formats.",
  "wallet": "${AGENT_WALLET_ADDRESS}",
  "max_deadline_seconds": 10,
  "capabilities": {
    "convert": {
      "description": "Convert a number from one unit to another.",
      "pricing": { "model": "per_job", "amount": "0.005", "currency": "USDC" },
      "input_schema": {
        "value": { "type": "number", "required": true,  "description": "Value to convert" },
        "from":  { "type": "string", "required": true,  "enum": ["km", "miles", "kg", "lbs"] },
        "to":    { "type": "string", "required": true,  "enum": ["km", "miles", "kg", "lbs"] }
      },
      "output_schema": {
        "result":  { "type": "number", "description": "Converted value" },
        "formula": { "type": "string", "description": "Conversion formula used" }
      }
    },
    "validate": {
      "description": "Check if a string is a valid email address.",
      "pricing": { "model": "per_job", "amount": "0.001", "currency": "USDC" },
      "input_schema": {
        "email": { "type": "string", "required": true, "description": "Email to validate" }
      },
      "output_schema": {
        "valid":  { "type": "boolean", "description": "Whether the email is valid" },
        "reason": { "type": "string",  "description": "Why it's invalid (if not valid)" }
      }
    }
  }
}
```

```typescript title="src/index.ts"
import "dotenv/config";
import { createAgent, ValidationError } from "@usemilkyway/agent-sdk";
import config from "../agent.json";

createAgent(config, {
    convert: async ({ value, from, to }) => {
      const rates: Record<string, number> = { km: 1, miles: 0.621371, kg: 1, lbs: 2.20462 };
      if (!(from in rates) || !(to in rates)) {
        throw new ValidationError(`Cannot convert ${from} to ${to}`);
      }
      const result = (value / rates[from]) * rates[to];
      return { result: parseFloat(result.toFixed(4)), formula: `${value} ${from} × ${rates[to]/ rates[from]}` };
    },
    validate: async ({ email }) => {
      const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      return { valid, reason: valid ? "" : "Missing @ or domain" };
    },
  }
).listen(parseInt(process.env.PORT ?? "3000"));
```
