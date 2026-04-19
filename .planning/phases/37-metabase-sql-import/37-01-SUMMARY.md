---
phase: 37-metabase-sql-import
plan: 01
subsystem: data-import
tags: [sql-parser, node-sql-parser, snowflake, metabase, zod, view-snapshot]

# Dependency graph
requires:
  - phase: 35-chart-schema-migration
    provides: chartDefinitionSchema + migrateChartState (used by chart-inference round-trip gate)
  - phase: 36-chart-builder
    provides: isColumnEligible + axis-eligibility rules (gate inferred chart axes)
  - phase: 34-partner-lists
    provides: ViewSnapshot.listId additive-optional precedent (mirrored by sourceQuery)
  - phase: 32-02
    provides: ViewSnapshot.drill additive-optional precedent (mirrored by sourceQuery)
provides:
  - parseMetabaseSql pure-function SQL -> ParseResult translator
  - mapToSnapshot ParseResult -> Partial<ViewSnapshot> translator
  - inferChart heuristic with isColumnEligible gate + migrateChartState validity round-trip
  - ViewSnapshot.sourceQuery additive-optional audit field
  - SOURCE_TABLE constant for FROM-table mismatch checks
  - 8-assertion parse smoke + 6-assertion map smoke
affects: [37-02 wizard UI, 37-03 apply wiring, future MBQL import (META-06)]

# Tech tracking
tech-stack:
  added: [node-sql-parser@^5.4 (Snowflake build)]
  patterns:
    - "CJS-interop import shape for node ESM: import sqlParser from 'node-sql-parser/build/snowflake.js'; const { Parser } = sqlParser"
    - "Quoted identifiers arrive as double_quote_string literals, not column_ref — resolveColumnRef handles both"
    - "GROUP BY surfaces as { columns: [...] } object (not array) in ast.groupby"
    - "Parser AST `from[i].expr.ast` presence = subquery; `from[i].join` presence = JOIN"

key-files:
  created:
    - src/lib/metabase-import/types.ts
    - src/lib/metabase-import/parse-metabase-sql.ts
    - src/lib/metabase-import/parse-metabase-sql.smoke.ts
    - src/lib/metabase-import/chart-inference.ts
    - src/lib/metabase-import/map-to-snapshot.ts
    - src/lib/metabase-import/map-to-snapshot.smoke.ts
    - src/lib/metabase-import/fixtures/simple-select.sql
    - src/lib/metabase-import/fixtures/with-where-in.sql
    - src/lib/metabase-import/fixtures/quoted-identifiers.sql
    - src/lib/metabase-import/fixtures/group-by-bar.sql
    - src/lib/metabase-import/fixtures/unsupported-join.sql
    - src/lib/metabase-import/fixtures/template-tags.sql
  modified:
    - package.json (node-sql-parser dependency + 2 smoke scripts)
    - pnpm-lock.yaml
    - src/lib/columns/config.ts (SOURCE_TABLE export)
    - src/lib/views/schema.ts (sourceQuery additive-optional field)
    - src/lib/views/types.ts (ViewSnapshot.sourceQuery)

key-decisions:
  - "Switched to pnpm add (project uses pnpm, not npm — lockfile is pnpm-lock.yaml). npm attempt crashed on dep-tree resolution before any install happened"
  - "Import path uses `node-sql-parser/build/snowflake.js` (explicit .js) + default-import + destructure — package is CJS-only and named-import-from-CJS fails under Node ESM with --experimental-strip-types"
  - "chart-inference.ts fully implemented in Task 2 (not deferred to Task 3) because parse-metabase-sql.ts imports it — splitting would have left a broken module boundary between the two commits"
  - "Quoted identifier AST handling: node-sql-parser emits `double_quote_string` literals for `\"PARTNER_NAME\"`, not `column_ref`. resolveColumnRef() accepts both shapes so Pitfall 3 (case-fold + strip) works uniformly"
  - "GROUP BY detection reads `ast.groupby.columns` (not `ast.groupby` directly) — the parser wraps group-by lists in a `{ columns: [...] }` object"
  - "mapToSnapshot silently drops unsupported operator+type combos (IN on numeric, BETWEEN on text) rather than mutating the ParseResult — mapping layer stays read-only over parser output"
  - "IS NULL filters routed to skippedFilters with reason 'IS NULL filters not yet supported' per plan; TanStack filter schema has no null bucket"
  - "Multi-statement SQL: first SELECT is imported, remaining statements surface a `non-select` unsupportedConstruct warning"
  - "Empty-array checklist filters dropped from columnFilters output so downstream filter chips don't render zero-value selections"

