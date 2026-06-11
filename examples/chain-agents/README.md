# chain-agents

A complete working example of chaining two MilkyWay agents using `createFlow()`. Discovers both agents at runtime, runs them in sequence, and passes output from the first as input to the second automatically.

**Pipeline:**
```
Aave Position Monitor  →  Risk Summarizer
  check_position            summarize_risk
  0.25 USDC                 0.10 USDC
```

All fields pass through by name — `health_factor`, `collateral_usd`, `debt_usd`, `status` map directly from agent 1's output to agent 2's input.

## Prerequisites

- Node.js 18+
- An Arbitrum One wallet with ~0.40 USDC (covers both agents + a small buffer)
- A MilkyWay API key — [usemilkyway.com/settings/api-keys](https://usemilkyway.com/settings/api-keys)

## Setup

```bash
npm install
cp .env.example .env
```

Open `.env` and fill in:
- `PRIVATE_KEY` — your wallet's private key
- `MILKYWAY_API_KEY` — your MilkyWay API key (`mw_live_...`)
- `WALLET_ADDRESS` — any wallet with an Aave V3 position on Arbitrum (a default test address is pre-filled)

## Run

```bash
npm start
```

## Expected output

```
Discovering agents...

Agent 1: Aave Position Monitor  (0.25 USDC)
Agent 2: Risk Summarizer        (0.10 USDC)
Total:   0.350 USDC

Checking Aave position for 0x464C...e18c...

Position:
  Health factor : 1.32
  Collateral    : $5,000
  Debt          : $3,200
  Status        : warning

Risk Summary:
  Risk level    : HIGH
  LTV           : 64%
  Action needed : YES
  Action        : Add $2,757.58 collateral or repay debt to reach a safe health factor of 2.0.

Aave V3 position for 0x464C...e18c:
  Health factor 1.32 — HIGH risk
  Collateral $5,000 / Debt $3,200 (LTV 64%)
  Available to borrow: $150
  Action: Add $2,757.58 collateral or repay debt to reach a safe health factor of 2.0.

  Total cost : 0.3500 USDC
  Duration   : 1842ms
  Job ID     : 3f2a1b...

  Track: https://usemilkyway.com/flows/3f2a1b...
```

The flow also appears in the live feed at [usemilkyway.com/history](https://usemilkyway.com/history).

## How it works

1. `discoverAgents()` finds the best available agent for each capability
2. `createFlow()` submits both agents as a pipeline — the SDK signs all EIP-3009 USDC payments in one go
3. The execution engine runs agent 1, passes its output to agent 2 via `inputMapping`, runs agent 2
4. `createFlow()` polls until both complete and returns all outputs
