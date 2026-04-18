---
phase: 34-partner-lists
plan: 03
subsystem: ui
tags: [partner-lists, sheet, base-ui-dialog, multi-select, dual-pane, create-edit-dialog]

# Dependency graph
requires:
  - phase: 34-partner-lists
    provides: "Plan 01 — PartnerList / PartnerListFilters / AttributeKey types, usePartnerLists() hook (createList, updateList, getList, hasListWithName), evaluateFilters(rows, filters) pure evaluator"
provides:
  - "<DualPaneTransfer<T extends { id: string; name: string }> /> — reusable Available ⇄ Selected checkbox list UI"
  - "<AttributeFilterBar /> — additive-first row of attribute multi-selects; v1 renders ACCOUNT_TYPE only"
  - "<CreateListDialog /> — Sheet-based create + edit dialog; derives source at save time; hydrates from existing list in edit mode"
affects: [34-04-integration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dual-pane transfer UI — generic <T extends { id, name }> parent-owns-arrays + child-owns-per-pane-check-state; Add/Remove buttons clear the pane's local check state on move. Reusable for any future list-picker surface."
    - "Additive attribute-filter bar — ATTRIBUTES const as the single-line extension point. New attributes land as a config entry + a schema .optional() field + a filter-evaluator AND gate. No component signature change."
    - "Local multi-select combobox adaptation — existing FilterCombobox is single-select (value: string | null); composed a small Popover + Checkbox multi-select where a multi-value attribute filter is required. Keeps the single-select primitive as-is for other callers."
    - "Dialog hydration gate on (open, editMode.listId) only — intentional exhaustive-deps relax so list-state updates do not re-hydrate mid-edit. Reusable pattern for any edit-form that hydrates once per open."

key-files:
  created:
    - "src/components/partner-lists/dual-pane-transfer.tsx"
    - "src/components/partner-lists/attribute-filter-bar.tsx"
    - "src/components/partner-lists/create-list-dialog.tsx"
  modified: []

key-decisions:
  - "Shipped as Sheet (right side, sm:max-w-2xl) — Research Open Q #4 default honored; no swap to centered modal needed"
  - "FilterCombobox NOT extended to multi-select — it is single-select by design; a local multi-select composed from Popover + Checkbox in AttributeFilterBar satisfies Plan 03's multi-select contract without breaking existing FilterCombobox callers"
  - "usePartnerLists hook NOT modified — Plan 01 shipped updateList correctly per UsePartnerListsResult contract; safety-net edit listed in files_modified was not needed"
  - "source: 'attribute' | 'manual' derived at save time from Object.values(filters).some(arr => arr?.length > 0) — never hard-coded, honors Pitfall 7 (source is locked at creation, excluded from updateList's Pick<>)"
  - "Selected pane is unaffected by attribute filter — attribute filter scopes Available only. Sticky-selection semantics prevent 'ghost removal' when the user narrows the filter after picking"
  - "Edit-mode hydration depends on (open, editMode.listId) only, not on getList/onOpenChange — explicit exhaustive-deps relax (inline eslint-disable) so list mutations elsewhere don't clobber the in-progress edit form"
  - "DualPaneTransfer prunes stale per-pane-check ids via useMemo(Set intersection) — handles the case where the parent removes an id from available/selected while the child still has it checked, avoiding phantom Add/Remove counts"
  - "SheetTitle styled with className='text-heading' override per Phase 27-04 rule — NOT wrapped in SectionHeader. Primitive owns the data-slot='sheet-title' ARIA wiring"
  - "Name collision check is case-insensitive trimmed; in edit mode, current list's own name does NOT count as collision unless the trimmed name is changed to a different-but-taken name"
  - "ScrollArea height locked at h-72 (288px) per plan starting value — read acceptably inside a 2xl-wide Sheet; revisit if visual feedback shows clipping under long datasets"

patterns-established:
  - "Parent-owns-arrays + child-owns-pane-check-state for transfer UIs — keeps the component stateless at the data layer, stateful only for transient pick state"
  - "ATTRIBUTES const as additive-filter extension point — one-line config change + matching schema .optional() field + filter-evaluator gate"
  - "Hydrate-on-(open, id) exhaustive-deps relax for edit dialogs — list mutations elsewhere don't clobber in-progress edits"
  - "text-error-fg semantic token for inline form errors — matches 26-02 / 27-03 precedent, no Tailwind emerald/red palette"

requirements-completed: [LIST-01, LIST-02]

# Metrics
duration: 3 min
completed: 2026-04-18
---

# Phase 34 Plan 03: Partner List Creation/Edit Dialog Summary

**Sheet-based create/edit dialog with ACCOUNT_TYPE multi-select narrowing, dual-pane partner transfer, and save-time derived source ('attribute' | 'manual').**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-18T19:33:29Z
- **Completed:** 2026-04-18T19:36:29Z
- **Tasks:** 2
- **Files created:** 3
- **Files modified:** 0

## Accomplishments
- 3 new files under `src/components/partner-lists/` (dual-pane-transfer, attribute-filter-bar, create-list-dialog); zero existing files touched.
- Public API matches the plan's `<interfaces>` block verbatim (DualPaneTransferProps, AttributeFilterBarProps, CreateListDialogProps).
- Dual-pane transfer is generic `<T extends { id: string; name: string }>` — reusable for any future list-picker surface.
- Attribute bar is data-driven through the `ATTRIBUTES` const — adding a future attribute (e.g. PRODUCT_TYPE) is a one-line config change plus backing data.
- CreateListDialog supports both create and edit modes from a single component; `source` locked at creation per Pitfall 7 and derived from filter contents at save time.
- All 4 check:* guards (`check:tokens`, `check:surfaces`, `check:components`, `check:motion`) green; `npm run build` clean with zero TS errors.

## Task Commits

Each task was committed atomically:

1. **Task 1: DualPaneTransfer + AttributeFilterBar** — `31fd333` (feat)
2. **Task 2: CreateListDialog (Sheet + save flow)** — `2a999cf` (feat)

**Plan metadata commit:** pending final docs commit.

## Files Created/Modified

Created:
- `src/components/partner-lists/dual-pane-transfer.tsx` — Generic Available ⇄ Selected checkbox list UI with per-pane transient check state and stale-id pruning.
- `src/components/partner-lists/attribute-filter-bar.tsx` — Additive-first row of attribute multi-selects. v1 renders ACCOUNT_TYPE only; composed a local Popover + Checkbox multi-select because the existing FilterCombobox is single-select by design.
- `src/components/partner-lists/create-list-dialog.tsx` — Sheet (right, sm:max-w-2xl) composing AttributeFilterBar + DualPaneTransfer + name input. Handles both create and edit modes with a single hydration effect gated on (open, editMode.listId).

Modified: None.

## Decisions Made
- Dialog primitive: **Sheet** (right side, `sm:max-w-2xl`). Research Open Q #4 default honored; Dialog fallback not needed.
- FilterCombobox multi-select adaptation: composed a small local multi-select from the Popover + Checkbox primitives already in the codebase (documented inline at the top of `attribute-filter-bar.tsx`). The existing `FilterCombobox` remains single-select for its existing consumers.
- `usePartnerLists` hook safety-net edit NOT applied — Plan 01 shipped `updateList` correctly; the `files_modified` entry was safety-net coverage only.
- `source` derived at save from `hasAnyFilter` over the filters object, never hard-coded. Manual hand-picked lists never become "attribute" by accident; attribute lists always become refreshable downstream.
- Selected pane is unaffected by attribute filter changes (sticky-selection). Attribute filter scopes **Available** only — the plan's `<must_haves.truths>` #2 verbatim.
- Edit-mode hydration depends on `(open, editMode?.listId)` only; exhaustive-deps relax is explicit and commented — keeps list-state mutations elsewhere from clobbering an in-progress edit.
- ScrollArea height fixed at `h-72` inside the Sheet — starting value from the plan; acceptably readable inside the 2xl-wide Sheet.

## Deviations from Plan

### Auto-fixed Issues

None during execution. The plan's `<interfaces>` block was followed exactly; no auto-fix or safety-net edit was triggered.

### Planned adaptations (documented in plan)

**1. [Planned adaptation] FilterCombobox is single-select; multi-select composed locally**
- **Found during:** Task 1 (before writing AttributeFilterBar)
- **Observation:** `src/components/filters/filter-combobox.tsx` exports a SINGLE-select combobox (`value: string | null`, `onValueChange: (value: string | null) => void`). The plan's snippet assumed `label / options / selected / onChange / placeholder` multi-select props.
- **Resolution:** Per the plan's explicit guidance ("If FilterCombobox's API differs materially ... adapt ... Document any adaptation inline"), composed a small local `AttributeMultiSelect` inside `attribute-filter-bar.tsx` using `Popover` + `Checkbox` + `ScrollArea` primitives already in the codebase. The existing single-select `FilterCombobox` remains unchanged for its current consumers.
- **Files modified:** `src/components/partner-lists/attribute-filter-bar.tsx` (local component only; no change to `src/components/filters/filter-combobox.tsx`)
- **Verification:** All 4 guards green; visual/functional shape matches the plan's multi-select contract.
- **Committed in:** `31fd333` (Task 1 commit)

---

**Total deviations:** 0 auto-fixed. 1 planned adaptation (FilterCombobox single-select → local multi-select composition), resolved per plan guidance.
**Impact on plan:** None — the adaptation was anticipated in the plan's action text. API surface in `<interfaces>` is unchanged. No scope creep.

## Issues Encountered
None.

## User Setup Required
None — no external service configuration required. This plan ships 3 UI component files; no env vars, no dashboards.

## Next Phase Readiness
- Plan 04 (integration) can import `{ CreateListDialog } from '@/components/partner-lists/create-list-dialog'` and wire the `open` + `editMode` state to `PartnerListsSidebarGroup`'s `onCreateList` / `onEditList` callbacks from Plan 02.
- The dialog consumes `allRows` directly; Plan 04 should pass `data.data` from `data-display.tsx` (same source `SidebarDataPopulator` uses today).
- ACCOUNT_TYPE-only v1 scope locked; adding PRODUCT_TYPE or REVENUE_BAND requires: (a) `ATTRIBUTES` const entry in `attribute-filter-bar.tsx`, (b) `availableValues` derivation in `create-list-dialog.tsx`, (c) `.optional()` field in `partner-lists/schema.ts`, (d) AND gate in `filter-evaluator.ts`. Three-step additive change, no breaking edits.
- No blockers.

## Self-Check: PASSED

All 3 created files verified on disk. Both task commits (31fd333, 2a999cf) verified in git log.

---
*Phase: 34-partner-lists*
*Completed: 2026-04-18*
