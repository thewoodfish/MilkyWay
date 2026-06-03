# MILKYWAY_SDK_FACILITATOR_UPDATE.md
## SDK Update — Switch To MilkyWay's Own Facilitator
### For Claude Code

This file makes one surgical change across the SDK:
Replace all Coinbase CDP references with MilkyWay's own facilitator.

Facilitator live at: https://facilitator.usemilkyway.com
Auth: X-Facilitator-Secret header on every request (required, non-negotiable)

---

## The Secret

The facilitator rejects any request missing the correct secret header.
This prevents public abuse and gas draining.

**Never hardcode the secret in source code. Ever.**
It lives in .env only. .env is in .gitignore.

```bash
FACILITATOR_SECRET=818b2d507b68130d7491276c3869ada61f6a16f69d3a904aae975208e27bf121
```

This value goes in:
- `services/.env` (execution engine)
- `sdk/packages/agent-sdk/.env` (local agent development)
- Railway environment variables (for all deployed services)
- The `create-milkyway-agent` `.env.example` template (as a placeholder — developer gets the real value from usemilkyway.com/settings)

---

## Files To Change

```
sdk/packages/agent-sdk/src/verify.ts          ← primary change
sdk/packages/agent-sdk/src/x402.ts            ← update facilitator call
sdk/packages/agent-sdk/.env.example           ← remove CDP, add facilitator vars
sdk/packages/create-milkyway-agent/
  templates/dotenv.example.hbs                ← update template
services/.env.example                         ← remove CDP, add facilitator vars
```

Remove from every file:
```
CDP_API_KEY_ID
CDP_API_KEY_SECRET
@coinbase/x402 import
facilitator from "@coinbase/x402"
```

---

## Change 1 — sdk/packages/agent-sdk/src/verify.ts

Replace the entire file:

```typescript
import { PaymentError } from "./errors";

const MILKYWAY_FACILITATOR = "https://facilitator.usemilkyway.com";

export async function verifyPayment(
  paymentHeader: string,
  resource:      string,
  amountUsdc:    string,
  network?:      string
): Promise<void> {
  // Facilitator URL — developer can override for local testing
  const facilitatorUrl = process.env.X402_FACILITATOR_URL
    || MILKYWAY_FACILITATOR;

  // Secret is required — facilitator rejects requests without it
  const secret = process.env.FACILITATOR_SECRET;
  if (!secret) {
    throw new PaymentError(
      "FACILITATOR_SECRET is not set. " +
      "Get it from usemilkyway.com/settings and add it to your .env"
    );
  }

  // Default to Sepolia for development, mainnet for production
  const resolvedNetwork = network
    || process.env.X402_NETWORK
    || (process.env.NODE_ENV === "production"
        ? "eip155:42161"    // Arbitrum One
        : "eip155:421614"); // Arbitrum Sepolia

  // Convert human-readable USDC to raw units (6 decimals)
  // "1.00" → "1000000"
  const rawAmount = String(
    Math.round(parseFloat(amountUsdc) * 1_000_000)
  );

  let res: Response;
  try {
    res = await fetch(`${facilitatorUrl}/verify`, {
      method:  "POST",
      headers: {
        "Content-Type":          "application/json",
        "X-Facilitator-Secret":  secret        // always sent, always hidden
      },
      body: JSON.stringify({
        payment:  paymentHeader,
        resource,
        amount:   rawAmount,
        network:  resolvedNetwork
      })
    });
  } catch (err: any) {
    throw new PaymentError(
      `Facilitator unreachable at ${facilitatorUrl}: ${err.message}`
    );
  }

  if (res.status === 401) {
    throw new PaymentError(
      "Facilitator rejected the request — check FACILITATOR_SECRET"
    );
  }

  if (!res.ok) {
    throw new PaymentError(
      `Facilitator returned HTTP ${res.status}`
    );
  }

  const result = await res.json();

  if (!result.isValid) {
    throw new PaymentError(result.invalidReason || "Payment invalid");
  }

  // Payment verified — USDC settlement happens async in the background
  // via the execution engine calling /settle — agent does not call /settle
}
```

---

## Change 2 — sdk/packages/agent-sdk/src/x402.ts

Remove the `import { facilitator } from "@coinbase/x402"` line.
The middleware now calls `verifyPayment` from verify.ts (already our facilitator).
No other changes needed — the middleware logic stays the same.

```typescript
// REMOVE this line if present:
// import { facilitator } from "@coinbase/x402";

// verify.ts already points to MilkyWay's facilitator
// requirePayment calls verifyPayment — no changes needed there
```

---

## Change 3 — sdk/packages/agent-sdk/package.json

