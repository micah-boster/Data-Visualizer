# Phase 33 Deferred Items

Pre-existing issues surfaced during Phase 33 execution but outside the current plan's scope. Flagged here for Plan 05 close-out or a follow-up phase.

## 1. scrollable-region-focusable (serious) on root-dashboard table scroll wrapper

**Surfaced during:** Plan 33-04 (executor ran `npx playwright test tests/a11y/axe-baseline.spec.ts` post-contrast-retune to confirm zero color-contrast hits; `scrollable-region-focusable` failed the FOCUS_CATEGORIES BLOCKING partition).

**Failing DOM:** `src/components/table/data-table.tsx:374` — outer scroll wrapper `<div data-density="dense" class="thin-scrollbar relative z-0 flex-1 overflow-auto rounded-lg bg-surface-inset">`. axe rule: "Element should have focusable content" / "Element should be focusable".

**Pre-existence verified:** Stash-retune + re-run on dashboard-root[light] with my Plan 04 edit reverted still fails with identical node — confirms the violation predates Plan 04's `--color-green-700` retune and is not a Plan 04 regression. Plan 03 SUMMARY's self-check did not run `check:a11y` end-to-end (continuation agent deliberately skipped full suite per orchestrator spec), so this debt slipped through Plan 03 closure.

**Scope boundary:** Plan 04's `files_modified` locks changes to `src/app/globals.css` + `tests/a11y/axe-baseline.spec.ts`. Editing `data-table.tsx` to add `tabIndex={0}` is a Plan 03 concern (keyboard/focus). Additionally, `data-table.tsx` has unrelated pre-existing working-tree modifications (user work) that the coordination note explicitly says not to touch.

**Suggested fix for Plan 05 close-out:**
1. Add `tabIndex={0}` to the scroll wrapper at `data-table.tsx:374`, OR
2. Rely on the fact that rows inside the scroll container carry `tabIndex={0}` already (Plan 03 Task 1) — axe's `scrollable-region-focusable` should PASS when focusable descendants exist. Verify: sometimes axe does not see the descendants because React's virtualizer only mounts a window. If so, add `tabIndex={0}` directly to the wrapper.

**Impact on Plan 04:** None. Task 2 success criterion is "zero color-contrast violations" — satisfied (baseline.json confirms 0 color-contrast nodes across 9 routes × themes after the single `--color-green-700` retune). `check:a11y` fails on this unrelated rule, not on color-contrast.

**Related:** 3 nodes total — dashboard-root[light], dashboard-root[dark], saved-view-popover-open[light]. Same root cause: the table scroll wrapper `.z-0.overflow-auto` surfaces in all three DOM snapshots.
