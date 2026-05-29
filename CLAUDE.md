# MILKYWAY_PHASE2.md
## MilkyWay — Phase 2: Protocol + Visual Builder + Execution Engine
### Complete Build Specification for Claude Code

Read MILKYWAY_PHASE1.md and SIWE.md before reading this file.
Phase 2 builds directly on Phase 1. The registry, contract, database, and auth
from Phase 1 are all still in use. This file describes what changes, what's added,
and what's new.

---

## What Phase 2 Is

Phase 1 answered: *do agents exist?*
Phase 2 answers: *can agents work together and get paid?*

Three things ship together in Phase 2. They are inseparable:

```
1. The Protocol     — the standard every agent speaks
2. The Builder      — the visual canvas where humans compose flows
3. The Engine       — the backend that runs flows and settles payment
```

The visual builder IS the protocol made human-readable.
The engine IS the protocol made executable.
You cannot ship one without the others.

---

## Phase 1 Changes (Do These First)

These are small surgical changes to Phase 1 before building anything new.
They make Phase 1 backward compatible with Phase 2.

---

### Change 1: Add /about to the Registration Flow

**File: backend/src/routes/agents.ts**

In the `POST /api/agents/register` route, after the `/health` ping succeeds,
add a second ping to `/about`:

```typescript
// After health check passes:
const aboutResult = await fetchAbout(endpoint);

// Store in Postgres regardless of result
// If /about exists → agent is Phase 2 ready
// If /about missing → agent registers fine, marked phase1Only
await prisma.agent.update({
  where: { id: agent.id },
  data: {
    aboutSchema: aboutResult.success ? aboutResult.schema : null,
    phase2Ready: aboutResult.success,
    aboutCachedAt: aboutResult.success ? new Date() : null
  }
});
```

**New service: backend/src/services/about.ts**

```typescript
interface AboutResult {
  success: boolean;
  schema?: MilkyWayAboutSchema;
  error?: string;
}

export async function fetchAbout(endpoint: string): Promise<AboutResult> {
  try {
    const url = `${endpoint.replace(/\/$/, "")}/about`;
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 5000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "MilkyWay-Verifier/1.0" }
    });

    if (res.status !== 200) {
      return { success: false, error: `HTTP ${res.status}` };
    }

    const schema = await res.json();

    // Validate minimum required fields
    if (!schema.milkyway_version || !schema.input_schema || !schema.output_schema) {
      return { success: false, error: "Missing required /about fields" };
    }

    return { success: true, schema };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
```

---

### Change 2: Add New Fields to Prisma Schema

**File: backend/prisma/schema.prisma**

Add these fields to the `Agent` model:

```prisma
model Agent {
  // ... all existing fields unchanged ...

  // Phase 2 additions
  aboutSchema     Json?         // cached /about response
  phase2Ready     Boolean       @default(false)
  aboutCachedAt   DateTime?
}
```

Run migration:
```bash
npx prisma migrate dev --name add_phase2_fields
```

---

### Change 3: Add /about Refresh to Verification Cycle

**File: backend/src/services/verification.ts**

In `runVerificationCycle()`, after the health check, also refresh `/about`:

```typescript
// After successful health check:
if (result.success) {
  const aboutResult = await fetchAbout(agent.endpoint);
  await prisma.agent.update({
    where: { id: agent.id },
    data: {
      failedChecks: 0,
      verifiedAt: new Date(),
      badgeTier: "BRONZE",
      // Refresh /about cache
      ...(aboutResult.success && {
        aboutSchema: aboutResult.schema,
        phase2Ready: true,
        aboutCachedAt: new Date()
      })
    }
  });
}
```

---

### Change 4: Add phase2Ready Badge to UI

**File: frontend/app/agents/page.tsx and agents/[agentId]/page.tsx**

Add a "Phase 2 Ready" indicator on agent cards and profiles:

```
Bronze badge  → agent is verified alive
Phase 2 badge → agent implements /about and /execute
               → can be used in the visual builder
```

Agents without the Phase 2 badge still appear in the registry.
They just cannot be dragged onto the builder canvas.

---

### Change 5: Upgrade hello-agent

**File: agents/hello-agent**

Add `/about` and `/execute` endpoints to the hello-agent.
This is the reference implementation every developer copies.
Full spec in the Protocol section below.

---

## Phase 2 New Additions

Everything below is net new. Nothing from Phase 1 is removed.

