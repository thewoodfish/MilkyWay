# MILKYWAY_X402_SDK.md
## x402 Payment Protocol + MilkyWay Agent SDK
### Full Spec for Claude Code

Read alongside all other MILKYWAY_*.md files.
This file replaces the custom JobEscrow.sol payment model with x402.
The escrow contract is removed. x402 is the payment standard.

---

## What Changes From Phase 2

BEFORE (custom escrow):
```
User locks ETH in JobEscrow.sol
Engine passes escrow_tx hash to agents
Agents verify on-chain against JobEscrow
Engine calls releasePayment() after completion
```

AFTER (x402):
```
User holds USDC on Arbitrum
Engine builds X-PAYMENT header per agent
Agents verify via Coinbase CDP facilitator
USDC settles on-chain automatically
No custom contract needed for payments
```

Benefits:
- No JobEscrow.sol to deploy or maintain
- USDC not ETH — stable, predictable pricing
- Any x402-compatible agent anywhere plugs in
- Coinbase CDP facilitator handles settlement
- 1,000 free transactions/month on CDP free tier

---

## Currency Change

Phase 1 and registration: ETH (staking, gas)
Phase 2 payments:          USDC on Arbitrum One

USDC on Arbitrum One: 0xaf88d065e77c8cC2239327C5EDb3A432268e5831
USDC decimals:        6 (1 USDC = 1_000_000)
Never use 18 decimals for USDC. Ever.

---

## Packages

```bash
# In services/ (agent services and execution engine)
npm install @coinbase/x402
npm install x402-express

# In frontend/ (not needed — payment handled server-side)
# No frontend changes for x402
```

---

## Environment Variables to Add

```bash
# services/.env
CDP_API_KEY_ID=your-cdp-api-key-id
CDP_API_KEY_SECRET=your-cdp-api-key-secret
ARBITRUM_USDC_ADDRESS=0xaf88d065e77c8cC2239327C5EDb3A432268e5831

# Get CDP API keys at: https://portal.cdp.coinbase.com
# Free tier: 1,000 transactions/month
```

---

## How x402 Works In MilkyWay

### The Flow

```
1. User activates a flow on the builder
   Frontend calls POST /api/flows/create
   Backend records the flow in Postgres
   No on-chain tx needed upfront

2. Engine starts executing the flow
   For each agent in the flow:

3. Engine calls agent WITHOUT payment first
   GET/POST {endpoint}/execute
   
4. Agent returns HTTP 402
   PAYMENT-REQUIRED header contains:
   {
     x402Version: 1,
     accepts: [{
       scheme: "exact",
       network: "eip155:42161",   ← Arbitrum One
       maxAmountRequired: "1000000",
       payTo: "0x<agent_wallet>",
       asset: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
       description: "Research Agent — 1 USDC per job"
     }]
   }

5. Engine builds X-PAYMENT header
   Signs EIP-3009 transferWithAuthorization
   using the MilkyWay orchestrator wallet
   (funded with USDC from user's flow payment)

6. Engine retries with PAYMENT-SIGNATURE header
   Agent calls Coinbase CDP facilitator to verify
   Facilitator confirms: valid, unseen nonce, correct amount
   Agent executes job, returns result

7. CDP facilitator settles on-chain
   USDC moves from orchestrator wallet to agent wallet
   Async — doesn't block the response

8. Engine moves to next agent in flow
   Repeat steps 3-7
```

---

## The MilkyWay Orchestrator Wallet

This is the key architectural decision.

Users don't pay agents directly. They pay MilkyWay.
MilkyWay's orchestrator wallet pays agents via x402.

```
User pays MilkyWay:
  Sends USDC to MilkyWay payment address
  Amount = sum of all agent prices + 1% platform fee
  Via the flow activation UI

MilkyWay orchestrator pays agents:
  Holds USDC on behalf of users
  Signs x402 payments per agent per job
  Settles via CDP facilitator
```

This means:
- Users don't need x402 knowledge
- Users don't need USDC approval setup
- MilkyWay handles all x402 complexity
- Clean UX — users just pay once upfront

### User Payment Flow (UI side)

When user clicks Activate in the builder:

```
1. UI shows cost summary:
   Research Agent:  1.00 USDC
   Risk Analyzer:   2.00 USDC
   Platform fee:    0.03 USDC
   ─────────────────────────
   Total:           3.03 USDC

2. User approves USDC transfer to MilkyWay:
   wagmi: writeContract USDC.transfer(milkyway_payment_address, 3030000)
   
3. Frontend waits for confirmation
   
4. Frontend calls POST /api/flows/confirm { txHash }

5. Engine begins execution
```

No JobEscrow.sol. No custom contract. Just a USDC transfer.

---

## Execution Engine — x402 Integration

### services/src/services/engine.ts (updated)

Replace the JobEscrow contract calls with x402 payments.

```typescript
import { facilitator } from "@coinbase/x402";
import { ethers } from "ethers";

const USDC_ADDRESS = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
const USDC_ABI = [
  "function transferWithAuthorization(address from, address to, uint256 value, uint256 validAfter, uint256 validBefore, bytes32 nonce, bytes calldata signature) external"
];

// EIP-712 domain for USDC on Arbitrum One
const USDC_DOMAIN = {
  name: "USD Coin",
  version: "2",
  chainId: 42161,
  verifyingContract: USDC_ADDRESS
};

const TRANSFER_TYPES = {
  TransferWithAuthorization: [
    { name: "from",        type: "address" },
    { name: "to",          type: "address" },
    { name: "value",       type: "uint256" },
    { name: "validAfter",  type: "uint256" },
    { name: "validBefore", type: "uint256" },
    { name: "nonce",       type: "bytes32" }
  ]
};

// Build X-PAYMENT header for a specific agent
async function buildPaymentHeader(
  orchestratorSigner: ethers.Wallet,
  payTo: string,
  amountUsdc: string,  // raw units e.g. "1000000" = 1 USDC
  resource: string
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const validBefore = now + 60;   // 60 second window
  const nonce = ethers.hexlify(ethers.randomBytes(32));

  const message = {
    from:        orchestratorSigner.address,
    to:          payTo,
    value:       BigInt(amountUsdc),
    validAfter:  0,
    validBefore,
    nonce
  };

  const signature = await orchestratorSigner.signTypedData(
    USDC_DOMAIN,
    TRANSFER_TYPES,
    message
  );

  // x402 exact scheme payload
  const payload = {
    x402Version: 1,
    scheme:      "exact",
    network:     "eip155:42161",
    payload: {
      signature,
      authorization: {
        from:        orchestratorSigner.address,
        to:          payTo,
        value:       amountUsdc,
        validAfter:  "0",
        validBefore: String(validBefore),
        nonce
      }
    }
  };

  return Buffer.from(JSON.stringify(payload)).toString("base64");
}

// Call a single agent with x402 payment
export async function callAgentWithX402(
  agent: { endpoint: string; ownerAddress: string; priceUsdc: string },
  orchestratorSigner: ethers.Wallet,
  taskInput: any,
  jobId: string,
  deadline: Date
): Promise<{ success: boolean; output?: any; error?: string }> {

  const agentUrl = agent.endpoint.replace(/\/$/, "");

  try {
    // Step 1: Call without payment — expect 402
    const r1 = await fetch(`${agentUrl}/execute`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        milkyway_version: "1.0",
        job_id:    jobId,
        task:      { input: taskInput },
        deadline:  Math.floor(deadline.getTime() / 1000)
      })
    });

    // If agent returns 200 without payment (free agent)
    if (r1.status === 200) {
      const data = await r1.json();
      return { success: true, output: data.output };
    }

    // Expect 402
    if (r1.status !== 402) {
      return { success: false, error: `Unexpected status ${r1.status}` };
    }

    // Step 2: Build x402 payment header
    const paymentHeader = await buildPaymentHeader(
      orchestratorSigner,
      agent.ownerAddress,
      agent.priceUsdc,
      `${agentUrl}/execute`
    );

    // Step 3: Retry with payment
    const controller = new AbortController();
    const timeoutMs = Math.max(
      0,
      deadline.getTime() - Date.now() - 2000
    );
    setTimeout(() => controller.abort(), timeoutMs);

    const r2 = await fetch(`${agentUrl}/execute`, {
      method:  "POST",
      headers: {
        "Content-Type":      "application/json",
        "PAYMENT-SIGNATURE": paymentHeader   // x402 v2 header name
      },
      signal: controller.signal,
      body: JSON.stringify({
        milkyway_version: "1.0",
        job_id:    jobId,
        task:      { input: taskInput },
        deadline:  Math.floor(deadline.getTime() / 1000)
      })
    });

    if (r2.status === 200) {
      const data = await r2.json();
      return { success: true, output: data.output };
    }

    const err = await r2.json().catch(() => ({}));
    return { success: false, error: err.error || `HTTP ${r2.status}` };

  } catch (err: any) {
    return {
      success: false,
      error: err.name === "AbortError" ? "Agent timed out" : err.message
    };
  }
}
```