Remove the Coinbase x402 dependency:

```json
{
  "dependencies": {
    "express": "^4.18.0",
    "ethers":  "^6.0.0",
    "zod":     "^3.22.0"
  }
}
```

Remove: `"@coinbase/x402": "^1.0.0"`

Run after changing:
```bash
cd sdk/packages/agent-sdk
npm install
```

---

## Change 4 — sdk/packages/agent-sdk/.env.example

Replace entirely:

```bash
# ── Your wallet ─────────────────────────────────────────────────
# Receives USDC payments when your agent is called
AGENT_WALLET_ADDRESS=0x...

# ── MilkyWay Facilitator ────────────────────────────────────────
# Handles x402 payment verification for your agent
# Secret prevents unauthorized use — get from usemilkyway.com/settings
X402_FACILITATOR_URL=https://facilitator.usemilkyway.com
FACILITATOR_SECRET=get_this_from_usemilkyway_com_settings

# ── Network ─────────────────────────────────────────────────────
# eip155:421614 = Arbitrum Sepolia (testing)
# eip155:42161  = Arbitrum One (production)
X402_NETWORK=eip155:421614

# ── Dev mode ────────────────────────────────────────────────────
# Set to "true" to bypass payment verification locally
# NEVER set to "true" in production
MILKYWAY_DEV_MODE=false

# ── MilkyWay CLI ────────────────────────────────────────────────
# For: npx milkyway register, logs, earnings, monitor
# Get from usemilkyway.com/settings
MILKYWAY_API_KEY=mw_live_...

PORT=3000
```

---

## Change 5 — create-milkyway-agent template

Replace `templates/dotenv.example.hbs` entirely.
This is the exact final file — no Coinbase, no CDP, nothing else:

```bash
# ── Your wallet ─────────────────────────────────────────────────
# This address receives USDC payments when your agent is called
AGENT_WALLET_ADDRESS=0x...

# ── MilkyWay Facilitator ────────────────────────────────────────
# Handles payment verification — no signup needed
# Get your secret from usemilkyway.com/settings
X402_FACILITATOR_URL=https://facilitator.usemilkyway.com
FACILITATOR_SECRET=get_this_from_usemilkyway_com_settings

# ── Network ─────────────────────────────────────────────────────
# eip155:421614 = Arbitrum Sepolia (for testing)
# eip155:42161  = Arbitrum One (for production)
X402_NETWORK=eip155:421614

# ── Dev mode ────────────────────────────────────────────────────
# Set to "true" to skip payment verification locally
# NEVER true in production
MILKYWAY_DEV_MODE=false

# ── MilkyWay CLI ────────────────────────────────────────────────
# For: npx milkyway register, logs, earnings, monitor
# Get from usemilkyway.com/settings
MILKYWAY_API_KEY=mw_live_...

PORT=3000
```

No Coinbase. No CDP. No third-party signup instructions.
Every comment points to usemilkyway.com only.
This is a developer's first impression of MilkyWay — keep it clean.

---

## Change 6 — services/.env.example

Update the main repo's services env:

```bash
# ── Networks ────────────────────────────────────────────────────
ARBITRUM_RPC=https://arb1.arbitrum.io/rpc
ARBITRUM_SEPOLIA_RPC=https://sepolia-rollup.arbitrum.io/rpc

# ── Contracts ───────────────────────────────────────────────────
AGENT_REGISTRY_ADDRESS=0x...
JOB_ESCROW_ADDRESS=0x...

# ── Wallets ─────────────────────────────────────────────────────
DEPLOYER_PRIVATE_KEY=0x...
ORCHESTRATOR_PRIVATE_KEY=0x...

# ── MilkyWay Facilitator ────────────────────────────────────────
X402_FACILITATOR_URL=https://facilitator.usemilkyway.com
FACILITATOR_SECRET=818b2d507b68130d7491276c3869ada61f6a16f69d3a904aae975208e27bf121

# ── Network ─────────────────────────────────────────────────────
X402_NETWORK=eip155:421614

# ── AI ──────────────────────────────────────────────────────────
OPENAI_API_KEY=sk-...

# ── Database ────────────────────────────────────────────────────
DATABASE_URL=postgresql://...

# ── Auth ────────────────────────────────────────────────────────
SESSION_SECRET=...
JWT_SECRET=...

# ── Cloudinary ──────────────────────────────────────────────────
CLOUDINARY_URL=cloudinary://...
```

---

## Change 7 — Execution Engine (services/src/services/engine.ts)

Update `callAgentWithX402` to call `/settle` after successful agent response.
Add the secret header to the settle call too.