---

## The MilkyWay Protocol Standard

This is the spec every agent must implement to be Phase 2 ready.
Document this in a separate PROTOCOL.md in the repo root.
Developers read this to make their agents compatible.

---

### Endpoint 1: GET /health (Phase 1 — unchanged)

```
Response: { "name": string, "version": string, "status": "ok" }
```

---

### Endpoint 2: GET /about (Phase 2 — new)

The agent's complete self-description.
Called by MilkyWay at registration, on 24h cycle, and when builder loads agent.

```
Response (HTTP 200):
{
  "milkyway_version": "1.0",
  "name": "Research Agent",
  "description": "Searches and summarizes topics on demand.",
  "capabilities": ["research", "summarize"],
  "pricing": {
    "model": "per_job",
    "amount": "0.001",
    "currency": "ETH"
  },
  "input_schema": {
    "query":  { "type": "string",  "required": true,  "description": "The search query" },
    "limit":  { "type": "number",  "required": false, "default": 10 }
  },
  "output_schema": {
    "results": { "type": "array",  "description": "Array of result objects" },
    "count":   { "type": "number", "description": "Total results found" }
  },
  "max_deadline_seconds": 30
}
```

**Field rules:**
- `milkyway_version` — always "1.0" for Phase 2
- `input_schema` — every field has: type, required, description (optional), default (optional)
- `output_schema` — every field has: type, description
- `max_deadline_seconds` — how long the agent needs at most to complete a job
- `pricing.currency` — always "ETH" for Phase 2

---

### Endpoint 3: POST /execute (Phase 2 — new)

The job execution endpoint. Only called after escrow is locked on-chain.

**Request:**
```json
{
  "milkyway_version": "1.0",
  "job_id": "uuid-v4",
  "caller": "0x<wallet_address>",
  "escrow_tx": "0x<transaction_hash>",
  "task": {
    "input": {
      "query": "latest ETH price movements",
      "limit": 5
    }
  },
  "deadline": 1234567890
}
```

**Fixed fields (always required — agent must validate these):**
```
milkyway_version  must be "1.0"
job_id            unique UUID for this job — agent must not process same job_id twice
caller            wallet address of who locked the escrow
escrow_tx         on-chain tx hash — agent MUST verify this before executing
deadline          unix timestamp — agent must refuse if deadline has passed
task.input        shape must match input_schema from /about
```

**Response (HTTP 200 — success):**
```json
{
  "milkyway_version": "1.0",
  "job_id": "uuid-v4",
  "status": "completed",
  "output": {
    "results": [...],
    "count": 5
  },
  "completed_at": 1234567890
}
```

**Response (HTTP 402 — escrow not verified):**
```json
{
  "milkyway_version": "1.0",
  "job_id": "uuid-v4",
  "status": "payment_required",
  "error": "Escrow transaction not found or insufficient"
}
```

**Response (HTTP 408 — deadline passed):**
```json
{
  "milkyway_version": "1.0",
  "job_id": "uuid-v4",
  "status": "expired",
  "error": "Deadline has passed"
}
```

**Agent-side escrow verification (inside /execute handler):**
```typescript
// Agent MUST do this before executing any work
async function verifyEscrow(escrowTx: string, jobId: string, expectedAmount: string): Promise<boolean> {
  const provider = new ethers.JsonRpcProvider(process.env.ARBITRUM_RPC);
  const escrowContract = new ethers.Contract(
    process.env.MILKYWAY_ESCROW_ADDRESS!,
    ESCROW_ABI,
    provider
  );
  const job = await escrowContract.getJob(jobId);
  return (
    job.exists &&
    job.status === JobStatus.LOCKED &&
    job.agentAddress.toLowerCase() === process.env.AGENT_WALLET!.toLowerCase() &&
    BigInt(job.amount) >= BigInt(expectedAmount)
  );
}
```

---

## Smart Contract: JobEscrow.sol

**Location: contracts/src/JobEscrow.sol**

