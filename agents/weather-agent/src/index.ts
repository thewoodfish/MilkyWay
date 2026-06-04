import "dotenv/config";
import { createAgent } from "@usemilkyway/agent-sdk";

const agent = createAgent(
  {
    milkyway_version: "1.0",
    name: "Weather Agent",
    description: "Returns current weather conditions for any city using Open-Meteo (no API key required).",
    wallet: process.env.AGENT_WALLET_ADDRESS!,
    max_deadline_seconds: 15,
    capabilities: {
      get_weather: {
        description: "Fetch current weather for a city.",
        pricing: {
          model: "per_job",
          amount: process.env.NODE_ENV === "production" ? "0.05" : "0.001",
          currency: "USDC",
        },
        input_schema: {
          city:    { type: "string",  required: true,  description: "City name" },
          country: { type: "string",  required: false, description: "ISO country code, e.g. US" },
        },
        output_schema: {
          city:        { type: "string", description: "Resolved city name" },
          temperature: { type: "number", description: "Temperature in Celsius" },
          humidity:    { type: "number", description: "Relative humidity %" },
          wind_speed:  { type: "number", description: "Wind speed km/h" },
          condition:   { type: "string", description: "Weather condition summary" },
          timestamp:   { type: "number", description: "Unix timestamp of reading" },
        },
      },
    },
  },
  async (input) => {
    const city = input.city as string;
    const country = input.country as string | undefined;

    // Geocode
    const geoQuery = country ? `${city},${country}` : city;
    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(geoQuery)}&count=1&language=en&format=json`
    );
    const geoData = await geoRes.json() as { results?: Array<{ latitude: number; longitude: number; name: string }> };
    if (!geoData.results?.length) throw new Error(`City not found: ${city}`);

    const { latitude, longitude, name } = geoData.results[0];

    // Fetch weather
    const wxRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
      `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&timezone=auto`
    );
    const wxData = await wxRes.json() as {
      current: {
        temperature_2m: number;
        relative_humidity_2m: number;
        wind_speed_10m: number;
        weather_code: number;
      };
    };

    const c = wxData.current;
    return {
      city:        name,
      temperature: c.temperature_2m,
      humidity:    c.relative_humidity_2m,
      wind_speed:  c.wind_speed_10m,
      condition:   wmoDescription(c.weather_code),
      timestamp:   Math.floor(Date.now() / 1000),
    };
  },
  { devMode: process.env.MILKYWAY_DEV_MODE === "true" }
);

function wmoDescription(code: number): string {
  if (code === 0)              return "Clear sky";
  if (code <= 3)               return "Partly cloudy";
  if (code <= 48)              return "Foggy";
  if (code <= 57)              return "Drizzle";
  if (code <= 67)              return "Rain";
  if (code <= 77)              return "Snow";
  if (code <= 82)              return "Rain showers";
  if (code <= 86)              return "Snow showers";
  if (code <= 99)              return "Thunderstorm";
  return "Unknown";
}

const PORT = parseInt(process.env.PORT ?? "3002");
agent.listen(PORT);
