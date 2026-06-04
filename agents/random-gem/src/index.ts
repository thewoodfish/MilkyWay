import "dotenv/config";
import { createAgent } from "@usemilkyway/agent-sdk";

const GEMS = [
  "Ruby", "Emerald", "Sapphire", "Diamond", "Amethyst",
  "Topaz", "Opal", "Garnet", "Aquamarine", "Onyx",
  "Jade", "Peridot", "Tourmaline", "Tanzanite", "Citrine",
];

const RARITIES = ["Common", "Uncommon", "Rare", "Epic", "Legendary"];
const QUALITIES = ["Flawless", "Fine", "Good", "Fair", "Rough"];

const agent = createAgent(
  {
    milkyway_version: "1.0",
    name: "Random Gem",
    description: "Generates a random gem with rarity and quality attributes. A simple example of a paid MilkyWay agent.",
    wallet: process.env.AGENT_WALLET_ADDRESS!,
    max_deadline_seconds: 5,
    capabilities: {
      generate: {
        description: "Generate a random gem.",
        pricing: {
          model: "per_job",
          amount: process.env.NODE_ENV === "production" ? "0.01" : "0.001",
          currency: "USDC",
        },
        input_schema: {
          seed: { type: "number", required: false, description: "Optional seed for deterministic output" },
        },
        output_schema: {
          gem:     { type: "string", description: "Gem name" },
          rarity:  { type: "string", description: "Rarity tier" },
          quality: { type: "string", description: "Quality grade" },
          value:   { type: "number", description: "Estimated value in USDC" },
        },
      },
    },
  },
  async (input) => {
    const seed = typeof input.seed === "number" ? input.seed : Math.random() * 1e9;
    const pick = (arr: string[], s: number) => arr[Math.floor((Math.sin(s) * 0.5 + 0.5) * arr.length)];

    const gem     = pick(GEMS,      seed);
    const rarity  = pick(RARITIES,  seed * 1.7);
    const quality = pick(QUALITIES, seed * 3.1);
    const rarityMultiplier = { Common: 1, Uncommon: 3, Rare: 10, Epic: 50, Legendary: 250 }[rarity] ?? 1;
    const value   = parseFloat((Math.abs(Math.sin(seed * 2.3)) * rarityMultiplier * 10).toFixed(2));

    return { gem, rarity, quality, value };
  },
  { devMode: process.env.MILKYWAY_DEV_MODE === "true" }
);

const PORT = parseInt(process.env.PORT ?? "3003");
agent.listen(PORT);
