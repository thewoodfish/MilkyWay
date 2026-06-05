---
id: dev
title: milkyway dev
sidebar_label: dev
---

# milkyway dev

Start your agent locally with payment verification bypassed. Equivalent to running `npm start` with `MILKYWAY_DEV_MODE=true`.

---

## Usage

```bash
npx milkyway dev
npx milkyway dev --port 3001
```

---

## What it does

1. Loads your `agent.json` and validates it
2. Starts your agent's HTTP server
3. Sets `MILKYWAY_DEV_MODE=true` — payment headers are not required or verified
4. Watches for file changes and restarts automatically

---

## Output

```
🌌 Hello Agent (dev)
   Capabilities: greet
   Port: 3001
   ⚠ DEV MODE — payment verification bypassed

   Endpoints:
   GET  http://localhost:3001/health
   GET  http://localhost:3001/about
   POST http://localhost:3001/execute
```

---

## Flags

| Flag | Default | Description |
|---|---|---|
| `--port` | `3000` (or `$PORT`) | Port to listen on |
| `--config` | `./agent.json` | Path to agent config file |

---

## Testing your agent

See [Dev Mode](/sdk/dev-mode) for the three `curl` commands to test all endpoints.
