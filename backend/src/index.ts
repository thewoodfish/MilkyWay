import express from "express";
import cors from "cors";
import cron from "node-cron";
import agentsRouter from "./routes/agents";
import verifyRouter from "./routes/verify";
import authRouter from "./routes/auth";
import flowsRouter from "./routes/flows";
import earningsRouter from "./routes/earnings";
import dashboardRouter from "./routes/dashboard";
import notificationsRouter from "./routes/notifications";
import uploadRouter from "./routes/upload";
import permissionsRouter from "./routes/permissions";
import { prisma } from "./lib/db";
import { runVerificationCycle } from "./services/verification";

const app = express();
const PORT = process.env.PORT ?? 4000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "10mb" }));

// ── Routes ────────────────────────────────────────────────────────────

app.use("/api/auth", authRouter);
app.use("/api/agents", agentsRouter);
app.use("/api/verify", verifyRouter);
app.use("/api/flows", flowsRouter);
app.use("/api/earnings", earningsRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/upload", uploadRouter);
app.use("/api/permissions", permissionsRouter);

// GET /api/builders/:address
app.get("/api/builders/:address", async (req, res) => {
  try {
    const builder = await prisma.builder.findUnique({
      where: { address: req.params.address },
      include: {
        agents: {
          where: { active: true },
          orderBy: { registeredAt: "desc" },
        },
      },
    });
    if (!builder) return res.status(404).json({ error: "Builder not found" });
    res.json(builder);
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/stats
app.get("/api/stats", async (_req, res) => {
  try {
    const [agentCount, builderCount, verificationsToday] = await Promise.all([
      prisma.agent.count({ where: { active: true } }),
      prisma.builder.count(),
      prisma.verificationLog.count({
        where: { checkedAt: { gte: new Date(Date.now() - 86_400_000) } },
      }),
    ]);

    // Stake = 0.01 ETH per active agent (stored on-chain, approximated here)
    const totalStakedEth = (agentCount * 0.01).toFixed(4);

    res.json({ agentCount, builderCount, verificationsToday, totalStaked: totalStakedEth });
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Verification cron — every 2h + once at startup ───────────────────

runVerificationCycle().catch((err) =>
  console.error("Startup verification error:", err)
);

cron.schedule("0 */2 * * *", async () => {
  try {
    await runVerificationCycle();
  } catch (err) {
    console.error("Verification cycle error:", err);
  }
});

// ── Start ─────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`MilkyWay backend running on port ${PORT}`);
});

export default app;
