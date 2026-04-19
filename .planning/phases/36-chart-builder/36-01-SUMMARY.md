---
phase: 36-chart-builder
plan: 01
subsystem: charts
tags: [zod, typescript, chart-builder, discriminated-union, axis-eligibility, node-strip-types]

requires:
  - phase: 35-chart-schema-migration
    provides: "ChartDefinition discriminated-union framework + chartDefinitionSchema with collection-curve variant + migrateChartState lazy-on-read contract + Node --experimental-strip-types smoke harness"
provides:
  - "line / scatter / bar chart variants appended to chartDefinitionSchema"
  - "LineChartDefinition / ScatterChartDefinition / BarChartDefinition / GenericChartDefinition narrow type aliases"
  - "axisRefSchema shared axis shape ({ column: string } | null)"
  - "getEligibleColumns + isColumnEligible helpers derived from COLUMN_CONFIGS + isNumericType"
  - "ChartTypeForAxis + AxisRole public type aliases"
  - "smoke:axis-eligibility npm script (15 assertions)"
  - "migrate-chart.smoke.ts extended with 6 new assertions (11 total)"
affects: [36-chart-builder plans 02-05, 37-metabase-sql-import]

tech-stack:
  added: []
  patterns:
    - "Pattern 2 (36-RESEARCH): axis eligibility derived from COLUMN_CONFIGS registry, never a hand-maintained list"
    - "Shared axisRefSchema reused across line/scatter/bar variants for structural symmetry"
    - "Narrow type aliases published from the union (Extract<>) so downstream plans can target a single variant without repeating the narrow"

key-files:
  created:
    - src/lib/columns/axis-eligibility.ts
    - src/lib/columns/axis-eligibility.smoke.ts
    - .planning/phases/36-chart-builder/deferred-items.md
  modified:
    - src/lib/views/schema.ts
    - src/lib/views/types.ts
    - src/lib/views/migrate-chart.smoke.ts
    - package.json

key-decisions:
  - "axisRefSchema shared across line/scatter/bar variants rather than inlined per-variant — single source of truth for the { column: string } shape; stale keys handled at the UI layer, not the schema layer"
  - "Narrow aliases LineChartDefinition / ScatterChartDefinition / BarChartDefinition + GenericChartDefinition union published from views/types.ts — downstream builder / GenericChart / preset catalog can target a single variant without repeating Extract<>"
  - "Classification rules baked into getEligibleColumns verbatim from 36-RESEARCH §Pattern 2: Y numeric-only across all three types; X = time OR numeric OR identity-categorical for line, numeric for scatter, categorical for bar"
  - "isOrdinal helper kept in axis-eligibility.ts even though unused in v1 rules — reserved for Plan 03 reuse without expanding the file later"
  - "isColumnEligible returns false for null/undefined/unknown-registry keys so callers can pass raw saved-view values without defensive pre-checks"
  - "Pitfall 1 guard proven in smoke test — a collection-curve body under a `type: 'line'` discriminator is rejected by discriminatedUnion safeParse (no cross-variant shape leakage)"

patterns-established:
  - "Registry-derivation lock: any axis / preset / builder surface reads from COLUMN_CONFIGS + type-predicate helpers (isNumericType); adding a new column to config.ts propagates automatically"
  - "Node --experimental-strip-types smoke test convention continues — import with .ts suffix, assert via node:assert/strict, end with a banner log including assertion count"
  - "Discriminated-union variant addition without viewSnapshotSchema.chartState edits — the z.unknown().optional() relaxation shipped in Phase 35 absorbs new variants through migrateChartState without schema-layer churn"

requirements-completed: [CHRT-07, CHRT-08, CHRT-13]

duration: 3min
completed: 2026-04-19
---

# Phase 36 Plan 01: Type-Layer Contracts Summary

**Extended ChartDefinition discriminated union with line/scatter/bar variants + shipped axis-eligibility helper derived from COLUMN_CONFIGS + published 4 narrow type aliases, locking the contracts Waves 2-3 of Phase 36 depend on.**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-04-19T13:42:08Z
- **Completed:** 2026-04-19T13:45:07Z
- **Tasks:** 3
- **Files modified:** 4 (+ 3 created = 7 files touched)

## Accomplishments

- chartDefinitionSchema now carries 4 variants (collection-curve + line + scatter + bar). Each Phase 36 variant uses version: 1, a shared axisRefSchema, and nullable x/y axes so the empty-builder state (both axes unset) parses cleanly.
- Narrow type aliases LineChartDefinition / ScatterChartDefinition / BarChartDefinition + the GenericChartDefinition union exported from views/types.ts. Builder / renderer / preset catalog can target a single variant without rewriting Extract<>.
- axis-eligibility.ts ships getEligibleColumns + isColumnEligible as a pure derivation from COLUMN_CONFIGS + isNumericType. No hand-maintained lists; adding a column to config.ts propagates to every Phase 36 UI surface automatically.
- Smoke coverage extended: migrate-chart.smoke.ts 5 -> 11 assertions (valid line/scatter/bar parse, null-axes allowed, Pitfall 1 cross-variant rejection, wrong-version rejection, migrateChartState idempotency on v1 line). New axis-eligibility.smoke.ts ships 15 assertions exercising per-chart-type X rules + Y numeric-only invariant + isColumnEligible guard paths.
- smoke:axis-eligibility npm script wired.

