"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import type { Agent } from "@/lib/types";
import { apiFetch, badgeEmoji, agentStatus, timeAgo, CATEGORY_LABELS } from "@/lib/utils";
import { authFetch } from "@/lib/auth";
import { useAuth } from "@/context/AuthContext";
import { SignInButton } from "@/components/SignInButton";
import { REGISTRY_ABI } from "@/lib/registry-abi";

const REGISTRY = process.env.NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS as `0x${string}`;
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const ARBISCAN = "https://sepolia.arbiscan.io";

interface EarningsData {
  totalEarnedEth: string;
  totalExecutions: number;
  activeFlows: number;
  perAgent: {
    agentId: number;
    name: string;
    executions: number;
    totalEarnedEth: string;
    lastRunAt: string | null;
  }[];
  recentPayments: {
    executedAt: string;
    agentId: number;
    agentName: string;
    flowJobId: string;
    amountEth: string;
    txHash: string | null;
  }[];
}

export default function DashboardPage() {
  const { address, isConnected } = useAccount();
  const { isSignedIn } = useAuth();
  const [tab, setTab] = useState<"agents" | "earnings">("agents");
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [earnings, setEarnings] = useState<EarningsData | null>(null);
  const [earningsLoading, setEarningsLoading] = useState(false);
  const [deactivating, setDeactivating] = useState<number | null>(null);
  const [confirmDeactivate, setConfirmDeactivate] = useState<number | null>(null);
  const [error, setError] = useState("");

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (!address) return;
    setLoading(true);
    apiFetch<{ agents: Agent[] }>(`/api/agents?limit=50`)
      .then((d) => setAgents(d.agents.filter((a) => a.ownerAddress?.toLowerCase() === address.toLowerCase())))
      .catch(() => setAgents([]))
      .finally(() => setLoading(false));
  }, [address]);

  const fetchEarnings = useCallback(() => {
    if (!address || !isSignedIn) return;
    setEarningsLoading(true);
    authFetch(`${API}/api/earnings/${address}`)
      .then((r) => r.json())
      .then((data) => setEarnings(data))
      .catch(() => {})
      .finally(() => setEarningsLoading(false));
  }, [address, isSignedIn]);

  useEffect(() => {
    if (tab === "earnings") {
      fetchEarnings();
      const interval = setInterval(fetchEarnings, 30_000);
      return () => clearInterval(interval);
    }
  }, [tab, fetchEarnings]);

  useEffect(() => {
    if (isSuccess && deactivating !== null) {
      authFetch(`${API}/api/agents/${deactivating}`, { method: "DELETE" })
        .then(() => {
          setAgents((prev) =>
            prev.map((a) => (a.agentId === deactivating ? { ...a, active: false } : a))
          );
          setDeactivating(null);
          setConfirmDeactivate(null);
        })
        .catch((e) => setError((e as Error).message));
    }
  }, [isSuccess, deactivating]);

  function startDeactivate(agentId: number) {
    setError("");
    setDeactivating(agentId);
    writeContract({
      address: REGISTRY,
      abi: REGISTRY_ABI,
      functionName: "deactivateAgent",
      args: [BigInt(agentId)],
    });
    setConfirmDeactivate(null);
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-7 h-7 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
          </div>
          <h1 className="font-bold text-3xl text-ink mb-3">Builder Dashboard</h1>
          <p className="text-slate-500 mb-8">Connect your wallet to manage your agents and view earnings.</p>
          <ConnectButton />
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-7 h-7 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <h1 className="font-bold text-3xl text-ink mb-3">Sign In Required</h1>
          <p className="text-slate-500 mb-8">Sign a message to verify you own this wallet.</p>
          <SignInButton />
        </div>
      </div>
    );
  }

  const activeAgents = agents.filter((a) => a.active);
  const totalStaked = (activeAgents.length * 0.01).toFixed(2);

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6 shadow-card">
          <div className="flex flex-col md:flex-row justify-between items-start gap-4">
            <div>
              <p className="text-slate-400 text-xs font-medium uppercase tracking-wide mb-1">Builder</p>
              <p className="font-mono-custom text-sm text-accent break-all">{address}</p>
            </div>
            <div className="flex gap-8 text-center shrink-0">
              <div>
                <p className="font-bold text-2xl text-ink">{activeAgents.length}</p>
                <p className="text-slate-500 text-xs">Active Agents</p>
              </div>
              <div>
                <p className="font-bold text-2xl text-ink">{totalStaked} ETH</p>
                <p className="text-slate-500 text-xs">Total Staked</p>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-6 bg-white border border-slate-200 rounded-xl p-1 w-fit shadow-card">
          <button
            onClick={() => setTab("agents")}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${
              tab === "agents"
                ? "bg-accent text-white shadow-btn"
                : "text-slate-500 hover:text-ink"
            }`}
          >
            My Agents
          </button>
          <button
            onClick={() => setTab("earnings")}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${
              tab === "earnings"
                ? "bg-accent text-white shadow-btn"
                : "text-slate-500 hover:text-ink"
            }`}
          >
            Earnings
          </button>
        </div>

        {/* ── My Agents Tab ───────────────────────────────────────────── */}
        {tab === "agents" && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-xl text-ink">My Agents</h2>
              <Link
                href="/register"
                className="bg-accent hover:bg-accent-hover text-white rounded-lg px-4 py-2 text-sm font-semibold transition-colors shadow-btn"
              >
                + Register Agent
              </Link>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-white border border-slate-200 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : agents.length === 0 ? (
              <div className="text-center py-20 bg-white border border-slate-200 rounded-xl shadow-card">
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <p className="font-semibold text-ink mb-2">No agents yet</p>
                <p className="text-slate-500 text-sm mb-6">Register your first agent to get started.</p>
                <Link href="/register" className="text-accent hover:underline text-sm font-medium">
                  Register now →
                </Link>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-card">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-slate-500 border-b border-slate-100 text-left bg-slate-50">
                      <th className="px-5 py-3.5 font-medium text-xs">Name</th>
                      <th className="px-5 py-3.5 font-medium text-xs hidden md:table-cell">Category</th>
                      <th className="px-5 py-3.5 font-medium text-xs">Badge</th>
                      <th className="px-5 py-3.5 font-medium text-xs">Status</th>
                      <th className="px-5 py-3.5 font-medium text-xs hidden lg:table-cell">Last Verified</th>
                      <th className="px-5 py-3.5 font-medium text-xs text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agents.map((agent) => {
                      const status = agentStatus(agent);
                      const dotColor = { live: "bg-emerald-400", degraded: "bg-yellow-400", down: "bg-red-400" }[status];
                      return (
                        <tr key={agent.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                          <td className="px-5 py-4">
                            <p className="text-ink font-semibold">{agent.name}</p>
                            <p className="text-slate-400 text-xs font-mono-custom">#{agent.agentId}</p>
                          </td>
                          <td className="px-5 py-4 hidden md:table-cell">
                            <span className="text-xs text-accent font-medium">
                              {CATEGORY_LABELS[agent.category] ?? agent.category}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            {badgeEmoji(agent.badgeTier) || <span className="text-slate-300 text-xs">—</span>}
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                              <span className="text-slate-500 text-xs capitalize">{status}</span>
                            </div>
                          </td>
                          <td className="px-5 py-4 hidden lg:table-cell text-slate-400 text-xs">
                            {agent.verifiedAt ? timeAgo(agent.verifiedAt) : "Never"}
                          </td>
                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Link
                                href={`/agents/${agent.agentId}`}
                                className="text-xs text-slate-500 hover:text-accent transition-colors px-2 py-1 rounded hover:bg-blue-50"
                              >
                                View
                              </Link>
                              {agent.active && (
                                <button
                                  onClick={() => setConfirmDeactivate(agent.agentId)}
                                  className="text-xs text-red-400 hover:text-red-600 transition-colors px-2 py-1 rounded hover:bg-red-50"
                                >
                                  Deactivate
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* ── Earnings Tab ────────────────────────────────────────────── */}
        {tab === "earnings" && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-xl text-ink">Earnings</h2>
              {earningsLoading && (
                <span className="text-xs text-slate-400 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Refreshing…
                </span>
              )}
            </div>

            {!earnings && earningsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-24 bg-white border border-slate-200 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : earnings ? (
              <>
                {/* Summary cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-card">
                    <p className="text-slate-400 text-xs font-medium uppercase tracking-wide mb-2">Total Earned</p>
                    <p className="text-2xl font-bold text-ink">
                      {earnings.totalEarnedEth}{" "}
                      <span className="text-base font-normal text-slate-400">ETH</span>
                    </p>
                    <p className="text-slate-400 text-xs mt-1">all time</p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-card">
                    <p className="text-slate-400 text-xs font-medium uppercase tracking-wide mb-2">Executions</p>
                    <p className="text-2xl font-bold text-ink">
                      {earnings.totalExecutions}{" "}
                      <span className="text-base font-normal text-slate-400">jobs</span>
                    </p>
                    <p className="text-slate-400 text-xs mt-1">all time</p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-card">
                    <p className="text-slate-400 text-xs font-medium uppercase tracking-wide mb-2">Active Flows</p>
                    <p className="text-2xl font-bold text-ink">
                      {earnings.activeFlows}{" "}
                      <span className="text-base font-normal text-slate-400">flows</span>
                    </p>
                    <p className="text-slate-400 text-xs mt-1">using my agents now</p>
                  </div>
                </div>

                {/* Per-agent breakdown */}
                {earnings.perAgent.length > 0 && (
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-card mb-6">
                    <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                      <h3 className="font-semibold text-ink text-sm">Per Agent Breakdown</h3>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {earnings.perAgent.map((a) => (
                        <div key={a.agentId} className="px-5 py-4 hover:bg-slate-50 transition-colors">
                          <div className="flex items-center justify-between gap-4">
                            <div className="min-w-0">
                              <p className="font-semibold text-ink text-sm truncate">{a.name}</p>
                              <p className="text-slate-400 text-xs mt-0.5">
                                {a.executions} execution{a.executions !== 1 ? "s" : ""}
                                {a.lastRunAt && <> · last run {timeAgo(a.lastRunAt)}</>}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="font-bold text-ink text-sm">{a.totalEarnedEth} ETH</p>
                              <Link
                                href={`/agents/${a.agentId}`}
                                className="text-xs text-accent hover:underline"
                              >
                                View agent →
                              </Link>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent payments table */}
                {earnings.recentPayments.length > 0 && (
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-card">
                    <div className="px-5 py-4 border-b border-slate-100">
                      <h3 className="font-semibold text-ink text-sm">Recent Payments</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-slate-400 border-b border-slate-100 text-left bg-slate-50">
                            <th className="px-5 py-3 font-medium text-xs">Date</th>
                            <th className="px-5 py-3 font-medium text-xs">Agent</th>
                            <th className="px-5 py-3 font-medium text-xs hidden md:table-cell">Flow</th>
                            <th className="px-5 py-3 font-medium text-xs text-right">Amount</th>
                            <th className="px-5 py-3 font-medium text-xs text-right">Tx</th>
                          </tr>
                        </thead>
                        <tbody>
                          {earnings.recentPayments.map((p, i) => (
                            <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                              <td className="px-5 py-3.5 text-slate-500 text-xs">{timeAgo(p.executedAt)}</td>
                              <td className="px-5 py-3.5 text-ink text-xs font-medium">{p.agentName}</td>
                              <td className="px-5 py-3.5 text-slate-400 text-xs font-mono-custom hidden md:table-cell">
                                {p.flowJobId.slice(0, 18)}…
                              </td>
                              <td className="px-5 py-3.5 text-right">
                                <span className="text-emerald-600 text-xs font-semibold">{p.amountEth} ETH</span>
                              </td>
                              <td className="px-5 py-3.5 text-right">
                                {p.txHash ? (
                                  <a
                                    href={`${ARBISCAN}/tx/${p.txHash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-accent hover:underline text-xs"
                                  >
                                    View →
                                  </a>
                                ) : (
                                  <span className="text-slate-300 text-xs">—</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {earnings.perAgent.length === 0 && (
                  <div className="text-center py-16 bg-white border border-slate-200 rounded-xl shadow-card">
                    <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-4">
                      <svg className="w-6 h-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                    <p className="font-semibold text-ink mb-2">No earnings yet</p>
                    <p className="text-slate-500 text-sm">
                      Your earnings will appear here once users execute your agents.
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-16 bg-white border border-slate-200 rounded-xl shadow-card">
                <p className="text-slate-400 text-sm">Unable to load earnings data.</p>
                <button onClick={fetchEarnings} className="mt-3 text-accent hover:underline text-sm">
                  Try again
                </button>
              </div>
            )}
          </>
        )}

        {/* Deactivate confirmation modal */}
        {confirmDeactivate !== null && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4">
            <div className="bg-white border border-slate-200 rounded-xl p-6 max-w-sm w-full shadow-xl">
              <h3 className="font-bold text-ink text-lg mb-2">Deactivate Agent?</h3>
              <p className="text-slate-500 text-sm mb-6">
                This will return your <strong className="text-ink">0.01 ETH</strong> stake. The agent will be removed from the marketplace.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDeactivate(null)}
                  className="flex-1 bg-slate-100 text-ink rounded-lg py-2.5 text-sm font-semibold hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => startDeactivate(confirmDeactivate)}
                  disabled={isPending}
                  className="flex-1 bg-red-50 border border-red-200 text-red-600 rounded-lg py-2.5 text-sm font-semibold hover:bg-red-100 transition-colors disabled:opacity-50"
                >
                  {isPending ? "Check Wallet…" : "Deactivate"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
