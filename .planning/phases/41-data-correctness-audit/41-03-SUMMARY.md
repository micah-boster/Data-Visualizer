---
phase: 41-data-correctness-audit
plan: 03
subsystem: data
tags: [polarity, color-encoding, audit, directional-tint, registry]

# Dependency graph
requires:
  - phase: 14-anomaly-detection
    provides: METRIC_POLARITY map (extended into POLARITY_REGISTRY)
  - phase: 38-polish-correctness-pass
    provides: getPolarity() callsites in trend-indicator + stat-card (verified preserved)
  - phase: 40-projected-curves-v1
    provides: getPolarity() callsites in modeled-delta-cell + compose-batch-tooltip-row (verified preserved)
  - phase: 41-data-correctness-audit/02
    provides: RATE_SHAPED_NULLABLE_FIELDS list (DCR-08) — every entry registered in polarity registry for alignment
provides:
  - "POLARITY_REGISTRY: explicit Record<string, MetricPolarity> with 28+ registered metrics"
  - "getPolarityWithAuditWarning(metric): dev-mode console warning when an unregistered metric flows into a directional-color surface"
  - "isPolarityRegistered(metric): predicate for audit doc + future test coverage"
  - "MetricPolarity 'neutral' value: suppresses directional encoding for volume/magnitude metrics"
  - "polarityAwarePercentile + polarityForMatrixMetric helpers (matrix-types.ts) — cross-partner heatmap inversion"
  - "Sparkline metric prop scaffold + audit hook — surfaces unregistered metrics ahead of Phase 43 BND-05"
  - "docs/POLARITY-AUDIT.md (164 lines) — surface inventory + adding-metrics workflow + Phase 43 forward dep"
affects:
  - 41-04-statistical-thresholds  # ADR-007 cites the polarity registry as the canonical lookup
  - 41-05-metric-audit  # consumes the registry when verifying every metric's color encoding
  - 43-boundary-hardening  # BND-05 ChartFrame consumes POLARITY_REGISTRY directly via getPolarity(metric)
  - 49-trajectory-rework  # v5.0 trajectory chart will consult polarity if lower_is_better metrics land

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "POLARITY_REGISTRY as Record<string, MetricPolarity> with documented higher_is_better default fallback — explicit-registration discipline prevents silent direction flips when new metrics land"
    - "getPolarityWithAuditWarning: dev-mode audit hook variant of stable getPolarity — surfaces unregistered metrics at first render instead of at ChartFrame migration time"
    - "polarityAwarePercentile transform: 1 - p for lower_is_better, 0.5 for neutral — single helper handles diverging-palette inversion across all matrix surfaces"
    - "matrix-types.ts metricKey field: surfaces the canonical Snowflake key on each MatrixMetric definition — derived rates (perDollarPlacedRate) inherit the polarity of the underlying Snowflake column whose business semantics govern the rate"
    - "Sparkline scaffold pattern: accept metric prop now (audit hook only) so Phase 43 BND-05 single-line trend-tint mode lands polarity-aware on day one — zero migration cost"

key-files:
  created:
    - "docs/POLARITY-AUDIT.md"
  modified:
    - "src/lib/computation/metric-polarity.ts"
    - "src/components/cross-partner/matrix-types.ts"
    - "src/components/cross-partner/matrix-heatmap.tsx"
    - "src/components/cross-partner/matrix-bar-ranking.tsx"
    - "src/components/cross-partner/comparison-matrix.tsx"
    - "src/components/charts/chart-sparkline.tsx"
    - "src/components/charts/partner-sparkline.tsx"
    - "src/components/charts/root-sparkline.tsx"

