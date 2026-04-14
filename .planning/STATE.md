---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: Intelligence & Cross-Partner Comparison
status: unknown
last_updated: "2026-04-14T15:58:52.368Z"
progress:
  total_phases: 24
  completed_phases: 22
  total_plans: 39
  completed_plans: 39
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-12)

**Core value:** Surface abnormal account and batch performance data so the partnerships team can focus energy where it matters most — before problems compound.
**Current focus:** v3.0 Phase 15 — Anomaly Detection Engine

## Current Position

Phase: 21 of 24 (Critical Bug Fixes)
Plan: 1 of 1 in current phase
Status: Phase Complete
Last activity: 2026-04-14 — Completed 21-01-PLAN.md (KPI context fix + anomaly column)

Progress: [████████░░] 87%

## Performance Metrics

**Velocity:**
- Total plans completed: 2 (v3.0 phase 20)
- Average duration: 2 min
- Total execution time: 4 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 20-cross-partner-ui | 2/2 | 4 min | 2 min |

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
- Comparison matrix shared types extracted to matrix-types.ts (MATRIX_METRICS, MatrixViewProps, formatValue, getTierClass)
- Bar ranking uses pure CSS/Tailwind instead of Recharts for simplicity
- Orientation toggle hidden in bar mode (not applicable)

### Pending Todos

- Snowflake credentials need to be provisioned in Vercel env vars
- Dimension filter at root level doesn't reduce table rows (bug from v2)

### Blockers/Concerns

- Snowflake credentials: needed for live data; AI features should disable gracefully on static cache
- ANTHROPIC_API_KEY: needed before Phase 17 (Claude Query Infrastructure)

## Session Continuity

Last session: 2026-04-14
Stopped at: Completed 21-01-PLAN.md — Phase 21 complete (critical bug fixes)
Resume file: .planning/phases/21-critical-bug-fixes/21-01-SUMMARY.md
