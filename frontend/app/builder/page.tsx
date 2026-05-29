"use client";

import { useCallback, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ReactFlow, {
  Node, addEdge, Connection,
  useNodesState, useEdgesState,
  Background, Controls, MiniMap,
} from "reactflow";
import "reactflow/dist/style.css";
import { parseEther } from "viem";
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from "wagmi";
import { apiFetch, CATEGORY_LABELS } from "@/lib/utils";
import { authFetch } from "@/lib/auth";
import { useAuth } from "@/context/AuthContext";
import { ESCROW_ABI } from "@/lib/escrow-abi";
import { AuthGate } from "@/components/AuthGate";
import type { Agent } from "@/lib/types";

const ESCROW = process.env.NEXT_PUBLIC_JOB_ESCROW_ADDRESS as `0x${string}`;
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

// ── Agent node component ───────────────────────────────────────────────

function AgentNode({ data }: { data: { agent: Agent; orderIndex: number } }) {
  const { agent } = data;
  return (
    <div
      className="rounded-xl p-4 min-w-[220px]"
      style={{
        background: "#161b22",
        border: "1px solid #30363d",
        boxShadow: "0 4px 24px rgba(0,0,0,0.6), 0 0 0 1px rgba(37,99,235,0.06)",
      }}
    >
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center text-[13px] font-bold flex-shrink-0"
          style={{ background: "rgba(37,99,235,0.2)", color: "#79c0ff" }}
        >
          {agent.name[0]}
        </div>
        <div className="min-w-0">
          <p className="text-white text-[13px] font-semibold truncate">{agent.name}</p>
          <p className="text-[11px]" style={{ color: "#484f58" }}>
            {CATEGORY_LABELS[agent.category] ?? agent.category}
          </p>
        </div>
      </div>
      <p className="text-[11px] mb-3 leading-relaxed line-clamp-2" style={{ color: "#6e7681" }}>
        {agent.description}
      </p>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-mono-custom" style={{ color: "#484f58" }}>
          {agent.pricingModel === "FREE" ? "Free" : `${agent.priceEth} ETH`}
        </span>
        {agent.phase2Ready && (
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{
              background: "rgba(37,99,235,0.15)",
              color: "#60a5fa",
              border: "1px solid rgba(37,99,235,0.25)",
            }}
          >
            Phase 2
          </span>
        )}
      </div>
    </div>
  );
}

const nodeTypes = { agentNode: AgentNode };

// ── Builder page ───────────────────────────────────────────────────────