patterns-established:
  - "Pattern: CJS module import under --experimental-strip-types — default-import + destructure + explicit .js extension in the import specifier"
  - "Pattern: Three-layer pure-function pipeline — parser (SQL -> ParseResult) / mapper (ParseResult -> Partial<ViewSnapshot>) / inference (matchedColumns -> ChartInferenceResult) — each layer is independently smokeable and has zero DOM / React / network dependencies"
  - "Pattern: Additive-optional ViewSnapshot evolution — 3rd precedent after Phase 32-02 drill + Phase 34-04 listId. Legacy saved views parse with new field undefined; no schema version bump; no sanitize migration"
  - "Pattern: Filter-shape translation at the boundary layer — parser emits operator-level MatchedFilter; mapper normalises to TanStack storage shapes (string[] for text, { min, max } for numeric). Keeps parser type-agnostic"
  - "Pattern: Smoke fixtures as .sql files + readFileSync(new URL('./fixtures/...', import.meta.url)) — survives --experimental-strip-types, colocated with the module, no test-framework dependency"

requirements-completed: [META-02, META-04, META-05]

# Metrics
duration: 8min
completed: 2026-04-19
---

# Phase 37 Plan 01: Metabase SQL Import — Parser + Mapper Foundation Summary

**Pure-function SQL->ParseResult->Partial<ViewSnapshot> pipeline using node-sql-parser's Snowflake build — template tags stripped, quoted identifiers case-folded, 7 unsupported-construct kinds surfaced, axis-eligibility-gated chart inference, additive-optional sourceQuery audit field on ViewSnapshot. Zero UI shipped; Plan 02 wizard becomes a thin renderer over this layer.**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-04-19T21:59:14Z
- **Completed:** 2026-04-19T22:07:21Z
- **Tasks:** 3
- **Files created:** 12
- **Files modified:** 5

## Accomplishments

- `parseMetabaseSql(sql)` handles SELECT / WHERE (AND-only) / ORDER BY on the app's column allow-list — never throws; every edge (unknown columns, quoted identifiers, aggregates, JOINs, CTEs, GROUP BY, window functions, OR branches, non-SELECT, multi-statement, malformed SQL) produces a structured ParseResult.
- `mapToSnapshot(result)` emits a `Partial<ViewSnapshot>` the Plan 03 apply pipeline will accept byte-for-byte — columnOrder / columnVisibility / columnFilters / sorting / chartState all in TanStack storage shapes.
- `inferChart` applies the CONTEXT heuristic (groupby+text+number → bar; date+number → line; 2 numerics → scatter) with an `isColumnEligible` axis gate + `migrateChartState` schema-validity round-trip — never proposes an axis the Phase 36 builder would reject.
- `ViewSnapshot.sourceQuery?: { sql, importedAt }` additive-optional field shipped — 3rd precedent for this evolution pattern; legacy saved views parse with `sourceQuery: undefined` and existing migrate-chart smoke stays green.
- 14 new smoke assertions (8 parse + 6 map) + `SOURCE_TABLE` constant for Plan 03's FROM-table check + 6 golden `.sql` fixtures.

## Task Commits

Each task was committed atomically:

