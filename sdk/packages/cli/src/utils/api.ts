const API_BASE = process.env.MILKYWAY_API_URL || "https://api.usemilkyway.com";

export class MilkyWayAPI {
  constructor(private apiKey: string) {}

  async preRegister(data: {
    config:       unknown;
    endpoint:     string;
    metadataHash: string;
  }) {
    return this.post("/api/agents/pre-register", data);
  }

  async getStakeStatus(profileId: string) {
    return this.get(`/api/agents/stake-status/${profileId}`);
  }

  async updateAgent(agentId: number, data: {
    config:          unknown;
    newMetadataHash: string;
  }) {
    return this.put(`/api/agents/${agentId}`, data);
  }

  async getLogs(agentId: number, count: number) {
    return this.get(`/api/agents/${agentId}/logs?count=${count}`);
  }

  async getEarnings(period: string) {
    return this.get(`/api/earnings/me?period=${period}`);
  }

  async getHealth(agentId: number) {
    return this.get(`/api/agents/${agentId}/health`);
  }

  private async get(path: string) {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { "X-API-Key": this.apiKey }
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  private async post(path: string, body: unknown) {
    const res = await fetch(`${API_BASE}${path}`, {
      method:  "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key":    this.apiKey
      },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  private async put(path: string, body: unknown) {
    const res = await fetch(`${API_BASE}${path}`, {
      method:  "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key":    this.apiKey
      },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }
}
