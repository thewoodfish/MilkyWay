import { prisma } from "../lib/db";

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
      const paymentHeader = getPaymentHeader(
        flow.paymentTxHash,
        flowAgent.agentAddress,
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

// Build x402 payment header from the user-signed EIP-3009 authorization stored at flow creation
function getPaymentHeader(
  storedPaymentData: string | null,
  agentAddress: string,
  resource: string
): string {
  if (!storedPaymentData) throw new Error("No payment authorization stored for this flow");

  const { authorizations } = JSON.parse(storedPaymentData) as {
    authorizations: Array<{
      from: string; to: string; value: string;
      validAfter: string; validBefore: string; nonce: string; signature: string;
    }>;
  };

  const auth = authorizations.find(
    (a) => a.to.toLowerCase() === agentAddress.toLowerCase()
  );
  if (!auth) throw new Error(`No authorization found for agent address ${agentAddress}`);

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
