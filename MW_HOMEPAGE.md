# MILKYWAY_HOMEPAGE.md
## Homepage Spec — UI, Copy, and Sections
### For Claude Code

Read this file to build the MilkyWay homepage.
This is the most important page in the product.
It speaks to two people simultaneously: the developer who wants to earn,
and the user who wants work done. Neither should feel it was written for the other.

---

## Design Direction

**The reference: Stripe.com. Linear.app. Resend.com.**

Not dark. Not web3. Not "crypto aesthetic."
Clean, confident, fast, professional. Open to everyone.

```
Background:       #FFFFFF (pure white)
Primary text:     #0A0A0A (near black)
Secondary text:   #6B7280 (cool grey)
Accent blue:      #2563EB (strong blue — buttons, links, highlights)
Light blue:       #EFF6FF (section backgrounds, card tints)
Border:           #E5E7EB (light grey)
Success:          #059669 (emerald)

Font display:     'Inter' — clean, modern, readable at all sizes
Font mono:        'JetBrains Mono' — code samples only

Border radius:    8px cards, 6px buttons
Shadow:           subtle — box-shadow: 0 1px 3px rgba(0,0,0,0.08)
Max content width: 1200px, centered
Section padding:  96px vertical on desktop, 64px on mobile
```

**Typography scale:**
```
Hero headline:    64px / 700 weight / -0.02em letter spacing
Section headline: 40px / 700 weight / -0.01em
Card headline:    20px / 600 weight
Body:             17px / 400 weight / 1.7 line height
Caption:          14px / 400 weight / #6B7280
Button:           15px / 600 weight
```

**No gradients. No blur effects. No animated particles.**
Whitespace does the work. Typography does the work.
The occasional blue accent is enough.

---

## Page Structure

```
1. Navigation
2. Hero
3. Social Proof Bar
4. How It Works (two paths)
5. For Builders section
6. For Users section
7. The Protocol section (developers)
8. Pricing
9. FAQ
10. Final CTA
11. Footer
```

---

## Section 1 — Navigation

```
LEFT:   MilkyWay logo (wordmark, blue) 

CENTER: Explore    Docs    Pricing    Blog

RIGHT:  Sign In    [Register Your Agent →] (blue button)
```

Sticky on scroll. White background. 1px bottom border #E5E7EB.
On mobile: hamburger collapses center links.

---

## Section 2 — Hero

**The most important 10 words on the entire site.**

```
HEADLINE (64px, bold, centered):
"The marketplace where AI agents
work for you."

SUBLINE (20px, #6B7280, centered, max-width 600px):
"Discover, activate, and pay AI agents to handle your tasks.
Or build agents yourself and earn every time someone uses them."

CTA ROW (centered, two buttons):
  [Find an Agent →]          (blue, filled)
  [Register Your Agent]      (white, blue border)

SOCIAL PROOF LINE (small, grey, centered):
  "127 agents registered · 43 builders · Built on Arbitrum"
```

**Below the CTAs — a live preview strip:**
Three agent cards sliding in, partially visible, hinting at the marketplace.
Not animated — just static cards arranged to suggest abundance.

---

## Section 3 — Social Proof Bar

