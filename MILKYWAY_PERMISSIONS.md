# MILKYWAY_PERMISSIONS.md
## Agent Permissions System — Full Spec
### Phase 2 Implementation

Read alongside all other MILKYWAY_*.md files.
This file defines the complete permissions system for MilkyWay Phase 2.

---

## Overview

Agents declare what they need. Users decide what to grant.
Two permissions are informational. One requires real enforcement.

```
READ_WALLET_BALANCE      Informational — shown to user, nothing enforced
ACCESS_EXTERNAL_APIS     Informational — shown to user, nothing enforced
EXECUTE_TRANSACTIONS     Enforced — requires ERC-20 spend limit from user
```

"Manage Other Agents" is dropped from Phase 2.
It becomes relevant in Phase 3 when autonomous agent hiring exists.

---

## Permission Definitions

### READ_WALLET_BALANCE
```
What:       Agent reads your token balances on-chain
Risk:       Zero — on-chain data is public
Enforced:   No — informational only
Icon:       👁
Label:      "Read your wallet balance"
```

### ACCESS_EXTERNAL_APIS
```
What:       Agent calls third-party services
            (OpenAI, CoinGecko, news APIs, etc.)
Risk:       Low — privacy concern, not financial
Enforced:   No — informational only
Icon:       🌐
Label:      "Access external APIs"
Sub-label:  Builder specifies which APIs e.g. "(CoinGecko for prices)"
```

### EXECUTE_TRANSACTIONS
```
What:       Agent submits transactions on your behalf
            (swap, stake, repay, transfer)
Risk:       High — real money moves autonomously
Enforced:   Yes — via ERC-20 allowance
Icon:       ⚡
Label:      "Execute transactions on your behalf"
Requires:   User sets a spend limit before activation
```

---

## agent.json Permission Declaration

Builders declare permissions in `agent.json` per capability.
The SDK reads this and the frontend renders it automatically.

```json
{
  "milkyway_version": "1.0",
  "name": "Liquidation Shield",
  "capabilities": {
    "protect": {
      "description": "Monitor and protect your Aave position",
      "pricing": {
        "model": "per_job",
        "amount": "1.00",
        "currency": "USDC"
      },
      "permissions": [
        {
          "type": "READ_WALLET_BALANCE",
          "reason": "Check your current collateral ratio"
        },
        {
          "type": "ACCESS_EXTERNAL_APIS",
          "reason": "CoinGecko for live ETH price data"
        },
        {
          "type": "EXECUTE_TRANSACTIONS",
          "reason": "Repay your Aave loan when collateral drops",
          "token": "USDC",
          "max_per_transaction": "500",
          "max_lifetime": "2000"
        }
      ],
      "input_schema": { ... },
      "output_schema": { ... }
    }
  }
}
```

### Permission Object Fields

```typescript
interface PermissionDeclaration {
  type:                "READ_WALLET_BALANCE"
                     | "ACCESS_EXTERNAL_APIS"
                     | "EXECUTE_TRANSACTIONS";
  reason:              string;   // plain English why this is needed

  // Only for EXECUTE_TRANSACTIONS:
  token?:              string;   // "USDC" — only USDC supported in Phase 2
  max_per_transaction?: string;  // suggested max per tx e.g. "500"
  max_lifetime?:        string;  // suggested total lifetime e.g. "2000"
}
```

---

## /about Response Update

`/about` now includes permissions per capability:

```json
{
  "milkyway_version": "1.0",
  "name": "Liquidation Shield",
  "capabilities": {
    "protect": {
      "description": "...",
      "pricing": { ... },
      "permissions": [
        {
          "type":   "READ_WALLET_BALANCE",
          "reason": "Check your current collateral ratio"
        },
        {
          "type":   "ACCESS_EXTERNAL_APIS",
          "reason": "CoinGecko for live ETH price data"
        },
        {
          "type":              "EXECUTE_TRANSACTIONS",
          "reason":            "Repay your Aave loan when collateral drops",
          "token":             "USDC",
          "max_per_transaction": "500",
          "max_lifetime":      "2000"
        }
      ],
      "input_schema": { ... },
      "output_schema": { ... }
    }
  }
}
```

---

## SDK Changes

### Update types.ts