key-decisions:
  - "Default fallback stays higher_is_better — dominant direction in this domain. Switching to require explicit registration (no default) would have broken every existing callsite that passes a non-canonical metric key, with no offsetting safety benefit (the audit warning surfaces unregistered metrics in dev anyway)"
  - "TOTAL_COLLECTED_LIFE_TIME = neutral (NOT higher_is_better) — magnitude alone is not a quality judgment; the collection rate is. KPI cards already display the rate. Matrix currency tile renders with mid-tier (neutral) coloring, correctly avoiding 'Partner A collected $5M = good' judgments without context"
  - "AVG_AMOUNT_PLACED preserved as lower_is_better — measures average per-account balance (smaller = easier to collect at portfolio level), NOT total placed volume. Pre-existing Phase 14 anomaly smoke contract depends on this; flipping would regress"
  - "Registry keys = canonical Snowflake column names. Derived-rate aliases without 1:1 Snowflake mapping (perDollarPlacedRate) reference the underlying Snowflake column whose business polarity governs the derived rate (perDollarPlacedRate → COLLECTION_AFTER_12_MONTH = higher_is_better). Avoids registry sprawl"
  - "Sparkline accepts optional metric prop now even though current rotational-palette implementation doesn't consume polarity — surfaces unregistered metrics through the audit hook ahead of Phase 43 BND-05's single-line trend-tint mode. Production behavior unchanged today"
  - "polarityAwarePercentile lives in matrix-types.ts (not metric-polarity.ts) — it's a matrix-surface transform, not a domain rule. Keeps metric-polarity.ts focused on the registry + lookup; matrix-types.ts owns matrix-specific helpers (alongside MatrixMetric, MatrixViewProps, getTierClass, formatValue)"
  - "Audit hook (getPolarityWithAuditWarning) deduplicates per metric via module-scoped Set — repeated renders of the same surface don't spam dev console. Cleared on HMR boundaries (the Set is module-scoped) so iterative dev still surfaces warnings as the developer moves between components"
  - "Existing well-behaved callsites (stat-card, modeled-delta-cell, trend-indicator, compose-batch-tooltip-row, compute-anomalies) kept on plain getPolarity — they pre-date the registry, all pass canonical Snowflake metric keys, and touching them risks regression for no audit benefit. Audit hook reserved for newly-touched directional-color surfaces"
  - "Comment-block above POLARITY_REGISTRY documents the cross-references (parse-batch-row.ts RATE_SHAPED_NULLABLE_FIELDS for DCR-08 alignment, docs/POLARITY-AUDIT.md for the audit doc, Phase 43 BND-05 ChartFrame for the forward dep). Self-documenting registry — readers don't need to grep for context"

patterns-established:
  - "Polarity registry as single source of truth: every directional-color surface routes through getPolarity(metric) (or getPolarityWithAuditWarning in newly-touched surfaces); the registry IS the API surface that Phase 43 BND-05 ChartFrame will consume directly via the polarity prop"
  - "Audit-hook-as-scaffold pattern: when a new prop must thread through a primitive but the primitive can't yet consume it (sparkline metric prop, current rotational palette can't tint), wire the audit hook now to surface unregistered metrics, defer functional consumption to the dependent phase. Zero migration cost when the dependent phase lands"
  - "Polarity-aware percentile transform: single helper (1 - p for lower_is_better, 0.5 for neutral) handles all diverging-palette surfaces. Reusable for any future heatmap / matrix / bar-ranking that ranks partners along a polarity axis"
  - "Living-doc convention for registry: docs/POLARITY-AUDIT.md updates alongside POLARITY_REGISTRY changes. Registry table + surface audit table are both authoritative; readers consult the doc for adding-metrics workflow rather than reverse-engineering from code"

requirements-completed:
  - DCR-09

# Metrics
duration: ~50min (interrupted + resumed across two sessions; net work ~50min)
completed: 2026-04-27
---

# Phase 41 Plan 03: Polarity Consistency Audit (DCR-09) Summary

**POLARITY_REGISTRY refactored into explicit Record<string, MetricPolarity> with 28+ registered metrics, dev-mode audit hook (getPolarityWithAuditWarning), four cross-partner / sparkline surfaces routed through polarity, and `docs/POLARITY-AUDIT.md` (164 lines) as the living audit doc that Phase 43 BND-05 ChartFrame will consume.**

## Performance

- **Duration:** ~50 min net (session interrupted by usage limits; resumed and completed)
- **Started:** 2026-04-27T22:30Z (estimated from 11f20b5 commit time)
- **Completed:** 2026-04-27T~23:50Z
- **Tasks:** 3 / 3 (all auto, no checkpoints)
- **Files modified:** 8 (1 created, 7 modified) across 3 commits

## Accomplishments

