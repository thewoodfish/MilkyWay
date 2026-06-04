import "dotenv/config";
import { createAgent } from "@usemilkyway/agent-sdk";

const agent = createAgent(
  {
    milkyway_version: "1.0",
    name: "Hello Agent",
    description: "A simple greeting agent — the reference implementation for MilkyWay.",
    wallet: process.env.AGENT_WALLET_ADDRESS!,
    max_deadline_seconds: 5,
    capabilities: {
      greet: {
        description: "Greets any name and returns a welcome message.",
        pricing: {
          model: "per_job",
          amount: process.env.NODE_ENV === "production" ? "0.01" : "0.001",
          currency: "USDC",
        },
        input_schema: {
          name: { type: "string", required: true, description: "Name to greet" },
        },
        output_schema: {
          greeting:  { type: "string", description: "The greeting message" },
          timestamp: { type: "number", description: "Unix timestamp" },
        },
      },
    },
  },
  async (input) => ({
    greeting:  `Hello, ${input.name}! Welcome to MilkyWay.`,
    timestamp: Math.floor(Date.now() / 1000),
  }),
  { devMode: process.env.MILKYWAY_DEV_MODE === "true" }
);

const PORT = parseInt(process.env.PORT ?? "3001");
agent.listen(PORT);
