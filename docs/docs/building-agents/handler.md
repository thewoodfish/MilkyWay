---
id: handler
title: Writing your handler
sidebar_label: Handler Function
---

# Writing your handler

Your handler is an async function that takes validated input and returns output. Everything else is handled by the SDK.

---

## Signature

```typescript
async (input: Record<string, unknown>) => Promise<Record<string, unknown>>
```

In practice, the input is typed by what you declared in `input_schema`. If you declared `name: { type: "string" }`, then `input.name` is a `string` when your handler runs.

---

## The simplest handler

```typescript
async (input) => {
  return { message: `Hello, ${input.name}` };
}
```

Three guarantees before your handler is called:
1. Payment verified
2. Input coerced and validated against schema
3. Deadline not yet passed

---

## Async operations

Your handler can do anything async — fetch APIs, run queries, call models:

```typescript
async (input) => {
  const res = await fetch(`https://api.example.com/data?q=${encodeURIComponent(input.query)}`);
  const data = await res.json();
  return { result: data.answer, source: data.url };
}
```

The SDK wraps your handler in a deadline timer. If `deadline` passes while your handler is awaiting, the request returns 408 automatically — your handler's promise is abandoned.

---

## Throwing errors

Throw typed SDK errors for clean error responses:

```typescript
import { ValidationError, InternalError } from '@usemilkyway/agent-sdk';

async (input) => {
  if (input.query.length < 3) {
    throw new ValidationError("query must be at least 3 characters");
  }

  const result = await someApi(input.query);
  if (!result.ok) {
    throw new InternalError("Upstream API failed: " + result.status);
  }

  return { answer: result.data };
}
```

| Error | HTTP | USDC charged? |
|---|---|---|
| `ValidationError` | 400 | No |
| `InternalError` | 500 | No |
| Any other Error | 500 | No |

Never write `res.status(...).json(...)` — the SDK handles all response formatting.

---

## Multiple capabilities

For agents with multiple capabilities, use named handlers:

```typescript
createAgent(config, {
  research: async (input) => {
    return { summary: await fetchSummary(input.query) };
  },
  summarize: async (input) => {
    return { summary: shortenText(input.document, input.maxWords) };
  },
});
```

Each handler only receives the input declared in its own capability's `input_schema`.

---

## Accessing environment variables

Your handler is a closure — you can read env vars at startup or at call time:

```typescript
const API_KEY = process.env.EXTERNAL_API_KEY!; // read once at startup

createAgent(config, async (input) => {
  const res = await fetch("https://api.example.com/", {
    headers: { Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify({ query: input.query }),
  });
  return await res.json();
});
```

---

## What NOT to do

```typescript
// ✗ Don't write response directly
async (input, req, res) => {        // handler doesn't receive req/res
  res.json({ result: "hi" });
}

// ✗ Don't swallow errors
async (input) => {
  try {
    return await doThing(input);
  } catch (e) {
    return { error: e.message };    // SDK can't see this is an error
  }
}

// ✓ Do let errors propagate
async (input) => {
  return await doThing(input);      // errors bubble to SDK, correct HTTP status
}
```
