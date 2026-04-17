---
phase: 32-url-backed-navigation
plan: 02
subsystem: navigation
tags: [next-navigation, useRouter, saved-views, zod, localStorage, url-state, drill-down]

# Dependency graph
requires:
  - phase: 06-saved-views
    provides: ViewSnapshot / viewSnapshotSchema, SaveViewPopover, saveView/replaceView store
  - phase: 32-url-backed-navigation (Plan 01)
    provides: URL-backed useDrillDown hook + ?p=&b= drill param contract
provides:
  - Optional `ViewSnapshot.drill` field (partner?/batch?) with matching zod .optional()
  - "Include current drill state" checkbox surfaced in SaveViewPopover only when drilled
  - handleSaveView / handleReplaceView capture drill when opted in (never otherwise)
  - handleLoadView pushes drill URL via router.push alongside the existing filter history.replaceState
  - canIncludeDrill prop threaded DataDisplay -> DataTable -> UnifiedToolbar -> SaveViewPopover
  - Backward compatibility: every legacy saved view (no drill key) still validates + loads
affects: [breadcrumb, shareable-links, 32-future-url-surfaces, any-phase-extending-ViewSnapshot]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Additive zod schema change via .optional() — no localStorage migration needed"
    - "Options bag on callback (name, options?: { includeDrill?: boolean }) for backward-compatible widening"
    - "Native <input type='checkbox'> inside popover (no new shadcn component) — keeps file self-contained"
    - "Orthogonal URL updates in a single handler: window.history.replaceState for filters + router.push for drill"
    - "Drill capture gated on (opted in AND drillState.level !== 'root') — never write {} when absent"

key-files:
  created: []
  modified:
    - src/lib/views/types.ts
    - src/lib/views/schema.ts
    - src/components/toolbar/save-view-popover.tsx
    - src/components/toolbar/unified-toolbar.tsx
    - src/components/data-display.tsx
    - src/components/table/data-table.tsx

key-decisions:
  - "Additive zod .optional() — no localStorage migration required; legacy views load unchanged"
  - "canIncludeDrill threading required an extra layer through DataTable (one prop deeper than the plan anticipated); no behavioral drift"
  - "window.history.replaceState (dimension filters) and router.push (drill state) coexist in handleLoadView as two distinct, orthogonal URL updates — both fire cleanly without interfering"
  - "Sonner toast copy left unchanged ('View saved') — no 'includes drill state' suffix; justification below"
  - "Drill capture gated on both options.includeDrill AND drillState.level !== 'root' — prevents writing snapshot.drill = {} from a stale opted-in checkbox after user navigated back to root between popover open and submit"

patterns-established:
  - "Additive schema evolution: z.object({ ... }).optional() at the leaf + matching TS `?:` — zero migration cost, forward-compatible"
  - "Options-bag callback widening: (name) -> (name, options?: { ... }) keeps every existing call site type-valid while adding opt-in behavior"
  - "Two-API URL updates in one handler: history.replaceState for non-history-worthy state (filters), router.push for history-worthy state (drill) — safely coexisting"
  - "UI affordance gating via a parent-computed boolean (canIncludeDrill = drillState.level !== 'root'), threaded down as a prop rather than letting the leaf inspect global state"

requirements-completed: [NAV-04]

# Metrics
duration: ~35min
completed: 2026-04-17
---

# Phase 32 Plan 02: Saved Views Carry Optional Drill State Summary

**ViewSnapshot gains optional drill field (partner?/batch?) — Save popover shows opt-in checkbox when drilled; loading pushes ?p=&b= via router.push alongside the existing filter history.replaceState; zero localStorage migration**

## Performance

- **Duration:** ~35 min across two sessions (Tasks 1-3 auto, then human-verify checkpoint approved this session)
- **Started:** 2026-04-16T22:48:00Z (Task 1 commit timestamp)
- **Completed:** 2026-04-17T13:17:00Z (Task 3 commit) + human-verify approval 2026-04-17
- **Tasks:** 4 (3 auto + 1 human-verify checkpoint)
- **Files modified:** 6 (5 planned + 1 extra prop-threading stop in table/data-table.tsx)

## Accomplishments

- Saved views may now optionally carry drill state (`drill?: { partner?, batch? }`). Users opt in per-save via a new "Include current drill state" checkbox that only appears when currently drilled.
- Loading a view with drill state pushes `?p=<partner>&b=<batch>` via `next/navigation` `router.push` — the browser receives a real history entry and back-button behavior matches Plan 32-01's contract.
- Loading a view without drill state while currently drilled clears `p` and `b` from the URL; filter params and other snapshot state are untouched.
- Legacy saved views (pre-Plan 02, no `drill` key in localStorage) continue to load with no zod errors and no migration step. Verified in human-verify scenario 8.
- `window.history.replaceState` call for dimension filters preserved at exactly one occurrence in `data-display.tsx` — Phase 25 / Plan 32-01 regression guards honored.

## Task Commits

