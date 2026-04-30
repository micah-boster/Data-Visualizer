# ADR 0002 — REVENUE_MODEL as Third Scoping Dimension

- **Status:** Accepted
- **Date:** 2026-04-30
- **Phase:** 44 (Vocabulary Lock & Glossary)
- **Requirement:** VOC-06 (also load-bearing for VOC-05, VOC-07)
- **Authors:** Micah (decision); Claude (drafting)

## Status

Accepted.

## Context

v4.1 Phase 39 established `(partner, product)` as the canonical unit of analysis to enforce the apples-and-oranges rule: Contingency vs Debt Sale economics differ enough that aggregating them produces meaningless numbers. A Contingency placement pays Bounce a percentage of recovered funds; a Debt Sale placement transfers the portfolio to Bounce, who keeps everything collected. The denominators, the cash-flow timing, and the partner-facing reporting all differ — blending the two corrupts every downstream KPI, curve, and anomaly score.

The ETL has now added `REVENUE_MODEL` to `agg_batch_performance_summary`, surfacing the third axis of the apples-and-oranges rule. The column landed live as of 2026-04-29 carrying 552 rows: 354 `CONTINGENCY` and 198 `DEBT_SALE`. We need to decide how it integrates into the existing scoping model before v5.0 ships triangulation. Without a structural decision, every consumer (KPIs, curves, anomaly compute, sidebar selection) would be free to blend across this dimension and partners would catch us with reconciliation discrepancies.

A meaningful piece of the data shape is also load-bearing for the decision. Of the 38 distinct (partner, product) pairs in the dataset, 4 partners carry both revenue models for the same product (Advance Financial, Happy Money, Imprint, PatientFi); the remaining 34 are single-model. At the (partner, batch) grain, ZERO batches mix revenue models — every batch placed by a partner who carries both models still belongs cleanly to one model or the other. The "1/550 mixed-revenue-model batch outlier" CONTEXT.md anticipated does NOT exist in the live dataset; the mixed-model warning chip in Plan 44-04 is unexercised on real data today (it remains a defensive guard for future ETL anomalies).

## Decision

**REVENUE_MODEL joins the unit-of-analysis as a third dimension.** Unit becomes `(partner, product, revenue_model)`.

- **KPIs, collection curves, and anomaly detection treat Contingency and Debt Sale as different scopes and never blend them.** The compute-layer signature change to honor this is captured as a Phase 43 (BND-02) follow-up note in the Consequences section below.
- **The sidebar splits a partner-product pair into multiple rows when that partner carries multiple revenue models for the same product.** The split rendering (UI work) ships in Plan 44-04. This plan ships plumbing only.
- **Sidebar label format:** inline suffix — e.g. "Happy Money 3P-Contingency", "Happy Money 3P-DebtSale". One row per `(partner, product, revenue_model)` combo. Compact, scannable, sortable. The display helper `displayNameForPair` accepts the third revenue-model dimension via a new `revenueModelsPerPair` numeric argument that defaults to 1 (no suffix) for backward compatibility with single-model callers.
- **Saved Views and Partner Lists gain a `REVENUE_MODEL` filter axis** as an additive `.optional()` zod field on the existing `PartnerListFilters` schema. Legacy lists (no REVENUE_MODEL key) parse and evaluate identically to pre-change.

## Alternatives Considered

### Treat REVENUE_MODEL as a tag/filter on the existing pair (no third dimension)

Add REVENUE_MODEL as an attribute filter on top of the existing `(partner, product)` pair, leaving the unit of analysis unchanged.

- **Why considered:** Smaller change. No sidebar-row split, no compute-layer fan-out, no migration of partition-by-pair logic.
- **Why rejected:** Tagging implies aggregations CAN safely cross the dimension; the apples-and-oranges rule explicitly forbids this. Would force every consumer (KPIs, curves, anomaly compute) to add its own per-revenue-model split logic, defeating the structural-enforcement-at-the-selection-layer pattern Phase 39 established. The whole point of `(partner, product)` as the unit is that downstream code doesn't have to remember to split — selection enforces it. Adding REVENUE_MODEL as a tag re-introduces the burden everywhere.

### Make REVENUE_MODEL a column-only filter (no scoping role)

Surface REVENUE_MODEL as one more column the user can filter on in the data table, but no role in pair-row selection or saved-list shape.

- **Why considered:** Minimal plumbing. No additive type changes; just register the column in `COLUMN_CONFIGS`.
- **Why rejected:** Same problem as tagging — leaves users free to blend across the dimension. Plus it leaves users unable to easily see Happy Money 3P-Contingency separately from Happy Money 3P-DebtSale without a manual filter dance every time. The whole user-facing point of "this partner carries two revenue models" is to compare them side-by-side, which the column-filter approach makes harder, not easier.

### Re-evaluate based on actual sidebar row count after ETL lands

CONTEXT.md flagged an explicit threshold check before commit: count distinct `(partner, product, revenue_model)` tuples; if the count is unwieldy (rough threshold: > 50 rows total, or > 5 rows per partner), reopen the decision before commit.

- **Why considered:** A real-world data audit could reveal a sidebar-row explosion that makes the third-dimension split impractical (e.g. 200+ rows, scrolling for days).
- **Audit result at execution time:** **38 pre-split (partner, product) pairs → 42 post-split (partner, product, revenue_model) tuples.** Distribution: 34 partners single-model (one row each, no change), 4 partners multi-model (each split into 2 rows for the same product — Advance Financial, Happy Money, Imprint, PatientFi). Maximum rows per partner: 2 (well under the 5-row ceiling). Total rows: 42 (well under the 50-row ceiling).
- **Outcome:** Threshold check **PASSED**. Proceeding with third-dimension scoping.