```typescript
// Add to existing types

export type PermissionType =
  | "READ_WALLET_BALANCE"
  | "ACCESS_EXTERNAL_APIS"
  | "EXECUTE_TRANSACTIONS";

export interface PermissionDeclaration {
  type:                  PermissionType;
  reason:                string;
  // EXECUTE_TRANSACTIONS only:
  token?:                string;
  max_per_transaction?:  string;
  max_lifetime?:         string;
}

// Update CapabilityDef to include permissions
export interface CapabilityDef {
  description:           string;
  pricing:               AgentPricing;
  permissions?:          PermissionDeclaration[];   // ← add this
  input_schema:          AgentSchema;
  output_schema:         AgentSchema;
}
```

### Update agent.json validation in CLI (validate command)

```typescript
// In sdk/packages/cli/src/commands/validate.ts
// Add permission validation:

for (const [name, cap] of caps) {
  if (cap.permissions) {
    for (const perm of cap.permissions) {

      const validTypes = [
        "READ_WALLET_BALANCE",
        "ACCESS_EXTERNAL_APIS",
        "EXECUTE_TRANSACTIONS"
      ];

      if (!validTypes.includes(perm.type)) {
        errors.push(
          `capability "${name}": unknown permission type "${perm.type}"`
        );
      }

      if (!perm.reason) {
        warnings.push(
          `capability "${name}" permission "${perm.type}": missing reason`
        );
      }

      if (perm.type === "EXECUTE_TRANSACTIONS") {
        if (!perm.token) {
          errors.push(
            `capability "${name}" EXECUTE_TRANSACTIONS: token is required`
          );
        }
        if (perm.token && perm.token !== "USDC") {
          errors.push(
            `capability "${name}" EXECUTE_TRANSACTIONS: ` +
            `only USDC is supported in Phase 2`
          );
        }
        if (!perm.max_per_transaction) {
          warnings.push(
            `capability "${name}" EXECUTE_TRANSACTIONS: ` +
            `max_per_transaction not set — user will choose freely`
          );
        }
      }
    }
  }
}
```

### Update hello-agent example

Add permissions to hello-agent so developers see the pattern:

```typescript
// agents/hello-agent/agent.json
{
  "milkyway_version": "1.0",
  "name": "Hello Agent",
  "capabilities": {
    "greet": {
      "description": "Greets anyone by name",
      "pricing": { "model": "per_job", "amount": "0.10", "currency": "USDC" },
      "permissions": [
        {
          "type":   "ACCESS_EXTERNAL_APIS",
          "reason": "OpenAI for generating the greeting"
        }
      ],
      "input_schema": {
        "name": { "type": "string", "required": true }
      },
      "output_schema": {
        "greeting": { "type": "string" }
      }
    }
  }
}
```

---

## Database Changes

### Add to Prisma schema

```prisma
// Track spend limit grants per user per agent
model SpendLimit {
  id              String   @id @default(cuid())
  userAddress     String
  agentId         Int
  agentAddress    String   // agent's wallet address
  token           String   // "USDC"
  maxPerTx        String   // raw units e.g. "500000000" = 500 USDC
  maxLifetime     String   // raw units
  spentToDate     String   @default("0")
  grantTxHash     String?
  revokedAt       DateTime?
  active          Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([userAddress, agentId])
  @@index([userAddress])
  @@index([agentId])
}
```

Run migration:
```bash
npx prisma migrate dev --name add_spend_limits
```

### New Backend Routes

```typescript
// GET /api/permissions/:agentId
// Returns permission declarations for an agent (from cached /about)
// Public — no auth required

// POST /api/permissions/grant
// Records a spend limit grant after user approves on-chain
// Body: { agentId, userAddress, maxPerTx, maxLifetime, txHash }
// Requires: SIWE auth

// GET /api/permissions/my
// Returns all active spend limits for the signed-in user
// Requires: SIWE auth

// POST /api/permissions/revoke
// Records revocation after user calls USDC.approve(agent, 0)
// Body: { agentId }
// Requires: SIWE auth

// GET /api/permissions/check
// Checks if user has granted spend permission to an agent
// Body: { agentId, userAddress }
// Used by execution engine before running EXECUTE_TRANSACTIONS agents
```

---

## Frontend Changes

### 1. New Component: PermissionsList

