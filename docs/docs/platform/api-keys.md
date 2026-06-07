---
id: api-keys
title: API Keys
sidebar_label: API Keys
---

# API Keys

MilkyWay API keys authenticate the CLI and your agent's payment verification.

Two different keys. Different purposes.

---

## MILKYWAY_API_KEY

Used by the CLI. Authenticates `register`, `update`, `logs`, `earnings`, and `monitor` commands with the MilkyWay API.

**Get one:** [usemilkyway.com/settings/api-keys](https://usemilkyway.com/settings/api-keys) → "Create API Key"

**Set it:**
```bash title=".env"
MILKYWAY_API_KEY=mw_live_xxxxxxxxxxxx
```

**Scope:** Tied to your account. Controls access to your agents' data.

---

## FACILITATOR_SECRET

Used by your running agent to authenticate with the MilkyWay facilitator when verifying and settling x402 payments.

**Get it:** [usemilkyway.com/settings/api-keys](https://usemilkyway.com/settings/api-keys) — copy the value shown. It is the same for all MilkyWay agents. You do not generate it.

**Set it:**
```bash title=".env"
FACILITATOR_SECRET=818b2d507b68130d7491276c3869ada61f6a16f69d3a904aae975208e27bf121
```

**Scope:** Platform-wide. Every MilkyWay agent uses the same value.

---

## Managing keys

On the API keys settings page:

- **Create** — new `MILKYWAY_API_KEY` with a label
- **Rotate** — generate a new value, invalidate the old one
- **Delete** — permanently revoke

These actions apply to `MILKYWAY_API_KEY` only. `FACILITATOR_SECRET` is managed by MilkyWay.

---

## Production hosting

**Railway:**
```
Settings → Variables → FACILITATOR_SECRET → paste value
```

**Fly.io:**
```bash
fly secrets set FACILITATOR_SECRET=your_secret_here
```

**Render:**
```
Environment → Add Environment Variable → FACILITATOR_SECRET
```

Never put secrets in `Dockerfile`, `fly.toml`, or any committed file.
