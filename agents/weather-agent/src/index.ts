import "dotenv/config";
import { createAgent } from "@usemilkyway/agent-sdk";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const config = require("../agent.json");

createAgent(
  { ...config, wallet: process.env.AGENT_WALLET_ADDRESS! },

  async (input) => {
    const city = input.city as string;

    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`
    );
    const geoData = await geoRes.json() as {
      results?: Array<{ latitude: number; longitude: number; name: string }>;
    };
    if (!geoData.results?.length) throw new Error(`City not found: ${city}`);

    const { latitude, longitude, name } = geoData.results[0];

    const wxRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
      `&current=temperature_2m,wind_speed_10m,weather_code&timezone=auto`
    );
    const wxData = await wxRes.json() as {
      current: { temperature_2m: number; wind_speed_10m: number; weather_code: number };
    };

    const c = wxData.current;
    return {
      city:        name,
      temperature: c.temperature_2m,
      windspeed:   c.wind_speed_10m,
      condition:   wmoDescription(c.weather_code),
      timestamp:   Math.floor(Date.now() / 1000),
    };
  },

  { devMode: process.env.MILKYWAY_DEV_MODE === "true" }

).listen(parseInt(process.env.PORT ?? "3002"));

function wmoDescription(code: number): string {
  if (code === 0)  return "Clear sky";
  if (code <= 3)   return "Partly cloudy";
  if (code <= 48)  return "Foggy";
  if (code <= 57)  return "Drizzle";
  if (code <= 67)  return "Rain";
  if (code <= 77)  return "Snow";
  if (code <= 82)  return "Rain showers";
  if (code <= 86)  return "Snow showers";
  if (code <= 99)  return "Thunderstorm";
  return "Unknown";
}
