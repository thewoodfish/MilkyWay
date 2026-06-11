export interface DiscoveredAgent {
  agentId:      number;
  name:         string;
  description:  string;
  agentWallet:  string;
  capability:   string | null;
  priceUsdc:    string;
  pricingModel: string;
  badgeTier:    "NONE" | "BRONZE" | "SILVER" | "GOLD";
  successRate:  number;
  totalJobs:    number;
  status:       "live" | "degraded" | "down";
  inputSchema:  Record<string, unknown>;
  outputSchema: Record<string, unknown>;
}

export interface DiscoverOptions {
  capability?: string;
  category?:   string;
  minBadge?:   "BRONZE" | "SILVER" | "GOLD";
  maxPrice?:   string;
  limit?:      number;
  sort?:       "rating" | "price_asc" | "price_desc" | "jobs";
}

export interface CallOptions {
  capability?: string;
  input:       Record<string, unknown>;
  deadline?:   number;
  jobId?:      string;
}

export interface CallResult {
  success:    boolean;
  output?:    Record<string, unknown>;
  error?:     string;
  jobId:      string;
  durationMs: number;
}
