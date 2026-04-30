# Aggregation Contract

**Status:** Active. Established Phase 41-01 (DCR-06).
**Cross-references:** `docs/METRIC-AUDIT.md` (Phase 41-05), `.planning/adr/007-penetration-weighting.md` (Phase 41-04).

## Why this exists

Every column that ships into the data table is one wave of "rows go in, one summary value comes out." The wrong aggregation strategy is a silent bug — the footer renders, the partner-summary row renders, the number is just *wrong* relative to what a direct Snowflake query would produce. This doc is the rule for choosing the right strategy when adding or changing a column.

The motivating bug (DCR-01): `buildPairSummaryRows` was averaging penetration rate arithmetically across batches. That gave a $50K-placed batch with 90% penetration the same weight as a $1M-placed batch with 10% penetration — meaningless math, plausible-looking output. The fix is per-column strategy declaration enforced by code review against this contract.

## The four strategies

| Strategy | Use when | Math | Example |
|----------|----------|------|---------|
| `sum` | Adding values across rows is meaningful | `Σ values` | `TOTAL_AMOUNT_PLACED` (dollars across batches) |
| `avgWeighted` | The metric is a *rate* (numerator over denominator) and rows have different denominator weights | `Σ(value × weight) / Σ weight` (or arithmetic mean if no weight key) | `PENETRATION_RATE_POSSIBLE_AND_CONFIRMED` weighted by `TOTAL_AMOUNT_PLACED` |
| `none` | The column is an identifier, label, or non-aggregable scalar | n/a (footer renders em-dash) | `LENDER_ID`, `BATCH`, `PARTNER_NAME` |
| `range` | The column is a bounded scalar where max−min is more interesting than the central tendency | `max − min` over non-null values | `BATCH_AGE_IN_MONTHS` |

## Decision flowchart

```
Is the column a percentage / rate?
├── Yes → avgWeighted
│         ├── Is there a natural dollar denominator (e.g. TOTAL_AMOUNT_PLACED)?
│         │   └── Yes → set aggregationWeight to that column key
│         └── No → omit aggregationWeight (falls back to arithmetic mean — flag in code review)
│
└── No → Is summing meaningful across batches?
         ├── Yes → sum
         ├── No, it's an ID/label → none
         └── It's a scalar where range is the interesting quantity → range
```

## How to declare strategy on a ColumnDef

Every numeric ColumnDef MUST declare `meta.aggregation`. Text/date columns MAY declare `aggregation: 'none'` for clarity (default behavior is unchanged — the dispatch falls back to "Count: N" for text/date columns when only `meta.type` is set).

```typescript
{
  accessorKey: 'PENETRATION_RATE_POSSIBLE_AND_CONFIRMED',
  meta: {
    type: 'percentage',
    aggregation: 'avgWeighted',
    aggregationWeight: 'TOTAL_AMOUNT_PLACED',
  },
}
```

The canonical `ColumnMeta` interface lives in `src/lib/columns/definitions.ts`. The `AggregationStrategy` type lives in `src/lib/table/aggregations.ts` and is re-exported wherever needed.

## Phase 40.1 escape hatch — `meta.footerFormatter`

When the *aggregate value* is correct but the *display unit* doesn't match the body cell (e.g., delta-vs-modeled cells store on a 0..100 scale but format as "+5.3pp"), use `meta.footerFormatter` to override the footer rendering downstream of `computeAggregates`. The aggregation strategy still drives the math; the formatter just decides how to display it. See `src/components/table/table-footer.tsx` and Phase 40.1 Plan 04 for the original precedent.

This contract preserves that escape hatch unchanged: declare the strategy that gives the right *number*, then layer the formatter that gives the right *unit*. The two concerns are independent.

## Common mistakes

