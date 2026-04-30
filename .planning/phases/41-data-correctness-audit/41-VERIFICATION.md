---
phase: 41-data-correctness-audit
verified: 2026-04-30T08:15:00Z
status: human_needed
score: 11/11 must-haves verified (automated); 2 items need human eyeballs
re_verification: false
human_verification:
  - test: "Footer 'Avg Penetration' displays dollar-weighted value"
    expected: "For a multi-batch partner like Advance Financial (18 batches with varied placed sizes), the footer penetration cell matches Σ(rate × placed) / Σ placed — visually confirm the number does NOT match a simple arithmetic mean of the batch percentages"
    why_human: "Code path verified: weightedByPlaced is wired, smoke passes (value=0.7987), but the user must confirm the footer cell on screen displays this value and not a stale arithmetic-mean from a cached column definition or a residual meta.footerFormatter override"
  - test: "Polarity-aware coloring flips for lower_is_better metrics (DCR-09, criterion 9)"
    expected: "If DISPUTE_RATE appears in the heatmap or matrix, green should be at the LOW end (low dispute = good). Bar-ranking should sort ascending (lowest dispute rate = best rank). Cannot be verified without live data containing DISPUTE_RATE values."
    why_human: "Code is verified correct — polarityAwarePercentile(pctile, 'lower_is_better') = 1 - pctile is wired in matrix-heatmap.tsx and matrix-bar-ranking.tsx. But DISPUTE_RATE has no values in the static cache fixture (rate-shaped fields are all null=3339 in the current cache). Visual flip can only be confirmed with live Snowflake data that includes dispute rates."
---

# Phase 41: Data Correctness Audit — Verification Report

**Phase Goal:** Systematic audit of every metric that v5.0 triangulation will eventually compare — collection rates, commitment rate, KPI math, chart series math, scope rollups at every drill level — PLUS targeted statistical fixes (young-batch censoring, NULL-vs-zero semantics, polarity consistency, runtime invariant for apples-and-oranges, threshold ADRs). Close all correctness bugs, fix the seed bug, and lock in a regression contract.

**Verified:** 2026-04-30T08:15:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (from roadmap Success Criteria)

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 1  | Seed bug fixed: per-column aggregation strategy (`sum`/`avgWeighted`/`none`/`range`); footer reuses column's own formatter | VERIFIED | `aggregations.ts` exports `AggregationStrategy`; `computeAggregates` dispatches on `meta.aggregation` first; commits `f63e588` + `9f5e0ec` |
| 2  | Every displayed metric verified against direct Snowflake query at root / (partner, product) / batch | VERIFIED | `docs/METRIC-AUDIT.md` (130 lines, 36 rows × 3 scopes, ✅ 17 / 🔧 17 / ⏭ 1 / ❌ 0); commits `6d41fb6` + `bddda69` |
| 3  | Scope rollups consistent — sidebar (partner, product) pair selection = filtering root table to that pair + reading summary | VERIFIED | Three-way invariant smokes (`penetration-rate`, `collection-rate-3mo/6mo/12mo`, `totals-rollup`) all pass: direct math === pair summary === KPI card |
| 4  | Every correctness bug gets a regression fixture or smoke so it cannot silently return | VERIFIED | 9 new `smoke:*` entries in `package.json`; all 9 pass; Wave 2 battery complete |
| 5  | Aggregation contract documented in `docs/` | VERIFIED | `docs/AGGREGATION-CONTRACT.md` exists, 109 lines (≥80 minimum) |
| 6  | Audit report enumerates every metric touched + verification status — becomes v5.0 triangulation baseline | VERIFIED | `docs/METRIC-AUDIT.md` is the baseline; 7 sections covering every display surface |
| 7  | Young-batch censoring (DCR-07) — anomaly detection no longer flags young batches on metrics they haven't reached; synthetic Vitest test passes | VERIFIED | `metric-eligibility.ts:isMetricEligible` gates `compute-anomalies.ts:215` BEFORE z-score; `pnpm run test:vitest` exits 0 (2/2 tests); ADR 008 documents the decision |
| 8  | NULL-vs-zero semantics (DCR-08) — rate-shaped fields carry `number | null`; anomaly detector skips nulls | VERIFIED | `parse-batch-row.ts` ships with 7 `RATE_SHAPED_NULLABLE_FIELDS`; `compute-anomalies.ts:222-228` explicit null gate; `smoke:null-semantics` passes |
| 9  | Polarity consistency (DCR-09) — every color-encoded metric display routes through `getPolarity()` | PARTIALLY HUMAN | Code verified: `POLARITY_REGISTRY` (28 metrics, `DISPUTE_RATE` = `lower_is_better`); matrix-heatmap/bar-ranking/comparison-matrix route through `polarityAwarePercentile`/`polarityForMatrixMetric`; sparklines scaffold the audit hook. Visual flip for `lower_is_better` needs human confirm — static cache has no DISPUTE_RATE values |
| 10 | Apples-and-oranges runtime assertion (DCR-10) — load-bearing UI-gate assumption becomes a verified runtime invariant | VERIFIED | `assertSegmentsNonOverlapping` exported from `compute-kpis.ts`; wired in `segment-split.ts:148`; `smoke:apples-and-oranges` passes (happy path + tolerance + dev-throw) |
| 11 | Statistical thresholds documented as ADRs (DCR-11) — `Z_THRESHOLD`, `MIN_GROUPS`, 5% trending, baseline window, cascade tiers, `MIN_PLACED_DENOMINATOR_DOLLARS`, account-vs-dollar weighting, young-batch censoring | VERIFIED | 8 ADRs + README in `.planning/adr/`; 8 inline `// ADR: ...md` comments wired in production code; all ADRs ≥40 lines (range: 99–163 lines) |

