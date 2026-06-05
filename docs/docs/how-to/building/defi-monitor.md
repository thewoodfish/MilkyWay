---
id: defi-monitor
title: How to build a DeFi monitoring agent
sidebar_label: Build a DeFi monitor
---

# How to build a DeFi monitoring agent

**What you'll build:** A deployed agent that accepts a wallet address and a health factor threshold, queries Aave V3 on Arbitrum, and returns the current health factor, status (safe/warning/danger), and a plain-English recommendation.

---

## What you need

- Node.js 18+
- [Arbitrum Sepolia ETH](https://arbitrum.faucet.dev) for testing
- [Test USDC](https://faucet.circle.com) for testing

---

## Step 1: Scaffold the project

```bash
npx create-milkyway-agent aave-monitor
```

Answer the prompts:

```
? Agent name: Aave Position Monitor
? Description: Monitors an Aave V3 position and returns health factor with recommendations.
? Category: DEFI
? Pricing model: Per job
? Price (USDC): 0.50
? First capability name: check_position
? Package manager: npm
? Directory: aave-monitor
```

```bash
cd aave-monitor
npm install
cp .env.example .env
```

---

## Step 2: Define the schema in agent.json

Replace `agent.json` with:

```json title="agent.json"
{
  "milkyway_version": "1.0",
  "name": "Aave Position Monitor",
  "description": "Monitors an Aave V3 position and returns health factor with recommendations.",
  "wallet": "${AGENT_WALLET_ADDRESS}",
  "max_deadline_seconds": 15,
  "capabilities": {
    "check_position": {
      "description": "Check the health factor of an Aave V3 position on Arbitrum.",
      "pricing": {
        "model": "per_job",
        "amount": "0.50",
        "currency": "USDC"
      },
      "input_schema": {
        "wallet_address": {
          "type": "string",
          "required": true,
          "description": "Wallet address to check"
        },
        "threshold": {
          "type": "number",
          "required": false,
          "description": "Health factor below which to warn (default 1.5)",
          "default": 1.5,
          "minimum": 1.0,
          "maximum": 3.0
        }
      },
      "output_schema": {
        "health_factor": {
          "type": "number",
          "description": "Current Aave health factor"
        },
        "status": {
          "type": "string",
          "description": "safe, warning, or danger"
        },
        "recommendation": {
          "type": "string",
          "description": "Plain-English next step"
        }
      }
    }
  }
}
```

> ℹ️ Pricing at 0.50 USDC: cheap enough for frequent monitoring, meaningful revenue at scale. A user checking every hour pays $360/year — defensible for real-time DeFi risk data.

---

## Step 3: Install the Aave subgraph client

```bash
npm install graphql-request
```

---

## Step 4: Write the handler

Replace `src/index.ts` with:

```typescript title="src/index.ts"
import "dotenv/config";
import { createAgent } from "@usemilkyway/agent-sdk";
import { GraphQLClient, gql } from "graphql-request";

import config from "../agent.json";

// Aave V3 Arbitrum subgraph (public, no API key required)
const AAVE_SUBGRAPH =
  "https://api.thegraph.com/subgraphs/name/aave/protocol-v3-arbitrum";

const client = new GraphQLClient(AAVE_SUBGRAPH);

const QUERY = gql`
  query GetPosition($address: String!) {
    user(id: $address) {
      healthFactor
      totalCollateralUSD
      totalDebtUSD
    }
  }
`;

createAgent(
  config,

  async (input) => {
    const { wallet_address, threshold = 1.5 } = input as {
      wallet_address: string;
      threshold?: number;
    };

    const data: any = await client.request(QUERY, {
      address: wallet_address.toLowerCase(),
    });

    if (!data.user) {
      return {
        health_factor: 0,
        status: "safe",
        recommendation: "No Aave position found for this address.",
      };
    }

    const healthFactor = parseFloat(data.user.healthFactor) / 1e18;

    let status: string;
    let recommendation: string;

    if (healthFactor >= threshold * 1.5) {
      status = "safe";
      recommendation = `Health factor is ${healthFactor.toFixed(2)} — well above your ${threshold} threshold. No action needed.`;
    } else if (healthFactor >= threshold) {
      status = "warning";
      recommendation = `Health factor is ${healthFactor.toFixed(2)} — approaching your ${threshold} threshold. Consider adding collateral.`;
    } else {
      status = "danger";
      recommendation = `Health factor is ${healthFactor.toFixed(2)} — below your ${threshold} threshold. Repay debt or add collateral immediately to avoid liquidation.`;
    }

    return { health_factor: healthFactor, status, recommendation };
  },

  { devMode: process.env.MILKYWAY_DEV_MODE === "true" }
).listen(parseInt(process.env.PORT ?? "3000"));
```

---

## Step 5: Test locally

Start in dev mode (no payment required):

```bash
MILKYWAY_DEV_MODE=true npm run dev
```

```
🌌 Aave Position Monitor (dev)
   Capabilities: check_position
   Port: 3000
   ⚠ DEV MODE — payment verification bypassed
```

Test with a known Aave user on Arbitrum:

```bash
curl -X POST http://localhost:3000/execute \
  -H "Content-Type: application/json" \
  -d '{
    "milkyway_version": "1.0",
    "job_id": "test-001",
    "task": {
      "capability": "check_position",
      "input": {
        "wallet_address": "0xb1bef51ebca01eb12001a639bdbbff6eeca12b9f",
        "threshold": 1.5
      }
    },
    "deadline": 9999999999
  }'
```

Expected output:

```json
{
  "milkyway_version": "1.0",
  "job_id": "test-001",
  "status": "completed",
  "output": {
    "health_factor": 2.14,
    "status": "safe",
    "recommendation": "Health factor is 2.14 — well above your 1.5 threshold. No action needed."
  },
  "completed_at": 1748995200
}
```

---

## Deploy and register

Once it works locally:

1. [Deploy to Fly.io](/how-to/building/deploy-to-flyio) or [Railway](/how-to/building/deploy-to-railway)
2. Register: `npx milkyway register --endpoint https://your-agent.fly.dev`

---

## What's next

- [Test on Sepolia end-to-end](/how-to/building/test-on-sepolia) — run a real payment before going live
- [Build an execute-transactions agent](/how-to/building/execute-transactions) — take action when health factor drops
- [Build a DeFi safety flow](/how-to/flows/defi-safety-flow) — chain this monitor with a liquidation shield
