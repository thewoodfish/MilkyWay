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
  txHash?:       string;
  isNew?:        boolean;
}

export function FlowCard({ tx }: { tx: FlowTx }) {
  const shortCaller = `${tx.callerAddress.slice(0, 6)}…${tx.callerAddress.slice(-4)}`;
  const duration    = tx.durationMs < 1000
    ? `${tx.durationMs}ms`
    : `${(tx.durationMs / 1000).toFixed(1)}s`;
  const timeAgo     = formatTimeAgo(tx.completedAt);
  const arbiscanUrl = tx.txHash ? `https://arbiscan.io/tx/${tx.txHash}` : null;
  const flowUrl     = `/flows/${tx.flowJobId}`;
  const linkUrl     = arbiscanUrl ?? flowUrl;
  const shortTx     = tx.txHash
    ? `${tx.txHash.slice(0, 6)}…${tx.txHash.slice(-4)}`
    : `flow:${tx.flowJobId.slice(0, 8)}…`;

  return (
    <div style={{
      background:   tx.isNew ? "rgba(37,99,235,0.08)" : "rgba(255,255,255,0.03)",
      border:       `1px solid ${tx.isNew ? "rgba(59,130,246,0.45)" : "rgba(59,130,246,0.12)"}`,
      borderRadius: "14px",
      overflow:     "hidden",
      transition:   "border-color 0.4s ease, background 0.4s ease",
    }}>

      {/* Top bar */}
      <div style={{
        display:        "flex",
        alignItems:     "center",
        justifyContent: "space-between",
        padding:        "10px 18px",
        borderBottom:   "1px solid rgba(59,130,246,0.08)",
        background:     tx.isNew ? "rgba(37,99,235,0.1)" : "rgba(255,255,255,0.02)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{
            display:       "inline-flex",
            alignItems:    "center",
            gap:           "5px",
            fontSize:      "11px",
            fontWeight:    700,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            background:    "rgba(59,130,246,0.12)",
            color:         "#60a5fa",
            border:        "1px solid rgba(59,130,246,0.2)",
            padding:       "3px 10px",
            borderRadius:  "20px",
          }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
            </svg>
            Flow · {tx.agentCount} agents
          </span>
          {tx.isNew && (
            <span style={{
              fontSize:      "10px",
              fontWeight:    700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              background:    "#2563EB",
              color:         "#fff",
              padding:       "2px 8px",
              borderRadius:  "20px",
            }}>New</span>
          )}
          <span style={{ fontSize: "12px", color: "#1e3557" }}>·</span>
          <span style={{ fontSize: "12px", color: "#4a6fa5", fontFamily: "'JetBrains Mono', monospace" }}>
            {shortCaller}
          </span>
        </div>
        <span style={{ fontSize: "12px", color: "#2d4a7a", fontFamily: "'JetBrains Mono', monospace" }}>
          {timeAgo}
        </span>
      </div>

      {/* Agent pipeline */}
      <div style={{ padding: "14px 18px 12px", borderBottom: "1px solid rgba(59,130,246,0.08)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
          {tx.agents.map((agent, i) => (
            <div key={agent.agentId} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div style={{
                display:      "flex",
                alignItems:   "center",
                gap:          "8px",
                background:   "rgba(255,255,255,0.04)",
                border:       "1px solid rgba(59,130,246,0.15)",
                borderRadius: "10px",
                padding:      "6px 12px 6px 8px",
              }}>
                <AgentAvatar
                  agentId={agent.agentId}
                  logoUrl={agent.logoUrl}
                  badgeTier={agent.badgeTier as "NONE" | "BRONZE" | "SILVER" | "GOLD"}
                  size={24}
                  showTooltip={false}
                />
                <div>
                  <p style={{ fontSize: "12px", fontWeight: 600, color: "#c8d8f0", margin: 0, whiteSpace: "nowrap" }}>
                    {agent.agentName}
                  </p>
                  <p style={{ fontSize: "10px", color: "#2d4a7a", margin: 0, fontFamily: "'JetBrains Mono', monospace" }}>
                    {agent.capability}
                  </p>
                </div>
              </div>
              {i < tx.agents.length - 1 && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1e3a5f" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{
        display:        "flex",
        alignItems:     "center",
        justifyContent: "space-between",
        padding:        "10px 18px",
        gap:            "12px",
        flexWrap:       "wrap",
        background:     "rgba(0,0,0,0.1)",
      }}>
        {/* Total */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <div style={{
            width:          "18px",
            height:         "18px",
            borderRadius:   "50%",
            background:     "#2775CA",
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
            fontSize:       "10px",
            fontWeight:     700,
            color:          "#fff",
            flexShrink:     0,
          }}>$</div>
          <span style={{ fontSize: "17px", fontWeight: 700, color: "#34d399", fontFamily: "'JetBrains Mono', monospace" }}>
            {tx.totalUsdc}
          </span>
          <span style={{ fontSize: "13px", color: "#2d4a7a" }}>USDC total</span>
        </div>

        {/* Duration */}
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#2d4a7a" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
          <span style={{ fontSize: "12px", color: "#2d4a7a", fontFamily: "'JetBrains Mono', monospace" }}>
            {duration}
          </span>
        </div>

        {/* Per-agent breakdown */}
        <div style={{ display: "flex", alignItems: "center", gap: "4px", flexWrap: "wrap" }}>
          {tx.agents.map((agent) => (
            <span key={agent.agentId} style={{
              fontSize:     "11px",
              color:        "#4a6fa5",
              fontFamily:   "'JetBrains Mono', monospace",
              background:   "rgba(59,130,246,0.08)",
              border:       "1px solid rgba(59,130,246,0.15)",
              padding:      "2px 8px",
              borderRadius: "6px",
              whiteSpace:   "nowrap",
            }}>
              {agent.agentName.split(" ")[0]} · {parseFloat(agent.amountUsdc).toFixed(3)}
            </span>
          ))}
        </div>

        {/* Tx / flow link */}
        <a
          href={linkUrl}
          target={arbiscanUrl ? "_blank" : "_self"}
          rel="noopener noreferrer"
          style={{
            display:        "inline-flex",
            alignItems:     "center",
            gap:            "4px",
            fontSize:       "11px",
            color:          "#2d4a7a",
            fontFamily:     "'JetBrains Mono', monospace",
            textDecoration: "none",
            marginLeft:     "auto",
            transition:     "color 0.15s",
          }}
          onMouseEnter={e => (e.currentTarget.style.color = "#60a5fa")}
          onMouseLeave={e => (e.currentTarget.style.color = "#2d4a7a")}
        >
          {shortTx}
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
            <polyline points="15 3 21 3 21 9"/>
            <line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
        </a>
      </div>
    </div>
  );
}
