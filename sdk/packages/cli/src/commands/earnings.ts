import chalk from "chalk";
import { MilkyWayAPI } from "../utils/api";
import { formatTimeAgoVerbose } from "../utils/display";

interface EarningsResponse {
  totalUsdc:     string;
  totalJobs:     number;
  lastPaymentAt?: string;
  perAgent?: Array<{
    name:        string;
    earnedUsdc:  string;
    jobs:        number;
  }>;
}

export async function earningsCommand(options: {
  apiKey: string;
  period: string;
}) {
  const apiKey = options.apiKey || process.env.MILKYWAY_API_KEY;
  if (!apiKey) {
    console.log(chalk.red("✗ API key required.\n"));
    process.exit(1);
  }

  const api      = new MilkyWayAPI(apiKey);
  const earnings = await api.getEarnings(options.period) as EarningsResponse;

  const periodLabel: Record<string, string> = {
    "7d":  "Last 7 days",
    "30d": "Last 30 days",
    "all": "All time"
  };

  console.log(chalk.bold(`\nEarnings — ${periodLabel[options.period] || options.period}\n`));

  console.log(chalk.bold("Total earned:  ") + chalk.green(`${earnings.totalUsdc} USDC`));
  console.log(`Jobs completed: ${earnings.totalJobs}`);
  console.log();

  if (earnings.perAgent?.length) {
    console.log(chalk.bold("By agent:\n"));

    for (const agent of earnings.perAgent) {
      const total = parseFloat(earnings.totalUsdc);
      const share = total > 0
        ? Math.round((parseFloat(agent.earnedUsdc) / total) * 20)
        : 0;
      const bar = "█".repeat(share);
      console.log(
        `  ${agent.name.padEnd(24)}` +
        chalk.green(`${agent.earnedUsdc.padEnd(12)}USDC`) +
        chalk.blue(`  ${bar}  `) +
        chalk.gray(`${agent.jobs} jobs`)
      );
    }
    console.log();
  }

  if (earnings.lastPaymentAt) {
    console.log(chalk.gray(`Last payment: ${formatTimeAgoVerbose(earnings.lastPaymentAt)}`));
  }
  console.log();
}
