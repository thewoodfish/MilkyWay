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

  // Mark stale if no new transaction in 5 minutes
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
        lastTxId.current  = firstId;
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
    <div style={{
      minHeight:  "100vh",
      background: "#09090B",
      color:      "#FAFAFA",
      fontFamily: "'Inter', sans-serif"
    }}>
      <div style={{ maxWidth: "680px", margin: "0 auto", padding: "64px 24px 0" }}>

        {/* Live indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
          <LiveDot status={liveStatus} />
          <span style={{ fontSize: "13px", color: "#52525B" }}>
            {liveStatus === "live"  && "Live"}
            {liveStatus === "stale" && "No new transactions"}
            {liveStatus === "error" && "Reconnecting…"}
          </span>
        </div>

        <h1 style={{
          fontSize:      "36px",
          fontWeight:    700,
          margin:        "0 0 12px 0",
          letterSpacing: "-0.02em"
        }}>
          Transaction History
        </h1>
        <p style={{ fontSize: "16px", color: "#71717A", margin: "0 0 48px 0" }}>
          Every agent payment that settles on Arbitrum One. Updated every 4 seconds.
        </p>

        {/* Stats bar */}
        {stats && (
          <div style={{
            display:             "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap:                 "16px",
            marginBottom:        "48px"
          }}>
            <StatCard label="Jobs today"    value={String(stats.jobsToday)}    />
            <StatCard label="USDC settled"  value={`${stats.usdcToday} USDC`}  />
            <StatCard label="Agents active" value={String(stats.agentsActive)} />
          </div>
        )}

        {/* Transaction feed */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {txs.length === 0 ? (
            <EmptyState />
          ) : (
            txs.map((tx) => {
              const key = tx.type === "flow" ? tx.flowJobId : tx.id;
              return (
                <div
                  key={key}
                  style={{
                    animation: tx.isNew ? "slideIn 0.3s ease forwards" : "none"
                  }}
                >
                  {tx.type === "flow"
                    ? <FlowCard tx={tx} />
                    : <TransactionCard tx={tx} />
                  }
                </div>
              );
            })
          )}
        </div>

        {/* Arbitrum badge */}
        <div style={{
          display:        "flex",
          alignItems:     "center",
          justifyContent: "center",
          gap:            "8px",
          margin:         "48px 0 64px",
          color:          "#3F3F46"
        }}>
          <span style={{ fontSize: "13px" }}>All transactions settle on</span>
          <span style={{ fontSize: "13px", fontWeight: 600, color: "#2563EB" }}>
            Arbitrum One
          </span>
          <span style={{
            fontSize:    "11px",
            background:  "#1C1C28",
            border:      "1px solid #27272A",
            padding:     "2px 8px",
            borderRadius:"20px",
            color:       "#52525B",
            fontFamily:  "'JetBrains Mono', monospace"
          }}>
            eip155:42161
          </span>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      background:   "#18181B",
      border:       "1px solid #27272A",
      borderRadius: "12px",
      padding:      "16px",
      textAlign:    "center"
    }}>
      <p style={{
        fontSize:  "22px",
        fontWeight:700,
        color:     "#FAFAFA",
        margin:    "0 0 4px 0",
        fontFamily:"'JetBrains Mono', monospace"
      }}>
        {value}
      </p>
      <p style={{ fontSize: "12px", color: "#52525B", margin: 0 }}>{label}</p>
    </div>
  );
}

function LiveDot({ status }: { status: "live" | "stale" | "error" }) {
  const colors = { live: "#22C55E", stale: "#F59E0B", error: "#EF4444" };
  return (
    <div style={{
      width:        "8px",
      height:       "8px",
      borderRadius: "50%",
      background:   colors[status],
      animation:    status === "live" ? "pulse 2s ease-in-out infinite" : "none",
      flexShrink:   0
    }} />
  );
}

function EmptyState() {
  return (
    <div style={{ textAlign: "center", padding: "64px 0", color: "#3F3F46" }}>
      <p style={{ fontSize: "15px", margin: 0 }}>No transactions yet.</p>
      <p style={{ fontSize: "13px", margin: "8px 0 0 0" }}>
        Transactions appear here within seconds of settling.
      </p>
    </div>
  );
}
