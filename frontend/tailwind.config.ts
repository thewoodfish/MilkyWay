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
        // Surface
        space:        "#ffffff",
        "space-card": "#f8fafc",
        "space-border": "#e2e8f0",
        // Brand blue
        accent:       "#2563eb",
        "accent-hover": "#1d4ed8",
        "accent-light": "#eff6ff",
        // Text
        ink:          "#0f172a",
        muted:        "#64748b",
        subtle:       "#94a3b8",
        // Status
        success:      "#10B981",
        warning:      "#F59E0B",
        danger:       "#EF4444",
      },
      fontFamily: {
        display: ["Inter", "sans-serif"],
        body:    ["Inter", "sans-serif"],
        mono:    ["JetBrains Mono", "monospace"],
      },
      borderRadius: {
        card: "12px",
        btn:  "8px",
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
        "card-hover": "0 8px 30px rgba(37,99,235,0.10)",
        btn: "0 1px 2px rgba(37,99,235,0.20)",
      },
      animation: {
        "pulse-slow": "pulse 4s cubic-bezier(0.4,0,0.6,1) infinite",
        "pulse-ring": "pulse-ring 2s cubic-bezier(0.4,0,0.6,1) infinite",
      },
      keyframes: {
        "pulse-ring": {
          "0%, 100%": { opacity: "1" },
          "50%":       { opacity: "0.55" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
