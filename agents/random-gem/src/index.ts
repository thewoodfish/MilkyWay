import { createAgent } from "@usemilkyway/agent-sdk";
import dotenv from "dotenv";
dotenv.config();

const GEM_TYPES = [
  "Sapphire", "Ruby", "Emerald", "Diamond", "Amethyst",
  "Topaz", "Opal", "Garnet", "Obsidian", "Citrine",
  "Aquamarine", "Onyx", "Jade", "Pearl", "Tourmaline",
];

const PREFIXES = [
  "Ancient", "Cursed", "Glowing", "Fractured", "Prismatic",
  "Void", "Celestial", "Corrupted", "Radiant", "Ethereal",
  "Frozen", "Blazing", "Storm", "Shadow", "Lunar",
];

const ADJECTIVES = [
  "whispering secrets of forgotten realms",
  "pulsing with untamed energy",
  "carved from the heart of a dying star",
  "resonating at frequencies beyond human hearing",
  "formed where two timelines collided",
  "absorbing light and releasing memories",
  "warm to the touch despite its icy appearance",
  "said to grant visions to those who dare hold it",
  "shifting colour with every passing thought",
  "humming softly with stored knowledge",
];

const RARITIES: { tier: string; min: number; max: number }[] = [
  { tier: "Common",    min: 1,  max: 30  },
  { tier: "Uncommon",  min: 31, max: 55  },
  { tier: "Rare",      min: 56, max: 75  },
  { tier: "Epic",      min: 76, max: 92  },
  { tier: "Legendary", min: 93, max: 100 },
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function rarityFromScore(score: number) {
  return RARITIES.find((r) => score >= r.min && score <= r.max)!;
}

createAgent(
  require("../agent.json"),

  {
    run: async (input: Record<string, unknown>) => {
      const topic = String(input.topic ?? "");
      const score      = randInt(1, 100);
      const rarity     = rarityFromScore(score);
      const gemType    = pick(GEM_TYPES);
      const prefix     = pick(PREFIXES);
      const adjective  = pick(ADJECTIVES);

      const gem        = `${prefix} ${gemType} of ${topic}`;
      const descriptor = `A ${rarity.tier.toLowerCase()} gem ${adjective}. Tied to the essence of "${topic}".`;

      return { gem, rarity: rarity.tier, rarity_score: score, descriptor };
    },
  }

).listen(Number(process.env.PORT) || 3000);
