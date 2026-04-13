---
phase: 17-claude-query-infrastructure
plan: 01
subsystem: ai-infrastructure
tags: [ai-sdk, anthropic, streaming, system-prompt, route-handler]

requires:
  - phase: 15-anomaly-detection-engine
    provides: anomaly types (PartnerAnomaly, BatchAnomaly) for data context
provides:
  - POST /api/query route handler with streamText streaming
  - Data context builder (root/partner/batch) for system prompts
  - System prompt builder with persona, drill-aware context, and safety constraints
  - QueryRequest type for endpoint contract
affects: [phase-18-claude-query-ui]

tech-stack:
  added: [ai@6.0.158, @ai-sdk/anthropic@3.0.69]
  patterns: [server-side-streaming, ui-message-protocol, zod-request-validation]

key-files:
  created:
    - src/app/api/query/route.ts
    - src/lib/ai/context-builder.ts
    - src/lib/ai/system-prompt.ts
    - src/types/query.ts
  modified: []

key-decisions:
  - "AI SDK v6 uses UIMessage with parts[] (not content), convertToModelMessages is async, and maxOutputTokens replaces maxTokens"
  - "Data context is built client-side and passed to route handler as string — avoids route needing Snowflake access"
  - "System prompt embeds drill state description and active filters so Claude answers match what user sees"
  - "Missing ANTHROPIC_API_KEY returns 503 with clear message (graceful degradation like static mode for Snowflake)"

patterns-established:
  - "AI route pattern: validate Zod -> check env -> build system prompt -> streamText -> toUIMessageStreamResponse"
  - "Context builder pattern: switch on drill level, produce focused summary string within token budget"
  - "Server-only AI imports: ai and @ai-sdk/anthropic never imported in src/components, hooks, or contexts"

requirements-completed: [NLQ-01, NLQ-02, NLQ-03, NLQ-04, NLQ-05]

duration: 8min
completed: 2026-04-13
---

# Plan 17-01: Claude Query Infrastructure Summary

**Server-side Claude integration that accepts questions with context and streams safe, data-grounded responses**

## What Was Built

1. **AI SDK packages**: Installed `ai@6.0.158` and `@ai-sdk/anthropic@3.0.69`. AI SDK v6 introduces `UIMessage` with `parts[]` array, async `convertToModelMessages`, and `maxOutputTokens` (renamed from `maxTokens`).

2. **Query types** (`src/types/query.ts`): `QueryRequest` interface defining the endpoint contract — messages array, drillState (level + partnerId + batchId), optional filters, optional dataContext string.

3. **Data context builder** (`src/lib/ai/context-builder.ts`): Builds focused data summaries per drill level:
   - Root: all partner names, key metrics, anomaly flags in markdown table (~1000-1500 tokens for 8-10 partners)
   - Partner: full KPI detail + portfolio rank comparisons + anomaly breakdown
   - Batch: batch aggregates + parent partner summary + top outlier accounts
   Includes portfolio ranking computation and compact formatting helpers.

4. **System prompt builder** (`src/lib/ai/system-prompt.ts`): Assembles persona ("smart colleague"), drill-state-aware view description, data context, active filter description, and critical safety rules (only reference available data, explicit "I don't have that data" responses, no financial advice). Exports `CLAUDE_MODEL` constant and `validateAIConfig()` for env var checking.

5. **Route handler** (`src/app/api/query/route.ts`): POST /api/query validates request body with Zod, checks ANTHROPIC_API_KEY availability, builds system prompt, converts messages to AI SDK v6 UIMessage format, streams response via `streamText` + `toUIMessageStreamResponse()`. Returns 503 if API key missing, 400 for invalid requests.

## Self-Check: PASSED

- [x] TypeScript compiles cleanly (npx tsc --noEmit)
- [x] Next.js production build succeeds (npx next build)
- [x] No AI SDK imports in client-side code (components, hooks, contexts)
- [x] ANTHROPIC_API_KEY only referenced in server-side lib
- [x] Route shows as dynamic (f) in build output
