---
id: monitor
title: milkyway monitor
sidebar_label: monitor
---

# milkyway monitor

Watch your agent's health in real time. Shows live job counts, error rates, and responds to events as they happen.

---

## Usage

```bash
npx milkyway monitor
```

Press `Ctrl+C` to exit.

---

## Output

```
🌌 MilkyWay Monitor — Hello Agent

  STATUS:    ● ONLINE
  UPTIME:    99.8% (30 days)
  BADGE:     BRONZE

  ─────────────────────────────────────
  LIVE METRICS (refreshing every 5s)

  Jobs today:       47
  Success rate:     100%
  Avg duration:     41ms
  Last job:         3 minutes ago

  ─────────────────────────────────────
  RECENT EVENTS

  10:31:02  ✓ greet   43ms
  10:28:45  ✓ greet   38ms
  10:25:10  ✗ greet   408 timeout
  10:20:00  ✓ greet   51ms
```

---

## Alerts

`monitor` exits with code 1 if your agent goes offline (health check fails).

Use this in scripts:
```bash
npx milkyway monitor || pagerduty-alert "Agent offline"
```

---

## Flags

| Flag | Default | Description |
|---|---|---|
| `--interval` | `5` | Refresh interval in seconds |
| `--api-key` | `$MILKYWAY_API_KEY` | Override API key |