```typescript
// After agent returns 200 OK — call settle async
const facilitatorUrl = process.env.X402_FACILITATOR_URL
  || "https://facilitator.usemilkyway.com";
const secret = process.env.FACILITATOR_SECRET!;

// Fire and forget — never await this
fetch(`${facilitatorUrl}/settle`, {
  method:  "POST",
  headers: {
    "Content-Type":         "application/json",
    "X-Facilitator-Secret": secret     // always include secret
  },
  body: JSON.stringify({
    payment: paymentHeader,
    network: process.env.X402_NETWORK || "eip155:421614"
  })
}).catch(err =>
  console.error("Settle failed:", err.message)
);
```

---

## What The Secret Does In The Facilitator

For reference — this is how the facilitator checks it:

```
Every request to /verify or /settle:
  reads header: X-Facilitator-Secret
  compares to: process.env.FACILITATOR_SECRET

  No match → HTTP 401 → request rejected
  Match    → proceeds normally
```

If the SDK ever gets a 401 from the facilitator, it throws:
```
PaymentError: "Facilitator rejected the request — check FACILITATOR_SECRET"
```

This surfaces clearly in agent logs. Developer knows immediately what's wrong.

---

## Where The Secret Should Live

```
milkyway-facilitator/.env     FACILITATOR_SECRET=818b2d...  ← set (the source)
services/.env                 FACILITATOR_SECRET=818b2d...  ← same value
agent .env (each developer)   FACILITATOR_SECRET=get from dashboard ← different
                                                              (they get their own from
                                                               usemilkyway.com/settings)
```

Wait — should developers use the same secret as the facilitator?

**Yes for now.** One secret. Everyone who registers on MilkyWay gets it from the settings page. If abuse happens, rotate the secret in the facilitator and update it in the settings page — all agents pick up the new value when their developers update their .env.

**Later:** per-developer secrets tied to their API key. Each developer gets a unique secret. Rotatable individually. But that's after the hackathon.

---

## Verification — After Making All Changes

Run these checks:

```bash
# 1. Build succeeds
cd sdk/packages/agent-sdk
npm install
npm run build
# Should succeed with zero errors

# 2. No CDP imports remain
grep -r "coinbase/x402" sdk/
grep -r "CDP_API_KEY" sdk/
grep -r "CDP_API_KEY" services/
# Should return nothing

# 3. Secret is referenced correctly
grep -r "X-Facilitator-Secret" sdk/packages/agent-sdk/src/
# Should find it in verify.ts only

# 4. Start hello-agent in dev mode
cd agents/hello-agent
MILKYWAY_DEV_MODE=true npm run dev
curl http://localhost:3000/health
# Should return { status: "ok" }

# 5. Test verify hits facilitator
cd agents/hello-agent
# With MILKYWAY_DEV_MODE=false and real FACILITATOR_SECRET:
# POST /execute without payment → should return 402
# POST /execute with valid payment → should hit facilitator → 200
```

---

## Build Order for Claude Code

```
1. Update sdk/packages/agent-sdk/src/verify.ts    (full replacement)
2. Update sdk/packages/agent-sdk/src/x402.ts      (remove CDP import)
3. Update sdk/packages/agent-sdk/package.json     (remove @coinbase/x402)
4. Run: npm install in sdk/packages/agent-sdk/
5. Run: npm run build — must pass
6. Update sdk/packages/agent-sdk/.env.example
7. Update sdk/packages/create-milkyway-agent/templates/dotenv.example.hbs
8. Update services/.env.example
9. Update services/src/services/engine.ts (add settle call with secret)
10. Run: grep -r "coinbase/x402" . — must return nothing
11. Run: grep -r "CDP_API_KEY" . — must return nothing
12. Test hello-agent end to end
```

---

## Common Mistakes — Never Make These

- **Never hardcode the secret in source code.**
  `process.env.FACILITATOR_SECRET` only. Never a string literal.
- **Never commit .env files.**
  .gitignore must cover all .env files in all packages.
- **The secret header name is exactly `X-Facilitator-Secret`.**
  Case-sensitive. Match the facilitator exactly.
- **Dev mode bypasses verify — never use in production.**
  `MILKYWAY_DEV_MODE=true` is for local development only.
- **Settle is fire-and-forget — never await it.**
  The agent already served the response. Awaiting settle blocks the flow.
- **If FACILITATOR_SECRET is missing the SDK throws early.**
  Catches misconfigured agents before they serve any requests.
  Better to fail at startup than to fail silently at payment time.

---

*MilkyWay SDK — Facilitator Update*
*One facilitator. One secret. Full control.*
*facilitator.usemilkyway.com*
