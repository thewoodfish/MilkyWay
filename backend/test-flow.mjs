/**
 * test-flow.mjs
 *
 * Full end-to-end test of the MilkyWay protocol.
 * Simulates exactly what the visual builder does:
 *   SIWE auth → create flow → lockPayment on-chain → confirm → watch execution
 */

import { ethers } from "ethers";
import { SiweMessage } from "siwe";

const BACKEND     = "http://localhost:5000";
const RPC         = process.env.ARBITRUM_RPC;
const CHAIN_ID    = 421614;
const ESCROW_ADDR = "0xdefea667504b720972cdc723124796a03756d384";
const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY;
const DOMAIN      = "localhost:3000";

const ESCROW_ABI = [
  "function lockPayment(bytes32 jobId, address[] calldata agents, uint256[] calldata amounts, uint256 deadline) external payable",
  "event JobLocked(bytes32 indexed jobId, address indexed caller, address[] agents, uint256 totalAmount, uint256 deadline)",
];

// ── Step 1: Auth ──────────────────────────────────────────────────────────────

async function auth(wallet) {
  const nonceRes = await fetch(`${BACKEND}/api/auth/nonce`);
  const { nonce } = await nonceRes.json();
  const cookie = (nonceRes.headers.get("set-cookie") ?? "").split(";")[0];

  const siwe = new SiweMessage({
    domain: DOMAIN, address: wallet.address,
    statement: "Sign in with Ethereum to MilkyWay",
    uri: `http://${DOMAIN}`, version: "1", chainId: CHAIN_ID, nonce,
  });
  const message   = siwe.prepareMessage();
  const signature = await wallet.signMessage(message);

  const res  = await fetch(`${BACKEND}/api/auth/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
    body: JSON.stringify({ message, signature }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`Auth failed: ${JSON.stringify(body)}`);
  return body.token;
}

// ── Step 2: Create flow ───────────────────────────────────────────────────────

async function createFlow(token) {
  // Fetch → Analyze chain, topic="ethereum"
  const payload = {
    agents: [
      { agentId: 1, orderIndex: 0, staticInputs: { topic: "ethereum" }, inputMapping: {} },
      { agentId: 2, orderIndex: 1, staticInputs: {},                    inputMapping: { content: "content", topic: "topic" } },
    ],
    trigger: "IMMEDIATE",
    deadlineSeconds: 120,
  };

  const res  = await fetch(`${BACKEND}/api/flows/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`Create flow failed: ${JSON.stringify(body)}`);
  return body;
}

// ── Step 3: Lock escrow on-chain ──────────────────────────────────────────────

async function lockEscrow(flowData, signer) {
  const { jobId, agentWallets, agentAmounts, deadline, totalEth } = flowData;

  const escrow = new ethers.Contract(ESCROW_ADDR, ESCROW_ABI, signer);
  const tx = await escrow.lockPayment(
    jobId,
    agentWallets,
    agentAmounts.map(BigInt),
    deadline,
    { value: ethers.parseEther(totalEth) }
  );
  process.stdout.write(`  ⟳ TX: ${tx.hash}\n`);
  await tx.wait();
  return tx.hash;
}

// ── Step 4: Confirm (triggers engine) ────────────────────────────────────────

async function confirmFlow(token, internalId, escrowTxHash) {
  const res  = await fetch(`${BACKEND}/api/flows/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ internalId, escrowTxHash }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`Confirm failed: ${JSON.stringify(body)}`);
  return body;
}

// ── Step 5: Poll flow status ──────────────────────────────────────────────────

async function watchFlow(jobId) {
  const encoded = encodeURIComponent(jobId);
  let lastStatuses = {};

  for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const res  = await fetch(`${BACKEND}/api/flows/${encoded}`);
    const flow = await res.json();

    // Print agent status changes
    for (const fa of (flow.agents || [])) {
      const key = `agent-${fa.agentId}`;
      if (lastStatuses[key] !== fa.status) {
        lastStatuses[key] = fa.status;
        const icon = { PENDING:"○", RUNNING:"⟳", COMPLETED:"✓", FAILED:"✗" }[fa.status] ?? "?";
        console.log(`  ${icon} Agent #${fa.agentId} → ${fa.status}`);
        if (fa.status === "COMPLETED" && fa.output) {
          const preview = JSON.stringify(fa.output).slice(0, 120);
          console.log(`    output: ${preview}…`);
        }
      }
    }

    if (flow.status === "COMPLETED") {
      console.log(`\n  ✅ Flow COMPLETED — payment released on-chain`);
      return flow;
    }
    if (flow.status === "FAILED") {
      console.log(`\n  ❌ Flow FAILED`);
      return flow;
    }
  }
  throw new Error("Timed out waiting for flow completion");
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC);
  const wallet   = new ethers.Wallet(PRIVATE_KEY, provider);

  const bal = await provider.getBalance(wallet.address);
  console.log(`\n🚀 MilkyWay Protocol — End-to-End Test`);
  console.log(`   Wallet  : ${wallet.address}`);
  console.log(`   Balance : ${ethers.formatEther(bal)} ETH`);
  console.log(`   Flow    : Fetch Agent → Analyze Agent (topic: "ethereum")\n`);

  console.log("1. Authenticating via SIWE…");
  const token = await auth(wallet);
  console.log("   ✓ JWT obtained\n");

  console.log("2. Creating flow record…");
  const flowData = await createFlow(token);
  console.log(`   ✓ jobId       = ${flowData.jobId}`);
  console.log(`   ✓ internalId  = ${flowData.internalId}`);
  console.log(`   ✓ totalEth    = ${flowData.totalEth} ETH`);
  console.log(`   ✓ agents      = ${flowData.agentWallets.join(", ")}\n`);

  console.log("3. Locking escrow on-chain…");
  const txHash = await lockEscrow(flowData, wallet);
  console.log(`   ✓ Escrow locked\n`);

  console.log("4. Confirming with backend (engine starts)…");
  await confirmFlow(token, flowData.internalId, txHash);
  console.log("   ✓ Engine triggered\n");

  console.log("5. Watching execution…");
  const result = await watchFlow(flowData.jobId);

  if (result.status === "COMPLETED") {
    console.log(`\n📊 Final agent outputs:`);
    for (const fa of result.agents) {
      console.log(`\n   Agent #${fa.agentId} (${fa.status}):`);
      console.log("   " + JSON.stringify(fa.output, null, 2).replace(/\n/g, "\n   "));
    }
  }

  console.log(`\n🔗 View on frontend: http://localhost:3000/flows/${encodeURIComponent(flowData.jobId)}\n`);
}

main().catch(err => {
  console.error("\n❌", err.message);
  process.exit(1);
});
