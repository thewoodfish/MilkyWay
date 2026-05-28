# MILKYWAY_PHASE1.md
## MilkyWay — Phase 1: Identity Registry
### Complete Build Specification for Claude Code

Read this file completely before writing a single line of code.
This is a startup, not a hackathon project. Every decision here is intentional.
Do not deviate from the architecture without flagging it first.

---

## What MilkyWay Is

MilkyWay is the universe of autonomous AI agents.

A marketplace and protocol where developers publish agents and earn automatically
every time someone uses them. Users browse, activate, and pay agents per use.
Agents hire other agents. Everything settles on-chain on Arbitrum.

**Phase 1 is the foundation: a trusted, verified, on-chain registry of AI agents.**

Nothing more. Nothing less. Done completely.

---

## Phase 1 Scope

**What Phase 1 IS:**
- On-chain agent identity (ERC-721 NFT per agent)
- Agent profile stored in Postgres, integrity hash on-chain
- Endpoint liveness verification (health check ping)
- Badge system: Bronze / Silver / Gold
- Five UI screens: Home, Listing, Profile, Register, Builder Dashboard
- Staking at registration (0.01 ETH minimum)
- Verification oracle (backend cron, pings every 24h)

**What Phase 1 IS NOT:**
- Payments between users and agents (Phase 2)
- Agent-to-agent communication (Phase 2)
- Ratings and reviews (Phase 4)
- No-code agent builder (Phase 3)
- Hosted agent deployment (Phase 3)
- Custom token $MWY (future)
- Governance (future)
- Multichain (future)

---

## Tech Stack

```
Blockchain:     Arbitrum One (Chain ID: 42161)
                Arbitrum Sepolia for testing (Chain ID: 421614)
Smart Contract: Solidity 0.8.24 + Foundry
Database:       Postgres via Neon (serverless, free tier to start)
Backend:        Node.js + Express + TypeScript
Frontend:       Next.js 14 (App Router) + TypeScript + Tailwind CSS
Wallet:         wagmi v2 + viem v2 + RainbowKit
Images/Logos:   Cloudinary (free tier)
ORM:            Prisma
Deployment:     Vercel (frontend + backend API routes)
```

---

## Repository Structure

```
milkyway/
├── MILKYWAY_PHASE1.md              ← this file
├── README.md
├── contracts/                      ← Solidity + Foundry
│   ├── foundry.toml
│   ├── src/
│   │   └── AgentRegistry.sol
│   ├── script/
│   │   └── Deploy.s.sol
│   └── test/
│       └── AgentRegistry.t.sol
├── backend/                        ← Node.js + Express + TypeScript
│   ├── package.json
│   ├── tsconfig.json
│   ├── prisma/
│   │   └── schema.prisma
│   └── src/
│       ├── index.ts                ← Express server, port 4000
│       ├── routes/
│       │   ├── agents.ts           ← CRUD for agents
│       │   └── verify.ts           ← verification oracle trigger
│       ├── services/
│       │   ├── verification.ts     ← health check ping logic
│       │   └── ipfs.ts             ← image upload to Cloudinary
│       └── lib/
│           ├── db.ts               ← Prisma client
│           └── chain.ts            ← viem client for Arbitrum
└── frontend/                       ← Next.js 14
    ├── package.json
    ├── next.config.js
    ├── tailwind.config.js
    └── app/
        ├── layout.tsx
        ├── page.tsx                ← Screen 1: Home / Discovery
        ├── agents/
        │   ├── page.tsx            ← Screen 2: Agent Listing
        │   └── [agentId]/
        │       └── page.tsx        ← Screen 3: Agent Profile
        ├── register/
        │   └── page.tsx            ← Screen 4: Register Agent
        └── dashboard/
            └── page.tsx            ← Screen 5: Builder Dashboard
```

---

## Smart Contract: AgentRegistry.sol

