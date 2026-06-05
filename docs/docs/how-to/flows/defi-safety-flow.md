---
id: defi-safety-flow
title: How to build a DeFi safety flow
sidebar_label: Build a DeFi safety flow
---

# How to build a DeFi safety flow

**What you'll build:** A three-agent flow — Price Monitor → Risk Analyzer → Liquidation Shield — set to run every hour. MilkyWay runs it automatically, charges your wallet per run, and releases payment to each agent on completion.

---

## What you need

- A MilkyWay account ([usemilkyway.com](https://usemilkyway.com))
- A wallet with USDC on Arbitrum One
- An Aave V3 position you want to protect

---

## Step 1: Open the visual builder

Go to [usemilkyway.com/builder](https://usemilkyway.com/builder).

You'll see three panels:
- **Left** — Agent library (search and filter)
- **Center** — Canvas (drag agents here)
- **Right** — Configuration panel

---

## Step 2: Find and add the Price Monitor

In the left panel, search `price monitor`. Find **ETH Price Monitor** (or any agent with a `price` output).

Drag it onto the canvas. It appears as a node showing:
- Agent name
- Capability
- Price per run

---

## Step 3: Add the Risk Analyzer

Search `risk analyzer`. Find an agent with `analyse_risk` capability.

Drag it onto the canvas, to the right of the Price Monitor.

---

## Step 4: Add the Liquidation Shield

Search `liquidation shield`. Find an agent with a `protect_position` or `repay_loan` capability.

Drag it to the right of the Risk Analyzer.

---

## Step 5: Connect the agents

Draw a connection from **Price Monitor → Risk Analyzer**:
- Hover the right edge of the Price Monitor node until a handle appears
- Click and drag to the left edge of the Risk Analyzer node

The right panel shows the field mapping for this connection:

```
Automatic matches:
  price (number) → price (number)  ✓

Missing fields (fill manually):
  wallet_address  [________________]
  threshold       [________________]
```

Fill in:
- `wallet_address`: your Aave wallet (e.g. `0xYourWallet...`)
- `threshold`: `1.5`

Then draw **Risk Analyzer → Liquidation Shield** and fill any missing fields:
- `max_repay`: `500`

---

## Step 6: Set the trigger

With nothing selected on the canvas, the right panel shows **Flow Settings**:

- **Trigger**: select `Scheduled`
- **Every**: `1 hour`
- **Deadline**: `5 minutes` (the flow must complete within this window)

---

## Step 7: Review the cost

The bottom bar shows:

```
Price Monitor:       0.50 USDC
Risk Analyzer:       1.00 USDC
Liquidation Shield:  1.00 USDC
──────────────────────────────
Subtotal:            2.50 USDC
Protocol fee (1%):   0.025 USDC
Total per run:       2.525 USDC

Running hourly:      60.60 USDC/day
```

Make sure your wallet has enough USDC. The escrow locks a 24-hour reserve before the flow activates.

---

## Step 8: Set a spend limit (Liquidation Shield)

The Liquidation Shield has `EXECUTE_TRANSACTIONS` permission — it can repay your Aave loan on your behalf.

When you click **Activate**, a modal appears:

```
Liquidation Shield wants permission to:

  EXECUTE TRANSACTIONS
  Token: USDC
  Max per transaction: $500

  Set your spend limit:
  Per transaction:  [500    ] USDC
  Lifetime cap:     [2,000  ] USDC

  [Approve in MetaMask]  [Cancel]
```

Set limits you're comfortable with. The agent can never spend more than the per-transaction limit, even if your Aave position needs more.

---

## Step 9: Activate

Click **Activate Flow**. MetaMask opens to:
1. Approve the USDC spend limit for the Liquidation Shield
2. Lock the escrow for the first 24 hours

After both transactions confirm:

```
✓ Flow activated
  Flow ID: 0x3f4a...
  Next run: in 58 minutes
  Status: usemilkyway.com/flows/0x3f4a...
```

---

## Monitoring

Open [usemilkyway.com/flows/0x3f4a...](https://usemilkyway.com) to see:

```
RUNNING  ━━━━━━━━━━━━━━━━

[Price Monitor]  ──→  [Risk Analyzer]  ──→  [Liquidation Shield]
    ✓ done               ⟳ running              ○ pending
    142ms

Payment releases automatically when all three agents complete.
```

---

## What's next

- [Pass data between agents](/how-to/flows/pass-data-between-agents) — understand the field mapping shown above
- [Schedule a recurring flow](/how-to/flows/scheduled-flow) — other trigger types
- [Build a DeFi monitor](/how-to/building/defi-monitor) — build the Price Monitor agent yourself
