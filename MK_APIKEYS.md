# MILKYWAY_API_KEYS.md
## API Keys Settings Page — Full Spec
### For Claude Code

Read alongside MILKYWAY_DASHBOARD.md and MILKYWAY_CLI.md.
File: `frontend/app/settings/api-keys/page.tsx`
Requires: wallet connected + SIWE signed in.

---

## Design Direction

This page is used exclusively by developers.
It should feel like Stripe's API keys page or Vercel's tokens page.
Clean. Professional. Confident. No jargon.

```
Background:       #FFFFFF
Primary text:     #0A0A0A
Secondary text:   #6B7280
Accent blue:      #2563EB
Light blue:        #EFF6FF
Border:           #E5E7EB
Success green:    #059669
Warning amber:    #D97706
Code bg:          #F8FAFC
Code text:        #0F172A
Font:             Inter
Mono:             JetBrains Mono — all keys, code samples
```

---

## Page Layout

```
NAV (same as all pages)

SETTINGS SIDEBAR (left, 240px fixed)
  General
  → API Keys          ← active
  Notifications
  Billing

MAIN CONTENT (right, flex-1)
  PAGE HEADER
  EXPLAINER SECTION
  ACTIVE KEYS TABLE
  GENERATE NEW KEY SECTION
  USAGE SECTION
  DANGER ZONE

FOOTER
```

---

## Settings Sidebar

Reused across all settings pages.

```typescript
// frontend/components/SettingsSidebar.tsx

const NAV_ITEMS = [
  { label: "General",       href: "/settings" },
  { label: "API Keys",      href: "/settings/api-keys" },
  { label: "Notifications", href: "/settings/notifications" },
  { label: "Billing",       href: "/settings/billing" }
];

export function SettingsSidebar() {
  return (
    <nav className="w-60 flex-shrink-0">
      <p className="text-xs font-semibold text-gray-400 uppercase
        tracking-wide mb-3 px-3">
        Settings
      </p>
      {NAV_ITEMS.map(item => (
        <Link key={item.href} href={item.href}
          className={`
            block px-3 py-2 rounded-lg text-sm mb-1
            transition-colors duration-150
            ${isActive(item.href)
              ? "bg-blue-50 text-blue-700 font-medium"
              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            }
          `}>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
```

---

## Section 1 — Page Header

```
API Keys
─────────────────────────────────────────────────────────────────
Manage API keys for the MilkyWay CLI and developer tools.
Keys are tied to your wallet address and scoped to your agents only.
```

```typescript
<div className="mb-8">
  <h1 className="text-2xl font-bold text-gray-900 mb-2">
    API Keys
  </h1>
  <p className="text-gray-500 text-sm max-w-xl">
    API keys authenticate the MilkyWay CLI and developer tools.
    They give access to your agent profiles, job logs, and earnings —
    but never to your wallet or payments.
  </p>
</div>
```

---

## Section 2 — What Are API Keys (Explainer)

