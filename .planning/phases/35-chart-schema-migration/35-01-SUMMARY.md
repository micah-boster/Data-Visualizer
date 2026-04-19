---
phase: 35-chart-schema-migration
plan: 01
subsystem: types
tags: [typescript, zod, discriminated-union, migration, localstorage, saved-views]

# Dependency graph
requires:
  - phase: 32-url-backed-navigation
    provides: additive-optional zod evolution pattern (drill field)
  - phase: 34-partner-lists
    provides: sanitizeSnapshot lazy-on-read pattern + listId precedent
provides:
  - ChartDefinition discriminated-union type (by literal 'type' + 'version')
  - CollectionCurveDefinition variant extract alias
  - chartDefinitionSchema (zod v4 z.discriminatedUnion)
  - migrateChartState pure, idempotent function
  - DEFAULT_COLLECTION_CURVE fallback constant
  - 5-assertion Node-native smoke test (no vitest dependency)
  - smoke:migrate-chart npm script
  - viewSnapshotSchema.chartState relaxed to z.unknown().optional() (Pitfall 1 guard)
affects: [36-chart-builder, 37-chart-presets, any future ViewSnapshot evolution]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "zod v4 z.discriminatedUnion on literal `type` field for closed variant sets"
    - "Lazy-on-read migration inside sanitizeSnapshot — one read path, one migration site"
    - "Idempotency guard: if (type && version in input) revalidate and return"
    - "Node native --experimental-strip-types + node:assert/strict for infra smoke tests (no test framework dep)"
    - "Permissive-at-parse + strict-at-sanitize: schema uses z.unknown() for evolving slots, dedicated schema validates post-migration"

key-files:
  created:
    - src/lib/views/migrate-chart.ts
    - src/lib/views/migrate-chart.smoke.ts
  modified:
    - src/lib/views/types.ts
    - src/lib/views/schema.ts
    - src/lib/views/defaults.ts
    - src/hooks/use-saved-views.ts
    - src/components/charts/use-curve-chart-state.ts
    - src/components/charts/collection-curve-chart.tsx
    - src/components/data-display.tsx
    - package.json
    - tsconfig.json

key-decisions:
  - "ChartDefinition name (not ChartConfig — shadcn already exports that at ui/chart.tsx)"
  - "version is a number literal (2), not a string ('v2') — one byte smaller, trivial compare"
  - "Migration lives in its own file src/lib/views/migrate-chart.ts (types.ts stays type-only)"
  - "Pitfall 1 resolved via Option (c): relax viewSnapshotSchema.chartState to z.unknown().optional(); migrateChartState is the single site that validates against chartDefinitionSchema"
  - "Inline Node-native smoke test (no vitest install) — matches project precedent of deferring test-infra"
  - "Defaults author v2 shape directly (not via migration) — defense in depth; tsc catches future renames at build time"
  - "LegacyChartState kept PRIVATE inside migrate-chart.ts (CONTEXT lock: not exported)"

patterns-established:
  - "Discriminated-union first appearance in this repo (zero prior z.discriminatedUnion usage) — establishes the canonical shape future variants will follow"
  - "Node 22+ --experimental-strip-types as the smoke-test harness when a full test framework would be overkill"
  - "allowImportingTsExtensions: true under moduleResolution: bundler lets the same .ts import suffix satisfy both tsc and Node strip-types"

requirements-completed: [CHRT-01, CHRT-02]

# Metrics
duration: ~18 min
completed: 2026-04-19
---

# Phase 35 Plan 01: Chart Schema Migration Summary

**Replaced flat `ChartViewState` interface with a zod-derived `ChartDefinition` discriminated union (`type` + `version`), wired an idempotent lazy-on-read migration inside `sanitizeSnapshot`, and re-typed all consumers — zero UI changes, build green, smoke test locking the CHRT-02 contract.**

## Performance

- **Duration:** ~18 min
- **Started:** 2026-04-19T01:58:11Z
- **Completed:** 2026-04-19T02:12:31Z
- **Tasks:** 2
- **Files modified:** 9 (2 created, 7 modified)

## Accomplishments

