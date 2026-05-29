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
    <div className="agent-card bg-white border border-slate-200 rounded-card p-5 flex flex-col gap-3 shadow-card">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl bg-accent-light border border-blue-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
          {agent.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={agent.logoUrl} alt={agent.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-accent text-lg font-bold">{agent.name[0]}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 className="font-semibold text-ink text-sm truncate">{agent.name}</h3>
            <span className="text-xs bg-slate-100 text-muted rounded-full px-2 py-0.5">
              v{agent.version}
            </span>
            {badgeEmoji(agent.badgeTier) && (
              <span title={agent.badgeTier}>{badgeEmoji(agent.badgeTier)}</span>
            )}
            {agent.phase2Ready && (
              <span title="Phase 2 Ready — implements /about and /execute"
                className="text-xs bg-blue-50 border border-blue-200 text-accent rounded-full px-2 py-0.5 font-medium">
                P2
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-accent font-medium">
              {CATEGORY_LABELS[agent.category] ?? agent.category}
            </span>
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusClass}`} />
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="text-muted text-xs leading-relaxed line-clamp-2">{agent.description}</p>

      {/* Footer */}
      <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-100">
        <div>
          <p className="text-ink text-xs font-semibold">{formatPrice(agent)}</p>
          <p className="text-subtle text-xs font-mono-custom">by {shortAddress(agent.ownerAddress)}</p>
        </div>
        <Link
          href={`/agents/${agent.agentId}`}
          className="text-xs bg-accent hover:bg-accent-hover text-white rounded-btn px-3 py-1.5 transition-colors font-medium shadow-btn"
        >
          View →
        </Link>
      </div>
    </div>
  );
}
