import "dotenv/config";
import { createAgent } from "@usemilkyway/agent-sdk";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const config = require("../agent.json");

const GEMS = [
  "Ruby", "Emerald", "Sapphire", "Diamond", "Amethyst",
  "Topaz", "Opal", "Garnet", "Aquamarine", "Onyx",
  "Jade", "Peridot", "Tourmaline", "Tanzanite", "Citrine",
];
const RARITIES = ["Common", "Uncommon", "Rare", "Epic", "Legendary"];
const QUALITIES = ["Flawless", "Fine", "Good", "Fair", "Rough"];

createAgent(
  { ...config, wallet: process.env.AGENT_WALLET_ADDRESS! },

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

).listen(parseInt(process.env.PORT ?? "3003"));
