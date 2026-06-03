import { ethers } from "ethers";
import { prisma } from "../lib/db";

const USDC_ADDRESS = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831"; // Arbitrum One

// EIP-3009 TransferWithAuthorization typed data
const USDC_DOMAIN = {
  name: "USD Coin",
  version: "2",
  chainId: 42161,
  verifyingContract: USDC_ADDRESS,
};
const TRANSFER_WITH_AUTHORIZATION_TYPES = {
  TransferWithAuthorization: [
    { name: "from", type: "address" },
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "validAfter", type: "uint256" },
    { name: "validBefore", type: "uint256" },
    { name: "nonce", type: "bytes32" },
  ],
};

// Orchestrator key — signs x402 payment authorizations sent to agents (lazy init)
let _orchestrator: ethers.Wallet | null = null;
function getOrchestrator(): ethers.Wallet {
  if (!_orchestrator) {
    _orchestrator = new ethers.Wallet(process.env.ORCHESTRATOR_PRIVATE_KEY!);
  }
  return _orchestrator;
}

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

      await prisma.flowAgent.update({ where: { id: flowAgent.id }, data: { status: "RUNNING" } });

      const resource = `${agent.endpoint.replace(/\/$/, "")}/execute`;
      const paymentHeader = await buildPaymentHeader(
        flowAgent.agentAddress,
        flowAgent.amountUsdc,
        flow.deadline,
        resource
      );

      const result = await callAgent(
        resource,
        flow.jobId,
        flow.callerAddress,
        taskInput,
        flow.deadline,
        paymentHeader
      );

      if (!result.success) throw new Error(`Agent ${agent.name} failed: ${result.error}`);

      // Settle payment async — fire and forget, never await
      const facilitatorUrl = process.env.X402_FACILITATOR_URL || "https://facilitator.usemilkyway.com";
      fetch(`${facilitatorUrl}/settle`, {
        method: "POST",
        headers: {
          "Content-Type":         "application/json",
          "X-Facilitator-Secret": process.env.FACILITATOR_SECRET!,
        },
        body: JSON.stringify({
          payment: paymentHeader,
          network: process.env.X402_NETWORK || "eip155:421614",
        }),
      }).catch((err: Error) => console.error(`[engine] Settle failed for ${agent.name}:`, err.message));

      await prisma.flowAgent.update({
        where: { id: flowAgent.id },
        data: { status: "COMPLETED", output: result.output as object, executedAt: new Date() },
      });

      previousOutput = result.output ?? null;
      console.log(`[engine] Agent ${agent.name} completed`);
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

// Sign an EIP-3009 transferWithAuthorization to pay an agent via x402
async function buildPaymentHeader(
  toAddress: string,
  amountUsdc: string,
  deadline: Date,
  resource: string
): Promise<string> {
  const rawAmount = BigInt(Math.round(parseFloat(amountUsdc) * 1_000_000));
  const validBefore = Math.floor(deadline.getTime() / 1000);
  const nonce = ethers.hexlify(ethers.randomBytes(32));

  const orch = getOrchestrator();
  const signature = await orch.signTypedData(
    USDC_DOMAIN,
    TRANSFER_WITH_AUTHORIZATION_TYPES,
    {
      from: orch.address,
      to: toAddress,
      value: rawAmount,
      validAfter: 0n,
      validBefore: BigInt(validBefore),
      nonce,
    }
  );

  const payment = {
    x402Version: 1,
    scheme: "exact",
    network: "eip155:42161",
    payload: {
      authorization: {
        from: orch.address,
        to: toAddress,
        value: rawAmount.toString(),
        validAfter: "0",
        validBefore: validBefore.toString(),
        nonce,
      },
      signature,
      resource,
    },
  };

  return Buffer.from(JSON.stringify(payment)).toString("base64");
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
        "Content-Type": "application/json",
        "User-Agent": "MilkyWay-Engine/1.0",
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
