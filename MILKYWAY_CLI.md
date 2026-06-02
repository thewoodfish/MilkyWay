# MILKYWAY_CLI.md
## MilkyWay SDK + CLI — End to End Spec
### For Claude Code

Read alongside MILKYWAY_X402_SDK.md and all other MILKYWAY_*.md files.
This file defines the complete developer toolchain for MilkyWay.
Three packages. One cohesive experience.

---

## The Three Packages

```
create-milkyway-agent        scaffold a new agent project
@milkyway/agent-sdk          runtime — what runs in production
@milkyway/cli                developer tools — test, register, monitor
```

All three live in the same monorepo under `sdk/`.

---

## Repository Structure

```
sdk/
├── package.json                    ← monorepo root (pnpm workspaces)
├── pnpm-workspace.yaml
├── packages/
│   ├── agent-sdk/                  ← @milkyway/agent-sdk
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── agent.ts
│   │       ├── x402.ts
│   │       ├── verify.ts
│   │       ├── router.ts
│   │       ├── validator.ts
│   │       ├── errors.ts
│   │       └── types.ts
│   │
│   ├── cli/                        ← @milkyway/cli
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts            ← CLI entry point
│   │       ├── commands/
│   │       │   ├── dev.ts
│   │       │   ├── validate.ts
│   │       │   ├── register.ts
│   │       │   ├── update.ts
│   │       │   ├── logs.ts
│   │       │   ├── earnings.ts
│   │       │   └── monitor.ts
│   │       └── utils/
│   │           ├── config.ts       ← load + parse agent.json
│   │           ├── api.ts          ← MilkyWay API client
│   │           └── display.ts      ← terminal output helpers
│   │
│   └── create-milkyway-agent/      ← scaffolding tool
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts            ← CLI entry point
│           ├── prompts.ts          ← interactive questions
│           ├── scaffold.ts         ← file generation
│           └── templates/
│               ├── agent.json.hbs
│               ├── index.ts.hbs
│               ├── package.json.hbs
│               ├── tsconfig.json.hbs
│               ├── Dockerfile.hbs
│               ├── dotenv.example.hbs
│               ├── gitignore.hbs
│               └── README.md.hbs
```

---

## Package 1: @milkyway/agent-sdk

### Dependencies

```json
{
  "name": "@milkyway/agent-sdk",
  "version": "0.1.0",
  "description": "Build and monetize AI agents on MilkyWay",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "dependencies": {
    "@coinbase/x402": "^1.0.0",
    "express": "^4.18.0",
    "ethers": "^6.0.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/express": "^4.17.0",
    "@types/node": "^20.0.0"
  }
}
```

---

### sdk/packages/agent-sdk/src/types.ts

```typescript
export type FieldType =
  | "string"
  | "number"
  | "boolean"
  | "array"
  | "object";

export interface FieldDef {
  type:        FieldType;
  required?:   boolean;
  description?: string;
  default?:    any;
  // Validation constraints
  min?:        number;    // number: min value
  max?:        number;    // number: max value
  minLength?:  number;    // string: min length
  maxLength?:  number;    // string: max length
  enum?:       any[];     // allowed values
}

export interface AgentSchema {
  [field: string]: FieldDef;
}

export interface CapabilityDef {
  description:          string;
  pricing:              AgentPricing;
  input_schema:         AgentSchema;
  output_schema:        AgentSchema;
}

export interface AgentPricing {
  model:    "per_job" | "per_day" | "per_month" | "free";
  amount:   string;     // USDC e.g. "1.00"
  currency: "USDC";
}

export interface AgentConfig {
  milkyway_version:     string;
  name:                 string;
  description:          string;
  wallet:               string;
  max_deadline_seconds?: number;
  capabilities: {
    [capabilityName: string]: CapabilityDef;
  };
}

export interface MilkyWayAbout extends AgentConfig {
  // Exactly what /about returns — same as AgentConfig
}

export interface ExecuteRequest {
  milkyway_version: string;
  job_id:           string;
  task: {
    capability?: string;   // optional if only one capability
    input:       Record<string, any>;
  };
  deadline: number;        // unix seconds
}

export interface ExecuteResponse {
  milkyway_version: string;
  job_id:           string;
  status:           "completed" | "failed" | "expired";
  output?:          Record<string, any>;
  error?:           string;
  error_type?:      "validation" | "payment" | "deadline" | "capability" | "internal";
  completed_at?:    number;
}

export type HandlerFn = (input: Record<string, any>) => Promise<Record<string, any>>;

export type Handlers =
  | HandlerFn                           // single capability
  | { [capabilityName: string]: HandlerFn };  // multiple capabilities
```

---

### sdk/packages/agent-sdk/src/errors.ts

```typescript
export class MilkyWayError extends Error {
  constructor(
    message: string,
    public readonly type: string,
    public readonly statusCode: number = 400
  ) {
    super(message);
    this.name = "MilkyWayError";
  }
}

export class ValidationError extends MilkyWayError {
  constructor(message: string) {
    super(message, "validation", 400);
    this.name = "ValidationError";
  }
}

export class PaymentError extends MilkyWayError {
  constructor(message: string) {
    super(message, "payment", 402);
    this.name = "PaymentError";
  }
}

export class DeadlineError extends MilkyWayError {
  constructor() {
    super("Deadline has passed", "deadline", 408);
    this.name = "DeadlineError";
  }
}

export class CapabilityError extends MilkyWayError {
  constructor(name: string, available: string[]) {
    super(
      `Unknown capability: "${name}". Available: ${available.join(", ")}`,
      "capability",
      400
    );
    this.name = "CapabilityError";
  }
}

export class InternalError extends MilkyWayError {
  constructor(message: string) {
    super(message, "internal", 500);
    this.name = "InternalError";
  }
}
```

---

### sdk/packages/agent-sdk/src/validator.ts

