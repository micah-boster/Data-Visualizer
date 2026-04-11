---
phase: 05-column-management
plan: 01
subsystem: ui
tags: [react, tanstack-table, shadcn, localStorage]

requires:
  - phase: 04-dimension-filtering
    provides: "Filter bar and chips for dimension filters"
provides:
  - "Column picker sidebar with domain-grouped toggles"
  - "useColumnManagement hook for visibility/order state"
  - "localStorage persistence for column state"
  - "Column groups mapping all 61 columns into 11 domains"
affects: [05-02-drag-reorder, 05-03-column-filters]

tech-stack:
  added: [shadcn-checkbox, shadcn-scroll-area]
  patterns: [hydration-safe-localStorage, external-column-state]

key-files:
  created:
    - src/lib/columns/groups.ts
    - src/lib/columns/persistence.ts
    - src/hooks/use-column-management.ts
    - src/components/columns/column-picker-sidebar.tsx
    - src/components/columns/column-group.tsx
    - src/components/columns/column-search.tsx
  modified:
    - src/lib/table/hooks.ts
    - src/components/table/data-table.tsx

key-decisions:
  - "Hydration-safe initialization: defaults in useState, localStorage applied in useEffect"
  - "External visibility/order state pattern: useDataTable accepts optional external state to avoid dual-source conflict"

patterns-established:
  - "Hydration-safe localStorage: initialize with defaults, apply stored values in useEffect"
  - "External state injection: hooks accept optional state/setters, fall back to internal state"

requirements-completed: [TABL-04]

duration: 12min
completed: 2026-04-11
---

# Phase 05 Plan 01: Column Picker Sidebar Summary

**Domain-grouped column picker sidebar with 11 groups, search, bulk actions, localStorage persistence, and toolbar integration for all 61 columns**

## Performance

- **Duration:** 12 min
- **Started:** 2026-04-11T12:00:00Z
- **Completed:** 2026-04-11T12:12:00Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- All 61 columns mapped into 11 domain groups (Identity, Account Counts, Financials, Balance Bands, Timing, Credit, Payments, Collection Curves, Penetration, Conversion, Digital Channels)
- Column picker sidebar accessible from toolbar "Columns (N/61)" button
- Search, Show All / Hide All, per-group toggle, individual toggle, Reset to Defaults
- Identity columns (Partner, Lender ID, Batch, Account Type, Batch Age) are locked visible
- Column visibility and order persist across page reloads via localStorage
- useDataTable refactored to accept external visibility/order state

## Task Commits

1. **Task 1: Column groups, persistence, and useColumnManagement hook** - `fc1191e` (feat)
2. **Task 2: Column picker sidebar UI and toolbar integration** - `3edda63` (feat)

## Files Created/Modified
- `src/lib/columns/groups.ts` - 11 domain groups mapping all 61 columns, default visibility, default order
- `src/lib/columns/persistence.ts` - localStorage read/write with SSR safety
- `src/hooks/use-column-management.ts` - Manages visibility, order, toggles, bulk actions, localStorage sync
- `src/components/columns/column-picker-sidebar.tsx` - Sheet sidebar with grouped toggles
- `src/components/columns/column-group.tsx` - Collapsible group with toggle-all checkbox
- `src/components/columns/column-search.tsx` - Search input with clear button
- `src/lib/table/hooks.ts` - Accepts external visibility/order state, returns columnOrder
- `src/components/table/data-table.tsx` - Wires useColumnManagement, adds Columns button

## Decisions Made
- Hydration-safe initialization pattern: defaults in useState, localStorage in useEffect
- External column state injection into useDataTable to avoid dual-source visibility management
- Used base-ui Checkbox `indeterminate` prop instead of Radix-style checked='indeterminate'

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] base-ui Checkbox indeterminate API**
- **Found during:** Task 2 (Column picker sidebar UI)
- **Issue:** Plan assumed Radix-style `checked='indeterminate'` but base-ui Checkbox uses separate `indeterminate` boolean prop
- **Fix:** Used `indeterminate={someVisible && !allVisible}` prop instead
- **Files modified:** src/components/columns/column-group.tsx
- **Verification:** Build passes, indeterminate state renders correctly
- **Committed in:** 3edda63

**2. [Rule 3 - Blocking] React 19 useRef requires initial value**
- **Found during:** Task 2
- **Issue:** `useRef<T>()` without argument fails type check in React 19
- **Fix:** Added explicit `undefined` initial value
- **Files modified:** src/components/table/data-table.tsx
- **Verification:** Build passes
- **Committed in:** 3edda63

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking)
**Impact on plan:** Minor API differences, no scope change.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Column groups, persistence, and useColumnManagement hook ready for Plan 05-02 (drag reorder) and Plan 05-03 (column filters)
- Both Wave 2 plans can execute in parallel

---
*Phase: 05-column-management*
*Completed: 2026-04-11*
