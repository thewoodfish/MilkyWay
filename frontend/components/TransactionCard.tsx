"use client";

import { AgentAvatar } from "./AgentAvatar";
import { useEffect, useState } from "react";

export interface Transaction {
  id:            string;
  agentId:       number;
  agentName:     string;
  agentLogoUrl:  string | null;
  badgeTier:     "NONE" | "BRONZE" | "SILVER" | "GOLD";
  capability:    string;
  callerAddress: string;
  amountUsdc:    string;
  txHash:        string;
  settledAt:     string;
  isNew?:        boolean;
}

export function TransactionCard({ tx }: { tx: Transaction }) {
  const [highlight, setHighlight] = useState(tx.isNew ?? false);

  useEffect(() => {
    if (!highlight) return;
    const timer = setTimeout(() => setHighlight(false), 3000);
    return () => clearTimeout(timer);
  }, [highlight]);

  const shortCaller = `${tx.callerAddress.slice(0, 6)}…${tx.callerAddress.slice(-4)}`;
  const shortTx     = tx.txHash ? `${tx.txHash.slice(0, 6)}…${tx.txHash.slice(-4)}` : "—";
  const arbiscanUrl = tx.txHash ? `https://arbiscan.io/tx/${tx.txHash}` : null;
  const timeAgo     = formatTimeAgo(tx.settledAt);

  return (
    <div style={{
      background:   highlight ? "rgba(37,99,235,0.08)" : "rgba(255,255,255,0.03)",
      border:       `1px solid ${highlight ? "rgba(59,130,246,0.45)" : "rgba(59,130,246,0.12)"}`,
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
        background:     highlight ? "rgba(37,99,235,0.1)" : "rgba(255,255,255,0.02)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {highlight && (
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
          <span style={{ fontSize: "12px", color: "#4a6fa5", fontFamily: "'JetBrains Mono', monospace" }}>
            {shortCaller}
          </span>
          <span style={{ fontSize: "12px", color: "#1e3557" }}>·</span>
          <span style={{ fontSize: "12px", color: "#3b82f6", fontFamily: "'JetBrains Mono', monospace" }}>
            {tx.capability}
          </span>
        </div>
        <span style={{ fontSize: "12px", color: "#2d4a7a", fontFamily: "'JetBrains Mono', monospace" }}>
          {timeAgo}
        </span>
      </div>

      {/* Body */}
      <div style={{
        padding:        "14px 18px",
        display:        "flex",
        alignItems:     "center",
        justifyContent: "space-between",
        gap:            "12px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
          <AgentAvatar
            agentId={tx.agentId}
            logoUrl={tx.agentLogoUrl}
            badgeTier={tx.badgeTier}
            size={40}
            showTooltip={false}
          />
          <div style={{ minWidth: 0 }}>
            <p style={{
              fontSize:     "15px",
              fontWeight:   600,
              color:        "#c8d8f0",
              margin:       "0 0 2px",
              whiteSpace:   "nowrap",
              overflow:     "hidden",
              textOverflow: "ellipsis",
            }}>
              {tx.agentName}
            </p>
            <p style={{ fontSize: "12px", color: "#2d4a7a", margin: 0, fontFamily: "'JetBrains Mono', monospace" }}>
              agent #{tx.agentId}
            </p>
          </div>
        </div>

        {/* Amount + link */}
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", justifyContent: "flex-end" }}>
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
            <span style={{
              fontSize:   "18px",
              fontWeight: 700,
              color:      "#34d399",
              fontFamily: "'JetBrains Mono', monospace",
              lineHeight: 1,
            }}>
              {tx.amountUsdc}
            </span>
            <span style={{ fontSize: "13px", color: "#2d4a7a", fontWeight: 500 }}>USDC</span>
          </div>

          {arbiscanUrl ? (
            <a
              href={arbiscanUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display:        "inline-flex",
                alignItems:     "center",
                gap:            "4px",
                fontSize:       "11px",
                color:          "#2d4a7a",
                fontFamily:     "'JetBrains Mono', monospace",
                textDecoration: "none",
                marginTop:      "4px",
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
          ) : (
            <p style={{ fontSize: "11px", color: "#1e3557", fontFamily: "'JetBrains Mono', monospace", margin: "4px 0 0", textAlign: "right" }}>
              {shortTx}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60)   return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}