1. **Task 1: Install parser + SOURCE_TABLE + sourceQuery field** — `b893b7b` (chore)
2. **Task 2: parseMetabaseSql pure module + fixtures + smoke** — `9e31544` (feat)
3. **Task 3: mapToSnapshot + smoke** — `3c31f0b` (feat)

## Files Created/Modified

**Created:**
- `src/lib/metabase-import/types.ts` — ParseResult + sub-types (MatchedColumn / SkippedItem / MatchedFilter / MatchedSort / UnsupportedConstruct / ChartInferenceResult / ParseError)
- `src/lib/metabase-import/parse-metabase-sql.ts` — SQL → ParseResult translator wrapping `node-sql-parser/build/snowflake`
- `src/lib/metabase-import/chart-inference.ts` — heuristic chart picker with isColumnEligible + migrateChartState gates
- `src/lib/metabase-import/map-to-snapshot.ts` — ParseResult → Partial<ViewSnapshot> translator (filter-shape normalisation + chart embed)
- `src/lib/metabase-import/parse-metabase-sql.smoke.ts` — 8 assertions across 6 fixtures + 2 synthetic edges
- `src/lib/metabase-import/map-to-snapshot.smoke.ts` — 6 assertions (columnOrder / visibility / text-eq / numeric-between / ORDER BY DESC / chart embed / sourceQuery-undefined)
- `src/lib/metabase-import/fixtures/{simple-select,with-where-in,quoted-identifiers,group-by-bar,unsupported-join,template-tags}.sql` — 6 golden fixtures

**Modified:**
- `package.json` — added `node-sql-parser: ^5.4.0` + `smoke:metabase-import` + `smoke:metabase-map` scripts
- `pnpm-lock.yaml` — updated by `pnpm add`
- `src/lib/columns/config.ts` — added `SOURCE_TABLE = 'AGG_BATCH_PERFORMANCE_SUMMARY'` export
- `src/lib/views/schema.ts` — added `sourceQuery: z.object({ sql, importedAt }).optional()` field (additive)
- `src/lib/views/types.ts` — added `ViewSnapshot.sourceQuery?: { sql, importedAt }` field

## Decisions Made

See `key-decisions` in the frontmatter above — they summarise the nine non-trivial design calls made during execution. Key ones:

1. **Package manager:** project uses pnpm (not npm). `npm install` crashed on Arborist dep-tree resolution before touching disk; `pnpm add` succeeded in 1.6s.
2. **CJS interop:** `node-sql-parser` is CJS-only. Under `node --experimental-strip-types`, named imports from CJS fail. The shipped shape is `import sqlParser from 'node-sql-parser/build/snowflake.js'; const { Parser } = sqlParser` — works both for TS checking (via `esModuleInterop`) and for Node runtime.
3. **chart-inference.ts lifted to Task 2:** the parser imports `inferChart` directly, so splitting the implementation across Task 2 / Task 3 would have left Task 2's commit with a broken import. Implemented fully in Task 2; Task 3 owns only `map-to-snapshot.ts` + its smoke.
4. **Quoted-identifier AST shape:** node-sql-parser emits `double_quote_string` literals (not `column_ref`) for quoted identifiers. `resolveColumnRef()` accepts both shapes, preserving Pitfall 3's case-fold-and-strip invariant across every column-touching site.
5. **GROUP BY shape:** plan referenced `ast.groupby.length > 0`; actual parser emits `{ columns: [...] }`. Detection corrected to `ast.groupby.columns.length > 0`.
6. **Mapping-layer silent drops:** IN on numeric / BETWEEN on text / IS NULL on either type → silently dropped in `mapToSnapshot` rather than mutating the ParseResult. Parser stays type-agnostic; mapper owns the filter-shape boundary.

## Deviations from Plan

None that required a Rule 1/2/3 auto-fix. Three minor adaptations from the plan's written code snippets (all of which were flagged as "approximate" or "shape" in the plan's `<interfaces>` block):

