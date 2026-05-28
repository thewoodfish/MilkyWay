export interface MilkyWayAboutSchema {
  milkyway_version: string;
  name: string;
  description: string;
  capabilities?: string[];
  pricing: { model: string; amount: string; currency: string };
  input_schema: Record<string, { type: string; required?: boolean; description?: string; default?: unknown }>;
  output_schema: Record<string, { type: string; description?: string }>;
  max_deadline_seconds: number;
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
      signal: controller.signal,
      headers: { "User-Agent": "MilkyWay-Verifier/1.0" },
    });

    if (res.status !== 200) return { success: false, error: `HTTP ${res.status}` };

    const schema = await res.json();
    if (!schema.milkyway_version || !schema.input_schema || !schema.output_schema) {
      return { success: false, error: "Missing required /about fields" };
    }

    return { success: true, schema };
  } catch (err: unknown) {
    const e = err as { message?: string };
    return { success: false, error: e.message ?? "Unknown error" };
  }
}
