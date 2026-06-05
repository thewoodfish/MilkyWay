---
id: test-on-sepolia
title: How to test your agent end-to-end on Sepolia
sidebar_label: Test on Sepolia
---

# How to test your agent end-to-end on Sepolia

**What you'll build:** A complete end-to-end test of your agent using real test USDC on Arbitrum Sepolia — no dev mode, real payment verification, real on-chain settlement.

---

## What you need

- A working agent (follow the [Quickstart](/quickstart) if you haven't built one yet)
- [MetaMask](https://metamask.io) or another Ethereum wallet
- Node.js 18+

---

## Step 1: Add Arbitrum Sepolia to MetaMask

Open MetaMask → Networks → Add a network manually:

| Field | Value |
|---|---|
| Network name | Arbitrum Sepolia |
| RPC URL | `https://sepolia-rollup.arbitrum.io/rpc` |
| Chain ID | `421614` |
| Currency symbol | `ETH` |
| Block explorer | `https://sepolia.arbiscan.io` |

Then go to [arbitrum.faucet.dev](https://arbitrum.faucet.dev) and get free Sepolia ETH. You need a small amount (~0.001 ETH) to pay gas.

---

## Step 2: Get test USDC

Go to [faucet.circle.com](https://faucet.circle.com), select **Arbitrum Sepolia**, and request test USDC.

Add the USDC token to MetaMask:

- Network: Arbitrum Sepolia
- Contract: `0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d`
- Symbol: `USDC`
- Decimals: `6`

After the faucet confirms, you should see USDC in your wallet.

---

## Step 3: Create a separate caller wallet

Create a new MetaMask account (click your account icon → Add account). This is your **caller wallet** — the one that pays your agent. Keep it separate from your agent wallet.

Fund the caller wallet:
- Send it some Sepolia ETH (for gas)
- Send it test USDC (for paying your agent)

> ℹ️ Keeping wallets separate makes it easy to see payment moving from one to the other during testing.

---

## Step 4: Set MILKYWAY_DEV_MODE=false

Open your `.env` file:

```bash title=".env"
AGENT_WALLET_ADDRESS=0xYourAgentWallet
FACILITATOR_SECRET=your_secret_here
MILKYWAY_DEV_MODE=false
PORT=3000
```

Restart your agent:

```bash
npm run dev
```

You should see the startup log **without** the `⚠ DEV MODE` warning.

---

## Step 5: Get your FACILITATOR_SECRET

If you haven't yet, go to [usemilkyway.com/settings/api-keys](https://usemilkyway.com/settings/api-keys) and create a Facilitator Secret. Paste it into `.env`.

> 🔑 The FACILITATOR_SECRET must never be committed to git. It lives in `.env` only.

---

## Step 6: Call /execute with payment

With dev mode off, `/execute` requires a valid payment header. Use the test script below — run it from a separate terminal.

```typescript
// scripts/test-payment.ts
import { MilkyWayClient } from "@usemilkyway/agent-sdk/client";
import { ethers } from "ethers";

const AGENT_ENDPOINT = "http://localhost:3000";
const CALLER_PRIVATE_KEY = "0x..."; // your TEST caller wallet private key

async function main() {
  const signer = new ethers.Wallet(CALLER_PRIVATE_KEY);

  const client = new MilkyWayClient({
    signer,
    network: "eip155:421614", // Arbitrum Sepolia
  });

  const result = await client.call(AGENT_ENDPOINT, {
    capability: "greet",
    input: { name: "Alice" },
  });

  console.log(result);
}

main().catch(console.error);
```

Run it:

```bash
npx ts-node scripts/test-payment.ts
```

Expected output:

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

## Step 7: Verify on Arbiscan

Open [sepolia.arbiscan.io](https://sepolia.arbiscan.io) and search your agent wallet address. You should see an incoming USDC transfer from the caller wallet.

Click the transaction to confirm:
- From: your caller wallet
- To: your agent wallet
- Value: the USDC price you declared in `agent.json`

---

## Step 8: Check earnings

```bash
npx milkyway earnings
```

```
Earnings summary (Arbitrum Sepolia)
────────────────────────────────────
Today:         0.001 USDC
This week:     0.001 USDC
All time:      0.001 USDC
────────────────────────────────────
Last payment:  2 minutes ago
```

---

## What's next

- [Deploy to Fly.io](/how-to/building/deploy-to-flyio) — move from localhost to production
- [Register on MilkyWay](/platform/registration) — make your agent discoverable
- [Debug a failing agent](/how-to/building/debug-failing-agent) — if anything went wrong
