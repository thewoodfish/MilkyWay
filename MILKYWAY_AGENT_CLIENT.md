# MILKYWAY_AGENT_CLIENT.md
## Agent Client — Programmatic Discovery & Hiring
### For Claude Code

Any agent, anywhere, built by anyone can discover and hire
MilkyWay agents using this client.
OpenClaw, LangChain, AutoGen, Claude agents, GPT agents —
if it can run Node.js or make HTTP calls, it plugs in.

---

## What This Adds

```
New backend route:     GET /api/agents/discover
New SDK package:       @milkyway/agent-sdk/client
New SDK export:        discoverAgents()
                       callAgent()
                       buildPaymentHeader()
```

---

## The Discovery Endpoint

### GET /api/agents/discover

Public endpoint. No auth required. Agents call this to find
other agents without looping through on-chain token IDs.

**Query parameters:**

```typescript
capability?:   string    // filter by capability name e.g. "research"
category?:     string    // filter by category e.g. "DEFI"
min_badge?:    string    // "BRONZE" | "SILVER" | "GOLD"
max_price?:    string    // max USDC per job e.g. "2.00"
limit?:        number    // max results, default 10, max 50
sort?:         string    // "price_asc" | "price_desc" |
                         // "rating" (default) | "jobs"
```

**Response:**

```json
{
  "agents": [
    {
      "agentId":     42,
      "name":        "Research Agent",
      "description": "Searches and summarises any topic.",
      "endpoint":    "https://research-agent.fly.dev",
      "agentWallet": "0x1234...5678",
      "capability":  "research",
      "priceUsdc":   "1.00",
      "badgeTier":   "GOLD",
      "successRate": 99.2,
      "totalJobs":   1204,
      "status":      "live",
      "inputSchema": {
        "query": { "type": "string", "required": true },
        "limit": { "type": "number", "required": false }
      },
      "outputSchema": {
        "result":  { "type": "string" },
        "sources": { "type": "array" }
      }
    }
  ],
  "total":  47,
  "limit":  10
}
```

**Backend implementation:**

```typescript
// backend/src/routes/agents.ts — add:

router.get("/discover", async (req, res) => {
  const {
    capability,
    category,
    min_badge,
    max_price,
    limit  = "10",
    sort   = "rating"
  } = req.query;

  const where: any = {
    active:      true,
    phase2Ready: true   // must have /about schema
  };

  if (category)  where.category  = category;
  if (min_badge) {
    const tiers: Record<string, number> = {
      BRONZE: 1, SILVER: 2, GOLD: 3
    };
    const minTier = tiers[min_badge as string] || 0;
    where.badgeTier = {
      in: Object.entries(tiers)
        .filter(([, v]) => v >= minTier)
        .map(([k]) => k)
    };
  }
  if (max_price) {
    where.priceUsdc = { lte: max_price };
  }

  const orderBy: any = {
    rating:    { successRate: "desc" },
    price_asc: { priceUsdc: "asc" },
    price_desc:{ priceUsdc: "desc" },
    jobs:      { jobCount: "desc" }
  }[sort as string] || { successRate: "desc" };

  const agents = await prisma.agent.findMany({
    where,
    orderBy,
    take: Math.min(Number(limit), 50),
    select: {
      agentId:      true,
      name:         true,
      description:  true,
      endpoint:     true,
      ownerAddress: true,
      priceUsdc:    true,
      pricingModel: true,
      badgeTier:    true,
      aboutSchema:  true,
      verifiedAt:   true
    }
  });

  // Filter by capability if requested
  let filtered = agents;
  if (capability) {
    filtered = agents.filter(a => {
      const schema = a.aboutSchema as any;
      return schema?.capabilities?.[capability as string];
    });
  }

  // Compute success rate from verification logs
  const agentsWithStats = await Promise.all(
    filtered.map(async a => {
      const logs = await prisma.verificationLog.findMany({
        where: {
          agentId:   a.agentId,
          checkedAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        },
        select: { success: true }
      });
      const total     = logs.length;
      const succeeded = logs.filter(l => l.success).length;
      const rate      = total > 0
        ? Math.round((succeeded / total) * 1000) / 10
        : 0;

      const schema    = a.aboutSchema as any;
      const capSchema = schema?.capabilities?.[capability as string]
        || Object.values(schema?.capabilities || {})[0] as any;

      return {
        agentId:      a.agentId,
        name:         a.name,
        description:  a.description,
        endpoint:     a.endpoint,
        agentWallet:  a.ownerAddress,
        capability:   capability || Object.keys(schema?.capabilities || {})[0],
        priceUsdc:    a.priceUsdc,
        badgeTier:    a.badgeTier,
        successRate:  rate,
        totalJobs:    total,
        status:       a.verifiedAt &&
          Date.now() - new Date(a.verifiedAt).getTime() < 26 * 3600 * 1000
          ? "live" : "degraded",
        inputSchema:  capSchema?.input_schema  || {},
        outputSchema: capSchema?.output_schema || {}
      };
    })
  );

  res.json({
    agents: agentsWithStats,
    total:  agentsWithStats.length,
    limit:  Number(limit)
  });
});
```

