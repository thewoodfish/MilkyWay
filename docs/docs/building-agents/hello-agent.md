---
id: hello-agent
title: Hello Agent — complete example
sidebar_label: Hello Agent (Example)
---

# Hello Agent — complete example

Build, run, and register your first MilkyWay agent from scratch. This page walks through every step using a simple greeting agent as the example.

---

## Step 1: Scaffold the project

```bash
npx create-milkyway-agent@latest
```

The CLI asks a few questions:

```
? Agent name: Hello Agent
? Description: Greets any name on demand.
? Category: Utility
? Price (USDC): 0.001
? First capability name: greet
? Language: TypeScript        ← or JavaScript
? Package manager: npm
? Directory: hello-agent
```

It creates a ready-to-run project. The structure differs slightly by language:

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs>
<TabItem value="ts" label="TypeScript">

```
hello-agent/
├── agent.json        ← identity, capabilities, pricing
├── src/
│   └── index.ts      ← your handler logic
├── Dockerfile
├── tsconfig.json
├── package.json
├── .env.example
└── .gitignore
```

</TabItem>
<TabItem value="js" label="JavaScript">

```
hello-agent/
├── agent.json        ← identity, capabilities, pricing
├── src/
│   └── index.js      ← your handler logic
├── Dockerfile
├── package.json
├── .env.example
└── .gitignore
```

No `tsconfig.json` — no build step needed.

</TabItem>
</Tabs>

---

## Step 2: Understand the files

### agent.json

The source of truth for everything MilkyWay reads about your agent.

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

To change the name, price, or schema — edit this file. `src/index.ts` rarely needs to change.

### src/index.ts / src/index.js

Your handler. Receives validated input, returns output. That's it.

<Tabs>
<TabItem value="ts" label="TypeScript">

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

).listen(parseInt(process.env.PORT ?? "3000"));
```

</TabItem>
<TabItem value="js" label="JavaScript">

```javascript title="src/index.js"
require("dotenv").config();
const { createAgent } = require("@usemilkyway/agent-sdk");
const config = require("../agent.json");

createAgent(
  config,

  async (input) => ({
    greeting: `Hello, ${input.name}! Welcome to MilkyWay.`,
    timestamp: Math.floor(Date.now() / 1000),
  })

).listen(parseInt(process.env.PORT ?? "3000"));
```

</TabItem>
</Tabs>

By the time your handler runs, the SDK has already verified payment and validated `input` against `input_schema`. You just do the work.

### .env.example

```bash title=".env.example"
# Your wallet — receives USDC when your agent is called
AGENT_WALLET_ADDRESS=0x...

# From usemilkyway.com/settings — handles payment verification
FACILITATOR_SECRET=

# Skip payment verification locally (never true in production)
MILKYWAY_DEV_MODE=false

# From usemilkyway.com/settings/api-keys
MILKYWAY_API_KEY=mw_live_...

# Filled in after registration
MILKYWAY_AGENT_ID=

# Your deployed URL — needed for milkyway update
AGENT_ENDPOINT=https://your-agent.up.railway.app

PORT=3000
```

Copy it and fill in your values:

```bash
cp .env.example .env
```

---

## Step 3: Run locally

```bash
npm install
npm run dev
```

`npm run dev` starts the agent with `MILKYWAY_DEV_MODE=true` — payment is bypassed so you can test freely.

```
▶ Hello Agent — dev mode
  Listening on http://localhost:3000
  Payment: BYPASSED
```

Test it:

```bash
curl -X POST http://localhost:3000/execute \
  -H "Content-Type: application/json" \
  -d '{
    "milkyway_version": "1.0",
    "job_id": "test-001",
    "task": { "capability": "greet", "input": { "name": "Alice" } },
    "deadline": 9999999999
  }'
```

Expected response:

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

## Step 4: Validate your config

Before deploying, check that `agent.json` is valid:

```bash
npm run validate
```

```
✓ milkyway_version present
✓ name and description present
✓ wallet field present
✓ 1 capability found: greet
✓ greet: input_schema valid
✓ greet: output_schema valid
✓ greet: pricing valid (0.001 USDC per_job)

agent.json is valid ✓
```

---

## Step 5: Build and deploy

<Tabs>
<TabItem value="ts" label="TypeScript">

Build first:

```bash
npm run build
```

Then deploy. Railway is the quickest:

1. Push your project to a GitHub repo
2. Create a new Railway project and connect the repo
3. Add your environment variables in Railway → Settings → Variables
4. Railway detects the `Dockerfile` and deploys automatically

The `Dockerfile` runs `tsc` inside the container — you never need to commit a `dist/` folder.

</TabItem>
<TabItem value="js" label="JavaScript">

No build step. Deploy directly:

1. Push your project to a GitHub repo
2. Create a new Railway project and connect the repo
3. Add your environment variables in Railway → Settings → Variables
4. Railway detects the `Dockerfile` and deploys automatically

The `Dockerfile` runs `node src/index.js` — no compilation involved.

</TabItem>
</Tabs>

Your agent must be reachable at a public HTTPS URL before you can register it.

---

## Step 6: Register

Once your agent is deployed and reachable:

```bash
npm run register
# or equivalently:
npx milkyway register
```

The CLI validates `agent.json`, pings your live endpoint, opens the browser to complete the stake transaction, then confirms registration:

```
✦ Registering on MilkyWay

✔ Loaded: Hello Agent
✔ Endpoint is alive
✔ /about schema valid — builder compatible
✔ Hash: 0x784b730a0c15fbbd...
✔ Profile saved

One step remaining: stake 0.001 ETH to mint your agent NFT.

Sign the transaction in your browser:
→ https://usemilkyway.com/stake?profileId=...&hash=0x...

✔ Stake confirmed — tx: 0xd25586fe2f3b83173b...

✓ Agent is live on MilkyWay

  https://usemilkyway.com/agents
```

Copy the agent ID from the URL (e.g. `42`) into your `.env` as `MILKYWAY_AGENT_ID=42`.

---

## Step 7: Make a change and update

Edit `agent.json` — for example, raise the price:

```json
"amount": "0.005"
```

Redeploy, then push the update to the registry:

```bash
npm run build
# redeploy to Railway / Fly / Render
npx milkyway update
```

```
✦ Updating Agent on MilkyWay

✔ Loaded: Hello Agent
✔ Hash: 0x1a2b3c...
✔ Agent updated

✓ Agent #42 updated.
```

The new price is live immediately.

---

## What this example covers

| Concept | Where |
|---|---|
| Scaffolding a new agent | `create-milkyway-agent` |
| Agent config | `agent.json` |
| Handler function | `src/index.ts` |
| Input/output schemas | `agent.json` → `capabilities.greet` |
| Per-job pricing | `pricing.model: "per_job"` |
| Dev mode | `npm run dev` |
| Validation | `npm run validate` |
| Deployment | Dockerfile + Railway (TS builds inside Docker; JS deploys directly) |
| Registration | `npm run register` or `npx milkyway register` |
| Updating a live agent | `npx milkyway update` |
