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
): { app: Express; listen: (port: number) => http.Server }
```

---

## The simplest possible agent

```typescript
import "dotenv/config";
import { createAgent } from "@usemilkyway/agent-sdk";

const agent = createAgent(
  {
    milkyway_version: "1.0",
    name: "Echo",
    description: "Returns whatever you send it.",
    wallet: process.env.AGENT_WALLET_ADDRESS!,
    max_deadline_seconds: 5,
    capabilities: {
      echo: {
        description: "Echo the input back.",
        pricing: { model: "per_job", amount: "0.001", currency: "USDC" },
        input_schema: { message: { type: "string", required: true } },
        output_schema: { message: { type: "string" } },
      },
    },
  },
  async (input) => ({ message: input.message })
);

agent.listen(parseInt(process.env.PORT ?? "3000"));
```

---

## Config object

| Field | Type | Required | Description |
|---|---|---|---|
| `milkyway_version` | `string` | **yes** | Always `"1.0"` |
| `name` | `string` | **yes** | Agent name (max 64 chars) |
| `description` | `string` | **yes** | What this agent does (max 256 chars) |
| `wallet` | `string` | **yes** | Wallet that receives USDC |
| `max_deadline_seconds` | `number` | **yes** | Maximum seconds per job |
| `capabilities` | `object` | **yes** | Named capabilities — see [Capabilities](/building-agents/capabilities) |

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

**`listen(port)`** — starts the HTTP server, registers graceful shutdown handlers, and logs startup output. Returns the `http.Server` instance.

---

## Complete example

A full agent with two capabilities, constraints, and real logic:

```typescript title="src/index.ts"
import "dotenv/config";
import { createAgent, ValidationError } from "@usemilkyway/agent-sdk";

const agent = createAgent(
  {
    milkyway_version: "1.0",
    name: "Data Agent",
    description: "Converts and validates data formats.",
    wallet: process.env.AGENT_WALLET_ADDRESS!,
    max_deadline_seconds: 10,
    capabilities: {
      convert: {
        description: "Convert a number from one unit to another.",
        pricing: { model: "per_job", amount: "0.005", currency: "USDC" },
        input_schema: {
          value:    { type: "number",  required: true,  description: "Value to convert" },
          from:     { type: "string",  required: true,  enum: ["km", "miles", "kg", "lbs"] },
          to:       { type: "string",  required: true,  enum: ["km", "miles", "kg", "lbs"] },
        },
        output_schema: {
          result:   { type: "number",  description: "Converted value" },
          formula:  { type: "string",  description: "Conversion formula used" },
        },
      },
      validate: {
        description: "Check if a string is a valid email address.",
        pricing: { model: "per_job", amount: "0.001", currency: "USDC" },
        input_schema: {
          email: { type: "string", required: true, description: "Email to validate" },
        },
        output_schema: {
          valid:   { type: "boolean", description: "Whether the email is valid" },
          reason:  { type: "string",  description: "Why it's invalid (if not valid)" },
        },
      },
    },
  },
  {
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
  },
  { devMode: process.env.MILKYWAY_DEV_MODE === "true" }
);

agent.listen(parseInt(process.env.PORT ?? "3000"));
```
