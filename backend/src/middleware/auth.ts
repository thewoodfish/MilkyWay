import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { prisma } from "../lib/db";

export interface AuthRequest extends Request {
  user?: { address: string; chainId: number };
}

export async function authenticateAPIKey(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const header = req.headers.authorization;
  const key = header?.startsWith("Bearer mw_live_")
    ? header.slice(7)
    : (req.headers["x-api-key"] as string | undefined);

  if (!key?.startsWith("mw_live_")) {
    return res.status(401).json({ error: "API key required" });
  }

  const keyHash = crypto.createHash("sha256").update(key).digest("hex");
  const apiKey = await prisma.apiKey.findUnique({ where: { keyHash } });

  if (!apiKey || !apiKey.active) {
    return res.status(401).json({ error: "Invalid or revoked API key" });
  }

  // Update lastUsedAt async — don't block the request
  prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  }).catch(() => {});

  req.user = { address: apiKey.address, chainId: 42161 };
  (req as AuthRequest & { apiKeyId: string }).apiKeyId = apiKey.id;
  next();
}

export function authenticateJWT(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      address: string;
      chainId: number;
    };
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
