"use client";

import { useEffect, useState, useCallback, useRef, Fragment } from "react";
import Link from "next/link";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { authFetch } from "@/lib/auth";
import { useAuth } from "@/context/AuthContext";
import { AuthGate } from "@/components/AuthGate";
import { REGISTRY_ABI } from "@/lib/registry-abi";
import { CATEGORY_LABELS, timeAgo, agentPath } from "@/lib/utils";
import { AgentAvatar } from "@/components/AgentAvatar";
import { Portal } from "@/components/Portal";
import { UsdcAmount } from "@/components/UsdcAmount";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const ARBISCAN = "https://sepolia.arbiscan.io";
const REGISTRY = process.env.NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS as `0x${string}`;

type Tab = "flows" | "agents" | "earnings";
type HistoryFilter = "ALL" | "COMPLETED" | "FAILED" | "REFUNDED";
type EarningsPeriod = "7d" | "30d" | "all";

interface Summary {
  totalEarnedUsdc: string;
  totalJobsRun: number;
  activeFlows: number;
  agentsLive: number;
  agentsTotal: number;
}

interface FlowAgent {
  id: string;
  agentId: number;
  agentName: string;
  orderIndex: number;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
  amountUsdc: string;
  executedAt: string | null;
  output: unknown;
}

interface DashFlow {
  id: string;
  jobId: string;
  status: "LOCKED" | "RUNNING" | "COMPLETED" | "REFUNDED" | "FAILED";
  trigger: string;
  totalAmountUsdc: string;
  paymentTxHash: string | null;
  createdAt: string;
  completedAt: string | null;
  deadline: string;
  agents: FlowAgent[];
}

interface DashAgent {
  agentId: number;
  name: string;
  category: string;
  badgeTier: string;
  logoUrl?: string | null;
  active: boolean;
  verifiedAt: string | null;
  failedChecks: number;
  priceUsdc: string;
  pricingModel: string;
  aboutSchema: unknown;
  registeredAt: string;
  txHash: string | null;
  totalJobs: number;
  totalEarnedUsdc: string;
  recentJobs: { flowJobId: string; executedAt: string | null; amountUsdc: string }[];
  reliabilityDays: { date: string; hasData: boolean; success: boolean | null }[];
}

interface Earnings {
  totalEarnedUsdc: string;
  totalExecutions: number;
  activeFlows: number;
  perAgent: {
    agentId: number;
    name: string;
    executions: number;
    totalEarnedUsdc: string;
    lastRunAt: string | null;
  }[];
  recentPayments: {
    executedAt: string | null;
    agentId: number;
    agentName: string;
    flowJobId: string;
    amountUsdc: string;
    txHash: string | null;
  }[];
}

interface AgentAnalytics {
  agentId: number;
  name: string;
  category: string;
  badgeTier: string;
  logoUrl?: string | null;
  active: boolean;
  verifiedAt: string | null;
  registeredAt: string;
  priceUsdc: string;
  pricingModel: string;
  totalJobs: number;
  totalEarnedUsdc: string;
  avgResponseTimeMs: number | null;
  successRate: number | null;
  uptime: number | null;
  jobsPerDay: { date: string; count: number; earned: number }[];
  reliabilityDays: { date: string; hasData: boolean; success: boolean | null }[];
  recentJobs: {
    flowJobId: string;
    executedAt: string | null;
    amountUsdc: string;
    status: string;
    paymentTxHash: string | null;
  }[];
}

// ── Helpers ───────────────────────────────────────────────────────────────

function fmt(eth: string): string {
  const n = parseFloat(eth);
  if (n === 0) return "0";
  return n.toFixed(6).replace(/\.?0+$/, "");
}

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function agentHealth(a: DashAgent): "live" | "degraded" | "down" {
  if (!a.active) return "down";
  if (!a.verifiedAt) return "down";
  const hrs = (Date.now() - new Date(a.verifiedAt).getTime()) / 3_600_000;
  if (hrs < 2) return "live";
  if (hrs < 24) return "degraded";
  return "down";
}

const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  LOCKED:    { bg: "#F1F5F9", text: "#64748b" },
  RUNNING:   { bg: "#FFFBEB", text: "#92400e" },
  COMPLETED: { bg: "#F0FDF4", text: "#166534" },
  REFUNDED:  { bg: "#EFF6FF", text: "#1e40af" },
  FAILED:    { bg: "#FEF2F2", text: "#991b1b" },
};

const HEALTH_STYLE = {
  live:     { dot: "#10b981", label: "Live" },
  degraded: { dot: "#f59e0b", label: "Degraded" },
  down:     { dot: "#ef4444", label: "Down" },
};

const AGENT_STATUS_ICON: Record<string, string> = {
  PENDING:   "○",
  RUNNING:   "⟳",
  COMPLETED: "✓",
  FAILED:    "✗",
};

// ── Sub-components ────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: React.ReactNode; sub: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #E3E8EF", borderRadius: "12px", padding: "18px 20px" }}>
      <p style={{ fontSize: "11px", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>
        {label}
      </p>
      <p style={{ fontSize: "22px", fontWeight: 700, color: "#0A2540", marginBottom: "2px", display: "flex", alignItems: "center" }}>{value}</p>
      <p style={{ fontSize: "11px", color: "#94a3b8", display: "flex", alignItems: "center" }}>{sub}</p>
    </div>
  );
}

function StatusChip({ status }: { status: string }) {
  const s = STATUS_COLOR[status] ?? STATUS_COLOR.LOCKED;
  return (
    <span style={{ fontSize: "11px", fontWeight: 700, padding: "2px 8px", borderRadius: "99px", background: s.bg, color: s.text }}>
      {status}
    </span>
  );
}

