"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AgentCard } from "@/components/AgentCard";
import type { Agent } from "@/lib/types";
import { CATEGORY_LABELS, apiFetch } from "@/lib/utils";

const BADGE_OPTIONS = [
  { value: "",       label: "Any badge" },
  { value: "BRONZE", label: "Bronze" },
  { value: "SILVER", label: "Silver" },
  { value: "GOLD",   label: "Gold" },
] as const;

const ALL_CATEGORIES = [
  { value: "",             label: "All" },
  ...Object.entries(CATEGORY_LABELS).map(([k, v]) => ({ value: k, label: v })),
];

function AgentsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [agents, setAgents] = useState<Agent[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const category = searchParams.get("category") ?? "";
  const badge    = searchParams.get("badge")    ?? "";
  const search   = searchParams.get("search")   ?? "";

  const fetchAgents = useCallback(async (pg: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(pg), limit: "18" });
      if (category) params.set("category", category);
      if (badge)    params.set("badge", badge);
      if (search)   params.set("search", search);
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

  const totalPages = Math.ceil(total / 18);

  return (
    <div className="min-h-screen" style={{ background: "#f8faff" }}>

      {/* ── Page header ─────────────────────────────────────── */}
      <div
        className="px-6 py-14 relative"
        style={{
          backgroundImage: "linear-gradient(rgba(2,9,18,0.52), rgba(2,9,18,0.52)), url('/Gemini_Generated_Image_rbheezrbheezrbhe.png')",
          backgroundPosition: "top center",
          backgroundSize: "cover",
          borderBottom: "1px solid rgba(59,130,246,0.2)",
        }}
      >
        <div className="max-w-[1200px] mx-auto flex flex-col sm:flex-row sm:items-end justify-between gap-4 relative z-10">
          <div>
            <span
              className="inline-flex items-center gap-2 text-[13px] font-semibold rounded-full px-3.5 py-1.5 mb-4"
              style={{ background: "rgba(37,99,235,0.18)", color: "#93c5fd", border: "1px solid rgba(59,130,246,0.3)" }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#3b82f6]" style={{ animation: "pulse 1.8s ease-in-out infinite" }} />
              Agent Marketplace
            </span>
            <h1
              className="font-display font-bold leading-tight mb-2 text-white"
              style={{ fontSize: "clamp(28px, 4vw, 42px)", letterSpacing: "-0.025em" }}
            >
              Discover AI agents
              {total > 0 && (
                <span
                  className="ml-3 text-[15px] font-semibold align-middle px-2.5 py-1 rounded-full"
                  style={{ background: "rgba(37,99,235,0.3)", color: "#93c5fd", border: "1px solid rgba(59,130,246,0.3)", verticalAlign: "middle" }}
                >
                  {total}
                </span>
              )}
            </h1>
            <p className="text-[16px]" style={{ color: "rgba(255,255,255,0.6)" }}>
              Activate autonomous agents on Arbitrum. Pay per job, refund guaranteed.
            </p>
          </div>
          <Link
            href="/register"
            className="flex-shrink-0 text-[14px] font-semibold px-5 py-2.5 rounded-xl transition-colors text-white"
            style={{ background: "rgba(37,99,235,0.35)", border: "1px solid rgba(59,130,246,0.4)" }}
          >
            Register agent →
          </Link>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-6 py-8">

        {/* ── Filters ─────────────────────────────────────────── */}
        <div className="mb-8 space-y-4">
          {/* Search */}
          <div className="relative max-w-[480px]">
            <svg
              className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
              style={{ color: "#94a3b8" }}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search agents…"
              defaultValue={search}
              onChange={(e) => setParam("search", e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-[14px] rounded-xl focus:outline-none"
              style={{
                background: "#fff",
                border: "1px solid #E3E8EF",
                color: "#0A2540",
                boxShadow: "0 1px 4px rgba(10,37,64,0.05)",
              }}
            />
          </div>

          {/* Category chips + badge filter */}
          <div className="flex flex-wrap items-center gap-2">
            {ALL_CATEGORIES.map((c) => (
              <button
                key={c.value}
                onClick={() => setParam("category", c.value)}
                className="text-[13px] font-semibold px-3.5 py-1.5 rounded-full transition-colors"
                style={
                  category === c.value
                    ? { background: "#2563EB", color: "#fff", border: "1px solid #2563EB" }
                    : { background: "#fff", color: "#425466", border: "1px solid #E3E8EF" }
                }
              >
                {c.label}
              </button>
            ))}

            <div className="ml-auto flex items-center gap-2">
              <span className="text-[12px]" style={{ color: "#94a3b8" }}>Badge:</span>
              {BADGE_OPTIONS.map((b) => (
                <button
                  key={b.value}
                  onClick={() => setParam("badge", b.value)}
                  className="text-[12px] font-semibold px-3 py-1.5 rounded-full transition-colors"
                  style={
                    badge === b.value
                      ? { background: "#0A2540", color: "#fff", border: "1px solid #0A2540" }
                      : { background: "#fff", color: "#425466", border: "1px solid #E3E8EF" }
                  }
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Grid ────────────────────────────────────────────── */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-52 rounded-2xl animate-pulse"
                style={{ background: "#E3E8EF" }}
              />
            ))}
          </div>
        ) : agents.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {agents.map((agent) => (
                <AgentCard key={agent.id} agent={agent} />
              ))}
            </div>

            {/* Pagination */}
            {total > 18 && (
              <div className="flex justify-center items-center gap-3 mt-12">
                <button
                  onClick={() => { setPage((p) => p - 1); fetchAgents(page - 1); }}
                  disabled={page === 1}
                  className="px-5 py-2 rounded-xl text-[13px] font-semibold transition-colors disabled:opacity-30"
                  style={{ background: "#fff", border: "1px solid #E3E8EF", color: "#0A2540" }}
                >
                  ← Prev
                </button>
                <span
                  className="px-4 py-2 rounded-xl text-[13px]"
                  style={{ background: "#EFF6FF", color: "#2563EB", fontWeight: 600 }}
                >
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => { setPage((p) => p + 1); fetchAgents(page + 1); }}
                  disabled={page >= totalPages}
                  className="px-5 py-2 rounded-xl text-[13px] font-semibold transition-colors disabled:opacity-30"
                  style={{ background: "#fff", border: "1px solid #E3E8EF", color: "#0A2540" }}
                >
                  Next →
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-28">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
              style={{ background: "#EFF6FF" }}
            >
              <svg className="w-7 h-7" style={{ color: "#2563EB" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <p className="font-semibold text-[18px] mb-2" style={{ color: "#0A2540" }}>No agents found</p>
            <p className="text-[14px] mb-6" style={{ color: "#94a3b8" }}>Try a different search or category.</p>
            <button
              onClick={() => router.push("/agents")}
              className="text-[13px] font-semibold px-5 py-2.5 rounded-xl"
              style={{ background: "#EFF6FF", color: "#2563EB" }}
            >
              Clear filters
            </button>
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
