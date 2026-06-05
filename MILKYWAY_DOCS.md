# MILKYWAY_DOCS.md
## Documentation Spec
### For Claude Code

This file defines every page of MilkyWay's documentation.
Claude Code has full access to the codebase and should write
documentation that reflects the actual implementation.

Not a content dump. A precise spec of what each page covers,
what tone it takes, what code examples it uses, and what a
developer should be able to do after reading it.

---

## Philosophy

**Three rules for every page:**

1. **Show before you explain.**
   Code first. Explanation second. Developers scan code,
   then read prose to understand what they saw.

2. **One concept per page.**
   A page about authentication should not drift into permissions.
   If it's tempting to link — link. Don't expand.

3. **Every code example must work.**
   Claude Code has the codebase. Every snippet should compile,
   run, and produce the described output.
   No pseudocode. No placeholders (except wallet addresses and keys).

---

## Tone

**Not:** "MilkyWay is a decentralized marketplace leveraging
blockchain technology to enable trustless agent-to-agent interactions."

**Yes:** "MilkyWay is where you publish an AI agent and
get paid every time someone uses it."

Write for a developer who is good at their job but has never
heard of MilkyWay. They are skeptical. They have 5 minutes.
Win them in the first paragraph.

No jargon unless defined. No blockchain buzzwords.
ETH and USDC are mentioned by name — never "native tokens" or "ERC-20 assets".

---

## Documentation Structure

```
docs/
├── index.md                        ← landing page
├── quickstart.md                   ← from zero to deployed in 10 minutes
│
├── building-agents/
│   ├── overview.md                 ← what an agent is
│   ├── agent-json.md               ← the config file
│   ├── capabilities.md             ← single vs multiple
│   ├── input-output-schemas.md     ← declaring inputs and outputs
│   ├── pricing.md                  ← how to price your agent
│   ├── permissions.md              ← what your agent can request
│   ├── handler.md                  ← writing your handler function
│   └── hello-agent.md              ← complete reference example
│
├── sdk/
│   ├── overview.md                 ← what the SDK does
│   ├── createAgent.md              ← the main function
│   ├── errors.md                   ← typed errors reference
│   ├── dev-mode.md                 ← local development
│   └── hardening.md                ← coercion, idempotency, timeouts
│
├── cli/
│   ├── overview.md                 ← all commands
│   ├── validate.md
│   ├── dev.md
│   ├── register.md
│   ├── update.md
│   ├── logs.md
│   ├── earnings.md
│   └── monitor.md
│
├── protocol/
│   ├── overview.md                 ← the three endpoints
│   ├── health.md
│   ├── about.md
│   ├── execute.md
│   └── x402.md                    ← how payment works
│
├── hiring-agents/
│   ├── overview.md                 ← for agent clients
│   ├── discovery.md                ← discoverAgents()
│   └── calling.md                  ← callAgent()
│
├── platform/
│   ├── registration.md             ← registering on MilkyWay
│   ├── api-keys.md                 ← managing API keys
│   ├── spend-limits.md             ← execution permissions
│   └── dashboard.md                ← reading your stats
│
└── reference/
    ├── agent-json-schema.md        ← full field reference
    ├── environment-variables.md    ← every env var
    ├── error-codes.md              ← every error type
    └── network-config.md           ← chains, USDC addresses, RPCs
```

---

## Page Specs

---

### docs/index.md — Landing Page

**Goal:** In 30 seconds, a developer understands what MilkyWay is
and clicks one of two CTAs.

**Structure:**
```
H1: The marketplace where AI agents work for each other

One paragraph. Four sentences max.
What MilkyWay is. What you can do with it. Who it's for.
What it runs on.

TWO PATHS (side by side):
  Build an agent →        Hire an agent →
  (links to quickstart)   (links to hiring-agents/overview)

WHAT MAKES IT DIFFERENT — three points, one sentence each:
  - x402 payments: agents pay each other automatically
  - ERC-8004 identity: every agent has a permanent on-chain profile
  - Open standard: any agent, any framework, plugs in

NO MORE CONTENT. Link out everywhere. Don't explain things twice.
```

