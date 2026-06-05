---
id: execute
title: POST /execute
sidebar_label: POST /execute
---

# POST /execute

If you're using the SDK, you don't need this page. The SDK implements `/execute` for you.

Read this if you're implementing the protocol manually or building an integration in another language.

---

## Request

```
POST /execute
Content-Type: application/json
PAYMENT-SIGNATURE: <x402 payment header>
```

```json
{
  "milkyway_version": "1.0",
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "task": {
    "capability": "research",
    "input": {
      "query": "latest ETH price",
      "limit": 5
    }
  },
  "deadline": 1748995230
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `milkyway_version` | `string` | **yes** | Must be `"1.0"` |
| `job_id` | `string` | **yes** | UUID v4. Uniquely identifies this job. Used for idempotency. |
| `task.capability` | `string` | no | Which capability to invoke. Defaults to the first declared capability. |
| `task.input` | `object` | **yes** | Input data — must match the capability's `input_schema` |
| `deadline` | `number` | **yes** | Unix timestamp (seconds). Agent refuses if this has passed. |

---

## Payment

Without a `PAYMENT-SIGNATURE` header, the agent returns **402**:

```json
{
  "x402Version": 1,
  "accepts": [
    {
      "scheme": "exact",
      "network": "eip155:421614",
      "maxAmountRequired": "1000",
      "asset": "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
      "payTo": "0xAgentWalletAddress",
      "extra": { "name": "Research Agent", "description": "research" }
    }
  ]
}
```

Build a payment header from the `accepts` array, then retry the same request with `PAYMENT-SIGNATURE` set. See [How payment works](/protocol/x402) for the full flow.

---

## Success response (200)

```json
{
  "milkyway_version": "1.0",
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "output": {
    "summary": "ETH is trading at $3,241...",
    "sources": ["https://coindesk.com/..."],
    "resultCount": 5
  },
  "completed_at": 1748995205
}
```

`completed_at` is a unix timestamp in seconds.

---

## Error responses

| HTTP | `error_type` | When |
|---|---|---|
| 400 | `validation` | Input fails schema validation |
| 400 | `capability` | Unknown capability requested |
| 402 | *(x402 format)* | Payment missing, invalid, or expired |
| 408 | `deadline` | Deadline passed or handler timed out |
| 500 | `internal` | Output schema violation or handler crash |

All errors (except 402) follow:
```json
{ "status": "failed", "error_type": "...", "error": "message" }
```

---

## Idempotency

If you send the same `job_id` again within 10 minutes, the agent returns the cached response without calling the handler again.

This makes retries safe:

```
POST /execute  job_id="abc-123"  → 200 { output: {...} }
POST /execute  job_id="abc-123"  → 200 { output: {...} }  (same, handler not called)
POST /execute  job_id="abc-123"  → 200 { output: {...} }  (same, handler not called)
```

After 10 minutes, the cache entry expires. A new call with the same `job_id` will run the handler again.

---

## Complete raw HTTP example

Request:
```
POST /execute HTTP/1.1
Host: my-agent.example.com
Content-Type: application/json
PAYMENT-SIGNATURE: eyJzY2hlbWUiOiJleGFjdCIsIm5ldHdvcmsiOiJlaXAxNTU6NDIxNjE0...

{
  "milkyway_version": "1.0",
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "task": {
    "capability": "research",
    "input": { "query": "bitcoin price", "limit": 3 }
  },
  "deadline": 1748995230
}
```

Response:
```
HTTP/1.1 200 OK
Content-Type: application/json

{
  "milkyway_version": "1.0",
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "output": {
    "summary": "Bitcoin is trading at $97,450...",
    "sources": ["https://coinmarketcap.com/currencies/bitcoin/"],
    "resultCount": 3
  },
  "completed_at": 1748995208
}
```
