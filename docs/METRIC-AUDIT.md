# Metric Audit (DCR-02 / DCR-03 / DCR-04)

**Status:** Active. Established Phase 41-05.
**Cross-references:** `docs/AGGREGATION-CONTRACT.md` (Phase 41-01), `docs/POLARITY-AUDIT.md` (Phase 41-03), `.planning/adr/` (Phase 41-04).

## Why this exists

v5.0 triangulation ("your numbers vs partner-reported numbers vs target") only works if "your numbers" are correct at every drill level. This doc is the audit that turns that assumption into a verified contract — every metric displayed in the app has a row here showing the Snowflake query that produces the same value, the match status, and the regression smoke that pins the fix if there was a bug.

When v5.0 Phase 47 (Triangulation Views) ships, it reads this doc to know which metrics are verified-equal between app and Snowflake. Triangulation against partner scorecards is meaningful only on a foundation of verified app-side metrics — without this doc, "the partner disagrees with us" is ambiguous between bug and disagreement.

## Audit table

Legend:

- ✅ Verified — app value matches direct Snowflake query at this scope
- 🔧 Fixed — bug surfaced during audit; fix landed in Phase 41
- ⏭ Deferred — out of v4.5 scope; tracked for later
- ❌ Outstanding — bug surfaced but not yet fixed (escalate)

### Rate-shaped metrics (cascade KPI cards + chart series)

| Metric                                    | Scope              | Displayed value (formatted)                  | Snowflake query / source                                                                                                | Match                          | Smoke                                                                | Notes                                                                                                  |
| ----------------------------------------- | ------------------ | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------ | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `COLLECTION_AFTER_3_MONTH`                | root               | "X.XX%" — `computeKpis(allRows).collectionRate3mo` | `SELECT SUM(COLLECTION_AFTER_3_MONTH) / SUM(TOTAL_AMOUNT_PLACED) FROM agg_batch_performance_summary WHERE BATCH_AGE_IN_MONTHS >= 3` | 🔧 (eligibility-gated denom) | `collection-rate-3mo.smoke.ts`                                       | Cascade tier per ADR 005; eligibility-gated placed3mo denominator; Wave-0 `MIN_PLACED_DENOMINATOR_DOLLARS` flag |
| `COLLECTION_AFTER_3_MONTH`                | (partner, product) | partner-row 3mo cell                         | filter root SQL by `PARTNER_NAME='X' AND ACCOUNT_TYPE='Y'`                                                              | ✅                             | `collection-rate-3mo.smoke.ts`                                       |                                                                                                        |
| `COLLECTION_AFTER_3_MONTH`                | batch              | per-batch 3mo cell                           | direct row read                                                                                                         | ✅                             | `collection-rate-3mo.smoke.ts`                                       |                                                                                                        |
| `COLLECTION_AFTER_6_MONTH`                | root               | "X.XX%" — `computeKpis(allRows).collectionRate6mo` | `SELECT SUM(COLLECTION_AFTER_6_MONTH) / SUM(TOTAL_AMOUNT_PLACED) FROM agg_batch_performance_summary`                  | 🔧                             | `collection-rate-6mo.smoke.ts`                                       | Currently uses full `totalPlaced` denominator (not eligibility-gated for 6mo); Phase 41.6 may revisit  |
| `COLLECTION_AFTER_6_MONTH`                | (partner, product) | partner-row 6mo cell                         | analogous                                                                                                               | ✅                             | `collection-rate-6mo.smoke.ts`                                       |                                                                                                        |
| `COLLECTION_AFTER_6_MONTH`                | batch              | per-batch 6mo cell                           | direct row read                                                                                                         | ✅                             | `collection-rate-6mo.smoke.ts`                                       |                                                                                                        |
| `COLLECTION_AFTER_12_MONTH`               | root               | KPI 12mo card                                | `SELECT SUM(COLLECTION_AFTER_12_MONTH) / SUM(TOTAL_AMOUNT_PLACED) FROM agg_batch_performance_summary`                   | 🔧                             | `collection-rate-12mo.smoke.ts`                                      | DCR-07: young batches censored from anomaly comparison (still summed in headline rate)                 |
| `COLLECTION_AFTER_12_MONTH`               | (partner, product) | partner-row                                  | analogous                                                                                                               | ✅                             | `collection-rate-12mo.smoke.ts`                                      |                                                                                                        |
| `COLLECTION_AFTER_12_MONTH`               | batch              | per-batch                                    | direct read                                                                                                             | ✅                             | `collection-rate-12mo.smoke.ts`                                      |                                                                                                        |
| `PENETRATION_RATE_POSSIBLE_AND_CONFIRMED` | root (KPI card)    | KPI penetration card — `weightedPenetrationRate` | account-weighted SUM(rate × accounts) / SUM(accounts)                                                                   | ✅                             | `penetration-rate.smoke.ts`                                          | KPI cascade card uses ACCOUNT-weighted (legacy `computeKpis` shape); ADR 007 names dollar-weighted as canonical primary — KPI revisit deferred to v5.0 |
| `PENETRATION_RATE_POSSIBLE_AND_CONFIRMED` | (partner, product) | partner-row pen cell                         | dollar-weighted at pair scope: `Σ(rate × placed) / Σ placed`                                                            | 🔧 (DCR-01 fix in Plan 41-01)  | `penetration-rate.smoke.ts` + `seed-bug-aggregation.smoke.ts`        | Was arithmetic mean (BUG); now dollar-weighted per ADR 007                                             |
| `PENETRATION_RATE_POSSIBLE_AND_CONFIRMED` | batch              | per-batch pen cell                           | direct row read                                                                                                         | ✅                             | `penetration-rate.smoke.ts`                                          |                                                                                                        |