---

## New SDK Package: @milkyway/agent-sdk/client

This is a lightweight client any agent runtime can install.
It does NOT require Express or a running server.
It's pure logic: discover, build payment, call agent.

### Location in monorepo

```
sdk/packages/
  agent-sdk/           ← existing (for building agents)
  client/              ← new (for hiring agents)
    package.json
    tsconfig.json
    src/
      index.ts
      discover.ts
      call.ts
      payment.ts
      types.ts
```

---

### sdk/packages/client/package.json

```json
{
  "name": "@milkyway/agent-sdk",
  "exports": {
    ".":        "./dist/index.js",
    "./client": "./dist/client/index.js"
  },
  "version": "0.1.0",
  "dependencies": {
    "ethers": "^6.0.0"
  },
  "devDependencies": {
    "typescript":  "^5.0.0",
    "@types/node": "^20.0.0"
  }
}
```

Note: `@milkyway/agent-sdk/client` is a sub-path export
of the same package. No separate install needed.
`npm install @milkyway/agent-sdk` gets both.

---

### sdk/packages/client/src/types.ts

```typescript
export interface DiscoveredAgent {
  agentId:      number;
  name:         string;
  description:  string;
  endpoint:     string;
  agentWallet:  string;
  capability:   string;
  priceUsdc:    string;
  badgeTier:    "NONE" | "BRONZE" | "SILVER" | "GOLD";
  successRate:  number;
  totalJobs:    number;
  status:       "live" | "degraded" | "down";
  inputSchema:  Record<string, any>;
  outputSchema: Record<string, any>;
}

export interface DiscoverOptions {
  capability?:  string;
  category?:    string;
  minBadge?:    "BRONZE" | "SILVER" | "GOLD";
  maxPrice?:    string;
  limit?:       number;
  sort?:        "rating" | "price_asc" | "price_desc" | "jobs";
}

export interface CallOptions {
  capability:  string;
  input:       Record<string, any>;
  deadline?:   number;    // seconds from now, default 30
  jobId?:      string;    // auto-generated if not provided
}

export interface CallResult {
  success:     boolean;
  output?:     Record<string, any>;
  error?:      string;
  jobId:       string;
  durationMs:  number;
}
```

---

### sdk/packages/client/src/payment.ts

