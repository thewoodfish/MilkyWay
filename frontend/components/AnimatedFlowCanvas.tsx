"use client";
import { useEffect, useState } from "react";

type Status = "pending" | "running" | "completed";

const PIPELINE = [
  {
    name: "Price Monitor",
    cat: "DeFi · Data",
    icon: "P",
    price: "0.001 ETH",
    output: '{ price: 3241.5, change: "+2.3%" }',
  },
  {
    name: "Risk Analyzer",
    cat: "Trading · AI",
    icon: "R",
    price: "0.001 ETH",
    output: '{ risk: "LOW", score: 0.22 }',
  },
  {
    name: "Auto Trader",
    cat: "DeFi · Execution",
    icon: "T",
    price: "0.001 ETH",
    output: '{ tx: "0xa3f…", status: "ok" }',
  },
];

const FRAMES: { statuses: Status[]; ms: number }[] = [
  { statuses: ["running", "pending", "pending"], ms: 2200 },
  { statuses: ["completed", "running", "pending"], ms: 2200 },
  { statuses: ["completed", "completed", "running"], ms: 2200 },
  { statuses: ["completed", "completed", "completed"], ms: 2000 },
];

export function AnimatedFlowCanvas() {
  const [fi, setFi] = useState(0);

  useEffect(() => {
    let tid: ReturnType<typeof setTimeout>;
    const advance = (i: number) => {
      const next = (i + 1) % FRAMES.length;
      tid = setTimeout(() => {
        setFi(next);
        advance(next);
      }, FRAMES[i].ms);
    };
    advance(0);
    return () => clearTimeout(tid);
  }, []);

  const { statuses } = FRAMES[fi];
  const allDone = statuses.every((s) => s === "completed");

  return (
    <div
      className="rounded-2xl overflow-hidden w-full"
      style={{
        background: "#0D1117",
        border: "1px solid #21262d",
        boxShadow:
          "0 0 0 1px rgba(37,99,235,0.08), 0 32px 80px rgba(0,0,0,0.7), 0 0 120px rgba(37,99,235,0.05)",
      }}
    >
      {/* macOS toolbar */}
      <div
        className="flex items-center gap-2 px-5 py-3.5"
        style={{ background: "#161b22", borderBottom: "1px solid #21262d" }}
      >
        <span className="w-3 h-3 rounded-full" style={{ background: "#FF5F57" }} />
        <span className="w-3 h-3 rounded-full" style={{ background: "#FEBC2E" }} />
        <span className="w-3 h-3 rounded-full" style={{ background: "#28C840" }} />
        <span
          className="ml-4 text-[12px] font-mono-custom"
          style={{ color: "#484f58" }}
        >
          MilkyWay Builder · DeFi Automation Flow
        </span>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-[11px] font-mono-custom" style={{ color: "#30363d" }}>
            3 nodes · 0.003 ETH
          </span>
          <span
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full"
            style={{
              background: allDone ? "rgba(16,185,129,0.15)" : "rgba(37,99,235,0.15)",
              color: allDone ? "#34d399" : "#60a5fa",
              border: `1px solid ${allDone ? "rgba(16,185,129,0.2)" : "rgba(37,99,235,0.25)"}`,
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: allDone ? "#10B981" : "#2563EB",
                animation: allDone ? "none" : "pulse 1.2s ease-in-out infinite",
              }}
            />
            {allDone ? "Completed ✓" : "Executing…"}
          </span>
        </div>
      </div>

      {/* Canvas body */}
      <div className="relative px-6 sm:px-10 py-10">
        {/* Dot grid background */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />

        {/* Node row */}
        <div className="relative z-10 flex items-center">
          {PIPELINE.map((agent, i) => {
            const status = statuses[i];
            const isRunning = status === "running";
            const isDone = status === "completed";

            return (
              <div key={i} className="flex items-center flex-1 min-w-0">
                {/* Agent node */}
                <div
                  className="flex-1 rounded-xl p-4 sm:p-5 min-w-0"
                  style={{
                    background: "#161b22",
                    border: `1px solid ${
                      isRunning ? "#2563EB" : isDone ? "#238636" : "#21262d"
                    }`,
                    boxShadow: isRunning
                      ? "0 0 0 4px rgba(37,99,235,0.1), 0 0 40px rgba(37,99,235,0.18)"
                      : isDone
                      ? "0 0 0 1px rgba(35,134,54,0.12)"
                      : "none",
                    transition: "border-color 0.5s ease, box-shadow 0.5s ease",
                  }}
                >
                  {/* Top: icon + status badge */}
                  <div className="flex items-center justify-between mb-4">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-[13px]"
                      style={{
                        background: isDone
                          ? "rgba(35,134,54,0.2)"
                          : isRunning
                          ? "rgba(37,99,235,0.2)"
                          : "rgba(255,255,255,0.04)",
                        color: isDone ? "#3fb950" : isRunning ? "#79c0ff" : "#484f58",
                        transition: "all 0.4s ease",
                      }}
                    >
                      {isDone ? (
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={3}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      ) : isRunning ? (
                        <div
                          className="w-4 h-4 rounded-full animate-spin"
                          style={{
                            border: "2.5px solid rgba(121,192,255,0.15)",
                            borderTopColor: "#79c0ff",
                          }}
                        />
                      ) : (
                        agent.icon
                      )}
                    </div>
                    <span
                      className="hidden sm:inline text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
                      style={{
                        background: isDone
                          ? "rgba(35,134,54,0.15)"
                          : isRunning
                          ? "rgba(37,99,235,0.15)"
                          : "rgba(255,255,255,0.04)",
                        color: isDone ? "#3fb950" : isRunning ? "#60a5fa" : "#484f58",
                      }}
                    >
                      {status}
                    </span>
                  </div>

                  <p className="text-[13px] font-semibold text-white truncate">
                    {agent.name}
                  </p>
                  <p className="text-[11px] mt-0.5 hidden sm:block" style={{ color: "#484f58" }}>
                    {agent.cat}
                  </p>

                  {/* Slide-in output on completion */}
                  <div
                    style={{
                      maxHeight: isDone ? "44px" : "0",
                      overflow: "hidden",
                      transition: "max-height 0.6s ease",
                    }}
                  >
                    <p
                      className="text-[10px] font-mono-custom mt-3 leading-relaxed"
                      style={{ color: "#3fb950" }}
                    >
                      {agent.output}
                    </p>
                  </div>

                  <p
                    className="text-[10px] font-mono-custom mt-3"
                    style={{ color: "#30363d" }}
                  >
                    {agent.price}
                  </p>
                </div>

                {/* SVG connector between nodes */}
                {i < PIPELINE.length - 1 && (
                  <div className="flex items-center justify-center w-12 sm:w-16 flex-shrink-0">
                    <svg
                      width="100%"
                      height="32"
                      viewBox="0 0 64 32"
                      preserveAspectRatio="none"
                      style={{ overflow: "visible" }}
                    >
                      {/* Connection line */}
                      <line
                        x1="0"
                        y1="16"
                        x2="52"
                        y2="16"
                        stroke={
                          isDone ? "#238636" : isRunning ? "#2563EB" : "#21262d"
                        }
                        strokeWidth="1.5"
                        style={{ transition: "stroke 0.5s ease" }}
                      />
                      {/* Arrowhead */}
                      <polyline
                        points="47,11 55,16 47,21"
                        fill="none"
                        stroke={isDone ? "#238636" : "#21262d"}
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ transition: "stroke 0.5s ease" }}
                      />
                      {/* Animated data packet — flows when upstream is completed */}
                      {isDone && (
                        <circle r="4" fill="#3fb950" opacity="0.9">
                          <animateMotion
                            dur="1.2s"
                            repeatCount="indefinite"
                            path="M3,16 L50,16"
                          />
                        </circle>
                      )}
                    </svg>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom status bar */}
        <div
          className="relative z-10 flex items-center justify-between mt-8 pt-5"
          style={{ borderTop: "1px solid #21262d" }}
        >
          <div className="flex items-center gap-2.5">
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{
                background: allDone ? "#10B981" : "#2563EB",
                boxShadow: allDone
                  ? "0 0 8px rgba(16,185,129,0.8)"
                  : "0 0 8px rgba(37,99,235,0.8)",
                animation: allDone ? "none" : "pulse 1.5s ease-in-out infinite",
                transition: "all 0.5s ease",
              }}
            />
            <span className="text-[12px]" style={{ color: "#484f58" }}>
              {allDone
                ? "All agents completed · 0.003 ETH released on-chain"
                : "Escrow locked on Arbitrum · Running agents in sequence"}
            </span>
          </div>
          <span
            className="text-[14px] font-mono-custom font-bold ml-4 flex-shrink-0"
            style={{
              color: allDone ? "#3fb950" : "#60a5fa",
              transition: "color 0.5s ease",
            }}
          >
            0.003 ETH
          </span>
        </div>
      </div>
    </div>
  );
}
