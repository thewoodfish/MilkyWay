import { Router, Request, Response } from "express";
import { SiweMessage, generateNonce } from "siwe";
import { getIronSession } from "iron-session";
import jwt from "jsonwebtoken";
import { sessionOptions } from "../lib/session";
import { authenticateJWT, AuthRequest } from "../middleware/auth";

const router = Router();

// GET /api/auth/nonce
router.get("/nonce", async (req: Request, res: Response) => {
  try {
    const session = await getIronSession(req, res, sessionOptions);
    session.nonce = generateNonce();
    await session.save();
    res.json({ nonce: session.nonce });
  } catch (err) {
    res.status(500).json({ error: "Failed to generate nonce" });
  }
});

// POST /api/auth/verify
router.post("/verify", async (req: Request, res: Response) => {
  const { message, signature } = req.body;
  if (!message || !signature) {
    return res.status(400).json({ error: "Missing message or signature" });
  }

  const session = await getIronSession(req, res, sessionOptions);

  try {
    const siweMessage = new SiweMessage(message);
    const result = await siweMessage.verify({
      signature,
      nonce: session.nonce,
      // domain is part of the signed message content — no need to re-check against a hardcoded value
    });

    if (!result.success) {
      return res.status(401).json({ error: "Signature verification failed" });
    }

    const address = result.data.address;
    const chainId = result.data.chainId;

    // Nonce is single-use — clear immediately
    session.nonce = undefined;
    session.address = address;
    session.chainId = chainId;
    await session.save();

    const token = jwt.sign(
      { address, chainId },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" }
    );

    res.json({ success: true, address, token });
  } catch (err: unknown) {
    return res.status(401).json({ error: (err as Error).message });
  }
});

// POST /api/auth/logout
router.post("/logout", async (req: Request, res: Response) => {
  const session = await getIronSession(req, res, sessionOptions);
  session.destroy();
  res.json({ success: true });
});

// GET /api/auth/me
router.get("/me", authenticateJWT, (req: AuthRequest, res: Response) => {
  res.json({ address: req.user!.address });
});

export default router;