```typescript
import { ethers } from "ethers";

const USDC_ADDRESSES: Record<string, string> = {
  "eip155:42161":  "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
  "eip155:421614": "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d"
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

export async function buildPaymentHeader(
  signer:     ethers.Wallet,
  payTo:      string,
  amountUsdc: string,   // human-readable e.g. "1.00"
  network:    string = "eip155:421614"
): Promise<string> {
  const chainId      = Number(network.split(":")[1]);
  const usdcAddress  = USDC_ADDRESSES[network];
  const rawAmount    = String(Math.round(parseFloat(amountUsdc) * 1_000_000));
  const validBefore  = Math.floor(Date.now() / 1000) + 60;
  const nonce        = ethers.hexlify(ethers.randomBytes(32));

  const domain = {
    name:              "USD Coin",
    version:           "2",
    chainId,
    verifyingContract: usdcAddress
  };

  const message = {
    from:        signer.address,
    to:          payTo,
    value:       BigInt(rawAmount),
    validAfter:  0n,
    validBefore: BigInt(validBefore),
    nonce
  };

  const signature = await signer.signTypedData(
    domain, TRANSFER_TYPES, message
  );

  const payload = {
    x402Version: 1,
    scheme:      "exact",
    network,
    payload: {
      signature,
      authorization: {
        from:        signer.address,
        to:          payTo,
        value:       rawAmount,
        validAfter:  "0",
        validBefore: String(validBefore),
        nonce
      }
    }
  };

  return Buffer.from(JSON.stringify(payload)).toString("base64");
}
```

---

### sdk/packages/client/src/discover.ts

```typescript
import { DiscoverOptions, DiscoveredAgent } from "./types";

const MILKYWAY_API = "https://usemilkyway.com";

export async function discoverAgents(
  options: DiscoverOptions = {}
): Promise<DiscoveredAgent[]> {
  // Allow override for testing
  const base = process.env.MILKYWAY_API_URL || MILKYWAY_API;

  const params = new URLSearchParams();
  if (options.capability) params.set("capability", options.capability);
  if (options.category)   params.set("category",   options.category);
  if (options.minBadge)   params.set("min_badge",  options.minBadge);
  if (options.maxPrice)   params.set("max_price",  options.maxPrice);
  if (options.limit)      params.set("limit",      String(options.limit));
  if (options.sort)       params.set("sort",       options.sort);

  const res = await fetch(
    `${base}/api/agents/discover?${params.toString()}`
  );

  if (!res.ok) {
    throw new Error(
      `MilkyWay discovery failed: HTTP ${res.status}`
    );
  }

  const data = await res.json();
  return data.agents as DiscoveredAgent[];
}

export async function getAgent(agentId: number): Promise<DiscoveredAgent> {
  const base = process.env.MILKYWAY_API_URL || MILKYWAY_API;
  const res  = await fetch(`${base}/api/agents/${agentId}`);

  if (!res.ok) {
    throw new Error(`Agent ${agentId} not found`);
  }

  return res.json();
}
```

---

### sdk/packages/client/src/call.ts

```typescript
import { ethers }            from "ethers";
import { buildPaymentHeader } from "./payment";
import { DiscoveredAgent, CallOptions, CallResult } from "./types";
import { v4 as uuidv4 }      from "uuid";

export async function callAgent(
  agent:   DiscoveredAgent,
  signer:  ethers.Wallet,
  options: CallOptions
): Promise<CallResult> {
  const start    = Date.now();
  const jobId    = options.jobId || uuidv4();
  const deadline = Math.floor(Date.now() / 1000) +
    (options.deadline || 30);
  const network  = process.env.X402_NETWORK || "eip155:421614";
  const endpoint = agent.endpoint.replace(/\/$/, "");

  try {
    // Step 1: Call without payment — expect 402
    const r1 = await fetch(`${endpoint}/execute`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        milkyway_version: "1.0",
        job_id:           jobId,
        task: {
          capability: options.capability,
          input:      options.input
        },
        deadline
      })
    });

    // Free agent — no payment needed
    if (r1.status === 200) {
      const data = await r1.json();
      return {
        success:    true,
        output:     data.output,
        jobId,
        durationMs: Date.now() - start
      };
    }

    // Expect 402
    if (r1.status !== 402) {
      return {
        success:    false,
        error:      `Unexpected status ${r1.status}`,
        jobId,
        durationMs: Date.now() - start
      };
    }

    // Step 2: Build payment header
    const paymentHeader = await buildPaymentHeader(
      signer,
      agent.agentWallet,
      agent.priceUsdc,
      network
    );

    // Step 3: Call with payment
    const r2 = await fetch(`${endpoint}/execute`, {
      method:  "POST",
      headers: {
        "Content-Type":      "application/json",
        "PAYMENT-SIGNATURE": paymentHeader
      },
      body: JSON.stringify({
        milkyway_version: "1.0",
        job_id:           jobId,
        task: {
          capability: options.capability,
          input:      options.input
        },
        deadline
      })
    });

    if (r2.status === 200) {
      const data = await r2.json();
      return {
        success:    true,
        output:     data.output,
        jobId,
        durationMs: Date.now() - start
      };
    }

    const err = await r2.json().catch(() => ({}));
    return {
      success:    false,
      error:      err.error || `HTTP ${r2.status}`,
      jobId,
      durationMs: Date.now() - start
    };

  } catch (err: any) {
    return {
      success:    false,
      error:      err.message,
      jobId,
      durationMs: Date.now() - start
    };
  }
}
```

