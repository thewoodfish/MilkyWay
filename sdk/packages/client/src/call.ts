import { ethers }             from "ethers";
import { buildPaymentHeader }  from "./payment";
import { _lookupEndpoint }     from "./discover";
import { DiscoveredAgent, CallOptions, CallResult } from "./types";

const MILKYWAY_API = process.env.MILKYWAY_API_URL ?? "https://api.usemilkyway.com";

function uuidv4(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function reportJob(
  agent:         DiscoveredAgent,
  callerAddress: string,
  jobId:         string,
  result:        CallResult
): void {
  const base = process.env.MILKYWAY_API_URL || MILKYWAY_API;
  fetch(`${base}/api/flows/report`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jobId,
      agentId:       agent.agentId,
      callerAddress,
      amountUsdc:    agent.priceUsdc,
      output:        result.output ?? null,
      success:       result.success,
    }),
  }).catch(() => { /* fire-and-forget: never block the caller */ });
}

export async function callAgent(
  agent:   DiscoveredAgent,
  signer:  ethers.Wallet,
  options: CallOptions
): Promise<CallResult> {
  const start    = Date.now();
  const jobId    = options.jobId ?? uuidv4();
  const deadline = Math.floor(Date.now() / 1000) + (options.deadline ?? 30);
  const network  = process.env.X402_NETWORK ?? "eip155:42161";
  const cached   = _lookupEndpoint(agent.agentId);
  if (!cached) {
    return { success: false, error: "Agent endpoint unknown — call discoverAgents() or getAgent() first", jobId, durationMs: 0 };
  }
  const url = `${cached.replace(/\/$/, "")}/execute`;

  const body = JSON.stringify({
    milkyway_version: "1.0",
    job_id:   jobId,
    task: {
      capability: options.capability ?? agent.capability ?? undefined,
      input:      options.input,
    },
    deadline,
  });

  try {
    // First call — no payment header
    const r1 = await fetch(url, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });

    // Free agent
    if (r1.status === 200) {
      const data   = await r1.json() as { output?: Record<string, unknown> };
      const result = { success: true, output: data.output, jobId, durationMs: Date.now() - start };
      reportJob(agent, signer.address, jobId, result);
      return result;
    }

    if (r1.status !== 402) {
      const err    = await r1.json().catch(() => ({})) as { error?: string };
      const result = { success: false, error: err.error ?? `HTTP ${r1.status}`, jobId, durationMs: Date.now() - start };
      reportJob(agent, signer.address, jobId, result);
      return result;
    }

    // Build payment and retry
    const paymentHeader = await buildPaymentHeader(signer, agent.agentWallet, agent.priceUsdc, network);

    const r2 = await fetch(url, {
      method:  "POST",
      headers: {
        "Content-Type":      "application/json",
        "payment-signature": paymentHeader,
      },
      body,
    });

    if (r2.status === 200) {
      const data   = await r2.json() as { output?: Record<string, unknown> };
      const result = { success: true, output: data.output, jobId, durationMs: Date.now() - start };
      reportJob(agent, signer.address, jobId, result);
      return result;
    }

    const err    = await r2.json().catch(() => ({})) as { error?: string };
    const result = { success: false, error: err.error ?? `HTTP ${r2.status}`, jobId, durationMs: Date.now() - start };
    reportJob(agent, signer.address, jobId, result);
    return result;

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const result  = { success: false, error: message, jobId, durationMs: Date.now() - start };
    reportJob(agent, signer.address, jobId, result);
    return result;
  }
}
