import { prisma } from "../lib/db";
import { ethers } from "ethers";

type StoredAuth = {
  agentOrderIndex: number; // -1 = treasury fee auth
  from: string; to: string; value: string;
  validAfter: string; validBefore: string; nonce: string; signature: string;
};

export async function executeFlow(flow: {
  id: string;
  jobId: string;
  paymentTxHash: string | null;
  deadline: Date;
  callerAddress: string;
  agents: {
    id: string;
    agentId: number;
    orderIndex: number;
    agentAddress: string;
    amountUsdc: string;
    staticInputs: unknown;
    inputMapping: unknown;
  }[];
}) {
  console.log(`[engine] Starting flow ${flow.jobId}`);

  try {
    await prisma.flow.update({ where: { id: flow.id }, data: { status: "RUNNING" } });

    let previousOutput: Record<string, unknown> | null = null;

    for (const flowAgent of flow.agents) {
      const agent = await prisma.agent.findUnique({ where: { agentId: flowAgent.agentId } });
      if (!agent) throw new Error(`Agent ${flowAgent.agentId} not found`);

      const taskInput = buildInput(
        flowAgent.staticInputs as Record<string, unknown>,
        flowAgent.inputMapping as Record<string, string>,
        previousOutput
      );

      // Check on-chain spend allowance for EXECUTE_TRANSACTIONS agents
      const about = agent.aboutSchema as { capabilities?: Record<string, { permissions?: { type: string; token?: string }[] }> } | null;
      const allCaps = about?.capabilities ? Object.values(about.capabilities) : [];
      const execPerm = allCaps.flatMap((c) => c?.permissions ?? []).find((p) => p.type === "EXECUTE_TRANSACTIONS");
      if (execPerm) {
        const network = process.env.X402_NETWORK || "eip155:42161";
        const amountRaw = String(Math.round(parseFloat(flowAgent.amountUsdc) * 1_000_000));
        const check = await checkSpendPermission(flow.callerAddress, flowAgent.agentAddress, amountRaw, network);
        if (!check.allowed) throw new Error(`Agent ${agent.name}: ${check.reason}`);
      }

      await prisma.flowAgent.update({ where: { id: flowAgent.id }, data: { status: "RUNNING" } });

      const resource = `${agent.endpoint.replace(/\/$/, "")}/execute`;

      // Agent payment header (99% slice going to agent wallet)
      const agentPaymentHeader = getPaymentHeader(
        flow.paymentTxHash,
        flowAgent.orderIndex,
        flowAgent.agentAddress,
        resource
      );

      const result = await callAgent(
        resource,
        flow.jobId,
        flow.callerAddress,
        taskInput,
        flow.deadline,
        agentPaymentHeader
      );

      if (!result.success) throw new Error(`Agent ${agent.name} failed: ${result.error}`);

      // Settle all authorizations for this agent (agent 99% + protocol fee 1%)
      const allHeaders = getAllPaymentHeaders(flow.paymentTxHash, flowAgent.orderIndex, resource);
      const facilitatorUrl = process.env.X402_FACILITATOR_URL || "https://facilitator.usemilkyway.com";
      for (const header of allHeaders) {
        fetch(`${facilitatorUrl}/settle`, {
          method: "POST",
          headers: {
            "Content-Type":         "application/json",
            "X-Facilitator-Secret": process.env.FACILITATOR_SECRET!,
          },
          body: JSON.stringify({
            payment: header,
            network: process.env.X402_NETWORK || "eip155:42161",
          }),
        }).catch((err: Error) => console.error(`[engine] Settle failed for ${agent.name}:`, err.message));
      }

      await prisma.flowAgent.update({
        where: { id: flowAgent.id },
        data: { status: "COMPLETED", output: result.output as object, executedAt: new Date() },
      });

      previousOutput = result.output ?? null;
      console.log(`[engine] Agent ${agent.name} completed`);
    }

    // Settle treasury protocol fee (agentOrderIndex === -1)
    const facilitatorUrl = process.env.X402_FACILITATOR_URL || "https://facilitator.usemilkyway.com";
    const authorizations = parseAuthorizations(flow.paymentTxHash);
    const treasuryAuth = authorizations.find((a) => a.agentOrderIndex === -1);
    if (treasuryAuth) {
      const treasuryResource = `${facilitatorUrl}/treasury`;
      fetch(`${facilitatorUrl}/settle`, {
        method: "POST",
        headers: {
          "Content-Type":         "application/json",
          "X-Facilitator-Secret": process.env.FACILITATOR_SECRET!,
        },
        body: JSON.stringify({
          payment: buildPaymentHeader(treasuryAuth, treasuryResource),
          network: process.env.X402_NETWORK || "eip155:42161",
        }),
      }).catch((err: Error) => console.error("[engine] Treasury settle failed:", err.message));
    }

    await prisma.flow.update({
      where: { id: flow.id },
      data: { status: "COMPLETED", completedAt: new Date() },
    });

    console.log(`[engine] Flow ${flow.jobId} completed`);
  } catch (err) {
    console.error(`[engine] Flow ${flow.jobId} failed:`, (err as Error).message);
    await prisma.flow.update({ where: { id: flow.id }, data: { status: "FAILED" } });
  }
}

