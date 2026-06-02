import { createAgent } from "@usemilkyway/agent-sdk";
import dotenv from "dotenv";
dotenv.config();

const PORT   = parseInt(process.env.PORT ?? "3001", 10);
const WALLET = process.env.AGENT_WALLET ?? "";

const { listen } = createAgent(
  {
    milkyway_version:     "1.0",
    name:                 "Hello Agent",
    description:          "A simple hello world agent. Greets any input name.",
    wallet:               WALLET,
    max_deadline_seconds: 5,
    capabilities: {
      greet: {
        description: "Greets a person by name",
        pricing: {
          model:    "per_job",
          amount:   "0.01",
          currency: "USDC",
        },
        input_schema: {
          name: {
            type:        "string",
            required:    true,
            description: "Name to greet",
          },
        },
        output_schema: {
          greeting: {
            type:        "string",
            description: "The greeting message",
          },
          timestamp: {
            type:        "number",
            description: "Unix timestamp of greeting",
          },
        },
      },
    },
  },

  {
    greet: async ({ name }) => {
      const who = (name as string) || "World";
      return {
        greeting:  `Hello, ${who}! Welcome to MilkyWay.`,
        timestamp: Math.floor(Date.now() / 1000),
      };
    },
  }
);

listen(PORT);
