import { createWalletClient, createPublicClient, http, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrum, arbitrumSepolia } from "viem/chains";

const isMainnet = process.env.CHAIN === "mainnet";
const chain = isMainnet ? arbitrum : arbitrumSepolia;
const rpcUrl = isMainnet
  ? process.env.ARBITRUM_RPC!
  : process.env.ARBITRUM_SEPOLIA_RPC!;

export const publicClient = createPublicClient({
  chain,
  transport: http(rpcUrl),
});

export const agentRegistryAbi = parseAbi([
  "function markVerified(uint256 agentId, uint8 badgeTier) external",
  "function isActive(uint256 agentId) external view returns (bool)",
  "function totalAgents() external view returns (uint256)",
  "event AgentRegistered(uint256 indexed agentId, address indexed owner, bytes32 metadataHash, uint256 stake, uint256 timestamp)",
]);

export function getOracleWalletClient() {
  const account = privateKeyToAccount(process.env.DEPLOYER_PRIVATE_KEY as `0x${string}`);
  return createWalletClient({ account, chain, transport: http(rpcUrl) });
}

export const registryAddress = process.env.AGENT_REGISTRY_ADDRESS as `0x${string}`;
