# MILKYWAY_DASHBOARD.md
## Dashboard Page — Full Spec
### Unified Dashboard for Builders and Users

Read alongside all other MILKYWAY_*.md files.
File: `frontend/app/dashboard/page.tsx`
Requires: wallet connected + SIWE signed in.

---

## Design Rules

Same as all other pages:
```
Background:      #FFFFFF
Primary text:    #0A0A0A
Secondary text:  #6B7280
Accent blue:     #2563EB
Light blue bg:   #EFF6FF
Border:          #E5E7EB
Success:         #059669
Warning:         #D97706
Error:           #DC2626
Font:            Inter
Mono:            JetBrains Mono (hashes, addresses only)
Max width:       1200px centered
```

---

## Page Layout

```
NAV (same as all pages, shows signed-in address)

DASHBOARD HEADER
  "Welcome back, 0x1234...5678"
  SUMMARY STRIP

TABS
  [My Flows]  [My Agents]  [Earnings]

TAB CONTENT (changes based on active tab)

FOOTER
```

Default tab logic:
```typescript
// If user has registered agents → default to My Agents tab
// Otherwise → default to My Flows tab
const defaultTab = agentCount > 0 ? "my-agents" : "my-flows";
```

---

## Dashboard Header

```
┌──────────────────────────────────────────────────────────────────┐
│  Welcome back, 0x1234...5678                                     │
│                                                                  │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────┐ │
│  │ Total earned │ │ Jobs run     │ │ Active flows │ │ Agents │ │
│  │ 0.042 ETH    │ │ 847          │ │ 2            │ │ 5 live │ │
│  │ all time     │ │ all time     │ │ right now    │ │        │ │
│  └──────────────┘ └──────────────┘ └──────────────┘ └────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

**What shows in the strip:**
- If user has NO agents: hide "Total earned" and "Agents live"
- If user has NO flows: hide "Jobs run" and "Active flows"
- If user has both: show all four

**Data source:**
```typescript
GET /api/dashboard/summary
// Returns:
{
  totalEarnedEth: string,
  totalJobsRun: number,
  activeFlows: number,
  agentsLive: number,
  agentsTotal: number
}
```

---

## Tab 1 — My Flows

Everything the user has run, is running, or has saved.

---

### Section A — Active Flows

Only shown if activeFlows > 0.
If no active flows: skip this section entirely.

```
HEADING: "Running now"

Each active flow as a card:

┌──────────────────────────────────────────────────────────────────┐
│  🟡 Running                                          Flow #1234  │
│                                                                  │
│  Price Monitor  →  Risk Analyzer  →  Trader                     │
│  ✅ done            ⟳ running         ○ waiting                 │
│                                                                  │
│  Started 42 seconds ago                                          │
│  Progress: 1 of 3 agents complete                               │
│                                      [View Details →]            │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  🔵 Scheduled                                        Flow #5678  │
│                                                                  │
│  Research Agent                                                  │
│  Runs every 6 hours · Next run in 2h 14m                        │
│                                                                  │
│  Last run: completed successfully 3h ago                         │
│                          [Pause]  [Run Now]  [View Details →]    │
└──────────────────────────────────────────────────────────────────┘
```

**Flow status colors:**
```
🟡 Running    → amber
🔵 Scheduled  → blue
🟢 Completed  → green (briefly shown before moving to history)
🔴 Failed     → red
⚪ Locked     → grey (paid, not yet started)
```

**Pipeline visualization (inside card):**
```typescript
// Small inline pipeline — agent names connected by arrows
// Status icon per agent:
//   ✅  completed
//   ⟳   running (spinning)
//   ○   waiting
//   ❌  failed

function PipelineMini({ agents }: { agents: FlowAgent[] }) {
  return (
    <div className="flex items-center gap-2">
      {agents.map((agent, i) => (
        <Fragment key={agent.id}>
          <div className="flex flex-col items-center">
            <span className="status-icon">{getStatusIcon(agent.status)}</span>
            <span className="text-xs text-gray-500 truncate max-w-20">
              {agent.name}
            </span>
          </div>
          {i < agents.length - 1 && (
            <span className="text-gray-300 text-sm">→</span>
          )}
        </Fragment>
      ))}
    </div>
  );
}
```

**Polling:** Active flows poll GET /api/flows/:jobId every 3 seconds.
Stop polling when status is COMPLETED, FAILED, or REFUNDED.

---

### Section B — Saved Flows

Flows the user has built and saved but not currently running.
Shows below active flows.

```
HEADING: "Saved flows"
SUBTEXT: "Flows you've built. Run them anytime."

