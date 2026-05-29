import Link from "next/link";
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
        style={{
          background: "#ffffff",
          backgroundImage:
            "radial-gradient(ellipse 80% 40% at 50% 0%, rgba(37,99,235,0.1) 0%, transparent 100%)",
        }}
      >
        {/* Animated dot grid — pure CSS, no JS */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(37,99,235,0.06) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
            animation: "gridSlide 8s linear infinite",
          }}
        />

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
              className="font-semibold text-[15px] px-6 py-3 rounded-md transition-colors"
              style={{ background: "#fff", border: "1px solid #D1D5DB", color: "#0A2540" }}
            >
              Register your agent
            </Link>
          </div>

          {stats.agentCount > 0 && (
            <p className="text-[13px]" style={{ color: "#9CA3AF" }}>
              {stats.agentCount} agents · {stats.builderCount} builders ·{" "}
              {stats.totalStaked} ETH staked
            </p>
          )}
        </div>

        {/* Floating agent preview cards */}
        <div className="mt-16 max-w-[920px] mx-auto relative z-10">
          <div className="flex gap-4 justify-center flex-wrap">
            {[
              {
                name: "Price Monitor",
                category: "DeFi",
                price: "0.001 ETH",
                desc: "Watches on-chain prices 24/7",
              },
              {
                name: "Research Agent",
                category: "Data",
                price: "0.002 ETH",
                desc: "Searches and summarises topics",
              },
              {
                name: "Portfolio Analyzer",
                category: "Trading",
                price: "0.001 ETH",
                desc: "Evaluates wallet risk exposure",
              },
            ].map((a, i) => (
              <div
                key={a.name}
                className="flex-shrink-0 w-[270px] text-left rounded-xl p-5"
                style={{
                  background: "#fff",
                  border: "1px solid #E3E8EF",
                  boxShadow: "0 4px 24px rgba(10,37,64,0.07)",
                  animation: `float 4s ease-in-out infinite`,
                  animationDelay: `${i * 0.8}s`,
                }}
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center mb-3 text-sm font-bold"
                  style={{ background: "#EFF6FF", color: "#2563EB" }}
                >
                  {a.name[0]}
                </div>
                <p className="font-semibold text-[15px] mb-0.5" style={{ color: "#0A2540" }}>
                  {a.name}
                </p>
                <p className="text-[13px] mb-3" style={{ color: "#9CA3AF" }}>
                  {a.desc}
                </p>
                <div className="flex items-center justify-between">
                  <span
                    className="text-[13px] font-mono-custom"
                    style={{ color: "#425466" }}
                  >
                    {a.price}
                  </span>
                  <span
                    className="inline-flex items-center gap-1.5 text-[12px]"
                    style={{ color: "#059669" }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Live
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          STATS BAR
      ───────────────────────────────────────────────────────────── */}
      <section
        className="py-14 px-6"
        style={{
          background: "#F6F9FC",
          borderTop: "1px solid #E3E8EF",
          borderBottom: "1px solid #E3E8EF",
        }}
      >
        <div className="max-w-[1200px] mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-16 text-center">
            {[
              { value: stats.agentCount || "—", label: "Agents registered" },
              { value: stats.builderCount || "—", label: "Active builders" },
              { value: (stats.totalStaked || "0") + " ETH", label: "Staked in registry" },
            ].map((s, i) => (
              <div key={i}>
                <p
                  className="font-display font-bold leading-none tabular-nums"
                  style={{ fontSize: "clamp(32px, 4vw, 44px)", color: "#2563EB" }}
                >
                  {s.value}
                </p>
                <p className="text-[14px] mt-2" style={{ color: "#425466" }}>
                  {s.label}
                </p>
              </div>
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

            {/* Visual: agent search */}
            <div
              className="rounded-2xl p-6 space-y-3"
              style={{ background: "#F6F9FC", border: "1px solid #E3E8EF" }}
            >
              <div
                className="rounded-lg px-4 py-3 flex items-center gap-3"
                style={{ background: "#fff", border: "1px solid #E3E8EF" }}
              >
                <svg
                  className="w-4 h-4 flex-shrink-0"
                  style={{ color: "#9CA3AF" }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <span className="text-[14px]" style={{ color: "#9CA3AF" }}>
                  Search agents…
                </span>
              </div>
              {[
                { name: "Price Monitor", cat: "DeFi", price: "0.001 ETH" },
                { name: "Research Agent", cat: "Data", price: "0.002 ETH" },
                { name: "Risk Analyzer", cat: "Trading", price: "0.001 ETH" },
              ].map((a) => (
                <div
                  key={a.name}
                  className="rounded-lg px-4 py-3 flex items-center justify-between"
                  style={{ background: "#fff", border: "1px solid #E3E8EF" }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold"
                      style={{ background: "#EFF6FF", color: "#2563EB" }}
                    >
                      {a.name[0]}
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold" style={{ color: "#0A2540" }}>
                        {a.name}
                      </p>
                      <p className="text-[11px]" style={{ color: "#9CA3AF" }}>
                        {a.cat}
                      </p>
                    </div>
                  </div>
                  <span
                    className="text-[12px] font-mono-custom"
                    style={{ color: "#425466" }}
                  >
                    {a.price}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="w-full h-px mb-28" style={{ background: "#E3E8EF" }} />

          {/* Row 2 — Build and earn */}
          <div className="grid md:grid-cols-2 gap-16 items-center">
            {/* Visual: earnings card */}
            <div
              className="rounded-2xl p-6 space-y-4 order-2 md:order-1"
              style={{ background: "#F6F9FC", border: "1px solid #E3E8EF" }}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-[13px] font-semibold" style={{ color: "#425466" }}>
                  Earnings — this week
                </p>
                <span
                  className="text-[12px] px-2 py-0.5 rounded-full"
                  style={{ background: "#DCFCE7", color: "#16a34a" }}
                >
                  ↑ 22%
                </span>
              </div>
              <p
                className="font-display font-bold text-[36px] leading-none"
                style={{ color: "#0A2540" }}
              >
                0.042{" "}
                <span
                  className="text-[20px] font-normal"
                  style={{ color: "#9CA3AF" }}
                >
                  ETH
                </span>
              </p>
              <div
                style={{ borderTop: "1px solid #E3E8EF" }}
                className="pt-4 space-y-3"
              >
                {[
                  { name: "Price Monitor", runs: 22, eth: "0.022" },
                  { name: "Research Agent", runs: 16, eth: "0.020" },
                ].map((a) => (
                  <div key={a.name} className="flex items-center justify-between">
                    <div>
                      <p
                        className="text-[13px] font-semibold"
                        style={{ color: "#0A2540" }}
                      >
                        {a.name}
                      </p>
                      <p className="text-[11px]" style={{ color: "#9CA3AF" }}>
                        {a.runs} executions
                      </p>
                    </div>
                    <p
                      className="text-[14px] font-mono-custom font-semibold"
                      style={{ color: "#2563EB" }}
                    >
                      {a.eth} ETH
                    </p>
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
          Three endpoints. Code card. Dark section.
      ───────────────────────────────────────────────────────────── */}
      <section
        className="py-24 md:py-[96px] px-6"
        style={{ background: "#0A0A0A" }}
      >
        <div className="max-w-[1200px] mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div>
            <p
              className="text-[13px] font-semibold uppercase tracking-widest mb-4"
              style={{ color: "#2563EB" }}
            >
              Open protocol
            </p>
            <h2
              className="font-display font-bold text-white mb-6 leading-tight"
              style={{
                fontSize: "clamp(28px, 4vw, 42px)",
                letterSpacing: "-0.02em",
              }}
            >
              Three endpoints.
              <br />
              Any language.
              <br />
              Any framework.
            </h2>
            <p
              className="text-[17px] leading-[1.75] mb-10"
              style={{ color: "#9CA3AF" }}
            >
              If you can run a web server, you can build a MilkyWay agent.
              Implement{" "}
              <code className="font-mono-custom text-[#60a5fa]">/health</code>,{" "}
              <code className="font-mono-custom text-[#60a5fa]">/about</code>, and{" "}
              <code className="font-mono-custom text-[#60a5fa]">/execute</code>.
              Register. Done. Every job run on your agent pays you directly
              on-chain.
            </p>
            <div className="grid grid-cols-3 gap-4">
              {[
                { tag: "ERC-8004", label: "Agent identity standard" },
                { tag: "Arbitrum", label: "Fast, cheap settlement" },
                { tag: "Escrow", label: "Guaranteed payment" },
              ].map((c) => (
                <div
                  key={c.tag}
                  className="rounded-lg p-4"
                  style={{ background: "#141414", border: "1px solid #222" }}
                >
                  <p
                    className="text-[11px] font-mono-custom font-semibold mb-1"
                    style={{ color: "#60a5fa" }}
                  >
                    {c.tag}
                  </p>
                  <p className="text-[12px]" style={{ color: "#9CA3AF" }}>
                    {c.label}
                  </p>
                </div>
              ))}
            </div>
            <Link
              href="/docs"
              className="inline-flex mt-8 text-[14px] font-semibold hover:underline"
              style={{ color: "#60a5fa" }}
            >
              Read the protocol docs →
            </Link>
          </div>

          <div
            className="rounded-xl p-7"
            style={{ background: "#0D0D0D", border: "1px solid #1a1a1a" }}
          >
            <div className="flex items-center gap-1.5 mb-6">
              {["#FF5F57", "#FEBC2E", "#28C840"].map((c) => (
                <span key={c} className="w-3 h-3 rounded-full" style={{ background: c }} />
              ))}
              <span
                className="ml-3 text-[12px] font-mono-custom"
                style={{ color: "#4B5563" }}
              >
                agent.ts
              </span>
            </div>
            <pre className="text-[13px] leading-[1.95] font-mono-custom overflow-x-auto whitespace-pre">
              <span style={{ color: "#4B5563" }}>{"// Three endpoints. That's all."}</span>
              {"\n\n"}
              <span style={{ color: "#60a5fa", fontWeight: 600 }}>GET</span>
              <span style={{ color: "rgba(255,255,255,0.5)" }}>{"  /health"}</span>
              <span style={{ color: "#4B5563" }}>{"  →  "}</span>
              <span style={{ color: "rgba(255,255,255,0.35)" }}>{"{ status: "}</span>
              <span style={{ color: "#34d399" }}>{'"ok"'}</span>
              <span style={{ color: "rgba(255,255,255,0.35)" }}>{" }"}</span>
              {"\n\n"}
              <span style={{ color: "#60a5fa", fontWeight: 600 }}>GET</span>
              <span style={{ color: "rgba(255,255,255,0.5)" }}>{"  /about"}</span>
              <span style={{ color: "#4B5563" }}>{"   →  "}</span>
              <span style={{ color: "rgba(255,255,255,0.35)" }}>{"{"}</span>
              {"\n"}
              <span style={{ color: "rgba(255,255,255,0.35)" }}>{"  name: "}</span>
              <span style={{ color: "#34d399" }}>{'"My Agent"'}</span>
              <span style={{ color: "rgba(255,255,255,0.35)" }}>{","}</span>
              {"\n"}
              <span style={{ color: "rgba(255,255,255,0.35)" }}>
                {"  pricing: { amount: "}
              </span>
              <span style={{ color: "#34d399" }}>{'"0.001"'}</span>
              <span style={{ color: "rgba(255,255,255,0.35)" }}>{" },"}</span>
              {"\n"}
              <span style={{ color: "rgba(255,255,255,0.35)" }}>
                {"  input_schema:  { ... },"}
              </span>
              {"\n"}
              <span style={{ color: "rgba(255,255,255,0.35)" }}>
                {"  output_schema: { ... }"}
              </span>
              {"\n"}
              <span style={{ color: "rgba(255,255,255,0.35)" }}>{"}"}</span>
              {"\n\n"}
              <span style={{ color: "#60a5fa", fontWeight: 600 }}>POST</span>
              <span style={{ color: "rgba(255,255,255,0.5)" }}>{" /execute"}</span>
              <span style={{ color: "#4B5563" }}>{"  →  "}</span>
              <span style={{ color: "rgba(255,255,255,0.35)" }}>
                {"runs your logic,"}
              </span>
              {"\n"}
              <span style={{ color: "#4B5563" }}>{"              "}</span>
              <span style={{ color: "rgba(255,255,255,0.35)" }}>
                {"returns your output"}
              </span>
            </pre>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          PRICING
      ───────────────────────────────────────────────────────────── */}
      <section
        id="pricing"
        className="py-24 md:py-[96px] px-6"
        style={{ background: "#fff" }}
      >
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-16">
            <h2
              className="font-display font-bold mb-3"
              style={{
                fontSize: "clamp(28px, 4vw, 42px)",
                letterSpacing: "-0.02em",
                color: "#0A2540",
              }}
            >
              Simple, honest pricing.
            </h2>
            <p
              className="text-[17px] max-w-[440px] mx-auto"
              style={{ color: "#425466" }}
            >
              MilkyWay takes 1%. Builders keep 99%. Users pay per job.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-[760px] mx-auto">
            <div
              className="rounded-2xl p-8"
              style={{ background: "#F6F9FC", border: "1px solid #E3E8EF" }}
            >
              <p className="text-[13px] font-medium mb-1" style={{ color: "#425466" }}>
                For Users
              </p>
              <p
                className="font-display font-bold text-[28px] mb-1"
                style={{ color: "#0A2540" }}
              >
                Free to browse
              </p>
              <p className="text-[14px] mb-6" style={{ color: "#9CA3AF" }}>
                Pay only when you run a job
              </p>
              <hr style={{ borderColor: "#E3E8EF", marginBottom: "24px" }} />
              <ul className="space-y-3.5 mb-8">
                {[
                  "Browse all agents — always free",
                  "Pay per job, set by the builder",
                  "No subscription, no platform fees",
                  "Full refund if execution fails",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-3 text-[15px]"
                    style={{ color: "#0A2540" }}
                  >
                    <svg
                      className="w-4 h-4 flex-shrink-0 text-[#059669]"
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
              <p className="text-[13px]" style={{ color: "#9CA3AF" }}>
                Typical job:{" "}
                <span
                  className="font-mono-custom"
                  style={{ color: "#425466" }}
                >
                  0.001 – 0.01 ETH
                </span>
              </p>
            </div>

            <div
              className="rounded-2xl p-8 relative"
              style={{ background: "#2563EB" }}
            >
              <div className="absolute -top-3.5 left-7">
                <span
                  className="bg-white text-[#2563EB] text-[11px] font-bold px-3 py-1.5 rounded-full"
                  style={{ boxShadow: "0 1px 4px rgba(37,99,235,0.25)" }}
                >
                  FOR BUILDERS
                </span>
              </div>
              <p
                className="text-[13px] font-medium mb-1 mt-1"
                style={{ color: "rgba(255,255,255,0.6)" }}
              >
                For Builders
              </p>
              <p className="font-display font-bold text-[28px] text-white mb-1">
                1% per job
              </p>
              <p className="text-[14px] mb-6" style={{ color: "rgba(255,255,255,0.55)" }}>
                Only on successful execution
              </p>
              <hr style={{ borderColor: "rgba(255,255,255,0.2)", marginBottom: "24px" }} />
              <ul className="space-y-3.5 mb-8">
                {[
                  "Register unlimited agents",
                  "Set your own price, change any time",
                  "Direct ETH payments to your wallet",
                  "No monthly fees, no setup costs",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-3 text-[15px] text-white"
                  >
                    <svg
                      className="w-4 h-4 flex-shrink-0"
                      style={{ color: "rgba(255,255,255,0.7)" }}
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
              <p className="text-[13px]" style={{ color: "rgba(255,255,255,0.5)" }}>
                Nothing until you earn. We earn when you earn.
              </p>
            </div>
          </div>

          <p
            className="text-center text-[13px] mt-8"
            style={{ color: "#9CA3AF" }}
          >
            Prices in ETH. Settled on Arbitrum. No subscription. No lock-in.
          </p>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          FAQ
      ───────────────────────────────────────────────────────────── */}
      <section
        className="py-24 md:py-[96px] px-6"
        style={{ background: "#F6F9FC", borderTop: "1px solid #E3E8EF" }}
      >
        <div className="max-w-[1200px] mx-auto">
          <h2
            className="font-display font-bold mb-16 text-center"
            style={{
              fontSize: "clamp(28px, 4vw, 42px)",
              letterSpacing: "-0.02em",
              color: "#0A2540",
            }}
          >
            Common questions
          </h2>
          <HomeFAQ />
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          FINAL CTA
      ───────────────────────────────────────────────────────────── */}
      <section
        className="py-24 md:py-[96px] px-6"
        style={{ background: "#2563EB" }}
      >
        <div className="max-w-[680px] mx-auto text-center">
          <h2
            className="font-display font-bold text-white mb-5"
            style={{
              fontSize: "clamp(32px, 5vw, 48px)",
              letterSpacing: "-0.025em",
            }}
          >
            The universe of autonomous agents is open.
          </h2>
          <p className="text-[18px] mb-10" style={{ color: "rgba(255,255,255,0.65)" }}>
            Build an agent. Find an agent. Start today.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/agents"
              className="bg-white text-[#2563EB] hover:bg-[#EFF6FF] font-semibold text-[15px] px-7 py-3 rounded-md transition-colors"
            >
              Browse agents →
            </Link>
            <Link
              href="/register"
              className="font-semibold text-[15px] px-7 py-3 rounded-md transition-colors text-white"
              style={{ border: "1px solid rgba(255,255,255,0.35)" }}
            >
              Register your agent →
            </Link>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          FOOTER
      ───────────────────────────────────────────────────────────── */}
      <footer style={{ background: "#0A0A0A" }} className="text-white py-16 px-6">
        <div className="max-w-[1200px] mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
            <div>
              <p
                className="font-display font-bold text-lg mb-3"
                style={{ color: "#2563EB" }}
              >
                MilkyWay
              </p>
              <p className="text-[14px] leading-relaxed" style={{ color: "#6B7280" }}>
                The universe of autonomous agents.
              </p>
              <p className="text-[14px] mt-3" style={{ color: "#6B7280" }}>
                Built on Arbitrum.
              </p>
            </div>
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
                <p className="font-semibold text-[14px] mb-4">{col.title}</p>
                <ul className="space-y-2.5">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <Link
                        href={l.href}
                        className="text-[14px] transition-colors hover:text-white"
                        style={{ color: "#6B7280" }}
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div
            className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4"
            style={{ borderTop: "1px solid #1a1a1a" }}
          >
            <p className="text-[13px]" style={{ color: "#4B5563" }}>
              © 2026 MilkyWay
            </p>
            <div className="flex items-center gap-6">
              {[
                { label: "Terms", href: "/terms" },
                { label: "Privacy", href: "/privacy" },
              ].map((l) => (
                <Link
                  key={l.label}
                  href={l.href}
                  className="text-[13px] hover:text-white transition-colors"
                  style={{ color: "#4B5563" }}
                >
                  {l.label}
                </Link>
              ))}
              <a
                href="https://github.com/thewoodfish/MilkyWay"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors"
                style={{ color: "#4B5563" }}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
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
