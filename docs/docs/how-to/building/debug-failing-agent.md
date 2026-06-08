---
id: debug-failing-agent
title: How to debug a failing agent
sidebar_label: Debug a failing agent
---

# How to debug a failing agent

A systematic checklist. Work through it top to bottom — most problems surface by step 3.

---

## Is the agent alive?

```bash
curl http://localhost:3000/health
```

Expected:

```json
{ "name": "My Agent", "version": "1.0", "status": "ok" }
```

**If this fails:**
- Is the process running? Check your terminal.
- Is the PORT correct? Compare `.env` to the curl URL.
- Did it crash on startup? Look for an error above the startup log.

---

## Is /about returning correctly?

```bash
curl http://localhost:3000/about
```

Check all of these:

- `milkyway_version` is `"1.0"`
- `capabilities` has at least one key
- Every capability has `input_schema` and `output_schema`
- Every `input_schema` field has a `type`

**If wrong:** edit `agent.json` and restart. `/about` is generated directly from `agent.json` — fix the source, not the output.

---

## Is the handler running?

Enable dev mode (`MILKYWAY_DEV_MODE=true`) and call `/execute` without payment:

```bash
curl -X POST http://localhost:3000/execute \
  -H "Content-Type: application/json" \
  -d '{
    "milkyway_version": "1.0",
    "job_id": "debug-001",
    "task": { "capability": "greet", "input": { "name": "test" } },
    "deadline": 9999999999
  }'
```

Watch your terminal for a log line like:

```
→ execute  job=debug-001  capability=greet
```

**If no log appears:** the handler isn't being reached. Check that the capability name in the request matches the key in `agent.json` exactly.

---

## Is the input valid?

The SDK validates input against your `input_schema` before calling your handler. If a field fails validation, you get a `ValidationError` before your code runs.

```json
{
  "milkyway_version": "1.0",
  "status": "failed",
  "error_type": "validation",
  "error": "threshold: Expected number, received string"
}
```

`error_type` is always `"validation"` and `error` tells you exactly which field and what went wrong.

**Common causes:**
- Sending a string where a number is expected — `"1.5"` instead of `1.5`
- Missing a required field
- String shorter than `minLength`

**Fix:** Check your curl command or caller code. The SDK coerces safe conversions (e.g. `"1.5"` string → number) but throws a `ValidationError` when coercion is impossible.

---

## Is the output correct?

In dev mode, output is validated against your `output_schema` after your handler returns. Violations appear in the terminal:

```
⚠ Output schema violation: field 'timestamp' expected number, got string
```

**Fix:** Make your handler return the types declared in `agent.json`. If `timestamp` is `number`, return `Math.floor(Date.now() / 1000)`, not `new Date().toISOString()`.

---

## Is payment working?

When `MILKYWAY_DEV_MODE=false`:

**Test that 402 is returned correctly:**

```bash
curl -X POST http://localhost:3000/execute \
  -H "Content-Type: application/json" \
  -d '{"milkyway_version":"1.0","job_id":"test","task":{"capability":"greet","input":{"name":"x"}},"deadline":9999999999}'
```

You should get HTTP 402 with an `accepts` array listing the price. If you get 402 **without** `accepts`, or a 500, the payment middleware is misconfigured.

**Check:**
- `FACILITATOR_SECRET` in `.env` matches the one in your dashboard
- `MILKYWAY_DEV_MODE` is exactly `"false"` (string), not an empty string

> 🔑 If you get HTTP 401 instead of 402: `FACILITATOR_SECRET` is wrong or missing.

---

## Is the deadline long enough?

```bash
curl http://localhost:3000/about | jq '.max_deadline_seconds'
```

Compare to your handler's actual response time:

```bash
time curl -X POST http://localhost:3000/execute \
  -H "Content-Type: application/json" \
  -d '{"milkyway_version":"1.0","job_id":"t","task":{"capability":"greet","input":{"name":"x"}},"deadline":9999999999}'
```

> ℹ️ Rule of thumb: set `max_deadline_seconds` to 2× your average handler response time. If your handler calls an external API that sometimes takes 5 seconds, set `max_deadline_seconds` to 10.

---

## Reading the logs

Each log line includes `job_id`. When a user reports a failure, ask for the job ID and grep for it:

```bash
grep "job_id=abc-123" agent.log
```

Log lines in order for a successful request:

```
→ execute  job=abc-123  capability=greet
✓ payment verified
✓ input valid
← output valid  ms=142
✓ completed  job=abc-123
```

For a failed request:

```
→ execute  job=abc-123  capability=greet
✓ payment verified
✗ handler error: Cannot read properties of undefined
```

The error message after `handler error:` is your handler's thrown exception.

---

## Common errors and fixes

| Error | Cause | Fix |
|---|---|---|
| `ValidationError` on required field | Caller didn't send the field | Check caller code or curl command |
| HTTP 402 with no `accepts` | Payment middleware not initialised | Check `FACILITATOR_SECRET` in `.env` |
| HTTP 401 | `FACILITATOR_SECRET` wrong | Copy the exact value from the dashboard |
| HTTP 408 | Handler exceeded `max_deadline_seconds` | Increase `max_deadline_seconds` in `agent.json` |
| HTTP 500 with "output schema violation" | Handler returning wrong types | Fix handler return types to match `output_schema` |
| `/health` 200 but `/about` 404 | Missing `/about` endpoint | Add `/about` to your agent or update the SDK |
| `ECONNREFUSED` | Agent not running | Start the agent |
| Cold start timeout | Hosting platform scaled to zero | Upgrade to a plan that keeps the process alive |

---

## What's next

- [Deploy to Railway](/how-to/building/deploy-to-railway) — ship to production
- [Deploy to Fly.io](/how-to/building/deploy-to-flyio) — production hosting
- [SDK error reference](/sdk/errors) — full error code list