- **Arithmetic mean of percentages across batches with different volumes** — produces a number a Snowflake query will never reproduce. Use `avgWeighted` with the right `aggregationWeight`. This was DCR-01.
- **Summing identity columns (e.g., `LENDER_ID`)** — outputs garbage. Declare `aggregation: 'none'`.
- **Treating `BATCH_AGE` as a sum or mean** — adding two batches' ages doesn't mean anything; `range` (max − min) is the interesting quantity at portfolio scope.
- **Forgetting to declare strategy on a new column** — falls back to the legacy `meta.type` dispatch, which gets percentages wrong (arithmetic mean by default, no weight). Always declare explicitly.
- **Using a non-dollar weight without justification** — channel rates (SMS open rate, email click rate) currently use `TOTAL_AMOUNT_PLACED` because no per-channel volume column exists in the warehouse today. Plan 05 metric audit will revisit per-rate denominators.

## How partner-summary rows differ from the table footer

Both produce one summary value per column from a row set. They share the same strategy table.

- **Footer** (`computeAggregates` in `src/lib/table/aggregations.ts`): aggregates the *currently visible* rows in the data table. Driven by `meta.aggregation` on the ColumnDef. Display further customizable via `meta.footerFormatter`.
- **Partner-summary rows** (`buildPairSummaryRows` in `src/lib/columns/root-columns.ts`): aggregates batch-level rows into one synthetic row per `(partner, product)` pair *before* the table sees them. Implements the same strategies inline (`sum` / `weightedByPlaced` / passthrough) — keep these aligned with the ColumnDef declarations as the contract evolves.

When you add a new metric:

1. Decide its strategy from the flowchart above.
2. Declare `meta.aggregation` (and `aggregationWeight` if needed) on the ColumnDef.
3. If the column also flows through `buildPairSummaryRows`, mirror the same strategy in the inline helper there.
4. If the strategy is non-obvious, add a row to `docs/METRIC-AUDIT.md` (Plan 05 deliverable) with the rationale.

## Audit trail

When adding or changing a strategy:

1. Update the ColumnDef declaration in `definitions.ts` / `root-columns.ts`.
2. If the column also flows through `buildPairSummaryRows`, update the matching helper there.
3. If the strategy decision is non-obvious, add a row to `docs/METRIC-AUDIT.md` with the rationale.
4. Update this doc if a new strategy is added (e.g., a future `'median'` for resistant-mean use cases).

## Strategy table (Phase 41-01 baseline)

The Phase 41-01 audit declared the following strategies. This table is the snapshot at plan landing — Plan 05 metric audit will tighten the per-rate denominator choices.

| Column | Type | Strategy | Weight | Rationale |
|--------|------|----------|--------|-----------|
| `PARTNER_NAME` / `BATCH` / `ACCOUNT_TYPE` | text | none | — | Labels |
| `LENDER_ID` | text | none | — | Identifier — summing outputs garbage |
| `BATCH_AGE_IN_MONTHS` | number | range | — | Span of batch ages is the meaningful summary |
| `TOTAL_*` (currency / count) | currency / count | sum | — | Additive across batches |
| `COLLECTION_AFTER_*_MONTH` | currency | sum | — | Additive |
| `PENETRATION_RATE_*` | percentage | avgWeighted | `TOTAL_AMOUNT_PLACED` | Dollar-weighted (DCR-01) |
| `RAITO_*` / `*_OPEN_RATE_*` / `*_CLICK_RATE_*` / `*_VERIFY_RATE_*` | percentage | avgWeighted | `TOTAL_AMOUNT_PLACED` | Channel rates default; Plan 05 will revisit |
| `__MODELED_AFTER_*` / `__DELTA_VS_MODELED_*` | percentage | avgWeighted | — | Arithmetic mean across batches; `footerFormatter` handles unit display |
| `__BATCH_COUNT` | count | sum | — | Number of batches in the pair |
| `__rank_*` (percentile cols) | count | none | — | Ranks aren't additive |

---

_Created: Phase 41-01 (DCR-06)._
