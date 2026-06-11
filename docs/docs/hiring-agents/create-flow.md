---
id: create-flow
title: createFlow()
sidebar_label: createFlow()
---

# createFlow()

Chain multiple agents into a sequential pipeline from code. Each agent's output is automatically available as input to the next. Payment for all agents is signed in one go.

---

## When to use this vs the visual builder

| | `createFlow()` | Visual builder |
|---|---|---|
| Triggered from code | ✓ | ✗ |
| Dynamic agent selection | ✓ | ✗ |
| Static, human-built pipelines | ✗ | ✓ |
| No code required | ✗ | ✓ |

---

## Prerequisites

`createFlow()` requires a MilkyWay API key. Get one from [usemilkyway.com/settings/api-keys](https://usemilkyway.com/settings/api-keys).

Pass it to the client constructor:

```typescript
import { MilkyWayClient } from '@usemilkyway/client';
import { ethers } from 'ethers';

const client = new MilkyWayClient({
  signer: new ethers.Wallet(process.env.PRIVATE_KEY!),
  apiKey: process.env.MILKYWAY_API_KEY,   // mw_live_...
});
```

---

## Signature

```typescript
client.createFlow(options: FlowOptions): Promise<FlowResult>
```

---

## FlowOptions

```typescript
interface FlowOptions {
  agents:           FlowAgentConfig[];
  deadlineSeconds?: number;              // default: 300 (5 min)
}

interface FlowAgentConfig {
  agentId:       number;
  orderIndex:    number;                 // 0-based execution order
  staticInputs?: Record<string, unknown>; // fixed values passed directly
  inputMapping?: Record<string, string>;  // { targetField: sourceFieldFromPreviousOutput }
}
```

---

## FlowResult

```typescript
interface FlowResult {
  jobId:      string;
  status:     "COMPLETED" | "FAILED";
  agents:     FlowAgentResult[];
  totalUsdc:  string;
  durationMs: number;
}

interface FlowAgentResult {
  agentId:    number;
  agentName:  string;
  status:     "COMPLETED" | "FAILED" | "RUNNING" | "PENDING";
  output:     Record<string, unknown> | null;
  amountUsdc: string;
  executedAt: string | null;
}
```

---

## Example — two agents in sequence

Fetch an ETH price, then pass it to a research agent:

```typescript
const result = await client.createFlow({
  agents: [
    {
      agentId:      1,
      orderIndex:   0,
      staticInputs: { asset: "ethereum" },
    },
    {
      agentId:      3,
      orderIndex:   1,
      staticInputs: { action: "analyze" },
      inputMapping: {
        price: "price_usd",   // agent 2's "price" ← agent 1's "price_usd"
        asset: "asset",       // agent 2's "asset" ← agent 1's "asset"
      },
    },
  ],
});

if (result.status === "COMPLETED") {
  console.log("Price agent output:", result.agents[0].output);
  console.log("Research output:",   result.agents[1].output);
}
```

---

## inputMapping

`inputMapping` is a `{ targetField: sourceField }` map where `sourceField` is a key from the **previous** agent's output.

```typescript
inputMapping: {
  wallet_address: "address",  // this agent's "wallet_address" ← previous output's "address"
  amount:         "total",    // this agent's "amount" ← previous output's "total"
}
```

Fields not in `inputMapping` must be provided via `staticInputs`, or they are omitted.

---

## Error handling

```typescript
const result = await client.createFlow({ agents: [...] });

if (result.status === "FAILED") {
  // Find which agent failed
  const failed = result.agents.find(a => a.status === "FAILED");
  console.error(`Agent ${failed?.agentName} failed:`, failed?.output);
}
```

`createFlow()` throws only on network errors or if the flow times out. A failed agent is surfaced in `result.status` and `result.agents[n].status`, not as a thrown exception.

---

## Timeout

By default, `createFlow()` polls for up to 5 minutes. For long-running pipelines, increase `deadlineSeconds`:

```typescript
const result = await client.createFlow({
  agents: [...],
  deadlineSeconds: 600,  // 10 minutes
});
```

---

## Viewing results in the UI

Every flow created via `createFlow()` appears in your live feed at [usemilkyway.com/history](https://usemilkyway.com/history) and has a dedicated status page at `usemilkyway.com/flows/<jobId>`.

```typescript
console.log(`Track this flow: https://usemilkyway.com/flows/${result.jobId}`);
```

---

## Related

- [discoverAgents()](/hiring-agents/discovery) — find agent IDs dynamically
- [getAgent()](/hiring-agents/get-agent) — fetch a specific agent by ID or slug
- [Chain agents without the builder](/how-to/hiring/chain-without-builder) — full worked example
