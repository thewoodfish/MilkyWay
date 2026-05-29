"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { useAccount, useDisconnect } from "wagmi";
import { clearToken, getToken, getSavedAddress, setToken } from "@/lib/auth";

interface AuthState {
  address: string | null;
  isSignedIn: boolean;
  token: string | null;
  signOut: () => void;
  setSignedIn: (address: string, token: string) => void;
}

const AuthContext = createContext<AuthState>({
  address: null,
  isSignedIn: false,
  token: null,
  signOut: () => {},
  setSignedIn: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const { disconnect } = useDisconnect();
  const { address: walletAddress } = useAccount();

  // Hydrate from localStorage on mount
  useEffect(() => {
    const saved = getSavedAddress();
    const token = getToken();
    if (saved && token) setAddress(saved);
  }, []);

  // Sign out if wallet disconnects
  useEffect(() => {
    if (!walletAddress && address) signOut();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletAddress]);

  function setSignedIn(addr: string, token: string) {
    setToken(token, addr);
    setAddress(addr);
  }

  function signOut() {
    clearToken();
    setAddress(null);
    disconnect();
  }

  return (
    <AuthContext.Provider value={{ address, isSignedIn: !!address, token: getToken(), signOut, setSignedIn }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
