---
phase: 41-data-correctness-audit
plan: 01
subsystem: data
tags: [aggregation, table, columns, weighted-average, contract]

# Dependency graph
requires:
  - phase: 38-polish-correctness-pass
    provides: numeric-string coercion in computeAggregates (preserved)
  - phase: 40.1-projected-curves-polish
    provides: meta.footerFormatter escape hatch (preserved)
  - phase: 39-partner-config-module
    provides: buildPairSummaryRows + (partner, product) pair scoping
provides:
  - "AggregationStrategy union ('sum' | 'avgWeighted' | 'none' | 'range') exported from aggregations.ts"
  - "ColumnMeta.aggregation + ColumnMeta.aggregationWeight fields on every ColumnDef"
  - "Per-strategy dispatch in computeAggregates with legacy meta.type fallback"
  - "Dollar-weighted penetration in buildPairSummaryRows (DCR-01 seed bug fix)"
  - "docs/AGGREGATION-CONTRACT.md — decision flowchart + per-column strategy table (DCR-06)"
affects:
  - 41-02-narrow-parser  # consumes aggregation strategy when validating narrowed rows
  - 41-04-statistical-thresholds  # ADR-007 cites this contract as the canonical penetration-weighting reference
  - 41-05-metric-audit  # consumes the strategy table when verifying every metric against Snowflake
  - 43-boundary-hardening  # typed canonical row contracts will declare aggregation alongside the schema

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Per-column aggregation strategy declared on ColumnDef.meta — pattern reusable for any future numeric column"
    - "aggregationFor(config) helper: keyed-then-typed dispatch (LENDER_ID → none, BATCH_AGE → range, percentage → avgWeighted, etc.) keeps the strategy decision colocated with the column-config table"
    - "ColumnMeta interface as the canonical meta shape — replaces inline `meta:` literal types previously scattered across ColumnDef entries"

key-files:
  created:
    - "docs/AGGREGATION-CONTRACT.md"
  modified:
    - "src/lib/table/aggregations.ts"
    - "src/lib/columns/definitions.ts"
    - "src/lib/columns/root-columns.ts"
    - "src/lib/columns/percentile-columns.tsx"

key-decisions:
  - "Channel rates (RAITO_*, SMS/email rates) defaulted to TOTAL_AMOUNT_PLACED weight — Plan 05 metric audit will revisit per-rate denominators when the per-channel volume columns become available"
  - "Modeled+delta virtual cols (Phase 40.1) declare avgWeighted with no weight key (arithmetic mean) — meta.footerFormatter still wins downstream for the %/pp display unit. Two concerns kept independent: aggregation drives the math, formatter drives the display"
  - "Numeric column explicitly declared aggregation: 'none' renders em-dash; text/date columns with no explicit declaration preserve the legacy 'Count: N' behavior. Distinguished by inspecting meta.type inside the 'none' branch, not by introducing a new strategy"
  - "Legacy meta.type → strategy dispatch retained as fallback so every existing call site keeps working without edits — plan added contracts incrementally rather than forcing a flag-day migration"
  - "Weight column read via row.original (not row.getValue) inside avgWeighted branch — TOTAL_AMOUNT_PLACED may be hidden in the picker, but row.original carries the raw record from Snowflake"

patterns-established:
  - "AggregationStrategy: per-column strategy declared on meta drives both the table footer and any partner-summary rollup — single source of truth across both surfaces"
  - "buildPairSummaryRows mirror rule: any strategy declared on a ColumnDef must be matched by an inline helper in buildPairSummaryRows when the column also flows through the partner-summary surface (sum / weightedByPlaced / passthrough)"
  - "Aggregation contract doc as living artifact: when adding a new strategy or metric, update docs/AGGREGATION-CONTRACT.md alongside the code change. Code review enforces the contract"

requirements-completed:
  - DCR-01
  - DCR-06

# Metrics
duration: ~30min (interrupted + resumed across two sessions; net work ~30min)
completed: 2026-04-30
---

# Phase 41 Plan 01: Aggregation Contract & Dollar-Weighted Penetration Summary

**Per-column AggregationStrategy declared on every ColumnDef, dollar-weighted penetration replacing arithmetic-mean seed bug in buildPairSummaryRows, and docs/AGGREGATION-CONTRACT.md as the living decision contract.**

## Performance

