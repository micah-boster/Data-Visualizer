---
phase: 37-metabase-sql-import
plan: 03
subsystem: data-import
tags: [metabase-import, apply-pipeline, view-snapshot, dimension-filters, undo-toast, enum-validation, sonner]

# Dependency graph
requires:
  - phase: 37-01
    provides: parseMetabaseSql + mapToSnapshot + chart-inference + ViewSnapshot.sourceQuery (consumed by handleApplyImport)
  - phase: 37-02
    provides: ImportSheet + onImportSql callback contract (sidebar entry wired through useSidebarData)
  - phase: 34-04
    provides: sanitizeSnapshot evolution precedent (sourceQuery mirrors drill + listId additive pattern)
  - phase: 32-02
    provides: handleLoadView URL-rewrite pipeline (drill-reset recipe lifted verbatim lines 370-383)
  - phase: 25
    provides: FILTER_PARAMS from use-filter-state.ts (single source of truth for dim-filter promotion)
provides:
  - handleApplyImport callback — apply pipeline with pre-import Undo capture, drill reset, sourceQuery stamp, sonner toast with 8s Undo action
  - Typed SidebarDataState.onImportSql — Plan 02 defensive cast closed out in src/components/layout/app-sidebar.tsx
  - Dimension-filter promotion at Apply time — columnFilters on FILTER_PARAMS keys (ACCOUNT_TYPE/PARTNER_NAME/BATCH) route to dimensionFilters so URL + filter chips + filteredRawData all narrow correctly
  - Imported-view exhaustive-hide — DataTable.handleLoadViewInternal merges snapshot.columnVisibility over a full column-key map when sourceQuery is present (missing keys → false)
  - Enum-aware parser — parseMetabaseSql validates WHERE text-equality + IN literals against ColumnConfig.enumValues; invalid values route to skippedFilters with validValues hint rendered by PreviewStep
  - ACCOUNT_TYPE enum registry — ColumnConfig.enumValues + ACCOUNT_TYPE_VALUES export on columns/config.ts (THIRD_PARTY / PRE_CHARGE_OFF_FIRST_PARTY / PRE_CHARGE_OFF_THIRD_PARTY)
  - Per-toast Sonner position override — import toast mounts bottom-left so FilterPopover (top-right) stays clickable during 8s Undo window
  - 3 new map-smoke + 3 new parse-smoke assertions (apply-time dim promotion, Scenario A fixture-to-data integrity, invalid-enum rejection)
  - tests/a11y/37-03-import-toast-nonblocking.spec.ts Playwright regression for toast-popover geometry