New contract. Deployed alongside AgentRegistry.sol.
Holds ETH, tracks flow state, releases or refunds.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract JobEscrow is Ownable, ReentrancyGuard {

    // ── State ──────────────────────────────────────────────────────────

    // MilkyWay takes 1% of every payment
    uint256 public protocolFeeBps = 100; // 100 basis points = 1%

    enum JobStatus { NONE, LOCKED, RUNNING, COMPLETED, REFUNDED }

    struct Job {
        bytes32 jobId;
        address caller;
        address[] agents;       // ordered list of agents in the flow
        uint256[] amounts;      // payment per agent (must sum to total)
        uint256 totalAmount;
        uint256 deadline;
        JobStatus status;
        uint256 lockedAt;
        uint256 completedAt;
    }

    mapping(bytes32 => Job) public jobs;

    // ── Events ─────────────────────────────────────────────────────────

    event JobLocked(
        bytes32 indexed jobId,
        address indexed caller,
        address[] agents,
        uint256 totalAmount,
        uint256 deadline
    );
    event JobCompleted(bytes32 indexed jobId, uint256 completedAt);
    event JobRefunded(bytes32 indexed jobId, address indexed caller, uint256 amount);
    event AgentPaid(bytes32 indexed jobId, address indexed agent, uint256 amount);

    // ── Constructor ────────────────────────────────────────────────────

    constructor() Ownable(msg.sender) {}

    // ── Core Functions ─────────────────────────────────────────────────

    /// @notice Lock ETH payment for a flow of agents
    /// @param jobId unique identifier (UUID as bytes32)
    /// @param agents ordered list of agent wallet addresses
    /// @param amounts ETH amount per agent (must sum to msg.value minus fee)
    /// @param deadline unix timestamp when escrow expires
    function lockPayment(
        bytes32 jobId,
        address[] calldata agents,
        uint256[] calldata amounts,
        uint256 deadline
    ) external payable nonReentrant {
        require(jobs[jobId].status == JobStatus.NONE, "Job ID already exists");
        require(agents.length > 0, "No agents specified");
        require(agents.length == amounts.length, "Agents and amounts mismatch");
        require(deadline > block.timestamp, "Deadline must be in future");
        require(msg.value > 0, "Must send ETH");

        // Validate amounts sum correctly after fee
        uint256 fee = (msg.value * protocolFeeBps) / 10000;
        uint256 distributable = msg.value - fee;
        uint256 amountSum = 0;
        for (uint i = 0; i < amounts.length; i++) {
            amountSum += amounts[i];
        }
        require(amountSum == distributable, "Amounts must sum to value minus fee");

        jobs[jobId] = Job({
            jobId: jobId,
            caller: msg.sender,
            agents: agents,
            amounts: amounts,
            totalAmount: msg.value,
            deadline: deadline,
            status: JobStatus.LOCKED,
            lockedAt: block.timestamp,
            completedAt: 0
        });

        emit JobLocked(jobId, msg.sender, agents, msg.value, deadline);
    }

    /// @notice MilkyWay execution engine calls this after all agents complete
    /// Releases payment to each agent in the flow
    function releasePayment(bytes32 jobId) external onlyOwner nonReentrant {
        Job storage job = jobs[jobId];
        require(job.status == JobStatus.LOCKED || job.status == JobStatus.RUNNING, "Invalid status");
        require(block.timestamp <= job.deadline, "Job expired");

        job.status = JobStatus.COMPLETED;
        job.completedAt = block.timestamp;

        // Pay each agent their share
        for (uint i = 0; i < job.agents.length; i++) {
            (bool sent,) = job.agents[i].call{value: job.amounts[i]}("");
            require(sent, "Payment failed");
            emit AgentPaid(jobId, job.agents[i], job.amounts[i]);
        }

        // Protocol fee stays in contract — owner withdraws separately
        emit JobCompleted(jobId, block.timestamp);
    }

    /// @notice Caller gets refund if deadline passes without completion
    function refundPayment(bytes32 jobId) external nonReentrant {
        Job storage job = jobs[jobId];
        require(job.caller == msg.sender, "Not job caller");
        require(
            job.status == JobStatus.LOCKED || job.status == JobStatus.RUNNING,
            "Cannot refund"
        );
        require(block.timestamp > job.deadline, "Deadline not passed yet");

        uint256 refundAmount = job.totalAmount;
        job.status = JobStatus.REFUNDED;

        (bool sent,) = msg.sender.call{value: refundAmount}("");
        require(sent, "Refund failed");

        emit JobRefunded(jobId, msg.sender, refundAmount);
    }

    /// @notice Mark job as running (called by engine when execution starts)
    function markRunning(bytes32 jobId) external onlyOwner {
        require(jobs[jobId].status == JobStatus.LOCKED, "Job not locked");
        jobs[jobId].status = JobStatus.RUNNING;
    }

    // ── View Functions ─────────────────────────────────────────────────

    function getJob(bytes32 jobId) external view returns (Job memory) {
        return jobs[jobId];
    }

    function jobExists(bytes32 jobId) external view returns (bool) {
        return jobs[jobId].status != JobStatus.NONE;
    }

    // ── Admin ──────────────────────────────────────────────────────────

    function setProtocolFee(uint256 newFeeBps) external onlyOwner {
        require(newFeeBps <= 500, "Max 5%");
        protocolFeeBps = newFeeBps;
    }

    function withdrawFees() external onlyOwner {
        uint256 balance = address(this).balance;
        // Only withdraw what's not locked in active jobs
        // Simple approach: owner tracks this off-chain
        (bool sent,) = owner().call{value: balance}("");
        require(sent, "Withdraw failed");
    }
}
```

**Deploy commands:**
```bash
# Sepolia first
forge script script/Deploy.s.sol --rpc-url arbitrum_sepolia --broadcast --verify