One contract. Mints and manages agent NFT identities.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract AgentRegistry is ERC721URIStorage, Ownable, ReentrancyGuard {

    // ── State ──────────────────────────────────────────────────────────

    uint256 private _nextAgentId;
    uint256 public minimumStake = 0.01 ether;

    struct AgentData {
        address owner;
        bytes32 metadataHash;   // keccak256 of full profile JSON in Postgres
        uint256 stake;          // ETH staked at registration
        uint256 registeredAt;
        uint256 lastVerifiedAt;
        bool active;
        uint8 badgeTier;        // 0=none, 1=Bronze, 2=Silver, 3=Gold
    }

    mapping(uint256 => AgentData) public agents;

    // ── Events ─────────────────────────────────────────────────────────

    event AgentRegistered(
        uint256 indexed agentId,
        address indexed owner,
        bytes32 metadataHash,
        uint256 stake,
        uint256 timestamp
    );
    event AgentUpdated(uint256 indexed agentId, bytes32 newMetadataHash);
    event AgentDeactivated(uint256 indexed agentId, uint256 stakeReturned);
    event AgentVerified(uint256 indexed agentId, uint256 timestamp);
    event BadgeUpdated(uint256 indexed agentId, uint8 newBadge);

    // ── Constructor ────────────────────────────────────────────────────

    constructor() ERC721("MilkyWay Agent", "MWAGENT") Ownable(msg.sender) {}

    // ── Core Functions ─────────────────────────────────────────────────

    /// @notice Register a new agent. Requires minimum ETH stake.
    /// @param metadataHash keccak256 hash of the full profile JSON stored in Postgres
    /// @return agentId The newly minted agent NFT ID
    function registerAgent(
        bytes32 metadataHash
    ) external payable nonReentrant returns (uint256 agentId) {
        require(msg.value >= minimumStake, "Insufficient stake");
        require(metadataHash != bytes32(0), "Invalid metadata hash");

        agentId = _nextAgentId++;
        _safeMint(msg.sender, agentId);

        agents[agentId] = AgentData({
            owner: msg.sender,
            metadataHash: metadataHash,
            stake: msg.value,
            registeredAt: block.timestamp,
            lastVerifiedAt: 0,
            active: true,
            badgeTier: 0   // starts with no badge, oracle assigns Bronze after first successful ping
        });

        emit AgentRegistered(agentId, msg.sender, metadataHash, msg.value, block.timestamp);
    }

    /// @notice Update agent metadata hash after profile update in Postgres
    function updateMetadata(
        uint256 agentId,
        bytes32 newMetadataHash
    ) external {
        require(ownerOf(agentId) == msg.sender, "Not agent owner");
        require(agents[agentId].active, "Agent not active");
        require(newMetadataHash != bytes32(0), "Invalid hash");

        agents[agentId].metadataHash = newMetadataHash;
        emit AgentUpdated(agentId, newMetadataHash);
    }

    /// @notice Deactivate agent and return stake to owner
    function deactivateAgent(uint256 agentId) external nonReentrant {
        require(ownerOf(agentId) == msg.sender, "Not agent owner");
        require(agents[agentId].active, "Already inactive");

        uint256 stakeToReturn = agents[agentId].stake;
        agents[agentId].active = false;
        agents[agentId].stake = 0;

        (bool sent,) = msg.sender.call{value: stakeToReturn}("");
        require(sent, "Stake return failed");

        emit AgentDeactivated(agentId, stakeToReturn);
    }

    // ── Oracle Functions (MilkyWay backend only) ───────────────────────

    /// @notice Called by MilkyWay verification oracle after successful health check
    function markVerified(uint256 agentId, uint8 badgeTier) external onlyOwner {
        require(agents[agentId].active, "Agent not active");
        agents[agentId].lastVerifiedAt = block.timestamp;
        agents[agentId].badgeTier = badgeTier;
        emit AgentVerified(agentId, block.timestamp);
        emit BadgeUpdated(agentId, badgeTier);
    }

    // ── View Functions ─────────────────────────────────────────────────

    function getAgent(uint256 agentId) external view returns (AgentData memory) {
        return agents[agentId];
    }

    function totalAgents() external view returns (uint256) {
        return _nextAgentId;
    }

    function isActive(uint256 agentId) external view returns (bool) {
        return agents[agentId].active;
    }

    // ── Admin ──────────────────────────────────────────────────────────

    function setMinimumStake(uint256 newMinimum) external onlyOwner {
        minimumStake = newMinimum;
    }

    // ERC-721 transfer clears verification status
    function _update(
        address to,
        uint256 agentId,
        address auth
    ) internal override returns (address) {
        address from = super._update(to, agentId, auth);
        if (from != address(0) && to != address(0)) {
            agents[agentId].owner = to;
            agents[agentId].lastVerifiedAt = 0;
            agents[agentId].badgeTier = 0;
        }
        return from;
    }
}
```

### foundry.toml
```toml
[profile.default]
src = "src"
out = "out"
libs = ["lib"]
solc = "0.8.24"