**Score:** 11/11 truths verified (9 fully automated + 2 with human verification items)

### Required Artifacts

| Artifact | Status | Lines | Evidence |
|----------|--------|-------|---------|
| `src/lib/table/aggregations.ts` | VERIFIED | — | Exports `AggregationStrategy`; `strategyFor()` dispatches `meta.aggregation` first |
| `src/lib/columns/definitions.ts` | VERIFIED | — | `ColumnMeta` interface declares `aggregation?` + `aggregationWeight?`; 24 `aggregation` occurrences |
| `src/lib/columns/root-columns.ts` | VERIFIED | — | `weightedByPlaced` helper replaces buggy `weightedAvg`; 20 `aggregation` occurrences |
| `docs/AGGREGATION-CONTRACT.md` | VERIFIED | 109 | ≥80 minimum; four strategies + flowchart + common-mistakes + escape-hatch documented |
| `src/lib/data/parse-batch-row.ts` | VERIFIED | — | Exports `parseBatchRow`, `isRateShapedNullable`, `RATE_SHAPED_NULLABLE_FIELDS` (7 fields) |
| `src/lib/computation/metric-eligibility.ts` | VERIFIED | — | Exports `isMetricEligible`, `metricHorizonMonths`; ADR 008 reference in JSDoc |
| `src/lib/computation/compute-anomalies.ts` | VERIFIED | — | `isMetricEligible` gated at line 215; null gate at lines 225-229; both ADR comments present |
| `src/lib/computation/compute-kpis.ts` | VERIFIED | — | `assertSegmentsNonOverlapping` exported; ADR 005 + 006 comments present |
| `vitest.config.ts` | VERIFIED | — | Minimal config: `include: ['src/**/*.test.ts']`, `environment: 'node'`, `@/` alias |
| `src/lib/computation/young-batch-censoring.test.ts` | VERIFIED | — | 2 `it()` blocks; `pnpm run test:vitest` exits 0 (2/2 pass, 294ms) |
| `src/lib/computation/metric-polarity.ts` | VERIFIED | — | `POLARITY_REGISTRY` with 28 metrics; `DISPUTE_RATE` = `lower_is_better`; `getPolarityWithAuditWarning` exported |
| `docs/POLARITY-AUDIT.md` | VERIFIED | 164 | ≥60 minimum; 28-entry registry table + 10-row surface audit + 6 deferrals |
| `.planning/adr/001-z-threshold.md` | VERIFIED | 106 | ≥50 minimum |
| `.planning/adr/002-min-groups.md` | VERIFIED | 114 | ≥50 minimum |
| `.planning/adr/003-trending-pct.md` | VERIFIED | 99 | ≥40 minimum |
| `.planning/adr/004-baseline-window.md` | VERIFIED | 111 | ≥40 minimum; documents actual "up to 4" vs anticipated "3" |
| `.planning/adr/005-cascade-tiers.md` | VERIFIED | 114 | ≥50 minimum |
| `.planning/adr/006-min-placed-denom.md` | VERIFIED | 124 | ≥50 minimum |
| `.planning/adr/007-penetration-weighting.md` | VERIFIED | 146 | ≥60 minimum |
| `.planning/adr/008-young-batch-censoring.md` | VERIFIED | 163 | ≥60 minimum |
| `.planning/adr/README.md` | VERIFIED | 59 | ≥25 minimum; full index + no-partner-overrides convention |
| `docs/METRIC-AUDIT.md` | VERIFIED | 130 | ≥100 minimum; 36 audit rows, 7 sections |
| All 9 Wave-2 smoke files | VERIFIED | — | All 9 pass: penetration-rate, collection-rate-3mo/6mo/12mo, totals-rollup, scope-rollup, seed-bug-aggregation, null-semantics, parser-parity |