# Then mainnet
forge script script/Deploy.s.sol --rpc-url arbitrum_one --broadcast --verify
```

Update Deploy.s.sol to deploy both AgentRegistry and JobEscrow.
Save JobEscrow address to all .env files as `JOB_ESCROW_ADDRESS`.

---

## Database Changes

**File: backend/prisma/schema.prisma**

Add two new models:

```prisma
model Flow {
  id              String      @id @default(cuid())
  jobId           String      @unique    // bytes32 as hex string
  callerAddress   String
  agents          FlowAgent[]
  totalAmountEth  String                 // as string, no floats
  deadline        DateTime
  trigger         TriggerType
  triggerValue    String?                // e.g. interval seconds, or condition
  status          FlowStatus  @default(LOCKED)
  escrowTxHash    String?
  completedAt     DateTime?
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  @@index([callerAddress])
  @@index([status])
}

model FlowAgent {
  id              String   @id @default(cuid())
  flowId          String
  agentId         Int                    // references Agent.agentId
  agentAddress    String                 // wallet address for payment
  orderIndex      Int                    // execution order in the flow
  amountEth       String                 // this agent's cut
  staticInputs    Json?                  // user-filled static fields
  inputMapping    Json?                  // field mappings from previous agent output
  status          AgentJobStatus @default(PENDING)
  output          Json?                  // stored after execution
  executedAt      DateTime?

  flow            Flow     @relation(fields: [flowId], references: [id])

  @@index([flowId])
  @@index([orderIndex])
}

enum FlowStatus {
  LOCKED
  RUNNING
  COMPLETED
  REFUNDED
  FAILED
}

enum AgentJobStatus {
  PENDING
  RUNNING
  COMPLETED
  FAILED
}

