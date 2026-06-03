"use client";

import { useState, useEffect } from "react";
import { useSignTypedData, useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAuth } from "@/context/AuthContext";
import { authFetch } from "@/lib/auth";
import { SignInButton } from "./SignInButton";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

// Arbitrum Sepolia — switch to mainnet after hackathon
const CHAIN_ID   = 421614;
const USDC_ADDRESS = "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d" as `0x${string}`;

const EIP3009_TYPES = {
  TransferWithAuthorization: [
    { name: "from",        type: "address" },
    { name: "to",          type: "address" },
    { name: "value",       type: "uint256" },
    { name: "validAfter",  type: "uint256" },
    { name: "validBefore", type: "uint256" },
    { name: "nonce",       type: "bytes32" },
  ],
} as const;

interface FieldDef {
  type: "string" | "number" | "boolean" | "array";
  required?: boolean;
  description?: string;
  default?: unknown;
}

interface AboutSchema {
  input_schema: Record<string, FieldDef>;
  pricing: { amount: string; currency: string };
  max_deadline_seconds?: number;
}

interface Props {
  agentId: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  aboutSchema: any;
  priceUsdc: string;
}

type Status = "idle" | "creating" | "signing" | "confirming" | "polling" | "done" | "error";

interface Eip3009Param {
  from: string;
  to: string;
  value: string;
  validAfter: string;
  validBefore: string;
  nonce: string;
}

interface PendingFlow {
  jobId: string;
  internalId: string;
  eip3009Params: Eip3009Param[];
  totalUsdc: string;
  deadline: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractCapabilities(raw: any): { name: string; schema: AboutSchema }[] {
  if (!raw) return [];
  if (raw.input_schema) return [{ name: "run", schema: raw as AboutSchema }];
  const cap = raw.capabilities;
  if (cap && typeof cap === "object" && !Array.isArray(cap)) {
    return Object.entries(cap as Record<string, unknown>).map(([name, s]) => ({
      name,
      schema: s as AboutSchema,
    }));
  }
  return [];
}

export function QuickExecute({ agentId, aboutSchema: rawSchema, priceUsdc }: Props) {
  const capabilities = extractCapabilities(rawSchema);
  const [selectedCap, setSelectedCap] = useState(0);
  const aboutSchema = capabilities[selectedCap]?.schema ?? ({} as AboutSchema);

  const { isConnected } = useAccount();
  const { isSignedIn } = useAuth();
  const { signTypedDataAsync } = useSignTypedData();

  const [inputs, setInputs] = useState<Record<string, unknown>>({});
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError]   = useState("");
  const [result, setResult] = useState<unknown>(null);

  // Pre-fill defaults when capability changes
  useEffect(() => {
    const defaults: Record<string, unknown> = {};
    for (const [field, def] of Object.entries(aboutSchema.input_schema ?? {})) {
      if (def.default !== undefined) defaults[field] = def.default;
    }
    setInputs(defaults);
  }, [selectedCap]);

  async function handleExecute() {
    setError("");
    setStatus("creating");

    try {
      // Step 1: create flow — backend returns EIP-3009 params to sign
      const res = await authFetch(`${API}/api/flows/create`, {
        method: "POST",
        body: JSON.stringify({
          agents: [{ agentId, orderIndex: 0, staticInputs: inputs, inputMapping: {} }],
          trigger: "IMMEDIATE",
          deadlineSeconds: aboutSchema.max_deadline_seconds ?? 60,
        }),
      });
      const flow: PendingFlow = await res.json();
      if (!res.ok) throw new Error((flow as { error?: string }).error ?? "Failed to create flow");

      // Step 2: sign EIP-3009 authorizations (gasless — no on-chain tx)
      setStatus("signing");
      const signatures = await Promise.all(
        flow.eip3009Params.map((auth) =>
          signTypedDataAsync({
            domain: {
              name: "USD Coin",
              version: "2",
              chainId: CHAIN_ID,
              verifyingContract: USDC_ADDRESS,
            },
            types: EIP3009_TYPES,
            primaryType: "TransferWithAuthorization",
            message: {
              from:        auth.from        as `0x${string}`,
              to:          auth.to          as `0x${string}`,
              value:       BigInt(auth.value),
              validAfter:  BigInt(auth.validAfter),
              validBefore: BigInt(auth.validBefore),
              nonce:       auth.nonce       as `0x${string}`,
            },
          })
        )
      );

      // Step 3: confirm with signatures → engine starts executing
      setStatus("confirming");
      const confirmRes = await authFetch(`${API}/api/flows/confirm`, {
        method: "POST",
        body: JSON.stringify({
          internalId: flow.internalId,
          signatures,
          eip3009Params: flow.eip3009Params,
        }),
      });
      if (!confirmRes.ok) throw new Error("Failed to confirm flow");

      // Step 4: poll for result
      setStatus("polling");
      const output = await pollForResult(flow.jobId);
      setResult(output);
      setStatus("done");
    } catch (e) {
      setError((e as Error).message);
      setStatus("error");
    }
  }

  async function pollForResult(jobId: string, maxMs = 90_000): Promise<unknown> {
    const start = Date.now();
    while (Date.now() - start < maxMs) {
      await new Promise((r) => setTimeout(r, 2000));
      const r = await fetch(`${API}/api/flows/${encodeURIComponent(jobId)}`);
      const flow = await r.json();
      if (flow.status === "COMPLETED") return flow.agents?.[0]?.output ?? {};
      if (flow.status === "FAILED") throw new Error("Agent execution failed");
    }
    throw new Error("Timed out");
  }

