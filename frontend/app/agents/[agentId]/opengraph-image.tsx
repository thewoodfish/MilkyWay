import { ImageResponse } from "@vercel/og";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OGImage({
  params,
}: {
  params: { agentId: string };
}) {
  const agent = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/agents/${params.agentId}`
  )
    .then((r) => r.json())
    .catch(() => null);

  if (!agent) {
    return new ImageResponse(
      (
        <div
          style={{
            background: "#fff",
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span style={{ fontSize: 48, color: "#6B7280" }}>MilkyWay</span>
        </div>
      ),
      { ...size }
    );
  }

  const avatarUrl =
    agent.logoUrl ||
    `https://api.dicebear.com/7.x/bottts/svg?seed=milkyway-${agent.agentId}`;

  const badgeLabel: Record<string, string> = {
    NONE: "",
    BRONZE: "🥉 Verified",
    SILVER: "🥈 Trusted",
    GOLD: "🥇 Elite",
  };

  const jobs =
    agent.jobCount > 0
      ? `${agent.jobCount.toLocaleString()} jobs completed`
      : "New agent";

  const price =
    agent.pricingModel === "FREE" ? "Free" : `${agent.priceEth} ETH per job`;

  const shortDesc = agent.description?.split(".")[0]?.trim() + ".";

  return new ImageResponse(
    (
      <div
        style={{
          background: "#FFFFFF",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "60px 72px",
          fontFamily: "sans-serif",
        }}
      >
        {/* Top — avatar + name */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 32,
            marginBottom: 32,
          }}
        >
          <img
            src={avatarUrl}
            width={96}
            height={96}
            style={{ borderRadius: 18 }}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span style={{ fontSize: 48, fontWeight: 700, color: "#0A0A0A" }}>
              {agent.name}
            </span>
            <span style={{ fontSize: 22, color: "#6B7280" }}>{shortDesc}</span>
          </div>
        </div>

        {/* Stats row */}
        <div
          style={{
            display: "flex",
            gap: 40,
            marginTop: "auto",
            paddingTop: 32,
            borderTop: "1px solid #E5E7EB",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 28, fontWeight: 700, color: "#2563EB" }}>
              {price}
            </span>
            <span style={{ fontSize: 16, color: "#6B7280" }}>pricing</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 28, fontWeight: 700, color: "#0A0A0A" }}>
              {jobs}
            </span>
            <span style={{ fontSize: 16, color: "#6B7280" }}>usage</span>
          </div>

          {badgeLabel[agent.badgeTier] && (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span
                style={{ fontSize: 28, fontWeight: 700, color: "#0A0A0A" }}
              >
                {badgeLabel[agent.badgeTier]}
              </span>
              <span style={{ fontSize: 16, color: "#6B7280" }}>reputation</span>
            </div>
          )}

          <div
            style={{
              marginLeft: "auto",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 22, fontWeight: 600, color: "#2563EB" }}>
              milkyway.xyz
            </span>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
