"use client";

import { useState } from "react";
import Link from "next/link";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { parseEther, parseEventLogs } from "viem";
import { REGISTRY_ABI } from "@/lib/registry-abi";
import { apiFetch, CATEGORY_LABELS } from "@/lib/utils";
import { authFetch } from "@/lib/auth";
import { useAuth } from "@/context/AuthContext";
import { SignInButton } from "@/components/SignInButton";

type Step = 1 | 2 | 3 | 4 | 5;

const PERMISSIONS = [
  { key: "read_wallet", label: "Read wallet balance" },
  { key: "execute_transactions", label: "Execute transactions" },
  { key: "access_external_apis", label: "Access external APIs" },
  { key: "manage_other_agents", label: "Manage other agents" },
];

const PRICING_OPTIONS = [
  { value: "PER_CALL", label: "Per Call" },
  { value: "PER_DAY", label: "Per Day" },
  { value: "PER_MONTH", label: "Per Month" },
  { value: "FREE", label: "Free" },
];

const REGISTRY = process.env.NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS as `0x${string}`;
const STAKE = parseEther("0.01");

export default function RegisterPage() {
  const { address, isConnected } = useAccount();
  const { isSignedIn } = useAuth();
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "",
    subcategory: "",
    version: "1.0.0",
    endpoint: "",
    pricingModel: "PER_CALL",
    priceEth: "0.001",
    permissions: [] as string[],
    logoUrl: "",
  });
  const [endpointStatus, setEndpointStatus] = useState<null | { success: boolean; ms?: number }>(null);
  const [pingLoading, setPingLoading] = useState(false);
  const [profileId, setProfileId] = useState("");
  const [registeredAgentId, setRegisteredAgentId] = useState<number | null>(null);
  const [error, setError] = useState("");

  const { writeContract, data: txHash, isPending: isTxPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isTxConfirmed, data: receipt } =
    useWaitForTransactionReceipt({ hash: txHash });

  // Step 2: test endpoint
  async function testEndpoint() {
    setPingLoading(true);
    setEndpointStatus(null);
    try {
      const result = await apiFetch<{ success: boolean; responseTimeMs?: number }>("/api/agents/pre-verify", {
        method: "POST",
        body: JSON.stringify({ endpoint: form.endpoint }),
      });
      setEndpointStatus({ success: result.success, ms: result.responseTimeMs });
    } catch {
      setEndpointStatus({ success: false });
    } finally {
      setPingLoading(false);
    }
  }

  // Step 4: submit to backend, get hash, then trigger wallet tx
  async function handleRegister() {
    setError("");
    try {
      const data = await apiFetch<{ metadataHash: `0x${string}`; profileId: string }>(
        "/api/agents/register",
        {
          method: "POST",
          body: JSON.stringify({ ...form, ownerAddress: address }),
        }
      );
      setProfileId(data.profileId);

      writeContract({
        address: REGISTRY,
        abi: REGISTRY_ABI,
        functionName: "registerAgent",
        args: [data.metadataHash as `0x${string}`],
        value: STAKE,
      });
    } catch (e: unknown) {
      setError((e as Error).message);
    }
  }

  // When tx confirmed, parse agentId from event and confirm with backend
  async function confirmOnChain() {
    if (!receipt || !txHash) return;
    try {
      const events = parseEventLogs({
        abi: REGISTRY_ABI,
        logs: receipt.logs,
        eventName: "AgentRegistered",
      });
      const agentId = Number((events[0] as { args: { agentId: bigint } }).args.agentId);
      setRegisteredAgentId(agentId);

      const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
      const confirmRes = await authFetch(`${API}/api/agents/confirm`, {
        method: "POST",
        body: JSON.stringify({ profileId, agentId, txHash }),
      });
      if (!confirmRes.ok) {
        const err = await confirmRes.json();
        throw new Error(err.error ?? "Confirm failed");
      }

      setStep(5);
    } catch (e: unknown) {
      setError((e as Error).message);
    }
  }

  // Auto-confirm when tx lands
  if (isTxConfirmed && step === 4 && registeredAgentId === null) {
    confirmOnChain();
  }

  const field = (key: keyof typeof form, val: string) =>
    setForm((f) => ({ ...f, [key]: val }));

  const togglePermission = (key: string) =>
    setForm((f) => ({
      ...f,
      permissions: f.permissions.includes(key)
        ? f.permissions.filter((p) => p !== key)
        : [...f.permissions, key],
    }));

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <p className="text-4xl mb-6">✦</p>
          <h1 className="font-display font-bold text-3xl text-white mb-3">Register Your Agent</h1>
          <p className="text-muted mb-8">Connect your wallet to publish an agent in the MilkyWay universe.</p>
          <ConnectButton />
        </div>
      </div>
    );
  }

  const inputClass =
    "w-full bg-white/5 border border-white/10 rounded-btn px-4 py-2.5 text-sm text-white placeholder-muted focus:outline-none focus:border-accent/50 transition-colors";

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-10">
          {([1, 2, 3, 4] as const).map((s) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  step > s
                    ? "bg-success text-white"
                    : step === s
                    ? "bg-accent text-white"
                    : "bg-white/5 text-muted"
                }`}
              >
                {step > s ? "✓" : s}
              </div>
              {s < 4 && <div className={`h-px flex-1 ${step > s ? "bg-success" : "bg-white/10"}`} />}
            </div>
          ))}
        </div>

        {/* Step 2 — Profile */}
        {step === 2 && (
          <div className="space-y-5">
            <h2 className="font-display font-bold text-2xl text-white">Agent Profile</h2>
            <div>
              <label className="text-muted text-xs mb-1.5 block">Name *</label>
              <input className={inputClass} value={form.name} onChange={(e) => field("name", e.target.value)} placeholder="My Awesome Agent" />
            </div>
            <div>
              <label className="text-muted text-xs mb-1.5 block">Description * (max 500 chars)</label>
              <textarea
                className={inputClass + " resize-none h-24"}
                value={form.description}
                onChange={(e) => field("description", e.target.value.slice(0, 500))}
                placeholder="What does your agent do?"
              />
              <p className="text-muted text-xs mt-1 text-right">{form.description.length}/500</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-muted text-xs mb-1.5 block">Category *</label>
                <select className={inputClass + " cursor-pointer"} value={form.category} onChange={(e) => field("category", e.target.value)}>
                  <option value="">Select…</option>
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-muted text-xs mb-1.5 block">Subcategory</label>
                <input className={inputClass} value={form.subcategory} onChange={(e) => field("subcategory", e.target.value)} placeholder="e.g. Yield Farming" />
              </div>
            </div>
            <div>
              <label className="text-muted text-xs mb-1.5 block">Version</label>
              <input className={inputClass} value={form.version} onChange={(e) => field("version", e.target.value)} />
            </div>
            <div>
              <label className="text-muted text-xs mb-1.5 block">Endpoint URL * (https://)</label>
              <div className="flex gap-2">
                <input
                  className={inputClass}
                  value={form.endpoint}
                  onChange={(e) => { field("endpoint", e.target.value); setEndpointStatus(null); }}
                  placeholder="https://my-agent.example.com"
                />
                <button
                  onClick={testEndpoint}
                  disabled={pingLoading || !form.endpoint}
                  className="px-4 py-2.5 bg-accent/10 border border-accent/30 text-accent rounded-btn text-sm font-medium hover:bg-accent/20 transition-colors disabled:opacity-40 whitespace-nowrap"
                >
                  {pingLoading ? "…" : "Test"}
                </button>
              </div>
              {endpointStatus && (
                <p className={`text-xs mt-2 ${endpointStatus.success ? "text-success" : "text-red-400"}`}>
                  {endpointStatus.success
                    ? `✅ Endpoint is live (${endpointStatus.ms}ms)`
                    : "❌ Cannot reach endpoint — ensure GET /health returns 200"}
                </p>
              )}
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setStep(1)} className="flex-1 bg-white/5 border border-white/10 text-white rounded-btn py-3 text-sm font-medium hover:bg-white/10 transition-colors">
                ← Back
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!form.name || !form.description || !form.category || !form.endpoint || !endpointStatus?.success}
                className="flex-1 bg-accent hover:bg-accent-hover text-white rounded-btn py-3 text-sm font-semibold transition-colors disabled:opacity-40"
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* Step 3 — Pricing */}
        {step === 3 && (
          <div className="space-y-5">
            <h2 className="font-display font-bold text-2xl text-white">Pricing & Permissions</h2>
            <div>
              <label className="text-muted text-xs mb-2 block">Pricing Model</label>
              <div className="grid grid-cols-2 gap-2">
                {PRICING_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    onClick={() => field("pricingModel", o.value)}
                    className={`py-2.5 rounded-btn text-sm font-medium border transition-colors ${
                      form.pricingModel === o.value
                        ? "bg-accent/20 border-accent/50 text-accent"
                        : "bg-white/5 border-white/10 text-muted hover:text-white"
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
            {form.pricingModel !== "FREE" && (
              <div>
                <label className="text-muted text-xs mb-1.5 block">Price (ETH)</label>
                <input
                  className={inputClass}
                  value={form.priceEth}
                  onChange={(e) => field("priceEth", e.target.value)}
                  placeholder="0.001"
                />
              </div>
            )}
            <div>
              <label className="text-muted text-xs mb-3 block">Permissions Required</label>
              <div className="space-y-2">
                {PERMISSIONS.map((p) => (
                  <label key={p.key} className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-btn cursor-pointer hover:border-accent/30 transition-colors">
                    <input
                      type="checkbox"
                      checked={form.permissions.includes(p.key)}
                      onChange={() => togglePermission(p.key)}
                      className="accent-accent w-4 h-4"
                    />
                    <span className="text-sm text-muted">{p.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setStep(2)} className="flex-1 bg-white/5 border border-white/10 text-white rounded-btn py-3 text-sm font-medium hover:bg-white/10 transition-colors">
                ← Back
              </button>
              <button onClick={() => setStep(4)} className="flex-1 bg-accent hover:bg-accent-hover text-white rounded-btn py-3 text-sm font-semibold transition-colors">
                Review →
              </button>
            </div>
          </div>
        )}

        {/* Step 4 — Review + Stake */}
        {step === 4 && (
          <div className="space-y-5">
            <h2 className="font-display font-bold text-2xl text-white">Review & Stake</h2>
            <div className="p-5 bg-space-card border border-white/8 rounded-card space-y-3 text-sm">
              <Row label="Name" value={form.name} />
              <Row label="Category" value={CATEGORY_LABELS[form.category] ?? form.category} />
              <Row label="Endpoint" value={form.endpoint.slice(0, 50) + (form.endpoint.length > 50 ? "…" : "")} />
              <Row label="Pricing" value={form.pricingModel === "FREE" ? "Free" : `${form.priceEth} ETH / ${form.pricingModel.toLowerCase().replace("per_", "")}`} />
              {form.permissions.length > 0 && (
                <Row label="Permissions" value={form.permissions.join(", ")} />
              )}
            </div>

            <div className="p-5 bg-accent/5 border border-accent/20 rounded-card">
              <p className="text-white font-semibold mb-1">Stake required: 0.01 ETH</p>
              <p className="text-muted text-xs">Your stake is returned in full when you deactivate your agent.</p>
            </div>

            {!isSignedIn && (
              <div className="p-5 bg-white/5 border border-white/10 rounded-card text-center">
                <p className="text-muted text-sm mb-3">Sign in to verify ownership before registering.</p>
                <SignInButton />
              </div>
            )}

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-btn text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button onClick={() => setStep(3)} className="flex-1 bg-white/5 border border-white/10 text-white rounded-btn py-3 text-sm font-medium hover:bg-white/10 transition-colors" disabled={isTxPending || isConfirming}>
                ← Back
              </button>
              <button
                onClick={handleRegister}
                disabled={isTxPending || isConfirming || !isSignedIn}
                className="flex-1 bg-accent hover:bg-accent-hover text-white rounded-btn py-3 text-sm font-semibold transition-colors disabled:opacity-60"
              >
                {isTxPending ? "Check Wallet…" : isConfirming ? "Confirming…" : "Register Agent ✦"}
              </button>
            </div>
          </div>
        )}

        {/* Step 1 — Wallet connected, go to step 2 */}
        {step === 1 && (
          <div className="space-y-5">
            <h2 className="font-display font-bold text-2xl text-white">Wallet Connected</h2>
            <div className="p-5 bg-space-card border border-white/8 rounded-card">
              <p className="text-muted text-xs mb-1">Connected as</p>
              <p className="font-mono-custom text-accent text-sm">{address}</p>
            </div>
            <p className="text-muted text-sm">
              Your agent NFT will be minted to this address. Make sure it&apos;s the wallet you want to use as the builder identity.
            </p>
            <button
              onClick={() => setStep(2)}
              className="w-full bg-accent hover:bg-accent-hover text-white rounded-btn py-3 text-sm font-semibold transition-colors"
            >
              Continue →
            </button>
          </div>
        )}

        {/* Step 5 — Success */}
        {step === 5 && (
          <div className="text-center space-y-6 py-10">
            <div className="w-20 h-20 mx-auto bg-accent/10 border border-accent/30 rounded-full flex items-center justify-center animate-star-appear">
              <span className="text-3xl">✦</span>
            </div>
            <h2 className="font-display font-bold text-3xl text-white">Your agent is live!</h2>
            <p className="text-muted">
              Agent #{registeredAgentId} is now in the MilkyWay universe. The oracle will verify it within 24 hours.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href={`/agents/${registeredAgentId}`}
                className="bg-accent hover:bg-accent-hover text-white rounded-btn px-6 py-3 text-sm font-semibold transition-colors"
              >
                View Your Agent →
              </Link>
              <button
                onClick={() => {
                  setStep(1);
                  setForm({ name: "", description: "", category: "", subcategory: "", version: "1.0.0", endpoint: "", pricingModel: "PER_CALL", priceEth: "0.001", permissions: [], logoUrl: "" });
                  setEndpointStatus(null);
                  setProfileId("");
                  setRegisteredAgentId(null);
                }}
                className="bg-white/5 border border-white/10 text-white rounded-btn px-6 py-3 text-sm font-medium hover:bg-white/10 transition-colors"
              >
                Register Another
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted">{label}</span>
      <span className="text-white text-right max-w-xs break-all">{value}</span>
    </div>
  );
}
