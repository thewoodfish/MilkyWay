"use client";

import { useCallback, useState, useEffect, useRef, memo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ReactFlow, {
  Node, Edge, addEdge, Connection,
  useNodesState, useEdgesState,
  Background, Controls,
  Handle, Position,
  BackgroundVariant,
} from "reactflow";
import "reactflow/dist/style.css";
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from "wagmi";
import { apiFetch, CATEGORY_LABELS } from "@/lib/utils";
import { authFetch } from "@/lib/auth";
import { useAuth } from "@/context/AuthContext";
import { AuthGate } from "@/components/AuthGate";
import { UsdcAmount } from "@/components/UsdcAmount";
import type { Agent } from "@/lib/types";

const USDC_ADDRESS = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831" as `0x${string}`;
const USDC_TRANSFER_ABI = [
  { name: "transfer", type: "function", stateMutability: "nonpayable",
    inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }] },
] as const;
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDeadline(s: number): string {
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.round(s / 60)}m`;
  return `${Math.round(s / 3600)}h`;
}

type FieldSchema = Record<string, { type: string; required?: boolean; description?: string }>;
type CapabilityDef = {
  description?: string;
  pricing:      { model: string; amount: string; currency: string };
  input_schema:  FieldSchema;
  output_schema: FieldSchema;
};
type AboutSchema = {
  milkyway_version?: string;
  capabilities?: Record<string, CapabilityDef>;
  max_deadline_seconds?: number;
  // legacy flat-schema support
  input_schema?:  FieldSchema;
  output_schema?: FieldSchema;
};

function getFirstCapability(about: AboutSchema | null): CapabilityDef | null {
  if (!about) return null;
  if (about.capabilities) {
    const first = Object.values(about.capabilities)[0];
    if (first) return first;
  }
  // fall back to legacy flat schema
  if (about.input_schema || about.output_schema) {
    return {
      description:   "",
      pricing:       { model: "per_job", amount: "0", currency: "USDC" },
      input_schema:  about.input_schema  ?? {},
      output_schema: about.output_schema ?? {},
    };
  }
  return null;
}

function getInputSchema(about: AboutSchema | null): FieldSchema {
  return getFirstCapability(about)?.input_schema ?? {};
}

function getOutputSchema(about: AboutSchema | null): FieldSchema {
  return getFirstCapability(about)?.output_schema ?? {};
}

// ── Visual field mapper ────────────────────────────────────────────────────

const FM_ROW_H = 32;
const FM_PORT_R = 5;

interface FieldMapperProps {
  sourceName: string;
  targetName: string;
  sourceFields: string[];
  targetFields: Array<{ name: string; required: boolean; type: string }>;
  mappings: Record<string, string>;
  onMap: (targetField: string, sourceField: string) => void;
  onUnmap: (targetField: string) => void;
}

const FieldMapper = memo(function FieldMapper({
  sourceName, targetName, sourceFields, targetFields, mappings, onMap, onUnmap,
}: FieldMapperProps) {
  const rowsRef = useRef<HTMLDivElement>(null);
  const [cWidth, setCWidth] = useState(220);
  const [drag, setDrag] = useState<{ field: string } | null>(null);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const el = rowsRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => setCWidth(Math.floor(entries[0].contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!drag) return;
    const onMove = (e: MouseEvent) => {
      const rect = rowsRef.current?.getBoundingClientRect();
      if (!rect) return;
      setMouse({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    };
    const onUp = (e: MouseEvent) => {
      const rect = rowsRef.current?.getBoundingClientRect();
      if (rect) {
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const tgtPx = Math.floor(cWidth * 0.57);
        for (let i = 0; i < targetFields.length; i++) {
          const py = i * FM_ROW_H + FM_ROW_H / 2;
          if (Math.abs(x - tgtPx) <= FM_PORT_R + 12 && Math.abs(y - py) <= FM_PORT_R + 12) {
            onMap(targetFields[i].name, drag.field);
            break;
          }
        }
      }
      setDrag(null);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, [drag, cWidth, targetFields, onMap]);

  const srcX = Math.floor(cWidth * 0.43);
  const tgtX = Math.floor(cWidth * 0.57);
  const pY = (i: number) => i * FM_ROW_H + FM_ROW_H / 2;
  const svgH = Math.max(sourceFields.length, targetFields.length, 1) * FM_ROW_H;
  const bez = (x1: number, y1: number, x2: number, y2: number) => {
    const cx = (x1 + x2) / 2;
    return `M${x1} ${y1} C${cx} ${y1} ${cx} ${y2} ${x2} ${y2}`;
  };

  return (
    <div style={{ userSelect: "none" }}>
      {/* Column headers */}
      <div style={{ display: "flex", marginBottom: "6px" }}>
        <div style={{ width: "43%", paddingRight: `${FM_PORT_R + 8}px`, textAlign: "right" }}>
          <div style={{ fontSize: "9px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#60A5FA" }}>Output</div>
          <div style={{ fontSize: "9px", color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sourceName}</div>
        </div>
        <div style={{ width: "14%", display: "flex", alignItems: "center", justifyContent: "center", paddingTop: "2px" }}>
          <svg width="14" height="8" fill="none" viewBox="0 0 14 8">
            <path d="M0 4h11M8 1l3 3-3 3" stroke="#BFDBFE" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div style={{ width: "43%", paddingLeft: `${FM_PORT_R + 8}px` }}>
          <div style={{ fontSize: "9px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#10b981" }}>Input</div>
          <div style={{ fontSize: "9px", color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{targetName}</div>
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: "1px", background: "#EEF2FF", marginBottom: "4px" }} />

      {/* Field rows — SVG is positioned over this div only */}
      <div ref={rowsRef} style={{ position: "relative" }}>
        <div style={{ display: "flex" }}>
          {/* Source column */}
          <div style={{ width: "43%", display: "flex", flexDirection: "column" }}>
            {sourceFields.map((f) => (
              <div key={f} style={{ height: FM_ROW_H, display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: `${FM_PORT_R + 8}px` }}>
                <span style={{ fontSize: "10px", color: "#425466", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>{f}</span>
              </div>
            ))}
          </div>
          {/* 14% gap — SVG connector zone */}
          <div style={{ width: "14%" }} />
          {/* Target column */}
          <div style={{ width: "43%", display: "flex", flexDirection: "column" }}>
            {targetFields.map((f) => {
              const isMapped = !!mappings[f.name];
              return (
                <div key={f.name} style={{ height: FM_ROW_H, display: "flex", alignItems: "center", paddingLeft: `${FM_PORT_R + 8}px`, gap: "4px" }}>
                  <span style={{ fontSize: "10px", color: isMapped ? "#0A2540" : "#94a3b8", fontWeight: isMapped ? 600 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{f.name}</span>
                  {f.required && !isMapped && <span style={{ fontSize: "8px", color: "#ef4444", flexShrink: 0, fontWeight: 700 }}>req</span>}
                  {isMapped && (
                    <button
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={() => onUnmap(f.name)}
                      style={{ fontSize: "9px", color: "#ef4444", background: "transparent", border: "none", cursor: "pointer", padding: "0 3px", flexShrink: 0, lineHeight: 1 }}
                    >✕</button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* SVG overlay — covers field rows only */}
        <svg
          style={{ position: "absolute", top: 0, left: 0, width: "100%", height: svgH, overflow: "visible", pointerEvents: "none" }}
          height={svgH}
        >
          {/* Mapping lines */}
          {Object.entries(mappings).map(([tgt, src]) => {
            const si = sourceFields.indexOf(src);
            const ti = targetFields.findIndex((f) => f.name === tgt);
            if (si === -1 || ti === -1) return null;
            return (
              <path key={tgt}
                d={bez(srcX, pY(si), tgtX, pY(ti))}
                fill="none" stroke="#2563EB" strokeWidth={2} strokeOpacity={0.75}
              />
            );
          })}

          {/* In-progress drag line */}
          {drag && (() => {
            const si = sourceFields.indexOf(drag.field);
            if (si === -1) return null;
            return (
              <path
                d={bez(srcX, pY(si), mouse.x, mouse.y)}
                fill="none" stroke="#2563EB" strokeWidth={1.5} strokeDasharray="5 3" strokeOpacity={0.9}
              />
            );
          })()}

          {/* Source port dots */}
          {sourceFields.map((f, i) => (
            <circle key={`sp-${f}`}
              cx={srcX} cy={pY(i)} r={FM_PORT_R}
              fill={drag?.field === f ? "#1d4ed8" : "#60A5FA"}
              stroke="#fff" strokeWidth={2}
              style={{ cursor: "crosshair", pointerEvents: "auto" }}
              onMouseDown={(e) => {
                e.preventDefault();
                const rect = rowsRef.current!.getBoundingClientRect();
                setMouse({ x: e.clientX - rect.left, y: e.clientY - rect.top });
                setDrag({ field: f });
              }}
            />
          ))}

          {/* Target port dots */}
          {targetFields.map((f, i) => (
            <circle key={`tp-${f.name}`}
              cx={tgtX} cy={pY(i)} r={FM_PORT_R}
              fill={mappings[f.name] ? "#10b981" : "#E2E8F0"}
              stroke={mappings[f.name] ? "#86EFAC" : "#CBD5E1"} strokeWidth={2}
            />
          ))}
        </svg>
      </div>

      {/* Drag hint */}
      <div style={{ display: "flex", alignItems: "center", gap: "5px", justifyContent: "center", marginTop: "8px" }}>
        <svg width="8" height="8" viewBox="0 0 8 8"><circle cx="4" cy="4" r="3" fill="#60A5FA" stroke="#fff" strokeWidth="1"/></svg>
        <span style={{ fontSize: "9px", color: "#CBD5E1", letterSpacing: "0.02em" }}>drag a dot to connect</span>
        <svg width="8" height="8" viewBox="0 0 8 8"><circle cx="4" cy="4" r="3" fill="#10b981" stroke="#fff" strokeWidth="1"/></svg>
      </div>
    </div>
  );
});

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
  const inCount  = Object.keys(getInputSchema(about)).length  || null;
  const outCount = Object.keys(getOutputSchema(about)).length || null;

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
          borderBottom: "1px solid #DBEAFE",
          background: "#EFF6FF",
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
            src={agent.logoUrl || `https://api.dicebear.com/9.x/bottts/svg?seed=milkyway-${agent.agentId}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf&scale=85`}
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
            {agent.pricingModel === "FREE" ? "Free" : <UsdcAmount amount={agent.priceUsdc!} size={10} />}
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

