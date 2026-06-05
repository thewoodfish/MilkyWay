import React from "react";

const ENDPOINTS = [
  {
    method:  "GET",
    path:    "/health",
    purpose: "Is the agent alive?",
    callers: ["MilkyWay verifier", "Your monitoring"],
    color:   "#059669",
    bg:      "#ECFDF5",
    border:  "#A7F3D0",
    freq:    "Every 24h"
  },
  {
    method:  "GET",
    path:    "/about",
    purpose: "What can it do?",
    callers: ["MilkyWay UI", "Visual builder", "Agent clients"],
    color:   "#2563EB",
    bg:      "#EFF6FF",
    border:  "#BFDBFE",
    freq:    "On discovery"
  },
  {
    method:  "POST",
    path:    "/execute",
    purpose: "Do the work.",
    callers: ["MilkyWay engine", "External agents", "Direct callers"],
    color:   "#7C3AED",
    bg:      "#F5F3FF",
    border:  "#DDD6FE",
    freq:    "Per job"
  }
];

export function EndpointCards() {
  return (
    <div style={{
      display:             "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
      gap:                 "16px",
      margin:              "2rem 0",
      fontFamily:          "'Inter', sans-serif"
    }}>
      {ENDPOINTS.map((ep, i) => (
        <div key={i} style={{
          background:    ep.bg,
          border:        `2px solid ${ep.border}`,
          borderRadius:  "14px",
          padding:       "20px",
          display:       "flex",
          flexDirection: "column",
          gap:           "12px"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{
              fontSize:     "11px",
              fontWeight:   700,
              color:        "#ffffff",
              background:   ep.color,
              padding:      "2px 8px",
              borderRadius: "4px",
              fontFamily:   "'JetBrains Mono', monospace"
            }}>
              {ep.method}
            </span>
            <code style={{
              fontSize:   "14px",
              fontWeight: 700,
              color:      ep.color,
              fontFamily: "'JetBrains Mono', monospace"
            }}>
              {ep.path}
            </code>
          </div>

          <p style={{ fontSize: "15px", fontWeight: 600, color: "#0A0A0A", margin: 0 }}>
            {ep.purpose}
          </p>

          <div>
            <p style={{
              fontSize:      "11px",
              color:         "#6B7280",
              margin:        "0 0 6px 0",
              textTransform: "uppercase",
              letterSpacing: "0.05em"
            }}>
              Called by
            </p>
            {ep.callers.map((caller, j) => (
              <div key={j} style={{
                fontSize:     "12px",
                color:        ep.color,
                background:   "rgba(255,255,255,0.7)",
                border:       `1px solid ${ep.border}`,
                borderRadius: "6px",
                padding:      "3px 8px",
                marginBottom: "4px",
                display:      "inline-block",
                marginRight:  "4px"
              }}>
                {caller}
              </div>
            ))}
          </div>

          <p style={{ fontSize: "12px", color: "#6B7280", margin: 0, marginTop: "auto" }}>
            ⏱ {ep.freq}
          </p>
        </div>
      ))}
    </div>
  );
}
