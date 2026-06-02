import chalk from "chalk";
import { MilkyWayAPI } from "../utils/api";
import { formatTimeAgo } from "../utils/display";

interface LogEntry {
  executedAt:  string;
  capability?: string;
  amountUsdc?: string;
  status:      string;
  durationMs?: number;
  flowJobId?:  string;
  error?:      string;
}

export async function logsCommand(options: {
  agent:  string;
  count:  string;
  apiKey: string;
}) {
  const apiKey = options.apiKey || process.env.MILKYWAY_API_KEY;
  if (!apiKey) {
    console.log(chalk.red("✗ API key required.\n"));
    process.exit(1);
  }

  const api = new MilkyWayAPI(apiKey);
  const logs = await api.getLogs(Number(options.agent), Number(options.count)) as LogEntry[];

  console.log(chalk.bold(`\nAgent #${options.agent} — last ${options.count} jobs\n`));

  if (!logs.length) {
    console.log(chalk.gray("No jobs yet.\n"));
    return;
  }

  console.log(
    chalk.gray(
      "Time".padEnd(12) +
      "Capability".padEnd(16) +
      "Amount".padEnd(12) +
      "Status".padEnd(10) +
      "Duration".padEnd(10) +
      "Flow"
    )
  );
  console.log(chalk.gray("─".repeat(72)));

  for (const log of logs) {
    const time     = formatTimeAgo(log.executedAt);
    const status   = log.status === "COMPLETED"
      ? chalk.green("✓ done")
      : chalk.red("✗ failed");
    const amount   = log.amountUsdc ? `${log.amountUsdc} USDC` : "—";
    const duration = log.durationMs ? `${(log.durationMs / 1000).toFixed(1)}s` : "—";
    const flow     = log.flowJobId
      ? chalk.gray(`Flow ${log.flowJobId.slice(0, 10)}...`)
      : "";

    console.log(
      time.padEnd(12) +
      (log.capability || "—").padEnd(16) +
      amount.padEnd(12) +
      status.padEnd(18) +
      duration.padEnd(10) +
      flow
    );

    if (log.error) {
      console.log(chalk.red(`  └ ${log.error}`));
    }
  }
  console.log();
}
