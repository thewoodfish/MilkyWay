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
            select: { amountUsdc: true },
          })
        : Promise.resolve([]),
    ]);

    const totalEarned = earnedJobs.reduce((s, j) => s + parseFloat(j.amountUsdc), 0);

    res.json({
      totalEarnedUsdc: totalEarned > 0 ? parseFloat(totalEarned.toFixed(6)).toString() : "0",
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
      totalAmountUsdc: f.totalAmountUsdc,
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
        amountUsdc: a.amountUsdc,
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
      const totalEarned = jobs.reduce((s, j) => s + parseFloat(j.amountUsdc), 0);

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
        logoUrl: agent.logoUrl,
        active: agent.active,
        verifiedAt: agent.verifiedAt,
        failedChecks: agent.failedChecks,
        priceUsdc: agent.priceUsdc,
        pricingModel: agent.pricingModel,
        phase2Ready: agent.phase2Ready,
        aboutSchema: agent.aboutSchema,
        registeredAt: agent.registeredAt,
        txHash: agent.txHash,
        totalJobs: jobs.length,
        totalEarnedUsdc: totalEarned > 0 ? parseFloat(totalEarned.toFixed(6)).toString() : "0",
        recentJobs: jobs.slice(0, 3).map((j) => ({
          flowJobId: j.flow.jobId,
          executedAt: j.executedAt,
          amountUsdc: j.amountUsdc,
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

// GET /api/dashboard/agents/:agentId/analytics
router.get("/agents/:agentId/analytics", authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const address = req.user!.address;
    const agentId = parseInt(req.params.agentId, 10);

    const agent = await prisma.agent.findFirst({
      where: { agentId, ownerAddress: address },
    });
    if (!agent) return res.status(404).json({ error: "Not found" });

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [allJobs, verificationLogs] = await Promise.all([
      prisma.flowAgent.findMany({
        where: { agentId },
        include: { flow: { select: { jobId: true, escrowTxHash: true } } },
        orderBy: { executedAt: "desc" },
      }),
      prisma.verificationLog.findMany({
        where: { agentId, checkedAt: { gte: thirtyDaysAgo } },
        select: { checkedAt: true, success: true, responseTimeMs: true },
        orderBy: { checkedAt: "asc" },
      }),
    ]);

    // Avg response time
    const timings = verificationLogs.filter((l) => l.responseTimeMs != null);
    const avgResponseTimeMs = timings.length > 0
      ? Math.round(timings.reduce((s, l) => s + l.responseTimeMs!, 0) / timings.length)
      : null;

    // Success rate from verification logs
    const successRate = verificationLogs.length > 0
      ? Math.round((verificationLogs.filter((l) => l.success).length / verificationLogs.length) * 100)
      : null;

    // Uptime last 30 days
    const uptime = successRate;

    // Jobs per day — last 30 days
    const jobsMap: Record<string, { count: number; earned: number }> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      jobsMap[d.toISOString().slice(0, 10)] = { count: 0, earned: 0 };
    }
    for (const job of allJobs) {
      if (!job.executedAt) continue;
      const day = new Date(job.executedAt).toISOString().slice(0, 10);
      if (jobsMap[day]) {
        jobsMap[day].count += 1;
        jobsMap[day].earned += parseFloat(job.amountUsdc);
      }
    }
    const jobsPerDay = Object.entries(jobsMap).map(([date, v]) => ({
      date,
      count: v.count,
      earned: parseFloat(v.earned.toFixed(6)),
    }));

    // 7-day reliability
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentLogs = verificationLogs.filter((l) => l.checkedAt >= sevenDaysAgo);
    const reliabilityDays = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const dayLogs = recentLogs.filter(
        (l) => l.checkedAt.toISOString().slice(0, 10) === dateStr
      );
      reliabilityDays.push({
        date: dateStr,
        hasData: dayLogs.length > 0,
        success: dayLogs.length > 0 ? dayLogs.some((l) => l.success) : null,
      });
    }

    // Recent 15 jobs
    const recentJobs = allJobs.slice(0, 15).map((j) => ({
      flowJobId: j.flow.jobId,
      executedAt: j.executedAt,
      amountUsdc: j.amountUsdc,
      status: j.status,
      escrowTxHash: j.flow.escrowTxHash,
    }));

    const totalEarned = allJobs
      .filter((j) => j.status === "COMPLETED")
      .reduce((s, j) => s + parseFloat(j.amountUsdc), 0);

    res.json({
      agentId,
      name: agent.name,
      category: agent.category,
      badgeTier: agent.badgeTier,
      logoUrl: agent.logoUrl,
      active: agent.active,
      phase2Ready: agent.phase2Ready,
      verifiedAt: agent.verifiedAt,
      registeredAt: agent.registeredAt,
      priceUsdc: agent.priceUsdc,
      pricingModel: agent.pricingModel,
      totalJobs: allJobs.filter((j) => j.status === "COMPLETED").length,
      totalEarnedUsdc: totalEarned > 0 ? parseFloat(totalEarned.toFixed(6)).toString() : "0",
      avgResponseTimeMs,
      successRate,
      uptime,
      jobsPerDay,
      reliabilityDays,
      recentJobs,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
