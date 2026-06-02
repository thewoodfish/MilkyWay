import chalk from "chalk";
import ora from "ora";
import { loadConfig, computeMetadataHash } from "../utils/config";
import { MilkyWayAPI } from "../utils/api";

export async function updateCommand(options: {
  config: string;
  apiKey: string;
}) {
  const apiKey = options.apiKey || process.env.MILKYWAY_API_KEY;
  if (!apiKey) {
    console.log(chalk.red("✗ API key required.\n"));
    process.exit(1);
  }

  const agentId = process.env.MILKYWAY_AGENT_ID;
  if (!agentId) {
    console.log(chalk.red("✗ MILKYWAY_AGENT_ID not set in environment.\n"));
    process.exit(1);
  }

  const endpoint = process.env.AGENT_ENDPOINT;
  if (!endpoint) {
    console.log(chalk.red("✗ AGENT_ENDPOINT not set in environment.\n"));
    process.exit(1);
  }

  const api = new MilkyWayAPI(apiKey);

  console.log(chalk.bold("\n✦ Updating Agent on MilkyWay\n"));

  let spinner = ora("Loading agent.json").start();
  const config = loadConfig(options.config);
  spinner.succeed(`Loaded: ${config.name}`);

  spinner = ora("Computing metadata hash").start();
  const hash = computeMetadataHash(config, endpoint);
  spinner.succeed(`Hash: ${hash.slice(0, 18)}...`);

  spinner = ora("Pushing update").start();
  try {
    await api.updateAgent(Number(agentId), { config, newMetadataHash: hash });
    spinner.succeed("Agent updated");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    spinner.fail(`Update failed: ${msg}`);
    process.exit(1);
  }

  console.log(chalk.green(`\n✓ Agent #${agentId} updated.\n`));
}
