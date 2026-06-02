import inquirer from "inquirer";

export interface ScaffoldAnswers {
  name:           string;
  description:    string;
  category:       string;
  pricingModel:   string;
  price:          string;
  capability:     string;
  packageManager: string;
  directory:      string;
}

export async function runPrompts(): Promise<ScaffoldAnswers> {
  console.log();

  const answers = await inquirer.prompt([
    {
      type:     "input",
      name:     "name",
      message:  "Agent name:",
      validate: (v: string) => v.trim().length > 0 || "Name is required"
    },
    {
      type:     "input",
      name:     "description",
      message:  "Description:",
      validate: (v: string) => v.trim().length > 0 || "Description is required"
    },
    {
      type:    "list",
      name:    "category",
      message: "Category:",
      choices: ["DEFI", "DATA", "TRADING", "PRODUCTIVITY", "UTILITY", "SECURITY"]
    },
    {
      type:    "list",
      name:    "pricingModel",
      message: "Pricing model:",
      choices: [
        { name: "Per job",   value: "per_job"   },
        { name: "Per day",   value: "per_day"   },
        { name: "Per month", value: "per_month" },
        { name: "Free",      value: "free"      }
      ]
    },
    {
      type:     "input",
      name:     "price",
      message:  "Price (USDC):",
      default:  "1.00",
      when:     (a: ScaffoldAnswers) => a.pricingModel !== "free",
      validate: (v: string) => !isNaN(parseFloat(v)) || "Must be a number"
    },
    {
      type:     "input",
      name:     "capability",
      message:  "First capability name:",
      default:  "run",
      validate: (v: string) => /^[a-z_]+$/.test(v) || "Use lowercase letters and underscores"
    },
    {
      type:    "list",
      name:    "packageManager",
      message: "Package manager:",
      choices: ["npm", "pnpm", "yarn"]
    },
    {
      type:    "input",
      name:    "directory",
      message: "Directory:",
      default: (a: ScaffoldAnswers) =>
        a.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
    }
  ]);

  // Default price for free agents
  if (!answers.price) answers.price = "0";

  return answers as ScaffoldAnswers;
}
