import { z } from "zod";
import { AgentSchema, FieldDef } from "./types";
import { ValidationError, InternalError } from "./errors";

// ── Input coercion ────────────────────────────────────────────────────────────

export function coerceInput(
  input:  Record<string, unknown>,
  schema: AgentSchema
): Record<string, unknown> {
  const coerced: Record<string, unknown> = { ...input };

  for (const [field, def] of Object.entries(schema)) {
    const value = coerced[field];
    if (value === undefined || value === null) continue;

    const targetType = (def as FieldDef).type;
    const sourceType = Array.isArray(value) ? "array" : typeof value;

    if (sourceType === targetType) continue;

    try {
      coerced[field] = coerce(value, sourceType, targetType, field);
    } catch (err: unknown) {
      throw new ValidationError((err as Error).message);
    }
  }

  return coerced;
}

function coerce(value: unknown, sourceType: string, targetType: string, field: string): unknown {
  if (sourceType === "string" && targetType === "number") {
    const n = parseFloat(value as string);
    if (isNaN(n)) throw new Error(`Field "${field}": cannot coerce "${value}" to number`);
    return n;
  }
  if (sourceType === "string" && targetType === "boolean") {
    if (value === "true"  || value === "1") return true;
    if (value === "false" || value === "0") return false;
    throw new Error(`Field "${field}": cannot coerce "${value}" to boolean. Use "true", "false", "1", or "0"`);
  }
  if (sourceType === "number" && targetType === "string")  return String(value);
  if (sourceType === "number" && targetType === "boolean") return (value as number) !== 0;
  if (sourceType === "boolean" && targetType === "string") return String(value);
  if (sourceType === "boolean" && targetType === "number") return (value as boolean) ? 1 : 0;

  throw new Error(`Field "${field}": cannot coerce ${sourceType} to ${targetType}`);
}

// ── Input validation ──────────────────────────────────────────────────────────

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
    case "boolean":  return z.boolean();
    case "array":    return z.array(z.unknown());
    case "object":   return z.record(z.unknown());
    default:         return z.unknown();
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
  input:  Record<string, unknown>,
  schema: AgentSchema
): Record<string, unknown> {
  const result = buildZodSchema(schema).safeParse(input);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ");
    throw new ValidationError(issues);
  }
  return result.data as Record<string, unknown>;
}

// ── Output validation ─────────────────────────────────────────────────────────

export function validateOutput(
  output: Record<string, unknown>,
  schema: AgentSchema,
  mode:   "warn" | "strict" = "strict"
): Record<string, unknown> {
  const violations: string[] = [];

  for (const [field, def] of Object.entries(schema)) {
    const value = output[field];
    if (value === undefined) {
      violations.push(`output missing field: "${field}" (expected ${(def as FieldDef).type})`);
      continue;
    }
    const actualType = Array.isArray(value) ? "array" : typeof value;
    if (actualType !== (def as FieldDef).type) {
      violations.push(`output field "${field}": expected ${(def as FieldDef).type}, got ${actualType}`);
    }
  }

  if (violations.length === 0) return output;

  const message = `Output schema violation: ${violations.join("; ")}`;
  if (mode === "warn") {
    console.warn(`[MilkyWay SDK] ⚠️  ${message}`);
    return output;
  }
  throw new InternalError(message);
}
