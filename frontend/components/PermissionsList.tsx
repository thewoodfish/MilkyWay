"use client";

export type PermissionType =
  | "READ_WALLET_BALANCE"
  | "ACCESS_EXTERNAL_APIS"
  | "EXECUTE_TRANSACTIONS"
  | "MANAGE_AGENTS";

export interface PermissionDeclaration {
  type:                 PermissionType;
  reason:               string;
  token?:               string;
  max_per_transaction?: string;
  max_lifetime?:        string;
}

const CONFIG: Record<PermissionType, { icon: string; label: string; color: string; bg: string; border: string }> = {
  READ_WALLET_BALANCE: {
    icon: "👁", label: "Read your wallet balance",
    color: "#374151", bg: "#F9FAFB", border: "#E5E7EB",
  },
  ACCESS_EXTERNAL_APIS: {
    icon: "🌐", label: "Access external APIs",
    color: "#1D4ED8", bg: "#EFF6FF", border: "#BFDBFE",
  },
  EXECUTE_TRANSACTIONS: {
    icon: "⚡", label: "Execute transactions on your behalf",
    color: "#92400E", bg: "#FFFBEB", border: "#FDE68A",
  },
  MANAGE_AGENTS: {
    icon: "🤖", label: "Manage other agents",
    color: "#6D28D9", bg: "#F5F3FF", border: "#DDD6FE",
  },
};

interface Props {
  permissions: PermissionDeclaration[];
  compact?:    boolean;
}

export function PermissionsList({ permissions, compact = false }: Props) {
  if (!permissions || permissions.length === 0) return null;

  const hasExecute = permissions.some((p) => p.type === "EXECUTE_TRANSACTIONS");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {permissions.map((perm, i) => {
        const cfg = CONFIG[perm.type] ?? CONFIG.ACCESS_EXTERNAL_APIS;
        return (
          <div
            key={i}
            style={{
              display: "flex", alignItems: "flex-start", gap: "10px",
              padding: compact ? "8px 10px" : "10px 12px",
              borderRadius: "10px", border: `1px solid ${cfg.border}`,
              background: cfg.bg,
            }}
          >
            <span style={{ fontSize: "16px", flexShrink: 0, marginTop: "1px" }}>{cfg.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: "13px", fontWeight: 600, color: cfg.color, margin: 0 }}>{cfg.label}</p>
              {!compact && perm.reason && (
                <p style={{ fontSize: "12px", color: "#94a3b8", margin: "3px 0 0" }}>{perm.reason}</p>
              )}
              {!compact && perm.type === "EXECUTE_TRANSACTIONS" && perm.max_per_transaction && (
                <p style={{ fontSize: "12px", color: "#b45309", fontWeight: 600, margin: "3px 0 0" }}>
                  Suggested limit: {perm.max_per_transaction} USDC per action
                </p>
              )}
            </div>
          </div>
        );
      })}
      {hasExecute && !compact && (
        <p style={{ fontSize: "12px", color: "#94a3b8", margin: "4px 0 0 2px" }}>
          ⚡ Transaction permission requires you to set a spend limit below.
        </p>
      )}
    </div>
  );
}
