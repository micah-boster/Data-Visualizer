---
phase: 18-claude-query-ui
plan: 01
subsystem: query-ui
tags: [ai-sdk-react, useChat, streaming, search-bar, suggested-prompts]

requires:
  - phase: 17-claude-query-infrastructure
    provides: POST /api/query route handler with streamText streaming
provides:
  - QuerySearchBar component with useChat streaming
  - QueryResponse streaming text renderer
  - QueryScopePill removable drill context badge
  - QuerySuggestedPrompts horizontal prompt chips
  - useSuggestedPrompts hook for context-aware prompts
  - Data context integration via QuerySearchBarWithContext wrapper
affects: []

tech-stack:
  added: ["@ai-sdk/react@3.0.160"]
  patterns: [useChat-transport, status-driven-rendering, mousedown-blur-prevention]

key-files:
  created:
    - src/components/query/query-search-bar.tsx
    - src/components/query/query-response.tsx
    - src/components/query/query-scope-pill.tsx
    - src/components/query/query-suggested-prompts.tsx
    - src/hooks/use-suggested-prompts.ts
  modified:
    - src/components/data-display.tsx
    - src/app/api/query/route.ts

key-decisions:
  - "useChat with DefaultChatTransport({ api: '/api/query', body: {...} }) — transport recreated via useMemo when drill state changes"
  - "Search-bar pattern: setMessages([]) before each new query — no chat history accumulation"
  - "Route updated to accept both UIMessage parts[] and simple {role, content} message formats"
  - "QuerySearchBarWithContext wrapper inside AnomalyProvider builds data context from partner anomaly map"
  - "30-second timeout via useRef setTimeout calling stop() — cleared on status change to ready/error"
  - "Suggested prompts use onMouseDown + preventDefault to prevent input blur before click registers"

patterns-established:
  - "Status-driven rendering: submitted=skeleton, streaming=live text+cursor, ready=final, error=message+retry"
  - "Scope pill pattern: removable badge showing drill context (partner or partner>batch)"
  - "Data context computed from raw batch rows in QuerySearchBarWithContext — builds PartnerSummary[] inline"

requirements-completed: [NLQ-06, NLQ-07, NLQ-08, NLQ-09, NLQ-10]

duration: 12min
completed: 2026-04-13
---

# Plan 18-01: Claude Query UI Summary

**Search bar with streaming AI responses, suggested prompts, scope pills, and error handling**

## What Was Built

1. **@ai-sdk/react**: Installed v3.0.160 for the `useChat` hook. This provides `sendMessage`, `messages`, `status`, `error`, `stop`, and `setMessages` — all the streaming state management needed for the search-bar pattern.

2. **QuerySearchBar** (`src/components/query/query-search-bar.tsx`): Main component wiring everything together. Uses `useChat` with `DefaultChatTransport` pointing to `/api/query`. Transport is recreated via `useMemo` when drill state changes to keep the body fresh. Clears messages before each new query (search-bar, not chat). 30-second timeout via `useRef` + `setTimeout` calling `stop()`.

3. **QueryResponse** (`src/components/query/query-response.tsx`): Status-driven rendering — skeleton for `submitted`, live text with pulsing cursor for `streaming`, complete text for `ready`, error message with retry for `error`. Extracts text from `UIMessage.parts[]` array (AI SDK v6 format). Max height 200px with overflow scroll.

4. **QueryScopePill** (`src/components/query/query-scope-pill.tsx`): Removable pill/badge showing current drill context. At partner level shows partner name, at batch level shows "Partner > Batch". X button navigates to root.

5. **QuerySuggestedPrompts** (`src/components/query/query-suggested-prompts.tsx`): Horizontal scrollable row of prompt chips. Uses `onMouseDown` with `preventDefault()` to avoid input blur before click. Prompts are contextual — change per drill level.

6. **useSuggestedPrompts** (`src/hooks/use-suggested-prompts.ts`): Hook returning 3-4 suggested prompts based on drill level. Root = cross-partner questions, partner = partner-specific with name interpolation, batch = account-level questions.

7. **DataDisplay integration**: Added `QuerySearchBarWithContext` wrapper that lives inside `AnomalyProvider` to access `partnerAnomalies`. Builds data context from raw batch rows by computing `PartnerSummary[]` inline. Rendered as first child of the main flex container, above the anomaly summary panel.

8. **Route update** (`src/app/api/query/route.ts`): Updated Zod schema to accept both UIMessage format (with `parts[]`) and simple `{role, content}` format. Normalizes to UIMessage before passing to `convertToModelMessages`.

## Self-Check: PASSED

- [x] TypeScript compiles cleanly (npx tsc --noEmit)
- [x] Next.js production build succeeds (npx next build)
- [x] No @ai-sdk/anthropic imports in client-side code
- [x] useChat in query-search-bar.tsx only
- [x] All 5 new files created + 2 modified
- [x] Route handler accepts UIMessage format from useChat
