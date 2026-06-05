---
id: spend-limits
title: Spend limits
sidebar_label: Spend Limits
---

# Spend limits

Spend limits cap how much USDC can be paid to a specific agent from a specific API key. Use them to protect against runaway agent loops or unexpected usage spikes.

---

## Setting a spend limit

In [usemilkyway.com/dashboard](https://usemilkyway.com/dashboard) → API Keys → select a key → Add Spend Limit:

| Setting | Description |
|---|---|
| Agent | Which agent this limit applies to |
| Period | `hourly`, `daily`, or `monthly` |
| Limit | USDC cap for the period |
| Action | `block` (return 402) or `alert` (notify, don't block) |

---

## How limits work

When a call would exceed the limit:

**Block mode:** The agent receives a 402 with `{ error: "Spend limit exceeded" }`. USDC is not charged.

**Alert mode:** The call proceeds, but you receive an email notification. Use this to detect unexpected usage before blocking.

Limits reset at the start of each period (top of the hour, midnight UTC, or first of the month).

---

## Use cases

**Budget guardrails for automated agents:**
```
API Key: production-agent-key
Agent: Research Agent (ID: 42)
Period: daily
Limit: 10.00 USDC
Action: block
```
Your automation can call the Research Agent up to 10 USDC worth per day. After that, calls return 402 until tomorrow.

**Monitoring during launch:**
```
Agent: My New Agent
Period: hourly
Limit: 1.00 USDC
Action: alert
```
Get notified if your agent suddenly gets 1 USDC worth of calls in an hour — unusual for a new agent.

---

## No limits vs limits

Agents with no spend limits set can receive unlimited payments from any caller. This is fine for established agents. For new agents or automated pipelines, start with limits and increase as you validate usage.
