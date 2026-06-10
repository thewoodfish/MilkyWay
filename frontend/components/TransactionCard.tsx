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

interface Props {
  tx: Transaction;
}

export function TransactionCard({ tx }: Props) {
  const [highlight, setHighlight] = useState(tx.isNew ?? false);

  useEffect(() => {
    if (!highlight) return;
    const timer = setTimeout(() => setHighlight(false), 3000);
    return () => clearTimeout(timer);
  }, [highlight]);

  const shortCaller = `${tx.callerAddress.slice(0, 6)}...${tx.callerAddress.slice(-4)}`;
  const shortTx     = tx.txHash ? `${tx.txHash.slice(0, 6)}...${tx.txHash.slice(-4)}` : "—";
  const arbiscanUrl = tx.txHash ? `https://arbiscan.io/tx/${tx.txHash}` : null;
  const timeAgo     = formatTimeAgo(tx.settledAt);

  return (
    <div style={{
      background:   highlight ? "#1C1C28" : "#18181B",
      border:       `1px solid ${highlight ? "#2563EB" : "#27272A"}`,
      borderRadius: "16px",
      padding:      "20px 24px",
      transition:   "all 0.4s ease",
      position:     "relative",
      overflow:     "hidden"
    }}>

      {highlight && (
        <div style={{
          position:      "absolute",
          top:           "16px",
          left:          "24px",
          background:    "#2563EB",
          color:         "#ffffff",
          fontSize:      "10px",
          fontWeight:    700,
          padding:       "2px 8px",
          borderRadius:  "20px",
          letterSpacing: "0.08em",
          textTransform: "uppercase"
        }}>
          NEW
        </div>
      )}

      <div style={{
        position:  "absolute",
        top:       "20px",
        right:     "24px",
        fontSize:  "12px",
        color:     "#52525B",
        fontFamily:"'JetBrains Mono', monospace"
      }}>
        {timeAgo}
      </div>

      <div style={{
        display:     "flex",
        alignItems:  "center",
        gap:         "12px",
        marginTop:   highlight ? "24px" : "0",
        marginBottom:"14px"
      }}>
        <AgentAvatar
          agentId={tx.agentId}
          logoUrl={tx.agentLogoUrl}
          badgeTier={tx.badgeTier}
          size={40}
          showTooltip={false}
        />
        <div>
          <p style={{ fontSize: "15px", fontWeight: 600, color: "#FAFAFA", margin: 0 }}>
            {tx.agentName}
          </p>
          <p style={{
            fontSize:  "12px",
            color:     "#52525B",
            margin:    "2px 0 0 0",
            fontFamily:"'JetBrains Mono', monospace"
          }}>
            {tx.capability}
          </p>
        </div>
      </div>

      <p style={{ fontSize: "13px", color: "#A1A1AA", margin: "0 0 14px 0" }}>
        <span style={{ color: "#71717A", fontFamily: "'JetBrains Mono', monospace" }}>
          {shortCaller}
        </span>
        {" "}called{" "}
        <span style={{ color: "#60A5FA", fontFamily: "'JetBrains Mono', monospace" }}>
          {tx.capability}
        </span>
      </p>

      <div style={{
        display:        "flex",
        alignItems:     "center",
        justifyContent: "space-between",
        borderTop:      "1px solid #27272A",
        paddingTop:     "14px"
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
            {tx.amountUsdc} USDC
          </span>
        </div>

        {arbiscanUrl ? (
          <a
            href={arbiscanUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display:       "flex",
              alignItems:    "center",
              gap:           "6px",
              fontSize:      "12px",
              color:         "#52525B",
              fontFamily:    "'JetBrains Mono', monospace",
              textDecoration:"none",
              transition:    "color 0.15s"
            }}
            onMouseEnter={e => (e.currentTarget.style.color = "#A1A1AA")}
            onMouseLeave={e => (e.currentTarget.style.color = "#52525B")}
          >
            {shortTx}
            <svg width="12" height="12" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
              <polyline points="15 3 21 3 21 9"/>
              <line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
          </a>
        ) : (
          <span style={{
            fontSize:  "12px",
            color:     "#3F3F46",
            fontFamily:"'JetBrains Mono', monospace"
          }}>
            {shortTx}
          </span>
        )}
      </div>
    </div>
  );
}

export function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60)   return `${s} sec ago`;
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  return `${Math.floor(s / 3600)} hr ago`;
}