1. **Task 1: Extend ViewSnapshot type and zod schema** — `e078f4d` (feat)
2. **Task 2: Add 'Include drill state' checkbox to SaveViewPopover + forward through UnifiedToolbar** — `ce0345e` (feat)
3. **Task 3: Wire save/load handlers in data-display for drill state** — `a8ce5b8` (feat)
4. **Task 4: Human-verify saved-view drill integration end-to-end** — APPROVED by user (checkpoint — no code commit; all 9 scenarios passed)

**Plan metadata:** pending (docs commit at end of this summary)

## Files Created/Modified

- `src/lib/views/types.ts` — Added `drill?: { partner?: string; batch?: string }` to `ViewSnapshot` interface.
- `src/lib/views/schema.ts` — Added matching `drill: z.object({ partner: z.string().optional(), batch: z.string().optional() }).optional()` to `viewSnapshotSchema`.
- `src/components/toolbar/save-view-popover.tsx` — Widened `SaveViewPopoverProps` with `canIncludeDrill?: boolean` and an optional `{ includeDrill?: boolean }` options arg on `onSave`/`onReplace`. Native `<input type="checkbox">` renders only when `canIncludeDrill` is true; resets to unchecked when the popover closes.
- `src/components/toolbar/unified-toolbar.tsx` — Forwards `canIncludeDrill` prop through to `SaveViewPopover`; widened `onSaveView` prop signature to match.
- `src/components/data-display.tsx` — `useRouter` imported and instantiated. `handleSaveView` / `handleReplaceView` accept the options bag and write `snapshot.drill` only when opted in AND `drillState.level !== 'root'`. `handleLoadView` now performs two distinct URL updates: the pre-existing `window.history.replaceState` for filter params, plus a new `router.push` with `?p=&b=` computed from `snapshot.drill` (or cleared when absent), with `{ scroll: false }`. `canIncludeDrill={drillState.level !== 'root'}` passed down to the toolbar.
- `src/components/table/data-table.tsx` — Widened prop types to forward `canIncludeDrill` and the new options-bag `onSave`/`onReplace` signatures. One extra prop layer beyond what the plan anticipated (see "Deviations from Plan").

## Decisions Made

**No localStorage migration required — legacy views still load (scenario 8 approved)**
The `drill` field on both `ViewSnapshot` and `viewSnapshotSchema` is strictly additive (TS `?:` + zod `.optional()`). A legacy snapshot saved before Plan 02 has no `drill` key, and zod treats an absent optional field as valid. User confirmed in human-verify scenario 8 that pre-existing saved views in localStorage loaded without parse errors or toast warnings. No migration script, no version field bump, no localStorage key surgery.

**`canIncludeDrill` threading required one extra prop layer (DataTable), beyond plan's UnifiedToolbar-only expectation**
The plan's `<output>` anticipated threading through `UnifiedToolbar` only. In practice, `data-display.tsx` does not render `UnifiedToolbar` directly — it renders it via `DataTable` (and `CrossPartnerDataTable` which internally uses `DataTable`). So `canIncludeDrill` plus the widened `onSave`/`onReplace` signatures had to be forwarded through `DataTable`'s prop interface as well. One extra prop layer; no behavioral drift; no new components introduced. Documented here so future readers of `32-02-PLAN.md`'s `<output>` section know to expect `src/components/table/data-table.tsx` in the modified-files list.

