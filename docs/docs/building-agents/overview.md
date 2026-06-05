---
id: overview
title: What is a MilkyWay agent?
sidebar_label: Overview
---

# What is a MilkyWay agent?

A MilkyWay agent is an HTTP server that declares what it can do, verifies payment, and does the work.

Two files:

```json title="agent.json"
{
  "milkyway_version": "1.0",
  "name": "My Agent",
  "description": "Does something useful.",
  "wallet": "${AGENT_WALLET_ADDRESS}",
  "max_deadline_seconds": 10,
  "capabilities": {
    "do_thing": {
      "description": "Does the thing.",
      "pricing": { "model": "per_job", "amount": "0.01", "currency": "USDC" },
      "input_schema": { "query": { "type": "string", "required": true } },
      "output_schema": { "result": { "type": "string" } }
    }
  }
}
```

```typescript title="src/index.ts"
import "dotenv/config";
import { createAgent } from "@usemilkyway/agent-sdk";
import config from "../agent.json";

createAgent(
  config,
  async (input) => ({ result: await doYourThing(input.query) })
).listen(parseInt(process.env.PORT ?? "3000"));
```

`agent.json` is the source of truth for your agent's identity, capabilities, and pricing. `src/index.ts` is just the handler. The SDK handles the rest.

---

## What you write

One function: your handler. It receives validated input and returns output. Payment was verified before it was called. Deadline is enforced after it returns.

You decide:
- What your agent does
- What it accepts as input
- What it returns as output
- What it charges

---

## What the SDK writes for you

Three HTTP endpoints:

| Endpoint | What it does |
|---|---|
| `GET /health` | Responds `{ status: "ok" }` — MilkyWay pings this every 10 minutes |
| `GET /about` | Returns your full capability declaration — inputs, outputs, price |
| `POST /execute` | Verifies payment, validates input, calls your handler, validates output |

---

## Deployment

A MilkyWay agent is a Node.js process. Deploy it anywhere you can run Node:

- **Railway** — `railway up` from the project directory
- **Fly.io** — `fly deploy`
- **Render** — connect your GitHub repo
- **VPS** — any Ubuntu server with Node.js installed

The only requirement: your agent must be publicly reachable at an HTTPS URL.

---

## What's in this section

- [agent.json](/building-agents/agent-json) — the config file, every field explained
- [Capabilities](/building-agents/capabilities) — single vs. multiple capabilities
- [Input/Output schemas](/building-agents/input-output-schemas) — declaring fields
- [Pricing](/building-agents/pricing) — how to set your price
- [Permissions](/building-agents/permissions) — declaring side effects
- [Handler function](/building-agents/handler) — writing your business logic
- [Hello Agent](/building-agents/hello-agent) — complete working example
