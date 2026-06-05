"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useSignMessage, useChainId } from "wagmi";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getNonce, buildSiweMessage, verifySignature } from "@/lib/auth";

export function Navbar() {
  const { isSignedIn, signOut, setSignedIn } = useAuth();
  const { isConnected, address } = useAccount();
  const chainId = useChainId();
  const { signMessageAsync } = useSignMessage();
  const [signing, setSigning] = useState(false);
  const pathname = usePathname();

  async function handleSignIn() {
    if (!address) return;
    setSigning(true);
    try {
      const nonce   = await getNonce();
      const message = buildSiweMessage(address, chainId, nonce);
      const sig     = await signMessageAsync({ message });
      const { address: verified, token } = await verifySignature(message, sig);
      setSignedIn(verified, token);
    } catch {
      // user cancelled — do nothing
    } finally {
      setSigning(false);
    }
  }

  function navLink(href: string, label: string) {
    const active = pathname === href || (href !== "/" && pathname.startsWith(href));
    return (
      <Link
        href={href}
        className="relative text-sm font-medium px-3 py-2 transition-colors"
        style={{ color: active ? "#0A0A0A" : "#6B7280" }}
      >
        {label}
        {active && (
          <span
            className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full"
            style={{ background: "#2563EB" }}
          />
        )}
      </Link>
    );
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-[#E5E7EB] bg-white">
      <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center">
          <Image src="/logo.png" alt="MilkyWay" width={130} height={34} priority />
        </Link>

        {/* Center links — only when signed in */}
        {isSignedIn && (
          <div className="hidden md:flex items-center gap-1">
            {navLink("/agents", "Explore")}
            {navLink("/dashboard", "Dashboard")}
          </div>
        )}

        {/* Right: explore (logged out) + docs + register + wallet + sign out */}
        <div className="flex items-center gap-3">
          {!isSignedIn && (
            <Link href="/agents" className="hidden md:inline-flex text-[#6B7280] hover:text-[#0A0A0A] transition-colors text-sm font-medium px-3 py-2 rounded-md hover:bg-gray-50">Explore</Link>
          )}
          <a
            href="https://docs.usemilkyway.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:inline-flex text-[#6B7280] hover:text-[#0A0A0A] transition-colors text-sm font-medium px-3 py-2 rounded-md hover:bg-gray-50"
          >
            Docs
          </a>
          <Link
            href="/register"
            className="hidden sm:inline-flex text-sm font-semibold text-[#2563EB] hover:underline transition-colors px-2"
          >
            Register Agent →
          </Link>
          <ConnectButton chainStatus="icon" showBalance={false} />
          {isConnected && !isSignedIn && (
            <button
              onClick={handleSignIn}
              disabled={signing}
              className="text-[12px] font-semibold px-3.5 py-1.5 rounded-lg transition-all disabled:opacity-60"
              style={{ background: "#EFF6FF", color: "#2563EB", border: "1px solid #BFDBFE" }}
              onMouseEnter={e => { if (!signing) (e.currentTarget as HTMLElement).style.background = "#DBEAFE"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#EFF6FF"; }}
            >
              {signing ? "Check wallet…" : "Sign In →"}
            </button>
          )}
          {isSignedIn && (
            <button
              onClick={signOut}
              className="text-[12px] font-semibold px-3.5 py-1.5 rounded-lg transition-all"
              style={{
                background: "#FEF2F2",
                color: "#ef4444",
                border: "1px solid #FECACA",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = "#FEE2E2";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = "#FEF2F2";
              }}
            >
              Sign out
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
