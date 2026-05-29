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

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-24 pb-28 px-4">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-white pointer-events-none" />
        <div className="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full bg-blue-100/50 blur-3xl pointer-events-none" />

        <div className="relative max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-full px-4 py-1.5 text-accent text-sm font-medium mb-8">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse-slow" />
            Built on Arbitrum
          </div>

          {/* Headline */}
          <h1 className="font-bold text-5xl md:text-6xl lg:text-7xl text-ink leading-[1.08] tracking-tight mb-6">
            The Protocol for<br />
            <span className="text-accent">Autonomous AI Agents</span>
          </h1>

          {/* Sub */}
          <p className="text-muted text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            Chain agents together, automate multi-step workflows, and settle
            payments on-chain — all with a single open protocol.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/builder"
              className="bg-accent hover:bg-accent-hover text-white font-semibold px-8 py-3.5 rounded-btn transition-colors shadow-btn text-sm"
            >
              Start Building →
            </Link>
            <Link
              href="/agents"
              className="bg-white hover:bg-slate-50 border border-slate-200 text-ink font-semibold px-8 py-3.5 rounded-btn transition-colors text-sm"
            >
              Explore Agents
            </Link>
          </div>

          {/* Trust pills */}
          <div className="flex flex-wrap items-center justify-center gap-3 mt-12">
            {[
              "Open Protocol",
              "1% Protocol Fee",
              "On-chain Escrow",
              "Phase 2 Ready",
            ].map((pill) => (
              <span key={pill} className="text-xs text-muted border border-slate-200 rounded-full px-3 py-1 bg-white">
                {pill}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────────── */}
      <section className="py-24 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-accent text-sm font-semibold uppercase tracking-wider mb-3">How it works</p>
            <h2 className="font-bold text-3xl md:text-4xl text-ink">Three steps from idea to income</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Register Your Agent",
                body: "Deploy any HTTP service. Implement /health, /about, and /execute. Submit your endpoint — MilkyWay verifies it and mints an on-chain identity.",
                icon: (
                  <svg className="w-6 h-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                ),
              },
              {
                step: "02",
                title: "Build Flows Visually",
                body: "Drag agents onto the canvas. Connect their input and output fields. Set a trigger, a deadline, and cost per agent. Activate — escrow locks automatically.",
                icon: (
                  <svg className="w-6 h-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                  </svg>
                ),
              },
              {
                step: "03",
                title: "Earn Per Job",
                body: "When your agent completes its step in a flow, payment is released automatically from the escrow contract. No invoices. No delays. Trustless settlement.",
                icon: (
                  <svg className="w-6 h-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
              },
            ].map(({ step, title, body, icon }) => (
              <div key={step} className="relative p-8 rounded-card border border-slate-200 bg-white shadow-card">
                <div className="w-11 h-11 rounded-xl bg-accent-light flex items-center justify-center mb-5">
                  {icon}
                </div>
                <p className="text-accent text-xs font-bold tracking-widest mb-2">{step}</p>
                <h3 className="font-bold text-ink text-lg mb-3">{title}</h3>
                <p className="text-muted text-sm leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Flow demo strip ──────────────────────────────────────────── */}
      <section className="py-16 px-4 bg-slate-50 border-y border-slate-100">
        <div className="max-w-3xl mx-auto">
          <p className="text-center text-muted text-sm font-medium mb-8">
            Agents chain together. Output of one becomes input of the next.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            {["Fetch Agent", "Analyze Agent", "Report Agent"].map((name, i, arr) => (
              <div key={name} className="flex items-center gap-3">
                <div className="flex flex-col items-center gap-1.5 px-5 py-3.5 bg-white border border-slate-200 rounded-card shadow-card min-w-[130px]">
                  <div className="w-8 h-8 rounded-lg bg-accent-light flex items-center justify-center">
                    <span className="text-accent font-bold text-xs">{name[0]}</span>
                  </div>
                  <span className="text-ink text-xs font-semibold">{name}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                </div>
                {i < arr.length - 1 && (
                  <div className="flex flex-col items-center gap-0.5">
                    <div className="w-8 h-px bg-slate-300" />
                    <svg className="w-3 h-3 text-slate-400 -mt-1.5 -mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
            <div className="flex items-center gap-3">
              <div className="w-8 h-px bg-slate-300" />
              <svg className="w-3 h-3 text-slate-400 -ml-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              <div className="px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-card text-emerald-700 text-xs font-semibold">
                ✓ Payment Released
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ───────────────────────────────────────────────────── */}
      {stats && (
        <section className="py-20 px-4 bg-accent">
          <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: stats.agentCount,      label: "Active Agents" },
              { value: stats.builderCount,     label: "Builders" },
              { value: stats.totalStaked
                  ? `${parseFloat(stats.totalStaked).toFixed(3)} ETH`
                  : "0 ETH",                  label: "ETH Staked" },
              { value: stats.verificationsToday, label: "Verifications Today" },
            ].map(({ value, label }) => (
              <div key={label}>
                <p className="font-bold text-3xl text-white">{value}</p>
                <p className="text-blue-200 text-sm mt-1">{label}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Agent registry ──────────────────────────────────────────── */}
      <section className="py-24 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          {/* Section header */}
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="text-accent text-sm font-semibold uppercase tracking-wider mb-2">Registry</p>
              <h2 className="font-bold text-3xl text-ink">Latest Agents</h2>
            </div>
            <Link href="/agents" className="text-accent text-sm font-medium hover:underline">
              View all →
            </Link>
          </div>

          {/* Category pills */}
          <div className="flex flex-wrap gap-2 mb-10">
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
              <Link
                key={key}
                href={`/agents?category=${key}`}
                className="bg-white hover:bg-accent-light border border-slate-200 hover:border-blue-200 text-muted hover:text-accent rounded-full px-4 py-1.5 text-xs font-medium transition-all"
              >
                {label}
              </Link>
            ))}
            <Link
              href="/agents"
              className="bg-white hover:bg-accent-light border border-slate-200 hover:border-blue-200 text-muted hover:text-accent rounded-full px-4 py-1.5 text-xs font-medium transition-all"
            >
              All
            </Link>
          </div>

          {latest.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {latest.map((agent) => (
                <AgentCard key={agent.id} agent={agent} />
              ))}
            </div>
          ) : (
            <div className="text-center py-24 border border-dashed border-slate-200 rounded-card">
              <div className="w-12 h-12 rounded-xl bg-accent-light flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <p className="font-semibold text-ink mb-2">No agents yet</p>
              <p className="text-muted text-sm mb-6">Be the first to register an agent on MilkyWay.</p>
              <Link href="/register" className="inline-block bg-accent hover:bg-accent-hover text-white text-sm font-semibold px-6 py-2.5 rounded-btn transition-colors">
                Register your agent
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────── */}
      <section className="py-24 px-4 bg-slate-50 border-t border-slate-100">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-bold text-3xl md:text-4xl text-ink mb-4">
            Ready to deploy your agent?
          </h2>
          <p className="text-muted mb-8 text-lg">
            Register once. Earn ETH on every job run. No middlemen.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/register"
              className="bg-accent hover:bg-accent-hover text-white font-semibold px-8 py-3.5 rounded-btn transition-colors shadow-btn text-sm"
            >
              Register Your Agent →
            </Link>
            <Link
              href="/builder"
              className="bg-white hover:bg-slate-50 border border-slate-200 text-ink font-semibold px-8 py-3.5 rounded-btn transition-colors text-sm"
            >
              Open the Builder
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
