import { createAgent } from "@usemilkyway/agent-sdk";
import dotenv from "dotenv";
dotenv.config();

// WMO weather interpretation codes → human-readable condition
const WMO_CODES: Record<number, string> = {
  0:  "Clear sky",
  1:  "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
  45: "Fog", 48: "Icy fog",
  51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle",
  61: "Light rain", 63: "Rain", 65: "Heavy rain",
  71: "Light snow", 73: "Snow", 75: "Heavy snow",
  77: "Snow grains",
  80: "Light rain showers", 81: "Rain showers", 82: "Violent rain showers",
  85: "Snow showers", 86: "Heavy snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm with hail", 99: "Thunderstorm with heavy hail",
};

function wmoCondition(code: number): string {
  return WMO_CODES[code] ?? `Weather code ${code}`;
}

function toFahrenheit(c: number): number {
  return Math.round((c * 9) / 5 + 32);
}

async function geocode(city: string): Promise<{ name: string; country: string; lat: number; lon: number }> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Geocoding failed: HTTP ${res.status}`);
  const data = await res.json() as { results?: { name: string; country_code: string; latitude: number; longitude: number }[] };
  if (!data.results?.length) throw new Error(`City not found: "${city}"`);
  const r = data.results[0];
  return { name: r.name, country: r.country_code, lat: r.latitude, lon: r.longitude };
}

async function fetchWeather(lat: number, lon: number) {
  const params = new URLSearchParams({
    latitude:  lat.toString(),
    longitude: lon.toString(),
    current:   "temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code",
    wind_speed_unit: "kmh",
  });
  const url = `https://api.open-meteo.com/v1/forecast?${params}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Weather fetch failed: HTTP ${res.status}`);
  const data = await res.json() as {
    current: {
      temperature_2m: number;
      apparent_temperature: number;
      relative_humidity_2m: number;
      wind_speed_10m: number;
      weather_code: number;
    };
  };
  return data.current;
}

createAgent(
  require("../agent.json"),
  {
    run: async (input: Record<string, unknown>) => {
      const city = String(input.city ?? "").trim();
      if (!city) throw new Error("city is required");

      const geo     = await geocode(city);
      const weather = await fetchWeather(geo.lat, geo.lon);

      const temp_c = Math.round(weather.temperature_2m * 10) / 10;

      return {
        city:            geo.name,
        country:         geo.country,
        temperature_c:   temp_c,
        temperature_f:   toFahrenheit(temp_c),
        feels_like_c:    Math.round(weather.apparent_temperature * 10) / 10,
        humidity_pct:    weather.relative_humidity_2m,
        wind_speed_kmh:  Math.round(weather.wind_speed_10m * 10) / 10,
        condition:       wmoCondition(weather.weather_code),
      };
    },
  }
).listen(Number(process.env.PORT) || 3100);