```typescript
// frontend/components/PermissionsList.tsx
// Renders permission declarations in human-readable format
// Used in: agent profile, activation modal, builder right panel

import { PermissionDeclaration } from "@/types";

const PERMISSION_CONFIG = {
  READ_WALLET_BALANCE: {
    icon:  "👁",
    label: "Read your wallet balance",
    color: "text-gray-600",
    bg:    "bg-gray-50",
    border:"border-gray-200"
  },
  ACCESS_EXTERNAL_APIS: {
    icon:  "🌐",
    label: "Access external APIs",
    color: "text-blue-600",
    bg:    "bg-blue-50",
    border:"border-blue-100"
  },
  EXECUTE_TRANSACTIONS: {
    icon:  "⚡",
    label: "Execute transactions on your behalf",
    color: "text-amber-600",
    bg:    "bg-amber-50",
    border:"border-amber-200"
  }
};

interface Props {
  permissions: PermissionDeclaration[];
  compact?:    boolean;   // compact mode for cards
}

export function PermissionsList({ permissions, compact = false }: Props) {
  if (!permissions || permissions.length === 0) return null;

  const hasExecute = permissions.some(
    p => p.type === "EXECUTE_TRANSACTIONS"
  );

  return (
    <div className="space-y-2">
      {permissions.map((perm, i) => {
        const config = PERMISSION_CONFIG[perm.type];
        return (
          <div key={i} className={`
            flex items-start gap-3 rounded-lg px-3 py-2.5
            border ${config.border} ${config.bg}
          `}>
            <span className="text-base flex-shrink-0 mt-0.5">
              {config.icon}
            </span>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${config.color}`}>
                {config.label}
              </p>
              {!compact && perm.reason && (
                <p className="text-xs text-gray-400 mt-0.5">
                  {perm.reason}
                </p>
              )}
              {!compact &&
               perm.type === "EXECUTE_TRANSACTIONS" &&
               perm.max_per_transaction && (
                <p className="text-xs text-amber-600 mt-0.5 font-medium">
                  Suggested limit: {perm.max_per_transaction} USDC per action
                </p>
              )}
            </div>
          </div>
        );
      })}

      {hasExecute && !compact && (
        <p className="text-xs text-gray-400 mt-1 px-1">
          ⚡ Transaction permission requires you to set a spend limit below.
        </p>
      )}
    </div>
  );
}
```

---

### 2. New Component: SpendLimitInput

```typescript
// frontend/components/SpendLimitInput.tsx
// Shown when activating an EXECUTE_TRANSACTIONS agent
// User sets per-tx and lifetime limits before approving

import { useState } from "react";

interface Props {
  suggestedPerTx:   string;   // from permission declaration
  suggestedLifetime: string;
  token:            string;   // "USDC"
  onConfirm: (perTx: string, lifetime: string) => void;
}

export function SpendLimitInput({
  suggestedPerTx,
  suggestedLifetime,
  token,
  onConfirm
}: Props) {
  const [perTx,    setPerTx]    = useState(suggestedPerTx || "500");
  const [lifetime, setLifetime] = useState(suggestedLifetime || "2000");
  const [error,    setError]    = useState<string | null>(null);

  function validate() {
    const p = parseFloat(perTx);
    const l = parseFloat(lifetime);

    if (isNaN(p) || p <= 0) {
      setError("Per-transaction limit must be greater than 0");
      return false;
    }
    if (isNaN(l) || l <= 0) {
      setError("Lifetime limit must be greater than 0");
      return false;
    }
    if (p > l) {
      setError("Per-transaction limit cannot exceed lifetime limit");
      return false;
    }
    setError(null);
    return true;
  }

  return (
    <div className="
      border border-amber-200 bg-amber-50
      rounded-xl p-4 space-y-4
    ">
      <div className="flex items-center gap-2">
        <span>⚡</span>
        <p className="text-sm font-semibold text-amber-800">
          Set a spend limit
        </p>
      </div>

      <p className="text-xs text-amber-700">
        This agent can execute transactions on your behalf.
        Set limits to control how much it can spend.
        You can revoke or change this at any time.
      </p>

      <div className="space-y-3">
        {/* Per-transaction limit */}
        <div>
          <label className="
            text-xs font-medium text-gray-700 block mb-1
          ">
            Maximum per transaction
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={perTx}
              onChange={e => setPerTx(e.target.value)}
              min="0"
              step="10"
              className="input-base flex-1"
            />
            <span className="text-sm font-medium text-gray-500
              flex-shrink-0">
              {token}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            The agent cannot spend more than this in a single action
          </p>
        </div>

        {/* Lifetime limit */}
        <div>
          <label className="
            text-xs font-medium text-gray-700 block mb-1
          ">
            Maximum total (lifetime)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={lifetime}
              onChange={e => setLifetime(e.target.value)}
              min="0"
              step="100"
              className="input-base flex-1"
            />
            <span className="text-sm font-medium text-gray-500
              flex-shrink-0">
              {token}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            After this total is reached the agent cannot spend more
          </p>
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}

      <div className="
        bg-white border border-amber-100 rounded-lg px-3 py-2
      ">
        <p className="text-xs text-gray-500">
          This will prompt your wallet to approve a{" "}
          <strong>{perTx} {token}</strong> spend limit.
          No funds move now — only when the agent executes a transaction.
        </p>
      </div>
    </div>
  );
}
```

---

### 3. New Component: ActivationModal

```typescript
// frontend/components/ActivationModal.tsx
// Shown when user clicks "Activate" or "Execute Now"
// Handles both simple activation and execute-transactions activation

