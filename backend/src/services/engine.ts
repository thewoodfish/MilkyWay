import { ethers } from "ethers";
import { prisma } from "../lib/db";

const provider = new ethers.JsonRpcProvider(process.env.ARBITRUM_SEPOLIA_RPC ?? process.env.ARBITRUM_RPC);
const signer = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY!, provider);

const ESCROW_ABI = [
  "function markRunning(bytes32 jobId) external",
  "function releasePayment(bytes32 jobId) external",
];

const escrow = new ethers.Contract(process.env.JOB_ESCROW_ADDRESS!, ESCROW_ABI, signer);

export async function executeFlow(flow: {
  id: string;
  jobId: string;
  escrowTxHash: string | null;
  deadline: Date;
  callerAddress: string;
  agents: {
    id: string;
    agentId: number;
    orderIndex: number;
    staticInputs: unknown;
    inputMapping: unknown;
  }[];
}) {
  console.log(`[engine] Starting flow ${flow.jobId}`);

  try {
    const markTx = await escrow.markRunning(flow.jobId);
    await markTx.wait();

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

      const result = await callAgent(
        agent.endpoint,
        flow.jobId,
        flow.callerAddress,
        flow.escrowTxHash ?? "",
        taskInput,
        flow.deadline
      );

      if (!result.success) throw new Error(`Agent ${agent.name} failed: ${result.error}`);

      await prisma.flowAgent.update({
        where: { id: flowAgent.id },
        data: { status: "COMPLETED", output: result.output as object, executedAt: new Date() },
      });

      previousOutput = result.output ?? null;
      console.log(`[engine] Agent ${agent.name} completed`);
    }

    const releaseTx = await escrow.releasePayment(flow.jobId);
    await releaseTx.wait();

    await prisma.flow.update({
      where: { id: flow.id },
      data: { status: "COMPLETED", completedAt: new Date() },
    });

    console.log(`[engine] Flow ${flow.jobId} completed — payment released`);
  } catch (err) {
    console.error(`[engine] Flow ${flow.jobId} failed:`, (err as Error).message);
    await prisma.flow.update({ where: { id: flow.id }, data: { status: "FAILED" } });
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
  endpoint: string,
  jobId: string,
  caller: string,
  escrowTx: string,
  taskInput: Record<string, unknown>,
  deadline: Date
): Promise<{ success: boolean; output?: Record<string, unknown>; error?: string }> {
  try {
    const timeoutMs = Math.max(0, deadline.getTime() - Date.now() - 2000);
    const controller = new AbortController();
    setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(`${endpoint.replace(/\/$/, "")}/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": "MilkyWay-Engine/1.0" },
      signal: controller.signal,
      body: JSON.stringify({
        milkyway_version: "1.0",
        job_id: jobId,
        caller,
        escrow_tx: escrowTx,
        task: { input: taskInput },
        deadline: Math.floor(deadline.getTime() / 1000),
      }),
    });

    if (res.status === 200) {
      const data = await res.json();
      return { success: true, output: data.output };
    }

    const err = await res.json().catch(() => ({}));
    return { success: false, error: (err as { error?: string }).error ?? `HTTP ${res.status}` };
  } catch (err: unknown) {
    const e = err as { name?: string; message?: string };
    return { success: false, error: e.name === "AbortError" ? "Agent timed out" : e.message };
  }
}