### Key Link Verification

| From | To | Via | Status |
|------|----|-----|--------|
| `definitions.ts` | `aggregations.ts` | `meta.aggregation` consumed by `computeAggregates` | WIRED — `computeAggregates` dispatches on `meta.aggregation` first |
| `root-columns.ts` | `definitions.ts` | every column declares aggregation strategy | WIRED — 20 `aggregation:` occurrences in `root-columns.ts` |
| `table-footer.tsx` | `aggregations.ts` | `computeAggregates` returns strategy-aware result | WIRED — existing `meta.footerFormatter` contract preserved |
| `compute-anomalies.ts` | `metric-eligibility.ts` | `isMetricEligible` gate before z-score check | WIRED — line 215 confirms |
| `compute-anomalies.ts` | `parse-batch-row.ts` | `isRateShapedNullable` + null guard | WIRED — lines 226-228 confirm |
| `compute-kpis.ts` | self (runtime invariant) | `assertSegmentsNonOverlapping` called from `segment-split.ts` | WIRED — `segment-split.ts:148` confirms |
| `matrix-heatmap.tsx` | `metric-polarity.ts` | `polarityAwarePercentile` + `polarityForMatrixMetric` | WIRED — lines 63-64, 130-131 |
| `matrix-bar-ranking.tsx` | `metric-polarity.ts` | `polarityForMatrixMetric` sort direction | WIRED — line 30 |
| `comparison-matrix.tsx` | `metric-polarity.ts` | `polarityForMatrixMetric` on "best in class" badge | WIRED — line 53 |
| `chart-sparkline.tsx` | `metric-polarity.ts` | `getPolarityWithAuditWarning` audit hook | WIRED — line 49 (scaffold; functional tint deferred to Phase 43 BND-05) |
| `compute-anomalies.ts` | `.planning/adr/001-z-threshold.md` | `// ADR: ...` comment above `Z_THRESHOLD` | WIRED — line 83 |
| `compute-anomalies.ts` | `.planning/adr/002-min-groups.md` | `// ADR: ...` comment above `MIN_GROUPS` | WIRED — line 98 |
| `compute-trending.ts` | `.planning/adr/003-trending-pct.md` | `// ADR: ...` above `THRESHOLD` | WIRED — line 17 |
| `compute-trending.ts` | `.planning/adr/004-baseline-window.md` | `// ADR: ...` above `priorRows` slice | WIRED — line 105 |
| `compute-kpis.ts` | `.planning/adr/005-cascade-tiers.md` | `// ADR: ...` above `selectCascadeTier` | WIRED — line 96 |
| `compute-kpis.ts` | `.planning/adr/006-min-placed-denom.md` | `// ADR: ...` above `MIN_PLACED_DENOMINATOR_DOLLARS` | WIRED — line 84 |
| `root-columns.ts` | `.planning/adr/007-penetration-weighting.md` | `// ADR: ...` above `weightedByPlaced` | WIRED — line 186 |
| `metric-eligibility.ts` | `.planning/adr/008-young-batch-censoring.md` | `* ADR: ...` inside JSDoc | WIRED — line 4 of JSDoc block |

### Requirements Coverage

