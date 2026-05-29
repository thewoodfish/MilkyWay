"use client";

import { useState } from "react";
import { shortAddress } from "@/lib/utils";

const ARBISCAN = "https://sepolia.arbiscan.io";
const CONTRACT = process.env.NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS;

interface Props {
  agentId: number;
  ownerAddress: string;
  registeredAt: string;
  updatedAt: string;
  txHash?: string | null;
  metadataHash: string;
  aboutSchema?: unknown;
}

export function TechnicalDetails({
  agentId,
  ownerAddress,
  registeredAt,
  updatedAt,
  txHash,
  metadataHash,
  aboutSchema,
}: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"general" | "schema">("general");

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #E3E8EF",
        borderRadius: "16px",
        boxShadow: "0 2px 12px rgba(10,37,64,0.05)",
      }}
    >
      {/* Toggle header */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 rounded-2xl"
        style={{ color: "#0A2540" }}
      >
        <span className="font-semibold text-[14px]">Technical details</span>
        <svg
          className="w-4 h-4 transition-transform"
          style={{ color: "#94a3b8", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="px-5 pb-5" style={{ borderTop: "1px solid #F1F5F9" }}>

          {/* Tabs */}
          <div className="flex gap-5 mt-4 mb-5" style={{ borderBottom: "1px solid #F1F5F9" }}>
            {(["general", "schema"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="text-[13px] font-semibold pb-2.5 capitalize transition-colors"
                style={
                  tab === t
                    ? { color: "#2563EB", borderBottom: "2px solid #2563EB", marginBottom: "-1px" }
                    : { color: "#94a3b8", borderBottom: "2px solid transparent", marginBottom: "-1px" }
                }
              >
                {t}
              </button>
            ))}
          </div>

          {/* General tab */}
          {tab === "general" && (
            <dl className="space-y-3.5">
              {[
                ["Agent ID", `#${agentId}`],
                ["Owner", shortAddress(ownerAddress)],
                ["Registered", new Date(registeredAt).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })],
                ["Last updated", new Date(updatedAt).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })],
                ["Stake", "0.01 ETH"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between items-center text-[13px]">
                  <dt style={{ color: "#94a3b8" }}>{k}</dt>
                  <dd className="font-mono-custom" style={{ color: "#425466" }}>{v}</dd>
                </div>
              ))}

              {txHash && (
                <div className="flex justify-between items-center text-[13px]">
                  <dt style={{ color: "#94a3b8" }}>TX Hash</dt>
                  <dd>
                    <a
                      href={`${ARBISCAN}/tx/${txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono-custom"
                      style={{ color: "#2563EB" }}
                    >
                      {shortAddress(txHash)} ↗
                    </a>
                  </dd>
                </div>
              )}

              {CONTRACT && (
                <div className="flex justify-between items-center text-[13px]">
                  <dt style={{ color: "#94a3b8" }}>Contract</dt>
                  <dd>
                    <a
                      href={`${ARBISCAN}/address/${CONTRACT}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono-custom"
                      style={{ color: "#2563EB" }}
                    >
                      {shortAddress(CONTRACT)} ↗
                    </a>
                  </dd>
                </div>
              )}

              <div className="flex justify-between items-center text-[13px]">
                <dt style={{ color: "#94a3b8" }}>Metadata hash</dt>
                <dd className="font-mono-custom" style={{ color: "#425466" }} title={metadataHash}>
                  {shortAddress(metadataHash)}
                </dd>
              </div>
            </dl>
          )}

          {/* Schema tab */}
          {tab === "schema" && (
            aboutSchema ? (
              <div
                style={{
                  background: "#F8FAFF",
                  border: "1px solid #E3E8EF",
                  borderRadius: "12px",
                  overflow: "hidden",
                }}
              >
                {/* Toolbar */}
                <div
                  className="flex items-center gap-2 px-4 py-2.5"
                  style={{ borderBottom: "1px solid #E3E8EF", background: "#EFF6FF" }}
                >
                  <span className="w-2 h-2 rounded-full" style={{ background: "#10b981" }} />
                  <span className="text-[11px] font-mono-custom" style={{ color: "#2563EB" }}>about.json</span>
                </div>
                <pre
                  className="text-[12px] font-mono-custom p-4 overflow-auto leading-relaxed"
                  style={{ color: "#0A2540", maxHeight: "320px" }}
                >
                  {JSON.stringify(aboutSchema, null, 2)}
                </pre>
              </div>
            ) : (
              <p className="text-[13px] italic" style={{ color: "#94a3b8" }}>
                No schema available — this agent has not published its interface yet.
              </p>
            )
          )}

        </div>
      )}
    </div>
  );
}
