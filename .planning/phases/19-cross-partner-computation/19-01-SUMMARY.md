---
phase: 19-cross-partner-computation
plan: 01
requirements-completed:
  - XPC-01
  - XPC-02
  - XPC-03
  - XPC-04
---

# Plan 19-01 Summary: Cross-Partner Computation

## Result: COMPLETE

### What was built
Cross-partner computation layer providing per-partner rankings, percentile ranks, average collection curves, and portfolio-level outlier flags for all partners.

### Key decisions
- `compute-cross-partner.ts` computes all cross-partner data in a single pass over the dataset
- `quantileRank` from `simple-statistics` used for percentile computation (sorted array required)
- Activity classification uses BATCH_AGE_IN_MONTHS (actually days) to avoid date parsing
- Percentile outlier flags integrated into existing PartnerAnomaly type (not separate data layer)
- CrossPartnerProvider wraps outside AnomalyProvider; EnrichedAnomalyProvider bridges the two

### Key files

**Created:**
- `src/lib/computation/compute-cross-partner.ts` — Core computation: groupByPartner, classifyActivity, computeAverageCurve, computePercentileRanks, detectPercentileOutliers, computeCrossPartnerData
- `src/hooks/use-all-partner-stats.ts` — Hook wrapping computeCrossPartnerData with useMemo
- `src/contexts/cross-partner-provider.tsx` — CrossPartnerProvider context + useCrossPartnerContext hook

**Modified:**
- `src/types/partner-stats.ts` — Added PartnerActivityStatus, PercentileRanks, AverageCurve, CrossPartnerEntry, CrossPartnerData types; extended PartnerAnomaly with isPercentileOutlier/percentileOutlierMetrics
- `src/contexts/anomaly-provider.tsx` — Accepts optional crossPartnerData prop, merges percentile outlier flags into anomaly map
- `src/components/data-display.tsx` — Nests CrossPartnerProvider outside EnrichedAnomalyProvider
- `package.json` / `pnpm-lock.yaml` — Added simple-statistics 7.8.9

### Commits
1. `feat(19-01): add cross-partner types, simple-statistics, and computation module`
2. `feat(19-01): add useAllPartnerStats hook and CrossPartnerProvider context`
3. `feat(19-01): integrate cross-partner outliers into anomaly engine and wire DataDisplay`

### Self-Check: PASSED
- [x] All 3 tasks executed
- [x] Each task committed individually
- [x] `npx tsc --noEmit` passes
- [x] `npx next build` succeeds
- [x] 5 ranking metrics computed (penetration, 6mo, 12mo, total collected, per-dollar-placed)
- [x] Both equal-weight and dollar-weighted average curves computed
- [x] 2-batch truncation rule enforced
- [x] Partners with <3 batches excluded from rankings
- [x] 12+ month inactive partners excluded, 6-12 month semi-inactive flagged
- [x] 10th percentile outlier detection integrated into anomaly engine
- [x] Existing anomaly features unchanged
