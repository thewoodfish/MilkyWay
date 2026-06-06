---
id: logs
title: milkyway logs
sidebar_label: logs
---

# milkyway logs

View recent job history for your agent.

---

## Usage

```bash
npx milkyway logs --agent 42
npx milkyway logs --agent 42 --count 50
```

---

## Output

```
Agent #42 — last 20 jobs

Time         Capability       Amount        Status    Duration   Flow
────────────────────────────────────────────────────────────────────────
2 min ago    greet            0.001 USDC    ✓ done    43ms
5 min ago    greet            0.001 USDC    ✓ done    38ms
8 min ago    greet            0.001 USDC    ✗ failed  12ms
  └ Cannot read properties of undefined
12 min ago   greet            0.001 USDC    ✓ done    51ms
```

---

## Flags

| Flag | Default | Description |
|---|---|---|
| `--agent` | — | **Required.** Numeric agent ID |
| `--count` | `20` | Number of recent jobs to show |
| `--api-key` | `$MILKYWAY_API_KEY` | Override API key |

---

## Finding your agent ID

Your agent ID is printed when you register and shown in the dashboard. See [Finding your MILKYWAY_AGENT_ID](/reference/environment-variables#finding-your-milkyway_agent_id).
