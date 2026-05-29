"use client";

import Image from "next/image";

type BadgeTier = "NONE" | "BRONZE" | "SILVER" | "GOLD";

interface AgentAvatarProps {
  agentId: number;
  logoUrl?: string | null;
  badgeTier: BadgeTier;
  size?: number;
  showTooltip?: boolean;
}

const RING: Record<BadgeTier, { color: string; shadow: string; animated: boolean; label: string }> = {
  NONE:   { color: "transparent", shadow: "none",                             animated: false, label: "" },
  BRONZE: { color: "#CD7F32",     shadow: "none",                             animated: false, label: "Bronze — verified agent" },
  SILVER: { color: "#C0C0C0",     shadow: "0 0 6px rgba(192,192,192,0.4)",    animated: false, label: "Silver — 100+ jobs, 95%+ success" },
  GOLD:   { color: "#FFD700",     shadow: "0 0 14px rgba(255,215,0,0.6)",     animated: true,  label: "Gold — 1000+ jobs, 99%+ success" },
};

export function AgentAvatar({
  agentId,
  logoUrl,
  badgeTier,
  size = 64,
  showTooltip = true,
}: AgentAvatarProps) {
  const src = logoUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=milkyway-${agentId}`;
  const ring = RING[badgeTier];
  const radius = Math.round(size * 0.18);
  const offset = 3;
  const outer = size + offset * 2;

  return (
    <div
      style={{ width: outer, height: outer, position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
      title={showTooltip && ring.label ? ring.label : undefined}
    >
      <div style={{ width: size, height: size, borderRadius: radius, overflow: "hidden" }}>
        <Image
          src={src}
          alt={`Agent #${agentId}`}
          width={size}
          height={size}
          style={{ display: "block" }}
          unoptimized={!logoUrl}
        />
      </div>
      {badgeTier !== "NONE" && (
        <div
          className={ring.animated ? "animate-pulse-ring" : ""}
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: radius + offset,
            border: `3px solid ${ring.color}`,
            boxShadow: ring.shadow,
            pointerEvents: "none",
          }}
        />
      )}
    </div>
  );
}
