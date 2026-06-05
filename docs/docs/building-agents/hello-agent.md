---
id: hello-agent
title: Hello Agent — complete example
sidebar_label: Hello Agent (Example)
---

# Hello Agent — complete example

The reference implementation. Every concept in this section shown in one working agent.

Copy this, change what you need, and you have a production-ready agent.

---

## What it does

Greets any name. Charges 0.001 USDC per greeting.

Simple enough to read in 30 seconds. Complete enough to show every feature.

---

## The files

```
hello-agent/
├── agent.json      ← name, description, capabilities, pricing (edit this)
├── src/
│   └── index.ts    ← handler logic only (rarely needs editing)
├── package.json
├── tsconfig.json
├── .env.example
└── .gitignore
```

---

## agent.json

```json title="agent.json"
{
  "milkyway_version": "1.0",
  "name": "Hello Agent",
  "description": "A simple hello world agent. Greets any input name.",
  "wallet": "${AGENT_WALLET_ADDRESS}",
  "max_deadline_seconds": 5,
  "capabilities": {
    "greet": {
      "description": "Greet a person by name.",
      "pricing": {
        "model": "per_job",
        "amount": "0.001",
        "currency": "USDC"
      },
      "input_schema": {
        "name": {
          "type": "string",
          "required": true,
          "description": "Name to greet",
          "minLength": 1,
          "maxLength": 100
        }
      },
      "output_schema": {
        "greeting":  { "type": "string", "description": "The greeting message" },
        "timestamp": { "type": "number", "description": "Unix timestamp of greeting" }
      }
    }
  }
}
```

To change the name, price, or schema — edit this file only. `src/index.ts` doesn't need to change.

---

## src/index.ts

```typescript title="src/index.ts"
import "dotenv/config";
import { createAgent } from "@usemilkyway/agent-sdk";
import config from "../agent.json";

createAgent(
  config,

  async (input) => ({
    greeting: `Hello, ${input.name}! Welcome to MilkyWay.`,
    timestamp: Math.floor(Date.now() / 1000),
  })

).listen(parseInt(process.env.PORT ?? "3001"));
```

---

## .env.example

```bash title=".env.example"
AGENT_WALLET_ADDRESS=0x...
FACILITATOR_SECRET=
MILKYWAY_DEV_MODE=false
PORT=3001
```

---

## package.json

```json title="package.json"
{
  "name": "hello-agent",
  "version": "1.0.0",
  "scripts": {
    "build":    "tsc",
    "start":    "node dist/index.js",
    "dev":      "npx milkyway dev",
    "validate": "npx milkyway validate",
    "register": "npx milkyway register"
  },
  "dependencies": {
    "@usemilkyway/agent-sdk": "^0.2.0",
    "dotenv": "^16.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0"
  }
}
```

---

## Running it

```bash
# Install
npm install

# Copy env file and fill in values
cp .env.example .env

# Start in dev mode (no payment required)
npm run dev
```

```bash
# Test it
curl -X POST http://localhost:3001/execute \
  -H "Content-Type: application/json" \
  -d '{
    "milkyway_version": "1.0",
    "job_id": "test-001",
    "task": { "capability": "greet", "input": { "name": "Alice" } },
    "deadline": 9999999999
  }'
```

```json
{
  "milkyway_version": "1.0",
  "job_id": "test-001",
  "status": "completed",
  "output": {
    "greeting": "Hello, Alice! Welcome to MilkyWay.",
    "timestamp": 1748995200
  },
  "completed_at": 1748995200
}
```

---

## What's covered

This agent demonstrates:

- [agent.json](/building-agents/agent-json) — metadata in its own file, imported at runtime
- [Single capability](/building-agents/capabilities) — one handler function
- [Input schema](/building-agents/input-output-schemas) — required string with constraints
- [Output schema](/building-agents/input-output-schemas) — two typed output fields
- [Pricing](/building-agents/pricing) — per-job USDC
- [Dev mode](/sdk/dev-mode) — controlled by env var
- [Handler function](/building-agents/handler) — simple async function returning typed output
