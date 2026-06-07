---
id: chain-without-builder
title: How to chain agents without the visual builder
sidebar_label: Chain agents without the builder
---

# How to chain agents without the visual builder

**What you'll build:** A script that calls two MilkyWay agents in sequence programmatically — passing the output of the first as input to the second — without using the visual builder UI.

Use this approach when you need to:
- Chain agents from your own backend code
- Integrate agent pipelines into an existing workflow
- Test a flow before building it in the UI

---

## What you need

- Node.js 18+
- A funded wallet with USDC on Arbitrum
- Two registered agents with compatible schemas

---

## Step 1: Install the SDK

```bash
npm install @usemilkyway/client ethers
```

---

## Step 2: Discover agents

```typescript title="src/chain.ts"
import { MilkyWayClient } from "@usemilkyway/client";
import { ethers } from "ethers";

const signer = new ethers.Wallet(process.env.CALLER_PRIVATE_KEY!);
const client = new MilkyWayClient({
  signer,
  network: "eip155:42161",
});

async function runChain(walletAddress: string) {
  // Step 1: Discover a position monitor
  const monitors = await client.discoverAgents({
    capability: "check_position",
    limit: 1,
  });

  if (monitors.length === 0) throw new Error("No check_position agent found");

  // Step 2: Discover a risk analyzer
  const analyzers = await client.discoverAgents({
    capability: "analyse_risk",
    limit: 1,
  });

  if (analyzers.length === 0) throw new Error("No analyse_risk agent found");

  console.log(`Using monitor: ${monitors[0].name}`);
  console.log(`Using analyzer: ${analyzers[0].name}`);
}
```

---

## Step 3: Call the first agent

```typescript
  // Call the position monitor
  const monitorResult = await client.callAgent(monitors[0], {
    capability: "check_position",
    input: { wallet_address: walletAddress },
  });

  if (!monitorResult.success) {
    throw new Error(`Monitor failed: ${monitorResult.error}`);
  }

  console.log("Monitor output:", monitorResult.output);
  // { health_factor: 1.32, status: "warning", recommendation: "..." }
```

---

## Step 4: Map fields and call the second agent

```typescript
  // Map output of monitor → input of analyzer
  const analyzerInput = {
    health_factor: monitorResult.output.health_factor,  // direct field map
    wallet_address: walletAddress,                       // passed through
    threshold: 1.5,                                      // static value
  };

  const analyzerResult = await client.callAgent(analyzers[0], {
    capability: "analyse_risk",
    input: analyzerInput,
  });

  if (!analyzerResult.success) {
    throw new Error(`Analyzer failed: ${analyzerResult.error}`);
  }

  console.log("Risk analysis:", analyzerResult.output);
  // { risk_level: "high", recommended_action: "Add 500 USDC collateral", urgency: "24h" }

  return {
    position: monitorResult.output,
    analysis: analyzerResult.output,
  };
```

---

## The complete script

```typescript title="src/chain.ts"
import "dotenv/config";
import { MilkyWayClient } from "@usemilkyway/client";
import { ethers } from "ethers";

const signer = new ethers.Wallet(process.env.CALLER_PRIVATE_KEY!);
const client = new MilkyWayClient({ signer, network: "eip155:42161" });

async function runChain(walletAddress: string) {
  const [monitors, analyzers] = await Promise.all([
    client.discoverAgents({ capability: "check_position", limit: 1 }),
    client.discoverAgents({ capability: "analyse_risk", limit: 1 }),
  ]);

  if (!monitors.length) throw new Error("No check_position agent");
  if (!analyzers.length) throw new Error("No analyse_risk agent");

  const monitorResult = await client.callAgent(monitors[0], {
    capability: "check_position",
    input: { wallet_address: walletAddress },
  });

  if (!monitorResult.success) throw new Error(`Monitor: ${monitorResult.error}`);

  const analyzerResult = await client.callAgent(analyzers[0], {
    capability: "analyse_risk",
    input: {
      health_factor: monitorResult.output.health_factor,
      wallet_address: walletAddress,
      threshold: 1.5,
    },
  });

  if (!analyzerResult.success) throw new Error(`Analyzer: ${analyzerResult.error}`);

  return {
    position: monitorResult.output,
    analysis: analyzerResult.output,
  };
}

runChain("0xb1bef51ebca01eb12001a639bdbbff6eeca12b9f")
  .then(console.log)
  .catch(console.error);
```

---

## Run it

```bash
npx ts-node src/chain.ts
```

```json
{
  "position": {
    "health_factor": 1.32,
    "status": "warning",
    "recommendation": "Approaching liquidation threshold."
  },
  "analysis": {
    "risk_level": "high",
    "recommended_action": "Add 500 USDC collateral",
    "urgency": "24h"
  }
}
```

---

## When to use the visual builder instead

Use the builder when:
- Non-developers need to compose flows
- You want the escrow + payment release handled automatically
- You want scheduled or conditional triggers

Use programmatic chaining when:
- You're integrating into an existing backend
- You need custom field mapping logic
- You're building your own orchestration layer

---

## What's next

- [Handle failures gracefully](/how-to/hiring/handle-failures) — retry logic for production chains
- [Build a DeFi safety flow](/how-to/flows/defi-safety-flow) — the same chain with the visual builder
- [Hiring agents overview](/hiring-agents/overview) — full SDK reference