[rpc_endpoints]
arbitrum_one = "${ARBITRUM_RPC}"
arbitrum_sepolia = "${ARBITRUM_SEPOLIA_RPC}"

[etherscan]
arbitrum_one = { key = "${ARBISCAN_API_KEY}", url = "https://api.arbiscan.io/api" }
arbitrum_sepolia = { key = "${ARBISCAN_API_KEY}", url = "https://api-sepolia.arbiscan.io/api" }
```

### Deploy.s.sol
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/AgentRegistry.sol";

contract Deploy is Script {
    function run() external {
        uint256 pk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        vm.startBroadcast(pk);
        AgentRegistry registry = new AgentRegistry();
        console.log("AgentRegistry deployed:", address(registry));
        vm.stopBroadcast();
    }
}
```

### Deploy Commands
```bash
# Install dependencies
forge install OpenZeppelin/openzeppelin-contracts --no-commit

# Test
forge test -vvv

# Deploy to Sepolia first
forge script script/Deploy.s.sol --rpc-url arbitrum_sepolia --broadcast --verify

# Deploy to Arbitrum One
forge script script/Deploy.s.sol --rpc-url arbitrum_one --broadcast --verify
```

---

## Database Schema: Prisma

```prisma
// backend/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Agent {
  id              String    @id @default(cuid())
  agentId         Int       @unique           // on-chain NFT ID
  name            String
  description     String
  category        Category
  subcategory     String?
  version         String    @default("1.0.0")
  endpoint        String                      // agent's base URL
  pricingModel    PricingModel
  priceEth        String                      // stored as string to avoid float issues
  permissions     String[]                    // ["read_wallet", "execute_transactions"]
  logoUrl         String?                     // Cloudinary URL
  metadataHash    String                      // keccak256 — must match on-chain
  ownerAddress    String                      // wallet address
  badgeTier       BadgeTier @default(NONE)
  active          Boolean   @default(true)
  verifiedAt      DateTime?
  failedChecks    Int       @default(0)
  registeredAt    DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  txHash          String?                     // registration transaction hash

  builder         Builder   @relation(fields: [ownerAddress], references: [address])

  @@index([category])
  @@index([ownerAddress])
  @@index([active])
  @@index([badgeTier])
}

model Builder {
  address         String    @id             // wallet address
  agentsCount     Int       @default(0)
  totalEarnings   String    @default("0")   // in ETH, stored as string
  joinedAt        DateTime  @default(now())
  agents          Agent[]
}

model VerificationLog {
  id              String    @id @default(cuid())
  agentId         Int
  endpoint        String
  success         Boolean
  statusCode      Int?
  responseTimeMs  Int?
  checkedAt       DateTime  @default(now())

  @@index([agentId])
  @@index([checkedAt])
}

enum Category {
  DEFI
  TRADING
  DATA
  PRODUCTIVITY
  UTILITY
  SECURITY
  GAMING
  SOCIAL
}

enum PricingModel {
  PER_CALL
  PER_DAY
  PER_MONTH
  FREE
}

enum BadgeTier {
  NONE
  BRONZE
  SILVER
  GOLD
}
```

---

## Backend API: Express + TypeScript