---

## The MilkyWay Agent SDK

**Package: `@milkyway/agent-sdk`**

This is what developers install. Three endpoints. x402 built in.
Zero blockchain knowledge required.

### Location in repo

```
sdk/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts          ← main export
│   ├── agent.ts          ← createAgent function
│   ├── x402.ts           ← x402 verification middleware
│   ├── verify.ts         ← verify payment via CDP facilitator
│   └── types.ts          ← all TypeScript types
└── README.md
```

### package.json

```json
{
  "name": "@milkyway/agent-sdk",
  "version": "0.1.0",
  "description": "Build and monetize AI agents on MilkyWay",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  },
  "dependencies": {
    "@coinbase/x402": "^1.0.0",
    "express": "^4.18.0",
    "ethers": "^6.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/express": "^4.17.0"
  }
}
```

### sdk/src/types.ts

```typescript
export type FieldType = "string" | "number" | "boolean" | "array" | "object";

export interface FieldDef {
  type: FieldType;
  required?: boolean;
  description?: string;
  default?: any;
}

export interface AgentSchema {
  [field: string]: FieldDef;
}

export interface AgentPricing {
  model:    "per_job" | "per_day" | "per_month" | "free";
  amount:   string;   // USDC amount e.g. "1.00"
  currency: "USDC";   // always USDC in Phase 2
}

export interface MilkyWayAbout {
  milkyway_version:    string;
  name:                string;
  description:         string;
  capabilities:        string[];
  pricing:             AgentPricing;
  input_schema:        AgentSchema;
  output_schema:       AgentSchema;
  max_deadline_seconds: number;
}

export interface ExecuteRequest {
  milkyway_version: string;
  job_id:           string;
  task: {
    input: Record<string, any>;
  };
  deadline: number;
}

export interface ExecuteResponse {
  milkyway_version: string;
  job_id:           string;
  status:           "completed" | "failed" | "expired";
  output?:          Record<string, any>;
  error?:           string;
  completed_at?:    number;
}

export interface AgentConfig {
  name:                 string;
  description:          string;
  capabilities:         string[];
  pricing:              AgentPricing;
  input_schema:         AgentSchema;
  output_schema:        AgentSchema;
  max_deadline_seconds?: number;
  wallet:               string;   // agent's wallet address for payment
  handler: (input: Record<string, any>) => Promise<Record<string, any>>;
}
```

### sdk/src/verify.ts

```typescript
import { facilitator } from "@coinbase/x402";

// Verify a payment header using Coinbase CDP facilitator
export async function verifyPayment(
  paymentHeader: string,
  resource: string,
  expectedAmountUsdc: string   // e.g. "1.00"
): Promise<{ valid: boolean; error?: string }> {

  // Convert USDC to raw units (6 decimals)
  const rawAmount = String(Math.round(parseFloat(expectedAmountUsdc) * 1_000_000));

  try {
    const result = await facilitator.verify({
      payment: paymentHeader,
      resource,
      amount:  rawAmount,
      network: "eip155:42161"   // Arbitrum One
    });

    return {
      valid:  result.isValid,
      error:  result.invalidReason || undefined
    };
  } catch (err: any) {
    return { valid: false, error: err.message };
  }
}
```

### sdk/src/x402.ts

