"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAccount } from "wagmi";
import { apiFetch, timeAgo } from "@/lib/utils";

type FlowStatus = "LOCKED" | "RUNNING" | "COMPLETED" | "REFUNDED" | "FAILED";
type AgentStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";

interface FlowAgent {
  id: string;
  agentId: number;
  orderIndex: number;
  amountUsdc: string;
  status: AgentStatus;
  output: unknown;
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
  paymentTxHash: string | null;
  completedAt: string | null;
  createdAt: string;
  agents: FlowAgent[];
}

const STATUS_COLORS: Record<FlowStatus, string> = {
  LOCKED: "text-amber-400 bg-amber-500/10 border-amber-500/30",
  RUNNING: "text-blue-400 bg-blue-500/10 border-blue-500/30",
  COMPLETED: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
  REFUNDED: "text-blue-600 bg-blue-50 border-blue-200",
  FAILED: "text-red-400 bg-red-500/10 border-red-500/30",
};

const AGENT_ICON: Record<AgentStatus, string> = {
  PENDING: "○",
  RUNNING: "⟳",
  COMPLETED: "✓",
  FAILED: "✗",
};

const AGENT_COLOR: Record<AgentStatus, string> = {
  PENDING: "text-[#8892A4]",
  RUNNING: "text-blue-400",
  COMPLETED: "text-emerald-400",
  FAILED: "text-red-400",
};

export default function FlowPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const { address } = useAccount();
  const [flow, setFlow] = useState<Flow | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedOutput, setExpandedOutput] = useState<string | null>(null);
  const decodedJobId = decodeURIComponent(jobId);

  useEffect(() => {
    fetchFlow();
    // Poll every 3s while running
    const interval = setInterval(() => {
      if (flow?.status === "RUNNING" || flow?.status === "LOCKED") fetchFlow();
    }, 3000);
    return () => clearInterval(interval);
  }, [flow?.status]);

  async function fetchFlow() {
    try {
      const data = await apiFetch<Flow>(`/api/flows/${encodeURIComponent(decodedJobId)}`);
      setFlow(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  // Refunds are handled manually by MilkyWay support for failed flows
  const canRefund =
    flow &&
    (flow.status === "FAILED") &&
    address?.toLowerCase() === flow.callerAddress.toLowerCase();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-[#8892A4]">Loading agentic flow…</div>
      </div>
    );
  }

  if (!flow) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-[#8892A4]">Agentic flow not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="p-6 bg-[#0D0D1A] border border-white/8 rounded-2xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[#8892A4] text-xs mb-1">Agentic Flow ID</p>
              <p className="font-mono text-white text-sm break-all">{decodedJobId.slice(0, 18)}…</p>
            </div>
            <span className={`text-xs font-medium px-3 py-1 rounded-full border ${STATUS_COLORS[flow.status]}`}>
              {flow.status}
            </span>
          </div>
          <div className="flex gap-6 mt-4 text-sm">
            <div>
              <p className="text-[#8892A4] text-xs">Total</p>
              <p className="text-white font-semibold">{flow.totalAmountUsdc} USDC</p>
            </div>
            <div>
              <p className="text-[#8892A4] text-xs">Trigger</p>
              <p className="text-white">{flow.trigger}</p>
            </div>
            <div>
              <p className="text-[#8892A4] text-xs">Deadline</p>
              <p className="text-white">{new Date(flow.deadline).toLocaleTimeString()}</p>
            </div>
            {flow.completedAt && (
              <div>
                <p className="text-[#8892A4] text-xs">Completed</p>
                <p className="text-white">{timeAgo(flow.completedAt)}</p>
              </div>
            )}
          </div>
        </div>

        {/* Agent pipeline */}
        <div className="p-6 bg-[#0D0D1A] border border-white/8 rounded-2xl">
          <h2 className="font-display font-bold text-white mb-5">Agent Pipeline</h2>
          <div className="flex items-center gap-2 flex-wrap">
            {flow.agents.map((fa, i) => (
              <div key={fa.id} className="flex items-center gap-2">
                <div
                  className="p-4 bg-white/3 border border-white/10 rounded-xl cursor-pointer hover:border-white/20 transition-colors"
                  onClick={() => setExpandedOutput(expandedOutput === fa.id ? null : fa.id)}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-lg font-bold ${AGENT_COLOR[fa.status]}`}>{AGENT_ICON[fa.status]}</span>
                    <p className="text-white text-sm font-medium">Agent #{fa.agentId}</p>
                  </div>
                  <p className="text-[#8892A4] text-xs">{fa.amountUsdc} USDC</p>
                  {fa.executedAt && (
                    <p className="text-[#8892A4] text-xs mt-1">{timeAgo(fa.executedAt)}</p>
                  )}
                  {!!fa.output && (
                    <p className="text-blue-600 text-xs mt-1">View output →</p>
                  )}
                </div>
                {i < flow.agents.length - 1 && (
                  <span className="text-[#8892A4] text-lg">→</span>
                )}
              </div>
            ))}
          </div>

          {/* Expanded output */}
          {expandedOutput && (
            <div className="mt-4 p-4 bg-black/30 rounded-xl border border-white/8">
              <p className="text-[#8892A4] text-xs mb-2">Output</p>
              <pre className="text-white text-xs overflow-auto max-h-48">
                {JSON.stringify(flow.agents.find((a) => a.id === expandedOutput)?.output, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Payment section */}
        <div className="p-6 bg-[#0D0D1A] border border-white/8 rounded-2xl">
          <h2 className="font-display font-bold text-white mb-4">Payment</h2>
          <div className="space-y-2">
            {flow.agents.map((fa) => (
              <div key={fa.id} className="flex justify-between text-sm">
                <span className="text-[#8892A4]">Agent #{fa.agentId}</span>
                <span className="text-white">{fa.amountUsdc} USDC</span>
              </div>
            ))}
            <div className="flex justify-between text-sm border-t border-white/8 pt-2 mt-2">
              <span className="text-[#8892A4]">Protocol fee (1%)</span>
              <span className="text-white">{(parseFloat(flow.totalAmountUsdc) * 0.01 / 1.01).toFixed(6)} USDC</span>
            </div>
            <div className="flex justify-between text-sm font-semibold">
              <span className="text-white">Total</span>
              <span className="text-accent">{flow.totalAmountUsdc} USDC</span>
            </div>
          </div>

          {flow.status === "COMPLETED" && flow.paymentTxHash && (
            <div className="mt-4 p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
              <p className="text-emerald-400 text-sm">✓ Payment released on-chain</p>
            </div>
          )}

          {canRefund && (
            <div className="mt-4 p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl">
              <p className="text-amber-400 text-sm font-medium mb-1">Flow failed</p>
              <p className="text-[#8892A4] text-xs">
                USDC refunds are processed manually. Contact{" "}
                <a href="mailto:support@milkyway.fi" className="text-blue-400 underline">
                  support@milkyway.fi
                </a>{" "}
                with job ID <span className="font-mono">{flow.jobId.slice(0, 12)}…</span>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
