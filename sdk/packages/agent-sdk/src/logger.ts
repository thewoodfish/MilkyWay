interface RequestLog {
  timestamp:  string;
  jobId:      string;
  capability: string;
  payment:    "verified" | "bypassed" | "rejected" | "free";
  status:     "completed" | "failed" | "expired" | "cached";
  durationMs: number;
  error?:     string;
}

const isDev     = process.env.NODE_ENV !== "production";
const isDevMode = process.env.MILKYWAY_DEV_MODE === "true";

const C = {
  reset:  "\x1b[0m",
  green:  "\x1b[32m",
  yellow: "\x1b[33m",
  red:    "\x1b[31m",
  blue:   "\x1b[34m",
  grey:   "\x1b[90m",
  bold:   "\x1b[1m",
};

function col(colour: keyof typeof C, text: string): string {
  if (!isDev) return text;
  return `${C[colour]}${text}${C.reset}`;
}

export function logRequest(log: RequestLog): void {
  if (process.env.MILKYWAY_SILENT === "true") return;

  if (isDev) {
    const statusIcon = {
      completed: col("green",  "✓"),
      failed:    col("red",    "✗"),
      expired:   col("yellow", "⏱"),
      cached:    col("blue",   "⚡"),
    }[log.status];

    const paymentLabel = {
      verified: col("green",  "paid"),
      bypassed: col("yellow", "dev"),
      rejected: col("red",    "rejected"),
      free:     col("grey",   "free"),
    }[log.payment];

    const duration = log.durationMs < 1000
      ? `${log.durationMs}ms`
      : `${(log.durationMs / 1000).toFixed(1)}s`;

    let line =
      col("grey", log.timestamp.split("T")[1].split(".")[0]) + "  " +
      statusIcon + "  " +
      col("bold", log.capability.padEnd(20)) +
      paymentLabel.padEnd(12) +
      col("grey", duration.padEnd(10)) +
      col("grey", log.jobId.slice(0, 8) + "...");

    if (log.error) line += "\n   " + col("red", `└ ${log.error}`);

    console.log(line);
  } else {
    console.log(JSON.stringify({
      level: log.status === "failed" || log.status === "expired" ? "error" : "info",
      ...log,
    }));
  }
}

export function logStartup(name: string, port: number, capabilities: string[]): void {
  if (process.env.MILKYWAY_SILENT === "true") return;

  if (isDev) {
    console.log(col("bold", `\n✦ ${name}`));
    console.log(`  Port:         ${col("blue", String(port))}`);
    console.log(`  Capabilities: ${capabilities.map((cap) => col("blue", cap)).join(", ")}`);
    console.log(`  Payment:      ${isDevMode
      ? col("yellow", "DEV MODE — bypassed")
      : col("green",  "enabled (x402)")
    }`);
    console.log();
    console.log(col("grey", "time       status  capability           payment     duration   job"));
    console.log(col("grey", "─".repeat(72)));
  } else {
    console.log(JSON.stringify({ level: "info", event: "startup", name, port, capabilities }));
  }
}

export function logError(context: string, err: Error): void {
  if (process.env.MILKYWAY_SILENT === "true") return;
  if (isDev) {
    console.error(col("red", `[error] ${context}: ${err.message}`));
  } else {
    console.error(JSON.stringify({ level: "error", context, error: err.message, stack: err.stack }));
  }
}
