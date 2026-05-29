import { prisma } from "../lib/db";
import { fetchAbout } from "./about";

export function computeBadgeTier(
  totalJobs: number,
  successRate: number // 0–100
): "NONE" | "BRONZE" | "SILVER" | "GOLD" {
  if (totalJobs >= 1000 && successRate >= 99) return "GOLD";
  if (totalJobs >= 100  && successRate >= 95) return "SILVER";
  return "BRONZE";
}

export interface PingResult {
  success: boolean;
  statusCode?: number;
  responseTimeMs?: number;
  error?: string;
}

export async function verifyEndpoint(endpoint: string): Promise<PingResult> {
  const start = Date.now();
  try {
    const url = `${endpoint.replace(/\/$/, "")}/health`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "MilkyWay-Verifier/1.0" },
    });

    clearTimeout(timeout);
    const responseTimeMs = Date.now() - start;

    if (response.status === 200) {
      return { success: true, statusCode: 200, responseTimeMs };
    }

    return {
      success: false,
      statusCode: response.status,
      responseTimeMs,
      error: `Endpoint returned HTTP ${response.status}`,
    };
  } catch (err: unknown) {
    const e = err as { name?: string; message?: string };
    return {
      success: false,
      responseTimeMs: Date.now() - start,
      error: e.name === "AbortError" ? "Timeout after 5 seconds" : e.message,
    };
  }
}

export async function runVerificationCycle() {
  console.log("Starting verification cycle...");

  const agents = await prisma.agent.findMany({
    where: { active: true },
    select: { id: true, agentId: true, endpoint: true, failedChecks: true },
  });

  for (const agent of agents) {
    const result = await verifyEndpoint(agent.endpoint);

    await prisma.verificationLog.create({
      data: {
        agentId: agent.agentId,
        endpoint: agent.endpoint,
        success: result.success,
        statusCode: result.statusCode ?? null,
        responseTimeMs: result.responseTimeMs ?? null,
      },
    });

    if (result.success) {
      const aboutResult = await fetchAbout(agent.endpoint);

      // Compute badge tier from job history
      const logs = agent.agentId != null
        ? await prisma.verificationLog.findMany({
            where: { agentId: agent.agentId },
            select: { success: true },
          })
        : [];
      const totalJobs = logs.length;
      const successRate = totalJobs > 0
        ? (logs.filter((l) => l.success).length / totalJobs) * 100
        : 0;
      const badgeTier = computeBadgeTier(totalJobs, successRate);

      await prisma.agent.update({
        where: { id: agent.id },
        data: {
          failedChecks: 0,
          verifiedAt: new Date(),
          badgeTier,
          ...(aboutResult.success && {
            aboutSchema: aboutResult.schema as object,
            phase2Ready: true,
            aboutCachedAt: new Date(),
          }),
        },
      });
    } else {
      const newFailedCount = agent.failedChecks + 1;
      await prisma.agent.update({
        where: { id: agent.id },
        data: {
          failedChecks: newFailedCount,
          ...(newFailedCount >= 3 && { badgeTier: "NONE" }),
        },
      });

      if (newFailedCount >= 7) {
        console.warn(`Agent ${agent.agentId} flagged after 7 consecutive failed checks`);
      }
    }
  }

  console.log(`Verification cycle complete. Checked ${agents.length} agents.`);
}
