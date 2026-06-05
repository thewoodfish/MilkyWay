import inquirer from "inquirer";

export interface ScaffoldAnswers {
  name:           string;
  description:    string;
  category:       string;
  pricingModel:   string;  // always "per_job"
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
      choices: ["DeFi", "Trading", "Data", "Productivity", "Utility", "Security", "Gaming", "Social"]
    },
    {
      type:     "input",
      name:     "price",
      message:  "Price (USDC):",
      default:  "1.00",
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

  answers.pricingModel = "per_job";

  return answers as ScaffoldAnswers;
}
