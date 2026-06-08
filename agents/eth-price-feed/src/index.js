require("dotenv").config();
const { createAgent } = require("@usemilkyway/agent-sdk");
const config = require("../agent.json");

const COINGECKO_URL = "https://api.coingecko.com/api/v3/coins";

createAgent(config, {
  // Fetches the current price of the specified asset from CoinGecko
  get_price: async ({ asset = "ethereum" }) => {
    const res = await fetch(
      `${COINGECKO_URL}/${asset}?localization=false&tickers=false&community_data=false&developer_data=false`,
      {
        headers: { "Accept": "application/json" },
        signal: AbortSignal.timeout(8000)
      }
    );

    if (!res.ok) {
      throw new Error(
        `CoinGecko returned ${res.status} for asset "${asset}". ` +
        `Check the asset ID is valid e.g. "ethereum", "bitcoin".`
      );
    }

    const data = await res.json();
    const market = data.market_data;
    const change = market.price_change_percentage_24h ?? 0;

    return {
      asset:          data.id,
      symbol:         data.symbol.toUpperCase(),
      price_usd:      market.current_price.usd,
      change_24h:     Math.round(change * 100) / 100,
      direction:      change > 0.5 ? "up" : change < -0.5 ? "down" : "flat",
      market_cap_usd: market.market_cap.usd,
      last_updated:   Math.floor(
        new Date(market.last_updated).getTime() / 1000
      )
    };
  }

}).listen(Number(process.env.PORT ?? "3000"));