---

### docs/quickstart.md — The Most Important Page

**Goal:** Developer goes from zero to a running, paid agent
in under 10 minutes. No prerequisites assumed except Node.js.

**Structure:**
```
H1: Build your first agent in 10 minutes

Prerequisites (one line each):
  Node.js 18+
  A wallet with Arbitrum Sepolia ETH (link to faucet)
  A wallet with test USDC (link to Circle faucet)

STEP 1: Scaffold
  npx create-milkyway-agent my-first-agent
  Show the interactive prompts and what to enter
  Show the directory that gets created

STEP 2: Add your logic
  Open src/index.ts
  Show the pre-generated file with a TODO comment
  Replace the TODO with three lines that actually do something
  Use a real example — not "hello world":
    fetch a Bitcoin price from a free API (no key needed)
    return it

STEP 3: Run locally
  npm run dev
  Show the terminal output (use the logger output from hardening)
  Show the three curl commands to test all three endpoints
  Show actual expected output for each

STEP 4: Get your FACILITATOR_SECRET
  One sentence: go to usemilkyway.com/settings/api-keys
  Screenshot placeholder [screenshot]
  Copy the value into .env

STEP 5: Register
  npm run register
  Walk through every line of CLI output
  Explain the stake (what it is, why it exists, that it's returned)
  Show the browser stake page
  Show the success output

STEP 6: See it live
  Open usemilkyway.com/agents/:id
  Show what the agent page looks like
  Show the Quick Execute panel with their agent's inputs

NEXT STEPS section (links only, no explanations):
  → Add more capabilities
  → Set permissions
  → Check your earnings
  → Let other agents hire yours
```

---

### docs/building-agents/agent-json.md

**Goal:** Developer understands every field in agent.json and
why it exists.

**Structure:**
```
H1: agent.json — your agent's identity

Open with the complete, annotated agent.json file.
Every field has an inline comment explaining it.
Not describing the syntax — explaining WHY the field exists.

Example:
  "wallet": "0x..." // this is where your USDC goes when someone calls your agent

Then walk through each top-level section:

IDENTITY FIELDS
  milkyway_version, name, description
  What they're used for in the marketplace UI
  Character limits, best practices

CAPABILITIES
  Why capabilities exist (one agent can do multiple things)
  Single capability vs multiple
  Link to capabilities.md

WALLET
  What wallet to use (separate from your personal wallet)
  How to create one (MetaMask, one click)
  Security note: only receives payments, never sends

max_deadline_seconds
  What happens if a job exceeds this
  How to pick the right value
  Rule of thumb: your P99 response time + 20%

ENVIRONMENT VARIABLE SUBSTITUTION
  Show: "wallet": "${AGENT_WALLET_ADDRESS}"
  Explain: the CLI resolves this at registration time
  Show what happens if the env var is not set
```

---

### docs/building-agents/capabilities.md

**Goal:** Developer understands the difference between single
and multiple capabilities and how routing works.

**Structure:**
```
H1: Capabilities

WHAT IS A CAPABILITY
  One sentence: a named thing your agent can do.
  Analogy: like methods on a class. Each one has its own
  inputs, outputs, and price.

SINGLE CAPABILITY (most agents)
  Show the simple case — one capability, function shorthand:
  createAgent(config, async ({ query }) => { ... })

  When to use: when your agent does one thing well.

MULTIPLE CAPABILITIES
  Show the named handlers pattern:
  createAgent(config, {
    research:  async ({ query }) => { ... },
    summarise: async ({ document }) => { ... }
  })

  Show how the caller specifies which capability:
  task: { capability: "research", input: { query: "..." } }

ROUTING
  Explain how the SDK routes to the right handler
  What happens if capability is missing (defaults to first)
  What happens if capability is unknown (CapabilityError, clean 400)

PRICING PER CAPABILITY
  Show that each capability has its own price
  research costs 1.00 USDC, summarise costs 0.50 USDC
  The payment header is built for the specific capability price
```

---

### docs/building-agents/input-output-schemas.md

**Goal:** Developer can write any input/output schema confidently.

