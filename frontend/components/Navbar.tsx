"use client";

import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAuth } from "@/context/AuthContext";
import { SignInButton } from "./SignInButton";
import { useAccount } from "wagmi";

export function Navbar() {
  const { isConnected } = useAccount();
  const { isSignedIn, signOut } = useAuth();

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="font-bold text-xl text-ink tracking-tight">
          Milky<span className="text-accent">Way</span>
        </Link>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-1">
          <Link href="/agents"    className="text-muted hover:text-ink transition-colors text-sm font-medium px-3 py-2 rounded-btn hover:bg-slate-50">Explore</Link>
          <Link href="/register"  className="text-muted hover:text-ink transition-colors text-sm font-medium px-3 py-2 rounded-btn hover:bg-slate-50">Register Agent</Link>
          <Link href="/builder"   className="text-muted hover:text-ink transition-colors text-sm font-medium px-3 py-2 rounded-btn hover:bg-slate-50">Builder</Link>
          <Link href="/dashboard" className="text-muted hover:text-ink transition-colors text-sm font-medium px-3 py-2 rounded-btn hover:bg-slate-50">Dashboard</Link>
        </div>

        {/* Wallet / auth */}
        <div className="flex items-center gap-2">
          <ConnectButton chainStatus="icon" showBalance={false} />
          {isConnected && !isSignedIn && <SignInButton />}
          {isSignedIn && (
            <button
              onClick={signOut}
              className="text-xs text-muted hover:text-ink border border-slate-200 rounded-btn px-3 py-1.5 transition-colors hover:bg-slate-50"
            >
              Sign Out
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
