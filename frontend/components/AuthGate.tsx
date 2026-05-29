"use client";

import { useEffect, useRef, useState } from "react";
import { useAccount, useSignMessage, useChainId } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAuth } from "@/context/AuthContext";
import { getNonce, buildSiweMessage, verifySignature } from "@/lib/auth";

interface Props {
  children: React.ReactNode;
  description?: string;
}

export function AuthGate({ children, description }: Props) {
  const { isConnected, address } = useAccount();
  const chainId = useChainId();
  const { signMessageAsync } = useSignMessage();
  const { isSignedIn, isHydrating, setSignedIn } = useAuth();

  const [signing, setSigning]   = useState(false);
  const [error, setError]       = useState("");
  const attemptedFor = useRef<string | null>(null);

  // Auto-trigger SIWE only after hydration completes (avoids false prompts on reload)
  useEffect(() => {
    if (isHydrating) return;
    if (isConnected && address && !isSignedIn && !signing && attemptedFor.current !== address) {
      attemptedFor.current = address;
      handleSignIn();
    }
  }, [isConnected, address, isSignedIn, isHydrating]);

  async function handleSignIn() {
    if (!address) return;
    setSigning(true);
    setError("");
    try {
      const nonce    = await getNonce();
      const message  = buildSiweMessage(address, chainId, nonce);
      const sig      = await signMessageAsync({ message });
      const { address: verified, token } = await verifySignature(message, sig);
      setSignedIn(verified, token);
    } catch {
      setError("Signature cancelled. Click below to try again.");
      attemptedFor.current = null; // allow retry
    } finally {
      setSigning(false);
    }
  }

  if (isHydrating) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#f8faff" }}>
      <div className="w-6 h-6 rounded-full border-2 border-[#2563EB] border-t-transparent animate-spin" />
    </div>
  );

  if (isSignedIn) return <>{children}</>;

  // ── Gate screen ──────────────────────────────────────────────────
  const step = !isConnected ? 1 : 2;

  return (
    <div
      className="min-h-screen relative flex items-center justify-center px-6"
      style={{ background: "#f8faff" }}
    >
      {/* Subtle background orbs */}
      <div className="absolute pointer-events-none" style={{ top: "10%", left: "5%", width: "500px", height: "400px", background: "radial-gradient(circle, rgba(37,99,235,0.07) 0%, transparent 70%)", filter: "blur(60px)" }} />
      <div className="absolute pointer-events-none" style={{ bottom: "10%", right: "5%", width: "400px", height: "320px", background: "radial-gradient(circle, rgba(16,185,129,0.05) 0%, transparent 70%)", filter: "blur(60px)" }} />

      {/* Card */}
      <div
        className="relative z-10 w-full max-w-[440px] rounded-3xl px-10 py-12 text-center"
        style={{
          background: "#fff",
          border: "1px solid #E3E8EF",
          boxShadow: "0 8px 40px rgba(10,37,64,0.08), 0 2px 12px rgba(10,37,64,0.04)",
        }}
      >
        {/* Logo */}
        <div className="inline-flex items-center gap-2 mb-8">
          <span className="w-2 h-2 rounded-full" style={{ background: "#2563EB", boxShadow: "0 0 6px rgba(37,99,235,0.6)", animation: "pulse 2s ease-in-out infinite" }} />
          <span className="font-display font-bold text-[17px]" style={{ color: "#2563EB", letterSpacing: "-0.01em" }}>MilkyWay</span>
        </div>

        {/* Heading */}
        <h1 className="font-display font-bold leading-tight mb-3" style={{ fontSize: "clamp(22px, 4vw, 28px)", color: "#0A2540", letterSpacing: "-0.02em" }}>
          Your universe awaits
        </h1>
        <p className="text-[14px] leading-relaxed mb-10" style={{ color: "#64748b" }}>
          {description ?? "Connect your wallet to access the full MilkyWay experience."}
        </p>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-3 mb-10">
          {[{ n: 1, label: "Connect" }, { n: 2, label: "Sign in" }].map(({ n, label }, i) => {
            const done   = step > n;
            const active = step === n;
            return (
              <div key={n} className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 transition-all"
                    style={
                      done   ? { background: "#10b981", color: "#fff" }
                      : active ? { background: "#2563EB", color: "#fff", boxShadow: "0 0 10px rgba(37,99,235,0.35)" }
                              : { background: "#F1F5F9", color: "#94a3b8" }
                    }
                  >
                    {done ? (
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : n}
                  </div>
                  <span className="text-[12px] font-semibold" style={{ color: done ? "#10b981" : active ? "#0A2540" : "#94a3b8" }}>
                    {label}
                  </span>
                </div>
                {i === 0 && <div className="w-8 h-px" style={{ background: step > 1 ? "#10b981" : "#E3E8EF" }} />}
              </div>
            );
          })}
        </div>

        {/* Action area */}
        {!isConnected && (
          <div className="flex flex-col items-center gap-3">
            <ConnectButton label="Connect Wallet" chainStatus="none" showBalance={false} />
            <p className="text-[11px]" style={{ color: "#94a3b8" }}>No gas required to sign in</p>
          </div>
        )}

        {isConnected && signing && (
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-2.5" style={{ color: "#425466" }}>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              <span className="text-[14px] font-medium">Check your wallet…</span>
            </div>
            <p className="text-[12px]" style={{ color: "#94a3b8" }}>Sign the message to verify your identity. No gas needed.</p>
          </div>
        )}

        {isConnected && !signing && error && (
          <div className="flex flex-col items-center gap-3">
            <p className="text-[13px]" style={{ color: "#ef4444" }}>{error}</p>
            <button
              onClick={handleSignIn}
              className="text-[13px] font-semibold px-6 py-2.5 rounded-xl transition-colors"
              style={{ background: "#2563EB", color: "#fff" }}
            >
              Sign in again →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
