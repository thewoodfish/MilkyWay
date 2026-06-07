import { ethers } from "ethers";
import { discoverAgents, getAgent } from "./discover";
import { callAgent } from "./call";
import { DiscoverOptions, DiscoveredAgent, CallOptions, CallResult } from "./types";

export class MilkyWayClient {
  private signer: ethers.Wallet;

  constructor(options: { signer: ethers.Wallet; network?: string }) {
    this.signer = options.signer;
    if (options.network) {
      process.env.X402_NETWORK = options.network;
    }
  }

  discoverAgents(options?: DiscoverOptions): Promise<DiscoveredAgent[]> {
    return discoverAgents(options);
  }

  getAgent(agentIdOrSlug: number | string): Promise<DiscoveredAgent> {
    return getAgent(agentIdOrSlug);
  }

  callAgent(agent: DiscoveredAgent, options: CallOptions): Promise<CallResult> {
    return callAgent(agent, this.signer, options);
  }
}