- `ChartDefinition` union + `CollectionCurveDefinition` variant extract now exported from `src/lib/views/types.ts`
- `chartDefinitionSchema` zod discriminated-union added in `src/lib/views/schema.ts`, with the collection-curve variant at `version: 2`
- `viewSnapshotSchema.chartState` relaxed to `z.unknown().optional()` so legacy records never trip the `loadSavedViews` parse gate (Pitfall 1 resolved)
- Pure `migrateChartState(unknown) → ChartDefinition | undefined` lands with idempotency guard, legacy detection, and silent-fallback + `[chartState migration]` warn on every failure branch (Pitfall 4)
- Inline 5-assertion Node smoke test (`migrate-chart.smoke.ts`) covers CHRT-02 contract: legacy→v2, idempotency, missing-metric fallback, unknown-type fallback, undefined passthrough
- Single migration call site: `sanitizeSnapshot` in `use-saved-views.ts:59` (grep-verified)
- 3 default views: 2 rewritten to v2 shape in `defaults.ts`, Outreach Performance (no chartState) untouched
- All 4 consumer narrow sites retyped to `CollectionCurveDefinition`: `use-curve-chart-state.ts` snapshot/restore signatures, `collection-curve-chart.tsx` ref prop types, `data-display.tsx` refs + load-path narrow on `chartState?.type === 'collection-curve'`
- `ChartViewState` interface fully removed — only 3 doc-comment references remain (migrate-chart.ts header, types.ts header, use-saved-views.ts inline comment)

## Task Commits

Each task was committed atomically per the plan's commit-boundary guidance:

1. **Task 1: Author schema + types + migration function + smoke test (contract-first)** — `55fc4fe` (feat)
2. **Task 2: Wire migration into sanitizer + retype all consumers + update defaults (single atomic commit)** — `1f9d316` (feat)

## Files Created/Modified

- `src/lib/views/migrate-chart.ts` (created) — `migrateChartState` pure function, `DEFAULT_COLLECTION_CURVE` export, private `LegacyChartState` type
- `src/lib/views/migrate-chart.smoke.ts` (created) — 5-assertion smoke test using `node:assert/strict`
- `src/lib/views/types.ts` — `ChartDefinition` + `CollectionCurveDefinition` inferred from zod schema; `ChartViewState` interface deleted
- `src/lib/views/schema.ts` — `chartDefinitionSchema` z.discriminatedUnion; `viewSnapshotSchema.chartState` relaxed to `z.unknown().optional()`
- `src/lib/views/defaults.ts` — 2 seeded `chartState` literals (Financial Overview, New Batches) rewritten to v2 shape
- `src/hooks/use-saved-views.ts` — `migrateChartState` import + call inside `sanitizeSnapshot`, placed next to the Phase 34 `listId` sanitizer for visual symmetry
- `src/components/charts/use-curve-chart-state.ts` — `ChartViewState` import replaced with `CollectionCurveDefinition`; `getChartSnapshot` returns v2 shape (`type: 'collection-curve'`, `version: 2`); `restoreChartState` signature updated
- `src/components/charts/collection-curve-chart.tsx` — `chartSnapshotRef` / `chartLoadRef` prop types switched to `CollectionCurveDefinition`
- `src/components/data-display.tsx` — refs retyped; load path narrows on `snapshot.chartState?.type === 'collection-curve'` before invoking `chartLoadRef`
- `package.json` — `smoke:migrate-chart` npm script entry
- `tsconfig.json` — `allowImportingTsExtensions: true` added (see Decisions / Pitfall Encountered below)

## Decisions Made

(See `key-decisions` in frontmatter for the durable set. All planner resolutions held — no re-litigation.)

- Kept planner resolutions (Option (c) for Pitfall 1, `version: 2` as number, inline smoke test, `ChartDefinition` name, `migrate-chart.ts` module split, defaults authored in v2 shape directly, `LegacyChartState` private) verbatim.
- Added `allowImportingTsExtensions: true` to `tsconfig.json` to reconcile Node's ESM strip-types requirement (needs explicit `.ts` suffix) with TypeScript's strictness. Project was already on `moduleResolution: "bundler"` so this is compatible at compile time; Next.js build passed unchanged.
- `console.warn` prefix standardized to `[chartState migration]` across all 4 fallback branches (Pitfall 4 signal for diagnosing real-world drift).
- Migration idempotency verified by the smoke test's assertion #2 (`migrateChartState(migrateChartState(legacy))` deep-equals first call).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Node `--experimental-strip-types` required explicit `.ts` import suffix**