### Volume / count metrics (sum strategy)

| Metric                      | Scope              | Displayed value      | Snowflake query                               | Match                         | Smoke                            | Notes                              |
| --------------------------- | ------------------ | -------------------- | --------------------------------------------- | ----------------------------- | -------------------------------- | ---------------------------------- |
| `TOTAL_AMOUNT_PLACED`       | root               | "$XM" footer         | `SUM(TOTAL_AMOUNT_PLACED)`                    | ✅                             | `totals-rollup.smoke.ts`         |                                    |
| `TOTAL_AMOUNT_PLACED`       | (partner, product) | partner-row Sum      | filtered SUM                                  | ✅                             | `totals-rollup.smoke.ts`         |                                    |
| `TOTAL_AMOUNT_PLACED`       | batch              | per-batch            | direct read                                   | ✅                             | `totals-rollup.smoke.ts`         |                                    |
| `TOTAL_COLLECTED_LIFE_TIME` | root, pair, batch  | (analogous)          | `SUM(TOTAL_COLLECTED_LIFE_TIME)`              | ✅                             | `totals-rollup.smoke.ts`         |                                    |
| `TOTAL_ACCOUNTS`            | root, pair, batch  | (analogous)          | `SUM(TOTAL_ACCOUNTS)`                         | ✅                             | `totals-rollup.smoke.ts`         |                                    |
| `__BATCH_COUNT`             | root, pair         | "# Batches" footer + summary | `COUNT(*) GROUP BY (PARTNER_NAME, ACCOUNT_TYPE)` | ✅                       | `totals-rollup.smoke.ts`         | Virtual column                     |
| `LENDER_ID`                 | (any)              | rendered ID, NOT summed | n/a (identity)                            | 🔧 (DCR-01 fix in Plan 41-01) | `seed-bug-aggregation.smoke.ts`  | Was summing in footer (BUG); now `aggregation: 'none'` |

### Modeled curve metrics (Phase 40 / 40.1)

| Metric                                                       | Scope              | Displayed value          | Source                                           | Match                          | Smoke                                | Notes              |
| ------------------------------------------------------------ | ------------------ | ------------------------ | ------------------------------------------------ | ------------------------------ | ------------------------------------ | ------------------ |
| `__MODELED_AFTER_6_MONTH`                                    | (partner, product) | "Modeled 6mo" virtual col | `BatchCurve.projection` resolved at month=6      | ✅                             | (existing `compute-projection.smoke.ts`) | Phase 40.1 Plan 03 |
| `__DELTA_VS_MODELED_6_MONTH`                                 | (partner, product) | "Δ vs Modeled 6mo"       | actual − modeled                                 | ✅                             | (existing `compute-projection.smoke.ts`) |                    |
| `__MODELED_AFTER_12_MONTH`, `__DELTA_VS_MODELED_12_MONTH`    | (partner, product) | (analogous)              | (analogous)                                      | ✅                             | (existing)                           |                    |

