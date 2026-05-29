# MILKYWAY_UX_FIXES.md
## Two Critical UX Additions
### Earnings Dashboard + Quick Execute

Read alongside MILKYWAY_PHASE1.md and MILKYWAY_PHASE2.md.
These are additive only. No contract changes. No schema changes beyond one view.
Pure UI + one backend route each.

---

## Fix 1 — Earnings Dashboard (Developer)

### Where It Lives
`frontend/app/dashboard/page.tsx` — extend the existing Builder Dashboard.
Add an Earnings tab alongside the existing My Agents tab.

---

### What The Developer Sees

```
BUILDER DASHBOARD
  Tabs: [My Agents]  [Earnings]

EARNINGS TAB:

  SUMMARY ROW (top)
  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
  │ Total Earned │ │ Executions   │ │ Active Flows │
  │ 0.042 ETH    │ │ 38 jobs      │ │ 7 flows      │
  │ all time     │ │ all time     │ │ using my     │
  │              │ │              │ │ agents now   │
  └──────────────┘ └──────────────┘ └──────────────┘

  PER AGENT BREAKDOWN
  ┌────────────────────────────────────────────────────┐
  │ Liquidation Shield                                 │
  │ 22 executions · 0.022 ETH earned · last run: 2h ago│
  ├────────────────────────────────────────────────────┤
  │ Research Agent                                     │
  │ 16 executions · 0.020 ETH earned · last run: 5h ago│
  └────────────────────────────────────────────────────┘

  RECENT PAYMENTS (last 10)
  Date       Agent              Flow             Amount
  ────────── ────────────────── ──────────────── ──────
  2min ago   Liquidation Shield flow_0x1234...   0.001 ETH
  1hr ago    Research Agent     flow_0x5678...   0.002 ETH
  3hr ago    Research Agent     flow_0x9abc...   0.002 ETH
  ...

  Each row has: "View on Arbiscan →" link
```

---

### Backend Route

**GET /api/earnings/:address**

No new Prisma models needed. Query FlowAgent joined with Flow.

```typescript
router.get("/:address", authenticateJWT, async (req, res) => {
  const { address } = req.params;

  // Verify requester owns this address
  if (req.user.address.toLowerCase() !== address.toLowerCase()) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  // Get all agents owned by this address
  const myAgents = await prisma.agent.findMany({
    where: { ownerAddress: address, active: true },
    select: { agentId: true, name: true, ownerAddress: true }
  });

  const agentIds = myAgents.map(a => a.agentId);

  // Get all completed FlowAgent records for these agents
  const completedJobs = await prisma.flowAgent.findMany({
    where: {
      agentId: { in: agentIds },
      status: "COMPLETED"
    },
    include: {
      flow: {
        select: {
          jobId: true,
          status: true,
          escrowTxHash: true,
          completedAt: true
        }
      }
    },
    orderBy: { executedAt: "desc" }
  });

  // Aggregate per agent
  const perAgent = myAgents.map(agent => {
    const jobs = completedJobs.filter(j => j.agentId === agent.agentId);
    const totalEth = jobs.reduce(
      (sum, j) => sum + parseFloat(j.amountEth), 0
    );
    return {
      agentId: agent.agentId,
      name: agent.name,
      executions: jobs.length,
      totalEarnedEth: totalEth.toFixed(6),
      lastRunAt: jobs[0]?.executedAt || null
    };
  });

  // Total across all agents
  const totalEth = perAgent.reduce(
    (sum, a) => sum + parseFloat(a.totalEarnedEth), 0
  );

  // Active flows (RUNNING or LOCKED) using any of my agents
  const activeFlows = await prisma.flowAgent.count({
    where: {
      agentId: { in: agentIds },
      flow: { status: { in: ["LOCKED", "RUNNING"] } }
    }
  });

  // Recent payments (last 10)
  const recent = completedJobs.slice(0, 10).map(j => ({
    executedAt: j.executedAt,
    agentId: j.agentId,
    agentName: myAgents.find(a => a.agentId === j.agentId)?.name,
    flowJobId: j.flow.jobId,
    amountEth: j.amountEth,
    txHash: j.flow.escrowTxHash
  }));

  res.json({
    totalEarnedEth: totalEth.toFixed(6),
    totalExecutions: completedJobs.length,
    activeFlows,
    perAgent,
    recentPayments: recent
  });
});
```

