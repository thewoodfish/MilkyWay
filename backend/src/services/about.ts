export interface CapabilityDef {
  description:   string;
  pricing:       { model: string; amount: string; currency: string };
  input_schema:  Record<string, { type: string; required?: boolean; description?: string; default?: unknown }>;
  output_schema: Record<string, { type: string; description?: string }>;
}

export interface MilkyWayAboutSchema {
  milkyway_version:      string;
  name:                  string;
  description:           string;
  wallet:                string;
  max_deadline_seconds?: number;
  capabilities: {
    [capabilityName: string]: CapabilityDef;
  };
}

export interface AboutResult {
  success: boolean;
  schema?: MilkyWayAboutSchema;
  error?: string;
}

export async function fetchAbout(endpoint: string): Promise<AboutResult> {
  try {
    const url = `${endpoint.replace(/\/$/, "")}/about`;
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 5000);

    const res = await fetch(url, {
      signal:  controller.signal,
      headers: { "User-Agent": "MilkyWay-Verifier/1.0" },
    });

    if (res.status !== 200) return { success: false, error: `HTTP ${res.status}` };

    const schema = await res.json() as Record<string, unknown>;

    if (!schema.milkyway_version) {
      return { success: false, error: "Missing milkyway_version" };
    }
    if (!schema.capabilities || typeof schema.capabilities !== "object") {
      return { success: false, error: "Missing or invalid capabilities" };
    }
    if (Object.keys(schema.capabilities as object).length === 0) {
      return { success: false, error: "capabilities object is empty" };
    }

    return { success: true, schema: schema as unknown as MilkyWayAboutSchema };
  } catch (err: unknown) {
    const e = err as { message?: string };
    return { success: false, error: e.message ?? "Unknown error" };
  }
}