  function reset() {
    setStatus("idle");
    setError("");
    setResult(null);
  }

  const isRunning = ["creating", "signing", "confirming", "polling"].includes(status);

  const statusLabel: Record<Status, string> = {
    idle:       "",
    creating:   "Creating flow…",
    signing:    "Sign in wallet…",
    confirming: "Submitting…",
    polling:    "Agent is running…",
    done:       "",
    error:      "",
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  if (!isConnected) {
    return (
      <div className="border border-slate-200 rounded-xl p-6 bg-white shadow-card">
        <h3 className="font-bold text-ink text-base mb-1">Run This Agent</h3>
        <p className="text-slate-500 text-sm mb-5">Connect your wallet to execute.</p>
        <ConnectButton />
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="border border-slate-200 rounded-xl p-6 bg-white shadow-card">
        <h3 className="font-bold text-ink text-base mb-1">Run This Agent</h3>
        <p className="text-slate-500 text-sm mb-5">Sign in to execute this agent.</p>
        <SignInButton />
      </div>
    );
  }

  if (status === "done" && result !== null) {
    return (
      <div className="border border-emerald-200 rounded-xl p-6 bg-emerald-50 shadow-card">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
          </div>
          <h3 className="font-bold text-emerald-800 text-base">Completed</h3>
        </div>
        <p className="text-emerald-700 text-xs mb-3">Cost: {priceUsdc} USDC · MilkyWay orchestrator</p>
        <div className="bg-white border border-emerald-200 rounded-lg p-3 mb-4">
          <p className="text-slate-500 text-xs font-medium mb-1.5">Output</p>
          <pre className="text-slate-800 text-xs overflow-auto max-h-48 leading-relaxed">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
        <button onClick={reset}
          className="w-full bg-white border border-emerald-300 text-emerald-700 font-semibold text-sm py-2.5 rounded-lg hover:bg-emerald-50 transition-colors">
          Run Again
        </button>
      </div>
    );
  }

  return (
    <div className="border border-slate-200 rounded-xl p-6 bg-white shadow-card">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-bold text-ink text-base">Run This Agent</h3>
        <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-full font-mono-custom">
          {priceUsdc} USDC
        </span>
      </div>

      {/* Capability selector — only shown when agent has multiple capabilities */}
      {capabilities.length > 1 && (
        <div className="flex gap-1 mb-5 p-1 rounded-lg" style={{ background: "#F1F5F9" }}>
          {capabilities.map((cap, i) => (
            <button
              key={cap.name}
              onClick={() => { setSelectedCap(i); reset(); }}
              disabled={isRunning}
              style={{
                flex: 1,
                padding: "6px 10px",
                borderRadius: "7px",
                fontSize: "12px",
                fontWeight: 600,
                border: "none",
                cursor: isRunning ? "not-allowed" : "pointer",
                transition: "all 0.15s",
                background: selectedCap === i ? "#fff" : "transparent",
                color: selectedCap === i ? "#2563EB" : "#64748b",
                boxShadow: selectedCap === i ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              }}
            >
              {cap.name}
            </button>
          ))}
        </div>
      )}

      {/* Dynamic input fields */}
      <div className="space-y-4 mb-6">
        {Object.entries(aboutSchema.input_schema ?? {}).map(([field, def]) => (
          <div key={field}>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {field}
              {def.required && <span className="text-blue-600 ml-0.5">*</span>}
            </label>
            {def.description && def.type !== "boolean" && (
              <p className="text-slate-400 text-xs mb-1.5">{def.description}</p>
            )}
            {def.type === "boolean" ? (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!inputs[field]}
                  onChange={(e) => setInputs((p) => ({ ...p, [field]: e.target.checked }))}
                  className="w-4 h-4 rounded accent-blue-600"
                  disabled={isRunning}
                />
                <span className="text-slate-500 text-xs">{def.description ?? field}</span>
              </label>
            ) : def.type === "number" ? (
              <input
                type="number"
                value={inputs[field] as number ?? ""}
                onChange={(e) => setInputs((p) => ({ ...p, [field]: Number(e.target.value) }))}
                placeholder={field}
                disabled={isRunning}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-ink placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:bg-slate-50"
              />
            ) : (
              <input
                type="text"
                value={inputs[field] as string ?? ""}
                onChange={(e) => setInputs((p) => ({ ...p, [field]: e.target.value }))}
                placeholder={field}
                disabled={isRunning}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-ink placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:bg-slate-50"
              />
            )}
          </div>
        ))}
      </div>

      {/* Cost row */}
      <div className="flex justify-between text-xs text-slate-500 mb-4 py-3 border-y border-slate-100">
        <span>Cost</span>
        <span className="font-semibold text-ink">{priceUsdc} USDC + gas</span>
      </div>

      {/* Error */}
      {status === "error" && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-xs">
          {error}
          <button onClick={reset} className="ml-2 underline">Try again</button>
        </div>
      )}

      {/* Status indicator */}
      {isRunning && (
        <div className="flex items-center gap-2 mb-4 text-blue-600 text-sm">
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
          <span className="text-sm font-medium">{statusLabel[status]}</span>
        </div>
      )}

      <button
        onClick={handleExecute}
        disabled={isRunning}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm py-3 rounded-lg transition-colors shadow-btn"
      >
        {isRunning ? statusLabel[status] : "Execute Now →"}
      </button>
    </div>
  );
}
