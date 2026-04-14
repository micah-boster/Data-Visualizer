---
phase: 17-claude-query-infrastructure
status: passed
verified: 2026-04-14
verifier: phase-23-verification
---

# Phase 17: Claude Query Infrastructure — Verification

## Goal Achievement

**Goal**: A working server-side Claude integration that accepts questions with context and streams safe, data-grounded responses.

**Result**: PASSED. The route handler, system prompt builder, and data context builder are fully operational. AI SDK v6 `streamText` + `toUIMessageStreamResponse` handles all streaming. Claude is constrained to reference only provided data context, with explicit refusal for out-of-scope questions. ANTHROPIC_API_KEY is server-only.

## Success Criteria Verification

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | POST /api/query accepts a natural language question plus current drill state and returns a streaming Claude response | PASSED | `src/app/api/query/route.ts` exports `POST()` handler. Zod schema validates `messages[]`, `drillState` (level/partnerId/batchId), optional `filters`, optional `dataContext`. Calls `streamText()` with `anthropic(CLAUDE_MODEL)` and returns `result.toUIMessageStreamResponse()`. Route marked `force-dynamic`. |
| 2 | System prompt includes summarized data context within token budget | PASSED | `src/lib/ai/context-builder.ts` `buildDataContext()` switches on drill level: root produces markdown table of all partners with KPIs and anomaly flags (~1000-1500 tokens for 8-10 partners); partner level adds portfolio rank + anomaly breakdown (~500-800 tokens); batch level includes parent summary + outlier accounts (~300-500 tokens). Data is pre-summarized, never raw matrix. |
| 3 | Claude only references data present in context — out-of-scope returns explicit refusal | PASSED | `src/lib/ai/system-prompt.ts` line 62: Critical Rule #1 states "ONLY reference data provided in the Available Data section above. If the user asks about data not shown there, respond: I don't have data on that." `describeScope()` helper provides drill-level-aware scope descriptions. Phase 21 fixed column name mapping so context contains real data (not zeros). |
| 4 | ANTHROPIC_API_KEY configured as server-side env var, never exposed to client | PASSED | `grep -rn ANTHROPIC_API_KEY src/` returns only 2 hits in `src/lib/ai/system-prompt.ts` (lines 18-19). No references in `src/components/`, `src/hooks/`, or `src/contexts/`. `validateAIConfig()` checks `process.env.ANTHROPIC_API_KEY` server-side only. Route returns 503 when key is missing. |
| 5 | AI SDK streamText (server) and useChat (client) handle all streaming — no custom SSE/WebSocket | PASSED | Server: `streamText()` from `ai` package + `toUIMessageStreamResponse()` in route.ts. Client: `useChat()` from `@ai-sdk/react` with `DefaultChatTransport` in query-search-bar.tsx. No manual SSE, EventSource, WebSocket, or ReadableStream handling anywhere in codebase. Package.json confirms `ai@^6.0.158`, `@ai-sdk/anthropic@^3.0.69`, `@ai-sdk/react@^3.0.160`. |

## Requirement Traceability

| Requirement | Plan | Status | Evidence |
|-------------|------|--------|----------|
| NLQ-01 | 17-01 | VERIFIED | `route.ts` POST handler accepts `queryRequestSchema` (messages + drillState + filters + dataContext), validates with Zod, returns streaming response via `streamText().toUIMessageStreamResponse()`. Error handling: 503 for missing API key, 400 for invalid request, 429 for rate limits, 500 for other errors. |
| NLQ-02 | 17-01 | VERIFIED | `ai@^6.0.158` and `@ai-sdk/anthropic@^3.0.69` in package.json. Server uses `streamText` from `ai` + `anthropic()` provider from `@ai-sdk/anthropic`. Client uses `useChat` from `@ai-sdk/react@^3.0.160`. `convertToModelMessages()` (async, AI SDK v6) converts UIMessage format. No custom streaming code. |
| NLQ-03 | 17-01, 21-01 | VERIFIED | `context-builder.ts` `buildDataContext()` produces drill-level-aware summaries: root = partner table with KPIs + anomaly flags, partner = full detail + portfolio rank, batch = batch aggregates + parent + outliers. Phase 21 fixed column name mapping in `QuerySearchBarWithContext` so context contains real KPI values (not zeros). Token budgets: root ~1000-1500, partner ~500-800, batch ~300-500. |
| NLQ-04 | 17-01, 21-01 | VERIFIED | `system-prompt.ts` Critical Rule #1 (line 62): "ONLY reference data provided in the Available Data section." Rule #2: "Never speculate, approximate, or infer data that isn't explicitly provided." `describeScope()` generates drill-level-specific scope descriptions for refusal messages. Phase 21 ensured the context actually contains correct data. |
| NLQ-05 | 17-01 | VERIFIED | `ANTHROPIC_API_KEY` referenced only in `src/lib/ai/system-prompt.ts` (server-side library). `validateAIConfig()` returns `{available: false}` when key missing — route returns 503 with clear message. Zero client-side references (no hits in components, hooks, or contexts directories). |

## Build Verification

- TypeScript compilation: PASSED (`npx tsc --noEmit` — zero errors, confirmed via Phase 22 VERIFICATION)
- Next.js production build: PASSED (`npx next build` — route shows as dynamic `f` in build output)

## Artifacts Created

| File | Purpose |
|------|---------|
| `src/app/api/query/route.ts` | POST handler: Zod validation, AI config check, system prompt build, streamText streaming |
| `src/lib/ai/system-prompt.ts` | System prompt assembly: persona, drill-state view, data context, safety constraints, CLAUDE_MODEL constant |
| `src/lib/ai/context-builder.ts` | Data context builder: root/partner/batch summaries, portfolio ranking, token-budget-aware formatting |
| `src/types/query.ts` | QueryRequest interface defining endpoint contract |
| `docs/QUERY-ARCHITECTURE.md` | Architecture documentation for the query system |

---

_Verified: 2026-04-14_
_Verifier: phase-23-verification_
