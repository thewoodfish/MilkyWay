import { Router, Request, Response } from "express";
import { ethers } from "ethers";
import { prisma } from "../lib/db";
import { verifyEndpoint } from "../services/verification";
import { authenticateJWT, AuthRequest } from "../middleware/auth";

const router = Router();

// GET /api/agents
router.get("/", async (req: Request, res: Response) => {
  try {
    const { category, badge, search, page = "1", limit = "20" } = req.query;

    const where: Record<string, unknown> = { active: true };
    if (category) where.category = category;
    if (badge) where.badgeTier = badge;
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: "insensitive" } },
        { description: { contains: search as string, mode: "insensitive" } },
      ];
    }

    const [agents, total] = await Promise.all([
      prisma.agent.findMany({
        where,
        orderBy: { registeredAt: "desc" },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.agent.count({ where }),
    ]);

    res.json({ agents, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/agents/:agentId
router.get("/:agentId", async (req: Request, res: Response) => {
  try {
    const agent = await prisma.agent.findUnique({
      where: { agentId: Number(req.params.agentId) },
      include: { builder: true },
    });
    if (!agent) return res.status(404).json({ error: "Agent not found" });
    res.json(agent);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/agents/pre-verify — endpoint liveness check only
router.post("/pre-verify", async (req: Request, res: Response) => {
  const { endpoint } = req.body;
  if (!endpoint) return res.status(400).json({ error: "endpoint is required" });

  const result = await verifyEndpoint(endpoint);
  res.json(result);
});

// POST /api/agents/register — pre-chain: validate, hash, store pending
router.post("/register", async (req: Request, res: Response) => {
  try {
    const {
      name,
      description,
      category,
      subcategory,
      version,
      endpoint,
      pricingModel,
      priceEth,
      permissions,
      logoUrl,
      ownerAddress,
    } = req.body;

    if (!name || !description || !category || !endpoint || !ownerAddress) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const pingResult = await verifyEndpoint(endpoint);
    if (!pingResult.success) {
      return res.status(400).json({
        error: "Endpoint verification failed",
        detail: pingResult.error,
      });
    }

    const profile = {
      category,
      description,
      endpoint,
      logoUrl: logoUrl ?? null,
      name,
      ownerAddress,
      permissions: permissions ?? [],
      priceEth: priceEth ?? "0",
      pricingModel: pricingModel ?? "FREE",
      subcategory: subcategory ?? null,
      version: version ?? "1.0.0",
    };

    const profileJSON = JSON.stringify(profile, Object.keys(profile).sort());
    const metadataHash = ethers.keccak256(ethers.toUtf8Bytes(profileJSON));

    const agent = await prisma.agent.create({
      data: {
        agentId: -1,
        metadataHash,
        active: false,
        name: profile.name,
        description: profile.description,
        category: profile.category,
        subcategory: profile.subcategory ?? undefined,
        version: profile.version,
        endpoint: profile.endpoint,
        pricingModel: profile.pricingModel,
        priceEth: profile.priceEth,
        permissions: profile.permissions,
        logoUrl: profile.logoUrl ?? undefined,
        builder: {
          connectOrCreate: {
            where: { address: ownerAddress },
            create: { address: ownerAddress },
          },
        },
      },
    });

    res.json({ metadataHash, profileId: agent.id, pingResult });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/agents/confirm — post-chain: activate with real agentId (auth required)
router.post("/confirm", authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const { profileId, agentId, txHash } = req.body;
    if (!profileId || agentId === undefined || !txHash) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Verify the pending record belongs to the signed-in address
    const pending = await prisma.agent.findUnique({ where: { id: profileId } });
    if (!pending) return res.status(404).json({ error: "Profile not found" });
    if (pending.ownerAddress.toLowerCase() !== req.user!.address.toLowerCase()) {
      return res.status(403).json({ error: "Not your agent" });
    }

    const agent = await prisma.agent.update({
      where: { id: profileId },
      data: { agentId, txHash, active: true, badgeTier: "BRONZE" },
    });

    await prisma.builder.update({
      where: { address: agent.ownerAddress },
      data: { agentsCount: { increment: 1 } },
    });

    res.json({ success: true, agent });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/agents/:agentId — update mutable profile fields (auth required)
router.put("/:agentId", authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, pricingModel, priceEth, logoUrl } = req.body;

    const existing = await prisma.agent.findUnique({
      where: { agentId: Number(req.params.agentId) },
    });
    if (!existing) return res.status(404).json({ error: "Agent not found" });
    if (existing.ownerAddress.toLowerCase() !== req.user!.address.toLowerCase()) {
      return res.status(403).json({ error: "Not your agent" });
    }

    const updated = await prisma.agent.update({
      where: { agentId: Number(req.params.agentId) },
      data: {
        ...(name && { name }),
        ...(description && { description }),
        ...(pricingModel && { pricingModel }),
        ...(priceEth && { priceEth }),
        ...(logoUrl !== undefined && { logoUrl }),
      },
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/agents/:agentId — deactivate (auth required)
router.delete("/:agentId", authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.agent.findUnique({
      where: { agentId: Number(req.params.agentId) },
    });
    if (!existing) return res.status(404).json({ error: "Agent not found" });
    if (existing.ownerAddress.toLowerCase() !== req.user!.address.toLowerCase()) {
      return res.status(403).json({ error: "Not your agent" });
    }

    const agent = await prisma.agent.update({
      where: { agentId: Number(req.params.agentId) },
      data: { active: false },
    });
    res.json({ success: true, agent });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
