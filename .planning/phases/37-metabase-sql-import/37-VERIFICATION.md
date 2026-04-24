---
phase: 37-metabase-sql-import
verified: 2026-04-23T21:00:00Z
status: passed
score: 9/9 must-haves verified
---

# Phase 37: Metabase SQL Import — Verification Report

**Phase Goal:** Users can paste a Metabase SQL query and have it translated into an app view configuration
**Verified:** 2026-04-23
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

Derived from ROADMAP.md Success Criteria + three PLAN frontmatter must_haves rolled up.

| #   | Truth                                                                                                                                         | Status     | Evidence |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | -------- |
| 1   | User can paste Metabase-exported SQL into an import dialog accessible from the sidebar                                                        | VERIFIED   | Sidebar entry "Import from Metabase" (app-sidebar.tsx:232-236) + right-side Sheet at 60vw (import-sheet.tsx) |
| 2   | App parses SELECT/WHERE/ORDER BY via parseMetabaseSql and emits a structured ParseResult; never throws                                        | VERIFIED   | `parseMetabaseSql()` in parse-metabase-sql.ts:546-601 (try/catch around astify); smoke: 11 assertions green |
| 3   | User can preview matched columns, skipped columns, filters, sort order (section-by-section)                                                   | VERIFIED   | PreviewStep renders 4 fixed sections (preview-step.tsx) with matched+skipped rows via PreviewRow variants |
| 4   | Clicking Apply creates a ViewSnapshot with correct table columns, filters, sort, and chart config                                             | VERIFIED   | `handleApplyImport` in data-display.tsx:459-630 calls mapToSnapshot → handleLoadView; stamps sourceQuery |
| 5   | Imported SQL is allow-list-safe (no SQL injection, no column references outside ALLOWED_COLUMNS)                                              | VERIFIED   | ALLOWED_COLUMNS.has(key) gate in parse-metabase-sql.ts:168, 322, 472; SQL never reaches Snowflake |
| 6   | Metabase template tags ({{var}} + [[ ... ]]) are stripped before parsing; parser never throws SyntaxError on them                             | VERIFIED   | `stripMetabaseTemplates()` in parse-metabase-sql.ts:59-63; smoke case 6 green |
| 7   | Drill state resets to root on Apply; ?p=&b= URL params cleared                                                                                | VERIFIED   | data-display.tsx:525-531 URL-param delete + router.push + drill:undefined on snapshot |
| 8   | ViewSnapshot.sourceQuery stamped { sql, importedAt } on the working view; legacy saved views still parse                                      | VERIFIED   | schema.ts:127 (additive-optional); types.ts:87; data-display.tsx:519 |
| 9   | Sonner toast appears with summary + 8s Undo that restores the pre-import snapshot                                                             | VERIFIED   | data-display.tsx:570-619 toast('View imported', { action: Undo, duration: 8000, position: 'bottom-left' }) |

**Score:** 9/9 truths verified

### Required Artifacts

All 13 declared artifacts across 3 plan frontmatters exist and are substantive.

