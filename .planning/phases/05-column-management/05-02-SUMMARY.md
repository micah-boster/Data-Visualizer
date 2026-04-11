---
phase: 05-column-management
plan: 02
subsystem: ui
tags: [react, dnd-kit, tanstack-table, drag-reorder]

requires:
  - phase: 05-01
    provides: "useColumnManagement hook, column order state, localStorage persistence"
provides:
  - "Draggable column headers with grip handles"
  - "Sidebar drag reorder for column list items"
  - "@dnd-kit integration with DndContext and SortableContext"
affects: []

tech-stack:
  added: ["@dnd-kit/core", "@dnd-kit/sortable", "@dnd-kit/utilities"]
  patterns: [dual-dnd-context, sortable-header-cells]

key-files:
  created:
    - src/components/table/draggable-header.tsx
  modified:
    - src/components/table/table-header.tsx
    - src/components/table/data-table.tsx
    - src/components/columns/column-group.tsx
    - src/components/columns/column-picker-sidebar.tsx

key-decisions:
  - "Separate DndContext for table headers and sidebar to avoid cross-interference"
  - "Grip handle triggers drag, header text triggers sort -- separate interaction zones"
  - "Used pnpm (not npm) for package installation -- project uses pnpm"

patterns-established:
  - "Dual DndContext pattern: separate contexts for table header and sidebar drag"
  - "Sortable items with disabled flag for pinned/identity columns"

requirements-completed: [TABL-05]

duration: 10min
completed: 2026-04-11
---

# Phase 05 Plan 02: Column Drag-to-Reorder Summary

**Drag-to-reorder columns via @dnd-kit with grip handles in both table headers and sidebar picker, separate DndContexts to avoid interference**

## Performance

- **Duration:** 10 min
- **Started:** 2026-04-11T12:12:00Z
- **Completed:** 2026-04-11T12:22:00Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Column headers show grip handle on hover for drag-to-reorder
- Sidebar column rows show grip handle on hover for drag-to-reorder
- Pinned/identity columns cannot be dragged in either location
- DragOverlay shows column label during drag in both contexts
- Column order persists across page reloads via existing localStorage mechanism

## Task Commits

1. **Task 1: Install @dnd-kit and create DraggableHeader** - `5c3a680` (feat)
2. **Task 2: Sidebar drag reorder for column list items** - `7b1b3c6` (feat)

## Files Created/Modified
- `src/components/table/draggable-header.tsx` - Sortable th wrapper with grip handle
- `src/components/table/table-header.tsx` - SortableContext wrapping header cells
- `src/components/table/data-table.tsx` - DndContext for table, DragOverlay
- `src/components/columns/column-group.tsx` - Sortable column rows with grip handles
- `src/components/columns/column-picker-sidebar.tsx` - DndContext for sidebar reorder

## Decisions Made
- Separate DndContexts for header and sidebar to prevent cross-interference
- Grip icon on header cells separate from sort click target
- Used pnpm for package installation (project uses pnpm, not npm)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] npm install fails with arborist bug**
- **Found during:** Task 1
- **Issue:** npm install @dnd-kit packages fails with "Cannot read properties of null" in arborist due to leftover pnpm node_modules structure
- **Fix:** Used pnpm add instead of npm install
- **Files modified:** package.json, pnpm-lock.yaml
- **Verification:** pnpm add succeeded, build passes
- **Committed in:** 5c3a680

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Package manager switch to pnpm, no scope change.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Drag reorder complete, ready for verification
- Column order state shared between header drag and sidebar drag via useColumnManagement

---
*Phase: 05-column-management*
*Completed: 2026-04-11*