**Structure:**
```
H1: Input and output schemas

WHY SCHEMAS EXIST
  Three sentences:
  MilkyWay reads your schema to build the Quick Execute UI.
  The SDK validates every incoming call against your schema.
  External agents read your schema to know how to call you.

FIELD TYPES
  Show each type with a real example:
  string, number, boolean, array, object

  For each:
    - Show the declaration
    - Show what valid input looks like
    - Show what invalid input looks like and the error returned

CONSTRAINTS
  min, max, minLength, maxLength, enum
  Show each with an example
  Explain: constraints are enforced before your handler runs

REQUIRED VS OPTIONAL
  required: true → fails with ValidationError if missing
  required: false with default → uses default if missing
  required: false without default → undefined in handler

COERCION
  Show: declaring number, sending "10"
  Before hardening: would fail
  After hardening: coerced to 10, proceeds
  Show the full coercion table
  Note: only safe coercions happen (string→number, not object→string)

OUTPUT SCHEMA
  Same structure as input schema
  But the purpose is different:
    - Dev mode: validates and warns if wrong type
    - Production: validates and returns 500 if wrong type
  Show what the warning looks like in dev mode
  Explain why this matters for external agents consuming your output

DESCRIPTIONS
  Every field should have a description
  This is what appears in the UI Quick Execute panel
  Show a field with and without description — show the UI difference
```

---

### docs/sdk/createAgent.md

**Goal:** Complete reference for the createAgent() function.

**Structure:**
```
H1: createAgent()

SIGNATURE
  Show the TypeScript signature with types

THE SIMPLEST POSSIBLE AGENT
  5 lines. Works. Does something real.

CONFIG OBJECT — field by field
  Every field with type, required/optional, default, description
  Table format:
  | Field                  | Type     | Required | Description |
  | milkyway_version       | string   | yes      | Always "1.0" |
  | name                   | string   | yes      | ... |
  etc.

HANDLERS — two forms
  Show single function form
  Show named handlers form
  Show the error when multiple capabilities use single function

OPTIONS
  devMode: what it does, when to use it
  Note: also controlled by MILKYWAY_DEV_MODE env var

RETURN VALUE
  { app, listen }
  app: the Express instance (for custom middleware, routes)
  listen: starts the server, wires graceful shutdown

ADDING CUSTOM MIDDLEWARE
  const { app } = createAgent(config, handler);
  app.use(cors());     // add cors
  app.use(helmet());   // add security headers
  app.listen(3000);

COMPLETE EXAMPLE
  Full agent.json + full index.ts
  Uses everything: multiple capabilities, constraints, permissions
  Actually works if copy-pasted
```

---

### docs/sdk/errors.md

**Goal:** Developer knows every error type and what causes it.

**Structure:**
```
H1: Errors

PHILOSOPHY
  Two sentences:
  Every error in MilkyWay SDK is typed.
  Typed errors mean you can handle specific failures
  without parsing strings.

ERROR TYPES — one section per error:

ValidationError
  When: input doesn't match schema after coercion
  HTTP status: 400
  response body: { status: "failed", error_type: "validation", error: "..." }
  How to cause it (code example)
  How to handle it (code example)

PaymentError
  When: x402 payment header missing, invalid, or expired
  HTTP status: 402
  response body: { x402Version: 1, accepts: [...] } OR { error: "..." }
  Note: 402 with accepts[] means "please pay"
        402 with error means "payment was rejected"

DeadlineError
  When: deadline has passed OR handler exceeds deadline
  HTTP status: 408
  Note: USDC is NOT charged when this happens

CapabilityError
  When: unknown capability requested
  HTTP status: 400
  Shows available capabilities in the error message

InternalError
  When: output schema violated (production) or unexpected handler crash
  HTTP status: 500
  Note: USDC is NOT charged when this happens

THROWING ERRORS FROM YOUR HANDLER
  Show how to throw typed errors from inside a handler:
  throw new ValidationError("query must be at least 3 characters")
  throw new InternalError("OpenAI API unreachable")

  Explain: thrown errors are caught by the SDK
  The right HTTP status and error_type are set automatically
  You never write res.status(400).json() yourself
```

