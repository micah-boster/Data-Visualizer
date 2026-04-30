---
phase: 41-data-correctness-audit
plan: 05
subsystem: testing
tags: [audit, smokes, regression, snowflake, metric-verification, dcr, triangulation-baseline]

# Dependency graph
requires:
  - phase: 41-data-correctness-audit
    provides: "Plan 41-01 dollar-weighted penetration + per-column aggregation strategies; Plan 41-02 parseBatchRow narrow scope + isMetricEligible + assertSegmentsNonOverlapping; Plan 41-03 POLARITY_REGISTRY; Plan 41-04 ADRs 001-008. The audit doc cross-references all four."
provides:
  - "docs/METRIC-AUDIT.md — living audit table (one row per (metric × scope), 130 lines) covering KPI cards, chart series, table cells, summary rows, comparison matrix, modeled curves, engagement rates, trending/anomaly, scope-rollup invariants, account-level deferral, and static-cache parity"
  - "9 new *.smoke.ts regression scripts pinning every fix landed in Plans 41-01..03 + scope-rollup invariants for DCR-03/04 + parser parity for DCR-08"
  - "9 npm run smoke:* entries — wired into package.json so future smoke sweeps auto-pick them up"
  - "DCR-04 finding: zero residual cross-product blending across both multi-product partners (Happy Money, Zable)"
  - "Static-cache rate-shaped null observation captured (3339 absent slots) so future cache regenerations are detectable"
  - "v5.0 Phase 47 triangulation baseline doc — `docs/METRIC-AUDIT.md` is what triangulation reads to know which metrics are app-vs-Snowflake-equal"
affects: [v5.0, 47, 43, 51]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Three-way invariant smoke pattern: direct math === pair summary === KPI card (asserted at root + (partner, product) scopes for every rate-shaped + sum-strategy metric)"
    - "Negative-test pattern in penetration smoke: confirms arithmetic mean is NOT the value (catches DCR-01 regression structurally, not just by parity)"
    - "Scope-rollup invariant trio (DCR-04): (1) pair summary uses ONLY matching-product rows, (2) computeKpis(matching) === pair summary, (3) sum across products === partner-as-whole"
    - "Static-cache parity check pattern: rawRows vs parseBatchRow(rawRows) compute parity for non-rate-shaped metrics; rate-shaped slot type counts (null/number/absent) emitted for future detection"
    - "Inline pair-summary helpers in smokes (replicating buildPairSummaryRows weightedByPlaced/sum) — `node --experimental-strip-types` cannot resolve @/-aliased imports inside root-columns.ts; the segment-split.smoke.ts precedent applies"

key-files:
  created:
    - docs/METRIC-AUDIT.md
    - src/lib/computation/penetration-rate.smoke.ts
    - src/lib/computation/collection-rate-3mo.smoke.ts
    - src/lib/computation/collection-rate-6mo.smoke.ts
    - src/lib/computation/collection-rate-12mo.smoke.ts
    - src/lib/computation/totals-rollup.smoke.ts
    - src/lib/computation/scope-rollup.smoke.ts
    - src/lib/computation/seed-bug-aggregation.smoke.ts
    - src/lib/computation/null-semantics.smoke.ts
    - src/lib/static-cache/parser-parity.smoke.ts
  modified:
    - package.json