- **DCR-09 satisfied:** every directional-color surface in the app now routes through `getPolarity()` (or `getPolarityWithAuditWarning` for newly-touched surfaces). `DISPUTE_RATE` is registered as `lower_is_better`; the heatmap diverging palette inverts for it; matrix bar-ranking sorts ascending for it; sparklines log dev warnings if an unregistered metric flows in.
- **`POLARITY_REGISTRY` (28 metrics):** collection rates (3/6/12mo) higher; recovery rates (via existing OUTBOUND_*) higher; penetration (3 variants) higher; engagement (SMS/email/call rates × 6 + DCR-08 alignment fields × 6) higher; conversion ratio higher; diagnostic (account counts with payment/plans, AVG_EXPERIAN_CA_SCORE) higher; **DISPUTE_RATE lower; AVG_AMOUNT_PLACED lower**; volume / count metrics (TOTAL_AMOUNT_PLACED, TOTAL_COLLECTED_LIFE_TIME, TOTAL_ACCOUNTS, TOTAL_CONVERTED_ACCOUNTS, __BATCH_COUNT) neutral.
- **`getPolarityWithAuditWarning`** surfaces unregistered metrics in dev with deduplicated console warnings (per-metric Set).
- **Cross-partner surface sweep:** matrix-heatmap, matrix-bar-ranking, comparison-matrix, plus matrix-types.ts new helpers (`polarityAwarePercentile`, `polarityForMatrixMetric`).
- **Sparkline scaffold:** chart-sparkline + partner-sparkline + root-sparkline accept optional `metric` prop and run the audit hook in dev. Current rotational palette doesn't consume polarity functionally; zero migration cost when Phase 43 BND-05 lands the single-line trend-tint mode.
- **`docs/POLARITY-AUDIT.md` (164 lines):** registry table (28 entries with surfaces), surface audit table (10 callsites with pre/post status), codebase sweep findings (0 additional polarity-blind sites discovered), 6 deferrals with owning phase, 4 open-question resolutions, helper API reference, Phase 43 BND-05 forward dep documented.

## Surfaces actually modified vs. planned

Plan-listed surfaces that were modified:
- `src/lib/computation/metric-polarity.ts` ✅
- `src/components/cross-partner/matrix-heatmap.tsx` ✅
- `src/components/cross-partner/matrix-bar-ranking.tsx` ✅
- `src/components/cross-partner/comparison-matrix.tsx` ✅
- `src/components/kpi/kpi-summary-cards.tsx` — **inspected, no edits required.** Already routes the canonical Snowflake metric key (`COLLECTION_AFTER_*_MONTH`) through `<StatCard>`'s pre-existing polarity-aware code path. Verified end-to-end via line trace.
- `src/components/charts/sparkline.tsx` — **does not exist as a single file.** Plan referenced a not-yet-extracted name; actual sparkline lives across three files (`chart-sparkline.tsx`, `partner-sparkline.tsx`, `root-sparkline.tsx`) — all three now scaffold the metric prop and audit hook.

Surfaces added during execution that weren't in the original plan:
- `src/components/cross-partner/matrix-types.ts` — added `metricKey` field on `MatrixMetric` and the helpers `polarityAwarePercentile` + `polarityForMatrixMetric`. Centralizes matrix-surface polarity logic so heatmap/bar-ranking/comparison-matrix all consult the same helper.

## Codebase grep findings

Per Task 2's "search for OTHER directional-color surfaces" instruction:

- **`grep -rn "delta > 0\|delta < 0\|increased\|decreased" src/components/ src/lib/`:** 0 matches. The codebase pre-classifies direction as `'up' | 'down' | 'flat'` upstream (in computeTrending / computeModeledDelta), so consumers never compare raw scalar deltas to zero in render paths.
- **`grep -rn "direction === 'up'\|direction === 'down'" src/`:** 5 hits across 3 files (stat-card.tsx, modeled-delta-cell.tsx, trend-indicator.tsx). All three are pre-existing polarity-aware callsites consulting `getPolarity(metric)`. No fixes needed — canonical pattern.
- **`grep -rn "text-success\|text-error" src/components/`:** Splits into polarity-relevant (already correct: stat-card, modeled-delta-cell, trend-indicator) and polarity-irrelevant (semantic state — empty-state, metabase-import, partner-lists form validation, type-specimen demo). No additional polarity wiring needed.

**Conclusion:** the pre-Phase 41-03 inventory was complete; only the four cross-partner / sparkline surfaces in the plan were polarity-blind.

## Deviations from Plan

**Rule 1/2/3 auto-fixes:** None.