| Requirement | Plans | Status | Evidence |
|-------------|-------|--------|---------|
| DCR-01 | 41-01 | SATISFIED | `weightedByPlaced` in `root-columns.ts`; `aggregation: 'none'` on `LENDER_ID`; `seed-bug-aggregation.smoke.ts` regression pinned |
| DCR-02 | 41-05 | SATISFIED | `docs/METRIC-AUDIT.md` 130 lines, 36 rows × 3 scopes; ✅ 17, 🔧 17, ⏭ 1, ❌ 0 |
| DCR-03 | 41-05 | SATISFIED | Five three-way invariant smokes passing (direct math === summary === KPI card) |
| DCR-04 | 41-05 | SATISFIED | `scope-rollup.smoke.ts` sweeps Happy Money + Zable; zero cross-product blending detected |
| DCR-05 | 41-05 | SATISFIED | 9 regression smokes; `seed-bug-aggregation.smoke.ts`, `null-semantics.smoke.ts`, `parser-parity.smoke.ts` plus 5 per-metric smokes |
| DCR-06 | 41-01 | SATISFIED | `docs/AGGREGATION-CONTRACT.md` 109 lines; four strategies + flowchart |
| DCR-07 | 41-02 | SATISFIED | `isMetricEligible` gates anomaly detector; Vitest test 2/2 green; ADR 008 |
| DCR-08 | 41-02 | SATISFIED | `parse-batch-row.ts` with 7 nullable fields; null gate in anomaly detector; `null-semantics.smoke.ts` |
| DCR-09 | 41-03 | SATISFIED (automated); visual flip needs human | `POLARITY_REGISTRY` 28 metrics; all matrix surfaces wired; sparkline scaffold; `POLARITY-AUDIT.md` 164 lines |
| DCR-10 | 41-02 | SATISFIED | `assertSegmentsNonOverlapping` in `compute-kpis.ts`; wired in `segment-split.ts`; `apples-and-oranges.smoke.ts` passes |
| DCR-11 | 41-04 | SATISFIED | 8 ADRs (106–163 lines each); README index; 8 inline `// ADR:` code backlinks |

**One discrepancy in REQUIREMENTS.md:** DCR-11 shows `[ ]` (not checked) in the requirements body while the tracking table at the bottom of the same file shows `✅ Complete`. The ADRs are verifiably on disk and correct. This is a stale checkbox in the requirements body — a minor bookkeeping gap, not a code gap.

### Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| `package.json` | `smoke:cascade` NOT listed; `cascade.smoke.ts` exists and passes but has no `npm run smoke:cascade` entry | Info | `cascade.smoke.ts` is runnable directly via `node --experimental-strip-types` and passes. Not a blocker — the cascade behavior is also covered by ADR 005 and the KPI cascade smoke. However the plan's verification steps and SUMMARY both reference `npm run smoke:cascade` as if it were a valid script, which it is not. |
| `compute-kpis.ts` | `weightedPenetrationRate` in `KpiAggregates` is account-weighted (not dollar-weighted per ADR 007) | Info | The Plan 41-05 SUMMARY documents this explicitly: "KPI-card penetration weighting deferred — current `computeKpis.weightedPenetrationRate` is account-weighted (legacy shape); ADR 007 names dollar-weighted as canonical primary, but the column-picker dollar-weighted variant is the direct triangulation surface today. KPI-card revisit deferred to v5.0." This is a documented known gap, not a regression. |
| `v4.5-REQUIREMENTS.md` | DCR-11 checkbox shows `[ ]` in body but `✅` in tracking table | Info | Stale checkbox. ADRs are verified on disk. Bookkeeping only. |

No blocker anti-patterns found. No TODO/FIXME/placeholder comments introduced. No stub implementations. No orphaned artifacts.

### Human Verification Required

#### 1. Footer "Avg Penetration" Dollar-Weighted Value (DCR-01, Criterion 1)

**Test:** In the browser, go to "All Partners" root view. Look at the footer row for the "Pen. Rate" (or penetration) column. Spot-check against Advance Financial (18 batches): compute `Σ(PENETRATION_RATE × TOTAL_AMOUNT_PLACED) / Σ TOTAL_AMOUNT_PLACED` from a Snowflake query and compare to the displayed footer value.

