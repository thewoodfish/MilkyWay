import { ethers } from "ethers";
import { FlowOptions, FlowResult, FlowAgentResult } from "./types";

const MILKYWAY_API = process.env.MILKYWAY_API_URL ?? "https://api.usemilkyway.com";

const USDC_ADDRESSES: Record<string, string> = {
  "eip155:42161":  "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
  "eip155:421614": "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
};

const TRANSFER_TYPES = {
  TransferWithAuthorization: [
    { name: "from",        type: "address" },
    { name: "to",          type: "address" },
    { name: "value",       type: "uint256" },
    { name: "validAfter",  type: "uint256" },
    { name: "validBefore", type: "uint256" },
    { name: "nonce",       type: "bytes32" },
  ],
};

interface Eip3009Param {
  from:            string;
  to:              string;
  value:           string;
  validAfter:      string;
  validBefore:     string;
  nonce:           string;
  agentOrderIndex: number;
}

async function signAuth(
  signer:  ethers.Wallet,
  param:   Eip3009Param,
  network: string
): Promise<string> {
  const chainId     = Number(network.split(":")[1]);
  const usdcAddress = USDC_ADDRESSES[network];
  if (!usdcAddress) throw new Error(`Unsupported network: ${network}`);

  const domain = {
    name:              "USD Coin",
    version:           "2",
    chainId,
    verifyingContract: usdcAddress,
  };

  const message = {
    from:        param.from,
    to:          param.to,
    value:       BigInt(param.value),
    validAfter:  BigInt(param.validAfter),
    validBefore: BigInt(param.validBefore),
    nonce:       param.nonce,
  };

  return signer.signTypedData(domain, TRANSFER_TYPES, message);
}

const POLL_INTERVAL_MS = 2_000;
const POLL_TIMEOUT_MS  = 5 * 60 * 1_000;

export async function createFlow(
  signer:  ethers.Wallet,
  apiKey:  string,
  options: FlowOptions
): Promise<FlowResult> {
  const base    = process.env.MILKYWAY_API_URL || MILKYWAY_API;
  const network = process.env.X402_NETWORK ?? "eip155:42161";
  const start   = Date.now();
  const headers = {
    "Content-Type":  "application/json",
    "Authorization": `Bearer ${apiKey}`,
  };

  // 1. Create flow — backend returns EIP-3009 params to sign
  const createRes = await fetch(`${base}/api/flows/create`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      agents:          options.agents,
      deadlineSeconds: options.deadlineSeconds ?? 300,
    }),
  });
  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error ?? `Flow create failed: HTTP ${createRes.status}`);
  }

  const { jobId, internalId, eip3009Params } = await createRes.json() as {
    jobId:         string;
    internalId:    string;
    eip3009Params: Eip3009Param[];
  };

  // 2. Sign every authorization (one per agent + one treasury fee)
  const signatures = await Promise.all(
    eip3009Params.map((p) => signAuth(signer, p, network))
  );

  // 3. Confirm — submits signatures and starts execution
  const confirmRes = await fetch(`${base}/api/flows/confirm`, {
    method: "POST",
    headers,
    body: JSON.stringify({ internalId, signatures, eip3009Params }),
  });
  if (!confirmRes.ok) {
    const err = await confirmRes.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error ?? `Flow confirm failed: HTTP ${confirmRes.status}`);
  }

  // 4. Poll until COMPLETED or FAILED
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

    const statusRes = await fetch(`${base}/api/flows/${jobId}`);
    if (!statusRes.ok) continue;

    const flow = await statusRes.json() as {
      status:          string;
      totalAmountUsdc: string;
      agents: Array<{
        agentId:    number;
        agentName:  string;
        status:     string;
        output:     Record<string, unknown> | null;
        amountUsdc: string;
        executedAt: string | null;
      }>;
    };

    if (flow.status === "COMPLETED" || flow.status === "FAILED") {
      return {
        jobId,
        status:     flow.status as FlowResult["status"],
        agents:     flow.agents.map((a) => ({
          agentId:    a.agentId,
          agentName:  a.agentName,
          status:     a.status as FlowAgentResult["status"],
          output:     a.output,
          amountUsdc: a.amountUsdc,
          executedAt: a.executedAt,
        })),
        totalUsdc:  flow.totalAmountUsdc,
        durationMs: Date.now() - start,
      };
    }
  }

  throw new Error(`Flow ${jobId} timed out after ${POLL_TIMEOUT_MS / 1000}s`);
}