```typescript
import { z } from "zod";
import { AgentSchema, FieldDef } from "./types";
import { ValidationError } from "./errors";

// Build a zod schema from a MilkyWay AgentSchema
function buildZodSchema(schema: AgentSchema): z.ZodObject<any> {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const [field, def] of Object.entries(schema)) {
    let zodType = buildZodType(def);

    if (!def.required) {
      zodType = zodType.optional();
      if (def.default !== undefined) {
        zodType = (zodType as any).default(def.default);
      }
    }

    shape[field] = zodType;
  }

  return z.object(shape);
}

function buildZodType(def: FieldDef): z.ZodTypeAny {
  switch (def.type) {
    case "string": {
      let t = z.string();
      if (def.minLength !== undefined) t = t.min(def.minLength);
      if (def.maxLength !== undefined) t = t.max(def.maxLength);
      if (def.enum) t = z.enum(def.enum as [string, ...string[]]);
      return t;
    }
    case "number": {
      let t = z.number();
      if (def.min !== undefined) t = t.min(def.min);
      if (def.max !== undefined) t = t.max(def.max);
      return t;
    }
    case "boolean":
      return z.boolean();
    case "array":
      return z.array(z.any());
    case "object":
      return z.record(z.any());
    default:
      return z.any();
  }
}

export function validateInput(
  input: Record<string, any>,
  schema: AgentSchema
): Record<string, any> {
  const zodSchema = buildZodSchema(schema);
  const result = zodSchema.safeParse(input);

  if (!result.success) {
    const issues = result.error.issues
      .map(i => `${i.path.join(".")}: ${i.message}`)
      .join(", ");
    throw new ValidationError(issues);
  }

  return result.data;
}
```

---

### sdk/packages/agent-sdk/src/verify.ts

```typescript
import { facilitator } from "@coinbase/x402";
import { PaymentError } from "./errors";

const NETWORK = "eip155:42161";   // Arbitrum One

export async function verifyPayment(
  paymentHeader: string,
  resource: string,
  amountUsdc: string   // human-readable e.g. "1.00"
): Promise<void> {
  // Convert to raw units (6 decimals)
  const rawAmount = String(
    Math.round(parseFloat(amountUsdc) * 1_000_000)
  );

  try {
    const result = await facilitator.verify({
      payment: paymentHeader,
      resource,
      amount:  rawAmount,
      network: NETWORK
    });

    if (!result.isValid) {
      throw new PaymentError(result.invalidReason || "Payment invalid");
    }
  } catch (err: any) {
    if (err instanceof PaymentError) throw err;
    throw new PaymentError(`Verification failed: ${err.message}`);
  }
}
```

---

### sdk/packages/agent-sdk/src/x402.ts

```typescript
import { Request, Response, NextFunction } from "express";
import { verifyPayment } from "./verify";
import { AgentPricing } from "./types";

const USDC_ADDRESS = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";

export function requirePayment(
  walletAddress: string,
  pricing: AgentPricing,
  devMode: boolean = false
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Free agents skip payment
    if (pricing.model === "free" || pricing.amount === "0") {
      return next();
    }

    // Dev mode skips payment verification
    if (devMode) {
      console.log("[dev mode] payment verification bypassed");
      return next();
    }

    // Get payment header (support both v1 and v2 header names)
    const paymentHeader =
      req.headers["payment-signature"] as string ||
      req.headers["x-payment"] as string;

    if (!paymentHeader) {
      return res.status(402).json({
        x402Version: 1,
        accepts: [{
          scheme:            "exact",
          network:           "eip155:42161",
          maxAmountRequired: String(
            Math.round(parseFloat(pricing.amount) * 1_000_000)
          ),
          payTo:             walletAddress,
          asset:             USDC_ADDRESS,
          description:       `${pricing.amount} ${pricing.currency} per job`,
          maxTimeoutSeconds: 60,
          extra: { name: "USD Coin", version: "2" }
        }]
      });
    }

    try {
      const resource = `${req.protocol}://${req.get("host")}${req.path}`;
      await verifyPayment(paymentHeader, resource, pricing.amount);
      next();
    } catch (err: any) {
      res.status(402).json({
        x402Version: 1,
        error: err.message
      });
    }
  };
}
```

---

### sdk/packages/agent-sdk/src/router.ts

```typescript
import { Request, Response } from "express";
import { AgentConfig, Handlers, ExecuteRequest } from "./types";
import { validateInput } from "./validator";
import {
  CapabilityError,
  DeadlineError,
  ValidationError,
  MilkyWayError
} from "./errors";

export function buildExecuteHandler(
  config: AgentConfig,
  handlers: Handlers
) {
  return async (req: Request, res: Response) => {
    const body = req.body as ExecuteRequest;

    // Validate protocol version
    if (body.milkyway_version !== "1.0") {
      return res.status(400).json({
        error: `Unsupported protocol version: ${body.milkyway_version}`
      });
    }

    // Check deadline
    const now = Math.floor(Date.now() / 1000);
    if (body.deadline && now > body.deadline) {
      return res.status(408).json({
        milkyway_version: "1.0",
        job_id:     body.job_id,
        status:     "expired",
        error:      "Deadline has passed",
        error_type: "deadline"
      });
    }

    try {
      // Resolve capability and handler
      const capabilityNames = Object.keys(config.capabilities);
      let capabilityName: string;
      let handler: (input: any) => Promise<any>;
      let capabilityDef = config.capabilities[capabilityNames[0]];

      if (typeof handlers === "function") {
        // Single capability — function shorthand
        if (capabilityNames.length > 1) {
          throw new CapabilityError(
            "multiple capabilities require named handlers",
            capabilityNames
          );
        }
        capabilityName = capabilityNames[0];
        handler = handlers;
        capabilityDef = config.capabilities[capabilityName];
      } else {
        // Multiple capabilities — route by name
        capabilityName = body.task?.capability || capabilityNames[0];

        if (!handlers[capabilityName]) {
          throw new CapabilityError(capabilityName, Object.keys(handlers));
        }

        handler = handlers[capabilityName];
        capabilityDef = config.capabilities[capabilityName];

        if (!capabilityDef) {
          throw new CapabilityError(capabilityName, capabilityNames);
        }
      }

      // Validate input against capability schema
      const validatedInput = validateInput(
        body.task?.input || {},
        capabilityDef.input_schema
      );

      // Run the handler
      const output = await handler(validatedInput);

      res.json({
        milkyway_version: "1.0",
        job_id:           body.job_id,
        status:           "completed",
        output,
        completed_at: Math.floor(Date.now() / 1000)
      });

    } catch (err: any) {
      if (err instanceof DeadlineError) {
        return res.status(408).json({
          milkyway_version: "1.0",
          job_id:     body.job_id,
          status:     "expired",
          error:      err.message,
          error_type: err.type
        });
      }

      if (err instanceof MilkyWayError) {
        return res.status(err.statusCode).json({
          milkyway_version: "1.0",
          job_id:     body.job_id,
          status:     "failed",
          error:      err.message,
          error_type: err.type
        });
      }

      // Unexpected error
      console.error("Agent handler error:", err);
      res.status(500).json({
        milkyway_version: "1.0",
        job_id:     body.job_id,
        status:     "failed",
        error:      err.message,
        error_type: "internal"
      });
    }
  };
}
```

---

### sdk/packages/agent-sdk/src/agent.ts

```typescript
import express, { Express } from "express";
import { requirePayment } from "./x402";
import { buildExecuteHandler } from "./router";
import { AgentConfig, Handlers, MilkyWayAbout } from "./types";