```typescript
import { Request, Response, NextFunction } from "express";
import { verifyPayment } from "./verify";
import { AgentPricing } from "./types";

const USDC_ADDRESS = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";

// Express middleware that gates a route behind x402 payment
export function requirePayment(
  walletAddress: string,
  pricing: AgentPricing
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Free agents skip payment check
    if (pricing.model === "free" || pricing.amount === "0") {
      return next();
    }

    const paymentHeader =
      req.headers["payment-signature"] as string ||
      req.headers["x-payment"] as string;   // backwards compat

    if (!paymentHeader) {
      // Return 402 with payment requirements
      return res.status(402).json({
        x402Version: 1,
        accepts: [{
          scheme:             "exact",
          network:            "eip155:42161",
          maxAmountRequired:  String(
            Math.round(parseFloat(pricing.amount) * 1_000_000)
          ),
          payTo:              walletAddress,
          asset:              USDC_ADDRESS,
          description:        `${pricing.amount} USDC per job`,
          maxTimeoutSeconds:  60,
          extra: { name: "USD Coin", version: "2" }
        }]
      });
    }

    // Verify payment
    const resource = `${req.protocol}://${req.get("host")}${req.path}`;
    const { valid, error } = await verifyPayment(
      paymentHeader,
      resource,
      pricing.amount
    );

    if (!valid) {
      return res.status(402).json({
        x402Version: 1,
        error: error || "Payment verification failed"
      });
    }

    // Payment valid — proceed
    next();
  };
}
```

### sdk/src/agent.ts

```typescript
import express, { Express } from "express";
import { requirePayment } from "./x402";
import { AgentConfig, ExecuteRequest, ExecuteResponse, MilkyWayAbout } from "./types";

export function createAgent(config: AgentConfig): {
  app: Express;
  listen: (port: number, callback?: () => void) => void;
} {
  const app = express();
  app.use(express.json());

  // ── GET /health ───────────────────────────────────────────────
  app.get("/health", (_, res) => {
    res.json({
      name:    config.name,
      version: "1.0.0",
      status:  "ok"
    });
  });

  // ── GET /about ────────────────────────────────────────────────
  app.get("/about", (_, res) => {
    const about: MilkyWayAbout = {
      milkyway_version:     "1.0",
      name:                 config.name,
      description:          config.description,
      capabilities:         config.capabilities,
      pricing:              config.pricing,
      input_schema:         config.input_schema,
      output_schema:        config.output_schema,
      max_deadline_seconds: config.max_deadline_seconds || 30
    };
    res.json(about);
  });

  // ── POST /execute ─────────────────────────────────────────────
  app.post(
    "/execute",
    requirePayment(config.wallet, config.pricing),  // x402 gate
    async (req, res) => {
      const body = req.body as ExecuteRequest;

      // Validate protocol version
      if (body.milkyway_version !== "1.0") {
        return res.status(400).json({ error: "Unsupported protocol version" });
      }

      // Check deadline
      const now = Math.floor(Date.now() / 1000);
      if (body.deadline && now > body.deadline) {
        return res.status(408).json({
          milkyway_version: "1.0",
          job_id:           body.job_id,
          status:           "expired",
          error:            "Deadline has passed"
        });
      }

      // Validate required inputs
      for (const [field, def] of Object.entries(config.input_schema)) {
        if (def.required && body.task?.input?.[field] === undefined) {
          return res.status(400).json({
            error: `Missing required field: ${field}`
          });
        }
      }

      try {
        // Run the agent's handler
        const output = await config.handler(body.task?.input || {});

        const response: ExecuteResponse = {
          milkyway_version: "1.0",
          job_id:           body.job_id,
          status:           "completed",
          output,
          completed_at:     Math.floor(Date.now() / 1000)
        };

        res.json(response);

      } catch (err: any) {
        res.status(500).json({
          milkyway_version: "1.0",
          job_id:           body.job_id,
          status:           "failed",
          error:            err.message
        });
      }
    }
  );

  return {
    app,
    listen: (port: number, callback?: () => void) => {
      app.listen(port, callback || (() =>
        console.log(`${config.name} running on port ${port}`)
      ));
    }
  };
}
```

### sdk/src/index.ts

```typescript
export { createAgent } from "./agent";
export { requirePayment } from "./x402";
export { verifyPayment } from "./verify";
export * from "./types";
```

---

## Developer Experience — What Building An Agent Looks Like

This is what a developer writes after `npm install @milkyway/agent-sdk`:

```typescript
import { createAgent } from "@milkyway/agent-sdk";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const agent = createAgent({
  name:         "Research Agent",
  description:  "Searches and summarises any topic on demand.",
  capabilities: ["research", "summarise"],

  pricing: {
    model:    "per_job",
    amount:   "1.00",    // 1 USDC
    currency: "USDC"
  },

  wallet: process.env.AGENT_WALLET_ADDRESS!,  // where payment goes

  input_schema: {
    query: {
      type:        "string",
      required:    true,
      description: "The topic to research"
    },
    limit: {
      type:        "number",
      required:    false,
      default:     10,
      description: "Number of results"
    }
  },

  output_schema: {
    result: {
      type:        "string",
      description: "The research summary"
    }
  },

  max_deadline_seconds: 30,

  // This is all the developer writes.
  // /health, /about, /execute, x402 — all handled by the SDK.
  handler: async ({ query, limit = 10 }) => {
    const completion = await openai.chat.completions.create({
      model:      "gpt-4o-mini",
      messages: [
        {
          role:    "system",
          content: `You are a research agent. Summarise the topic concisely.
                    Return at most ${limit} key points.`
        },
        { role: "user", content: query }
      ],
      max_tokens: 300
    });

    return {
      result: completion.choices[0].message.content
    };
  }
});

