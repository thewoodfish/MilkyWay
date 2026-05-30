"use client";

import { useCallback, useState, useEffect, memo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ReactFlow, {
  Node, addEdge, Connection,
  useNodesState, useEdgesState,
  Background, Controls,
  Handle, Position,
  BackgroundVariant,
} from "reactflow";
import "reactflow/dist/style.css";
import { parseEther } from "viem";
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from "wagmi";
import { apiFetch, CATEGORY_LABELS } from "@/lib/utils";
import { authFetch } from "@/lib/auth";
import { useAuth } from "@/context/AuthContext";
import { ESCROW_ABI } from "@/lib/escrow-abi";
import { AuthGate } from "@/components/AuthGate";
import { EthAmount } from "@/components/EthAmount";
import type { Agent } from "@/lib/types";

const ESCROW = process.env.NEXT_PUBLIC_JOB_ESCROW_ADDRESS as `0x${string}`;
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDeadline(s: number): string {
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.round(s / 60)}m`;
  return `${Math.round(s / 3600)}h`;
}

type AboutSchema = {
  input_schema?: Record<string, { type: string; required?: boolean; description?: string }>;
  output_schema?: Record<string, { type: string; description?: string }>;
  capabilities?: string[];
  pricing?: { model: string; amount: string; currency: string };
  max_deadline_seconds?: number;
};

// ── Agent canvas node ──────────────────────────────────────────────────────

interface NodeData {
  agent: Agent;
  orderIndex: number;
  onRemove: (id: number) => void;
}

const AgentNode = memo(function AgentNode({
  data,
  selected,
}: {
  data: NodeData;
  selected: boolean;
}) {
  const { agent, orderIndex, onRemove } = data;
  const about = agent.aboutSchema as AboutSchema | null;
  const inCount = about?.input_schema ? Object.keys(about.input_schema).length : null;
  const outCount = about?.output_schema ? Object.keys(about.output_schema).length : null;

  return (
    <div
      style={{
        background: "#fff",
        border: `1.5px solid ${selected ? "#2563EB" : "#E3E8EF"}`,
        borderRadius: "14px",
        minWidth: "230px",
        boxShadow: selected
          ? "0 0 0 3px rgba(37,99,235,0.12), 0 4px 20px rgba(37,99,235,0.1)"
          : "0 2px 12px rgba(10,37,64,0.08), 0 1px 4px rgba(10,37,64,0.04)",
        transition: "box-shadow 0.18s, border-color 0.18s",
        overflow: "hidden",
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{
          background: "#2563EB",
          width: 10,
          height: 10,
          border: "2px solid #fff",
          left: -6,
        }}
      />

      {/* Header */}
      <div
        style={{
          padding: "10px 12px 9px",
          borderBottom: "1px solid #F1F5F9",
          background: "#F8FAFF",
          display: "flex",
          alignItems: "center",
          gap: "9px",
        }}
      >
        {/* Step badge */}
        <div
          style={{
            width: "20px",
            height: "20px",
            borderRadius: "50%",
            background: "#EFF6FF",
            border: "1.5px solid #BFDBFE",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "10px",
            fontWeight: 800,
            color: "#2563EB",
            flexShrink: 0,
          }}
        >
          {orderIndex + 1}
        </div>

        {/* Avatar */}
        <div style={{ width: "30px", height: "30px", borderRadius: "8px", overflow: "hidden", flexShrink: 0, border: "1px solid #DBEAFE" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://api.dicebear.com/9.x/bottts/svg?seed=milkyway-${agent.agentId}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf&scale=85`}
            alt={agent.name}
            width={30}
            height={30}
            style={{ display: "block", width: "100%", height: "100%" }}
          />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ color: "#0A2540", fontSize: "12px", fontWeight: 600, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {agent.name}
          </p>
          <p style={{ color: "#94a3b8", fontSize: "10px", margin: 0 }}>
            {CATEGORY_LABELS[agent.category] ?? agent.category}
          </p>
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); onRemove(agent.agentId); }}
          title="Remove"
          style={{
            background: "transparent",
            border: "none",
            color: "#CBD5E1",
            cursor: "pointer",
            fontSize: "17px",
            lineHeight: 1,
            padding: "0 2px",
            flexShrink: 0,
            transition: "color 0.15s",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#ef4444"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#CBD5E1"; }}
        >
          ×
        </button>
      </div>

      {/* Body */}
      <div style={{ padding: "10px 12px 11px" }}>
        {agent.description && (
          <p style={{
            color: "#64748b",
            fontSize: "11px",
            lineHeight: 1.55,
            margin: "0 0 9px",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}>
            {agent.description}
          </p>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
          <span style={{
            fontSize: "10px",
            color: "#64748b",
            background: "#F8FAFF",
            padding: "2px 8px",
            borderRadius: "100px",
            border: "1px solid #E3E8EF",
          }}>
            {agent.pricingModel === "FREE" ? "Free" : <EthAmount amount={agent.priceEth!} size={10} />}
          </span>

          {inCount !== null && (
            <span style={{ fontSize: "10px", color: "#94a3b8" }}>
              {inCount}↓ {outCount}↑
            </span>
          )}
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        style={{
          background: "#10b981",
          width: 10,
          height: 10,
          border: "2px solid #fff",
          right: -6,
        }}
      />
    </div>
  );
});

const nodeTypes = { agentNode: AgentNode };


// ── Builder page ───────────────────────────────────────────────────────────

export default function BuilderPage() {
  const router = useRouter();
  const { isConnected } = useAccount();
  const { isSignedIn } = useAuth();

  const [allAgents, setAllAgents] = useState<Agent[]>([]);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("ALL");

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [canvasAgents, setCanvasAgents] = useState<Agent[]>([]);

  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(true);
  const [libraryAgent, setLibraryAgent] = useState<Agent | null>(null);
  const [staticInputs, setStaticInputs] = useState<Record<string, Record<string, string>>>({});
  const [trigger, setTrigger] = useState<"IMMEDIATE" | "SCHEDULED" | "CONDITION">("IMMEDIATE");
  const [deadlineSeconds, setDeadlineSeconds] = useState(300);

  const [preview, setPreview] = useState<{ subtotal: string; protocolFee: string; total: string } | null>(null);
  const [flowInternalId, setFlowInternalId] = useState("");
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState("");

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    apiFetch<{ agents: Agent[] }>("/api/agents?limit=100")
      .then((d) => setAllAgents(Array.isArray(d.agents) ? d.agents : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!canvasAgents.length) { setPreview(null); return; }
    apiFetch<{ subtotal: string; protocolFee: string; total: string }>("/api/flows/preview", {
      method: "POST",
      body: JSON.stringify({ agents: canvasAgents.map((a) => ({ agentId: a.agentId })) }),
    }).then(setPreview).catch(() => {});
  }, [canvasAgents]);

  useEffect(() => {
    if (!isSuccess || !txHash || !flowInternalId) return;
    authFetch(`${API}/api/flows/confirm`, {
      method: "POST",
      body: JSON.stringify({ internalId: flowInternalId, escrowTxHash: txHash }),
    })
      .then((r) => r.json())
      .then((data) => router.push(`/flows/${encodeURIComponent(data.jobId)}`))
      .catch((e) => setError((e as Error).message));
  }, [isSuccess, txHash, flowInternalId]);

  const removeFromCanvas = useCallback((agentId: number) => {
    setNodes((ns) => ns.filter((n) => n.id !== `agent-${agentId}`));
    setEdges((es) => es.filter((e) => e.source !== `agent-${agentId}` && e.target !== `agent-${agentId}`));
    setCanvasAgents((prev) => prev.filter((a) => a.agentId !== agentId));
    setSelectedAgent((prev) => (prev?.agentId === agentId ? null : prev));
  }, [setNodes, setEdges]);

  const onConnect = useCallback(
    (conn: Connection) =>
      setEdges((eds) =>
        addEdge({ ...conn, animated: true, style: { stroke: "#2563EB", strokeWidth: 2 } }, eds)
      ),
    [setEdges]
  );

  function addToCanvas(agent: Agent) {
    if (canvasAgents.find((a) => a.agentId === agent.agentId)) return;
    const idx = canvasAgents.length;
    const newNode: Node = {
      id: `agent-${agent.agentId}`,
      type: "agentNode",
      position: { x: 80 + idx * 290, y: 140 },
      data: { agent, orderIndex: idx, onRemove: removeFromCanvas },
    };
    setNodes((ns) => [...ns, newNode]);
    setCanvasAgents((prev) => [...prev, agent]);
  }

  async function activateFlow() {
    if (!canvasAgents.length) return;
    setError("");
    setActivating(true);
    try {
      const agentsPayload = canvasAgents.map((a, i) => ({
        agentId: a.agentId,
        orderIndex: i,
        staticInputs: staticInputs[String(a.agentId)] ?? {},
        inputMapping: {},
      }));
      const res = await authFetch(`${API}/api/flows/create`, {
        method: "POST",
        body: JSON.stringify({ agents: agentsPayload, trigger, deadlineSeconds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create flow");

      setFlowInternalId(data.internalId);
      writeContract({
        address: ESCROW,
        abi: ESCROW_ABI,
        functionName: "lockPayment",
        args: [
          data.jobId as `0x${string}`,
          data.agentWallets as `0x${string}`[],
          data.agentAmounts.map((a: string) => BigInt(a)),
          BigInt(data.deadline),
        ],
        value: parseEther(data.totalEth),
      });
    } catch (e) {
      setError((e as Error).message);
      setActivating(false);
    }
  }

  const categories = ["ALL", ...Array.from(new Set(allAgents.map((a) => a.category))).sort()];

  const filteredAgents = allAgents.filter((a) => {
    if (catFilter !== "ALL" && a.category !== catFilter) return false;
    if (search && !a.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const about = selectedAgent?.aboutSchema as AboutSchema | null;
  const inputSchema = about?.input_schema ?? null;
  const outputSchema = about?.output_schema ?? null;
  const canActivate = isConnected && isSignedIn && !isPending && !activating && canvasAgents.length > 0;

  // Shared label style for right panel sections
  const sectionLabel: React.CSSProperties = {
    fontSize: "10px",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.09em",
    color: "#60A5FA",
    margin: "0 0 12px",
  };

  return (
    <AuthGate description="Sign in to build and activate multi-agent agentic flows on Arbitrum.">
      <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 64px)", background: "#EBF0FF" }}>

        {/* ── Top bar ──────────────────────────────────────────────── */}
        <div style={{
          display: "flex",
          alignItems: "center",
          padding: "0 20px",
          height: "50px",
          borderBottom: "1px solid #E3E8EF",
          background: "#fff",
          flexShrink: 0,
          gap: "14px",
          boxShadow: "0 1px 4px rgba(10,37,64,0.04)",
        }}>
          <Link
            href="/dashboard"
            style={{ color: "#94a3b8", textDecoration: "none", fontSize: "12px", display: "flex", alignItems: "center", gap: "5px", transition: "color 0.15s" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "#425466"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "#94a3b8"; }}
          >
            ← Dashboard
          </Link>

          <div style={{ width: "1px", height: "14px", background: "#E3E8EF" }} />

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#2563EB", boxShadow: "0 0 6px rgba(37,99,235,0.5)", display: "inline-block" }} />
            <span style={{ color: "#0A2540", fontSize: "14px", fontWeight: 700, letterSpacing: "-0.01em" }}>Agentic Flow Builder</span>
          </div>

          {canvasAgents.length > 0 && (
            <span style={{
              fontSize: "11px",
              color: "#2563EB",
              background: "#EFF6FF",
              padding: "3px 10px",
              borderRadius: "100px",
              border: "1px solid #BFDBFE",
            }}>
              {canvasAgents.length} agent{canvasAgents.length > 1 ? "s" : ""}
            </span>
          )}

          <div style={{ flex: 1 }} />

          {canvasAgents.length > 0 && (
            <button
              onClick={() => {
                setNodes([]);
                setEdges([]);
                setCanvasAgents([]);
                setSelectedAgent(null);
                setPreview(null);
                setError("");
              }}
              style={{
                fontSize: "12px",
                color: "#64748b",
                background: "transparent",
                border: "1px solid #E3E8EF",
                borderRadius: "8px",
                padding: "5px 12px",
                cursor: "pointer",
                transition: "color 0.15s, border-color 0.15s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = "#0A2540";
                (e.currentTarget as HTMLButtonElement).style.borderColor = "#CBD5E1";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = "#64748b";
                (e.currentTarget as HTMLButtonElement).style.borderColor = "#E3E8EF";
              }}
            >
              Clear
            </button>
          )}
        </div>

        {/* ── Three-panel layout ────────────────────────────────────── */}
        <div style={{ display: "flex", flex: 1, flexDirection: "column", overflow: "hidden" }}>
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

          {/* ── CENTER: Canvas ─────────────────────────────────────── */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>

            {/* ── Agent Library Slideout ─────────────────────────── */}
            <div style={{
              position: "absolute",
              left: 0, top: 0, bottom: 0,
              width: "320px",
              zIndex: 20,
              transform: libraryOpen ? "translateX(0)" : "translateX(calc(-100% + 36px))",
              transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              display: "flex",
              pointerEvents: "auto",
            }}>
              {/* ── Panel ── */}
              <div style={{
                width: "284px",
                background: "#fff",
                display: "flex",
                flexDirection: "column",
                boxShadow: "4px 0 28px rgba(10,37,64,0.1)",
                flexShrink: 0,
                overflow: "hidden",
              }}>
                {libraryAgent ? (
                  /* ── DETAIL VIEW ── */
                  <>
                    {/* Back header */}
                    <div style={{ padding: "12px 14px", borderBottom: "1px solid #E3E8EF", display: "flex", alignItems: "center", flexShrink: 0 }}>
                      <button
                        onClick={() => setLibraryAgent(null)}
                        style={{ display: "flex", alignItems: "center", gap: "5px", color: "#2563EB", fontSize: "12px", fontWeight: 500, background: "transparent", border: "none", cursor: "pointer", padding: 0, transition: "opacity 0.15s" }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.65"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
                      >
                        <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                        Library
                      </button>
                    </div>

                    {/* Scrollable detail */}
                    <div style={{ flex: 1, overflowY: "auto" }}>
                      {/* Hero */}
                      <div style={{ padding: "22px 16px 16px", textAlign: "center", borderBottom: "1px solid #E3E8EF" }}>
                        <div style={{ width: "72px", height: "72px", borderRadius: "20px", overflow: "hidden", margin: "0 auto 14px", border: "2px solid #DBEAFE", boxShadow: "0 6px 20px rgba(37,99,235,0.15)" }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={`https://api.dicebear.com/9.x/bottts/svg?seed=milkyway-${libraryAgent.agentId}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf&scale=85`}
                            alt={libraryAgent.name} width={72} height={72}
                            style={{ display: "block", width: "100%", height: "100%" }}
                          />
                        </div>
                        <p style={{ color: "#0A2540", fontSize: "16px", fontWeight: 700, margin: "0 0 10px", letterSpacing: "-0.01em", lineHeight: 1.2 }}>
                          {libraryAgent.name}
                        </p>
                        <div style={{ display: "flex", gap: "6px", justifyContent: "center", flexWrap: "wrap" }}>
                          <span style={{ fontSize: "11px", fontWeight: 600, padding: "3px 10px", borderRadius: "100px", background: "#EEF2FF", color: "#2563EB", border: "1px solid #BFDBFE" }}>
                            {CATEGORY_LABELS[libraryAgent.category] ?? libraryAgent.category}
                          </span>
                          <span style={{ fontSize: "11px", fontWeight: 600, padding: "3px 10px", borderRadius: "100px", background: libraryAgent.pricingModel === "FREE" ? "#F0FDF4" : "#FFFBEB", color: libraryAgent.pricingModel === "FREE" ? "#10b981" : "#D97706", border: `1px solid ${libraryAgent.pricingModel === "FREE" ? "#BBF7D0" : "#FDE68A"}` }}>
                            {libraryAgent.pricingModel === "FREE" ? "Free" : `${libraryAgent.priceEth} ETH / job`}
                          </span>
                        </div>
                      </div>

                      {/* Description */}
                      {libraryAgent.description && (
                        <div style={{ padding: "14px 16px", borderBottom: "1px solid #E3E8EF" }}>
                          <p style={{ color: "#425466", fontSize: "12px", lineHeight: 1.7, margin: 0 }}>{libraryAgent.description}</p>
                        </div>
                      )}

                      {/* Stats + capabilities */}
                      {(() => {
                        const la = libraryAgent.aboutSchema as AboutSchema | null;
                        if (!la) return null;
                        const caps = la.capabilities ?? [];
                        return (
                          <div style={{ padding: "12px 16px", borderBottom: "1px solid #E3E8EF", display: "flex", flexWrap: "wrap", gap: "6px" }}>
                            {la.max_deadline_seconds && (
                              <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "#425466", fontWeight: 500, background: "#F8FAFF", border: "1px solid #E3E8EF", padding: "4px 10px", borderRadius: "8px" }}>
                                <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 6v6l4 2"/></svg>
                                ~{la.max_deadline_seconds}s
                              </span>
                            )}
                            {caps.map((cap) => (
                              <span key={cap} style={{ fontSize: "11px", fontWeight: 500, color: "#2563EB", background: "#EFF6FF", border: "1px solid #BFDBFE", padding: "4px 10px", borderRadius: "8px" }}>
                                {cap}
                              </span>
                            ))}
                          </div>
                        );
                      })()}

                      {/* Inputs */}
                      {(() => {
                        const ins = (libraryAgent.aboutSchema as AboutSchema | null)?.input_schema;
                        if (!ins || Object.keys(ins).length === 0) return null;
                        return (
                          <div style={{ padding: "14px 16px", borderBottom: "1px solid #E3E8EF" }}>
                            <p style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", color: "#60A5FA", margin: "0 0 10px" }}>Inputs</p>
                            {Object.entries(ins).map(([field, def]) => (
                              <div key={field} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "7px", padding: "7px 10px", background: "#F8FAFF", borderRadius: "8px", border: "1px solid #E3E8EF" }}>
                                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: def.required ? "#ef4444" : "#CBD5E1", flexShrink: 0 }} />
                                <span style={{ fontSize: "11px", color: "#0A2540", fontWeight: 500, flex: 1 }}>{field}</span>
                                <span style={{ fontSize: "9px", color: "#2563EB", background: "#EEF2FF", padding: "2px 6px", borderRadius: "4px", border: "1px solid #BFDBFE", fontWeight: 600 }}>{def.type}</span>
                                {def.required && <span style={{ fontSize: "9px", color: "#ef4444", fontWeight: 700 }}>req</span>}
                              </div>
                            ))}
                          </div>
                        );
                      })()}

                      {/* Outputs */}
                      {(() => {
                        const outs = (libraryAgent.aboutSchema as AboutSchema | null)?.output_schema;
                        if (!outs || Object.keys(outs).length === 0) return null;
                        return (
                          <div style={{ padding: "14px 16px", borderBottom: "1px solid #E3E8EF" }}>
                            <p style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", color: "#10b981", margin: "0 0 10px" }}>Outputs</p>
                            {Object.entries(outs).map(([field, def]) => (
                              <div key={field} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "7px", padding: "7px 10px", background: "#F0FDF4", borderRadius: "8px", border: "1px solid #BBF7D0" }}>
                                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981", flexShrink: 0 }} />
                                <span style={{ fontSize: "11px", color: "#0A2540", fontWeight: 500, flex: 1 }}>{field}</span>
                                <span style={{ fontSize: "9px", color: "#10b981", background: "#DCFCE7", padding: "2px 6px", borderRadius: "4px", border: "1px solid #BBF7D0", fontWeight: 600 }}>{def.type}</span>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>

                    {/* CTA */}
                    <div style={{ padding: "14px 16px", borderTop: "1px solid #E3E8EF", flexShrink: 0 }}>
                      {canvasAgents.some((a) => a.agentId === libraryAgent.agentId) ? (
                        <div style={{ width: "100%", padding: "10px", borderRadius: "10px", background: "#F0FDF4", border: "1px solid #BBF7D0", color: "#10b981", fontSize: "13px", fontWeight: 600, textAlign: "center" }}>
                          ✓ Added to Canvas
                        </div>
                      ) : (
                        <button
                          onClick={() => addToCanvas(libraryAgent)}
                          style={{ width: "100%", padding: "11px", borderRadius: "10px", background: "#2563EB", border: "none", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: "pointer", boxShadow: "0 2px 12px rgba(37,99,235,0.3)", transition: "background 0.15s" }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#1d4ed8"; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#2563EB"; }}
                        >
                          + Add to Canvas
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  /* ── LIST VIEW ── */
                  <>
                    {/* Header */}
                    <div style={{ padding: "14px 14px 12px", borderBottom: "1px solid #E3E8EF", flexShrink: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                        <p style={{ color: "#0A2540", fontSize: "13px", fontWeight: 700, margin: 0 }}>Agent Library</p>
                        <span style={{ fontSize: "10px", color: "#94a3b8", background: "#F8FAFF", border: "1px solid #E3E8EF", padding: "2px 8px", borderRadius: "100px" }}>
                          {filteredAgents.length}
                        </span>
                      </div>
                      <div style={{ position: "relative" }}>
                        <svg style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", width: "13px", height: "13px", pointerEvents: "none", opacity: 0.4 }} fill="none" viewBox="0 0 24 24" stroke="#0A2540" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          placeholder="Search agents…"
                          style={{ width: "100%", background: "#F8FAFF", border: "1px solid #E3E8EF", borderRadius: "9px", padding: "7px 10px 7px 30px", fontSize: "12px", color: "#0A2540", outline: "none", boxSizing: "border-box", transition: "border-color 0.15s" }}
                          onFocus={(e) => { e.target.style.borderColor = "#2563EB"; }}
                          onBlur={(e) => { e.target.style.borderColor = "#E3E8EF"; }}
                        />
                      </div>
                    </div>

                    {/* Category pills */}
                    <div style={{ padding: "8px 12px", borderBottom: "1px solid #E3E8EF", display: "flex", gap: "5px", flexWrap: "wrap", flexShrink: 0, background: "#FAFBFF" }}>
                      {categories.slice(0, 7).map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setCatFilter(cat)}
                          style={{ fontSize: "10px", fontWeight: 600, padding: "3px 9px", borderRadius: "100px", border: `1px solid ${catFilter === cat ? "#93C5FD" : "#E3E8EF"}`, cursor: "pointer", transition: "all 0.15s", background: catFilter === cat ? "#DBEAFE" : "#fff", color: catFilter === cat ? "#1D4ED8" : "#64748b" }}
                        >
                          {cat === "ALL" ? "All" : (CATEGORY_LABELS[cat] ?? cat)}
                        </button>
                      ))}
                    </div>

                    {/* Agent list */}
                    <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
                      {filteredAgents.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "36px 12px" }}>
                          <p style={{ fontSize: "24px", margin: "0 0 6px" }}>⚗️</p>
                          <p style={{ fontSize: "11px", color: "#94a3b8", margin: 0 }}>No agents found</p>
                        </div>
                      ) : filteredAgents.map((agent) => {
                        const onCanvas = canvasAgents.some((a) => a.agentId === agent.agentId);
                        return (
                          <div
                            key={agent.agentId}
                            onClick={() => setLibraryAgent(agent)}
                            style={{ padding: "10px 11px", borderRadius: "10px", border: `1px solid ${onCanvas ? "#BBF7D0" : "#E3E8EF"}`, background: onCanvas ? "#F0FDF4" : "#fff", cursor: "pointer", marginBottom: "6px", transition: "border-color 0.15s, box-shadow 0.15s", boxShadow: "0 1px 3px rgba(10,37,64,0.04)" }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = onCanvas ? "#86EFAC" : "#93C5FD"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 10px rgba(37,99,235,0.1)"; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = onCanvas ? "#BBF7D0" : "#E3E8EF"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 1px 3px rgba(10,37,64,0.04)"; }}
                          >
                            <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                              <div style={{ width: "40px", height: "40px", borderRadius: "11px", overflow: "hidden", flexShrink: 0, border: "1px solid #DBEAFE" }}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={`https://api.dicebear.com/9.x/bottts/svg?seed=milkyway-${agent.agentId}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf&scale=85`}
                                  alt={agent.name} width={40} height={40}
                                  style={{ display: "block", width: "100%", height: "100%" }}
                                />
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ color: "#0A2540", fontSize: "12px", fontWeight: 600, margin: "0 0 2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {agent.name}
                                </p>
                                <p style={{ color: "#94a3b8", fontSize: "10px", margin: "0 0 3px" }}>
                                  {CATEGORY_LABELS[agent.category] ?? agent.category}
                                  {" · "}
                                  {agent.pricingModel === "FREE" ? "Free" : `${agent.priceEth} ETH`}
                                </p>
                                {agent.description && (
                                  <p style={{ color: "#64748b", fontSize: "10px", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{agent.description}</p>
                                )}
                              </div>
                              <button
                                onClick={(e) => { e.stopPropagation(); if (!onCanvas) addToCanvas(agent); }}
                                style={{ width: "26px", height: "26px", borderRadius: "7px", background: onCanvas ? "#DCFCE7" : "#EFF6FF", border: `1px solid ${onCanvas ? "#86EFAC" : "#BFDBFE"}`, color: onCanvas ? "#10b981" : "#2563EB", fontSize: onCanvas ? "11px" : "15px", cursor: onCanvas ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontWeight: 700, lineHeight: 1 }}
                              >
                                {onCanvas ? "✓" : "+"}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              {/* ── Toggle tab ── */}
              <button
                onClick={() => { setLibraryOpen((o) => !o); if (libraryOpen) setLibraryAgent(null); }}
                style={{ width: "36px", background: "#fff", border: "none", borderLeft: "1px solid #E3E8EF", borderRadius: "0 10px 10px 0", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "8px", boxShadow: "3px 0 10px rgba(10,37,64,0.07)", padding: 0, flexShrink: 0, transition: "background 0.15s" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#F8FAFF"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#fff"; }}
              >
                {libraryOpen ? (
                  <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#64748b" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                ) : (
                  <>
                    <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#2563EB" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                    <span style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", fontSize: "9px", fontWeight: 700, color: "#2563EB", letterSpacing: "0.1em", textTransform: "uppercase" }}>Agents</span>
                  </>
                )}
              </button>
            </div>

            {/* Empty state */}
            {canvasAgents.length === 0 && (
              <div style={{
                position: "absolute", inset: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                zIndex: 10, pointerEvents: "none",
              }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{
                    width: "68px", height: "68px", borderRadius: "18px",
                    background: "#EFF6FF",
                    border: "1px solid #BFDBFE",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    margin: "0 auto 18px",
                  }}>
                    <svg width="30" height="30" fill="none" viewBox="0 0 24 24" stroke="#2563EB" strokeWidth={1.5} strokeOpacity={0.7}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 16.875h3.375m0 0h3.375m-3.375 0V13.5m0 3.375v3.375M6 10.5h2.25a2.25 2.25 0 002.25-2.25V6a2.25 2.25 0 00-2.25-2.25H6A2.25 2.25 0 003.75 6v2.25A2.25 2.25 0 006 10.5zm0 9.75h2.25A2.25 2.25 0 0010.5 18v-2.25a2.25 2.25 0 00-2.25-2.25H6a2.25 2.25 0 00-2.25 2.25V18A2.25 2.25 0 006 20.25zm9.75-9.75H18a2.25 2.25 0 002.25-2.25V6A2.25 2.25 0 0018 3.75h-2.25A2.25 2.25 0 0013.5 6v2.25a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                  </div>
                  <p style={{ color: "#0A2540", fontSize: "15px", fontWeight: 600, margin: "0 0 5px" }}>
                    Start building your agentic flow
                  </p>
                  <p style={{ color: "#94a3b8", fontSize: "12px", margin: "0 0 22px" }}>
                    Click agents from the library to add them here
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", justifyContent: "center", fontSize: "11px" }}>
                    <span style={{ color: "#2563EB", padding: "5px 12px", borderRadius: "100px", border: "1px solid #BFDBFE", background: "#EFF6FF", fontWeight: 600, fontSize: "11px" }}>① Add agents</span>
                    <span style={{ color: "#93C5FD" }}>→</span>
                    <span style={{ color: "#2563EB", padding: "5px 12px", borderRadius: "100px", border: "1px solid #BFDBFE", background: "#EFF6FF", fontWeight: 600, fontSize: "11px" }}>② Connect them</span>
                    <span style={{ color: "#93C5FD" }}>→</span>
                    <span style={{ color: "#2563EB", padding: "5px 12px", borderRadius: "100px", border: "1px solid #BFDBFE", background: "#EFF6FF", fontWeight: 600, fontSize: "11px" }}>③ Activate</span>
                  </div>
                </div>
              </div>
            )}

            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={(_, node) => {
                const a = canvasAgents.find((a) => `agent-${a.agentId}` === node.id);
                if (a) setSelectedAgent(a);
              }}
              onPaneClick={() => setSelectedAgent(null)}
              nodeTypes={nodeTypes}
              fitView
              fitViewOptions={{ padding: 0.35 }}
              style={{ background: "transparent", flex: 1 }}
              defaultEdgeOptions={{
                animated: true,
                style: { stroke: "#2563EB", strokeWidth: 2 },
              }}
            >
              <Background color="#93C5FD" gap={22} size={1} variant={BackgroundVariant.Dots} />
              <Controls
                style={{
                  background: "#EFF6FF",
                  border: "1px solid #BFDBFE",
                  borderRadius: "10px",
                  overflow: "hidden",
                  boxShadow: "0 2px 8px rgba(37,99,235,0.1)",
                }}
              />
            </ReactFlow>

          </div>

          {/* ── RIGHT: Config panel ───────────────────────────────── */}
          <div style={{
            width: "272px",
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            borderLeft: "1px solid #BFDBFE",
            background: "#fff",
            overflowY: "auto",
          }}>
            {selectedAgent ? (
              /* ── Agent config ── */
              <>
                <div style={{ padding: "14px", borderBottom: "1px solid #E3E8EF", borderLeft: "3px solid #2563EB" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                    <div style={{ width: "36px", height: "36px", borderRadius: "10px", overflow: "hidden", flexShrink: 0, border: "1px solid #DBEAFE" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`https://api.dicebear.com/9.x/bottts/svg?seed=milkyway-${selectedAgent.agentId}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf&scale=85`}
                        alt={selectedAgent.name}
                        width={36}
                        height={36}
                        style={{ display: "block", width: "100%", height: "100%" }}
                      />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ color: "#0A2540", fontSize: "13px", fontWeight: 600, margin: "0 0 2px" }}>{selectedAgent.name}</p>
                      <span style={{ fontSize: "10px", color: "#94a3b8" }}>{CATEGORY_LABELS[selectedAgent.category] ?? selectedAgent.category}</span>
                    </div>
                  </div>
                  {selectedAgent.description && (
                    <p style={{ color: "#64748b", fontSize: "11px", lineHeight: 1.6, margin: 0 }}>
                      {selectedAgent.description}
                    </p>
                  )}
                </div>

                {/* Input fields */}
                {inputSchema && Object.keys(inputSchema).length > 0 && (
                  <div style={{ padding: "14px", borderBottom: "1px solid #E3E8EF" }}>
                    <p style={sectionLabel}>Inputs</p>
                    {Object.entries(inputSchema).map(([field, def]) => (
                      <div key={field} style={{ marginBottom: "11px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "5px" }}>
                          <label style={{ fontSize: "11px", color: "#425466", fontWeight: 500 }}>{field}</label>
                          <span style={{ fontSize: "9px", color: "#2563EB", background: "#EEF2FF", padding: "1px 5px", borderRadius: "4px", border: "1px solid #BFDBFE" }}>
                            {def.type}
                          </span>
                          {def.required && (
                            <span style={{ fontSize: "9px", color: "#ef4444", fontWeight: 600 }}>required</span>
                          )}
                        </div>
                        <input
                          value={staticInputs[String(selectedAgent.agentId)]?.[field] ?? ""}
                          onChange={(e) =>
                            setStaticInputs((prev) => ({
                              ...prev,
                              [String(selectedAgent.agentId)]: {
                                ...(prev[String(selectedAgent.agentId)] ?? {}),
                                [field]: e.target.value,
                              },
                            }))
                          }
                          placeholder={def.description ?? `${field}…`}
                          style={{
                            width: "100%",
                            background: "#EEF2FF",
                            border: "1px solid #C7D7F5",
                            borderRadius: "8px",
                            padding: "7px 10px",
                            fontSize: "12px",
                            color: "#0A2540",
                            outline: "none",
                            boxSizing: "border-box",
                            transition: "border-color 0.15s",
                          }}
                          onFocus={(e) => { e.target.style.borderColor = "#2563EB"; }}
                          onBlur={(e) => { e.target.style.borderColor = "#C7D7F5"; }}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Output schema */}
                {outputSchema && Object.keys(outputSchema).length > 0 && (
                  <div style={{ padding: "14px", borderBottom: "1px solid #E3E8EF" }}>
                    <p style={sectionLabel}>Outputs</p>
                    {Object.entries(outputSchema).map(([field, def]) => (
                      <div key={field} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "7px" }}>
                        <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#10b981", flexShrink: 0 }} />
                        <span style={{ fontSize: "11px", color: "#64748b", flex: 1 }}>{field}</span>
                        <span style={{ fontSize: "9px", color: "#2563EB", background: "#EEF2FF", padding: "1px 5px", borderRadius: "4px", border: "1px solid #BFDBFE" }}>
                          {def.type}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ padding: "14px" }}>
                  <button
                    onClick={() => removeFromCanvas(selectedAgent.agentId)}
                    style={{
                      width: "100%",
                      padding: "8px",
                      borderRadius: "8px",
                      border: "1px solid #FECACA",
                      background: "#FEF2F2",
                      color: "#ef4444",
                      fontSize: "12px",
                      fontWeight: 500,
                      cursor: "pointer",
                      transition: "border-color 0.15s, background 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = "#FCA5A5";
                      (e.currentTarget as HTMLButtonElement).style.background = "#FEE2E2";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = "#FECACA";
                      (e.currentTarget as HTMLButtonElement).style.background = "#FEF2F2";
                    }}
                  >
                    Remove from canvas
                  </button>
                </div>
              </>
            ) : (
              /* ── Flow settings ── */
              <>
                <div style={{ padding: "14px", borderBottom: "1px solid #E3E8EF" }}>
                  <p style={{ color: "#1D4ED8", fontSize: "13px", fontWeight: 700, margin: "0 0 2px" }}>Configuration</p>
                  <p style={{ color: "#94a3b8", fontSize: "11px", margin: 0 }}>
                    {canvasAgents.length === 0 ? "Add agents to get started" : "Click an agent to configure its inputs"}
                  </p>
                </div>

                {/* Trigger */}
                <div style={{ padding: "14px", borderBottom: "1px solid #E3E8EF" }}>
                  <p style={sectionLabel}>Trigger</p>
                  {([
                    { value: "IMMEDIATE", icon: "⚡", label: "Immediate", desc: "Runs right away" },
                    { value: "SCHEDULED", icon: "🕐", label: "Scheduled", desc: "Run at a set time" },
                    { value: "CONDITION", icon: "🔮", label: "Condition", desc: "Triggered externally" },
                  ] as const).map(({ value, icon, label, desc }) => (
                    <button
                      key={value}
                      onClick={() => setTrigger(value)}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "9px 11px",
                        borderRadius: "9px",
                        border: `1px solid ${trigger === value ? "#93C5FD" : "#E2E8F0"}`,
                        background: trigger === value ? "#DBEAFE" : "#F1F5F9",
                        cursor: "pointer",
                        textAlign: "left",
                        marginBottom: "6px",
                        transition: "all 0.15s",
                      }}
                    >
                      <span style={{ fontSize: "16px" }}>{icon}</span>
                      <div>
                        <p style={{ color: trigger === value ? "#2563EB" : "#425466", fontSize: "12px", fontWeight: 600, margin: 0 }}>{label}</p>
                        <p style={{ color: "#94a3b8", fontSize: "10px", margin: 0 }}>{desc}</p>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Deadline */}
                <div style={{ padding: "14px", borderBottom: "1px solid #E3E8EF" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                    <p style={{ ...sectionLabel, margin: 0 }}>Deadline</p>
                    <span style={{ fontSize: "13px", fontWeight: 800, color: "#2563EB" }}>
                      {formatDeadline(deadlineSeconds)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={30}
                    max={86400}
                    step={30}
                    value={deadlineSeconds}
                    onChange={(e) => setDeadlineSeconds(Number(e.target.value))}
                    style={{ width: "100%", accentColor: "#2563EB", cursor: "pointer" }}
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "#93C5FD", marginTop: "4px" }}>
                    <span>30s</span>
                    <span>12h</span>
                    <span>24h</span>
                  </div>
                </div>

                {/* Agent order */}
                {canvasAgents.length > 0 && (
                  <div style={{ padding: "14px" }}>
                    <p style={sectionLabel}>
                      Agentic Flow — {canvasAgents.length} agent{canvasAgents.length !== 1 ? "s" : ""}
                    </p>
                    {canvasAgents.map((a, i) => (
                      <div key={a.agentId} style={{ display: "flex", alignItems: "center", gap: "9px", marginBottom: "7px", padding: "6px 0" }}>
                        <span style={{
                          width: "19px", height: "19px", borderRadius: "50%",
                          background: "#EFF6FF",
                          border: "1.5px solid #BFDBFE",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: "9px", fontWeight: 800, color: "#2563EB", flexShrink: 0,
                        }}>
                          {i + 1}
                        </span>
                        <span style={{ fontSize: "11px", color: "#425466", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {a.name}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {canvasAgents.length === 0 && (
                  <div style={{ padding: "24px 14px", textAlign: "center" }}>
                    <p style={{ fontSize: "12px", color: "#CBD5E1", lineHeight: 1.6, margin: 0 }}>
                      Add agents from the library to configure your agentic flow.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── Bottom bar — outside overflow:hidden row, slideout cannot reach ── */}
        {canvasAgents.length > 0 && (
          <div style={{
            background: "#0A2540",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
            padding: "0 20px",
            height: "60px",
            gap: "16px",
          }}>
            {/* Pipeline breadcrumb */}
            <div style={{ display: "flex", alignItems: "center", gap: "7px", overflow: "hidden", minWidth: 0, flex: 1 }}>
              {canvasAgents.map((a, i) => (
                <span key={a.agentId} style={{ display: "flex", alignItems: "center", gap: "7px", minWidth: 0, flexShrink: i < canvasAgents.length - 1 ? 1 : 0 }}>
                  <span style={{ fontSize: "13px", fontWeight: 500, color: "#e2e8f0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "160px" }}>
                    {a.name}
                  </span>
                  {i < canvasAgents.length - 1 && (
                    <span style={{ color: "#334155", fontSize: "13px", flexShrink: 0 }}>→</span>
                  )}
                </span>
              ))}
            </div>

            {/* Cost + activate */}
            <div style={{ display: "flex", alignItems: "center", gap: "20px", flexShrink: 0 }}>
              {preview && (
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontSize: "12px", color: "#64748b" }}>
                    <EthAmount amount={preview.subtotal} size={11} style={{ color: "#64748b" }} />
                  </span>
                  <span style={{ fontSize: "11px", color: "#334155" }}>+</span>
                  <span style={{ fontSize: "12px", color: "#64748b" }}>
                    <EthAmount amount={preview.protocolFee} size={11} style={{ color: "#64748b" }} /> fee
                  </span>
                  <span style={{ width: "1px", height: "16px", background: "#1e3a5f", flexShrink: 0, margin: "0 6px" }} />
                  <span style={{ fontSize: "14px", fontWeight: 800, color: "#fff", letterSpacing: "-0.01em" }}>
                    <EthAmount amount={preview.total} size={13} style={{ color: "#fff", fontWeight: 800 }} />
                  </span>
                </div>
              )}
              {error && <p style={{ fontSize: "11px", color: "#fca5a5", margin: 0, maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{error}</p>}
              {!error && !isConnected && <p style={{ fontSize: "11px", color: "#475569", margin: 0 }}>Connect wallet</p>}
              {!error && isConnected && !isSignedIn && <p style={{ fontSize: "11px", color: "#475569", margin: 0 }}>Sign in to activate</p>}
              <button
                onClick={activateFlow}
                disabled={!canActivate}
                style={{
                  padding: "9px 22px", borderRadius: "9px", border: "none",
                  fontSize: "13px", fontWeight: 700,
                  cursor: canActivate ? "pointer" : "not-allowed",
                  background: canActivate ? "#fff" : "#1a2f4a",
                  color: canActivate ? "#0A2540" : "#3d5a80",
                  transition: "background 0.15s", flexShrink: 0,
                  letterSpacing: "-0.01em", whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => { if (canActivate) (e.currentTarget as HTMLButtonElement).style.background = "#dbeafe"; }}
                onMouseLeave={(e) => { if (canActivate) (e.currentTarget as HTMLButtonElement).style.background = "#fff"; }}
              >
                {isPending ? "Check wallet…" : activating ? "Activating…" : "⚡ Activate Agentic Flow"}
              </button>
            </div>
          </div>
        )}
      </div>
      </div>
    </AuthGate>
  );
}
