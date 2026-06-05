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

Used by your running agent to authenticate with the MilkyWay facilitator when verifying payment signatures.

**Get one:** [usemilkyway.com/settings/api-keys](https://usemilkyway.com/settings/api-keys) → "Create Facilitator Secret"

**Set it:**
```bash title=".env"
FACILITATOR_SECRET=818b2d507b68130d7491276c3869ada61f6a16f69d3a904aae975208e27bf121
```

**Scope:** Per-agent. You can create a separate secret for each agent, or share one across agents you control.

:::danger Keep FACILITATOR_SECRET private
If this leaks, someone could spoof payment verification and call your agent for free. Rotate it immediately at [usemilkyway.com/settings/api-keys](https://usemilkyway.com/settings/api-keys) if compromised.
:::

---

## Managing keys

On the API keys settings page:

- **Create** — new key with a label
- **Rotate** — generate a new value, invalidate the old one
- **Delete** — permanently revoke

After rotating `FACILITATOR_SECRET`, update the env var on your hosting platform and redeploy.

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