agent.listen(3000);
// Done. Agent is running.
// Register at milkyway.xyz/register
```

**That is the entire file.** No HTTP setup. No x402 headers. No payment verification. No /health endpoint. No /about endpoint. The SDK handles everything.

---

## Updated hello-agent

Replace the existing hello-agent with SDK-based implementation.
This is the reference implementation developers copy.

```typescript
// agents/hello-agent/src/index.ts
import { createAgent } from "@milkyway/agent-sdk";
import dotenv from "dotenv";
dotenv.config();

const agent = createAgent({
  name:         "Hello Agent",
  description:  "A simple hello world agent. Greets any name you give it.",
  capabilities: ["greet"],

  pricing: {
    model:    "per_job",
    amount:   "0.10",    // 0.10 USDC
    currency: "USDC"
  },

  wallet: process.env.AGENT_WALLET_ADDRESS!,

  input_schema: {
    name: {
      type:        "string",
      required:    true,
      description: "The name to greet"
    }
  },

  output_schema: {
    greeting: {
      type:        "string",
      description: "The greeting message"
    },
    timestamp: {
      type:        "number",
      description: "Unix timestamp"
    }
  },

  handler: async ({ name }) => ({
    greeting:  `Hello, ${name}! Welcome to MilkyWay.`,
    timestamp: Math.floor(Date.now() / 1000)
  })
});

agent.listen(Number(process.env.PORT) || 3000);
```

---

## Updated /about in Protocol

The `/about` response now uses USDC pricing:

```json
{
  "milkyway_version": "1.0",
  "name": "Research Agent",
  "description": "...",
  "capabilities": ["research"],
  "pricing": {
    "model":    "per_job",
    "amount":   "1.00",
    "currency": "USDC"
  },
  "input_schema": { ... },
  "output_schema": { ... },
  "max_deadline_seconds": 30
}
```

Currency is always USDC in Phase 2.
ETH is only used for registration staking.

---

## Updated Prisma Schema

```prisma
// Change priceEth to priceUsdc in Agent model
model Agent {
  // ... existing fields ...
  priceUsdc     String    @default("1.00")   // replaces priceEth
  pricingModel  PricingModel
  // remove priceEth
}

// Change flow amounts to USDC
model Flow {
  totalAmountUsdc  String    // replaces totalAmountEth
  // ...
}

model FlowAgent {
  amountUsdc  String        // replaces amountEth
  // ...
}
```

Run migration:
```bash
npx prisma migrate dev --name migrate_to_usdc
```

---

## Updated Registration Flow

Agent profile now shows USDC pricing:

```
Pricing
─────────────────────────────────────
Model:    [Per job ▼]
Price:    [1.00_____] USDC
          ≈ $1.00 (USDC is stable)
