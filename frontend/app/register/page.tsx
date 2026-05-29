"use client";

import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useSignMessage, useChainId } from "wagmi";
import { parseEther, parseEventLogs } from "viem";
import { REGISTRY_ABI } from "@/lib/registry-abi";
import { apiFetch, CATEGORY_LABELS } from "@/lib/utils";
import { authFetch, getNonce, buildSiweMessage, verifySignature } from "@/lib/auth";
import { useAuth } from "@/context/AuthContext";
import { AuthGate } from "@/components/AuthGate";

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

const STEPS = [
  { n: 1 as const, label: "Wallet" },
  { n: 2 as const, label: "Profile" },
  { n: 3 as const, label: "Pricing" },
  { n: 4 as const, label: "Review" },
];

const REGISTRY = process.env.NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS as `0x${string}`;
const STAKE = parseEther("0.01");

const inputStyle: CSSProperties = {
  width: "100%",
  background: "#fff",
  border: "1px solid #E3E8EF",
  borderRadius: "8px",
  padding: "10px 14px",
  fontSize: "14px",
  color: "#0A2540",
  outline: "none",
  transition: "border-color 0.15s",
};

const labelStyle: CSSProperties = {
  display: "block",
  fontSize: "12px",
  fontWeight: 500,
  color: "#425466",
  marginBottom: "6px",
};

function Input({
  value,
  onChange,
  placeholder,
  onFocus,
  onBlur,
  style,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  onFocus?: () => void;
  onBlur?: () => void;
  style?: CSSProperties;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        ...inputStyle,
        borderColor: focused ? "#2563EB" : "#E3E8EF",
        ...style,
      }}
      onFocus={() => { setFocused(true); onFocus?.(); }}
      onBlur={() => { setFocused(false); onBlur?.(); }}
    />
  );
}

