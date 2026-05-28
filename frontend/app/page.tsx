import Link from "next/link";
import { AgentCard } from "@/components/AgentCard";
import type { Agent, Stats } from "@/lib/types";
import { CATEGORY_LABELS, apiFetch } from "@/lib/utils";

async function getStats(): Promise<Stats | null> {
  try {
    return await apiFetch<Stats>("/api/stats");
  } catch {
    return null;
  }
}

async function getLatestAgents(): Promise<Agent[]> {
  try {
    const data = await apiFetch<{ agents: Agent[] }>("/api/agents?limit=6");
    return data.agents;
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const [stats, latest] = await Promise.all([getStats(), getLatestAgents()]);

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="nebula-glow pt-24 pb-20 px-4 text-center">
        <div className="relative z-10 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-accent/10 border border-accent/20 rounded-full px-4 py-1.5 text-accent text-sm font-medium mb-8">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse-slow" />
            Built on Arbitrum
          </div>
          <h1 className="font-display font-bold text-5xl md:text-6xl lg:text-7xl text-white leading-tight mb-6">
            The Universe of<br />
            <span className="text-accent">Autonomous Agents</span>
          </h1>
          <p className="text-muted text-lg md:text-xl max-w-xl mx-auto mb-10">
            Build agents. Publish once. Earn forever.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/agents"
              className="bg-accent hover:bg-accent-hover text-white font-semibold px-8 py-3 rounded-btn transition-colors"
            >
              Explore Agents
            </Link>
            <Link
              href="/register"
              className="bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold px-8 py-3 rounded-btn transition-colors"
            >
              Register Your Agent
            </Link>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      {stats && (
        <section className="border-y border-white/5 bg-space-card/50 py-6 px-4">
          <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <p className="font-display font-bold text-2xl text-white">{stats.agentCount}</p>
              <p className="text-muted text-sm mt-1">Agents</p>
            </div>
            <div>
              <p className="font-display font-bold text-2xl text-white">{stats.builderCount}</p>
              <p className="text-muted text-sm mt-1">Builders</p>
            </div>
            <div>
              <p className="font-display font-bold text-2xl text-white">
                {stats.totalStaked
                  ? `${parseFloat(stats.totalStaked).toFixed(3)} ETH`
                  : "0 ETH"}
              </p>
              <p className="text-muted text-sm mt-1">ETH Staked</p>
            </div>
            <div>
              <p className="font-display font-bold text-2xl text-white">{stats.verificationsToday}</p>
              <p className="text-muted text-sm mt-1">Verifications Today</p>
            </div>
          </div>
        </section>
      )}

      {/* Category filter */}
      <section className="py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap gap-2 justify-center mb-12">
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
              <Link
                key={key}
                href={`/agents?category=${key}`}
                className="bg-white/5 hover:bg-accent/10 border border-white/10 hover:border-accent/30 text-muted hover:text-accent rounded-btn px-4 py-2 text-sm font-medium transition-all"
              >
                {label}
              </Link>
            ))}
            <Link
              href="/agents"
              className="bg-white/5 hover:bg-accent/10 border border-white/10 hover:border-accent/30 text-muted hover:text-accent rounded-btn px-4 py-2 text-sm font-medium transition-all"
            >
              All
            </Link>
          </div>

          {/* Latest agents */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display font-bold text-2xl text-white">Latest Agents</h2>
            <Link href="/agents" className="text-accent text-sm hover:underline">
              View all →
            </Link>
          </div>

          {latest.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {latest.map((agent) => (
                <AgentCard key={agent.id} agent={agent} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 text-muted">
              <p className="text-4xl mb-4">✦</p>
              <p className="font-display font-semibold text-white mb-2">No agents yet</p>
              <p className="text-sm">Be the first to register an agent in the MilkyWay universe.</p>
              <Link href="/register" className="mt-6 inline-block text-accent hover:underline text-sm">
                Register now →
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
