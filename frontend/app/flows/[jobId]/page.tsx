"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiFetch, timeAgo } from "@/lib/utils";
import { AgentAvatar } from "@/components/AgentAvatar";
import { UsdcAmount } from "@/components/UsdcAmount";

type FlowStatus  = "LOCKED" | "RUNNING" | "COMPLETED" | "REFUNDED" | "FAILED";
type AgentStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";

interface FlowAgent {
  id: string;
  agentId: number;
  agentName: string;
  agentSlug: string | null;
  logoUrl: string | null;
  orderIndex: number;
  amountUsdc: string;
  status: AgentStatus;
  output: { _error?: boolean; message?: string; httpStatus?: number; [key: string]: unknown } | null;
  executedAt: string | null;
}

interface Flow {
  id: string;
  jobId: string;
  callerAddress: string;
  totalAmountUsdc: string;
  deadline: string;
  trigger: string;
  status: FlowStatus;
  completedAt: string | null;
  createdAt: string;
  agents: FlowAgent[];
}

// ── Status config ─────────────────────────────────────────────────────────

const FLOW_STATUS: Record<FlowStatus, { bg: string; text: string; dot: string; label: string }> = {
  LOCKED:    { bg: "#FFF7ED", text: "#92400e", dot: "#f59e0b", label: "Locked" },
  RUNNING:   { bg: "#EFF6FF", text: "#1e40af", dot: "#2563EB", label: "Running" },
  COMPLETED: { bg: "#F0FDF4", text: "#166534", dot: "#10b981", label: "Completed" },
  REFUNDED:  { bg: "#F0FDF4", text: "#166534", dot: "#10b981", label: "Refunded" },
  FAILED:    { bg: "#FEF2F2", text: "#991b1b", dot: "#ef4444", label: "Failed" },
};

const AGENT_STATUS: Record<AgentStatus, { color: string; bg: string }> = {
  PENDING:   { color: "#94a3b8", bg: "#F1F5F9" },
  RUNNING:   { color: "#2563EB", bg: "#EFF6FF" },
  COMPLETED: { color: "#10b981", bg: "#F0FDF4" },
  FAILED:    { color: "#ef4444", bg: "#FEF2F2" },
};

// ── Copy button ───────────────────────────────────────────────────────────

function CopyButton({ text, small }: { text: string; small?: boolean }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try { await navigator.clipboard.writeText(text); }
    catch { const el = document.createElement("textarea"); el.value = text; document.body.appendChild(el); el.select(); document.execCommand("copy"); document.body.removeChild(el); }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button onClick={copy} style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: small ? "11px" : "12px", fontWeight: 600, color: copied ? "#10b981" : "#94a3b8", background: "none", border: "none", cursor: "pointer", padding: "2px 6px", borderRadius: "5px", transition: "color 0.15s" }}>
      {copied
        ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
        : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
      }
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

// ── Agent card in pipeline ─────────────────────────────────────────────────