| Artifact                                                             | Expected                                        | Status     | Details |
| -------------------------------------------------------------------- | ----------------------------------------------- | ---------- | ------- |
| `src/lib/metabase-import/types.ts`                                   | ParseResult + sub-types                         | VERIFIED   | 114 lines; all declared exports present (MatchedColumn, SkippedItem, MatchedFilter, ChartInferenceResult, UnsupportedConstruct, ParseResult) + validValues added in Defect Round 5 |
| `src/lib/metabase-import/parse-metabase-sql.ts`                      | SQL → ParseResult translator                    | VERIFIED   | 604 lines; imports from 'node-sql-parser/build/snowflake.js'; uses ALLOWED_COLUMNS; calls inferChart |
| `src/lib/metabase-import/map-to-snapshot.ts`                         | ParseResult → Partial<ViewSnapshot>             | VERIFIED   | 140 lines; `mapToSnapshot()` exported; calls migrateChartState |
| `src/lib/metabase-import/chart-inference.ts`                         | Axis-eligibility-gated chart heuristic          | VERIFIED   | 128 lines; uses `isColumnEligible` + `migrateChartState` round-trip |
| `src/lib/metabase-import/parse-metabase-sql.smoke.ts`                | Node smoke covering ≥6 fixtures                 | VERIFIED   | 11 assertions green (exceeds 8 baseline; +3 Round-5 enum validation) |
| `src/lib/metabase-import/map-to-snapshot.smoke.ts`                   | Filter-shape round-trip + chart embed smoke     | VERIFIED   | 9 assertions green (exceeds 6 baseline; +2 Round-2b fixture + Round-4 dim promotion) |
| `src/lib/metabase-import/fixtures/*.sql` (6 fixtures + Round-5 one)  | Golden fixtures                                 | VERIFIED   | 7 fixtures present (all originals + invalid-enum-value.sql) |
| `src/lib/views/schema.ts` (sourceQuery field)                        | Additive-optional audit field                   | VERIFIED   | Line 127 `sourceQuery: z.object(...).optional()` |
| `src/lib/views/types.ts` (ViewSnapshot.sourceQuery)                  | Optional audit field                            | VERIFIED   | Line 87 `sourceQuery?: { sql: string; importedAt: number }` |
| `src/lib/columns/config.ts` (SOURCE_TABLE + enumValues)              | SOURCE_TABLE + ColumnConfig.enumValues registry | VERIFIED   | Line 143 SOURCE_TABLE export; Line 29 enumValues field; Line 41 ACCOUNT_TYPE_VALUES |
| `package.json` (node-sql-parser dep + smoke scripts)                 | Dep + 2 npm scripts                             | VERIFIED   | Dependency present; `smoke:metabase-import` + `smoke:metabase-map` scripts run green |
| `src/components/metabase-import/import-sheet.tsx`                    | Sheet orchestrator                              | VERIFIED   | 4063 bytes; imports parseMetabaseSql; useState step/sql/parseResult; reset-on-close useEffect |
| `src/components/metabase-import/paste-step.tsx`                      | Step 1 paste textarea                           | VERIFIED   | 2705 bytes; monospace textarea; template-tag info note |
| `src/components/metabase-import/preview-step.tsx`                    | Step 2 sectioned preview                        | VERIFIED   | 7946 bytes; 4 PreviewSections; error card; unsupported-constructs banner; Back/Apply |
| `src/components/metabase-import/preview-section.tsx`                 | Named section shell                             | VERIFIED   | 1942 bytes; matched/skipped count summary |
| `src/components/metabase-import/preview-row.tsx`                     | Icon+label+reason row                           | VERIFIED   | 2303 bytes; tri-state variant (matched/skipped/error); validValues hint line (Round 5c) |
| `src/components/layout/app-sidebar.tsx`                              | Sidebar entry + ImportSheet mount               | VERIFIED   | Line 232-236 "Import from Metabase" entry; Line 279-283 `<ImportSheet onImportSql=...>` mounted |
| `src/contexts/sidebar-data.tsx` (onImportSql field)                  | Typed SidebarDataState.onImportSql              | VERIFIED   | Line 37 typed field; Line 66 default no-op |
| `src/components/data-display.tsx` (handleApplyImport)                | Apply pipeline                                  | VERIFIED   | Line 459 `handleApplyImport` callback; Line 1141 threaded through setSidebarData |
| `tests/a11y/37-03-import-toast-nonblocking.spec.ts`                  | Playwright regression                           | VERIFIED   | 82 lines; 2 tests (chip-X clickable + Undo restores URL) |
| `src/lib/metabase-import/fixtures/invalid-enum-value.sql`            | Round-5 fixture                                 | VERIFIED   | 165 bytes; referenced by smoke case 9 |

### Key Link Verification

