import chalk from "chalk";
import { spawn } from "child_process";
import { config as loadDotenv } from "dotenv";
import { loadConfig } from "../utils/config";

export async function devCommand(options: {
  port?:  string;
  config: string;
  entry:  string;
}) {
  // Load .env so PORT (and other vars) are available before spawning
  loadDotenv();

  // Priority: --port flag > PORT in .env > 3000
  const port = options.port ?? process.env.PORT ?? "3000";

  const config = loadConfig(options.config);

  console.log(chalk.bold(`\n✦ MilkyWay Dev Mode\n`));
  console.log(`Agent:    ${config.name}`);
  console.log(`Port:     ${port}`);
  console.log(`Payment:  ${chalk.yellow("BYPASSED")}\n`);

  const caps = Object.entries(config.capabilities);
  console.log(`Capabilities (${caps.length}):`);
  for (const [name, cap] of caps) {
    const inputs  = Object.keys(cap.input_schema).join(", ");
    const outputs = Object.keys(cap.output_schema).join(", ");
    console.log(
      `  ${chalk.blue(name)}  ${cap.pricing.amount} USDC  ${inputs} → ${outputs}`
    );
  }
  console.log();

  const child = spawn(
    "npx",
    ["tsx", "watch", options.entry],
    {
      env: {
        ...process.env,
        MILKYWAY_DEV_MODE: "true",
        PORT: port
      },
      stdio: "inherit"
    }
  );

  child.on("error", (err) => {
    console.error(chalk.red(`Failed to start: ${err.message}`));
    console.error("Make sure tsx is installed: npm install -D tsx");
    process.exit(1);
  });

  process.on("SIGINT", () => {
    child.kill();
    process.exit(0);
  });
}
