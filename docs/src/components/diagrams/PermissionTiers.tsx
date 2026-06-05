import React from "react";

interface Tier {
  icon:       string;
  type:       string;
  label:      string;
  risk:       string;
  enforced:   boolean;
  bg:         string;
  border:     string;
  textColor:  string;
  riskColor:  string;
}

const TIERS: Tier[] = [
  {
    icon:      "👁",
    type:      "READ_WALLET_BALANCE",
    label:     "Read your wallet balance",
    risk:      "Informational only — nothing enforced",
    enforced:  false,
    bg:        "#F9FAFB",
    border:    "#E5E7EB",
    textColor: "#374151",
    riskColor: "#6B7280"
  },
  {
    icon:      "🌐",
    type:      "ACCESS_EXTERNAL_APIS",
    label:     "Access external APIs",
    risk:      "Informational only — nothing enforced",
    enforced:  false,
    bg:        "#EFF6FF",
    border:    "#BFDBFE",
    textColor: "#1D4ED8",
    riskColor: "#6B7280"
  },
  {
    icon:      "⚡",
    type:      "EXECUTE_TRANSACTIONS",
    label:     "Execute transactions on your behalf",
    risk:      "Real enforcement — requires spend limit",
    enforced:  true,
    bg:        "#FFFBEB",
    border:    "#FDE68A",
    textColor: "#B45309",
    riskColor: "#D97706"
  }
];

export function PermissionTiers() {
  return (
    <div style={{
      display:       "flex",
      flexDirection: "column",
      gap:           "12px",
      margin:        "2rem 0",
      fontFamily:    "'Inter', sans-serif"
    }}>
      {TIERS.map((tier, i) => (
        <div key={i} style={{
          display:      "flex",
          alignItems:   "center",
          gap:          "16px",
          background:   tier.bg,
          border:       `2px solid ${tier.border}`,
          borderRadius: "12px",
          padding:      "14px 20px"
        }}>
          <span style={{ fontSize: "24px", flexShrink: 0 }}>
            {tier.icon}
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "14px", fontWeight: 600, color: tier.textColor }}>
                {tier.label}
              </span>
              <code style={{
                fontSize:     "11px",
                background:   "rgba(0,0,0,0.06)",
                padding:      "2px 6px",
                borderRadius: "4px",
                color:        tier.textColor,
                fontFamily:   "'JetBrains Mono', monospace"
              }}>
                {tier.type}
              </code>
            </div>
            <p style={{ fontSize: "13px", color: tier.riskColor, margin: "4px 0 0 0" }}>
              {tier.risk}
            </p>
          </div>
          <div style={{
            flexShrink:   0,
            fontSize:     "12px",
            fontWeight:   600,
            padding:      "4px 10px",
            borderRadius: "20px",
            background:   tier.enforced ? "#FEF3C7" : "#F3F4F6",
            color:        tier.enforced ? "#92400E" : "#6B7280",
            border:       `1px solid ${tier.enforced ? "#FDE68A" : "#E5E7EB"}`
          }}>
            {tier.enforced ? "Enforced" : "Trust signal"}
          </div>
        </div>
      ))}

      <p style={{ fontSize: "13px", color: "#6B7280", marginTop: "8px" }}>
        The blockchain enforces ⚡ EXECUTE_TRANSACTIONS.
        MilkyWay cannot override a revoked spend limit.
      </p>
    </div>
  );
}