// Agent's payment header — finds the auth for this orderIndex going to agentAddress
function getPaymentHeader(
  storedPaymentData: string | null,
  agentOrderIndex: number,
  agentAddress: string,
  resource: string
): string {
  const authorizations = parseAuthorizations(storedPaymentData);
  const auth = authorizations.find(
    (a) => a.agentOrderIndex === agentOrderIndex && a.to.toLowerCase() === agentAddress.toLowerCase()
  );
  if (!auth) throw new Error(`No authorization found for agent ${agentAddress} at orderIndex ${agentOrderIndex}`);
  return buildPaymentHeader(auth, resource);
}

// All payment headers for an agent's orderIndex (agent slice + protocol fee slice)
function getAllPaymentHeaders(
  storedPaymentData: string | null,
  agentOrderIndex: number,
  resource: string
): string[] {
  const authorizations = parseAuthorizations(storedPaymentData);
  return authorizations
    .filter((a) => a.agentOrderIndex === agentOrderIndex)
    .map((auth) => buildPaymentHeader(auth, resource));
}

function parseAuthorizations(storedPaymentData: string | null): StoredAuth[] {
  if (!storedPaymentData) throw new Error("No payment authorization stored for this flow");
  const { authorizations } = JSON.parse(storedPaymentData) as { authorizations: StoredAuth[] };
  return authorizations;
}

function buildPaymentHeader(auth: StoredAuth, resource: string): string {
  const payment = {
    x402Version: 1,
    scheme: "exact",
    network: process.env.X402_NETWORK || "eip155:42161",
    payload: {
      authorization: {
        from: auth.from,
        to: auth.to,
        value: auth.value,
        validAfter: auth.validAfter,
        validBefore: auth.validBefore,
        nonce: auth.nonce,
      },
      signature: auth.signature,
      resource,
    },
  };
  return Buffer.from(JSON.stringify(payment)).toString("base64");
}

const USDC_ABI = ["function allowance(address owner, address spender) view returns (uint256)"];
const USDC_ADDRESS: Record<string, string> = {
  "eip155:42161":  "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
  "eip155:42161": "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
};

async function checkSpendPermission(
  userAddress: string,
  agentWallet: string,
  amountRaw: string,
  network: string
): Promise<{ allowed: boolean; reason?: string }> {
  try {
    const rpc = network === "eip155:42161"
      ? process.env.ARBITRUM_RPC
      : process.env.ARBITRUM_SEPOLIA_RPC;
    if (!rpc) return { allowed: true }; // skip if no RPC configured

    const usdcAddr = USDC_ADDRESS[network];
    if (!usdcAddr) return { allowed: true };

    const provider = new ethers.JsonRpcProvider(rpc);
    const usdc = new ethers.Contract(usdcAddr, USDC_ABI, provider);
    const allowance: bigint = await usdc.allowance(userAddress, agentWallet);

    if (allowance < BigInt(amountRaw)) {
      const have = (Number(allowance) / 1_000_000).toFixed(2);
      const need = (Number(amountRaw) / 1_000_000).toFixed(2);
      return {
        allowed: false,
        reason: `Insufficient spend limit — need ${need} USDC, approved ${have} USDC. Update at usemilkyway.com/settings/spend-limits`,
      };
    }
    return { allowed: true };
  } catch {
    return { allowed: true }; // don't block on RPC errors
  }
}

function buildInput(
  staticInputs: Record<string, unknown>,
  inputMapping: Record<string, string>,
  previousOutput: Record<string, unknown> | null
): Record<string, unknown> {
  const input = { ...staticInputs };
  if (inputMapping && previousOutput) {
    for (const [targetField, sourceField] of Object.entries(inputMapping)) {
      if (previousOutput[sourceField] !== undefined) {
        input[targetField] = previousOutput[sourceField];
      }
    }
  }
  return input;
}

async function callAgent(
  resource: string,
  jobId: string,
  caller: string,
  taskInput: Record<string, unknown>,
  deadline: Date,
  paymentHeader: string
): Promise<{ success: boolean; output?: Record<string, unknown>; error?: string }> {
  try {
    const timeoutMs = Math.max(0, deadline.getTime() - Date.now() - 2000);
    const controller = new AbortController();
    setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(resource, {
      method: "POST",
      headers: {
        "Content-Type":     "application/json",
        "User-Agent":       "MilkyWay-Engine/1.0",
        "payment-signature": paymentHeader,
      },
      signal: controller.signal,
      body: JSON.stringify({
        milkyway_version: "1.0",
        job_id: jobId,
        caller,
        task: { input: taskInput },
        deadline: Math.floor(deadline.getTime() / 1000),
      }),
    });

    if (res.status === 200) {
      const data = (await res.json()) as { output?: Record<string, unknown> };
      return { success: true, output: data.output };
    }

    const err = await res.json().catch(() => ({}));
    return { success: false, error: (err as { error?: string }).error ?? `HTTP ${res.status}` };
  } catch (err: unknown) {
    const e = err as { name?: string; message?: string };
    return { success: false, error: e.name === "AbortError" ? "Agent timed out" : e.message };
  }
}
