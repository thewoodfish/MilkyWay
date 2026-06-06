"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from "wagmi";
import { parseEther, parseEventLogs } from "viem";
import { REGISTRY_ABI } from "@/lib/registry-abi";
import { authFetch } from "@/lib/auth";
import { AuthGate } from "@/components/AuthGate";

const REGISTRY = process.env.NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS as `0x${string}`;
const API      = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const STAKE    = parseEther("0.01");

export default function StakePage() {
  return (
    <AuthGate description="Sign in to complete your agent registration.">
      <StakeFlow />
    </AuthGate>
  );
}

function StakeFlow() {
  const searchParams  = useSearchParams();
  const router        = useRouter();
  const profileId     = searchParams.get("profileId") ?? "";
  const hash          = searchParams.get("hash") as `0x${string}` | null;

  const { address }   = useAccount();
  const publicClient  = usePublicClient();

  const [agentName, setAgentName]   = useState<string>("");
  const [error, setError]           = useState("");
  const [confirming, setConfirming] = useState(false);
  const [done, setDone]             = useState(false);
  const [agentSlug, setAgentSlug]   = useState("");

  const {
    writeContract,
    data: txHash,
    isPending: isTxPending,
    error: txError,
  } = useWriteContract();

  const { data: receipt, isSuccess: isTxConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  // Fetch agent name for display
  useEffect(() => {
    if (!profileId) return;
    fetch(`${API}/api/agents/pending/${profileId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.name) setAgentName(d.name); })
      .catch(() => {});
  }, [profileId]);

  // Confirm on-chain once tx is confirmed
  useEffect(() => {
    if (!isTxConfirmed || !receipt || !txHash || confirming || done) return;
    confirmOnChain();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTxConfirmed]);

  async function handleStake() {
    if (!hash) return setError("Missing metadata hash.");
    setError("");
    try {
      const block        = await publicClient!.getBlock({ blockTag: "latest" });
      const baseFee      = block.baseFeePerGas ?? BigInt(20_000_000);
      const maxFeePerGas = (baseFee * BigInt(15)) / BigInt(10);

      writeContract({
        address: REGISTRY,
        abi: REGISTRY_ABI,
        functionName: "registerAgent",
        args: [hash],
        value: STAKE,
        maxFeePerGas,
        maxPriorityFeePerGas: BigInt(1_000_000),
      });
    } catch (e: unknown) {
      setError((e as Error).message);
    }
  }

  async function confirmOnChain() {
    if (!receipt || !txHash) return;
    setConfirming(true);
    try {
      const events  = parseEventLogs({ abi: REGISTRY_ABI, logs: receipt.logs, eventName: "AgentRegistered" });
      const agentId = Number((events[0] as { args: { agentId: bigint } }).args.agentId);

      const res = await authFetch(`${API}/api/agents/confirm`, {
        method: "POST",
        body: JSON.stringify({ profileId, agentId, txHash }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Confirm failed");
      const data = await res.json();
      if (data.agent?.slug) setAgentSlug(data.agent.slug);
      setDone(true);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setConfirming(false);
    }
  }

  if (!profileId || !hash) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#f8faff" }}>
        <p style={{ color: "#ef4444" }}>Invalid staking link.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "#f8faff" }}>
      <div
        className="w-full max-w-[440px] rounded-3xl px-10 py-12 text-center"
        style={{ background: "#fff", border: "1px solid #E3E8EF", boxShadow: "0 8px 40px rgba(10,37,64,0.08)" }}
      >
        {/* Logo dot */}
        <div className="inline-flex items-center gap-2 mb-8">
          <span className="w-2 h-2 rounded-full" style={{ background: "#2563EB", boxShadow: "0 0 6px rgba(37,99,235,0.6)" }} />
          <span className="font-bold text-[17px]" style={{ color: "#2563EB" }}>MilkyWay</span>
        </div>

        {done ? (
          <>
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: "#ECFDF5" }}>
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="#10b981" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="font-bold text-[24px] mb-3" style={{ color: "#0A2540" }}>Agent live!</h1>
            <p className="text-[14px] mb-8" style={{ color: "#64748b" }}>
              {agentName || "Your agent"} is registered and active on MilkyWay.
            </p>
            <button
              onClick={() => router.push(agentSlug ? `/agents/${agentSlug}` : "/dashboard")}
              className="w-full py-3 rounded-xl font-semibold text-[14px]"
              style={{ background: "#2563EB", color: "#fff" }}
            >
              View agent profile →
            </button>
          </>
        ) : (
          <>
            <h1 className="font-bold text-[24px] mb-3" style={{ color: "#0A2540" }}>
              One last step
            </h1>
            <p className="text-[14px] mb-8" style={{ color: "#64748b" }}>
              Stake <strong>0.01 ETH</strong> to mint your agent NFT and go live on the registry.
              {agentName && <><br /><span className="font-medium" style={{ color: "#0A2540" }}>{agentName}</span></>}
            </p>

            {/* Cost row */}
            <div className="flex justify-between items-center px-4 py-3 rounded-xl mb-8" style={{ background: "#F8FAFF", border: "1px solid #E3E8EF" }}>
              <span className="text-[13px]" style={{ color: "#64748b" }}>Registration stake</span>
              <span className="text-[14px] font-bold" style={{ color: "#2563EB" }}>0.01 ETH</span>
            </div>

            {(error || txError) && (
              <p className="text-[13px] mb-4" style={{ color: "#ef4444" }}>
                {error || txError?.message}
              </p>
            )}

            {isTxPending && (
              <p className="text-[13px] mb-4" style={{ color: "#64748b" }}>Check your wallet…</p>
            )}

            {txHash && !isTxConfirmed && !isTxPending && (
              <p className="text-[13px] mb-4" style={{ color: "#64748b" }}>Waiting for confirmation…</p>
            )}

            {confirming && (
              <p className="text-[13px] mb-4" style={{ color: "#64748b" }}>Activating agent…</p>
            )}

            {!txHash && (
              <button
                onClick={handleStake}
                disabled={isTxPending || !address}
                className="w-full py-3 rounded-xl font-semibold text-[14px] transition-opacity disabled:opacity-50"
                style={{ background: "#2563EB", color: "#fff" }}
              >
                Stake 0.01 ETH →
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
