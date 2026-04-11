---
phase: 05-column-management
plan: 03
subsystem: ui
tags: [react, tanstack-table, filtering, popover]

requires:
  - phase: 05-01
    provides: "Column groups and useColumnManagement hook"
  - phase: 04-dimension-filtering
    provides: "URL-backed dimension filters and FilterChips"
provides:
  - "Per-column filtering with type-specific UIs"
  - "Custom checklistFilter and rangeFilter functions"
  - "Merged filter pipeline composing dimension + in-column filters"
affects: []

tech-stack:
  added: [shadcn-popover]
  patterns: [custom-filter-functions, merged-filter-pipeline, faceted-values]

key-files:
  created:
    - src/lib/columns/filter-functions.ts
    - src/hooks/use-column-filters.ts
    - src/components/table/column-header-filter.tsx
    - src/components/table/text-column-filter.tsx
    - src/components/table/numeric-column-filter.tsx
  modified:
    - src/lib/columns/definitions.ts
    - src/lib/table/hooks.ts
    - src/components/table/data-table.tsx
    - src/components/table/draggable-header.tsx
    - src/components/table/table-header.tsx
    - src/components/filters/filter-chips.tsx

key-decisions:
  - "In-column filters are session-only (not URL-backed) to avoid URL bloat"
  - "Custom filter functions assigned directly on column definitions via filterFn"
  - "Faceted row model enabled for unique values and min/max display"

patterns-established:
  - "Custom FilterFn with autoRemove for TanStack Table"
  - "Merged filter pipeline: URL-backed + session-state filters ANDed together"

requirements-completed: [TABL-03]

duration: 12min
completed: 2026-04-11
---

# Phase 05 Plan 03: Per-Column Filtering Summary

**Type-specific per-column filters with text checklist and numeric range popovers, composing with Phase 4 dimension filters via merged pipeline**

## Performance

- **Duration:** 12 min
- **Started:** 2026-04-11T12:22:00Z
- **Completed:** 2026-04-11T12:34:00Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments
- Text columns show searchable value checklist popover with counts
- Numeric columns show min/max range inputs with data range placeholders
- In-column filters AND together with Phase 4 dimension filters
- Active in-column filters display as chips alongside dimension filter chips
- Filter icon on column headers: visible on hover, stays visible when active (primary color)
- Faceted row model provides unique values and min/max ranges

## Task Commits

1. **Task 1: Filter functions, useColumnFilters hook, and column def wiring** - `7b05758` (feat)
2. **Task 2: Column header filter UI** - `2572f6e` (feat)

## Files Created/Modified
- `src/lib/columns/filter-functions.ts` - checklistFilter and rangeFilter custom functions
- `src/hooks/use-column-filters.ts` - Session-only per-column filter state with merge function
- `src/components/table/column-header-filter.tsx` - Filter icon + Popover wrapper
- `src/components/table/text-column-filter.tsx` - Search + value checklist UI
- `src/components/table/numeric-column-filter.tsx` - Min/max range UI
- `src/lib/columns/definitions.ts` - filterFn assigned per column type
- `src/lib/table/hooks.ts` - Faceted models enabled
- `src/components/table/data-table.tsx` - Merged filter pipeline integration
- `src/components/filters/filter-chips.tsx` - Extended with in-column filter chips

## Decisions Made
- In-column filters are session-only (React state) not URL-backed to avoid URL parameter explosion
- Used base-ui PopoverTrigger directly (no asChild) per the shadcn-on-base-ui API

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] base-ui PopoverTrigger does not support asChild**
- **Found during:** Task 2
- **Issue:** Plan assumed Radix-style asChild on PopoverTrigger but base-ui renders its own button
- **Fix:** Applied className and onClick directly to PopoverTrigger instead
- **Files modified:** src/components/table/column-header-filter.tsx
- **Verification:** Build passes, popover opens correctly
- **Committed in:** 2572f6e

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor API adaptation, no scope change.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 5 complete: column picker, drag reorder, and per-column filters all operational
- Ready for phase verification

---
*Phase: 05-column-management*
*Completed: 2026-04-11*
