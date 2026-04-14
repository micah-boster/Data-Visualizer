---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: Intelligence & Cross-Partner Comparison
status: unknown
last_updated: "2026-04-13T17:02:15.774Z"
progress:
  total_phases: 19
  completed_phases: 19
  total_plans: 34
  completed_plans: 34
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-12)

**Core value:** Surface abnormal account and batch performance data so the partnerships team can focus energy where it matters most — before problems compound.
**Current focus:** v3.0 Phase 15 — Anomaly Detection Engine

## Current Position

Phase: 20 of 20 (Cross-Partner UI)
Plan: 1 of 2 in current phase
Status: Executing
Last activity: 2026-04-14 — Completed 20-01-PLAN.md (percentile columns + trajectory chart)

Progress: [█████████░] 97%

## Performance Metrics

**Velocity:**
- Total plans completed: 1 (v3.0 phase 20)
- Average duration: 2 min
- Total execution time: 2 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 20-cross-partner-ui | 1/2 | 2 min | 2 min |

*Updated after each plan completion*

## Accumulated Context

### Decisions

- v3 pillars: anomaly detection (passive), Claude query layer, cross-partner comparison
- Anomaly detection is deterministic (z-scores); Claude narrates, does not detect
- Build order: anomaly engine -> anomaly UI -> NLQ infra -> NLQ UI -> XPC compute -> XPC UI
- 3 new packages only: ai, @ai-sdk/anthropic, simple-statistics
- Anomaly threshold: 2+ metrics at 2 SD from partner mean to flag a batch
- Cross-partner comparison uses percentile rank via simple-statistics quantileRank
- NLQ uses search bar pattern (not chat) for v3.0, but infrastructure uses `useChat` with full `messages[]` array from day one — v3.5+ upgrades to threaded conversation view as a UI-only change
- AI SDK `useChat` (client) + `streamText` (server) handle all streaming plumbing
- Percentile columns are virtual/computed (extraColumns pattern), not added to COLUMN_CONFIGS
- Best-in-class partner determined by highest perDollarPlacedRate
- Default trajectory curve mode is dollarWeighted with toggle to equalWeight

### Pending Todos

- Snowflake credentials need to be provisioned in Vercel env vars
- Dimension filter at root level doesn't reduce table rows (bug from v2)

### Blockers/Concerns

- Snowflake credentials: needed for live data; AI features should disable gracefully on static cache
- ANTHROPIC_API_KEY: needed before Phase 17 (Claude Query Infrastructure)

## Session Continuity

Last session: 2026-04-14
Stopped at: Completed 20-01-PLAN.md
Resume file: .planning/phases/20-cross-partner-ui/20-01-SUMMARY.md
