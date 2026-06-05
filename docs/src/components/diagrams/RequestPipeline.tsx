import React from "react";

interface Stage {
  label:      string;
  sublabel:   string;
  color:      "blue" | "amber" | "green" | "gray";
  isHandler?: boolean;
}

const STAGES: Stage[] = [
  { label: "Incoming request",     sublabel: "POST /execute",              color: "gray"  },
  { label: "Deadline check",       sublabel: "408 if expired",             color: "blue"  },
  { label: "Payment verification", sublabel: "402 if missing or invalid",  color: "blue"  },
  { label: "Input coercion",       sublabel: "safe type conversion",       color: "blue"  },
  { label: "Input validation",     sublabel: "400 if schema violated",     color: "blue"  },
  { label: "Your handler",         sublabel: "this is all you write",      color: "green", isHandler: true },
  { label: "Output validation",    sublabel: "500 if schema violated",     color: "blue"  },
  { label: "Response sent",        sublabel: "200 OK",                     color: "gray"  },
  { label: "Payment settled",      sublabel: "USDC moves on Arbitrum",     color: "amber" },
];

const COLORS = {
  blue:  { bg: "#EFF6FF", border: "#BFDBFE", text: "#1D4ED8" },
  amber: { bg: "#FFFBEB", border: "#FDE68A", text: "#B45309" },
  green: { bg: "#ECFDF5", border: "#6EE7B7", text: "#065F46" },
  gray:  { bg: "#F9FAFB", border: "#E5E7EB", text: "#374151" },
};

export function RequestPipeline() {
  return (
    <div style={{ fontFamily: "'Inter', sans-serif", margin: "2rem 0" }}>
      <div style={{
        display:       "flex",
        flexDirection: "column",
        alignItems:    "center",
        gap:           "0",
        maxWidth:      "480px",
        margin:        "0 auto"
      }}>
        {STAGES.map((stage, i) => {
          const c = COLORS[stage.color];
          return (
            <React.Fragment key={i}>
              <div style={{
                width:          "100%",
                background:     c.bg,
                border:         `2px solid ${c.border}`,
                borderRadius:   "10px",
                padding:        "10px 18px",
                display:        "flex",
                justifyContent: "space-between",
                alignItems:     "center",
                boxShadow:      stage.isHandler ? "0 0 0 3px #6EE7B7" : "none"
              }}>
                <span style={{
                  fontSize:   "14px",
                  fontWeight: stage.isHandler ? 700 : 500,
                  color:      c.text
                }}>
                  {stage.isHandler ? "→ " : ""}{stage.label}
                </span>
                <span style={{
                  fontSize:   "12px",
                  color:      "#6B7280",
                  fontFamily: "'JetBrains Mono', monospace"
                }}>
                  {stage.sublabel}
                </span>
              </div>

              {i < STAGES.length - 1 && (
                <div style={{
                  width:          "2px",
                  height:         "16px",
                  background:     "#E5E7EB",
                  position:       "relative",
                  display:        "flex",
                  justifyContent: "center"
                }}>
                  <span style={{
                    position: "absolute",
                    bottom:   "-4px",
                    fontSize: "10px",
                    color:    "#D1D5DB"
                  }}>▼</span>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      <p style={{
        textAlign: "center",
        fontSize:  "13px",
        color:     "#6B7280",
        marginTop: "16px"
      }}>
        The SDK handles every stage. You only write the green box.
      </p>
    </div>
  );
}