key-decisions:
  - "DCR-04 finding: ZERO cross-product blending detected. scope-rollup.smoke.ts sweeps both multi-product partners (Happy Money: 3rd Party + Pre-Charge-Off 1st Party; Zable: 3rd Party + Pre-Charge-Off 3rd Party); all three invariants pass per partner per metric. Phase 39 (partner, product) scope change holds — no escalation needed."
  - "KPI-card penetration documented as ACCOUNT-weighted (legacy `computeKpis` shape via `weightedPenetrationRate` field), distinct from the partner-row table value which is dollar-weighted (Plan 41-01 fix). ADR 007 names dollar-weighted as canonical primary; KPI-card revisit deferred to v5.0 since the existing account-weighted shape is internally consistent and the column-picker dollar-weighted variant is the direct triangulation surface. Documented in audit row #34 with explicit cross-reference."
  - "Static-cache parser-parity smoke today reports `null=3339, number=0, absent=0` across 477 rows × 7 rate-shaped fields — every (row, field) slot is null because the cached fixture was generated before DCR-08 widened the column inventory. `parseBatchRow` proactively materializes the 7 sentinel keys with `null` even when absent in the raw row. Future cache regenerations that introduce real engagement-rate values are detectable as `number > 0`; future regenerations that introduce nullish values for partners with no engagement data are detectable as `null < 3339 with number > 0`."
  - "Smokes inline pair-summary helpers (replicating buildPairSummaryRows sum/weightedByPlaced) per the segment-split.smoke.ts precedent — `node --experimental-strip-types` cannot resolve @/-aliased imports inside root-columns.ts. Filesystem checks pin production source so drift in either direction is caught (sentinel-constant regex sweep)."
  - "Negative-test in penetration-rate.smoke.ts asserts the value is NOT the arithmetic mean (not just \"close to dollar-weighted\"). Catches the DCR-01 seed bug structurally — even if a future regression somehow lands on a value that's also close to dollar-weighted, the negative assertion fires when the value drifts toward arithmetic mean."
  - "Account-level metrics explicitly deferred (⏭) per CONTEXT lock: root → (partner, product) → batch is the v4.5 audit boundary. Account-level table is out of scope for v4.5; revisit in v5.5+ DEBT-09 when test pyramid inversion makes adding coverage cheaper."
  - "12-month-collection smoke explicitly asserts that `isMetricEligible(11mo, 'COLLECTION_AFTER_12_MONTH')` returns false — a young batch in the chosen Arro::THIRD_PARTY pair (which has mixed-age batches) is censored from anomaly comparison. Pins the DCR-07 fix structurally rather than just by-parity."
  - "Smoke fixture pair selection deterministic: each smoke walks `seen.entries()` in insertion order and picks the first pair meeting the smoke's preconditions (≥3 batches + varied placed sizes for penetration; mixed-age batches for 12mo; multi-product partner for scope-rollup). Avoids fixture-order brittleness while keeping the chosen pair stable across runs."

patterns-established:
  - "Audit doc cross-references the regression smoke pinning each fix — every 🔧 row names the smoke file that catches regression. v5.0 Phase 47 reads this mapping directly to know which metrics have a structural pin vs which need post-deploy live-warehouse spot checks."
  - "Three-way invariant smoke template: load fixture, pick a deterministic representative pair, compute the metric three ways (direct math, summary row, KPI card / equivalent), assert all three match within $0.01 absolute / 1bp on percentages. Adapt for any new metric added downstream."
  - "Scope-rollup smoke template (DCR-04 sweep): for every multi-product partner, assert (1) pair-summary uses ONLY matching-product rows, (2) computeKpis(matching) === pair-summary numbers, (3) Σ(per-product totals) === partner-as-whole. Reusable for any future scope-rollup audit (e.g., when REVENUE_MODEL adds a third dimension per VOC-06)."
  - "Static-cache parity smoke pattern: parse every fixture row through the canonical parser, count rate-shaped slot types (null/number/absent), assert non-rate-shaped KPIs unchanged. Phase 43 BND-01 widens parseBatchRow with branded BatchAgeMonths + long-format curves; this smoke extends naturally."

requirements-completed: [DCR-02, DCR-03, DCR-04, DCR-05]

# Metrics
duration: ~95 min (across two execution sessions; resumed after usage-limit interruption to verify smokes, write SUMMARY, mark requirements)
completed: 2026-04-30
---

# Phase 41 Plan 05: Metric Audit + Regression Smoke Battery Summary

**Living audit doc + 9 regression smokes pinning every Plan 41-01..03 fix; DCR-04 sweep finds zero residual cross-product blending; v5.0 Phase 47 triangulation baseline established**

## Performance

- **Duration:** ~95 min (across two execution sessions)
- **Started:** 2026-04-29T22:58:43Z (initial commit `6d41fb6`)
- **Completed:** 2026-04-30T11:59:00Z (SUMMARY landed; original execution paused after second commit `bddda69` 2026-04-29T23:14:44Z due to usage-limit interruption)
- **Tasks:** 3 (audit doc + 5 smokes; DCR-04 + DCR-05 smokes; parser-parity smoke)
- **Files modified:** 11 (1 audit doc + 9 smokes + 1 package.json)

## Accomplishments

