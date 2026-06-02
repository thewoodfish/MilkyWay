import { z } from "zod";
import { AgentSchema, FieldDef } from "./types";
import { ValidationError } from "./errors";

function buildZodType(def: FieldDef): z.ZodTypeAny {
  switch (def.type) {
    case "string": {
      if (def.enum) return z.enum(def.enum as [string, ...string[]]);
      let t = z.string();
      if (def.minLength !== undefined) t = t.min(def.minLength);
      if (def.maxLength !== undefined) t = t.max(def.maxLength);
      return t;
    }
    case "number": {
      let t = z.number();
      if (def.min !== undefined) t = t.min(def.min);
      if (def.max !== undefined) t = t.max(def.max);
      return t;
    }
    case "boolean":
      return z.boolean();
    case "array":
      return z.array(z.unknown());
    case "object":
      return z.record(z.unknown());
    default:
      return z.unknown();
  }
}

function buildZodSchema(schema: AgentSchema): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const [field, def] of Object.entries(schema)) {
    let zodType = buildZodType(def);

    if (!def.required) {
      zodType = zodType.optional();
      if (def.default !== undefined) {
        zodType = (zodType as z.ZodOptional<z.ZodTypeAny>).default(def.default);
      }
    }

    shape[field] = zodType;
  }

  return z.object(shape);
}

export function validateInput(
  input: Record<string, unknown>,
  schema: AgentSchema
): Record<string, unknown> {
  const zodSchema = buildZodSchema(schema);
  const result = zodSchema.safeParse(input);

  if (!result.success) {
    const issues = result.error.issues
      .map(i => `${i.path.join(".")}: ${i.message}`)
      .join(", ");
    throw new ValidationError(issues);
  }

  return result.data as Record<string, unknown>;
}
