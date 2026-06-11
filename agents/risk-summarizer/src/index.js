require("dotenv").config();
const { createAgent } = require("@usemilkyway/agent-sdk");
const config = require("../agent.json");

createAgent(config, {

  summarize_risk: async ({ health_factor, collateral_usd, debt_usd, status, wallet, available_borrow }) => {
    const ltv_pct = collateral_usd > 0
      ? Math.round((debt_usd / collateral_usd) * 10000) / 100
      : 0;

    // Severity
    let risk_level;
    if (health_factor >= 2.0)      risk_level = "LOW";
    else if (health_factor >= 1.5) risk_level = "MEDIUM";
    else if (health_factor >= 1.1) risk_level = "HIGH";
    else                           risk_level = "CRITICAL";

    // Collateral needed to reach health factor of 2.0
    // health_factor = collateral_usd / (debt_usd * liquidation_threshold)
    // Approximating liquidation_threshold = 0.825 (Aave V3 WETH default on Arbitrum)
    const TARGET_HF = 2.0;
    const LIQ_THRESHOLD = 0.825;
    const required_collateral = debt_usd > 0
      ? (TARGET_HF * debt_usd) / LIQ_THRESHOLD
      : 0;
    const collateral_needed_usd = Math.max(0,
      Math.round((required_collateral - collateral_usd) * 100) / 100
    );

    const action_required = health_factor < 1.5;

    let action = null;
    if (risk_level === "CRITICAL") {
      action = `Add collateral immediately or repay debt — liquidation is imminent (HF ${health_factor.toFixed(2)}).`;
    } else if (risk_level === "HIGH") {
      action = `Add $${collateral_needed_usd.toLocaleString()} collateral or repay debt to reach a safe health factor of 2.0.`;
    } else if (risk_level === "MEDIUM") {
      action = `Monitor closely. A 20%+ drop in collateral value could push you into danger territory.`;
    }

    const walletStr = wallet ? ` for ${wallet.slice(0, 6)}...${wallet.slice(-4)}` : "";
    const summary = [
      `Aave V3 position${walletStr}:`,
      `  Health factor ${health_factor.toFixed(2)} — ${risk_level} risk`,
      `  Collateral $${collateral_usd.toLocaleString()} / Debt $${debt_usd.toLocaleString()} (LTV ${ltv_pct}%)`,
      available_borrow != null
        ? `  Available to borrow: $${available_borrow.toLocaleString()}`
        : null,
      action ? `  Action: ${action}` : `  No action required.`,
    ].filter(Boolean).join("\n");

    return {
      risk_level,
      summary,
      action_required,
      action,
      ltv_pct,
      collateral_needed_usd,
    };
  },

}).listen(parseInt(process.env.PORT ?? "3000"));
