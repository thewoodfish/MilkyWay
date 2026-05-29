const express = require("express");
const { ethers } = require("ethers");

const app = express();
const PORT = process.env.PORT || 3001;

const NAME = "Hello Agent";
const VERSION = "2.0.0";

// Track processed job IDs for idempotency
const processedJobs = new Set();

app.use(express.json());

// ── Phase 1: Health ────────────────────────────────────────────────────

app.get("/health", (_req, res) => {
  res.json({ name: NAME, version: VERSION, status: "ok" });
});

// ── Phase 2: About ─────────────────────────────────────────────────────

app.get("/about", (_req, res) => {
  res.json({
    milkyway_version: "1.0",
    name: NAME,
    description: "A simple hello world agent. Greets any input name.",
    capabilities: ["greet"],
    pricing: { model: "per_job", amount: "0.0001", currency: "ETH" },
    input_schema: {
      name: { type: "string", required: true, description: "Name to greet" },
    },
    output_schema: {
      greeting: { type: "string", description: "The greeting message" },
      timestamp: { type: "number", description: "Unix timestamp of greeting" },
    },
    max_deadline_seconds: 5,
  });
});

// ── Phase 2: Execute ───────────────────────────────────────────────────

app.post("/execute", async (req, res) => {
  const { milkyway_version, job_id, caller, escrow_tx, task, deadline } = req.body;

  if (milkyway_version !== "1.0") {
    return res.status(400).json({ error: "Unsupported protocol version" });
  }

  if (deadline < Math.floor(Date.now() / 1000)) {
    return res.status(408).json({
      milkyway_version: "1.0", job_id, status: "expired",
      error: "Deadline has passed",
    });
  }

  // Idempotency — refuse duplicate job IDs
  if (processedJobs.has(job_id)) {
    return res.status(409).json({
      milkyway_version: "1.0", job_id, status: "duplicate",
      error: "Job already processed",
    });
  }

  // Verify escrow on-chain
  const valid = await verifyEscrow(escrow_tx, job_id);
  if (!valid) {
    return res.status(402).json({
      milkyway_version: "1.0", job_id, status: "payment_required",
      error: "Escrow not verified",
    });
  }

  processedJobs.add(job_id);

  const { name } = task.input;
  res.json({
    milkyway_version: "1.0",
    job_id,
    status: "completed",
    output: {
      greeting: `Hello, ${name}! Welcome to MilkyWay.`,
      timestamp: Math.floor(Date.now() / 1000),
    },
    completed_at: Math.floor(Date.now() / 1000),
  });
});

// ── Escrow verification ────────────────────────────────────────────────

const ESCROW_ABI = [
  "function getJob(bytes32 jobId) external view returns (tuple(bytes32,address,address[],uint256[],uint256,uint256,uint8,uint256,uint256))",
];

async function verifyEscrow(escrowTx, jobId) {
  try {
    const rpc = process.env.ARBITRUM_RPC || "https://arb-sepolia.g.alchemy.com/v2/Ukyp1Ogy1qih7QQ6fO8FY";
    const escrowAddress = process.env.JOB_ESCROW_ADDRESS || "0xdefea667504b720972cdc723124796a03756d384";
    const provider = new ethers.JsonRpcProvider(rpc);
    const contract = new ethers.Contract(escrowAddress, ESCROW_ABI, provider);
    const job = await contract.getJob(jobId);
    // status: 0=NONE, 1=LOCKED, 2=RUNNING, 3=COMPLETED, 4=REFUNDED
    return job[6] === 1n || job[6] === 2n;
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