enum TriggerType {
  IMMEDIATE
  SCHEDULED
  CONDITION
}
```

Run migration:
```bash
npx prisma migrate dev --name add_phase2_flows
```

---

## New Backend Routes

### backend/src/routes/flows.ts

```
POST  /api/flows/preview      compute total cost from agent list
POST  /api/flows/create       create flow, return jobId + payment details
POST  /api/flows/confirm      called after escrow tx confirms on-chain
GET   /api/flows/:jobId       get flow status
GET   /api/flows/my           get caller's flows (auth required)
POST  /api/flows/:jobId/run   manually trigger execution (immediate flows)
```

### POST /api/flows/preview

Called by the builder UI when user assembles agents.
Does NOT create anything. Just returns cost breakdown.

```typescript
router.post("/preview", async (req, res) => {
  const { agents } = req.body;
  // agents: [{ agentId: number, staticInputs: {} }]

  const agentDetails = await Promise.all(
    agents.map(async (a: any) => {
      const agent = await prisma.agent.findUnique({
        where: { agentId: a.agentId }
      });
      return {
        agentId: a.agentId,
        name: agent?.name,
        priceEth: agent?.priceEth,
        aboutSchema: agent?.aboutSchema
      };
    })
  );

  const totalEth = agentDetails.reduce(
    (sum, a) => sum + parseFloat(a.priceEth || "0"), 0
  );
  const protocolFee = totalEth * 0.01;

  res.json({
    agents: agentDetails,
    subtotal: totalEth.toString(),
    protocolFee: protocolFee.toFixed(6),
    total: (totalEth + protocolFee).toFixed(6),
    currency: "ETH"
  });
});
```

### POST /api/flows/create

Creates the flow in Postgres and returns what the frontend needs
to call `lockPayment()` on-chain.

```typescript
router.post("/create", authenticateJWT, async (req, res) => {
  const { agents, trigger, triggerValue, deadlineSeconds } = req.body;
  // agents: [{ agentId, orderIndex, staticInputs, inputMapping }]

  const jobId = uuidv4();
  const jobIdBytes32 = ethers.id(jobId); // keccak256 → bytes32

  const deadline = Math.floor(Date.now() / 1000) + (deadlineSeconds || 300);

  // Build agent list with wallet addresses and amounts
  const agentDetails = await Promise.all(
    agents.map(async (a: any) => {
      const agent = await prisma.agent.findUnique({
        where: { agentId: a.agentId }
      });
      return {
        ...a,
        wallet: agent?.ownerAddress,  // payment goes to agent owner
        amount: agent?.priceEth
      };
    })
  );

  // Store flow in Postgres
  const flow = await prisma.flow.create({
    data: {
      jobId: jobIdBytes32,
      callerAddress: req.user.address,
      totalAmountEth: agentDetails.reduce(
        (sum, a) => (parseFloat(sum) + parseFloat(a.amount)).toString(), "0"
      ),
      deadline: new Date(deadline * 1000),
      trigger,
      triggerValue: triggerValue?.toString(),
      agents: {
        create: agentDetails.map(a => ({
          agentId: a.agentId,
          agentAddress: a.wallet,
          orderIndex: a.orderIndex,
          amountEth: a.amount,
          staticInputs: a.staticInputs || {},
          inputMapping: a.inputMapping || {}
        }))
      }
    },
    include: { agents: true }
  });

  // Return everything frontend needs for lockPayment() call
  res.json({
    jobId: jobIdBytes32,
    internalId: flow.id,
    agentWallets: agentDetails.map(a => a.wallet),
    agentAmounts: agentDetails.map(a =>
      ethers.parseEther(a.amount).toString()
    ),
    deadline,
    totalEth: flow.totalAmountEth
  });
});
```

### POST /api/flows/confirm

Called by frontend after `lockPayment()` tx confirms on-chain.

```typescript
router.post("/confirm", authenticateJWT, async (req, res) => {
  const { internalId, escrowTxHash } = req.body;

  await prisma.flow.update({
    where: { id: internalId },
    data: { escrowTxHash, status: "LOCKED" }
  });

  // If trigger is IMMEDIATE, start execution right away
  const flow = await prisma.flow.findUnique({
    where: { id: internalId },
    include: { agents: { orderBy: { orderIndex: "asc" } } }
  });

  if (flow?.trigger === "IMMEDIATE") {
    executeFlow(flow).catch(console.error); // async, don't await
  }

  res.json({ success: true, jobId: flow?.jobId });
});
```

---

## Execution Engine

### backend/src/services/engine.ts

The core of Phase 2. Runs flows sequentially.

```typescript
import { prisma } from "../lib/db";
import { ethers } from "ethers";
import { v4 as uuidv4 } from "uuid";

const provider = new ethers.JsonRpcProvider(process.env.ARBITRUM_RPC);
const signer = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY!, provider);

const ESCROW_ABI = [
  "function markRunning(bytes32 jobId) external",
  "function releasePayment(bytes32 jobId) external",
];
const escrow = new ethers.Contract(
  process.env.JOB_ESCROW_ADDRESS!,
  ESCROW_ABI,
  signer
);

