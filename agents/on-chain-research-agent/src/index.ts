import "dotenv/config";
import { createAgent, ValidationError } from "@usemilkyway/agent-sdk";
import OpenAI from "openai";
import config from "../agent.json";
import type { AgentConfig } from "@usemilkyway/agent-sdk";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const STYLE_INSTRUCTIONS = {
  concise:       "Answer in 2-3 sentences. Be direct. No preamble.",
  detailed:      "Answer in 3-5 sentences with explanation and reasoning.",
  bullet_points: "Answer in 3-5 bullet points. Each point one sentence."
};

const SYSTEM_PROMPT = (style: string, context?: string) => `
You are a knowledgeable DeFi and crypto research agent.
You give accurate, practical, jargon-free answers.

${STYLE_INSTRUCTIONS[style as keyof typeof STYLE_INSTRUCTIONS] || STYLE_INSTRUCTIONS.concise}

At the end of your answer, add exactly two lines:
CONFIDENCE: [high|medium|low]
FOLLOW_UP: [one suggested follow-up question or action]

${context
  ? `Use this context in your answer where relevant:\n${context}`
  : "Answer from general knowledge."}
`.trim();

function parseResponse(raw: string): {
  answer:     string;
  confidence: string;
  follow_up:  string;
} {
  const lines     = raw.trim().split("\n");
  const confLine  = lines.find(l => l.startsWith("CONFIDENCE:"));
  const followLine= lines.find(l => l.startsWith("FOLLOW_UP:"));

  const confidence = confLine
    ? confLine.replace("CONFIDENCE:", "").trim().toLowerCase()
    : "medium";

  const follow_up = followLine
    ? followLine.replace("FOLLOW_UP:", "").trim()
    : "No follow-up suggested.";

  // Answer is everything before the CONFIDENCE line
  const confIndex = lines.findIndex(l => l.startsWith("CONFIDENCE:"));
  const answerLines = confIndex > 0
    ? lines.slice(0, confIndex)
    : lines.filter(l => !l.startsWith("CONFIDENCE:") && !l.startsWith("FOLLOW_UP:"));

  const answer = answerLines.join("\n").trim();

  return {
    answer,
    confidence: ["high", "medium", "low"].includes(confidence)
      ? confidence
      : "medium",
    follow_up
  };
}

createAgent(config as unknown as AgentConfig, {

  research: async (input) => {
    const query   = input.query as string;
    const context = input.context as string | undefined;
    const style   = (input.style as string) ?? "concise";

    if (!process.env.OPENAI_API_KEY) {
      throw new Error(
        "OPENAI_API_KEY is not set. Add it to your .env file."
      );
    }

    // Sanitise query
    const sanitised = query.trim();
    if (sanitised.length < 3) {
      throw new ValidationError("Query must be at least 3 characters.");
    }

    const completion = await openai.chat.completions.create({
      model:      "gpt-4o-mini",
      messages: [
        {
          role:    "system",
          content: SYSTEM_PROMPT(style, context as string | undefined)
        },
        {
          role:    "user",
          content: sanitised
        }
      ],
      max_tokens:  400,
      temperature: 0.3   // low temperature for factual accuracy
    });

    const raw = completion.choices[0].message.content ?? "";
    return parseResponse(raw);
  }

}).listen(Number(process.env.PORT ?? "3000"));