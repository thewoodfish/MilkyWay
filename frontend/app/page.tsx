import Link from "next/link";
import Image from "next/image";
import { HomeFAQ } from "@/components/HomeFAQ";
import { AnimatedFlowCanvas } from "@/components/AnimatedFlowCanvas";

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

// Checkmark icon
function Check({ color = "#2563EB" }: { color?: string }) {
  return (
    <svg className="w-4 h-4 flex-shrink-0" style={{ color }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

// Arrow icon
function Arrow() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
    </svg>
  );
}

export default async function HomePage() {
  const stats = await getStats();

  return (
    <div style={{ color: "#0A2540" }}>

      {/* ── 1. HERO ────────────────────────────────────────────────────── */}
      <section className="pt-28 pb-20 px-6 text-center relative overflow-hidden" style={{ background: "#ffffff" }}>
        {/* Galaxy background */}
        <div className="absolute inset-0 pointer-events-none" style={{ opacity: 0.45 }}>
          <Image src="/Gemini_Generated_Image_rbheezrbheezrbhe.png" alt="" fill className="object-cover object-center" priority />
        </div>

        <div className="max-w-[820px] mx-auto relative z-10">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 mb-8 text-[13px] font-medium"
            style={{ background: "#EFF6FF", color: "#2563EB", border: "1px solid #BFDBFE" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB]" />
            Open protocol · Arbitrum One · Live now
          </div>

          <h1 className="font-display font-bold leading-[1.06] mb-5"
            style={{ fontSize: "clamp(46px, 7vw, 78px)", letterSpacing: "-0.03em", color: "#0A2540" }}>
            The Economic Layer
            <br />
            for{" "}
            <span style={{ color: "#2563EB" }}>AI Agents</span>
          </h1>

          <p className="leading-relaxed mb-4 max-w-[600px] mx-auto"
            style={{ fontSize: "clamp(17px, 2.2vw, 21px)", color: "#425466" }}>
            Build agents. Publish them. Get paid automatically in USDC every time they&apos;re used.
          </p>
          <p className="mb-10 max-w-[500px] mx-auto text-[16px]" style={{ color: "#64748B" }}>
            MilkyWay transforms AI agents into income-producing digital assets.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-16">
            <Link href="/register"
              className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-semibold text-[16px] px-8 py-3.5 rounded-xl transition-colors">
              Launch an Agent →
            </Link>
            <Link href="/agents"
              className="font-semibold text-[16px] px-8 py-3.5 rounded-xl transition-all bg-white border border-[#D1D5DB] text-[#0A2540] hover:border-[#2563EB] hover:text-[#2563EB] hover:bg-[#EFF6FF]">
              Explore Marketplace
            </Link>
          </div>

          {/* Hero agent cards */}
          <div className="max-w-[960px] mx-auto">
            <div className="grid grid-cols-3 gap-3">
              {[
                { name: "Research Analyst",     init: "RA", category: "Data",         price: "$0.10", executions: "24,328", earnings: "$2,432", color: "#2563EB", bg: "#EFF6FF", bars: [4,7,5,9,6,8,10], delay: "0s"   },
                { name: "Legal Review Agent",   init: "LR", category: "Productivity", price: "$0.25", executions: "9,281",  earnings: "$2,320", color: "#7c3aed", bg: "#f5f3ff", bars: [6,4,8,5,7,6,9],  delay: "0.7s" },
                { name: "Marketing Copy Agent", init: "MC", category: "Productivity", price: "$0.05", executions: "53,902", earnings: "$2,695", color: "#0d9488", bg: "#f0fdfa", bars: [3,6,4,7,5,8,6],  delay: "1.4s" },
              ].map((a) => (
                <div key={a.name}
                  className="text-left rounded-2xl px-4 py-3.5 flex items-center gap-3 min-w-0"
                  style={{
                    background: "#fff",
                    border: "1px solid #E3E8EF",
                    boxShadow: "0 8px 32px rgba(10,37,64,0.10)",
                    animation: `float 4s ease-in-out infinite`,
                    animationDelay: a.delay,
                  }}>
                  {/* Robot avatar */}
                  <div className="w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center"
                    style={{ background: a.bg, color: a.color }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="8" width="18" height="12" rx="2"/>
                      <circle cx="9" cy="13" r="1.5" fill="currentColor" stroke="none"/>
                      <circle cx="15" cy="13" r="1.5" fill="currentColor" stroke="none"/>
                      <path d="M9.5 17.5h5"/>
                      <path d="M12 8V5"/>
                      <circle cx="12" cy="4" r="1" fill="currentColor" stroke="none"/>
                      <path d="M3 13H1M23 13h-2"/>
                    </svg>
                  </div>
                  {/* Name + category + runs */}
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-[13px] leading-snug truncate" style={{ color: "#0A2540" }}>{a.name}</p>
                    <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: a.color }}>{a.category}</span>
                    <p className="text-[10px] mt-0.5" style={{ color: "#9CA3AF" }}>{a.executions} runs</p>
                  </div>
                  {/* Sparkline */}
                  <div className="flex items-end gap-0.5 h-5 flex-shrink-0" style={{ width: "34px" }}>
                    {a.bars.map((h, bi) => (
                      <div key={bi} className="flex-1 rounded-sm" style={{ height: `${(h / 10) * 100}%`, background: bi === a.bars.length - 1 ? a.color : `${a.color}35` }} />
                    ))}
                  </div>
                  {/* Price */}
                  <div className="flex-shrink-0 text-right">
                    <p className="font-mono-custom font-bold text-[13px]" style={{ color: a.color }}>{a.price}</p>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md inline-block mt-0.5" style={{ background: a.bg, color: a.color }}>Run →</span>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-center text-[11px] mt-4" style={{ color: "#CBD5E1" }}>
              * Illustrative demo values
            </p>
          </div>
        </div>
      </section>

      {/* ── 2. THE OPPORTUNITY ─────────────────────────────────────────── */}
      <section className="py-28 px-6" style={{ background: "#fff", borderTop: "1px solid #E3E8EF" }}>
        <div className="max-w-[1100px] mx-auto">
          <div className="text-center mb-16">
            <span className="text-[13px] font-semibold uppercase tracking-widest mb-3 block" style={{ color: "#2563EB" }}>
              The opportunity
            </span>
            <h2 className="font-display font-bold mb-5"
              style={{ fontSize: "clamp(30px, 4.5vw, 52px)", letterSpacing: "-0.025em", color: "#0A2540", lineHeight: 1.08 }}>
              The Next Economy Is Autonomous
            </h2>
            <p className="text-[17px] max-w-[540px] mx-auto" style={{ color: "#425466", lineHeight: 1.65 }}>
              For the first time in history, all four conditions for autonomous economic actors exist simultaneously.
            </p>
          </div>

          {/* Four conditions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-20">
            {[
              { num: "01", title: "Intelligence created instantly",      body: "AI can generate, reason, and act on any information — at any scale, on demand.",    color: "#2563EB", bg: "#EFF6FF" },
              { num: "02", title: "Software acts autonomously",          body: "Agents don't wait for a human to click. They receive a task and complete it.",         color: "#7c3aed", bg: "#f5f3ff" },
              { num: "03", title: "Payments happen globally",            body: "USDC moves across borders instantly. Any agent, anywhere, can receive payment.",       color: "#0d9488", bg: "#f0fdfa" },
              { num: "04", title: "Ownership enforced on-chain",         body: "Smart contracts guarantee that builders get paid. No banks, no chargebacks, no delays.", color: "#dc6b2f", bg: "#fff7ed" },
            ].map((c) => (
              <div key={c.num} className="rounded-2xl p-6" style={{ background: c.bg, border: `1px solid ${c.color}20` }}>
                <span className="font-mono-custom font-bold text-[11px] tracking-widest mb-4 block" style={{ color: `${c.color}80` }}>{c.num}</span>
                <p className="font-semibold text-[15px] mb-2" style={{ color: "#0A2540" }}>{c.title}</p>
                <p className="text-[13px] leading-relaxed" style={{ color: "#64748B" }}>{c.body}</p>
              </div>
            ))}
          </div>

          {/* Missing layer + flywheel */}
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-block px-3 py-1 rounded-full text-[12px] font-semibold mb-5"
                style={{ background: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA" }}>
                The missing piece
              </div>
              <h3 className="font-display font-bold mb-4"
                style={{ fontSize: "clamp(24px, 3vw, 34px)", letterSpacing: "-0.02em", color: "#0A2540", lineHeight: 1.15 }}>
                AI has intelligence.
                <br />AI lacks incentives.
                <br />AI lacks ownership.
                <br />AI lacks native payments.
              </h3>
              <p className="text-[17px] leading-[1.75] mb-6" style={{ color: "#425466" }}>
                The next generation of software will not be applications. It will be autonomous economic actors. MilkyWay is building the infrastructure for that future.
              </p>
              <div className="inline-block px-4 py-2.5 rounded-xl text-[14px] font-semibold"
                style={{ background: "#EFF6FF", color: "#2563EB", border: "1px solid #BFDBFE" }}>
                MilkyWay provides the missing infrastructure.
              </div>
            </div>

            {/* Economic flywheel */}
            <div className="rounded-2xl p-8 text-center"
              style={{ background: "linear-gradient(135deg, #f8faff 0%, #EFF6FF 100%)", border: "1px solid #BFDBFE" }}>
              <p className="text-[12px] font-semibold uppercase tracking-widest mb-6" style={{ color: "#2563EB" }}>
                Economic flywheel
              </p>
              <div className="space-y-0">
                {[
                  { label: "Developers",    color: "#2563EB" },
                  { label: "Agents",        color: "#7c3aed" },
                  { label: "Users",         color: "#0d9488" },
                  { label: "Payments",      color: "#dc6b2f" },
                  { label: "Revenue",       color: "#16a34a" },
                  { label: "More Developers", color: "#2563EB" },
                ].map((item, i, arr) => (
                  <div key={item.label}>
                    <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-xl font-semibold text-[14px]"
                      style={{ background: "#fff", border: `1.5px solid ${item.color}30`, color: item.color, minWidth: "180px", justifyContent: "center" }}>
                      <span className="w-2 h-2 rounded-full" style={{ background: item.color }} />
                      {item.label}
                    </div>
                    {i < arr.length - 1 && (
                      <div className="flex justify-center py-1">
                        <span style={{ color: "#CBD5E1", fontSize: "18px" }}>↓</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. HOW IT WORKS ─────────────────────────────────────────────── */}
      <section className="py-32 px-6 relative overflow-hidden"
        style={{ background: "#05091a", borderTop: "1px solid rgba(37,99,235,0.12)" }}>
        {/* dot grid */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.018) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }} />
        {/* glow */}
        <div className="absolute pointer-events-none" style={{
          top: "0", left: "50%", transform: "translateX(-50%)",
          width: "1000px", height: "360px",
          background: "radial-gradient(ellipse at center, rgba(37,99,235,0.12) 0%, transparent 65%)",
          filter: "blur(60px)",
        }} />

        <div className="max-w-[960px] mx-auto relative z-10">
          <div className="text-center mb-20">
            <span className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 mb-7 text-[13px] font-semibold"
              style={{ background: "rgba(37,99,235,0.12)", color: "#60a5fa", border: "1px solid rgba(37,99,235,0.25)" }}>
              How it works
            </span>
            <h2 className="font-display font-bold text-white mb-4"
              style={{ fontSize: "clamp(30px, 4.5vw, 52px)", letterSpacing: "-0.03em", lineHeight: 1.08 }}>
              From idea to income
              <br /><span style={{ color: "#60a5fa" }}>in four steps.</span>
            </h2>
          </div>

          {/* Steps — horizontal timeline on large screens */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-0 relative">
            {/* connecting line */}
            <div className="hidden md:block absolute top-[28px] left-[calc(12.5%+16px)] right-[calc(12.5%+16px)] h-px pointer-events-none"
              style={{ background: "linear-gradient(90deg, rgba(37,99,235,0.5) 0%, rgba(124,58,237,0.5) 33%, rgba(13,148,136,0.5) 66%, rgba(220,107,47,0.5) 100%)" }} />

            {([
              {
                n: "01", title: "Build",
                body: "Any framework. Any language. Any runtime. If it speaks HTTP, it's a MilkyWay agent.",
                accent: "#2563EB", glow: "rgba(37,99,235,0.25)", tag: "Any stack",
              },
              {
                n: "02", title: "Publish",
                body: "One command registers your agent on-chain. Instantly discoverable across the ecosystem.",
                accent: "#7c3aed", glow: "rgba(124,58,237,0.25)", tag: "1 command",
              },
              {
                n: "03", title: "Earn",
                body: "USDC lands in your wallet automatically every time your agent executes. You keep 99%.",
                accent: "#0d9488", glow: "rgba(13,148,136,0.25)", tag: "Auto-paid",
              },
              {
                n: "04", title: "Scale",
                body: "Compose agents into multi-step workflows. Each connection multiplies your revenue.",
                accent: "#dc6b2f", glow: "rgba(220,107,47,0.25)", tag: "Compounding",
              },
            ] as const).map((s, i) => (
              <div key={s.n} className="flex flex-col items-center text-center px-5 pb-2 relative">
                {/* step circle */}
                <div className="w-14 h-14 rounded-full flex items-center justify-center mb-6 relative z-10 font-mono-custom font-bold text-[15px]"
                  style={{
                    background: `radial-gradient(circle at 35% 35%, ${s.accent}33, ${s.accent}11)`,
                    border: `1.5px solid ${s.accent}66`,
                    color: s.accent,
                    boxShadow: `0 0 24px ${s.glow}`,
                  }}>
                  {s.n}
                </div>

                {/* connector dots for mobile */}
                {i < 3 && (
                  <div className="md:hidden w-px h-8 mb-2" style={{ background: `linear-gradient(${s.accent}, transparent)` }} />
                )}

                {/* tag */}
                <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full mb-3"
                  style={{ background: `${s.accent}18`, color: s.accent, border: `1px solid ${s.accent}30` }}>
                  {s.tag}
                </span>

                <p className="font-bold text-[20px] text-white mb-3" style={{ letterSpacing: "-0.02em" }}>
                  {s.title}
                </p>
                <p className="text-[13.5px] leading-relaxed" style={{ color: "#6e7681", maxWidth: "180px" }}>
                  {s.body}
                </p>
              </div>
            ))}
          </div>

          <div className="text-center mt-16">
            <Link href="/register"
              className="inline-flex items-center gap-2 font-semibold text-[15px] px-7 py-3.5 rounded-xl transition-colors bg-[#2563EB] hover:bg-[#1d4ed8] text-white">
              Start building <Arrow />
            </Link>
          </div>
        </div>
      </section>

      {/* ── 4. MARKETPLACE PREVIEW ──────────────────────────────────────── */}
      <section className="py-28 px-6" style={{ background: "#fff", borderTop: "1px solid #E3E8EF" }}>
        <div className="max-w-[1100px] mx-auto">
          <div className="text-center mb-16">
            <span className="text-[13px] font-semibold uppercase tracking-widest mb-3 block" style={{ color: "#2563EB" }}>
              Marketplace
            </span>
            <h2 className="font-display font-bold mb-5"
              style={{ fontSize: "clamp(30px, 4.5vw, 52px)", letterSpacing: "-0.025em", color: "#0A2540" }}>
              A Marketplace For Autonomous Intelligence
            </h2>
            <p className="text-[17px] max-w-[500px] mx-auto" style={{ color: "#425466" }}>
              Agents earning real USDC. Every execution settled on Arbitrum One.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            {[
              { name: "Research Analyst",      category: "Data",         price: "$0.10",  execs: "24,328",  earned: "$2,432", color: "#2563EB", bg: "#EFF6FF", init: "RA" },
              { name: "Legal Review Agent",    category: "Productivity", price: "$0.25",  execs: "9,281",   earned: "$2,320", color: "#7c3aed", bg: "#f5f3ff", init: "LR" },
              { name: "Marketing Copy Agent",  category: "Productivity", price: "$0.05",  execs: "53,902",  earned: "$2,695", color: "#0d9488", bg: "#f0fdfa", init: "MC" },
              { name: "DeFi Price Monitor",    category: "DeFi",         price: "$0.001", execs: "128,490", earned: "$128",   color: "#dc6b2f", bg: "#fff7ed", init: "DP" },
              { name: "Portfolio Risk Scorer", category: "Trading",      price: "$0.15",  execs: "11,203",  earned: "$1,680", color: "#0ea5e9", bg: "#f0f9ff", init: "PR" },
              { name: "Aave Position Monitor", category: "DeFi",         price: "$0.25",  execs: "7,820",   earned: "$1,955", color: "#16a34a", bg: "#f0fdf4", init: "AP" },
            ].map((a) => (
              <div key={a.name} className="rounded-2xl flex flex-col"
                style={{ background: "#fff", border: "1px solid #E3E8EF", boxShadow: "0 2px 16px rgba(10,37,64,0.06)", overflow: "hidden" }}>

                {/* Card header */}
                <div className="flex items-center justify-between p-6 pb-5">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-[13px] flex-shrink-0"
                      style={{ background: a.bg, color: a.color, letterSpacing: "0.04em" }}>
                      {a.init}
                    </div>
                    <div>
                      <p className="font-semibold text-[15px] leading-tight mb-1.5" style={{ color: "#0A2540" }}>{a.name}</p>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
                        style={{ background: a.bg, color: a.color }}>
                        {a.category}
                      </span>
                    </div>
                  </div>
                  <span className="w-2 h-2 rounded-full flex-shrink-0 bg-[#10b981]"
                    style={{ boxShadow: "0 0 6px rgba(16,185,129,0.7)" }} />
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-2 gap-px mx-6 mb-5 rounded-xl overflow-hidden"
                  style={{ background: "#F3F4F6" }}>
                  <div className="px-4 py-3" style={{ background: "#F9FAFB" }}>
                    <p className="text-[10px] font-medium uppercase tracking-wider mb-1" style={{ color: "#9CA3AF" }}>Total earned</p>
                    <p className="font-mono-custom font-bold text-[15px]" style={{ color: "#16a34a" }}>{a.earned} <span className="text-[11px] font-normal" style={{ color: "#9CA3AF" }}>USDC</span></p>
                  </div>
                  <div className="px-4 py-3" style={{ background: "#F9FAFB" }}>
                    <p className="text-[10px] font-medium uppercase tracking-wider mb-1" style={{ color: "#9CA3AF" }}>Executions</p>
                    <p className="font-mono-custom font-bold text-[15px]" style={{ color: "#0A2540" }}>{a.execs}</p>
                  </div>
                </div>

                {/* Footer: price + CTA */}
                <div className="flex items-center justify-between px-6 pb-6">
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wider mb-0.5" style={{ color: "#9CA3AF" }}>Per execution</p>
                    <p className="font-mono-custom font-bold text-[16px]" style={{ color: a.color }}>{a.price} <span className="text-[11px] font-normal" style={{ color: "#9CA3AF" }}>USDC</span></p>
                  </div>
                  <Link href="/agents"
                    className="inline-flex items-center gap-1.5 font-semibold text-[13px] px-4 py-2 rounded-lg transition-colors"
                    style={{ background: a.bg, color: a.color }}>
                    Run <Arrow />
                  </Link>
                </div>
              </div>
            ))}
          </div>

          <p className="text-center text-[11px] mb-8" style={{ color: "#CBD5E1" }}>* Illustrative demo values showing the marketplace potential</p>

          <div className="text-center">
            <Link href="/agents"
              className="inline-flex items-center gap-2 font-semibold text-[15px] px-7 py-3 rounded-xl transition-all"
              style={{ background: "#EFF6FF", color: "#2563EB", border: "1px solid #BFDBFE" }}>
              Explore the live marketplace <Arrow />
            </Link>
          </div>
        </div>
      </section>

      {/* ── 5. STATS BAR ─────────────────────────────────────────────────── */}
      <section className="py-14 px-6" style={{ background: "#2563EB" }}>
        <div className="max-w-[900px] mx-auto">
          <p className="text-center text-[13px] font-semibold uppercase tracking-widest mb-8" style={{ color: "rgba(255,255,255,0.6)" }}>
            The Network Is Growing
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-between text-center">
            {[
              { value: stats.agentCount || "Growing", label: "Agents registered" },
              { value: stats.builderCount || "Active",   label: "Builders in ecosystem" },
              { value: (stats.totalStaked || "0") + " ETH", label: "Staked in registry" },
            ].map((s, i) => (
              <>
                <div key={i} className="flex-1 py-4 sm:py-0">
                  <p className="font-display font-bold leading-none tabular-nums text-white" style={{ fontSize: "clamp(28px, 3.5vw, 40px)" }}>
                    {s.value}
                  </p>
                  <p className="text-[13px] mt-2" style={{ color: "rgba(255,255,255,0.7)" }}>{s.label}</p>
                </div>
                {i < 2 && (
                  <div key={`d-${i}`} className="hidden sm:block w-px self-stretch mx-8" style={{ background: "rgba(255,255,255,0.25)" }} />
                )}
              </>
            ))}
          </div>
        </div>
      </section>

      {/* ── 6. WHY NOW ───────────────────────────────────────────────────── */}
      <section className="py-28 px-6 relative overflow-hidden" style={{ background: "#05091a" }}>
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.018) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }} />
        <div className="absolute pointer-events-none" style={{
          top: "-80px", left: "50%", transform: "translateX(-50%)",
          width: "900px", height: "400px",
          background: "radial-gradient(ellipse at center, rgba(37,99,235,0.14) 0%, transparent 70%)",
          filter: "blur(60px)",
        }} />

        <div className="max-w-[860px] mx-auto relative z-10">
          <div className="text-center mb-16">
            <span className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 mb-7 text-[13px] font-semibold"
              style={{ background: "rgba(37,99,235,0.12)", color: "#60a5fa", border: "1px solid rgba(37,99,235,0.25)" }}>
              For investors &amp; grant reviewers
            </span>
            <h2 className="font-display font-bold text-white mb-5"
              style={{ fontSize: "clamp(34px, 5vw, 56px)", letterSpacing: "-0.03em", lineHeight: 1.08 }}>
              Why This Moment Matters
            </h2>
            <p className="text-[17px] max-w-[500px] mx-auto" style={{ color: "#6e7681", lineHeight: 1.65 }}>
              Every infrastructure platform in history had a single inflection moment. This is that moment for autonomous agents.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5 mb-14">
            {[
              {
                title: "Websites became businesses.",
                body: "When HTTP + payments infrastructure matured, millions of websites became commerce engines. Stripe made it programmable.",
                icon: "🌐", accent: "#60a5fa",
              },
              {
                title: "Apps became businesses.",
                body: "When mobile + app stores matured, millions of apps became revenue-generating products. The App Store made it accessible.",
                icon: "📱", accent: "#a78bfa",
              },
              {
                title: "Agents are becoming businesses.",
                body: "AI created the intelligence. Arbitrum provides the settlement layer. MilkyWay provides the economic infrastructure.",
                icon: "🤖", accent: "#34d399",
                highlight: true,
              },
            ].map((c) => (
              <div key={c.title} className="rounded-2xl p-6"
                style={{
                  background: c.highlight ? "linear-gradient(145deg, rgba(37,99,235,0.18) 0%, rgba(37,99,235,0.06) 100%)" : "rgba(255,255,255,0.03)",
                  border: c.highlight ? "1px solid rgba(37,99,235,0.4)" : "1px solid rgba(255,255,255,0.06)",
                  boxShadow: c.highlight ? "0 0 40px rgba(37,99,235,0.15)" : "none",
                }}>
                <span className="text-[28px] mb-4 block">{c.icon}</span>
                <p className="font-semibold text-[15px] mb-3" style={{ color: c.accent }}>{c.title}</p>
                <p className="text-[13px] leading-relaxed" style={{ color: "#6e7681" }}>{c.body}</p>
              </div>
            ))}
          </div>

          {/* Investor takeaway */}
          <div className="rounded-2xl p-8 text-center"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <p className="font-display font-bold text-white mb-3" style={{ fontSize: "clamp(20px, 2.5vw, 28px)", letterSpacing: "-0.02em" }}>
              MilkyWay is not building an agent marketplace.
            </p>
            <p className="text-[16px]" style={{ color: "#6e7681" }}>
              MilkyWay is building{" "}
              <span style={{ color: "#60a5fa", fontWeight: 600 }}>the economic infrastructure for autonomous software.</span>
            </p>
          </div>
        </div>
      </section>

      {/* ── 7. DEVELOPER EARNINGS SCENARIOS ─────────────────────────────── */}
      <section className="py-28 px-6" style={{ background: "#fff", borderTop: "1px solid #E3E8EF" }}>
        <div className="max-w-[1000px] mx-auto">
          <div className="text-center mb-16">
            <span className="text-[13px] font-semibold uppercase tracking-widest mb-3 block" style={{ color: "#16a34a" }}>
              Builder economics
            </span>
            <h2 className="font-display font-bold mb-5"
              style={{ fontSize: "clamp(30px, 4.5vw, 50px)", letterSpacing: "-0.025em", color: "#0A2540" }}>
              What builders earn
            </h2>
            <p className="text-[17px] max-w-[480px] mx-auto" style={{ color: "#425466" }}>
              Every agent you publish becomes a revenue stream. Here&apos;s what that looks like in practice.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {[
              {
                type: "Side project",
                agentName: "Research Assistant",
                price: "$0.10",
                dailyRuns: 50,
                monthly: "$150",
                color: "#2563EB", bg: "#EFF6FF",
                desc: "A simple research agent. 50 runs per day. One weekend to build.",
              },
              {
                type: "Growing product",
                agentName: "Legal Review Agent",
                price: "$0.50",
                dailyRuns: 100,
                monthly: "$1,500",
                color: "#7c3aed", bg: "#f5f3ff",
                desc: "A legal review agent. Law firms automate document analysis.",
                featured: true,
              },
              {
                type: "Full business",
                agentName: "Data Pipeline Suite",
                price: "$2.00",
                dailyRuns: 200,
                monthly: "$12,000",
                color: "#dc6b2f", bg: "#fff7ed",
                desc: "A suite of data agents. B2B customers running at scale.",
              },
            ].map((s) => (
              <div key={s.type} className="rounded-2xl overflow-hidden relative"
                style={{
                  background: s.featured ? "linear-gradient(150deg, #1a3a8f 0%, #2563EB 100%)" : "#fff",
                  border: s.featured ? "1px solid rgba(99,153,255,0.4)" : "1px solid #E3E8EF",
                  boxShadow: s.featured ? "0 20px 60px rgba(37,99,235,0.25)" : "0 2px 12px rgba(10,37,64,0.05)",
                }}>
                {s.featured && (
                  <div className="absolute -top-px left-0 right-0 flex justify-center">
                    <span className="text-[11px] font-bold px-4 py-1 rounded-b-lg" style={{ background: "#fff", color: "#2563EB" }}>
                      MOST COMMON
                    </span>
                  </div>
                )}
                <div className="p-6" style={{ paddingTop: s.featured ? "28px" : "24px" }}>
                  <span className="text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full mb-4 inline-block"
                    style={s.featured ? { background: "rgba(255,255,255,0.18)", color: "#fff" } : { background: s.bg, color: s.color }}>
                    {s.type}
                  </span>
                  <p className="font-bold text-[16px] mb-2" style={{ color: s.featured ? "#fff" : "#0A2540" }}>{s.agentName}</p>
                  <p className="text-[13px] mb-5" style={{ color: s.featured ? "rgba(255,255,255,0.65)" : "#64748B" }}>{s.desc}</p>
                  <div className="space-y-2 mb-5">
                    {[
                      { label: "Price per execution", value: s.price },
                      { label: "Daily executions",    value: String(s.dailyRuns) },
                    ].map((r) => (
                      <div key={r.label} className="flex items-center justify-between text-[13px]">
                        <span style={{ color: s.featured ? "rgba(255,255,255,0.55)" : "#9CA3AF" }}>{r.label}</span>
                        <span className="font-mono-custom font-semibold" style={{ color: s.featured ? "rgba(255,255,255,0.9)" : "#0A2540" }}>{r.value}</span>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-xl p-4 text-center"
                    style={{ background: s.featured ? "rgba(255,255,255,0.12)" : s.bg }}>
                    <p className="text-[11px] font-semibold uppercase tracking-wider mb-1"
                      style={{ color: s.featured ? "rgba(255,255,255,0.55)" : s.color }}>
                      Monthly earnings
                    </p>
                    <p className="font-display font-bold text-[30px] leading-none"
                      style={{ color: s.featured ? "#fff" : s.color, letterSpacing: "-0.02em" }}>
                      {s.monthly}
                    </p>
                    <p className="text-[10px] mt-1" style={{ color: s.featured ? "rgba(255,255,255,0.4)" : "#9CA3AF" }}>
                      USDC · 99% to builder
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-center text-[12px]" style={{ color: "#CBD5E1" }}>* Illustrative scenarios. Actual earnings depend on demand.</p>
        </div>
      </section>

      {/* ── 8. VISUAL BUILDER SHOWCASE ──────────────────────────────────── */}
      <section className="py-32 px-6 relative overflow-hidden"
        style={{ background: "#05091a", borderTop: "1px solid rgba(37,99,235,0.15)" }}>
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.025) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          animation: "gridSlide 12s linear infinite",
        }} />
        <div className="absolute left-1/2 pointer-events-none" style={{
          top: "35%", transform: "translateX(-50%)",
          width: "900px", height: "500px",
          background: "radial-gradient(ellipse at center, rgba(37,99,235,0.14) 0%, transparent 70%)",
          filter: "blur(48px)",
        }} />

        <div className="max-w-[960px] mx-auto relative z-10">
          <div className="text-center mb-16">
            <span className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 mb-7 text-[13px] font-semibold"
              style={{ background: "rgba(37,99,235,0.12)", color: "#60a5fa", border: "1px solid rgba(37,99,235,0.25)" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB] animate-pulse" />
              Visual Builder — Live Demo
            </span>
            <h2 className="font-display font-bold text-white mb-5"
              style={{ fontSize: "clamp(36px, 5.5vw, 60px)", letterSpacing: "-0.03em", lineHeight: 1.08 }}>
              Chain agents into flows.
              <br />
              <span style={{ color: "#60a5fa" }}>Watch them execute.</span>
            </h2>
            <p className="text-[18px] max-w-[500px] mx-auto" style={{ color: "#6e7681", lineHeight: 1.65 }}>
              Connect agents on a visual canvas. The output of one becomes the input of the next. Pay once — USDC releases when the flow completes.
            </p>
          </div>

          <AnimatedFlowCanvas />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-12">
            {[
              {
                title: "Drag & drop canvas",
                desc: "No code. Click agents to add them to your agentic flow.",
                icon: (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                  </svg>
                ),
              },
              {
                title: "Auto field matching",
                desc: "Output types are mapped to inputs automatically.",
                icon: (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                  </svg>
                ),
              },
              {
                title: "USDC-guaranteed",
                desc: "Paid via x402. Full refund if the agentic flow fails.",
                icon: (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                ),
              },
            ].map((f) => (
              <div key={f.title} className="rounded-xl p-5"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
                  style={{ background: "rgba(37,99,235,0.15)", color: "#60a5fa" }}>
                  {f.icon}
                </div>
                <p className="text-[14px] font-semibold text-white mb-1">{f.title}</p>
                <p className="text-[13px]" style={{ color: "#6e7681" }}>{f.desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link href="/builder"
              className="inline-flex items-center gap-2 font-semibold text-[15px] px-8 py-3.5 rounded-lg transition-colors bg-[#2563EB] hover:bg-[#1d4ed8] text-white">
              Open the builder <Arrow />
            </Link>
          </div>
        </div>
      </section>

      {/* ── 9. NETWORK EFFECTS ──────────────────────────────────────────── */}
      <section className="py-28 px-6" style={{ background: "#F8FAFF", borderTop: "1px solid #E3E8EF" }}>
        <div className="max-w-[900px] mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <span className="text-[13px] font-semibold uppercase tracking-widest mb-4 block" style={{ color: "#2563EB" }}>
                Network effects
              </span>
              <h2 className="font-display font-bold mb-5"
                style={{ fontSize: "clamp(28px, 4vw, 44px)", letterSpacing: "-0.02em", color: "#0A2540", lineHeight: 1.1 }}>
                Built To Compound
              </h2>
              <p className="text-[17px] leading-[1.75] mb-6" style={{ color: "#425466" }}>
                Every new agent makes every other agent more valuable. Every new builder expands the ecosystem for every user. Every new user creates more demand for builders.
              </p>
              <p className="text-[17px] leading-[1.75] mb-8" style={{ color: "#425466" }}>
                MilkyWay becomes more powerful with every participant. That&apos;s the nature of economic infrastructure.
              </p>
              <Link href="/agents" className="inline-flex items-center gap-2 font-semibold text-[15px]" style={{ color: "#2563EB" }}>
                Explore the ecosystem <Arrow />
              </Link>
            </div>

            {/* Compounding flywheel */}
            <div className="rounded-2xl p-8"
              style={{ background: "linear-gradient(135deg, #EFF6FF 0%, #f5f3ff 100%)", border: "1px solid #BFDBFE" }}>
              <div className="space-y-0">
                {[
                  { label: "Developer builds an agent",  color: "#2563EB" },
                  { label: "Agent earns USDC",           color: "#7c3aed" },
                  { label: "Success attracts users",     color: "#0d9488" },
                  { label: "Users fund more agents",     color: "#dc6b2f" },
                  { label: "More developers join",       color: "#16a34a" },
                  { label: "More agents, more value",    color: "#0ea5e9" },
                  { label: "Network compounds",          color: "#2563EB" },
                ].map((item, i, arr) => (
                  <div key={item.label}>
                    <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl"
                      style={{ background: "#fff", border: `1.5px solid ${item.color}25`, color: item.color }}>
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: item.color }} />
                      <span className="font-medium text-[13px]" style={{ color: "#0A2540" }}>{item.label}</span>
                      {i === arr.length - 1 && (
                        <span className="ml-auto text-[11px] font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: `${item.color}15`, color: item.color }}>
                          ∞
                        </span>
                      )}
                    </div>
                    {i < arr.length - 1 && (
                      <div className="flex justify-center py-0.5">
                        <span style={{ color: "#CBD5E1", fontSize: "14px" }}>↓</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 10. DEVELOPER EXPERIENCE ────────────────────────────────────── */}
      <section className="py-32 px-6 relative overflow-hidden"
        style={{ background: "#05091a", borderTop: "1px solid rgba(37,99,235,0.12)" }}>
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.018) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }} />
        <div className="absolute pointer-events-none" style={{
          top: "0", left: "50%", transform: "translateX(-50%)",
          width: "800px", height: "300px",
          background: "radial-gradient(ellipse at center, rgba(37,99,235,0.1) 0%, transparent 70%)",
          filter: "blur(60px)",
        }} />

        <div className="max-w-[1100px] mx-auto relative z-10">

          {/* Header */}
          <div className="text-center mb-16">
            <span className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 mb-7 text-[13px] font-semibold"
              style={{ background: "rgba(37,99,235,0.12)", color: "#60a5fa", border: "1px solid rgba(37,99,235,0.25)" }}>
              Developer experience
            </span>
            <h2 className="font-display font-bold text-white mb-4"
              style={{ fontSize: "clamp(32px, 5vw, 56px)", letterSpacing: "-0.03em", lineHeight: 1.08 }}>
              From zero to earning
              <br />
              <span style={{ color: "#60a5fa" }}>in three commands.</span>
            </h2>
            <p className="text-[17px] max-w-[440px] mx-auto" style={{ color: "#6e7681", lineHeight: 1.65 }}>
              One package. No billing code. No infrastructure. Your logic is the entire agent.
            </p>
          </div>

          {/* Main layout: steps left, code right */}
          <div className="grid md:grid-cols-[1fr_1.6fr] gap-6 items-start">

            {/* Left — three step terminals */}
            <div className="space-y-4">

              {/* Step 1 */}
              <div className="rounded-2xl overflow-hidden"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(37,99,235,0.2)" }}>
                <div className="px-5 py-3 flex items-center gap-3"
                  style={{ borderBottom: "1px solid rgba(37,99,235,0.15)", background: "rgba(37,99,235,0.08)" }}>
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                    style={{ background: "#2563EB", color: "#fff" }}>1</span>
                  <span className="text-[13px] font-semibold" style={{ color: "#93c5fd" }}>Scaffold</span>
                </div>
                <div className="px-5 py-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span style={{ color: "#22c55e", fontSize: "12px", fontFamily: "JetBrains Mono, monospace" }}>$</span>
                    <span style={{ color: "#e2e8f0", fontSize: "13px", fontFamily: "JetBrains Mono, monospace" }}>
                      npx create-milkyway-agent@latest
                    </span>
                  </div>
                  <div className="space-y-1 pl-4" style={{ borderLeft: "2px solid rgba(37,99,235,0.2)" }}>
                    <p style={{ color: "#6e7681", fontSize: "12px", fontFamily: "JetBrains Mono, monospace" }}>✔ Agent name: <span style={{ color: "#e2e8f0" }}>price-monitor</span></p>
                    <p style={{ color: "#6e7681", fontSize: "12px", fontFamily: "JetBrains Mono, monospace" }}>✔ Category: <span style={{ color: "#e2e8f0" }}>DEFI</span></p>
                    <p style={{ color: "#6e7681", fontSize: "12px", fontFamily: "JetBrains Mono, monospace" }}>✔ Price: <span style={{ color: "#e2e8f0" }}>0.001 USDC</span></p>
                    <p style={{ color: "#22c55e", fontSize: "12px", fontFamily: "JetBrains Mono, monospace" }}>✦ Created price-monitor/</p>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="rounded-2xl overflow-hidden"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(124,58,237,0.2)" }}>
                <div className="px-5 py-3 flex items-center gap-3"
                  style={{ borderBottom: "1px solid rgba(124,58,237,0.15)", background: "rgba(124,58,237,0.08)" }}>
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                    style={{ background: "#7c3aed", color: "#fff" }}>2</span>
                  <span className="text-[13px] font-semibold" style={{ color: "#c4b5fd" }}>Write your logic</span>
                </div>
                <div className="px-5 py-4">
                  <p className="text-[12px] mb-2" style={{ color: "#52525B", fontFamily: "JetBrains Mono, monospace" }}>src/index.ts</p>
                  <p className="text-[13px] leading-relaxed" style={{ color: "#6e7681" }}>
                    Edit one function. Payment verification, routing, and schema validation are handled automatically.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="rounded-2xl overflow-hidden"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(16,185,129,0.2)" }}>
                <div className="px-5 py-3 flex items-center gap-3"
                  style={{ borderBottom: "1px solid rgba(16,185,129,0.15)", background: "rgba(16,185,129,0.08)" }}>
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                    style={{ background: "#059669", color: "#fff" }}>3</span>
                  <span className="text-[13px] font-semibold" style={{ color: "#6ee7b7" }}>Register &amp; earn</span>
                </div>
                <div className="px-5 py-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span style={{ color: "#22c55e", fontSize: "12px", fontFamily: "JetBrains Mono, monospace" }}>$</span>
                    <span style={{ color: "#e2e8f0", fontSize: "13px", fontFamily: "JetBrains Mono, monospace" }}>milkyway register</span>
                  </div>
                  <div className="space-y-1 pl-4" style={{ borderLeft: "2px solid rgba(16,185,129,0.2)" }}>
                    <p style={{ color: "#6e7681", fontSize: "12px", fontFamily: "JetBrains Mono, monospace" }}>✔ Loaded: price-monitor</p>
                    <p style={{ color: "#6e7681", fontSize: "12px", fontFamily: "JetBrains Mono, monospace" }}>✔ Endpoint is alive</p>
                    <p style={{ color: "#6e7681", fontSize: "12px", fontFamily: "JetBrains Mono, monospace" }}>✔ /about schema valid</p>
                    <p style={{ color: "#22c55e", fontSize: "12px", fontFamily: "JetBrains Mono, monospace" }}>✓ Agent is live on MilkyWay</p>
                  </div>
                </div>
              </div>

            </div>

            {/* Right — large code window */}
            <div className="rounded-2xl overflow-hidden"
              style={{
                background: "linear-gradient(160deg, #0d1f3c 0%, #091429 100%)",
                border: "1px solid rgba(59,130,246,0.25)",
                boxShadow: "0 0 0 1px rgba(37,99,235,0.06), 0 32px 80px rgba(10,20,60,0.6), 0 0 60px rgba(37,99,235,0.08)",
              }}>
              {/* Toolbar */}
              <div className="flex items-center gap-2 px-5 py-3.5"
                style={{ background: "rgba(10,22,48,0.85)", borderBottom: "1px solid rgba(59,130,246,0.15)" }}>
                {["#FF5F57","#FEBC2E","#28C840"].map((c) => (
                  <span key={c} className="w-3 h-3 rounded-full" style={{ background: c }} />
                ))}
                <span className="ml-3 text-[12px] font-mono-custom" style={{ color: "#4a6fa5" }}>src/index.js</span>
                <div className="ml-auto flex items-center gap-2">
                  {["JavaScript", "@usemilkyway/agent-sdk"].map((tag) => (
                    <span key={tag} className="text-[10px] font-mono-custom font-semibold px-2 py-0.5 rounded"
                      style={{ background: "rgba(59,130,246,0.12)", color: "#93c5fd", border: "1px solid rgba(59,130,246,0.2)" }}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Code */}
              <div className="flex">
                {/* Line numbers */}
                <div className="select-none px-4 py-5 text-right text-[12.5px] leading-[1.9] font-mono-custom flex-shrink-0"
                  style={{ color: "rgba(99,140,210,0.25)", borderRight: "1px solid rgba(59,130,246,0.08)", minWidth: "40px" }}>
                  {Array.from({ length: 21 }, (_, i) => <div key={i}>{i + 1}</div>)}
                </div>
                <pre className="px-6 py-5 text-[12.5px] leading-[1.9] font-mono-custom overflow-x-auto flex-1">
<span style={{ color: "#4a6fa5" }}>{"require"}</span><span style={{ color: "#e2e8f0" }}>{"('dotenv').config();"}</span>{"\n"}
<span style={{ color: "#4a6fa5" }}>{"const"}</span><span style={{ color: "#e2e8f0" }}>{" { createAgent } = "}</span><span style={{ color: "#4a6fa5" }}>{"require"}</span><span style={{ color: "#e2e8f0" }}>{"('"}</span><span style={{ color: "#6ee7b7" }}>{"@usemilkyway/agent-sdk"}</span><span style={{ color: "#e2e8f0" }}>{"');"}</span>{"\n"}
<span style={{ color: "#4a6fa5" }}>{"const"}</span><span style={{ color: "#e2e8f0" }}>{" config = "}</span><span style={{ color: "#4a6fa5" }}>{"require"}</span><span style={{ color: "#e2e8f0" }}>{"('../agent.json');"}</span>{"\n"}
{"\n"}
<span style={{ color: "#4a6fa5" }}>{"const"}</span><span style={{ color: "#e2e8f0" }}>{" COINGECKO = "}</span><span style={{ color: "#6ee7b7" }}>{'"https://api.coingecko.com/api/v3/coins"'}</span><span style={{ color: "#e2e8f0" }}>{";"}</span>{"\n"}
{"\n"}
<span style={{ color: "#fbbf24" }}>{"createAgent"}</span><span style={{ color: "#e2e8f0" }}>{"(config, {"}</span>{"\n"}
{"\n"}
<span style={{ color: "#e2e8f0" }}>{"  "}</span><span style={{ color: "#93c5fd" }}>{"get_price"}</span><span style={{ color: "#e2e8f0" }}>{": async ({ asset = "}</span><span style={{ color: "#6ee7b7" }}>{'"ethereum"'}</span><span style={{ color: "#e2e8f0" }}>{" }) => {"}</span>{"\n"}
<span style={{ color: "#e2e8f0" }}>{"    "}</span><span style={{ color: "#4a6fa5" }}>{"const"}</span><span style={{ color: "#e2e8f0" }}>{" res  = "}</span><span style={{ color: "#4a6fa5" }}>{"await"}</span><span style={{ color: "#fbbf24" }}>{" fetch"}</span><span style={{ color: "#e2e8f0" }}>{"(`${COINGECKO}/${asset}`);"}</span>{"\n"}
<span style={{ color: "#e2e8f0" }}>{"    "}</span><span style={{ color: "#4a6fa5" }}>{"const"}</span><span style={{ color: "#e2e8f0" }}>{" data = "}</span><span style={{ color: "#4a6fa5" }}>{"await"}</span><span style={{ color: "#e2e8f0" }}>{" res."}</span><span style={{ color: "#fbbf24" }}>{"json"}</span><span style={{ color: "#e2e8f0" }}>{"();"}</span>{"\n"}
<span style={{ color: "#e2e8f0" }}>{"    "}</span><span style={{ color: "#4a6fa5" }}>{"const"}</span><span style={{ color: "#e2e8f0" }}>{" market = data.market_data;"}</span>{"\n"}
{"\n"}
<span style={{ color: "#4a6fa5" }}>{"    return"}</span><span style={{ color: "#e2e8f0" }}>{" {"}</span>{"\n"}
<span style={{ color: "#e2e8f0" }}>{"      price_usd:  market.current_price.usd,"}</span>{"\n"}
<span style={{ color: "#e2e8f0" }}>{"      symbol:     data.symbol."}</span><span style={{ color: "#fbbf24" }}>{"toUpperCase"}</span><span style={{ color: "#e2e8f0" }}>{"(),"}</span>{"\n"}
<span style={{ color: "#e2e8f0" }}>{"      change_24h: market.price_change_percentage_24h,"}</span>{"\n"}
<span style={{ color: "#e2e8f0" }}>{"    };"}</span>{"\n"}
<span style={{ color: "#e2e8f0" }}>{"  }"}</span>{"\n"}
{"\n"}
<span style={{ color: "#e2e8f0" }}>{"})."}</span><span style={{ color: "#fbbf24" }}>{"listen"}</span><span style={{ color: "#e2e8f0" }}>{"(3000);"}</span>
                </pre>
              </div>

              {/* Footer strip */}
              <div className="flex items-center justify-between px-5 py-2.5"
                style={{ borderTop: "1px solid rgba(59,130,246,0.1)", background: "rgba(10,22,48,0.6)" }}>
                <span className="text-[11px] font-mono-custom" style={{ color: "#4a6fa5" }}>
                  payment verified · inputs validated · schema enforced
                </span>
                <span className="text-[11px] font-mono-custom" style={{ color: "#22c55e" }}>
                  ● live
                </span>
              </div>
            </div>

          </div>

          {/* Bottom CTA row */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mt-12 pt-10"
            style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <div>
              <p className="text-[15px] font-semibold text-white mb-1">Ready to ship your first agent?</p>
              <p className="text-[13px]" style={{ color: "#6e7681" }}>
                Full docs at{" "}
                <a href="https://docs.usemilkyway.com" target="_blank" rel="noopener noreferrer"
                  className="hover:underline" style={{ color: "#60a5fa" }}>
                  docs.usemilkyway.com
                </a>
              </p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <code className="text-[13px] font-mono-custom px-4 py-2 rounded-lg"
                style={{ background: "rgba(37,99,235,0.12)", color: "#93c5fd", border: "1px solid rgba(37,99,235,0.2)" }}>
                npx create-milkyway-agent@latest
              </code>
              <Link href="/register"
                className="inline-flex items-center gap-2 font-semibold text-[14px] px-5 py-2.5 rounded-lg transition-colors bg-[#2563EB] hover:bg-[#1d4ed8] text-white flex-shrink-0">
                Register Agent <Arrow />
              </Link>
            </div>
          </div>

        </div>
      </section>

      {/* ── 11. WHY ARBITRUM ────────────────────────────────────────────── */}
      <section className="py-28 px-6 relative overflow-hidden"
        style={{ background: "#05091a", borderTop: "1px solid rgba(37,99,235,0.12)" }}>
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.018) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }} />

        <div className="max-w-[1100px] mx-auto relative z-10">
          <div className="text-center mb-16">
            <span className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 mb-7 text-[13px] font-semibold"
              style={{ background: "rgba(16,185,129,0.12)", color: "#34d399", border: "1px solid rgba(16,185,129,0.25)" }}>
              Settlement layer
            </span>
            <h2 className="font-display font-bold text-white mb-5"
              style={{ fontSize: "clamp(34px, 5vw, 56px)", letterSpacing: "-0.03em", lineHeight: 1.08 }}>
              Powered By Arbitrum
            </h2>
            <p className="text-[17px] max-w-[500px] mx-auto" style={{ color: "#6e7681", lineHeight: 1.65 }}>
              Every agent payment settles on Arbitrum One — fast, cheap, and globally accessible. MilkyWay is native Arbitrum infrastructure.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-14">
            {[
              { label: "Fast settlement",           icon: "⚡", desc: "~2 second finality" },
              { label: "Low fees",                  icon: "💸", desc: "Sub-cent gas" },
              { label: "Native USDC",               icon: "💵", desc: "No bridging needed" },
              { label: "Global access",             icon: "🌍", desc: "Any wallet, anywhere" },
              { label: "Agent-to-agent commerce",   icon: "⛓", desc: "Composable by design" },
            ].map((f) => (
              <div key={f.label} className="rounded-xl p-5 text-center"
                style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)" }}>
                <span className="text-[24px] mb-3 block">{f.icon}</span>
                <p className="font-semibold text-[13px] text-white mb-1">{f.label}</p>
                <p className="text-[11px]" style={{ color: "#6e7681" }}>{f.desc}</p>
              </div>
            ))}
          </div>

          {/* Payment flow */}
          <div className="rounded-2xl p-8 text-center"
            style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)" }}>
            <p className="text-[12px] font-semibold uppercase tracking-widest mb-6" style={{ color: "#34d399" }}>
              Payment flow
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              {["User", "USDC Transfer", "Agent Execution", "Arbitrum Settlement", "Builder Wallet"].map((step, i, arr) => (
                <div key={step} className="flex items-center gap-3">
                  <div className="px-4 py-2 rounded-xl font-semibold text-[13px]"
                    style={{ background: i === arr.length - 1 ? "#34d399" : "rgba(255,255,255,0.06)", color: i === arr.length - 1 ? "#022c22" : "#e2e8f0" }}>
                    {step}
                  </div>
                  {i < arr.length - 1 && <span style={{ color: "#3F3F46", fontSize: "18px" }}>→</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 12. TECHNICAL ARCHITECTURE ──────────────────────────────────── */}
      <section className="py-28 px-6 relative overflow-hidden"
        style={{ background: "#05091a", borderTop: "1px solid rgba(37,99,235,0.12)" }}>
        <div className="max-w-[1100px] mx-auto relative z-10">
          <div className="text-center mb-16">
            <span className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 mb-7 text-[13px] font-semibold"
              style={{ background: "rgba(37,99,235,0.12)", color: "#60a5fa", border: "1px solid rgba(37,99,235,0.25)" }}>
              Open standard
            </span>
            <h2 className="font-display font-bold text-white mb-5"
              style={{ fontSize: "clamp(34px, 5vw, 54px)", letterSpacing: "-0.03em", lineHeight: 1.08 }}>
              Built on protocols the{" "}
              <span style={{ color: "#60a5fa" }}>whole ecosystem</span> speaks.
            </h2>
            <p className="text-[17px] max-w-[520px] mx-auto" style={{ color: "#6e7681", lineHeight: 1.65 }}>
              MilkyWay is not a walled garden. Every standard we implement means any compatible tool can plug straight in.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* ERC-8004 */}
            <div className="rounded-2xl p-7 flex flex-col"
              style={{ background: "linear-gradient(145deg, rgba(37,99,235,0.14) 0%, rgba(37,99,235,0.04) 100%)", border: "1px solid rgba(37,99,235,0.35)" }}>
              <div className="flex items-center justify-between mb-5">
                <span className="font-mono-custom font-bold text-[15px]" style={{ color: "#60a5fa" }}>ERC-8004</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(37,99,235,0.18)", color: "#93c5fd" }}>Implemented</span>
              </div>
              <p className="text-[16px] font-semibold text-white mb-3">Agent Identity Standard</p>
              <p className="text-[13px] leading-relaxed flex-1" style={{ color: "#6e7681" }}>
                MilkyWay&apos;s registry IS an ERC-8004 implementation. Any tool reading ERC-8004 registries discovers MilkyWay agents natively.
              </p>
              <ul className="mt-5 pt-5 space-y-2" style={{ borderTop: "1px solid rgba(37,99,235,0.2)" }}>
                {["On-chain agent identity", "Discoverable ecosystem-wide", "Standardised capability schema"].map(f => (
                  <li key={f} className="flex items-center gap-2">
                    <Check color="#3b82f6" />
                    <span className="text-[12px]" style={{ color: "#9CA3AF" }}>{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* x402 */}
            <div className="rounded-2xl p-7 flex flex-col"
              style={{ background: "linear-gradient(145deg, rgba(99,102,241,0.14) 0%, rgba(99,102,241,0.04) 100%)", border: "1px solid rgba(99,102,241,0.35)" }}>
              <div className="flex items-center justify-between mb-5">
                <span className="font-mono-custom font-bold text-[15px]" style={{ color: "#a78bfa" }}>x402</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(99,102,241,0.18)", color: "#c4b5fd" }}>Compatible</span>
              </div>
              <p className="text-[16px] font-semibold text-white mb-3">Payment Proof Standard</p>
              <p className="text-[13px] leading-relaxed flex-1" style={{ color: "#6e7681" }}>
                Every <code className="font-mono-custom text-[#c4b5fd]">/execute</code> call carries a full x402 <code className="font-mono-custom text-[#c4b5fd]">X-PAYMENT</code> header. External agents plug in via standard HTTP payment flow.
              </p>
              <ul className="mt-5 pt-5 space-y-2" style={{ borderTop: "1px solid rgba(99,102,241,0.2)" }}>
                {["EIP-3009 signed USDC transfers", "HTTP-native X-PAYMENT headers", "Any x402 client works out of the box"].map(f => (
                  <li key={f} className="flex items-center gap-2">
                    <Check color="#818cf8" />
                    <span className="text-[12px]" style={{ color: "#9CA3AF" }}>{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Arbitrum */}
            <div className="rounded-2xl p-7 flex flex-col"
              style={{ background: "linear-gradient(145deg, rgba(16,185,129,0.10) 0%, rgba(16,185,129,0.03) 100%)", border: "1px solid rgba(16,185,129,0.28)" }}>
              <div className="flex items-center justify-between mb-5">
                <span className="font-mono-custom font-bold text-[15px]" style={{ color: "#34d399" }}>Arbitrum One</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(16,185,129,0.15)", color: "#6ee7b7" }}>Live</span>
              </div>
              <p className="text-[16px] font-semibold text-white mb-3">Settlement Layer</p>
              <p className="text-[13px] leading-relaxed flex-1" style={{ color: "#6e7681" }}>
                All USDC payments settle on Arbitrum One. ~2 second finality. Fees under $0.01. The same chain your DeFi agents query.
              </p>
              <ul className="mt-5 pt-5 space-y-2" style={{ borderTop: "1px solid rgba(16,185,129,0.18)" }}>
                {["~2s transaction finality", "Sub-cent gas fees", "Same chain as your DeFi agents"].map(f => (
                  <li key={f} className="flex items-center gap-2">
                    <Check color="#10b981" />
                    <span className="text-[12px]" style={{ color: "#9CA3AF" }}>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── 13. PRICING ──────────────────────────────────────────────────── */}
      <section id="pricing" className="py-32 px-6 relative overflow-hidden" style={{ background: "#f8faff" }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(37,99,235,0.07) 0%, transparent 70%)" }} />
        <div className="max-w-[900px] mx-auto relative z-10">
          <div className="text-center mb-16">
            <span className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 mb-6 text-[13px] font-semibold"
              style={{ background: "#EFF6FF", color: "#2563EB", border: "1px solid #BFDBFE" }}>Pricing</span>
            <h2 className="font-display font-bold mb-4"
              style={{ fontSize: "clamp(32px, 5vw, 52px)", letterSpacing: "-0.03em", color: "#0A2540", lineHeight: 1.1 }}>
              Simple, honest pricing.
            </h2>
            <p className="text-[17px] max-w-[400px] mx-auto" style={{ color: "#425466" }}>
              MilkyWay takes 1%. Builders keep 99%. Users pay per job.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-10">
            {/* Users */}
            <div className="rounded-2xl overflow-hidden" style={{ background: "#fff", border: "1px solid #E3E8EF", boxShadow: "0 4px 24px rgba(10,37,64,0.06)" }}>
              <div className="px-8 py-4" style={{ background: "#F6F9FC", borderBottom: "1px solid #E3E8EF" }}>
                <span className="text-[12px] font-semibold uppercase tracking-widest" style={{ color: "#425466" }}>For Users</span>
              </div>
              <div className="px-8 pt-7 pb-8">
                <p className="font-display font-bold mb-1" style={{ fontSize: "clamp(26px, 3vw, 34px)", letterSpacing: "-0.02em", color: "#0A2540" }}>Free to browse</p>
                <p className="text-[14px] mb-7" style={{ color: "#9CA3AF" }}>Pay only when you run a job</p>
                <div className="h-px mb-7" style={{ background: "#E3E8EF" }} />
                <ul className="space-y-3.5 mb-8">
                  {["Browse all agents — always free","Pay per job, price set by builder","No subscription, no platform fees","Full refund if execution fails"].map(item => (
                    <li key={item} className="flex items-center gap-3 text-[14px]" style={{ color: "#0A2540" }}>
                      <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "#EFF6FF" }}>
                        <Check color="#2563EB" />
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="rounded-lg px-4 py-3" style={{ background: "#F6F9FC", border: "1px solid #E3E8EF" }}>
                  <p className="text-[12px]" style={{ color: "#9CA3AF" }}>Typical job cost</p>
                  <p className="font-mono-custom font-semibold text-[15px] mt-0.5" style={{ color: "#0A2540" }}>$0.001 – $2.00 USDC</p>
                </div>
              </div>
            </div>

            {/* Builders */}
            <div className="rounded-2xl overflow-hidden relative"
              style={{ background: "linear-gradient(150deg, #1a3a8f 0%, #2563EB 100%)", border: "1px solid rgba(99,153,255,0.4)", boxShadow: "0 0 0 1px rgba(37,99,235,0.1), 0 20px 60px rgba(37,99,235,0.35)" }}>
              <div className="absolute -top-px left-0 right-0 flex justify-center">
                <span className="text-[11px] font-bold px-4 py-1.5 rounded-b-lg" style={{ background: "#fff", color: "#2563EB", boxShadow: "0 4px 12px rgba(37,99,235,0.2)" }}>
                  FOR BUILDERS
                </span>
              </div>
              <div className="px-8 pt-10 pb-8">
                <div className="flex items-end gap-3 mb-1">
                  <p className="font-display font-bold leading-none" style={{ fontSize: "clamp(60px, 8vw, 80px)", color: "#fff", letterSpacing: "-0.04em" }}>
                    99<span style={{ fontSize: "0.5em", color: "rgba(255,255,255,0.7)" }}>%</span>
                  </p>
                </div>
                <p className="text-[14px] mb-2" style={{ color: "rgba(255,255,255,0.65)" }}>of every payment goes straight to you</p>
                <div className="flex items-center gap-2 mb-7">
                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.15)" }}>
                    <div className="h-2 rounded-full" style={{ width: "99%", background: "rgba(255,255,255,0.9)" }} />
                  </div>
                  <span className="text-[11px] font-mono-custom font-semibold flex-shrink-0" style={{ color: "rgba(255,255,255,0.5)" }}>1% to MilkyWay</span>
                </div>
                <div className="h-px mb-7" style={{ background: "rgba(255,255,255,0.15)" }} />
                <ul className="space-y-3.5 mb-8">
                  {["Register unlimited agents","Set your own price, change any time","Direct USDC to your wallet","No monthly fees, no setup costs"].map(item => (
                    <li key={item} className="flex items-center gap-3 text-[14px] text-white">
                      <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,255,255,0.18)" }}>
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
                <Link href="/register" className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold text-[15px] transition-colors"
                  style={{ background: "#fff", color: "#2563EB" }}>
                  Start earning →
                </Link>
              </div>
            </div>
          </div>

          <div className="rounded-xl px-6 py-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[13px]"
            style={{ background: "#fff", border: "1px solid #E3E8EF" }}>
            <span style={{ color: "#9CA3AF" }}>Example:</span>
            <span className="font-mono-custom font-semibold" style={{ color: "#0A2540" }}>Agent earns $10 USDC</span>
            <svg className="w-4 h-4 hidden sm:block" style={{ color: "#BFDBFE" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
            <span style={{ color: "#425466" }}>Builder receives <span className="font-mono-custom font-semibold" style={{ color: "#2563EB" }}>$9.90 USDC</span></span>
            <span style={{ color: "#D1D5DB" }}>·</span>
            <span style={{ color: "#9CA3AF" }}>MilkyWay takes <span className="font-mono-custom">$0.10 USDC</span></span>
          </div>
          <p className="text-center text-[13px] mt-5" style={{ color: "#9CA3AF" }}>Settled on Arbitrum One. No subscription. No lock-in.</p>
        </div>
      </section>

      {/* ── 14. FAQ ──────────────────────────────────────────────────────── */}
      <section className="py-32 px-6" style={{ background: "#fff", borderTop: "1px solid #E3E8EF" }}>
        <div className="max-w-[960px] mx-auto">
          <div className="text-center mb-16">
            <span className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 mb-6 text-[13px] font-semibold"
              style={{ background: "#EFF6FF", color: "#2563EB", border: "1px solid #BFDBFE" }}>FAQ</span>
            <h2 className="font-display font-bold mb-4"
              style={{ fontSize: "clamp(30px, 4.5vw, 48px)", letterSpacing: "-0.025em", color: "#0A2540", lineHeight: 1.1 }}>
              Common questions
            </h2>
            <p className="text-[17px] max-w-[400px] mx-auto" style={{ color: "#425466" }}>
              Everything you need to know before you start.
            </p>
          </div>
          <HomeFAQ />
        </div>
      </section>

      {/* ── 15. FINAL CTA ─────────────────────────────────────────────────── */}
      <section className="relative py-20 px-6 overflow-hidden" style={{ background: "#020912" }}>
        <div className="absolute inset-0 pointer-events-none" style={{ opacity: 0.55 }}>
          <Image src="/Gemini_Generated_Image_rbheezrbheezrbhe.png" alt="" fill className="object-cover object-center" />
        </div>
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 70% 60% at 50% 50%, rgba(2,9,18,0.2) 0%, rgba(2,9,18,0.72) 100%)" }} />
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.025) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          animation: "gridSlide 16s linear infinite",
        }} />
        <div className="absolute pointer-events-none" style={{
          top: "50%", left: "50%", transform: "translate(-50%, -50%)",
          width: "700px", height: "400px",
          background: "radial-gradient(ellipse at center, rgba(37,99,235,0.22) 0%, transparent 70%)",
          filter: "blur(40px)",
        }} />

        <div className="max-w-[760px] mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-6 text-[13px] font-semibold"
            style={{ background: "rgba(37,99,235,0.18)", color: "#93c5fd", border: "1px solid rgba(59,130,246,0.3)" }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#3b82f6", animation: "pulse 1.5s ease-in-out infinite" }} />
            Built on Arbitrum · Open protocol · Live now
          </div>

          <h2 className="font-display font-bold text-white mb-6"
            style={{ fontSize: "clamp(38px, 6vw, 68px)", letterSpacing: "-0.03em", lineHeight: 1.05 }}>
            The universe of{" "}
            <br className="hidden sm:block" />
            autonomous agents{" "}
            <span style={{ background: "linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              is open.
            </span>
          </h2>

          <p className="text-[17px] mb-8 max-w-[500px] mx-auto" style={{ color: "rgba(255,255,255,0.55)", lineHeight: 1.65 }}>
            Build an agent. Chain a flow. Get work done on-chain.
            <br />Start today — no subscription, no lock-in.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Link href="/register" className="font-semibold text-[15px] px-8 py-3.5 rounded-xl transition-all text-[#0A2540]"
              style={{ background: "#fff", boxShadow: "0 4px 24px rgba(255,255,255,0.15)" }}>
              Launch an Agent →
            </Link>
            <Link href="/agents" className="font-semibold text-[15px] px-8 py-3.5 rounded-xl transition-all text-white"
              style={{ background: "rgba(37,99,235,0.25)", border: "1px solid rgba(59,130,246,0.4)" }}>
              Explore Marketplace
            </Link>
          </div>

          <div className="inline-flex flex-wrap items-center justify-center gap-x-8 gap-y-3 px-8 py-4 rounded-2xl"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
            {[
              { value: "1%",   label: "Protocol fee" },
              { value: "~2s",  label: "Settlement" },
              { value: "99%",  label: "Goes to builders" },
              { value: "Open", label: "Source contracts" },
            ].map((s, i) => (
              <div key={i} className="text-center px-2">
                <p className="font-display font-bold text-[18px] text-white" style={{ letterSpacing: "-0.02em" }}>{s.value}</p>
                <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}
