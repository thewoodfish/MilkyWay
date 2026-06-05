import { Request, Response }                   from "express";
import { AgentConfig, Handlers, ExecuteRequest } from "./types";
import { coerceInput, validateInput, validateOutput } from "./validator";
import { getCachedResult, cacheResult }          from "./idempotency";
import { withTimeout }                           from "./timeout";
import { logRequest }                            from "./logger";
import { CapabilityError, DeadlineError, MilkyWayError } from "./errors";

export function buildExecuteHandler(config: AgentConfig, handlers: Handlers) {
  return async (req: Request, res: Response) => {
    const body      = req.body as ExecuteRequest;
    const jobId     = body.job_id;
    const requestStart = Date.now();
    const devMode   = process.env.MILKYWAY_DEV_MODE === "true";

    if (body.milkyway_version !== "1.0") {
      return res.status(400).json({ error: `Unsupported protocol version: ${body.milkyway_version}` });
    }

    const now = Math.floor(Date.now() / 1000);
    if (body.deadline && now > body.deadline) {
      return res.status(408).json({
        milkyway_version: "1.0",
        job_id:     jobId,
        status:     "expired",
        error:      "Deadline has passed",
        error_type: "deadline",
      });
    }

    // Resolve capability and handler
    const capabilityNames = Object.keys(config.capabilities);
    let capabilityName: string;
    let handler: (input: Record<string, unknown>) => Promise<Record<string, unknown>>;

    try {
      if (typeof handlers === "function") {
        if (capabilityNames.length > 1) throw new CapabilityError("multiple capabilities require named handlers", capabilityNames);
        capabilityName = capabilityNames[0];
        handler = handlers;
      } else {
        capabilityName = body.task?.capability || capabilityNames[0];
        if (!handlers[capabilityName]) throw new CapabilityError(capabilityName, Object.keys(handlers));
        handler = handlers[capabilityName];
      }
    } catch (err: unknown) {
      const e = err as MilkyWayError;
      return res.status(e.statusCode ?? 400).json({
        milkyway_version: "1.0",
        job_id: jobId,
        status: "failed",
        error: e.message,
        error_type: e.type ?? "capability",
      });
    }

    const capabilityDef = config.capabilities[capabilityName];

    // Determine payment status for logging
    const paymentStatus: "verified" | "bypassed" | "free" =
      capabilityDef.pricing.model === "free" || capabilityDef.pricing.amount === "0"
        ? "free"
        : devMode
          ? "bypassed"
          : "verified";

    // Idempotency check
    if (jobId) {
      const cached = getCachedResult(jobId);
      if (cached) {
        logRequest({
          timestamp:  new Date().toISOString(),
          jobId,
          capability: capabilityName,
          payment:    paymentStatus,
          status:     "cached",
          durationMs: Date.now() - requestStart,
        });
        return res.json(cached);
      }
    }

    try {
      // Coerce → validate input
      const coercedInput   = coerceInput(body.task?.input || {}, capabilityDef.input_schema);
      const validatedInput = validateInput(coercedInput, capabilityDef.input_schema);

      // Run handler with deadline timeout
      const rawOutput = await withTimeout(handler(validatedInput), body.deadline);

      // Validate output
      const output = validateOutput(
        rawOutput,
        capabilityDef.output_schema,
        devMode ? "warn" : "strict"
      );

      const response = {
        milkyway_version: "1.0",
        job_id:           jobId,
        status:           "completed" as const,
        output,
        completed_at:     Math.floor(Date.now() / 1000),
      };

      if (jobId) cacheResult(jobId, response);

      logRequest({
        timestamp:  new Date().toISOString(),
        jobId:      jobId || "—",
        capability: capabilityName,
        payment:    paymentStatus,
        status:     "completed",
        durationMs: Date.now() - requestStart,
      });

      res.json(response);

    } catch (err: unknown) {
      const isDeadline = err instanceof DeadlineError;
      const isMilkyWay = err instanceof MilkyWayError;
      const message    = err instanceof Error ? err.message : String(err);
      const status     = isDeadline ? "expired" : "failed";

      logRequest({
        timestamp:  new Date().toISOString(),
        jobId:      jobId || "—",
        capability: capabilityName,
        payment:    paymentStatus,
        status,
        durationMs: Date.now() - requestStart,
        error:      message,
      });

      if (isDeadline) {
        return res.status(408).json({
          milkyway_version: "1.0",
          job_id:     jobId,
          status:     "expired",
          error:      message,
          error_type: "deadline",
        });
      }

      if (isMilkyWay) {
        return res.status((err as MilkyWayError).statusCode).json({
          milkyway_version: "1.0",
          job_id:     jobId,
          status:     "failed",
          error:      message,
          error_type: (err as MilkyWayError).type,
        });
      }

      res.status(500).json({
        milkyway_version: "1.0",
        job_id:     jobId,
        status:     "failed",
        error:      message,
        error_type: "internal",
      });
    }
  };
}
