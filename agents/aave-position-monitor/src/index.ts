import "dotenv/config";
import { createAgent } from "@usemilkyway/agent-sdk";
import { ValidationError } from "@usemilkyway/agent-sdk";
import { ethers } from "ethers";
import config from "../agent.json";

const RPC = process.env.ARBITRUM_RPC || "https://arb1.arbitrum.io/rpc";

// Aave V3 Pool on Arbitrum
const POOL_ADDRESS = "0x794a61358D6845594F94dc1DB02A252b5b4814aD";
const POOL_ABI = [
  "function getUserAccountData(address user) view returns (uint256 totalCollateralBase, uint256 totalDebtBase, uint256 availableBorrowsBase, uint256 currentLiquidationThreshold, uint256 ltv, uint256 healthFactor)"
];

function getStatus(healthFactor: number): string {
  if (healthFactor <= 1.0) return "liquidatable";
  if (healthFactor <= 1.2) return "danger";
  if (healthFactor <= 1.5) return "warning";
  return "safe";
}

function getRecommendation(
  status:          string,
  healthFactor:    number,
  priceChange24h?: number
): string {
  const priceContext = priceChange24h !== undefined
    ? ` ETH is ${priceChange24h > 0 ? "up" : "down"} ${Math.abs(priceChange24h)}% today.`
    : "";

  switch (status) {
    case "liquidatable":
      return `Your position is at risk of liquidation now.${priceContext} Add collateral or repay debt immediately.`;
    case "danger":
      return `Health factor is critically low at ${healthFactor}.${priceContext} Add collateral or repay debt soon to avoid liquidation.`;
    case "warning":
      return `Health factor of ${healthFactor} is approaching the danger zone.${priceContext} Monitor closely and consider adding collateral.`;
    case "safe":
      return priceChange24h && priceChange24h < -5
        ? `Position is safe at ${healthFactor}, but ETH is down ${Math.abs(priceChange24h)}% today. Keep an eye on your health factor.`
        : `Position is healthy at ${healthFactor}. No action needed.`;
    default:
      return "Unable to determine recommendation.";
  }
}

createAgent(config, {

  check_position: async (input) => {
    const wallet_address  = input.wallet_address as string;
    const price_change_24h = input.price_change_24h as number | undefined;

    if (!/^0x[0-9a-fA-F]{40}$/.test(wallet_address)) {
      throw new ValidationError(
        `"${wallet_address}" is not a valid Ethereum address. ` +
        `Format: 0x followed by 40 hex characters.`
      );
    }

    const provider = new ethers.JsonRpcProvider(RPC);
    const pool     = new ethers.Contract(POOL_ADDRESS, POOL_ABI, provider);

    // Single on-chain call — returns all account summary data
    const [
      totalCollateralBase,
      totalDebtBase,
      availableBorrowsBase,
      ,
      ,
      healthFactorRaw
    ] = await pool.getUserAccountData(wallet_address);

    // Aave returns values in USD with 8 decimals (Base units), health factor with 18 decimals
    const collateral  = Number(totalCollateralBase)  / 1e8;
    const debt        = Number(totalDebtBase)        / 1e8;
    const available   = Number(availableBorrowsBase) / 1e8;
    const healthFactor = debt === 0
      ? Infinity
      : Number(healthFactorRaw) / 1e18;

    if (collateral === 0 && debt === 0) {
      return {
        wallet:           wallet_address,
        health_factor:    0,
        collateral_usd:   0,
        debt_usd:         0,
        available_borrow: 0,
        status:           "safe",
        recommendation:   "This wallet has no active Aave V3 position on Arbitrum.",
        has_position:     false
      };
    }

    const displayHF     = debt === 0 ? 999 : Math.round(healthFactor * 100) / 100;
    const status        = debt === 0 ? "safe" : getStatus(healthFactor);
    const recommendation = getRecommendation(status, displayHF, price_change_24h);

    return {
      wallet:           wallet_address,
      health_factor:    displayHF,
      collateral_usd:   Math.round(collateral * 100) / 100,
      debt_usd:         Math.round(debt * 100) / 100,
      available_borrow: Math.round(available * 100) / 100,
      status,
      recommendation,
      has_position:     true
    };
  }

}).listen(Number(process.env.PORT ?? "3000"));
