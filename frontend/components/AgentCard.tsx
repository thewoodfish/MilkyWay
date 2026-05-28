import Link from "next/link";
import type { Agent } from "@/lib/types";
import { agentStatus, badgeEmoji, formatPrice, shortAddress, CATEGORY_LABELS } from "@/lib/utils";

interface AgentCardProps {
  agent: Agent;
}

export function AgentCard({ agent }: AgentCardProps) {
  const status = agentStatus(agent);
  const statusClass = { live: "status-live", degraded: "status-deg", down: "status-down" }[status];

  return (
    <div className="agent-card bg-space-card border border-white/8 rounded-card p-5 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
          {agent.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={agent.logoUrl} alt={agent.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-xl">✦</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-display font-semibold text-white text-sm truncate">{agent.name}</h3>
            <span className="text-xs bg-white/5 border border-white/10 rounded-full px-2 py-0.5 text-muted">
              v{agent.version}
            </span>
            {badgeEmoji(agent.badgeTier) && (
              <span title={agent.badgeTier}>{badgeEmoji(agent.badgeTier)}</span>
            )}
            {agent.phase2Ready && (
              <span title="Phase 2 Ready — implements /about and /execute" className="text-xs bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 rounded-full px-2 py-0.5">
                P2
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-accent font-medium">
              {CATEGORY_LABELS[agent.category] ?? agent.category}
            </span>
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statusClass}`} />
          </div>
        </div>
      </div>

      <p className="text-muted text-xs leading-relaxed line-clamp-2">{agent.description}</p>

      <div className="flex items-center justify-between mt-auto pt-2 border-t border-white/5">
        <div>
          <p className="text-white text-xs font-medium">{formatPrice(agent)}</p>
          <p className="text-muted text-xs font-mono-custom">by {shortAddress(agent.ownerAddress)}</p>
        </div>
        <Link
          href={`/agents/${agent.agentId}`}
          className="text-xs bg-accent/10 hover:bg-accent/20 border border-accent/30 text-accent rounded-btn px-3 py-1.5 transition-colors font-medium"
        >
          View →
        </Link>
      </div>
    </div>
  );
}