import { useState }         from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits }       from "viem";
import { PermissionsList }  from "./PermissionsList";
import { SpendLimitInput }  from "./SpendLimitInput";
import { AgentAvatar }      from "./AgentAvatar";

const USDC_ADDRESS = "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d"; // Sepolia
// Production: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831"

const USDC_ABI = [
  {
    name:    "approve",
    type:    "function",
    inputs:  [
      { name: "spender", type: "address" },
      { name: "amount",  type: "uint256" }
    ],
    outputs: [{ type: "bool" }]
  }
] as const;

type Step = "review" | "approving" | "activating" | "done";

interface Props {
  agent: {
    agentId:      number;
    name:         string;
    logoUrl?:     string | null;
    badgeTier:    string;
    priceUsdc:    string;
    permissions:  PermissionDeclaration[];
    agentWallet:  string;
  };
  capability:  string;
  taskInput:   Record<string, any>;
  onSuccess:   (output: any) => void;
  onClose:     () => void;
}

export function ActivationModal({
  agent, capability, taskInput, onSuccess, onClose
}: Props) {
  const [step,       setStep]       = useState<Step>("review");
  const [perTx,      setPerTx]      = useState("500");
  const [lifetime,   setLifetime]   = useState("2000");
  const [txHash,     setTxHash]     = useState<string>();
  const [error,      setError]      = useState<string | null>(null);

  const hasExecutePermission = agent.permissions.some(
    p => p.type === "EXECUTE_TRANSACTIONS"
  );

  const executePermission = agent.permissions.find(
    p => p.type === "EXECUTE_TRANSACTIONS"
  );

  // wagmi write contract for USDC.approve
  const { writeContractAsync } = useWriteContract();

  // Wait for approval tx
  const { isSuccess: approvalConfirmed } =
    useWaitForTransactionReceipt({ hash: txHash as `0x${string}` });

  async function handleActivate() {
    setError(null);

    try {
      if (hasExecutePermission) {
        // Step 1: approve USDC spend limit
        setStep("approving");

        const amountRaw = parseUnits(lifetime, 6); // USDC has 6 decimals

        const hash = await writeContractAsync({
          address:      USDC_ADDRESS,
          abi:          USDC_ABI,
          functionName: "approve",
          args:         [agent.agentWallet as `0x${string}`, amountRaw]
        });

        setTxHash(hash);

        // Wait for confirmation
        // useWaitForTransactionReceipt handles this reactively
        // Move to activating state in useEffect when approvalConfirmed
      } else {
        // No execute permission — activate directly
        setStep("activating");
        await runAgent();
      }
    } catch (err: any) {
      setError(err.message);
      setStep("review");
    }
  }

  // Called after approval confirms
  async function runAgent() {
    setStep("activating");
    try {
      // Record grant in MilkyWay backend
      if (hasExecutePermission) {
        await authFetch("/api/permissions/grant", {
          method: "POST",
          body: JSON.stringify({
            agentId:     agent.agentId,
            maxPerTx:    String(Math.round(parseFloat(perTx) * 1_000_000)),
            maxLifetime: String(Math.round(parseFloat(lifetime) * 1_000_000)),
            txHash
          })
        });
      }

      // Create and execute the flow
      const result = await executeFlow({
        agentId:    agent.agentId,
        capability,
        taskInput
      });

      onSuccess(result.output);
      setStep("done");
    } catch (err: any) {
      setError(err.message);
      setStep("review");
    }
  }

  // React to approval confirmation
  if (approvalConfirmed && step === "approving") {
    runAgent();
  }

  return (
    <Modal onClose={step === "review" ? onClose : undefined}>
      <div className="p-6">

        {/* Agent header */}
        <div className="flex items-center gap-3 mb-5">
          <AgentAvatar
            agentId={agent.agentId}
            logoUrl={agent.logoUrl}
            badgeTier={agent.badgeTier as any}
            size={44}
          />
          <div>
            <p className="font-semibold text-gray-900">{agent.name}</p>
            <p className="text-xs text-gray-400">
              {agent.priceUsdc} USDC per job
            </p>
          </div>
        </div>

        {/* REVIEW STEP */}
        {step === "review" && (
          <>
            {/* Permissions */}
            <div className="mb-5">
              <p className="text-xs font-semibold text-gray-500
                uppercase tracking-wide mb-2">
                This agent will:
              </p>
              <PermissionsList permissions={agent.permissions} />
            </div>

            {/* Spend limit (only if EXECUTE_TRANSACTIONS) */}
            {hasExecutePermission && (
              <div className="mb-5">
                <SpendLimitInput
                  suggestedPerTx={
                    executePermission?.max_per_transaction || "500"
                  }
                  suggestedLifetime={
                    executePermission?.max_lifetime || "2000"
                  }
                  token="USDC"
                  onConfirm={(pt, lt) => {
                    setPerTx(pt);
                    setLifetime(lt);
                  }}
                />
              </div>
            )}

            {/* Cost */}
            <div className="
              flex justify-between items-center
              border-t border-gray-100 pt-4 mb-5
            ">
              <span className="text-sm text-gray-500">Job cost</span>
              <span className="text-sm font-semibold text-gray-900">
                {agent.priceUsdc} USDC
              </span>
            </div>

            {error && (
              <p className="text-xs text-red-500 mb-3">{error}</p>
            )}

            <div className="flex gap-3">
              <button onClick={onClose} className="btn-secondary flex-1">
                Cancel
              </button>
              <button
                onClick={handleActivate}
                className="btn-primary flex-1"
              >
                {hasExecutePermission
                  ? "Set Limit & Activate →"
                  : "Activate →"
                }
              </button>
            </div>
          </>
        )}

        {/* APPROVING STEP */}
        {step === "approving" && (
          <div className="text-center py-6">
            <div className="text-3xl mb-3">⏳</div>
            <p className="font-medium text-gray-900 mb-1">
              Approving spend limit
            </p>
            <p className="text-sm text-gray-400">
              Confirm the approval in your wallet.
              This sets a {lifetime} USDC spending limit.
            </p>
          </div>
        )}

        {/* ACTIVATING STEP */}
        {step === "activating" && (
          <div className="text-center py-6">
            <div className="text-3xl mb-3">⟳</div>
            <p className="font-medium text-gray-900 mb-1">
              Running agent...
            </p>
            <p className="text-sm text-gray-400">
              {agent.name} is working on your request.
            </p>
          </div>
        )}

      </div>
    </Modal>
  );
}
```

---

### 4. Agent Profile Page Update

Add permissions section to `frontend/app/agents/[agentId]/page.tsx`.

**Add between description and pricing sections:**

```typescript
{/* Permissions section */}
{about?.capabilities?.[primaryCapability]?.permissions?.length > 0 && (
  <Section title="What this agent can do">
    <p className="text-xs text-gray-400 mb-3">
      Review what this agent is permitted to do before activating.
    </p>
    <PermissionsList
      permissions={about.capabilities[primaryCapability].permissions}
    />
  </Section>
)}
```

---

### 5. Agent Card Update

Add a permission badge to agent cards for agents with EXECUTE_TRANSACTIONS.

```typescript
// In frontend/components/AgentCard.tsx
// Add after the category tag:

