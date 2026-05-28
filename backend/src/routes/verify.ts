import { Router, Request, Response } from "express";
import { prisma } from "../lib/db";
import { verifyEndpoint } from "../services/verification";

const router = Router();

// POST /api/verify/ping — manually trigger health check for a single agent
router.post("/ping", async (req: Request, res: Response) => {
  try {
    const { agentId } = req.body;
    if (agentId === undefined) return res.status(400).json({ error: "agentId is required" });

    const agent = await prisma.agent.findUnique({ where: { agentId: Number(agentId) } });
    if (!agent) return res.status(404).json({ error: "Agent not found" });

    const result = await verifyEndpoint(agent.endpoint);

    await prisma.verificationLog.create({
      data: {
        agentId: agent.agentId,
        endpoint: agent.endpoint,
        success: result.success,
        statusCode: result.statusCode ?? null,
        responseTimeMs: result.responseTimeMs ?? null,
      },
    });

    if (result.success) {
      await prisma.agent.update({
        where: { id: agent.id },
        data: { failedChecks: 0, verifiedAt: new Date(), badgeTier: "BRONZE" },
      });
    } else {
      const newFailedCount = agent.failedChecks + 1;
      await prisma.agent.update({
        where: { id: agent.id },
        data: {
          failedChecks: newFailedCount,
          ...(newFailedCount >= 3 && { badgeTier: "NONE" }),
        },
      });
    }

    res.json({ agentId, result });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/verify/logs/:agentId — last 50 verification logs
router.get("/logs/:agentId", async (req: Request, res: Response) => {
  try {
    const logs = await prisma.verificationLog.findMany({
      where: { agentId: Number(req.params.agentId) },
      orderBy: { checkedAt: "desc" },
      take: 50,
    });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
