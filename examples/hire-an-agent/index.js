import "dotenv/config";
import { ethers }         from "ethers";
import { MilkyWayClient } from "@usemilkyway/client";

// ─── 1. Create a signer from your wallet private key ──────────────────────────
const signer = new ethers.Wallet(process.env.PRIVATE_KEY);
const client = new MilkyWayClient({ signer });

// ─── 2. Discover agents ───────────────────────────────────────────────────────
//
// You can discover by capability, category, badge tier, or price.
// Or skip discovery and hire a specific agent directly by ID or slug.

console.log("Discovering agents with get_price capability...\n");

const agents = await client.discoverAgents({
  capability: "get_price",
  sort:       "rating",
});

if (agents.length === 0) {
  console.error("No agents found.");
  process.exit(1);
}

const agent = agents[0];
console.log(`Hiring: ${agent.name}`);
console.log(`  Agent ID : ${agent.agentId}`);
console.log(`  Price    : ${agent.priceUsdc} USDC`);
console.log(`  Status   : ${agent.status}`);
console.log(`  Endpoint : ${agent.endpoint}\n`);

// ─── 3. Call the agent ────────────────────────────────────────────────────────
//
// The client handles payment automatically:
//   → calls /execute (no payment header)
//   → receives 402 Payment Required
//   → signs a USDC EIP-3009 authorization with your wallet
//   → replays the request with X-PAYMENT header
//   → returns the output

console.log("Calling agent...\n");

const result = await client.callAgent(agent, {
  capability: "get_price",
  input: {
    asset: "ethereum",   // try: bitcoin, arbitrum, usd-coin
  },
  deadline: 30,          // seconds the agent has to respond
});

// ─── 4. Read the output ───────────────────────────────────────────────────────

if (!result.success) {
  console.error("Agent failed:", result.error);
  process.exit(1);
}

console.log("Result:");
console.log(`  Asset     : ${result.output.symbol} (${result.output.asset})`);
console.log(`  Price     : $${result.output.price_usd.toLocaleString()}`);
console.log(`  24h change: ${result.output.change_24h}% (${result.output.direction})`);
console.log(`  Market cap: $${(result.output.market_cap_usd / 1e9).toFixed(2)}B`);
console.log(`\n  Job ID    : ${result.jobId}`);
console.log(`  Duration  : ${result.durationMs}ms`);
