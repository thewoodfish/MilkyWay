"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits } from "viem";
import { SettingsSidebar } from "@/components/SettingsSidebar";
import { authFetch } from "@/lib/auth";
import { useAuth } from "@/context/AuthContext";
import { AuthGate } from "@/components/AuthGate";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const USDC_ADDRESS = "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d" as `0x${string}`;

const USDC_ABI = [
  {
    name: "approve", type: "function",
    inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }],
    outputs: [{ type: "bool" }],
  },
] as const;

interface SpendLimit {
  id:           string;
  agentId:      number;
  agentName:    string;
  agentLogoUrl: string | null;
  agentSlug:    string | null;
  agentAddress: string;
  token:        string;
  maxPerTx:     string;
  maxLifetime:  string;
  spentToDate:  string;
  createdAt:    string;
  active:       boolean;
}

function fmt(raw: string): string {
  return (parseInt(raw) / 1_000_000).toFixed(2);
}

function timeAgo(iso: string): string {
  const d = Date.now() - new Date(iso).getTime();
  const m = Math.floor(d / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function RevokeModal({
  limit,
  onClose,
  onRevoked,
}: {
  limit: SpendLimit;
  onClose: () => void;
  onRevoked: () => void;
}) {
  const [step,   setStep]   = useState<"confirm" | "revoking" | "done">("confirm");
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [error,  setError]  = useState<string | null>(null);

  const { writeContractAsync } = useWriteContract();
  const { isSuccess: confirmed } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (confirmed && step === "revoking") {
      // On-chain revoke is done — update UI immediately, don't block on backend
      setStep("done");
      onRevoked();

      // Sync DB in background; retry once if first attempt fails
      const sync = () => authFetch(`${API}/api/permissions/revoke`, {
        method: "POST",
        body: JSON.stringify({ agentId: limit.agentId }),
      });
      sync().catch(() => setTimeout(() => sync().catch(console.error), 3000));
    }
  }, [confirmed, step, limit.agentId, onRevoked]);

  async function handleRevoke() {
    setError(null);
    setStep("revoking");
    try {
      const hash = await writeContractAsync({
        address: USDC_ADDRESS, abi: USDC_ABI, functionName: "approve",
        args: [limit.agentAddress as `0x${string}`, BigInt(0)],
      });
      setTxHash(hash);
    } catch (err) {
      setError((err as Error).message ?? "Wallet rejected");
      setStep("confirm");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.45)" }}>
      <div style={{ background: "#fff", borderRadius: "16px", width: "100%", maxWidth: "400px", padding: "24px", boxShadow: "0 24px 60px rgba(0,0,0,0.18)" }}>
        {step === "confirm" && (
          <>
            <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#0A2540", margin: "0 0 8px" }}>
              Revoke {limit.agentName}&apos;s spend permission?
            </h2>
            <p style={{ fontSize: "13px", color: "#64748b", margin: "0 0 16px", lineHeight: 1.6 }}>
              This will call <code style={{ background: "#F1F5F9", padding: "1px 5px", borderRadius: "4px", fontSize: "12px" }}>USDC.approve(agent, 0)</code> on-chain,
              immediately preventing this agent from spending USDC.
            </p>
            <div style={{ fontSize: "12px", color: "#64748b", background: "#F8FAFF", borderRadius: "8px", padding: "10px 12px", marginBottom: "16px", lineHeight: 1.6 }}>
              <p style={{ margin: "0 0 4px", fontWeight: 600, color: "#0A2540" }}>This will:</p>
              <p style={{ margin: "2px 0" }}>• Set allowance to 0 on Arbitrum</p>
              <p style={{ margin: "2px 0" }}>• Immediately block this agent from spending</p>
              <p style={{ margin: "2px 0" }}>• Cost a small amount of gas</p>
            </div>
            {error && <p style={{ fontSize: "12px", color: "#ef4444", marginBottom: "12px" }}>{error}</p>}
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={onClose}
                style={{ flex: 1, padding: "10px", borderRadius: "10px", border: "1px solid #E3E8EF", background: "#fff", fontSize: "13px", fontWeight: 600, color: "#64748b", cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                onClick={handleRevoke}
                style={{ flex: 1, padding: "10px", borderRadius: "10px", border: "none", background: "#ef4444", fontSize: "13px", fontWeight: 700, color: "#fff", cursor: "pointer" }}
              >
                Revoke Access
              </button>
            </div>
          </>
        )}
        {step === "revoking" && (
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <p style={{ fontSize: "28px", margin: "0 0 10px" }}>⏳</p>
            <p style={{ fontSize: "15px", fontWeight: 700, color: "#0A2540", margin: "0 0 6px" }}>Revoking access…</p>
            <p style={{ fontSize: "13px", color: "#94a3b8", margin: 0 }}>Confirm in your wallet</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SpendLimitsPage() {
  const { isSignedIn: isAuthenticated } = useAuth();
  const [limits,   setLimits]   = useState<SpendLimit[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [revoking, setRevoking] = useState<SpendLimit | null>(null);

  const fetchLimits = useCallback(async () => {
    try {
      const r = await authFetch(`${API}/api/permissions/my`);
      const data = await r.json();
      setLimits(Array.isArray(data) ? data : []);
    } catch {
      setLimits([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (isAuthenticated) fetchLimits(); }, [isAuthenticated, fetchLimits]);

  return (
    <AuthGate description="Sign in to manage your agent spend limits.">
      <div className="min-h-screen" style={{ background: "#F8FAFF" }}>
        <div className="max-w-[1100px] mx-auto px-6 py-10">
          <div className="flex gap-10">
            <SettingsSidebar />

            <div className="flex-1 min-w-0">
              <div className="mb-8">
                <h1 className="text-[22px] font-bold" style={{ color: "#0A2540", letterSpacing: "-0.02em" }}>Spend Limits</h1>
                <p className="text-[14px] mt-1" style={{ color: "#64748b" }}>
                  Control how much agents can spend on your behalf. Revoke or adjust limits at any time.
                </p>
              </div>

              {loading ? (
                <div style={{ textAlign: "center", padding: "48px 0", color: "#94a3b8", fontSize: "14px" }}>Loading…</div>
              ) : limits.length === 0 ? (
                <div style={{ border: "2px dashed #E3E8EF", borderRadius: "16px", padding: "48px 24px", textAlign: "center" }}>
                  <p style={{ fontSize: "28px", margin: "0 0 12px" }}>⚡</p>
                  <p style={{ fontSize: "15px", fontWeight: 700, color: "#0A2540", margin: "0 0 6px" }}>No spend limits granted yet</p>
                  <p style={{ fontSize: "13px", color: "#94a3b8", margin: "0 0 20px", lineHeight: 1.6 }}>
                    They appear here when you activate agents that can execute transactions.
                  </p>
                  <Link href="/agents" style={{ fontSize: "13px", fontWeight: 600, color: "#2563EB", textDecoration: "none" }}>
                    Browse agents →
                  </Link>
                </div>
              ) : (
                <div style={{ border: "1px solid #E3E8EF", borderRadius: "16px", overflow: "hidden", background: "#fff" }}>
                  {/* Table header */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 100px 100px 100px 120px", gap: "12px", padding: "12px 20px", background: "#F8FAFF", borderBottom: "1px solid #E3E8EF" }}>
                    {["Agent", "Per tx", "Lifetime", "Remaining", "Actions"].map((h) => (
                      <span key={h} style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#94a3b8" }}>{h}</span>
                    ))}
                  </div>

                  {limits.map((limit, i) => {
                    const remaining = Math.max(0, parseInt(limit.maxLifetime) - parseInt(limit.spentToDate));
                    const dicebear = `https://api.dicebear.com/9.x/bottts/svg?seed=milkyway-${limit.agentId}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf&scale=85`;
                    return (
                      <div
                        key={limit.id}
                        style={{
                          display: "grid", gridTemplateColumns: "1fr 100px 100px 100px 120px",
                          gap: "12px", padding: "16px 20px", alignItems: "center",
                          borderBottom: i < limits.length - 1 ? "1px solid #F1F5F9" : "none",
                        }}
                      >
                        {/* Agent */}
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                          <img
                            src={limit.agentLogoUrl || dicebear}
                            alt={limit.agentName}
                            width={32} height={32}
                            style={{ borderRadius: "8px", border: "1px solid #E3E8EF", flexShrink: 0 }}
                          />
                          <div style={{ minWidth: 0 }}>
                            <p style={{ fontSize: "13px", fontWeight: 600, color: "#0A2540", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {limit.agentName}
                            </p>
                            <p style={{ fontSize: "11px", color: "#94a3b8", margin: 0 }}>Granted {timeAgo(limit.createdAt)}</p>
                          </div>
                        </div>

                        {/* Per tx */}
                        <span style={{ fontSize: "13px", fontWeight: 600, color: "#0A2540", fontFamily: "monospace" }}>
                          {fmt(limit.maxPerTx)} {limit.token}
                        </span>

                        {/* Lifetime */}
                        <span style={{ fontSize: "13px", color: "#64748b", fontFamily: "monospace" }}>
                          {fmt(limit.maxLifetime)} {limit.token}
                        </span>

                        {/* Remaining */}
                        <span style={{ fontSize: "13px", fontWeight: 600, color: remaining > 0 ? "#10b981" : "#ef4444", fontFamily: "monospace" }}>
                          {fmt(String(remaining))} {limit.token}
                        </span>

                        {/* Actions */}
                        <button
                          onClick={() => setRevoking(limit)}
                          style={{ fontSize: "12px", fontWeight: 600, color: "#ef4444", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "8px", padding: "6px 12px", cursor: "pointer" }}
                        >
                          Revoke
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {revoking && (
        <RevokeModal
          limit={revoking}
          onClose={() => setRevoking(null)}
          onRevoked={() => { setRevoking(null); fetchLimits(); }}
        />
      )}
    </AuthGate>
  );
}
