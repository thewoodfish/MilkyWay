import "dotenv/config";
import { ethers }         from "ethers";
import { MilkyWayClient } from "@usemilkyway/client";

const signer = new ethers.Wallet(process.env.PRIVATE_KEY);
const client = new MilkyWayClient({
  signer,
  apiKey: process.env.MILKYWAY_API_KEY,
});

const walletAddress = process.env.WALLET_ADDRESS
  ?? "0x464C71f6c2F760DdA6093dCB91C24c39e5d6e18c";

// ─── 1. Discover both agents ──────────────────────────────────────────────────

console.log("Discovering agents...\n");

const [monitors, summarizers] = await Promise.all([
  client.discoverAgents({ capability: "check_position", sort: "rating" }),
  client.discoverAgents({ capability: "summarize_risk", sort: "rating" }),
]);

if (!monitors.length)    { console.error("No check_position agent found."); process.exit(1); }
if (!summarizers.length) { console.error("No summarize_risk agent found.");  process.exit(1); }

const monitor   = monitors[0];
const summarizer = summarizers[0];

console.log(`Agent 1: ${monitor.name}   (${monitor.priceUsdc} USDC)`);
console.log(`Agent 2: ${summarizer.name} (${summarizer.priceUsdc} USDC)`);
console.log(`Total:   ${(parseFloat(monitor.priceUsdc) + parseFloat(summarizer.priceUsdc)).toFixed(3)} USDC\n`);

// ─── 2. Run the flow ──────────────────────────────────────────────────────────
//
// Agent 1 — Aave Position Monitor
//   staticInputs: wallet_address
//   outputs:      health_factor, collateral_usd, debt_usd, status, wallet, available_borrow
//
// Agent 2 — Risk Summarizer
//   inputMapping: all fields passed directly from Agent 1's output (names match)
//   outputs:      risk_level, summary, action_required, action, ltv_pct, collateral_needed_usd

console.log(`Checking Aave position for ${walletAddress}...\n`);

const result = await client.createFlow({
  agents: [
    {
      agentId:      monitor.agentId,
      orderIndex:   0,
      staticInputs: { wallet_address: walletAddress },
    },
    {
      agentId:      summarizer.agentId,
      orderIndex:   1,
      inputMapping: {
        health_factor:   "health_factor",
        collateral_usd:  "collateral_usd",
        debt_usd:        "debt_usd",
        status:          "status",
        wallet:          "wallet",
        available_borrow: "available_borrow",
      },
    },
  ],
});

// ─── 3. Results ───────────────────────────────────────────────────────────────

if (result.status === "FAILED") {
  const failed = result.agents.find(a => a.status === "FAILED");
  console.error(`Flow failed at: ${failed?.agentName}`);
  console.error("Error:", failed?.output);
  process.exit(1);
}

const position = result.agents[0].output;
const risk     = result.agents[1].output;

console.log("Position:");
console.log(`  Health factor : ${position.health_factor}`);
console.log(`  Collateral    : $${position.collateral_usd?.toLocaleString()}`);
console.log(`  Debt          : $${position.debt_usd?.toLocaleString()}`);
console.log(`  Status        : ${position.status}\n`);

console.log("Risk Summary:");
console.log(`  Risk level    : ${risk.risk_level}`);
console.log(`  LTV           : ${risk.ltv_pct}%`);
console.log(`  Action needed : ${risk.action_required ? "YES" : "No"}`);
if (risk.action) {
  console.log(`  Action        : ${risk.action}`);
}
console.log(`\n${risk.summary}`);

console.log(`\n  Total cost : ${result.totalUsdc} USDC`);
console.log(`  Duration   : ${result.durationMs}ms`);
console.log(`  Job ID     : ${result.jobId}`);
console.log(`\n  Track: https://usemilkyway.com/flows/${result.jobId}`);
