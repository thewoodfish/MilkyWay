import Link from "next/link";
import type { Agent, VerificationLog } from "@/lib/types";
import {
  apiFetch, shortAddress, badgeEmoji, badgeLabel, formatPrice,
  agentStatus, timeAgo, CATEGORY_LABELS,
} from "@/lib/utils";
import { QuickExecute } from "@/components/QuickExecute";

const ARBISCAN = "https://sepolia.arbiscan.io";
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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="font-bold text-2xl text-ink mb-2">Agent not found</p>
          <Link href="/agents" className="text-accent hover:underline text-sm">
            ← Back to agents
          </Link>
        </div>
      </div>
    );
  }

  const status = agentStatus(agent);
  const dotColor = { live: "bg-emerald-400", degraded: "bg-yellow-400", down: "bg-red-400" }[status];
  const statusLabel = { live: "Live", degraded: "Degraded", down: "Down" }[status];

  const showQuickExecute = agent.phase2Ready && agent.agentId != null && agent.aboutSchema != null;

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <Link
          href="/agents"
          className="text-slate-500 hover:text-accent text-sm mb-8 inline-flex items-center gap-1 transition-colors"
        >
          ← Back to agents
        </Link>

        {/* Outer grid: content left, QuickExecute right */}
        <div className={`grid gap-8 items-start ${showQuickExecute ? "lg:grid-cols-[1fr_340px]" : ""}`}>

          {/* ── LEFT: all agent content ───────────────────────────────── */}
          <div className="space-y-6">

            {/* Header card */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-card flex flex-col sm:flex-row gap-5 items-start">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                {agent.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={agent.logoUrl} alt={agent.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xl font-bold text-accent">{agent.name[0]}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <h1 className="font-bold text-2xl text-ink">{agent.name}</h1>
                  <span className="text-xs bg-slate-100 text-slate-500 rounded-full px-2.5 py-0.5">
                    v{agent.version}
                  </span>
                  {badgeEmoji(agent.badgeTier) && (
                    <span className="text-lg" title={`${badgeLabel(agent.badgeTier)} — verified agent`}>
                      {badgeEmoji(agent.badgeTier)}
                    </span>
                  )}
                  {agent.phase2Ready && (
                    <span className="text-xs bg-blue-50 border border-blue-200 text-blue-600 rounded-full px-2.5 py-0.5 font-medium">
                      ⚡ Phase 2 Ready
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className="bg-blue-50 border border-blue-100 text-accent rounded-full px-3 py-0.5 text-xs font-medium">
                    {CATEGORY_LABELS[agent.category] ?? agent.category}
                  </span>
                  {agent.subcategory && (
                    <span className="bg-slate-100 text-slate-500 rounded-full px-3 py-0.5 text-xs">
                      {agent.subcategory}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                  <span>{statusLabel}</span>
                  {agent.verifiedAt && (
                    <span className="text-xs text-slate-400">· Last verified {timeAgo(agent.verifiedAt)}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-card">
              <h2 className="font-semibold text-ink mb-3">About</h2>
              <p className="text-slate-500 leading-relaxed text-sm">{agent.description}</p>
            </div>

            {/* Two-column sub-grid */}
            <div className="grid sm:grid-cols-2 gap-6">
              {/* Left sub-col */}
              <div className="space-y-4">
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-card">
                  <h2 className="font-semibold text-ink mb-3 text-sm">Pricing</h2>
                  <p className="text-2xl font-bold text-accent">{formatPrice(agent)}</p>
                </div>

                {agent.permissions.length > 0 && (
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-card">
                    <h2 className="font-semibold text-ink mb-3 text-sm">Required Permissions</h2>
                    <ul className="space-y-2">
                      {agent.permissions.map((p) => (
                        <li key={p} className="flex items-center gap-2 text-xs text-slate-500">
                          <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
                          {PERMISSION_LABELS[p] ?? p}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-card">
                  <h2 className="font-semibold text-ink mb-2 text-sm">Endpoint</h2>
                  <p className="font-mono-custom text-slate-400 text-xs break-all">
                    {agent.endpoint.replace(/^https?:\/\//, "").slice(0, 50)}
                    {agent.endpoint.length > 50 && "…"}
                  </p>
                </div>
              </div>

              {/* Right sub-col */}
              <div className="space-y-4">
                {agent.builder && (
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-card">
                    <h2 className="font-semibold text-ink mb-3 text-sm">Builder</h2>
                    <p className="font-mono-custom text-accent text-sm">{shortAddress(agent.builder.address)}</p>
                    <p className="text-slate-500 text-xs mt-1">{agent.builder.agentsCount} agents published</p>
                    <p className="text-slate-400 text-xs mt-0.5">
                      Member since {new Date(agent.builder.joinedAt).toLocaleDateString()}
                    </p>
                  </div>
                )}

                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-card">
                  <h2 className="font-semibold text-ink mb-4 text-sm">On-Chain Details</h2>
                  <dl className="space-y-3">
                    <div className="flex justify-between text-xs">
                      <dt className="text-slate-400">Agent ID</dt>
                      <dd className="text-ink font-mono-custom font-medium">#{agent.agentId}</dd>
                    </div>
                    <div className="flex justify-between text-xs">
                      <dt className="text-slate-400">Contract</dt>
                      <dd>
                        <a
                          href={`${ARBISCAN}/address/${CONTRACT}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-accent hover:underline font-mono-custom"
                        >
                          {CONTRACT ? shortAddress(CONTRACT) : "—"}
                        </a>
                      </dd>
                    </div>
                    {agent.txHash && (
                      <div className="flex justify-between text-xs">
                        <dt className="text-slate-400">TX Hash</dt>
                        <dd>
                          <a
                            href={`${ARBISCAN}/tx/${agent.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-accent hover:underline font-mono-custom"
                          >
                            {shortAddress(agent.txHash)}
                          </a>
                        </dd>
                      </div>
                    )}
                    <div className="flex justify-between text-xs">
                      <dt className="text-slate-400">Registered</dt>
                      <dd className="text-ink">{new Date(agent.registeredAt).toLocaleDateString()}</dd>
                    </div>
                    <div className="flex justify-between text-xs">
                      <dt className="text-slate-400">Stake</dt>
                      <dd className="text-ink font-medium">0.01 ETH</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>

            {/* Verification history */}
            {logs.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-card">
                <h2 className="font-semibold text-ink mb-4 text-sm">
                  Verification History
                  <span className="text-slate-400 font-normal ml-2">(last {logs.length})</span>
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-slate-400 border-b border-slate-100 text-left">
                        <th className="pb-3 font-medium text-xs">Time</th>
                        <th className="pb-3 font-medium text-xs">Status</th>
                        <th className="pb-3 font-medium text-xs">Response</th>
                        <th className="pb-3 font-medium text-xs">HTTP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.slice(0, 10).map((log) => (
                        <tr key={log.id} className="border-b border-slate-100 last:border-0">
                          <td className="py-3 text-slate-400 font-mono-custom text-xs">{timeAgo(log.checkedAt)}</td>
                          <td className="py-3">
                            <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${log.success ? "text-emerald-600" : "text-red-500"}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${log.success ? "bg-emerald-400" : "bg-red-400"}`} />
                              {log.success ? "OK" : "Failed"}
                            </span>
                          </td>
                          <td className="py-3 text-slate-400 text-xs font-mono-custom">
                            {log.responseTimeMs != null ? `${log.responseTimeMs}ms` : "—"}
                          </td>
                          <td className="py-3 text-slate-400 text-xs font-mono-custom">{log.statusCode ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT: QuickExecute panel ──────────────────────────────── */}
          {showQuickExecute && (
            <div className="lg:sticky lg:top-8">
              <QuickExecute
                agentId={agent.agentId!}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                aboutSchema={agent.aboutSchema as any}
                priceEth={agent.priceEth}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