{hasExecutePermission && (
  <span className="
    text-xs font-medium text-amber-600
    bg-amber-50 px-2 py-0.5 rounded-full
    border border-amber-100
  ">
    ⚡ Can execute
  </span>
)}
```

---

### 6. Builder Right Panel Update

When an EXECUTE_TRANSACTIONS agent is added to the canvas,
the right panel shows a warning in the agent detail state.

**Add to `RightPanelAgent` in `frontend/app/builder/page.tsx`:**

```typescript
{/* Execute permission warning in builder */}
{capability?.permissions?.some(
  p => p.type === "EXECUTE_TRANSACTIONS"
) && (
  <div className="
    border border-amber-200 bg-amber-50
    rounded-lg px-3 py-2.5 mb-4
  ">
    <p className="text-xs font-medium text-amber-800 mb-0.5">
      ⚡ This agent can execute transactions
    </p>
    <p className="text-xs text-amber-600">
      When you activate this flow, you'll be asked
      to set a spend limit for this agent.
    </p>
  </div>
)}
```

---

### 7. New Page: Spend Limits Management

```
frontend/app/settings/spend-limits/page.tsx
```

Add to settings sidebar:

```typescript
{ label: "Spend Limits", href: "/settings/spend-limits" }
```

**Page layout:**

```
HEADER
  Spend Limits
  ─────────────────────────────────────────────────────
  Control how much agents can spend on your behalf.
  Revoke or adjust limits at any time.