┌──────────────────────────────────────────────────────────────────┐
│  My DeFi Monitor                                                 │
│  Price Monitor → Risk Analyzer → Trader                         │
│  3 agents · 0.003 ETH per run · Last run: yesterday             │
│                                                                  │
│  [Run Now →]          [Edit]    [Delete]                         │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  Weekly Research                                                 │
│  Research Agent                                                  │
│  1 agent · 0.001 ETH per run · Never run                        │
│                                                                  │
│  [Run Now →]          [Edit]    [Delete]                         │
└──────────────────────────────────────────────────────────────────┘

[+ Build a new flow →]   links to /builder
```

If no saved flows:
```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│  No saved flows yet.                                             │
│  Build a flow and save it to run it anytime.                     │
│                                                                  │
│  [Open the Builder →]                                            │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

### Section C — Job History

All flows ever run by this user. Paginated.

```
HEADING: "History"

FILTER ROW:
  [All]  [Completed]  [Failed]  [Refunded]
  Date range: [Last 7 days ▼]

TABLE:
  Date          Flow / Agents              Cost       Status      
  ────────────────────────────────────────────────────────────────
  2 min ago     Research Agent             0.001 ETH  ✅ Done     
  1 hr ago      Price Monitor → Trader     0.003 ETH  ✅ Done     
  Yesterday     Liquidation Shield         0.001 ETH  ❌ Failed   
  3 days ago    Research Agent             0.001 ETH  💸 Refunded 

Each row is clickable → opens Job Detail Modal

"Load more" button at bottom (not infinite scroll — explicit action)
```

**Job Detail Modal:**
```
┌──────────────────────────────────────────────────────────────────┐
│  Job #1234                                        ✅ Completed   │
│  ─────────────────────────────────────────────────────────────  │
│                                                                  │
│  WHAT YOU GAVE IT                                                │
│  query     "latest ETH market movements"                        │
│  limit     10                                                    │
│                                                                  │
│  WHAT YOU GOT BACK                                               │
│  results   [rendered list of findings]                          │
│  count     8                                                     │
│                                                                  │
│  ─────────────────────────────────────────────────────────────  │
│  Started:    14 May 2026, 14:32:01                               │
│  Completed:  14 May 2026, 14:32:05  (4.2 seconds)               │
│  Paid:       0.001 ETH                                           │
│  Tx hash:    0x7abc...1234  [View on Arbiscan →]                 │
│                                                                  │
│  [Run Again]                                    [Close]          │
└──────────────────────────────────────────────────────────────────┘
```

Output rendered using OutputRenderer component from MILKYWAY_AGENT_PAGE.md.
Never raw JSON.

---

## Tab 2 — My Agents

Everything a builder needs to manage their published agents.

---

### Section A — Agents Table

```
HEADING: "Your agents"

ACTION ROW (top right):
  [+ Register New Agent →]   links to /register

TABLE:
  Agent           Status      Badge   Jobs    Earned      Actions
  ──────────────────────────────────────────────────────────────
  Research Agent  🟢 Live     🥉      847     0.042 ETH   [Edit] [View]
  Price Monitor   🟡 Degraded 🥉      12      0.003 ETH   [Edit] [View]
  Hello Agent     🟢 Live     —       0       0 ETH       [Edit] [View]

Each row is expandable — click anywhere on row to expand:

  EXPANDED ROW:
  ┌────────────────────────────────────────────────────────────────┐
  │                                                                │
  │  RELIABILITY (last 7 days)                                     │
  │  Mon ■  Tue ■  Wed ■  Thu □  Fri ■  Sat ■  Sun ■             │
  │  "Last verified: 2 minutes ago"                               │
  │                                                                │
  │  RECENT JOBS (last 3)                                          │
  │  14 May 14:32  Flow #1234   0.001 ETH  ✅                     │
  │  14 May 13:10  Flow #5678   0.001 ETH  ✅                     │
  │  14 May 11:45  Flow #9abc   0.001 ETH  ❌                     │
  │                                                                │
  │  INTERFACE PREVIEW                                             │
  │  Inputs:  query (text, required), limit (number, optional)    │
  │  Outputs: results (list), count (number)                      │
  │                                                                │
  │  [Edit Agent →]     [View Public Page →]    [Deactivate]       │
  │                                                                │
  └────────────────────────────────────────────────────────────────┘
```

