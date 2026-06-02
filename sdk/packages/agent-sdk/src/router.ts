import { Request, Response } from "express";
import { AgentConfig, Handlers, ExecuteRequest } from "./types";
import { validateInput } from "./validator";
import {
  CapabilityError,
  DeadlineError,
  MilkyWayError
} from "./errors";

export function buildExecuteHandler(
  config: AgentConfig,
  handlers: Handlers
) {
  return async (req: Request, res: Response) => {
    const body = req.body as ExecuteRequest;

    if (body.milkyway_version !== "1.0") {
      return res.status(400).json({
        error: `Unsupported protocol version: ${body.milkyway_version}`
      });
    }

    const now = Math.floor(Date.now() / 1000);
    if (body.deadline && now > body.deadline) {
      return res.status(408).json({
        milkyway_version: "1.0",
        job_id:     body.job_id,
        status:     "expired",
        error:      "Deadline has passed",
        error_type: "deadline"
      });
    }

    try {
      const capabilityNames = Object.keys(config.capabilities);
      let capabilityName: string;
      let handler: (input: Record<string, unknown>) => Promise<Record<string, unknown>>;

      if (typeof handlers === "function") {
        if (capabilityNames.length > 1) {
          throw new CapabilityError(
            "multiple capabilities require named handlers",
            capabilityNames
          );
        }
        capabilityName = capabilityNames[0];
        handler = handlers;
      } else {
        capabilityName = body.task?.capability || capabilityNames[0];

        if (!handlers[capabilityName]) {
          throw new CapabilityError(capabilityName, Object.keys(handlers));
        }

        handler = handlers[capabilityName];
      }

      const capabilityDef = config.capabilities[capabilityName];
      if (!capabilityDef) {
        throw new CapabilityError(capabilityName, capabilityNames);
      }

      const validatedInput = validateInput(
        body.task?.input || {},
        capabilityDef.input_schema
      );

      const output = await handler(validatedInput);

      res.json({
        milkyway_version: "1.0",
        job_id:           body.job_id,
        status:           "completed",
        output,
        completed_at: Math.floor(Date.now() / 1000)
      });

    } catch (err: unknown) {
      if (err instanceof DeadlineError) {
        return res.status(408).json({
          milkyway_version: "1.0",
          job_id:     body.job_id,
          status:     "expired",
          error:      err.message,
          error_type: err.type
        });
      }

      if (err instanceof MilkyWayError) {
        return res.status(err.statusCode).json({
          milkyway_version: "1.0",
          job_id:     body.job_id,
          status:     "failed",
          error:      err.message,
          error_type: err.type
        });
      }

      console.error("Agent handler error:", err);
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({
        milkyway_version: "1.0",
        job_id:     body.job_id,
        status:     "failed",
        error:      message,
        error_type: "internal"
      });
    }
  };
}