---

### Frontend

**frontend/app/dashboard/page.tsx** — add Earnings tab

```typescript
// Fetch on tab switch
const { data: earnings } = useSWR(
  isSignedIn ? `${API}/api/earnings/${address}` : null,
  (url) => authFetch(url).then(r => r.json()),
  { refreshInterval: 30000 } // refresh every 30 seconds
);
```

No real-time needed. 30-second polling is enough.
The moment a developer sees ETH arriving without any action from them
is the moment they become a committed MilkyWay builder.

---

## Fix 2 — Quick Execute (End User)

### Where It Lives
`frontend/app/agents/[agentId]/page.tsx` — extend the existing Agent Profile page.
Add a Quick Execute panel on the right side of the profile.

---

### What The User Sees

```
AGENT PROFILE PAGE

LEFT SIDE (existing):              RIGHT SIDE (new):
  Name, description                ┌─────────────────────────┐
  Category, badge                  │ Run This Agent          │
  Builder info                     │                         │
  On-chain details                 │ Reads /about schema     │
                                   │ Auto-generates form:    │
                                   │                         │
                                   │ query *                 │
                                   │ [_____________________] │
                                   │                         │
                                   │ limit                   │
                                   │ [10___________________] │
                                   │                         │
                                   │ ─────────────────────── │
                                   │ Cost: 0.001 ETH         │
                                   │ + gas estimate          │
                                   │                         │
                                   │ [Connect Wallet]        │
                                   │ or                      │
                                   │ [Execute Now →]         │
                                   └─────────────────────────┘

AFTER EXECUTION:
                                   ┌─────────────────────────┐
                                   │ ✅ Completed             │
                                   │                         │
                                   │ Output:                 │
                                   │ { results: [...],       │
                                   │   count: 5 }            │
                                   │                         │
                                   │ Paid: 0.001 ETH         │
                                   │ Tx: 0x1234... →         │
                                   │                         │
                                   │ [Run Again]             │
                                   └─────────────────────────┘
```

---

### How The Form Is Generated

MilkyWay reads the `/about` schema and renders inputs dynamically.
No hardcoding. Works for any agent automatically.

