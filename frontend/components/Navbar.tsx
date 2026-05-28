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
    <nav className="sticky top-0 z-50 border-b border-white/5 bg-space/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="font-display font-bold text-xl text-white tracking-tight">
          Milky<span className="text-accent">Way</span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <Link href="/agents" className="text-muted hover:text-white transition-colors text-sm font-medium">
            Explore
          </Link>
          <Link href="/register" className="text-muted hover:text-white transition-colors text-sm font-medium">
            Register Agent
          </Link>
          <Link href="/dashboard" className="text-muted hover:text-white transition-colors text-sm font-medium">
            Dashboard
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <ConnectButton chainStatus="icon" showBalance={false} />
          {isConnected && !isSignedIn && <SignInButton />}
          {isSignedIn && (
            <button
              onClick={signOut}
              className="text-xs text-muted hover:text-white border border-white/10 rounded-btn px-3 py-1.5 transition-colors"
            >
              Sign Out
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