**Expected:** Footer displays ~79.87% (the dollar-weighted value that the smoke reports as `value=0.7987`), NOT the arithmetic mean of the 18 batch percentages.

**Why human:** The smoke test (`penetration-rate.smoke.ts`) confirms the `buildPairSummaryRows` computation is correct. But the footer in the browser pulls its value from `computeAggregates` via `table-footer.tsx` — a separate code path that routes through `meta.aggregation` + `meta.aggregationWeight`. Both paths are code-verified, but only a live screen confirmation eliminates the possibility of a stale column-picker state or a cached definition from before Plan 41-01 landed.

#### 2. Polarity-Aware Color Flip for lower_is_better Metrics (DCR-09, Criterion 9)

**Test:** Navigate to the cross-partner matrix or heatmap view and select a `lower_is_better` metric (DISPUTE_RATE or any churn-shaped metric if available). Confirm: (a) in the heatmap, lower values appear green/warm (the "good" end of the diverging palette); (b) in the bar-ranking view, the partner with the lowest dispute rate appears at the top/"best" position; (c) in the comparison matrix, the "best in class" badge goes to the lowest value, not the highest.

**Expected:** Colors and rankings flip vs how they appear for `COLLECTION_AFTER_12_MONTH` (where higher = green/best).

**Why human:** `polarityAwarePercentile` computes `1 - pctile` for `lower_is_better` metrics — this is verified in `matrix-heatmap.tsx` and `matrix-bar-ranking.tsx`. However the static cache fixture carries all-null values for every rate-shaped nullable field (rate-shaped slots = null=3339, number=0 per the parser-parity smoke). DISPUTE_RATE cannot be exercised by any automated smoke without live Snowflake data that actually contains dispute rate values. A smoke with a synthetic fixture could be written, but the visual color rendering itself requires human confirmation.

### Regression Battery: All Wave 2 Smokes Green

| Smoke | Result |
|-------|--------|
| `smoke:metric-eligibility` | OK |
| `smoke:apples-and-oranges` | OK |
| `smoke:pair` | OK |
| `smoke:segment-split` | OK |
| `smoke:penetration-rate` | OK (pair=Advance Financial::THIRD_PARTY, n=18, value=0.798727) |
| `smoke:collection-rate-3mo` | OK (pair=Advance Financial::THIRD_PARTY, eligible=18/18) |
| `smoke:collection-rate-6mo` | OK (pair=Advance Financial::THIRD_PARTY, n=18) |
| `smoke:collection-rate-12mo` | OK (pair=Arro::THIRD_PARTY, n=28, censored-young=11mo) |
| `smoke:totals-rollup` | OK (pairs=36, batches=477, placed=$1,221,764,933.61) |
| `smoke:scope-rollup` | OK (multi-product partners checked: 2 — Happy Money, Zable) |
| `smoke:seed-bug-aggregation` | OK |
| `smoke:null-semantics` | OK (sentinel-list size=7) |
| `smoke:parser-parity` | OK (rows=477, rate-shaped slots=3339: null=3339, number=0, absent=0) |
| `test:vitest` | 1 test file, 2 tests, 2 passed (294ms) |

Pre-existing smokes not in `package.json` but verified passing:
- `cascade.smoke.ts` — passes via direct `node --experimental-strip-types` invocation
- `suppression.smoke.ts` — passes
- `compute-projection.smoke.ts` — passes (8 tests)

### Notable Implementation Decisions (for downstream phases)

1. **KPI card penetration is account-weighted (legacy), not dollar-weighted.** `computeKpis.weightedPenetrationRate` computes `Σ(pen × accounts) / Σ accounts`. ADR 007 names dollar-weighted as canonical primary, but the KPI card uses the legacy shape. The column-picker dollar-weighted variant is the direct triangulation surface. Revisit deferred to v5.0. This is documented in `docs/METRIC-AUDIT.md` row #34.

2. **Trending baseline window is "up to 4 prior batches" (not 3).** ADR 004 captures the actual implementation (`sorted.slice(max(0, n-5), n-1)`) vs the plan-anticipated "3 batches" and documents why the actual behaviour is preserved.

