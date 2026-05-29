import Link from "next/link";
import type { Agent } from "@/lib/types";
import { agentStatus, formatPrice, shortAddress, CATEGORY_LABELS } from "@/lib/utils";

const BLUE = { color: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE" };

const STATUS_META = {
  live:     { label: "Live",     color: "#10b981", bg: "#f0fdf4", border: "#bbf7d0" },
  degraded: { label: "Degraded", color: "#f59e0b", bg: "#fffbeb", border: "#fde68a" },
  down:     { label: "Offline",  color: "#ef4444", bg: "#fef2f2", border: "#fecaca" },
};

const BADGE_META: Record<string, { label: string; color: string; bg: string }> = {
  BRONZE: { label: "Bronze", color: "#92400e", bg: "#fef3c7" },
  SILVER: { label: "Silver", color: "#374151", bg: "#f3f4f6" },
  GOLD:   { label: "Gold",   color: "#78350f", bg: "#fef9c3" },
};

interface AgentCardProps {
  agent: Agent;
}

export function AgentCard({ agent }: AgentCardProps) {
  const status = agentStatus(agent);
  const sm = STATUS_META[status];
  const bm = agent.badgeTier && agent.badgeTier !== "NONE" ? BADGE_META[agent.badgeTier] : null;

  return (
    <Link
      href={`/agents/${agent.agentId}`}
      className="group block rounded-2xl overflow-hidden transition-all duration-200"
      style={{
        background: "#fff",
        border: "1px solid #E3E8EF",
        boxShadow: "0 2px 12px rgba(10,37,64,0.06)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 32px rgba(37,99,235,0.14), 0 0 0 1px #BFDBFE";
        (e.currentTarget as HTMLElement).style.borderColor = "#BFDBFE";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 12px rgba(10,37,64,0.06)";
        (e.currentTarget as HTMLElement).style.borderColor = "#E3E8EF";
      }}
    >
      {/* Top accent strip */}
      <div className="h-1 w-full" style={{ background: "#2563EB" }} />

      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start gap-3 mb-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-[15px] font-bold overflow-hidden"
            style={{ background: BLUE.bg, color: BLUE.color, border: `1px solid ${BLUE.border}` }}
          >
            {agent.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={agent.logoUrl} alt={agent.name} className="w-full h-full object-cover" />
            ) : (
              agent.name[0]
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
              <h3 className="font-semibold text-[15px] text-[#0A2540] truncate">{agent.name}</h3>
              <span
                className="text-[10px] font-mono-custom px-1.5 py-0.5 rounded"
                style={{ background: "#F1F5F9", color: "#94a3b8" }}
              >
                v{agent.version}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: BLUE.bg, color: BLUE.color }}
              >
                {CATEGORY_LABELS[agent.category] ?? agent.category}
              </span>
              {bm && (
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: bm.bg, color: bm.color }}
                >
                  {bm.label}
                </span>
              )}
            </div>
          </div>

          {/* Status pill */}
          <span
            className="flex-shrink-0 inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full"
            style={{ background: sm.bg, color: sm.color, border: `1px solid ${sm.border}` }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{
                background: sm.color,
                boxShadow: status === "live" ? `0 0 5px ${sm.color}` : "none",
                animation: status === "live" ? "pulse 2s ease-in-out infinite" : "none",
              }}
            />
            {sm.label}
          </span>
        </div>

        {/* Description */}
        <p className="text-[13px] leading-relaxed line-clamp-2 mb-4" style={{ color: "#64748b" }}>
          {agent.description}
        </p>

        {/* Footer */}
        <div
          className="flex items-center justify-between pt-3.5"
          style={{ borderTop: "1px solid #F1F5F9" }}
        >
          <div>
            <p className="text-[13px] font-semibold font-mono-custom" style={{ color: "#0A2540" }}>
              {formatPrice(agent)}
            </p>
            <p className="text-[11px] font-mono-custom mt-0.5" style={{ color: "#94a3b8" }}>
              {shortAddress(agent.ownerAddress)}
            </p>
          </div>
          <span
            className="text-[13px] font-semibold px-4 py-1.5 rounded-lg"
            style={{ background: BLUE.bg, color: BLUE.color, border: `1px solid ${BLUE.border}` }}
          >
            View →
          </span>
        </div>
      </div>
    </Link>
  );
}
