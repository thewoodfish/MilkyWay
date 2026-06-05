import React from "react";

interface FieldMatch {
  source: string;
  target: string;
  type:   string;
  status: "auto" | "manual" | "ignored" | "missing";
}

const EXAMPLE_MATCHES: FieldMatch[] = [
  { source: "price: number",    target: "price: number",  type: "number", status: "auto"    },
  { source: "asset: string",    target: "asset: string",  type: "string", status: "auto"    },
  { source: "timestamp: number",target: "—",              type: "number", status: "ignored" },
  { source: "—",                target: "action: string", type: "string", status: "missing" },
];

const STATUS_CONFIG = {
  auto:    { color: "#059669", bg: "#ECFDF5", border: "#A7F3D0", label: "✓ auto-matched"  },
  manual:  { color: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE", label: "→ mapped"        },
  ignored: { color: "#6B7280", bg: "#F9FAFB", border: "#E5E7EB", label: "ignored"         },
  missing: { color: "#D97706", bg: "#FFFBEB", border: "#FDE68A", label: "⚠ fill manually" },
};

export function SchemaMapping() {
  return (
    <div style={{ fontFamily: "'Inter', sans-serif", margin: "2rem 0" }}>
      <div style={{
        display:             "grid",
        gridTemplateColumns: "1fr auto 1fr",
        gap:                 "16px",
        marginBottom:        "12px",
        textAlign:           "center"
      }}>
        <div style={{ fontSize: "13px", fontWeight: 700, color: "#2563EB" }}>
          Agent A — output
        </div>
        <div style={{ width: "80px" }} />
        <div style={{ fontSize: "13px", fontWeight: 700, color: "#7C3AED" }}>
          Agent B — input
        </div>
      </div>

      {EXAMPLE_MATCHES.map((match, i) => {
        const config = STATUS_CONFIG[match.status];
        return (
          <div key={i} style={{
            display:             "grid",
            gridTemplateColumns: "1fr 80px 1fr",
            gap:                 "8px",
            alignItems:          "center",
            marginBottom:        "8px"
          }}>
            <div style={{
              background:   match.source === "—" ? "transparent" : "#EFF6FF",
              border:       match.source === "—" ? "2px dashed #E5E7EB" : "2px solid #BFDBFE",
              borderRadius: "8px",
              padding:      "8px 12px",
              fontSize:     "13px",
              fontFamily:   "'JetBrains Mono', monospace",
              color:        match.source === "—" ? "#D1D5DB" : "#1D4ED8",
              textAlign:    "right"
            }}>
              {match.source}
            </div>

            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
              <div style={{
                height:     "2px",
                width:      "100%",
                background: match.status === "ignored" || match.status === "missing" ? "#E5E7EB" : config.border
              }} />
              <span style={{
                fontSize:     "10px",
                fontWeight:   600,
                color:        config.color,
                whiteSpace:   "nowrap",
                background:   config.bg,
                padding:      "2px 6px",
                borderRadius: "10px",
                border:       `1px solid ${config.border}`
              }}>
                {config.label}
              </span>
            </div>

            <div style={{
              background:   match.target === "—" ? "transparent" : "#F5F3FF",
              border:       match.target === "—" ? "2px dashed #E5E7EB" : `2px solid ${match.status === "missing" ? "#FDE68A" : "#DDD6FE"}`,
              borderRadius: "8px",
              padding:      "8px 12px",
              fontSize:     "13px",
              fontFamily:   "'JetBrains Mono', monospace",
              color:        match.target === "—" ? "#D1D5DB" : "#7C3AED"
            }}>
              {match.target === "—" ? "—" : match.target}
              {match.status === "missing" && (
                <span style={{ fontSize: "11px", color: "#D97706", marginLeft: "8px" }}>
                  fill in builder
                </span>
              )}
            </div>
          </div>
        );
      })}

      <p style={{ fontSize: "13px", color: "#6B7280", marginTop: "12px" }}>
        MilkyWay matches fields by name and type automatically.
        Gaps appear as input fields in the visual builder&apos;s right panel.
      </p>
    </div>
  );
}
