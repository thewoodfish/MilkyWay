"use client";

import { useAccount, useSignMessage, useChainId } from "wagmi";
import { useState } from "react";
import { getNonce, buildSiweMessage, verifySignature } from "@/lib/auth";
import { useAuth } from "@/context/AuthContext";

export function SignInButton() {
  const { address } = useAccount();
  const chainId = useChainId();
  const { signMessageAsync } = useSignMessage();
  const { setSignedIn } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn() {
    if (!address) return;
    setLoading(true);
    setError(null);
    try {
      const nonce = await getNonce();
      const message = buildSiweMessage(address, chainId, nonce);
      const signature = await signMessageAsync({ message });
      const { address: verified, token } = await verifySignature(message, signature);
      setSignedIn(verified, token);
    } catch (err: unknown) {
      setError((err as Error).message ?? "Sign in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={handleSignIn}
        disabled={loading || !address}
        className="bg-accent hover:bg-accent-hover text-white font-semibold px-6 py-2.5 rounded-btn text-sm transition-colors disabled:opacity-50"
      >
        {loading ? "Check Wallet…" : "Sign In With Wallet"}
      </button>
      {error && <p className="text-red-400 text-xs">{error}</p>}
    </div>
  );
}
