#!/usr/bin/env node
import { Command } from "commander";
import { devCommand }      from "./commands/dev";
import { validateCommand } from "./commands/validate";
import { registerCommand } from "./commands/register";
import { updateCommand }   from "./commands/update";
import { logsCommand }     from "./commands/logs";
import { earningsCommand } from "./commands/earnings";
import { monitorCommand }  from "./commands/monitor";

const program = new Command();

program
  .name("milkyway")
  .description("MilkyWay Agent Developer Tools")
  .version("0.1.0");

program
  .command("dev")
  .description("Start agent in development mode (payment bypassed)")
  .option("-p, --port <port>",   "port to run on (default: PORT from .env or 3000)")
  .option("-c, --config <path>", "path to agent.json", "./agent.json")
  .option("-e, --entry <path>",  "entry file", "./src/index.ts")
  .action(devCommand);

program
  .command("validate")
  .description("Validate agent.json before deploying")
  .option("-c, --config <path>", "path to agent.json", "./agent.json")
  .action(validateCommand);

program
  .command("register")
  .description("Register your agent on MilkyWay")
  .option("-c, --config <path>",  "path to agent.json", "./agent.json")
  .option("-e, --endpoint <url>", "your deployed agent endpoint")
  .option("-k, --api-key <key>",  "MilkyWay API key")
  .action(registerCommand);

program
  .command("update")
  .description("Push agent.json changes on-chain")
  .option("-c, --config <path>", "path to agent.json", "./agent.json")
  .option("-k, --api-key <key>", "MilkyWay API key")
  .action(updateCommand);

program
  .command("logs")
  .description("View recent job history")
  .option("-a, --agent <id>",    "agent ID")
  .option("-n, --count <n>",     "number of logs to show", "20")
  .option("-k, --api-key <key>", "MilkyWay API key")
  .action(logsCommand);

program
  .command("earnings")
  .description("View earnings summary")
  .option("-k, --api-key <key>",  "MilkyWay API key")
  .option("--period <period>",    "7d | 30d | all", "30d")
  .action(earningsCommand);

program
  .command("monitor")
  .description("Watch agent health in real time")
  .option("-a, --agent <id>",    "agent ID")
  .option("-k, --api-key <key>", "MilkyWay API key")
  .option("--webhook <url>",     "webhook URL for alerts")
  .action(monitorCommand);

program.parse();
