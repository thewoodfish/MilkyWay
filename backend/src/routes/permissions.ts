import { Router, Response } from "express";
import { prisma } from "../lib/db";
import { authenticateJWT, AuthRequest } from "../middleware/auth";

const router = Router();

// GET /api/permissions/my — caller's active spend limits (must be before /:agentId)
router.get("/my", authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const limits = await prisma.spendLimit.findMany({
      where: { userAddress: req.user!.address, active: true },
      orderBy: { createdAt: "desc" },
    });

    const agentIds = limits.map((l) => l.agentId);
    const agents =
      agentIds.length > 0
        ? await prisma.agent.findMany({
            where: { agentId: { in: agentIds } },
            select: { agentId: true, name: true, logoUrl: true, slug: true },
          })
        : [];
    const agentMap = Object.fromEntries(agents.map((a) => [a.agentId!, a]));

    res.json(
      limits.map((l) => ({
        ...l,
        agentName: agentMap[l.agentId]?.name ?? `Agent #${l.agentId}`,
        agentLogoUrl: agentMap[l.agentId]?.logoUrl ?? null,
        agentSlug: agentMap[l.agentId]?.slug ?? null,
      }))
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/permissions/check?agentId=X&userAddress=Y
router.get("/check", async (req: AuthRequest, res: Response) => {
  try {
    const { agentId, userAddress } = req.query as { agentId?: string; userAddress?: string };
    if (!agentId || !userAddress) {
      return res.status(400).json({ error: "agentId and userAddress required" });
    }

    const limit = await prisma.spendLimit.findUnique({
      where: { userAddress_agentId: { userAddress, agentId: Number(agentId) } },
    });

    res.json({ granted: limit?.active ?? false, limit: limit ?? null });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/permissions/grant
router.post("/grant", authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const { agentId, maxPerTx, maxLifetime, txHash } = req.body;
    if (!agentId || !maxPerTx || !maxLifetime) {
      return res.status(400).json({ error: "agentId, maxPerTx, maxLifetime required" });
    }

    const agent = await prisma.agent.findUnique({ where: { agentId: Number(agentId) } });
    if (!agent) return res.status(404).json({ error: "Agent not found" });

    const limit = await prisma.spendLimit.upsert({
      where: { userAddress_agentId: { userAddress: req.user!.address, agentId: Number(agentId) } },
      create: {
        userAddress: req.user!.address,
        agentId: Number(agentId),
        agentAddress: agent.ownerAddress,
        maxPerTx,
        maxLifetime,
        grantTxHash: txHash ?? null,
        active: true,
        spentToDate: "0",
      },
      update: {
        maxPerTx,
        maxLifetime,
        grantTxHash: txHash ?? null,
        active: true,
        revokedAt: null,
      },
    });

    res.json({ success: true, limit });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/permissions/revoke
router.post("/revoke", authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const { agentId } = req.body;
    if (!agentId) return res.status(400).json({ error: "agentId required" });

    await prisma.spendLimit.updateMany({
      where: { userAddress: req.user!.address, agentId: Number(agentId) },
      data: { active: false, revokedAt: new Date() },
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/permissions/:agentId — declared permissions from cached /about
router.get("/:agentId", async (req: AuthRequest, res: Response) => {
  try {
    const agentId = parseInt(req.params.agentId);
    if (isNaN(agentId)) return res.status(400).json({ error: "Invalid agentId" });

    const agent = await prisma.agent.findUnique({ where: { agentId } });
    if (!agent) return res.status(404).json({ error: "Agent not found" });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const about = agent.aboutSchema as Record<string, any> | null;
    const seen = new Set<string>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const permissions: any[] = [];

    if (about?.capabilities && typeof about.capabilities === "object" && !Array.isArray(about.capabilities)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const cap of Object.values(about.capabilities as Record<string, any>)) {
        for (const perm of cap?.permissions ?? []) {
          if (!seen.has(perm.type)) {
            seen.add(perm.type);
            permissions.push(perm);
          }
        }
      }
    }

    res.json({ agentId, agentAddress: agent.ownerAddress, permissions });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
