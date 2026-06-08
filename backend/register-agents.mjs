/**
 * register-agents.mjs
 *
 * Programmatically registers fetch-agent, analyze-agent, and report-agent
 * on MilkyWay. Requires the backend and all three agents to be running.
 *
 * Usage:
 *   cd backend && node register-agents.mjs
 */

import { ethers } from "ethers";
import { SiweMessage } from "siwe";

// ── Config ────────────────────────────────────────────────────────────────────

const BACKEND       = "http://localhost:5000";
const RPC           = process.env.ARBITRUM_RPC;
const CHAIN_ID      = 421614;
const REGISTRY_ADDR = "0x8F65922EA9faa532fB849814bB1a58AB95DF482E";
const PRIVATE_KEY   = process.env.DEPLOYER_PRIVATE_KEY;
const DOMAIN        = "localhost:3000";
const STAKE_ETH     = "0.01";

const REGISTRY_ABI = [
  "function registerAgent(bytes32 metadataHash) external payable returns (uint256)",
  "event AgentRegistered(uint256 indexed agentId, address indexed owner, bytes32 metadataHash, uint256 stake, uint256 timestamp)",
];

const AGENTS = [
  {
    name:         "Fetch Agent",
    description:  "Fetches simulated content for a given topic. Outputs raw content ready for analysis.",
    category:     "DATA",
    endpoint:     "http://localhost:3002",
    priceEth:     "0.0001",
    pricingModel: "PER_CALL",
    version:      "1.0.0",
  },
  {
    name:         "Analyze Agent",
    description:  "Analyzes text content. Extracts keywords and determines sentiment.",
    category:     "DATA",
    endpoint:     "http://localhost:3003",
    priceEth:     "0.0001",
    pricingModel: "PER_CALL",
    version:      "1.0.0",
  },
  {
    name:         "Report Agent",
    description:  "Formats analysis results into a human-readable markdown report.",
    category:     "PRODUCTIVITY",
    endpoint:     "http://localhost:3004",
    priceEth:     "0.0001",
    pricingModel: "PER_CALL",
    version:      "1.0.0",
  },
];

// ── SIWE auth ─────────────────────────────────────────────────────────────────

async function getSiweToken(wallet) {
  // 1. Fetch nonce — iron-session sets a cookie we must carry into /verify
  const nonceRes = await fetch(`${BACKEND}/api/auth/nonce`);
  const { nonce } = await nonceRes.json();
  const rawCookie = nonceRes.headers.get("set-cookie") ?? "";
  // iron-session sets multiple directives; grab just the name=value part
  const cookie = rawCookie.split(";")[0];

  // 2. Build and sign SIWE message
  const siwe = new SiweMessage({
    domain:    DOMAIN,
    address:   wallet.address,
    statement: "Sign in with Ethereum to MilkyWay",
    uri:       `http://${DOMAIN}`,
    version:   "1",
    chainId:   CHAIN_ID,
    nonce,
  });
  const message   = siwe.prepareMessage();
  const signature = await wallet.signMessage(message);

  // 3. Verify → receive JWT
  const verifyRes = await fetch(`${BACKEND}/api/auth/verify`, {
    method:  "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify({ message, signature }),
  });
  const body = await verifyRes.json();
  if (!verifyRes.ok) throw new Error(`Auth failed: ${JSON.stringify(body)}`);
  console.log(`  ✓ Signed in as ${wallet.address}`);
  return body.token;
}

// ── Register one agent ────────────────────────────────────────────────────────

