# Phase 41: Data Correctness Audit - Context

**Gathered:** 2026-04-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Verify that every metric displayed in the app (KPI cards, chart series, table cells, summary rows, partner rollups) matches a direct Snowflake query at every scope level — root → partner → `(partner, product)` → batch — AND apply the targeted statistical fixes surfaced by the late-April 2026 data review (young-batch censoring, NULL-vs-zero, polarity consistency, apples-and-oranges runtime invariant), AND lock the statistical thresholds as ADRs.

This phase is breadth-first audit + surgical fixes. Architectural rewrites of anomaly detection (e.g., Bayesian, t-distribution for small samples) and the full canonical row representation with branded types and long-format curves remain in their respective later phases (v5.5 DEBT and Phase 43 BND). The exception is the parser at `src/lib/data/parse-batch-row.ts` — co-implemented in Phase 41 to satisfy DCR-08, then extended by Phase 43 BND-01/02. See **Cross-phase coordination** below.

</domain>

<decisions>
## Implementation Decisions

### Audit deliverable shape (DCR-02 / DCR-03 / DCR-06)

- **Audit doc** lives at `docs/METRIC-AUDIT.md` as a living markdown table. One row per `(metric × scope)` combination. Columns: metric / scope (root | (partner, product) | batch) / displayed value / Snowflake query / match? / notes. The doc is the proof artifact — v5.0 triangulation builds on it as its baseline.
- **Rollup proof (DCR-03)** is a per-metric `*.smoke.ts` script in `src/lib/computation/`. Each script asserts the same value at all three scope levels: KPI card === root summary row === filtered subtable summary === direct Snowflake query. Reuses the existing smoke pattern.
- **Aggregation contract (DCR-06)** lives in `docs/AGGREGATION-CONTRACT.md` as a standalone doc. Covers: rule for choosing `sum` / `avgWeighted` / `none` / `range`, decision flowchart, examples from existing columns, the Phase 40.1 `meta.footerFormatter` escape hatch. Cross-references `METRIC-AUDIT.md`.
- **Bug tracking during the audit** is inline in `METRIC-AUDIT.md` — rows stay marked ❌ until the fix lands; commit messages reference the row. No separate bug log. A bug closes only when a regression smoke (or Vitest, where applicable) pins it (DCR-05).

### Young-batch censoring (DCR-07)

