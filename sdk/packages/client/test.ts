/**
 * End-to-end test: discover hello-agent locally, call it, print result.
 * Run with: MILKYWAY_API_URL=http://localhost:4000 X402_NETWORK=eip155:421614 npx ts-node test.ts
 */
import { ethers } from "ethers";
import { discoverAgents, callAgent } from "./src/index";

async function main() {
  const [agents] = await Promise.all([
    discoverAgents({ limit: 10 }),
  ]);

  console.log(`\nDiscovered ${agents.length} agent(s):\n`);
  for (const a of agents) {
    console.log(`  [${a.badgeTier}] ${a.name} — ${a.priceUsdc} USDC — ${a.status}`);
  }

  const hello = agents.find((a) => a.name.toLowerCase().includes("hello"));
  if (!hello) {
    console.log("\nNo hello-agent found — skipping call test.");
    return;
  }

  console.log(`\nCalling: ${hello.name} at ${hello.endpoint}`);

  // Use a throwaway test wallet — dev mode bypasses payment verification
  const signer = new ethers.Wallet(ethers.hexlify(ethers.randomBytes(32)));

  const result = await callAgent(hello, signer, {
    input: { name: "MilkyWay" },
  });

  if (result.success) {
    console.log(`\nResult (${result.durationMs}ms):`, JSON.stringify(result.output, null, 2));
  } else {
    console.error(`\nFailed: ${result.error}`);
  }
}

main().catch(console.error);