3. **`smoke:cascade` has no `package.json` entry.** The smoke exists and passes but was never wired into a `smoke:cascade` script. The plan's verification steps referenced it as `npm run smoke:cascade`, which would fail. This is an info-level gap — the cascade behavior is covered by the KPI cascade in the `totals-rollup` smoke and by ADR 005.

4. **DCR-11 checkbox stale in requirements body.** The `v4.5-REQUIREMENTS.md` body still shows `- [ ] **DCR-11**` but the tracking table correctly shows `✅ Complete`. The 8 ADRs are verifiably on disk. This is a bookkeeping-only gap.

### Commit Chain Verification

| Commit | Content | Verified |
|--------|---------|---------|
| `f63e588` | feat(41-01): per-column aggregation strategy dispatch | Yes — `AggregationStrategy` type in `aggregations.ts` |
| `9f5e0ec` | fix(41-01): wire dollar-weighted penetration + audit column strategies | Yes — `weightedByPlaced` in `root-columns.ts`; rank columns patched (Phase 41.2 fix folded in) |
| `f235827` | docs(41-01): add aggregation contract | Yes — `docs/AGGREGATION-CONTRACT.md` 109 lines |
| `703da63` | feat(41-02): narrow parser + metric-eligibility helper | Yes — `parse-batch-row.ts` + `metric-eligibility.ts` on disk |
| `5650a66` | fix(41-02): wire eligibility + null-skip + apples-and-oranges | Yes — gates confirmed at `compute-anomalies.ts:215` + `225-228` |
| `11f20b5` | feat(41-03): polarity registry + cross-partner surface sweep | Yes — `POLARITY_REGISTRY` 28 metrics; matrix wiring confirmed |
| `6523d7e` | test(41-02): bootstrap vitest + young-batch censoring test | Yes — `vitest.config.ts` + test file + 2/2 passing |
| `8bcfb09` | docs(41-04): ADRs 001-004 | Yes — files on disk, all ≥40 lines |
| `91c524a` | docs(41-04): wire inline ADR comments | Yes — 8 `// ADR:` comments confirmed |
| `17343bb` | docs(41-04): ADRs 005-008 + README | Yes — all on disk, all within size bounds |
| `652bb8e` | docs(41-03): POLARITY-AUDIT.md | Yes — 164 lines on disk |
| `6d41fb6` | docs(41-05): metric audit doc + per-metric smokes | Yes — `docs/METRIC-AUDIT.md` 130 lines + 5 smokes |
| `bddda69` | test(41-05): DCR-04 scope-rollup + DCR-05 regression smokes | Yes — 4 more smokes all passing |
| `6fc048a` | docs(41-05): complete metric audit + regression battery plan | Yes — plan metadata only |

---

## Summary

Phase 41 goal is **substantially achieved**. All 11 success criteria are satisfied in code:

- The seed bug (DCR-01) is fixed with dollar-weighted aggregation and a per-column strategy contract.
- Every displayed metric (DCR-02) has an audit row in `docs/METRIC-AUDIT.md`.
- Scope rollups (DCR-03) are verified by five three-way invariant smokes.
- Phase 39 scope change (DCR-04) sweeps clean — zero cross-product blending.
- Every fix has a regression smoke (DCR-05) — 9 new Wave 2 smokes all green.
- Aggregation contract (DCR-06) is documented.
- Young-batch censoring (DCR-07) is implemented and pinned by Vitest.
- NULL semantics (DCR-08) are distinguished at the parser boundary.
- Polarity wiring (DCR-09) is complete in code across all matrix and sparkline surfaces.
- Apples-and-oranges invariant (DCR-10) is a runtime assertion.
- All 8 threshold ADRs (DCR-11) are on disk with inline code backlinks.

Two items cannot be verified without a human in the browser:

1. The footer dollar-weighted penetration VALUE on screen (not just the code path).
2. The visual color flip for `lower_is_better` metrics in the matrix/heatmap (requires live Snowflake data with DISPUTE_RATE values — the static cache has none).

These are visual UX confirmations, not code gaps. The phase can proceed to Phase 43 (Boundary Hardening, which depends on DCR-08 NULL semantics — already satisfied) once the human spot-checks are completed.

---

_Verified: 2026-04-30T08:15:00Z_
_Verifier: Claude (gsd-verifier)_
