---
phase: 15-anomaly-detection-engine
plan: 02
subsystem: ui-integration
tags: [react-context, hooks, anomaly-data-flow]

requires:
  - phase: 15-anomaly-detection-engine
    provides: computeAnomalies, computeAllPartnerAnomalies, anomaly types
provides:
  - Root-level anomaly map via AnomalyProvider context
  - Per-partner anomaly data via usePartnerStats.anomalies
  - useAnomalyContext hook for any component under DataDisplay
affects: [phase-16-anomaly-ui, phase-17-claude-query]

tech-stack:
  added: []
  patterns: [context-provider-for-computed-data, root-level-memoized-hook]

key-files:
  created:
    - src/hooks/use-all-partner-anomalies.ts
    - src/contexts/anomaly-provider.tsx
  modified:
    - src/hooks/use-partner-stats.ts
    - src/components/data-display.tsx

key-decisions:
  - "AnomalyProvider wraps outside PartnerNormsProvider for broader availability"
  - "Partners with <3 batches get anomalies from root-level provider, not usePartnerStats"
  - "Memoization on allRows reference prevents redundant computation on re-renders"

patterns-established:
  - "Root-level computation pattern: hook computes once, context distributes to tree"
  - "Conditional inline computation: usePartnerStats adds anomalies only when sufficient history"

requirements-completed: [AD-04]

duration: 5min
completed: 2026-04-12
---

# Plan 15-02: React Integration Summary

**Anomaly data flows to every level of the component tree via context and hooks without user action**

## What Was Built

1. **useAllPartnerAnomalies hook**: Computes anomaly status for all 34 partners from the full dataset. Memoized on allRows reference.

2. **AnomalyProvider context**: Wraps DataDisplay, providing the partner anomaly map to all child components via `useAnomalyContext()`. Follows existing PartnerNormsProvider pattern.

3. **usePartnerStats update**: Now returns `anomalies` field for partners with 3+ batches (inline computation using partner-specific norms). Partners with fewer batches rely on the root-level AnomalyProvider which uses portfolio fallback.

4. **DataDisplay integration**: AnomalyProvider wraps the entire content area, passing `data.data` (all 477 rows). All existing functionality preserved.

## Self-Check: PASSED

- [x] TypeScript compiles cleanly (npx tsc --noEmit)
- [x] Next.js production build succeeds (npx next build)
- [x] AnomalyProvider wraps DataDisplay content
- [x] usePartnerStats returns anomalies for 3+ batch partners
- [x] No regressions in existing functionality
- [x] 2 atomic commits created

## Commits

1. `feat(15-02): add useAllPartnerAnomalies hook and AnomalyProvider context`
2. `feat(15-02): wire anomalies into usePartnerStats and DataDisplay`