ACTIVE LIMITS TABLE

  ┌────────────────────────────────────────────────────────┐
  │  Agent           Per tx      Lifetime    Remaining     │
  │  ─────────────────────────────────────────────────────│
  │  Liquidation     500 USDC    2,000 USDC  1,650 USDC   │
  │  Shield          ────────────────────────────────────  │
  │                  Granted 3 days ago                    │
  │                  [Edit]              [Revoke]          │
  │  ─────────────────────────────────────────────────────│
  │  Yield           100 USDC    500 USDC    500 USDC      │
  │  Optimizer       ────────────────────────────────────  │
  │                  Granted 1 week ago                    │
  │                  [Edit]              [Revoke]          │
  └────────────────────────────────────────────────────────┘

  If no limits:
  ┌────────────────────────────────────────────────────────┐
  │  No spend limits granted yet.                          │
  │  They appear here when you activate agents that        │
  │  can execute transactions.                             │
  └────────────────────────────────────────────────────────┘
```

**Revoke flow:**

```
Click [Revoke] →

  Confirmation modal:
  "Revoke Liquidation Shield's spend permission?

   This will:
   • Call USDC.approve(agent_wallet, 0) on Arbitrum
   • Immediately prevent this agent from spending USDC
   • Cost a small amount of gas

   [Cancel]    [Revoke Access]"

On confirm:
  writeContract USDC.approve(agent_wallet, 0)
  Wait for confirmation
  POST /api/permissions/revoke { agentId }
  Remove from table
```

**Edit flow:**

```
Click [Edit] →

  SpendLimitInput modal pre-filled with current values
  User changes limits
  writeContract USDC.approve(agent_wallet, newLifetimeAmount)
  POST /api/permissions/grant with new values
  Table updates
```

---

## Execution Engine Update

Before executing an EXECUTE_TRANSACTIONS job, the engine verifies
the user has granted sufficient allowance on-chain.

**In `services/src/services/engine.ts`:**

```typescript
import { ethers } from "ethers";

const USDC_ABI = [
  "function allowance(address owner, address spender) view returns (uint256)"
];

async function checkSpendPermission(
  userAddress:  string,
  agentWallet:  string,
  amountUsdc:   string,  // human readable e.g. "500"
  network:      string
): Promise<{ allowed: boolean; reason?: string }> {

  const rpc = network === "eip155:42161"
    ? process.env.ARBITRUM_RPC
    : process.env.ARBITRUM_SEPOLIA_RPC;

  const usdcAddress = network === "eip155:42161"
    ? "0xaf88d065e77c8cC2239327C5EDb3A432268e5831"
    : "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d";

  const provider = new ethers.JsonRpcProvider(rpc);
  const usdc     = new ethers.Contract(usdcAddress, USDC_ABI, provider);

  const allowance: bigint = await usdc.allowance(userAddress, agentWallet);
  const required          = parseUnits(amountUsdc, 6);

  if (allowance < required) {
    return {
      allowed: false,
      reason:  `Insufficient spend limit. ` +
               `Required: ${amountUsdc} USDC. ` +
               `Approved: ${formatUnits(allowance, 6)} USDC. ` +
               `Update your limit at usemilkyway.com/settings/spend-limits`
    };
  }

  return { allowed: true };
}