| From                                          | To                                            | Via                                          | Status | Details |
| --------------------------------------------- | --------------------------------------------- | -------------------------------------------- | ------ | ------- |
| parse-metabase-sql.ts                         | node-sql-parser/build/snowflake               | default-import + destructure                 | WIRED  | Line 27 `import sqlParser from 'node-sql-parser/build/snowflake.js'` |
| parse-metabase-sql.ts                         | columns/config.ts ALLOWED_COLUMNS             | ALLOWED_COLUMNS.has(key)                     | WIRED  | Line 30 import + guarded at 168, 322, 472 |
| parse-metabase-sql.ts                         | chart-inference.ts inferChart                 | result.inferredChart = inferChart(...)       | WIRED  | Line 31 import; Line 528 call site |
| chart-inference.ts                            | axis-eligibility.ts isColumnEligible          | gate on proposed x/y                         | WIRED  | Line 24 import; Line 111-112 |
| chart-inference.ts                            | views/migrate-chart.ts migrateChartState      | validity round-trip                          | WIRED  | Line 26 import; Line 122 |
| import-sheet.tsx                              | parse-metabase-sql.ts                         | parseMetabaseSql(sql)                        | WIRED  | Line 13 import; Line 65 call in handleParse |
| import-sheet.tsx                              | types.ts ParseResult                          | useState<ParseResult \| null>                | WIRED  | Line 14 import; Line 52 state typed |
| app-sidebar.tsx                               | import-sheet.tsx                              | `<ImportSheet onImportSql=... />`            | WIRED  | Line 9 import; Line 279-283 mount |
| data-display.tsx handleApplyImport            | map-to-snapshot.ts mapToSnapshot              | partial = mapToSnapshot(result)              | WIRED  | Line 44 import; Line 470 call |
| data-display.tsx handleApplyImport            | handleLoadView                                | synthesize workingView → handleLoadView      | WIRED  | Line 553 handleLoadView(workingView) |
| data-display.tsx handleApplyImport            | sonner toast + Undo                           | toast('View imported', { action: Undo })     | WIRED  | Line 570-619 w/ position: bottom-left |
| data-display.tsx handleApplyImport            | FILTER_PARAMS (dim-filter promotion)          | loop promotes columnFilters→dimensionFilters | WIRED  | Line 46 import; Line 499-508 promotion loop |
| sidebar-data.tsx onImportSql                  | app-sidebar.tsx ImportSheet prop              | destructure + thread                         | WIRED  | sidebar-data.tsx:37 typed; app-sidebar.tsx:37, 282 |
| data-table.tsx handleLoadViewInternal         | snapshot.sourceQuery (exhaustive-hide gate)   | `if (snapshot.sourceQuery) { ... }`          | WIRED  | data-table.tsx:235-246 exhaustive-hide branch |
| data-display.tsx setSidebarData               | handleApplyImport                             | `onImportSql: handleApplyImport`             | WIRED  | Line 823 prop pass-through from Populator; Line 1141 in setSidebarData call |

### Requirements Coverage

All 5 META requirements accounted for in PLAN frontmatter and satisfied in codebase. Cross-referenced against `.planning/milestones/v4.0-REQUIREMENTS.md` lines 108-112, 218-222.

| Requirement | Source Plan | Description                                                                                      | Status    | Evidence |
| ----------- | ----------- | ------------------------------------------------------------------------------------------------ | --------- | -------- |
| META-01     | 37-02-PLAN  | User can paste Metabase-exported SQL into an import dialog                                       | SATISFIED | Sidebar entry + ImportSheet wizard; Truths 1 + 3 verified |
| META-02     | 37-01-PLAN  | App parses the SQL and extracts referenced columns, filters, and sort order                      | SATISFIED | parseMetabaseSql; 11 smoke assertions green; Truth 2 verified |
| META-03     | 37-03-PLAN  | User can preview the mapped configuration before applying                                        | SATISFIED | PreviewStep + handleApplyImport; enum-aware parser (Round 5) ensures preview tells the truth; Truths 3+4+7+8+9 verified; Scenarios A-E human-verify approved 2026-04-23 |
| META-04     | 37-01-PLAN  | Imported SQL maps to a ViewSnapshot (table columns, filters, chart config)                       | SATISFIED | mapToSnapshot → Partial<ViewSnapshot> with columnOrder/visibility/filters/sorting/chartState; Truth 4 verified |
| META-05     | 37-01-PLAN  | Imported configuration respects existing column allow-list (no SQL injection)                    | SATISFIED | ALLOWED_COLUMNS gate at every column-resolution site; SQL never sent to Snowflake; Truth 5 verified |

**Orphaned requirements:** None. REQUIREMENTS.md maps META-01..05 to Phase 37, and every ID appears in a plan's `requirements` field (META-02/04/05 in 37-01; META-01 in 37-02; META-03 in 37-03).

### Anti-Patterns Found