affects: [META-06 MBQL import (enumValues pattern reusable), future closed-enum registry extensions (PRODUCT_TYPE / REVENUE_BAND when they graduate out of v3.5 deferral), any future apply pipeline that needs URL + dim-filter + table-state reconciliation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dim-filter-promotion at Apply time — columnFilters with keys in FILTER_PARAMS route to dimensionFilters. Single source of truth for url-param↔column-id is FILTER_PARAMS (hooks/use-filter-state.ts); reused verbatim, no string duplication"
    - "Exhaustive-hide on imported views — DataTable.handleLoadViewInternal builds a full-column-key visibility map with missing keys coerced to false when snapshot.sourceQuery is present. Prevents partial-visibility merge from leaking root defaults"
    - "Enum validation at parser layer, not mapper — validation runs on ParseResult emission because PreviewStep renders directly from ParseResult before mapToSnapshot runs. Mapper placement would have given the user a green-checkmark preview for invalid values (Defect 5 root cause)"
    - "Open-vs-closed enum discipline — only ACCOUNT_TYPE gets enumValues (3 stable values). PARTNER_NAME (34 values, low churn) and BATCH (477 values, monthly-growing) intentionally stay open; hard-coding would create a maintenance burden"
    - "Per-toast Sonner position override — when a toast geometrically overlaps an interactive surface (popover, menu), call toast(..., { position: 'bottom-left' }) inline rather than reconfiguring the global <Toaster>. Global position stays bottom-right for save/delete/clear chrome"
    - "Sonner+popover z-stacking — both surfaces carry z-50; Sonner's portal mounts last, so the toast intercepts pointer events on anything directly underneath. Diagonal positioning is the pointer-events fix, not z-index stacking"
    - "Evidence-backed non-repro lock-in — when a reported defect traces clean end-to-end through instrumented logs, lock in the verified state with a smoke assertion (de53d92 apply-time dim promotion). Turns 'worked on my machine' into 'smoke-gated regression'"

key-files:
  created:
    - tests/a11y/37-03-import-toast-nonblocking.spec.ts
    - src/lib/metabase-import/fixtures/invalid-enum-value.sql
  modified:
    - src/contexts/sidebar-data.tsx
    - src/components/data-display.tsx
    - src/components/layout/app-sidebar.tsx
    - src/components/table/data-table.tsx
    - src/components/metabase-import/preview-row.tsx
    - src/components/metabase-import/preview-step.tsx
    - src/lib/columns/config.ts
    - src/lib/metabase-import/parse-metabase-sql.ts
    - src/lib/metabase-import/types.ts
    - src/lib/metabase-import/map-to-snapshot.smoke.ts
    - src/lib/metabase-import/parse-metabase-sql.smoke.ts
    - src/lib/metabase-import/fixtures/with-where-in.sql
    - src/lib/metabase-import/fixtures/quoted-identifiers.sql
    - .planning/phases/37-metabase-sql-import/37-03-PLAN.md

key-decisions:
  - "Dimension-filterable columns (ACCOUNT_TYPE / PARTNER_NAME / BATCH) require promotion from columnFilters to dimensionFilters at Apply time — FILTER_PARAMS from use-filter-state.ts is the single source of truth. Without promotion, imported WHERE clauses silently disappeared (columnFilters on non-root column ids get filtered out by root-validIds narrowing in handleLoadViewInternal before any state setter fires)"
  - "Enum validation lives in parseMetabaseSql (46b1279 → 244a063), not mapToSnapshot — PreviewStep renders ParseResult directly before mapToSnapshot runs. Mapper placement would have made the preview lie to the user (green checkmark on value that produces zero-row table after Apply). META-03's acceptance criterion 'preview must tell the truth before Apply' forced the placement"
  - "Only ACCOUNT_TYPE carries enumValues in the registry (3 stable values: THIRD_PARTY / PRE_CHARGE_OFF_FIRST_PARTY / PRE_CHARGE_OFF_THIRD_PARTY). PARTNER_NAME and BATCH intentionally stay open — too much churn to hard-code (BATCH grows monthly; PARTNER_NAME changes every partner onboarding)"
  - "Sonner toast position must be per-toast (not global) when the toast geometrically overlaps a popover — import toast moves to bottom-left for its 8s Undo window while save/delete/clear toasts keep the global bottom-right position. Diagonal positioning avoids pointer-event interception; z-index stacking does not fix the issue (both surfaces are z-50, Sonner's portal mounts last)"
  - "Imported snapshot needs exhaustive-hide in data-table.tsx when sourceQuery is present — handleLoadViewInternal merges the snapshot.columnVisibility over a full column-key map with missing keys coerced to false. Without this, partial-visibility merge leaks root defaults (e.g. __BATCH_COUNT, TOTAL_AMOUNT_PLACED, etc. stay visible even when the SQL selected only partner_name + total_accounts)"
  - "Apply-time dim-filter promotion is gated in handleApplyImport, not mapToSnapshot — keeps the mapper a pure ParseResult → Partial<ViewSnapshot> transform (no React/router/FILTER_PARAMS coupling). Apply is where URL + state setters live, so URL-mechanical work belongs there"
  - "Evidence-backed non-repro lock-in (de53d92) — when the Round-4 investigation traced Scenario A clean end-to-end through instrumented logs (useFilterState / filteredRawData / DataTable all narrowing correctly), added an apply-time dim-promotion smoke assertion rather than 'close as non-repro'. Turns the verified-clean state into a smoke-gated regression"
  - "Round-3 fix surfaced that ViewSnapshot-wise, import snapshots are rightly stamped with BOTH the canonical sourceQuery { sql, importedAt } AND derived columnFilters/dimensionFilters/sorting — the raw SQL never re-executes at load time. Audit-trail vs state-restore are separate concerns"

patterns-established:
  - "Pattern: 5-defect-round closure as single plan — Rounds 1 (dim promotion) + 2a (exhaustive hide) + 2b (fixture-to-data integrity) + 3 (toast-popover geometry) + 4 (non-repro smoke lock-in) + 5 (enum validation) all land under the same 37-03 plan scope with atomic per-defect commits. The human-verify checkpoint stays open until every defect is reproducible-then-green in the live app"
  - "Pattern: ColumnConfig optional enumValues?: readonly string[] + validator layer that consumes it — closed enums opt in at the registry level; open enums stay un-enumerated. Scales to any future closed-enum column (status flags, tier levels, boolean-ish fields)"
  - "Pattern: validValues hint on skippedFilters — parser emits `{ ..., validValues: readonly string[] }` on rejected items so PreviewStep renders the full list inline ('Valid: A / B / C'). Single round-trip from user-error to user-recovery; no secondary lookup or documentation page required"
  - "Pattern: Per-toast Sonner position override — `toast('msg', { position: 'bottom-left' })` for the rare case where a toast overlaps a persistent popover. Reusable for any future async-progress toast that coexists with a geometrically-fixed UI surface (e.g. filter chip actions, saved-view popover)"

requirements-completed: [META-03]

# Metrics
duration: ~4 days elapsed (2026-04-19 initial apply + 4 defect rounds through 2026-04-23)
completed: 2026-04-23
---

# Phase 37 Plan 03: Metabase SQL Import — Apply Pipeline + 5-Round Defect Closure Summary

**Apply pipeline for Metabase SQL Import wired end-to-end in data-display.tsx — handleApplyImport captures pre-import snapshot for Undo, forces drill to root, stamps sourceQuery, synthesizes a working SavedView through the existing handleLoadView pipeline, and emits an 8s Sonner toast with Undo. Five defect rounds across four days closed out dimension-filter promotion, imported-view visibility exhaustiveness, toast-popover geometry, a non-repro smoke lock-in, and enum-aware parser validation — META-03 now satisfied end-to-end and all 5 Phase 37 requirements complete.**

## Performance

- **Duration:** ~4 days elapsed (initial Tasks 1+2 landed 2026-04-19, defect rounds closed 2026-04-23)
- **Started:** 2026-04-19T22:22:00Z (Task 1 commit 821ba22)
- **Completed:** 2026-04-23T20:13:27Z (Round 5 close-out commit 7fb74d7)
- **Tasks:** 3 (Plan tasks) + 5 defect rounds
- **Files created:** 2
- **Files modified:** 14

## Accomplishments

- `handleApplyImport` in `src/components/data-display.tsx` — the apply pipeline: captures pre-import ViewSnapshot + chartsExpanded + comparisonVisible + drill for Undo, forces drill reset via URL param delete (`?p=&b=`), stamps `sourceQuery: { sql, importedAt: Date.now() }`, synthesizes a working SavedView with id `working:import`, drives through `handleLoadView`, emits a Sonner toast with an 8s Undo action that restores every captured axis in lockstep
- `SidebarDataState.onImportSql: (result: ParseResult, sourceSql: string) => void` — typed end-to-end. Plan 02's defensive `as unknown as` cast on `app-sidebar.tsx` is removed; `useSidebarData()` destructure now reads `onImportSql` directly
- Round 1 dim-filter promotion (commit `46b1279`) — handleApplyImport promotes `columnFilters` entries whose keys are in `FILTER_PARAMS` (hooks/use-filter-state.ts) to `dimensionFilters` before handing to the working SavedView. Without this, ACCOUNT_TYPE / PARTNER_NAME / BATCH WHERE clauses silently disappeared in handleLoadViewInternal's root-validIds narrowing
- Round 2a exhaustive-hide (commit `a55f596`) — DataTable.handleLoadViewInternal builds a full-column-key visibility map with missing keys coerced to `false` when `snapshot.sourceQuery` is present. Imported views now show only the SELECTed columns at root, not the root-default set
- Round 2b fixture-to-data integrity (commit `2cf981f`) — Scenario A fixture changed from `account_type = 'Consumer'` (0 rows in static cache) to `'THIRD_PARTY'` (471 of 477 rows). Smoke assertion #7 locks fixture against the real static-cache ACCOUNT_TYPE distinct-value set
- Round 3 toast-popover geometry (commit `fe5f992`) — import toast moves to `position: 'bottom-left'` for its 8s window so the FilterPopover (anchored top-right) stays pointer-clickable. Playwright regression `tests/a11y/37-03-import-toast-nonblocking.spec.ts` locks the fix
- Round 4 non-repro smoke lock-in (commit `de53d92`) — user-reported "filter still broken" for Scenario A after Round 3 traced clean end-to-end through instrumented logs. Added an apply-time dim-promotion smoke assertion to map-to-snapshot.smoke.ts to guard against future regressions of the verified-clean state
- Round 5 enum-aware parser (commits `48f88a8` → `7fb74d7`) — parser now validates WHERE text-equality + IN literals against `ColumnConfig.enumValues`; invalid values route to `skippedFilters` with a `validValues` hint that PreviewStep renders inline ('Valid: A / B / C'). Prior behavior: green checkmark in preview → zero-row table after Apply. New behavior: amber-skipped row in preview with valid-value hint → Apply yields a non-filtered view with no `?type=` URL param
- 5-round defect trail preserved with atomic commits + smoke regression + Playwright test — META-03's acceptance criterion ("preview must tell the truth before Apply") now has a test-gated guarantee
- All 5 Phase 37 requirements Complete: META-01 ✓ (Plan 02), META-02 ✓ (Plan 01), META-03 ✓ (this plan + defect Round 5), META-04 ✓ (Plan 01), META-05 ✓ (Plan 01)

## Task Commits

Tasks 1-2 (plan body) landed sequentially 2026-04-19; Task 3 (human-verify) closed after 5 defect rounds through 2026-04-23:

1. **Task 1: Type `onImportSql` on SidebarDataState + drop defensive cast** — `821ba22` (feat)
2. **Task 2: `handleApplyImport` apply pipeline + thread through SidebarDataPopulator** — `abeae75` (feat)
3. **Task 3: Human-verify checkpoint (5 defect rounds until approval)** — defect commits below

### Defect Rounds (Task 3 gate closures)

**Round 1 — Dim-filter promotion:**
- **`46b1279`** `fix(37-03): promote WHERE-clause filters on partner/type/batch to dimensionFilters in handleApplyImport`

**Round 2 — Two bugs in the same round:**
- **`a55f596`** `fix(37-03): expand imported-view columnVisibility to hide drill-level-only columns` (2a — exhaustive hide)
- **`2cf981f`** `fix(37-03): correct Scenario A fixture to use real ACCOUNT_TYPE enum + lock in with smoke` (2b — fixture-to-data integrity)

**Round 3 — Toast-popover geometry:**
- **`fe5f992`** `fix(37-03): move import toast to bottom-left so FilterPopover stays clickable`

**Round 4 — Non-repro lock-in:**
- **`de53d92`** `test(37-03): add apply-time promotion regression to map smoke`

**Round 5 — Enum validation (5-step landing):**
- **`48f88a8`** `feat(37-03): enum metadata on ACCOUNT_TYPE column registry` (5a)
- **`244a063`** `feat(37-03): parser validates WHERE literals against column enum registry` (5b)
- **`292ce57`** `feat(37-03): PreviewStep renders invalid-enum filters with valid-values hint` (5c)
- **`5937cd3`** `test(37-03): smoke for invalid-enum filter rejection` (5d)
- **`7fb74d7`** `docs(37-03): add Scenario E (invalid enum value) to human-verify checkpoint` (5e)

**Plan metadata:** pending (this commit — closes plan)

## Files Created/Modified

**Created:**
- `tests/a11y/37-03-import-toast-nonblocking.spec.ts` — Playwright regression for Round 3 (toast-popover clickability during 8s Undo window + Undo button functional inside toast)
- `src/lib/metabase-import/fixtures/invalid-enum-value.sql` — Round 5 smoke fixture (`WHERE account_type = 'Consumer'`)

**Modified:**
- `src/contexts/sidebar-data.tsx` — Task 1: add typed `onImportSql: (ParseResult, string) => void` field + no-op default on `SidebarDataProvider` initial state
- `src/components/layout/app-sidebar.tsx` — Task 1: drop defensive `as unknown as` cast; destructure `onImportSql` directly from `useSidebarData()`; update mount-block provenance comment
- `src/components/data-display.tsx` — Task 2: add `handleApplyImport` callback next to `handleLoadView` + thread through `setSidebarData` + (Round 1) dim-filter promotion loop + (Round 3) `{ position: 'bottom-left' }` on import toast
- `src/components/table/data-table.tsx` — Round 2a: exhaustive-hide path in `handleLoadViewInternal` when `snapshot.sourceQuery` is present
- `src/components/metabase-import/preview-row.tsx` — Round 5c: optional `validValues?: readonly string[]` prop + third caption-tier hint line renderer
- `src/components/metabase-import/preview-step.tsx` — Round 5c: pass `s.validValues` through to `PreviewRow` on skippedFilters rows
- `src/lib/columns/config.ts` — Round 5a: add optional `enumValues?: readonly string[]` to ColumnConfig + populate ACCOUNT_TYPE + export `ACCOUNT_TYPE_VALUES` constant
- `src/lib/metabase-import/parse-metabase-sql.ts` — Round 5b: validate WHERE `=` and `IN` literals against column's `enumValues`; route mismatches to `skippedFilters` with reason + `validValues` hint
- `src/lib/metabase-import/types.ts` — Round 5b: add `validValues?: readonly string[]` to `SkippedFilter` shape
- `src/lib/metabase-import/map-to-snapshot.smoke.ts` — Round 2b + Round 4: Scenario A fixture-to-data integrity assertion + apply-time dim-promotion regression
- `src/lib/metabase-import/parse-metabase-sql.smoke.ts` — Round 5d: 3 new assertions (invalid single-value, invalid IN list, valid-value regression guard)
- `src/lib/metabase-import/fixtures/with-where-in.sql` — minor fixture update alongside Round 5 registry work
- `src/lib/metabase-import/fixtures/quoted-identifiers.sql` — minor fixture update alongside Round 5 registry work
- `.planning/phases/37-metabase-sql-import/37-03-PLAN.md` — Round 5e: add Scenario E (invalid enum value) to human-verify checkpoint documentation

## Decisions Made

See `key-decisions` in the frontmatter above. The eight non-trivial calls:

1. **Dim-filter promotion at Apply, not Map:** mapToSnapshot stays a pure ParseResult → Partial<ViewSnapshot> transform. URL-mechanical + FILTER_PARAMS-coupling concerns belong in handleApplyImport, where routing + state setters already live.
2. **Enum validation at parse, not map:** PreviewStep renders ParseResult directly. Mapper-layer validation would have given the user a green checkmark for a value that produces a zero-row table — violating META-03's "preview must tell the truth" acceptance criterion.
3. **Closed vs open enums in the registry:** ACCOUNT_TYPE (3 values, stable) opts into enumValues; PARTNER_NAME (34, low churn) and BATCH (477, monthly growing) stay open. Hard-coding the latter two would create maintenance friction for every partner onboarding or month-end batch.
4. **Per-toast Sonner position over global reconfiguration:** the import toast's 8s Undo window is a rare overlap case with FilterPopover. Reconfiguring the global `<Toaster>` would have moved every toast (save / delete / clear) to bottom-left — cosmetic regression for a targeted geometry fix.
5. **Exhaustive-hide gated on `sourceQuery` presence:** the full-column-key map + missing-keys-false coercion runs only when the loaded snapshot carries a `sourceQuery`. Normal saved-view loads keep the original partial-visibility merge, so saved views that were created pre-Phase-37 continue to render correctly.
6. **Evidence-backed non-repro lock-in (Round 4):** when the Scenario A re-report traced clean end-to-end through instrumented console.log calls on useFilterState / filteredRawData / DataTable, the correct move was to add an apply-time dim-promotion smoke assertion — not to close as non-repro. The smoke gate now protects the verified state from future regression.
7. **ValidValues hint list rendered inline in PreviewStep:** user-error → user-recovery is a single round-trip; no secondary lookup or documentation page. Parser emits the full validValues list on every skippedFilter it creates, so UI renders the hint without re-reading the registry.
8. **Session-ephemeral sourceQuery stays the canonical audit trail:** an imported view stamps BOTH a `sourceQuery: { sql, importedAt }` AND derived columnFilters / dimensionFilters / sorting on the working ViewSnapshot. The raw SQL is audit metadata; it never re-executes at load time. Save View persists the entire snapshot including sourceQuery via the existing tableSnapshotRef path.

## Deviations from Plan

Five rounds of real-world defects surfaced during the human-verify checkpoint — every one was a Rule 1 (bug) or Rule 2 (missing critical) auto-fix that happened inline in the plan scope, not scope creep. Tasks 1 + 2 landed exactly as the plan specified on 2026-04-19.

### Auto-fixed Issues

**1. [Rule 1 - Bug] Dim-filter promotion missing — imported WHERE clauses silently disappeared (Round 1)**
- **Found during:** Task 3 human-verify Scenario A (user pasted `WHERE account_type = 'THIRD_PARTY'`, clicked Apply, saw no `?type=` URL param, no filter chip, no row narrowing)
- **Issue:** mapToSnapshot emits WHERE clauses on any text column as `columnFilters[columnId] = [value]`. Three of those column ids (ACCOUNT_TYPE / PARTNER_NAME / BATCH) live on the `dimensionFilters` URL-param channel in the live app. handleLoadView's URL-rewrite loop reads `snapshot.dimensionFilters` only, so columnFilters on those ids never reached the URL. Worse: at root drill level, handleLoadViewInternal filters columnFilters through root-only validIds (PARTNER_NAME is root, but ACCOUNT_TYPE / BATCH are NOT) — the filter silently disappeared before any state setter fired.
- **Fix:** Added a dim-filter promotion loop in handleApplyImport that iterates the partial's `columnFilters`, and for keys in FILTER_PARAMS, moves them to `dimensionFilters`. FILTER_PARAMS is imported from hooks/use-filter-state.ts (single source of truth for url-param↔column-id mapping).
- **Files modified:** `src/components/data-display.tsx`
- **Verification:** 5 smokes green (metabase-import, metabase-map, migrate-chart, axis-eligibility, chart-presets); 5 check:* green (tokens, surfaces, components, motion, polish); tsc clean (modulo pre-existing Phase-33 axe-core error out-of-scope); Scenario A re-verified in-browser showed `?type=THIRD_PARTY` in URL + filter chip rendered + 471/477 rows matched.
- **Committed in:** `46b1279`

**2. [Rule 1 - Bug] Imported view leaked root-default columns (Round 2a)**
- **Found during:** Task 3 human-verify Scenario A (after Round 1 fix, user reported 'showing all columns' — root table rendered the full root-default column set instead of just the SELECTed columns)
- **Issue:** mapToSnapshot.buildVisibility iterates over `DEFAULT_COLUMNS` (61 batch-level keys) only. Root + account drill levels have ADDITIONAL columns (`__BATCH_COUNT`, `__anomaly_status` at root; `_row_num` at account) that are NOT in DEFAULT_COLUMNS. DataTable.handleLoadViewInternal's partial-visibility merge kept those extra columns at their root-default `true`.
- **Fix:** When `snapshot.sourceQuery` is present, DataTable.handleLoadViewInternal now builds a full-column-key visibility map (union of DEFAULT_COLUMNS + drill-level-only keys) with missing keys coerced to `false`. `__anomaly_status` stays visible via `enableHiding=false` on the column definition.
- **Files modified:** `src/components/table/data-table.tsx`
- **Verification:** Scenario A re-verified in-browser — root table now shows only PARTNER_NAME + TOTAL_ACCOUNTS + __anomaly_status (always-on).
- **Committed in:** `a55f596`

**3. [Rule 1 - Bug] Scenario A fixture used a non-existent ACCOUNT_TYPE value (Round 2b)**
- **Found during:** Task 3 human-verify (investigation after Round 1 uncovered that `'Consumer'` was the Metabase-demo-data value; shipped static-cache has only `THIRD_PARTY`, `PRE_CHARGE_OFF_FIRST_PARTY`, `PRE_CHARGE_OFF_THIRD_PARTY`)
- **Issue:** Using `'Consumer'` produced 0 rows (filter working correctly, but visually indistinguishable from "filter broken" — motivated the Round 1 investigation in the first place).
- **Fix:** Updated plan fixture to `'THIRD_PARTY'` (471 of 477 rows match); added smoke assertion #7 on map-to-snapshot.smoke.ts that parse + maps the real fixture, asserts the mapped filter value exactly matches at least one real row's ACCOUNT_TYPE via the same `String()==String()` path filteredRawData uses.
- **Files modified:** `.planning/phases/37-metabase-sql-import/37-03-PLAN.md`, `src/lib/metabase-import/map-to-snapshot.smoke.ts`
- **Verification:** `npm run smoke:metabase-map` passes 7 assertions.
- **Committed in:** `2cf981f`

**4. [Rule 1 - Bug] Sonner toast overlapped FilterPopover during 8s Undo window (Round 3)**
- **Found during:** Task 3 human-verify Scenario A (after Round 2 fixes, user reported the imported ACCOUNT_TYPE filter chip was un-clickable for the full 8s Undo window — couldn't remove the filter via normal UI interaction)
- **Issue:** Global `<Toaster position="bottom-right">` + FilterPopover content (anchored top-right, align=end, extends down) both carry z-50. Sonner's portal mounts last, so the toast intercepted pointer events on the freshly-imported chip-X + combobox dropdowns for 8 seconds.
- **Fix:** Per-toast `{ position: 'bottom-left' }` on the import toast — diagonal positioning avoids the geometric overlap. Global `<Toaster>` stays bottom-right for save/delete/clear chrome.
- **Files modified:** `src/components/data-display.tsx`, `tests/a11y/37-03-import-toast-nonblocking.spec.ts` (regression)
- **Verification:** Playwright test asserts (A) FilterPopover chip-X remains clickable during full 8s import-toast window; (B) Undo button inside the toast restores the pre-import URL state.
- **Committed in:** `fe5f992`

**5. [Rule 1 - Non-repro lock-in] Scenario A traced clean post-Round-3 — smoke-gated the verified state (Round 4)**
- **Found during:** Task 3 human-verify re-report 2026-04-19 PM ("imported view still has no rows" after Round 3)
- **Issue:** Full evidence-backed trace via playwright-headless + console.log instrumentation on filteredRawData / useFilterState / DataTable proved the pipeline was intact end-to-end. useFilterState → URL-to-filter: `paramsString=type=THIRD_PARTY`, `filters=1`. Could not reproduce the report; likely stale HMR state on user's dev server.
- **Fix:** Added an apply-time dim-promotion smoke assertion to map-to-snapshot.smoke.ts that locks in the post-Round-1 behavior (ACCOUNT_TYPE / PARTNER_NAME / BATCH columnFilters → dimensionFilters at mapToSnapshot output). Guards against future regressions of the verified-clean state.
- **Files modified:** `src/lib/metabase-import/map-to-snapshot.smoke.ts`
- **Verification:** 5 smokes green; 5 check:* green; tsc clean modulo pre-existing Phase-33 axe-core out-of-scope.
- **Committed in:** `de53d92`

**6. [Rule 2 - Missing Critical] Parser accepted any literal for = / IN on text columns — META-03 acceptance violated (Round 5)**
- **Found during:** Task 3 human-verify (user pasted `WHERE account_type = 'Consumer'` — the Metabase demo value — saw a green checkmark in the preview, then got an empty table after Apply)
- **Issue:** mapToSnapshot + parser accepted any literal value for `=` and `IN` on text columns. META-03's acceptance criterion ("preview must tell the truth before Apply") was silently violated. Green-checkmark-then-empty-table is a Rule 2 correctness + security gap: users cannot trust the preview.
- **Fix:** Shipped in 5 atomic commits (48f88a8 → 244a063 → 292ce57 → 5937cd3 → 7fb74d7):
  - 5a: Added optional `enumValues?: readonly string[]` field on ColumnConfig; populated ACCOUNT_TYPE with the 3 real values from static-cache/batch-summary.json. Exported new `ACCOUNT_TYPE_VALUES` constant for smoke tests + future validators.
  - 5b: parseMetabaseSql validates WHERE `=` and `IN` literals against the column's enumValues. Invalid values route to `skippedFilters` with a reason ("Not a valid Account Type value") + `validValues` hint. Validation placement deviates from plan text — plan said mapToSnapshot, but that would not satisfy META-03 because PreviewStep renders ParseResult before mapToSnapshot runs.
  - 5c: PreviewRow gains optional `validValues` prop; when present, renders a third caption-tier hint line "Valid: A / B / C". PreviewStep passes `s.validValues` through on skippedFilters rows.
  - 5d: 3 new parse-smoke assertions + 1 new fixture (`invalid-enum-value.sql`): [9] single-value rejection, [10] IN-list rejection, [11] valid-value regression guard.
  - 5e: Scenario E added to 37-03-PLAN.md human-verify checkpoint — regression doc for the defect that motivated the round.
- **Files modified:** `src/lib/columns/config.ts`, `src/lib/metabase-import/parse-metabase-sql.ts`, `src/lib/metabase-import/types.ts`, `src/components/metabase-import/preview-row.tsx`, `src/components/metabase-import/preview-step.tsx`, `src/lib/metabase-import/parse-metabase-sql.smoke.ts`, `src/lib/metabase-import/fixtures/invalid-enum-value.sql` (new), `src/lib/metabase-import/fixtures/with-where-in.sql`, `src/lib/metabase-import/fixtures/quoted-identifiers.sql`, `.planning/phases/37-metabase-sql-import/37-03-PLAN.md`
- **Verification:** 6 smokes green (metabase-import now 11 assertions, metabase-map 8 assertions, migrate-chart, axis-eligibility, chart-presets, plus new Playwright 37-03-import-toast-nonblocking); 5 check:* green; tsc clean modulo pre-existing Phase-33 axe-core error.
- **Committed in:** `48f88a8` + `244a063` + `292ce57` + `5937cd3` + `7fb74d7`

---

**Total deviations:** 6 auto-fixed (5 Rule 1 bugs + 1 Rule 2 missing critical, all under 37-03 scope across 5 defect rounds)
**Impact on plan:** All deviations were user-reported defects caught by the human-verify gate — the plan's architecture (handleApplyImport + typed onImportSql + sourceQuery audit field) shipped as written in Tasks 1-2. The five rounds extended the scope by ~14 files and ~8 commits but kept the plan boundary intact (no spillover into Phase 37-01 / 37-02 or a new Phase 38 plan). META-03's acceptance criterion ("preview must tell the truth before Apply") drove the Round 5 enum-validation landing; without it, the plan would have shipped with a known correctness gap.

## Issues Encountered

- **Sonner+popover z-stacking required diagonal positioning** (Round 3) — both surfaces are z-50; Sonner's portal mounts last. z-index stacking does not fix pointer-events interception. Diagonal positioning is the canonical fix. Documented as a reusable pattern in `patterns-established`.
- **Plan text placed enum validation in mapToSnapshot** (Round 5) — that placement would not have satisfied META-03 because PreviewStep renders ParseResult directly before mapToSnapshot runs. Validation moved to parseMetabaseSql per deviation Rule 1. Documented in the `244a063` commit body and in `key-decisions`.
- **`tsc` pre-existing error** in `tests/a11y/baseline-capture.spec.ts` (`axe-core` module resolution) — out of scope per STATE.md Phase 33 entry. Not introduced by this plan; Phase 33-05 close-out documented the long-tail owner as v4.1 Polish + Correctness Pass.

## User Setup Required

None — no external service configuration required. Enum validation runs in-process; ColumnConfig.enumValues is a static registry field. FilterPopover position is a per-toast inline option, no global configuration change.

## Verification

- `npm run smoke:metabase-import` → ✓ 11 assertions (8 original + 3 new for Round 5 enum validation)
- `npm run smoke:metabase-map` → ✓ 8 assertions (6 original + 2 new: Round 2b fixture-to-data integrity + Round 4 apply-time dim promotion)
- `npm run smoke:migrate-chart` → ✓ 11 assertions (unchanged)
- `npm run smoke:axis-eligibility` → ✓ 15 assertions (unchanged)
- `npm run smoke:chart-presets` → ✓ 9 assertions (unchanged)
- `npx playwright test tests/a11y/37-03-import-toast-nonblocking.spec.ts` → ✓ (Round 3 regression — FilterPopover clickability + Undo functional)
- `npx tsc --noEmit` → zero new errors (pre-existing Phase-33 axe-core declaration error out-of-scope per STATE.md)
- `npm run check:tokens` → ✓
- `npm run check:surfaces` → ✓
- `npm run check:components` → ✓
- `npm run check:motion` → ✓
- `npm run check:polish` → ✓
- `npm run check:a11y` → ✓ (now BLOCKING after Phase 33-05)
- **Human-verify checkpoint:** all 5 scenarios (A happy path / B Undo / C parse error / D partial import / E invalid enum value) approved by Micah in the live app 2026-04-23

## Next Phase Readiness

**Phase 37 is effectively closed** — all 5 requirements complete:
- META-01 ✓ (Plan 02 — sidebar entry + Sheet wizard)
- META-02 ✓ (Plan 01 — parseMetabaseSql extracts columns/filters/sort)
- META-03 ✓ (this plan + Round 5 enum validation — user can preview AND apply, preview tells the truth)
- META-04 ✓ (Plan 01 — mapToSnapshot emits Partial<ViewSnapshot>)
- META-05 ✓ (Plan 01 — every column reference routed through ALLOWED_COLUMNS)

**Remaining v4.0 work:** Phase 36 (Chart Builder) still in-progress — Plans 36-01, 36-02, 36-03, 36-04 landed; Plan 36-05 (ChartPanel dispatcher + data-display wiring + human-verify) remains. Phase 33 (Accessibility Audit) closed 2026-04-23. Design track is otherwise complete.

**Blockers:** None. Plan 36-05 proceeds on its own schedule.

## Self-Check: PASSED

Verified:
- ✓ `src/contexts/sidebar-data.tsx` modified (typed `onImportSql` field landed in 821ba22)
- ✓ `src/components/data-display.tsx` modified (handleApplyImport + dim promotion + toast position override)
- ✓ `src/components/layout/app-sidebar.tsx` modified (defensive cast removed)
- ✓ `src/components/table/data-table.tsx` modified (Round 2a exhaustive-hide)
- ✓ `src/components/metabase-import/preview-row.tsx` modified (Round 5c validValues hint)
- ✓ `src/components/metabase-import/preview-step.tsx` modified (Round 5c pass-through)
- ✓ `src/lib/columns/config.ts` modified (Round 5a enumValues + ACCOUNT_TYPE_VALUES)
- ✓ `src/lib/metabase-import/parse-metabase-sql.ts` modified (Round 5b validation)
- ✓ `src/lib/metabase-import/types.ts` modified (Round 5b validValues on SkippedFilter)
- ✓ `src/lib/metabase-import/map-to-snapshot.smoke.ts` modified (Round 2b + Round 4 assertions)
- ✓ `src/lib/metabase-import/parse-metabase-sql.smoke.ts` modified (Round 5d 3 new assertions)
- ✓ `src/lib/metabase-import/fixtures/invalid-enum-value.sql` exists (Round 5d new fixture)
- ✓ `tests/a11y/37-03-import-toast-nonblocking.spec.ts` exists (Round 3 regression)
- ✓ Commit `821ba22` exists (Task 1)
- ✓ Commit `abeae75` exists (Task 2)
- ✓ Commit `46b1279` exists (Round 1 — dim promotion)
- ✓ Commit `a55f596` exists (Round 2a — exhaustive hide)
- ✓ Commit `2cf981f` exists (Round 2b — fixture + smoke)
- ✓ Commit `fe5f992` exists (Round 3 — toast position)
- ✓ Commit `de53d92` exists (Round 4 — non-repro smoke)
- ✓ Commit `48f88a8` exists (Round 5a — enum registry)
- ✓ Commit `244a063` exists (Round 5b — parser validation)
- ✓ Commit `292ce57` exists (Round 5c — PreviewStep hint)
- ✓ Commit `5937cd3` exists (Round 5d — smoke)
- ✓ Commit `7fb74d7` exists (Round 5e — plan doc update)

---
*Phase: 37-metabase-sql-import*
*Completed: 2026-04-23*