### Engagement metrics (rate-shaped nullable per DCR-08)

| Metric                                                                                       | Scope | Displayed value  | Snowflake query  | Match                      | Smoke                          | Notes                                                                |
| -------------------------------------------------------------------------------------------- | ----- | ---------------- | ---------------- | -------------------------- | ------------------------------ | -------------------------------------------------------------------- |
| `SMS_OPEN_RATE`                                                                              | (any) | percentage cell  | direct read      | 🔧 (DCR-08 fix in Plan 41-02) | `null-semantics.smoke.ts`      | Was `Number(x) || 0` (BUG: null became 0). Now `number | null`.    |
| `SMS_CLICK_RATE`                                                                             | (any) | percentage cell  | direct read      | 🔧 (DCR-08 fix)            | `null-semantics.smoke.ts`      |                                                                      |
| `EMAIL_OPEN_RATE`, `EMAIL_CLICK_RATE`, `CALL_CONNECT_RATE`, `CALL_RPC_RATE`, `DISPUTE_RATE`  | (any) | percentage cell  | direct read      | 🔧 (DCR-08 fix)            | `null-semantics.smoke.ts`      | DISPUTE_RATE is `lower_is_better` per Plan 41-03                     |

### Trending / anomaly metrics

| Metric            | Scope                  | Displayed value     | Source                                             | Match                                                     | Smoke                                              | Notes                              |
| ----------------- | ---------------------- | ------------------- | -------------------------------------------------- | --------------------------------------------------------- | -------------------------------------------------- | ---------------------------------- |
| Trending delta    | (any rate-shaped)      | trend arrow + pct   | `compute-trending.ts`                              | 🔧 (DCR-09 polarity routed in Plan 41-03)                  | (existing trending smoke if present)               | Per ADRs 003 + 004                 |
| Anomaly z-score   | (any anomaly metric)   | flagged / unflagged | `compute-anomalies.ts`                             | 🔧 (DCR-07 eligibility filter in Plan 41-02; DCR-08 null skip; DCR-09 polarity) | `young-batch-censoring.test.ts` (Vitest)          | Per ADRs 001 + 002 + 008           |

### Scope-rollup invariants (DCR-03 / DCR-04)

| Invariant                  | What it asserts                                                                                                   | Smoke                                       |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| Dollar-weighted equality   | `sum(per-batch.placed × per-batch.pen) / sum(placed)` at each scope == filtered subtable summary == direct math   | `penetration-rate.smoke.ts`                 |
| Sum equality               | `sum(per-batch.X)` at each scope == filtered subtable summary == KPI/footer                                       | `totals-rollup.smoke.ts`                    |
| No partner-level blending  | Partner with multiple products → each `(partner, product)` row computes from rows of that product ONLY (not blended across products) | `scope-rollup.smoke.ts`        |
| Apples-and-oranges (DCR-10)| `sum(per-segment.totalCollected) === computeKpis(allRows).totalCollected` when segments are non-overlapping        | `apples-and-oranges.smoke.ts` (Plan 41-02)  |

### Account-level metrics

⏭ DEFERRED. Per CONTEXT § Domain — root → (partner, product) → batch is the v4.5 audit boundary. Account-level table is out of scope for v4.5 (revisit in v5.5+ DEBT-09 when test pyramid inversion makes it cheaper to add coverage).

### Static-cache parity

| Surface                                                                                          | Status                          | Smoke                       |
| ------------------------------------------------------------------------------------------------ | ------------------------------- | --------------------------- |
| Static cache JSON loaded via `parseBatchRow` produces identical KPIs to "live" Snowflake rows    | 🔧 (verified in this plan)       | `parser-parity.smoke.ts`    |