Shown only if the developer has no keys yet OR collapsed after first key is created.

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  🔑  What are API keys?                                         │
│                                                                 │
│  API keys let the MilkyWay CLI and developer tools             │
│  communicate with your account securely.                        │
│                                                                 │
│  Use them for:                                                  │
│                                                                 │
│  npx milkyway register    Register your agent on MilkyWay      │
│  npx milkyway logs        View job history in your terminal     │
│  npx milkyway earnings    Check your USDC earnings             │
│  npx milkyway monitor     Watch your agent health live         │
│  npx milkyway update      Push agent.json changes              │
│                                                                 │
│  Keep your API key secret. It gives access to your             │
│  agent data. Never commit it to git.                           │
│                                                                 │
│  [Read the CLI docs →]                                          │
└─────────────────────────────────────────────────────────────────┘
```

```typescript
function APIKeyExplainer() {
  const CLI_USES = [
    { cmd: "npx milkyway register", desc: "Register your agent on MilkyWay" },
    { cmd: "npx milkyway logs",     desc: "View job history in your terminal" },
    { cmd: "npx milkyway earnings", desc: "Check your USDC earnings"         },
    { cmd: "npx milkyway monitor",  desc: "Watch your agent health live"     },
    { cmd: "npx milkyway update",   desc: "Push agent.json changes"          }
  ];

  return (
    <div className="
      border border-blue-100 bg-blue-50 rounded-xl p-6 mb-8
    ">
      <div className="flex items-start gap-4">
        <div className="
          w-10 h-10 rounded-lg bg-blue-100
          flex items-center justify-center flex-shrink-0
          text-xl
        ">
          🔑
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 mb-1">
            What are API keys?
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            API keys let the MilkyWay CLI and developer tools
            communicate with your account securely.
          </p>

          <p className="text-xs font-semibold text-gray-500
            uppercase tracking-wide mb-2">
            Use them for:
          </p>

          <div className="space-y-2 mb-4">
            {CLI_USES.map(use => (
              <div key={use.cmd} className="flex items-center gap-3">
                <code className="
                  text-xs font-mono bg-white border border-blue-100
                  text-blue-700 px-2 py-1 rounded
                  whitespace-nowrap
                ">
                  {use.cmd}
                </code>
                <span className="text-sm text-gray-500">
                  {use.desc}
                </span>
              </div>
            ))}
          </div>

          <div className="
            flex items-start gap-2
            bg-amber-50 border border-amber-100
            rounded-lg px-3 py-2
          ">
            <span className="text-amber-500 flex-shrink-0">⚠</span>
            <p className="text-xs text-amber-700">
              Keep your API key secret. Never commit it to git.
              It gives read access to your agent data.
              <strong> It cannot move funds or affect payments.</strong>
            </p>
          </div>

          <a href="/docs/cli"
            className="
              inline-flex items-center gap-1
              text-sm text-blue-600 hover:text-blue-700
              mt-3
            ">
            Read the CLI docs →
          </a>
        </div>
      </div>
    </div>
  );
}
```

---

## Section 3 — Active Keys Table

```
┌─────────────────────────────────────────────────────────────────┐
│  Your API keys                              [+ Generate New Key]│
│                                                                 │
│  Name              Key                  Created    Last used   │
│  ──────────────────────────────────────────────────────────── │
│  Development       mw_live_xxxx...1234  2 days ago  1 hr ago  │
│                    [Copy]                           [Revoke]   │
│                                                                 │
│  Production        mw_live_xxxx...5678  5 days ago  Just now  │
│                    [Copy]                           [Revoke]   │
└─────────────────────────────────────────────────────────────────┘
```

```typescript
function APIKeysTable({ keys, onCopy, onRevoke }: Props) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-900">
          Your API keys
        </h2>
        <GenerateKeyButton />
      </div>

      {keys.length === 0 ? (
        <EmptyKeysState />
      ) : (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          {/* Table header */}
          <div className="
            grid grid-cols-4 gap-4 px-5 py-3
            bg-gray-50 border-b border-gray-200
          ">
            {["Name", "Key", "Created", "Last used"].map(h => (
              <span key={h}
                className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {h}
              </span>
            ))}
          </div>

          {/* Key rows */}
          {keys.map((key, i) => (
            <APIKeyRow
              key={key.id}
              apiKey={key}
              isLast={i === keys.length - 1}
              onCopy={onCopy}
              onRevoke={onRevoke}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function APIKeyRow({ apiKey, isLast, onCopy, onRevoke }: RowProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(apiKey.preview);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className={`
      grid grid-cols-4 gap-4 px-5 py-4 items-center
      hover:bg-gray-50 transition-colors duration-150
      ${!isLast ? "border-b border-gray-100" : ""}
    `}>
      {/* Name */}
      <span className="text-sm font-medium text-gray-900">
        {apiKey.name}
      </span>

      {/* Key preview + copy */}
      <div className="flex items-center gap-2">
        <code className="
          text-xs font-mono text-gray-500 bg-gray-100
          px-2 py-1 rounded
        ">
          {apiKey.preview}
        </code>
        <button
          onClick={handleCopy}
          className="
            text-xs text-gray-400 hover:text-gray-600
            transition-colors p-1 rounded
            hover:bg-gray-100
          "
          title={copied ? "Copied!" : "Copy key"}
        >
          {copied ? "✓" : (
            <svg width="14" height="14" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
          )}
        </button>
      </div>

      {/* Created */}
      <span className="text-sm text-gray-400">
        {formatDate(apiKey.createdAt)}
      </span>

      {/* Last used + revoke */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-400">
          {apiKey.lastUsedAt ? formatTimeAgo(apiKey.lastUsedAt) : "Never"}
        </span>
        <button
          onClick={() => onRevoke(apiKey.id)}
          className="
            text-xs text-red-400 hover:text-red-600
            transition-colors px-2 py-1 rounded
            hover:bg-red-50
          "
        >
          Revoke
        </button>
      </div>
    </div>
  );
}

function EmptyKeysState() {
  return (
    <div className="
      border-2 border-dashed border-gray-200 rounded-xl
      p-12 text-center
    ">
      <div className="
        w-12 h-12 bg-gray-100 rounded-xl
        flex items-center justify-center
        mx-auto mb-4 text-2xl
      ">
        🔑
      </div>
      <p className="font-medium text-gray-900 mb-1">
        No API keys yet
      </p>
      <p className="text-sm text-gray-400 mb-4">
        Generate a key to start using the MilkyWay CLI.
      </p>
      <GenerateKeyButton />
    </div>
  );
}
```

---

## Section 4 — Generate New Key

Clicking the "Generate New Key" button opens a modal — not a new page.

```
┌─────────────────────────────────────────────────────────────────┐
│  Generate API Key                                      [✕]      │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  Name (optional)                                                │
│  [Development________________________________]                  │
│  Give your key a name to remember what it's used for.          │
│                                                                 │
│  [Cancel]                     [Generate Key →]                 │
└─────────────────────────────────────────────────────────────────┘
```

**After clicking Generate Key — shows the key ONCE:**

```
┌─────────────────────────────────────────────────────────────────┐
│  ✅  Your new API key                                  [✕]      │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  Copy this key now. You won't be able to see it again.          │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ mw_live_a8f3k2p9x1m7q4n6r0s5t                          │   │
│  │                                              [Copy] ✓   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Add it to your .env file:                                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ MILKYWAY_API_KEY=mw_live_a8f3k2p9x1m7q4n6r0s5t         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ⚠  This key will not be shown again.                          │
│     If you lose it, generate a new one.                         │
│                                                                 │
│  [Done — I've copied my key]                                    │
└─────────────────────────────────────────────────────────────────┘
```

```typescript
function GenerateKeyModal({ onClose, onGenerated }: Props) {
  const [step, setStep]     = useState<"form" | "reveal">("form");
  const [name, setName]     = useState("Development");
  const [newKey, setNewKey] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    try {
      const { key } = await authFetch("/api/auth/api-keys", {
        method: "POST",
        body: JSON.stringify({ name })
      }).then(r => r.json());

      setNewKey(key);
      setStep("reveal");
      onGenerated();
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(newKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  }

  return (
    <Modal onClose={step === "form" ? onClose : undefined}>
      {step === "form" ? (
        <>
          <ModalHeader title="Generate API Key" onClose={onClose} />

          <div className="p-6">
            <Field label="Name (optional)">
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Development, Production"
                className="input-base"
                autoFocus
              />
              <p className="text-xs text-gray-400 mt-1">
                Give your key a name to remember what it's used for.
              </p>
            </Field>
          </div>

          <ModalFooter>
            <button onClick={onClose}
              className="btn-secondary">
              Cancel
            </button>
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="btn-primary"
            >
              {loading ? "Generating..." : "Generate Key →"}
            </button>
          </ModalFooter>
        </>
      ) : (
        <>
          <ModalHeader title="✅ Your new API key" />

          <div className="p-6 space-y-5">
            {/* Warning */}
            <div className="
              flex items-start gap-2
              bg-amber-50 border border-amber-200
              rounded-lg px-4 py-3
            ">
              <span className="text-amber-500 flex-shrink-0 mt-0.5">⚠</span>
              <p className="text-sm text-amber-800">
                Copy this key now.
                <strong> You won't be able to see it again.</strong>
              </p>
            </div>

            {/* The key */}
            <div>
              <p className="text-xs font-semibold text-gray-500
                uppercase tracking-wide mb-2">
                Your API key
              </p>
              <div className="
                flex items-center gap-3
                bg-gray-950 rounded-xl px-4 py-3
                border border-gray-800
              ">
                <code className="
                  flex-1 text-sm font-mono text-emerald-400
                  break-all select-all
                ">
                  {newKey}
                </code>
                <button
                  onClick={handleCopy}
                  className="
                    flex items-center gap-1.5
                    text-xs font-medium
                    text-gray-300 hover:text-white
                    bg-gray-800 hover:bg-gray-700
                    px-3 py-1.5 rounded-lg
                    transition-colors flex-shrink-0
                  "
                >
                  {copied ? (
                    <>
                      <span>✓</span>
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <CopyIcon />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* .env snippet */}
            <div>
              <p className="text-xs font-semibold text-gray-500
                uppercase tracking-wide mb-2">
                Add to your .env
              </p>
              <div className="
                bg-gray-950 rounded-xl px-4 py-3
                border border-gray-800
              ">
                <code className="text-sm font-mono text-gray-300">
                  <span className="text-gray-500">MILKYWAY_API_KEY</span>
                  <span className="text-gray-600">=</span>
                  <span className="text-emerald-400">{newKey}</span>
                </code>
              </div>
            </div>
          </div>

          <ModalFooter>
            <button
              onClick={onClose}
              className="btn-primary w-full"
            >
              Done — I've copied my key
            </button>
          </ModalFooter>
        </>
      )}
    </Modal>
  );
}
```

---

## Section 5 — Usage

Shows what the API key is being used for. Gives developers confidence their key is working.

```
┌─────────────────────────────────────────────────────────────────┐
│  Recent activity                                                │
│                                                                 │
│  Time          Action              Key                         │
│  ─────────────────────────────────────────────────────────── │
│  2 min ago     register            Development                 │
│  1 hr ago      earnings            Development                 │
│  3 hr ago      logs                Production                  │
│  Yesterday     register            Production                  │
└─────────────────────────────────────────────────────────────────┘
```

Action labels:
```
register   → "Registered an agent"
logs       → "Fetched job logs"
earnings   → "Checked earnings"
monitor    → "Health monitor ping"
update     → "Updated agent profile"
```

If no activity:
```
No activity yet.
Use the CLI to get started: npx milkyway register
```

---

## Section 6 — Danger Zone

At the bottom of the page. Separated visually.

```
┌─────────────────────────────────────────────────────────────────┐
│  Revoke all keys                                                │
│                                                                 │
│  Revoke all API keys immediately. Any CLI tools using          │
│  these keys will stop working until you generate new ones.     │
│                                                                 │
│  [Revoke All Keys]   ← red outline button                      │
└─────────────────────────────────────────────────────────────────┘
```

Clicking "Revoke All Keys" shows a confirmation:

```
┌─────────────────────────────────────────────────────────────────┐
│  Revoke all API keys?                                  [✕]      │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  This will immediately revoke 2 active keys.                   │
│  Any CLI tools using these keys will stop working.             │
│                                                                 │
│  This cannot be undone.                                         │
│                                                                 │
│  [Cancel]                        [Revoke All Keys]             │
│                                   ↑ red button                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Revoke Single Key

Clicking "Revoke" on a single key row shows:

```
┌─────────────────────────────────────────────────────────────────┐
│  Revoke "Development"?                                 [✕]      │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  This key will stop working immediately.                        │
│  Any CLI tools using it will need a new key.                   │
│                                                                 │
│  [Cancel]                           [Revoke Key]               │
│                                      ↑ red button               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Backend Routes

```typescript
// GET /api/auth/api-keys
// Returns list of keys (name, preview, createdAt, lastUsedAt)
// NOTE: never returns the full key — only preview (first 8 + last 4 chars)
// Requires: SIWE auth

// POST /api/auth/api-keys
// Generates a new API key
// Body: { name?: string }
// Returns: { key: "mw_live_...", preview: "mw_live_xxxx...1234", id }
// NOTE: full key returned ONCE only — never stored, only hash stored
// Requires: SIWE auth

// DELETE /api/auth/api-keys/:id
// Revokes a single key
// Requires: SIWE auth

// DELETE /api/auth/api-keys
// Revokes all keys for this wallet
// Requires: SIWE auth

// GET /api/auth/api-keys/activity
// Returns recent API key usage logs
// Requires: SIWE auth
```

---

## API Key Format

```
mw_live_[24 random chars]

Examples:
  mw_live_a8f3k2p9x1m7q4n6r0s5t
  mw_live_x9p2m5k8q1n4r7s0t3u6w

Preview (stored + shown in table):
  mw_live_a8f3...r0s5t
  First 14 chars + "..." + last 4 chars
```

Never store the full key. Store only:
```typescript
keyHash: crypto.createHash("sha256").update(key).digest("hex")
preview: `${key.slice(0, 14)}...${key.slice(-4)}`
```

---

## Prisma Schema Addition

```prisma
model ApiKey {
  id          String    @id @default(cuid())
  name        String    @default("Default")
  keyHash     String    @unique   // SHA-256 hash of full key
  preview     String              // mw_live_xxxx...1234
  address     String              // wallet address of owner
  createdAt   DateTime  @default(now())
  lastUsedAt  DateTime?
  revokedAt   DateTime?
  active      Boolean   @default(true)

  activity    APIKeyActivity[]

  @@index([address, active])
  @@index([keyHash])
}

model APIKeyActivity {
  id        String   @id @default(cuid())
  keyId     String
  action    String   // "register" | "logs" | "earnings" | "monitor" | "update"
  createdAt DateTime @default(now())

  apiKey    ApiKey   @relation(fields: [keyId], references: [id])

  @@index([keyId])
}
```

---

## Navigation — Add to Dashboard

Add Settings link to the main nav:

```typescript
// In frontend/app/layout.tsx nav links:
{ label: "Dashboard",  href: "/dashboard" },
{ label: "Builder",    href: "/builder"   },
{ label: "Settings",   href: "/settings"  }   ← add this
```

And add to the builder dashboard sidebar under the builder's wallet info:

```
0x1234...5678
─────────────────────
[Settings →]          ← links to /settings/api-keys
```

---

## Build Order for Claude Code

```
1. Write ApiKey + APIKeyActivity models in schema.prisma
2. npx prisma migrate dev --name add_api_keys
3. Write authenticateAPIKey middleware (used by CLI routes)
4. Write GET  /api/auth/api-keys
5. Write POST /api/auth/api-keys (generate + return once)
6. Write DELETE /api/auth/api-keys/:id (single revoke)
7. Write DELETE /api/auth/api-keys (revoke all)
8. Write GET  /api/auth/api-keys/activity
9. Write frontend/components/SettingsSidebar.tsx
10. Write frontend/app/settings/api-keys/page.tsx
    → APIKeyExplainer component
    → APIKeysTable component
    → APIKeyRow component
    → EmptyKeysState component
    → GenerateKeyButton component
    → GenerateKeyModal (form step + reveal step)
    → Usage/activity section
    → Danger zone section
11. Wire revoke confirmation modals
12. Add Settings link to main nav
13. End-to-end test:
    → Generate key → copy → paste in .env → npx milkyway logs → works
```

---

## Common Mistakes — Never Make These

- **Never store the full API key.** Only the SHA-256 hash.
  The full key is returned once on generation and never again.
- **Never show the full key in the table.**
  Always the preview format: mw_live_xxxx...1234
- **The reveal modal must not have an X close button.**
  Developer must explicitly click "Done — I've copied my key."
  Prevents accidental dismissal before copying.
- **Log every API key usage to APIKeyActivity.**
  Developers use the activity log to debug CLI issues.
- **The key format must start with mw_live_.**
  This prefix lets developers quickly identify MilkyWay keys
  in their .env files among other keys.
- **Revoke is immediate.** No grace period.
  The middleware checks active === true on every request.
- **API key auth is separate from SIWE session auth.**
  SIWE is for the web UI. API keys are for the CLI.
  Never mix them up.
- **The code blocks in the reveal modal use a dark background.**
  This is the only dark element on the page.
  It visually signals "this is code / a secret" clearly.

---

## What This Page Achieves

```
Developer opens the page:
  Immediately understands what API keys are for
  Sees CLI commands they can run
  Generates a key in 10 seconds
  Copies it cleanly from a beautiful reveal modal
  Pastes into .env
  Runs their first CLI command
  Sees activity confirming it worked

Security:
  Key shown exactly once
  Only hash stored
  Preview format protects the key
  Revoke is instant
  Activity log detects misuse
```

---

*MilkyWay API Keys Settings Page*
*Developers in. Keys out. Ten seconds.*