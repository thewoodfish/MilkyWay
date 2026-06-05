export type FieldType =
  | "string"
  | "number"
  | "boolean"
  | "array"
  | "object";

export interface FieldDef {
  type:         string; // FieldType at runtime; string here so JSON imports typecheck
  required?:    boolean;
  description?: string;
  default?:     unknown;
  min?:         number;
  max?:         number;
  minLength?:   number;
  maxLength?:   number;
  enum?:        unknown[];
}

export interface AgentSchema {
  [field: string]: FieldDef;
}

export interface AgentPricing {
  model:    string; // "per_job" in v1; string so JSON imports typecheck
  amount:   string;
  currency: string; // "USDC" in v1; string so JSON imports typecheck
}

export type PermissionType =
  | "READ_WALLET_BALANCE"
  | "ACCESS_EXTERNAL_APIS"
  | "EXECUTE_TRANSACTIONS"
  | "MANAGE_AGENTS";

export interface PermissionDeclaration {
  type:                 PermissionType;
  reason:               string;
  // EXECUTE_TRANSACTIONS only:
  token?:               string;   // "USDC"
  max_per_transaction?: string;
  max_lifetime?:        string;
}

export interface CapabilityDef {
  description:   string;
  permissions?:  PermissionDeclaration[];
  pricing:       AgentPricing;
  input_schema:  AgentSchema;
  output_schema: AgentSchema;
}

export interface AgentConfig {
  milkyway_version:      string;
  name:                  string;
  description:           string;
  wallet:                string;
  max_deadline_seconds?: number;
  capabilities: {
    [capabilityName: string]: CapabilityDef;
  };
}

export type MilkyWayAbout = AgentConfig;

export interface ExecuteRequest {
  milkyway_version: string;
  job_id:           string;
  task: {
    capability?: string;
    input:       Record<string, unknown>;
  };
  deadline: number;
}

export interface ExecuteResponse {
  milkyway_version: string;
  job_id:           string;
  status:           "completed" | "failed" | "expired";
  output?:          Record<string, unknown>;
  error?:           string;
  error_type?:      "validation" | "payment" | "deadline" | "capability" | "internal";
  completed_at?:    number;
}

export type HandlerFn = (input: Record<string, unknown>) => Promise<Record<string, unknown>>;

export type Handlers =
  | HandlerFn
  | { [capabilityName: string]: HandlerFn };