## Consequences

### Sidebar row count after REVENUE_MODEL split

**42 rows post-split (was 38 pre-split).** Distribution: 34 partners stay one row (single revenue model), 4 partners split into 2 rows each (2 revenue models for the same product). Maximum rows per partner: 2. No partner produces more than the 5-row ceiling; total stays well under the 50-row ceiling. The split is comfortable for sidebar scanning — multi-model partners surface as a small, recognizable cluster rather than a row explosion.

The four multi-model partners as of ETL adoption: **Advance Financial**, **Happy Money**, **Imprint**, **PatientFi**. Each carries both `CONTINGENCY` and `DEBT_SALE` for the same product. Plan 44-04 wires the sidebar to render these as two adjacent rows with the inline suffix.

### Compute-layer follow-up (Phase 43 BND-02 territory, not this plan)

All compute-layer code that operates on `BatchRow[]` filtered by `(partner, product)` must additionally filter by `revenueModel` once it carries the new field. This plan reads `REVENUE_MODEL` as a string field via existing `Record<string, unknown>` access patterns; Phase 43 (BND-01/BND-02) will codify the typed parser path and the compute-signature change. The partition-by-pair logic in `usePartnerStats` and friends will gain a third predicate at that point.

This plan is plumbing only — adding REVENUE_MODEL_VALUES, the optional pair field, the additive zod schema field, the filter-evaluator extension, and the TERMS entries. Behavior change: zero; no UI consumes the new fields yet.

### Saved Views and Partner Lists

- `PartnerListFilters` gains an additive `.optional()` `REVENUE_MODEL?: string[]` field — same Phase 39 evolution pattern that absorbed PRODUCT_TYPE and SEGMENT cleanly. Pre-Phase-44 saved lists in localStorage parse cleanly via `.optional()`; no schemaVersion bump.
- The filter evaluator handles REVENUE_MODEL with the same cross-attribute AND / within-array OR semantics that ACCOUNT_TYPE uses. Missing-field rows degrade defensively (no match) — same convention as missing PRODUCT_TYPE today.
- Saved Views inherit the additive evolution naturally: any future binding to a List with a REVENUE_MODEL filter loads cleanly via the existing `ViewSnapshot.listId` substrate.

### Mixed-revenue-model batch handler (latent today, defensive)

CONTEXT.md anticipated a 1/550 batch with mixed revenue models as a data-quality outlier from the 549/550 audit. **At ETL adoption, the live data carries ZERO mixed-revenue-model batches** — every batch belongs cleanly to one model or the other at the (partner, batch) grain. The mixed-model warning chip Plan 44-04 specifies remains a defensive guard for future ETL anomalies; it is not exercised on current data. Plan 44-04's executor should know: the chip is correctness substrate, not a feature users will see today.

### Vocabulary registry (this plan extends)

- `TERMS` registry at `src/lib/vocabulary.ts` gains three entries: `revenueModel`, `contingency`, `debtSale`. Each one-sentence definition follows the Plan 44-01 tone ("new analyst joining the team, zero domain context") and ends with a sentence period (vocabulary smoke test enforces this).
- The smoke-test exhaustiveness checklist in `vocabulary.smoke.ts` extends from 12 to 15 entries — catches accidental drift in either direction.
- First-instance-per-surface `<Term>` wrapping for the three new terms ships in Plan 44-04 alongside the AttributeFilterBar control + sidebar split UI.

### v5.0 forward-compatibility

v5.0 triangulation work consumes the same primitives this plan ships: `REVENUE_MODEL_VALUES` for closed-enum guards, `PartnerProductPair.revenueModel` for the unit-of-analysis triple, `displayNameForPair`'s third arg for any v5.0 surface that needs the suffix. The compute-layer signature change in Phase 43 is the boundary that makes v5.0 triangulation safe by construction.

### Out of scope (deferred)

- **UI surfaces.** Sidebar pair-row split, breadcrumb update, Partner Setup section, AttributeFilterBar control, mixed-model warning chip — all Plan 44-04. This plan ships plumbing only.
- **Compute-layer signature change.** Phase 43 BND-02. Captured here as a Consequences note so the work is traceable.
- **Re-evaluation of the apples-and-oranges threshold for v5.0 future dimensions** (vintage cohort, geography, etc.) — the principle applies, but specific scoping decisions for those dimensions are individual ADRs in their owning phases.

### Schema state at ADR adoption (Phase 44, ETL 2026-04-29)

- `REVENUE_MODEL` (TEXT, NOT NULL) lives on `BOUNCE.BOUNCE.AGG_BATCH_PERFORMANCE_SUMMARY` as of the 2026-04-29 ETL release, carrying 552 rows split 354 / 198 between `CONTINGENCY` and `DEBT_SALE`.
- This plan registers it in `src/lib/columns/config.ts` `COLUMN_CONFIGS` (which feeds `ALLOWED_COLUMNS`); the data API recognizes it through the same allow-list pattern that absorbed every column in Phase 1. No API code change required.
- This ADR governs the conceptual model; the column registration is the persistence-surface acknowledgement; the pair-helper extension is the unit-of-analysis lift; the filter-evaluator extension is the saved-list lift. Four artifacts, single conceptual model.