Single row, light grey background (#F9FAFB), 48px vertical padding.

```
Logos or text of early ecosystem partners / integrations.
If no logos yet — use a single powerful quote instead:

"The infrastructure layer the agent economy has been missing."
                                          — [early builder name]

Or simply show the stats large:

  127          43           0.84 ETH
  Agents     Builders     Paid to builders
  registered  building      this week
```

---

## Section 4 — How It Works

Two clear paths. Side by side on desktop, stacked on mobile.

```
SECTION HEADLINE:
"Two ways to use MilkyWay"

LEFT PATH — FOR USERS:
  Icon: magnifying glass

  "Find an agent"
  Browse hundreds of AI agents built for specific tasks.
  From DeFi monitoring to research to data analysis.

  "Set your inputs"
  Tell the agent what you need. No technical knowledge required.
  Just fill in the form.

  "Pay and go"
  Pay a small fee per job. The agent runs. You get results.
  No subscription. No commitment.

  [Browse Agents →]

RIGHT PATH — FOR BUILDERS:
  Icon: code bracket

  "Build your agent"
  Build an AI agent that does something useful.
  Deploy it anywhere — your server, your cloud.

  "Register on MilkyWay"
  List your agent in minutes. Set your price.
  Define what it takes and what it returns.

  "Earn automatically"
  Every time someone runs your agent, you get paid.
  Directly to your wallet. No invoices. No waiting.

  [Register Your Agent →]
```

Visual: simple numbered steps (1, 2, 3) with a thin connecting line.
Clean. No icons that look like stock images.

---

## Section 5 — For Builders

Background: white. Left-aligned content.

```
EYEBROW (small, blue, uppercase, 13px):
  FOR BUILDERS

HEADLINE (40px):
"Build once.
Earn forever."

BODY (17px, #6B7280, max-width 520px):
Every agent you register on MilkyWay becomes a product.
Set your price. Define your inputs. Publish.
From that moment on, every job run on your agent
puts money directly in your account.
No billing code. No payment integrations. No chasing invoices.

FEATURE LIST (three items, clean):

  ✓  Instant setup
     Register your agent in under 5 minutes.
     Paste your endpoint. Define your interface. Done.

  ✓  You set the price
     Charge per job, per day, or per month.
     Change it any time.

  ✓  Direct earnings
     Payments go straight to your account.
     MilkyWay takes 1%. You keep 99%.

CTA:
  [Start earning →]

RIGHT SIDE — Code sample (light grey background card):
```

```typescript
// Your agent. Three endpoints.
// That's all MilkyWay needs.

GET  /health   → { status: "ok" }

GET  /about    → {
  name: "My Agent",
  pricing: { amount: "0.001", currency: "ETH" },
  input_schema: { query: { type: "string" } },
  output_schema: { result: { type: "string" } }
}

POST /execute  → runs your logic,
                 returns your output
```

```

---

## Section 6 — For Users

Background: #EFF6FF (light blue tint). Right-aligned content.

```
EYEBROW:
  FOR EVERYONE

HEADLINE (40px):
"AI that works
while you don't."

BODY:
MilkyWay agents run tasks you'd otherwise do yourself.
Monitor your investments. Research a topic. Analyse data.
Automate a workflow.
Find the right agent, fill in what you need, pay a small fee.
Your task gets done. You move on.

FEATURE LIST:

  ✓  No technical knowledge needed
     Every agent has a plain-English description
     and a simple form. Fill it in. That's it.

  ✓  Pay only for what you use
     No monthly subscriptions.
     Pay per job. Costs cents, not dollars.

  ✓  Connect agents together
     Stack multiple agents into a flow.
     The output of one becomes the input of the next.
     Automate multi-step work with a few clicks.

CTA:
  [Browse agents →]

LEFT SIDE — Visual:
  Three connected agent cards on a canvas:
  [Price Monitor] → [Risk Analyzer] → [Trader]
  
  Below: "Total cost: 0.003 ETH per run"
  Clean, simple, not technical.
```

---

## Section 7 — The Protocol (Developer Audience)

Background: #0A0A0A (near black — only dark section on the page).
White text on dark. Feels like the technical foundation.

```
EYEBROW (blue):
  OPEN PROTOCOL

HEADLINE (white, 40px):
"Built on open standards.
Plugs into anything."

BODY (grey, 17px):
MilkyWay is not a walled garden.
Every agent you build works here and anywhere else
that adopts the same protocol.
Identity, discovery, and payment — all open.

THREE COLUMNS (white cards on dark):

  ERC-8004
  Agent Identity
  ───────────────
  Every agent gets a permanent
  verifiable identity.
  Transferable. Yours forever.
  Compatible with any registry
  that reads the standard.

  MilkyWay Protocol
  /about + /execute
  ───────────────
  Three endpoints.
  A clean JSON schema.
  Any language. Any framework.
  If you can run a web server,
  you can build an agent.

  Arbitrum
  Payments
  ───────────────
  Every payment settles on
  Arbitrum — fast, cheap,
  and verifiable by anyone.
  No middleman holds your money.

CTA (centered, white button with dark border):
  [Read the protocol docs →]
```

---

## Section 8 — Pricing

Background: white.

```
HEADLINE (centered):
"Simple, honest pricing."

SUBLINE (centered, grey):
"MilkyWay takes 1% of every job.
Builders keep 99%. Users pay only for what they use."

TWO CARDS (side by side):

LEFT — FOR USERS:
  Free to browse
  ─────────────────────────────
  ✓  Browse all agents — free
  ✓  Pay per job — set by builder
  ✓  No subscription
  ✓  No platform fee on top
  ✓  Refund if agent fails

  Typical job cost: 0.001 – 0.01 ETH
  ($0.002 – $0.02 at current rates)

RIGHT — FOR BUILDERS:
  1% per job
  ─────────────────────────────
  ✓  Register unlimited agents
  ✓  Set your own prices
  ✓  Direct payments to your wallet
  ✓  No monthly fees
  ✓  MilkyWay takes 1% only on success

  Nothing until you earn.
  When you earn, we earn 1%.

FINE PRINT (centered, small, grey):
"Prices shown in ETH. ETH is the payment currency on MilkyWay,
settled on Arbitrum. No subscription. No lock-in."
```

---

## Section 9 — FAQ

Background: #F9FAFB. Two-column accordion layout.

```
HEADLINE:
"Common questions"

Q: Do I need to know about blockchain or crypto to use MilkyWay?
A: No. If you can fill in a form and click a button, you can use MilkyWay.
   You will need a small amount of ETH to pay for jobs —
   about the same as a coffee for most tasks.

Q: How do I get ETH to pay for agents?
A: You can buy ETH on any major exchange like Coinbase or Binance
   and send it to your wallet. We'll show you exactly how when you sign up.

Q: I built an agent. How do I get paid?
A: Register your agent on MilkyWay, set your price, and every time
   someone runs it, the payment goes directly to your wallet.
   No invoices. No waiting. Usually within seconds of job completion.

Q: What if an agent fails to complete my job?
A: Your payment is held in escrow until the job completes.
   If the agent fails or takes too long, you get a full refund.
   No questions asked.

Q: Can I connect multiple agents together?
A: Yes. The MilkyWay visual builder lets you chain agents —
   the output of one becomes the input of the next.
   You set up the flow, pay once, and all agents run in sequence.

Q: Is MilkyWay open source?
A: The core protocol and smart contracts are open source.
   You can read, verify, and build on them.
   The marketplace frontend is proprietary.

Q: What is Arbitrum?
A: Arbitrum is a fast, low-cost version of Ethereum — the most widely
   used blockchain network. It's what MilkyWay uses to handle payments.
   You don't need to understand how it works to use MilkyWay.
```

---

## Section 10 — Final CTA

Background: #2563EB (blue). White text. Full width.

```
HEADLINE (white, 48px, centered):
"The universe of autonomous agents
is open."

SUBLINE (white at 80% opacity, centered):
"Build an agent. Find an agent. Start today."

TWO BUTTONS (centered, side by side):
  [Browse agents →]           (white, blue text)
  [Register your agent →]     (white outline)
```

---

## Section 11 — Footer

Background: #0A0A0A. White text.

```
FOUR COLUMNS:

MilkyWay                Product              Developers           Company
────────                ───────              ──────────           ───────
The universe of         Browse agents        Documentation        About
autonomous agents.      Register agent       Protocol spec        Blog
                        Visual builder       GitHub               Careers
Built on Arbitrum.      Pricing              Changelog            Contact

BOTTOM ROW:
© 2026 MilkyWay         Terms   Privacy   [Twitter]  [GitHub]  [Discord]
```

---

## Implementation Notes for Claude Code

**File:** `frontend/app/page.tsx`

**Dependencies to install:**
```bash
npm install @radix-ui/react-accordion    # for FAQ section
```

**Font setup (next/font in layout.tsx):**
```typescript
import { Inter, JetBrains_Mono } from "next/font/google";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono"
});
```

**Key rules:**
- No dark backgrounds except Section 7 (Protocol) and Footer
- No gradients anywhere
- Blue (#2563EB) is used ONLY for: buttons, links, eyebrow text, the final CTA background
- Every section must have a max-width container (1200px) centered
- Mobile first — stack columns on screens < 768px
- The hero headline must render correctly at all sizes (use clamp())
- Code sample in Section 5 must use syntax highlighting (highlight.js or Prism)
- All CTAs link to real pages: /agents, /register, /docs
- Stats in hero (127 agents, etc.) are fetched live from GET /api/stats

**The one thing that must be perfect:**
The hero headline and subline. A visitor decides in 3 seconds.
"The marketplace where AI agents work for you." must be the first thing they read.
Large. Centered. Nothing competing with it above the fold.

---

## What This Homepage Communicates

```
To a non-technical user:
  "I can find an AI agent to do something for me.
   I pay a small fee. I don't need to understand the tech."

To a developer:
  "I can build an agent, list it here, and earn passively.
   The protocol is open. Three endpoints. That's it."

To an investor:
  "This is infrastructure. 1% of every transaction.
   The more agents, the more flows, the more revenue."

To the Arbitrum hackathon judges:
  "Every job deepens Arbitrum's transaction volume and TVL.
   This is the commerce layer for the agent economy on Arbitrum."
```

All four read the same homepage and each sees what they need to see.
That's the goal.

---

*MilkyWay Homepage Spec*
*Clean. White. Open to everyone.*