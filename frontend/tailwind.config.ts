import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        space: "#050510",
        "space-card": "#0D0D1A",
        "space-border": "rgba(255,255,255,0.08)",
        accent: "#6366F1",
        "accent-hover": "#4F46E5",
        muted: "#8892A4",
        success: "#10B981",
        warning: "#F59E0B",
      },
      fontFamily: {
        display: ["Syne", "sans-serif"],
        body: ["DM Sans", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      borderRadius: {
        card: "16px",
        btn: "12px",
      },
      backgroundImage: {
        "star-field":
          "radial-gradient(ellipse at 20% 50%, rgba(99,102,241,0.06) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(99,102,241,0.04) 0%, transparent 50%)",
      },
      animation: {
        "pulse-slow": "pulse 4s cubic-bezier(0.4,0,0.6,1) infinite",
        "star-appear": "starAppear 0.8s ease-out forwards",
      },
      keyframes: {
        starAppear: {
          "0%": { transform: "scale(0) rotate(0deg)", opacity: "0" },
          "60%": { transform: "scale(1.2) rotate(180deg)", opacity: "1" },
          "100%": { transform: "scale(1) rotate(360deg)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