export async function executeFlow(flow: any) {
  console.log(`Executing flow: ${flow.jobId}`);

  try {
    // Mark as running on-chain
    await escrow.markRunning(flow.jobId);
    await prisma.flow.update({
      where: { id: flow.id },
      data: { status: "RUNNING" }
    });

    let previousOutput: any = null;

    // Execute each agent in order
    for (const flowAgent of flow.agents) {
      const agent = await prisma.agent.findUnique({
        where: { agentId: flowAgent.agentId }
      });

      if (!agent) throw new Error(`Agent ${flowAgent.agentId} not found`);

      // Build input: merge static inputs + mapped fields from previous output
      const taskInput = buildInput(
        flowAgent.staticInputs,
        flowAgent.inputMapping,
        previousOutput
      );

      // Mark this agent as running
      await prisma.flowAgent.update({
        where: { id: flowAgent.id },
        data: { status: "RUNNING" }
      });

      // Call the agent's /execute endpoint
      const result = await callAgent(
        agent.endpoint,
        flow.jobId,
        flow.callerAddress,
        flow.escrowTxHash,
        taskInput,
        flow.deadline
      );

      if (!result.success) {
        throw new Error(`Agent ${agent.name} failed: ${result.error}`);
      }

      // Store output, mark completed
      await prisma.flowAgent.update({
        where: { id: flowAgent.id },
        data: {
          status: "COMPLETED",
          output: result.output,
          executedAt: new Date()
        }
      });

      previousOutput = result.output;
      console.log(`Agent ${agent.name} completed`);
    }

    // All agents done — release payment on-chain
    const tx = await escrow.releasePayment(flow.jobId);
    await tx.wait();

    await prisma.flow.update({
      where: { id: flow.id },
      data: { status: "COMPLETED", completedAt: new Date() }
    });

    console.log(`Flow ${flow.jobId} completed. Payment released.`);

  } catch (err: any) {
    console.error(`Flow ${flow.jobId} failed:`, err.message);
    await prisma.flow.update({
      where: { id: flow.id },
      data: { status: "FAILED" }
    });
    // Do NOT release payment. Caller can refund after deadline.
  }
}

// Build task input for an agent
function buildInput(
  staticInputs: any,
  inputMapping: any,
  previousOutput: any
): any {
  const input = { ...staticInputs };

  // Map fields from previous agent's output
  if (inputMapping && previousOutput) {
    for (const [targetField, sourceField] of Object.entries(inputMapping)) {
      if (previousOutput[sourceField as string] !== undefined) {
        input[targetField] = previousOutput[sourceField as string];
      }
    }
  }

  return input;
}

// Call a single agent's /execute endpoint
async function callAgent(
  endpoint: string,
  jobId: string,
  caller: string,
  escrowTx: string,
  taskInput: any,
  deadline: Date
): Promise<{ success: boolean; output?: any; error?: string }> {
  try {
    const controller = new AbortController();
    const timeoutMs = Math.max(
      0,
      new Date(deadline).getTime() - Date.now() - 2000
    );
    setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(`${endpoint.replace(/\/$/, "")}/execute`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "MilkyWay-Engine/1.0"
      },
      signal: controller.signal,
      body: JSON.stringify({
        milkyway_version: "1.0",
        job_id: jobId,
        caller,
        escrow_tx: escrowTx,
        task: { input: taskInput },
        deadline: Math.floor(new Date(deadline).getTime() / 1000)
      })
    });

    if (res.status === 200) {
      const data = await res.json();
      return { success: true, output: data.output };
    }

    const err = await res.json();
    return { success: false, error: err.error || `HTTP ${res.status}` };

  } catch (err: any) {
    return {
      success: false,
      error: err.name === "AbortError" ? "Agent timed out" : err.message
    };
  }
}
```

---

## Visual Builder UI

### New screen: frontend/app/builder/page.tsx

The canvas where users compose and activate flows.

```
LAYOUT (three panels side by side)

LEFT PANEL — Agent Library
  Search agents
  Filter: Phase 2 Ready only (toggle)
  Agent cards — smaller format
  Drag to canvas

CENTER PANEL — Canvas
  Drop zone for agents
  Agents appear as nodes
  Click and drag to connect them
  Arrow shows data flow direction
  Each connection shows:
    → matched fields (green)
    → missing fields (amber — user must fill)
  Bottom bar:
    Total cost: 0.003 ETH
    Protocol fee: 0.00003 ETH
    Total: 0.00303 ETH

RIGHT PANEL — Configuration
  Shows when agent is selected:
    Agent name + description
    Input fields (static ones user must fill)
    Field mapping (which output field maps to which input)
  Shows when connection is selected:
    Source field → Target field mapping
    Add manual mapping button
  Shows flow settings:
    Trigger: Immediate / Scheduled / Condition
    Deadline: slider (30s to 24h)
```

### Canvas Implementation

Use **React Flow** library for the drag-and-drop canvas.

```bash
npm install reactflow
```

```typescript
// Key components:
// - AgentNode: custom node showing agent name, badge, price
// - ConnectionLine: shows field mapping status
// - FieldMatcher: reads /about from both agents, computes matches

