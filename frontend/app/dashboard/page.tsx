"use client";

import { useEffect, useState } from "react";
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

export default function DashboardPage() {
  const { address, isConnected } = useAccount();
  const { isSignedIn } = useAuth();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [deactivating, setDeactivating] = useState<number | null>(null);
  const [confirmDeactivate, setConfirmDeactivate] = useState<number | null>(null);
  const [error, setError] = useState("");

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (!address) return;
    setLoading(true);
    apiFetch<{ agents: Agent[] }>(`/api/agents?ownerAddress=${address}&limit=50`)
      .then((d) => setAgents(d.agents))
      .catch(() => setAgents([]))
      .finally(() => setLoading(false));
  }, [address]);

  useEffect(() => {
    if (isSuccess && deactivating !== null) {
      const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
      authFetch(`${API}/api/agents/${deactivating}`, { method: "DELETE" })
        .then(() => {
          setAgents((prev) => prev.map((a) => a.agentId === deactivating ? { ...a, active: false } : a));
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
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <p className="text-4xl mb-6">✦</p>
          <h1 className="font-display font-bold text-3xl text-white mb-3">Builder Dashboard</h1>
          <p className="text-muted mb-8">Connect your wallet to manage your agents.</p>
          <ConnectButton />
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <p className="text-4xl mb-6">✦</p>
          <h1 className="font-display font-bold text-3xl text-white mb-3">Sign In Required</h1>
          <p className="text-muted mb-8">Sign a message to verify you own this wallet and access your dashboard.</p>
          <SignInButton />
        </div>
      </div>
    );
  }

  const activeAgents = agents.filter((a) => a.active);
  const totalStaked = (activeAgents.length * 0.01).toFixed(2);

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-10 p-6 bg-space-card border border-white/8 rounded-card">
          <div>
            <p className="text-muted text-xs mb-1">Builder</p>
            <p className="font-mono-custom text-accent text-sm">{address}</p>
          </div>
          <div className="flex gap-8 text-center">
            <div>
              <p className="font-display font-bold text-2xl text-white">{activeAgents.length}</p>
              <p className="text-muted text-xs">Active Agents</p>
            </div>
            <div>
              <p className="font-display font-bold text-2xl text-white">{totalStaked} ETH</p>
              <p className="text-muted text-xs">Total Staked</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-btn text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display font-bold text-xl text-white">My Agents</h2>
          <Link
            href="/register"
            className="bg-accent hover:bg-accent-hover text-white rounded-btn px-4 py-2 text-sm font-semibold transition-colors"
          >
            + Register Agent
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-space-card border border-white/5 rounded-card animate-pulse" />
            ))}
          </div>
        ) : agents.length === 0 ? (
          <div className="text-center py-20 text-muted">
            <p className="text-4xl mb-4">✦</p>
            <p className="font-display font-semibold text-white mb-2">No agents yet</p>
            <p className="text-sm mb-6">Register your first agent to get started.</p>
            <Link href="/register" className="text-accent hover:underline text-sm">
              Register now →
            </Link>
          </div>
        ) : (
          <div className="bg-space-card border border-white/8 rounded-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted border-b border-white/5 text-left">
                  <th className="px-5 py-4 font-medium">Name</th>
                  <th className="px-5 py-4 font-medium hidden md:table-cell">Category</th>
                  <th className="px-5 py-4 font-medium">Badge</th>
                  <th className="px-5 py-4 font-medium">Status</th>
                  <th className="px-5 py-4 font-medium hidden lg:table-cell">Last Verified</th>
                  <th className="px-5 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {agents.map((agent) => {
                  const status = agentStatus(agent);
                  const statusDot = { live: "status-live", degraded: "status-deg", down: "status-down" }[status];
                  return (
                    <tr key={agent.id} className="border-b border-white/5 last:border-0 hover:bg-white/2 transition-colors">
                      <td className="px-5 py-4">
                        <p className="text-white font-medium">{agent.name}</p>
                        <p className="text-muted text-xs font-mono-custom">#{agent.agentId}</p>
                      </td>
                      <td className="px-5 py-4 hidden md:table-cell">
                        <span className="text-xs text-accent">{CATEGORY_LABELS[agent.category] ?? agent.category}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span>{badgeEmoji(agent.badgeTier) || <span className="text-muted text-xs">—</span>}</span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${statusDot}`} />
                          <span className="text-muted text-xs capitalize">{status}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 hidden lg:table-cell text-muted text-xs">
                        {agent.verifiedAt ? timeAgo(agent.verifiedAt) : "Never"}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/agents/${agent.agentId}`}
                            className="text-xs text-muted hover:text-white transition-colors px-2 py-1 rounded hover:bg-white/5"
                          >
                            View
                          </Link>
                          {agent.active && (
                            <button
                              onClick={() => setConfirmDeactivate(agent.agentId)}
                              className="text-xs text-red-400/70 hover:text-red-400 transition-colors px-2 py-1 rounded hover:bg-red-500/10"
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

        {/* Deactivate confirmation modal */}
        {confirmDeactivate !== null && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4">
            <div className="bg-space-card border border-white/10 rounded-card p-6 max-w-sm w-full">
              <h3 className="font-display font-bold text-white text-lg mb-2">Deactivate Agent?</h3>
              <p className="text-muted text-sm mb-6">
                This will return your <strong className="text-white">0.01 ETH</strong> stake. The agent will be removed from the marketplace.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDeactivate(null)}
                  className="flex-1 bg-white/5 border border-white/10 text-white rounded-btn py-2.5 text-sm font-medium hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => startDeactivate(confirmDeactivate)}
                  disabled={isPending}
                  className="flex-1 bg-red-500/20 border border-red-500/30 text-red-400 rounded-btn py-2.5 text-sm font-medium hover:bg-red-500/30 transition-colors disabled:opacity-50"
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
