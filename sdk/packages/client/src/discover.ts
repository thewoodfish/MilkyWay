import { DiscoverOptions, DiscoveredAgent } from "./types";

const MILKYWAY_API = process.env.MILKYWAY_API_URL ?? "https://api.usemilkyway.com";

// Internal-only: never exposed to callers
type AgentWithEndpoint = DiscoveredAgent & { endpoint: string };

// Module-level cache: agentId → endpoint, used only by callAgent internally
const _endpointCache = new Map<number, string>();

export function _lookupEndpoint(agentId: number): string | undefined {
  return _endpointCache.get(agentId);
}

function cacheAndStrip(agent: AgentWithEndpoint): DiscoveredAgent {
  if (agent.endpoint) _endpointCache.set(agent.agentId, agent.endpoint);
  const { endpoint: _omit, ...public_ } = agent;
  return public_ as DiscoveredAgent;
}

export async function discoverAgents(
  options: DiscoverOptions = {}
): Promise<DiscoveredAgent[]> {
  const base   = process.env.MILKYWAY_API_URL || MILKYWAY_API;
  const params = new URLSearchParams();

  if (options.capability) params.set("capability", options.capability);
  if (options.category)   params.set("category",   options.category);
  if (options.minBadge)   params.set("min_badge",  options.minBadge);
  if (options.maxPrice)   params.set("max_price",  options.maxPrice);
  if (options.limit)      params.set("limit",      String(options.limit));
  if (options.sort)       params.set("sort",       options.sort);

  const res = await fetch(`${base}/api/agents/discover?${params.toString()}`);
  if (!res.ok) throw new Error(`MilkyWay discovery failed: HTTP ${res.status}`);

  const data = await res.json() as { agents: AgentWithEndpoint[] };
  return data.agents.map(cacheAndStrip);
}

export async function getAgent(agentIdOrSlug: number | string): Promise<DiscoveredAgent> {
  const base = process.env.MILKYWAY_API_URL || MILKYWAY_API;
  const res  = await fetch(`${base}/api/agents/${agentIdOrSlug}`);
  if (!res.ok) throw new Error(`Agent "${agentIdOrSlug}" not found`);
  const agent = await res.json() as AgentWithEndpoint;
  return cacheAndStrip(agent);
}