If no agents registered:
```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│  You haven't registered any agents yet.                          │
│  Build something useful. List it here. Earn automatically.       │
│                                                                  │
│  [Register your first agent →]                                   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

### Edit Agent Modal

Opens when user clicks [Edit] on any agent.

```
┌──────────────────────────────────────────────────────────────────┐
│  Edit: Research Agent                                    [✕]     │
│  ─────────────────────────────────────────────────────────────  │
│                                                                  │
│  Name                                                            │
│  [Research Agent_________________________]                       │
│                                                                  │
│  Description                                                     │
│  [________________________________________________________]      │
│  [________________________________________________________]      │
│                                                                  │
│  Category          Pricing model       Price                     │
│  [DeFi ▼]          [Per job ▼]         [0.001___] ETH           │
│                                                                  │
│  Logo              [Current logo]  [Upload new]                  │
│                                                                  │
│  ─────────────────────────────────────────────────────────────  │
│  ⚠️  Cannot change: endpoint, category (requires re-register)   │
│                                                                  │
│  [Cancel]                              [Save Changes →]          │
└──────────────────────────────────────────────────────────────────┘
```

On Save:
1. PUT /api/agents/:agentId (updates Postgres)
2. Recomputes metadataHash
3. Calls AgentRegistry.updateMetadata(agentId, newHash) via wagmi
4. Shows "Saved" confirmation

---

### Deactivate Flow

Clicking [Deactivate] shows confirmation:

```
┌──────────────────────────────────────────────────────────────────┐
│  Deactivate Research Agent?                                      │
│  ─────────────────────────────────────────────────────────────  │
│                                                                  │
│  This will:                                                      │
│  • Remove the agent from the marketplace                         │
│  • Return your 0.01 ETH stake to your wallet                    │
│  • Cancel any scheduled flows using this agent                  │
│                                                                  │
│  This cannot be undone. You can re-register later.               │
│                                                                  │
│  [Cancel]                          [Deactivate and Refund →]     │
└──────────────────────────────────────────────────────────────────┘
```

On confirm: calls AgentRegistry.deactivateAgent(agentId) via wagmi.

---

## Tab 3 — Earnings

Only visible if user has at least one registered agent.

---

### Section A — Earnings Summary

```
HEADING: "Earnings"

TIME FILTER: [Last 7 days]  [Last 30 days]  [All time]

SUMMARY STRIP:
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Total earned │ │ This period  │ │ Best agent   │
│ 0.042 ETH    │ │ 0.012 ETH    │ │ Research     │
│ all time     │ │              │ │ 0.032 ETH    │
└──────────────┘ └──────────────┘ └──────────────┘
```

---

### Section B — Earnings Chart

```
Daily earnings bar chart — last 30 days
Blue bars. Clean. No gridlines except horizontal.
Hover on bar: shows date + ETH earned that day.