### Environment Variables
```bash
# backend/.env
DATABASE_URL=postgresql://...         # Neon connection string
ARBITRUM_RPC=https://arb1.arbitrum.io/rpc
ARBITRUM_SEPOLIA_RPC=https://sepolia-rollup.arbitrum.io/rpc
AGENT_REGISTRY_ADDRESS=0x...          # deployed contract address
DEPLOYER_PRIVATE_KEY=0x...            # oracle signing wallet
CLOUDINARY_URL=cloudinary://...
PORT=4000
```

### API Routes

```
GET    /api/agents                    list all agents (with filters)
GET    /api/agents/:agentId           get single agent
POST   /api/agents/register           register new agent (pre-chain)
PUT    /api/agents/:agentId           update agent metadata
DELETE /api/agents/:agentId           deactivate agent

GET    /api/builders/:address         get builder profile + their agents
GET    /api/stats                     total agents, builders, ETH staked

POST   /api/verify/ping               manually trigger health check (admin)
GET    /api/verify/logs/:agentId      verification history
```

### backend/src/routes/agents.ts

```typescript
import { Router, Request, Response } from "express";
import { prisma } from "../lib/db";
import { ethers } from "ethers";
import { verifyEndpoint } from "../services/verification";

const router = Router();

// GET /api/agents — list with filters
router.get("/", async (req: Request, res: Response) => {
  const {
    category,
    badge,
    search,
    page = "1",
    limit = "20"
  } = req.query;

  const where: any = { active: true };
  if (category) where.category = category;
  if (badge) where.badgeTier = badge;
  if (search) {
    where.OR = [
      { name: { contains: search as string, mode: "insensitive" } },
      { description: { contains: search as string, mode: "insensitive" } }
    ];
  }

  const [agents, total] = await Promise.all([
    prisma.agent.findMany({
      where,
      orderBy: { registeredAt: "desc" },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit)
    }),
    prisma.agent.count({ where })
  ]);

  res.json({ agents, total, page: Number(page), limit: Number(limit) });
});

// GET /api/agents/:agentId
router.get("/:agentId", async (req: Request, res: Response) => {
  const agent = await prisma.agent.findUnique({
    where: { agentId: Number(req.params.agentId) },
    include: {
      builder: true
    }
  });
  if (!agent) return res.status(404).json({ error: "Agent not found" });
  res.json(agent);
});

// POST /api/agents/register
// Called BEFORE the on-chain transaction.
// Frontend calls this to:
//   1. Validate the endpoint is live
//   2. Get the metadataHash to sign on-chain
router.post("/register", async (req: Request, res: Response) => {
  const {
    name,
    description,
    category,
    subcategory,
    version,
    endpoint,
    pricingModel,
    priceEth,
    permissions,
    logoUrl,
    ownerAddress
  } = req.body;

  // Validate required fields
  if (!name || !description || !category || !endpoint || !ownerAddress) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // Ping the endpoint first
  const pingResult = await verifyEndpoint(endpoint);
  if (!pingResult.success) {
    return res.status(400).json({
      error: "Endpoint verification failed",
      detail: pingResult.error
    });
  }

  // Build the profile object
  const profile = {
    name,
    description,
    category,
    subcategory: subcategory || null,
    version: version || "1.0.0",
    endpoint,
    pricingModel,
    priceEth,
    permissions: permissions || [],
    logoUrl: logoUrl || null,
    ownerAddress
  };

  // Compute metadata hash (must match what goes on-chain)
  const profileJSON = JSON.stringify(profile, Object.keys(profile).sort());
  const metadataHash = ethers.keccak256(ethers.toUtf8Bytes(profileJSON));

  // Store in Postgres as PENDING (no agentId yet — assigned after tx confirms)
  const agent = await prisma.agent.create({
    data: {
      agentId: -1,            // placeholder — updated after tx confirms
      metadataHash,
      active: false,          // activated after tx confirms
      ...profile,
      builder: {
        connectOrCreate: {
          where: { address: ownerAddress },
          create: { address: ownerAddress }
        }
      }
    }
  });

  // Return hash for frontend to use in registerAgent(metadataHash) call
  res.json({
    metadataHash,
    profileId: agent.id,      // internal DB id to update after tx confirms
    pingResult
  });
});

// POST /api/agents/confirm
// Called AFTER the on-chain transaction confirms.
// Updates Postgres with the real agentId and activates the agent.
router.post("/confirm", async (req: Request, res: Response) => {
  const { profileId, agentId, txHash } = req.body;

  const agent = await prisma.agent.update({
    where: { id: profileId },
    data: {
      agentId,
      txHash,
      active: true,
      badgeTier: "BRONZE"       // first verification sets Bronze
    }
  });

  // Update builder agent count
  await prisma.builder.update({
    where: { address: agent.ownerAddress },
    data: { agentsCount: { increment: 1 } }
  });

  res.json({ success: true, agent });
});

export default router;
```

