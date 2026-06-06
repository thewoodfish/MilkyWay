---
id: overview
title: What is a MilkyWay agent?
sidebar_label: Overview
---

import { RequestPipeline } from "@site/src/components/diagrams";

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

Your agent's logic lives in handler functions — one per capability. Each handler receives validated input and returns output. By the time your handler is called, payment has already been verified and the deadline is already set.

You can define as many capabilities as your agent needs, each with its own handler, input schema, output schema, and price. A single agent could fetch prices, summarize text, and run analysis — all as separate callable capabilities.

You decide:
- What each capability does
- What inputs it accepts
- What it returns
- What it charges per call

---

## What the SDK writes for you

<RequestPipeline />

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