- **Duration:** ~30 min net (session interrupted; resumed and completed)
- **Started:** 2026-04-27T22:30Z (estimated from f63e588 commit time)
- **Completed:** 2026-04-30T02:12Z
- **Tasks:** 3 / 3
- **Files modified:** 4 (1 created, 3 modified)

## Accomplishments

- DCR-01 seed bug fixed: `buildPairSummaryRows` penetration rate now uses `Σ(rate × placed) / Σ placed`. A `$50K`-placed batch with 90% penetration no longer carries the same weight as a `$1M`-placed batch with 10%.
- DCR-06 satisfied: `docs/AGGREGATION-CONTRACT.md` ships as a 109-line living doc covering the four strategies, decision flowchart, escape-hatch precedent, common mistakes, and the Phase 41-01 baseline strategy table for every column.
- `AggregationStrategy` union (`sum` / `avgWeighted` / `none` / `range`) exported from `aggregations.ts`; `computeAggregates` dispatches on `meta.aggregation` first with legacy `meta.type` fallback so no existing call site broke.
- `aggregationFor()` helper in `definitions.ts` declares the strategy per column key (LENDER_ID → `none`, BATCH_AGE_IN_MONTHS → `range`, percentages → `avgWeighted` by TOTAL_AMOUNT_PLACED, currency/count → `sum`).
- Phase 40.1 `meta.footerFormatter` escape hatch preserved unchanged — `table-footer.tsx` was not touched by this plan.

## Task Commits

Each task committed atomically:

1. **Task 1: Extend column meta and aggregation dispatch** — `f63e588` (feat)
2. **Task 2: Wire dollar-weighted penetration + audit existing column declarations** — `9f5e0ec` (fix)
3. **Task 3: Write the aggregation contract doc** — `f235827` (docs)

## Files Created/Modified

