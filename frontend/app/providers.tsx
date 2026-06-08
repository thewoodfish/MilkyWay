"use client";

import { RainbowKitProvider, getDefaultConfig } from "@rainbow-me/rainbowkit";
import { WagmiProvider, createConfig, http } from "wagmi";
import { arbitrum } from "wagmi/chains";
import { injected } from "wagmi/connectors";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/context/AuthContext";
import "@rainbow-me/rainbowkit/styles.css";

const rawProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "";
// WalletConnect Cloud project IDs are 32 hex characters.
// Any other value (placeholder, empty) falls back to injected-wallet-only mode,
// which avoids WalletConnect SDK initialisation and the "not authorized" SSR error.
const isValidProjectId = /^[0-9a-f]{32}$/i.test(rawProjectId);

const config = isValidProjectId
  ? getDefaultConfig({
      appName: "MilkyWay",
      projectId: rawProjectId,
      chains: [arbitrum],
      ssr: true,
    })
  : createConfig({
      chains: [arbitrum],
      transports: { [arbitrum.id]: http() },
      connectors: [injected()],
      ssr: true,
    });

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <AuthProvider>{children}</AuthProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
