import { Router, Response } from "express";
import { v4 as uuidv4 } from "uuid";
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

    const subtotal = agentDetails.reduce((s, a) => s + parseFloat(a.amount), 0);
    const fee = subtotal * 0.01;
    const total = subtotal + fee;

    const flow = await prisma.flow.create({
      data: {
        jobId,
        callerAddress: req.user!.address,
        totalAmountUsdc: total.toFixed(6),
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

    res.json({
      jobId,
      internalId: flow.id,
      // Address users send USDC to before calling /confirm
      milkywayPaymentAddress: process.env.ORCHESTRATOR_ADDRESS ?? "",
      // Raw USDC units (6 decimals) for ERC-20 transfer call
      rawAmountUsdc: Math.round(total * 1_000_000).toString(),
      totalUsdc: total.toFixed(6),
      deadline,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: (err as Error).message ?? "Internal server error" });
  }
});

// POST /api/flows/confirm — called after user's USDC transfer confirms
router.post("/confirm", authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const { internalId, paymentTxHash } = req.body;
    if (!internalId || !paymentTxHash) return res.status(400).json({ error: "Missing fields" });

    const flow = await prisma.flow.update({
      where: { id: internalId },
      data: { paymentTxHash, status: "LOCKED" },
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

// GET /api/flows/:jobId — flow status
router.get("/:jobId", async (req: AuthRequest, res: Response) => {
  try {
    const flow = await prisma.flow.findUnique({
      where: { jobId: req.params.jobId },
      include: { agents: { orderBy: { orderIndex: "asc" } } },
    });
    if (!flow) return res.status(404).json({ error: "Flow not found" });
    res.json(flow);
  } catch (err) {
    console.error(err);
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
