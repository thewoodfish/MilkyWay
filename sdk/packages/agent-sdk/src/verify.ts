import { ethers } from "ethers";
import { PaymentError } from "./errors.js";

const USDC_ADDRESS  = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
const ARBITRUM_RPC  = process.env.ARBITRUM_RPC || "https://arb1.arbitrum.io/rpc";
const CHAIN_ID      = 42161;

const EIP_3009_TYPES = {
  TransferWithAuthorization: [
    { name: "from",        type: "address" },
    { name: "to",          type: "address" },
    { name: "value",       type: "uint256" },
    { name: "validAfter",  type: "uint256" },
    { name: "validBefore", type: "uint256" },
    { name: "nonce",       type: "bytes32" },
  ],
};

const DOMAIN = {
  name:              "USD Coin",
  version:           "2",
  chainId:           CHAIN_ID,
  verifyingContract: USDC_ADDRESS,
};

interface PaymentPayload {
  from:        string;
  to:          string;
  value:       string;
  validAfter:  string;
  validBefore: string;
  nonce:       string;
  signature:   string;
}

export async function verifyPayment(
  paymentHeader: string,
  _resource: string,
  amountUsdc: string
): Promise<void> {
  const rawAmount = BigInt(Math.round(parseFloat(amountUsdc) * 1_000_000));

  let payload: PaymentPayload;
  try {
    payload = JSON.parse(Buffer.from(paymentHeader, "base64").toString("utf8")) as PaymentPayload;
  } catch {
    throw new PaymentError("Invalid payment header format");
  }

  // Verify amount is sufficient
  if (BigInt(payload.value) < rawAmount) {
    throw new PaymentError(
      `Insufficient payment: got ${payload.value} raw units, need ${rawAmount}`
    );
  }

  // Verify deadline
  const now = Math.floor(Date.now() / 1000);
  if (now < Number(payload.validAfter)) {
    throw new PaymentError("Payment not yet valid");
  }
  if (now > Number(payload.validBefore)) {
    throw new PaymentError("Payment authorization expired");
  }

  // Recover signer from EIP-712 signature
  try {
    const recovered = ethers.verifyTypedData(
      DOMAIN,
      EIP_3009_TYPES,
      {
        from:        payload.from,
        to:          payload.to,
        value:       payload.value,
        validAfter:  payload.validAfter,
        validBefore: payload.validBefore,
        nonce:       payload.nonce,
      },
      payload.signature
    );

    if (recovered.toLowerCase() !== payload.from.toLowerCase()) {
      throw new PaymentError("Signature does not match payer address");
    }
  } catch (err: unknown) {
    if (err instanceof PaymentError) throw err;
    const message = err instanceof Error ? err.message : String(err);
    throw new PaymentError(`Signature verification failed: ${message}`);
  }

  // Optionally verify on-chain that the USDC balance exists
  if (process.env.VERIFY_ONCHAIN === "true") {
    try {
      const provider = new ethers.JsonRpcProvider(ARBITRUM_RPC);
      const usdc = new ethers.Contract(
        USDC_ADDRESS,
        ["function balanceOf(address) view returns (uint256)"],
        provider
      );
      const balance = await usdc.balanceOf(payload.from) as bigint;
      if (balance < rawAmount) {
        throw new PaymentError("Payer has insufficient USDC balance on-chain");
      }
    } catch (err: unknown) {
      if (err instanceof PaymentError) throw err;
      // RPC errors are non-fatal — trust the signature
    }
  }
}