None. Scanned all Phase 37 files in `src/lib/metabase-import/`, `src/components/metabase-import/`, `src/contexts/sidebar-data.tsx`, `src/components/layout/app-sidebar.tsx`, `src/components/data-display.tsx` (new handleApplyImport block), and `src/components/table/data-table.tsx` (exhaustive-hide branch).

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| paste-step.tsx | 44 | `placeholder="SELECT..."` | Info | Legitimate HTML textarea placeholder attribute; example SQL shown to the user. Not a stub. |

- No TODO/FIXME/XXX/HACK comments
- No raw Tailwind typography tokens (text-xs/sm/base/lg/xl/2xl) in new files
- No raw color literals (text-green-*/amber-*/red-*) — only semantic state tokens (text-success-fg/warning-fg/error-fg)
- No empty implementations returning null/{}/[]
- No console.log-only handlers

### Smoke + Guard Test Evidence

Run 2026-04-23 during verification:

- `npm run smoke:metabase-import` → **PASS** (11 fixtures / cases; exceeds 8 baseline)
- `npm run smoke:metabase-map` → **PASS** (9 assertions; exceeds 6 baseline)
- `npx tsc --noEmit` → **CLEAN** (no new errors; pre-existing Phase-33 axe-core declaration error out-of-scope per STATE.md)

Per 37-03-SUMMARY verification section (2026-04-23): all 5 check:* guards green, all 5 smoke:* scripts green + Playwright 37-03-import-toast-nonblocking green, check:a11y BLOCKING green.

### Commits Verified

All 18 Phase 37 commits exist in git history:

- Plan 01 (3): b893b7b, 9e31544, 3c31f0b
- Plan 02 (3): 8e2c5ba, 3495705, 0fa373a
- Plan 03 initial (2): 821ba22, abeae75
- Round 1 dim-promotion: 46b1279
- Round 2a exhaustive-hide: a55f596
- Round 2b fixture + smoke: 2cf981f
- Round 3 toast-popover: fe5f992
- Round 4 non-repro smoke: de53d92
- Round 5 enum validation (5): 48f88a8, 244a063, 292ce57, 5937cd3, 7fb74d7

Verified via `gsd-tools verify commits` — all_valid: true.

### Human Verification Required

None pending. Per 37-03-SUMMARY.md and user prompt:

- Scenarios A (happy path) + B (Undo) + C (parse error) + D (partial import) + E (invalid enum value) approved by Micah in the live app on 2026-04-23.
- Round 5 closure was the trigger for final sign-off; Scenario E is the regression test for the "preview tells the truth" defect that motivated the round.
- Playwright regression (`tests/a11y/37-03-import-toast-nonblocking.spec.ts`) locks in the toast-popover geometry fix from Round 3.

### Gaps Summary

**None.** The phase goal — "Users can paste a Metabase SQL query and have it translated into an app view configuration" — is achieved end-to-end:

1. Paste path exists (sidebar entry → right-side Sheet → monospace textarea)
2. Parse path exists (explicit Parse button → parseMetabaseSql → structured ParseResult)
3. Preview path exists (4 sections; icon+label signaling; enum-aware parser ensures preview accuracy)
4. Apply path exists (mapToSnapshot → handleApplyImport → handleLoadView with drill reset + sourceQuery stamp)
5. Undo path exists (pre-import snapshot captured; 8s Sonner toast with Undo action restores every axis)
6. Safety: allow-list enforced at every column resolution; SQL never sent to Snowflake; parser never throws

The 5-defect-round closure (dim-filter promotion, exhaustive-hide, fixture integrity, toast geometry, enum validation) is documented in 37-03-SUMMARY.md with atomic commits and test-gated regressions. META-03's "preview must tell the truth before Apply" acceptance criterion is satisfied by the Round 5 enum-aware parser, Scenario E in the plan's human-verify block, and smoke assertion #9 on invalid-enum-value.sql.

Phase 37 is effectively closed with all 5 META-01..05 requirements Complete in v4.0-REQUIREMENTS.md and traceability table (lines 218-222). ROADMAP.md records Phase 37 Status as Complete (2026-04-23).

---

_Verified: 2026-04-23_
_Verifier: Claude (gsd-verifier)_
