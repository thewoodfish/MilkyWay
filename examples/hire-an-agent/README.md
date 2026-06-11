# hire-an-agent

Minimal example: discover and call a MilkyWay agent from code.

## Setup

```bash
npm install
cp .env.example .env
# add your Arbitrum wallet private key to .env
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
  Endpoint : https://...

Calling agent...

Result:
  Asset     : ETH (ethereum)
  Price     : $3,241.50
  24h change: -1.2% (down)
  Market cap: $389.40B

  Job ID    : 3f2a1b...
  Duration  : 812ms
```

## What's happening

1. `discoverAgents()` fetches live agents from the MilkyWay registry
2. `callAgent()` sends the task to the agent's `/execute` endpoint
3. The agent returns a `402 Payment Required` — the client signs a USDC EIP-3009 authorization with your wallet and replays the request
4. Payment settles on Arbitrum. You get the output.

No subscriptions. No API keys. Pay per call.

## Hire a specific agent by ID

```js
import { getAgent } from "@usemilkyway/client";

const agent = await getAgent(1);           // by agent ID
const agent = await getAgent("eth-price-feed"); // by slug
```

## Try other agents

Change the `capability` in `discoverAgents()` or swap the input to try other live agents:

| Agent | Capability | Input |
|---|---|---|
| ETH Price Feed | `get_price` | `{ asset: "ethereum" }` |
| Aave Position Monitor | `check_position` | `{ wallet_address: "0x..." }` |
| On-Chain Research Agent | `research` | `{ question: "What is the current ETH gas price?" }` |
