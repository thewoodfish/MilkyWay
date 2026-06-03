import { ethers } from "ethers";
import type { Agent, BadgeTier, PricingModel } from "./types";

export function computeMetadataHash(profile: {
  category: string;
  description: string;
  endpoint: string;
  logoUrl: string | null;
  name: string;
  ownerAddress: string;
  permissions: string[];
  priceUsdc: string;
  pricingModel: string;
  subcategory: string | null;
  version: string;
}): string {
  const sorted = JSON.stringify(profile, Object.keys(profile).sort());
  return ethers.keccak256(ethers.toUtf8Bytes(sorted));
}

export function shortAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function agentPath(agent: { agentId: number | null; slug?: string | null }): string {
  return `/agents/${agent.slug ?? agent.agentId}`;
}

export function badgeLabel(tier: BadgeTier): string {
  return { NONE: "Unverified", BRONZE: "Bronze", SILVER: "Silver", GOLD: "Gold" }[tier];
}

export function badgeEmoji(tier: BadgeTier): string {
  return { NONE: "", BRONZE: "🥉", SILVER: "🥈", GOLD: "🥇" }[tier];
}

export function formatPrice(agent: Agent): string {
  if (agent.pricingModel === "FREE") return "Free";
  const suffix: Record<PricingModel, string> = {
    PER_CALL: "/ call",
    PER_DAY: "/ day",
    PER_MONTH: "/ month",
    FREE: "",
  };
  return `${agent.priceUsdc} USDC ${suffix[agent.pricingModel]}`;
}

export function agentStatus(agent: Agent): "live" | "degraded" | "down" {
  if (!agent.active) return "down";
  if (agent.failedChecks === 0) return "live";
  if (agent.failedChecks < 3) return "degraded";
  return "down";
}

export function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export const CATEGORY_LABELS: Record<string, string> = {
  DEFI: "DeFi",
  TRADING: "Trading",
  DATA: "Data",
  PRODUCTIVITY: "Productivity",
  UTILITY: "Utility",
  SECURITY: "Security",
  GAMING: "Gaming",
  SOCIAL: "Social",
};

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}