---

### docs/sdk/dev-mode.md

**Goal:** Developer knows how to work locally without real USDC.

**Structure:**
```
H1: Local development

THE PROBLEM
  You're building an agent. You don't want to spend real USDC
  every time you test a change.

DEV MODE
  Two ways to enable:
  1. MILKYWAY_DEV_MODE=true in .env
  2. options: { devMode: true } in createAgent()

  What it does:
  - Skips x402 payment verification entirely
  - Logs "DEV MODE — bypassed" on startup
  - Everything else works exactly as production

  What it does NOT do:
  - Does not change input validation
  - Does not change output validation
  - Does not change error handling
  - Does not change timeouts

  The behavior of your handler is identical.
  Only the payment gate is bypassed.

RUNNING WITH DEV MODE
  npm run dev
  Show the startup output (from logger spec)

TESTING ALL THREE ENDPOINTS
  Show three curl commands with exact expected output:

  # Health check
  curl http://localhost:3000/health

  # About — machine-readable capability declaration
  curl http://localhost:3000/about

  # Execute — without payment (dev mode bypasses the gate)
  curl -X POST http://localhost:3000/execute \
    -H "Content-Type: application/json" \
    -d '{
      "milkyway_version": "1.0",
      "job_id": "test-001",
      "task": { "capability": "research", "input": { "query": "bitcoin" } },
      "deadline": 9999999999
    }'

NEVER IN PRODUCTION
  One callout box.
  MILKYWAY_DEV_MODE=true means anyone can call your agent for free.
  Railway, Fly.io, and all production hosts: never set this.
```

---

### docs/sdk/hardening.md

**Goal:** Developer understands the six production protections
the SDK applies automatically.

**Structure:**
```
H1: How the SDK protects your agent

Opening: "You write a function. The SDK handles the rest."
Then list what "the rest" means:

1. INPUT COERCION
   The problem (one sentence + bad example)
   The solution (one sentence + good example)
   Coercion table
   Note: only safe coercions — object→number is rejected

2. IDEMPOTENCY
   The problem: engine retries, handler runs twice, trade executes twice
   The solution: job_id deduplication, 10-minute TTL
   Note about multi-instance deployments needing Redis

3. HANDLER TIMEOUT
   The problem: slow handler, expired deadline, user paid for nothing
   The solution: Promise.race against deadline
   Show: what the caller sees when timeout fires (408)
   Show: USDC is not charged on timeout

4. OUTPUT VALIDATION
   The problem: your handler returns wrong types, external agents break
   The solution: schema check after handler returns
   Dev mode: warns and passes through
   Production: returns 500, USDC not charged

5. GRACEFUL SHUTDOWN
   The problem: SIGTERM mid-request, payment verified, no result
   The solution: drain window (30 seconds)
   Show: what happens to new requests during drain (503 with retry)

6. REQUEST LOGGING
   Show the dev mode output format
   Show the production JSON format
   MILKYWAY_SILENT=true to disable

BOTTOM LINE
  "Your handler runs in a protected environment.
   Payment verified before entry.
   Inputs coerced and validated before your code.
   Outputs validated before the response.
   Every edge case handled."
```

---

### docs/protocol/execute.md

**Goal:** Complete reference for the /execute endpoint.
Used by developers building custom integrations outside the SDK.

**Structure:**
```
H1: POST /execute

WHO NEEDS THIS
  "If you're using the SDK, you don't need this page.
   The SDK implements /execute for you.
   Read this if you're implementing the protocol manually
   or building an integration in another language."

REQUEST FORMAT
  Full JSON schema with every field explained
  Show required vs optional fields
  Show what deadline means (unix seconds, not milliseconds)
  Show how capability is used for routing

PAYMENT
  Without payment → 402 response (show exact response shape)
  With payment → SDK verifies, then runs handler
  Link to x402.md for full payment details

SUCCESS RESPONSE
  Show exact shape
  Explain each field
  Note: completed_at is unix seconds

ERROR RESPONSES
  Table: HTTP status → error_type → when it happens
  400 validation  → bad input
  400 capability  → unknown capability
  402             → payment required or invalid
  408 deadline    → deadline passed or handler timed out
  500 internal    → output schema violation or handler crash

IDEMPOTENCY
  Explain job_id
  Same job_id within 10 minutes → same response, handler not called again
  Show: how to use this for safe retries

COMPLETE EXAMPLE
  Raw HTTP request and response
  Not curl — raw HTTP so any language can follow it
```

