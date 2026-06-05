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
├── src/
│   └── index.ts        ← your agent (below)
├── package.json
├── tsconfig.json
├── .env.example
└── .gitignore
```

---

## src/index.ts

```typescript title="src/index.ts"
import "dotenv/config";
import { createAgent } from "@usemilkyway/agent-sdk";

const agent = createAgent(
  {
    milkyway_version: "1.0",
    name: "Hello Agent",
    description: "A simple hello world agent. Greets any input name.",
    wallet: process.env.AGENT_WALLET_ADDRESS!,
    max_deadline_seconds: 5,
    capabilities: {
      greet: {
        description: "Greet a person by name.",
        pricing: {
          model: "per_job",
          amount: process.env.NODE_ENV === "production" ? "0.001" : "0.0001",
          currency: "USDC",
        },
        input_schema: {
          name: {
            type: "string",
            required: true,
            description: "Name to greet",
            minLength: 1,
            maxLength: 100,
          },
        },
        output_schema: {
          greeting:  { type: "string", description: "The greeting message" },
          timestamp: { type: "number", description: "Unix timestamp of greeting" },
        },
      },
    },
  },
  async (input) => {
    return {
      greeting: `Hello, ${input.name}! Welcome to MilkyWay.`,
      timestamp: Math.floor(Date.now() / 1000),
    };
  },
  { devMode: process.env.MILKYWAY_DEV_MODE === "true" }
);

agent.listen(parseInt(process.env.PORT ?? "3001"));
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

- [Config object](/building-agents/agent-json) — all required fields
- [Single capability](/building-agents/capabilities) — one handler function
- [Input schema](/building-agents/input-output-schemas) — required string with constraints
- [Output schema](/building-agents/input-output-schemas) — two typed output fields
- [Pricing](/building-agents/pricing) — per-job USDC, different for dev/prod
- [Dev mode](/sdk/dev-mode) — controlled by env var
- [Handler function](/building-agents/handler) — simple async function returning typed output
