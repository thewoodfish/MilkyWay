import { Router, Request, Response } from "express";
import { ethers } from "ethers";
import { prisma } from "../lib/db";
import { verifyEndpoint } from "../services/verification";
import { fetchAbout } from "../services/about";
import { authenticateJWT, authenticateAny, AuthRequest } from "../middleware/auth";
import { authenticateAPIKey, ApiKeyRequest } from "../middleware/apiKey";
import { generateUniqueSlug } from "../utils/slug";

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

// GET /api/agents/:agentId/logs?count=N — CLI logs command (API key auth)
router.get("/:agentId/logs", authenticateAPIKey, async (req: Request, res: Response) => {
  try {
    const agentId = Number(req.params.agentId);
    if (isNaN(agentId)) return res.status(400).json({ error: "Invalid agent ID" });
    const count   = Math.min(Number(req.query.count || 20), 100);

    const agent = await prisma.agent.findUnique({
      where:  { agentId },
      select: { ownerAddress: true },
    });
    if (!agent) return res.status(404).json({ error: "Agent not found" });

    if (agent.ownerAddress.toLowerCase() !== (req as ApiKeyRequest).builderAddress!.toLowerCase()) {
      return res.status(403).json({ error: "Not your agent" });
    }

    const jobs = await prisma.flowAgent.findMany({
      where:   { agentId },
      take:    count,
      orderBy: { executedAt: "desc" },
      include: { flow: { select: { jobId: true } } },
    });

    res.json(jobs.map((j) => ({
      executedAt: j.executedAt,
      status:     j.status,
      amountUsdc: j.amountUsdc,
      flowJobId:  j.flow.jobId,
      output:     j.output,
    })));
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/agents/:agentId/health — CLI monitor command
router.get("/:agentId/health", authenticateAPIKey, async (req: Request, res: Response) => {
  try {
    const agent = await prisma.agent.findUnique({
      where:  { agentId: Number(req.params.agentId) },
      select: { endpoint: true, active: true, failedChecks: true, verifiedAt: true },
    });
    if (!agent) return res.status(404).json({ error: "Agent not found" });

    const start = Date.now();
    let alive = false;
    try {
      const r = await fetch(`${agent.endpoint.replace(/\/$/, "")}/health`, {
        signal: AbortSignal.timeout(5000),
      });
      alive = r.status === 200;
    } catch {
      alive = false;
    }
    const responseTimeMs = Date.now() - start;

    const status = !agent.active
      ? "down"
      : agent.failedChecks >= 7
        ? "down"
        : agent.failedChecks >= 3
          ? "degraded"
          : alive
            ? "live"
            : "down";

    res.json({ status, responseTimeMs: alive ? responseTimeMs : null });
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/agents/:agentId/about — cached /about schema
router.get("/:agentId/about", async (req: Request, res: Response) => {
  try {
    const agent = await prisma.agent.findUnique({
      where: { agentId: Number(req.params.agentId) },
      select: { aboutSchema: true, phase2Ready: true, priceUsdc: true },
    });
    if (!agent) return res.status(404).json({ error: "Not found" });
    if (!agent.phase2Ready || !agent.aboutSchema) {
      return res.status(404).json({ error: "Agent not Phase 2 ready" });
    }
    res.json(agent.aboutSchema);
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/agents/:agentIdOrSlug/refresh-schema — live re-fetch /about and update DB
router.post("/:agentIdOrSlug/refresh-schema", async (req: Request, res: Response) => {
  try {
    const param = req.params.agentIdOrSlug;
    const isNumeric = /^\d+$/.test(param);
    const agent = await prisma.agent.findFirst({
      where: isNumeric ? { agentId: Number(param) } : { slug: param },
      select: { id: true, endpoint: true },
    });
    if (!agent) return res.status(404).json({ error: "Agent not found" });

    const result = await fetchAbout(agent.endpoint);
    if (!result.success) {
      return res.status(502).json({ error: `Could not reach agent /about: ${result.error}` });
    }

    await prisma.agent.update({
      where: { id: agent.id },
      data: {
        aboutSchema:   result.schema as object,
        phase2Ready:   true,
        aboutCachedAt: new Date(),
      },
    });

    res.json({ success: true, schema: result.schema });
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/agents/discover — public, no auth, for agent-to-agent discovery
router.get("/discover", async (req: Request, res: Response) => {
  try {
    const {
      capability,
      category,
      min_badge,
      max_price,
      limit  = "10",
      sort   = "rating",
    } = req.query as Record<string, string>;

    const where: Record<string, unknown> = { active: true, phase2Ready: true, agentId: { not: null } };
    if (category)  where.category = category;
    if (max_price) where.priceUsdc = { lte: max_price };
    if (min_badge) {
      const tiers: Record<string, number> = { BRONZE: 1, SILVER: 2, GOLD: 3 };
      const minTier = tiers[min_badge] ?? 0;
      where.badgeTier = { in: Object.entries(tiers).filter(([, v]) => v >= minTier).map(([k]) => k) };
    }

    const orderBy: Record<string, unknown> =
      sort === "price_asc"  ? { priceUsdc: "asc" }  :
      sort === "price_desc" ? { priceUsdc: "desc" } :
      sort === "jobs"       ? { id: "desc" }         :
      /* rating default */    { verifiedAt: "desc" };

    const agents = await prisma.agent.findMany({
      where,
      orderBy,
      take: Math.min(Number(limit), 50),
      select: {
        agentId: true, name: true, description: true, endpoint: true,
        ownerAddress: true, priceUsdc: true, pricingModel: true,
        badgeTier: true, aboutSchema: true, verifiedAt: true,
      },
    });

    // Filter by capability name if requested
    const filtered = capability
      ? agents.filter((a) => {
          const schema = a.aboutSchema as Record<string, unknown> | null;
          const caps = schema?.capabilities as Record<string, unknown> | undefined;
          return caps && (capability in caps);
        })
      : agents;

    // Attach 30-day success rate
    const now = Date.now();
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
    const agentIds = filtered.map((a) => a.agentId!);

    const logs = agentIds.length
      ? await prisma.verificationLog.findMany({
          where: { agentId: { in: agentIds }, checkedAt: { gte: thirtyDaysAgo } },
          select: { agentId: true, success: true },
        })
      : [];

    const logsByAgent = new Map<number, { total: number; succeeded: number }>();
    for (const l of logs) {
      const entry = logsByAgent.get(l.agentId) ?? { total: 0, succeeded: 0 };
      entry.total++;
      if (l.success) entry.succeeded++;
      logsByAgent.set(l.agentId, entry);
    }

    const result = filtered.map((a) => {
      const schema    = a.aboutSchema as Record<string, unknown> | null;
      const caps      = schema?.capabilities as Record<string, Record<string, unknown>> | undefined;
      const capName   = capability || (caps ? Object.keys(caps)[0] : undefined);
      const capSchema = caps && capName ? caps[capName] : undefined;
      const stats     = logsByAgent.get(a.agentId!) ?? { total: 0, succeeded: 0 };
      const rate      = stats.total > 0 ? Math.round((stats.succeeded / stats.total) * 1000) / 10 : 0;
      const isLive    = a.verifiedAt && now - new Date(a.verifiedAt).getTime() < 26 * 3600 * 1000;

      return {
        agentId:     a.agentId,
        name:        a.name,
        description: a.description,
        endpoint:    a.endpoint,
        agentWallet: a.ownerAddress,
        capability:  capName ?? null,
        priceUsdc:   a.priceUsdc,
        pricingModel: a.pricingModel,
        badgeTier:   a.badgeTier,
        successRate: rate,
        totalJobs:   stats.total,
        status:      isLive ? "live" : "degraded",
        inputSchema:  (capSchema as Record<string, unknown> | undefined)?.input_schema  ?? {},
        outputSchema: (capSchema as Record<string, unknown> | undefined)?.output_schema ?? {},
      };
    });

    res.json({ agents: result, total: result.length, limit: Number(limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/agents/:agentIdOrSlug — accepts numeric agentId or slug
router.get("/:agentIdOrSlug", async (req: Request, res: Response) => {
  try {
    const param = req.params.agentIdOrSlug;
    const isNumeric = /^\d+$/.test(param);

    const agent = await prisma.agent.findFirst({
      where: isNumeric ? { agentId: Number(param) } : { slug: param },
      include: { builder: true },
    });
    if (!agent) return res.status(404).json({ error: "Agent not found" });
    res.json(agent);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/agents/pre-register — CLI: save profile pending on-chain stake + NFT mint
router.post("/pre-register", authenticateAPIKey, async (req: Request, res: Response) => {
  try {
    const { config, endpoint, metadataHash } = req.body;
    const ownerAddress = (req as ApiKeyRequest).builderAddress!;

    if (!config || !endpoint || !metadataHash) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const pingResult = await verifyEndpoint(endpoint);
    if (!pingResult.success) {
      return res.status(400).json({ error: "Endpoint verification failed", detail: pingResult.error });
    }

    // Extract pricing from agent.json capabilities if present
    const capability = config.capabilities?.run ?? config.capabilities?.[Object.keys(config.capabilities ?? {})[0]];
    const priceUsdc  = capability?.pricing?.amount ?? "0";

    const slug = await generateUniqueSlug(config.name);

    // Create pending profile — inactive until on-chain stake + NFT mint confirms
    const agent = await prisma.agent.create({
      data: {
        agentId:      null,
        metadataHash,
        active:       false,
        name:         config.name,
        description:  config.description,
        category:     config.category || "UTILITY",
        version:      config.milkyway_version || "1.0",
        endpoint,
        pricingModel: "PER_CALL",
        priceUsdc,
        permissions:  [],
        slug,
        builder: {
          connectOrCreate: {
            where:  { address: ownerAddress },
            create: { address: ownerAddress },
          },
        },
      },
    });

    const aboutResult = await fetchAbout(endpoint);
    if (aboutResult.success) {
      await prisma.agent.update({
        where: { id: agent.id },
        data: {
          aboutSchema:   aboutResult.schema as object,
          phase2Ready:   true,
          aboutCachedAt: new Date(),
        },
      });
    }

    res.json({ profileId: agent.id, phase2Ready: aboutResult.success });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/agents/pending/:profileId — stake page fetches agent name for display
router.get("/pending/:profileId", async (req: Request, res: Response) => {
  try {
    const agent = await prisma.agent.findUnique({
      where: { id: req.params.profileId },
      select: { name: true, description: true, active: true },
    });
    if (!agent) return res.status(404).json({ error: "Not found" });
    res.json(agent);
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/agents/stake-status/:profileId — CLI polls this after directing user to stake
router.get("/stake-status/:profileId", authenticateAPIKey, async (req: Request, res: Response) => {
  try {
    const agent = await prisma.agent.findUnique({
      where: { id: req.params.profileId },
      select: { active: true, txHash: true },
    });
    if (!agent) return res.status(404).json({ error: "Profile not found" });
    res.json({ staked: agent.active, txHash: agent.txHash });
  } catch {
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
      priceUsdc,
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
      priceUsdc: priceUsdc ?? "0",
      pricingModel: pricingModel ?? "FREE",
      subcategory: subcategory ?? null,
      version: version ?? "1.0.0",
    };

    const profileJSON = JSON.stringify(profile, Object.keys(profile).sort());
    const metadataHash = ethers.keccak256(ethers.toUtf8Bytes(profileJSON));

    const slug = await generateUniqueSlug(name);

    const agent = await prisma.agent.create({
      data: {
        agentId: null,
        metadataHash,
        active: false,
        name: profile.name,
        description: profile.description,
        category: profile.category,
        subcategory: profile.subcategory ?? undefined,
        version: profile.version,
        endpoint: profile.endpoint,
        pricingModel: profile.pricingModel,
        priceUsdc: profile.priceUsdc,
        permissions: profile.permissions,
        logoUrl: profile.logoUrl ?? undefined,
        slug,
        builder: {
          connectOrCreate: {
            where: { address: ownerAddress },
            create: { address: ownerAddress },
          },
        },
      },
    });

    // Probe /about — non-blocking, marks phase2Ready if present
    const aboutResult = await fetchAbout(endpoint);
    if (aboutResult.success) {
      await prisma.agent.update({
        where: { id: agent.id },
        data: {
          aboutSchema: aboutResult.schema as object,
          phase2Ready: true,
          aboutCachedAt: new Date(),
        },
      });
    }

    res.json({ metadataHash, profileId: agent.id, pingResult, phase2Ready: aboutResult.success });
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

    const now = new Date();
    const agent = await prisma.agent.update({
      where: { id: profileId },
      data: { agentId, txHash, active: true, badgeTier: "BRONZE", verifiedAt: now },
    });

    // Write a verification log entry so lastCheckSuccess is immediately "live"
    await prisma.verificationLog.create({
      data: {
        agentId,
        endpoint: agent.endpoint,
        success: true,
        statusCode: 200,
        checkedAt: now,
      },
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
// Accepts either flat fields { name, description, ... } from the dashboard UI
// or { config, newMetadataHash } from the CLI
router.put("/:agentId", authenticateAny, async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.agent.findUnique({
      where: { agentId: Number(req.params.agentId) },
    });
    if (!existing) return res.status(404).json({ error: "Agent not found" });
    if (existing.ownerAddress.toLowerCase() !== req.user!.address.toLowerCase()) {
      return res.status(403).json({ error: "Not your agent" });
    }

    // CLI sends { config: agent.json, newMetadataHash }
    // Dashboard sends flat { name, description, pricingModel, priceUsdc, logoUrl }
    const { config, newMetadataHash, name, description, pricingModel, priceUsdc, logoUrl } = req.body;

    let resolvedName        = name;
    let resolvedDescription = description;
    let resolvedPriceUsdc   = priceUsdc;

    let resolvedCategory: string | undefined;

    if (config) {
      resolvedName        = config.name        ?? resolvedName;
      resolvedDescription = config.description ?? resolvedDescription;
      resolvedCategory    = config.category    ?? undefined;

      // Extract price amount from first capability in config.
      // Do NOT write pricingModel — agent.json uses "per_job" which doesn't
      // match the Prisma PricingModel enum (PER_CALL, PER_DAY, etc.)
      const caps = config.capabilities as Record<string, { pricing?: { amount?: string } }> | undefined;
      if (caps) {
        const firstCap = Object.values(caps)[0];
        if (firstCap?.pricing?.amount) {
          resolvedPriceUsdc = firstCap.pricing.amount;
        }
      }
    }

    const updateData: Record<string, unknown> = {
      ...(resolvedName        && { name: resolvedName }),
      ...(resolvedDescription && { description: resolvedDescription }),
      ...(resolvedCategory    && { category: resolvedCategory }),
      ...(pricingModel        && { pricingModel }),   // only from dashboard (already enum-safe)
      ...(resolvedPriceUsdc   && { priceUsdc: resolvedPriceUsdc }),
      ...(logoUrl !== undefined && { logoUrl }),
      ...(newMetadataHash     && { metadataHash: newMetadataHash }),
    };

    // If CLI sent a config, refresh /about from the live endpoint
    if (config && existing.endpoint) {
      const aboutResult = await fetchAbout(existing.endpoint);
      if (aboutResult.success) {
        updateData.aboutSchema    = aboutResult.schema;
        updateData.phase2Ready    = true;
        updateData.aboutCachedAt  = new Date();
      }
    }

    const updated = await prisma.agent.update({
      where: { agentId: Number(req.params.agentId) },
      data: updateData,
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
