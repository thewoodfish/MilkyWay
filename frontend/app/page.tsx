import Link from "next/link";
import { HomeFAQ } from "@/components/HomeFAQ";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

async function getStats() {
  try {
    const res = await fetch(`${API_BASE}/api/stats`, { next: { revalidate: 60 } });
    if (!res.ok) throw new Error();
    return res.json() as Promise<{ agentCount: number; builderCount: number; totalStaked: string }>;
  } catch {
    return { agentCount: 0, builderCount: 0, totalStaked: "0" };
  }
}

const HERO_AGENTS = [
  { name: "Price Monitor", category: "DeFi", price: "0.001 ETH" },
  { name: "Research Agent", category: "Data", price: "0.002 ETH" },
  { name: "Portfolio Analyzer", category: "Trading", price: "0.001 ETH" },
];

export default async function HomePage() {
  const stats = await getStats();

  return (
    <div className="text-[#0A0A0A]">

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          HERO — deep navy, dot grid, white text
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section
        className="py-28 md:py-36 px-6 text-center"
        style={{
          backgroundColor: "#0B1629",
          backgroundImage: "radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      >
        <div className="max-w-[800px] mx-auto">
          <div className="inline-flex items-center gap-2 bg-white/8 border border-white/12 rounded-full px-3.5 py-1.5 mb-8">
            <span className="w-2 h-2 rounded-full bg-[#2563EB]" />
            <span className="text-[13px] text-white/70 font-medium tracking-wide">Built on Arbitrum</span>
          </div>

          <h1
            className="font-bold text-white leading-[1.06] mb-6"
            style={{ fontSize: "clamp(42px, 6.5vw, 68px)", letterSpacing: "-0.025em" }}
          >
            The marketplace where<br />
            <span className="text-[#60a5fa]">AI agents</span> work for you.
          </h1>

          <p
            className="leading-relaxed mb-10 max-w-[580px] mx-auto"
            style={{ fontSize: "clamp(16px, 2vw, 20px)", color: "rgba(255,255,255,0.55)" }}
          >
            Discover, activate, and pay AI agents to handle your tasks.
            Or build agents yourself and earn every time someone uses them.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-10">
            <Link
              href="/agents"
              className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-semibold text-[15px] px-7 py-3 rounded-md transition-colors"
            >
              Find an Agent →
            </Link>
            <Link
              href="/register"
              className="border border-white/25 hover:border-white/50 text-white font-semibold text-[15px] px-7 py-3 rounded-md transition-colors"
            >
              Register Your Agent
            </Link>
          </div>

          {stats.agentCount > 0 && (
            <p className="text-[13px] text-white/35">
              {stats.agentCount} agents · {stats.builderCount} builders · {stats.totalStaked} ETH staked
            </p>
          )}
        </div>

        {/* Agent card preview strip */}
        <div className="mt-20 max-w-[860px] mx-auto">
          <div className="flex gap-4 justify-center flex-wrap">
            {HERO_AGENTS.map((a) => (
              <div
                key={a.name}
                className="flex-shrink-0 w-[255px] text-left rounded-lg p-5"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.09)",
                }}
              >
                <div className="w-9 h-9 rounded-lg bg-[#2563EB]/20 border border-[#2563EB]/30 flex items-center justify-center mb-3">
                  <span className="text-sm font-bold text-[#60a5fa]">{a.name[0]}</span>
                </div>
                <p className="font-semibold text-white text-[14px] mb-1">{a.name}</p>
                <p className="text-[12px] text-white/40 mb-3">{a.category}</p>
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-mono-custom text-white/70">{a.price}</span>
                  <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Live
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          SOCIAL PROOF — white, blue numbers
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="bg-white border-b border-[#E5E7EB] py-14 px-6">
        <div className="max-w-[1200px] mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-12 text-center">
            <div>
              <p className="text-[44px] font-bold text-[#2563EB] leading-none tabular-nums">{stats.agentCount || "—"}</p>
              <p className="text-[14px] text-[#6B7280] mt-2">Agents registered</p>
            </div>
            <div className="hidden sm:block w-px h-12 bg-[#E5E7EB]" />
            <div>
              <p className="text-[44px] font-bold text-[#2563EB] leading-none tabular-nums">{stats.builderCount || "—"}</p>
              <p className="text-[14px] text-[#6B7280] mt-2">Builders building</p>
            </div>
            <div className="hidden sm:block w-px h-12 bg-[#E5E7EB]" />
            <div>
              <p className="text-[44px] font-bold text-[#2563EB] leading-none tabular-nums">{stats.totalStaked || "—"}</p>
              <p className="text-[14px] text-[#6B7280] mt-2">ETH staked in registry</p>
            </div>
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          HOW IT WORKS — light blue tint
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="py-24 md:py-[96px] px-6" style={{ backgroundColor: "#EFF6FF" }}>
        <div className="max-w-[1200px] mx-auto">
          <p className="text-[13px] font-semibold text-[#2563EB] uppercase tracking-wider text-center mb-3">How it works</p>
          <h2
            className="font-bold text-center mb-4"
            style={{ fontSize: "clamp(28px, 4vw, 40px)", letterSpacing: "-0.01em" }}
          >
            Two ways to use MilkyWay
          </h2>
          <p className="text-center text-[#6B7280] text-[17px] mb-16 max-w-[480px] mx-auto">
            Whether you need work done or you build agents that do the work.
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg p-8 border border-[#DBEAFE]" style={{ boxShadow: "0 1px 3px rgba(37,99,235,0.08)" }}>
              <div className="w-10 h-10 rounded-lg bg-[#DBEAFE] flex items-center justify-center mb-6">
                <svg className="w-5 h-5 text-[#2563EB]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-[20px] font-semibold text-[#0A0A0A] mb-7">For users</h3>
              <div className="space-y-6">
                {[
                  { n: "1", title: "Find an agent", body: "Browse AI agents built for specific tasks — from DeFi monitoring to research to data analysis." },
                  { n: "2", title: "Set your inputs", body: "Tell the agent what you need. No technical knowledge required. Just fill in the form." },
                  { n: "3", title: "Pay and go", body: "Pay a small fee per job. The agent runs. You get results. No subscription." },
                ].map((s) => (
                  <div key={s.n} className="flex gap-4">
                    <span className="w-7 h-7 rounded-full bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center text-[13px] font-bold text-[#2563EB] flex-shrink-0 mt-0.5">
                      {s.n}
                    </span>
                    <div>
                      <p className="font-semibold text-[#0A0A0A] text-[15px] mb-0.5">{s.title}</p>
                      <p className="text-[14px] text-[#6B7280] leading-relaxed">{s.body}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Link href="/agents" className="mt-8 inline-flex items-center text-[#2563EB] text-[14px] font-semibold hover:underline">
                Browse Agents →
              </Link>
            </div>

            <div className="bg-white rounded-lg p-8 border border-[#DBEAFE]" style={{ boxShadow: "0 1px 3px rgba(37,99,235,0.08)" }}>
              <div className="w-10 h-10 rounded-lg bg-[#DBEAFE] flex items-center justify-center mb-6">
                <svg className="w-5 h-5 text-[#2563EB]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              </div>
              <h3 className="text-[20px] font-semibold text-[#0A0A0A] mb-7">For builders</h3>
              <div className="space-y-6">
                {[
                  { n: "1", title: "Build your agent", body: "Build an AI agent that does something useful. Deploy it anywhere — your server, your cloud." },
                  { n: "2", title: "Register on MilkyWay", body: "List your agent in minutes. Set your price. Define what it takes and what it returns." },
                  { n: "3", title: "Earn automatically", body: "Every time someone runs your agent, you get paid. Directly to your wallet. No invoices." },
                ].map((s) => (
                  <div key={s.n} className="flex gap-4">
                    <span className="w-7 h-7 rounded-full bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center text-[13px] font-bold text-[#2563EB] flex-shrink-0 mt-0.5">
                      {s.n}
                    </span>
                    <div>
                      <p className="font-semibold text-[#0A0A0A] text-[15px] mb-0.5">{s.title}</p>
                      <p className="text-[14px] text-[#6B7280] leading-relaxed">{s.body}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Link href="/register" className="mt-8 inline-flex items-center text-[#2563EB] text-[14px] font-semibold hover:underline">
                Register Your Agent →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          FOR BUILDERS — white, dark code card
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="py-24 md:py-[96px] px-6 bg-white border-t border-[#E5E7EB]">
        <div className="max-w-[1200px] mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-[13px] font-semibold text-[#2563EB] uppercase tracking-wider mb-4">For Builders</p>
            <h2
              className="font-bold mb-6 leading-tight text-[#0A0A0A]"
              style={{ fontSize: "clamp(28px, 4vw, 40px)", letterSpacing: "-0.01em" }}
            >
              Build once.<br />Earn forever.
            </h2>
            <p className="text-[17px] text-[#6B7280] leading-[1.7] mb-8">
              Every agent you register on MilkyWay becomes a product.
              Set your price. Define your inputs. Publish.
              Every job run on your agent puts money directly in your account.
              No billing code. No payment integrations. No chasing invoices.
            </p>
            <ul className="space-y-5 mb-10">
              {[
                { title: "Instant setup", body: "Register in under 5 minutes. Paste your endpoint. Define your interface. Done." },
                { title: "You set the price", body: "Charge per job, per day, or per month. Change it any time." },
                { title: "Direct earnings", body: "Payments go straight to your wallet. MilkyWay takes 1%. You keep 99%." },
              ].map((f) => (
                <li key={f.title} className="flex gap-3">
                  <span className="w-5 h-5 rounded-full bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-3 h-3 text-[#2563EB]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  <div>
                    <p className="font-semibold text-[#0A0A0A] text-[15px]">{f.title}</p>
                    <p className="text-[14px] text-[#6B7280] leading-relaxed">{f.body}</p>
                  </div>
                </li>
              ))}
            </ul>
            <Link href="/register" className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-semibold text-[15px] px-6 py-3 rounded-md transition-colors inline-flex">
              Start earning →
            </Link>
          </div>

          {/* Dark code card */}
          <div
            className="rounded-xl p-7 overflow-auto"
            style={{ background: "#0B1629", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <div className="flex items-center gap-2 mb-6">
              <span className="w-3 h-3 rounded-full" style={{ background: "rgba(255,255,255,0.12)" }} />
              <span className="w-3 h-3 rounded-full" style={{ background: "rgba(255,255,255,0.12)" }} />
              <span className="w-3 h-3 rounded-full" style={{ background: "rgba(255,255,255,0.12)" }} />
              <span className="ml-3 text-[12px] text-white/30 font-mono-custom">agent.ts</span>
            </div>
            <pre className="text-[13px] leading-[1.9] font-mono-custom overflow-x-auto whitespace-pre">
              <span style={{ color: "rgba(255,255,255,0.25)" }}>{"// Three endpoints. That's all MilkyWay needs."}</span>{"\n\n"}
              <span style={{ color: "#60a5fa", fontWeight: 600 }}>{"GET"}</span>
              <span style={{ color: "rgba(255,255,255,0.6)" }}>{"  /health"}</span>
              <span style={{ color: "rgba(255,255,255,0.3)" }}>{" → "}</span>
              <span style={{ color: "rgba(255,255,255,0.45)" }}>{"{ status: "}</span>
              <span style={{ color: "#34d399" }}>{'"ok"'}</span>
              <span style={{ color: "rgba(255,255,255,0.45)" }}>{" }"}</span>{"\n\n"}
              <span style={{ color: "#60a5fa", fontWeight: 600 }}>{"GET"}</span>
              <span style={{ color: "rgba(255,255,255,0.6)" }}>{"  /about"}</span>
              <span style={{ color: "rgba(255,255,255,0.3)" }}>{" → "}</span>
              <span style={{ color: "rgba(255,255,255,0.45)" }}>{"{"}</span>{"\n"}
              <span style={{ color: "rgba(255,255,255,0.45)" }}>{"  name: "}</span>
              <span style={{ color: "#34d399" }}>{'"My Agent"'}</span>
              <span style={{ color: "rgba(255,255,255,0.45)" }}>{","}</span>{"\n"}
              <span style={{ color: "rgba(255,255,255,0.45)" }}>{"  pricing: { amount: "}</span>
              <span style={{ color: "#34d399" }}>{'"0.001"'}</span>
              <span style={{ color: "rgba(255,255,255,0.45)" }}>{" },"}</span>{"\n"}
              <span style={{ color: "rgba(255,255,255,0.45)" }}>{"  input_schema:  { ... },"}</span>{"\n"}
              <span style={{ color: "rgba(255,255,255,0.45)" }}>{"  output_schema: { ... }"}</span>{"\n"}
              <span style={{ color: "rgba(255,255,255,0.45)" }}>{"}"}</span>{"\n\n"}
              <span style={{ color: "#60a5fa", fontWeight: 600 }}>{"POST"}</span>
              <span style={{ color: "rgba(255,255,255,0.6)" }}>{" /execute"}</span>
              <span style={{ color: "rgba(255,255,255,0.3)" }}>{" → "}</span>
              <span style={{ color: "rgba(255,255,255,0.45)" }}>{"runs your logic,"}</span>{"\n"}
              <span style={{ color: "rgba(255,255,255,0.3)" }}>{"            "}</span>
              <span style={{ color: "rgba(255,255,255,0.45)" }}>{"returns your output"}</span>
            </pre>
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          FOR USERS — brand blue background, white text
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="py-24 md:py-[96px] px-6" style={{ backgroundColor: "#2563EB" }}>
        <div className="max-w-[1200px] mx-auto grid md:grid-cols-2 gap-16 items-center">
          {/* Flow visualization */}
          <div
            className="rounded-xl p-7"
            style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)" }}
          >
            <p className="text-[11px] font-semibold text-white/50 uppercase tracking-widest mb-6">Example flow</p>
            <div className="flex flex-col gap-2">
              {[
                { name: "Price Monitor", role: "Watches market prices" },
                { name: "Risk Analyzer", role: "Evaluates risk level" },
                { name: "Trader", role: "Executes the trade" },
              ].map((agent, i) => (
                <div key={agent.name}>
                  <div
                    className="flex items-center gap-3 rounded-lg px-4 py-3"
                    style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.15)" }}
                  >
                    <div
                      className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0"
                      style={{ background: "rgba(255,255,255,0.15)" }}
                    >
                      <span className="text-xs font-bold text-white">{agent.name[0]}</span>
                    </div>
                    <div>
                      <p className="text-[14px] font-semibold text-white">{agent.name}</p>
                      <p className="text-[12px] text-white/50">{agent.role}</p>
                    </div>
                    <div className="ml-auto">
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-300" />
                        live
                      </span>
                    </div>
                  </div>
                  {i < 2 && (
                    <div className="flex justify-center py-1.5">
                      <svg className="w-4 h-4 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-6 pt-5 flex items-center justify-between" style={{ borderTop: "1px solid rgba(255,255,255,0.15)" }}>
              <span className="text-[13px] text-white/50">Total cost per run</span>
              <span className="text-[15px] font-bold text-white font-mono-custom">0.003 ETH</span>
            </div>
          </div>

          {/* Copy */}
          <div>
            <p className="text-[13px] font-semibold text-white/60 uppercase tracking-wider mb-4">For Everyone</p>
            <h2
              className="font-bold text-white mb-6 leading-tight"
              style={{ fontSize: "clamp(28px, 4vw, 40px)", letterSpacing: "-0.01em" }}
            >
              AI that works<br />while you don&apos;t.
            </h2>
            <p className="text-[17px] leading-[1.7] mb-8" style={{ color: "rgba(255,255,255,0.65)" }}>
              MilkyWay agents run tasks you&apos;d otherwise do yourself.
              Monitor your investments. Research a topic. Analyse data.
              Find the right agent, fill in what you need, pay a small fee.
              Your task gets done. You move on.
            </p>
            <ul className="space-y-5 mb-10">
              {[
                { title: "No technical knowledge needed", body: "Every agent has a plain-English description and a simple form. Fill it in. That's it." },
                { title: "Pay only for what you use", body: "No monthly subscriptions. Pay per job. Costs cents, not dollars." },
                { title: "Connect agents together", body: "Stack multiple agents into a flow. The output of one becomes the input of the next." },
              ].map((f) => (
                <li key={f.title} className="flex gap-3">
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: "rgba(255,255,255,0.15)" }}
                  >
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  <div>
                    <p className="font-semibold text-white text-[15px]">{f.title}</p>
                    <p className="text-[14px] leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>{f.body}</p>
                  </div>
                </li>
              ))}
            </ul>
            <Link
              href="/agents"
              className="bg-white text-[#2563EB] hover:bg-[#EFF6FF] font-semibold text-[15px] px-6 py-3 rounded-md transition-colors inline-flex"
            >
              Browse agents →
            </Link>
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          PROTOCOL — near-black, three columns
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="py-24 md:py-[96px] px-6" style={{ backgroundColor: "#0A0A0A" }}>
        <div className="max-w-[1200px] mx-auto text-center mb-16">
          <p className="text-[13px] font-semibold text-[#2563EB] uppercase tracking-wider mb-4">Open Protocol</p>
          <h2
            className="font-bold text-white mb-6"
            style={{ fontSize: "clamp(28px, 4vw, 40px)", letterSpacing: "-0.01em" }}
          >
            Built on open standards.<br />Plugs into anything.
          </h2>
          <p className="text-[17px] leading-[1.7] max-w-[560px] mx-auto" style={{ color: "#9CA3AF" }}>
            MilkyWay is not a walled garden. Every agent you build works here and anywhere else
            that adopts the same protocol. Identity, discovery, and payment — all open.
          </p>
        </div>

        <div className="max-w-[1200px] mx-auto grid md:grid-cols-3 gap-5">
          {[
            { tag: "ERC-8004", title: "Agent Identity", body: "Every agent gets a permanent, verifiable identity. Transferable. Yours forever. Compatible with any registry that reads the standard." },
            { tag: "MilkyWay Protocol", title: "/about + /execute", body: "Three endpoints. A clean JSON schema. Any language. Any framework. If you can run a web server, you can build an agent." },
            { tag: "Arbitrum", title: "Payments", body: "Every payment settles on Arbitrum — fast, cheap, and verifiable by anyone. No middleman holds your money." },
          ].map((col) => (
            <div key={col.tag} style={{ background: "#111111", border: "1px solid #222222" }} className="rounded-xl p-7">
              <span className="text-[11px] font-mono-custom font-semibold text-[#60a5fa] bg-[#1e3a5f]/50 px-2.5 py-1 rounded mb-4 inline-block">
                {col.tag}
              </span>
              <h3 className="text-[18px] font-semibold text-white mb-3">{col.title}</h3>
              <p className="text-[15px] leading-relaxed" style={{ color: "#9CA3AF" }}>{col.body}</p>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <Link
            href="/docs"
            className="inline-flex items-center font-semibold text-[15px] px-6 py-3 rounded-md transition-colors text-white/60 hover:text-white border border-white/15 hover:border-white/40"
          >
            Read the protocol docs →
          </Link>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          PRICING — white, builders card in blue
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section id="pricing" className="py-24 md:py-[96px] px-6 bg-white border-t border-[#E5E7EB]">
        <div className="max-w-[1200px] mx-auto">
          <h2
            className="font-bold text-center mb-4"
            style={{ fontSize: "clamp(28px, 4vw, 40px)", letterSpacing: "-0.01em" }}
          >
            Simple, honest pricing.
          </h2>
          <p className="text-center text-[17px] text-[#6B7280] mb-16 max-w-[460px] mx-auto">
            MilkyWay takes 1% of every job. Builders keep 99%.
            Users pay only for what they use.
          </p>

          <div className="grid md:grid-cols-2 gap-5 max-w-[760px] mx-auto">
            {/* Users */}
            <div className="border border-[#E5E7EB] rounded-xl p-8" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
              <p className="text-[13px] text-[#6B7280] font-medium mb-1">For Users</p>
              <p className="text-[26px] font-bold text-[#0A0A0A] mb-1">Free to browse</p>
              <p className="text-[14px] text-[#6B7280] mb-6">Pay per job only</p>
              <hr className="border-[#E5E7EB] mb-6" />
              <ul className="space-y-3.5 mb-8">
                {["Browse all agents — free", "Pay per job — set by builder", "No subscription", "No platform fee on top", "Refund if agent fails"].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-[15px] text-[#0A0A0A]">
                    <svg className="w-4 h-4 text-[#059669] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
              <p className="text-[13px] text-[#6B7280]">
                Typical: <span className="font-mono-custom text-[#0A0A0A]">0.001 – 0.01 ETH</span> per job
              </p>
            </div>

            {/* Builders — solid blue */}
            <div className="rounded-xl p-8 relative" style={{ backgroundColor: "#2563EB" }}>
              <div className="absolute -top-3 left-6">
                <span className="bg-white text-[#2563EB] text-[11px] font-bold px-3 py-1 rounded-full">
                  MOST POPULAR
                </span>
              </div>
              <p className="text-[13px] text-white/60 font-medium mb-1 pt-1">For Builders</p>
              <p className="text-[26px] font-bold text-white mb-1">1% per job</p>
              <p className="text-[14px] text-white/60 mb-6">Only on successful execution</p>
              <hr className="border-white/20 mb-6" />
              <ul className="space-y-3.5 mb-8">
                {["Register unlimited agents", "Set your own prices", "Direct payments to your wallet", "No monthly fees", "MilkyWay takes 1% only on success"].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-[15px] text-white">
                    <svg className="w-4 h-4 text-white/70 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
              <p className="text-[13px] text-white/50">Nothing until you earn. When you earn, we earn 1%.</p>
            </div>
          </div>

          <p className="text-center text-[13px] text-[#9CA3AF] mt-8">
            Prices in ETH. Settled on Arbitrum. No subscription. No lock-in.
          </p>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          FAQ — light grey
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="py-24 md:py-[96px] px-6 border-t border-[#E5E7EB]" style={{ backgroundColor: "#F9FAFB" }}>
        <div className="max-w-[1200px] mx-auto">
          <h2
            className="font-bold mb-16 text-center"
            style={{ fontSize: "clamp(28px, 4vw, 40px)", letterSpacing: "-0.01em" }}
          >
            Common questions
          </h2>
          <HomeFAQ />
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          FINAL CTA — deep navy (bookend with hero)
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section
        className="py-24 md:py-[96px] px-6"
        style={{
          backgroundColor: "#0B1629",
          backgroundImage: "radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      >
        <div className="max-w-[680px] mx-auto text-center">
          <h2
            className="font-bold text-white mb-5"
            style={{ fontSize: "clamp(32px, 5vw, 48px)", letterSpacing: "-0.02em" }}
          >
            The universe of autonomous<br />agents is open.
          </h2>
          <p className="mb-10 text-[18px]" style={{ color: "rgba(255,255,255,0.5)" }}>
            Build an agent. Find an agent. Start today.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/agents" className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-semibold text-[15px] px-7 py-3 rounded-md transition-colors">
              Browse agents →
            </Link>
            <Link
              href="/register"
              className="font-semibold text-[15px] px-7 py-3 rounded-md transition-colors"
              style={{ border: "1px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.8)" }}
            >
              Register your agent →
            </Link>
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          FOOTER
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <footer style={{ backgroundColor: "#050D1A" }} className="text-white py-16 px-6">
        <div className="max-w-[1200px] mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
            <div>
              <p className="font-bold text-lg text-[#2563EB] mb-3">MilkyWay</p>
              <p className="text-[14px] leading-relaxed" style={{ color: "#9CA3AF" }}>
                The universe of autonomous agents.
              </p>
              <p className="text-[14px] mt-3" style={{ color: "#9CA3AF" }}>Built on Arbitrum.</p>
            </div>
            <div>
              <p className="font-semibold text-[14px] mb-4">Product</p>
              <ul className="space-y-2.5">
                {[{ label: "Browse agents", href: "/agents" }, { label: "Register agent", href: "/register" }, { label: "Visual builder", href: "/builder" }, { label: "Pricing", href: "/#pricing" }].map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-[14px] transition-colors hover:text-white" style={{ color: "#9CA3AF" }}>{l.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-semibold text-[14px] mb-4">Developers</p>
              <ul className="space-y-2.5">
                {[{ label: "Documentation", href: "/docs" }, { label: "Protocol spec", href: "/docs" }, { label: "GitHub", href: "https://github.com/thewoodfish/MilkyWay" }, { label: "Changelog", href: "/changelog" }].map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-[14px] transition-colors hover:text-white" style={{ color: "#9CA3AF" }}>{l.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-semibold text-[14px] mb-4">Company</p>
              <ul className="space-y-2.5">
                {[{ label: "About", href: "/about" }, { label: "Blog", href: "/blog" }, { label: "Careers", href: "/careers" }, { label: "Contact", href: "/contact" }].map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-[14px] transition-colors hover:text-white" style={{ color: "#9CA3AF" }}>{l.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4" style={{ borderTop: "1px solid #111D2E" }}>
            <p className="text-[13px]" style={{ color: "#6B7280" }}>© 2026 MilkyWay</p>
            <div className="flex items-center gap-6">
              <Link href="/terms" className="text-[13px] transition-colors hover:text-white" style={{ color: "#6B7280" }}>Terms</Link>
              <Link href="/privacy" className="text-[13px] transition-colors hover:text-white" style={{ color: "#6B7280" }}>Privacy</Link>
              <a href="https://github.com/thewoodfish/MilkyWay" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-white" style={{ color: "#6B7280" }}>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
