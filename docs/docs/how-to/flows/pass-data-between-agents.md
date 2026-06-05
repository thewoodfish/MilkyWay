---
id: pass-data-between-agents
title: How data passes between agents in a flow
sidebar_label: Pass data between agents
---

import { SchemaMapping } from "@site/src/components/diagrams";

# How data passes between agents in a flow

When Agent A finishes, its output becomes available as input to Agent B. MilkyWay matches fields automatically where names and types match. You fill in the gaps.

---

## The concept

Every agent declares an `output_schema` (what it returns) and an `input_schema` (what it accepts). When you draw a connection between two agents in the builder, MilkyWay reads both schemas and tells you:

- Which fields matched automatically
- Which fields need manual input from you
- Which mappings have type mismatches

<SchemaMapping />

---

## Auto-matching example

**Agent A** (`price_monitor`) output schema:
```json
{
  "price": { "type": "number" },
  "asset": { "type": "string" },
  "timestamp": { "type": "number" }
}
```

**Agent B** (`risk_analyzer`) input schema:
```json
{
  "price": { "type": "number", "required": true },
  "asset": { "type": "string", "required": true },
  "action": { "type": "string", "required": true },
  "threshold": { "type": "number", "required": false }
}
```

**What the builder shows when you connect them:**

```
Automatic matches:
  price (number)  →  price (number)   ✓
  asset (string)  →  asset (string)   ✓

Manual input required:
  action    [__________]   required
  threshold [__________]   optional
```

`price` and `asset` match by name and type — they pass through automatically. `action` has no source in Agent A's output, so you type a static value (`"sell"`, `"hold"`, etc.).

---

## Type coercion in mappings

MilkyWay performs safe coercions automatically. Unsafe coercions are flagged.

**Safe (shown in green):**

| Source type | Target type | Notes |
|---|---|---|
| `number` | `string` | `42` → `"42"` |
| `boolean` | `string` | `true` → `"true"` |
| `number` | `boolean` | `0` → `false`, non-zero → `true` |

**Unsafe (shown with warning):**

| Source type | Target type | What happens |
|---|---|---|
| `string` | `number` | Warning — may fail if string isn't numeric |
| `string` | `object` | Warning — pass-through attempted |
| `object` | `string` | Warning — JSON-stringified |

---

## Manually mapping a field from a different name

If Agent A outputs `count` (number) and Agent B expects `items` (string):

1. Click the connection arrow on the canvas
2. Right panel shows **Field Mappings**
3. Click **Add mapping**
4. Select source field: `count`
5. Select target field: `items`
6. MilkyWay applies the `number → string` coercion automatically

The mapping appears:

```
count (number)  →  items (string)  [safe coercion]  ✓
```

---

## When fields don't match

**Agent A** outputs `{ result: string }`. **Agent B** expects `{ data: object }`.

The builder shows:

```
⚠ Incompatible mapping:
  result (string)  →  data (object)
  Unsafe coercion. Use a transform agent between them,
  or choose a different Agent B.
```

Options:
1. Use a different Agent B that accepts `string` input
2. Insert a transform agent between A and B that converts the string to an object
3. Provide `data` as a static JSON value manually

---

## Passing complex data (objects and arrays)

Objects and arrays pass through unchanged when the types match:

**Agent A** output:
```json
{
  "analysis": {
    "risk_level": "high",
    "positions": [...]
  }
}
```

**Agent B** input schema:
```json
{
  "analysis": { "type": "object" }
}
```

The entire `analysis` object passes through as-is. Agent B receives it exactly as Agent A returned it.

---

## Debugging mapping issues

When a run fails with `input validation error`, enable development logging on your agent and look at what it received:

```bash
NODE_ENV=development npm run dev
```

Your agent will log the raw input before passing it to the handler:

```
→ execute  job=abc-123
  input received: {
    "price": 2847.32,
    "asset": "ETH",
    "action": "sell",
    "threshold": null    ← optional field not provided, came through as null
  }
```

Compare this to what the previous agent returned — the discrepancy tells you exactly which mapping is wrong.

---

## Viewing the output at each step

From your flow status page at usemilkyway.com/flows/&lt;flowId&gt;, click any completed agent in the pipeline to expand its output:

```
[Price Monitor]  ✓ done  142ms
▾ View output
  {
    "price": 2847.32,
    "asset": "ETH",
    "timestamp": 1748995200
  }

[Risk Analyzer]  ✓ done  831ms
▾ View output
  {
    "risk_level": "safe",
    "recommendation": "Hold — price is stable."
  }
```

---

## What's next

- [Build a DeFi safety flow](/how-to/flows/defi-safety-flow) — field mapping in a real three-agent flow
- [Schedule a recurring flow](/how-to/flows/scheduled-flow) — run your flow on a schedule
- [Chain agents without the builder](/how-to/hiring/chain-without-builder) — manual field mapping in code