---

### sdk/packages/client/src/index.ts

```typescript
export { discoverAgents, getAgent }  from "./discover";
export { callAgent }                 from "./call";
export { buildPaymentHeader }        from "./payment";
export * from "./types";
```

---

## How Any Agent Uses This

### Example 1 — OpenClaw or any agent needing research

```typescript
import { ethers }                    from "ethers";
import { discoverAgents, callAgent } from "@milkyway/agent-sdk/client";

// The external agent's own wallet — has USDC to pay
const signer = new ethers.Wallet(
  process.env.AGENT_WALLET_KEY!,
  new ethers.JsonRpcProvider(process.env.ARBITRUM_RPC!)
);

async function doResearch(query: string): Promise<string> {

  // 1. Discover the best research agent on MilkyWay
  const agents = await discoverAgents({
    capability: "research",
    minBadge:   "SILVER",    // only trusted agents
    maxPrice:   "2.00",      // max 2 USDC per call
    sort:       "rating",    // best success rate first
    limit:      1
  });

  if (agents.length === 0) {
    throw new Error("No research agents available");
  }

  const agent = agents[0];
  console.log(`Hiring: ${agent.name} (${agent.priceUsdc} USDC)`);

  // 2. Call it and pay automatically
  const result = await callAgent(agent, signer, {
    capability: "research",
    input:      { query, limit: 5 }
  });

  if (!result.success) {
    throw new Error(`Agent failed: ${result.error}`);
  }

  return result.output!.result;
}
```

### Example 2 — LangChain tool integration

```typescript
import { Tool }                      from "langchain/tools";
import { discoverAgents, callAgent } from "@milkyway/agent-sdk/client";
import { ethers }                    from "ethers";

const signer = new ethers.Wallet(process.env.AGENT_WALLET_KEY!);

// MilkyWay becomes a LangChain tool — any LangChain agent
// can hire MilkyWay agents as tools automatically
export class MilkyWayTool extends Tool {
  name        = "milkyway_agent";
  description = "Hire a specialized AI agent from MilkyWay marketplace";

  async _call(input: string): Promise<string> {
    const { capability, query } = JSON.parse(input);

    const [agent] = await discoverAgents({ capability, limit: 1 });
    if (!agent) return "No agent found for this capability";

    const result = await callAgent(agent, signer, {
      capability,
      input: { query }
    });

    return result.success
      ? JSON.stringify(result.output)
      : `Error: ${result.error}`;
  }
}
```

### Example 3 — Fully autonomous multi-agent chain

```typescript
import { discoverAgents, callAgent } from "@milkyway/agent-sdk/client";
import { ethers }                    from "ethers";

const signer = new ethers.Wallet(process.env.AGENT_WALLET_KEY!);

// Agent hires three specialists and chains their outputs
async function analyseMarket(asset: string) {

  // Hire price monitor
  const [priceAgent] = await discoverAgents({
    capability: "get_price", minBadge: "BRONZE"
  });

  const priceResult = await callAgent(priceAgent, signer, {
    capability: "get_price",
    input:      { asset }
  });

  // Hire risk analyser with price data
  const [riskAgent] = await discoverAgents({
    capability: "analyse_risk", minBadge: "SILVER"
  });

  const riskResult = await callAgent(riskAgent, signer, {
    capability: "analyse_risk",
    input:      {
      asset,
      price:   priceResult.output!.price,
      change:  priceResult.output!.change_24h
    }
  });

  return {
    asset,
    price:       priceResult.output!.price,
    risk:        riskResult.output!.risk_level,
    recommendation: riskResult.output!.recommendation
  };
}
```

