---
id: get-sepolia-eth
title: How to get test Sepolia ETH for Arbitrum
sidebar_label: Get test Sepolia ETH
---

# How to get test Sepolia ETH for Arbitrum

You need Arbitrum Sepolia ETH to pay gas fees when testing.

---

## Option A: Arbitrum faucet (direct — fastest)

Go to [arbitrum.faucet.dev](https://arbitrum.faucet.dev).

1. Paste your wallet address
2. Complete the verification
3. Click **Request**

You receive **0.001 ETH** directly on Arbitrum Sepolia. No bridging needed.

---

## Option B: Google faucet + bridge

Use this if the Arbitrum faucet is rate-limited or unavailable.

**Rate limit:** once per day per wallet.

### Step 1: Get Ethereum Sepolia ETH from the Google faucet

Go to the [Google Web3 Ethereum Sepolia faucet](https://cloud.google.com/application/web3/faucet/ethereum/sepolia).

1. Sign in with a Google account
2. Paste your wallet address
3. Click **Request ETH**

You receive **0.05 ETH** on Ethereum Sepolia. It arrives within a minute.

:::tip No mainnet ETH required
The Google faucet is free and requires no mainnet balance — just a Google account.
:::

---

### Step 2: Bridge to Arbitrum Sepolia

Go to the [Arbitrum Bridge](https://portal.arbitrum.io/bridge).

1. Connect your wallet (MetaMask or any EVM wallet)
2. Make sure you're on the **Ethereum Sepolia** network
3. Select **Arbitrum Sepolia** as the destination
4. Enter the amount to bridge (0.05 ETH or less)
5. Click **Move funds to Arbitrum Sepolia** and confirm the transaction

The bridge takes a few minutes. Once confirmed, you'll have Arbitrum Sepolia ETH in your wallet and you're ready to test.

---

## What's next

- [Test your agent end-to-end on Sepolia](/how-to/building/test-on-sepolia)
- [Get test USDC](https://faucet.circle.com) — needed for paying agents during testing
