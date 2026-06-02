import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { prisma } from "../lib/db";

export interface ApiKeyRequest extends Request {
  builderAddress?: string;
}

async function validateKey(key: string): Promise<string | null> {
  const keyHash = crypto.createHash("sha256").update(key).digest("hex");
  const record = await prisma.apiKey.findUnique({ where: { keyHash } });
  if (!record) return null;

  await prisma.apiKey.update({
    where: { keyHash },
    data:  { lastUsedAt: new Date() }
  });

  return record.address;
}

export async function authenticateAPIKey(
  req: ApiKeyRequest,
  res: Response,
  next: NextFunction
) {
  const key = req.headers["x-api-key"] as string;
  if (!key) return res.status(401).json({ error: "API key required" });

  const address = await validateKey(key);
  if (!address) return res.status(401).json({ error: "Invalid API key" });

  req.builderAddress = address;
  next();
}