interface CreateAgentOptions {
  devMode?: boolean;   // bypass payment in development
}

interface AgentInstance {
  app:    Express;
  listen: (port: number, callback?: () => void) => void;
}

export function createAgent(
  config:   AgentConfig,
  handlers: Handlers,
  options:  CreateAgentOptions = {}
): AgentInstance {

  const app = express();
  app.use(express.json());

  const devMode = options.devMode ??
    process.env.MILKYWAY_DEV_MODE === "true";

  // ── GET /health ─────────────────────────────────────────────
  app.get("/health", (_, res) => {
    res.json({
      name:    config.name,
      version: "1.0.0",
      status:  "ok",
      devMode: devMode || undefined
    });
  });

  // ── GET /about ──────────────────────────────────────────────
  app.get("/about", (_, res) => {
    const about: MilkyWayAbout = {
      milkyway_version:     "1.0",
      name:                 config.name,
      description:          config.description,
      wallet:               config.wallet,
      max_deadline_seconds: config.max_deadline_seconds || 30,
      capabilities:         config.capabilities
    };
    res.json(about);
  });

  // ── POST /execute ────────────────────────────────────────────
  // Resolve pricing for the requested capability
  app.post("/execute", async (req, res, next) => {
    // Get capability from body to determine pricing
    const capabilityName =
      req.body?.task?.capability ||
      Object.keys(config.capabilities)[0];

    const capability = config.capabilities[capabilityName];

    // If capability not found, let router handle the error
    if (!capability) {
      return buildExecuteHandler(config, handlers)(req, res);
    }

    // Apply x402 payment gate for this capability's pricing
    requirePayment(
      config.wallet,
      capability.pricing,
      devMode
    )(req, res, () =>
      buildExecuteHandler(config, handlers)(req, res)
    );
  });

  return {
    app,
    listen: (port: number, callback?: () => void) => {
      app.listen(port, callback || (() => {
        console.log(`\n✓ ${config.name} running on port ${port}`);
        if (devMode) {
          console.log("✓ Dev mode: payment verification bypassed\n");
        }
        console.log("Endpoints:");
        console.log(`  GET  http://localhost:${port}/health`);
        console.log(`  GET  http://localhost:${port}/about`);
        console.log(`  POST http://localhost:${port}/execute\n`);
      }));
    }
  };
}
```

---

### sdk/packages/agent-sdk/src/index.ts

```typescript
export { createAgent }       from "./agent";
export { requirePayment }    from "./x402";
export { verifyPayment }     from "./verify";
export { validateInput }     from "./validator";
export {
  MilkyWayError,
  ValidationError,
  PaymentError,
  DeadlineError,
  CapabilityError,
  InternalError
}                            from "./errors";
export * from "./types";
```

---

## Package 2: @milkyway/cli

### Dependencies

```json
{
  "name": "@milkyway/cli",
  "version": "0.1.0",
  "bin": {
    "milkyway": "./dist/index.js"
  },
  "dependencies": {
    "@milkyway/agent-sdk": "workspace:*",
    "commander": "^11.0.0",
    "chalk": "^5.3.0",
    "ora":   "^7.0.0",
    "inquirer": "^9.0.0",
    "dotenv": "^16.0.0",
    "ethers": "^6.0.0",
    "zod":    "^3.22.0"
  }
}
```

---

### sdk/packages/cli/src/index.ts

```typescript
#!/usr/bin/env node
import { Command } from "commander";
import { devCommand }       from "./commands/dev";
import { validateCommand }  from "./commands/validate";
import { registerCommand }  from "./commands/register";
import { updateCommand }    from "./commands/update";
import { logsCommand }      from "./commands/logs";
import { earningsCommand }  from "./commands/earnings";
import { monitorCommand }   from "./commands/monitor";

const program = new Command();

program
  .name("milkyway")
  .description("MilkyWay Agent Developer Tools")
  .version("0.1.0");

program
  .command("dev")
  .description("Start agent in development mode (payment bypassed)")
  .option("-p, --port <port>", "port to run on", "3000")
  .option("-c, --config <path>", "path to agent.json", "./agent.json")
  .option("-e, --entry <path>", "entry file", "./src/index.ts")
  .action(devCommand);

program
  .command("validate")
  .description("Validate agent.json before deploying")
  .option("-c, --config <path>", "path to agent.json", "./agent.json")
  .action(validateCommand);

program
  .command("register")
  .description("Register your agent on MilkyWay")
  .option("-c, --config <path>",   "path to agent.json", "./agent.json")
  .option("-e, --endpoint <url>",  "your deployed agent endpoint")
  .option("-k, --api-key <key>",   "MilkyWay API key")
  .action(registerCommand);

program
  .command("update")
  .description("Push agent.json changes on-chain")
  .option("-c, --config <path>",  "path to agent.json", "./agent.json")
  .option("-k, --api-key <key>",  "MilkyWay API key")
  .action(updateCommand);

program
  .command("logs")
  .description("View recent job history")
  .option("-a, --agent <id>",   "agent ID")
  .option("-n, --count <n>",    "number of logs to show", "20")
  .option("-k, --api-key <key>", "MilkyWay API key")
  .action(logsCommand);

program
  .command("earnings")
  .description("View earnings summary")
  .option("-k, --api-key <key>", "MilkyWay API key")
  .option("--period <period>",   "7d | 30d | all", "30d")
  .action(earningsCommand);

program
  .command("monitor")
  .description("Watch agent health in real time")
  .option("-a, --agent <id>",      "agent ID")
  .option("-k, --api-key <key>",   "MilkyWay API key")
  .option("--webhook <url>",       "webhook URL for alerts")
  .action(monitorCommand);

program.parse();
```

---

### sdk/packages/cli/src/utils/config.ts

```typescript
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { AgentConfig } from "@milkyway/agent-sdk";