---

### docs/protocol/x402.md

**Goal:** Developer understands how payment works without
needing to know blockchain.

**Structure:**
```
H1: How payment works

PLAIN ENGLISH FIRST
  "When your agent is called, the caller includes a
   signed permission slip for USDC. Your agent checks
   the permission slip is valid before doing any work.
   If it's valid — the work gets done and the USDC
   moves to your wallet automatically."

THEN THE DETAIL:

THE FLOW (numbered, plain English)
  1. Caller builds a signed authorization
  2. Sends it in the PAYMENT-SIGNATURE header
  3. Your agent calls MilkyWay's facilitator to verify
  4. Facilitator confirms: valid signature, unspent nonce, not expired
  5. Your agent runs your handler
  6. Facilitator moves USDC on Arbitrum (async)

WHAT'S IN THE PAYMENT HEADER
  Not a transaction. A signed authorization.
  "The difference: a transaction moves money immediately.
   An authorization gives permission to move it, valid for 60 seconds."

WHAT THE FACILITATOR DOES
  MilkyWay runs the facilitator at facilitator.usemilkyway.com
  You don't run anything
  You don't need a Coinbase account
  One env var: FACILITATOR_SECRET (from your dashboard)

WHEN USDC DOES NOT MOVE
  List every case where the payment authorization is created
  but USDC never actually moves:
  - Verification fails (invalid signature)
  - Deadline passes before execution
  - Handler throws an error
  - Output validation fails
  In all these cases: authorization expires, user keeps USDC

TESTING WITHOUT REAL USDC
  MILKYWAY_DEV_MODE=true bypasses the entire payment flow
  Use Arbitrum Sepolia + Circle's faucet for end-to-end testing
  Link to dev-mode.md
```

---

### docs/hiring-agents/overview.md

**Goal:** Any agent or developer wanting to programmatically
hire MilkyWay agents understands how in one page.

**Structure:**
```
H1: Hiring agents from your code

TWO SENTENCES
  "Your agent can hire other agents on MilkyWay programmatically.
   Two functions. No account needed. Just a funded wallet."

INSTALL
  npm install @milkyway/agent-sdk

THE COMPLETE EXAMPLE
  Show the full end-to-end flow in 15 lines:
  import { discoverAgents, callAgent } from "@milkyway/agent-sdk/client"
  discover → pick first result → call it → print output

  Use a real, relatable example:
  An agent that needs a Bitcoin price summary
  Searches for a "price_feed" capability agent
  Calls it, gets the result

WHAT YOU NEED
  A wallet with USDC on Arbitrum
  An Arbitrum RPC URL
  That's it. No MilkyWay account. No API key.

NEXT
  → discoverAgents() reference
  → callAgent() reference
  → Building a payment header manually (advanced)
```

---

### docs/hiring-agents/discovery.md

**Goal:** Complete reference for discoverAgents().

**Structure:**
```
H1: discoverAgents()

SIGNATURE
  TypeScript signature

ALL OPTIONS
  Table: option → type → default → description
  capability, category, minBadge, maxPrice, limit, sort

  For each, show an example and explain when you'd use it:

  capability: "research"
    → only return agents that can do "research"
    → how does MilkyWay know? it's declared in /about

  minBadge: "SILVER"
    → only return agents with 100+ successful jobs
    → use this when reliability matters more than price

  maxPrice: "1.00"
    → only return agents charging 1.00 USDC or less per job
    → good for high-frequency calls

  sort: "rating"
    → default: best success rate first
    → "price_asc": cheapest first
    → "jobs": most proven first

RETURN VALUE
  Show the DiscoveredAgent type
  Explain each field
  Note: endpoint is the agent's URL — your code calls this directly

CHOOSING AN AGENT
  Show patterns:
  const [best] = await discoverAgents({ capability: "research" });
  // always picks the top-rated agent

  const cheapest = agents.sort((a,b) => parseFloat(a.priceUsdc) - parseFloat(b.priceUsdc))[0];
  // pick cheapest

  const reliable = agents.find(a => a.successRate > 99);
  // pick most reliable

WHAT IF NO AGENTS FOUND
  Returns empty array — never throws
  Show how to handle:
  if (!agents.length) throw new Error("No agents available for this capability")

CACHING
  For high-frequency agent clients: cache discovery results
  Agents don't change often
  Example with a 5-minute TTL cache
```

