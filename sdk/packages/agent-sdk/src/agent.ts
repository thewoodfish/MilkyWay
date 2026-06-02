import express, { Express } from "express";
import { requirePayment } from "./x402";
import { buildExecuteHandler } from "./router";
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

  app.get("/health", (_, res) => {
    res.json({
      name:    config.name,
      version: "1.0.0",
      status:  "ok",
      ...(devMode && { devMode: true })
    });
  });

  app.get("/about", (_, res) => {
    const about: MilkyWayAbout = {
      milkyway_version:     "1.0",
      name:                 config.name,
      description:          config.description,
      wallet:               config.wallet,
      max_deadline_seconds: config.max_deadline_seconds || 30,
      capabilities:         config.capabilities
    };
    res.json(about);
  });

  app.post("/execute", async (req, res) => {
    const capabilityName =
      req.body?.task?.capability ||
      Object.keys(config.capabilities)[0];

    const capability = config.capabilities[capabilityName];

    if (!capability) {
      return buildExecuteHandler(config, handlers)(req, res);
    }

    requirePayment(
      config.wallet,
      capability.pricing,
      devMode
    )(req, res, () => buildExecuteHandler(config, handlers)(req, res));
  });

  return {
    app,
    listen: (port: number, callback?: () => void) => {
      app.listen(port, callback || (() => {
        console.log(`\n✓ ${config.name} running on port ${port}`);
        if (devMode) {
          console.log("✓ Dev mode: payment verification bypassed");
        }
        console.log("\nEndpoints:");
        console.log(`  GET  http://localhost:${port}/health`);
        console.log(`  GET  http://localhost:${port}/about`);
        console.log(`  POST http://localhost:${port}/execute\n`);
      }));
    }
  };
}
