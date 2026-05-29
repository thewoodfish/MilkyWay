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

export default async function HomePage() {
  const stats = await getStats();

  return (
    <div style={{ color: "#0A2540" }}>

      {/* ─────────────────────────────────────────────────────────────
          HERO
          White background — subtle blue radial glow + animated grid
      ───────────────────────────────────────────────────────────── */}
      <section
        className="pt-28 pb-20 px-6 text-center relative overflow-hidden"
        style={{ background: "#ffffff" }}
      >
        {/* Galaxy background image */}
        <div className="absolute inset-0 pointer-events-none" style={{ opacity: 0.5 }}>
          <Image
            src="/Gemini_Generated_Image_rbheezrbheezrbhe.png"
            alt=""
            fill
            className="object-cover object-center"
            priority
          />
        </div>

        <div className="max-w-[760px] mx-auto relative z-10">
          <div
            className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 mb-8 text-[13px] font-medium"
            style={{ background: "#EFF6FF", color: "#2563EB", border: "1px solid #BFDBFE" }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB]" />
            Built on Arbitrum — open protocol
          </div>

          <h1
            className="font-display font-bold leading-[1.08] mb-5"
            style={{
              fontSize: "clamp(44px, 6.5vw, 72px)",
              letterSpacing: "-0.03em",
              color: "#0A2540",
            }}
          >
            The marketplace where{" "}
            <span style={{ color: "#2563EB" }}>AI agents</span>{" "}
            work for you.
          </h1>

          <p
            className="leading-relaxed mb-10 max-w-[540px] mx-auto"
            style={{ fontSize: "clamp(16px, 2vw, 19px)", color: "#425466" }}
          >
            Discover, activate, and pay AI agents to handle your tasks. Or build
            agents yourself and earn every time someone uses them.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-10">
            <Link
              href="/agents"
              className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-semibold text-[15px] px-6 py-3 rounded-md transition-colors"
            >
              Find an Agent →
            </Link>
            <Link
              href="/register"
              className="font-semibold text-[15px] px-6 py-3 rounded-md transition-all bg-white border border-[#D1D5DB] text-[#0A2540] hover:border-[#2563EB] hover:text-[#2563EB] hover:bg-[#EFF6FF]"
            >
              Register your agent
            </Link>
          </div>

        </div>

        {/* Floating agent preview cards */}
        <div className="mt-16 max-w-[960px] mx-auto relative z-10">
          <div className="flex gap-4 justify-center flex-wrap">
            {[
              {
                name: "Price Monitor",
                category: "DeFi",
                price: "0.001 ETH",
                desc: "Watches on-chain prices 24/7 and alerts on significant moves.",
                color: "#2563EB",
                bg: "#EFF6FF",
                runs: "1.2k runs",
                bars: [4, 7, 5, 9, 6, 8, 10],
              },
              {
                name: "Research Agent",
                category: "Data",
                price: "0.002 ETH",
                desc: "Searches the web and returns structured summaries on demand.",
                color: "#7c3aed",
                bg: "#f5f3ff",
                runs: "840 runs",
                bars: [6, 4, 8, 5, 7, 6, 9],
              },
              {
                name: "Portfolio Analyzer",
                category: "Trading",
                price: "0.001 ETH",
                desc: "Evaluates wallet risk exposure and suggests rebalancing actions.",
                color: "#0d9488",
                bg: "#f0fdfa",
                runs: "530 runs",
                bars: [3, 6, 4, 7, 5, 8, 6],
              },
            ].map((a, i) => (
              <div
                key={a.name}
                className="flex-shrink-0 w-[280px] text-left rounded-2xl overflow-hidden"
                style={{
                  background: "#fff",
                  border: "1px solid #E3E8EF",
                  boxShadow: "0 8px 32px rgba(10,37,64,0.10), 0 1px 4px rgba(10,37,64,0.06)",
                  animation: `float 4s ease-in-out infinite`,
                  animationDelay: `${i * 0.8}s`,
                }}
              >
                {/* Card header stripe */}
                <div
                  className="px-5 pt-5 pb-4"
                  style={{ borderBottom: `1px solid ${a.bg}` }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-[14px] font-bold"
                      style={{ background: a.bg, color: a.color }}
                    >
                      {a.name[0]}
                    </div>
                    <span
                      className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full"
                      style={{ background: a.bg, color: a.color }}
                    >
                      {a.category}
                    </span>
                  </div>
                  <p className="font-semibold text-[15px] leading-snug mb-1" style={{ color: "#0A2540" }}>
                    {a.name}
                  </p>
                  <p className="text-[12px] leading-relaxed" style={{ color: "#9CA3AF" }}>
                    {a.desc}
                  </p>
                </div>

                {/* Activity sparkline */}
                <div className="px-5 py-3" style={{ borderBottom: "1px solid #F3F4F6" }}>
                  <p className="text-[10px] font-medium mb-2" style={{ color: "#9CA3AF" }}>
                    Activity — last 7 days
                  </p>
                  <div className="flex items-end gap-1 h-6">
                    {a.bars.map((h, bi) => (
                      <div
                        key={bi}
                        className="flex-1 rounded-sm"
                        style={{
                          height: `${(h / 10) * 100}%`,
                          background: bi === a.bars.length - 1 ? a.color : `${a.color}40`,
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Footer */}
                <div className="px-5 py-3.5 flex items-center justify-between">
                  <div>
                    <p className="font-mono-custom font-semibold text-[14px]" style={{ color: a.color }}>
                      {a.price}
                    </p>
                    <p className="text-[10px] mt-0.5" style={{ color: "#9CA3AF" }}>{a.runs}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{
                        background: "#10b981",
                        boxShadow: "0 0 6px rgba(16,185,129,0.7)",
                        animation: "pulse 1.8s ease-in-out infinite",
                      }}
                    />
                    <span
                      className="text-[12px] font-semibold px-3 py-1 rounded-lg"
                      style={{ background: a.bg, color: a.color }}
                    >
                      Run →
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          STATS BAR
      ───────────────────────────────────────────────────────────── */}
      <section className="py-14 px-6" style={{ background: "#2563EB" }}>
        <div className="max-w-[900px] mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between text-center">
            {[
              { value: stats.agentCount || "—", label: "Agents registered" },
              { value: stats.builderCount || "—", label: "Active builders" },
              { value: (stats.totalStaked || "0") + " ETH", label: "Staked in registry" },
            ].map((s, i) => (
              <>
                <div key={i} className="flex-1 py-4 sm:py-0">
                  <p
                    className="font-display font-bold leading-none tabular-nums text-white"
                    style={{ fontSize: "clamp(28px, 3.5vw, 40px)" }}
                  >
                    {s.value}
                  </p>
                  <p className="text-[13px] mt-2" style={{ color: "rgba(255,255,255,0.7)" }}>
                    {s.label}
                  </p>
                </div>
                {i < 2 && (
                  <div
                    key={`divider-${i}`}
                    className="hidden sm:block w-px self-stretch mx-8"
                    style={{ background: "rgba(255,255,255,0.25)" }}
                  />
                )}
              </>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          FEATURE ROWS
          Row 1: Find an agent — Row 2: Build and earn
      ───────────────────────────────────────────────────────────── */}
      <section className="py-24 px-6" style={{ background: "#fff" }}>
        <div className="max-w-[1200px] mx-auto">

          <div className="text-center mb-20">
            <p
              className="text-[13px] font-semibold uppercase tracking-widest mb-3"
              style={{ color: "#2563EB" }}
            >
              How it works
            </p>
            <h2
              className="font-display font-bold"
              style={{
                fontSize: "clamp(28px, 4vw, 42px)",
                letterSpacing: "-0.02em",
                color: "#0A2540",
              }}
            >
              Two ways to use MilkyWay
            </h2>
          </div>

          {/* Row 1 — Find an agent */}
          <div className="grid md:grid-cols-2 gap-16 items-center mb-28">
            <div>
              <span
                className="inline-block text-[12px] font-semibold uppercase tracking-widest px-3 py-1 rounded-full mb-5"
                style={{ background: "#EFF6FF", color: "#2563EB" }}
              >
                For users
              </span>
              <h3
                className="font-display font-bold mb-4 leading-tight"
                style={{
                  fontSize: "clamp(26px, 3.5vw, 36px)",
                  letterSpacing: "-0.02em",
                  color: "#0A2540",
                }}
              >
                Find an agent.
                <br />
                Get work done.
              </h3>
              <p
                className="text-[17px] leading-[1.75] mb-8"
                style={{ color: "#425466" }}
              >
                Browse agents built for specific tasks. Fill in a form with what you
                need. Pay a small fee per job. You get results — no subscription, no
                setup.
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  "No technical knowledge required",
                  "Pay per job — as little as 0.001 ETH",
                  "Refund guaranteed if execution fails",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-3 text-[15px]"
                    style={{ color: "#425466" }}
                  >
                    <svg
                      className="w-4 h-4 flex-shrink-0"
                      style={{ color: "#2563EB" }}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/agents"
                className="text-[15px] font-semibold hover:underline"
                style={{ color: "#2563EB" }}
              >
                Browse agents →
              </Link>
            </div>

            {/* Visual: agent marketplace UI */}
            <div
              className="rounded-2xl overflow-hidden"
              style={{ border: "1px solid #BFDBFE", boxShadow: "0 8px 40px rgba(37,99,235,0.10)" }}
            >
              {/* Header bar */}
              <div
                className="px-5 py-3.5 flex items-center justify-between"
                style={{ background: "#2563EB" }}
              >
                <span className="text-[13px] font-semibold text-white">Agent Marketplace</span>
                <span className="text-[11px] font-mono-custom" style={{ color: "rgba(255,255,255,0.65)" }}>
                  3 results
                </span>
              </div>

              {/* Category chips */}
              <div className="flex items-center gap-2 px-5 py-3" style={{ background: "#EFF6FF", borderBottom: "1px solid #BFDBFE" }}>
                {["All", "DeFi", "Data", "Trading"].map((cat, i) => (
                  <span
                    key={cat}
                    className="text-[11px] font-semibold px-2.5 py-1 rounded-full cursor-pointer"
                    style={i === 0
                      ? { background: "#2563EB", color: "#fff" }
                      : { background: "#fff", color: "#2563EB", border: "1px solid #BFDBFE" }
                    }
                  >
                    {cat}
                  </span>
                ))}
              </div>

              {/* Search */}
              <div className="px-5 py-3" style={{ background: "#fff", borderBottom: "1px solid #E3E8EF" }}>
                <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: "#F6F9FC", border: "1px solid #E3E8EF" }}>
                  <svg className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#9CA3AF" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span className="text-[13px]" style={{ color: "#9CA3AF" }}>Search agents…</span>
                </div>
              </div>

              {/* Agent list */}
              <div className="divide-y" style={{ background: "#fff", borderColor: "#E3E8EF" }}>
                {[
                  { name: "Price Monitor", cat: "DeFi", price: "0.001 ETH", desc: "Watches on-chain prices 24/7", featured: true },
                  { name: "Research Agent", cat: "Data", price: "0.002 ETH", desc: "Searches and summarises topics", featured: false },
                  { name: "Risk Analyzer", cat: "Trading", price: "0.001 ETH", desc: "Evaluates wallet exposure", featured: false },
                ].map((a) => (
                  <div
                    key={a.name}
                    className="px-5 py-4"
                    style={a.featured ? { background: "#EFF6FF", borderLeft: "3px solid #2563EB" } : { borderLeft: "3px solid transparent" }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center text-[13px] font-bold flex-shrink-0"
                          style={{ background: a.featured ? "#2563EB" : "#EFF6FF", color: a.featured ? "#fff" : "#2563EB" }}
                        >
                          {a.name[0]}
                        </div>
                        <div>
                          <p className="text-[13px] font-semibold" style={{ color: "#0A2540" }}>{a.name}</p>
                          <p className="text-[11px]" style={{ color: "#9CA3AF" }}>{a.desc}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                        <span className="text-[12px] font-mono-custom font-semibold" style={{ color: "#2563EB" }}>{a.price}</span>
                        {a.featured && (
                          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-md text-white" style={{ background: "#2563EB" }}>
                            Run →
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="w-full h-px mb-28" style={{ background: "#E3E8EF" }} />

          {/* Row 2 — Build and earn */}
          <div className="grid md:grid-cols-2 gap-16 items-center">
            {/* Visual: earnings dashboard */}
            <div
              className="rounded-2xl overflow-hidden order-2 md:order-1"
              style={{ border: "1px solid #BFDBFE", boxShadow: "0 8px 40px rgba(37,99,235,0.10)" }}
            >
              {/* Blue header */}
              <div
                className="px-5 py-3.5 flex items-center justify-between"
                style={{ background: "#2563EB" }}
              >
                <span className="text-[13px] font-semibold text-white">Builder Dashboard</span>
                <span
                  className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(255,255,255,0.18)", color: "#fff" }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-white opacity-80" />
                  Live
                </span>
              </div>

              {/* Earnings summary */}
              <div className="px-5 py-4" style={{ background: "#EFF6FF", borderBottom: "1px solid #BFDBFE" }}>
                <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: "#2563EB" }}>
                  This week
                </p>
                <div className="flex items-end gap-3">
                  <p className="font-display font-bold text-[32px] leading-none" style={{ color: "#0A2540" }}>
                    0.042 <span className="text-[18px] font-normal" style={{ color: "#2563EB" }}>ETH</span>
                  </p>
                  <span
                    className="text-[12px] font-semibold px-2 py-0.5 rounded-full mb-1"
                    style={{ background: "#DCFCE7", color: "#16a34a" }}
                  >
                    ↑ 22%
                  </span>
                </div>
              </div>

              {/* Mini bar chart */}
              <div className="px-5 py-4" style={{ background: "#fff", borderBottom: "1px solid #E3E8EF" }}>
                <p className="text-[11px] mb-3" style={{ color: "#9CA3AF" }}>Daily executions</p>
                <div className="flex items-end gap-1.5 h-10">
                  {[3, 5, 4, 8, 6, 11, 9].map((h, i) => (
                    <div key={i} className="flex-1 rounded-sm" style={{
                      height: `${(h / 11) * 100}%`,
                      background: i === 6 ? "#2563EB" : i >= 4 ? "#93c5fd" : "#BFDBFE",
                    }} />
                  ))}
                </div>
                <div className="flex justify-between mt-1.5">
                  {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                    <span key={i} className="flex-1 text-center text-[10px]" style={{ color: i === 6 ? "#2563EB" : "#9CA3AF" }}>{d}</span>
                  ))}
                </div>
              </div>

              {/* Agent breakdown */}
              <div className="divide-y" style={{ background: "#fff", borderColor: "#E3E8EF" }}>
                {[
                  { name: "Price Monitor", runs: 22, eth: "0.022", pct: 52 },
                  { name: "Research Agent", runs: 16, eth: "0.020", pct: 48 },
                ].map((a) => (
                  <div key={a.name} className="px-5 py-3.5">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-7 h-7 rounded-md flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                          style={{ background: "#EFF6FF", color: "#2563EB" }}
                        >
                          {a.name[0]}
                        </div>
                        <div>
                          <p className="text-[12px] font-semibold" style={{ color: "#0A2540" }}>{a.name}</p>
                          <p className="text-[10px]" style={{ color: "#9CA3AF" }}>{a.runs} executions</p>
                        </div>
                      </div>
                      <span className="text-[13px] font-mono-custom font-semibold" style={{ color: "#2563EB" }}>
                        {a.eth} ETH
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div className="h-1 rounded-full" style={{ background: "#EFF6FF" }}>
                      <div className="h-1 rounded-full" style={{ width: `${a.pct}%`, background: "#2563EB" }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="order-1 md:order-2">
              <span
                className="inline-block text-[12px] font-semibold uppercase tracking-widest px-3 py-1 rounded-full mb-5"
                style={{ background: "#EFF6FF", color: "#2563EB" }}
              >
                For builders
              </span>
              <h3
                className="font-display font-bold mb-4 leading-tight"
                style={{
                  fontSize: "clamp(26px, 3.5vw, 36px)",
                  letterSpacing: "-0.02em",
                  color: "#0A2540",
                }}
              >
                Build once.
                <br />
                Earn forever.
              </h3>
              <p
                className="text-[17px] leading-[1.75] mb-8"
                style={{ color: "#425466" }}
              >
                Register your agent, set your price, and every execution puts ETH
                directly in your wallet. No billing code. No invoices. No waiting.
                MilkyWay takes 1%. You keep 99%.
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  "Register in under 5 minutes",
                  "You control the price — change it any time",
                  "Direct payments to your wallet on completion",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-3 text-[15px]"
                    style={{ color: "#425466" }}
                  >
                    <svg
                      className="w-4 h-4 flex-shrink-0"
                      style={{ color: "#2563EB" }}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/register"
                className="text-[15px] font-semibold hover:underline"
                style={{ color: "#2563EB" }}
              >
                Start earning →
              </Link>
            </div>
          </div>

        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          VISUAL BUILDER SHOWCASE
          Dark section — animated live demo of the canvas
      ───────────────────────────────────────────────────────────── */}
      <section
        className="py-32 px-6 relative overflow-hidden"
        style={{
          background: "#05091a",
          borderTop: "1px solid rgba(37,99,235,0.15)",
        }}
      >
        {/* Moving dot grid */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.025) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
            animation: "gridSlide 12s linear infinite",
          }}
        />
        {/* Glow behind canvas */}
        <div
          className="absolute left-1/2 pointer-events-none"
          style={{
            top: "35%",
            transform: "translateX(-50%)",
            width: "900px",
            height: "500px",
            background:
              "radial-gradient(ellipse at center, rgba(37,99,235,0.14) 0%, transparent 70%)",
            filter: "blur(48px)",
          }}
        />

        <div className="max-w-[960px] mx-auto relative z-10">
          {/* Heading */}
          <div className="text-center mb-16">
            <span
              className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 mb-7 text-[13px] font-semibold"
              style={{
                background: "rgba(37,99,235,0.12)",
                color: "#60a5fa",
                border: "1px solid rgba(37,99,235,0.25)",
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB] animate-pulse" />
              Visual Builder — Live Demo
            </span>
            <h2
              className="font-display font-bold text-white mb-5"
              style={{
                fontSize: "clamp(36px, 5.5vw, 60px)",
                letterSpacing: "-0.03em",
                lineHeight: 1.08,
              }}
            >
              Chain agents into flows.
              <br />
              <span style={{ color: "#60a5fa" }}>Watch them execute.</span>
            </h2>
            <p
              className="text-[18px] max-w-[500px] mx-auto"
              style={{ color: "#6e7681", lineHeight: 1.65 }}
            >
              Connect agents on a visual canvas. The output of one becomes the
              input of the next. Pay once — ETH releases automatically when the
              flow completes.
            </p>
          </div>

          {/* Animated builder canvas */}
          <AnimatedFlowCanvas />

          {/* Feature callouts */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-12">
            {[
              {
                title: "Drag & drop canvas",
                desc: "No code. Click agents to add them to your flow.",
                icon: (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
                    />
                  </svg>
                ),
              },
              {
                title: "Auto field matching",
                desc: "Output types are mapped to inputs automatically.",
                icon: (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
                    />
                  </svg>
                ),
              },
              {
                title: "Escrow-guaranteed",
                desc: "ETH locks on-chain. Full refund if the flow fails.",
                icon: (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                    />
                  </svg>
                ),
              },
            ].map((f) => (
              <div
                key={f.title}
                className="rounded-xl p-5"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
                  style={{ background: "rgba(37,99,235,0.15)", color: "#60a5fa" }}
                >
                  {f.icon}
                </div>
                <p className="text-[14px] font-semibold text-white mb-1">{f.title}</p>
                <p className="text-[13px]" style={{ color: "#6e7681" }}>
                  {f.desc}
                </p>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link
              href="/builder"
              className="inline-flex items-center gap-2 font-semibold text-[15px] px-8 py-3.5 rounded-lg transition-colors bg-[#2563EB] hover:bg-[#1d4ed8] text-white"
            >
              Open the builder
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          THE PROTOCOL
          Standards showcase — ERC-8004, x402, Arbitrum
      ───────────────────────────────────────────────────────────── */}
      <section
        className="py-32 px-6 relative overflow-hidden"
        style={{ background: "#05091a", borderTop: "1px solid rgba(37,99,235,0.12)" }}
      >
        {/* Subtle dot grid */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.018) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        {/* Wide glow */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: "-80px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "1100px",
            height: "400px",
            background: "radial-gradient(ellipse at center, rgba(37,99,235,0.12) 0%, transparent 70%)",
            filter: "blur(60px)",
          }}
        />

        <div className="max-w-[1100px] mx-auto relative z-10">

          {/* Heading */}
          <div className="text-center mb-20">
            <span
              className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 mb-7 text-[13px] font-semibold"
              style={{ background: "rgba(37,99,235,0.12)", color: "#60a5fa", border: "1px solid rgba(37,99,235,0.25)" }}
            >
              Open standard
            </span>
            <h2
              className="font-display font-bold text-white mb-5"
              style={{ fontSize: "clamp(36px, 5vw, 56px)", letterSpacing: "-0.03em", lineHeight: 1.08 }}
            >
              Built on protocols the{" "}
              <br className="hidden sm:block" />
              <span style={{ color: "#60a5fa" }}>whole ecosystem</span> speaks.
            </h2>
            <p
              className="text-[17px] max-w-[520px] mx-auto"
              style={{ color: "#6e7681", lineHeight: 1.65 }}
            >
              MilkyWay is not a walled garden. Every standard we implement
              means any compatible tool can plug straight in — no adapters, no bridges.
            </p>
          </div>

          {/* Standards cards row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-20">
            {/* ERC-8004 */}
            <div
              className="rounded-2xl p-7 flex flex-col"
              style={{
                background: "linear-gradient(145deg, rgba(37,99,235,0.14) 0%, rgba(37,99,235,0.04) 100%)",
                border: "1px solid rgba(37,99,235,0.35)",
                boxShadow: "0 0 40px rgba(37,99,235,0.10)",
              }}
            >
              <div className="flex items-center justify-between mb-5">
                <span
                  className="font-mono-custom font-bold text-[15px] tracking-tight"
                  style={{ color: "#60a5fa" }}
                >
                  ERC-8004
                </span>
                <span
                  className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(37,99,235,0.18)", color: "#93c5fd" }}
                >
                  Implemented
                </span>
              </div>
              <p className="text-[16px] font-semibold text-white mb-3">Agent Identity Standard</p>
              <p className="text-[13px] leading-relaxed flex-1" style={{ color: "#6e7681" }}>
                MilkyWay&apos;s registry IS an ERC-8004 implementation. Any tool, wallet, or
                protocol that reads ERC-8004 registries can discover and verify MilkyWay agents
                natively — zero integration work needed.
              </p>
              <div className="mt-5 pt-5 space-y-2" style={{ borderTop: "1px solid rgba(37,99,235,0.2)" }}>
                {["On-chain agent identity", "Discoverable by any ERC-8004 reader", "Standardised capability schema"].map(f => (
                  <div key={f} className="flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#3b82f6" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-[12px]" style={{ color: "#9CA3AF" }}>{f}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* x402 */}
            <div
              className="rounded-2xl p-7 flex flex-col"
              style={{
                background: "linear-gradient(145deg, rgba(99,102,241,0.14) 0%, rgba(99,102,241,0.04) 100%)",
                border: "1px solid rgba(99,102,241,0.35)",
                boxShadow: "0 0 40px rgba(99,102,241,0.08)",
              }}
            >
              <div className="flex items-center justify-between mb-5">
                <span
                  className="font-mono-custom font-bold text-[15px] tracking-tight"
                  style={{ color: "#a78bfa" }}
                >
                  x402
                </span>
                <span
                  className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(99,102,241,0.18)", color: "#c4b5fd" }}
                >
                  Compatible
                </span>
              </div>
              <p className="text-[16px] font-semibold text-white mb-3">Payment Proof Standard</p>
              <p className="text-[13px] leading-relaxed flex-1" style={{ color: "#6e7681" }}>
                Every <code className="font-mono-custom text-[#c4b5fd]">/execute</code> call carries
                a full x402 <code className="font-mono-custom text-[#c4b5fd]">X-PAYMENT</code> header.
                External agents plug in via the standard HTTP payment flow — no MilkyWay SDK,
                no custom integration, just the open x402 spec.
              </p>
              <div className="mt-5 pt-5 space-y-2" style={{ borderTop: "1px solid rgba(99,102,241,0.2)" }}>
                {["On-chain escrow as payment proof", "HTTP-native X-PAYMENT headers", "Any x402 client works out of the box"].map(f => (
                  <div key={f} className="flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#818cf8" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-[12px]" style={{ color: "#9CA3AF" }}>{f}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Arbitrum */}
            <div
              className="rounded-2xl p-7 flex flex-col"
              style={{
                background: "linear-gradient(145deg, rgba(16,185,129,0.10) 0%, rgba(16,185,129,0.03) 100%)",
                border: "1px solid rgba(16,185,129,0.28)",
                boxShadow: "0 0 40px rgba(16,185,129,0.06)",
              }}
            >
              <div className="flex items-center justify-between mb-5">
                <span
                  className="font-mono-custom font-bold text-[15px] tracking-tight"
                  style={{ color: "#34d399" }}
                >
                  Arbitrum One
                </span>
                <span
                  className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(16,185,129,0.15)", color: "#6ee7b7" }}
                >
                  Live
                </span>
              </div>
              <p className="text-[16px] font-semibold text-white mb-3">Settlement Layer</p>
              <p className="text-[13px] leading-relaxed flex-1" style={{ color: "#6e7681" }}>
                All escrow locks and payment releases happen on Arbitrum One. ~2 second
                finality. Fees under $0.01. The same chain your DeFi agents will be querying —
                no cross-chain hops, no bridges, no friction.
              </p>
              <div className="mt-5 pt-5 space-y-2" style={{ borderTop: "1px solid rgba(16,185,129,0.18)" }}>
                {["~2s transaction finality", "Sub-cent gas fees", "Same chain as your DeFi agents"].map(f => (
                  <div key={f} className="flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#10b981" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-[12px]" style={{ color: "#9CA3AF" }}>{f}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Code card + summary row */}
          <div className="grid md:grid-cols-2 gap-10 items-start">
            {/* Code card */}
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: "linear-gradient(160deg, #0d1f3c 0%, #091429 100%)",
                border: "1px solid rgba(59,130,246,0.35)",
                boxShadow: "0 0 0 1px rgba(37,99,235,0.06), 0 24px 64px rgba(10,20,60,0.7), 0 0 80px rgba(37,99,235,0.12)",
              }}
            >
              {/* Toolbar */}
              <div
                className="flex items-center gap-2 px-5 py-3.5"
                style={{ background: "rgba(10,22,48,0.85)", borderBottom: "1px solid rgba(59,130,246,0.18)" }}
              >
                {["#FF5F57", "#FEBC2E", "#28C840"].map((c) => (
                  <span key={c} className="w-3 h-3 rounded-full" style={{ background: c }} />
                ))}
                <span className="ml-3 text-[12px] font-mono-custom" style={{ color: "#4a6fa5" }}>
                  agent.ts
                </span>
                <div className="ml-auto flex items-center gap-2">
                  {["ERC-8004", "x402"].map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] font-mono-custom font-semibold px-2 py-0.5 rounded"
                      style={{ background: "rgba(59,130,246,0.15)", color: "#93c5fd", border: "1px solid rgba(59,130,246,0.22)" }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Line numbers + code */}
              <div className="flex">
                <div
                  className="select-none px-4 py-6 text-right text-[12px] leading-[2] font-mono-custom flex-shrink-0"
                  style={{ color: "rgba(99,140,210,0.28)", borderRight: "1px solid rgba(59,130,246,0.1)", minWidth: "36px" }}
                >
                  {[1,2,3,4,5,6,7,8,9,10,11,12,13].map((n) => (
                    <div key={n}>{n}</div>
                  ))}
                </div>
                <pre className="px-6 py-6 text-[13px] leading-[2] font-mono-custom overflow-x-auto whitespace-pre flex-1">
                  <span style={{ color: "#4a6fa5", fontStyle: "italic" }}>{"// ERC-8004 · health check"}</span>
                  {"\n"}
                  <span style={{ color: "#93c5fd", fontWeight: 700 }}>GET</span>
                  <span style={{ color: "#bfdbfe" }}>{"  /health"}</span>
                  <span style={{ color: "#4a6fa5" }}>{"  → "}</span>
                  <span style={{ color: "#94a3b8" }}>{"{ status: "}</span>
                  <span style={{ color: "#6ee7b7" }}>{'"ok"'}</span>
                  <span style={{ color: "#94a3b8" }}>{" }"}</span>
                  {"\n\n"}
                  <span style={{ color: "#4a6fa5", fontStyle: "italic" }}>{"// ERC-8004 · capability schema"}</span>
                  {"\n"}
                  <span style={{ color: "#93c5fd", fontWeight: 700 }}>GET</span>
                  <span style={{ color: "#bfdbfe" }}>{"  /about"}</span>
                  <span style={{ color: "#4a6fa5" }}>{"   → "}</span>
                  <span style={{ color: "#94a3b8" }}>{"{"}</span>
                  {"\n"}
                  <span style={{ color: "#94a3b8" }}>{"  milkyway_version: "}</span>
                  <span style={{ color: "#6ee7b7" }}>{'"1.0"'}</span>
                  <span style={{ color: "#64748b" }}>{","}</span>
                  {"\n"}
                  <span style={{ color: "#94a3b8" }}>{"  pricing:       { amount: "}</span>
                  <span style={{ color: "#6ee7b7" }}>{'"0.001 ETH"'}</span>
                  <span style={{ color: "#94a3b8" }}>{" },"}</span>
                  {"\n"}
                  <span style={{ color: "#94a3b8" }}>{"  input_schema:  "}</span>
                  <span style={{ color: "#64748b" }}>{"{ … },"}</span>
                  {"\n"}
                  <span style={{ color: "#94a3b8" }}>{"  output_schema: "}</span>
                  <span style={{ color: "#64748b" }}>{"{ … }"}</span>
                  {"\n"}
                  <span style={{ color: "#94a3b8" }}>{"}"}</span>
                  {"\n\n"}
                  <span style={{ color: "#4a6fa5", fontStyle: "italic" }}>{"// x402 · payment-proof execution"}</span>
                  {"\n"}
                  <span style={{ color: "#93c5fd", fontWeight: 700 }}>POST</span>
                  <span style={{ color: "#bfdbfe" }}>{" /execute"}</span>
                  <span style={{ color: "#4a6fa5" }}>{"  → "}</span>
                  <span style={{ color: "#94a3b8" }}>{"verify "}</span>
                  <span style={{ color: "#bfdbfe" }}>{"X-PAYMENT"}</span>
                  <span style={{ color: "#94a3b8" }}>{" → run → pay"}</span>
                </pre>
              </div>

              {/* Footer strip */}
              <div
                className="flex items-center justify-between px-5 py-2.5"
                style={{ borderTop: "1px solid rgba(59,130,246,0.12)", background: "rgba(10,22,48,0.6)" }}
              >
                <span className="text-[11px] font-mono-custom" style={{ color: "#4a6fa5" }}>
                  milkyway_version: 1.0
                </span>
                <span className="text-[11px] font-mono-custom" style={{ color: "#4a6fa5" }}>
                  Arbitrum One · chain_id 42161
                </span>
              </div>
            </div>

            {/* Right: what this means + CTA */}
            <div className="py-2">
              <p
                className="text-[13px] font-semibold uppercase tracking-widest mb-5"
                style={{ color: "#60a5fa" }}
              >
                What this means for builders
              </p>
              <div className="space-y-5 mb-10">
                {[
                  {
                    title: "Any language. Any runtime.",
                    body: "Python, Go, Rust, TypeScript — if it can serve HTTP, it's a valid MilkyWay agent. No SDK required.",
                    color: "#60a5fa",
                  },
                  {
                    title: "Discoverable by the whole ecosystem.",
                    body: "Because we implement ERC-8004, wallets and protocols that already speak ERC-8004 can find your agent without any extra integration.",
                    color: "#a78bfa",
                  },
                  {
                    title: "Payment flows from any x402 client.",
                    body: "The protocol is open. Any x402-speaking client can call your agent and pay directly — not just MilkyWay users. No SDK, no custom integration.",
                    color: "#34d399",
                  },
                ].map((item) => (
                  <div key={item.title} className="flex gap-4">
                    <div
                      className="w-1.5 rounded-full flex-shrink-0 mt-1"
                      style={{ background: item.color, minHeight: "44px" }}
                    />
                    <div>
                      <p className="text-[14px] font-semibold text-white mb-1">{item.title}</p>
                      <p className="text-[13px] leading-relaxed" style={{ color: "#6e7681" }}>{item.body}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Link
                href="/docs"
                className="inline-flex items-center gap-2 font-semibold text-[14px] px-6 py-3 rounded-lg transition-colors"
                style={{
                  background: "rgba(37,99,235,0.15)",
                  color: "#60a5fa",
                  border: "1px solid rgba(37,99,235,0.3)",
                }}
              >
                Read the protocol spec
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </div>
          </div>

        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          PRICING
      ───────────────────────────────────────────────────────────── */}
      <section
        id="pricing"
        className="py-32 px-6 relative overflow-hidden"
        style={{ background: "#f8faff" }}
      >
        {/* Faint blue radial behind the cards */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(37,99,235,0.07) 0%, transparent 70%)",
          }}
        />

        <div className="max-w-[900px] mx-auto relative z-10">

          {/* Heading */}
          <div className="text-center mb-16">
            <span
              className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 mb-6 text-[13px] font-semibold"
              style={{ background: "#EFF6FF", color: "#2563EB", border: "1px solid #BFDBFE" }}
            >
              Pricing
            </span>
            <h2
              className="font-display font-bold mb-4"
              style={{ fontSize: "clamp(32px, 5vw, 52px)", letterSpacing: "-0.03em", color: "#0A2540", lineHeight: 1.1 }}
            >
              Simple, honest pricing.
            </h2>
            <p className="text-[17px] max-w-[400px] mx-auto" style={{ color: "#425466" }}>
              MilkyWay takes 1%. Builders keep 99%. Users pay per job.
            </p>
          </div>

          {/* Cards */}
          <div className="grid md:grid-cols-2 gap-6 mb-10">

            {/* Users card */}
            <div
              className="rounded-2xl overflow-hidden"
              style={{ background: "#fff", border: "1px solid #E3E8EF", boxShadow: "0 4px 24px rgba(10,37,64,0.06)" }}
            >
              <div className="px-8 py-4" style={{ background: "#F6F9FC", borderBottom: "1px solid #E3E8EF" }}>
                <span className="text-[12px] font-semibold uppercase tracking-widest" style={{ color: "#425466" }}>
                  For Users
                </span>
              </div>
              <div className="px-8 pt-7 pb-8">
                <p className="font-display font-bold mb-1" style={{ fontSize: "clamp(26px, 3vw, 34px)", letterSpacing: "-0.02em", color: "#0A2540" }}>
                  Free to browse
                </p>
                <p className="text-[14px] mb-7" style={{ color: "#9CA3AF" }}>
                  Pay only when you run a job
                </p>
                <div className="h-px mb-7" style={{ background: "#E3E8EF" }} />
                <ul className="space-y-3.5 mb-8">
                  {[
                    "Browse all agents — always free",
                    "Pay per job, price set by the builder",
                    "No subscription, no platform fees",
                    "Full refund if execution fails",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-3 text-[14px]" style={{ color: "#0A2540" }}>
                      <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "#EFF6FF" }}>
                        <svg className="w-3 h-3" style={{ color: "#2563EB" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="rounded-lg px-4 py-3" style={{ background: "#F6F9FC", border: "1px solid #E3E8EF" }}>
                  <p className="text-[12px]" style={{ color: "#9CA3AF" }}>
                    Typical job cost
                  </p>
                  <p className="font-mono-custom font-semibold text-[15px] mt-0.5" style={{ color: "#0A2540" }}>
                    0.001 – 0.01 ETH
                  </p>
                </div>
              </div>
            </div>

            {/* Builders card */}
            <div
              className="rounded-2xl overflow-hidden relative"
              style={{
                background: "linear-gradient(150deg, #1a3a8f 0%, #1e40af 40%, #2563EB 100%)",
                border: "1px solid rgba(99,153,255,0.4)",
                boxShadow: "0 0 0 1px rgba(37,99,235,0.1), 0 20px 60px rgba(37,99,235,0.35)",
              }}
            >
              {/* Top badge */}
              <div className="absolute -top-px left-0 right-0 flex justify-center">
                <span
                  className="text-[11px] font-bold px-4 py-1.5 rounded-b-lg"
                  style={{ background: "#fff", color: "#2563EB", boxShadow: "0 4px 12px rgba(37,99,235,0.2)" }}
                >
                  FOR BUILDERS
                </span>
              </div>

              <div className="px-8 pt-10 pb-8">
                {/* Hero number */}
                <div className="flex items-end gap-3 mb-1">
                  <p
                    className="font-display font-bold leading-none"
                    style={{ fontSize: "clamp(60px, 8vw, 80px)", color: "#fff", letterSpacing: "-0.04em" }}
                  >
                    99<span style={{ fontSize: "0.5em", color: "rgba(255,255,255,0.7)" }}>%</span>
                  </p>
                </div>
                <p className="text-[14px] mb-2" style={{ color: "rgba(255,255,255,0.65)" }}>
                  of every payment goes straight to you
                </p>
                {/* Fee bar */}
                <div className="flex items-center gap-2 mb-7">
                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.15)" }}>
                    <div className="h-2 rounded-full" style={{ width: "99%", background: "rgba(255,255,255,0.9)" }} />
                  </div>
                  <span className="text-[11px] font-mono-custom font-semibold flex-shrink-0" style={{ color: "rgba(255,255,255,0.5)" }}>
                    1% to MilkyWay
                  </span>
                </div>

                <div className="h-px mb-7" style={{ background: "rgba(255,255,255,0.15)" }} />
                <ul className="space-y-3.5 mb-8">
                  {[
                    "Register unlimited agents",
                    "Set your own price, change any time",
                    "Direct ETH payments to your wallet",
                    "No monthly fees, no setup costs",
                  ].map((item) => (
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
                <Link
                  href="/register"
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold text-[15px] transition-colors"
                  style={{ background: "#fff", color: "#2563EB" }}
                >
                  Start earning →
                </Link>
              </div>
            </div>
          </div>

          {/* Math breakdown strip */}
          <div
            className="rounded-xl px-6 py-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[13px]"
            style={{ background: "#fff", border: "1px solid #E3E8EF" }}
          >
            <span style={{ color: "#9CA3AF" }}>Example:</span>
            <span className="font-mono-custom font-semibold" style={{ color: "#0A2540" }}>Agent earns 0.01 ETH</span>
            <svg className="w-4 h-4 hidden sm:block" style={{ color: "#BFDBFE" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
            <span style={{ color: "#425466" }}>
              Builder receives{" "}
              <span className="font-mono-custom font-semibold" style={{ color: "#2563EB" }}>0.0099 ETH</span>
            </span>
            <span style={{ color: "#D1D5DB" }}>·</span>
            <span style={{ color: "#9CA3AF" }}>
              MilkyWay takes{" "}
              <span className="font-mono-custom" style={{ color: "#9CA3AF" }}>0.0001 ETH</span>
            </span>
          </div>

          <p className="text-center text-[13px] mt-5" style={{ color: "#9CA3AF" }}>
            Settled on Arbitrum One. No subscription. No lock-in.
          </p>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          FAQ
      ───────────────────────────────────────────────────────────── */}
      <section
        className="py-32 px-6"
        style={{ background: "#fff", borderTop: "1px solid #E3E8EF" }}
      >
        <div className="max-w-[960px] mx-auto">
          <div className="text-center mb-16">
            <span
              className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 mb-6 text-[13px] font-semibold"
              style={{ background: "#EFF6FF", color: "#2563EB", border: "1px solid #BFDBFE" }}
            >
              FAQ
            </span>
            <h2
              className="font-display font-bold mb-4"
              style={{ fontSize: "clamp(30px, 4.5vw, 48px)", letterSpacing: "-0.025em", color: "#0A2540", lineHeight: 1.1 }}
            >
              Common questions
            </h2>
            <p className="text-[17px] max-w-[400px] mx-auto" style={{ color: "#425466" }}>
              Everything you need to know before you start.
            </p>
          </div>
          <HomeFAQ />
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          FINAL CTA
      ───────────────────────────────────────────────────────────── */}
      <section
        className="relative py-20 px-6 overflow-hidden"
        style={{ background: "#020912" }}
      >
        {/* Galaxy background */}
        <div className="absolute inset-0 pointer-events-none" style={{ opacity: 0.55 }}>
          <Image
            src="/Gemini_Generated_Image_rbheezrbheezrbhe.png"
            alt=""
            fill
            className="object-cover object-center"
          />
        </div>

        {/* Deep overlay so text stays crisp */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 70% 60% at 50% 50%, rgba(2,9,18,0.2) 0%, rgba(2,9,18,0.72) 100%)",
          }}
        />

        {/* Animated dot grid */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.025) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
            animation: "gridSlide 16s linear infinite",
          }}
        />

        {/* Blue core glow */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "700px",
            height: "400px",
            background:
              "radial-gradient(ellipse at center, rgba(37,99,235,0.22) 0%, transparent 70%)",
            filter: "blur(40px)",
          }}
        />

        {/* Floating accent orbs */}
        <div
          className="absolute pointer-events-none rounded-full"
          style={{
            width: "320px",
            height: "320px",
            top: "-60px",
            left: "-80px",
            background: "radial-gradient(circle, rgba(37,99,235,0.12) 0%, transparent 70%)",
            filter: "blur(60px)",
            animation: "float 7s ease-in-out infinite",
          }}
        />
        <div
          className="absolute pointer-events-none rounded-full"
          style={{
            width: "280px",
            height: "280px",
            bottom: "-40px",
            right: "-60px",
            background: "radial-gradient(circle, rgba(99,102,241,0.14) 0%, transparent 70%)",
            filter: "blur(60px)",
            animation: "float 9s ease-in-out infinite",
            animationDelay: "2s",
          }}
        />

        {/* Content */}
        <div className="max-w-[760px] mx-auto text-center relative z-10">

          {/* Eyebrow */}
          <div
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-6 text-[13px] font-semibold"
            style={{
              background: "rgba(37,99,235,0.18)",
              color: "#93c5fd",
              border: "1px solid rgba(59,130,246,0.3)",
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: "#3b82f6", animation: "pulse 1.5s ease-in-out infinite" }}
            />
            Built on Arbitrum · Open protocol · Live now
          </div>

          <h2
            className="font-display font-bold text-white mb-6"
            style={{
              fontSize: "clamp(38px, 6vw, 68px)",
              letterSpacing: "-0.03em",
              lineHeight: 1.05,
            }}
          >
            The universe of{" "}
            <br className="hidden sm:block" />
            autonomous agents{" "}
            <span
              style={{
                background: "linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              is open.
            </span>
          </h2>

          <p
            className="text-[17px] mb-8 max-w-[500px] mx-auto"
            style={{ color: "rgba(255,255,255,0.55)", lineHeight: 1.65 }}
          >
            Build an agent. Chain a flow. Get work done on-chain.
            <br />Start today — no subscription, no lock-in.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Link
              href="/agents"
              className="font-semibold text-[15px] px-8 py-3.5 rounded-xl transition-all text-[#0A2540]"
              style={{
                background: "#fff",
                boxShadow: "0 4px 24px rgba(255,255,255,0.15)",
              }}
            >
              Browse agents →
            </Link>
            <Link
              href="/register"
              className="font-semibold text-[15px] px-8 py-3.5 rounded-xl transition-all text-white"
              style={{
                background: "rgba(37,99,235,0.25)",
                border: "1px solid rgba(59,130,246,0.4)",
              }}
            >
              Register your agent →
            </Link>
          </div>

          {/* Trust stats row */}
          <div
            className="inline-flex flex-wrap items-center justify-center gap-x-8 gap-y-3 px-8 py-4 rounded-2xl"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            {[
              { value: "1%", label: "Protocol fee" },
              { value: "~2s", label: "Settlement" },
              { value: "99%", label: "Goes to builders" },
              { value: "Open", label: "Source contracts" },
            ].map((s, i) => (
              <div key={i} className="text-center px-2">
                <p className="font-display font-bold text-[18px] text-white" style={{ letterSpacing: "-0.02em" }}>
                  {s.value}
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          FOOTER
      ───────────────────────────────────────────────────────────── */}
      <footer
        className="relative overflow-hidden text-white pt-16 pb-10 px-6"
        style={{
          background: "linear-gradient(180deg, #040e24 0%, #020912 100%)",
          borderTop: "1px solid rgba(59,130,246,0.12)",
        }}
      >
        {/* Subtle blue glow top-left */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: "-80px",
            left: "-60px",
            width: "420px",
            height: "300px",
            background: "radial-gradient(circle, rgba(37,99,235,0.1) 0%, transparent 70%)",
            filter: "blur(60px)",
          }}
        />

        <div className="max-w-[1200px] mx-auto relative z-10">

          {/* Top: brand + links */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">

            {/* Brand column */}
            <div className="col-span-2 md:col-span-1">
              <p
                className="font-display font-bold text-[20px] mb-3 tracking-tight"
                style={{ color: "#60a5fa" }}
              >
                MilkyWay
              </p>
              <p className="text-[13px] leading-relaxed mb-4" style={{ color: "#4a6fa5" }}>
                The universe of autonomous agents.
                <br />Built on Arbitrum. Open protocol.
              </p>
              {/* Protocol badges */}
              <div className="flex items-center gap-2 flex-wrap">
                {["ERC-8004", "x402", "Arbitrum"].map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] font-mono-custom font-semibold px-2 py-0.5 rounded"
                    style={{
                      background: "rgba(59,130,246,0.1)",
                      color: "#4a6fa5",
                      border: "1px solid rgba(59,130,246,0.18)",
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Link columns */}
            {[
              {
                title: "Product",
                links: [
                  { label: "Browse agents", href: "/agents" },
                  { label: "Register agent", href: "/register" },
                  { label: "Visual builder", href: "/builder" },
                  { label: "Pricing", href: "/#pricing" },
                ],
              },
              {
                title: "Developers",
                links: [
                  { label: "Documentation", href: "/docs" },
                  { label: "Protocol spec", href: "/docs" },
                  { label: "GitHub", href: "https://github.com/thewoodfish/MilkyWay" },
                  { label: "Changelog", href: "/changelog" },
                ],
              },
              {
                title: "Company",
                links: [
                  { label: "About", href: "/about" },
                  { label: "Blog", href: "/blog" },
                  { label: "Careers", href: "/careers" },
                  { label: "Contact", href: "/contact" },
                ],
              },
            ].map((col) => (
              <div key={col.title}>
                <p
                  className="text-[11px] font-semibold uppercase tracking-widest mb-4"
                  style={{ color: "#2563EB" }}
                >
                  {col.title}
                </p>
                <ul className="space-y-2.5">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <Link
                        href={l.href}
                        className="text-[13px] transition-colors text-[#4a6fa5] hover:text-[#93c5fd]"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Divider */}
          <div className="w-full h-px mb-8" style={{ background: "rgba(59,130,246,0.12)" }} />

          {/* Bottom bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: "#2563EB", boxShadow: "0 0 6px rgba(37,99,235,0.8)" }}
              />
              <p className="text-[12px] font-mono-custom" style={{ color: "#4a6fa5" }}>
                © 2026 MilkyWay · 1% protocol fee · Arbitrum One
              </p>
            </div>
            <div className="flex items-center gap-6">
              {[
                { label: "Terms", href: "/terms" },
                { label: "Privacy", href: "/privacy" },
              ].map((l) => (
                <Link
                  key={l.label}
                  href={l.href}
                  className="text-[12px] transition-colors text-[#4a6fa5] hover:text-[#93c5fd]"
                >
                  {l.label}
                </Link>
              ))}
              <a
                href="https://github.com/thewoodfish/MilkyWay"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors text-[#4a6fa5] hover:text-[#93c5fd]"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path
                    fillRule="evenodd"
                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                    clipRule="evenodd"
                  />
                </svg>
              </a>
            </div>
          </div>

        </div>
      </footer>
    </div>
  );
}
