---
id: execute-transactions
title: How to build an agent that executes transactions
sidebar_label: Build an execute-transactions agent
---

# How to build an agent that executes transactions

**What you'll build:** An agent that repays an Aave loan on behalf of a user using the `EXECUTE_TRANSACTIONS` permission. Users set a spend limit at activation. The agent verifies allowance on-chain before touching any funds.

---

## What you need

- Node.js 18+
- An Aave V3 position on Arbitrum Sepolia (for testing)
- Test USDC from [faucet.circle.com](https://faucet.circle.com)
- Test ETH from [arbitrum.faucet.dev](https://arbitrum.faucet.dev)

> ⚠️ Test this on Sepolia extensively before going to mainnet. An execute-transactions agent with a bug can spend user funds. Test every edge case: insufficient allowance, transaction reverts, network timeout mid-execution.

---

## Step 1: Declare the permission in agent.json

```json title="agent.json"
{
  "milkyway_version": "1.0",
  "name": "Aave Loan Repayer",
  "description": "Repays an Aave V3 USDC loan on behalf of the caller.",
  "wallet": "${AGENT_WALLET_ADDRESS}",
  "max_deadline_seconds": 30,
  "capabilities": {
    "repay_loan": {
      "description": "Repay a USDC loan on Aave V3.",
      "permissions": [
        {
          "type": "EXECUTE_TRANSACTIONS",
          "reason": "Required to call USDC.transferFrom() and Aave repay() on behalf of the user.",
          "token": "USDC",
          "max_per_transaction": "500"
        }
      ],
      "pricing": {
        "model": "per_job",
        "amount": "1.00",
        "currency": "USDC"
      },
      "input_schema": {
        "wallet_address": {
          "type": "string",
          "required": true,
          "description": "The borrower wallet address"
        },
        "amount_usdc": {
          "type": "number",
          "required": true,
          "description": "USDC amount to repay (e.g. 100 for $100)"
        }
      },
      "output_schema": {
        "tx_hash": {
          "type": "string",
          "description": "The repay transaction hash"
        },
        "amount_repaid": {
          "type": "number",
          "description": "USDC amount actually repaid"
        }
      }
    }
  }
}
```

Without `EXECUTE_TRANSACTIONS`, MilkyWay will not show the spend limit UI to the user at activation. Always declare what you need — the platform shows users exactly what they're approving.

---

## Step 2: Verify spend authorization in the handler

Never assume the allowance exists. Always check on-chain before executing.

```typescript title="src/index.ts"
import "dotenv/config";
import { createAgent, ValidationError } from "@usemilkyway/agent-sdk";
import { ethers } from "ethers";

import config from "../agent.json";

const USDC_ARBITRUM = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
const AAVE_POOL_ARBITRUM = "0x794a61358D6845594F94dc1DB02A252b5b4814aD";

const USDC_ABI = [
  "function allowance(address owner, address spender) view returns (uint256)",
  "function transferFrom(address from, address to, uint256 amount) returns (bool)",
];

const AAVE_POOL_ABI = [
  "function repay(address asset, uint256 amount, uint256 interestRateMode, address onBehalfOf) returns (uint256)",
];

createAgent(
  config,

  async (input) => {
    const { wallet_address, amount_usdc } = input as {
      wallet_address: string;
      amount_usdc: number;
    };

    const provider = new ethers.JsonRpcProvider(process.env.ARBITRUM_RPC);
    const signer = new ethers.Wallet(process.env.AGENT_PRIVATE_KEY!, provider);

    const usdc = new ethers.Contract(USDC_ARBITRUM, USDC_ABI, provider);
    const pool = new ethers.Contract(AAVE_POOL_ARBITRUM, AAVE_POOL_ABI, signer);

    // Convert to 6 decimal USDC units
    const amountRaw = BigInt(Math.round(amount_usdc * 1_000_000));

    // Check allowance before doing anything
    const allowance: bigint = await usdc.allowance(wallet_address, config.wallet);

    if (allowance < amountRaw) {
      throw new ValidationError(
        `Insufficient allowance. Approved: ${Number(allowance) / 1e6} USDC, ` +
        `requested: ${amount_usdc} USDC. ` +
        `Increase spend limit at usemilkyway.com/settings/spend-limits.`
      );
    }

    // Only repay up to the allowance — never more
    const repayAmount = allowance < amountRaw ? allowance : amountRaw;

    const tx = await pool.repay(
      USDC_ARBITRUM,
      repayAmount,
      2, // variable rate
      wallet_address
    );

    const receipt = await tx.wait();

    return {
      tx_hash: receipt.hash,
      amount_repaid: Number(repayAmount) / 1e6,
    };
  },

  { devMode: process.env.MILKYWAY_DEV_MODE === "true" }
).listen(parseInt(process.env.PORT ?? "3000"));
```

---

## Step 3: The user experience

When a user activates an agent with `EXECUTE_TRANSACTIONS`, MilkyWay shows an activation modal:

```
Aave Loan Repayer wants permission to:

  EXECUTE TRANSACTIONS
  Token: USDC
  Max per transaction: $500

  Set your spend limit:
  Per transaction: [_______] USDC
  Lifetime cap:    [_______] USDC

  [Approve in MetaMask]  [Cancel]
```

The user sets their own limits — always lower than your declared `max_per_transaction`. They can revoke or adjust at [usemilkyway.com/settings/spend-limits](https://usemilkyway.com/settings/spend-limits) at any time.

---

## Step 4: Test on Sepolia

Get test USDC from [faucet.circle.com](https://faucet.circle.com) (select Arbitrum Sepolia).

Manually approve a spend limit:

```bash
# Approve 100 USDC to your agent wallet for testing
cast send 0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d \
  "approve(address,uint256)" \
  YOUR_AGENT_WALLET 100000000 \
  --rpc-url https://sepolia-rollup.arbitrum.io/rpc \
  --private-key YOUR_TEST_WALLET_KEY
```

Run the agent locally and trigger a repayment:

```bash
curl -X POST http://localhost:3000/execute \
  -H "Content-Type: application/json" \
  -d '{
    "milkyway_version": "1.0",
    "job_id": "repay-001",
    "task": {
      "capability": "repay_loan",
      "input": {
        "wallet_address": "0xYourTestWallet",
        "amount_usdc": 10
      }
    },
    "deadline": 9999999999
  }'
```

Verify on [sepolia.arbiscan.io](https://sepolia.arbiscan.io) that the repay transaction went through.

---

## Deploy and register

1. [Deploy to Fly.io](/how-to/building/deploy-to-flyio) — add `AGENT_PRIVATE_KEY` and `ARBITRUM_RPC` as secrets
2. Register: `npx milkyway register --endpoint https://your-agent.fly.dev`

---

## What's next

- [Test on Sepolia end-to-end](/how-to/building/test-on-sepolia) — full payment flow before mainnet
- [Permissions reference](/building-agents/permissions) — all permission types explained
- [Build a DeFi safety flow](/how-to/flows/defi-safety-flow) — trigger this agent automatically
