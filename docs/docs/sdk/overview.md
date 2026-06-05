---
id: overview
title: SDK Overview
sidebar_label: Overview
---

# SDK Overview

The MilkyWay SDK turns a function into a paid HTTP service.

```bash
npm install @usemilkyway/agent-sdk
```

---

## What the SDK does

You write a handler function. The SDK wraps it in an HTTP server that:

- Responds to `/health`, `/about`, and `/execute`
- Verifies USDC payment before calling your handler
- Validates inputs against your declared schema
- Validates outputs before sending the response
- Deduplicates retries by `job_id`
- Enforces the deadline — your handler can't run past it
- Shuts down gracefully on SIGTERM

You don't write any of that. You write:

```typescript
async (input) => {
  return { result: await doYourThing(input.query) };
}
```

---

## What the SDK exposes

```typescript
import {
  createAgent,           // build and start your agent
  ValidationError,       // throw for bad input
  PaymentError,          // thrown automatically by SDK
  DeadlineError,         // thrown automatically by SDK
  CapabilityError,       // thrown automatically by SDK
  InternalError,         // throw for unexpected failures
  coerceInput,           // coerce request data to declared types
  validateOutput,        // check output against schema
  clearCache,            // clear idempotency cache (testing)
} from '@usemilkyway/agent-sdk';
```

---

## Pages in this section

- [createAgent()](/sdk/createAgent) — the main function, all options
- [Errors](/sdk/errors) — every error type and what causes it
- [Dev Mode](/sdk/dev-mode) — local development without spending USDC
- [Hardening](/sdk/hardening) — the six protections the SDK applies automatically