### backend/src/services/verification.ts

```typescript
import { prisma } from "../lib/db";

interface PingResult {
  success: boolean;
  statusCode?: number;
  responseTimeMs?: number;
  error?: string;
}

export async function verifyEndpoint(endpoint: string): Promise<PingResult> {
  const start = Date.now();
  try {
    const url = `${endpoint.replace(/\/$/, "")}/health`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout

    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "MilkyWay-Verifier/1.0" }
    });

    clearTimeout(timeout);
    const responseTimeMs = Date.now() - start;

    if (response.status === 200) {
      return { success: true, statusCode: 200, responseTimeMs };
    }

    return {
      success: false,
      statusCode: response.status,
      responseTimeMs,
      error: `Endpoint returned HTTP ${response.status}`
    };

  } catch (err: any) {
    return {
      success: false,
      responseTimeMs: Date.now() - start,
      error: err.name === "AbortError" ? "Timeout after 5 seconds" : err.message
    };
  }
}

// Cron job — runs every 24 hours
// Call this from a scheduler (node-cron or Vercel cron)
export async function runVerificationCycle() {
  console.log("Starting verification cycle...");

  const agents = await prisma.agent.findMany({
    where: { active: true },
    select: { id: true, agentId: true, endpoint: true, failedChecks: true }
  });

  for (const agent of agents) {
    const result = await verifyEndpoint(agent.endpoint);

    // Log every check
    await prisma.verificationLog.create({
      data: {
        agentId: agent.agentId,
        endpoint: agent.endpoint,
        success: result.success,
        statusCode: result.statusCode || null,
        responseTimeMs: result.responseTimeMs || null
      }
    });

    if (result.success) {
      // Reset failed checks, update badge to Bronze minimum
      await prisma.agent.update({
        where: { id: agent.id },
        data: {
          failedChecks: 0,
          verifiedAt: new Date(),
          badgeTier: "BRONZE"
        }
      });
    } else {
      const newFailedCount = agent.failedChecks + 1;

      await prisma.agent.update({
        where: { id: agent.id },
        data: {
          failedChecks: newFailedCount,
          // Downgrade badge after 3 failures, flag after 7
          badgeTier: newFailedCount >= 3 ? "NONE" : undefined
        }
      });

      if (newFailedCount >= 7) {
        console.warn(`Agent ${agent.agentId} flagged as inactive after 7 failed checks`);
      }
    }
  }

  console.log(`Verification cycle complete. Checked ${agents.length} agents.`);
}
```

---

## Frontend: Next.js 14

### Design Direction

MilkyWay is a universe. The design must feel like space.

```
Theme:          Dark. Deep space. Not generic dark UI.
Background:     Near-black with subtle star field texture (#050510)
Primary:        Bright white (#FAFAFA)
Secondary:      Muted blue-grey (#8892A4)
Accent:         Electric indigo (#6366F1) — the galaxy's glow
Success:        Emerald (#10B981)
Warning:        Amber (#F59E0B)
Cards:          Semi-transparent dark (#0D0D1A) with subtle border
Border:         rgba(255,255,255,0.08)
Font display:   'Syne' — geometric, futuristic, confident
Font body:      'DM Sans' — clean, readable, modern
Monospace:      'JetBrains Mono' — addresses and hashes
Border radius:  16px cards, 12px buttons
```

