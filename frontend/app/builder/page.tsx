"use client";

import { useCallback, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ReactFlow, {
  Node, Edge, addEdge, Connection,
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
import type { Agent } from "@/lib/types";

const ESCROW = process.env.NEXT_PUBLIC_JOB_ESCROW_ADDRESS as `0x${string}`;
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

// ── Agent node component ───────────────────────────────────────────────

function AgentNode({ data }: { data: { agent: Agent; orderIndex: number } }) {
  const { agent } = data;
  return (
    <div className="bg-[#0D0D1A] border border-white/20 rounded-xl p-4 min-w-[200px] shadow-lg">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">✦</span>
        <div>
          <p className="text-white text-sm font-semibold">{agent.name}</p>
          <p className="text-xs text-indigo-400">{CATEGORY_LABELS[agent.category] ?? agent.category}</p>
        </div>
      </div>
      <p className="text-xs text-[#8892A4] mb-2 line-clamp-2">{agent.description}</p>
      <div className="flex items-center justify-between">
        <span className="text-xs text-white font-mono">
          {agent.pricingModel === "FREE" ? "Free" : `${agent.priceEth} ETH`}
        </span>
        {agent.phase2Ready && (
          <span className="text-xs bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-full px-2 py-0.5">P2</span>
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
  const { isSuccess, data: receipt } = useWaitForTransactionReceipt({ hash: txHash });

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

  const onConnect = useCallback((conn: Connection) => setEdges((eds) => addEdge(conn, eds)), [setEdges]);

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
    <div className="flex h-[calc(100vh-64px)]" style={{ background: "#050510" }}>
      {/* LEFT — Agent Library */}
      <div className="w-72 flex-shrink-0 border-r border-white/8 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-white/8">
          <h2 className="font-display font-bold text-white mb-3">Agent Library</h2>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search agents..."
            className="w-full bg-white/5 border border-white/10 rounded-btn px-3 py-2 text-sm text-white placeholder-[#8892A4] outline-none focus:border-accent/50 mb-2"
          />
          <label className="flex items-center gap-2 text-xs text-[#8892A4] cursor-pointer">
            <input
              type="checkbox"
              checked={p2Only}
              onChange={(e) => setP2Only(e.target.checked)}
              className="accent-indigo-500"
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
                className={`p-3 rounded-xl border transition-all cursor-pointer ${
                  onCanvas
                    ? "border-accent/40 bg-accent/5 opacity-50 cursor-default"
                    : "border-white/8 bg-white/3 hover:border-accent/40 hover:bg-accent/5"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="text-white text-xs font-medium truncate">{agent.name}</p>
                  {agent.phase2Ready && <span className="text-xs text-indigo-400 ml-1">P2</span>}
                </div>
                <p className="text-[#8892A4] text-xs">
                  {agent.pricingModel === "FREE" ? "Free" : `${agent.priceEth} ETH`}
                </p>
              </div>
            );
          })}
          {filteredAgents.length === 0 && (
            <p className="text-[#8892A4] text-xs text-center py-8">No agents found</p>
          )}
        </div>
      </div>

      {/* CENTER — Canvas */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 relative">
          {canvasAgents.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
              <div className="text-center">
                <p className="text-4xl mb-3">✦</p>
                <p className="text-white font-display font-semibold mb-1">Drop agents here</p>
                <p className="text-[#8892A4] text-sm">Click agents from the library to add them</p>
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
            style={{ background: "#050510" }}
          >
            <Background color="#ffffff08" gap={24} />
            <Controls />
            <MiniMap nodeColor="#6366F1" style={{ background: "#0D0D1A" }} />
          </ReactFlow>
        </div>

        {/* Bottom bar */}
        {canvasAgents.length > 0 && (
          <div className="border-t border-white/8 bg-[#0D0D1A] px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-6 text-sm">
              {preview && (
                <>
                  <span className="text-[#8892A4]">Subtotal: <span className="text-white">{preview.subtotal} ETH</span></span>
                  <span className="text-[#8892A4]">Protocol fee (1%): <span className="text-white">{preview.protocolFee} ETH</span></span>
                  <span className="text-[#8892A4]">Total: <span className="text-accent font-semibold">{preview.total} ETH</span></span>
                </>
              )}
            </div>
            <div className="flex items-center gap-3">
              {error && <p className="text-red-400 text-xs">{error}</p>}
              {!isConnected && <p className="text-[#8892A4] text-xs">Connect wallet to activate</p>}
              {isConnected && !isSignedIn && <p className="text-[#8892A4] text-xs">Sign in to activate</p>}
              <button
                onClick={activateFlow}
                disabled={!isConnected || !isSignedIn || isPending || activating || !canvasAgents.every((a) => a.phase2Ready)}
                className="bg-accent hover:bg-accent-hover text-white rounded-btn px-5 py-2 text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {isPending ? "Check Wallet…" : activating ? "Activating…" : "Activate Flow ✦"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* RIGHT — Config panel */}
      <div className="w-72 flex-shrink-0 border-l border-white/8 flex flex-col overflow-y-auto">
        <div className="p-4 border-b border-white/8">
          <h2 className="font-display font-bold text-white">Configuration</h2>
        </div>

        {selectedAgent ? (
          <div className="p-4 space-y-4">
            <div>
              <p className="text-white font-medium text-sm">{selectedAgent.name}</p>
              <p className="text-[#8892A4] text-xs mt-1">{selectedAgent.description}</p>
            </div>
            {inputSchema && (
              <div>
                <p className="text-[#8892A4] text-xs font-medium uppercase tracking-wide mb-2">Inputs</p>
                {Object.entries(inputSchema).map(([field, def]) => (
                  <div key={field} className="mb-3">
                    <label className="text-xs text-white block mb-1">
                      {field} {def.required && <span className="text-red-400">*</span>}
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
                      className="w-full bg-white/5 border border-white/10 rounded-btn px-3 py-1.5 text-xs text-white placeholder-[#8892A4] outline-none focus:border-accent/50"
                    />
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => removeFromCanvas(selectedAgent.agentId)}
              className="w-full text-xs text-red-400/70 hover:text-red-400 border border-red-500/20 hover:border-red-500/40 rounded-btn py-2 transition-colors"
            >
              Remove from canvas
            </button>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            <p className="text-[#8892A4] text-xs">Click an agent on the canvas to configure its inputs.</p>
            <div>
              <p className="text-[#8892A4] text-xs font-medium uppercase tracking-wide mb-2">Trigger</p>
              {(["IMMEDIATE", "SCHEDULED", "CONDITION"] as const).map((t) => (
                <label key={t} className="flex items-center gap-2 text-xs text-white mb-2 cursor-pointer">
                  <input type="radio" value={t} checked={trigger === t} onChange={() => setTrigger(t)} className="accent-indigo-500" />
                  {t.charAt(0) + t.slice(1).toLowerCase()}
                </label>
              ))}
            </div>
            <div>
              <p className="text-[#8892A4] text-xs font-medium uppercase tracking-wide mb-2">
                Deadline: {deadlineSeconds}s
              </p>
              <input
                type="range"
                min={30}
                max={86400}
                step={30}
                value={deadlineSeconds}
                onChange={(e) => setDeadlineSeconds(Number(e.target.value))}
                className="w-full accent-indigo-500"
              />
              <div className="flex justify-between text-xs text-[#8892A4] mt-1">
                <span>30s</span><span>24h</span>
              </div>
            </div>
          </div>
        )}

        {/* Canvas agent list */}
        {canvasAgents.length > 0 && (
          <div className="p-4 border-t border-white/8">
            <p className="text-[#8892A4] text-xs font-medium uppercase tracking-wide mb-2">Flow ({canvasAgents.length} agents)</p>
            {canvasAgents.map((a, i) => (
              <div key={a.agentId} className="flex items-center gap-2 mb-1">
                <span className="text-xs text-[#8892A4]">{i + 1}.</span>
                <span className="text-xs text-white flex-1 truncate">{a.name}</span>
                {!a.phase2Ready && <span className="text-xs text-amber-400" title="Not Phase 2 Ready">⚠</span>}
              </div>
            ))}
            {!canvasAgents.every((a) => a.phase2Ready) && (
              <p className="text-xs text-amber-400 mt-2">⚠ All agents must be Phase 2 Ready to activate</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
