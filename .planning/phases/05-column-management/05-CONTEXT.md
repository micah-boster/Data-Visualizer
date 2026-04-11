# Phase 5: Column Management - Context

**Gathered:** 2026-04-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can control which of the 61 columns are visible, reorder them by dragging, and filter within column values. This phase covers the column picker UI, drag reorder, per-column filtering, default visibility, and localStorage persistence. Saved Views (named presets) are Phase 6.

</domain>

<decisions>
## Implementation Decisions

### Column Picker UI
- Sidebar panel that slides in from the right
- Columns grouped by domain (e.g., "Payment Metrics", "Contact Rates", "Account Info") with expand/collapse per group
- Search bar at top that filters the column list in real-time
- Bulk actions: global Show All / Hide All buttons at top, plus toggle-all checkbox per group header
- Badge on toolbar button showing visible vs total count (e.g., "Columns (12/61)")

### Drag Reorder
- Drag handle icon (grip) appears on hover in column header — separate from click-to-sort
- Column order also rearrangeable from the sidebar picker via drag (for bulk reorganization)
- Visual feedback during drag: semi-transparent ghost column + blue drop indicator line
- Column order and visibility persisted to localStorage across page reloads

### In-column Filtering
- Filter icon appears on hover in column header; clicking opens a popover with type-specific filter options
- Text columns: search box + value checklist (search narrows the checklist, user checks/unchecks specific values)
- Numeric columns: range inputs (min/max) with the column's actual range as placeholder hints. Comparison operators (>, <, =, between) deferred to a later enhancement
- In-column filters AND together with Phase 4 dimension filters — both shown as active filter chips

### Default Visibility
- ~10-15 key columns visible by default (Claude picks based on schema analysis)
- Identifier columns (partner name, batch date) pinned to the left — always visible, can't be hidden
- "Reset to defaults" button at the bottom of the sidebar picker restores default visibility and order

### Claude's Discretion
- Exact default column set selection based on schema analysis
- Domain grouping assignments for the 61 columns
- Popover positioning and animation details
- Drag library choice and implementation approach
- Loading/transition states during column changes

</decisions>

<specifics>
## Specific Ideas

- Numeric filter starts with min/max range inputs; plan to add comparison operators (>, <, =, between) as future enhancement
- Column count badge on toolbar button gives users a quick glance at how customized their view is
- Sidebar picker serves double duty: show/hide toggles AND drag reorder for full column management in one place

</specifics>

<deferred>
## Deferred Ideas

- Comparison operators for numeric filters (>, <, =, between) — future enhancement beyond Phase 5
- Named saved views / presets — Phase 6

</deferred>

---

*Phase: 05-column-management*
*Context gathered: 2026-04-11*
