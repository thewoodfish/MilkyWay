"use client";

import { useState } from "react";

interface Props {
  suggestedPerTx:    string;
  suggestedLifetime: string;
  token:             string;
  onChange:          (perTx: string, lifetime: string) => void;
}

export function SpendLimitInput({ suggestedPerTx, suggestedLifetime, token, onChange }: Props) {
  const [perTx,    setPerTx]    = useState(suggestedPerTx || "500");
  const [lifetime, setLifetime] = useState(suggestedLifetime || "2000");
  const [error,    setError]    = useState<string | null>(null);

  function update(newPerTx: string, newLifetime: string) {
    setError(null);
    const p = parseFloat(newPerTx);
    const l = parseFloat(newLifetime);
    if (!isNaN(p) && !isNaN(l) && p > l) {
      setError("Per-transaction limit cannot exceed lifetime limit");
      return;
    }
    onChange(newPerTx, newLifetime);
  }

  const inputStyle = {
    flex: 1, padding: "7px 10px", fontSize: "13px", color: "#0A2540",
    background: "#fff", border: "1px solid #E3E8EF", borderRadius: "8px",
    outline: "none", width: "100%", boxSizing: "border-box" as const,
  };

  return (
    <div style={{ border: "1px solid #FDE68A", background: "#FFFBEB", borderRadius: "12px", padding: "14px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
        <span style={{ fontSize: "15px" }}>⚡</span>
        <p style={{ fontSize: "13px", fontWeight: 700, color: "#92400E", margin: 0 }}>Set a spend limit</p>
      </div>
      <p style={{ fontSize: "12px", color: "#B45309", margin: "0 0 12px", lineHeight: 1.5 }}>
        This agent can execute transactions on your behalf. Set limits to control how much it can spend.
        You can revoke or change this at any time.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <div>
          <label style={{ fontSize: "11px", fontWeight: 600, color: "#92400E", display: "block", marginBottom: "4px" }}>
            Maximum per transaction
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <input
              type="number" value={perTx} min="0" step="10"
              style={inputStyle}
              onChange={(e) => { setPerTx(e.target.value); update(e.target.value, lifetime); }}
            />
            <span style={{ fontSize: "12px", fontWeight: 600, color: "#92400E", flexShrink: 0 }}>{token}</span>
          </div>
          <p style={{ fontSize: "11px", color: "#B45309", margin: "4px 0 0" }}>Agent cannot spend more than this in a single action</p>
        </div>

        <div>
          <label style={{ fontSize: "11px", fontWeight: 600, color: "#92400E", display: "block", marginBottom: "4px" }}>
            Maximum total (lifetime)
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <input
              type="number" value={lifetime} min="0" step="100"
              style={inputStyle}
              onChange={(e) => { setLifetime(e.target.value); update(perTx, e.target.value); }}
            />
            <span style={{ fontSize: "12px", fontWeight: 600, color: "#92400E", flexShrink: 0 }}>{token}</span>
          </div>
          <p style={{ fontSize: "11px", color: "#B45309", margin: "4px 0 0" }}>After this total is reached the agent cannot spend more</p>
        </div>
      </div>

      {error && <p style={{ fontSize: "12px", color: "#ef4444", margin: "8px 0 0" }}>{error}</p>}

      <div style={{ background: "#fff", border: "1px solid #FDE68A", borderRadius: "8px", padding: "8px 10px", marginTop: "10px" }}>
        <p style={{ fontSize: "11px", color: "#92400E", margin: 0, lineHeight: 1.5 }}>
          Your wallet will approve a <strong>{perTx} {token}</strong> spend limit.
          No funds move now — only when the agent executes.
        </p>
      </div>
    </div>
  );
}
