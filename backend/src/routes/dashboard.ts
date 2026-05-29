import { Router, Response } from "express";
import { prisma } from "../lib/db";
import { authenticateJWT, AuthRequest } from "../middleware/auth";

const router = Router();

// GET /api/dashboard/summary — stats strip
router.get("/summary", authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const address = req.user!.address;

    const myAgents = await prisma.agent.findMany({
      where: { ownerAddress: address, agentId: { not: null } },
      select: { agentId: true, active: true },
    });

    const agentIds = myAgents.map((a) => a.agentId!);

    const [activeFlows, completedFlows, earnedJobs] = await Promise.all([
      prisma.flow.count({
        where: { callerAddress: address, status: { in: ["LOCKED", "RUNNING"] } },
      }),
      prisma.flow.count({
        where: { callerAddress: address, status: "COMPLETED" },
      }),
      agentIds.length > 0
        ? prisma.flowAgent.findMany({
            where: { agentId: { in: agentIds }, status: "COMPLETED" },
            select: { amountEth: true },
          })
        : Promise.resolve([]),
    ]);

    const totalEarned = earnedJobs.reduce((s, j) => s + parseFloat(j.amountEth), 0);

    res.json({
      totalEarnedEth: totalEarned > 0 ? parseFloat(totalEarned.toFixed(6)).toString() : "0",
      totalJobsRun: completedFlows,
      activeFlows,
      agentsLive: myAgents.filter((a) => a.active).length,
      agentsTotal: myAgents.length,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/dashboard/flows — caller's flows with agent names resolved
router.get("/flows", authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const address = req.user!.address;

    const flows = await prisma.flow.findMany({
      where: { callerAddress: address },
      include: { agents: { orderBy: { orderIndex: "asc" } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const allAgentIds = [...new Set(flows.flatMap((f) => f.agents.map((a) => a.agentId)))];
    const agentRecords =
      allAgentIds.length > 0
        ? await prisma.agent.findMany({
            where: { agentId: { in: allAgentIds } },
            select: { agentId: true, name: true },
          })
        : [];
    const nameMap: Record<number, string> = Object.fromEntries(
      agentRecords.map((a) => [a.agentId!, a.name])
    );

    const result = flows.map((f) => ({
      id: f.id,
      jobId: f.jobId,
      status: f.status,
      trigger: f.trigger,
      totalAmountEth: f.totalAmountEth,
      escrowTxHash: f.escrowTxHash,
      createdAt: f.createdAt,
      completedAt: f.completedAt,
      deadline: f.deadline,
      agents: f.agents.map((a) => ({
        id: a.id,
        agentId: a.agentId,
        agentName: nameMap[a.agentId] ?? `Agent #${a.agentId}`,
        orderIndex: a.orderIndex,
        status: a.status,
        amountEth: a.amountEth,
        executedAt: a.executedAt,
        output: a.output,
      })),
    }));

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/dashboard/agents — builder's agents with job stats + reliability
router.get("/agents", authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const address = req.user!.address;

    const myAgents = await prisma.agent.findMany({
      where: { ownerAddress: address },
      orderBy: { registeredAt: "desc" },
    });

    const agentIds = myAgents.map((a) => a.agentId!).filter(Boolean);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [completedJobs, verificationLogs] = await Promise.all([
      agentIds.length > 0
        ? prisma.flowAgent.findMany({
            where: { agentId: { in: agentIds }, status: "COMPLETED" },
            include: { flow: { select: { jobId: true } } },
            orderBy: { executedAt: "desc" },
          })
        : Promise.resolve([]),
      agentIds.length > 0
        ? prisma.verificationLog.findMany({
            where: { agentId: { in: agentIds }, checkedAt: { gte: sevenDaysAgo } },
            select: { agentId: true, checkedAt: true, success: true },
          })
        : Promise.resolve([]),
    ]);

    const result = myAgents.map((agent) => {
      const jobs = completedJobs.filter((j) => j.agentId === agent.agentId);
      const totalEarned = jobs.reduce((s, j) => s + parseFloat(j.amountEth), 0);

      // 7-day reliability calendar
      const reliabilityDays = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().slice(0, 10);
        const dayLogs = verificationLogs.filter(
          (l) =>
            l.agentId === agent.agentId &&
            l.checkedAt.toISOString().slice(0, 10) === dateStr
        );
        reliabilityDays.push({
          date: dateStr,
          hasData: dayLogs.length > 0,
          success: dayLogs.length > 0 ? dayLogs.some((l) => l.success) : null,
        });
      }

      return {
        agentId: agent.agentId,
        name: agent.name,
        category: agent.category,
        badgeTier: agent.badgeTier,
        active: agent.active,
        verifiedAt: agent.verifiedAt,
        failedChecks: agent.failedChecks,
        priceEth: agent.priceEth,
        pricingModel: agent.pricingModel,
        phase2Ready: agent.phase2Ready,
        aboutSchema: agent.aboutSchema,
        registeredAt: agent.registeredAt,
        txHash: agent.txHash,
        totalJobs: jobs.length,
        totalEarnedEth: totalEarned > 0 ? parseFloat(totalEarned.toFixed(6)).toString() : "0",
        recentJobs: jobs.slice(0, 3).map((j) => ({
          flowJobId: j.flow.jobId,
          executedAt: j.executedAt,
          amountEth: j.amountEth,
        })),
        reliabilityDays,
      };
    });

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
