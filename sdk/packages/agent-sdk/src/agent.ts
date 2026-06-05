import express, { Express, Request, Response, NextFunction } from "express";
import { requirePayment }      from "./x402";
import { buildExecuteHandler } from "./router";
import { logStartup }          from "./logger";
import { AgentConfig, Handlers, MilkyWayAbout } from "./types";

interface CreateAgentOptions {
  devMode?: boolean;
}

interface AgentInstance {
  app:    Express;
  listen: (port: number, callback?: () => void) => void;
}

export function createAgent(
  config:   AgentConfig,
  handlers: Handlers,
  options:  CreateAgentOptions = {}
): AgentInstance {
  const app = express();
  app.use(express.json());

  const devMode = options.devMode ?? process.env.MILKYWAY_DEV_MODE === "true";

  // ── In-flight request tracking (for graceful shutdown) ─────────────────────
  let inFlightCount  = 0;
  let isShuttingDown = false;

  app.use((_req: Request, res: Response, next: NextFunction) => {
    if (isShuttingDown) {
      res.setHeader("Connection", "close");
      return res.status(503).json({ error: "Server is shutting down — please retry" });
    }

    inFlightCount++;
    let decremented = false;
    const decrement = () => { if (!decremented) { decremented = true; inFlightCount--; } };
    res.on("finish", decrement);
    res.on("close",  decrement);

    next();
  });

  // ── Standard endpoints ─────────────────────────────────────────────────────

  app.get("/health", (_req, res) => {
    res.json({ name: config.name, version: "1.0.0", status: "ok", ...(devMode && { devMode: true }) });
  });

  app.get("/about", (_req, res) => {
    const about: MilkyWayAbout = {
      milkyway_version:     "1.0",
      name:                 config.name,
      description:          config.description,
      wallet:               config.wallet,
      max_deadline_seconds: config.max_deadline_seconds || 30,
      capabilities:         config.capabilities,
    };
    res.json(about);
  });

  app.post("/execute", async (req, res) => {
    const capabilityName =
      req.body?.task?.capability || Object.keys(config.capabilities)[0];
    const capability = config.capabilities[capabilityName];

    if (!capability) {
      return buildExecuteHandler(config, handlers)(req, res);
    }

    requirePayment(config.wallet, capability.pricing, devMode)(
      req, res,
      () => buildExecuteHandler(config, handlers)(req, res)
    );
  });

  // ── Graceful shutdown ──────────────────────────────────────────────────────

  function setupGracefulShutdown(server: ReturnType<Express["listen"]>) {
    const DRAIN_TIMEOUT_MS = 30_000;

    async function shutdown(signal: string) {
      console.log(`\n[${config.name}] ${signal} received — shutting down gracefully`);
      isShuttingDown = true;
      server.close();

      const start = Date.now();
      while (inFlightCount > 0) {
        if (Date.now() - start > DRAIN_TIMEOUT_MS) {
          console.warn(`[${config.name}] Drain timeout — ${inFlightCount} request(s) still in flight. Forcing exit.`);
          break;
        }
        console.log(`[${config.name}] Draining — ${inFlightCount} request(s) in flight...`);
        await new Promise((r) => setTimeout(r, 500));
      }

      console.log(`[${config.name}] Shutdown complete`);
      process.exit(0);
    }

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT",  () => shutdown("SIGINT"));
  }

  return {
    app,
    listen: (port: number, callback?: () => void) => {
      const server = app.listen(port, callback || (() => {
        logStartup(config.name, port, Object.keys(config.capabilities));
      }));
      setupGracefulShutdown(server);
    },
  };
}