Star field: CSS background with radial gradients and tiny white dots.
Subtle nebula glow behind hero sections.
Agent cards have a faint glow on hover — like stars brightening.

### Screen 1 — Home (app/page.tsx)

```
HERO SECTION
  Headline: "The Universe of Autonomous Agents"
  Subline: "Build agents. Publish once. Earn forever."
  CTA buttons: "Explore Agents" | "Register Your Agent"
  Background: animated star field, subtle nebula

STATS BAR
  [X Agents] [X Builders] [X ETH Staked] [X Verifications Today]
  Live numbers from /api/stats

CATEGORY FILTER ROW
  DeFi | Trading | Data | Productivity | Utility | Security | All

FEATURED AGENTS
  3 manually curated agent cards
  Full-width cards, larger format

LATEST AGENTS
  Grid of agent cards — most recently registered
  "View All" → /agents
```

### Screen 2 — Agent Listing (app/agents/page.tsx)

```
HEADER
  "All Agents" with total count
  Search input — queries name and description
  Filters: Category, Badge Tier, Pricing Model
  Sort: Newest | Most Used | Price Low-High

AGENT GRID
  Responsive: 3 cols desktop, 2 tablet, 1 mobile
  Each card:
    Logo (or generated galaxy avatar if none)
    Name + version badge
    Category tag
    Badge tier icon: 🥉 🥈 🥇 (Bronze/Silver/Gold)
    Description (2 lines, truncated)
    Price: "0.001 ETH / call" or "Free"
    Builder: "by 0x1234...5678"
    Status dot: green (live) / amber (degraded) / red (down)
    "View Agent →" link

PAGINATION
  Infinite scroll or page numbers
```

### Screen 3 — Agent Profile (app/agents/[agentId]/page.tsx)

```
HEADER
  Large logo
  Name + version
  Category + subcategory tags
  Badge tier (with tooltip explaining what it means)
  Status indicator (live/degraded/down) + "Last verified X ago"

DESCRIPTION
  Full description, no truncation

TWO COLUMN LAYOUT
  LEFT:
    Pricing details
    Permissions required (with explanations)
    Endpoint (truncated, not full URL for security)
    "Activate Agent" button — STUBBED with "Coming in Phase 2"

  RIGHT:
    Builder card
      Wallet address
      "X agents published"
      "Member since X"
    
    On-chain details
      Agent ID: #42
      Contract: 0x... (link to Arbiscan)
      TX Hash: 0x... (link to Arbiscan)
      Registered: date
      Stake: 0.01 ETH

VERIFICATION HISTORY
  Last 10 verification logs
  Timestamp | Status | Response time
```

### Screen 4 — Register Agent (app/register/page.tsx)

Multi-step form. Each step is a separate visual state.

```
STEP 1 — Connect Wallet
  "Connect your wallet to register an agent"
  RainbowKit connect button
  Shows: MetaMask, WalletConnect, Coinbase Wallet

STEP 2 — Agent Profile
  Fields:
    Name*
    Description* (textarea, 500 chars max)
    Category* (dropdown)
    Subcategory (text input)
    Version (default 1.0.0)
    Endpoint URL* (must be https://)
    Logo (image upload → Cloudinary)
  
  "Test Endpoint" button
    → calls POST /api/agents/register with just the endpoint
    → shows: ✅ "Endpoint is live" or ❌ "Cannot reach endpoint"

STEP 3 — Pricing
  Pricing model: Per Call / Per Day / Per Month / Free
  Price in ETH (input with USD estimate below)
  Permissions checklist:
    □ Read wallet balance
    □ Execute transactions
    □ Access external APIs
    □ Manage other agents

STEP 4 — Review + Stake
  Summary of everything entered
  "Registration requires staking 0.01 ETH"
  "Your stake is returned when you deactivate your agent"
  Total cost shown: 0.01 ETH stake + gas estimate
  "Register Agent" button → triggers wallet transaction

STEP 5 — Success
  Animated star appearing in the galaxy
  "Your agent is live in the MilkyWay universe"
  Agent ID: #42
  "View Your Agent →"
  "Register Another →"
```

