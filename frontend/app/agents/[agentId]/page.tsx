import Link from "next/link";
import type { Agent, VerificationLog } from "@/lib/types";
import {
  apiFetch, shortAddress, formatPrice,
  agentStatus, timeAgo, CATEGORY_LABELS,
} from "@/lib/utils";
import { QuickExecute } from "@/components/QuickExecute";
import { AgentCard } from "@/components/AgentCard";
import { TechnicalDetails } from "@/components/TechnicalDetails";


const CATEGORY_META: Record<string, { color: string; bg: string; border: string }> = {
  DEFI:         { color: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE" },
  TRADING:      { color: "#0d9488", bg: "#f0fdfa", border: "#99f6e4" },
  DATA:         { color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe" },
  PRODUCTIVITY: { color: "#ea580c", bg: "#fff7ed", border: "#fed7aa" },
  UTILITY:      { color: "#0284c7", bg: "#f0f9ff", border: "#bae6fd" },
  SECURITY:     { color: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
  GAMING:       { color: "#9333ea", bg: "#faf5ff", border: "#e9d5ff" },
  SOCIAL:       { color: "#db2777", bg: "#fdf2f8", border: "#fbcfe8" },
};
const BLUE = { color: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE" };

const STATUS_META = {
  live:     { label: "Live",     color: "#10b981", bg: "#f0fdf4", border: "#bbf7d0" },
  degraded: { label: "Degraded", color: "#f59e0b", bg: "#fffbeb", border: "#fde68a" },
  down:     { label: "Offline",  color: "#ef4444", bg: "#fef2f2", border: "#fecaca" },
};

const BADGE_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  BRONZE: { label: "Bronze", color: "#92400e", bg: "#fef3c7", border: "#fde68a" },
  SILVER: { label: "Silver", color: "#374151", bg: "#f3f4f6", border: "#d1d5db" },
  GOLD:   { label: "Gold",   color: "#78350f", bg: "#fef9c3", border: "#fde047" },
};

const PRICING_SUFFIX: Record<string, string> = {
  PER_CALL:  "per call",
  PER_DAY:   "per day",
  PER_MONTH: "per month",
  FREE:      "Free",
};

const TYPE_LABELS: Record<string, string> = {
  string:  "text",
  number:  "number",
  boolean: "yes / no",
  array:   "list",
  object:  "data",
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

async function getAgent(agentId: string): Promise<Agent | null> {
  try {
    return await apiFetch<Agent>(`/api/agents/${agentId}`);
  } catch {
    return null;
  }
}

async function getLogs(agentId: string): Promise<VerificationLog[]> {
  try {
    return await apiFetch<VerificationLog[]>(`/api/verify/logs/${agentId}`);
  } catch {
    return [];
  }
}

async function getRelated(agentId: number, category: string): Promise<Agent[]> {
  try {
    const data = await apiFetch<{ agents: Agent[]; total: number }>(
      `/api/agents?category=${category}&limit=5`
    );
    return data.agents.filter((a) => a.agentId !== agentId).slice(0, 4);
  } catch {
    return [];
  }
}

async function getEthUsd(): Promise<number | null> {
  try {
    const data = await apiFetch<{ usd: number }>("/api/rates/eth-usd");
    return data.usd;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: { agentId: string } }) {
  const agent = await getAgent(params.agentId);
  if (!agent) return { title: "Agent not found — MilkyWay" };
  return {
    title: `${agent.name} — MilkyWay`,
    description: agent.description.substring(0, 160),
  };
}

// ── Card shell ────────────────────────────────────────────────────
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl p-6 ${className}`}
      style={{
        background: "#fff",
        border: "1px solid #E3E8EF",
        boxShadow: "0 2px 12px rgba(10,37,64,0.05)",
      }}
    >
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-semibold text-[15px] mb-4" style={{ color: "#0A2540" }}>
      {children}
    </h2>
  );
}

export default async function AgentProfilePage({
  params,
}: {
  params: { agentId: string };
}) {
  const [agent, logs, ethUsd] = await Promise.all([
    getAgent(params.agentId),
    getLogs(params.agentId),
    getEthUsd(),
  ]);

  if (!agent) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#f8faff" }}>
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "#EFF6FF" }}>
            <svg className="w-6 h-6" style={{ color: "#2563EB" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="font-bold text-[22px] mb-2" style={{ color: "#0A2540" }}>Agent not found</p>
          <Link href="/agents" className="text-[14px]" style={{ color: "#2563EB" }}>← Back to agents</Link>
        </div>
      </div>
    );
  }

  const related = await getRelated(agent.agentId, agent.category);

  const status = agentStatus(agent);
  const sm = STATUS_META[status];
  const cm = CATEGORY_META[agent.category] ?? BLUE;
  const bm = agent.badgeTier && agent.badgeTier !== "NONE" ? BADGE_META[agent.badgeTier] : null;
  const showQuickExecute = agent.phase2Ready && agent.agentId != null && agent.aboutSchema != null;

  // Stats from logs
  const successRate = logs.length > 0
    ? Math.round((logs.filter((l) => l.success).length / logs.length) * 100)
    : null;
  const avgResponse = logs.length > 0
    ? Math.round(
        logs.filter((l) => l.responseTimeMs != null).reduce((s, l) => s + (l.responseTimeMs ?? 0), 0) /
        Math.max(1, logs.filter((l) => l.responseTimeMs != null).length)
      )
    : null;

  // 7-day calendar
  const today = new Date();
  const sevenDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (6 - i));
    return { iso: d.toISOString().split("T")[0], day: DAYS[d.getDay()] };
  });
  const logsByDay = new Map<string, boolean>();
  for (const log of logs) {
    const day = new Date(log.checkedAt).toISOString().split("T")[0];
    if (!logsByDay.has(day)) logsByDay.set(day, log.success);
    else if (!log.success) logsByDay.set(day, false);
  }

  // Schema
  const aboutSchema = agent.aboutSchema as Record<string, unknown> | null | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inputSchema: Record<string, any> | null = (aboutSchema as any)?.input_schema ?? null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const outputSchema: Record<string, any> | null = (aboutSchema as any)?.output_schema ?? null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const capabilities: string[] = (aboutSchema as any)?.capabilities ?? [];

  // USD conversion
  const priceUsd = ethUsd && agent.priceEth && agent.pricingModel !== "FREE"
    ? (parseFloat(agent.priceEth) * ethUsd).toFixed(4)
    : null;

  const lastLog = logs[0];

  return (
    <div className="min-h-screen" style={{ background: "#f8faff" }}>

      {/* ── Hero ──────────────────────────────────────────────────── */}
      <div
        className="px-6 py-14 relative"
        style={{
          backgroundImage: "linear-gradient(rgba(2,9,18,0.52), rgba(2,9,18,0.52)), url('/Gemini_Generated_Image_rbheezrbheezrbhe.png')",
          backgroundPosition: "top center",
          backgroundSize: "cover",
          borderBottom: "1px solid rgba(59,130,246,0.2)",
        }}
      >
        <div className="max-w-[1200px] mx-auto relative z-10">
          <Link href="/agents" className="inline-flex items-center gap-1.5 text-[13px] mb-6 transition-colors" style={{ color: "rgba(255,255,255,0.45)" }}>
            ← Back to agents
          </Link>

          <div className="flex flex-col sm:flex-row gap-6 items-start">
            {/* Icon */}
            <div
              className="w-[72px] h-[72px] rounded-2xl flex items-center justify-center flex-shrink-0 overflow-hidden text-2xl font-bold"
              style={{ background: cm.bg, color: cm.color, border: `2px solid ${cm.border}` }}
            >
              {agent.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={agent.logoUrl} alt={agent.name} className="w-full h-full object-cover" />
              ) : agent.name[0]}
            </div>

            {/* Name + pills */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <h1 className="font-display font-bold text-white leading-tight" style={{ fontSize: "clamp(22px, 3vw, 34px)", letterSpacing: "-0.02em" }}>
                  {agent.name}
                </h1>
                <span className="text-[11px] font-mono-custom px-2 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.55)" }}>
                  v{agent.version}
                </span>
                {bm && (
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full" style={{ background: bm.bg, color: bm.color, border: `1px solid ${bm.border}` }}>
                    {bm.label}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="text-[12px] font-semibold px-2.5 py-1 rounded-full" style={{ background: "rgba(37,99,235,0.5)", color: "#fff", border: "1px solid rgba(59,130,246,0.5)" }}>
                  {CATEGORY_LABELS[agent.category] ?? agent.category}
                </span>
                {agent.subcategory && (
                  <span className="text-[12px] px-2.5 py-1 rounded-full" style={{ background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.15)" }}>
                    {agent.subcategory}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold px-2.5 py-1 rounded-full" style={{ background: sm.bg, color: sm.color, border: `1px solid ${sm.border}` }}>
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: sm.color, boxShadow: status === "live" ? `0 0 5px ${sm.color}` : "none", animation: status === "live" ? "pulse 2s ease-in-out infinite" : "none" }} />
                  {sm.label}
                </span>
              </div>
              <p className="text-[14px] leading-relaxed max-w-2xl" style={{ color: "rgba(255,255,255,0.6)" }}>
                {agent.description}
              </p>
            </div>

            {/* Price */}
            <div className="flex-shrink-0 sm:text-right">
              <div className="text-[32px] font-bold font-mono-custom leading-none text-white mb-1">{formatPrice(agent)}</div>
              <div className="text-[12px]" style={{ color: "rgba(255,255,255,0.4)" }}>{PRICING_SUFFIX[agent.pricingModel] ?? ""}</div>
            </div>
          </div>

          {/* Stats strip */}
          {(successRate !== null || avgResponse !== null) && (
            <div className="mt-8 flex flex-wrap gap-6 pt-6" style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}>
              {successRate !== null && (
                <div>
                  <p className="text-[11px] uppercase tracking-widest mb-1" style={{ color: "rgba(255,255,255,0.35)" }}>Uptime</p>
                  <p className="text-[18px] font-bold font-mono-custom text-white">{successRate}%</p>
                </div>
              )}
              {avgResponse !== null && (
                <div>
                  <p className="text-[11px] uppercase tracking-widest mb-1" style={{ color: "rgba(255,255,255,0.35)" }}>Avg Response</p>
                  <p className="text-[18px] font-bold font-mono-custom text-white">{avgResponse}ms</p>
                </div>
              )}
              <div>
                <p className="text-[11px] uppercase tracking-widest mb-1" style={{ color: "rgba(255,255,255,0.35)" }}>Agent ID</p>
                <p className="text-[18px] font-bold font-mono-custom text-white">#{agent.agentId}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-widest mb-1" style={{ color: "rgba(255,255,255,0.35)" }}>Registered</p>
                <p className="text-[18px] font-bold text-white">{new Date(agent.registeredAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────── */}
      <div className="max-w-[1200px] mx-auto px-6 py-10">
        <div className={`grid gap-8 items-start ${showQuickExecute ? "lg:grid-cols-[1fr_360px]" : "lg:grid-cols-[1fr_300px]"}`}>

          {/* ── LEFT ─────────────────────────────────────────────── */}
          <div className="space-y-5">

            {/* 2a — About */}
            <Card>
              <SectionLabel>About this agent</SectionLabel>
              {agent.description ? (
                <p className="text-[14px] leading-[1.75]" style={{ color: "#425466" }}>
                  {agent.description}
                </p>
              ) : (
                <p className="text-[14px] italic" style={{ color: "#94a3b8" }}>
                  The builder has not added a description.
                </p>
              )}
              {capabilities.length > 0 && (
                <div className="mt-4 pt-4" style={{ borderTop: "1px solid #F1F5F9" }}>
                  <p className="text-[11px] uppercase tracking-widest font-semibold mb-2.5" style={{ color: "#94a3b8" }}>Capabilities</p>
                  <div className="flex flex-wrap gap-2">
                    {capabilities.map((cap: string) => (
                      <span key={cap} className="text-[12px] font-mono-custom px-2.5 py-1 rounded-lg" style={{ background: cm.bg, color: cm.color, border: `1px solid ${cm.border}` }}>
                        {cap}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </Card>

            {/* 2b — What you give it */}
            {inputSchema ? (
              <Card>
                <SectionLabel>What you give it</SectionLabel>
                <p className="text-[13px] mb-4" style={{ color: "#64748b" }}>These are the inputs this agent accepts.</p>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr style={{ borderBottom: "1px solid #F1F5F9" }}>
                        {["Field", "Type", "Required", "Description"].map((h) => (
                          <th key={h} className="pb-3 text-left text-[11px] font-semibold uppercase tracking-widest pr-4" style={{ color: "#94a3b8" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(inputSchema).map(([field, def]: [string, unknown]) => {
                        const d = def as { type?: string; required?: boolean; description?: string; default?: unknown };
                        return (
                          <tr key={field} style={{ borderBottom: "1px solid #F8FAFF" }}>
                            <td className="py-3 pr-4">
                              <span className="text-[13px] font-semibold font-mono-custom" style={{ color: "#0A2540" }}>{field}</span>
                            </td>
                            <td className="py-3 pr-4">
                              <span className="text-[11px] font-semibold px-2 py-0.5 rounded" style={{ background: "#F1F5F9", color: "#64748b" }}>
                                {TYPE_LABELS[d.type ?? "string"] ?? d.type}
                              </span>
                            </td>
                            <td className="py-3 pr-4">
                              {d.required ? (
                                <span className="text-[11px] font-semibold px-2 py-0.5 rounded" style={{ background: cm.bg, color: cm.color }}>Required</span>
                              ) : (
                                <span className="text-[11px] px-2 py-0.5 rounded" style={{ background: "#F8FAFF", color: "#94a3b8" }}>Optional</span>
                              )}
                            </td>
                            <td className="py-3">
                              <span className="text-[13px]" style={{ color: "#64748b" }}>{d.description ?? "—"}</span>
                              {d.default !== undefined && (
                                <span className="block text-[11px] mt-0.5 font-mono-custom" style={{ color: "#94a3b8" }}>Default: {String(d.default)}</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            ) : (
              <Card>
                <SectionLabel>What you give it</SectionLabel>
                <div className="rounded-xl px-4 py-5 text-[13px]" style={{ background: "#F8FAFF", border: "1px solid #E3E8EF", color: "#94a3b8" }}>
                  This agent has not yet published its interface. Check back soon or contact the builder.
                </div>
              </Card>
            )}

            {/* 2c — What you get back */}
            {outputSchema && (
              <Card>
                <SectionLabel>What you get back</SectionLabel>
                <p className="text-[13px] mb-4" style={{ color: "#64748b" }}>The output this agent returns when the job is done.</p>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr style={{ borderBottom: "1px solid #F1F5F9" }}>
                        {["Field", "Type", "Description"].map((h) => (
                          <th key={h} className="pb-3 text-left text-[11px] font-semibold uppercase tracking-widest pr-4" style={{ color: "#94a3b8" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(outputSchema).map(([field, def]: [string, unknown]) => {
                        const d = def as { type?: string; description?: string };
                        return (
                          <tr key={field} style={{ borderBottom: "1px solid #F8FAFF" }}>
                            <td className="py-3 pr-4">
                              <span className="text-[13px] font-semibold font-mono-custom" style={{ color: "#0A2540" }}>{field}</span>
                            </td>
                            <td className="py-3 pr-4">
                              <span className="text-[11px] font-semibold px-2 py-0.5 rounded" style={{ background: "#F1F5F9", color: "#64748b" }}>
                                {TYPE_LABELS[d.type ?? "string"] ?? d.type}
                              </span>
                            </td>
                            <td className="py-3">
                              <span className="text-[13px]" style={{ color: "#64748b" }}>{d.description ?? "—"}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {/* 2d — Pricing */}
            <Card>
              <SectionLabel>Pricing</SectionLabel>
              <div className="flex items-end gap-3 mb-4">
                <span className="text-[36px] font-bold font-mono-custom leading-none" style={{ color: "#0A2540" }}>
                  {formatPrice(agent)}
                </span>
                <span className="text-[14px] mb-1" style={{ color: "#94a3b8" }}>
                  {agent.pricingModel !== "FREE" ? PRICING_SUFFIX[agent.pricingModel] : ""}
                </span>
              </div>
              {priceUsd && (
                <p className="text-[13px] mb-4" style={{ color: "#94a3b8" }}>≈ ${priceUsd} at current rates</p>
              )}
              <div className="space-y-2.5">
                {[
                  ["Model", agent.pricingModel === "PER_CALL" ? "Pay per job" : agent.pricingModel === "PER_DAY" ? "Pay per day" : agent.pricingModel === "PER_MONTH" ? "Pay per month" : "Free"],
                  ["Refund", "Full refund if job fails"],
                  ["Platform fee", "1% to MilkyWay"],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between text-[13px]">
                    <span style={{ color: "#94a3b8" }}>{k}</span>
                    <span style={{ color: "#425466" }}>{v}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* 2e — Reliability */}
            <Card>
              <SectionLabel>Reliability</SectionLabel>
              {logs.length === 0 ? (
                <p className="text-[13px]" style={{ color: "#94a3b8" }}>New agent — reliability data building up.</p>
              ) : (
                <>
                  {/* Big stats */}
                  <div className="flex flex-wrap gap-8 mb-6">
                    {successRate !== null && (
                      <div>
                        <p className="text-[32px] font-bold font-mono-custom leading-none mb-1" style={{ color: "#0A2540" }}>{successRate}%</p>
                        <p className="text-[12px]" style={{ color: "#94a3b8" }}>success rate</p>
                      </div>
                    )}
                    {avgResponse !== null && (
                      <div>
                        <p className="text-[32px] font-bold font-mono-custom leading-none mb-1" style={{ color: "#0A2540" }}>{avgResponse}ms</p>
                        <p className="text-[12px]" style={{ color: "#94a3b8" }}>avg response</p>
                      </div>
                    )}
                  </div>

                  {/* 7-day grid */}
                  <p className="text-[12px] font-semibold uppercase tracking-widest mb-3" style={{ color: "#94a3b8" }}>Last 7 days</p>
                  <div className="flex items-center gap-2">
                    {sevenDays.map(({ iso, day }) => {
                      const verified = logsByDay.get(iso);
                      return (
                        <div key={iso} className="flex flex-col items-center gap-1.5 flex-1">
                          <div
                            className="w-full h-8 rounded-md"
                            style={{
                              background: verified === true ? "#10b981" : verified === false ? "#ef4444" : "#E3E8EF",
                              opacity: verified === true ? 0.85 : 1,
                            }}
                            title={`${day} ${iso} — ${verified === true ? "Verified" : verified === false ? "Failed" : "No data"}`}
                          />
                          <span className="text-[10px]" style={{ color: "#94a3b8" }}>{day}</span>
                        </div>
                      );
                    })}
                  </div>
                  {lastLog && (
                    <p className="text-[12px] mt-3" style={{ color: "#94a3b8" }}>
                      Last checked {timeAgo(lastLog.checkedAt)}
                    </p>
                  )}
                </>
              )}
            </Card>

            {/* 2g — Technical details (collapsed, tabbed) */}
            <TechnicalDetails
              agentId={agent.agentId!}
              ownerAddress={agent.ownerAddress}
              registeredAt={agent.registeredAt}
              updatedAt={agent.updatedAt}
              txHash={agent.txHash}
              metadataHash={agent.metadataHash}
              aboutSchema={agent.aboutSchema}
            />

          </div>

          {/* ── RIGHT ────────────────────────────────────────────── */}
          <div className="space-y-5 lg:sticky lg:top-24">

            {/* QuickExecute or unavailable state */}
            {showQuickExecute ? (
              <QuickExecute
                agentId={agent.agentId!}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                aboutSchema={agent.aboutSchema as any}
                priceEth={agent.priceEth}
              />
            ) : status === "down" ? (
              <Card>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "#ef4444" }} />
                  <h3 className="font-bold text-[15px]" style={{ color: "#0A2540" }}>Agent unavailable</h3>
                </div>
                <p className="text-[13px] mb-4" style={{ color: "#64748b" }}>
                  This agent has not responded to our checks recently. Execution is disabled until it comes back online.
                </p>
                <Link href="/builder" className="block text-center text-[13px] font-semibold py-2.5 rounded-xl transition-colors" style={{ background: "#EFF6FF", color: "#2563EB" }}>
                  Open in Builder →
                </Link>
              </Card>
            ) : (
              <Card>
                <h3 className="font-bold text-[15px] mb-2" style={{ color: "#0A2540" }}>Not yet executable</h3>
                <p className="text-[13px] mb-4" style={{ color: "#64748b" }}>
                  The builder has not published this agent&apos;s execution interface yet.
                </p>
                <Link href="/builder" className="block text-center text-[13px] font-semibold py-2.5 rounded-xl transition-colors" style={{ background: "#EFF6FF", color: "#2563EB" }}>
                  Open in Builder →
                </Link>
              </Card>
            )}

            {/* About the builder */}
            {agent.builder && (
              <Card>
                <SectionLabel>About the builder</SectionLabel>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-[15px]" style={{ background: cm.bg, color: cm.color }}>
                    {agent.builder.address[2]?.toUpperCase() ?? "?"}
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold font-mono-custom" style={{ color: "#0A2540" }} title={agent.builder.address}>
                      {shortAddress(agent.builder.address)}
                    </p>
                    <p className="text-[12px]" style={{ color: "#94a3b8" }}>
                      Member since {new Date(agent.builder.joinedAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[13px] px-3.5 py-2.5 rounded-xl mb-4" style={{ background: "#F8FAFF", border: "1px solid #E3E8EF" }}>
                  <span style={{ color: "#64748b" }}>Agents published</span>
                  <span className="font-semibold" style={{ color: "#0A2540" }}>{agent.builder.agentsCount}</span>
                </div>
                <Link
                  href={`/agents?builder=${agent.builder.address}`}
                  className="text-[13px] font-semibold transition-colors"
                  style={{ color: "#2563EB" }}
                >
                  View all agents by this builder →
                </Link>
              </Card>
            )}

            {/* Use in a flow */}
            {showQuickExecute && (
              <Link
                href={`/builder?agent=${agent.agentId}`}
                className="block text-center text-[13px] font-semibold py-3 rounded-xl transition-colors"
                style={{ background: "#2563EB", color: "#fff" }}
              >
                Use in a flow — Open in Builder →
              </Link>
            )}

          </div>
        </div>

        {/* ── Related agents ───────────────────────────────────── */}
        {related.length > 0 && (
          <div className="mt-14">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display font-bold text-[22px]" style={{ color: "#0A2540" }}>
                More agents like this
              </h2>
              <Link href={`/agents?category=${agent.category}`} className="text-[13px] font-semibold transition-colors" style={{ color: "#2563EB" }}>
                View all {CATEGORY_LABELS[agent.category] ?? agent.category} agents →
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {related.map((a) => (
                <AgentCard key={a.id} agent={a} />
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