export default function BuilderPage() {
  const router = useRouter();
  const { isConnected } = useAccount();
  const { isSignedIn } = useAuth();

  // Agent library
  const [allAgents, setAllAgents] = useState<Agent[]>([]);
  const [search, setSearch] = useState("");
  const [p2Only, setP2Only] = useState(false);

  // Canvas state
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [canvasAgents, setCanvasAgents] = useState<Agent[]>([]);

  // Config panel
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [staticInputs, setStaticInputs] = useState<Record<string, Record<string, string>>>({});
  const [trigger, setTrigger] = useState<"IMMEDIATE" | "SCHEDULED" | "CONDITION">("IMMEDIATE");
  const [deadlineSeconds, setDeadlineSeconds] = useState(300);

  // Preview
  const [preview, setPreview] = useState<{ subtotal: string; protocolFee: string; total: string } | null>(null);

  // Flow creation
  const [flowInternalId, setFlowInternalId] = useState("");
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState("");

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    apiFetch<{ agents: Agent[] }>("/api/agents?limit=50")
      .then((d) => setAllAgents(d.agents))
      .catch(() => {});
  }, []);

  // Refresh preview when canvas changes
  useEffect(() => {
    if (!canvasAgents.length) { setPreview(null); return; }
    apiFetch<{ subtotal: string; protocolFee: string; total: string }>("/api/flows/preview", {
      method: "POST",
      body: JSON.stringify({ agents: canvasAgents.map((a) => ({ agentId: a.agentId })) }),
    }).then(setPreview).catch(() => {});
  }, [canvasAgents]);

  // After escrow tx confirms, call /confirm
  useEffect(() => {
    if (!isSuccess || !txHash || !flowInternalId) return;
    authFetch(`${API}/api/flows/confirm`, {
      method: "POST",
      body: JSON.stringify({ internalId: flowInternalId, escrowTxHash: txHash }),
    })
      .then((r) => r.json())
      .then((data) => {
        router.push(`/flows/${encodeURIComponent(data.jobId)}`);
      })
      .catch((e) => setError((e as Error).message));
  }, [isSuccess, txHash, flowInternalId]);

  const onConnect = useCallback(
    (conn: Connection) =>
      setEdges((eds) =>
        addEdge(
          { ...conn, animated: true, style: { stroke: "#2563EB", strokeWidth: 2 } },
          eds
        )
      ),
    [setEdges]
  );

  function addToCanvas(agent: Agent) {
    if (canvasAgents.find((a) => a.agentId === agent.agentId)) return;
    const idx = canvasAgents.length;
    const newNode: Node = {
      id: `agent-${agent.agentId}`,
      type: "agentNode",
      position: { x: 100 + idx * 260, y: 150 },
      data: { agent, orderIndex: idx },
    };
    setNodes((ns) => [...ns, newNode]);
    setCanvasAgents((prev) => [...prev, agent]);
  }

  function removeFromCanvas(agentId: number) {
    setNodes((ns) => ns.filter((n) => n.id !== `agent-${agentId}`));
    setEdges((es) => es.filter((e) => e.source !== `agent-${agentId}` && e.target !== `agent-${agentId}`));
    setCanvasAgents((prev) => prev.filter((a) => a.agentId !== agentId));
    if (selectedAgent?.agentId === agentId) setSelectedAgent(null);
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

  const filteredAgents = allAgents.filter((a) => {
    if (p2Only && !a.phase2Ready) return false;
    if (search && !a.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const inputSchema = selectedAgent?.aboutSchema
    ? (selectedAgent.aboutSchema as { input_schema?: Record<string, { type: string; required?: boolean; description?: string }> }).input_schema
    : null;

  return (
    <AuthGate description="Sign in to build and activate multi-agent flows on Arbitrum.">
    <div
      className="flex h-[calc(100vh-64px)]"
      style={{ background: "#0D1117" }}
    >
      {/* LEFT — Agent Library */}
      <div
        className="w-72 flex-shrink-0 flex flex-col overflow-hidden"
        style={{ borderRight: "1px solid #21262d" }}
      >
        <div className="p-4" style={{ borderBottom: "1px solid #21262d" }}>
          <h2 className="font-display font-bold text-white text-[14px] mb-3">
            Agent Library
          </h2>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search agents…"
            className="w-full rounded-lg px-3 py-2 text-[13px] text-white placeholder-[#484f58] outline-none mb-2"
            style={{
              background: "#161b22",
              border: "1px solid #21262d",
            }}
            onFocus={(e) => (e.target.style.borderColor = "#2563EB")}
            onBlur={(e) => (e.target.style.borderColor = "#21262d")}
          />
          <label className="flex items-center gap-2 text-[12px] cursor-pointer" style={{ color: "#484f58" }}>
            <input
              type="checkbox"
              checked={p2Only}
              onChange={(e) => setP2Only(e.target.checked)}
              className="accent-blue-600"
            />
            Phase 2 Ready only
          </label>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filteredAgents.map((agent) => {
            const onCanvas = canvasAgents.some((a) => a.agentId === agent.agentId);
            return (
              <div
                key={agent.agentId}
                onClick={() => !onCanvas && addToCanvas(agent)}
                className="p-3 rounded-xl transition-all cursor-pointer"
                style={{
                  background: onCanvas ? "rgba(37,99,235,0.06)" : "rgba(255,255,255,0.02)",
                  border: `1px solid ${onCanvas ? "rgba(37,99,235,0.3)" : "#21262d"}`,
                  opacity: onCanvas ? 0.5 : 1,
                  cursor: onCanvas ? "default" : "pointer",
                }}
                onMouseEnter={(e) => {
                  if (!onCanvas)
                    (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(37,99,235,0.4)";
                }}
                onMouseLeave={(e) => {
                  if (!onCanvas)
                    (e.currentTarget as HTMLDivElement).style.borderColor = "#21262d";
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="text-white text-[12px] font-medium truncate">{agent.name}</p>
                  {agent.phase2Ready && (
                    <span
                      className="text-[10px] font-semibold ml-1 px-1.5 py-0.5 rounded-full flex-shrink-0"
                      style={{ background: "rgba(37,99,235,0.15)", color: "#60a5fa" }}
                    >
                      P2
                    </span>
                  )}
                </div>
                <p className="text-[11px]" style={{ color: "#484f58" }}>
                  {agent.pricingModel === "FREE" ? "Free" : `${agent.priceEth} ETH`}
                </p>
              </div>
            );
          })}
          {filteredAgents.length === 0 && (
            <p className="text-[12px] text-center py-8" style={{ color: "#484f58" }}>
              No agents found
            </p>
          )}
        </div>
      </div>

      {/* CENTER — Canvas */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 relative">
          {canvasAgents.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
              <div className="text-center">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  style={{
                    background: "rgba(37,99,235,0.1)",
                    border: "1px solid rgba(37,99,235,0.2)",
                  }}
                >
                  <svg
                    className="w-7 h-7"
                    style={{ color: "#2563EB" }}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <p className="text-white font-semibold text-[15px] mb-1">
                  Add agents to your flow
                </p>
                <p className="text-[13px]" style={{ color: "#484f58" }}>
                  Click agents from the library on the left
                </p>
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
              const agent = canvasAgents.find((a) => `agent-${a.agentId}` === node.id);
              if (agent) setSelectedAgent(agent);
            }}
            nodeTypes={nodeTypes}
            fitView
            style={{ background: "#0D1117" }}
          >
            <Background color="#21262d" gap={28} size={1} />
            <Controls />
            <MiniMap
              nodeColor="#2563eb"
              style={{ background: "#161b22", border: "1px solid #21262d" }}
            />
          </ReactFlow>
        </div>

        {/* Bottom bar */}
        {canvasAgents.length > 0 && (
          <div
            className="px-6 py-4 flex items-center justify-between"
            style={{ borderTop: "1px solid #21262d", background: "#161b22" }}
          >
            <div className="flex items-center gap-6">
              {preview && (
                <>
                  <span className="text-[12px]" style={{ color: "#484f58" }}>
                    Subtotal:{" "}
                    <span className="text-white font-mono-custom">{preview.subtotal} ETH</span>
                  </span>
                  <span className="text-[12px]" style={{ color: "#484f58" }}>
                    Fee (1%):{" "}
                    <span className="text-white font-mono-custom">{preview.protocolFee} ETH</span>
                  </span>
                  <span className="text-[13px] font-semibold" style={{ color: "#60a5fa" }}>
                    Total:{" "}
                    <span className="font-mono-custom">{preview.total} ETH</span>
                  </span>
                </>
              )}
            </div>
            <div className="flex items-center gap-3">
              {error && (
                <p className="text-[12px]" style={{ color: "#f85149" }}>
                  {error}
                </p>
              )}
              {!isConnected && (
                <p className="text-[12px]" style={{ color: "#484f58" }}>
                  Connect wallet to activate
                </p>
              )}
              {isConnected && !isSignedIn && (
                <p className="text-[12px]" style={{ color: "#484f58" }}>
                  Sign in to activate
                </p>
              )}
              <button
                onClick={activateFlow}
                disabled={
                  !isConnected ||
                  !isSignedIn ||
                  isPending ||
                  activating ||
                  !canvasAgents.every((a) => a.phase2Ready)
                }
                className="text-white text-[13px] font-semibold px-5 py-2 rounded-lg transition-colors disabled:opacity-40"
                style={{ background: "#2563EB" }}
                onMouseEnter={(e) =>
                  ((e.target as HTMLButtonElement).style.background = "#1d4ed8")
                }
                onMouseLeave={(e) =>
                  ((e.target as HTMLButtonElement).style.background = "#2563EB")
                }
              >
                {isPending ? "Check Wallet…" : activating ? "Activating…" : "Activate Flow →"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* RIGHT — Config panel */}
      <div
        className="w-72 flex-shrink-0 flex flex-col overflow-y-auto"
        style={{ borderLeft: "1px solid #21262d" }}
      >
        <div className="p-4" style={{ borderBottom: "1px solid #21262d" }}>
          <h2 className="font-display font-bold text-white text-[14px]">Configuration</h2>
        </div>

        {selectedAgent ? (
          <div className="p-4 space-y-4">
            <div>
              <p className="text-white font-semibold text-[13px]">{selectedAgent.name}</p>
              <p className="text-[12px] mt-1 leading-relaxed" style={{ color: "#6e7681" }}>
                {selectedAgent.description}
              </p>
            </div>
            {inputSchema && (
              <div>
                <p
                  className="text-[11px] font-semibold uppercase tracking-widest mb-3"
                  style={{ color: "#484f58" }}
                >
                  Inputs
                </p>
                {Object.entries(inputSchema).map(([field, def]) => (
                  <div key={field} className="mb-3">
                    <label className="text-[12px] text-white block mb-1.5">
                      {field}{" "}
                      {def.required && <span style={{ color: "#f85149" }}>*</span>}
                    </label>
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
                      placeholder={def.description ?? def.type}
                      className="w-full rounded-lg px-3 py-1.5 text-[12px] text-white outline-none"
                      style={{
                        background: "#161b22",
                        border: "1px solid #21262d",
                      }}
                      onFocus={(e) => (e.target.style.borderColor = "#2563EB")}
                      onBlur={(e) => (e.target.style.borderColor = "#21262d")}
                    />
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => removeFromCanvas(selectedAgent.agentId)}
              className="w-full text-[12px] py-2 rounded-lg transition-colors"
              style={{
                color: "#f85149",
                border: "1px solid rgba(248,81,73,0.2)",
                background: "transparent",
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(248,81,73,0.4)")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(248,81,73,0.2)")
              }
            >
              Remove from canvas
            </button>
          </div>
        ) : (
          <div className="p-4 space-y-5">
            <p className="text-[12px]" style={{ color: "#484f58" }}>
              Click an agent on the canvas to configure its inputs.
            </p>
            <div>
              <p
                className="text-[11px] font-semibold uppercase tracking-widest mb-3"
                style={{ color: "#484f58" }}
              >
                Trigger
              </p>
              {(["IMMEDIATE", "SCHEDULED", "CONDITION"] as const).map((t) => (
                <label
                  key={t}
                  className="flex items-center gap-2 text-[12px] text-white mb-2.5 cursor-pointer"
                >
                  <input
                    type="radio"
                    value={t}
                    checked={trigger === t}
                    onChange={() => setTrigger(t)}
                    className="accent-blue-600"
                  />
                  {t.charAt(0) + t.slice(1).toLowerCase()}
                </label>
              ))}
            </div>
            <div>
              <p
                className="text-[11px] font-semibold uppercase tracking-widest mb-3"
                style={{ color: "#484f58" }}
              >
                Deadline:{" "}
                <span className="font-mono-custom normal-case" style={{ color: "#60a5fa" }}>
                  {deadlineSeconds}s
                </span>
              </p>
              <input
                type="range"
                min={30}
                max={86400}
                step={30}
                value={deadlineSeconds}
                onChange={(e) => setDeadlineSeconds(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
              <div
                className="flex justify-between text-[11px] mt-1"
                style={{ color: "#484f58" }}
              >
                <span>30s</span>
                <span>24h</span>
              </div>
            </div>
          </div>
        )}

        {/* Canvas agent list */}
        {canvasAgents.length > 0 && (
          <div className="p-4" style={{ borderTop: "1px solid #21262d" }}>
            <p
              className="text-[11px] font-semibold uppercase tracking-widest mb-3"
              style={{ color: "#484f58" }}
            >
              Flow ({canvasAgents.length} agents)
            </p>
            {canvasAgents.map((a, i) => (
              <div key={a.agentId} className="flex items-center gap-2 mb-2">
                <span
                  className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                  style={{ background: "rgba(37,99,235,0.15)", color: "#60a5fa" }}
                >
                  {i + 1}
                </span>
                <span className="text-[12px] text-white flex-1 truncate">{a.name}</span>
                {!a.phase2Ready && (
                  <span
                    className="text-[10px]"
                    style={{ color: "#d29922" }}
                    title="Not Phase 2 Ready"
                  >
                    !
                  </span>
                )}
              </div>
            ))}
            {!canvasAgents.every((a) => a.phase2Ready) && (
              <p className="text-[11px] mt-3" style={{ color: "#d29922" }}>
                All agents must be Phase 2 Ready to activate
              </p>
            )}
          </div>
        )}
      </div>
    </div>
    </AuthGate>
  );
}