// Field matching logic:
function matchFields(sourceSchema: any, targetSchema: any): FieldMatch[] {
  const matches: FieldMatch[] = [];

  for (const [targetField, targetDef] of Object.entries(targetSchema)) {
    const def = targetDef as any;

    // Find matching source field by name and type
    const sourceField = Object.entries(sourceSchema).find(
      ([name, srcDef]) =>
        name === targetField &&
        (srcDef as any).type === def.type
    );

    matches.push({
      targetField,
      sourceField: sourceField?.[0] || null,
      matched: !!sourceField,
      required: def.required || false,
      type: def.type
    });
  }

  return matches;
}
```

### Activate Flow (builder/page.tsx)

```typescript
async function activateFlow() {
  // 1. Call /api/flows/create
  const { jobId, internalId, agentWallets, agentAmounts, deadline, totalEth } =
    await authFetch(`${API}/api/flows/create`, {
      method: "POST",
      body: JSON.stringify({ agents, trigger, triggerValue, deadlineSeconds })
    }).then(r => r.json());

  // 2. Call lockPayment() on JobEscrow contract via wagmi
  const { writeContract } = useWriteContract();
  writeContract({
    address: JOB_ESCROW_ADDRESS,
    abi: JOB_ESCROW_ABI,
    functionName: "lockPayment",
    args: [jobId, agentWallets, agentAmounts, deadline],
    value: parseEther(totalEth)
  });

  // 3. Wait for tx confirmation
  // useWaitForTransactionReceipt → get txHash

  // 4. Call /api/flows/confirm
  await authFetch(`${API}/api/flows/confirm`, {
    method: "POST",
    body: JSON.stringify({ internalId, escrowTxHash: txHash })
  });

  // 5. Navigate to flow status page
  router.push(`/flows/${jobId}`);
}
```

### New screen: frontend/app/flows/[jobId]/page.tsx

Flow status page. Real-time updates via polling every 3 seconds.

```
HEADER
  Flow ID (truncated)
  Status badge: LOCKED / RUNNING / COMPLETED / REFUNDED / FAILED
  Total paid: 0.003 ETH

AGENT PIPELINE (visual)
  [Agent A] ──→ [Agent B] ──→ [Agent C]
    ✓ done        ⟳ running     ○ pending

  Each agent shows:
    Status icon
    Time taken (when done)
    "View Output" expandable (shows JSON output)

PAYMENT SECTION
  Each agent: name + amount paid
  Protocol fee
  On COMPLETED: "Payment released on-chain" + tx link
  On FAILED: "Refund available after [deadline time]" + Refund button

REFUND BUTTON (shows after deadline if status != COMPLETED)
  Calls refundPayment(jobId) on-chain via wagmi
```

---

## hello-agent Upgrade

**File: agents/hello-agent**

Add full Phase 2 compliance. This is the reference every developer copies.

```typescript
// GET /about
app.get("/about", (req, res) => {
  res.json({
    milkyway_version: "1.0",
    name: "Hello Agent",
    description: "A simple hello world agent. Greets any input name.",
    capabilities: ["greet"],
    pricing: {
      model: "per_job",
      amount: "0.0001",
      currency: "ETH"
    },
    input_schema: {
      name: { type: "string", required: true, description: "Name to greet" }
    },
    output_schema: {
      greeting: { type: "string", description: "The greeting message" },
      timestamp: { type: "number", description: "Unix timestamp of greeting" }
    },
    max_deadline_seconds: 5
  });
});

