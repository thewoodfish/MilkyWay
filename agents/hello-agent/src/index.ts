import "dotenv/config";
import { createAgent } from "@usemilkyway/agent-sdk";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const config = require("../agent.json");

createAgent(
  { ...config, wallet: process.env.AGENT_WALLET_ADDRESS! },

  async (input) => ({
    greeting: `Hello, ${input.name}! Welcome to MilkyWay.`,
    timestamp: Math.floor(Date.now() / 1000),
  }),

  { devMode: process.env.MILKYWAY_DEV_MODE === "true" }

).listen(parseInt(process.env.PORT ?? "3001"));
