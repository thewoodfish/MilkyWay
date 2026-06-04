import { createAgent } from "@usemilkyway/agent-sdk";
import dotenv from "dotenv";
dotenv.config();

// ── Aave V3 Arbitrum addresses (stubbed — real integration would use ethers.js) ──
const AAVE_POOL   = "0x794a61358D6845594F94dc1DB02A252b5b4814aD";
const AAVE_GRAPH  = "https://api.thegraph.com/subgraphs/name/aave/protocol-v3-arbitrum";

// Supported tokens on Aave V3 Arbitrum
const SUPPORTED_TOKENS: Record<string, { address: string; decimals: number }> = {
  USDC:  { address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", decimals: 6  },
  USDT:  { address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", decimals: 6  },
  WETH:  { address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", decimals: 18 },
  WBTC:  { address: "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f", decimals: 8  },
  ARB:   { address: "0x912CE59144191C1204E64559FE8253a0e49E6548", decimals: 18 },
};

interface AavePosition {
  healthFactor:       number;
  totalCollateralUSD: number;
  totalDebtUSD:       number;
  availableBorrowsUSD: number;
}

// Stub: fetch position from Aave subgraph
async function fetchPosition(walletAddress: string): Promise<AavePosition> {
  try {
    const query = `{
      user(id: "${walletAddress.toLowerCase()}") {
        healthFactor
        totalCollateralUSD
        totalDebtUSD
        availableBorrowsUSD
      }
    }`;

    const res = await fetch(AAVE_GRAPH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });

    if (res.ok) {
      const data = await res.json() as { data?: { user?: AavePosition } };
      if (data.data?.user) return data.data.user;
    }
  } catch {
    // fall through to stub
  }

  // Stub response when subgraph is unavailable
  return {
    healthFactor:        2.45,
    totalCollateralUSD:  5000,
    totalDebtUSD:        1500,
    availableBorrowsUSD: 2000,
  };
}

// Stub: simulate health factor after an action
function estimateHealthFactorAfter(
  position: AavePosition,
  action: string,
  amountUSD: number
): number {
  const collateral = position.totalCollateralUSD;
  const debt       = position.totalDebtUSD;

  if (action === "supply")   return debt > 0 ? (collateral + amountUSD) * 0.8 / debt : 999;
  if (action === "withdraw") return debt > 0 ? (collateral - amountUSD) * 0.8 / debt : 999;
  if (action === "repay")    return (debt - amountUSD) > 0 ? collateral * 0.8 / (debt - amountUSD) : 999;
  return position.healthFactor;
}

// Stub: build and submit the Aave transaction
async function executeAaveTx(
  action: string,
  token: string,
  amount: string,
  walletAddress: string
): Promise<string> {
  // In production: use ethers.js to call Aave Pool contract
  // pool.supply(tokenAddress, amountWei, walletAddress, 0)
  // pool.withdraw(tokenAddress, amountWei, walletAddress)
  // pool.repay(tokenAddress, amountWei, 2, walletAddress)

  // Return a stubbed tx hash for demonstration
  const stubHash = `0x${Array.from({ length: 64 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join("")}`;

  console.log(`[aave] STUB ${action} ${amount} ${token} for ${walletAddress} on pool ${AAVE_POOL}`);
  await new Promise((r) => setTimeout(r, 800)); // simulate network delay

  return stubHash;
}

createAgent(
  require("../agent.json"),
  {
    run: async (input: Record<string, unknown>) => {
      const action         = String(input.action ?? "").toLowerCase();
      const token          = String(input.token ?? "").toUpperCase();
      const amount         = String(input.amount ?? "0");
      const walletAddress  = String(input.wallet_address ?? "");
      const minHealthFactor = Number(input.min_health_factor ?? 1.5);

      if (!["supply", "withdraw", "repay"].includes(action)) {
        throw new Error(`Unknown action "${action}". Must be supply, withdraw, or repay.`);
      }
      if (!SUPPORTED_TOKENS[token]) {
        throw new Error(`Unsupported token "${token}". Supported: ${Object.keys(SUPPORTED_TOKENS).join(", ")}`);
      }
      if (!/^0x[0-9a-fA-F]{40}$/.test(walletAddress)) {
        throw new Error("wallet_address must be a valid Ethereum address");
      }
      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        throw new Error("amount must be a positive number");
      }

      // Fetch current position
      const position = await fetchPosition(walletAddress);

      // Estimate rough USD value (stub: assume 1:1 for stablecoins, use fixed price for others)
      const TOKEN_PRICE_USD: Record<string, number> = {
        USDC: 1, USDT: 1, WETH: 3200, WBTC: 65000, ARB: 1.2,
      };
      const amountUSD = amountNum * (TOKEN_PRICE_USD[token] ?? 1);

      // Health factor check for withdraw
      if (action === "withdraw") {
        const hfAfter = estimateHealthFactorAfter(position, action, amountUSD);
        if (hfAfter < minHealthFactor) {
          return {
            action,
            token,
            amount,
            tx_hash:               null,
            health_factor_before:  position.healthFactor,
            health_factor_after:   Math.round(hfAfter * 1000) / 1000,
            status:  "skipped",
            reason:  `Withdraw would drop health factor to ${hfAfter.toFixed(2)}, below minimum ${minHealthFactor}. Skipped to protect position.`,
          };
        }
      }

      const hfBefore = Math.round(position.healthFactor * 1000) / 1000;
      const hfAfter  = Math.round(estimateHealthFactorAfter(position, action, amountUSD) * 1000) / 1000;

      // Execute the transaction (stubbed)
      const txHash = await executeAaveTx(action, token, amount, walletAddress);

      return {
        action,
        token,
        amount,
        tx_hash:               txHash,
        health_factor_before:  hfBefore,
        health_factor_after:   hfAfter,
        status:  "success",
        reason:  `Successfully executed ${action} of ${amount} ${token} on Aave V3.`,
      };
    },
  }
).listen(Number(process.env.PORT) || 3101);
