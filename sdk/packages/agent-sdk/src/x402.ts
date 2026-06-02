import { Request, Response, NextFunction } from "express";
import { verifyPayment } from "./verify";
import { AgentPricing } from "./types";

const USDC_ADDRESS = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";

export function requirePayment(
  walletAddress: string,
  pricing: AgentPricing,
  devMode: boolean = false
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (pricing.model === "free" || pricing.amount === "0") {
      return next();
    }

    if (devMode) {
      console.log("[dev mode] payment verification bypassed");
      return next();
    }

    const paymentHeader =
      (req.headers["payment-signature"] as string) ||
      (req.headers["x-payment"] as string);

    if (!paymentHeader) {
      return res.status(402).json({
        x402Version: 1,
        accepts: [{
          scheme:            "exact",
          network:           "eip155:42161",
          maxAmountRequired: String(Math.round(parseFloat(pricing.amount) * 1_000_000)),
          payTo:             walletAddress,
          asset:             USDC_ADDRESS,
          description:       `${pricing.amount} ${pricing.currency} per job`,
          maxTimeoutSeconds: 60,
          extra: { name: "USD Coin", version: "2" }
        }]
      });
    }

    try {
      const resource = `${req.protocol}://${req.get("host")}${req.path}`;
      await verifyPayment(paymentHeader, resource, pricing.amount);
      next();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(402).json({
        x402Version: 1,
        error: message
      });
    }
  };
}