dotenv.config();

export function loadConfig(configPath: string): AgentConfig {
  const fullPath = path.resolve(process.cwd(), configPath);

  if (!fs.existsSync(fullPath)) {
    throw new Error(`agent.json not found at ${fullPath}`);
  }

  const raw = fs.readFileSync(fullPath, "utf8");

  // Resolve environment variables in config
  // e.g. "${AGENT_WALLET_ADDRESS}" → actual value
  const resolved = raw.replace(/\$\{([^}]+)\}/g, (_, key) => {
    const val = process.env[key];
    if (!val) throw new Error(`Environment variable not set: ${key}`);
    return val;
  });

  return JSON.parse(resolved) as AgentConfig;
}

export function computeMetadataHash(
  config: AgentConfig,
  endpoint: string
): string {
  const { ethers } = require("ethers");
  const profile = { ...config, endpoint };
  const sorted = JSON.stringify(profile, Object.keys(profile).sort());
  return ethers.keccak256(ethers.toUtf8Bytes(sorted));
}
```

---

### sdk/packages/cli/src/utils/api.ts

```typescript
const API_BASE = process.env.MILKYWAY_API_URL || "https://api.milkyway.xyz";

export class MilkyWayAPI {
  constructor(private apiKey: string) {}

  async preRegister(data: {
    config:       any;
    endpoint:     string;
    metadataHash: string;
  }) {
    return this.post("/api/agents/pre-register", data);
  }

  async getStakeStatus(profileId: string) {
    return this.get(`/api/agents/stake-status/${profileId}`);
  }

  async updateAgent(agentId: number, data: {
    config:          any;
    newMetadataHash: string;
  }) {
    return this.put(`/api/agents/${agentId}`, data);
  }

  async getLogs(agentId: number, count: number) {
    return this.get(`/api/agents/${agentId}/logs?count=${count}`);
  }

  async getEarnings(period: string) {
    return this.get(`/api/earnings/me?period=${period}`);
  }

  async getHealth(agentId: number) {
    return this.get(`/api/agents/${agentId}/health`);
  }