## Task Commits

1. **Task 1: Extend chartDefinitionSchema with line/scatter/bar variants + publish narrow type aliases** — `b0dc219` (feat)
2. **Task 2: Create axis-eligibility helper** — `87e6fe3` (feat)
3. **Task 3: Extend smoke coverage + wire smoke:axis-eligibility** — `5ba8d81` (test)

## Files Created/Modified

- `src/lib/views/schema.ts` — added axisRefSchema + lineChartVariantSchema + scatterChartVariantSchema + barChartVariantSchema, appended to the discriminated union, removed the Phase 35 placeholder comment.
- `src/lib/views/types.ts` — appended LineChartDefinition / ScatterChartDefinition / BarChartDefinition / GenericChartDefinition narrow aliases.
- `src/lib/columns/axis-eligibility.ts` — new pure library file; 3 internal predicates (isCategorical / isTime / isOrdinal) + 2 public helpers (getEligibleColumns / isColumnEligible) + 2 public type aliases (ChartTypeForAxis / AxisRole). Reads only from COLUMN_CONFIGS + isNumericType.
- `src/lib/columns/axis-eligibility.smoke.ts` — new 15-assertion smoke proving per-chart-type X rules + universal Y numeric-only + isColumnEligible guard paths.
- `src/lib/views/migrate-chart.smoke.ts` — appended 6 new assertions (banner bumped 5 -> 11), imported chartDefinitionSchema directly so variant safeParse can be exercised alongside migrateChartState round-trips.
- `package.json` — added `"smoke:axis-eligibility": "node --experimental-strip-types src/lib/columns/axis-eligibility.smoke.ts"` script alongside the Plan 02 `smoke:chart-presets` entry landed in parallel.
- `.planning/phases/36-chart-builder/deferred-items.md` — logged the pre-existing axe-core test error (out of Phase 36 scope).

## Decisions Made

See `key-decisions` frontmatter. Four concrete patterns locked for downstream Phase 36 + 37 consumers:

1. Shared axisRefSchema across variants — structural symmetry, single edit point when the axis shape evolves.
2. Narrow aliases published from the union — downstream signatures stay tight (`LineChartDefinition` vs `ChartDefinition & { type: 'line' }`).
3. Registry-derivation lock — axis eligibility derives from COLUMN_CONFIGS + isNumericType; any hand-maintained list is a bug per 36-CONTEXT.
4. Pitfall 1 is schema-level, proven — cross-variant shapes fail discriminatedUnion safeParse; no runtime narrowing drift downstream.

## Deviations from Plan

None — plan executed exactly as written.

The only scope-adjacent event was the Plan 02 executor (running in parallel in Wave 1) independently appending `smoke:chart-presets` to package.json. Plan 01's action already anticipated this write race; the executor merged cleanly (Plan 02's entry sits between Plan 01's smoke:axis-eligibility and the check:* guards).

## Issues Encountered

- `npx tsc --noEmit` surfaced a pre-existing error in `tests/a11y/baseline-capture.spec.ts(18,29): Cannot find module 'axe-core'` — Phase 33-01 installed `@axe-core/playwright` as a runtime dep but the spec imports `axe-core` directly. Out of Phase 36 scope; logged to `.planning/phases/36-chart-builder/deferred-items.md` per scope-boundary discipline. My changes introduce zero new tsc errors (verified by diffing tsc output before/after).

## User Setup Required

None.

## Next Phase Readiness

- Wave 2 (Plans 03-05) and the remaining Wave 1 plan (Plan 02 preset catalog, executing in parallel) can now `import { LineChartDefinition, ScatterChartDefinition, BarChartDefinition, GenericChartDefinition } from '@/lib/views/types'` and `import { getEligibleColumns, isColumnEligible } from '@/lib/columns/axis-eligibility'` without further contract edits.
- ChartDefinition discriminated-union narrowing works at the type layer AND at the schema layer — consumers can rely on `if (chartState.type === 'line') { /* chartState is LineChartDefinition here */ }` with full TypeScript inference.
- Phase 33 blocker recorded (`tests/a11y/baseline-capture.spec.ts` axe-core import) — unrelated to Phase 36 but noted in `deferred-items.md` for the a11y phase.
- Phase 36 dual Y-axis concern (STATE.md blockers) remains open; Plan 01 does not introduce new Y-axis surface area (still a single `y: axisRefSchema.nullable()` per variant). Dual-axis exploration deferred to builder / renderer plans.

## Self-Check: PASSED

All 8 claimed files present on disk. All 3 task commits present in git log.

- FOUND: src/lib/views/schema.ts
- FOUND: src/lib/views/types.ts
- FOUND: src/lib/views/migrate-chart.smoke.ts
- FOUND: src/lib/columns/axis-eligibility.ts
- FOUND: src/lib/columns/axis-eligibility.smoke.ts
- FOUND: package.json (smoke:axis-eligibility entry)
- FOUND: .planning/phases/36-chart-builder/deferred-items.md
- FOUND: .planning/phases/36-chart-builder/36-01-SUMMARY.md
- FOUND: b0dc219 (Task 1 commit)
- FOUND: 87e6fe3 (Task 2 commit)
- FOUND: 5ba8d81 (Task 3 commit)

---
*Phase: 36-chart-builder*
*Completed: 2026-04-19*