1. **Plan's package.json verify command checked for `node_modules/node-sql-parser/build/snowflake/index.js`** — actual build artifact is `node_modules/node-sql-parser/build/snowflake.js` (file, not directory). Verified by direct file existence + successful runtime import.
2. **Plan's import snippet used `import { Parser } from 'node-sql-parser/build/snowflake'`** — that shape fails at Node runtime under `--experimental-strip-types` (CJS + named imports). Switched to default-import + destructure + explicit `.js` extension (documented in key-decisions).
3. **Plan's GROUP BY detection checked `ast.groupby && ast.groupby.length > 0`** — actual parser shape is `{ columns: [...] }`, not an array. Corrected to `ast.groupby.columns.length > 0`.

None of these were code bugs discovered after the fact — they were knowledge gaps in the plan's mechanical code examples, resolved by probing the parser directly before writing production code.

**Total deviations:** 0 auto-fixed.
**Impact on plan:** No scope creep. The plan's architecture (3-task split, pure-function modules, fixture-based smoke tests, additive-optional schema evolution) mapped 1:1 to what shipped.

## Issues Encountered

- **npm install crashed** with `TypeError: Cannot read properties of null (reading 'matches')` in Arborist before any package was added — root cause: project uses pnpm, not npm. Resolved by switching to `pnpm add`.
- **ESM named-import from CJS failed** with `Named export 'Parser' not found` — Node 22+ doesn't auto-detect named exports for this CJS module. Resolved by default-import + destructure pattern.

## User Setup Required

None — no external service configuration required. `node-sql-parser` runs in-process; no API keys, no network access, no server-side state.

## Verification

- `npm run smoke:metabase-import` → ✓ 8 fixtures / cases
- `npm run smoke:metabase-map` → ✓ 6 assertions
- `npm run smoke:migrate-chart` → ✓ 11 assertions (unchanged, additive schema field is transparent)
- `npm run smoke:axis-eligibility` → ✓ 15 assertions (unchanged)
- `npm run smoke:chart-presets` → ✓ 9 assertions (unchanged)
- `npx tsc --noEmit` → zero new errors (pre-existing `tests/a11y/baseline-capture.spec.ts` axe-core error noted out-of-scope per STATE.md Phase 33 entry)
- `npm run check:tokens` → ✓
- `npm run check:surfaces` → ✓
- `npm run check:components` → ✓
- `npm run check:motion` → ✓
- `npm run check:polish` → ✓

## Next Phase Readiness

Plan 02 (wizard UI) can `import { parseMetabaseSql, mapToSnapshot, type ParseResult, type ChartInferenceResult } from '@/lib/metabase-import/...'` with zero additional edits to this module. Plan 03 (Apply pipeline) consumes `mapToSnapshot(result)` + original SQL + `Date.now()` and writes the resulting `Partial<ViewSnapshot>` (plus `sourceQuery: { sql, importedAt }`) through the existing `handleLoadView` path.

Blockers: none.

## Self-Check: PASSED

Verified:
- ✓ `src/lib/metabase-import/types.ts` exists
- ✓ `src/lib/metabase-import/parse-metabase-sql.ts` exists
- ✓ `src/lib/metabase-import/parse-metabase-sql.smoke.ts` exists
- ✓ `src/lib/metabase-import/chart-inference.ts` exists
- ✓ `src/lib/metabase-import/map-to-snapshot.ts` exists
- ✓ `src/lib/metabase-import/map-to-snapshot.smoke.ts` exists
- ✓ All 6 fixture `.sql` files exist
- ✓ Commit b893b7b exists (Task 1)
- ✓ Commit 9e31544 exists (Task 2)
- ✓ Commit 3c31f0b exists (Task 3)

---
*Phase: 37-metabase-sql-import*
*Completed: 2026-04-19*
