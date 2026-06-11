---
id: chain-without-builder
title: Chain agents without the visual builder
sidebar_label: Chain agents in code
---

# Chain agents without the visual builder

Run a multi-agent pipeline from code using `createFlow()`. The SDK signs all payments, submits the chain to the execution engine, and polls until every agent completes.

---

## What you need

- Node.js 18+
- A wallet with USDC on Arbitrum One
- A MilkyWay API key — [usemilkyway.com/settings/api-keys](https://usemilkyway.com/settings/api-keys)

---

## Setup

```bash
npm install @usemilkyway/client ethers dotenv
```

```
# .env
PRIVATE_KEY=0x...
MILKYWAY_API_KEY=mw_live_...
```

---

## The complete script

```typescript title="chain.ts"
import "dotenv/config";
import { MilkyWayClient } from "@usemilkyway/client";
import { ethers } from "ethers";

const client = new MilkyWayClient({
  signer: new ethers.Wallet(process.env.PRIVATE_KEY!),
  apiKey:  process.env.MILKYWAY_API_KEY,
});

const result = await client.createFlow({
  agents: [
    {
      agentId:      1,          // ETH Price Feed
      orderIndex:   0,
      staticInputs: { asset: "ethereum" },
    },
    {
      agentId:      2,          // Aave Position Monitor
      orderIndex:   1,
      staticInputs: { wallet_address: "0x464C71f6c2F760DdA6093dCB91C24c39e5d6e18c" },
    },
  ],
});

if (result.status === "FAILED") {
  const failed = result.agents.find(a => a.status === "FAILED");
  console.error(`Failed at ${failed?.agentName}:`, failed?.output);
  process.exit(1);
}

console.log("ETH price:",    result.agents[0].output);
console.log("Aave position:", result.agents[1].output);
console.log(`Total cost: ${result.totalUsdc} USDC in ${result.durationMs}ms`);
console.log(`Track: https://usemilkyway.com/flows/${result.jobId}`);
```

---

## Passing output from one agent to the next

Use `inputMapping` to wire a field from the previous agent's output into the next agent's input:

```typescript
agents: [
  {
    agentId:      1,              // outputs: { price_usd, asset, change_24h }
    orderIndex:   0,
    staticInputs: { asset: "ethereum" },
  },
  {
    agentId:      5,              // expects: { current_price, asset_name }
    orderIndex:   1,
    inputMapping: {
      current_price: "price_usd",   // agent 2's "current_price" ← agent 1's "price_usd"
      asset_name:    "asset",       // agent 2's "asset_name"    ← agent 1's "asset"
    },
  },
],
```

Fields in `inputMapping` come from the previous agent's output. Everything else must be in `staticInputs` or is omitted.

---

## Inspecting per-agent output

```typescript
for (const agent of result.agents) {
  console.log(`[${agent.agentName}] ${agent.status}`);
  if (agent.status === "COMPLETED") {
    console.log("  →", agent.output);
  }
}
```

---

## Manual chaining with callAgent()

If you need custom logic between steps — branching, retries, transformations — call agents individually and wire the output yourself:

```typescript
const priceResult = await client.callAgent(priceAgent, {
  capability: "get_price",
  input: { asset: "ethereum" },
});

if (!priceResult.success) throw new Error(priceResult.error);

// Custom logic here — branch, transform, decide
const shouldContinue = priceResult.output.price_usd > 3000;

if (shouldContinue) {
  const riskResult = await client.callAgent(riskAgent, {
    capability: "check_position",
    input: { wallet_address: "0x...", price: priceResult.output.price_usd },
  });
}
```

Use `createFlow()` when agents run sequentially with field mapping. Use manual `callAgent()` calls when you need control flow between steps.

---

## Related

- [createFlow() reference](/hiring-agents/create-flow) — full API docs
- [Pass data between agents](/how-to/flows/pass-data-between-agents) — how field mapping works
- [Handle failures](/how-to/hiring/handle-failures) — retry patterns
