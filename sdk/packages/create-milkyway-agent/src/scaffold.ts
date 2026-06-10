import fs from "fs";
import path from "path";
import Handlebars from "handlebars";
import { ScaffoldAnswers } from "./prompts";

const TEMPLATES_DIR = path.join(__dirname, "templates");

export function scaffold(answers: ScaffoldAnswers): string {
  const dir = path.resolve(process.cwd(), answers.directory);

  if (fs.existsSync(dir)) {
    throw new Error(`Directory already exists: ${dir}`);
  }

  fs.mkdirSync(dir, { recursive: true });
  fs.mkdirSync(path.join(dir, "src"));

  const isJs = answers.language === "JavaScript";

  const files: Record<string, string> = {
    "agent.json":   renderTemplate("agent.json.hbs",     answers),
    "Dockerfile":   renderTemplate(isJs ? "Dockerfile.js.hbs"    : "Dockerfile.hbs",    answers),
    "package.json": renderTemplate(isJs ? "package.json.js.hbs"  : "package.json.hbs",  answers),
    ".env.example": renderTemplate("dotenv.example.hbs",  answers),
    ".gitignore":   renderTemplate(isJs ? "gitignore.js.hbs"     : "gitignore.hbs",     answers),
    "README.md":    renderTemplate(isJs ? "README.md.js.hbs"     : "README.md.hbs",     answers),
    ...(isJs
      ? { "src/index.js": renderTemplate("index.js.hbs", answers) }
      : {
          "src/index.ts":  renderTemplate("index.ts.hbs",      answers),
          "tsconfig.json": renderTemplate("tsconfig.json.hbs", answers),
        }
    ),
  };

  for (const [filename, content] of Object.entries(files)) {
    const filePath = path.join(dir, filename);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, "utf8");
  }

  return dir;
}

function renderTemplate(templateFile: string, data: ScaffoldAnswers): string {
  const templatePath = path.join(TEMPLATES_DIR, templateFile);
  const source = fs.readFileSync(templatePath, "utf8");
  const template = Handlebars.compile(source);
  return template({
    ...data,
    categoryUpper: data.category.toUpperCase()
  });
}
