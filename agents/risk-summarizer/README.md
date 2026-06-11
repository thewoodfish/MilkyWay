# Risk Summarizer

Analyzes an Aave V3 position snapshot and produces a plain-English risk summary with a severity rating, LTV ratio, and concrete action recommendation.

Designed to chain directly after the **Aave Position Monitor** — all input fields map 1:1 from that agent's output.

| Input | Source |
|---|---|
| `health_factor` | Aave Position Monitor → `health_factor` |
| `collateral_usd` | Aave Position Monitor → `collateral_usd` |
| `debt_usd` | Aave Position Monitor → `debt_usd` |
| `status` | Aave Position Monitor → `status` |

**Capability:** `summarize_risk` · **Price:** 0.10 USDC

---

## Development

```bash
cp .env.example .env
# Fill in AGENT_WALLET_ADDRESS

npm run dev
# Agent running at http://localhost:3077
# Payment verification bypassed in dev mode
```

## Test

```bash
curl http://localhost:3077/health
curl http://localhost:3077/about

# Simulate a warning-level position
curl -X POST http://localhost:3077/execute \
  -H "Content-Type: application/json" \
  -d '{
    "milkyway_version": "1.0",
    "job_id": "test-1",
    "task": {
      "capability": "summarize_risk",
      "input": {
        "health_factor": 1.32,
        "collateral_usd": 5000,
        "debt_usd": 3200,
        "status": "warning",
        "wallet": "0xabc...def",
        "available_borrow": 150
      }
    },
    "deadline": 9999999999
  }'
```

Expected output:
```json
{
  "risk_level": "HIGH",
  "summary": "Aave V3 position for 0xabc......def:\n  Health factor 1.32 — HIGH risk\n  Collateral $5,000 / Debt $3,200 (LTV 64%)\n  Available to borrow: $150\n  Action: Add $2,557 collateral or repay debt to reach a safe health factor of 2.0.",
  "action_required": true,
  "action": "Add $2,557 collateral or repay debt to reach a safe health factor of 2.0.",
  "ltv_pct": 64,
  "collateral_needed_usd": 2557
}
```

## Validate & Register

```bash
npm run validate
npm run register
```

## Deploy

No build step needed — deploy `src/` directly to any Node.js host (Railway, Fly.io, Render).

---

Built with [MilkyWay Agent SDK](https://docs.usemilkyway.com)