  private async get(path: string) {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { "X-API-Key": this.apiKey }
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  private async post(path: string, body: any) {
    const res = await fetch(`${API_BASE}${path}`, {
      method:  "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key":    this.apiKey
      },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  private async put(path: string, body: any) {
    const res = await fetch(`${API_BASE}${path}`, {
      method:  "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key":    this.apiKey
      },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }
}
```

---

### sdk/packages/cli/src/commands/validate.ts

```typescript
import chalk from "chalk";
import { loadConfig } from "../utils/config";
import { AgentConfig, FieldDef } from "@milkyway/agent-sdk";

export async function validateCommand(options: { config: string }) {
  console.log(chalk.bold("\nValidating agent.json...\n"));

  const errors:   string[] = [];
  const warnings: string[] = [];

  let config: AgentConfig;
  try {
    config = loadConfig(options.config);
  } catch (err: any) {
    console.log(chalk.red(`✗ Failed to load config: ${err.message}`));
    process.exit(1);
  }

  // Required top-level fields
  const required = ["milkyway_version", "name", "description", "wallet", "capabilities"];
  for (const field of required) {
    if (!(config as any)[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Wallet format
  if (config.wallet && !/^0x[0-9a-fA-F]{40}$/.test(config.wallet)) {
    errors.push(`wallet is not a valid Ethereum address`);
  }

  // Capabilities
  if (config.capabilities) {
    const caps = Object.entries(config.capabilities);

    if (caps.length === 0) {
      errors.push("At least one capability is required");
    }

    for (const [name, cap] of caps) {
      // Required capability fields
      if (!cap.description) {
        warnings.push(`capability "${name}": missing description`);
      }
      if (!cap.pricing) {
        errors.push(`capability "${name}": missing pricing`);
      } else {
        if (!["per_job", "per_day", "per_month", "free"].includes(cap.pricing.model)) {
          errors.push(`capability "${name}": invalid pricing model`);
        }
        if (cap.pricing.currency !== "USDC") {
          errors.push(`capability "${name}": currency must be USDC`);
        }
      }

      if (!cap.input_schema || Object.keys(cap.input_schema).length === 0) {
        warnings.push(`capability "${name}": input_schema is empty`);
      } else {
        // Check field descriptions
        for (const [field, def] of Object.entries(cap.input_schema)) {
          if (!(def as FieldDef).description) {
            warnings.push(
              `capability "${name}" input "${field}": missing description`
            );
          }
        }
      }

      if (!cap.output_schema || Object.keys(cap.output_schema).length === 0) {
        errors.push(`capability "${name}": output_schema is required`);
      } else {
        for (const [field, def] of Object.entries(cap.output_schema)) {
          if (!(def as FieldDef).description) {
            warnings.push(
              `capability "${name}" output "${field}": missing description`
            );
          }
        }
      }
    }
  }

  // max_deadline_seconds
  if (!config.max_deadline_seconds) {
    warnings.push("max_deadline_seconds not set (recommended: 30)");
  }

  // Print results
  if (errors.length === 0 && warnings.length === 0) {
    console.log(chalk.green("✓ agent.json is valid. Ready to register.\n"));
    return;
  }

  for (const w of warnings) {
    console.log(chalk.yellow(`⚠  ${w}`));
  }
  for (const e of errors) {
    console.log(chalk.red(`✗  ${e}`));
  }

  if (errors.length > 0) {
    console.log(chalk.red(`\n${errors.length} error(s). Fix before registering.\n`));
    process.exit(1);
  } else {
    console.log(chalk.yellow(`\n${warnings.length} warning(s). Review before registering.\n`));
  }
}
```

---

### sdk/packages/cli/src/commands/dev.ts

```typescript
import chalk from "chalk";
import { spawn } from "child_process";
import { loadConfig } from "../utils/config";

export async function devCommand(options: {
  port:   string;
  config: string;
  entry:  string;
}) {
  const config = loadConfig(options.config);

  console.log(chalk.bold(`\n✦ MilkyWay Dev Mode\n`));
  console.log(`Agent:    ${config.name}`);
  console.log(`Port:     ${options.port}`);
  console.log(`Payment:  ${chalk.yellow("BYPASSED")}\n`);

  // Print capability summary
  const caps = Object.entries(config.capabilities);
  console.log(`Capabilities (${caps.length}):`);
  for (const [name, cap] of caps) {
    console.log(
      `  ${chalk.blue(name)}  ${cap.pricing.amount} USDC  ` +
      `${Object.keys(cap.input_schema).join(", ")} → ` +
      `${Object.keys(cap.output_schema).join(", ")}`
    );
  }
  console.log();

  // Start agent with MILKYWAY_DEV_MODE=true and tsx watch
  const child = spawn(
    "npx",
    ["tsx", "watch", options.entry],
    {
      env: {
        ...process.env,
        MILKYWAY_DEV_MODE: "true",
        PORT: options.port
      },
      stdio: "inherit"
    }
  );

  child.on("error", (err) => {
    console.error(chalk.red(`Failed to start: ${err.message}`));
    console.error("Make sure tsx is installed: npm install -D tsx");
    process.exit(1);
  });

  process.on("SIGINT", () => {
    child.kill();
    process.exit(0);
  });
}
```

---

### sdk/packages/cli/src/commands/register.ts

```typescript
import chalk from "chalk";
import ora from "ora";
import { loadConfig, computeMetadataHash } from "../utils/config";
import { MilkyWayAPI } from "../utils/api";

export async function registerCommand(options: {
  config:   string;
  endpoint: string;
  apiKey:   string;
}) {
  const apiKey = options.apiKey || process.env.MILKYWAY_API_KEY;
  if (!apiKey) {
    console.log(chalk.red("✗ API key required. Get one at milkyway.xyz/settings\n"));
    process.exit(1);
  }

  const endpoint = options.endpoint || process.env.AGENT_ENDPOINT;
  if (!endpoint) {
    console.log(chalk.red("✗ Endpoint required. Pass --endpoint https://your-agent.fly.dev\n"));
    process.exit(1);
  }

  const api = new MilkyWayAPI(apiKey);
  let spinner = ora();

  console.log(chalk.bold("\n✦ Registering on MilkyWay\n"));

  // 1. Load config
  spinner = ora("Loading agent.json").start();
  const config = loadConfig(options.config);
  spinner.succeed(`Loaded: ${config.name}`);

  // 2. Ping /health
  spinner = ora("Checking endpoint health").start();
  try {
    const res = await fetch(`${endpoint.replace(/\/$/, "")}/health`);
    if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
    spinner.succeed("Endpoint is alive");
  } catch (err: any) {
    spinner.fail(`Cannot reach endpoint: ${err.message}`);
    process.exit(1);
  }

  // 3. Fetch /about
  spinner = ora("Reading /about schema").start();
  try {
    const res = await fetch(`${endpoint.replace(/\/$/, "")}/about`);
    const about = await res.json();
    if (!about.milkyway_version) throw new Error("Missing milkyway_version");
    if (!about.capabilities) throw new Error("Missing capabilities");
    spinner.succeed("/about schema valid");
  } catch (err: any) {
    spinner.fail(`/about validation failed: ${err.message}`);
    process.exit(1);
  }

  // 4. Compute metadata hash
  spinner = ora("Computing metadata hash").start();
  const hash = computeMetadataHash(config, endpoint);
  spinner.succeed(`Hash: ${hash.slice(0, 18)}...`);

  // 5. Pre-register with MilkyWay API
  spinner = ora("Saving profile to MilkyWay").start();
  let profileId: string;
  let agentId: number;
  try {
    const result = await api.preRegister({
      config,
      endpoint,
      metadataHash: hash
    });
    profileId = result.profileId;
    agentId   = result.agentId;
    spinner.succeed(`Profile saved (Agent ID: #${agentId})`);
  } catch (err: any) {
    spinner.fail(`Failed to save profile: ${err.message}`);
    process.exit(1);
  }

  // 6. Prompt user to stake
  console.log(chalk.bold("\nOne step remaining: stake 0.01 ETH to activate.\n"));
  console.log("Sign the transaction in your browser:");
  console.log(
    chalk.blue(`→ https://milkyway.xyz/stake?profileId=${profileId}&hash=${hash}\n`)
  );

  // 7. Poll for stake confirmation
  spinner = ora("Waiting for stake confirmation").start();
  let staked = false;
  let attempts = 0;

  while (!staked && attempts < 120) {  // wait up to 6 minutes
    await sleep(3000);
    attempts++;
    try {
      const status = await api.getStakeStatus(profileId);
      if (status.staked) {
        staked = true;
        spinner.succeed(`Stake confirmed — tx: ${status.txHash?.slice(0, 18)}...`);
      }
    } catch {}
  }

  if (!staked) {
    spinner.fail("Timed out waiting for stake. Run register again after staking.");
    process.exit(1);
  }

  // 8. Done
  console.log(chalk.bold(chalk.green("\n✓ Agent is live on MilkyWay 🚀\n")));
  console.log(`  milkyway.xyz/agents/${agentId}\n`);
  console.log("Share it:");
  const tweetUrl = `https://twitter.com/intent/tweet?text=` +
    encodeURIComponent(
      `Just deployed "${config.name}" on @MilkyWayAI 🤖\n\n` +
      `milkyway.xyz/agents/${agentId}`
    );
  console.log(chalk.blue(`  ${tweetUrl}\n`));
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}
```

---

### sdk/packages/cli/src/commands/logs.ts

```typescript
import chalk from "chalk";
import { MilkyWayAPI } from "../utils/api";

export async function logsCommand(options: {
  agent:  string;
  count:  string;
  apiKey: string;
}) {
  const apiKey = options.apiKey || process.env.MILKYWAY_API_KEY;
  if (!apiKey) {
    console.log(chalk.red("✗ API key required.\n"));
    process.exit(1);
  }

  const api = new MilkyWayAPI(apiKey);
  const logs = await api.getLogs(Number(options.agent), Number(options.count));

  console.log(chalk.bold(`\nAgent #${options.agent} — last ${options.count} jobs\n`));

  if (!logs.length) {
    console.log(chalk.gray("No jobs yet.\n"));
    return;
  }

  // Header
  console.log(
    chalk.gray(
      "Time".padEnd(12) +
      "Capability".padEnd(16) +
      "Amount".padEnd(12) +
      "Status".padEnd(10) +
      "Duration".padEnd(10) +
      "Flow"
    )
  );
  console.log(chalk.gray("─".repeat(72)));

  for (const log of logs) {
    const time   = formatTimeAgo(log.executedAt);
    const status = log.status === "COMPLETED"
      ? chalk.green("✓ done")
      : chalk.red("✗ failed");
    const amount = log.amountUsdc ? `${log.amountUsdc} USDC` : "—";
    const duration = log.durationMs ? `${(log.durationMs / 1000).toFixed(1)}s` : "—";
    const flow   = log.flowJobId
      ? chalk.gray(`Flow ${log.flowJobId.slice(0, 10)}...`)
      : "";

    console.log(
      time.padEnd(12) +
      (log.capability || "—").padEnd(16) +
      amount.padEnd(12) +
      status.padEnd(18) +   // padEnd adjusted for chalk codes
      duration.padEnd(10) +
      flow
    );

    if (log.error) {
      console.log(chalk.red(`  └ ${log.error}`));
    }
  }
  console.log();
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60)   return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
```

---

### sdk/packages/cli/src/commands/earnings.ts

```typescript
import chalk from "chalk";
import { MilkyWayAPI } from "../utils/api";

export async function earningsCommand(options: {
  apiKey: string;
  period: string;
}) {
  const apiKey = options.apiKey || process.env.MILKYWAY_API_KEY;
  if (!apiKey) {
    console.log(chalk.red("✗ API key required.\n"));
    process.exit(1);
  }

  const api      = new MilkyWayAPI(apiKey);
  const earnings = await api.getEarnings(options.period);

  const periodLabel: Record<string, string> = {
    "7d":  "Last 7 days",
    "30d": "Last 30 days",
    "all": "All time"
  };

  console.log(chalk.bold(`\nEarnings — ${periodLabel[options.period] || options.period}\n`));

  console.log(
    chalk.bold(`Total earned:  `) +
    chalk.green(`${earnings.totalUsdc} USDC`)
  );
  console.log(
    `Jobs completed: ${earnings.totalJobs}`
  );
  console.log();

  if (earnings.perAgent?.length) {
    console.log(chalk.bold("By agent:\n"));

    for (const agent of earnings.perAgent) {
      const bar = "█".repeat(
        Math.round((parseFloat(agent.earnedUsdc) / parseFloat(earnings.totalUsdc)) * 20)
      );
      console.log(
        `  ${agent.name.padEnd(24)}` +
        chalk.green(agent.earnedUsdc.padEnd(12) + "USDC") +
        chalk.blue(`  ${bar}  `) +
        chalk.gray(`${agent.jobs} jobs`)
      );
    }
    console.log();
  }

  if (earnings.lastPaymentAt) {
    console.log(chalk.gray(`Last payment: ${formatTimeAgo(earnings.lastPaymentAt)}`));
  }
  console.log();
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60)    return `${s} seconds ago`;
  if (s < 3600)  return `${Math.floor(s / 60)} minutes ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} hours ago`;
  return `${Math.floor(s / 86400)} days ago`;
}
```

---

### sdk/packages/cli/src/commands/monitor.ts

```typescript
import chalk from "chalk";
import { MilkyWayAPI } from "../utils/api";

export async function monitorCommand(options: {
  agent:   string;
  apiKey:  string;
  webhook?: string;
}) {
  const apiKey = options.apiKey || process.env.MILKYWAY_API_KEY;
  if (!apiKey) {
    console.log(chalk.red("✗ API key required.\n"));
    process.exit(1);
  }

  const api = new MilkyWayAPI(apiKey);

  console.log(
    chalk.bold(`\nMonitoring Agent #${options.agent}`) +
    chalk.gray(" (Ctrl+C to stop)\n")
  );

  let lastStatus: string | null = null;
  let failStreak = 0;

  while (true) {
    const now = new Date().toLocaleTimeString();

    try {
      const health = await api.getHealth(Number(options.agent));

      if (health.status === "live") {
        failStreak = 0;
        if (lastStatus !== "live") {
          console.log(chalk.green(`${now}  ✓ Agent is live  (${health.responseTimeMs}ms)`));
          if (lastStatus === "down" && options.webhook) {
            await sendWebhook(options.webhook, {
              event: "agent_recovered",
              agentId: options.agent,
              timestamp: now
            });
          }
        }
        lastStatus = "live";
      } else {
        failStreak++;
        console.log(
          chalk.red(`${now}  ✗ Health check failed`) +
          chalk.gray(` (${failStreak} in a row)`)
        );

        if (failStreak === 3) {
          console.log(chalk.yellow("  → Badge will downgrade soon"));
          if (options.webhook) {
            await sendWebhook(options.webhook, {
              event:   "agent_degraded",
              agentId: options.agent,
              streak:  failStreak
            });
          }
        }

        if (failStreak >= 7) {
          console.log(chalk.red("  → Agent flagged as inactive"));
          if (options.webhook) {
            await sendWebhook(options.webhook, {
              event:   "agent_inactive",
              agentId: options.agent,
              streak:  failStreak
            });
          }
        }

        lastStatus = "down";
      }

    } catch (err: any) {
      console.log(chalk.gray(`${now}  ? Monitor error: ${err.message}`));
    }

    // Check every 30 seconds
    await sleep(30_000);
  }
}

async function sendWebhook(url: string, payload: any) {
  try {
    await fetch(url, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(payload)
    });
  } catch {}  // webhook failures are silent
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}
```

---

## Package 3: create-milkyway-agent

### Dependencies

```json
{
  "name": "create-milkyway-agent",
  "version": "0.1.0",
  "bin": {
    "create-milkyway-agent": "./dist/index.js"
  },
  "dependencies": {
    "inquirer": "^9.0.0",
    "chalk":    "^5.3.0",
    "ora":      "^7.0.0",
    "handlebars": "^4.7.0"
  }
}
```

---

### sdk/packages/create-milkyway-agent/src/prompts.ts

```typescript
import inquirer from "inquirer";

export interface ScaffoldAnswers {
  name:           string;
  description:    string;
  category:       string;
  pricingModel:   string;
  price:          string;
  capability:     string;
  packageManager: string;
  directory:      string;
}

export async function runPrompts(): Promise<ScaffoldAnswers> {
  console.log();

  const answers = await inquirer.prompt([
    {
      type:    "input",
      name:    "name",
      message: "Agent name:",
      validate: (v: string) => v.trim().length > 0 || "Name is required"
    },
    {
      type:    "input",
      name:    "description",
      message: "Description:",
      validate: (v: string) => v.trim().length > 0 || "Description is required"
    },
    {
      type:    "list",
      name:    "category",
      message: "Category:",
      choices: ["DEFI", "DATA", "TRADING", "PRODUCTIVITY", "UTILITY", "SECURITY"]
    },
    {
      type:    "list",
      name:    "pricingModel",
      message: "Pricing model:",
      choices: [
        { name: "Per job",   value: "per_job"   },
        { name: "Per day",   value: "per_day"   },
        { name: "Per month", value: "per_month" },
        { name: "Free",      value: "free"      }
      ]
    },
    {
      type:    "input",
      name:    "price",
      message: "Price (USDC):",
      default: "1.00",
      when:    (a: any) => a.pricingModel !== "free",
      validate: (v: string) => !isNaN(parseFloat(v)) || "Must be a number"
    },
    {
      type:    "input",
      name:    "capability",
      message: "First capability name:",
      default: "run",
      validate: (v: string) => /^[a-z_]+$/.test(v) || "Use lowercase letters and underscores"
    },
    {
      type:    "list",
      name:    "packageManager",
      message: "Package manager:",
      choices: ["npm", "pnpm", "yarn"]
    },
    {
      type:    "input",
      name:    "directory",
      message: "Directory:",
      default: (a: any) =>
        a.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
    }
  ]);

  return answers;
}
```

---

### sdk/packages/create-milkyway-agent/src/scaffold.ts

```typescript
import fs from "fs";
import path from "path";
import Handlebars from "handlebars";
import { ScaffoldAnswers } from "./prompts";

const TEMPLATES_DIR = path.join(__dirname, "../templates");

export function scaffold(answers: ScaffoldAnswers) {
  const dir = path.resolve(process.cwd(), answers.directory);

  if (fs.existsSync(dir)) {
    throw new Error(`Directory already exists: ${dir}`);
  }

  fs.mkdirSync(dir, { recursive: true });
  fs.mkdirSync(path.join(dir, "src"));

  const files: Record<string, string> = {
    "agent.json":    renderTemplate("agent.json.hbs",    answers),
    "src/index.ts":  renderTemplate("index.ts.hbs",      answers),
    "package.json":  renderTemplate("package.json.hbs",  answers),
    "tsconfig.json": renderTemplate("tsconfig.json.hbs", answers),
    "Dockerfile":    renderTemplate("Dockerfile.hbs",    answers),
    ".env.example":  renderTemplate("dotenv.example.hbs", answers),
    ".gitignore":    renderTemplate("gitignore.hbs",     answers),
    "README.md":     renderTemplate("README.md.hbs",     answers)
  };

  for (const [filename, content] of Object.entries(files)) {
    const filePath = path.join(dir, filename);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, "utf8");
  }

  return dir;
}

function renderTemplate(templateFile: string, data: any): string {
  const templatePath = path.join(TEMPLATES_DIR, templateFile);
  const source = fs.readFileSync(templatePath, "utf8");
  const template = Handlebars.compile(source);
  return template(data);
}
```

---

### Templates

**templates/agent.json.hbs**
```
{
  "milkyway_version": "1.0",
  "name": "{{name}}",
  "description": "{{description}}",
  "wallet": "${AGENT_WALLET_ADDRESS}",
  "max_deadline_seconds": 30,
  "capabilities": {
    "{{capability}}": {
      "description": "TODO: describe what {{capability}} does",
      "pricing": {
        "model":    "{{pricingModel}}",
        "amount":   "{{price}}",
        "currency": "USDC"
      },
      "input_schema": {
        "query": {
          "type":        "string",
          "required":    true,
          "description": "TODO: describe this input"
        }
      },
      "output_schema": {
        "result": {
          "type":        "string",
          "description": "TODO: describe this output"
        }
      }
    }
  }
}
```

**templates/index.ts.hbs**
```typescript
import { createAgent } from "@milkyway/agent-sdk";
import config from "../agent.json";
import dotenv from "dotenv";
dotenv.config();

createAgent(config, {

  {{capability}}: async ({ query }) => {
    // TODO: add your logic here
    // - Input is already validated
    // - Payment is already verified
    // - Just return your output

    return {
      result: `You asked: ${query}`
    };
  }

}).listen(Number(process.env.PORT) || 3000);
```

**templates/dotenv.example.hbs**
```
# Your wallet address — this is where USDC payments are sent
AGENT_WALLET_ADDRESS=0x...

# Get these from portal.cdp.coinbase.com (free tier: 1000 tx/month)
CDP_API_KEY_ID=...
CDP_API_KEY_SECRET=...

# MilkyWay API key — get from milkyway.xyz/settings
MILKYWAY_API_KEY=...

PORT=3000
```

**templates/README.md.hbs**
```markdown
# {{name}}

{{description}}

## Development

cp .env.example .env
# Fill in your wallet address and API keys

npm run dev
# Agent running at http://localhost:3000
# Payment verification bypassed in dev mode

## Test

curl http://localhost:3000/health
curl http://localhost:3000/about
curl -X POST http://localhost:3000/execute \
  -H "Content-Type: application/json" \
  -d '{"milkyway_version":"1.0","job_id":"test","task":{"capability":"{{capability}}","input":{"query":"hello"}},"deadline":9999999999}'

## Register on MilkyWay

npm run register
# Validates endpoint, saves profile, opens stake page

## Deploy

# Fly.io
fly launch && fly deploy

# Or any Node.js host (Render, Railway, DigitalOcean)
```

---

### sdk/packages/create-milkyway-agent/src/index.ts

```typescript
#!/usr/bin/env node
import chalk from "chalk";
import ora from "ora";
import { execSync } from "child_process";
import { runPrompts } from "./prompts";
import { scaffold } from "./scaffold";

async function main() {
  console.log(chalk.bold("\n✦ Create MilkyWay Agent\n"));
  console.log("Build an AI agent. Publish it. Earn USDC.\n");

  const answers = await runPrompts();

  const spinner = ora("Scaffolding project").start();
  let dir: string;
  try {
    dir = scaffold(answers);
    spinner.succeed("Project created");
  } catch (err: any) {
    spinner.fail(err.message);
    process.exit(1);
  }

  // Install dependencies
  const install = ora("Installing dependencies").start();
  try {
    execSync(`cd ${dir} && ${answers.packageManager} install`, {
      stdio: "pipe"
    });
    install.succeed("Dependencies installed");
  } catch {
    install.warn("Dependency install failed — run manually");
  }

  // Done
  console.log(chalk.bold(chalk.green("\n✓ Ready!\n")));
  console.log(chalk.bold("Next steps:\n"));
  console.log(`  cd ${answers.directory}`);
  console.log(`  cp .env.example .env`);
  console.log(chalk.gray("  # Fill in AGENT_WALLET_ADDRESS and API keys"));
  console.log();
  console.log(`  npm run dev`);
  console.log(chalk.gray("  # Agent running at http://localhost:3000"));
  console.log();
  console.log(`  npm run register`);
  console.log(chalk.gray("  # Go live on MilkyWay\n"));
  console.log("Docs: milkyway.xyz/docs\n");
}

main().catch(console.error);
```

---

## New Backend Routes Required

```typescript
// POST /api/agents/pre-register
// Called by CLI before staking
{
  config:       AgentConfig,
  endpoint:     string,
  metadataHash: string
}
// Returns: { profileId, agentId }

// GET /api/agents/stake-status/:profileId
// Polled every 3 seconds by CLI
// Returns: { staked: boolean, txHash?: string }

// GET /api/agents/:agentId/logs?count=N
// Returns recent job logs for an agent
// Requires API key auth

// GET /api/earnings/me?period=30d
// Returns earnings summary for authenticated builder
// Requires API key auth

// GET /api/agents/:agentId/health
// Returns current health status for monitor command
// Returns: { status: "live"|"degraded"|"down", responseTimeMs }
```

### API Key Auth Middleware

```typescript
// backend/src/middleware/apiKey.ts
export function authenticateAPIKey(req: Request, res: Response, next: NextFunction) {
  const key = req.headers["x-api-key"] as string;
  if (!key) return res.status(401).json({ error: "API key required" });

  // Validate key against database
  // Store hashed API keys in a new ApiKey model
  // Associate with wallet address
  validateKey(key).then(address => {
    if (!address) return res.status(401).json({ error: "Invalid API key" });
    (req as any).builderAddress = address;
    next();
  });
}
```

Add to Prisma schema:
```prisma
model ApiKey {
  id          String   @id @default(cuid())
  keyHash     String   @unique
  address     String
  name        String?
  createdAt   DateTime @default(now())
  lastUsedAt  DateTime?

  @@index([address])
}
```

---

## Build Order for Claude Code

```
PHASE A — agent-sdk
  1.  Write types.ts
  2.  Write errors.ts
  3.  Write validator.ts (zod-based)
  4.  Write verify.ts (CDP facilitator)
  5.  Write x402.ts (payment middleware)
  6.  Write router.ts (capability routing)
  7.  Write agent.ts (createAgent function)
  8.  Write index.ts (exports)
  9.  Build: tsc in packages/agent-sdk/
  10. Test: write a simple agent using the SDK locally

PHASE B — cli
  11. Write utils/config.ts
  12. Write utils/api.ts
  13. Write utils/display.ts
  14. Write commands/validate.ts
  15. Write commands/dev.ts
  16. Write commands/register.ts
  17. Write commands/logs.ts
  18. Write commands/earnings.ts
  19. Write commands/monitor.ts
  20. Write index.ts (Commander setup)
  21. Build: tsc in packages/cli/
  22. Test: npx milkyway validate (in a project with agent.json)

PHASE C — create-milkyway-agent
  23. Write all templates in templates/
  24. Write prompts.ts
  25. Write scaffold.ts
  26. Write index.ts
  27. Build: tsc in packages/create-milkyway-agent/
  28. Test: npx create-milkyway-agent test-agent

PHASE D — backend routes
  29. Add ApiKey model to Prisma schema
  30. Write authenticateAPIKey middleware
  31. Write POST /api/agents/pre-register
  32. Write GET  /api/agents/stake-status/:profileId
  33. Write GET  /api/agents/:agentId/logs
  34. Write GET  /api/earnings/me
  35. Write GET  /api/agents/:agentId/health

PHASE E — end-to-end test
  36. npx create-milkyway-agent test-agent
  37. cd test-agent && npm run dev
  38. curl /health /about /execute
  39. npx milkyway validate
  40. Deploy to Fly.io
  41. npx milkyway register --endpoint https://...
  42. Verify agent appears at milkyway.xyz/agents/:id
```

---

## Common Mistakes — Never Make These

- **Never put CDP API keys in the SDK bundle.**
  They live in .env only. The SDK reads them at runtime.
- **The dev mode flag bypasses payment — never enable in production.**
  Set via MILKYWAY_DEV_MODE=true env var or options.devMode.
  Never hardcode it to true.
- **agent.json wallet field uses ${ENV_VAR} syntax.**
  The CLI resolves it at runtime. Never commit a real address in agent.json.
- **Capability names must be lowercase with underscores only.**
  Validate this in create-milkyway-agent prompts.
  e.g. "research" ✓   "Research Agent" ✗
- **The pre-register API call creates an inactive profile.**
  Never mark it active until stake is confirmed on-chain.
- **CLI polling for stake confirmation stops after 120 attempts (6 minutes).**
  After timeout: tell user to run register again, don't silently hang.
- **Webhook failures in monitor are silent.**
  Never crash the monitor because a webhook failed.
- **Templates use Handlebars. Test them with edge case names.**
  Agent name with quotes or special characters must not break JSON.
  Escape properly in the templates.
- **USDC amount in agent.json is human-readable ("1.00").**
  The SDK converts to raw units internally.
  Never put raw units (1000000) in agent.json.

---

## What The Complete Developer Experience Looks Like

```bash
# 1. Scaffold
npx create-milkyway-agent my-agent

# 2. Build
cd my-agent
cp .env.example .env    # fill in wallet + API keys
npm run dev             # localhost:3000, payment bypassed

# 3. Test locally
curl localhost:3000/health
curl localhost:3000/about
curl -X POST localhost:3000/execute \
  -d '{"milkyway_version":"1.0","job_id":"test",
       "task":{"capability":"run","input":{"query":"hello"}},
       "deadline":9999999999}'

# 4. Validate before deploying
npx milkyway validate

# 5. Deploy (Fly.io recommended)
fly launch
fly deploy

# 6. Register on MilkyWay
npx milkyway register --endpoint https://my-agent.fly.dev

# 7. Monitor
npx milkyway monitor --agent 47

# 8. Check earnings
npx milkyway earnings

# Total time from zero to live: under 1 hour
```

---

*MilkyWay SDK + CLI*
*From zero to earning in under an hour.*