**`window.history.replaceState` (filters) and `router.push` (drill) coexist cleanly in `handleLoadView`**
Confirmed during human-verify that both fire in sequence in `handleLoadView` without interfering. The two APIs address intentionally different concerns:
  - `window.history.replaceState` for dimension filters: filters are not history-worthy (user doesn't expect Back to undo a filter); replace semantics match `use-filter-state.ts`'s design.
  - `router.push` for drill: each drill transition *is* history-worthy (NAV-02 back-button contract); push creates a real history entry and forces `useSearchParams` to re-read so `useDrillDown` re-renders (Pitfall 5 in RESEARCH.md).
No interference because `replaceState` mutates the current history entry's URL synchronously, then `router.push` creates a *new* entry on top. Order matters only in that `router.push` must come second (so the new entry captures the replaced filter URL as its starting point for the Back destination).

**Sonner toast copy left as `'View saved'` — NOT `'View saved (includes drill state)'`**
The plan explicitly called out this UX judgment. Decision: leave the copy unchanged.
  - **Reasoning:** The checkbox itself is the signal — users who ticked it know they opted in; users who didn't tick don't need reassurance. Adding a conditional suffix would be the only toast copy in the app that branches on a capture flag, setting an inconsistent precedent.
  - **Counter-argument considered:** A "(includes drill state)" suffix would provide a quick visual receipt that the drill was actually captured. Rejected because the same receipt is already visible in the subsequent load flow — clicking the saved view and seeing the URL acquire `?p=&b=` is itself the confirmation.
  - **Reopen trigger:** If users later report "I can't tell which of my saved views are deep links vs layout-only," revisit this — possibly by annotating the sidebar list rather than the transient toast.

**Drill capture gated on `(options?.includeDrill && drillState.level !== 'root')`**
The checkbox can't render unless `canIncludeDrill` is true (which requires `drillState.level !== 'root'`), so in practice the two conditions align. The extra `drillState.level !== 'root'` check in `handleSaveView` is defensive: prevents writing `snapshot.drill = {}` if the user opens the popover while drilled, ticks the checkbox, then navigates back to root before submitting (an unlikely but possible race). Zero cost, eliminates an edge case where a view could ship a truthy-but-empty drill object.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] Additional prop-threading stop through `DataTable`**
- **Found during:** Task 3 (wire save/load handlers in data-display)
- **Issue:** Plan's `<output>` listed 5 files to modify (types.ts, schema.ts, save-view-popover.tsx, unified-toolbar.tsx, data-display.tsx) but `data-display.tsx` doesn't render `UnifiedToolbar` directly — it renders `DataTable` / `CrossPartnerDataTable`, which in turn render `UnifiedToolbar`. Without widening `DataTable`'s prop interface, TS refused to accept `canIncludeDrill` and the widened `onSave`/`onReplace` signatures at the DataDisplay render site.
- **Fix:** Widened `DataTableProps` in `src/components/table/data-table.tsx` to forward the new prop and widened signatures. No logic changes in DataTable — pure pass-through.
- **Files modified:** `src/components/table/data-table.tsx`
- **Verification:** TSC + ESLint clean; all 9 human-verify scenarios pass.
- **Committed in:** `a8ce5b8` (Task 3 commit)

### Deferred (Out of Scope)

**Pre-existing lint issues logged to `.planning/phases/32-url-backed-navigation/deferred-items.md`:**
- `react-hooks/set-state-in-effect` in `save-view-popover.tsx` (pre-dates Plan 02; preserved the same pattern when adding `setIncludeDrill`).
- Unused `UnifiedToolbar` import in `data-display.tsx` (trivial fix, but out of scope for a NAV-04 plan).

Both verified pre-existing via stash round-trips. Neither blocks this plan; both remain for a future hygiene sweep.

---

**Total deviations:** 1 auto-fixed (Rule 3 — Blocking), 2 deferred (pre-existing out-of-scope)
**Impact on plan:** The auto-fix was a necessary prop-threading extension, not a scope expansion. The plan's `<output>` section underestimated the thread depth by one layer; this summary captures the actual list for future reference.

## Issues Encountered

None during implementation. All three auto tasks landed on first pass with TSC + ESLint clean on the modified files. Human-verify checkpoint approved all 9 scenarios without revisions.

## Verification Notes (from Task 4 checkpoint)

All 9 human-verify scenarios passed:

1. Root-level save hides the checkbox — popover shows name input only; no "Include current drill state" row.
2. Drill-level save shows the checkbox, default unchecked — user saved "Partner Only" without ticking; localStorage entry had no `drill` key.
3. Saving with checkbox ticked captures drill — localStorage entry contained `"drill":{"partner":"<Name>"}` (no batch at partner level).
4. Save at batch level captures both — localStorage entry contained `"drill":{"partner":"<Name>","batch":"<Date>"}`.
5. Loading a view with drill state pushes the URL — `?p=<Name>&b=<Date>` appeared; page rendered the batch drill; no scroll jump.
6. Loading a view without drill state while currently drilled clears drill — URL lost `p` and `b`; filter params from the loaded snapshot present.
7. Back button works after loading a drilled view — pressing Back returned to pre-load state.
8. Legacy saved view still loads (backward compat) — pre-Plan-02 localStorage entry loaded with no zod/parse errors; no toast about corruption.
9. No console errors during any flow.

## User Setup Required

None — no external service configuration introduced.

## Next Phase Readiness

- **Phase 32 complete.** NAV-01 / NAV-02 / NAV-03 shipped in Plan 01; NAV-04 shipped in Plan 02. URL-backed navigation is now fully in place for drill state + shareable saved-view deep links.
- **Future consumers:** Any phase that wants to extend `ViewSnapshot` should follow the additive-zod-optional pattern proved here; any phase that wants to write to the URL alongside filter state should follow the orthogonal-update pattern (`history.replaceState` for non-history-worthy, `router.push` for history-worthy) documented above.
- **No blockers.**

---
*Phase: 32-url-backed-navigation*
*Completed: 2026-04-17*

## Self-Check: PASSED

- FOUND: `.planning/phases/32-url-backed-navigation/32-02-SUMMARY.md`
- FOUND: commit `e078f4d` (Task 1)
- FOUND: commit `ce0345e` (Task 2)
- FOUND: commit `a8ce5b8` (Task 3)
- FOUND: `src/lib/views/types.ts`
- FOUND: `src/lib/views/schema.ts`
- FOUND: `src/components/toolbar/save-view-popover.tsx`
- FOUND: `src/components/toolbar/unified-toolbar.tsx`
- FOUND: `src/components/data-display.tsx`
- FOUND: `src/components/table/data-table.tsx`
