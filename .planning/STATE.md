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

Phase: 15 of 20 (Anomaly Detection Engine)
Plan: 0 of 2 in current phase
Status: Ready to plan
Last activity: 2026-04-12 — v3.0 roadmap created (6 phases, 28 requirements mapped)

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**
- Total plans completed: 0 (v3.0)
- Average duration: —
- Total execution time: —

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

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

### Pending Todos

- Snowflake credentials need to be provisioned in Vercel env vars
- Dimension filter at root level doesn't reduce table rows (bug from v2)

### Blockers/Concerns

- Snowflake credentials: needed for live data; AI features should disable gracefully on static cache
- ANTHROPIC_API_KEY: needed before Phase 17 (Claude Query Infrastructure)

## Session Continuity

Last session: 2026-04-12
Stopped at: Phase 15 context gathered
Resume file: .planning/phases/15-anomaly-detection-engine/15-CONTEXT.md
