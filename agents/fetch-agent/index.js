const express = require("express");
const { ethers } = require("ethers");

const app = express();
const PORT = process.env.PORT || 3002;

const NAME = "Fetch Agent";
const VERSION = "1.0.0";

const processedJobs = new Set();

app.use(express.json());

// Simulated content database per topic
const CONTENT_DB = {
  bitcoin: {
    content:
      "Bitcoin is a decentralized digital currency created in 2009 by Satoshi Nakamoto. " +
      "It operates on a peer-to-peer network without a central authority. " +
      "Bitcoin uses blockchain technology to record transactions and is capped at 21 million coins. " +
      "It has seen significant price volatility and is widely used as a store of value.",
    source: "https://simulated-knowledge-base.milkyway/bitcoin",
  },
  ethereum: {
    content:
      "Ethereum is a decentralized blockchain platform launched in 2015 by Vitalik Buterin. " +
      "It supports smart contracts and decentralized applications (dApps). " +
      "The native currency Ether (ETH) is used to pay for transaction fees. " +
      "Ethereum transitioned to proof-of-stake in 2022, reducing energy usage by ~99.95%.",
    source: "https://simulated-knowledge-base.milkyway/ethereum",
  },
  arbitrum: {
    content:
      "Arbitrum is a Layer 2 scaling solution for Ethereum developed by Offchain Labs. " +
      "It uses optimistic rollup technology to achieve higher throughput and lower fees. " +
      "Arbitrum is EVM-compatible, allowing easy deployment of existing Ethereum contracts. " +
      "The Arbitrum One mainnet launched in 2021 and has grown to be one of the largest L2s by TVL.",
    source: "https://simulated-knowledge-base.milkyway/arbitrum",
  },
  defi: {
    content:
      "Decentralized Finance (DeFi) refers to financial services built on blockchain networks. " +
      "Key components include decentralized exchanges, lending protocols, and stablecoins. " +
      "DeFi eliminates intermediaries by using smart contracts to automate financial logic. " +
      "Total value locked in DeFi protocols has reached hundreds of billions of dollars.",
    source: "https://simulated-knowledge-base.milkyway/defi",
  },
  ai: {
    content:
      "Artificial intelligence is transforming industries with capabilities like natural language processing, " +
      "computer vision, and autonomous decision-making. Large language models have enabled new forms of " +
      "human-computer interaction. AI agents can now perform complex multi-step tasks autonomously. " +
      "The intersection of AI and blockchain is creating new possibilities for trustless automation.",
    source: "https://simulated-knowledge-base.milkyway/ai",
  },
};

const DEFAULT_CONTENT = {
  content:
    "This topic covers emerging trends at the intersection of technology and decentralized systems. " +
    "Key developments include improved scalability, better user experiences, and growing adoption. " +
    "Research continues to advance the field with new protocols and applications being developed regularly.",
  source: "https://simulated-knowledge-base.milkyway/general",
};

app.get("/health", (_req, res) => {
  res.json({ name: NAME, version: VERSION, status: "ok" });
});

app.get("/about", (_req, res) => {
  res.json({
    milkyway_version: "1.0",
    name: NAME,
    description: "Fetches simulated content for a given topic. Outputs raw content ready for analysis.",
    capabilities: ["fetch", "research"],
    pricing: { model: "per_job", amount: "0.0001", currency: "ETH" },
    input_schema: {
      topic: { type: "string", required: true, description: "Topic to fetch content about" },
    },
    output_schema: {
      content: { type: "string", description: "Fetched text content about the topic" },
      source: { type: "string", description: "Source URL of the content" },
      topic: { type: "string", description: "The topic that was fetched" },
    },
    max_deadline_seconds: 10,
  });
});

app.post("/execute", async (req, res) => {
  const { milkyway_version, job_id, escrow_tx, task, deadline } = req.body;

  if (milkyway_version !== "1.0") {
    return res.status(400).json({ error: "Unsupported protocol version" });
  }

  if (deadline < Math.floor(Date.now() / 1000)) {
    return res.status(408).json({
      milkyway_version: "1.0", job_id, status: "expired",
      error: "Deadline has passed",
    });
  }

  if (processedJobs.has(job_id)) {
    return res.status(409).json({
      milkyway_version: "1.0", job_id, status: "duplicate",
      error: "Job already processed",
    });
  }

  const valid = await verifyEscrow(escrow_tx, job_id);
  if (!valid) {
    return res.status(402).json({
      milkyway_version: "1.0", job_id, status: "payment_required",
      error: "Escrow not verified",
    });
  }

  processedJobs.add(job_id);

  const topic = (task.input.topic || "").toLowerCase().trim();
  const result = CONTENT_DB[topic] || DEFAULT_CONTENT;

  res.json({
    milkyway_version: "1.0",
    job_id,
    status: "completed",
    output: {
      content: result.content,
      source: result.source,
      topic: task.input.topic,
    },
    completed_at: Math.floor(Date.now() / 1000),
  });
});

const ESCROW_ABI = [
  "function getJob(bytes32 jobId) external view returns (tuple(bytes32,address,address[],uint256[],uint256,uint256,uint8,uint256,uint256))",
];

async function verifyEscrow(_escrowTx, jobId) {
  try {
    const rpc = process.env.ARBITRUM_RPC || "https://arb-sepolia.g.alchemy.com/v2/Ukyp1Ogy1qih7QQ6fO8FY";
    const escrowAddress = process.env.JOB_ESCROW_ADDRESS || "0xdefea667504b720972cdc723124796a03756d384";
    const provider = new ethers.JsonRpcProvider(rpc);
    const contract = new ethers.Contract(escrowAddress, ESCROW_ABI, provider);
    const job = await contract.getJob(jobId);
    // job[6] is status: 0=LOCKED, 1=RUNNING, 2=COMPLETED, 3=REFUNDED, 4=FAILED
    return job[6] === 1n || job[6] === 0n;
  } catch {
    return false;
  }
}

app.listen(PORT, () => {
  console.log(`${NAME} v${VERSION} running on http://localhost:${PORT}`);
  console.log(`  Health:  GET  /health`);
  console.log(`  About:   GET  /about`);
  console.log(`  Execute: POST /execute`);
});
