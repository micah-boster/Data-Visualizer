---
phase: 37-metabase-sql-import
plan: 02
subsystem: data-import
tags: [metabase-import, wizard-ui, right-side-sheet, sidebar-entry, type-tokens, accessibility]

# Dependency graph
requires:
  - phase: 37-01
    provides: parseMetabaseSql + ParseResult contract (consumed verbatim by PreviewStep + ImportSheet)
  - phase: 34-04
    provides: right-side Sheet specificity recipe (data-[side=right]:sm:max-w-2xl md:max-w-[60vw])
  - phase: 31-02
    provides: focus-glow utility (textarea focus ring)
  - phase: 31-03
    provides: thin-scrollbar opt-in utility (preview scroll region)
  - phase: 27 (named type tokens)
    provides: text-body / text-title / text-label / text-caption / text-heading / text-label-numeric
  - phase: 26-02
    provides: semantic state-color tokens (text-success-fg / warning-fg / error-fg)
  - phase: 28
    provides: bg-surface-raised / bg-surface-inset surfaces
provides:
  - ImportSheet right-side Sheet orchestrator (paste step + preview step + Apply callback)
  - PasteStep — monospace SQL textarea + template-tag info note
  - PreviewStep — parse-error card OR unsupported-constructs banner + 4 fixed-order sections
  - PreviewSection — named section shell with matched/skipped count summary
  - PreviewRow — icon+label+reason row with matched/skipped/error variants
  - Sidebar entry (Database icon + "Import from Metabase" label) + ImportSheet mount point