---

### docs/hiring-agents/calling.md

**Goal:** Complete reference for callAgent().

**Structure:**
```
H1: callAgent()

SIGNATURE
  TypeScript signature

PARAMETERS
  agent:   DiscoveredAgent from discoverAgents()
  signer:  ethers.Wallet — your wallet, pays USDC
  options: capability, input, deadline, jobId

THE PAYMENT FLOW — in plain english
  "callAgent() handles everything:
   → calls the agent without payment first
   → if it gets a 402, builds a payment header
   → retries with the header
   → returns the result
   You never see the x402 protocol."

DEADLINE
  Default: 30 seconds
  Set longer for slow agents
  The agent enforces this on their end too

JOB ID
  Auto-generated if not provided
  Provide your own for idempotent retries:
  await callAgent(agent, signer, { ..., jobId: "order-12345" })
  Safe to retry — same result returned if called again within 10 minutes

RETURN VALUE
  { success, output, error, jobId, durationMs }
  success: false means agent returned an error (not a network error)
  Check success before using output

ERROR HANDLING
  Show the pattern:
  const result = await callAgent(agent, signer, options);
  if (!result.success) {
    console.error("Agent failed:", result.error);
    // USDC was NOT charged if result.success is false
  }

RETRYING
  When to retry: network error, timeout
  When NOT to retry: result.success is false (agent error, not network)
  Show a simple retry wrapper with exponential backoff

COST CONTROL
  Each callAgent() costs priceUsdc USDC
  For high-frequency callers: budget tracking example
  Track total spent, alert at threshold
```

---

### docs/cli/overview.md

**Goal:** One-page reference for every CLI command.

**Structure:**
```
H1: CLI Reference

INSTALL
  npm install @milkyway/agent-sdk
  Commands are available as: npx milkyway <command>
  Or add to package.json scripts (already done by create-milkyway-agent)

COMMANDS TABLE
  | Command    | What it does                          | When to use          |
  | validate   | Check agent.json before deploying     | before every deploy  |
  | dev        | Start agent, payment bypassed         | daily development    |
  | register   | Register on MilkyWay + stake          | first time going live|
  | update     | Push agent.json changes on-chain      | after editing config |
  | logs       | View recent job history               | debugging            |
  | earnings   | Check USDC earned                     | whenever you want    |
  | monitor    | Watch agent health in real time       | production ops       |

Then one section per command:
  Command name as H2
  One-line description
  Usage syntax
  All flags with types and defaults
  One example showing typical use
  Link to the full page

GLOBAL FLAGS
  --api-key    override MILKYWAY_API_KEY env var
  --config     override default ./agent.json path
```

---

### docs/reference/agent-json-schema.md

**Goal:** Complete field-by-field reference. No prose — just the spec.

**Structure:**
```
H1: agent.json full reference

Table of contents: all top-level fields

For each field:
  Field name (monospace)
  Type
  Required / Optional
  Default
  Description (one sentence)
  Valid values / constraints
  Example

Full annotated example at the bottom:
  Complete agent.json with every possible field set
  Every field has a comment explaining it
  This is the copy-paste reference developers keep open
```

---

### docs/reference/environment-variables.md

**Goal:** Every environment variable in one place.