function AgentCard({ agent, expanded, onToggle }: {
  agent: FlowAgent;
  expanded: boolean;
  onToggle: () => void;
}) {
  const st = AGENT_STATUS[agent.status];
  const isErrorOutput = agent.output?._error === true;
  const hasOutput = !!agent.output && Object.keys(agent.output).length > 0 && !isErrorOutput;
  const outputText = JSON.stringify(agent.output, null, 2);

  return (
    <div style={{ flex: "1 1 0", minWidth: "160px", maxWidth: "220px" }}>
      <div
        onClick={hasOutput ? onToggle : undefined}
        style={{
          background: "#fff",
          border: `1.5px solid ${isErrorOutput ? "#FECACA" : expanded ? "#2563EB" : "#E3E8EF"}`,
          borderRadius: "14px",
          padding: "16px",
          cursor: hasOutput ? "pointer" : "default",
          transition: "border-color 0.15s, box-shadow 0.15s",
          boxShadow: expanded ? "0 0 0 3px rgba(37,99,235,0.1)" : isErrorOutput ? "0 0 0 3px rgba(239,68,68,0.07)" : "none",
        }}
        onMouseEnter={(e) => { if (hasOutput) (e.currentTarget as HTMLElement).style.borderColor = "#93C5FD"; }}
        onMouseLeave={(e) => { if (!expanded && !isErrorOutput) (e.currentTarget as HTMLElement).style.borderColor = "#E3E8EF"; }}
      >
        {/* Avatar + status dot */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "10px" }}>
          <div style={{ position: "relative" }}>
            <AgentAvatar agentId={agent.agentId} logoUrl={agent.logoUrl} badgeTier="NONE" size={40} showTooltip={false} />
            <span style={{
              position: "absolute", bottom: -1, right: -1,
              width: "13px", height: "13px", borderRadius: "50%",
              background: st.color, border: "2px solid #fff",
            }} />
          </div>
          <span style={{ fontSize: "10px", fontWeight: 700, padding: "3px 8px", borderRadius: "99px", background: st.bg, color: st.color, textTransform: "uppercase", letterSpacing: "0.04em" }}>
            {agent.status === "RUNNING" ? (
              <span style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                <svg width="8" height="8" viewBox="0 0 10 10" fill="none" style={{ animation: "spin 1s linear infinite" }}><circle cx="5" cy="5" r="3.5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="8 4"/></svg>
                Running
              </span>
            ) : agent.status}
          </span>
        </div>

        {/* Name */}
        <p style={{ fontSize: "13px", fontWeight: 700, color: "#0A2540", marginBottom: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {agent.agentSlug ? (
            <Link href={`/agents/${agent.agentSlug}`} onClick={(e) => e.stopPropagation()} style={{ color: "#0A2540", textDecoration: "none" }}>
              {agent.agentName}
            </Link>
          ) : agent.agentName}
        </p>
        <p style={{ fontSize: "11px", color: "#94a3b8", display: "flex", alignItems: "center", gap: "4px" }}>
          <UsdcAmount amount={agent.amountUsdc} size={10} />
          {agent.executedAt && <> · {timeAgo(agent.executedAt)}</>}
        </p>

        {hasOutput && (
          <p style={{ fontSize: "11px", color: "#2563EB", fontWeight: 600, marginTop: "8px" }}>
            {expanded ? "Hide output ↑" : "View output ↓"}
          </p>
        )}
      </div>

      {/* Error callout */}
      {isErrorOutput && (
        <div style={{ marginTop: "8px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "10px", padding: "10px 12px" }}>
          <p style={{ fontSize: "11px", fontWeight: 700, color: "#ef4444", marginBottom: "3px", display: "flex", alignItems: "center", gap: "5px" }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            {agent.output?.httpStatus ? `Error ${agent.output.httpStatus}` : "Failed"}
          </p>
          <p style={{ fontSize: "11px", color: "#991b1b", margin: 0, lineHeight: 1.5, wordBreak: "break-word" }}>
            {agent.output?.message as string}
          </p>
        </div>
      )}

      {/* Output panel */}
      {expanded && hasOutput && (
        <div style={{ marginTop: "8px", background: "#F8FAFC", border: "1px solid #E3E8EF", borderRadius: "10px", padding: "12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>Output</span>
            <CopyButton text={outputText} small />
          </div>
          <pre style={{ fontSize: "11px", color: "#1e293b", overflow: "auto", maxHeight: "200px", margin: 0, lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
            {outputText}
          </pre>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────

export default function FlowPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const [flow, setFlow]     = useState<Flow | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const decodedJobId = decodeURIComponent(jobId);

  useEffect(() => {
    fetchFlow();
    const interval = setInterval(() => {
      setFlow((prev) => {
        if (prev?.status === "RUNNING" || prev?.status === "LOCKED") { fetchFlow(); }
        return prev;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  async function fetchFlow() {
    try {
      const data = await apiFetch<Flow>(`/api/flows/${encodeURIComponent(decodedJobId)}`);
      setFlow(data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F8FAFF" }}>
        <p style={{ color: "#94a3b8", fontSize: "14px" }}>Loading flow…</p>
      </div>
    );
  }

  if (!flow) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F8FAFF" }}>
        <p style={{ color: "#94a3b8" }}>Flow not found</p>
      </div>
    );
  }

  const fs = FLOW_STATUS[flow.status];
  const completedCount = flow.agents.filter((a) => a.status === "COMPLETED").length;
  const failedAgent = flow.agents.find((a) => a.status === "FAILED" && a.output?._error);
  const failedError = failedAgent?.output ?? null;
  const feeUsdc = (parseFloat(flow.totalAmountUsdc) * 0.01 / 1.01).toFixed(4);

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFF", padding: "32px 16px" }}>
      <div style={{ maxWidth: "860px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "20px" }}>

        {/* Back */}
        <Link href="/dashboard" style={{ fontSize: "13px", color: "#64748b", textDecoration: "none", display: "flex", alignItems: "center", gap: "4px", width: "fit-content" }}>
          ← Dashboard
        </Link>

        {/* Header card */}
        <div style={{ background: "#fff", border: "1px solid #E3E8EF", borderRadius: "16px", padding: "24px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", flexWrap: "wrap" }}>
            <div>
              <p style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "6px" }}>
                Agentic Flow
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <p style={{ fontFamily: "monospace", fontSize: "14px", color: "#0A2540", fontWeight: 600 }}>
                  {decodedJobId.slice(0, 20)}…
                </p>
                <CopyButton text={decodedJobId} small />
              </div>
            </div>

            {/* Status badge */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 14px", borderRadius: "99px", background: fs.bg, border: `1px solid ${fs.dot}33` }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: fs.dot, flexShrink: 0,
                ...(flow.status === "RUNNING" ? { boxShadow: `0 0 0 3px ${fs.dot}33` } : {})
              }} />
              <span style={{ fontSize: "13px", fontWeight: 700, color: fs.text }}>{fs.label}</span>
            </div>
          </div>

          {/* Metrics row */}
          <div style={{ display: "flex", gap: "32px", marginTop: "20px", flexWrap: "wrap" }}>
            {[
              { label: flow.status === "COMPLETED" ? "Total paid" : "Total payable",  value: <UsdcAmount amount={flow.totalAmountUsdc} size={15} /> },
              { label: "Agents",      value: `${completedCount} / ${flow.agents.length} done` },
              { label: "Started",     value: timeAgo(flow.createdAt) },
              ...(flow.completedAt ? [{ label: "Completed", value: timeAgo(flow.completedAt) }] : []),
            ].map(({ label, value }) => (
              <div key={label}>
                <p style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>{label}</p>
                <p style={{ fontSize: "15px", fontWeight: 700, color: "#0A2540", display: "flex", alignItems: "center" }}>{value}</p>
              </div>
            ))}
          </div>

          {/* Completed banner */}
          {flow.status === "COMPLETED" && (
            <div style={{ marginTop: "16px", padding: "10px 14px", background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: "10px", display: "flex", alignItems: "center", gap: "8px" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
              <span style={{ fontSize: "13px", color: "#166534", fontWeight: 600 }}>Payment settled · agents paid via x402</span>
            </div>
          )}

          {flow.status === "FAILED" && (
            <div style={{ marginTop: "16px", padding: "12px 14px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "10px" }}>
              <p style={{ fontSize: "13px", color: "#991b1b", fontWeight: 700, marginBottom: failedError ? "5px" : 0, display: "flex", alignItems: "center", gap: "6px" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {failedAgent ? `${failedAgent.agentName} failed${failedError?.httpStatus ? ` · ${failedError.httpStatus}` : ""}` : "Execution failed"}
              </p>
              {failedError?.message && (
                <p style={{ fontSize: "12px", color: "#7f1d1d", margin: 0, lineHeight: 1.55 }}>{failedError.message as string}</p>
              )}
              {!failedError && (
                <p style={{ fontSize: "12px", color: "#b91c1c", margin: 0 }}>See the agent pipeline below for details.</p>
              )}
            </div>
          )}
        </div>

        {/* Pipeline */}
        <div style={{ background: "#fff", border: "1px solid #E3E8EF", borderRadius: "16px", padding: "24px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <p style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "20px" }}>
            Agent Pipeline
          </p>

          <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", flexWrap: "wrap" }}>
            {flow.agents.map((agent, i) => (
              // display:contents makes AgentCard and arrow direct flex children
              <div key={agent.id} style={{ display: "contents" }}>
                <AgentCard
                  agent={agent}
                  expanded={expanded === agent.id}
                  onToggle={() => setExpanded(expanded === agent.id ? null : agent.id)}
                />
                {i < flow.agents.length - 1 && (
                  // paddingTop = card border(1.5) + card padding(16) + half avatar(20) - half svg(7) ≈ 30px
                  <div style={{ flexShrink: 0, paddingTop: "30px" }}>
                    <svg width="20" height="14" viewBox="0 0 24 16" fill="none">
                      <path d="M0 8h20M16 4l4 4-4 4" stroke="#CBD5E1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Payment breakdown */}
        <div style={{ background: "#fff", border: "1px solid #E3E8EF", borderRadius: "16px", padding: "24px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <p style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "16px" }}>
            Payment Breakdown
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {flow.agents.map((a) => (
              <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <AgentAvatar agentId={a.agentId} logoUrl={a.logoUrl} badgeTier="NONE" size={28} showTooltip={false} />
                  <span style={{ fontSize: "13px", color: "#0A2540", fontWeight: 500 }}>{a.agentName}</span>
                </div>
                <span style={{ fontSize: "13px", fontWeight: 700, color: "#0A2540", fontFamily: "monospace", display: "flex", alignItems: "center" }}>
                  <UsdcAmount amount={(parseFloat(a.amountUsdc) * 0.99).toFixed(4)} size={12} />
                </span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "10px", borderTop: "1px solid #F1F5F9" }}>
              <span style={{ fontSize: "12px", color: "#94a3b8" }}>Protocol fee (1%)</span>
              <span style={{ fontSize: "12px", color: "#94a3b8", fontFamily: "monospace", display: "flex", alignItems: "center" }}>
                <UsdcAmount amount={feeUsdc} size={11} />
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "10px", borderTop: "2px solid #F1F5F9" }}>
              <span style={{ fontSize: "14px", fontWeight: 700, color: "#0A2540" }}>Total</span>
              <span style={{ fontSize: "14px", fontWeight: 700, color: "#0A2540", display: "flex", alignItems: "center" }}>
                <UsdcAmount amount={flow.totalAmountUsdc} size={13} />
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
