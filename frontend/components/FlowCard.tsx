"use client";

import { AgentAvatar } from "./AgentAvatar";
import { formatTimeAgo } from "./TransactionCard";

interface AgentSummary {
  agentId:    number;
  agentName:  string;
  logoUrl:    string | null;
  badgeTier:  string;
  capability: string;
  amountUsdc: string;
}

export interface FlowTx {
  flowJobId:     string;
  agentCount:    number;
  agents:        AgentSummary[];
  totalUsdc:     string;
  callerAddress: string;
  durationMs:    number;
  completedAt:   string;
  isNew?:        boolean;
}

export function FlowCard({ tx }: { tx: FlowTx }) {
  const shortCaller = `${tx.callerAddress.slice(0, 6)}...${tx.callerAddress.slice(-4)}`;
  const duration    = tx.durationMs < 1000
    ? `${tx.durationMs}ms`
    : `${(tx.durationMs / 1000).toFixed(1)}s`;
  const timeAgo = formatTimeAgo(tx.completedAt);

  return (
    <div style={{
      background:   tx.isNew ? "#1C1C28" : "#18181B",
      border:       `1px solid ${tx.isNew ? "#2563EB" : "#27272A"}`,
      borderRadius: "16px",
      padding:      "20px 24px",
      transition:   "all 0.4s ease",
      position:     "relative"
    }}>

      <div style={{
        display:        "flex",
        alignItems:     "center",
        justifyContent: "space-between",
        marginBottom:   "16px"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "14px" }}>⛓</span>
          <span style={{
            fontSize:      "11px",
            fontWeight:    700,
            color:         "#60A5FA",
            letterSpacing: "0.08em",
            textTransform: "uppercase"
          }}>
            Flow · {tx.agentCount} agents
          </span>
          {tx.isNew && (
            <span style={{
              fontSize:      "10px",
              fontWeight:    700,
              color:         "#ffffff",
              background:    "#2563EB",
              padding:       "2px 8px",
              borderRadius:  "20px",
              letterSpacing: "0.08em",
              textTransform: "uppercase"
            }}>
              NEW
            </span>
          )}
        </div>
        <span style={{
          fontSize:  "12px",
          color:     "#52525B",
          fontFamily:"'JetBrains Mono', monospace"
        }}>
          {timeAgo}
        </span>
      </div>

      <div style={{
        display:     "flex",
        alignItems:  "center",
        gap:         "8px",
        marginBottom:"16px",
        flexWrap:    "wrap"
      }}>
        {tx.agents.map((agent, i) => (
          <div key={agent.agentId} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{
              display:     "flex",
              alignItems:  "center",
              gap:         "6px",
              background:  "#0D0D14",
              border:      "1px solid #27272A",
              borderRadius:"10px",
              padding:     "6px 10px 6px 6px"
            }}>
              <AgentAvatar
                agentId={agent.agentId}
                logoUrl={agent.logoUrl}
                badgeTier={agent.badgeTier as "NONE" | "BRONZE" | "SILVER" | "GOLD"}
                size={24}
                showTooltip={false}
              />
              <div>
                <p style={{
                  fontSize:  "12px",
                  fontWeight:600,
                  color:     "#FAFAFA",
                  margin:    0,
                  whiteSpace:"nowrap"
                }}>
                  {agent.agentName}
                </p>
                <p style={{
                  fontSize:  "10px",
                  color:     "#52525B",
                  margin:    0,
                  fontFamily:"'JetBrains Mono', monospace"
                }}>
                  {agent.capability}
                </p>
              </div>
            </div>

            {i < tx.agents.length - 1 && (
              <span style={{ color: "#3F3F46", fontSize: "16px" }}>→</span>
            )}
          </div>
        ))}
      </div>

      <p style={{ fontSize: "13px", color: "#71717A", margin: "0 0 14px 0" }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", color: "#52525B" }}>
          {shortCaller}
        </span>
        {" "}ran a {tx.agentCount}-agent flow
      </p>

      <div style={{
        display:        "flex",
        alignItems:     "center",
        justifyContent: "space-between",
        borderTop:      "1px solid #27272A",
        paddingTop:     "14px",
        gap:            "16px",
        flexWrap:       "wrap"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <div style={{
            width:         "18px",
            height:        "18px",
            borderRadius:  "50%",
            background:    "#2775CA",
            display:       "flex",
            alignItems:    "center",
            justifyContent:"center",
            fontSize:      "10px",
            fontWeight:    700,
            color:         "#fff",
            flexShrink:    0
          }}>
            $
          </div>
          <span style={{
            fontSize:  "16px",
            fontWeight:700,
            color:     "#FAFAFA",
            fontFamily:"'JetBrains Mono', monospace"
          }}>
            {tx.totalUsdc} USDC
          </span>
          <span style={{ fontSize: "12px", color: "#52525B" }}>total</span>
        </div>

        <span style={{
          fontSize:  "12px",
          color:     "#52525B",
          fontFamily:"'JetBrains Mono', monospace"
        }}>
          ⏱ {duration}
        </span>

        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
          {tx.agents.map((agent) => (
            <span
              key={agent.agentId}
              style={{
                fontSize:    "11px",
                color:       "#52525B",
                fontFamily:  "'JetBrains Mono', monospace",
                background:  "#0D0D14",
                border:      "1px solid #27272A",
                padding:     "3px 8px",
                borderRadius:"6px",
                whiteSpace:  "nowrap"
              }}
            >
              {agent.agentName.split(" ")[0]} · {parseFloat(agent.amountUsdc).toFixed(3)} USDC
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