// POST /execute
app.post("/execute", async (req, res) => {
  const { milkyway_version, job_id, caller, escrow_tx, task, deadline } = req.body;

  // Validate protocol version
  if (milkyway_version !== "1.0") {
    return res.status(400).json({ error: "Unsupported protocol version" });
  }

  // Check deadline
  if (deadline < Math.floor(Date.now() / 1000)) {
    return res.status(408).json({
      milkyway_version: "1.0",
      job_id,
      status: "expired",
      error: "Deadline has passed"
    });
  }

  // Verify escrow on-chain
  const valid = await verifyEscrow(escrow_tx, job_id);
  if (!valid) {
    return res.status(402).json({
      milkyway_version: "1.0",
      job_id,
      status: "payment_required",
      error: "Escrow not verified"
    });
  }

  // Do the work
  const { name } = task.input;
  const greeting = `Hello, ${name}! Welcome to MilkyWay.`;

  res.json({
    milkyway_version: "1.0",
    job_id,
    status: "completed",
    output: {
      greeting,
      timestamp: Math.floor(Date.now() / 1000)
    },
    completed_at: Math.floor(Date.now() / 1000)
  });
});
```

---

## Where ERC-8004 and x402 Fit

**ERC-8004:**
AgentRegistry.sol IS an ERC-8004 implementation.
In Phase 2, explicitly add the ERC-8004 interface declaration to AgentRegistry.sol:
```solidity
// Add to AgentRegistry.sol
string public constant ERC8004_VERSION = "1.0";
```
And add to PROTOCOL.md: "MilkyWay implements ERC-8004 for agent identity."
This makes MilkyWay agents compatible with any ecosystem reading ERC-8004 registries.

**x402:**
The X-PAYMENT header pattern from x402 is the inspiration for how
MilkyWay passes payment proof to agents via the `escrow_tx` field in /execute.
In Phase 2, the engine passes the escrow tx hash. Agents verify on-chain.
In Phase 3, this can be upgraded to full x402 compliance with X-PAYMENT headers
for external agents outside MilkyWay to plug in via standard x402.

---

## Build Order for Claude Code

```
PHASE A — CONTRACT + DB
  1. Write JobEscrow.sol
  2. Update Deploy.s.sol to deploy both contracts
  3. forge test -vvv (write JobEscrow.t.sol)
  4. Deploy to Arbitrum Sepolia, save address
  5. npx prisma migrate dev --name add_phase2_flows

PHASE B — PHASE 1 CHANGES
  6. Write backend/src/services/about.ts
  7. Update backend/src/routes/agents.ts (add /about ping)
  8. Update backend/src/services/verification.ts (/about refresh)
  9. Update frontend agent cards (phase2Ready badge)
  10. Upgrade agents/hello-agent (/about + /execute)

PHASE C — BACKEND
  11. Write backend/src/routes/flows.ts (all routes)
  12. Write backend/src/services/engine.ts
  13. Wire executeFlow into flows/confirm route
  14. Test end-to-end with hello-agent:
      → create flow → lock escrow → confirm → engine runs → payment released

PHASE D — FRONTEND
  15. npm install reactflow
  16. Write frontend/app/builder/page.tsx (canvas + three panels)
  17. Write frontend/app/flows/[jobId]/page.tsx (status page)
  18. Wire lockPayment() wagmi call in builder
  19. Wire refundPayment() wagmi call in flow status page
  20. End-to-end test through browser

PHASE E — DEPLOY
  21. Deploy JobEscrow to Arbitrum One
  22. Deploy frontend to Vercel
  23. Update README with Phase 2 contracts
```

---

## Common Mistakes — Never Make These

- **Never release payment before all agents complete.** releasePayment() is called once, at the end.
- **Never float ETH amounts.** Always strings or BigInt.
- **job_id must be idempotent.** If an agent receives the same job_id twice, it must not execute twice. Store processed job_ids.
- **Always verify escrow before executing agent work.** Never trust the caller blindly.
- **inputMapping and staticInputs are separate.** staticInputs are user-defined constants. inputMapping maps previous agent output fields. Never confuse them.
- **Deadline is unix seconds, not milliseconds.** Consistent everywhere.
- **The engine wallet (DEPLOYER_PRIVATE_KEY) is the JobEscrow owner.** markRunning() and releasePayment() are onlyOwner.
- **React Flow nodes must be memoized.** Performance degrades badly without it.
- **Never store flow output in the contract.** All output lives in Postgres. Chain only tracks payment state.
- **protocolFeeBps is 100 (1%).** This is MilkyWay's revenue. Never set to 0.

---

## Success Metric for Phase 2

```
✅ JobEscrow.sol deployed and verified on Arbitrum One
✅ hello-agent implements /about and /execute
✅ Visual builder: drag two agents, connect them, see field matching
✅ User fills missing fields manually
✅ Activate: escrow locks on-chain
✅ Engine runs both agents in sequence
✅ Output of first agent passes to second
✅ Payment releases to both agent wallets
✅ Flow status page shows real-time progress
✅ Refund works after deadline
```

---

*MilkyWay — The Universe of Autonomous Agents*
*Phase 2: Protocol + Visual Builder + Execution Engine*
*Built on Arbitrum. 1% protocol fee. Open standard.*