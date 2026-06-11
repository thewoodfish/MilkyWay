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
      if (Date.now() - lastTxTime.current > 5 * 60 * 1000) setLiveStatus("stale");
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
    } catch { /* non-fatal */ }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#060d1f", fontFamily: "'Inter', sans-serif" }}>

      {/* Hero header */}
      <div style={{
        background:   "linear-gradient(180deg, #0a1628 0%, #060d1f 100%)",
        borderBottom: "1px solid rgba(59,130,246,0.12)",
        padding:      "56px 24px 44px",
      }}>
        {/* subtle grid */}
        <div style={{
          position:        "absolute",
          inset:           0,
          pointerEvents:   "none",
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.015) 1px, transparent 1px)",
          backgroundSize:  "28px 28px",
        }} />
        {/* glow */}
        <div style={{
          position:   "absolute",
          top:        0,
          left:       "50%",
          transform:  "translateX(-50%)",
          width:      "700px",
          height:     "260px",
          background: "radial-gradient(ellipse at center, rgba(37,99,235,0.1) 0%, transparent 70%)",
          filter:     "blur(50px)",
          pointerEvents: "none",
        }} />

        <div style={{ maxWidth: "720px", margin: "0 auto", position: "relative" }}>

          {/* Live pill */}
          <div style={{
            display:      "inline-flex",
            alignItems:   "center",
            gap:          "7px",
            background:   liveStatus === "live"  ? "rgba(34,197,94,0.1)"  :
                          liveStatus === "stale" ? "rgba(245,158,11,0.1)" : "rgba(239,68,68,0.1)",
            border:       `1px solid ${liveStatus === "live"  ? "rgba(34,197,94,0.3)"  :
                                       liveStatus === "stale" ? "rgba(245,158,11,0.3)" : "rgba(239,68,68,0.3)"}`,
            borderRadius: "20px",
            padding:      "5px 12px 5px 8px",
            marginBottom: "20px",
          }}>
            <LiveDot status={liveStatus} />
            <span style={{
              fontSize:   "12px",
              fontWeight: 600,
              color:      liveStatus === "live"  ? "#4ade80" :
                          liveStatus === "stale" ? "#fbbf24" : "#f87171",
            }}>
              {liveStatus === "live"  && "Live — updating every 4s"}
              {liveStatus === "stale" && "No new transactions"}
              {liveStatus === "error" && "Reconnecting…"}
            </span>
          </div>

          <h1 style={{
            fontSize:      "clamp(28px, 4vw, 40px)",
            fontWeight:    700,
            color:         "#e8f0ff",
            margin:        "0 0 10px",
            letterSpacing: "-0.025em",
            lineHeight:    1.1,
          }}>
            Transaction History
          </h1>
          <p style={{ fontSize: "16px", color: "#4a6fa5", margin: "0 0 40px", lineHeight: 1.6 }}>
            Every agent payment that settles on Arbitrum One.
          </p>

          {/* Stat cards */}
          {stats && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
              <StatCard label="Total executions"   value={String(stats.jobsToday)}    color="#60a5fa" />
              <StatCard label="Total USDC settled" value={`$${stats.usdcToday}`}      color="#34d399" />
              <StatCard label="Agents registered"  value={String(stats.agentsActive)} color="#a78bfa" />
            </div>
          )}
        </div>
      </div>

      {/* Feed */}
      <div style={{ maxWidth: "720px", margin: "0 auto", padding: "32px 24px 0" }}>

        {txs.length === 0 ? (
          <EmptyState />
        ) : (
          /* Scroll container with top/bottom fade masks */
          <div style={{ position: "relative" }}>
            {/* top fade */}
            <div style={{
              position:   "absolute",
              top:        0,
              left:       0,
              right:      0,
              height:     "80px",
              background: "linear-gradient(to bottom, #060d1f 0%, transparent 100%)",
              zIndex:     10,
              pointerEvents: "none",
            }} />
            {/* bottom fade */}
            <div style={{
              position:   "absolute",
              bottom:     0,
              left:       0,
              right:      0,
              height:     "80px",
              background: "linear-gradient(to top, #060d1f 0%, transparent 100%)",
              zIndex:     10,
              pointerEvents: "none",
            }} />

            {/* scrolling ticker */}
            <div style={{
              height:     "640px",
              overflow:   "hidden",
              position:   "relative",
            }}>
              <div style={{
                display:   "flex",
                flexDirection: "column",
                gap:       "10px",
                animation: "scrollTicker 40s linear infinite",
              }}>
                {/* render list twice so it loops seamlessly */}
                {[...txs, ...txs].map((tx, i) => {
                  const key = `${tx.type === "flow" ? tx.flowJobId : tx.id}-${i}`;
                  return (
                    <div key={key}>
                      {tx.type === "flow"
                        ? <FlowCard tx={tx} />
                        : <TransactionCard tx={tx} />
                      }
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{
          display:        "flex",
          alignItems:     "center",
          justifyContent: "center",
          gap:            "8px",
          margin:         "48px 0 64px",
        }}>
          <span style={{ fontSize: "13px", color: "#2d4a7a" }}>All transactions settle on</span>
          <span style={{ fontSize: "13px", fontWeight: 600, color: "#3b82f6" }}>Arbitrum One</span>
          <span style={{
            fontSize:     "11px",
            background:   "rgba(59,130,246,0.1)",
            border:       "1px solid rgba(59,130,246,0.2)",
            padding:      "2px 8px",
            borderRadius: "20px",
            color:        "#4a6fa5",
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
      background:   "rgba(255,255,255,0.03)",
      border:       "1px solid rgba(59,130,246,0.15)",
      borderRadius: "14px",
      padding:      "18px 16px",
      textAlign:    "center",
      backdropFilter: "blur(8px)",
    }}>
      <p style={{
        fontSize:   "24px",
        fontWeight: 700,
        color,
        margin:     "0 0 5px",
        fontFamily: "'JetBrains Mono', monospace",
        lineHeight: 1,
      }}>
        {value}
      </p>
      <p style={{ fontSize: "12px", color: "#3a5580", margin: 0, fontWeight: 500 }}>{label}</p>
    </div>
  );
}

function LiveDot({ status }: { status: "live" | "stale" | "error" }) {
  const colors = { live: "#22c55e", stale: "#f59e0b", error: "#ef4444" };
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
      background:   "rgba(255,255,255,0.02)",
      borderRadius: "16px",
      border:       "1px solid rgba(59,130,246,0.1)",
    }}>
      <div style={{
        width:          "48px",
        height:         "48px",
        borderRadius:   "50%",
        background:     "rgba(59,130,246,0.1)",
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        margin:         "0 auto 16px",
        fontSize:       "22px",
      }}>
        📭
      </div>
      <p style={{ fontSize: "15px", fontWeight: 600, color: "#c8d8f0", margin: "0 0 6px" }}>
        No transactions yet
      </p>
      <p style={{ fontSize: "13px", color: "#2d4a7a", margin: 0 }}>
        Transactions appear here within seconds of settling.
      </p>
    </div>
  );
}
