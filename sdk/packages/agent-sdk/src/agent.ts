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

// Resolves ${ENV_VAR} placeholders in agent.json values at startup
function resolveEnvVars(config: AgentConfig): AgentConfig {
  const json     = JSON.stringify(config);
  const resolved = json.replace(
    /\$\{([^}]+)\}/g,
    (match, key) => {
      const val = process.env[key];
      if (!val) {
        console.warn(
          `[MilkyWay SDK] Warning: environment variable "${key}" ` +
          `referenced in agent.json is not set`
        );
        return match;
      }
      return val;
    }
  );
  return JSON.parse(resolved) as AgentConfig;
}

export function createAgent(
  config:   AgentConfig,
  handlers: Handlers,
  options:  CreateAgentOptions = {}
): AgentInstance {
  const resolvedConfig = resolveEnvVars(config);
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
    res.json({ name: resolvedConfig.name, version: "1.0.0", status: "ok", ...(devMode && { devMode: true }) });
  });

  app.get("/about", (_req, res) => {
    const about: MilkyWayAbout = {
      milkyway_version:     "1.0",
      name:                 resolvedConfig.name,
      description:          resolvedConfig.description,
      wallet:               resolvedConfig.wallet,
      max_deadline_seconds: resolvedConfig.max_deadline_seconds || 30,
      capabilities:         resolvedConfig.capabilities,
    };
    res.json(about);
  });

  app.post("/execute", async (req, res) => {
    const capabilityName =
      req.body?.task?.capability || Object.keys(resolvedConfig.capabilities)[0];
    const capability = resolvedConfig.capabilities[capabilityName];

    if (!capability) {
      return buildExecuteHandler(resolvedConfig, handlers)(req, res);
    }

    requirePayment(resolvedConfig.wallet, capability.pricing, devMode)(
      req, res,
      () => buildExecuteHandler(resolvedConfig, handlers)(req, res)
    );
  });

  // ── Graceful shutdown ──────────────────────────────────────────────────────

  function setupGracefulShutdown(server: ReturnType<Express["listen"]>) {
    const DRAIN_TIMEOUT_MS = 30_000;

    async function shutdown(signal: string) {
      console.log(`\n[${resolvedConfig.name}] ${signal} received — shutting down gracefully`);
      isShuttingDown = true;
      server.close();

      const start = Date.now();
      while (inFlightCount > 0) {
        if (Date.now() - start > DRAIN_TIMEOUT_MS) {
          console.warn(`[${resolvedConfig.name}] Drain timeout — ${inFlightCount} request(s) still in flight. Forcing exit.`);
          break;
        }
        console.log(`[${resolvedConfig.name}] Draining — ${inFlightCount} request(s) in flight...`);
        await new Promise((r) => setTimeout(r, 500));
      }

      console.log(`[${resolvedConfig.name}] Shutdown complete`);
      process.exit(0);
    }

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT",  () => shutdown("SIGINT"));
  }

  return {
    app,
    listen: (port: number, callback?: () => void) => {
      const server = app.listen(port, callback || (() => {
        logStartup(resolvedConfig.name, port, Object.keys(resolvedConfig.capabilities));
      }));
      setupGracefulShutdown(server);
    },
  };
}
