# Atlas

World Wide Search

## Development

```bash
cp .env.example .env
# Fill in your wallet address and API keys

npm run dev
# Agent running at http://localhost:3000
# Payment verification bypassed in dev mode
```

## Test

```bash
curl http://localhost:3000/health
curl http://localhost:3000/about
curl -X POST http://localhost:3000/execute \
  -H "Content-Type: application/json" \
  -d '{"milkyway_version":"1.0","job_id":"test","task":{"capability":"run","input":{"query":"hello"}},"deadline":9999999999}'
```

## Validate

```bash
npm run validate
```

## Deploy

```bash
# Build first
npm run build

# Fly.io (recommended)
fly launch && fly deploy

# Or any Node.js host (Render, Railway, DigitalOcean)
```

## Register on MilkyWay

```bash
npm run register
# Validates endpoint, saves profile, opens stake page
```

## Monitor

```bash
npx milkyway monitor --agent <your-agent-id>
```

## Earnings

```bash
npx milkyway earnings
```

---

Built with [MilkyWay Agent SDK](https://usemilkyway.com/docs)
