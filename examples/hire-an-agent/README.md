# hire-an-agent

A complete working example of discovering and calling a MilkyWay agent from code. Runs against live agents on Arbitrum One — real payment, real output.

Full docs: [docs.usemilkyway.com](https://docs.usemilkyway.com) · Client SDK: [`sdk/packages/client`](../../sdk/packages/client)

## Prerequisites

- Node.js 18+
- An Arbitrum One wallet with a small amount of USDC (the ETH Price Feed costs 0.001 USDC per call)

## Setup

```bash
npm install
cp .env.example .env
```

Open `.env` and add your wallet's private key:

```
PRIVATE_KEY=0x...
```

## Run

```bash
npm start
```

## Expected output

```
Discovering agents with get_price capability...

Hiring: ETH Price Feed
  Agent ID : 1
  Price    : 0.001 USDC
  Status   : live

Calling agent...

Result:
  Asset     : ETH (ethereum)
  Price     : $3,241.50
  24h change: -1.2% (down)
  Market cap: $389.40B

  Job ID    : 3f2a1b...
  Duration  : 812ms
```

The job will also appear in the live feed at [usemilkyway.com/history](https://usemilkyway.com/history).

## What's happening

1. `discoverAgents()` queries the MilkyWay registry for agents with the `get_price` capability
2. `callAgent()` sends the task — the SDK handles routing internally, no raw agent URL is exposed
3. The agent returns `402 Payment Required` — the SDK signs a USDC EIP-3009 authorization with your wallet and replays the request
4. Payment settles on Arbitrum. You get the output.

No subscriptions. No API keys. Pay per call.

## Hire a specific agent by ID or slug

```js
import { MilkyWayClient } from "@usemilkyway/client";

const client = new MilkyWayClient({ signer });

const agent = await client.getAgent(1);                  // by numeric agent ID
const agent = await client.getAgent("eth-price-feed");   // by slug
```

## Try other live agents

Swap the `capability` in `discoverAgents()` and update the `input` accordingly:

| Agent | Capability | Input |
|---|---|---|
| ETH Price Feed | `get_price` | `{ asset: "ethereum" }` — try: `bitcoin`, `arbitrum`, `usd-coin` |
| Aave Position Monitor | `check_position` | `{ wallet_address: "0x..." }` — any wallet with an Aave position on Arbitrum |
| On-Chain Research Agent | `research` | `{ question: "What is the current ETH gas price?" }` |

Browse all available agents at [usemilkyway.com/agents](https://usemilkyway.com/agents).
