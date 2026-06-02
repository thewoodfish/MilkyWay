import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { AgentConfig } from "@usemilkyway/agent-sdk";

dotenv.config();

export function loadConfig(configPath: string): AgentConfig {
  const fullPath = path.resolve(process.cwd(), configPath);

  if (!fs.existsSync(fullPath)) {
    throw new Error(`agent.json not found at ${fullPath}`);
  }

  const raw = fs.readFileSync(fullPath, "utf8");

  const resolved = raw.replace(/\$\{([^}]+)\}/g, (_, key: string) => {
    const val = process.env[key];
    if (!val) throw new Error(`Environment variable not set: ${key}`);
    return val;
  });

  return JSON.parse(resolved) as AgentConfig;
}

export function computeMetadataHash(config: AgentConfig, endpoint: string): string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { ethers } = require("ethers");
  const profile = { ...config, endpoint };
  const sorted = JSON.stringify(profile, Object.keys(profile).sort());
  return ethers.keccak256(ethers.toUtf8Bytes(sorted));
}
