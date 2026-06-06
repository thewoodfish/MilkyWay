import chalk from "chalk";
import { MilkyWayAPI } from "../utils/api";

interface HealthResponse {
  status:        "live" | "degraded" | "down";
  responseTimeMs?: number;
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

async function sendWebhook(url: string, payload: unknown) {
  try {
    await fetch(url, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(payload)
    });
  } catch {
    // webhook failures are silent
  }
}

export async function monitorCommand(options: {
  agent:    string;
  apiKey:   string;
  webhook?: string;
}) {
  const apiKey = options.apiKey || process.env.MILKYWAY_API_KEY;
  if (!apiKey) {
    console.log(chalk.red("✗ API key required.\n"));
    process.exit(1);
  }

  const agentId = options.agent || process.env.MILKYWAY_AGENT_ID;
  if (!agentId) {
    console.log(chalk.red("✗ Agent ID required. Pass --agent <id> or set MILKYWAY_AGENT_ID in .env\n"));
    process.exit(1);
  }

  const api = new MilkyWayAPI(apiKey);

  console.log(
    chalk.bold(`\nMonitoring Agent #${agentId}`) +
    chalk.gray(" (Ctrl+C to stop)\n")
  );

  let lastStatus: string | null = null;
  let failStreak = 0;

  while (true) {
    const now = new Date().toLocaleTimeString();

    try {
      const health = await api.getHealth(Number(agentId)) as HealthResponse;

      if (health.status === "live") {
        failStreak = 0;
        if (lastStatus !== "live") {
          console.log(chalk.green(`${now}  ✓ Agent is live  (${health.responseTimeMs}ms)`));
          if (lastStatus === "down" && options.webhook) {
            await sendWebhook(options.webhook, {
              event:     "agent_recovered",
              agentId:   agentId,
              timestamp: now
            });
          }
        }
        lastStatus = "live";
      } else {
        failStreak++;
        console.log(
          chalk.red(`${now}  ✗ Health check failed`) +
          chalk.gray(` (${failStreak} in a row)`)
        );

        if (failStreak === 3) {
          console.log(chalk.yellow("  → Badge will downgrade soon"));
          if (options.webhook) {
            await sendWebhook(options.webhook, {
              event:   "agent_degraded",
              agentId: agentId,
              streak:  failStreak
            });
          }
        }

        if (failStreak >= 7) {
          console.log(chalk.red("  → Agent flagged as inactive"));
          if (options.webhook) {
            await sendWebhook(options.webhook, {
              event:   "agent_inactive",
              agentId: agentId,
              streak:  failStreak
            });
          }
        }

        lastStatus = "down";
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(chalk.gray(`${now}  ? Monitor error: ${msg}`));
    }

    await sleep(30_000);
  }
}
