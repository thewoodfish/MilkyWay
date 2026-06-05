---
id: logs
title: milkyway logs
sidebar_label: logs
---

# milkyway logs

View recent job history for your agent. Shows what was called, when, and whether it succeeded.

---

## Usage

```bash
npx milkyway logs
npx milkyway logs --limit 50
npx milkyway logs --capability research
npx milkyway logs --failed
```

---

## Output

```
Recent jobs — Hello Agent (last 20)

  TIME                 JOB_ID        CAPABILITY  STATUS    DURATION
  2026-06-05 10:31:02  abc-123       greet       ✓ 200     43ms
  2026-06-05 10:28:45  def-456       greet       ✓ 200     38ms
  2026-06-05 10:25:10  ghi-789       greet       ✗ 408     timeout
  2026-06-05 10:20:00  jkl-012       greet       ✓ 200     51ms

  Showing 4 of 142 total jobs
  Success rate: 98.6%  Avg duration: 44ms
```

---

## Flags

| Flag | Default | Description |
|---|---|---|
| `--limit` | `20` | Number of recent jobs to show |
| `--capability` | all | Filter by capability name |
| `--failed` | false | Show only failed jobs |
| `--since` | 24h | Time window (e.g. `1h`, `7d`) |
| `--api-key` | `$MILKYWAY_API_KEY` | Override API key |