function PipelineMini({ agents }: { agents: FlowAgent[] }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
      {agents.map((a, i) => {
        const icon = AGENT_STATUS_ICON[a.status] ?? "○";
        const isDone = a.status === "COMPLETED";
        const isFailed = a.status === "FAILED";
        const isRunning = a.status === "RUNNING";
        return (
          <Fragment key={a.id}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
              <span style={{ fontSize: "14px", color: isDone ? "#10b981" : isFailed ? "#ef4444" : isRunning ? "#f59e0b" : "#94a3b8" }}>
                {icon}
              </span>
              <span style={{ fontSize: "10px", color: "#64748b", maxWidth: "72px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {a.agentName}
              </span>
            </div>
            {i < agents.length - 1 && (
              <span style={{ fontSize: "12px", color: "#CBD5E1", marginBottom: "14px" }}>→</span>
            )}
          </Fragment>
        );
      })}
    </div>
  );
}

function ReliabilityCalendar({ days }: { days: DashAgent["reliabilityDays"] }) {
  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return (
    <div style={{ display: "flex", gap: "4px" }}>
      {days.map((d, i) => {
        const bg = !d.hasData ? "#F1F5F9" : d.success ? "#10b981" : "#ef4444";
        return (
          <div key={d.date} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "3px" }}>
            <div style={{ width: "22px", height: "22px", borderRadius: "4px", background: bg }} title={d.date} />
            <span style={{ fontSize: "9px", color: "#94a3b8" }}>{dayNames[i]}</span>
          </div>
        );
      })}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0" }}>
      {children}
    </p>
  );
}

