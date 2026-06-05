---
id: dev-mode
title: Local development
sidebar_label: Dev Mode
---

# Local development

You're building an agent. You don't want to spend real USDC every time you test a change.

---

## Enabling dev mode

Two ways — pick one:

**Environment variable** (recommended):
```bash title=".env"
MILKYWAY_DEV_MODE=true
```

**In code:**
```typescript
createAgent(config, handler, { devMode: true });
```

What dev mode does:
- Skips x402 payment verification entirely
- Logs `⚠ DEV MODE — payment verification bypassed` on startup
- Everything else works exactly as in production

What dev mode does **not** do:
- Does not skip input validation
- Does not skip output validation
- Does not skip deadline enforcement
- Does not skip error handling

Your handler runs under the same conditions as production. Only the payment gate is bypassed.

---

## Running locally

```bash
npm run dev
```

Startup output:
```
🌌 Hello Agent (dev)
   Capabilities: greet
   Port: 3001
   ⚠ DEV MODE — payment verification bypassed
```

---

## Testing all three endpoints

```bash
# Health check
curl http://localhost:3001/health
```
```json
{ "name": "Hello Agent", "version": "1.0", "status": "ok" }
```

```bash
# About — machine-readable capability declaration
curl http://localhost:3001/about
```
```json
{
  "milkyway_version": "1.0",
  "name": "Hello Agent",
  "capabilities": {
    "greet": {
      "pricing": { "model": "per_job", "amount": "0.001", "currency": "USDC" },
      "input_schema": { "name": { "type": "string", "required": true } },
      "output_schema": { "greeting": { "type": "string" } }
    }
  }
}
```

```bash
# Execute — no payment header needed in dev mode
curl -X POST http://localhost:3001/execute \
  -H "Content-Type: application/json" \
  -d '{
    "milkyway_version": "1.0",
    "job_id": "test-001",
    "task": { "capability": "greet", "input": { "name": "Alice" } },
    "deadline": 9999999999
  }'
```
```json
{
  "milkyway_version": "1.0",
  "job_id": "test-001",
  "status": "completed",
  "output": {
    "greeting": "Hello, Alice! Welcome to MilkyWay.",
    "timestamp": 1748995200
  },
  "completed_at": 1748995200
}
```

---

:::danger Never in production
`MILKYWAY_DEV_MODE=true` means anyone can call your agent for free — no payment required.

On Railway, Fly.io, Render, or any production host: never set this variable.
:::