```typescript
// frontend/components/QuickExecute.tsx

interface Props {
  agentId: number;
  endpoint: string;
  aboutSchema: MilkyWayAboutSchema;
  priceEth: string;
}

export function QuickExecute({ agentId, endpoint, aboutSchema, priceEth }: Props) {
  const [inputs, setInputs] = useState<Record<string, any>>({});
  const [status, setStatus] = useState<"idle" | "executing" | "done" | "error">("idle");
  const [result, setResult] = useState<any>(null);
  const { address, isSignedIn } = useAuth();

  // Auto-populate defaults from schema
  useEffect(() => {
    const defaults: Record<string, any> = {};
    for (const [field, def] of Object.entries(aboutSchema.input_schema)) {
      const d = def as any;
      if (d.default !== undefined) defaults[field] = d.default;
    }
    setInputs(defaults);
  }, [aboutSchema]);

  // Render correct input type per field
  function renderField(fieldName: string, fieldDef: any) {
    const value = inputs[fieldName] ?? "";
    const onChange = (v: any) => setInputs(prev => ({ ...prev, [fieldName]: v }));

    switch (fieldDef.type) {
      case "number":
        return (
          <input
            type="number"
            value={value}
            onChange={e => onChange(Number(e.target.value))}
          />
        );
      case "boolean":
        return (
          <input
            type="checkbox"
            checked={!!value}
            onChange={e => onChange(e.target.checked)}
          />
        );
      default: // string
        return (
          <input
            type="text"
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={fieldDef.description || fieldName}
          />
        );
    }
  }

  async function handleExecute() {
    if (!isSignedIn) return;
    setStatus("executing");

    try {
      // 1. Create single-agent flow
      const { jobId, internalId, agentWallets, agentAmounts, deadline, totalEth } =
        await authFetch(`${API}/api/flows/create`, {
          method: "POST",
          body: JSON.stringify({
            agents: [{
              agentId,
              orderIndex: 0,
              staticInputs: inputs,
              inputMapping: {}
            }],
            trigger: "IMMEDIATE",
            deadlineSeconds: aboutSchema.max_deadline_seconds || 30
          })
        }).then(r => r.json());

      // 2. Lock escrow on-chain
      // (wagmi writeContract call)
      // Wait for confirmation, get txHash

      // 3. Confirm flow
      await authFetch(`${API}/api/flows/confirm`, {
        method: "POST",
        body: JSON.stringify({ internalId, escrowTxHash: txHash })
      });

      // 4. Poll for completion
      const output = await pollForResult(jobId);
      setResult(output);
      setStatus("done");

    } catch (err) {
      setStatus("error");
    }
  }

  // Poll /api/flows/:jobId every 2 seconds until completed or failed
  async function pollForResult(jobId: string, maxWaitMs = 60000) {
    const start = Date.now();
    while (Date.now() - start < maxWaitMs) {
      const flow = await fetch(`${API}/api/flows/${jobId}`).then(r => r.json());
      if (flow.status === "COMPLETED") return flow.agents[0].output;
      if (flow.status === "FAILED") throw new Error("Agent failed");
      await new Promise(r => setTimeout(r, 2000));
    }
    throw new Error("Timed out waiting for result");
  }

  return (
    <div className="quick-execute-panel">
      <h3>Run This Agent</h3>

      {Object.entries(aboutSchema.input_schema).map(([field, def]) => (
        <div key={field} className="field">
          <label>
            {field}
            {(def as any).required && <span className="required">*</span>}
          </label>
          {renderField(field, def)}
          {(def as any).description && (
            <p className="hint">{(def as any).description}</p>
          )}
        </div>
      ))}

      <div className="cost">
        Cost: {priceEth} ETH
      </div>

      {status === "idle" && (
        isSignedIn
          ? <button onClick={handleExecute}>Execute Now →</button>
          : <ConnectButton />
      )}

      {status === "executing" && <p>Running...</p>}

      {status === "done" && result && (
        <div className="result">
          <p>✅ Completed</p>
          <pre>{JSON.stringify(result, null, 2)}</pre>
          <button onClick={() => setStatus("idle")}>Run Again</button>
        </div>
      )}

      {status === "error" && (
        <div>
          <p>❌ Something went wrong</p>
          <button onClick={() => setStatus("idle")}>Try Again</button>
        </div>
      )}
    </div>
  );
}
```

---

### One Backend Addition

**GET /api/agents/:agentId/about**

Fetch the cached `/about` schema for an agent.
Used by QuickExecute to generate the form without calling the agent directly.

```typescript
router.get("/:agentId/about", async (req, res) => {
  const agent = await prisma.agent.findUnique({
    where: { agentId: Number(req.params.agentId) },
    select: { aboutSchema: true, phase2Ready: true, priceEth: true }
  });

  if (!agent) return res.status(404).json({ error: "Not found" });

  if (!agent.phase2Ready || !agent.aboutSchema) {
    return res.status(404).json({ error: "Agent not Phase 2 ready" });
  }

  res.json(agent.aboutSchema);
});
```

---

## What These Two Fixes Achieve

```
Before:
  Developer registers → sees nothing happening → loses interest
  User finds agent → hits "Coming Soon" → leaves

After:
  Developer registers → first payment arrives → builds more agents
  User finds agent → fills form → gets result in 30 seconds → comes back
```

The earnings dashboard closes the developer loop.
Quick Execute closes the user loop.
Both are retention mechanisms, not just features.

---

## Build Order

```
1. Backend: GET /api/earnings/:address
2. Backend: GET /api/agents/:agentId/about
3. Frontend: Earnings tab in dashboard/page.tsx
4. Frontend: QuickExecute component
5. Frontend: Wire QuickExecute into agents/[agentId]/page.tsx
   (only renders if agent.phase2Ready === true)
```

---

*MilkyWay UX Fixes — Part of Phase 2*
*No contract changes. No migration beyond what Phase 2 already requires.*