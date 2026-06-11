import { Router, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { ethers } from "ethers";
import { prisma } from "../lib/db";
import { authenticateJWT, AuthRequest } from "../middleware/auth";
import { executeFlow } from "../services/engine";

const router = Router();

// POST /api/flows/preview — cost breakdown, no side effects
router.post("/preview", async (req: AuthRequest, res: Response) => {
  try {
    const { agents } = req.body;
    if (!agents?.length) return res.status(400).json({ error: "agents required" });

    const details = await Promise.all(
      agents.map(async (a: { agentId: number }) => {
        const agent = await prisma.agent.findUnique({ where: { agentId: a.agentId } });
        return {
          agentId: a.agentId,
          name: agent?.name ?? "Unknown",
          priceUsdc: agent?.priceUsdc ?? "0",
          phase2Ready: agent?.phase2Ready ?? false,
          aboutSchema: agent?.aboutSchema ?? null,
        };
      })
    );

    const subtotal = details.reduce((sum, a) => sum + parseFloat(a.priceUsdc), 0);
    const protocolFee = subtotal * 0.01;

    res.json({
      agents: details,
      subtotal: subtotal.toFixed(6),
      protocolFee: protocolFee.toFixed(6),
      total: (subtotal + protocolFee).toFixed(6),
      currency: "USDC",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/flows/create — creates flow, returns payment details
router.post("/create", authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const { agents, trigger = "IMMEDIATE", triggerValue, deadlineSeconds = 300 } = req.body;
    if (!agents?.length) return res.status(400).json({ error: "agents required" });

    const jobId = uuidv4();
    const deadline = Math.floor(Date.now() / 1000) + Number(deadlineSeconds);

    const agentDetails = await Promise.all(
      agents.map(
        async (a: {
          agentId: number;
          orderIndex: number;
          staticInputs?: object;
          inputMapping?: object;
        }) => {
          const agent = await prisma.agent.findUnique({ where: { agentId: a.agentId } });
          if (!agent) throw new Error(`Agent ${a.agentId} not found`);
          return {
            ...a,
            wallet: agent.ownerAddress,
            amount: agent.priceUsdc,
            name: agent.name,
          };
        }
      )
    );

    const treasury = process.env.TREASURY_ADDRESS || process.env.ORCHESTRATOR_ADDRESS;
    if (!treasury) throw new Error("TREASURY_ADDRESS not configured");

    const subtotal = agentDetails.reduce((s, a) => s + parseFloat(a.amount), 0);

    const flow = await prisma.flow.create({
      data: {
        jobId,
        callerAddress: req.user!.address,
        totalAmountUsdc: subtotal.toFixed(6),
        deadline: new Date(deadline * 1000),
        trigger,
        triggerValue: triggerValue?.toString() ?? null,
        agents: {
          create: agentDetails.map((a) => ({
            agentId: a.agentId,
            agentAddress: a.wallet,
            orderIndex: a.orderIndex,
            amountUsdc: a.amount,
            staticInputs: a.staticInputs ?? {},
            inputMapping: a.inputMapping ?? {},
          })),
        },
      },
      include: { agents: { orderBy: { orderIndex: "asc" } } },
    });

    // One EIP-3009 auth per agent (full price) + one treasury auth for the 1% protocol fee.
    // Agent SDK checks value >= agent price exactly, so each agent auth carries the full amount.
    const agentParams = agentDetails.map((a) => {
      const totalRaw = Math.round(parseFloat(a.amount) * 1_000_000);
      return {
        from: req.user!.address,
        to: a.wallet,
        value: totalRaw.toString(),
        validAfter: "0",
        validBefore: deadline.toString(),
        agentOrderIndex: a.orderIndex,
        nonce: ethers.hexlify(ethers.randomBytes(32)),
      };
    });

    const feeRaw = Math.round(subtotal * 1_000_000 * 0.01);
    const treasuryParam = {
      from: req.user!.address,
      to: treasury,
      value: feeRaw.toString(),
      validAfter: "0",
      validBefore: deadline.toString(),
      agentOrderIndex: -1, // sentinel: treasury auth, not tied to any agent
      nonce: ethers.hexlify(ethers.randomBytes(32)),
    };

    const eip3009Params = [...agentParams, treasuryParam];

    res.json({
      jobId,
      internalId: flow.id,
      eip3009Params,
      totalUsdc: (subtotal + subtotal * 0.01).toFixed(6),
      deadline,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: (err as Error).message ?? "Internal server error" });
  }
});

// POST /api/flows/confirm — called after user signs EIP-3009 authorizations in wallet
router.post("/confirm", authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const { internalId, signatures, eip3009Params } = req.body;
    if (!internalId || !signatures?.length || !eip3009Params?.length) {
      return res.status(400).json({ error: "Missing fields" });
    }

    // Store signed authorizations so the engine can embed them in X-Payment headers
    const authorizations = eip3009Params.map(
      (auth: Record<string, string>, i: number) => ({ ...auth, signature: signatures[i] })
    );

    const flow = await prisma.flow.update({
      where: { id: internalId },
      data: { paymentTxHash: JSON.stringify({ authorizations }), status: "LOCKED" },
      include: { agents: { orderBy: { orderIndex: "asc" } } },
    });

    if (flow.trigger === "IMMEDIATE") {
      executeFlow(flow).catch(console.error);
    }

    res.json({ success: true, jobId: flow.jobId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/flows/:jobId — flow status with agent details
router.get("/:jobId", async (req: AuthRequest, res: Response) => {
  try {
    const flow = await prisma.flow.findUnique({
      where: { jobId: req.params.jobId },
      include: { agents: { orderBy: { orderIndex: "asc" } } },
    });
    if (!flow) return res.status(404).json({ error: "Flow not found" });

    const agentIds = flow.agents.map((a) => a.agentId);
    const agentRecords = agentIds.length > 0
      ? await prisma.agent.findMany({
          where: { agentId: { in: agentIds } },
          select: { agentId: true, name: true, logoUrl: true, slug: true },
        })
      : [];
    const agentMap = Object.fromEntries(agentRecords.map((a) => [a.agentId!, a]));

    res.json({
      ...flow,
      paymentTxHash: undefined, // never expose signed authorizations
      agents: flow.agents.map((a) => ({
        id: a.id,
        agentId: a.agentId,
        agentName: agentMap[a.agentId]?.name ?? `Agent #${a.agentId}`,
        agentSlug: agentMap[a.agentId]?.slug ?? null,
        logoUrl:   agentMap[a.agentId]?.logoUrl ?? null,
        orderIndex: a.orderIndex,
        amountUsdc: a.amountUsdc,
        status: a.status,
        output: a.output,
        executedAt: a.executedAt,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/flows/report — SDK reports a direct agent call so it appears in the UI
router.post("/report", async (req: Request, res: Response) => {
  try {
    const { jobId, agentId, callerAddress, amountUsdc, output, success } = req.body;
    if (!jobId || agentId === undefined || !callerAddress) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const agent = await prisma.agent.findUnique({
      where:  { agentId: Number(agentId) },
      select: { ownerAddress: true },
    });
    if (!agent) return res.status(404).json({ error: "Agent not found" });

    const now    = new Date();
    const status = success ? "COMPLETED" : "FAILED";

    await prisma.flow.create({
      data: {
        jobId,
        callerAddress,
        totalAmountUsdc: amountUsdc ?? "0",
        deadline:        now,
        trigger:         "IMMEDIATE",
        status,
        completedAt:     status === "COMPLETED" ? now : undefined,
        agents: {
          create: {
            agentId:      Number(agentId),
            agentAddress: agent.ownerAddress,
            orderIndex:   0,
            amountUsdc:   amountUsdc ?? "0",
            status,
            output:       output ?? {},
            executedAt:   now,
          },
        },
      },
    });

    res.json({ success: true });
  } catch (err) {
    console.error("[flows/report]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/flows/my/list — caller's flows (auth required)
router.get("/my/list", authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const flows = await prisma.flow.findMany({
      where: { callerAddress: req.user!.address },
      include: { agents: { orderBy: { orderIndex: "asc" } } },
      orderBy: { createdAt: "desc" },
    });
    res.json(flows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
