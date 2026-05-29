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
    <nav className="sticky top-0 z-50 border-b border-[#E5E7EB] bg-white">
      <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="font-bold text-xl text-[#2563EB] tracking-tight">
          MilkyWay
        </Link>

        {/* Center links */}
        <div className="hidden md:flex items-center gap-1">
          <Link href="/agents"    className="text-[#6B7280] hover:text-[#0A0A0A] transition-colors text-sm font-medium px-3 py-2 rounded-md hover:bg-gray-50">Explore</Link>
          <Link href="/builder"   className="text-[#6B7280] hover:text-[#0A0A0A] transition-colors text-sm font-medium px-3 py-2 rounded-md hover:bg-gray-50">Builder</Link>
          <Link href="/dashboard" className="text-[#6B7280] hover:text-[#0A0A0A] transition-colors text-sm font-medium px-3 py-2 rounded-md hover:bg-gray-50">Dashboard</Link>
          <Link href="/#pricing"  className="text-[#6B7280] hover:text-[#0A0A0A] transition-colors text-sm font-medium px-3 py-2 rounded-md hover:bg-gray-50">Pricing</Link>
        </div>

        {/* Right: wallet + register */}
        <div className="flex items-center gap-3">
          <ConnectButton chainStatus="icon" showBalance={false} />
          {isConnected && !isSignedIn && <SignInButton />}
          {isSignedIn && (
            <button
              onClick={signOut}
              className="text-xs text-[#6B7280] hover:text-[#0A0A0A] border border-[#E5E7EB] rounded-md px-3 py-1.5 transition-colors hover:bg-gray-50"
            >
              Sign Out
            </button>
          )}
          <Link
            href="/register"
            className="hidden sm:inline-flex bg-[#2563EB] hover:bg-[#1d4ed8] text-white text-sm font-semibold px-4 py-2 rounded-md transition-colors"
          >
            Register Agent →
          </Link>
        </div>
      </div>
    </nav>
  );
}