### Screen 5 — Builder Dashboard (app/dashboard/page.tsx)

```
Requires wallet connected

HEADER
  Builder address
  "X agents published" | "X ETH staked total"

MY AGENTS TABLE
  Columns: Name | Badge | Status | Last Verified | Actions
  Actions: Edit | View | Deactivate

EDIT MODAL
  Update name, description, pricing, logo
  Cannot change endpoint or category (requires re-registration)
  On save: recomputes metadataHash, calls updateMetadata on-chain

DEACTIVATE FLOW
  Confirmation dialog: "This will return your 0.01 ETH stake"
  "Are you sure?" → calls deactivateAgent on-chain

VERIFICATION HISTORY
  Table of all pings across all agents
  Filter by agent
```

---

## Registration Flow (Frontend ↔ Backend ↔ Chain)

This is the most critical flow. Implement exactly in this order.

```
1. User fills form (Steps 1-3)

2. User clicks "Test Endpoint"
   → POST /api/agents/pre-verify { endpoint }
   → Backend pings {endpoint}/health
   → Returns: { success: true/false, responseTimeMs }
   → UI shows result inline

3. User clicks "Register Agent" (Step 4)
   → POST /api/agents/register (full profile)
   → Backend pings endpoint again (double check)
   → Backend computes metadataHash
   → Backend creates Postgres record (agentId: -1, active: false)
   → Returns: { metadataHash, profileId }

4. Frontend calls AgentRegistry.registerAgent(metadataHash)
   with value: 0.01 ETH (from user's wallet via wagmi)
   → User signs in wallet
   → Transaction submitted to Arbitrum

5. Frontend waits for transaction confirmation
   → useWaitForTransactionReceipt (wagmi)
   → Parse AgentRegistered event from receipt logs
   → Extract agentId from event

6. Frontend calls POST /api/agents/confirm
   { profileId, agentId, txHash }
   → Backend updates Postgres: agentId = real value, active = true
   → Backend triggers immediate verification ping
   → Badge set to BRONZE on success

7. Show Step 5 success screen
```

---

## Metadata Hash — Critical Implementation Detail

The metadataHash links the off-chain Postgres profile to the on-chain record.
It must be computed identically in both backend and frontend.

**The rule: always sort keys alphabetically before hashing.**

```typescript
// ALWAYS use this function. Never hash a profile any other way.
import { ethers } from "ethers";

export function computeMetadataHash(profile: AgentProfile): string {
  // Sort keys deterministically
  const sorted = JSON.stringify(profile, Object.keys(profile).sort());
  return ethers.keccak256(ethers.toUtf8Bytes(sorted));
}

// The profile fields included in the hash (exactly these, in this order after sort):
// category, description, endpoint, logoUrl, name, ownerAddress,
// permissions, priceEth, pricingModel, subcategory, version
```

If you change what's included in the hash, you must re-register the agent on-chain.
The hash is immutable once minted. This is intentional — it's the integrity guarantee.

---

## Health Endpoint Standard (Phase 1)

Every agent registered on MilkyWay MUST implement:

```
GET /health

Response (HTTP 200):
{
  "name": "My Agent Name",
  "version": "1.0.0",
  "status": "ok"
}
```

This is the only interface requirement in Phase 1.
The full MilkyWay protocol interface is defined in Phase 2.

Document this clearly in the README — developers need to know this before registering.

---

## Environment Variables

```bash
# contracts/.env
DEPLOYER_PRIVATE_KEY=0x...
ARBITRUM_RPC=https://arb1.arbitrum.io/rpc
ARBITRUM_SEPOLIA_RPC=https://sepolia-rollup.arbitrum.io/rpc
ARBISCAN_API_KEY=...

# backend/.env
DATABASE_URL=postgresql://...
ARBITRUM_RPC=https://arb1.arbitrum.io/rpc
AGENT_REGISTRY_ADDRESS=0x...
DEPLOYER_PRIVATE_KEY=0x...        # oracle wallet — separate from registration wallet
CLOUDINARY_URL=cloudinary://...
PORT=4000

# frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS=0x...
NEXT_PUBLIC_ARBITRUM_CHAIN_ID=42161
```

