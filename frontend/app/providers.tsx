"use client";

import {
  RainbowKitProvider,
  connectorsForWallets,
} from "@rainbow-me/rainbowkit";
import {
  injectedWallet,
  metaMaskWallet,
  coinbaseWallet,
  walletConnectWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { WagmiProvider, createConfig, http } from "wagmi";
import { arbitrumSepolia } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/context/AuthContext";
import "@rainbow-me/rainbowkit/styles.css";

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "";

// Only include WalletConnect when a real project ID is configured.
// Without it, wagmi auto-reconnect triggers WalletConnect Cloud and errors on every page load.
const wallets = [
  injectedWallet,
  metaMaskWallet,
  coinbaseWallet,
  ...(projectId ? [walletConnectWallet] : []),
];

const connectors = connectorsForWallets(
  [{ groupName: "Wallets", wallets }],
  { appName: "MilkyWay", projectId: projectId || "00000000000000000000000000000000" }
);

const config = createConfig({
  chains: [arbitrumSepolia],
  transports: { [arbitrumSepolia.id]: http() },
  connectors,
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
