"use client";

import { useEffect, useState, useRef } from "react";
import { TransactionCard } from "@/components/TransactionCard";
import { FlowCard } from "@/components/FlowCard";
import type { Transaction } from "@/components/TransactionCard";
import type { FlowTx } from "@/components/FlowCard";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const TX_POLL    = 4_000;
const STATS_POLL = 10_000;

interface Stats {
  jobsToday:    number;
  usdcToday:    string;
  agentsActive: number;
}

type TxItem = (Transaction & { type: "single"; flowJobId: string; isNew?: boolean })
            | (FlowTx       & { type: "flow";   id: string;       isNew?: boolean });

export default function HistoryPage() {
  const [txs,        setTxs]        = useState<TxItem[]>([]);
  const [stats,      setStats]      = useState<Stats | null>(null);
  const [liveStatus, setLiveStatus] = useState<"live" | "stale" | "error">("live");
  const lastTxId    = useRef<string | null>(null);
  const lastTxTime  = useRef<number>(Date.now());

  useEffect(() => {
    fetchTxs();
    fetchStats();

    const txInterval    = setInterval(fetchTxs,    TX_POLL);
    const statsInterval = setInterval(fetchStats,  STATS_POLL);
    return () => {
      clearInterval(txInterval);
      clearInterval(statsInterval);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const staleCheck = setInterval(() => {
      if (Date.now() - lastTxTime.current > 5 * 60 * 1000) {
        setLiveStatus("stale");
      }
    }, 10_000);
    return () => clearInterval(staleCheck);
  }, []);

  async function fetchTxs() {
    try {
      const res = await fetch(`${API}/api/history/transactions`);
      if (!res.ok) { setLiveStatus("error"); return; }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw: any[] = await res.json();

      const firstId: string | null =
        raw[0]?.type === "flow" ? raw[0]?.flowJobId : raw[0]?.id ?? null;

      const isNewBatch = firstId !== lastTxId.current && lastTxId.current !== null;

      const items: TxItem[] = raw.map((item, i) => ({
        ...item,
        isNew: isNewBatch && i === 0
      } as TxItem));

      if (firstId && firstId !== lastTxId.current) {
        lastTxId.current   = firstId;
        lastTxTime.current = Date.now();
        setLiveStatus("live");
      }

      setTxs(items);
    } catch {
      setLiveStatus("error");
    }
  }

  async function fetchStats() {
    try {
      const res = await fetch(`${API}/api/history/stats`);
      if (res.ok) setStats(await res.json());
    } catch {
      // non-fatal
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFF", fontFamily: "'Inter', sans-serif" }}>

      {/* Hero header strip */}
      <div style={{
        background:   "#fff",
        borderBottom: "1px solid #E3E8EF",
        padding:      "56px 24px 40px",
      }}>
        <div style={{ maxWidth: "720px", margin: "0 auto" }}>

          {/* Live pill */}
          <div style={{
            display:      "inline-flex",
            alignItems:   "center",
            gap:          "7px",
            background:   liveStatus === "live" ? "#F0FDF4" : liveStatus === "stale" ? "#FFFBEB" : "#FEF2F2",
            border:       `1px solid ${liveStatus === "live" ? "#BBF7D0" : liveStatus === "stale" ? "#FDE68A" : "#FECACA"}`,
            borderRadius: "20px",
            padding:      "5px 12px 5px 8px",
            marginBottom: "20px",
          }}>
            <LiveDot status={liveStatus} />
            <span style={{
              fontSize:   "12px",
              fontWeight: 600,
              color:      liveStatus === "live" ? "#15803D" : liveStatus === "stale" ? "#92400E" : "#991B1B",
            }}>
              {liveStatus === "live"  && "Live — updating every 4s"}
              {liveStatus === "stale" && "No new transactions"}
              {liveStatus === "error" && "Reconnecting…"}
            </span>
          </div>

          <h1 style={{
            fontSize:      "clamp(28px, 4vw, 40px)",
            fontWeight:    700,
            color:         "#0A2540",
            margin:        "0 0 10px",
            letterSpacing: "-0.025em",
            lineHeight:    1.1,
          }}>
            Transaction History
          </h1>
          <p style={{ fontSize: "16px", color: "#64748B", margin: "0 0 36px", lineHeight: 1.6 }}>
            Every agent payment that settles on Arbitrum One.
          </p>

          {/* Stat cards */}
          {stats && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
              <StatCard label="Total executions"   value={String(stats.jobsToday)}    color="#2563EB" />
              <StatCard label="Total USDC settled" value={`$${stats.usdcToday}`}      color="#059669" />
              <StatCard label="Agents registered"  value={String(stats.agentsActive)} color="#7c3aed" />
            </div>
          )}
        </div>
      </div>

      {/* Feed */}
      <div style={{ maxWidth: "720px", margin: "0 auto", padding: "32px 24px 0" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {txs.length === 0 ? (
            <EmptyState />
          ) : (
            txs.map((tx) => {
              const key = tx.type === "flow" ? tx.flowJobId : tx.id;
              return (
                <div key={key} style={{ animation: tx.isNew ? "slideIn 0.3s ease forwards" : "none" }}>
                  {tx.type === "flow"
                    ? <FlowCard tx={tx} />
                    : <TransactionCard tx={tx} />
                  }
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div style={{
          display:        "flex",
          alignItems:     "center",
          justifyContent: "center",
          gap:            "8px",
          margin:         "48px 0 64px",
          color:          "#94A3B8",
        }}>
          <span style={{ fontSize: "13px" }}>All transactions settle on</span>
          <span style={{ fontSize: "13px", fontWeight: 600, color: "#2563EB" }}>Arbitrum One</span>
          <span style={{
            fontSize:     "11px",
            background:   "#EFF6FF",
            border:       "1px solid #BFDBFE",
            padding:      "2px 8px",
            borderRadius: "20px",
            color:        "#3B82F6",
            fontFamily:   "'JetBrains Mono', monospace",
          }}>
            eip155:42161
          </span>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{
      background:   "#fff",
      border:       "1px solid #E3E8EF",
      borderRadius: "14px",
      padding:      "18px 16px",
      textAlign:    "center",
      boxShadow:    "0 1px 4px rgba(10,37,64,0.04)",
    }}>
      <p style={{
        fontSize:   "24px",
        fontWeight: 700,
        color,
        margin:     "0 0 4px",
        fontFamily: "'JetBrains Mono', monospace",
        lineHeight: 1,
      }}>
        {value}
      </p>
      <p style={{ fontSize: "12px", color: "#94A3B8", margin: 0, fontWeight: 500 }}>{label}</p>
    </div>
  );
}

function LiveDot({ status }: { status: "live" | "stale" | "error" }) {
  const colors = { live: "#22C55E", stale: "#F59E0B", error: "#EF4444" };
  return (
    <div style={{
      width:        "7px",
      height:       "7px",
      borderRadius: "50%",
      background:   colors[status],
      animation:    status === "live" ? "pulse 2s ease-in-out infinite" : "none",
      flexShrink:   0,
    }} />
  );
}

function EmptyState() {
  return (
    <div style={{
      textAlign:    "center",
      padding:      "72px 0",
      background:   "#fff",
      borderRadius: "16px",
      border:       "1px solid #E3E8EF",
    }}>
      <div style={{
        width:        "48px",
        height:       "48px",
        borderRadius: "50%",
        background:   "#EFF6FF",
        display:      "flex",
        alignItems:   "center",
        justifyContent:"center",
        margin:       "0 auto 16px",
        fontSize:     "22px",
      }}>
        📭
      </div>
      <p style={{ fontSize: "15px", fontWeight: 600, color: "#0A2540", margin: "0 0 6px" }}>
        No transactions yet
      </p>
      <p style={{ fontSize: "13px", color: "#94A3B8", margin: 0 }}>
        Transactions appear here within seconds of settling.
      </p>
    </div>
  );
}