function EmptyState({ icon, title, body, cta, href }: {
  icon: React.ReactNode; title: string; body: string; cta: string; href: string;
}) {
  return (
    <div style={{ background: "#fff", border: "1px solid #E3E8EF", borderRadius: "12px", padding: "48px 24px", textAlign: "center" }}>
      <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
        {icon}
      </div>
      <p style={{ fontWeight: 700, color: "#0A2540", marginBottom: "6px" }}>{title}</p>
      <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "20px" }}>{body}</p>
      <Link href={href} style={{ fontSize: "13px", fontWeight: 600, color: "#2563EB", textDecoration: "none" }}>
        {cta} →
      </Link>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { address } = useAccount();
  const { isSignedIn } = useAuth();

  const [summary, setSummary] = useState<Summary | null>(null);
  const [flows, setFlows] = useState<DashFlow[]>([]);
  const [agents, setAgents] = useState<DashAgent[]>([]);
  const [earnings, setEarnings] = useState<Earnings | null>(null);
  const [loading, setLoading] = useState(true);

  const [tab, setTab] = useState<Tab>("flows");
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>("ALL");
  const [earningsPeriod, setEarningsPeriod] = useState<EarningsPeriod>("30d");
  const [analyticsAgent, setAnalyticsAgent] = useState<AgentAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = useState<DashAgent | null>(null);
  const [editAgent, setEditAgent] = useState<DashAgent | null>(null);
  const [editForm, setEditForm] = useState({ name: "", priceUsdc: "", pricingModel: "" });
  const [editSaving, setEditSaving] = useState(false);
  const [deactivating, setDeactivating] = useState<number | null>(null);
  const [error, setError] = useState("");

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { writeContract, data: txHash, isPending: isTxPending } = useWriteContract();
  const { isSuccess: isTxDone } = useWaitForTransactionReceipt({ hash: txHash });

  const fetchFlows = useCallback(async () => {
    if (!isSignedIn) return;
    try {
      const r = await authFetch(`${API}/api/dashboard/flows`);
      const data = await r.json();
      setFlows(Array.isArray(data) ? data : []);
    } catch { /* silent */ }
  }, [isSignedIn]);

  useEffect(() => {
    if (!address || !isSignedIn) return;
    setLoading(true);
    Promise.all([
      authFetch(`${API}/api/dashboard/summary`).then((r) => r.json()),
      authFetch(`${API}/api/dashboard/flows`).then((r) => r.json()),
      authFetch(`${API}/api/dashboard/agents`).then((r) => r.json()),
    ])
      .then(([sum, fls, ags]) => {
        setSummary(sum);
        setFlows(Array.isArray(fls) ? fls : []);
        setAgents(Array.isArray(ags) ? ags : []);
        if ((ags as DashAgent[]).length > 0) setTab("agents");
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [address, isSignedIn]);

  // Poll active flows every 3s
  useEffect(() => {
    const hasActive = flows.some((f) => f.status === "LOCKED" || f.status === "RUNNING");
    if (hasActive && !pollRef.current) {
      pollRef.current = setInterval(fetchFlows, 3000);
    } else if (!hasActive && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    return () => {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    };
  }, [flows, fetchFlows]);

  // Fetch/re-fetch earnings when tab opens or period changes
  useEffect(() => {
    if (tab !== "earnings" || !address || !isSignedIn) return;
    setEarnings(null); // clear previous data while loading
    authFetch(`${API}/api/earnings/${address}?period=${earningsPeriod}`)
      .then((r) => r.json())
      .then(setEarnings)
      .catch(() => {});
  }, [tab, address, isSignedIn, earningsPeriod]);

  // Handle deactivation tx confirmation
  useEffect(() => {
    if (!isTxDone || deactivating === null) return;
    authFetch(`${API}/api/agents/${deactivating}`, { method: "DELETE" })
      .then(() => {
        setAgents((prev) => prev.map((a) => a.agentId === deactivating ? { ...a, active: false } : a));
        setDeactivating(null);
        setConfirmDeactivate(null);
      })
      .catch((e) => setError((e as Error).message));
  }, [isTxDone, deactivating]);

  function startDeactivate(agent: DashAgent) {
    setError("");
    setDeactivating(agent.agentId);
    writeContract({
      address: REGISTRY,
      abi: REGISTRY_ABI,
      functionName: "deactivateAgent",
      args: [BigInt(agent.agentId)],
    });
    setConfirmDeactivate(null);
  }

  async function saveEdit() {
    if (!editAgent) return;
    setEditSaving(true);
    try {
      const r = await authFetch(`${API}/api/agents/${editAgent.agentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editForm.name, priceUsdc: editForm.priceUsdc, pricingModel: editForm.pricingModel }),
      });
      if (!r.ok) throw new Error("Failed to save");
      setAgents((prev) => prev.map((a) => a.agentId === editAgent.agentId ? { ...a, ...editForm } : a));
      setEditAgent(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setEditSaving(false);
    }
  }

  async function openAnalytics(agentId: number) {
    setAnalyticsLoading(true);
    setAnalyticsAgent(null);
    try {
      const data = await authFetch(`${API}/api/dashboard/agents/${agentId}/analytics`).then((r) => r.json());
      setAnalyticsAgent(data);
    } catch {
      // silently ignore
    } finally {
      setAnalyticsLoading(false);
    }
  }

  const activeFlows = flows.filter((f) => f.status === "LOCKED" || f.status === "RUNNING");
  const historyFlows = flows.filter((f) => {
    if (f.status === "LOCKED" || f.status === "RUNNING") return false;
    return historyFilter === "ALL" || f.status === historyFilter;
  });

  function buildChartData() {
    if (!earnings) return [];
    const days = earningsPeriod === "7d" ? 7 : 30;
    return Array.from({ length: days }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (days - 1 - i));
      const dateStr = d.toISOString().slice(0, 10);
      const eth = earnings.recentPayments
        .filter((p) => p.executedAt?.slice(0, 10) === dateStr)
        .reduce((s, p) => s + parseFloat(p.amountUsdc), 0);
      return { day: dateStr.slice(5), eth };
    });
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <AuthGate description="Sign in to manage your agents, track earnings, and monitor flows.">
      <div style={{ background: "#f8faff", minHeight: "100vh", padding: "32px 16px" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>

          {/* Header */}
          <div style={{ marginBottom: "24px" }}>
            <p style={{ fontSize: "13px", color: "#94a3b8", marginBottom: "4px" }}>Welcome back</p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
              <p style={{ fontFamily: "monospace", fontSize: "16px", fontWeight: 700, color: "#0A2540" }}>
                {address ? shortAddr(address) : "—"}
              </p>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <Link
                  href="/builder"
                  style={{ fontSize: "13px", fontWeight: 600, color: "#2563EB", textDecoration: "none", padding: "8px 14px", background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: "8px", transition: "background 0.15s" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#DBEAFE"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "#EFF6FF"; }}
                >
                  ⚡ Open Builder
                </Link>
                <Link
                  href="/register"
                  style={{ fontSize: "13px", fontWeight: 600, color: "#2563EB", textDecoration: "none", padding: "8px 14px", background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: "8px", transition: "background 0.15s" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#DBEAFE"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "#EFF6FF"; }}
                >
                  + Register Agent
                </Link>
                <Link
                  href="/settings/api-keys"
                  style={{ fontSize: "13px", fontWeight: 600, color: "#64748b", textDecoration: "none", padding: "8px 14px", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "8px", transition: "background 0.15s" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#F1F5F9"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "#F8FAFC"; }}
                >
                  Settings →
                </Link>
              </div>
            </div>
          </div>

          {/* Summary strip */}
          {summary && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px", marginBottom: "28px" }}>
              {summary.agentsTotal > 0 && <StatCard label="Total earned" value={<UsdcAmount amount={fmt(summary.totalEarnedUsdc)} size={17} />} sub="all time" />}
              {(summary.totalJobsRun > 0 || summary.activeFlows > 0) && <StatCard label="Jobs run" value={summary.totalJobsRun.toLocaleString()} sub="all time" />}
              {(summary.totalJobsRun > 0 || summary.activeFlows > 0) && <StatCard label="Active agentic flows" value={summary.activeFlows.toString()} sub="right now" />}
              {summary.agentsTotal > 0 && <StatCard label="Agents" value={`${summary.agentsLive} live`} sub={`${summary.agentsTotal} total`} />}
            </div>
          )}

          {/* Tabs */}
          <div style={{ display: "flex", borderBottom: "1px solid #E3E8EF", marginBottom: "28px" }}>
            {(["flows", "agents", "earnings"] as Tab[]).map((t) => {
              const labels: Record<Tab, string> = { flows: "My Agentic Flows", agents: "My Agents", earnings: "Earnings" };
              const active = tab === t;
              return (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  style={{
                    padding: "10px 20px", fontSize: "14px", fontWeight: 600, background: "none", border: "none",
                    cursor: "pointer", color: active ? "#0A2540" : "#94a3b8",
                    borderBottom: active ? "2px solid #2563EB" : "2px solid transparent",
                    marginBottom: "-1px", transition: "color 0.15s",
                  }}
                >
                  {labels[t]}
                </button>
              );
            })}
          </div>

          {/* Loading skeletons */}
          {loading && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {[1, 2, 3].map((i) => (
                <div key={i} style={{ height: "68px", background: "#fff", border: "1px solid #E3E8EF", borderRadius: "12px", opacity: 0.5 }} />
              ))}
            </div>
          )}

          {!loading && (
            <>
              {/* ══ My Flows ══ */}
              {tab === "flows" && (
                <div>
                  {/* Active */}
                  {activeFlows.length > 0 && (
                    <div style={{ marginBottom: "32px" }}>
                      <div style={{ borderLeft: "3px solid #2563EB", paddingLeft: "10px", marginBottom: "14px" }}>
                        <SectionLabel>Running now</SectionLabel>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        {activeFlows.map((f) => (
                          <div key={f.id} style={{ background: "#fff", border: "1px solid #E3E8EF", borderRadius: "12px", padding: "20px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "8px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                <StatusChip status={f.status} />
                                <span style={{ fontSize: "11px", fontFamily: "monospace", color: "#94a3b8" }}>{f.jobId.slice(0, 18)}…</span>
                              </div>
                              <Link href={`/flows/${f.jobId}`} style={{ fontSize: "12px", color: "#2563EB", fontWeight: 600, textDecoration: "none" }}>
                                View details →
                              </Link>
                            </div>
                            <PipelineMini agents={f.agents} />
                            <p style={{ fontSize: "11px", color: "#94a3b8", marginTop: "12px" }}>
                              Started {timeAgo(f.createdAt)} · <span style={{ color: "#0A2540", fontWeight: 600 }}>{f.agents.filter((a) => a.status === "COMPLETED").length} of {f.agents.length}</span> agents complete
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* History */}
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
                      <div style={{ borderLeft: "3px solid #2563EB", paddingLeft: "10px" }}><SectionLabel>History</SectionLabel></div>
                      <div style={{ display: "flex", gap: "4px" }}>
                        {(["ALL", "COMPLETED", "FAILED", "REFUNDED"] as HistoryFilter[]).map((f) => (
                          <button
                            key={f}
                            onClick={() => setHistoryFilter(f)}
                            style={{
                              padding: "4px 10px", fontSize: "11px", fontWeight: 600, borderRadius: "6px", cursor: "pointer", border: "1px solid",
                              borderColor: historyFilter === f ? "#BFDBFE" : "#E3E8EF",
                              background: historyFilter === f ? "#EFF6FF" : "#fff",
                              color: historyFilter === f ? "#2563EB" : "#64748b",
                            }}
                          >
                            {f === "ALL" ? "All" : f.charAt(0) + f.slice(1).toLowerCase()}
                          </button>
                        ))}
                      </div>
                    </div>

                    {historyFlows.length === 0 ? (
                      <EmptyState
                        icon={<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#2563EB" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
                        title="No agentic flows yet"
                        body="Build a multi-agent agentic flow to automate on-chain tasks."
                        cta="Open the Builder"
                        href="/builder"
                      />
                    ) : (
                      <div style={{ background: "#fff", border: "1px solid #E3E8EF", borderRadius: "12px", overflow: "hidden" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                          <thead>
                            <tr style={{ borderBottom: "1px solid #DBEAFE", background: "#EFF6FF" }}>
                              {["When", "Agents", "Cost", "Status"].map((h, i) => (
                                <th key={h} style={{ padding: "12px 16px", textAlign: i >= 2 ? "right" : "left", fontSize: "11px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {historyFlows.map((f) => (
                              <tr
                                key={f.id}
                                style={{ borderBottom: "1px solid #F1F5F9", cursor: "pointer" }}
                                onClick={() => (window.location.href = `/flows/${f.jobId}`)}
                                onMouseEnter={(e) => (e.currentTarget.style.background = "#F5F8FF")}
                                onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                              >
                                <td style={{ padding: "12px 16px", color: "#64748b", fontSize: "12px" }}>{timeAgo(f.createdAt)}</td>
                                <td style={{ padding: "12px 16px", color: "#0A2540", fontWeight: 500 }}>{f.agents.map((a) => a.agentName).join(" → ")}</td>
                                <td style={{ padding: "12px 16px", textAlign: "right", color: "#0A2540", fontWeight: 700, fontFamily: "monospace" }}><UsdcAmount amount={fmt(f.totalAmountUsdc)} size={12} /></td>
                                <td style={{ padding: "12px 16px", textAlign: "right" }}><StatusChip status={f.status} /></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    <div style={{ marginTop: "20px", textAlign: "center" }}>
                      <Link href="/builder" style={{ fontSize: "13px", fontWeight: 600, color: "#2563EB", textDecoration: "none" }}>
                        + Build a new agentic flow →
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {/* ══ My Agents ══ */}
              {tab === "agents" && (
                <div>
                  {agents.length === 0 ? (
                    <EmptyState
                      icon={<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#2563EB" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>}
                      title="No agents registered"
                      body="Build something useful. List it here. Earn automatically."
                      cta="Register your first agent"
                      href="/register"
                    />
                  ) : (
                    <div style={{ background: "#fff", border: "1px solid #E3E8EF", borderRadius: "12px", overflow: "hidden" }}>
                      {/* Table header */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 110px 60px 70px 90px 110px", padding: "10px 20px", background: "#EFF6FF", borderBottom: "1px solid #DBEAFE" }}>
                        {["Agent", "Status", "Badge", "Jobs", "Earned", "Actions"].map((h, i) => (
                          <span key={h} style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", textAlign: i >= 3 ? "right" : "left" }}>
                            {h}
                          </span>
                        ))}
                      </div>

                      {agents.map((agent) => {
                        const health = agentHealth(agent);
                        const hs = HEALTH_STYLE[health];

                        return (
                          <div key={agent.agentId} style={{ borderBottom: "1px solid #F1F5F9" }}>
                            <div
                              onClick={() => openAnalytics(agent.agentId)}
                              style={{ display: "grid", gridTemplateColumns: "1fr 110px 60px 70px 90px 110px", padding: "14px 20px", cursor: "pointer", transition: "background 0.1s" }}
                              onMouseEnter={(e) => {
                                (e.currentTarget as HTMLElement).style.background = "#F5F8FF";
                                (e.currentTarget as HTMLElement).style.borderLeft = "3px solid #2563EB";
                              }}
                              onMouseLeave={(e) => {
                                (e.currentTarget as HTMLElement).style.background = "";
                                (e.currentTarget as HTMLElement).style.borderLeft = "";
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                <AgentAvatar
                                  agentId={agent.agentId}
                                  logoUrl={agent.logoUrl}
                                  badgeTier={(agent.badgeTier ?? "NONE") as "NONE" | "BRONZE" | "SILVER" | "GOLD"}
                                  size={40}
                                  showTooltip={false}
                                />
                                <div>
                                  <p style={{ fontSize: "14px", fontWeight: 600, color: "#0A2540" }}>{agent.name}</p>
                                  <p style={{ fontSize: "11px", color: "#94a3b8", fontFamily: "monospace" }}>
                                    <span style={{ color: "#94a3b8", fontWeight: 600 }}>#{agent.agentId}</span>
                                    {" · "}
                                    <span style={{ background: "#F1F5F9", color: "#64748b", padding: "1px 5px", borderRadius: "4px", fontSize: "10px", fontWeight: 600 }}>
                                      {CATEGORY_LABELS[agent.category] ?? agent.category}
                                    </span>
                                  </p>
                                </div>
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: hs.dot, flexShrink: 0 }} />
                                <span style={{ fontSize: "12px", color: "#64748b" }}>{hs.label}</span>
                              </div>
                              <div style={{ display: "flex", alignItems: "center" }}>
                                <span style={{ fontSize: "16px" }}>
                                  {agent.badgeTier === "BRONZE" ? "🥉" : agent.badgeTier === "SILVER" ? "🥈" : agent.badgeTier === "GOLD" ? "🥇" : "—"}
                                </span>
                              </div>
                              <p style={{ fontSize: "13px", fontWeight: 700, color: "#0A2540", textAlign: "right", display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
                                {agent.totalJobs}
                              </p>
                              <p style={{ fontSize: "12px", color: "#0A2540", fontWeight: 600, textAlign: "right", display: "flex", alignItems: "center", justifyContent: "flex-end", fontFamily: "monospace" }}>
                                <UsdcAmount amount={fmt(agent.totalEarnedUsdc)} size={11} />
                              </p>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "6px" }}>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditAgent(agent);
                                    setEditForm({ name: agent.name, priceUsdc: agent.priceUsdc, pricingModel: agent.pricingModel });
                                  }}
                                  style={{ fontSize: "11px", fontWeight: 600, color: "#2563EB", background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: "6px", padding: "4px 8px", cursor: "pointer" }}
                                >
                                  Edit
                                </button>
                                {agent.active && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setConfirmDeactivate(agent); }}
                                    style={{ fontSize: "11px", fontWeight: 600, color: "#ef4444", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "6px", padding: "4px 8px", cursor: "pointer" }}
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>
                            </div>

                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ══ Earnings ══ */}
              {tab === "earnings" && (
                <div>
                  <div style={{ display: "flex", gap: "6px", marginBottom: "20px" }}>
                    {(["7d", "30d", "all"] as EarningsPeriod[]).map((p) => (
                      <button
                        key={p}
                        onClick={() => setEarningsPeriod(p)}
                        style={{
                          padding: "6px 14px", fontSize: "12px", fontWeight: 600, borderRadius: "8px", cursor: "pointer", border: "1px solid",
                          borderColor: earningsPeriod === p ? "#BFDBFE" : "#E3E8EF",
                          background: earningsPeriod === p ? "#EFF6FF" : "#fff",
                          color: earningsPeriod === p ? "#2563EB" : "#64748b",
                        }}
                      >
                        {p === "7d" ? "Last 7 days" : p === "30d" ? "Last 30 days" : "All time"}
                      </button>
                    ))}
                  </div>

                  {!earnings ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      {[1, 2].map((i) => <div key={i} style={{ height: "80px", background: "#fff", border: "1px solid #E3E8EF", borderRadius: "12px", opacity: 0.5 }} />)}
                    </div>
                  ) : earnings.perAgent.length === 0 ? (
                    <EmptyState
                      icon={<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#2563EB" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
                      title="No earnings yet"
                      body="Once someone runs your agent, your earnings appear here."
                      cta="Share your agent page"
                      href={agents.length > 0 ? agentPath(agents[0]) : "/register"}
                    />
                  ) : (
                    <>
                      {/* Summary */}
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px", marginBottom: "20px" }}>
                        <StatCard label="Total earned" value={<UsdcAmount amount={fmt(earnings.totalEarnedUsdc)} size={17} />} sub="all time" />
                        <StatCard label="Executions" value={earnings.totalExecutions.toLocaleString()} sub="all time" />
                        <StatCard
                          label="Best agent"
                          value={[...earnings.perAgent].sort((a, b) => parseFloat(b.totalEarnedUsdc) - parseFloat(a.totalEarnedUsdc))[0]?.name ?? "—"}
                          sub={<UsdcAmount amount={fmt([...earnings.perAgent].sort((a, b) => parseFloat(b.totalEarnedUsdc) - parseFloat(a.totalEarnedUsdc))[0]?.totalEarnedUsdc ?? "0")} size={11} />}
                        />
                      </div>

                      {/* Bar chart */}
                      <div style={{ background: "#fff", border: "1px solid #E3E8EF", borderRadius: "12px", padding: "20px", marginBottom: "20px" }}>
                        <p style={{ fontSize: "12px", fontWeight: 600, color: "#64748b", marginBottom: "16px" }}>
                          Daily earnings — {earningsPeriod === "7d" ? "last 7 days" : earningsPeriod === "30d" ? "last 30 days" : "all time"}
                        </p>
                        <ResponsiveContainer width="100%" height={160}>
                          <BarChart data={buildChartData()} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                            <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} interval={earningsPeriod === "7d" ? 0 : 6} />
                            <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                            <Tooltip
                              formatter={(v: unknown) => [`${fmt(String(v))} USDC`, "Earned"]}
                              contentStyle={{ border: "1px solid #E3E8EF", borderRadius: "8px", fontSize: "12px" }}
                              cursor={{ fill: "#EFF6FF" }}
                            />
                            <Bar dataKey="eth" fill="#2563EB" radius={[3, 3, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Per-agent */}
                      <div style={{ background: "#fff", border: "1px solid #E3E8EF", borderRadius: "12px", overflow: "hidden", marginBottom: "20px" }}>
                        <div style={{ padding: "14px 20px", borderBottom: "1px solid #DBEAFE", background: "#EFF6FF" }}>
                          <SectionLabel>By agent</SectionLabel>
                        </div>
                        {earnings.perAgent.map((a) => {
                          const total = parseFloat(earnings.totalEarnedUsdc);
                          const pct = total > 0 ? (parseFloat(a.totalEarnedUsdc) / total) * 100 : 0;
                          return (
                            <div key={a.agentId} style={{ padding: "16px 20px", borderBottom: "1px solid #F1F5F9" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                                <div>
                                  <p style={{ fontSize: "14px", fontWeight: 600, color: "#0A2540" }}>{a.name}</p>
                                  <p style={{ fontSize: "12px", color: "#64748b" }}>
                                    <span style={{ color: "#0A2540", fontWeight: 700 }}>{a.executions}</span> job{a.executions !== 1 ? "s" : ""}
                                    {a.lastRunAt && <> · last run {timeAgo(a.lastRunAt)}</>}
                                  </p>
                                </div>
                                <div style={{ textAlign: "right" }}>
                                  <p style={{ fontSize: "14px", fontWeight: 700, color: "#0A2540", fontFamily: "monospace", display: "flex", alignItems: "center", justifyContent: "flex-end" }}><UsdcAmount amount={fmt(a.totalEarnedUsdc)} size={13} /></p>
                                  <p style={{ fontSize: "11px", color: "#64748b", fontWeight: 600 }}>{pct.toFixed(0)}% of total</p>
                                </div>
                              </div>
                              <div style={{ height: "5px", background: "#EEF2FF", borderRadius: "3px", overflow: "hidden" }}>
                                <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg, #2563EB, #60a5fa)", borderRadius: "3px" }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Recent payments */}
                      {earnings.recentPayments.length > 0 && (
                        <div style={{ background: "#fff", border: "1px solid #E3E8EF", borderRadius: "12px", overflow: "hidden" }}>
                          <div style={{ padding: "14px 20px", borderBottom: "1px solid #DBEAFE", background: "#EFF6FF" }}>
                            <SectionLabel>Recent payments</SectionLabel>
                          </div>
                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                            <thead>
                              <tr style={{ background: "#EFF6FF", borderBottom: "1px solid #DBEAFE" }}>
                                {["Date", "Agent", "Flow", "Amount", "Tx"].map((h, i) => (
                                  <th key={h} style={{ padding: "10px 16px", textAlign: i >= 3 ? "right" : "left", fontSize: "11px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                                    {h}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {earnings.recentPayments.map((p, i) => (
                                <tr
                                  key={i}
                                  style={{ borderBottom: "1px solid #F1F5F9" }}
                                  onMouseEnter={(e) => (e.currentTarget.style.background = "#F5F8FF")}
                                  onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                                >
                                  <td style={{ padding: "12px 16px", color: "#64748b", fontSize: "12px" }}>{p.executedAt ? timeAgo(p.executedAt) : "—"}</td>
                                  <td style={{ padding: "12px 16px", color: "#0A2540", fontWeight: 600 }}>{p.agentName}</td>
                                  <td style={{ padding: "12px 16px", fontFamily: "monospace", fontSize: "11px" }}>
                                    <span style={{ background: "#F1F5F9", color: "#64748b", padding: "2px 7px", borderRadius: "5px", fontWeight: 600 }}>{p.flowJobId.slice(0, 14)}…</span>
                                  </td>
                                  <td style={{ padding: "12px 16px", textAlign: "right", color: "#10b981", fontWeight: 700, fontFamily: "monospace" }}><UsdcAmount amount={fmt(p.amountUsdc)} size={12} /></td>
                                  <td style={{ padding: "12px 16px", textAlign: "right" }}>
                                    {p.txHash
                                      ? <a href={`${ARBISCAN}/tx/${p.txHash}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: "12px", color: "#64748b", textDecoration: "none", fontWeight: 600 }}>↗ Tx</a>
                                      : <span style={{ color: "#94a3b8" }}>—</span>
                                    }
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </>
          )}

          {error && (
            <div style={{ marginTop: "16px", padding: "12px 16px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "10px", fontSize: "13px", color: "#ef4444" }}>
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Deactivate modal */}
      {confirmDeactivate && (
        <Modal onClose={() => setConfirmDeactivate(null)}>
          <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#0A2540", marginBottom: "8px" }}>
            Deactivate {confirmDeactivate.name}?
          </h3>
          <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "20px", lineHeight: 1.6 }}>
            <p>This will:</p>
            <ul style={{ paddingLeft: "16px", marginTop: "8px" }}>
              <li>Remove the agent from the marketplace</li>
              <li>Return your <strong style={{ color: "#0A2540" }}>0.01 ETH</strong> stake to your wallet</li>
              <li>Cancel any scheduled agentic flows using this agent</li>
            </ul>
            <p style={{ marginTop: "10px", color: "#ef4444" }}>This cannot be undone.</p>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={() => setConfirmDeactivate(null)} style={{ flex: 1, padding: "11px", background: "#fff", border: "1px solid #E3E8EF", borderRadius: "10px", fontSize: "14px", fontWeight: 500, color: "#425466", cursor: "pointer" }}>
              Cancel
            </button>
            <button
              onClick={() => startDeactivate(confirmDeactivate)}
              disabled={isTxPending}
              style={{ flex: 1, padding: "11px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "10px", fontSize: "14px", fontWeight: 700, color: "#ef4444", cursor: "pointer", opacity: isTxPending ? 0.6 : 1 }}
            >
              {isTxPending ? "Check wallet…" : "Deactivate and refund"}
            </button>
          </div>
        </Modal>
      )}

      {/* Edit modal */}
      {editAgent && (
        <Modal onClose={() => setEditAgent(null)}>
          <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#0A2540", marginBottom: "4px" }}>
            Edit: {editAgent.name}
          </h3>
          <p style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "20px" }}>
            Endpoint and category cannot be changed after registration.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "20px" }}>
            <div>
              <label style={{ fontSize: "11px", fontWeight: 600, color: "#425466", display: "block", marginBottom: "6px" }}>Name</label>
              <input
                value={editForm.name}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                style={{ width: "100%", border: "1px solid #E3E8EF", borderRadius: "8px", padding: "9px 12px", fontSize: "13px", color: "#0A2540", outline: "none", boxSizing: "border-box" }}
              />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "#425466", display: "block", marginBottom: "6px" }}>Pricing model</label>
                <select
                  value={editForm.pricingModel}
                  onChange={(e) => setEditForm((f) => ({ ...f, pricingModel: e.target.value }))}
                  style={{ width: "100%", border: "1px solid #E3E8EF", borderRadius: "8px", padding: "9px 12px", fontSize: "13px", color: "#0A2540", outline: "none" }}
                >
                  {["PER_CALL", "PER_DAY", "PER_MONTH", "FREE"].map((o) => (
                    <option key={o} value={o}>{o.replace("PER_", "Per ").charAt(0).toUpperCase() + o.replace("PER_", "Per ").slice(1).toLowerCase()}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "#425466", display: "block", marginBottom: "6px" }}>Price (USDC)</label>
                <input
                  value={editForm.priceUsdc}
                  onChange={(e) => setEditForm((f) => ({ ...f, priceUsdc: e.target.value }))}
                  disabled={editForm.pricingModel === "FREE"}
                  style={{ width: "100%", border: "1px solid #E3E8EF", borderRadius: "8px", padding: "9px 12px", fontSize: "13px", color: "#0A2540", outline: "none", opacity: editForm.pricingModel === "FREE" ? 0.4 : 1 }}
                />
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={() => setEditAgent(null)} style={{ flex: 1, padding: "11px", background: "#fff", border: "1px solid #E3E8EF", borderRadius: "10px", fontSize: "14px", fontWeight: 500, color: "#425466", cursor: "pointer" }}>
              Cancel
            </button>
            <button
              onClick={saveEdit}
              disabled={editSaving}
              style={{ flex: 1, padding: "11px", background: "#2563EB", border: "none", borderRadius: "10px", fontSize: "14px", fontWeight: 700, color: "#fff", cursor: "pointer", opacity: editSaving ? 0.6 : 1 }}
            >
              {editSaving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </Modal>
      )}

      {/* ── Agent Analytics Modal ── */}
      {(analyticsAgent || analyticsLoading) && (
        <Portal>
        <div
          onClick={() => setAnalyticsAgent(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)", zIndex: 200, display: "flex", alignItems: "flex-start", justifyContent: "flex-end" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(640px, 100vw)",
              height: "100vh",
              background: "#fff",
              boxShadow: "-8px 0 40px rgba(0,0,0,0.15)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {analyticsLoading ? (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <p style={{ color: "#94a3b8", fontSize: "14px" }}>Loading analytics…</p>
              </div>
            ) : analyticsAgent ? (
              <>
                {/* Header */}
                <div style={{ padding: "20px 24px", borderBottom: "1px solid #E3E8EF", display: "flex", alignItems: "center", gap: "14px", flexShrink: 0 }}>
                  <AgentAvatar
                    agentId={analyticsAgent.agentId}
                    logoUrl={analyticsAgent.logoUrl}
                    badgeTier={(analyticsAgent.badgeTier ?? "NONE") as "NONE" | "BRONZE" | "SILVER" | "GOLD"}
                    size={48}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: "16px", fontWeight: 700, color: "#0A2540", lineHeight: 1.2 }}>{analyticsAgent.name}</p>
                    <p style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                      #{analyticsAgent.agentId} · {CATEGORY_LABELS[analyticsAgent.category] ?? analyticsAgent.category}
                      {analyticsAgent.verifiedAt && <> · verified {timeAgo(analyticsAgent.verifiedAt)}</>}
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center", flexShrink: 0 }}>
                    <Link
                      href={agentPath(analyticsAgent)}
                      target="_blank"
                      style={{ fontSize: "12px", fontWeight: 600, color: "#2563EB", textDecoration: "none", padding: "6px 12px", background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: "7px", whiteSpace: "nowrap" }}
                    >
                      View public page →
                    </Link>
                    <button
                      onClick={() => setAnalyticsAgent(null)}
                      style={{ width: "28px", height: "28px", borderRadius: "7px", border: "1px solid #E3E8EF", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", fontSize: "16px", flexShrink: 0 }}
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Scrollable content */}
                <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: "24px" }}>

                  {/* Stat cards */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    {[
                      { label: "Total jobs",   value: analyticsAgent.totalJobs.toString(),       sub: "completed" },
                      { label: "Total earned", value: <UsdcAmount amount={fmt(analyticsAgent.totalEarnedUsdc)} size={17} />, sub: "all time" },
                      { label: "Avg response", value: analyticsAgent.avgResponseTimeMs != null ? `${analyticsAgent.avgResponseTimeMs}ms` : "—", sub: "last 30 days" },
                      { label: "Uptime",       value: analyticsAgent.uptime != null ? `${analyticsAgent.uptime}%` : "—", sub: "last 30 days" },
                    ].map(({ label, value, sub }) => (
                      <div key={label} style={{ background: "#F8FAFC", border: "1px solid #E3E8EF", borderRadius: "10px", padding: "14px 16px" }}>
                        <p style={{ fontSize: "11px", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>{label}</p>
                        <p style={{ fontSize: "22px", fontWeight: 700, color: "#0A2540", fontFamily: "monospace", lineHeight: 1, display: "flex", alignItems: "center" }}>{value}</p>
                        <p style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px" }}>{sub}</p>
                      </div>
                    ))}
                  </div>

                  {/* Jobs per day chart */}
                  <div>
                    <SectionLabel>Jobs — last 30 days</SectionLabel>
                    <div style={{ height: "140px" }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analyticsAgent.jobsPerDay} margin={{ top: 0, right: 0, left: -28, bottom: 0 }}>
                          <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#94a3b8" }} tickFormatter={(v: string) => v.slice(5)} interval={6} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#94a3b8" }} />
                          <Tooltip
                            contentStyle={{ border: "1px solid #E3E8EF", borderRadius: "8px", fontSize: "12px" }}
                            cursor={{ fill: "#EFF6FF" }}
                          />
                          <Bar dataKey="count" fill="#2563EB" radius={[2, 2, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Reliability calendar */}
                  <div>
                    <SectionLabel>Reliability — last 7 days</SectionLabel>
                    <ReliabilityCalendar days={analyticsAgent.reliabilityDays} />
                  </div>

                  {/* Recent jobs table */}
                  <div>
                    <SectionLabel>Recent jobs</SectionLabel>
                    {analyticsAgent.recentJobs.length === 0 ? (
                      <p style={{ fontSize: "13px", color: "#94a3b8" }}>No jobs run yet.</p>
                    ) : (
                      <div style={{ border: "1px solid #E3E8EF", borderRadius: "10px", overflow: "hidden" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 90px 90px 90px", padding: "8px 14px", background: "#F8FAFC", borderBottom: "1px solid #E3E8EF" }}>
                          {["Job ID", "Status", "Earned", "Time"].map((h, i) => (
                            <span key={h} style={{ fontSize: "10px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", textAlign: i > 0 ? "right" : "left" }}>{h}</span>
                          ))}
                        </div>
                        {analyticsAgent.recentJobs.map((job, i) => {
                          const sc = STATUS_COLOR[job.status] ?? STATUS_COLOR.FAILED;
                          return (
                            <div
                              key={i}
                              style={{ display: "grid", gridTemplateColumns: "1fr 90px 90px 90px", padding: "10px 14px", borderBottom: i < analyticsAgent.recentJobs.length - 1 ? "1px solid #F1F5F9" : "none", alignItems: "center" }}
                            >
                              <span style={{ fontSize: "12px", color: "#64748b", fontFamily: "monospace" }}>
                                {job.paymentTxHash ? (
                                  <a href={`${ARBISCAN}/tx/${job.paymentTxHash}`} target="_blank" rel="noreferrer" style={{ color: "#2563EB", textDecoration: "none" }}>
                                    {job.flowJobId.slice(0, 10)}…
                                  </a>
                                ) : `${job.flowJobId.slice(0, 10)}…`}
                              </span>
                              <span style={{ textAlign: "right" }}>
                                <span style={{ fontSize: "11px", fontWeight: 600, padding: "2px 7px", borderRadius: "5px", background: sc.bg, color: sc.text }}>{job.status}</span>
                              </span>
                              <span style={{ fontSize: "12px", fontWeight: 600, color: "#10b981", textAlign: "right", fontFamily: "monospace", display: "flex", alignItems: "center", justifyContent: "flex-end" }}><UsdcAmount amount={fmt(job.amountUsdc)} size={11} /></span>
                              <span style={{ fontSize: "11px", color: "#94a3b8", textAlign: "right" }}>{job.executedAt ? timeAgo(job.executedAt) : "—"}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
        </Portal>
      )}
    </AuthGate>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <Portal>
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: "16px" }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{ background: "#fff", border: "1px solid #E3E8EF", borderRadius: "16px", padding: "28px", maxWidth: "440px", width: "100%", boxShadow: "0 20px 60px rgba(10,37,64,0.15)" }}
        >
          {children}
        </div>
      </div>
    </Portal>
  );
}