export default function RegisterPage() {
  const { address } = useAccount();
  const chainId = useChainId();
  const { isSignedIn, setSignedIn } = useAuth();
  const { signMessageAsync } = useSignMessage();
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

  async function ensureSignedIn() {
    if (isSignedIn) return;
    const nonce = await getNonce();
    const message = buildSiweMessage(address!, chainId, nonce);
    const signature = await signMessageAsync({ message });
    const { address: verified, token } = await verifySignature(message, signature);
    setSignedIn(verified, token);
  }

  async function handleRegister() {
    setError("");
    try {
      await ensureSignedIn();
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

  return (
    <AuthGate description="Sign in to register your agent on the Arbitrum network.">
      <div style={{ background: "#f8faff", minHeight: "100vh", padding: "48px 16px" }}>
        <div style={{ maxWidth: "680px", margin: "0 auto" }}>

          {/* Page header */}
          {step < 5 && (
            <div style={{ marginBottom: "32px" }}>
              <h1 style={{ fontSize: "28px", fontWeight: 700, color: "#0A2540", letterSpacing: "-0.02em", marginBottom: "6px" }}>
                Register Your Agent
              </h1>
              <p style={{ fontSize: "14px", color: "#64748b" }}>
                Publish your agent to the MilkyWay registry on Arbitrum.
              </p>
            </div>
          )}

          {/* Step progress tracker */}
          {step < 5 && (
            <div style={{ marginBottom: "32px" }}>
              <div style={{ display: "flex", alignItems: "flex-start" }}>
                {STEPS.map(({ n, label }, i) => {
                  const done   = step > n;
                  const active = step === n;
                  return (
                    <div key={n} style={{ display: "flex", alignItems: "flex-start", flex: 1 }}>
                      {/* Circle + label */}
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                        <div
                          style={{
                            width: "36px",
                            height: "36px",
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "13px",
                            fontWeight: 700,
                            transition: "all 0.2s",
                            ...(done
                              ? { background: "#10b981", color: "#fff" }
                              : active
                              ? { background: "#2563EB", color: "#fff", boxShadow: "0 0 0 4px rgba(37,99,235,0.12)" }
                              : { background: "#F1F5F9", color: "#94a3b8" }),
                          }}
                        >
                          {done ? (
                            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          ) : n}
                        </div>
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 600,
                            marginTop: "6px",
                            color: done ? "#10b981" : active ? "#2563EB" : "#94a3b8",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {label}
                        </span>
                      </div>

                      {/* Connecting line (not after last item) */}
                      {i < STEPS.length - 1 && (
                        <div
                          style={{
                            flex: 1,
                            height: "2px",
                            marginTop: "17px",
                            marginLeft: "8px",
                            marginRight: "8px",
                            borderRadius: "1px",
                            background: step > n ? "#10b981" : "#E3E8EF",
                            transition: "background 0.3s",
                          }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Form card */}
          {step < 5 && (
            <div
              style={{
                background: "#fff",
                border: "1px solid #E3E8EF",
                borderRadius: "16px",
                padding: "32px",
                boxShadow: "0 2px 12px rgba(10,37,64,0.04)",
              }}
            >

              {/* ── Step 1: Wallet ── */}
              {step === 1 && (
                <div>
                  <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#0A2540", marginBottom: "4px" }}>
                    Confirm your wallet
                  </h2>
                  <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "24px" }}>
                    Your agent NFT will be minted to this address.
                  </p>

                  <div
                    style={{
                      background: "#F8FAFF",
                      border: "1px solid #DBEAFE",
                      borderRadius: "10px",
                      padding: "16px 20px",
                      marginBottom: "20px",
                    }}
                  >
                    <p style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Connected wallet
                    </p>
                    <p style={{ fontFamily: "monospace", fontSize: "13px", color: "#2563EB", wordBreak: "break-all" }}>
                      {address}
                    </p>
                  </div>

                  <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "24px", lineHeight: 1.6 }}>
                    Make sure this is the wallet you want to use as your builder identity on MilkyWay.
                  </p>

                  <button
                    onClick={() => setStep(2)}
                    style={{
                      width: "100%",
                      background: "#2563EB",
                      color: "#fff",
                      border: "none",
                      borderRadius: "10px",
                      padding: "12px",
                      fontSize: "14px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Continue →
                  </button>
                </div>
              )}

              {/* ── Step 2: Agent Profile ── */}
              {step === 2 && (
                <div>
                  <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#0A2540", marginBottom: "4px" }}>
                    Agent profile
                  </h2>
                  <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "24px" }}>
                    Tell the world what your agent does.
                  </p>

                  <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                    <div>
                      <label style={labelStyle}>Agent name <Req /></label>
                      <Input value={form.name} onChange={(v) => field("name", v)} placeholder="My Awesome Agent" />
                    </div>

                    <div>
                      <label style={labelStyle}>Description <Req /> <span style={{ color: "#94a3b8", fontWeight: 400 }}>(max 500 chars)</span></label>
                      <FocusTextarea
                        value={form.description}
                        onChange={(v) => field("description", v.slice(0, 500))}
                        placeholder="What does your agent do?"
                        rows={4}
                      />
                      <p style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px", textAlign: "right" }}>
                        {form.description.length}/500
                      </p>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                      <div>
                        <label style={labelStyle}>Category <Req /></label>
                        <FocusSelect value={form.category} onChange={(v) => field("category", v)}>
                          <option value="">Select…</option>
                          {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                            <option key={k} value={k}>{v}</option>
                          ))}
                        </FocusSelect>
                      </div>
                      <div>
                        <label style={labelStyle}>Subcategory</label>
                        <Input value={form.subcategory} onChange={(v) => field("subcategory", v)} placeholder="e.g. Yield Farming" />
                      </div>
                    </div>

                    <div>
                      <label style={labelStyle}>Version</label>
                      <Input value={form.version} onChange={(v) => field("version", v)} />
                    </div>

                    <div>
                      <label style={labelStyle}>Endpoint URL <Req /> <span style={{ color: "#94a3b8", fontWeight: 400 }}>(https://)</span></label>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <div style={{ flex: 1 }}>
                          <Input
                            value={form.endpoint}
                            onChange={(v) => { field("endpoint", v); setEndpointStatus(null); }}
                            placeholder="https://my-agent.example.com"
                          />
                        </div>
                        <button
                          onClick={testEndpoint}
                          disabled={pingLoading || !form.endpoint}
                          style={{
                            padding: "10px 16px",
                            background: "#EFF6FF",
                            border: "1px solid #BFDBFE",
                            borderRadius: "8px",
                            fontSize: "13px",
                            fontWeight: 600,
                            color: "#2563EB",
                            cursor: "pointer",
                            whiteSpace: "nowrap",
                            opacity: pingLoading || !form.endpoint ? 0.5 : 1,
                          }}
                        >
                          {pingLoading ? "Testing…" : "Test"}
                        </button>
                      </div>
                      {endpointStatus && (
                        <p style={{ fontSize: "12px", marginTop: "8px", color: endpointStatus.success ? "#10b981" : "#ef4444" }}>
                          {endpointStatus.success
                            ? `✓ Endpoint is live (${endpointStatus.ms}ms)`
                            : "✗ Cannot reach endpoint — ensure GET /health returns 200"}
                        </p>
                      )}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "10px", marginTop: "28px" }}>
                    <BackButton onClick={() => setStep(1)} />
                    <button
                      onClick={() => setStep(3)}
                      disabled={!form.name || !form.description || !form.category || !form.endpoint || !endpointStatus?.success}
                      style={{
                        flex: 1,
                        background: "#2563EB",
                        color: "#fff",
                        border: "none",
                        borderRadius: "10px",
                        padding: "12px",
                        fontSize: "14px",
                        fontWeight: 600,
                        cursor: "pointer",
                        opacity: !form.name || !form.description || !form.category || !form.endpoint || !endpointStatus?.success ? 0.45 : 1,
                      }}
                    >
                      Continue →
                    </button>
                  </div>
                </div>
              )}

              {/* ── Step 3: Pricing & Permissions ── */}
              {step === 3 && (
                <div>
                  <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#0A2540", marginBottom: "4px" }}>
                    Pricing & permissions
                  </h2>
                  <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "24px" }}>
                    Set how callers pay for your agent and what it can access.
                  </p>

                  <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                    <div>
                      <label style={labelStyle}>Pricing model</label>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                        {PRICING_OPTIONS.map((o) => {
                          const active = form.pricingModel === o.value;
                          return (
                            <button
                              key={o.value}
                              onClick={() => field("pricingModel", o.value)}
                              style={{
                                padding: "10px",
                                borderRadius: "8px",
                                fontSize: "13px",
                                fontWeight: 600,
                                cursor: "pointer",
                                transition: "all 0.15s",
                                border: active ? "1px solid #BFDBFE" : "1px solid #E3E8EF",
                                background: active ? "#EFF6FF" : "#F8FAFF",
                                color: active ? "#2563EB" : "#64748b",
                              }}
                            >
                              {o.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {form.pricingModel !== "FREE" && (
                      <div>
                        <label style={labelStyle}>Price (ETH)</label>
                        <Input
                          value={form.priceEth}
                          onChange={(v) => field("priceEth", v)}
                          placeholder="0.001"
                        />
                      </div>
                    )}

                    <div>
                      <label style={labelStyle}>Permissions required</label>
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {PERMISSIONS.map((p) => {
                          const checked = form.permissions.includes(p.key);
                          return (
                            <label
                              key={p.key}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "12px",
                                padding: "12px 14px",
                                background: checked ? "#F0FDF4" : "#F8FAFF",
                                border: checked ? "1px solid #BBF7D0" : "1px solid #E3E8EF",
                                borderRadius: "8px",
                                cursor: "pointer",
                                transition: "all 0.15s",
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => togglePermission(p.key)}
                                style={{ width: "16px", height: "16px", accentColor: "#2563EB", cursor: "pointer" }}
                              />
                              <span style={{ fontSize: "13px", color: "#0A2540", fontWeight: 500 }}>{p.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "10px", marginTop: "28px" }}>
                    <BackButton onClick={() => setStep(2)} />
                    <button
                      onClick={() => setStep(4)}
                      style={{
                        flex: 1,
                        background: "#2563EB",
                        color: "#fff",
                        border: "none",
                        borderRadius: "10px",
                        padding: "12px",
                        fontSize: "14px",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Review →
                    </button>
                  </div>
                </div>
              )}

              {/* ── Step 4: Review & Stake ── */}
              {step === 4 && (
                <div>
                  <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#0A2540", marginBottom: "4px" }}>
                    Review & stake
                  </h2>
                  <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "24px" }}>
                    Confirm the details below, then approve the transaction.
                  </p>

                  {/* Summary table */}
                  <div
                    style={{
                      background: "#F8FAFF",
                      border: "1px solid #E3E8EF",
                      borderRadius: "12px",
                      padding: "20px",
                      marginBottom: "16px",
                    }}
                  >
                    <Row label="Name" value={form.name} />
                    <Row label="Category" value={CATEGORY_LABELS[form.category] ?? form.category} />
                    <Row label="Endpoint" value={form.endpoint.slice(0, 50) + (form.endpoint.length > 50 ? "…" : "")} />
                    <Row
                      label="Pricing"
                      value={form.pricingModel === "FREE" ? "Free" : `${form.priceEth} ETH / ${form.pricingModel.toLowerCase().replace("per_", "")}`}
                    />
                    {form.permissions.length > 0 && (
                      <Row label="Permissions" value={form.permissions.join(", ")} />
                    )}
                  </div>

                  {/* Stake info */}
                  <div
                    style={{
                      background: "#EFF6FF",
                      border: "1px solid #BFDBFE",
                      borderRadius: "12px",
                      padding: "16px 20px",
                      marginBottom: "20px",
                    }}
                  >
                    <p style={{ fontSize: "14px", fontWeight: 700, color: "#1e40af", marginBottom: "4px" }}>
                      Stake required: 0.01 ETH
                    </p>
                    <p style={{ fontSize: "12px", color: "#3b82f6" }}>
                      Your stake is returned in full when you deactivate your agent.
                    </p>
                  </div>

                  {error && (
                    <div
                      style={{
                        background: "#FEF2F2",
                        border: "1px solid #FECACA",
                        borderRadius: "10px",
                        padding: "12px 16px",
                        marginBottom: "16px",
                        fontSize: "13px",
                        color: "#ef4444",
                      }}
                    >
                      {error}
                    </div>
                  )}

                  <div style={{ display: "flex", gap: "10px" }}>
                    <BackButton onClick={() => setStep(3)} disabled={isTxPending || isConfirming} />
                    <button
                      onClick={handleRegister}
                      disabled={isTxPending || isConfirming}
                      style={{
                        flex: 1,
                        background: "#2563EB",
                        color: "#fff",
                        border: "none",
                        borderRadius: "10px",
                        padding: "12px",
                        fontSize: "14px",
                        fontWeight: 600,
                        cursor: isTxPending || isConfirming ? "not-allowed" : "pointer",
                        opacity: isTxPending || isConfirming ? 0.7 : 1,
                      }}
                    >
                      {isTxPending ? "Check wallet…" : isConfirming ? "Confirming on-chain…" : "Register Agent →"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Step 5: Success ── */}
          {step === 5 && (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <div
                style={{
                  width: "72px",
                  height: "72px",
                  borderRadius: "50%",
                  background: "#F0FDF4",
                  border: "2px solid #86EFAC",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 24px",
                }}
              >
                <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="#10b981" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <h2 style={{ fontSize: "28px", fontWeight: 700, color: "#0A2540", letterSpacing: "-0.02em", marginBottom: "8px" }}>
                Your agent is live!
              </h2>
              <p style={{ fontSize: "14px", color: "#64748b", maxWidth: "360px", margin: "0 auto 32px", lineHeight: 1.6 }}>
                Agent #{registeredAgentId} is now in the MilkyWay registry. The verification oracle will check it within 24 hours.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxWidth: "320px", margin: "0 auto" }}>
                <Link
                  href={`/agents/${registeredAgentId}`}
                  style={{
                    display: "block",
                    background: "#2563EB",
                    color: "#fff",
                    borderRadius: "10px",
                    padding: "12px 24px",
                    fontSize: "14px",
                    fontWeight: 600,
                    textDecoration: "none",
                    textAlign: "center",
                  }}
                >
                  View your agent →
                </Link>
                <button
                  onClick={() => {
                    setStep(1);
                    setForm({ name: "", description: "", category: "", subcategory: "", version: "1.0.0", endpoint: "", pricingModel: "PER_CALL", priceEth: "0.001", permissions: [], logoUrl: "" });
                    setEndpointStatus(null);
                    setProfileId("");
                    setRegisteredAgentId(null);
                    setError("");
                  }}
                  style={{
                    background: "#fff",
                    border: "1px solid #E3E8EF",
                    borderRadius: "10px",
                    padding: "12px 24px",
                    fontSize: "14px",
                    fontWeight: 500,
                    color: "#425466",
                    cursor: "pointer",
                  }}
                >
                  Register another agent
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </AuthGate>
  );
}

function Req() {
  return <span style={{ color: "#ef4444" }}>*</span>;
}

function BackButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "12px 20px",
        background: "#fff",
        border: "1px solid #E3E8EF",
        borderRadius: "10px",
        fontSize: "14px",
        fontWeight: 500,
        color: "#425466",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      ← Back
    </button>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", padding: "8px 0", borderBottom: "1px solid #F1F5F9" }}>
      <span style={{ fontSize: "13px", color: "#64748b", flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: "13px", color: "#0A2540", fontWeight: 500, textAlign: "right", wordBreak: "break-all" }}>{value}</span>
    </div>
  );
}

function FocusTextarea({
  value,
  onChange,
  placeholder,
  rows,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows ?? 4}
      style={{
        ...inputStyle,
        resize: "none",
        borderColor: focused ? "#2563EB" : "#E3E8EF",
        lineHeight: "1.5",
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  );
}

function FocusSelect({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  children: ReactNode;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        ...inputStyle,
        cursor: "pointer",
        borderColor: focused ? "#2563EB" : "#E3E8EF",
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    >
      {children}
    </select>
  );
}
