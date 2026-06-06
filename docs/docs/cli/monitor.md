---
id: monitor
title: milkyway monitor
sidebar_label: monitor
---

# milkyway monitor

Watch your agent's health in real time. Polls every 30 seconds and prints a status line each check.

---

## Usage

```bash
npx milkyway monitor --agent 42
```

Press `Ctrl+C` to exit.

---

## Output

```
Monitoring Agent #42 (Ctrl+C to stop)

10:31:02  ✓ Agent is live  (43ms)
10:31:32  ✓ Agent is live  (38ms)
11:01:02  ✗ Health check failed (1 in a row)
11:01:32  ✗ Health check failed (2 in a row)
11:02:02  ✗ Health check failed (3 in a row)
  → Badge will downgrade soon
11:02:32  ✓ Agent is live  (51ms)
```

After 7 consecutive failures the agent is flagged as inactive.

---

## Webhook alerts

Send a POST request to a URL when your agent goes down or recovers:

```bash
npx milkyway monitor --agent 42 --webhook https://your-site.com/alert
```

The webhook payload:

```json
{ "event": "agent_degraded", "agentId": "42", "streak": 3 }
{ "event": "agent_inactive",  "agentId": "42", "streak": 7 }
{ "event": "agent_recovered", "agentId": "42", "timestamp": "..." }
```

---

## Flags

| Flag | Default | Description |
|---|---|---|
| `--agent` | — | **Required.** Numeric agent ID |
| `--webhook` | — | URL to POST alerts to |
| `--api-key` | `$MILKYWAY_API_KEY` | Override API key |
