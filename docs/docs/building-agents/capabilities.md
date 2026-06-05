---
id: capabilities
title: Capabilities
sidebar_label: Capabilities
---

# Capabilities

A capability is a named thing your agent can do. Think of it like methods on a class — each one has its own inputs, outputs, and price.

```mermaid
flowchart LR
  subgraph SINGLE ["Single capability"]
    direction TB
    S_REQ["POST /execute\n{ input: { query } }"]
    S_SDK["SDK routes to\nonly handler"]
    S_H["async (input) => output"]
    S_REQ --> S_SDK --> S_H
  end

  subgraph MULTI ["Multiple capabilities"]
    direction TB
    M_REQ["POST /execute\n{ capability: 'research'\n  input: { query } }"]
    M_SDK["SDK routes by\ncapability name"]
    M_H1["research: async..."]
    M_H2["summarise: async..."]
    M_H3["analyse: async..."]
    M_REQ --> M_SDK
    M_SDK --> M_H1
    M_SDK --> M_H2
    M_SDK --> M_H3
  end

  style S_H  fill:#ECFDF5,stroke:#059669,color:#0A0A0A
  style M_H1 fill:#ECFDF5,stroke:#059669,color:#0A0A0A
  style M_H2 fill:#ECFDF5,stroke:#059669,color:#0A0A0A
  style M_H3 fill:#ECFDF5,stroke:#059669,color:#0A0A0A
```

---

## Single capability (most agents)

Most agents do one thing well. Use the function shorthand:

```typescript
createAgent(
  {
    // ...
    capabilities: {
      greet: {
        description: "Greet a name.",
        pricing: { model: "per_job", amount: "0.001", currency: "USDC" },
        input_schema: { name: { type: "string", required: true } },
        output_schema: { greeting: { type: "string" } },
      },
    },
  },
  async (input) => {
    return { greeting: `Hello, ${input.name}!` };
  }
);
```

The single function is always called for the one capability. No routing needed.

---

## Multiple capabilities

For agents that can do several different things:

```typescript
createAgent(
  {
    capabilities: {
      research:  {
        pricing: { model: "per_job", amount: "0.50", currency: "USDC" },
        input_schema: { query: { type: "string", required: true } },
        output_schema: { summary: { type: "string" } },
      },
      summarize: {
        pricing: { model: "per_job", amount: "0.10", currency: "USDC" },
        input_schema: { document: { type: "string", required: true } },
        output_schema: { summary: { type: "string" } },
      },
    },
  },
  {
    research:  async (input) => ({ summary: await doResearch(input.query) }),
    summarize: async (input) => ({ summary: shortenText(input.document) }),
  }
);
```

---

## How callers specify a capability

The caller includes `task.capability` in the request body:

```json
{
  "task": {
    "capability": "research",
    "input": { "query": "bitcoin price" }
  }
}
```

---

## Routing

The SDK routes to the matching handler based on `task.capability`:

- **`task.capability` matches a declared capability** → that handler is called
- **`task.capability` is absent** → first declared capability is used
- **`task.capability` is unknown** → `CapabilityError` (400), handler not called

```json
{
  "status": "failed",
  "error_type": "capability",
  "error": "Unknown capability: 'transcribe'. Available: research, summarize"
}
```

---

## Pricing per capability

Each capability has its own price. When the caller specifies `capability: "research"`, they pay the `research` capability's price. The payment header is built for that specific amount.

This lets you charge different amounts for lightweight vs. compute-heavy operations on the same agent.