- **Architecture: metric-age-eligibility filter.** A 4-month-old batch is never compared against `COLLECTION_AFTER_12_MONTH` (or any metric whose lookback the batch hasn't reached). Per-age-bucket norms is *not* the chosen path — it would introduce a new dimension to anomaly logic and small-cohort statistical risk.
- **Eligibility rule:** strict — `batch_age_months >= metric_horizon_months`. No safety margin. Matches how a human reads the metric.
- **UI for ineligible metric on a young batch:** suppress (em-dash or blank) with a tooltip explaining the batch isn't old enough yet. No anomaly badge. Mirrors the Wave-0 KPI suppression pattern.
- **ADR** documents the choice in `.planning/adr/` (see DCR-11 below — same ADR convention).
- **Synthetic test:** Vitest unit test in `src/lib/computation/`. Fixture has 5 young (4mo) + 5 old (24mo) batches; asserts young batches don't flag on 12mo metrics unless they're anomalous within their own age cohort. **This pulls the v5.5 DEBT-09 test-pyramid-inversion seed forward into v4.5.** Vitest setup (config, runner, CI hook) is in scope of this phase to make the test runnable.

### NULL semantics sequencing (DCR-08 ↔ Phase 43 BND-01)

- **Co-implement the canonical parser in Phase 41** at `src/lib/data/parse-batch-row.ts`, narrow to NULL semantics scope. Phase 43 BND-01/02 inherits and extends to branded `BatchAgeMonths`, long-format `curve: CurvePoint[]`, full `BatchRow` / `AccountRow` interfaces. No throwaway shim.
- **Rate-shaped fields (carry `number | null`):** engagement and small-denominator rates — SMS open/click rates, email open/click rates, call connect / RPC rates, dispute rates. Anywhere a partner can legitimately have zero activity. Collection rates and recovery rates remain `number` because their denominator (placed-dollars) is always present.
- **Anomaly detector** identifies null via explicit `value === null` check (not NaN, not undefined). Detector skips on null. Aligns with the parser's `number | null` contract.
- **`Number(row.X) || 0` callsite sweep:** done in Phase 41. Once the parser lands, callsites consume typed `number | null` directly and the `|| 0` pattern disappears as a side effect. Captured under DCR-05 regression smokes (anomaly + KPI cascade + matrix).

### Penetration weighting + threshold ADRs (DCR-11)

- **Penetration weighting:** dollar-weighted is the canonical primary metric (matches Wave-0 `MIN_PLACED_DENOMINATOR_DOLLARS` rationale and how partners think about commitment-to-pay value). Account-weighted ships as a secondary column available via the column picker for digital-channel diagnostics. Both column headers explicitly label their weighting (e.g., "Penetration ($-wt)" and "Penetration (acct-wt)").
- **Display canonicalization:** the dollar-weighted column is the single source of truth across KPI cards, default table column, and the comparison matrix. Account-weighted column does NOT appear in KPI cards or matrix — it's a table-column-picker affordance only.
- **ADR shape:** one ADR per threshold in `.planning/adr/`. Files: `001-z-threshold.md`, `002-min-groups.md`, `003-trending-pct.md`, `004-baseline-window.md`, `005-cascade-tiers.md`, `006-min-placed-denom.md`, `007-penetration-weighting.md`, `008-young-batch-censoring.md`. One value, one decision, one history.
- **Partner overrides:** none. Phase 39 partner config exists for product-type and segment scoping, not for threshold tuning. Per-partner threshold overrides invite p-hacking and erode triangulation. ADRs document the global value; v5.5+ revisits if needed.

### Claude's Discretion

The following requirements are scoped by the roadmap and don't need user weigh-in — Claude decides during planning/implementation:

- **DCR-01 (summary-row seed bug):** per-column aggregation strategy declaration on column definitions, footer reuses each column's formatter. Pattern is established by Phase 40.1's `meta.footerFormatter` escape hatch — DCR-01 generalizes it across all column types.
- **DCR-04 (Phase 39 scope audit):** mechanical sweep of `(partner, product)` rollups for residual blending. Smoke-script pattern already chosen above (DCR-03).
- **DCR-05 (regression fixtures):** every bug found gets a smoke or Vitest test. Format follows DCR-07 precedent.
- **DCR-09 (polarity audit):** sweep every place a metric is shown with directional color (KPI delta arrows, heatmap diverging palette, sparkline tints, comparison-matrix coloring) and route through `getPolarity()`. Phase 43 BND-05 ChartFrame requires `polarity` prop; coordinate naming.
- **DCR-10 (apples-and-oranges runtime invariant):** dev fails loud (assert), prod logs (telemetry); does not block render. Comment in `compute-kpis.ts:52-55` becomes the assertion.

</decisions>

<specifics>
## Specific Ideas

- **Audit doc anchors the v5.0 triangulation baseline.** When Phase 47 (Triangulation Views) starts, it reads `METRIC-AUDIT.md` to know which columns are verified-equal between app and Snowflake. Triangulation against partner scorecards is layered on a *trusted* foundation; without the audit doc, "the partner disagrees with us" is ambiguous between bug and disagreement.
- **Vitest seed in DCR-07 is intentional.** DEBT-09 (test pyramid inversion) is deferred to v5.5, but adding one Vitest test now plants the seed — runner, config, CI hook in place. v5.5 expands rather than bootstraps.
- **Parser pulled forward (DCR-08 → BND-01).** The roadmap had the canonical parser in Phase 43; this discussion moves the NULL-semantics narrow scope into Phase 41 to avoid a throwaway shim. Phase 43 success criteria for BND-01/02 should be amended to "extend the existing parser at `src/lib/data/parse-batch-row.ts` with branded types and long-format curves" rather than "build the parser."
- **Eligibility filter, not bucket norms.** Architectural commitment matches the apples-and-oranges discipline already in the app — a metric that hasn't ripened isn't comparable to one that has, so don't compare it. Statistically simpler, defensible to partners, less surface area than per-age-bucket cohorts.
- **Dollar-weighted penetration is the primary.** Aligns the new ADR with the Wave-0 `MIN_PLACED_DENOMINATOR_DOLLARS` decision (a $1M-placed batch with 10% penetration matters more than a $50K-placed batch with 90%). Account-weighted survives as a diagnostic toggle, not as a parallel headline number.

</specifics>

<deferred>
## Deferred Ideas

- **Bayesian / t-distribution rewrite of anomaly detection** — architectural rewrite, out of scope. v5.5 DEBT phase candidate if signal quality remains a complaint after Phase 41 fixes.
- **Per-metric `nullable` registry** at `src/lib/metrics/registry.ts` — considered for DCR-08 but rejected in favor of parser-level rate-shaped typing. If a metric typology emerges (rate / count / dollar / ratio) it would live here in v5.5.
- **Configurable per-metric eligibility horizons** — rejected for DCR-07 in favor of the strict rule (batch age ≥ metric horizon). Revisit if signals like `COLLECTION_AFTER_3_MONTH` need a different ripeness rule than the strict horizon implies.
- **Partner-overridable thresholds** (any of the DCR-11 thresholds) — rejected for v4.5; revisit in v5.5+ if specific partners need tuning that doesn't compromise triangulation.
- **Show-both penetration with column-picker exposure for matrix/KPI** — only the table gets the secondary account-weighted column. KPI cards and comparison matrix stay single-canonical (dollar-weighted). If digital-channel diagnostics need account-weighted in the matrix, that's a v5.0+ surfacing decision.

## Cross-phase coordination

**Phase 43 (Boundary Hardening) BND-01 success criteria need amendment** once Phase 41 lands the parser. The amendment: "extend the existing parser at `src/lib/data/parse-batch-row.ts` with branded `BatchAgeMonths`, long-format `curve: CurvePoint[]`, full `BatchRow` and `AccountRow` interfaces" — not "build the parser." Flag for the v4.5-ROADMAP.md when Phase 41 completes.

**Phase 43 BND-05 ChartFrame `polarity` prop** is co-defined by DCR-09's polarity audit. Phase 41 sweeps callsites to route through `getPolarity()`; Phase 43 makes `polarity` a required prop on color-encoded ChartFrame channels.

</deferred>

---

*Phase: 41-data-correctness-audit*
*Context gathered: 2026-04-27*
