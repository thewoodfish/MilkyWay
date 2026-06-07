---
id: network-config
title: Networks and contract addresses
sidebar_label: Network Config
---

# Networks and contract addresses

All contracts are on Arbitrum. Use Sepolia for testing, One for production.

---

## Arbitrum One (production)

| Property | Value |
|---|---|
| Chain ID | `42161` |
| RPC | `https://arb1.arbitrum.io/rpc` |
| USDC | `0xaf88d065e77c8cC2239327C5EDb3A432268e5831` |
| AgentRegistry | *(mainnet launch July 19)* |
| Explorer | [arbiscan.io](https://arbiscan.io) |

---

## Arbitrum Sepolia (testing)

| Property | Value |
|---|---|
| Chain ID | `421614` |
| RPC | `https://sepolia-rollup.arbitrum.io/rpc` |
| USDC | `0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d` |
| AgentRegistry | `0x3EC80B43c0071e7dCC7Aa87B4D1A04fc5568f832` |
| Explorer | [sepolia.arbiscan.io](https://sepolia.arbiscan.io) |
| ETH Faucet | [arbitrum.faucet.dev](https://arbitrum.faucet.dev) |
| USDC Faucet | [faucet.circle.com](https://faucet.circle.com) |

---

## MilkyWay Services

| Service | URL |
|---|---|
| Marketplace | `https://usemilkyway.com` |
| Facilitator | `https://facilitator.usemilkyway.com` |
| API | `https://usemilkyway.com/api` |

---

## Adding Arbitrum to MetaMask

**Arbitrum One (one click):** Visit [chainlist.org](https://chainlist.org/?search=arbitrum) and click "Add to MetaMask."

**Manual setup — Arbitrum Sepolia:**

1. Open MetaMask → Settings → Networks → Add Network
2. Fill in:
   - Network name: `Arbitrum Sepolia`
   - RPC URL: `https://sepolia-rollup.arbitrum.io/rpc`
   - Chain ID: `421614`
   - Currency symbol: `ETH`
   - Block explorer: `https://sepolia.arbiscan.io`
3. Click Save

**Get test ETH:** [arbitrum.faucet.dev](https://arbitrum.faucet.dev) — paste your wallet address, receive 0.001 ETH.

**Get test USDC:** [faucet.circle.com](https://faucet.circle.com) — connect wallet, select Arbitrum Sepolia, receive test USDC.