- **Found during:** Task 1 (first smoke-test run after initial file creation)
- **Issue:** `npm run smoke:migrate-chart` failed with `ERR_MODULE_NOT_FOUND: Cannot find module '…/schema'` because Node's native TS loader (Node 24.14 here) resolves ESM strictly and requires an explicit `.ts` extension for relative imports. The plan specified extensionless imports inside `migrate-chart.ts` and `migrate-chart.smoke.ts`.
- **Fix:** Added `.ts` suffix to the two relative imports in `migrate-chart.ts` (`./schema` → `./schema.ts`, `./types` → `./types.ts`) and the one in the smoke test. TypeScript rejects `.ts` suffixes by default, so I also enabled `allowImportingTsExtensions: true` in `tsconfig.json` — compatible with the project's existing `moduleResolution: "bundler"`.
- **Files modified:** `src/lib/views/migrate-chart.ts`, `src/lib/views/migrate-chart.smoke.ts`, `tsconfig.json`
- **Verification:** `npm run smoke:migrate-chart` prints all 5 assertions + expected `[chartState migration]` warn lines; `npx tsc --noEmit` exits clean; `npm run build` completes.
- **Committed in:** `55fc4fe` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary to unblock Task 1 verification. Zero scope creep — the fix is a single tsconfig option + mechanical suffix change. No other plan-locked decisions affected.

## Issues Encountered

- Pre-existing uncommitted changes to `src/components/charts/use-curve-chart-state.ts` (getChartSnapshot/restoreChartState blocks) existed on the branch when Task 1 started — these were in-scope for Plan 35-01 anyway (the very code that needed retyping in Task 2), so they folded cleanly into the Task 2 commit. No rework needed.
- `MODULE_TYPELESS_PACKAGE_JSON` warning noise on every smoke-test run (Node advises adding `"type": "module"` to `package.json`). Left as-is — adding `type: module` would break Next's mixed-CJS build chain; warning is cosmetic and the test still passes.

## Verification Artifacts (grep counts, post-ship)

- `grep -rn ChartViewState src/` → 3 hits (all doc-comment references; zero type/export usage)
- `grep -c "type: 'collection-curve'" src/lib/views/defaults.ts` → 2 hits (both seeded views)
- `grep -rn migrateChartState src/` → 1 app-code call site (`use-saved-views.ts:59`), 1 import, 1 definition, plus smoke-test references — architectural invariant held
- `npm run smoke:migrate-chart` → `✓ migrate-chart smoke test passed (5 assertions)`
- `npx tsc --noEmit` → zero errors
- `npm run build` → `✓ Compiled successfully in 2.9s`
- `npm run check:tokens` / `check:surfaces` / `check:components` / `check:motion` → all green

## User Setup Required

None — no external service configuration required. Migration is infrastructure, runs silently on every localStorage read via `sanitizeSnapshot`.

## Next Phase Readiness

- **Phase 35-02** (validation plan) unblocked — contract now locked at the type + smoke-test layer.
- **Phase 36 (Chart Builder)** unblocked at the type layer — adding a new variant means one new zod object schema in `chartDefinitionSchema`'s array, one new consumer narrow (`chartState.type === '<new-variant>'`), and one new variant-extract alias. Migration function remains idempotent for v2 collection-curve; new variants author themselves at their own version without retrofit.
- **Plan 02's human-verify checkpoint** will cover the browser-level CHRT-01 confirmation (3 default views render + legacy localStorage fixture round-trips) — today's automated verification locks the type/migration layer.

## Self-Check: PASSED

- `src/lib/views/migrate-chart.ts` — FOUND
- `src/lib/views/migrate-chart.smoke.ts` — FOUND
- Task 1 commit `55fc4fe` — FOUND in git log
- Task 2 commit `1f9d316` — FOUND in git log
- All verification commands (smoke, tsc, build, 4 guards) — PASS

---
*Phase: 35-chart-schema-migration*
*Completed: 2026-04-19*
