import { Router, Response } from "express";
import { prisma } from "../lib/db";
import { authenticateJWT, AuthRequest } from "../middleware/auth";

const router = Router();

// GET /api/earnings/:address?period=7d|30d|all
router.get("/:address", authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const { address } = req.params;
    const period = (req.query.period as string) || "30d";

    if (req.user!.address.toLowerCase() !== address.toLowerCase()) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const myAgents = await prisma.agent.findMany({
      where: { ownerAddress: address, active: true, agentId: { not: null } },
      select: { agentId: true, name: true },
    });

    const agentIds = myAgents.map((a) => a.agentId as number);

    if (agentIds.length === 0) {
      return res.json({
        totalEarnedEth: "0.000000",
        totalExecutions: 0,
        activeFlows: 0,
        perAgent: [],
        recentPayments: [],
      });
    }

    const sinceDate =
      period === "7d"  ? new Date(Date.now() - 7  * 86_400_000) :
      period === "30d" ? new Date(Date.now() - 30 * 86_400_000) :
      undefined;

    const completedJobs = await prisma.flowAgent.findMany({
      where: {
        agentId: { in: agentIds },
        status: "COMPLETED",
        ...(sinceDate ? { executedAt: { gte: sinceDate } } : {}),
      },
      include: {
        flow: {
          select: { jobId: true, status: true, escrowTxHash: true, completedAt: true },
        },
      },
      orderBy: { executedAt: "desc" },
    });

    const perAgent = myAgents.map((agent) => {
      const jobs = completedJobs.filter((j) => j.agentId === agent.agentId);
      const totalEth = jobs.reduce((sum, j) => sum + parseFloat(j.amountEth), 0);
      return {
        agentId: agent.agentId,
        name: agent.name,
        executions: jobs.length,
        totalEarnedEth: totalEth.toFixed(6),
        lastRunAt: jobs[0]?.executedAt ?? null,
      };
    });

    const totalEth = perAgent.reduce((sum, a) => sum + parseFloat(a.totalEarnedEth), 0);

    const activeFlows = await prisma.flowAgent.count({
      where: {
        agentId: { in: agentIds },
        flow: { status: { in: ["LOCKED", "RUNNING"] } },
      },
    });

    const recentPayments = completedJobs.slice(0, 10).map((j) => ({
      executedAt: j.executedAt,
      agentId: j.agentId,
      agentName: myAgents.find((a) => a.agentId === j.agentId)?.name ?? "Unknown",
      flowJobId: j.flow.jobId,
      amountEth: j.amountEth,
      txHash: j.flow.escrowTxHash,
    }));

    res.json({
      totalEarnedEth: totalEth.toFixed(6),
      totalExecutions: completedJobs.length,
      activeFlows,
      perAgent,
      recentPayments,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