async function registerOne(agentDef, token, signer) {
  const ownerAddress = signer.address;

  // 1. Backend pre-register (health + about check, create pending row)
  const regRes = await fetch(`${BACKEND}/api/agents/register`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ ...agentDef, ownerAddress }),
  });
  const regBody = await regRes.json();
  if (!regRes.ok) throw new Error(`Pre-register failed: ${JSON.stringify(regBody)}`);

  const { metadataHash, profileId, phase2Ready } = regBody;
  console.log(`  ✓ Backend OK  profileId=${profileId}  phase2Ready=${phase2Ready}`);

  // 2. Mint on-chain (pays 0.01 ETH stake)
  const registry = new ethers.Contract(REGISTRY_ADDR, REGISTRY_ABI, signer);
  const tx = await registry.registerAgent(metadataHash, {
    value: ethers.parseEther(STAKE_ETH),
  });
  console.log(`  ⟳ TX sent     ${tx.hash}`);
  const receipt = await tx.wait();

  // Parse agentId from AgentRegistered event
  const iface  = new ethers.Interface(REGISTRY_ABI);
  let agentId  = null;
  for (const log of receipt.logs) {
    try {
      const parsed = iface.parseLog(log);
      if (parsed?.name === "AgentRegistered") {
        agentId = Number(parsed.args.agentId);
        break;
      }
    } catch { /* not this log */ }
  }
  if (agentId === null) throw new Error("AgentRegistered event not found in receipt");
  console.log(`  ✓ Minted      agentId=${agentId}`);

  // 3. Confirm with backend (activates the row)
  const confirmRes = await fetch(`${BACKEND}/api/agents/confirm`, {
    method:  "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization:  `Bearer ${token}`,
    },
    body: JSON.stringify({ profileId, agentId, txHash: tx.hash }),
  });
  const confirmBody = await confirmRes.json();
  if (!confirmRes.ok) throw new Error(`Confirm failed: ${JSON.stringify(confirmBody)}`);

  console.log(`  ✓ Live        Agent #${agentId} — ${agentDef.name}`);
  return agentId;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC);
  const wallet   = new ethers.Wallet(PRIVATE_KEY, provider);

  const balance = await provider.getBalance(wallet.address);
  console.log(`\nWallet : ${wallet.address}`);
  console.log(`Balance: ${ethers.formatEther(balance)} ETH`);

  const balEth = parseFloat(ethers.formatEther(balance));
  const maxAgents = Math.floor(balEth / (parseFloat(STAKE_ETH) + 0.001)); // 0.001 ETH gas buffer per tx
  if (maxAgents === 0) throw new Error(`Insufficient balance for even one agent (need ~${STAKE_ETH} ETH).`);
  const toRegister = AGENTS.slice(0, maxAgents);
  if (toRegister.length < AGENTS.length) {
    console.log(`\n⚠️  Balance covers ${maxAgents}/${AGENTS.length} agents. Top up with ${((AGENTS.length - maxAgents) * 0.011).toFixed(4)} ETH to register all.`);
  }

  // Check agents are reachable before spending gas
  console.log("\nChecking agent endpoints…");
  for (const a of toRegister) {
    const res = await fetch(`${a.endpoint}/health`).catch(() => null);
    if (!res?.ok) throw new Error(`${a.name} not reachable at ${a.endpoint}/health — start it first`);
    console.log(`  ✓ ${a.name} is up`);
  }

  console.log("\nAuthenticating…");
  const token = await getSiweToken(wallet);

  // Fetch already-registered agent names to skip duplicates
  const existingRes = await fetch(`${BACKEND}/api/agents?limit=100`);
  const existingData = await existingRes.json();
  const existingNames = new Set((existingData.agents || []).map((a) => a.name));

  const pending = toRegister.filter((a) => !existingNames.has(a.name));
  if (pending.length === 0) {
    console.log("\n✅ All agents already registered.");
    return;
  }

  console.log("\nRegistering agents…");
  for (const agentDef of pending) {
    console.log(`\n▶ ${agentDef.name}`);
    await registerOne(agentDef, token, wallet);
  }

  console.log("\n✅ All agents registered and live on MilkyWay.\n");
}

main().catch((err) => {
  console.error("\n❌", err.message);
  process.exit(1);
});