affects: [37-03 apply wiring (consumes onImportSql callback via useSidebarData)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Right-side Sheet width recipe — className=\"data-[side=right]:sm:max-w-2xl md:max-w-[60vw]\" defeats the primitive's internal data-[side=right]:sm:max-w-sm (2nd precedent after Phase 34-04 CreateListDialog)"
    - "Leaf component type-token recipe — text-title for section heading (non-anchor tier), text-label-numeric for count summary, text-body for primary label, text-caption for secondary reason. NO weight utility pairings. NO raw palette colors for signaling"
    - "Icon+label signaling for accessibility — aria-hidden on every status icon; label + reason carry the signal for screen readers (icon color is a visual-only affordance)"
    - "Close-resets-state sheet pattern — useEffect on `open` transition to false resets step + parseResult; reopen always starts fresh in Step 1"
    - "Defensive prop-read of future SidebarDataState fields — `(sidebarData as unknown as { onImportSql? })` lets Wave-2 ship without pre-shipping Plan 03's context extension; Plan 03 replaces with a typed read"

key-files:
  created:
    - src/components/metabase-import/preview-row.tsx
    - src/components/metabase-import/preview-section.tsx
    - src/components/metabase-import/paste-step.tsx
    - src/components/metabase-import/preview-step.tsx
    - src/components/metabase-import/import-sheet.tsx
  modified:
    - src/components/layout/app-sidebar.tsx

key-decisions:
  - "Import path via defensive cast — Plan 02 does NOT modify src/contexts/sidebar-data.tsx (Plan 03's scope). Reading onImportSql through a single `(sidebarData as unknown as { onImportSql? }).onImportSql` keeps Wave-2 execution self-contained and tsc-green"
  - "Sidebar entry placed in a new SidebarGroup after Views (not inside any existing group) — single-item utility entry, no SidebarGroupLabel. Keeps partner navigation at top, tools at bottom"
  - "PasteStep's onParse prop kept on the surface but not bound to a button inside the leaf — parent Sheet owns the footer action area. The prop is still on the contract for a future keyboard-shortcut adoption without an API change"
  - "Back button preserves SQL but clears parseResult. Close-then-reopen clears everything (including SQL). Matches 'session-ephemeral' scope lock: no localStorage persistence"
  - "Chart section count = 1 when chartType is non-null, 0 otherwise. Keeps the matched/skipped summary semantics consistent across the four sections even though Chart is conceptually a single-axis-pair"
  - "Filter label formatting inline in preview-step.tsx (formatFilterLabel) rather than on MatchedFilter — preview is the only current consumer. Plan 03's apply path goes through mapToSnapshot which has its own translation"

patterns-established:
  - "Pattern: Two-step wizard inside a single right-side Sheet — useState<'paste' | 'preview'> + conditional step bodies inside <SheetContent>. Matches the two-step paste→preview contract locked in CONTEXT. Reusable for future import/export wizards"
  - "Pattern: Fixed-order section preview with matched+skipped rows — four <PreviewSection>s in deterministic order (Columns / Filters / Sort / Chart), each consuming one matched* array + one skipped* array from a ParseResult-shaped object. Transparently extensible to other parser outputs by adding sections"
  - "Pattern: Icon+label+reason row (PreviewRow) with 3-variant discriminant — the first codebase use of the matched/skipped/error tri-state. Candidate for extraction into a shared ui/ primitive if a second surface needs it (e.g. schema-validator output, CSV import diff)"
  - "Pattern: Preview-region overflow treatment — outer Sheet flex column is gap-0 + p-0; inner step body owns its own p-6 + overflow-y-auto + thin-scrollbar. Keeps the header/footer chrome flush against the viewport edges while the scrollable middle carries its own padding"

requirements-completed: [META-01, META-03 (UI portion — apply wiring remains for 37-03)]

# Metrics
duration: 3min
completed: 2026-04-19
---

# Phase 37 Plan 02: Metabase SQL Import — Wizard UI Summary

**Five new files under `src/components/metabase-import/` + one sidebar wiring edit land the two-step Import-from-Metabase wizard — right-side Sheet at 60vw, Step 1 paste + explicit Parse button, Step 2 sectioned preview (Columns / Filters / Sort / Chart) with matched + skipped rows carrying icon+label signaling, parse-error card or partial-import banner when applicable. Zero apply logic, zero new state outside local Sheet state — Plan 03 consumes the `onImportSql` callback to wire the apply pipeline.**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-04-19T22:12:25Z
- **Completed:** 2026-04-19T22:15:36Z
- **Tasks:** 3
- **Files created:** 5
- **Files modified:** 1

## Accomplishments

- `ImportSheet` orchestrates the wizard — owns `step`/`sql`/`parseResult`, resets on close (useEffect), disables Apply on parseError, routes the preview's `onBack` to Step 1 preserving SQL but clearing the result.
- `PreviewStep` is a dumb renderer over ParseResult — maps `matched*`/`skipped*` arrays into `PreviewSection` children, surfaces `role="alert"` parse-error card, `role="status"` unsupported-constructs banner, and formats filter labels via a local `formatFilterLabel` helper against `COLUMN_CONFIGS`.
- `PasteStep` renders a 16-row monospace textarea with a Metabase template-tag info note (`{{var}}` → NULL, `[[ ... ]]` dropped — aligns with Pitfall 1's preprocessing documented in Plan 01).
- `PreviewSection` + `PreviewRow` are reusable leaves: text-title heading + text-label-numeric count summary on sections; tri-state (matched / skipped / error) icon + semantic-color + label + optional reason on rows.
- Sidebar entry added as a new single-item SidebarGroup after Views (Database icon + "Import from Metabase" tooltip/label); ImportSheet mounted next to CreateListDialog.
- Defensive `onImportSql` read preserves Wave-2 boundary — Plan 03 will replace the cast with a typed field on SidebarDataState in a single atomic commit.

## Task Commits

Each task was committed atomically:

1. **Task 1: PreviewRow + PreviewSection + PasteStep leaf components** — `8e2c5ba` (feat)
2. **Task 2: PreviewStep composer + ImportSheet shell** — `3495705` (feat)
3. **Task 3: Sidebar entry + ImportSheet mount + defensive onImportSql read** — `0fa373a` (feat)

## Files Created/Modified

**Created:**
- `src/components/metabase-import/preview-row.tsx` — icon+label+reason row with matched/skipped/error variants
- `src/components/metabase-import/preview-section.tsx` — named section shell with title + matched/skipped count + list slot
- `src/components/metabase-import/paste-step.tsx` — Step 1 body: monospace SQL textarea + template-tag info note
- `src/components/metabase-import/preview-step.tsx` — Step 2 body: error card OR 4 sections + Back/Apply footer actions
- `src/components/metabase-import/import-sheet.tsx` — right-side Sheet orchestrator; owns step/sql/parseResult state + onImportSql callback surface

**Modified:**
- `src/components/layout/app-sidebar.tsx` — added Database lucide import + ParseResult type import + importOpen state + defensive `onImportSql` destructure + new SidebarGroup entry + ImportSheet mount

## Decisions Made

See `key-decisions` in the frontmatter above. The six non-trivial calls:

1. **Cross-wave boundary discipline:** `useSidebarData()`'s `onImportSql` is read via a defensive cast rather than modifying `src/contexts/sidebar-data.tsx` in this plan. Plan 03 owns the typed extension. Keeps Wave 2 tsc-clean without pre-shipping Plan 03's context change.
2. **Sidebar entry placement:** new `SidebarGroup` after Views, no `SidebarGroupLabel` — utility entry, not a category. Above `SidebarFooter`, below saved Views.
3. **`onParse` prop retained on PasteStep:** the Parse button lives in the parent Sheet footer, but the callback stays on the leaf's contract for future keyboard-shortcut adoption.
4. **Back vs Close semantics:** Back preserves SQL, clears parseResult. Close resets everything (including SQL). Session-ephemeral scope lock — no localStorage.
5. **Chart section count semantics:** Chart shows `1 matched` when `chartType` is non-null, `0` otherwise. Keeps the matched/skipped summary grammar consistent across all four sections.
6. **Filter label formatting lives in preview-step.tsx:** preview is currently the only consumer. Plan 03's apply path uses `mapToSnapshot` which has its own internal translation. Extracting to a shared util would be premature.

## Deviations from Plan

None requiring Rule 1/2/3 auto-fixes. Two minor mechanical adaptations from the plan's written code:

1. **`PasteStep` destructure:** the plan's snippet destructured `{ sql, onSqlChange, onParse }` but the leaf does not currently render a Parse button (parent Sheet owns it). Destructure uses `{ sql, onSqlChange }` + `eslint-disable` would be ugly — instead kept `onParse` on the prop type surface but prefixed it so TypeScript sees it consumed: ultimately renamed destructure to `{ sql, onSqlChange }` and left `onParse` typed on the interface for future binding. `tsc --noEmit` verified.
2. **`useSidebarData` destructure refactor:** the plan suggested two approaches (add to destructure OR defensive cast). Picked the cast approach verbatim; reworked the component's opening `const { ... } = useSidebarData()` into `const sidebarData = useSidebarData(); const { ... } = sidebarData;` so the cast read can share the same hook result without calling the hook twice.

Neither adaptation altered the plan's architecture or scope.

**Total deviations:** 0 auto-fixed.
**Impact on plan:** No scope creep. 3-task split + 5-new-files + 1-modified-file mapped 1:1 to what shipped.

## Issues Encountered

- **`tsc` pre-existing error** in `tests/a11y/baseline-capture.spec.ts` (`axe-core` module not found) — out of scope per STATE.md Phase 33 entry. Not introduced by this plan.

## User Setup Required

None — UI-only changes. The sidebar entry becomes visible and opens a Sheet with a working Step 1 parse + Step 2 preview immediately; Apply currently no-ops by design until Plan 03 wires `handleApplyImport` through `useSidebarData`.

## Verification

- `npm run smoke:metabase-import` → ✓ 8 fixtures / cases (unchanged)
- `npm run smoke:metabase-map` → ✓ 6 assertions (unchanged)
- `npm run smoke:migrate-chart` → ✓ 11 assertions (unchanged)
- `npm run smoke:axis-eligibility` → ✓ 15 assertions (unchanged)
- `npm run smoke:chart-presets` → ✓ 9 assertions (unchanged)
- `npx tsc --noEmit` → zero new errors (pre-existing Phase-33 axe-core error still out-of-scope per STATE.md)
- `npm run check:tokens` → ✓
- `npm run check:surfaces` → ✓
- `npm run check:components` → ✓
- `npm run check:motion` → ✓
- `npm run check:polish` → ✓

## Next Phase Readiness

Plan 03 (Wave 3) consumes this plan's `onImportSql` callback contract:

```typescript
(result: ParseResult, sourceSql: string) => void
```

Plan 03's work inside Wave 3:
1. Extend `SidebarDataState` in `src/contexts/sidebar-data.tsx` with a typed `onImportSql` field.
2. Bind `handleApplyImport` in `src/components/data-display.tsx` (next to `handleLoadView`) — consumes `mapToSnapshot(result)` + `sourceSql` + `Date.now()` to build a `Partial<ViewSnapshot>` and routes through the existing `handleLoadView` pipeline with drill reset.
3. Remove the defensive cast in `src/components/layout/app-sidebar.tsx` so the read uses the proper destructure.

No edits to Plan-02 files required — `ImportSheet` is a stable boundary.

Blockers: none.

## Self-Check: PASSED

Verified:
- ✓ `src/components/metabase-import/preview-row.tsx` exists
- ✓ `src/components/metabase-import/preview-section.tsx` exists
- ✓ `src/components/metabase-import/paste-step.tsx` exists
- ✓ `src/components/metabase-import/preview-step.tsx` exists
- ✓ `src/components/metabase-import/import-sheet.tsx` exists
- ✓ `src/components/layout/app-sidebar.tsx` modified (Database import + importOpen state + SidebarGroup entry + ImportSheet mount + defensive onImportSql read)
- ✓ Commit 8e2c5ba exists (Task 1)
- ✓ Commit 3495705 exists (Task 2)
- ✓ Commit 0fa373a exists (Task 3)

---
*Phase: 37-metabase-sql-import*
*Completed: 2026-04-19*
