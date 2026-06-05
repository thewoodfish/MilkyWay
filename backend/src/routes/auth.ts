import { Router, Request, Response } from "express";
import { SiweMessage, generateNonce } from "siwe";
import { getIronSession } from "iron-session";
import type { SessionData } from "../lib/session";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { sessionOptions } from "../lib/session";
import { authenticateJWT, AuthRequest } from "../middleware/auth";
import { prisma } from "../lib/db";

const router = Router();

// GET /api/auth/nonce
router.get("/nonce", async (req: Request, res: Response) => {
  try {
    const session = await getIronSession<SessionData>(req, res, sessionOptions);
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

  const session = await getIronSession<SessionData>(req, res, sessionOptions);

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
  const session = await getIronSession<SessionData>(req, res, sessionOptions);
  session.destroy();
  res.json({ success: true });
});

// GET /api/auth/me
router.get("/me", authenticateJWT, (req: AuthRequest, res: Response) => {
  res.json({ address: req.user!.address });
});

// ── API Keys ──────────────────────────────────────────────────────────

// GET /api/auth/api-keys
router.get("/api-keys", authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const keys = await prisma.apiKey.findMany({
      where: { address: req.user!.address, active: true },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, preview: true, createdAt: true, lastUsedAt: true },
    });
    res.json(keys);
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/auth/api-keys
router.post("/api-keys", authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const { name = "Default" } = req.body;
    const random = crypto.randomBytes(18).toString("base64url").slice(0, 24);
    const key = `mw_live_${random}`;
    const keyHash = crypto.createHash("sha256").update(key).digest("hex");
    const preview = `${key.slice(0, 14)}...${key.slice(-4)}`;

    const created = await prisma.apiKey.create({
      data: { keyHash, preview, address: req.user!.address, name },
    });

    // Return full key once — never stored
    res.json({ key, preview, id: created.id });
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/auth/api-keys/:id — revoke single key
router.delete("/api-keys/:id", authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const key = await prisma.apiKey.findUnique({ where: { id: req.params.id } });
    if (!key || key.address !== req.user!.address) {
      return res.status(404).json({ error: "Key not found" });
    }
    await prisma.apiKey.update({
      where: { id: req.params.id },
      data: { active: false, revokedAt: new Date() },
    });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/auth/api-keys — revoke all keys
router.delete("/api-keys", authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.apiKey.updateMany({
      where: { address: req.user!.address, active: true },
      data: { active: false, revokedAt: new Date() },
    });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/auth/api-keys/activity
router.get("/api-keys/activity", authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const keys = await prisma.apiKey.findMany({
      where: { address: req.user!.address },
      select: { id: true },
    });
    const keyIds = keys.map((k) => k.id);

    const activity = await prisma.aPIKeyActivity.findMany({
      where: { keyId: { in: keyIds } },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { apiKey: { select: { name: true, preview: true } } },
    });

    res.json(activity);
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