// In executeFlow — add this check before calling agents
// with EXECUTE_TRANSACTIONS permission:

for (const flowAgent of flow.agents) {
  const about = getCachedAbout(flowAgent.agentId);
  const cap   = about?.capabilities?.[flowAgent.capability];
  const hasExecute = cap?.permissions?.some(
    (p: any) => p.type === "EXECUTE_TRANSACTIONS"
  );

  if (hasExecute) {
    const execPerm = cap.permissions.find(
      (p: any) => p.type === "EXECUTE_TRANSACTIONS"
    );
    const check = await checkSpendPermission(
      flow.callerAddress,
      flowAgent.agentAddress,
      execPerm?.max_per_transaction || "500",
      network
    );

    if (!check.allowed) {
      // Fail the flow before spending any USDC on job execution
      await prisma.flow.update({
        where: { id: flow.id },
        data:  { status: "FAILED" }
      });
      throw new Error(check.reason);
    }
  }
}
```

---

## Prisma Migration

```bash
npx prisma migrate dev --name add_permissions
```

---

## Build Order for Claude Code

```
PHASE A — BACKEND
  1.  Add SpendLimit model to schema.prisma
  2.  npx prisma migrate dev --name add_permissions
  3.  Write GET  /api/permissions/:agentId
  4.  Write POST /api/permissions/grant
  5.  Write GET  /api/permissions/my
  6.  Write POST /api/permissions/revoke
  7.  Write GET  /api/permissions/check

PHASE B — SDK
  8.  Update types.ts (add PermissionDeclaration, PermissionType)
  9.  Update validate.ts CLI (add permission validation)
  10. Update hello-agent agent.json (add permissions example)

PHASE C — FRONTEND COMPONENTS
  11. Write frontend/components/PermissionsList.tsx
  12. Write frontend/components/SpendLimitInput.tsx
  13. Write frontend/components/ActivationModal.tsx

PHASE D — FRONTEND PAGES
  14. Update app/agents/[agentId]/page.tsx
      (add permissions section between description and pricing)
  15. Update components/AgentCard.tsx
      (add ⚡ execute badge)
  16. Update app/builder/page.tsx
      (add execute warning in right panel agent detail)
  17. Write app/settings/spend-limits/page.tsx
  18. Add "Spend Limits" to SettingsSidebar

PHASE E — EXECUTION ENGINE
  19. Add checkSpendPermission() to engine.ts
  20. Add permission check before EXECUTE_TRANSACTIONS agents run
  21. End-to-end test:
      → activate agent with READ_WALLET_BALANCE only → no spend limit prompt
      → activate agent with EXECUTE_TRANSACTIONS → spend limit prompt appears
      → approve in MetaMask → agent activates
      → revoke from settings → agent cannot execute
```

---

## Common Mistakes — Never Make These

- **Never skip the spend limit check in the engine.**
  Even if the user granted permission days ago — always check
  the live on-chain allowance before executing.
  The user may have revoked since then.
- **USDC has 6 decimals. 500 USDC = 500_000_000 raw units.**
  Use parseUnits(amount, 6) always. Never hardcode raw values.
- **The activation modal has no X close button during approving/activating.**
  User must wait or the browser navigates away.
  Prevent accidental dismissal mid-transaction.
- **Spend limits are per agent-wallet, not per agent-id.**
  The ERC-20 allowance is between user-address and agent-wallet.
  Multiple agents using the same wallet share an allowance.
  In practice each agent should have its own wallet.
- **Permission declarations in agent.json are advisory.**
  They tell MilkyWay what the agent needs.
  The blockchain allowance is what actually enforces it.
  Never rely solely on the declaration.
- **EXECUTE_TRANSACTIONS only supports USDC in Phase 2.**
  Reject any other token in validation and in the UI.

---

## What This Achieves

```
User activates a READ_WALLET_BALANCE agent:
  Sees what it will access
  One click to activate
  No friction — it's safe

User activates an EXECUTE_TRANSACTIONS agent:
  Sees exactly what it can do
  Sets their own spend limit
  Approves once in MetaMask
  Agent earns, user is protected
  Can revoke at any time from Settings

The blockchain enforces everything.
MilkyWay cannot override or bypass a revoked allowance.
Users are always in control.
```

---

*MilkyWay Permissions System*
*Declare what you need. Enforce what matters.*
