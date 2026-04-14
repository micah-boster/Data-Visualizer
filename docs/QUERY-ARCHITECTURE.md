# Query Architecture: Why Claude Never Generates SQL

## The Problem

The natural-language query feature lets users ask questions about their portfolio data. The obvious approach — have Claude generate SQL, run it against Snowflake, return results — introduces serious issues:

- **Non-determinism**: The same question can produce structurally different SQL on every request. Column names, joins, aggregation methods, and WHERE clauses vary based on how the LLM interprets the prompt. This makes bugs hard to reproduce and behavior hard to explain.
- **Safety**: Arbitrary SQL generation opens the door to injection, accidental full-table scans, and runaway queries that hit Vercel's 60-second timeout.
- **Cost**: Every question becomes a Snowflake query, even when the data is already loaded on the client.

## The Design: Pre-Computed Context, Not Generated Queries

Instead of generating SQL, the system computes all metrics deterministically on the client/server, then passes a **structured summary** to Claude as context. Claude's role is narrative interpretation — explaining the data, spotting patterns, answering questions — not data retrieval.

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Snowflake   │────▶│  Computation     │────▶│  Context        │
│  (raw data)  │     │  Layer           │     │  Builder        │
│              │     │                  │     │                 │
│              │     │  compute-kpis    │     │  Formats pre-   │
│              │     │  compute-norms   │     │  computed data  │
│              │     │  reshape-curves  │     │  into a prompt  │
│              │     │  compute-trending│     │  summary string │
└─────────────┘     └──────────────────┘     └────────┬────────┘
                                                      │
                                                      ▼
                                             ┌─────────────────┐
                                             │  System Prompt   │
                                             │                 │
                                             │  Persona +      │
                                             │  Data Context + │
                                             │  Hard Boundary: │
                                             │  "ONLY reference │
                                             │   provided data" │
                                             └────────┬────────┘
                                                      │
                                                      ▼
                                             ┌─────────────────┐
                                             │  Claude          │
                                             │                 │
                                             │  Narrates,      │
                                             │  interprets,    │
                                             │  answers —      │
                                             │  never queries  │
                                             └─────────────────┘
```

## How Each Layer Works

### 1. Computation Layer (`src/lib/computation/`)

Pure functions that transform raw Snowflake data into aggregated metrics. These are deterministic — same input always produces the same output.

| Module | What it computes |
|--------|-----------------|
| `compute-kpis.ts` | Penetration rate, collection rates, totals per partner/batch |
| `compute-norms.ts` | Portfolio-wide mean and standard deviation for anomaly detection |
| `compute-trending.ts` | Batch-over-batch directional indicators (see `docs/TRENDING-ALGORITHM.md`) |
| `reshape-curves.ts` | Time-series curve data for collection curve charts |

### 2. Context Builder (`src/lib/ai/context-builder.ts`)

Takes the pre-computed results and formats them into a markdown/JSON summary string scoped to the user's current drill level:

| Drill Level | What's included | Token budget |
|-------------|----------------|--------------|
| **Root** (all partners) | Partner name, batch count, penetration, 6mo/12mo rates, total collected, anomaly flags | ~1000-1500 |
| **Partner** (one partner) | Full KPI detail, portfolio rank comparisons, batch-level anomalies | ~500-800 |
| **Batch** (one batch) | Batch aggregates, parent partner summary, top outlier accounts | ~300-500 |

Numbers are formatted through consistent helpers (`fmt.pct`, `fmt.currency`) so the same value always renders identically — Claude references a stable representation.

### 3. System Prompt (`src/lib/ai/system-prompt.ts`)

Assembles persona instructions + the data context + a hard boundary constraint:

> "ONLY reference data provided in the Available Data section above. If the user asks about data not in the context, respond: 'I don't have data on that.'"

This is the enforcement mechanism. Claude can't hallucinate data it wasn't given, and it can't generate a query to go find it.

### 4. API Route (`src/app/api/query/route.ts`)

Validates the request (Zod schema), builds the system prompt from the drill state and data context sent by the client, and streams the response via AI SDK's `streamText`. No Snowflake connection happens here.

## Why This Works Better Than SQL Generation

| Concern | SQL Generation | Pre-Computed Context |
|---------|---------------|---------------------|
| **Determinism** | Same question → different SQL every time | Same drill state → identical context string |
| **Safety** | Must sanitize arbitrary SQL, risk of injection | No SQL generated — nothing to inject |
| **Latency** | Every question hits Snowflake | Data already loaded — prompt assembly is instant |
| **Debuggability** | Must trace generated SQL + query results | Context string is inspectable, reproducible |
| **Cost** | Snowflake compute per question | Zero incremental Snowflake cost |
| **Scope control** | Must restrict table/column access at SQL level | Claude only sees what the context builder provides |

## What Claude Can and Cannot Do

**Can do:**
- Explain what the numbers mean in plain language
- Compare partners/batches using the provided metrics
- Identify which entities are flagged as anomalous and why
- Answer "what should I look at?" using severity scores and rankings

**Cannot do:**
- Query for data not in the current drill context
- Access raw Snowflake tables
- Generate or execute SQL
- Reference metrics that weren't pre-computed

## Trade-offs

This design optimizes for **reliability and safety** over **flexibility**. If a user asks a question that requires data outside the current context (e.g., historical trends not in the loaded dataset), Claude will say it doesn't have that data rather than attempting to fetch it.

Future work may add a controlled query tool where Claude can request specific, pre-validated data slices — but the principle remains: **structured retrieval with guardrails, not open-ended SQL generation**.

## Key Files

| File | Role |
|------|------|
| `src/lib/computation/compute-kpis.ts` | Deterministic KPI aggregation |
| `src/lib/computation/compute-norms.ts` | Statistical norms for anomaly detection |
| `src/lib/computation/compute-trending.ts` | Batch-over-batch trending |
| `src/lib/computation/reshape-curves.ts` | Curve time-series transformation |
| `src/lib/ai/context-builder.ts` | Formats pre-computed data into prompt context |
| `src/lib/ai/system-prompt.ts` | Assembles system prompt with safety boundaries |
| `src/app/api/query/route.ts` | Request handling + streaming |
