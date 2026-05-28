"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { AgentCard } from "@/components/AgentCard";
import type { Agent } from "@/lib/types";
import { CATEGORY_LABELS, apiFetch } from "@/lib/utils";
import { Suspense } from "react";

const BADGE_OPTIONS = ["BRONZE", "SILVER", "GOLD"] as const;

function AgentsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [agents, setAgents] = useState<Agent[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const category = searchParams.get("category") ?? "";
  const badge = searchParams.get("badge") ?? "";
  const search = searchParams.get("search") ?? "";

  const fetchAgents = useCallback(async (pg: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(pg), limit: "18" });
      if (category) params.set("category", category);
      if (badge) params.set("badge", badge);
      if (search) params.set("search", search);

      const data = await apiFetch<{ agents: Agent[]; total: number }>(`/api/agents?${params}`);
      setAgents(data.agents);
      setTotal(data.total);
    } catch {
      setAgents([]);
    } finally {
      setLoading(false);
    }
  }, [category, badge, search]);

  useEffect(() => {
    setPage(1);
    fetchAgents(1);
  }, [fetchAgents]);

  function setParam(key: string, value: string) {
    const p = new URLSearchParams(searchParams.toString());
    if (value) p.set(key, value); else p.delete(key);
    router.push(`/agents?${p.toString()}`);
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display font-bold text-4xl text-white mb-2">
            All Agents
            {total > 0 && <span className="text-muted text-2xl ml-3 font-normal">({total})</span>}
          </h1>
          <p className="text-muted">Discover and activate autonomous AI agents on Arbitrum.</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-8 p-4 bg-space-card border border-white/5 rounded-card">
          <input
            type="text"
            placeholder="Search agents..."
            defaultValue={search}
            onChange={(e) => setParam("search", e.target.value)}
            className="bg-white/5 border border-white/10 rounded-btn px-4 py-2 text-sm text-white placeholder-muted focus:outline-none focus:border-accent/50 min-w-48"
          />

          <select
            value={category}
            onChange={(e) => setParam("category", e.target.value)}
            className="bg-white/5 border border-white/10 rounded-btn px-4 py-2 text-sm text-white focus:outline-none focus:border-accent/50 cursor-pointer"
          >
            <option value="">All Categories</option>
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>

          <select
            value={badge}
            onChange={(e) => setParam("badge", e.target.value)}
            className="bg-white/5 border border-white/10 rounded-btn px-4 py-2 text-sm text-white focus:outline-none focus:border-accent/50 cursor-pointer"
          >
            <option value="">Any Badge</option>
            {BADGE_OPTIONS.map((b) => (
              <option key={b} value={b}>{b.charAt(0) + b.slice(1).toLowerCase()}</option>
            ))}
          </select>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-48 bg-space-card border border-white/5 rounded-card animate-pulse" />
            ))}
          </div>
        ) : agents.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {agents.map((agent) => (
                <AgentCard key={agent.id} agent={agent} />
              ))}
            </div>

            {/* Pagination */}
            {total > 18 && (
              <div className="flex justify-center gap-2 mt-10">
                <button
                  onClick={() => { setPage((p) => p - 1); fetchAgents(page - 1); }}
                  disabled={page === 1}
                  className="px-4 py-2 rounded-btn bg-white/5 border border-white/10 text-sm text-white disabled:opacity-30 hover:bg-white/10 transition-colors"
                >
                  ← Prev
                </button>
                <span className="px-4 py-2 text-muted text-sm">
                  Page {page} of {Math.ceil(total / 18)}
                </span>
                <button
                  onClick={() => { setPage((p) => p + 1); fetchAgents(page + 1); }}
                  disabled={page >= Math.ceil(total / 18)}
                  className="px-4 py-2 rounded-btn bg-white/5 border border-white/10 text-sm text-white disabled:opacity-30 hover:bg-white/10 transition-colors"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20 text-muted">
            <p className="text-4xl mb-4">✦</p>
            <p className="font-display font-semibold text-white mb-2">No agents found</p>
            <p className="text-sm">Try adjusting your filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AgentsPage() {
  return (
    <Suspense>
      <AgentsContent />
    </Suspense>
  );
}
