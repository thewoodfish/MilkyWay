import chalk from "chalk";
import ora from "ora";
import { loadConfig, computeMetadataHash } from "../utils/config";
import { MilkyWayAPI } from "../utils/api";

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

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

  spinner = ora("Reading /about schema").start();
  try {
    const res = await fetch(`${endpoint.replace(/\/$/, "")}/about`);
    const about = await res.json() as Record<string, unknown>;
    if (!about.milkyway_version) throw new Error("Missing milkyway_version");
    if (!about.capabilities) throw new Error("Missing capabilities");
    spinner.succeed("/about schema valid — builder compatible");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    spinner.warn(`/about not found (${msg}) — agent will not be available in the builder`);
  }

  spinner = ora("Computing metadata hash").start();
  const hash = computeMetadataHash(config, endpoint);
  spinner.succeed(`Hash: ${hash.slice(0, 18)}...`);

  spinner = ora("Saving profile to MilkyWay").start();
  let profileId: string;
  try {
    const result = await api.preRegister({ config, endpoint, metadataHash: hash }) as {
      profileId:      string;
      builderReady:   boolean;
    };
    profileId = result.profileId;
    spinner.succeed("Profile saved");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    spinner.fail(`Failed to save profile: ${msg}`);
    process.exit(1);
  }

  const frontendBase = process.env.MILKYWAY_API_URL?.replace("/api", "") || "https://usemilkyway.com";

  console.log(chalk.bold("\nOne step remaining: stake 0.01 ETH to mint your agent NFT.\n"));
  console.log("Sign the transaction in your browser:");
  console.log(chalk.blue(`→ ${frontendBase}/stake?profileId=${profileId}&hash=${hash}\n`));

  spinner = ora("Waiting for on-chain confirmation").start();
  let confirmed = false;
  let attempts  = 0;

  while (!confirmed && attempts < 120) {
    await sleep(3000);
    attempts++;
    try {
      const status = await api.getStakeStatus(profileId) as { staked: boolean; txHash?: string };
      if (status.staked) {
        confirmed = true;
        spinner.succeed(`Stake confirmed — tx: ${status.txHash?.slice(0, 20)}...`);
      }
    } catch {
      // keep polling
    }
  }

  if (!confirmed) {
    spinner.fail("Timed out waiting for stake. Run register again after staking.");
    process.exit(1);
  }

  console.log(chalk.bold(chalk.green("\n✓ Agent is live on MilkyWay\n")));
  console.log(`  ${frontendBase}/agents\n`);

  const tweetUrl =
    `https://twitter.com/intent/tweet?text=` +
    encodeURIComponent(`Just deployed "${config.name}" on @MilkyWayAI\n\nusemilkyway.com`);
  console.log("Share it:");
  console.log(chalk.blue(`  ${tweetUrl}\n`));
}
