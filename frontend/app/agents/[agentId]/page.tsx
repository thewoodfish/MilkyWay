import Link from "next/link";
import type { Agent, VerificationLog } from "@/lib/types";
import {
  apiFetch, shortAddress, badgeEmoji, badgeLabel, formatPrice,
  agentStatus, timeAgo, CATEGORY_LABELS,
} from "@/lib/utils";

const ARBISCAN = "https://arbiscan.io";
const CONTRACT = process.env.NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS;

const PERMISSION_LABELS: Record<string, string> = {
  read_wallet: "Read wallet balance",
  execute_transactions: "Execute transactions",
  access_external_apis: "Access external APIs",
  manage_other_agents: "Manage other agents",
};

async function getAgent(agentId: string): Promise<Agent | null> {
  try {
    return await apiFetch<Agent>(`/api/agents/${agentId}`);
  } catch {
    return null;
  }
}

async function getLogs(agentId: string): Promise<VerificationLog[]> {
  try {
    return await apiFetch<VerificationLog[]>(`/api/verify/logs/${agentId}`);
  } catch {
    return [];
  }
}

export default async function AgentProfilePage({
  params,
}: {
  params: { agentId: string };
}) {
  const [agent, logs] = await Promise.all([
    getAgent(params.agentId),
    getLogs(params.agentId),
  ]);

  if (!agent) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-4xl mb-4">✦</p>
          <p className="font-display font-bold text-2xl text-white mb-2">Agent not found</p>
          <Link href="/agents" className="text-accent hover:underline text-sm">
            ← Back to agents
          </Link>
        </div>
      </div>
    );
  }

  const status = agentStatus(agent);
  const statusDot = { live: "status-live", degraded: "status-deg", down: "status-down" }[status];
  const statusLabel = { live: "Live", degraded: "Degraded", down: "Down" }[status];

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <Link href="/agents" className="text-muted hover:text-white text-sm mb-8 inline-block transition-colors">
          ← Back to agents
        </Link>

        {/* Header */}
        <div className="flex flex-col md:flex-row gap-6 items-start mb-10 p-6 bg-space-card border border-white/8 rounded-card">
          <div className="w-20 h-20 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
            {agent.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={agent.logoUrl} alt={agent.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl">✦</span>
            )}
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h1 className="font-display font-bold text-3xl text-white">{agent.name}</h1>
              <span className="text-sm bg-white/5 border border-white/10 rounded-full px-3 py-1 text-muted">
                v{agent.version}
              </span>
              {badgeEmoji(agent.badgeTier) && (
                <span className="text-xl" title={`${badgeLabel(agent.badgeTier)} — verified agent`}>
                  {badgeEmoji(agent.badgeTier)}
                </span>
              )}
              {agent.phase2Ready && (
                <span title="Phase 2 Ready — implements /about and /execute" className="text-xs bg-blue-50 border border-blue-200 text-blue-600 rounded-full px-3 py-1">
                  ⚡ Phase 2 Ready
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              <span className="bg-accent/10 border border-accent/20 text-accent rounded-full px-3 py-1 text-xs font-medium">
                {CATEGORY_LABELS[agent.category] ?? agent.category}
              </span>
              {agent.subcategory && (
                <span className="bg-white/5 border border-white/10 text-muted rounded-full px-3 py-1 text-xs">
                  {agent.subcategory}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted">
              <span className={`w-2.5 h-2.5 rounded-full ${statusDot}`} />
              <span>{statusLabel}</span>
              {agent.verifiedAt && (
                <span className="text-xs">· Last verified {timeAgo(agent.verifiedAt)}</span>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="mb-10 p-6 bg-space-card border border-white/8 rounded-card">
          <h2 className="font-display font-semibold text-white mb-3">About</h2>
          <p className="text-muted leading-relaxed">{agent.description}</p>
        </div>

        {/* Two-column layout */}
        <div className="grid md:grid-cols-2 gap-6 mb-10">
          {/* Left */}
          <div className="space-y-4">
            <div className="p-6 bg-space-card border border-white/8 rounded-card">
              <h2 className="font-display font-semibold text-white mb-4">Pricing</h2>
              <p className="text-2xl font-display font-bold text-accent">{formatPrice(agent)}</p>
            </div>

            {agent.permissions.length > 0 && (
              <div className="p-6 bg-space-card border border-white/8 rounded-card">
                <h2 className="font-display font-semibold text-white mb-4">Required Permissions</h2>
                <ul className="space-y-2">
                  {agent.permissions.map((p) => (
                    <li key={p} className="flex items-center gap-2 text-sm text-muted">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
                      {PERMISSION_LABELS[p] ?? p}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="p-6 bg-space-card border border-white/8 rounded-card">
              <h2 className="font-display font-semibold text-white mb-4">Endpoint</h2>
              <p className="font-mono-custom text-muted text-sm break-all">
                {agent.endpoint.replace(/^https?:\/\//, "").slice(0, 40)}
                {agent.endpoint.length > 40 && "…"}
              </p>
            </div>

            <button
              disabled
              className="w-full bg-white/5 border border-white/10 text-muted rounded-btn py-3 text-sm font-medium cursor-not-allowed"
            >
              Activate Agent — Coming in Phase 2
            </button>
          </div>

          {/* Right */}
          <div className="space-y-4">
            {agent.builder && (
              <div className="p-6 bg-space-card border border-white/8 rounded-card">
                <h2 className="font-display font-semibold text-white mb-4">Builder</h2>
                <p className="font-mono-custom text-accent text-sm">{shortAddress(agent.builder.address)}</p>
                <p className="text-muted text-sm mt-1">{agent.builder.agentsCount} agents published</p>
                <p className="text-muted text-xs mt-1">
                  Member since {new Date(agent.builder.joinedAt).toLocaleDateString()}
                </p>
              </div>
            )}

            <div className="p-6 bg-space-card border border-white/8 rounded-card">
              <h2 className="font-display font-semibold text-white mb-4">On-Chain Details</h2>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted">Agent ID</dt>
                  <dd className="text-white font-mono-custom">#{agent.agentId}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Contract</dt>
                  <dd>
                    <a
                      href={`${ARBISCAN}/address/${CONTRACT}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent hover:underline font-mono-custom text-xs"
                    >
                      {CONTRACT ? shortAddress(CONTRACT) : "—"}
                    </a>
                  </dd>
                </div>
                {agent.txHash && (
                  <div className="flex justify-between">
                    <dt className="text-muted">TX Hash</dt>
                    <dd>
                      <a
                        href={`${ARBISCAN}/tx/${agent.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent hover:underline font-mono-custom text-xs"
                      >
                        {shortAddress(agent.txHash)}
                      </a>
                    </dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-muted">Registered</dt>
                  <dd className="text-white text-xs">
                    {new Date(agent.registeredAt).toLocaleDateString()}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Stake</dt>
                  <dd className="text-white">0.01 ETH</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>

        {/* Verification history */}
        {logs.length > 0 && (
          <div className="p-6 bg-space-card border border-white/8 rounded-card">
            <h2 className="font-display font-semibold text-white mb-4">
              Verification History
              <span className="text-muted font-normal text-sm ml-2">(last {logs.length})</span>
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted border-b border-white/5 text-left">
                    <th className="pb-3 font-medium">Time</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Response</th>
                    <th className="pb-3 font-medium">HTTP</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.slice(0, 10).map((log) => (
                    <tr key={log.id} className="border-b border-white/5">
                      <td className="py-3 text-muted font-mono-custom text-xs">
                        {timeAgo(log.checkedAt)}
                      </td>
                      <td className="py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                            log.success ? "text-success" : "text-red-400"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              log.success ? "bg-success" : "bg-red-400"
                            }`}
                          />
                          {log.success ? "OK" : "Failed"}
                        </span>
                      </td>
                      <td className="py-3 text-muted text-xs font-mono-custom">
                        {log.responseTimeMs != null ? `${log.responseTimeMs}ms` : "—"}
                      </td>
                      <td className="py-3 text-muted text-xs font-mono-custom">
                        {log.statusCode ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
