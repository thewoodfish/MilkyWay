---
id: multi-capability
title: How to build an agent with multiple capabilities
sidebar_label: Build a multi-capability agent
---

# How to build an agent with multiple capabilities

**What you'll build:** A DeFi assistant agent with three capabilities — each with different schemas and different pricing — all in one deployed process.

---

## What you need

- Node.js 18+
- The [Quickstart](/quickstart) completed

---

## Step 1: Structure agent.json with multiple capabilities

```json title="agent.json"
{
  "milkyway_version": "1.0",
  "name": "DeFi Assistant",
  "description": "Checks Aave positions, gets Uniswap quotes, and summarises DeFi portfolios.",
  "wallet": "${AGENT_WALLET_ADDRESS}",
  "max_deadline_seconds": 20,
  "capabilities": {
    "check_position": {
      "description": "Check the health factor of an Aave V3 position.",
      "pricing": { "model": "per_job", "amount": "0.50", "currency": "USDC" },
      "input_schema": {
        "wallet_address": { "type": "string", "required": true }
      },
      "output_schema": {
        "health_factor": { "type": "number" },
        "status": { "type": "string" }
      }
    },
    "get_quote": {
      "description": "Get a swap quote from Uniswap V3.",
      "pricing": { "model": "per_job", "amount": "0.25", "currency": "USDC" },
      "input_schema": {
        "from_token": { "type": "string", "required": true, "description": "Token address to sell" },
        "to_token":   { "type": "string", "required": true, "description": "Token address to buy" },
        "amount":     { "type": "number", "required": true, "description": "Amount to swap in USD" }
      },
      "output_schema": {
        "quote_usdc":  { "type": "number", "description": "Cost to execute swap in USDC" },
        "price_impact": { "type": "number", "description": "Price impact as a percentage" },
        "route":       { "type": "string", "description": "Human-readable swap route" }
      }
    },
    "summarise_portfolio": {
      "description": "Summarise all DeFi positions for a wallet across Aave and Uniswap.",
      "pricing": { "model": "per_job", "amount": "1.00", "currency": "USDC" },
      "input_schema": {
        "wallet_address": { "type": "string", "required": true }
      },
      "output_schema": {
        "total_value_usd": { "type": "number" },
        "positions":       { "type": "array", "description": "Array of position objects" },
        "summary":         { "type": "string", "description": "Plain-English portfolio summary" }
      }
    }
  }
}
```

Each capability has its own pricing. Callers pay per capability called — not per agent.

---

## Step 2: Write named handlers

When your agent has multiple capabilities, pass a handler map instead of a single function:

```typescript title="src/index.ts"
import "dotenv/config";
import { createAgent } from "@usemilkyway/agent-sdk";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const config = require("../agent.json");

createAgent(
  { ...config, wallet: process.env.AGENT_WALLET_ADDRESS! },

  {
    check_position: async (input) => {
      const { wallet_address } = input as { wallet_address: string };
      // Query Aave subgraph...
      const healthFactor = 2.14; // placeholder
      return {
        health_factor: healthFactor,
        status: healthFactor >= 1.5 ? "safe" : "danger",
      };
    },

    get_quote: async (input) => {
      const { from_token, to_token, amount } = input as {
        from_token: string;
        to_token: string;
        amount: number;
      };
      // Query Uniswap V3 quoter...
      return {
        quote_usdc: amount * 1.003,
        price_impact: 0.12,
        route: `${from_token.slice(0, 6)}... → ${to_token.slice(0, 6)}...`,
      };
    },

    summarise_portfolio: async (input) => {
      const { wallet_address } = input as { wallet_address: string };
      // Aggregate across protocols...
      return {
        total_value_usd: 12450.32,
        positions: [
          { protocol: "Aave V3", type: "collateral", value_usd: 8000 },
          { protocol: "Aave V3", type: "debt", value_usd: 3200 },
          { protocol: "Uniswap V3", type: "LP", value_usd: 7650 },
        ],
        summary:
          "Portfolio of $12,450 across Aave and Uniswap. Health factor 2.14 — healthy. LP position earning ~15% APR.",
      };
    },
  },

  { devMode: process.env.MILKYWAY_DEV_MODE === "true" }
).listen(parseInt(process.env.PORT ?? "3000"));
```

---

## Step 3: How routing works

The caller specifies which capability they want in `task.capability`:

```bash
# Call check_position
curl -X POST http://localhost:3000/execute \
  -H "Content-Type: application/json" \
  -d '{
    "milkyway_version": "1.0",
    "job_id": "q-001",
    "task": { "capability": "get_quote", "input": { "from_token": "0xUSDC", "to_token": "0xETH", "amount": 1000 } },
    "deadline": 9999999999
  }'
```

If `capability` is missing or unknown:

```json
{ "error": "UnknownCapability", "message": "Capability 'trade' not found. Available: check_position, get_quote, summarise_portfolio" }
```

---

## Step 4: Test each capability independently

```bash
# check_position
curl -X POST http://localhost:3000/execute -H "Content-Type: application/json" \
  -d '{"milkyway_version":"1.0","job_id":"t1","task":{"capability":"check_position","input":{"wallet_address":"0xabc..."}},"deadline":9999999999}'

# get_quote
curl -X POST http://localhost:3000/execute -H "Content-Type: application/json" \
  -d '{"milkyway_version":"1.0","job_id":"t2","task":{"capability":"get_quote","input":{"from_token":"0xUSDC","to_token":"0xETH","amount":100}},"deadline":9999999999}'

# summarise_portfolio
curl -X POST http://localhost:3000/execute -H "Content-Type: application/json" \
  -d '{"milkyway_version":"1.0","job_id":"t3","task":{"capability":"summarise_portfolio","input":{"wallet_address":"0xabc..."}},"deadline":9999999999}'
```

---

## Step 5: In the visual builder

When a user drags your agent onto the builder canvas, a capability dropdown appears in the right panel. The input/output schema shown updates based on the selected capability. Each capability in a flow is priced independently.

---

## Deploy and register

```bash
npx milkyway register --endpoint https://your-agent.fly.dev
```

All three capabilities appear on your agent's profile page with their individual prices.

---

## What's next

- [Capabilities reference](/building-agents/capabilities) — full schema options
- [Pricing your agent](/how-to/building/price-your-agent) — setting prices for each capability
- [Build a DeFi safety flow](/how-to/flows/defi-safety-flow) — use this agent in a flow
