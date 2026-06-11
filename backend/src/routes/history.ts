import { Router, Request, Response } from "express";
import { prisma } from "../lib/db";

const router = Router();

// GET /api/history/transactions — last 5 completed flows, public
router.get("/transactions", async (_req: Request, res: Response) => {
  try {
    const recentFlows = await prisma.flow.findMany({
      where:   { status: "COMPLETED" },
      orderBy: { completedAt: "desc" },
      take:    5,
      include: {
        agents: {
          orderBy: { orderIndex: "asc" },
          select: {
            id:         true,
            agentId:    true,
            amountUsdc: true,
            executedAt: true,
            status:     true
          }
        }
      }
    });

    const result = await Promise.all(
      recentFlows.map(async (flow) => {
        const agentDetails = await Promise.all(
          flow.agents.map(async (fa) => {
            const agent = await prisma.agent.findUnique({
              where:  { agentId: fa.agentId },
              select: { name: true, logoUrl: true, badgeTier: true, aboutSchema: true }
            });

            // Derive capability from aboutSchema capabilities object (first key)
            let capability = "execute";
            if (agent?.aboutSchema && typeof agent.aboutSchema === "object") {
              const schema = agent.aboutSchema as Record<string, unknown>;
              if (schema.capabilities && typeof schema.capabilities === "object") {
                const keys = Object.keys(schema.capabilities as object);
                if (keys.length > 0) capability = keys[0];
              }
            }

            return {
              id:         fa.id,
              agentId:    fa.agentId,
              agentName:  agent?.name    ?? "Unknown Agent",
              logoUrl:    agent?.logoUrl ?? null,
              badgeTier:  agent?.badgeTier ?? "NONE",
              capability,
              amountUsdc: fa.amountUsdc,
              executedAt: fa.executedAt?.toISOString() ?? null
            };
          })
        );

        const totalUsdc = flow.agents.reduce(
          (sum, a) => sum + parseFloat(a.amountUsdc || "0"),
          0
        );

        const firstExec  = flow.agents[0]?.executedAt;
        const durationMs = firstExec && flow.completedAt
          ? flow.completedAt.getTime() - firstExec.getTime()
          : 0;

        const isFlow = flow.agents.length > 1;

        return {
          type:          isFlow ? "flow" : "single",
          id:            flow.id,
          flowJobId:     flow.jobId,
          agentCount:    flow.agents.length,
          agents:        agentDetails,
          totalUsdc:     totalUsdc.toFixed(4),
          callerAddress: flow.callerAddress,
          durationMs,
          completedAt:   flow.completedAt?.toISOString() ?? new Date().toISOString(),

          // Flat fields for single-agent TransactionCard
          agentId:      agentDetails[0]?.agentId,
          agentName:    agentDetails[0]?.agentName,
          agentLogoUrl: agentDetails[0]?.logoUrl,
          badgeTier:    agentDetails[0]?.badgeTier ?? "NONE",
          capability:   agentDetails[0]?.capability,
          amountUsdc:   agentDetails[0]?.amountUsdc,
          txHash:       flow.paymentTxHash ?? "",
          settledAt:    flow.completedAt?.toISOString() ?? new Date().toISOString()
        };
      })
    );

    res.json(result);
  } catch (err) {
    console.error("[history/transactions]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/history/stats — rolling 24h stats, public
router.get("/stats", async (_req: Request, res: Response) => {
  try {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [jobs, agentCount] = await Promise.all([
      prisma.flowAgent.findMany({
        where:  { status: "COMPLETED", executedAt: { gte: since24h } },
        select: { amountUsdc: true }
      }),
      prisma.agent.count()
    ]);

    const usdcTotal = jobs.reduce(
      (sum, j) => sum + parseFloat(j.amountUsdc || "0"),
      0
    );

    res.json({
      jobsToday:    jobs.length,
      usdcToday:    usdcTotal.toFixed(4),
      agentsActive: agentCount
    });
  } catch (err) {
    console.error("[history/stats]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
