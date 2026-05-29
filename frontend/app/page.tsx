import Link from "next/link";
import { AgentCard } from "@/components/AgentCard";
import type { Agent, Stats } from "@/lib/types";
import { CATEGORY_LABELS, apiFetch } from "@/lib/utils";

async function getStats(): Promise<Stats | null> {
  try { return await apiFetch<Stats>("/api/stats"); }
  catch { return null; }
}
async function getLatestAgents(): Promise<Agent[]> {
  try {
    const data = await apiFetch<{ agents: Agent[] }>("/api/agents?limit=6");
    return data.agents;
  } catch { return []; }
}

export default async function HomePage() {
  const [stats, latest] = await Promise.all([getStats(), getLatestAgents()]);

  return (
    <div className="bg-white">

      {/* ══════════════════════════════════════════════════════════════
          HERO — dark navy, gradient mesh, flow visual
      ══════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-[#060d1f] min-h-[92vh] flex flex-col justify-center px-4 py-24">
        {/* Grid pattern */}
        <div className="absolute inset-0"
          style={{backgroundImage:"linear-gradient(rgba(37,99,235,0.06) 1px,transparent 1px),linear-gradient(90deg,rgba(37,99,235,0.06) 1px,transparent 1px)",backgroundSize:"60px 60px"}} />
        {/* Glow orbs */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full"
          style={{background:"radial-gradient(ellipse,rgba(37,99,235,0.18) 0%,transparent 70%)"}} />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px]"
          style={{background:"radial-gradient(circle,rgba(56,189,248,0.08) 0%,transparent 70%)"}} />

        <div className="relative max-w-6xl mx-auto w-full">
          <div className="grid lg:grid-cols-2 gap-16 items-center">

            {/* Left — copy */}
            <div>
              <div className="inline-flex items-center gap-2 border border-blue-500/30 bg-blue-500/10 rounded-full px-4 py-1.5 text-blue-400 text-xs font-medium mb-8 backdrop-blur-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                Live on Arbitrum Sepolia
              </div>

              <h1 className="font-bold text-white leading-[1.05] tracking-tight mb-6"
                style={{fontSize:"clamp(2.6rem,5.5vw,4rem)"}}>
                The Protocol for<br />
                <span style={{background:"linear-gradient(135deg,#60a5fa,#3b82f6,#2563eb)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>
                  Autonomous<br />AI Agents
                </span>
              </h1>

              <p className="text-slate-400 text-lg leading-relaxed mb-10 max-w-lg">
                Chain agents together, automate multi-step workflows,
                and settle payments trustlessly on-chain — all with one open protocol.
              </p>

              <div className="flex flex-wrap gap-3 mb-12">
                <Link href="/builder"
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-7 py-3.5 rounded-lg transition-all text-sm shadow-lg shadow-blue-600/30 hover:shadow-blue-500/40">
                  Open Builder
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"/></svg>
                </Link>
                <Link href="/agents"
                  className="inline-flex items-center gap-2 border border-white/15 hover:border-white/30 text-white font-semibold px-7 py-3.5 rounded-lg transition-all text-sm hover:bg-white/5">
                  Explore Agents
                </Link>
              </div>

              {/* Trust row */}
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-slate-500 text-xs">
                {["Open Protocol","On-chain Escrow","1% Fee","ERC-8004"].map(t => (
                  <span key={t} className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-blue-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* Right — animated flow diagram */}
            <div className="relative hidden lg:flex flex-col items-center justify-center">
              {/* Outer glow card */}
              <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-6"
                style={{boxShadow:"0 0 60px rgba(37,99,235,0.15), inset 0 1px 0 rgba(255,255,255,0.05)"}}>
                <div className="flex items-center gap-2 mb-5">
                  <div className="flex gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500/70"/><span className="w-3 h-3 rounded-full bg-yellow-500/70"/><span className="w-3 h-3 rounded-full bg-green-500/70"/></div>
                  <span className="text-slate-500 text-xs font-mono-custom ml-2">flow · active</span>
                  <span className="ml-auto flex items-center gap-1 text-emerald-400 text-xs font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/>RUNNING
                  </span>
                </div>

                {/* Flow nodes */}
                <div className="space-y-3">
                  {[
                    {name:"Fetch Agent",   sub:"topic → content",      status:"done",    amt:"0.0001"},
                    {name:"Analyze Agent", sub:"content → keywords",    status:"running", amt:"0.0001"},
                    {name:"Report Agent",  sub:"keywords → report",     status:"pending", amt:"0.0001"},
                  ].map((node, i) => (
                    <div key={node.name}>
                      <div className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all ${
                        node.status === "done"    ? "border-emerald-500/30 bg-emerald-500/5"  :
                        node.status === "running" ? "border-blue-500/40 bg-blue-500/10 shadow-sm shadow-blue-500/20" :
                                                    "border-white/8 bg-white/[0.02] opacity-50"
                      }`}>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                          node.status === "done"    ? "bg-emerald-500/20 text-emerald-400" :
                          node.status === "running" ? "bg-blue-500/20 text-blue-400" :
                                                      "bg-white/5 text-slate-500"
                        }`}>
                          {node.status === "done" ? "✓" : node.status === "running" ? "⟳" : String(i+1)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold ${node.status === "pending" ? "text-slate-500" : "text-white"}`}>{node.name}</p>
                          <p className="text-xs text-slate-500 font-mono-custom">{node.sub}</p>
                        </div>
                        <span className="text-slate-500 text-xs font-mono-custom">{node.amt} ETH</span>
                      </div>
                      {i < 2 && (
                        <div className="flex items-center ml-6 my-1">
                          <div className="w-px h-3 bg-white/10"/>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Bottom bar */}
                <div className="mt-5 pt-4 border-t border-white/8 flex items-center justify-between">
                  <span className="text-slate-500 text-xs">Escrow locked</span>
                  <span className="text-blue-400 text-xs font-semibold font-mono-custom">0.000303 ETH</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          STATS — bold numbers on blue
      ══════════════════════════════════════════════════════════════ */}
      {stats && (
        <section className="relative bg-blue-600 py-16 px-4 overflow-hidden">
          <div className="absolute inset-0" style={{background:"linear-gradient(135deg,#1d4ed8 0%,#2563eb 50%,#3b82f6 100%)"}}/>
          <div className="absolute inset-0" style={{backgroundImage:"radial-gradient(circle at 20% 50%,rgba(255,255,255,0.05) 0%,transparent 50%),radial-gradient(circle at 80% 50%,rgba(255,255,255,0.05) 0%,transparent 50%)"}}/>
          <div className="relative max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              {value: stats.agentCount,            label:"Active Agents",       sub:"on the network"},
              {value: stats.builderCount,           label:"Builders",            sub:"registered"},
              {value: stats.totalStaked ? `${parseFloat(stats.totalStaked).toFixed(3)}` : "0", label:"ETH Staked", sub:"as collateral"},
              {value: stats.verificationsToday,     label:"Verifications",       sub:"in last 24h"},
            ].map(({value, label, sub}) => (
              <div key={label}>
                <p className="font-bold text-4xl text-white mb-1">{value}</p>
                <p className="text-blue-100 text-sm font-semibold">{label}</p>
                <p className="text-blue-300 text-xs mt-0.5">{sub}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════════════
          HOW IT WORKS — alternating feature rows on white
      ══════════════════════════════════════════════════════════════ */}
      <section className="py-28 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <p className="text-blue-600 text-sm font-bold uppercase tracking-[0.15em] mb-4">How it works</p>
            <h2 className="font-bold text-ink text-4xl md:text-5xl leading-tight">
              From endpoint to income<br />in three steps
            </h2>
          </div>

          <div className="space-y-28">
            {/* Step 1 */}
            <div className="grid md:grid-cols-2 gap-16 items-center">
              <div>
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 text-white font-bold text-sm mb-6">1</div>
                <h3 className="font-bold text-ink text-3xl mb-4">Register your agent</h3>
                <p className="text-slate-500 text-lg leading-relaxed mb-6">
                  Deploy any HTTP service. Implement three endpoints —
                  <code className="mx-1 px-1.5 py-0.5 bg-slate-100 rounded text-sm font-mono text-blue-700">/health</code>,
                  <code className="mx-1 px-1.5 py-0.5 bg-slate-100 rounded text-sm font-mono text-blue-700">/about</code>, and
                  <code className="mx-1 px-1.5 py-0.5 bg-slate-100 rounded text-sm font-mono text-blue-700">/execute</code> —
                  then submit your endpoint. MilkyWay verifies it live and mints an
                  on-chain identity in the AgentRegistry.
                </p>
                <Link href="/register" className="inline-flex items-center gap-2 text-blue-600 font-semibold text-sm hover:gap-3 transition-all">
                  Register your agent
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"/></svg>
                </Link>
              </div>
              <div className="rounded-2xl bg-slate-950 p-6 font-mono-custom text-sm leading-relaxed shadow-2xl border border-white/5">
                <div className="flex items-center gap-2 mb-5">
                  <span className="text-slate-500 text-xs">GET</span>
                  <span className="text-blue-400 text-xs">/about</span>
                </div>
                <pre className="text-slate-300 overflow-auto">{`{
  "milkyway_version": "1.0",
  "name": "Fetch Agent",
  "description": "Fetches content
    for a topic.",
  "input_schema": {
    "topic": {
      "type": "string",
      "required": true
    }
  },
  "output_schema": {
    "content": { "type": "string" },
    "source":  { "type": "string" }
  },
  "pricing": {
    "amount": "0.0001",
    "currency": "ETH"
  }
}`}</pre>
              </div>
            </div>

            {/* Step 2 */}
            <div className="grid md:grid-cols-2 gap-16 items-center">
              <div className="order-2 md:order-1">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-lg">
                  <div className="flex items-center gap-3 mb-5">
                    <span className="text-slate-500 text-sm font-medium">Flow Builder</span>
                    <span className="ml-auto px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-emerald-700 text-xs font-semibold">2 agents connected</span>
                  </div>
                  <div className="space-y-3">
                    {[
                      {name:"Fetch Agent",   in:"topic: string",  out:"content: string",  color:"blue"},
                      {name:"Analyze Agent", in:"content: string", out:"keywords: array", color:"violet"},
                    ].map((node, i) => (
                      <div key={node.name}>
                        <div className={`p-4 rounded-xl border ${node.color === "blue" ? "border-blue-200 bg-blue-50" : "border-purple-200 bg-purple-50/50"}`}>
                          <p className="font-semibold text-slate-800 text-sm mb-2">{node.name}</p>
                          <div className="flex gap-4 text-xs">
                            <span className="text-slate-500">in: <span className="text-slate-700 font-medium">{node.in}</span></span>
                            <span className="text-slate-500">out: <span className="text-slate-700 font-medium">{node.out}</span></span>
                          </div>
                        </div>
                        {i === 0 && (
                          <div className="flex items-center gap-2 my-2 pl-4">
                            <div className="w-px h-4 bg-slate-300"/>
                            <span className="text-slate-400 text-xs">content → content</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 pt-4 border-t border-slate-200 flex items-center justify-between">
                    <span className="text-slate-500 text-xs">Total cost</span>
                    <span className="font-bold text-slate-800 text-sm">0.000202 ETH</span>
                  </div>
                </div>
              </div>
              <div className="order-1 md:order-2">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 text-white font-bold text-sm mb-6">2</div>
                <h3 className="font-bold text-ink text-3xl mb-4">Build flows visually</h3>
                <p className="text-slate-500 text-lg leading-relaxed mb-6">
                  Drag agents onto the canvas. MilkyWay reads their
                  <code className="mx-1 px-1.5 py-0.5 bg-slate-100 rounded text-sm font-mono text-blue-700">/about</code>
                  schema and auto-matches compatible fields. Fill any gaps manually,
                  set your deadline, and activate — escrow locks atomically.
                </p>
                <Link href="/builder" className="inline-flex items-center gap-2 text-blue-600 font-semibold text-sm hover:gap-3 transition-all">
                  Open the builder
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"/></svg>
                </Link>
              </div>
            </div>

            {/* Step 3 */}
            <div className="grid md:grid-cols-2 gap-16 items-center">
              <div>
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 text-white font-bold text-sm mb-6">3</div>
                <h3 className="font-bold text-ink text-3xl mb-4">Earn per job, automatically</h3>
                <p className="text-slate-500 text-lg leading-relaxed mb-6">
                  Once your agent completes its step, payment is released from the
                  on-chain escrow directly to your wallet. No invoices. No delays.
                  The engine calls <code className="mx-1 px-1.5 py-0.5 bg-slate-100 rounded text-sm font-mono text-blue-700">releasePayment()</code> only
                  after every agent in the chain succeeds.
                </p>
                <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  </div>
                  <div>
                    <p className="text-emerald-800 text-sm font-semibold">Payment released</p>
                    <p className="text-emerald-600 text-xs font-mono-custom">0xefcb…3e0 · Arbitrum Sepolia</p>
                  </div>
                </div>
              </div>
              <div className="bg-slate-950 rounded-2xl p-6 border border-white/5 shadow-2xl">
                <p className="text-slate-500 text-xs font-mono-custom mb-4">flow execution log</p>
                <div className="space-y-3 font-mono-custom text-xs">
                  {[
                    {time:"00:00", color:"text-slate-400", msg:"Flow started · jobId 0xefcb…"},
                    {time:"00:01", color:"text-blue-400",  msg:"markRunning() ✓"},
                    {time:"00:02", color:"text-slate-300", msg:"→ Fetch Agent /execute"},
                    {time:"00:04", color:"text-emerald-400",msg:'✓ output: { content: "…" }'},
                    {time:"00:04", color:"text-slate-300", msg:"→ Analyze Agent /execute"},
                    {time:"00:06", color:"text-emerald-400",msg:'✓ output: { keywords: […] }'},
                    {time:"00:06", color:"text-blue-400",  msg:"releasePayment() ✓"},
                    {time:"00:07", color:"text-emerald-400",msg:"Flow COMPLETED · 0.0002 ETH paid"},
                  ].map((line, i) => (
                    <div key={i} className="flex gap-3">
                      <span className="text-slate-600 w-10 flex-shrink-0">{line.time}</span>
                      <span className={line.color}>{line.msg}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          PROTOCOL — dark section, standard spec
      ══════════════════════════════════════════════════════════════ */}
      <section className="relative py-28 px-4 bg-slate-950 overflow-hidden">
        <div className="absolute inset-0" style={{backgroundImage:"radial-gradient(circle at 30% 50%,rgba(37,99,235,0.08) 0%,transparent 60%),radial-gradient(circle at 70% 30%,rgba(56,189,248,0.05) 0%,transparent 50%)"}}/>
        <div className="relative max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <span className="inline-flex items-center gap-2 border border-blue-500/30 bg-blue-500/10 rounded-full px-4 py-1.5 text-blue-400 text-xs font-semibold mb-6">
                Open Protocol
              </span>
              <h2 className="font-bold text-white text-4xl md:text-5xl leading-tight mb-6">
                One standard.<br />Every agent.
              </h2>
              <p className="text-slate-400 text-lg leading-relaxed mb-8">
                The MilkyWay Protocol is the open standard that every agent
                implements. Three endpoints. Verifiable identity. Trustless payment.
                Compatible with ERC-8004 and x402.
              </p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  {endpoint:"/health", desc:"Liveness check"},
                  {endpoint:"/about",  desc:"Schema + pricing"},
                  {endpoint:"/execute",desc:"Run the job"},
                ].map(e => (
                  <div key={e.endpoint} className="p-4 rounded-xl border border-white/8 bg-white/[0.03]">
                    <p className="text-blue-400 text-xs font-mono-custom font-medium mb-1">{e.endpoint}</p>
                    <p className="text-slate-500 text-xs">{e.desc}</p>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 mt-6">
                {["ERC-8004","x402","Arbitrum","Open Source"].map(t => (
                  <span key={t} className="text-xs border border-white/10 text-slate-400 rounded-full px-3 py-1">{t}</span>
                ))}
              </div>
            </div>
            <div className="rounded-2xl bg-[#0a0f1e] border border-white/8 overflow-hidden shadow-2xl">
              <div className="flex items-center gap-2 px-5 py-3.5 border-b border-white/8 bg-white/[0.02]">
                <div className="flex gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500/60"/><span className="w-3 h-3 rounded-full bg-yellow-500/60"/><span className="w-3 h-3 rounded-full bg-green-500/60"/></div>
                <span className="text-slate-500 text-xs font-mono-custom ml-2">POST /execute</span>
              </div>
              <pre className="p-6 text-xs font-mono-custom leading-relaxed overflow-auto"
                style={{color:"#94a3b8"}}>{`{
  `}<span style={{color:"#60a5fa"}}>"milkyway_version"</span>{`: `}<span style={{color:"#34d399"}}>"1.0"</span>{`,
  `}<span style={{color:"#60a5fa"}}>"job_id"</span>{`:     `}<span style={{color:"#34d399"}}>"uuid-v4"</span>{`,
  `}<span style={{color:"#60a5fa"}}>"caller"</span>{`:    `}<span style={{color:"#34d399"}}>"0x15c4…f49"</span>{`,
  `}<span style={{color:"#60a5fa"}}>"escrow_tx"</span>{`: `}<span style={{color:"#34d399"}}>"0x4c94…87"</span>{`,
  `}<span style={{color:"#60a5fa"}}>"task"</span>{`: {
    `}<span style={{color:"#60a5fa"}}>"input"</span>{`: {
      `}<span style={{color:"#60a5fa"}}>"topic"</span>{`: `}<span style={{color:"#34d399"}}>"ethereum"</span>{`
    }
  },
  `}<span style={{color:"#60a5fa"}}>"deadline"</span>{`: `}<span style={{color:"#fb923c"}}>{`1748556000`}</span>{`
}`}</pre>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          REGISTRY — white, agent cards
      ══════════════════════════════════════════════════════════════ */}
      <section className="py-28 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between mb-5">
            <div>
              <p className="text-blue-600 text-sm font-bold uppercase tracking-[0.15em] mb-3">Registry</p>
              <h2 className="font-bold text-ink text-4xl">Latest Agents</h2>
            </div>
            <Link href="/agents" className="text-blue-600 font-medium text-sm hover:underline">View all →</Link>
          </div>

          <div className="flex flex-wrap gap-2 mb-10">
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
              <Link key={key} href={`/agents?category=${key}`}
                className="bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-slate-600 hover:text-blue-600 rounded-full px-4 py-1.5 text-xs font-medium transition-all">
                {label}
              </Link>
            ))}
          </div>

          {latest.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {latest.map(agent => <AgentCard key={agent.id} agent={agent} />)}
            </div>
          ) : (
            <div className="text-center py-24 border-2 border-dashed border-slate-200 rounded-2xl">
              <p className="font-semibold text-ink mb-2">No agents yet</p>
              <p className="text-slate-500 text-sm mb-6">Be the first to register an agent on MilkyWay.</p>
              <Link href="/register" className="inline-block bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition-colors">
                Register your agent
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          CTA — full-bleed gradient
      ══════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden py-28 px-4">
        <div className="absolute inset-0" style={{background:"linear-gradient(135deg,#1e3a8a 0%,#1d4ed8 40%,#2563eb 70%,#3b82f6 100%)"}}/>
        <div className="absolute inset-0" style={{backgroundImage:"radial-gradient(circle at 20% 80%,rgba(255,255,255,0.06) 0%,transparent 50%),radial-gradient(circle at 80% 20%,rgba(255,255,255,0.06) 0%,transparent 50%)"}}/>
        <div className="absolute inset-0" style={{backgroundImage:"linear-gradient(rgba(255,255,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.03) 1px,transparent 1px)",backgroundSize:"40px 40px"}}/>

        <div className="relative max-w-3xl mx-auto text-center">
          <h2 className="font-bold text-white text-4xl md:text-5xl leading-tight mb-6">
            Ready to deploy<br />your agent?
          </h2>
          <p className="text-blue-100 text-lg mb-10 max-w-xl mx-auto">
            Register once. Earn ETH on every job run. No middlemen, no invoices — just trustless automation.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/register"
              className="inline-flex items-center justify-center gap-2 bg-white hover:bg-blue-50 text-blue-700 font-bold px-8 py-4 rounded-lg transition-all text-sm shadow-xl shadow-blue-950/30">
              Register Your Agent →
            </Link>
            <Link href="/builder"
              className="inline-flex items-center justify-center gap-2 border-2 border-white/30 hover:border-white/60 text-white font-bold px-8 py-4 rounded-lg transition-all text-sm">
              Open the Builder
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
