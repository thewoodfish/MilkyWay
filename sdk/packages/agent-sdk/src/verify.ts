import { PaymentError } from "./errors.js";

const MILKYWAY_FACILITATOR = "https://facilitator.usemilkyway.com";

export async function verifyPayment(
  paymentHeader: string,
  resource:      string,
  amountUsdc:    string,
  network?:      string
): Promise<void> {
  const facilitatorUrl = process.env.X402_FACILITATOR_URL || MILKYWAY_FACILITATOR;

  const secret = process.env.FACILITATOR_SECRET;
  if (!secret) {
    throw new PaymentError(
      "FACILITATOR_SECRET is not set. " +
      "Get it from usemilkyway.com/settings and add it to your .env"
    );
  }

  const resolvedNetwork = network
    || process.env.X402_NETWORK
    || "eip155:42161";

  const rawAmount = String(Math.round(parseFloat(amountUsdc) * 1_000_000));

  let res: Response;
  try {
    res = await fetch(`${facilitatorUrl}/verify`, {
      method:  "POST",
      headers: {
        "Content-Type":         "application/json",
        "X-Facilitator-Secret": secret,
      },
      body: JSON.stringify({
        payment:  paymentHeader,
        resource,
        amount:   rawAmount,
        network:  resolvedNetwork,
      }),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new PaymentError(`Facilitator unreachable at ${facilitatorUrl}: ${message}`);
  }

  if (res.status === 401) {
    throw new PaymentError("Facilitator rejected the request — check FACILITATOR_SECRET");
  }

  if (!res.ok) {
    throw new PaymentError(`Facilitator returned HTTP ${res.status}`);
  }

  const result = await res.json() as { isValid: boolean; invalidReason?: string };

  if (!result.isValid) {
    throw new PaymentError(result.invalidReason || "Payment invalid");
  }
}