Built with recharts:
import { BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts"
```

---

### Section C — Per Agent Breakdown

```
HEADING: "By agent"

┌──────────────────────────────────────────────────────────────────┐
│  Research Agent                                                  │
│  ─────────────────────────────────────────────────────────────  │
│  847 jobs     0.032 ETH earned     Last paid: 2 min ago          │
│                                                                  │
│  [████████████████████████░░░░░░]  76% of total earnings        │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  Price Monitor                                                   │
│  ─────────────────────────────────────────────────────────────  │
│  12 jobs      0.010 ETH earned     Last paid: 5 hr ago           │
│                                                                  │
│  [████████░░░░░░░░░░░░░░░░░░░░░░]  24% of total earnings        │
└──────────────────────────────────────────────────────────────────┘
```

---

### Section D — Recent Payments

```
HEADING: "Recent payments"

Date         Agent            Flow           Amount    
──────────────────────────────────────────────────────
2 min ago    Research Agent   Flow #1234     0.001 ETH  [↗]
1 hr ago     Price Monitor    Flow #5678     0.002 ETH  [↗]
3 hr ago     Research Agent   Flow #9abc     0.001 ETH  [↗]

[↗] links to Arbiscan transaction.

"Load more" at bottom.
```

If no earnings yet:
```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│  No earnings yet.                                                │
│                                                                  │
│  Once someone runs your agent, your earnings appear here.        │
│  Share your agent page to get your first job.                    │
│                                                                  │
│  [View your agent page →]                                        │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Notifications

Small notification bell in the nav (top right, next to wallet address).

```
Types of notifications:
  🔴  Agent went down        "Research Agent failed 3 checks"
  🟢  Agent came back up     "Research Agent is live again"
  💰  Payment received       "You earned 0.001 ETH from Research Agent"
  🏅  Badge upgraded         "Research Agent upgraded to Silver"
  ✅  Flow completed         "My DeFi Monitor completed successfully"
  ❌  Flow failed            "My DeFi Monitor failed — refund issued"
```

Stored in Postgres `Notification` model.
Fetched on dashboard load.
Mark as read on click.

```prisma
model Notification {
  id          String   @id @default(cuid())
  address     String
  type        String
  message     String
  read        Boolean  @default(false)
  createdAt   DateTime @default(now())

  @@index([address, read])
}
```

Bell shows unread count badge (red dot, max "9+").

---

## Backend Routes

```typescript
GET  /api/dashboard/summary        overall stats strip
GET  /api/dashboard/flows          user's saved + active flows
GET  /api/dashboard/agents         builder's agents with stats
GET  /api/earnings/:address        earnings data (all periods)
GET  /api/notifications            unread notifications
POST /api/notifications/read-all   mark all as read

// Already exist — no changes needed:
GET  /api/flows/:jobId             flow status (for polling)
PUT  /api/agents/:agentId          edit agent
```

---

## Build Order for Claude Code

```
1. Write GET /api/dashboard/summary
2. Write GET /api/dashboard/flows
3. Write GET /api/dashboard/agents
4. Write GET /api/earnings/:address
5. Write Notification model + routes
6. Build dashboard/page.tsx shell (tabs, header, summary strip)
7. Build My Flows tab
   → Active flows section with polling
   → Saved flows section
   → Job history table
   → Job detail modal
8. Build My Agents tab
   → Agents table with expandable rows
   → Edit agent modal
   → Deactivate flow
9. Build Earnings tab
   → Install recharts: npm install recharts
   → Summary strip
   → Bar chart
   → Per agent breakdown
   → Recent payments
10. Build notification bell in nav
11. End-to-end test all three tabs
```

---

## Common Mistakes — Never Make These

- **Never poll ALL flows at once.** Only poll flows with status
  LOCKED or RUNNING. Completed flows don't need polling.
- **Never show the Earnings tab if user has no agents.**
  Check agentCount before rendering the tab.
- **Never show raw ETH as a float.** Always format with toFixed(6)
  and trim trailing zeros: 0.042000 → 0.042.
- **Never let the Edit modal change endpoint or category.**
  These are immutable after registration. Grey them out with a notice.
- **The deactivate action is irreversible.** Always show the
  confirmation modal. Never deactivate on a single click.
- **Notifications are per wallet address, not per session.**
  Store and query by address, not by JWT.
- **The bar chart must handle zero-earning days gracefully.**
  Show a flat bar or empty slot — never crash on zero values.
- **Default tab must be computed server-side.**
  Don't flash the wrong tab on load.

---

## What This Dashboard Achieves

```
Builder opens dashboard:
  Sees their agents, their earnings, their reliability at a glance.
  Knows immediately which agent is underperforming.
  Gets notified the moment money arrives.
  Manages everything without leaving this page.

User opens dashboard:
  Sees what's running right now, front and center.
  Has a clear history of every job they've run.
  Can re-run any past job in one click.
  Saved flows are ready to activate anytime.

Both:
  Never see the word "blockchain."
  Never need to visit Arbiscan for normal operations.
  Always know exactly where their money is.
```

---

*MilkyWay Dashboard*
*One page. Two roles. Everything in one place.*