// ── Auto-match helper ─────────────────────────────────────────────────────

function computeAutoMatches(
  outputSchema: Record<string, { type: string }>,
  inputSchema: Record<string, { type: string; required?: boolean }>,
): Record<string, string> {
  const matches: Record<string, string> = {};
  for (const [targetField, targetDef] of Object.entries(inputSchema)) {
    if (outputSchema[targetField] && outputSchema[targetField].type === targetDef.type) {
      matches[targetField] = targetField;
    }
  }
  return matches;
}


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
  const [inputMappings, setInputMappings] = useState<Record<string, Record<string, string>>>({});
  const [rightPanel, setRightPanel] = useState<"overview" | "agent" | "mapping" | "summary">("overview");
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
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
      body: JSON.stringify({ internalId: flowInternalId, paymentTxHash: txHash }),
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
    setInputMappings((prev) => {
      const next = { ...prev };
      delete next[String(agentId)];
      return next;
    });
  }, [setNodes, setEdges]);

  const onConnect = useCallback(
    (conn: Connection) =>
      setEdges((eds) =>
        addEdge({ ...conn, animated: true, style: { stroke: "#2563EB", strokeWidth: 2 } }, eds)
      ),
    [setEdges]
  );

  function addToCanvas(agent: Agent) {
    if (!agent.phase2Ready) return;
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
        inputMapping: inputMappings[String(a.agentId)] ?? {},
      }));
      const res = await authFetch(`${API}/api/flows/create`, {
        method: "POST",
        body: JSON.stringify({ agents: agentsPayload, trigger: "IMMEDIATE", deadlineSeconds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create flow");

      setFlowInternalId(data.internalId);
      writeContract({
        address: USDC_ADDRESS,
        abi: USDC_TRANSFER_ABI,
        functionName: "transfer",
        args: [
          data.milkywayPaymentAddress as `0x${string}`,
          BigInt(data.rawAmountUsdc),
        ],
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

  // Per-agent: required fields that are neither wired nor hardcoded
  const missingFieldsCount = canvasAgents.reduce((count, agent) => {
    const agentAbout  = agent.aboutSchema as AboutSchema | null;
    const agentInputs = Object.entries(getInputSchema(agentAbout));
    const agentMappings = inputMappings[String(agent.agentId)] ?? {};
    const agentStatics  = staticInputs[String(agent.agentId)] ?? {};
    return count + agentInputs.filter(([f, d]) => d.required && !agentMappings[f] && !agentStatics[f]).length;
  }, 0);

  const about = selectedAgent?.aboutSchema as AboutSchema | null;

  const incomingEdge = selectedAgent
    ? edges.find((e) => e.target === `agent-${selectedAgent.agentId}`)
    : null;
  const sourceAgent = incomingEdge
    ? (canvasAgents.find((a) => `agent-${a.agentId}` === incomingEdge.source) ?? null)
    : null;

  const edgeSourceAgent = selectedEdge
    ? (canvasAgents.find((a) => `agent-${a.agentId}` === selectedEdge.source) ?? null)
    : null;
  const edgeTargetAgent = selectedEdge
    ? (canvasAgents.find((a) => `agent-${a.agentId}` === selectedEdge.target) ?? null)
    : null;

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
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>

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
                            src={libraryAgent.logoUrl || `https://api.dicebear.com/9.x/bottts/svg?seed=milkyway-${libraryAgent.agentId}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf&scale=85`}
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
                            {libraryAgent.pricingModel === "FREE" ? "Free" : `${libraryAgent.priceUsdc} USDC / job`}
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
                        const caps = la.capabilities ? Object.keys(la.capabilities) : [];
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
                        const ins = getInputSchema(libraryAgent.aboutSchema as AboutSchema | null);
                        if (Object.keys(ins).length === 0) return null;
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
                        const outs = getOutputSchema(libraryAgent.aboutSchema as AboutSchema | null);
                        if (Object.keys(outs).length === 0) return null;
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
                      ) : !libraryAgent.phase2Ready ? (
                        <div style={{ width: "100%", padding: "10px", borderRadius: "10px", background: "#F8FAFF", border: "1px solid #E3E8EF", color: "#94a3b8", fontSize: "12px", fontWeight: 500, textAlign: "center" }}>
                          Not available for flows
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
                                  src={agent.logoUrl || `https://api.dicebear.com/9.x/bottts/svg?seed=milkyway-${agent.agentId}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf&scale=85`}
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
                                  {agent.pricingModel === "FREE" ? "Free" : `${agent.priceUsdc} USDC`}
                                </p>
                                {agent.description && (
                                  <p style={{ color: "#64748b", fontSize: "10px", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{agent.description}</p>
                                )}
                              </div>
                              <button
                                onClick={(e) => { e.stopPropagation(); if (!onCanvas && agent.phase2Ready) addToCanvas(agent); }}
                                style={{ width: "26px", height: "26px", borderRadius: "7px", background: onCanvas ? "#DCFCE7" : agent.phase2Ready ? "#EFF6FF" : "#F1F5F9", border: `1px solid ${onCanvas ? "#86EFAC" : agent.phase2Ready ? "#BFDBFE" : "#E2E8F0"}`, color: onCanvas ? "#10b981" : agent.phase2Ready ? "#2563EB" : "#CBD5E1", fontSize: onCanvas ? "11px" : "15px", cursor: onCanvas || !agent.phase2Ready ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontWeight: 700, lineHeight: 1 }}
                              >
                                {onCanvas ? "✓" : agent.phase2Ready ? "+" : "—"}
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
                if (a) { setSelectedAgent(a); setSelectedEdge(null); setRightPanel("agent"); }
              }}
              onEdgeClick={(_, edge) => {
                setSelectedEdge(edge);
                setSelectedAgent(null);
                setRightPanel("mapping");
                const tgtId = edge.target.replace("agent-", "");
                const srcAg = canvasAgents.find((a) => `agent-${a.agentId}` === edge.source);
                const tgtAg = canvasAgents.find((a) => `agent-${a.agentId}` === edge.target);
                if (srcAg && tgtAg) {
                  const autoM = computeAutoMatches(
                    getOutputSchema(srcAg.aboutSchema as AboutSchema | null),
                    getInputSchema(tgtAg.aboutSchema as AboutSchema | null),
                  );
                  if (Object.keys(autoM).length > 0) {
                    setInputMappings((prev) =>
                      Object.keys(prev[tgtId] ?? {}).length === 0
                        ? { ...prev, [tgtId]: autoM }
                        : prev
                    );
                  }
                }
              }}
              onPaneClick={() => {
                setSelectedAgent(null); setSelectedEdge(null); setRightPanel("overview");
              }}
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

        </div>

          {/* ── RIGHT: Context panel ─────────────────────────────── */}
          <div style={{
            width: "272px",
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            borderLeft: "1px solid #BFDBFE",
            background: "#fff",
            overflow: "hidden",
          }}>

            {/* ── STATE: overview ── */}
            {rightPanel === "overview" && (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                {/* Header */}
                <div style={{ padding: "14px 16px 12px", borderBottom: "1px solid #E3E8EF", flexShrink: 0 }}>
                  <p style={{ color: "#0A2540", fontSize: "13px", fontWeight: 700, margin: "0 0 1px", letterSpacing: "-0.01em" }}>Deployment Chain</p>
                  <p style={{ color: "#94a3b8", fontSize: "10px", margin: 0 }}>
                    {canvasAgents.length === 0 ? "Add agents to build a flow" : `${canvasAgents.length} agent${canvasAgents.length !== 1 ? "s" : ""} · click to configure`}
                  </p>
                </div>

                <div style={{ flex: 1, overflowY: "auto" }}>
                  {canvasAgents.length === 0 ? (
                    <div style={{ padding: "36px 16px", textAlign: "center" }}>
                      <p style={{ color: "#CBD5E1", fontSize: "12px", lineHeight: 1.7, margin: 0 }}>
                        Add agents from the library, then connect them on the canvas.
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Deployment chain list */}
                      <div style={{ padding: "12px 12px 4px" }}>
                        {canvasAgents.map((a, i) => {
                          const aAbout  = a.aboutSchema as AboutSchema | null;
                          const aInputs = Object.entries(getInputSchema(aAbout));
                          const aMappings = inputMappings[String(a.agentId)] ?? {};
                          const aStatics = staticInputs[String(a.agentId)] ?? {};
                          const missing = aInputs.filter(([f, d]) => d.required && !aMappings[f] && !aStatics[f]).length;
                          const hasAll = missing === 0;
                          return (
                            <div key={a.agentId} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                              <button
                                onClick={() => { setSelectedAgent(a); setSelectedEdge(null); setRightPanel("agent"); }}
                                style={{
                                  width: "100%", display: "flex", alignItems: "center", gap: "8px",
                                  padding: "8px 10px", borderRadius: "10px",
                                  border: `1px solid ${hasAll ? "#BBF7D0" : "#FED7AA"}`,
                                  background: hasAll ? "#F0FDF4" : "#FFF7ED",
                                  cursor: "pointer", textAlign: "left", transition: "all 0.15s",
                                }}
                                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = hasAll ? "#86EFAC" : "#FCA5A5"; }}
                                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = hasAll ? "#BBF7D0" : "#FED7AA"; }}
                              >
                                <span style={{
                                  width: "20px", height: "20px", borderRadius: "50%",
                                  background: hasAll ? "#DCFCE7" : "#FEF3C7",
                                  border: `1.5px solid ${hasAll ? "#86EFAC" : "#FDE68A"}`,
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                  fontSize: "9px", fontWeight: 800,
                                  color: hasAll ? "#16a34a" : "#D97706", flexShrink: 0,
                                }}>
                                  {i + 1}
                                </span>
                                <div style={{ width: "24px", height: "24px", borderRadius: "7px", overflow: "hidden", flexShrink: 0, border: "1px solid #DBEAFE" }}>
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={a.logoUrl || `https://api.dicebear.com/9.x/bottts/svg?seed=milkyway-${a.agentId}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf&scale=85`} alt={a.name} width={24} height={24} style={{ display: "block", width: "100%", height: "100%" }} />
                                </div>
                                <span style={{ fontSize: "11px", color: "#0A2540", fontWeight: 600, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {a.name}
                                </span>
                                <span style={{ fontSize: "10px", color: hasAll ? "#16a34a" : "#D97706", fontWeight: 600, flexShrink: 0 }}>
                                  {hasAll ? "✓" : `${missing} missing`}
                                </span>
                              </button>
                              {i < canvasAgents.length - 1 && (
                                <div style={{ width: "2px", height: "10px", background: "#BFDBFE", margin: "2px 0" }} />
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Deadline */}
                      <div style={{ padding: "12px 12px 4px" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                          <p style={{ ...sectionLabel, margin: 0 }}>Deadline</p>
                          <span style={{ fontSize: "12px", fontWeight: 800, color: "#2563EB" }}>{formatDeadline(deadlineSeconds)}</span>
                        </div>
                        <input type="range" min={30} max={86400} step={30} value={deadlineSeconds}
                          onChange={(e) => setDeadlineSeconds(Number(e.target.value))}
                          style={{ width: "100%", accentColor: "#2563EB", cursor: "pointer" }}
                        />
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "#93C5FD", marginTop: "2px" }}>
                          <span>30s</span><span>12h</span><span>24h</span>
                        </div>
                      </div>

                      {/* Checklist */}
                      <div style={{ padding: "12px 12px 4px", borderTop: "1px solid #F1F5F9" }}>
                        <p style={sectionLabel}>Checklist</p>
                        {[
                          { ok: isConnected, label: "Wallet connected" },
                          { ok: isSignedIn, label: "Signed in" },
                          { ok: canvasAgents.length > 0, label: `${canvasAgents.length} agent${canvasAgents.length !== 1 ? "s" : ""} added` },
                          { ok: missingFieldsCount === 0, label: missingFieldsCount === 0 ? "All fields filled" : `${missingFieldsCount} required field${missingFieldsCount !== 1 ? "s" : ""} missing` },
                        ].map(({ ok, label }) => (
                          <div key={label} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "7px" }}>
                            <span style={{
                              width: "16px", height: "16px", borderRadius: "50%", flexShrink: 0,
                              background: ok ? "#DCFCE7" : "#FEF2F2",
                              border: `1.5px solid ${ok ? "#86EFAC" : "#FECACA"}`,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: "9px", color: ok ? "#16a34a" : "#ef4444", fontWeight: 700,
                            }}>
                              {ok ? "✓" : "✗"}
                            </span>
                            <span style={{ fontSize: "11px", color: ok ? "#425466" : "#94a3b8" }}>{label}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Deploy button — sticky footer */}
                {canvasAgents.length > 0 && (
                  <div style={{ padding: "12px", borderTop: "1px solid #E3E8EF", flexShrink: 0 }}>
                    <button
                      onClick={() => setRightPanel("summary")}
                      disabled={!canActivate || missingFieldsCount > 0}
                      style={{
                        width: "100%", padding: "12px", borderRadius: "10px", border: "none",
                        fontSize: "13px", fontWeight: 700, letterSpacing: "-0.01em",
                        cursor: (canActivate && missingFieldsCount === 0) ? "pointer" : "not-allowed",
                        background: (canActivate && missingFieldsCount === 0) ? "#2563EB" : "#E2E8F0",
                        color: (canActivate && missingFieldsCount === 0) ? "#fff" : "#94a3b8",
                        transition: "background 0.15s",
                        boxShadow: (canActivate && missingFieldsCount === 0) ? "0 4px 14px rgba(37,99,235,0.35)" : "none",
                      }}
                      onMouseEnter={(e) => { if (canActivate && missingFieldsCount === 0) (e.currentTarget as HTMLButtonElement).style.background = "#1d4ed8"; }}
                      onMouseLeave={(e) => { if (canActivate && missingFieldsCount === 0) (e.currentTarget as HTMLButtonElement).style.background = "#2563EB"; }}
                    >
                      Review & Deploy
                    </button>
                    {!isConnected && <p style={{ fontSize: "10px", color: "#94a3b8", margin: "6px 0 0", textAlign: "center" }}>Connect wallet to deploy</p>}
                    {isConnected && !isSignedIn && <p style={{ fontSize: "10px", color: "#94a3b8", margin: "6px 0 0", textAlign: "center" }}>Sign in to deploy</p>}
                  </div>
                )}
              </div>
            )}

            {/* ── STATE: agent ── */}
            {rightPanel === "agent" && selectedAgent && (() => {
              const agentAbout       = selectedAgent.aboutSchema as AboutSchema | null;
              const agentInputSchema  = getInputSchema(agentAbout);
              const agentOutputSchema = getOutputSchema(agentAbout);
              const agentMappings     = inputMappings[String(selectedAgent.agentId)] ?? {};
              const agentStatics      = staticInputs[String(selectedAgent.agentId)] ?? {};
              const srcAbout          = sourceAgent?.aboutSchema as AboutSchema | null;
              const srcOutputs        = Object.keys(getOutputSchema(srcAbout));

              return (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                  {/* Back + agent header */}
                  <div style={{ padding: "12px 14px", borderBottom: "1px solid #E3E8EF", flexShrink: 0 }}>
                    <button
                      onClick={() => { setSelectedAgent(null); setRightPanel("overview"); }}
                      style={{ display: "flex", alignItems: "center", gap: "4px", color: "#2563EB", fontSize: "11px", fontWeight: 500, background: "transparent", border: "none", cursor: "pointer", padding: "0 0 10px", opacity: 0.8 }}
                    >
                      <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                      Chain
                    </button>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div style={{ width: "36px", height: "36px", borderRadius: "10px", overflow: "hidden", flexShrink: 0, border: "1px solid #DBEAFE" }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={selectedAgent.logoUrl || `https://api.dicebear.com/9.x/bottts/svg?seed=milkyway-${selectedAgent.agentId}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf&scale=85`} alt={selectedAgent.name} width={36} height={36} style={{ display: "block", width: "100%", height: "100%" }} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ color: "#0A2540", fontSize: "13px", fontWeight: 700, margin: "0 0 1px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selectedAgent.name}</p>
                        <span style={{ fontSize: "10px", color: "#94a3b8" }}>
                          {selectedAgent.pricingModel === "FREE" ? "Free" : `${selectedAgent.priceUsdc} USDC / job`}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ flex: 1, overflowY: "auto" }}>
                    {/* What it needs */}
                    {Object.keys(agentInputSchema).length > 0 && (
                      <div style={{ padding: "12px 14px", borderBottom: "1px solid #E3E8EF" }}>
                        <p style={sectionLabel}>What it needs</p>
                        {sourceAgent && srcOutputs.length > 0 ? (
                          <>
                            <FieldMapper
                              sourceName={sourceAgent.name}
                              targetName={selectedAgent.name}
                              sourceFields={srcOutputs}
                              targetFields={Object.entries(agentInputSchema).map(([name, d]) => ({ name, required: d.required ?? false, type: d.type }))}
                              mappings={agentMappings}
                              onMap={(tgt, src) => setInputMappings((prev) => ({
                                ...prev,
                                [String(selectedAgent.agentId)]: { ...(prev[String(selectedAgent.agentId)] ?? {}), [tgt]: src },
                              }))}
                              onUnmap={(tgt) => setInputMappings((prev) => {
                                const m = { ...(prev[String(selectedAgent.agentId)] ?? {}) };
                                delete m[tgt];
                                return { ...prev, [String(selectedAgent.agentId)]: m };
                              })}
                            />
                            {/* Hardcode unmapped fields */}
                            {Object.entries(agentInputSchema).some(([f]) => !agentMappings[f]) && (
                              <div style={{ marginTop: "10px", paddingTop: "10px", borderTop: "1px dashed #E3E8EF" }}>
                                <p style={{ fontSize: "9px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#94a3b8", margin: "0 0 8px" }}>Hardcode unmapped</p>
                                {Object.entries(agentInputSchema).filter(([f]) => !agentMappings[f]).map(([field, def]) => (
                                  <div key={field} style={{ marginBottom: "8px" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "4px" }}>
                                      <span style={{ fontSize: "10px", color: "#425466", fontWeight: 500, flex: 1 }}>{field}</span>
                                      <span style={{ fontSize: "8px", color: "#2563EB", background: "#EEF2FF", padding: "1px 4px", borderRadius: "3px", border: "1px solid #BFDBFE" }}>{def.type}</span>
                                      {def.required && !agentStatics[field] && <span style={{ fontSize: "8px", color: "#ef4444", fontWeight: 700 }}>req</span>}
                                    </div>
                                    <input
                                      value={agentStatics[field] ?? ""}
                                      onChange={(e) => setStaticInputs((prev) => ({
                                        ...prev,
                                        [String(selectedAgent.agentId)]: { ...(prev[String(selectedAgent.agentId)] ?? {}), [field]: e.target.value },
                                      }))}
                                      placeholder={def.description ?? `${field}…`}
                                      style={{
                                        width: "100%", background: agentStatics[field] ? "#F0FDF4" : "#F8FAFF",
                                        border: `1px solid ${agentStatics[field] ? "#86EFAC" : (def.required && !agentStatics[field]) ? "#FECACA" : "#E3E8EF"}`,
                                        borderRadius: "7px", padding: "5px 8px", fontSize: "11px",
                                        color: "#0A2540", outline: "none", boxSizing: "border-box",
                                      }}
                                      onFocus={(e) => { e.target.style.borderColor = "#2563EB"; }}
                                      onBlur={(e) => { e.target.style.borderColor = agentStatics[field] ? "#86EFAC" : (def.required && !agentStatics[field]) ? "#FECACA" : "#E3E8EF"; }}
                                    />
                                  </div>
                                ))}
                              </div>
                            )}
                          </>
                        ) : (
                          Object.entries(agentInputSchema).map(([field, def]) => {
                            const hardcoded = agentStatics[field] ?? "";
                            const isMissing = def.required && !hardcoded;
                            return (
                              <div key={field} style={{ marginBottom: "10px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "4px" }}>
                                  <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: isMissing ? "#ef4444" : "#10b981", flexShrink: 0 }} />
                                  <span style={{ fontSize: "11px", color: "#0A2540", fontWeight: 600, flex: 1 }}>{field}</span>
                                  <span style={{ fontSize: "9px", color: "#2563EB", background: "#EEF2FF", padding: "1px 5px", borderRadius: "4px", border: "1px solid #BFDBFE" }}>{def.type}</span>
                                  {def.required && <span style={{ fontSize: "9px", color: "#ef4444", fontWeight: 700 }}>req</span>}
                                </div>
                                <input
                                  value={hardcoded}
                                  onChange={(e) => setStaticInputs((prev) => ({
                                    ...prev,
                                    [String(selectedAgent.agentId)]: { ...(prev[String(selectedAgent.agentId)] ?? {}), [field]: e.target.value },
                                  }))}
                                  placeholder={def.description ?? `Enter ${field}…`}
                                  style={{
                                    width: "100%", background: hardcoded ? "#F0FDF4" : "#F8FAFF",
                                    border: `1px solid ${hardcoded ? "#86EFAC" : isMissing ? "#FECACA" : "#E3E8EF"}`,
                                    borderRadius: "8px", padding: "6px 8px", fontSize: "11px",
                                    color: "#0A2540", outline: "none", boxSizing: "border-box",
                                  }}
                                  onFocus={(e) => { e.target.style.borderColor = "#2563EB"; }}
                                  onBlur={(e) => { e.target.style.borderColor = hardcoded ? "#86EFAC" : isMissing ? "#FECACA" : "#E3E8EF"; }}
                                />
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}

                    {/* What it returns */}
                    {Object.keys(agentOutputSchema).length > 0 && (
                      <div style={{ padding: "12px 14px", borderBottom: "1px solid #E3E8EF" }}>
                        <p style={sectionLabel}>What it returns</p>
                        {Object.entries(agentOutputSchema).map(([field, def]) => (
                          <div key={field} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "7px" }}>
                            <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#10b981", flexShrink: 0 }} />
                            <span style={{ fontSize: "11px", color: "#425466", flex: 1 }}>{field}</span>
                            <span style={{ fontSize: "9px", color: "#10b981", background: "#DCFCE7", padding: "1px 5px", borderRadius: "4px", border: "1px solid #BBF7D0" }}>{def.type}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* No schema */}
                    {Object.keys(agentInputSchema).length === 0 && Object.keys(agentOutputSchema).length === 0 && (
                      <div style={{ padding: "24px 14px", textAlign: "center" }}>
                        <p style={{ color: "#CBD5E1", fontSize: "11px", margin: 0 }}>This agent has no published schema.</p>
                      </div>
                    )}
                  </div>

                  {/* Remove button */}
                  <div style={{ padding: "12px 14px", borderTop: "1px solid #E3E8EF", flexShrink: 0 }}>
                    <button
                      onClick={() => { removeFromCanvas(selectedAgent.agentId); setRightPanel("overview"); }}
                      style={{
                        width: "100%", padding: "8px", borderRadius: "8px",
                        border: "1px solid #FECACA", background: "#FEF2F2",
                        color: "#ef4444", fontSize: "12px", fontWeight: 500, cursor: "pointer", transition: "all 0.15s",
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#FEE2E2"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#FEF2F2"; }}
                    >
                      Remove agent
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* ── STATE: mapping (edge selected) ── */}
            {rightPanel === "mapping" && selectedEdge && edgeSourceAgent && edgeTargetAgent && (() => {
              const srcAbout       = edgeSourceAgent.aboutSchema as AboutSchema | null;
              const tgtAbout       = edgeTargetAgent.aboutSchema as AboutSchema | null;
              const srcOutputSchema = getOutputSchema(srcAbout);
              const tgtInputSchema  = getInputSchema(tgtAbout);
              const tgtMappings = inputMappings[String(edgeTargetAgent.agentId)] ?? {};
              const srcOutputKeys = Object.keys(srcOutputSchema);
              const stillMissing = Object.entries(tgtInputSchema).filter(
                ([f, d]) => d.required && !tgtMappings[f] && !(staticInputs[String(edgeTargetAgent.agentId)] ?? {})[f]
              );

              return (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                  {/* Back + header */}
                  <div style={{ padding: "12px 14px", borderBottom: "1px solid #E3E8EF", flexShrink: 0 }}>
                    <button
                      onClick={() => { setSelectedEdge(null); setRightPanel("overview"); }}
                      style={{ display: "flex", alignItems: "center", gap: "4px", color: "#2563EB", fontSize: "11px", fontWeight: 500, background: "transparent", border: "none", cursor: "pointer", padding: "0 0 10px", opacity: 0.8 }}
                    >
                      <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                      Chain
                    </button>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ fontSize: "12px", fontWeight: 600, color: "#0A2540", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "90px" }}>{edgeSourceAgent.name}</span>
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#93C5FD" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                      <span style={{ fontSize: "12px", fontWeight: 600, color: "#0A2540", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "90px" }}>{edgeTargetAgent.name}</span>
                    </div>
                  </div>

                  <div style={{ flex: 1, overflowY: "auto" }}>
                    <div style={{ padding: "12px 14px" }}>
                      {srcOutputKeys.length > 0 && Object.keys(tgtInputSchema).length > 0 ? (
                        <>
                          <FieldMapper
                            sourceName={edgeSourceAgent.name}
                            targetName={edgeTargetAgent.name}
                            sourceFields={srcOutputKeys}
                            targetFields={Object.entries(tgtInputSchema).map(([name, d]) => ({ name, required: d.required ?? false, type: d.type }))}
                            mappings={tgtMappings}
                            onMap={(tgt, src) => setInputMappings((prev) => ({
                              ...prev,
                              [String(edgeTargetAgent.agentId)]: { ...(prev[String(edgeTargetAgent.agentId)] ?? {}), [tgt]: src },
                            }))}
                            onUnmap={(tgt) => setInputMappings((prev) => {
                              const m = { ...(prev[String(edgeTargetAgent.agentId)] ?? {}) };
                              delete m[tgt];
                              return { ...prev, [String(edgeTargetAgent.agentId)]: m };
                            })}
                          />
                        </>
                      ) : (
                        <p style={{ color: "#CBD5E1", fontSize: "11px", margin: 0 }}>
                          {srcOutputKeys.length === 0 ? `${edgeSourceAgent.name} has no declared outputs.` : `${edgeTargetAgent.name} has no declared inputs.`}
                        </p>
                      )}
                    </div>

                    {/* Still needed */}
                    {stillMissing.length > 0 && (
                      <div style={{ padding: "0 14px 12px", borderTop: "1px solid #F1F5F9" }}>
                        <p style={{ ...sectionLabel, color: "#F59E0B", margin: "12px 0 8px" }}>Still needed</p>
                        {stillMissing.map(([field]) => (
                          <div key={field} style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px", padding: "6px 9px", background: "#FFFBEB", borderRadius: "8px", border: "1px solid #FDE68A" }}>
                            <span style={{ fontSize: "10px", color: "#92400E" }}>⚠ <b>{field}</b> — hardcode on agent</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* ── STATE: summary ── */}
            {rightPanel === "summary" && (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                {/* Back + header */}
                <div style={{ padding: "12px 14px", borderBottom: "1px solid #E3E8EF", flexShrink: 0 }}>
                  <button
                    onClick={() => setRightPanel("overview")}
                    style={{ display: "flex", alignItems: "center", gap: "4px", color: "#2563EB", fontSize: "11px", fontWeight: 500, background: "transparent", border: "none", cursor: "pointer", padding: "0 0 10px", opacity: 0.8 }}
                  >
                    <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                    Back
                  </button>
                  <p style={{ color: "#0A2540", fontSize: "13px", fontWeight: 700, margin: 0, letterSpacing: "-0.01em" }}>Order Summary</p>
                </div>

                <div style={{ flex: 1, overflowY: "auto", padding: "14px" }}>
                  {/* Per-agent rows */}
                  {canvasAgents.map((a, i) => (
                    <div key={a.agentId} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                      <span style={{ fontSize: "10px", color: "#94a3b8", width: "14px", flexShrink: 0 }}>{i + 1}</span>
                      <div style={{ width: "22px", height: "22px", borderRadius: "6px", overflow: "hidden", flexShrink: 0, border: "1px solid #DBEAFE" }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={a.logoUrl || `https://api.dicebear.com/9.x/bottts/svg?seed=milkyway-${a.agentId}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf&scale=85`} alt={a.name} width={22} height={22} style={{ display: "block", width: "100%", height: "100%" }} />
                      </div>
                      <span style={{ fontSize: "11px", color: "#425466", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}</span>
                      <span style={{ fontSize: "11px", color: "#0A2540", fontWeight: 600, flexShrink: 0 }}>
                        {a.pricingModel === "FREE" ? "Free" : `${a.priceUsdc} USDC`}
                      </span>
                    </div>
                  ))}

                  <div style={{ height: "1px", background: "#E3E8EF", margin: "10px 0" }} />

                  {/* Fee + total */}
                  {preview ? (
                    <>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                        <span style={{ fontSize: "11px", color: "#64748b" }}>Subtotal</span>
                        <UsdcAmount amount={preview.subtotal} size={11} style={{ color: "#425466" }} />
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                        <span style={{ fontSize: "11px", color: "#64748b" }}>Protocol fee (1%)</span>
                        <UsdcAmount amount={preview.protocolFee} size={11} style={{ color: "#425466" }} />
                      </div>
                      <div style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        padding: "11px 14px", borderRadius: "10px", background: "#0A2540",
                      }}>
                        <span style={{ fontSize: "13px", fontWeight: 700, color: "#94a3b8" }}>Total</span>
                        <UsdcAmount amount={preview.total} size={15} style={{ color: "#fff", fontWeight: 800 }} />
                      </div>
                    </>
                  ) : (
                    <p style={{ fontSize: "11px", color: "#CBD5E1" }}>Calculating…</p>
                  )}

                  {/* Deadline summary */}
                  <div style={{ marginTop: "12px", padding: "10px 12px", background: "#F8FAFF", borderRadius: "8px", border: "1px solid #E3E8EF" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: "10px", color: "#94a3b8" }}>Deadline</span>
                      <span style={{ fontSize: "10px", color: "#425466", fontWeight: 600 }}>{formatDeadline(deadlineSeconds)}</span>
                    </div>
                  </div>
                </div>

                {/* Confirm button */}
                <div style={{ padding: "12px 14px", borderTop: "1px solid #E3E8EF", flexShrink: 0 }}>
                  {error && <p style={{ fontSize: "11px", color: "#ef4444", margin: "0 0 8px", lineHeight: 1.4 }}>{error}</p>}
                  <button
                    onClick={activateFlow}
                    disabled={!canActivate}
                    style={{
                      width: "100%", padding: "12px", borderRadius: "10px", border: "none",
                      fontSize: "13px", fontWeight: 700, letterSpacing: "-0.01em",
                      cursor: canActivate ? "pointer" : "not-allowed",
                      background: canActivate ? "#2563EB" : "#E2E8F0",
                      color: canActivate ? "#fff" : "#94a3b8",
                      transition: "background 0.15s",
                      boxShadow: canActivate ? "0 4px 14px rgba(37,99,235,0.35)" : "none",
                    }}
                    onMouseEnter={(e) => { if (canActivate) (e.currentTarget as HTMLButtonElement).style.background = "#1d4ed8"; }}
                    onMouseLeave={(e) => { if (canActivate) (e.currentTarget as HTMLButtonElement).style.background = "#2563EB"; }}
                  >
                    {isPending ? "Check wallet…" : activating ? "Locking payment…" : "Confirm & Lock Payment"}
                  </button>
                </div>
              </div>
            )}

            {/* Fallback when agent/mapping state but selection cleared */}
            {((rightPanel === "agent" && !selectedAgent) || (rightPanel === "mapping" && (!selectedEdge || !edgeSourceAgent || !edgeTargetAgent))) && (
              <div style={{ padding: "32px 16px", textAlign: "center" }}>
                <p style={{ color: "#CBD5E1", fontSize: "12px", margin: 0 }}>Click an agent or connection on the canvas.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AuthGate>
  );
}