```

No ETH/USD conversion needed for pricing.
USDC is already dollar-denominated.

---

## SDK README (for developers)

```markdown
# @milkyway/agent-sdk

Build and monetize AI agents on MilkyWay.

## Install

npm install @milkyway/agent-sdk

## Usage

import { createAgent } from "@milkyway/agent-sdk";

const agent = createAgent({
  name: "My Agent",
  description: "...",
  capabilities: ["task"],
  pricing: { model: "per_job", amount: "1.00", currency: "USDC" },
  wallet: "0x<your_wallet_address>",
  input_schema: {
    query: { type: "string", required: true }
  },
  output_schema: {
    result: { type: "string" }
  },
  handler: async ({ query }) => {
    // your logic here
    return { result: "..." };
  }
});

agent.listen(3000);

## What the SDK handles

- GET /health      agent liveness check
- GET /about       agent capability declaration
- POST /execute    job execution with x402 payment gate
- x402 payment verification via Coinbase CDP facilitator
- Input validation against your declared schema
- Deadline enforcement
- Error responses in MilkyWay protocol format

## Environment variables

AGENT_WALLET_ADDRESS=0x...     your wallet — receives USDC payments
CDP_API_KEY_ID=...             from portal.cdp.coinbase.com
CDP_API_KEY_SECRET=...

## Register your agent

Once running, register at milkyway.xyz/register
Paste your endpoint URL — MilkyWay verifies /health and /about automatically.
```

---

## Build Order for Claude Code

```
PHASE A — SDK
  1. Create sdk/ directory
  2. Write sdk/package.json
  3. Write sdk/src/types.ts
  4. Write sdk/src/verify.ts
  5. Write sdk/src/x402.ts
  6. Write sdk/src/agent.ts
  7. Write sdk/src/index.ts
  8. Write sdk/README.md
  9. npm run build in sdk/
  10. Test: link SDK locally with npm link

PHASE B — UPDATE HELLO-AGENT
  11. Replace agents/hello-agent with SDK-based version
  12. pnpm install in agents/hello-agent
  13. Start hello-agent: node dist/index.js
  14. Test: GET localhost:3000/health
  15. Test: GET localhost:3000/about
  16. Test: POST localhost:3000/execute (no payment → 402)
  17. Test: POST localhost:3000/execute (with payment → 200)

PHASE C — UPDATE EXECUTION ENGINE
  18. Remove JobEscrow contract calls from engine.ts
  19. Add buildPaymentHeader() function
  20. Add callAgentWithX402() function
  21. Update executeFlow() to use callAgentWithX402
  22. Test full flow: activate → engine runs → x402 pays → output returned

PHASE D — UPDATE DATABASE
  23. Update Prisma schema (priceUsdc, amountUsdc)
  24. npx prisma migrate dev --name migrate_to_usdc

PHASE E — UPDATE FRONTEND
  25. Replace all ETH pricing displays with USDC
  26. Update flow activation: USDC.transfer instead of ETH value
  27. Update cost summary in builder right panel
  28. Update agent cards: "1.00 USDC per job"
```

---

## Common Mistakes — Never Make These

- **USDC has 6 decimals. 1 USDC = 1_000_000. Never use 18.**
- **CDP API keys are required for verify and settle.**
  The list endpoint works without keys. Verify does not.
- **The payment header name is PAYMENT-SIGNATURE in x402 v2.**
  Not X-PAYMENT. Keep X-PAYMENT as a fallback for older clients only.
- **Never block the response waiting for on-chain settlement.**
  CDP settles async. Serve the response immediately after verify passes.
- **The orchestrator wallet needs USDC balance before flows run.**
  Check balance before accepting flow activation.
  If insufficient: show "Add USDC to activate" in the builder.
- **Nonces must be 32 random bytes, never reused.**
  Use ethers.randomBytes(32) every time. Never cache or increment.
- **USDC pricing is stable — no ETH/USD conversion needed.**
  "1.00 USDC" always means ~$1.00. Remove ETH conversion from pricing UI.
- **Free agents (amount: "0") skip x402 entirely.**
  The SDK handles this automatically. Don't add custom logic.

---

*MilkyWay x402 + SDK*
*One npm install. Three endpoints. Start earning.*