import chalk from "chalk";
import { loadConfig } from "../utils/config";
import { AgentConfig, FieldDef } from "@usemilkyway/agent-sdk";

export async function validateCommand(options: { config: string }) {
  console.log(chalk.bold("\nValidating agent.json...\n"));

  const errors:   string[] = [];
  const warnings: string[] = [];

  let config: AgentConfig;
  try {
    config = loadConfig(options.config);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(chalk.red(`✗ Failed to load config: ${msg}`));
    process.exit(1);
  }

  const required = ["milkyway_version", "name", "description", "wallet", "capabilities"];
  for (const field of required) {
    if (!(config as unknown as Record<string, unknown>)[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  if (config.wallet && !/^0x[0-9a-fA-F]{40}$/.test(config.wallet)) {
    errors.push("wallet is not a valid Ethereum address");
  }

  if (config.capabilities) {
    const caps = Object.entries(config.capabilities);

    if (caps.length === 0) {
      errors.push("At least one capability is required");
    }

    for (const [name, cap] of caps) {
      if (!cap.description) {
        warnings.push(`capability "${name}": missing description`);
      }

      if (!cap.pricing) {
        errors.push(`capability "${name}": missing pricing`);
      } else {
        if (!["per_job", "per_day", "per_month", "free"].includes(cap.pricing.model)) {
          errors.push(`capability "${name}": invalid pricing model`);
        }
        if (cap.pricing.currency !== "USDC") {
          errors.push(`capability "${name}": currency must be USDC`);
        }
      }

      if (!cap.input_schema || Object.keys(cap.input_schema).length === 0) {
        warnings.push(`capability "${name}": input_schema is empty`);
      } else {
        for (const [field, def] of Object.entries(cap.input_schema)) {
          if (!(def as FieldDef).description) {
            warnings.push(`capability "${name}" input "${field}": missing description`);
          }
        }
      }

      if (!cap.output_schema || Object.keys(cap.output_schema).length === 0) {
        errors.push(`capability "${name}": output_schema is required`);
      } else {
        for (const [field, def] of Object.entries(cap.output_schema)) {
          if (!(def as FieldDef).description) {
            warnings.push(`capability "${name}" output "${field}": missing description`);
          }
        }
      }
    }
  }

  if (!config.max_deadline_seconds) {
    warnings.push("max_deadline_seconds not set (recommended: 30)");
  }

  if (errors.length === 0 && warnings.length === 0) {
    console.log(chalk.green("✓ agent.json is valid. Ready to register.\n"));
    return;
  }

  for (const w of warnings) {
    console.log(chalk.yellow(`⚠  ${w}`));
  }
  for (const e of errors) {
    console.log(chalk.red(`✗  ${e}`));
  }

  if (errors.length > 0) {
    console.log(chalk.red(`\n${errors.length} error(s). Fix before registering.\n`));
    process.exit(1);
  } else {
    console.log(chalk.yellow(`\n${warnings.length} warning(s). Review before registering.\n`));
  }
}