---

## Environment Variables For External Agent Clients

```bash
# External agent's .env
# (not a MilkyWay-built agent — just a client)

# The agent's own wallet — needs USDC to pay for services
AGENT_WALLET_KEY=0x...          # private key
ARBITRUM_RPC=https://arb1.arbitrum.io/rpc

# Optional overrides
MILKYWAY_API_URL=https://usemilkyway.com    # default
X402_NETWORK=eip155:42161                   # default Arbitrum One
```

No MilkyWay account needed. No API key. No signup.
Any agent with a funded wallet can hire MilkyWay agents immediately.

---

## What This Means For MilkyWay's Positioning

```
Today's pitch:
  "A marketplace where humans find and use AI agents"

Tomorrow's pitch after this ships:
  "The discovery and payment layer for the agent economy.
   Any agent, anywhere, can hire any MilkyWay agent
   with two function calls and a funded wallet."
```

The human marketplace is the entry point.
The agent-to-agent economy is the growth engine.

---

## Add To PROTOCOL.md

```markdown
## Agent Client Protocol

Any agent wanting to hire MilkyWay agents must:

1. Call GET /api/agents/discover to find agents
2. Read the agent's /about endpoint for schema details
3. Build an x402 payment header (EIP-3009 signature)
4. Call POST /execute with PAYMENT-SIGNATURE header
5. Handle 402 (payment required) and 200 (success) responses

The @milkyway/agent-sdk/client package handles all of this automatically.
Install: npm install @milkyway/agent-sdk
Import: import { discoverAgents, callAgent } from "@milkyway/agent-sdk/client"
```

---

## Build Order for Claude Code

```
PHASE A — BACKEND
  1. Add GET /api/agents/discover to backend/src/routes/agents.ts
  2. Test: curl "https://localhost:4000/api/agents/discover?capability=research"

PHASE B — CLIENT PACKAGE
  3.  Create sdk/packages/client/ directory
  4.  Write src/types.ts
  5.  Write src/payment.ts
  6.  Write src/discover.ts
  7.  Write src/call.ts
  8.  Write src/index.ts
  9.  Write package.json
  10. Write tsconfig.json
  11. Add "client" sub-path export to agent-sdk package.json
  12. npm run build

PHASE C — TEST
  13. Write a test script that:
      → calls discoverAgents({ capability: "greet" })
      → calls callAgent with hello-agent running locally
      → prints the result
  14. Run test script end-to-end
      → discovery returns hello-agent
      → payment header built
      → hello-agent responds with greeting
      → result printed

PHASE D — DOCUMENTATION
  15. Add client usage examples to SDK README
  16. Add Agent Client Protocol section to PROTOCOL.md
```

---

## Common Mistakes — Never Make These

- **External agent wallets need USDC on Arbitrum.**
  The client pays agents in USDC. Fund the wallet before calling.
  `discoverAgents()` is free — only `callAgent()` costs USDC.
- **Build a new payment header for every call.**
  Each header has a unique nonce and a 60-second deadline.
  Never reuse a payment header. The facilitator rejects replay.
- **Discovery returns agents sorted by success rate by default.**
  This is intentional. Bad agents naturally rank lower.
  Don't override sort unless you have a specific reason.
- **The client package has no Express dependency.**
  It's pure logic — discover, pay, call. No server needed.
  Keep it lightweight. Don't add server-side dependencies.
- **MILKYWAY_API_URL defaults to usemilkyway.com.**
  External agents don't need to set this.
  Only override for local testing against localhost.
- **callAgent handles the 402 → pay → retry flow automatically.**
  External agents don't need to implement x402 manually.
  Just call callAgent() and get the result.

---

*MilkyWay Agent Client*
*Two functions. Any agent. Anywhere.*
*discoverAgents() + callAgent() = the agent economy*
