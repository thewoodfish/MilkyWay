"use client";

import { useState, useEffect } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits } from "viem";
import { PermissionsList, PermissionDeclaration } from "./PermissionsList";
import { SpendLimitInput } from "./SpendLimitInput";
import { AgentAvatar } from "./AgentAvatar";
import { authFetch } from "@/lib/auth";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const USDC_ADDRESS = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831" as `0x${string}`;

const USDC_ABI = [
  {
    name: "approve", type: "function",
    inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }],
    outputs: [{ type: "bool" }],
  },
] as const;

type Step = "review" | "approving" | "done";

interface Props {
  agentId:     number;
  agentName:   string;
  logoUrl?:    string | null;
  badgeTier:   string;
  priceUsdc:   string;
  agentWallet: string;
  permissions: PermissionDeclaration[];
  onConfirm:   (perTx: string, lifetime: string) => void;
  onClose:     () => void;
}

export function ActivationModal({
  agentId, agentName, logoUrl, badgeTier, priceUsdc,
  agentWallet, permissions, onConfirm, onClose,
}: Props) {
  const [step,     setStep]     = useState<Step>("review");
  const [perTx,    setPerTx]    = useState("500");
  const [lifetime, setLifetime] = useState("2000");
  const [error,    setError]    = useState<string | null>(null);
  const [txHash,   setTxHash]   = useState<`0x${string}` | undefined>();

  const hasExecute = permissions.some((p) => p.type === "EXECUTE_TRANSACTIONS");
  const execPerm   = permissions.find((p) => p.type === "EXECUTE_TRANSACTIONS");

  const { writeContractAsync } = useWriteContract();
  const { isSuccess: approved } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (approved && step === "approving" && txHash) {
      authFetch(`${API}/api/permissions/grant`, {
        method: "POST",
        body: JSON.stringify({
          agentId,
          maxPerTx:    String(Math.round(parseFloat(perTx) * 1_000_000)),
          maxLifetime: String(Math.round(parseFloat(lifetime) * 1_000_000)),
          txHash,
        }),
      })
        .then(() => { setStep("done"); onConfirm(perTx, lifetime); })
        .catch(() => { setStep("done"); onConfirm(perTx, lifetime); });
    }
  }, [approved, step, txHash, agentId, perTx, lifetime, onConfirm]);

  async function handleActivate() {
    setError(null);
    if (!hasExecute) { onConfirm(perTx, lifetime); return; }

    try {
      setStep("approving");
      const amountRaw = parseUnits(lifetime, 6);
      const hash = await writeContractAsync({
        address: USDC_ADDRESS, abi: USDC_ABI, functionName: "approve",
        args: [agentWallet as `0x${string}`, amountRaw],
      });
      setTxHash(hash);
    } catch (err) {
      setError((err as Error).message ?? "Wallet rejected");
      setStep("review");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.45)" }}
      onClick={(e) => { if (e.target === e.currentTarget && step === "review") onClose(); }}
    >
      <div style={{ background: "#fff", borderRadius: "20px", width: "100%", maxWidth: "420px", boxShadow: "0 24px 60px rgba(0,0,0,0.18)", overflow: "hidden" }}>
        {/* Header */}
        <div style={{ padding: "20px 20px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <AgentAvatar
              agentId={agentId} logoUrl={logoUrl}
              badgeTier={(badgeTier ?? "NONE") as "NONE" | "BRONZE" | "SILVER" | "GOLD"}
              size={40} showTooltip={false}
            />
            <div>
              <p style={{ fontSize: "14px", fontWeight: 700, color: "#0A2540", margin: 0 }}>{agentName}</p>
              <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0 }}>{priceUsdc} USDC / job</p>
            </div>
          </div>
          {step === "review" && (
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: "4px" }}>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          )}
        </div>

        <div style={{ padding: "16px 20px 20px", display: "flex", flexDirection: "column", gap: "14px" }}>
          {step === "review" && (
            <>
              {permissions.length > 0 && (
                <div>
                  <p style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#94a3b8", margin: "0 0 8px" }}>This agent will:</p>
                  <PermissionsList permissions={permissions} />
                </div>
              )}

              {hasExecute && (
                <SpendLimitInput
                  suggestedPerTx={execPerm?.max_per_transaction ?? "500"}
                  suggestedLifetime={execPerm?.max_lifetime ?? "2000"}
                  token="USDC"
                  onChange={(pt, lt) => { setPerTx(pt); setLifetime(lt); }}
                />
              )}

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", padding: "10px 12px", background: "#F8FAFF", borderRadius: "10px", border: "1px solid #E3E8EF" }}>
                <span style={{ color: "#64748b" }}>Job cost</span>
                <span style={{ fontWeight: 700, color: "#0A2540" }}>{priceUsdc} USDC</span>
              </div>

              {error && <p style={{ fontSize: "12px", color: "#ef4444", margin: 0 }}>{error}</p>}

              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  onClick={onClose}
                  style={{ flex: 1, padding: "11px", borderRadius: "10px", border: "1px solid #E3E8EF", background: "#fff", fontSize: "13px", fontWeight: 600, color: "#64748b", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleActivate}
                  style={{ flex: 1, padding: "11px", borderRadius: "10px", border: "none", background: "#2563EB", fontSize: "13px", fontWeight: 700, color: "#fff", cursor: "pointer" }}
                >
                  {hasExecute ? "Set Limit & Activate →" : "Activate →"}
                </button>
              </div>
            </>
          )}

          {step === "approving" && (
            <div style={{ textAlign: "center", padding: "24px 0" }}>
              <p style={{ fontSize: "28px", margin: "0 0 10px" }}>⏳</p>
              <p style={{ fontSize: "15px", fontWeight: 700, color: "#0A2540", margin: "0 0 6px" }}>Approving spend limit</p>
              <p style={{ fontSize: "13px", color: "#94a3b8", margin: 0 }}>Confirm the approval in your wallet. This sets a {lifetime} USDC limit.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