- `docs/METRIC-AUDIT.md` — 130-line living audit with seven sections: rate-shaped metrics (3 cascade tiers + penetration × 3 scopes), volume/count metrics (4 metrics × 3 scopes + LENDER_ID identity), modeled curve metrics (4 virtual cols), engagement rate-shaped nullable (7 metrics), trending/anomaly cross-references, scope-rollup invariants, static-cache parity, account-level deferral
- 9 regression smokes pinning every fix landed Plans 41-01..03 — the bug-fix surface area is now structurally locked against silent return
- DCR-04 audit finding: **zero cross-product blending detected**. Both multi-product partners (Happy Money, Zable) sweep clean across all three invariants
- Static-cache rate-shaped observability baseline captured: today's `null=3339, number=0, absent=0` is the regression detector for any future cache regeneration that changes the rate-shaped field shape
- v5.0 Phase 47 Triangulation now has its baseline — `docs/METRIC-AUDIT.md` enumerates which metrics are verified-equal between app and Snowflake at every drill scope

## Task Commits

Each task was committed atomically:

1. **Task 1: Audit doc + 5 per-metric scope-rollup smokes** — `6d41fb6` (docs)
2. **Task 2: DCR-04 scope-rollup + DCR-05 regression smokes** — `bddda69` (test)
3. **Task 3: Static-cache parser-parity smoke** — included in `6d41fb6` (parser-parity smoke + package.json entry shipped together with Task 1's bundle)

**Plan metadata:** (this commit) `docs(41-05): complete metric audit + regression battery plan`

_Note: Plan 41-05 ran across two execution sessions. Tasks 1 and 3 were bundled into commit `6d41fb6` because the audit doc directly references the parser-parity smoke. Task 2 shipped as `bddda69`. The resume agent (2026-04-30) verified all 9 smokes pass green, ran typecheck (one pre-existing axe-core error in tests/a11y, out of scope per SCOPE BOUNDARY), and wrote this SUMMARY._

## Files Created/Modified

- `docs/METRIC-AUDIT.md` — Living metric audit doc (130 lines, 7 sections, 36 audit rows + scope-rollup invariant table + post-deploy verification checklist)
- `src/lib/computation/penetration-rate.smoke.ts` — Dollar-weighted penetration three-way invariant + DCR-01 negative test (asserts NOT arithmetic mean)
- `src/lib/computation/collection-rate-3mo.smoke.ts` — 3mo rate three-way invariant; eligibility-gated denominator (BATCH_AGE_IN_MONTHS >= 3); young-only sub-pair returns 0
- `src/lib/computation/collection-rate-6mo.smoke.ts` — 6mo rate; pins CURRENT contract (full totalPlaced denominator, no 6mo eligibility filter at rate-derivation layer; flagged in audit doc for Phase 41.6 revisit)
- `src/lib/computation/collection-rate-12mo.smoke.ts` — 12mo rate; mixed-age pair selection; asserts isMetricEligible(11mo) === false (DCR-07 censoring lock)
- `src/lib/computation/totals-rollup.smoke.ts` — TOTAL_AMOUNT_PLACED, TOTAL_COLLECTED_LIFE_TIME, TOTAL_ACCOUNTS, __BATCH_COUNT sum-rollup smokes at pair + root scopes
- `src/lib/computation/scope-rollup.smoke.ts` — DCR-04 sweep: every multi-product partner × three invariants (matching-only rows, computeKpis-match, Σ per-product === partner-as-whole)
- `src/lib/computation/seed-bug-aggregation.smoke.ts` — DCR-05 regression for DCR-01: (a) avgWeighted with PLACED weight, (b) aggregation: 'none' returns null primary, (c) legacy fallthrough still sums
- `src/lib/computation/null-semantics.smoke.ts` — DCR-05 regression for DCR-08: (a) null/undefined/empty/NaN-string → null, (b) genuine 0 preserved, (c) non-rate-shaped pass-through, (d) DISPUTE_RATE in sentinel list, (e) RATE_SHAPED_NULLABLE_FIELDS.length === 7
- `src/lib/static-cache/parser-parity.smoke.ts` — DCR-08 / DCR-02 cache parity: parse all 477 fixture rows; assert rate-shaped fields type as number | null; assert totalAccounts/totalPlaced/totalCollected unchanged by parsing; emit slot type counts for future cache regeneration detection
- `package.json` — 9 new `smoke:*` entries (penetration-rate, collection-rate-3mo/6mo/12mo, totals-rollup, scope-rollup, seed-bug-aggregation, null-semantics, parser-parity)

## Audit-doc match status counts

From `docs/METRIC-AUDIT.md`:

- **✅ Verified:** 17 rows (totals-rollup × 11, modeled curve × 4, penetration KPI × 1, batch-scope cells × 1)
- **🔧 Fixed (Plan 41 fix landed):** 17 rows (collection rates × 6 [3mo/6mo/12mo each at root + various scopes flag eligibility/null fixes], penetration × 2 [DCR-01 fix at pair scope], LENDER_ID × 1, engagement rate-shaped × 7 [DCR-08 fix], trending × 1 [DCR-09], anomaly × 1 [DCR-07/08/09], static-cache parity × 1 [DCR-02 verified-this-plan])
- **⏭ Deferred:** 1 section (account-level metrics — out of v4.5 scope per CONTEXT lock; revisit in v5.5+ DEBT-09)
- **❌ Outstanding:** 0 rows (no new bugs surfaced during the audit)

## Multi-product partners checked (DCR-04)

Both multi-product partners in the static-cache fixture were swept:

1. **Happy Money** — products: 3rd Party, Pre-Charge-Off 1st Party. Three invariants pass per metric: pair-summary uses only matching-product rows, pair-level KPIs match computeKpis(matching), and the sum across products equals the partner-as-whole.
2. **Zable** — products: 3rd Party, Pre-Charge-Off 3rd Party. Same three invariants pass.

`scope-rollup.smoke.ts` output: `multi-product partners checked: 2 — Happy Money, Zable`. Single-product partners (Advance Financial, Affirm, Arro, ...) are excluded from the multi-product invariants by design but participate in the per-metric pair smokes (penetration-rate, collection-rate-*, totals-rollup) at their pair scope.

## Static-cache nullish-rate-shaped observation

`parser-parity.smoke.ts` output: `rows=477, rate-shaped slots=3339: null=3339, number=0, absent=0`.

The current `batch-summary.json` (generated before DCR-08 widened the column inventory) carries none of the 7 rate-shaped nullable fields as raw keys. `parseBatchRow` proactively materializes `SMS_OPEN_RATE`, `SMS_CLICK_RATE`, `EMAIL_OPEN_RATE`, `EMAIL_CLICK_RATE`, `CALL_CONNECT_RATE`, `CALL_RPC_RATE`, `DISPUTE_RATE` with `null` even when absent in the raw row.

This baseline (3339 nulls) is the detection point for future cache regenerations: any non-zero `number` count signals real engagement values arrived; any `null < 3339` with `number > 0` signals partners with explicitly-nullish engagement data (DCR-08 fix path actively engaged).

## Cross-references for downstream phases

- **Phase 43 BND-01 / BND-02** — `parseBatchRow` widens with branded `BatchAgeMonths` and long-format `curve: CurvePoint[]`. `parser-parity.smoke.ts` extends naturally; non-rate-shaped parity assertions stay; new branded-type assertions added per BND-01 contract.
- **Phase 43 BND-05** — ChartFrame primitive inherits `POLARITY_REGISTRY` (already established in Plan 41-03). The audit doc's "Trending / anomaly" section is the polarity-aware ChartFrame surface boundary; no new audit work needed when BND-05 lands.
- **v5.0 Phase 47 (Triangulation Views)** — reads `docs/METRIC-AUDIT.md` as its correctness baseline. Every metric with ✅ status is triangulation-ready; every 🔧 metric has a regression smoke pinning the fix; ⏭ deferred metrics (account-level) are explicitly out of scope. Triangulation against partner scorecards is meaningful only on this verified foundation.
- **v5.5 DEBT-09** — test pyramid inversion lifts the 9 new smokes (plus the 7 pre-existing) into Vitest. The three-way invariant + scope-rollup + parser-parity patterns become Vitest fixtures; the audit doc rows reference the new test file paths once ported.
- **Phase 41.6 (potential)** — collection-rate-6mo currently uses full `totalPlaced` denominator (not eligibility-gated for 6mo, unlike 3mo). Audit doc row #28 flags this; if Phase 41.6 lands a 6mo-eligibility-gated denominator, this smoke updates accordingly.

## Decisions Made

See `key-decisions:` frontmatter for the full list. Critical decisions:

1. **DCR-04 finding NULL** — zero cross-product blending detected; no escalation needed. Phase 39 (partner, product) scope change holds.
2. **KPI-card penetration weighting deferred** — current `computeKpis.weightedPenetrationRate` is account-weighted (legacy shape); ADR 007 names dollar-weighted as canonical primary, but the column-picker dollar-weighted variant is the direct triangulation surface today. KPI-card revisit deferred to v5.0 to avoid touching the cascade KPI rendering path during v4.5 audit-only work.
3. **Account-level metrics deferred** — out of v4.5 scope per CONTEXT lock; revisit in v5.5+ DEBT-09.
4. **Smokes inline pair-summary helpers** — `node --experimental-strip-types` cannot resolve @/-aliased imports inside root-columns.ts. Inline replicas + filesystem regex sweeps catch drift; precedent from segment-split.smoke.ts.

## Deviations from Plan

None - plan executed exactly as written.

The plan included a `verify` clause noting "If the actual `KpiAggregates` shape uses different field names (e.g., `placedTotal` instead of `totalPlaced`), adapt the smoke to those names — read `compute-kpis.ts` for the actual export shape." During Task 3, the smoke author confirmed the actual fields are `totalPlaced`, `totalCollected`, `totalAccounts` (matching the plan's anticipated names). No deviation required. Similarly, the penetration smoke notes that `computeKpis` exposes `weightedPenetrationRate` (not `penetrationRate` or `penetrationRatePossibleAndConfirmed`); the smoke adapts via the documented fallback chain in the plan template.

## Issues Encountered

- **Usage-limit interruption mid-execution.** Original execution session paused after the second task commit (`bddda69` 2026-04-29T23:14:44Z) but before SUMMARY + state updates. Resume agent (2026-04-30) verified all 9 smokes pass green, ran typecheck, and completed the bookkeeping. No code changes from the resume — bookkeeping only.
- **Pre-existing axe-core typecheck error** at `tests/a11y/baseline-capture.spec.ts:18` — unchanged from Plan 41-04; out of scope per SCOPE BOUNDARY rule. Not a Plan 41-05 regression.

## Self-Check: PASSED

Created files verified:
- `docs/METRIC-AUDIT.md` ✅ (130 lines)
- `src/lib/computation/penetration-rate.smoke.ts` ✅
- `src/lib/computation/collection-rate-3mo.smoke.ts` ✅
- `src/lib/computation/collection-rate-6mo.smoke.ts` ✅
- `src/lib/computation/collection-rate-12mo.smoke.ts` ✅
- `src/lib/computation/totals-rollup.smoke.ts` ✅
- `src/lib/computation/scope-rollup.smoke.ts` ✅
- `src/lib/computation/seed-bug-aggregation.smoke.ts` ✅
- `src/lib/computation/null-semantics.smoke.ts` ✅
- `src/lib/static-cache/parser-parity.smoke.ts` ✅

Commits verified:
- `6d41fb6` ✅ (docs(41-05): metric audit doc + per-metric scope-rollup smokes)
- `bddda69` ✅ (test(41-05): DCR-04 scope-rollup + DCR-05 regression smokes)

All 9 new smokes run green via `pnpm run smoke:*`.

## Next Phase Readiness

- **Phase 41 complete.** All 5 plans (41-01 through 41-05) shipped with SUMMARYs. DCR-01..11 closed.
- **Ready for verifier.** Recommend `/gsd:verify-work` against Phase 41 to confirm no drift in the audit doc / smoke set against on-disk state.
- **Next phase candidates** (post-41 transitions):
  - Phase 44 (Vocabulary Lock & Glossary, VOC-01..07) — already in flight (commits `6f35808` and `60eaa1f` on disk for VOC-03 + TERMS registry); parallelizable with remaining 41 verification.
  - Phase 43 (Boundary Hardening, BND-01..06) — sequenced after Phase 41 DCR-08; parseBatchRow extension point ready.
  - Phase 42 (Ingestion-Surface Security Review, SEC-01..06) — gated on OAuth landing on Vercel.
- **Post-deploy verification** — see "Post-deploy verification checklist" section in `docs/METRIC-AUDIT.md` for live-warehouse spot checks (root-scope collection rates, root-scope penetration KPI, multi-product partner totals, engagement rate-shaped fields after cache regeneration).

---
*Phase: 41-data-correctness-audit*
*Completed: 2026-04-30*
