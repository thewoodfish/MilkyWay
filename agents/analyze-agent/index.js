const express = require("express");
const { ethers } = require("ethers");

const app = express();
const PORT = process.env.PORT || 3003;

const NAME = "Analyze Agent";
const VERSION = "1.0.0";

const processedJobs = new Set();

app.use(express.json());

// Keyword extraction: returns words longer than 4 chars, deduplicated, top 8
function extractKeywords(text) {
  const stopWords = new Set([
    "this", "that", "with", "from", "have", "been", "they", "their",
    "about", "which", "would", "could", "should", "there", "these",
    "those", "when", "where", "while", "also", "into", "more", "some",
    "than", "then", "over", "only", "used", "uses", "using", "each",
  ]);
  const words = text
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 4 && !stopWords.has(w));
  const freq = {};
  for (const w of words) freq[w] = (freq[w] || 0) + 1;
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([word]) => word);
}

// Simple sentiment: count positive vs negative words
const POSITIVE_WORDS = [
  "good", "great", "excellent", "amazing", "positive", "growth", "improved",
  "successful", "innovative", "leading", "significant", "better", "advanced",
  "scalab", "compat", "growing", "largest", "billion", "enable", "support",
];
const NEGATIVE_WORDS = [
  "failed", "poor", "bad", "negative", "volatile", "risk", "loss", "crash",
  "decline", "problem", "issue", "concern", "difficult", "complex",
];

function analyzeSentiment(text) {
  const lower = text.toLowerCase();
  let score = 0;
  for (const w of POSITIVE_WORDS) if (lower.includes(w)) score += 1;
  for (const w of NEGATIVE_WORDS) if (lower.includes(w)) score -= 1;
  if (score > 2) return { sentiment: "positive", score };
  if (score < 0) return { sentiment: "negative", score };
  return { sentiment: "neutral", score };
}

app.get("/health", (_req, res) => {
  res.json({ name: NAME, version: VERSION, status: "ok" });
});

app.get("/about", (_req, res) => {
  res.json({
    milkyway_version: "1.0",
    name: NAME,
    description: "Analyzes text content. Extracts keywords and determines sentiment. Designed to chain after Fetch Agent.",
    capabilities: ["analyze", "sentiment", "keywords"],
    pricing: { model: "per_job", amount: "0.0001", currency: "ETH" },
    input_schema: {
      content: { type: "string", required: true, description: "Text content to analyze" },
      topic: { type: "string", required: false, description: "Original topic (passed through)" },
    },
    output_schema: {
      keywords: { type: "array", description: "Top keywords extracted from content" },
      sentiment: { type: "string", description: "Sentiment: positive, neutral, or negative" },
      score: { type: "number", description: "Sentiment score (positive = higher)" },
      topic: { type: "string", description: "Topic passed through from input" },
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

  const { content, topic } = task.input;
  const keywords = extractKeywords(content || "");
  const { sentiment, score } = analyzeSentiment(content || "");

  res.json({
    milkyway_version: "1.0",
    job_id,
    status: "completed",
    output: { keywords, sentiment, score, topic: topic || null },
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
