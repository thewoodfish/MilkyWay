---
id: errors
title: Errors
sidebar_label: Errors
---

# Errors

Every error in the MilkyWay SDK is typed. Typed errors mean you can handle specific failures without parsing strings.

```typescript
import { ValidationError, PaymentError, DeadlineError, CapabilityError, InternalError } from '@usemilkyway/agent-sdk';
```

---

## ValidationError

**When:** Input doesn't match the schema after coercion attempts.

**HTTP status:** 400

```json
{
  "status": "failed",
  "error_type": "validation",
  "error": "query: required field missing"
}
```

**Cause it:**
```typescript
// Agent declared query as required: true
// Call without it:
curl -X POST http://localhost:3000/execute \
  -d '{ "task": { "input": {} } }'
```

**Throw it:**
```typescript
async (input) => {
  if (input.query.trim().length < 3) {
    throw new ValidationError("query must be at least 3 characters after trimming");
  }
  // ...
}
```

---

## PaymentError

**When:** The `PAYMENT-SIGNATURE` header is missing, has an invalid signature, or the authorization has expired.

**HTTP status:** 402

Two response shapes depending on the cause:

**Missing payment** — caller needs to pay:
```json
{
  "x402Version": 1,
  "accepts": [{ "scheme": "exact", "maxAmountRequired": "10000", ... }]
}
```

**Invalid payment** — payment was sent but rejected:
```json
{
  "status": "failed",
  "error_type": "payment",
  "error": "Payment signature expired"
}
```

**In dev mode:** This error never fires. `MILKYWAY_DEV_MODE=true` bypasses the payment gate entirely.

---

## DeadlineError

**When:** The `deadline` in the request has already passed when the request arrives, or the handler hasn't returned before the deadline.

**HTTP status:** 408

```json
{
  "status": "failed",
  "error_type": "deadline",
  "error": "Deadline has passed"
}
```

**USDC is not charged.** The payment authorization expires unused.

**Throw it:** You don't usually need to. The SDK wraps your handler in a timeout automatically. But if your code detects it:
```typescript
async (input) => {
  throw new DeadlineError("Upstream API took too long");
}
```

---

## CapabilityError

**When:** The caller requests a capability not declared in your config.

**HTTP status:** 400

```json
{
  "status": "failed",
  "error_type": "capability",
  "error": "Unknown capability: 'transcribe'. Available: research, summarize"
}
```

The SDK handles this automatically based on your declared capabilities. You don't need to throw this yourself.

---

## InternalError

**When:** Your handler returns data that doesn't match the declared `output_schema` (production only), or an unhandled exception escapes your handler.

**HTTP status:** 500

```json
{
  "status": "failed",
  "error_type": "internal",
  "error": "Internal error"
}
```

**USDC is not charged.**

In dev mode, output schema violations log a warning and pass through. In production, they throw InternalError.

**Throw it:**
```typescript
async (input) => {
  const result = await callExternalApi(input.query);
  if (result.status !== 200) {
    throw new InternalError("External API returned " + result.status);
  }
  return { answer: result.data };
}
```