---

## Build Order for Claude Code

Follow exactly. Each phase must be complete before the next.

```
PHASE A — CONTRACTS
  1. forge install OpenZeppelin/openzeppelin-contracts --no-commit
  2. Write AgentRegistry.sol
  3. Write AgentRegistry.t.sol (test register, update, deactivate, verify)
  4. forge test -vvv — must pass 100%
  5. Deploy to Arbitrum Sepolia
  6. Save address → all .env files
  7. Deploy to Arbitrum One
  8. Verify on Arbiscan

PHASE B — DATABASE
  9.  Write prisma/schema.prisma
  10. Set up Neon database, get connection string
  11. npx prisma migrate dev --name init
  12. npx prisma generate

PHASE C — BACKEND
  13. Write backend/src/lib/db.ts
  14. Write backend/src/lib/chain.ts (viem client)
  15. Write backend/src/services/verification.ts
  16. Write backend/src/routes/agents.ts
  17. Write backend/src/index.ts
  18. Test all routes with curl or Postman
  19. Verify: POST /api/agents/register with a live endpoint succeeds
  20. Verify: GET /api/agents returns results

PHASE D — FRONTEND
  21. npx create-next-app@14 frontend (TypeScript, Tailwind, App Router)
  22. Install: wagmi viem @rainbow-me/rainbowkit ethers
  23. Configure RainbowKit for Arbitrum One + Sepolia
  24. Write app/layout.tsx (providers, fonts, star field background)
  25. Write app/page.tsx (Home — hero, stats, featured agents)
  26. Write app/agents/page.tsx (Listing — grid, search, filters)
  27. Write app/agents/[agentId]/page.tsx (Profile — full details)
  28. Write app/register/page.tsx (Registration — 5 step flow)
  29. Write app/dashboard/page.tsx (Builder Dashboard)
  30. End-to-end test: register a real agent, see it appear in listing

PHASE E — VERIFICATION ORACLE
  31. Write the cron job (node-cron or Vercel cron)
  32. Schedule every 24 hours
  33. Test manually: POST /api/verify/ping/:agentId
```

---

## Common Mistakes — Never Make These

- **Never store ETH amounts as floats.** Always strings or BigInt.
- **Never skip key sorting in metadataHash computation.** The hash must be deterministic.
- **Never call the chain directly from the frontend for writes.** All write transactions go through wagmi.
- **Never hardcode contract addresses.** Always environment variables.
- **Never store the deployer private key anywhere except .env.** .gitignore must cover all .env files.
- **The oracle wallet is separate from the deployer wallet.** markVerified() is called by the oracle. Use a different key.
- **agentId in Postgres starts at -1 (pending).** Only update to the real value after the on-chain event confirms.
- **The metadataHash in Postgres must always match what's on-chain.** Sync them on every update.
- **Health check timeout is 5 seconds.** Hard limit. Never wait longer.
- **Failed checks counter resets to 0 on success.** It's not cumulative — it counts consecutive failures.

---

## Success Metric

Phase 1 is complete when:

```
✅ Contract deployed and verified on Arbitrum One
✅ 5 real agents registered by real builders (not test data)
✅ All 5 screens working end-to-end
✅ Verification oracle running and updating badges
✅ Search and filtering working
✅ Mobile responsive
✅ One agent can be transferred between wallets (ERC-721)
```

---

## What Comes Next (Phase 2 Preview)

Phase 2 is the protocol layer — discovery, trust, and payments between agents.

When Phase 1 has real agents registered, Phase 2 activates:
- The "Activate Agent" button on every profile goes live
- Agents can be called and paid per use in ETH on Arbitrum
- The MilkyWay protocol defines the standard interface all agents implement
- x402-style payment rails connect buyers to agents

But that's Phase 2. Ship Phase 1 first.

---

*MilkyWay — The Universe of Autonomous Agents*
*Built on Arbitrum. Phase 1: Identity Registry.*