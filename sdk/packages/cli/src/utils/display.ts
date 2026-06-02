import chalk from "chalk";

export function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60)    return `${s}s ago`;
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function formatTimeAgoVerbose(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60)    return `${s} seconds ago`;
  if (s < 3600)  return `${Math.floor(s / 60)} minutes ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} hours ago`;
  return `${Math.floor(s / 86400)} days ago`;
}

export function printHeader(title: string) {
  console.log(chalk.bold(`\n✦ ${title}\n`));
}

export function printSuccess(msg: string) {
  console.log(chalk.green(`✓ ${msg}`));
}

export function printError(msg: string) {
  console.log(chalk.red(`✗ ${msg}`));
}

export function printWarning(msg: string) {
  console.log(chalk.yellow(`⚠  ${msg}`));
}
