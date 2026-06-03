import chalk from "chalk";
import ora from "ora";
import { loadConfig, computeMetadataHash } from "../utils/config";
import { MilkyWayAPI } from "../utils/api";

export async function registerCommand(options: {
  config:   string;
  endpoint: string;
  apiKey:   string;
}) {
  const apiKey = options.apiKey || process.env.MILKYWAY_API_KEY;
  if (!apiKey) {
    console.log(chalk.red("✗ API key required. Get one at usemilkyway.com/settings\n"));
    process.exit(1);
  }

  const endpoint = options.endpoint || process.env.AGENT_ENDPOINT;
  if (!endpoint) {
    console.log(chalk.red("✗ Endpoint required. Pass --endpoint https://your-agent.fly.dev\n"));
    process.exit(1);
  }

  const api = new MilkyWayAPI(apiKey);

  console.log(chalk.bold("\n✦ Registering on MilkyWay\n"));

  let spinner = ora("Loading agent.json").start();
  const config = loadConfig(options.config);
  spinner.succeed(`Loaded: ${config.name}`);

  spinner = ora("Checking endpoint health").start();
  try {
    const res = await fetch(`${endpoint.replace(/\/$/, "")}/health`);
    if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
    spinner.succeed("Endpoint is alive");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    spinner.fail(`Cannot reach endpoint: ${msg}`);
    process.exit(1);
  }

  spinner = ora("Computing metadata hash").start();
  const hash = computeMetadataHash(config, endpoint);
  spinner.succeed(`Hash: ${hash.slice(0, 18)}...`);

  spinner = ora("Registering agent").start();
  let agentId: number;
  let phase2Ready: boolean;
  try {
    const result = await api.preRegister({ config, endpoint, metadataHash: hash }) as {
      profileId:  string;
      agentId:    number;
      phase2Ready: boolean;
    };
    agentId    = result.agentId;
    phase2Ready = result.phase2Ready;
    spinner.succeed(`Agent registered (ID: #${agentId})`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    spinner.fail(`Registration failed: ${msg}`);
    process.exit(1);
  }

  if (phase2Ready) {
    console.log(chalk.green("  ✓ /about detected — agent is Phase 2 ready"));
  } else {
    console.log(chalk.yellow("  ⚠ /about not found — add it to unlock the visual builder"));
  }

  const apiBase = process.env.MILKYWAY_API_URL || "https://usemilkyway.com";
  console.log(chalk.bold(chalk.green("\n✓ Agent is live on MilkyWay\n")));
  console.log(`  ${apiBase}/agents/${agentId}\n`);

  const tweetUrl =
    `https://twitter.com/intent/tweet?text=` +
    encodeURIComponent(
      `Just deployed "${config.name}" on @MilkyWayAI\n\nusemilkyway.com/agents/${agentId}`
    );
  console.log("Share it:");
  console.log(chalk.blue(`  ${tweetUrl}\n`));
}