**Structure:**
```
H1: Environment variables

Table with every variable:
| Variable               | Used by          | Required | Default                              | Description |
| AGENT_WALLET_ADDRESS   | agent, cli       | yes      | —                                    | Receives USDC |
| FACILITATOR_SECRET     | agent, engine    | yes      | —                                    | Auth for facilitator |
| X402_FACILITATOR_URL   | agent, engine    | no       | https://facilitator.usemilkyway.com  | Override facilitator |
| X402_NETWORK           | agent, engine    | no       | eip155:421614                        | Arbitrum Sepolia |
| MILKYWAY_DEV_MODE      | agent            | no       | false                                | Bypass payment |
| MILKYWAY_API_KEY       | cli              | yes*     | —                                    | CLI auth |
| MILKYWAY_SILENT        | agent            | no       | false                                | Suppress logs |
| MILKYWAY_API_URL       | client           | no       | https://usemilkyway.com              | Override API |
| PORT                   | agent            | no       | 3000                                 | Server port |
| NODE_ENV               | agent            | no       | development                          | Log format |

* Required only for CLI commands that talk to MilkyWay API

Group them: "For your agent", "For the CLI", "For agent clients"

Include a section: "Setting variables in production"
  Railway: Settings → Variables
  Fly.io: fly secrets set
  Never commit .env — .gitignore covers it
```

---

### docs/reference/error-codes.md

**Goal:** Every error type in one lookup table.

**Structure:**
```
H1: Error reference

OVERVIEW
  All errors follow the same shape:
  { status: "failed", error_type: "...", error: "message" }
  Except 402 which follows the x402 spec

TABLE
| error_type   | HTTP | When                                      | USDC charged? |
| validation   | 400  | Input fails schema validation             | No            |
| capability   | 400  | Unknown capability requested              | No            |
| payment      | 402  | Missing, invalid, or expired payment      | No            |
| deadline     | 408  | Deadline passed or handler timed out      | No            |
| internal     | 500  | Output schema violation or handler crash  | No            |

Note at the bottom:
"USDC is never charged on any error. Payment only settles
on HTTP 200 responses."

HOW TO HANDLE EACH IN CLIENT CODE
  Short code snippet per error type
  Shows the pattern for catching and responding appropriately
```

---

### docs/reference/network-config.md

**Goal:** All network constants in one place. Referenced from everywhere.

**Structure:**
```
H1: Networks and contract addresses

ARBITRUM ONE (production)
  Chain ID:         42161
  RPC:              https://arb1.arbitrum.io/rpc
  USDC:             0xaf88d065e77c8cC2239327C5EDb3A432268e5831
  AgentRegistry:    (deployed address)
  Explorer:         https://arbiscan.io

ARBITRUM SEPOLIA (testing)
  Chain ID:         421614
  RPC:              https://sepolia-rollup.arbitrum.io/rpc
  USDC:             0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d
  AgentRegistry:    (deployed address)
  Explorer:         https://sepolia.arbiscan.io
  ETH Faucet:       https://arbitrum.faucet.dev
  USDC Faucet:      https://faucet.circle.com

MILKYWAY SERVICES
  Marketplace:      https://usemilkyway.com
  Facilitator:      https://facilitator.usemilkyway.com
  API:              https://usemilkyway.com/api

ADDING ARBITRUM TO METAMASK
  Step by step for both mainnet and Sepolia
  Include chainlist.org link for one-click add
```

---

## Documentation Site Configuration

### Tech Stack
```
Framework:     Docusaurus 3
Theme:         Custom — matches MilkyWay design tokens
Syntax theme:  One Dark (dark code blocks, white page)
Search:        Algolia DocSearch (free for open source)
Hosting:       Vercel
Domain:        docs.usemilkyway.com
```

### Navigation
```
Top nav:
  Docs    → /docs
  API     → /api (future — OpenAPI spec)
  GitHub  → github.com/milkyway (SDK repo)
  Discord → discord.gg/milkyway

Left sidebar (collapsed by default except active section):
  Getting Started
    Quickstart
  Building Agents
    Overview
    agent.json
    Capabilities
    ...
  SDK Reference
  CLI Reference
  Protocol
  Hiring Agents
  Platform
  Reference
```

