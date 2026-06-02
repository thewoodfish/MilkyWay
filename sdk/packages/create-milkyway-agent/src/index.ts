#!/usr/bin/env node
import chalk from "chalk";
import ora from "ora";
import { execSync } from "child_process";
import { runPrompts } from "./prompts";
import { scaffold } from "./scaffold";

async function main() {
  console.log(chalk.bold("\n✦ Create MilkyWay Agent\n"));
  console.log("Build an AI agent. Publish it. Earn USDC.\n");

  const answers = await runPrompts();

  const spinner = ora("Scaffolding project").start();
  let dir: string;
  try {
    dir = scaffold(answers);
    spinner.succeed("Project created");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    spinner.fail(msg);
    process.exit(1);
  }

  const install = ora("Installing dependencies").start();
  try {
    execSync(`cd "${dir}" && ${answers.packageManager} install`, { stdio: "pipe" });
    install.succeed("Dependencies installed");
  } catch {
    install.warn("Dependency install failed — run manually");
  }

  console.log(chalk.bold(chalk.green("\n✓ Ready!\n")));
  console.log(chalk.bold("Next steps:\n"));
  console.log(`  cd ${answers.directory}`);
  console.log(`  cp .env.example .env`);
  console.log(chalk.gray("  # Fill in AGENT_WALLET_ADDRESS and API keys"));
  console.log();
  console.log(`  npm run dev`);
  console.log(chalk.gray("  # Agent running at http://localhost:3000"));
  console.log();
  console.log(`  npm run register`);
  console.log(chalk.gray("  # Go live on MilkyWay\n"));
  console.log("Docs: usemilkyway.com/docs\n");
}

main().catch(console.error);
