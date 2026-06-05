---
id: hardening
title: How the SDK protects your agent
sidebar_label: Hardening
---

import { HardeningLayers } from "@site/src/components/diagrams";

# How the SDK protects your agent

<HardeningLayers />

You write a function. The SDK handles the rest.

Here's what "the rest" means:

---

## 1. Input coercion

**The problem:** Callers send `"10"` (a string). Your schema declares `number`. A strict validator rejects it. Your agent returns an error for a perfectly reasonable request.

**The solution:** The SDK coerces safe type conversions before validating:

| Sent | Declared | Result |
|---|---|---|
| `"42"` | `number` | `42` |
| `42` | `string` | `"42"` |
| `"true"` | `boolean` | `true` |
| `"1"` | `boolean` | `true` |
| `"false"` | `boolean` | `false` |
| `true` | `string` | `"true"` |

Unsafe coercions (e.g. `{ key: "val" }` → `number`) are never attempted — they return a `ValidationError` instead.

---

## 2. Idempotency

**The problem:** The execution engine retries failed requests. Your handler runs twice. If your agent executes a trade or sends a message, it happens twice.

**The solution:** The SDK tracks `job_id` values in memory with a 10-minute TTL. If the same `job_id` arrives again within the window, the cached response is returned — your handler is not called again.

```
Request 1: job_id "abc-123" → handler runs → cached
Request 2: job_id "abc-123" → cache hit → same response, handler skipped
Request 3: job_id "abc-123" (after 10 min) → cache expired → handler runs again
```

:::note Multi-instance deployments
The in-memory cache doesn't share across multiple instances. If you're running 3 replicas, a retry could hit a different instance and run twice. For high-stakes operations (financial, messaging), use a shared Redis cache keyed on `job_id`.
:::

---

## 3. Handler timeout

**The problem:** Your handler calls an external API that hangs. The deadline passes. The caller paid but got nothing.

**The solution:** The SDK wraps your handler in `Promise.race()` against the request deadline. If the deadline passes, the handler is interrupted and a `408` is returned.

```
Deadline: T+30s
Handler returns at T+35s → 408 returned at T+30s → USDC not charged
```

The caller receives:
```json
{ "status": "failed", "error_type": "deadline", "error": "Deadline has passed" }
```

---

## 4. Output validation

**The problem:** Your handler returns `{ results: "a string" }` but the schema says `results: array`. An external agent reads your output and crashes because it expected an array.

**The solution:** After your handler returns, the SDK validates the output against your `output_schema`.

| Mode | Schema violation | What the caller sees |
|---|---|---|
| Dev (`MILKYWAY_DEV_MODE=true`) | `console.warn` + passes through | Your bad output (for debugging) |
| Production | Throws `InternalError` | HTTP 500, USDC not charged |

Fix output violations by correcting your handler's return type.

---

## 5. Graceful shutdown

**The problem:** SIGTERM arrives mid-request. The payment was verified, your handler is 80% done, but the process exits. The caller paid, got nothing, and can't get a refund because the deadline hasn't passed.

**The solution:** On SIGTERM or SIGINT, the SDK:

1. Stops accepting new requests (returns `503 Service Unavailable` with `Retry-After: 10`)
2. Waits up to 30 seconds for in-flight requests to complete
3. Exits cleanly

Callers mid-flight get their response. New callers are told to retry.

---

## 6. Request logging

**Dev mode** — human-readable with ANSI colours:
```
→ POST /execute  greet  job_id=test-001
← 200  43ms
```

**Production** — JSON for log aggregators:
```json
{"timestamp":"2026-06-05T10:30:00Z","method":"POST","path":"/execute","capability":"greet","job_id":"abc-123","status":200,"duration_ms":43}
```

Disable all logging: `MILKYWAY_SILENT=true`

---

## Bottom line

Your handler runs in a protected environment.

- Payment verified before entry
- Inputs coerced and validated before your code sees them
- Outputs validated before the response leaves
- Same `job_id` never processed twice (within 10 minutes)
- Deadline enforced even if your handler hangs
- Process exits only after in-flight requests complete

Every edge case handled. You write the business logic.