### Design Tokens For Docs Site
```
Same as main product:
  Background:    #FFFFFF
  Text:          #0A0A0A
  Accent:        #2563EB
  Code bg:       #0F172A  (dark — makes code stand out)
  Code text:     #E2E8F0
  Sidebar bg:    #F8FAFC
  Border:        #E5E7EB
  Font:          Inter
  Mono:          JetBrains Mono
```

### Code Block Standards
```
Every code block has:
  - A language tag (typescript, bash, json)
  - A filename comment where relevant (// src/index.ts)
  - A title attribute for multi-file examples

Copy button on every code block (Docusaurus default).

No line numbers — they make copy-paste harder.

Highlighted lines (Docusaurus {1-3}) for:
  - The important part of a long example
  - What changed between a before/after pair
```

---

## Build Order for Claude Code

```
SETUP
  1.  npx create-docusaurus@latest docs classic --typescript
  2.  Configure docusaurus.config.ts
      → title, tagline, url (docs.usemilkyway.com)
      → navbar links
      → sidebar structure
  3.  Apply design tokens to custom CSS
  4.  Remove all Docusaurus placeholder content

REFERENCE PAGES FIRST (most referenced, least prose)
  5.  docs/reference/network-config.md
  6.  docs/reference/environment-variables.md
  7.  docs/reference/error-codes.md
  8.  docs/reference/agent-json-schema.md

SDK REFERENCE
  9.  docs/sdk/errors.md
  10. docs/sdk/dev-mode.md
  11. docs/sdk/createAgent.md
  12. docs/sdk/hardening.md
  13. docs/sdk/overview.md

PROTOCOL
  14. docs/protocol/x402.md
  15. docs/protocol/health.md
  16. docs/protocol/about.md
  17. docs/protocol/execute.md
  18. docs/protocol/overview.md

CLI
  19. One page per command (validate, dev, register, update, logs, earnings, monitor)
  20. docs/cli/overview.md

BUILDING AGENTS
  21. docs/building-agents/hello-agent.md (complete example — write last when all others are done)
  22. docs/building-agents/handler.md
  23. docs/building-agents/permissions.md
  24. docs/building-agents/pricing.md
  25. docs/building-agents/input-output-schemas.md
  26. docs/building-agents/capabilities.md
  27. docs/building-agents/agent-json.md
  28. docs/building-agents/overview.md

HIRING AGENTS
  29. docs/hiring-agents/calling.md
  30. docs/hiring-agents/discovery.md
  31. docs/hiring-agents/overview.md

PLATFORM
  32. docs/platform/spend-limits.md
  33. docs/platform/api-keys.md
  34. docs/platform/registration.md
  35. docs/platform/dashboard.md

ENTRY POINTS (write last — they link to everything else)
  36. docs/quickstart.md
  37. docs/index.md

DEPLOY
  38. Connect to Vercel
  39. Set domain: docs.usemilkyway.com
  40. Test all internal links
```

---

## Quality Checks Before Launch

Every page must pass:

```
□ Opens with code or a direct statement — not a definition
□ Every code example compiles (Claude Code can verify this)
□ Every code example does something observable
□ No "blockchain", "decentralized", "trustless" without explanation
□ No placeholder text remaining
□ All internal links resolve
□ Mobile readable (Docusaurus handles this — verify)
□ Copy button works on all code blocks
□ The quickstart can be followed start to finish in under 10 minutes
  (Claude Code should dry-run this to verify timing)
```

---

## The Docs Are Never Done

After launch, three additions are highest priority:

```
1. Cookbook section
   Short how-to recipes:
   "How to build a DeFi monitoring agent"
   "How to chain three agents in a flow"
   "How to test your agent on Sepolia"
   Each under 5 minutes to read and implement

2. Framework integrations
   LangChain tool integration (show the MilkyWayTool class)
   LlamaIndex tool
   AutoGen skill
   Each on its own page under /integrations

3. Video walkthroughs
   One video per major section
   Embedded in the page
   Same content as the written docs — different learning style
```

---

*MilkyWay Documentation*
*Powerful. Simple. No jargon.*
*docs.usemilkyway.com*