- `src/lib/table/aggregations.ts` — `AggregationStrategy` type + `strategyFor()` resolver + per-strategy dispatch (sum / avgWeighted / none / range). Numeric-string coercion preserved from Phase 38.
- `src/lib/columns/definitions.ts` — `ColumnMeta` interface with `aggregation` + `aggregationWeight` fields; `aggregationFor(config)` helper picks the strategy per column key; `buildColumnDefs()` stamps `aggregation` and `aggregationWeight` into `meta` for every ColumnDef.
- `src/lib/columns/root-columns.ts` — `weightedByPlaced` helper replaces the buggy `weightedAvg` arithmetic-mean. Penetration rate at the partner-summary surface is now dollar-weighted. Every root column declares its strategy explicitly.
- `src/lib/columns/percentile-columns.tsx` — Rank cells declare `aggregation: 'none'` (ranks aren't additive).
- `docs/AGGREGATION-CONTRACT.md` (created, 109 lines) — Decision flowchart, four-strategy table, common-mistakes section, Phase 41-01 baseline strategy table, audit-trail rules for adding/changing strategies.

## Strategy Table at Plan Landing (Phase 41-01 baseline)

| Column                                                 | Type                | Strategy      | Weight                | Notes                                                  |
| ------------------------------------------------------ | ------------------- | ------------- | --------------------- | ------------------------------------------------------ |
| `PARTNER_NAME` / `BATCH` / `ACCOUNT_TYPE`              | text                | `none`        | —                     | Labels                                                 |
| `LENDER_ID`                                            | text                | `none`        | —                     | Identifier — summing was the bug                       |
| `BATCH_AGE_IN_MONTHS`                                  | number              | `range`       | —                     | Span across visible batches                            |
| `TOTAL_*` (currency / count)                           | currency / count    | `sum`         | —                     | Additive across batches                                |
| `COLLECTION_AFTER_*_MONTH`                             | currency            | `sum`         | —                     | Additive                                               |
| `PENETRATION_RATE_POSSIBLE_AND_CONFIRMED`              | percentage          | `avgWeighted` | `TOTAL_AMOUNT_PLACED` | DCR-01 fix                                             |
| Other rate-shaped percentages (`RAITO_*`, channel rates) | percentage        | `avgWeighted` | `TOTAL_AMOUNT_PLACED` | Default; Plan 05 metric audit will revisit denominator |
| `__MODELED_AFTER_*` / `__DELTA_VS_MODELED_*`           | percentage          | `avgWeighted` | (none — arithmetic)   | `meta.footerFormatter` controls the %/pp display unit  |
| `__BATCH_COUNT`                                        | count               | `sum`         | —                     | Number of batches in the pair                          |
| `__rank_*` (percentile cols)                           | count               | `none`        | —                     | Ranks aren't additive                                  |

## Decisions Made

- **Channel rates default to `TOTAL_AMOUNT_PLACED` weight despite no per-channel volume column** — flagged inline + in the contract doc; Plan 05 metric audit will revisit per-rate denominators. Rationale: a dollar-weighted approximation is closer to right than an arithmetic mean across batches with wildly different placed dollars.
- **Modeled+delta virtual cols use `avgWeighted` without an explicit weight** — falls back to arithmetic mean. Phase 40.1's `meta.footerFormatter` still owns the display unit (%/pp). The two concerns are kept independent in the contract: strategy drives the *math*, formatter drives the *display*.
- **Legacy `meta.type` dispatch retained as fallback** — every existing call site keeps working without edits. New columns declare strategy explicitly per the contract; columns without an explicit declaration fall back to the legacy mapping. This was an additive-only change, not a flag-day migration.
- **Weight column read via `row.original`, not `row.getValue`** — TOTAL_AMOUNT_PLACED may be hidden by the column picker, in which case `row.getValue('TOTAL_AMOUNT_PLACED')` would error. `row.original` carries the raw Snowflake record regardless of column visibility.
- **Numeric column explicitly declared `'none'` renders em-dash; text/date with no explicit declaration preserves "Count: N"** — distinguished inside the `'none'` branch by inspecting `meta.type`. Avoids introducing a new strategy variant for the count-vs-suppressed semantics.

## Deviations from Plan

None — plan executed exactly as written. The three tasks landed in order with the expected file shape and the artifact at `docs/AGGREGATION-CONTRACT.md` matches the spec (≥80 lines; final length 109).

## Issues Encountered

- **Session interrupted by usage limit between Tasks 2 and 3.** Confirmed all prior work committed (`f63e588`, `9f5e0ec`), verified `docs/AGGREGATION-CONTRACT.md` was already on disk (untracked) but the commit and SUMMARY hadn't landed. Resumed by committing the doc as Task 3 (`f235827`), then ran final verification + summary.
- **Pre-existing typecheck error in `tests/a11y/baseline-capture.spec.ts`** (missing `axe-core` types) is unrelated to this plan and out of scope (Rule SCOPE BOUNDARY). Logged as deferred — not introduced by this plan.
- **Pre-existing lint warnings/errors in unrelated files** (51 problems, all predating this plan). None in `aggregations.ts`, `definitions.ts`, `root-columns.ts`, or `docs/AGGREGATION-CONTRACT.md`. Out of scope.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- **Plan 04 (statistical thresholds ADRs):** ADR-007 (penetration-weighting) is already drafted in `.planning/adr/007-penetration-weighting.md` and cites this plan as the canonical reference. The contract is in place; the ADR documents the *why*.
- **Plan 05 (metric audit):** Will consume the Phase 41-01 baseline strategy table from `docs/AGGREGATION-CONTRACT.md` when verifying every metric against a direct Snowflake query at root / `(partner, product)` / batch scope. The strategy table is the audit checklist.
- **Plan 02 (narrow parser, eligibility, apples-and-oranges):** Already landed (`5650a66`); aggregation strategy and metric eligibility are independent contracts. No coupling to verify.
- **Plan 03 (polarity registry):** Already landed (`11f20b5`).
- **Future column additions:** Any new ColumnDef must declare `meta.aggregation` per the contract; if a new strategy is needed (e.g., `'median'` for resistant-mean cases), update the contract doc alongside the code.

## Self-Check: PASSED

- `docs/AGGREGATION-CONTRACT.md` exists at 109 lines (≥80 minimum).
- `f63e588`, `9f5e0ec`, `f235827` all present in `git log`.
- `src/lib/table/aggregations.ts` exports `AggregationStrategy` and dispatches on `meta.aggregation`.
- `src/lib/columns/definitions.ts` declares `ColumnMeta` interface with `aggregation` and `aggregationWeight` fields and stamps them via `aggregationFor()`.
- `src/lib/columns/root-columns.ts` uses `weightedByPlaced` for penetration; arithmetic-mean `weightedAvg` is gone.
- `npx tsc --noEmit` produces no new errors in any of the touched files.
- Phase 40.1 `meta.footerFormatter` contract preserved — `table-footer.tsx` not touched by this plan.

---
*Phase: 41-data-correctness-audit*
*Completed: 2026-04-30*