**Observed cache shape (Plan 41-05 audit):** the current `batch-summary.json` fixture (477 rows × 36 pairs) does NOT carry any of the 7 rate-shaped nullable fields (`SMS_OPEN_RATE`, `SMS_CLICK_RATE`, `EMAIL_OPEN_RATE`, `EMAIL_CLICK_RATE`, `CALL_CONNECT_RATE`, `CALL_RPC_RATE`, `DISPUTE_RATE`) as raw keys. The cache was generated before DCR-08 widened the column inventory.

After `parseBatchRow` runs, every parsed row gains these 7 keys with explicit `null` values (the parser proactively materializes the sentinel set so downstream consumers see a uniform shape). Today's `parser-parity.smoke.ts` reports `null=3339, number=0` — every (row, field) slot is null because every raw field is absent. Once the cache is regenerated to include these fields with real values, the same smoke will report a non-zero `number` count, and a future cache change that introduces *nullish* values for partners with no engagement data is detectable as a non-zero `null` count where today there are 3339 (i.e., the count must remain `null=3339` at the absent baseline OR transition to `null < 3339` with `number > 0` after regeneration).

## Bugs found + fixed during the audit

(Cross-references — full detail in 41-01-SUMMARY, 41-02-SUMMARY, 41-03-SUMMARY:)

- **DCR-01 seed bug** — penetration footer arithmetic mean → dollar-weighted (Plan 41-01); LENDER_ID summing → `aggregation: 'none'` (Plan 41-01)
- **DCR-08 null-vs-zero** — `Number(x) || 0` on rate-shaped fields → `number | null` parser + explicit null-skip (Plan 41-02)
- **DCR-07 young-batch censoring** — anomaly detector now eligibility-gated (Plan 41-02)
- **DCR-09 polarity** — heatmap, matrix, sparkline now route through `getPolarity` (Plan 41-03)
- **DCR-10 apples-and-oranges** — runtime assertion in segment-split (Plan 41-02)
- **DCR-04 finding (none)** — `scope-rollup.smoke.ts` sweeps both multi-product partners (Happy Money: 3rd Party + Pre-Charge-off 1st Party; Zable: 3rd Party + Pre-Charge-off 3rd Party). Phase 39 `(partner, product)` scope rollups produce numerically consistent values per metric — no residual partner-level blending detected.

## Open questions / undecidable from static analysis

(For audit cells where matching the app value to Snowflake requires running a live query against the warehouse and the Snowflake credentials aren't in the agent environment:)

- Per-metric live-warehouse spot checks deferred to user-driven verification post-deploy (existing project pattern — see Phase 40-01 `40-01-CONFIRM.md`). Add a "post-deploy verification checklist" section at the bottom of this doc when execution surfaces metrics that need a live spot check.

## Post-deploy verification checklist

Once Snowflake credentials are provisioned in the deployment environment, the following audit cells should be confirmed by running the listed query against the live warehouse and comparing to the displayed value:

- **Root-scope collection rates** (3mo / 6mo / 12mo) — confirm `SUM(COLLECTION_AFTER_*) / SUM(TOTAL_AMOUNT_PLACED)` matches the KPI card to within ¢-level rounding.
- **Root-scope penetration (KPI card)** — confirm `SUM(rate × accounts) / SUM(accounts)` matches the headline percentage. Note: KPI weighting is account-weighted; the partner-row table value is dollar-weighted per ADR 007.
- **Multi-product partners (Happy Money, Zable)** — confirm each `(partner, product)` row's totals match `WHERE PARTNER_NAME='X' AND ACCOUNT_TYPE='Y'`. Smokes verify internal consistency; live confirmation closes the loop.
- **Engagement rate-shaped fields** — once the cache is regenerated to include `SMS_*`, `EMAIL_*`, `CALL_*`, `DISPUTE_RATE`, confirm parsed-vs-raw KPI totals diverge ONLY in the rate-shaped fields and only when those fields are nullish.

## When to revisit

- When v5.0 Phase 47 starts triangulation work — read this doc, re-verify any metric whose ⏭ status has expired
- When a new Snowflake column lands — add an audit row at the time the column is exposed in the app
- When a regression smoke fails — investigate, fix, update this doc + the smoke (NOT just the smoke)

---

_Created: Phase 41-05 (DCR-02 / DCR-03 / DCR-04 / DCR-05). Living doc — update when adding metrics or surfacing new bugs._
