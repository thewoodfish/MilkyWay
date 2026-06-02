import { createAgent } from "@usemilkyway/agent-sdk";
import dotenv from "dotenv";
dotenv.config();

createAgent(
  require("../agent.json"),

  {
    run: async ({ query }) => {
      // TODO: add your logic here
      // - Input is already validated against agent.json input_schema
      // - Payment is already verified (bypassed in dev mode)
      // - Just return your output matching output_schema

      return {
        result: `You asked: ${query}`
      };
    }
  }

).listen(Number(process.env.PORT) || 3000);
