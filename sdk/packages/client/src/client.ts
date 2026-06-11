import { ethers } from "ethers";
import { discoverAgents, getAgent } from "./discover";
import { callAgent } from "./call";
import { createFlow } from "./flow";
import { DiscoverOptions, DiscoveredAgent, CallOptions, CallResult, FlowOptions, FlowResult } from "./types";

export class MilkyWayClient {
  private signer: ethers.Wallet;
  private apiKey?: string;

  constructor(options: { signer: ethers.Wallet; network?: string; apiKey?: string }) {
    this.signer = options.signer;
    this.apiKey = options.apiKey;
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

  /**
   * Run multiple agents in sequence as a single paid flow.
   *
   * @throws {Error} If `apiKey` was not passed to the `MilkyWayClient` constructor.
   *   Get an API key at usemilkyway.com/settings/api-keys, then:
   *   `new MilkyWayClient({ signer, apiKey: 'mw_live_...' })`
   */
  createFlow(options: FlowOptions): Promise<FlowResult> {
    if (!this.apiKey) throw new Error("createFlow() requires an apiKey — pass it to MilkyWayClient({ apiKey: 'mw_live_...' })");
    return createFlow(this.signer, this.apiKey, options);
  }
}
