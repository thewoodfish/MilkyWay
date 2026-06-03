export type Category =
  | "DEFI" | "TRADING" | "DATA" | "PRODUCTIVITY"
  | "UTILITY" | "SECURITY" | "GAMING" | "SOCIAL";

export type PricingModel = "PER_CALL" | "PER_DAY" | "PER_MONTH" | "FREE";

export type BadgeTier = "NONE" | "BRONZE" | "SILVER" | "GOLD";

export interface Agent {
  id: string;
  agentId: number;
  name: string;
  description: string;
  category: Category;
  subcategory?: string | null;
  version: string;
  endpoint: string;
  pricingModel: PricingModel;
  priceUsdc: string;
  permissions: string[];
  logoUrl?: string | null;
  metadataHash: string;
  ownerAddress: string;
  badgeTier: BadgeTier;
  active: boolean;
  verifiedAt?: string | null;
  failedChecks: number;
  registeredAt: string;
  updatedAt: string;
  txHash?: string | null;
  slug?: string | null;
  phase2Ready: boolean;
  aboutSchema?: unknown;
  builder?: Builder;
}

export interface Builder {
  address: string;
  agentsCount: number;
  totalEarnings: string;
  joinedAt: string;
}

export interface VerificationLog {
  id: string;
  agentId: number;
  endpoint: string;
  success: boolean;
  statusCode?: number | null;
  responseTimeMs?: number | null;
  checkedAt: string;
}

export interface Stats {
  agentCount: number;
  builderCount: number;
  verificationsToday: number;
  totalStaked: string;
}
