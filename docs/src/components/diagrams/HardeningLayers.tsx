import React from "react";

const LAYERS = [
  { label: "Graceful Shutdown",    sublabel: "drains in-flight requests on SIGTERM",   color: "#F3F4F6", border: "#D1D5DB", text: "#374151" },
  { label: "Request Logging",      sublabel: "every call logged with timing + status",  color: "#EFF6FF", border: "#BFDBFE", text: "#1D4ED8" },
  { label: "Idempotency Cache",    sublabel: "same job_id = same result, no double-run",color: "#EFF6FF", border: "#BFDBFE", text: "#1D4ED8" },
  { label: "Deadline Enforcement", sublabel: "handler cancelled if deadline exceeded",  color: "#EFF6FF", border: "#BFDBFE", text: "#1D4ED8" },
  { label: "Input Coercion",       sublabel: "safe type conversion before validation",  color: "#EFF6FF", border: "#BFDBFE", text: "#1D4ED8" },
  { label: "Input Validation",     sublabel: "400 if schema violated",                  color: "#EFF6FF", border: "#BFDBFE", text: "#1D4ED8" },
];

export function HardeningLayers() {
  const total = LAYERS.length;

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", margin: "2rem auto", maxWidth: "560px" }}>
      {LAYERS.map((layer, i) => {
        const indent = i * 20;
        return (
          <div key={i} style={{
            marginLeft:     `${indent}px`,
            background:     layer.color,
            border:         `2px solid ${layer.border}`,
            borderRadius:   "10px",
            padding:        "10px 16px",
            marginBottom:   "6px",
            display:        "flex",
            justifyContent: "space-between",
            alignItems:     "center"
          }}>
            <span style={{ fontSize: "14px", fontWeight: 600, color: layer.text }}>
              {layer.label}
            </span>
            <span style={{ fontSize: "12px", color: "#9CA3AF" }}>
              {layer.sublabel}
            </span>
          </div>
        );
      })}

      <div style={{
        marginLeft:   `${total * 20}px`,
        background:   "#ECFDF5",
        border:       "3px solid #059669",
        borderRadius: "10px",
        padding:      "14px 16px",
        textAlign:    "center",
        boxShadow:    "0 0 0 4px #A7F3D0"
      }}>
        <span style={{ fontSize: "15px", fontWeight: 700, color: "#065F46" }}>
          → Your handler ←
        </span>
        <p style={{ fontSize: "12px", color: "#059669", margin: "4px 0 0 0" }}>
          this is all you write
        </p>
      </div>

      <p style={{ textAlign: "center", fontSize: "13px", color: "#6B7280", marginTop: "16px" }}>
        Every layer protects your handler. None of it is your problem.
      </p>
    </div>
  );
}
