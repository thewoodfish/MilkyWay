"use client";

import { useState } from "react";

interface AgentShareData {
  agentId: number;
  name: string;
  description: string;
  priceEth: string;
  pricingModel: string;
  jobCount: number;
  badgeTier: "NONE" | "BRONZE" | "SILVER" | "GOLD";
  successRate: number;
}

const BADGE_EMOJI: Record<string, string> = {
  NONE: "", BRONZE: "🥉", SILVER: "🥈", GOLD: "🥇",
};

const PRICING_LABEL: Record<string, string> = {
  PER_CALL: "per job", PER_DAY: "per day", PER_MONTH: "per month", FREE: "free",
};

function buildShareContent(agent: AgentShareData, baseUrl: string) {
  const url = `${baseUrl}/agents/${agent.agentId}`;
  const badge = BADGE_EMOJI[agent.badgeTier];
  const price = agent.pricingModel === "FREE"
    ? "Free"
    : `${agent.priceEth} ETH ${PRICING_LABEL[agent.pricingModel]}`;
  const jobs = agent.jobCount > 0
    ? `${agent.jobCount.toLocaleString()} jobs completed`
    : "New agent";
  const shortDesc = agent.description.split(".")[0].trim() + ".";

  return {
    twitter: [
      `Just deployed my AI agent on @MilkyWayAI 🤖`,
      ``,
      `"${agent.name}" — ${shortDesc}`,
      ``,
      `⚡ ${price}`,
      badge ? `${badge} ${jobs}` : `📊 ${jobs}`,
      `🟢 Live now`,
      ``,
      `Try it → ${url}`,
    ].join("\n"),

    telegram: [
      `🤖 ${agent.name} on MilkyWay`,
      ``,
      `${shortDesc}`,
      `Pay ${price}. Get results in seconds.`,
      ``,
      `${jobs} · ${agent.successRate.toFixed(1)}% success rate`,
      ``,
      `Run it here → ${url}`,
    ].join("\n"),

    whatsapp: [
      `Hey, check this out — an AI agent that does this automatically:`,
      ``,
      `"${shortDesc}"`,
      ``,
      `Costs about ${price}.`,
      ``,
      url,
    ].join("\n"),

    linkedin: [
      `I just published an AI agent on MilkyWay.`,
      ``,
      `"${agent.name}" — ${shortDesc}`,
      ``,
      `${jobs}. ${agent.successRate.toFixed(1)}% success rate.`,
      ``,
      `The agent economy is real. This is what it looks like in practice.`,
      ``,
      url,
    ].join("\n"),

    url,
  };
}

function buildShareUrls(content: ReturnType<typeof buildShareContent>) {
  return {
    twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(content.twitter)}`,
    telegram: `https://t.me/share/url?url=${encodeURIComponent(content.url)}&text=${encodeURIComponent(content.telegram)}`,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(content.whatsapp)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(content.url)}`,
  };
}

// ── Icons ─────────────────────────────────────────────────────────────────

function TwitterIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function TelegramIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

// ── Component ─────────────────────────────────────────────────────────────

interface AgentShareProps {
  agent: AgentShareData;
}

export function AgentShare({ agent }: AgentShareProps) {
  const [copied, setCopied] = useState(false);

  const baseUrl = typeof window !== "undefined"
    ? window.location.origin
    : "https://milkyway.xyz";

  const content = buildShareContent(agent, baseUrl);
  const urls = buildShareUrls(content);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(content.url);
    } catch {
      const input = document.createElement("input");
      input.value = content.url;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const buttons = [
    { key: "twitter",  label: "Share on X",         icon: <TwitterIcon />,  href: urls.twitter,  color: "#000" },
    { key: "telegram", label: "Share on Telegram",   icon: <TelegramIcon />, href: urls.telegram, color: "#229ED9" },
    { key: "whatsapp", label: "Share on WhatsApp",   icon: <WhatsAppIcon />, href: urls.whatsapp, color: "#25D366" },
    { key: "linkedin", label: "Share on LinkedIn",   icon: <LinkedInIcon />, href: urls.linkedin, color: "#0A66C2" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <p style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em" }}>
        Share
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
        {buttons.map((btn) => (
          <a
            key={btn.key}
            href={btn.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={btn.label}
            title={btn.label}
            style={{
              width: "34px",
              height: "34px",
              borderRadius: "8px",
              border: "1px solid #E3E8EF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#94a3b8",
              textDecoration: "none",
              transition: "color 0.15s, border-color 0.15s, background 0.15s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.color = btn.color;
              (e.currentTarget as HTMLElement).style.borderColor = btn.color;
              (e.currentTarget as HTMLElement).style.background = "#FAFBFC";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.color = "#94a3b8";
              (e.currentTarget as HTMLElement).style.borderColor = "#E3E8EF";
              (e.currentTarget as HTMLElement).style.background = "transparent";
            }}
          >
            {btn.icon}
          </a>
        ))}

        <button
          onClick={handleCopy}
          title={copied ? "Copied!" : "Copy link"}
          style={{
            height: "34px",
            borderRadius: "8px",
            border: "1px solid",
            borderColor: copied ? "#10b981" : "#E3E8EF",
            background: copied ? "#F0FDF4" : "transparent",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "0 12px",
            fontSize: "12px",
            fontWeight: 600,
            color: copied ? "#10b981" : "#94a3b8",
            cursor: "pointer",
            transition: "color 0.15s, border-color 0.15s, background 0.15s",
            whiteSpace: "nowrap",
          }}
          onMouseEnter={(e) => {
            if (!copied) {
              (e.currentTarget as HTMLElement).style.color = "#64748b";
              (e.currentTarget as HTMLElement).style.borderColor = "#94a3b8";
              (e.currentTarget as HTMLElement).style.background = "#FAFBFC";
            }
          }}
          onMouseLeave={(e) => {
            if (!copied) {
              (e.currentTarget as HTMLElement).style.color = "#94a3b8";
              (e.currentTarget as HTMLElement).style.borderColor = "#E3E8EF";
              (e.currentTarget as HTMLElement).style.background = "transparent";
            }
          }}
        >
          <LinkIcon />
          {copied ? "Copied!" : "Copy link"}
        </button>
      </div>
    </div>
  );
}