**Rule 4 architectural changes:** None.

**Plan-vs-reality reconciliation:**
- Plan referenced `src/components/charts/sparkline.tsx` as a single file; actual codebase has three sparkline components (`chart-sparkline.tsx`, `partner-sparkline.tsx`, `root-sparkline.tsx`). Resolved by wiring the metric prop + audit hook through all three. No scope expansion — same intent (sparkline → polarity-aware).
- Plan implied modifying `kpi-summary-cards.tsx`. Verified file is already correct (passes Snowflake metric keys to StatCard's polarity-aware code path). No edits needed; documented as "inspected, verified, no edits" rather than skipped.

**Out-of-scope discoveries:** None.

## Authentication gates

None. Plan executed fully with no auth-required checkpoints.

## Auto-fix attempts

None — every task completed on first attempt without iteration.

## Commits

- `11f20b5 feat(41-03): polarity registry + cross-partner surface sweep (DCR-09)` — Tasks 1 + most of Task 2 (registry refactor, neutral polarity, DISPUTE_RATE registration, audit warning helper, matrix-types helpers, heatmap/bar-ranking/comparison-matrix sweep)
- `6523d7e test(41-02): bootstrap vitest + young-batch censoring synthetic test (DCR-07)` — absorbed Plan 41-03's residual sparkline + lint-cleanup edits during a parallel-plan commit (chart-sparkline.tsx, partner-sparkline.tsx, metric-polarity.ts unused-eslint-disable removal). Cross-plan commit attribution noted; intent preserved.
- `652bb8e docs(41-03): add POLARITY-AUDIT.md (DCR-09)` — Task 3 audit doc.

## Self-Check: PASSED

**Files exist:**
- ✅ `docs/POLARITY-AUDIT.md` (164 lines)
- ✅ `src/lib/computation/metric-polarity.ts`
- ✅ `src/components/cross-partner/matrix-types.ts`
- ✅ `src/components/cross-partner/matrix-heatmap.tsx`
- ✅ `src/components/cross-partner/matrix-bar-ranking.tsx`
- ✅ `src/components/cross-partner/comparison-matrix.tsx`
- ✅ `src/components/charts/chart-sparkline.tsx`
- ✅ `src/components/charts/partner-sparkline.tsx`
- ✅ `src/components/charts/root-sparkline.tsx`

**Commits exist:**
- ✅ `11f20b5` (registry + cross-partner sweep)
- ✅ `6523d7e` (sparkline scaffold + lint cleanup, cross-plan attribution)
- ✅ `652bb8e` (POLARITY-AUDIT.md)

**Verification:**
- ✅ `npx tsc --noEmit` passes (only pre-existing axe-core test typing error, unrelated)
- ✅ `npm run lint` clean on all plan-touched files (pre-existing react-hooks errors in `src/lib/table/hooks.ts` unrelated)
- ✅ `docs/POLARITY-AUDIT.md` ≥ 60 lines (164)
- ✅ Registry table includes ≥10 metrics (28)
- ✅ DISPUTE_RATE registered as lower_is_better in both code and doc
- ✅ Surface audit table covers ≥8 callsites (10)
- ✅ Forward dep to Phase 43 BND-05 documented
- ✅ Deferred section enumerates 6 known-not-fixed surfaces with owning phase

## Cross-references for downstream plans

- **Phase 43 BND-05 (ChartFrame primitive):** `<ChartFrame>` polarity prop reads `getPolarity(metric)` directly. The registry IS the API surface — no new contract to design. Sparkline scaffold (this plan) means the ChartFrame migration of sparkline lands polarity-aware on day one.
- **Plan 41-04 ADR-007 (penetration weighting):** ADR cites `POLARITY_REGISTRY` as the canonical polarity reference. Penetration rate is registered `higher_is_better`; ADR documents why.
- **Plan 41-05 (metric audit):** When the audit verifies every metric's visual encoding, polarity coloring is one column in the verification matrix. Registry's surface audit table is the spec.
- **Phase 49 (v5.0 trajectory rework):** if v5.0 introduces lower_is_better metrics (CHARGE_OFF_RATE, COMPLAINT_RATE) on the trajectory chart, register them in `POLARITY_REGISTRY` and revisit the trajectory "best in class" overlay (currently uses portfolio-avg comparator, polarity is implicit).
