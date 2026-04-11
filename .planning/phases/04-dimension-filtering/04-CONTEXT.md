# Phase 4: Dimension Filtering - Context

**Gathered:** 2026-04-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Add partner, account type, and batch filter controls that compose with AND logic. Users can narrow the table to specific slices of data and see/remove active filters as chips. Multi-select within a dimension and filter presets are out of scope.

</domain>

<decisions>
## Implementation Decisions

### Filter bar placement
- Horizontal bar below the column preset tabs, above the table
- All three filter dropdowns (partner, account type, batch) visible at once — no progressive reveal
- Batch dropdown options scoped to selected partner when a partner filter is active (prevents zero-result selections)

### Filter interaction
- Combobox with search for all three filters (type to filter the list, click to select)
- Single-select only per dimension (one partner, one account type, one batch at a time)
- Table updates immediately on selection — no "Apply" button
- Consistent combobox style across all three filters (including batch)

### Filter chip behavior
- Active filter chips displayed in a row below the filter bar, above the table
- Each chip shows dimension label + selected value, with an X to remove
- "Clear all" text link appears at the end of the chip row when any filters are active
- Removing a chip resets the corresponding dropdown to its placeholder ("All partners", etc.)
- No row counts on chips

### Default state & persistence
- Page loads with no filters active — full dataset visible
- Filter state persisted in URL query params (?partner=Acme&type=Medical) — shareable and survives refresh
- No quick-filter presets or recent selections (Saved Views in Phase 6 covers this)
- Zero-results state shows "No results match your filters" with a "Clear filters" link

### Claude's Discretion
- Exact combobox component choice and styling
- Filter bar spacing and responsive layout
- Loading state during filter transitions (if needed)
- Keyboard navigation within combobox dropdowns

</decisions>

<specifics>
## Specific Ideas

- Architecture should support extending to multi-select per dimension later (for partner comparisons) — use single-select for now but don't paint into a corner
- URL params make filtered views shareable across the team — important for the partnerships workflow

</specifics>

<deferred>
## Deferred Ideas

- Multi-select within a dimension (e.g., select 2+ partners for comparison) — future enhancement after Phase 4
- Filter presets / recent selections — Phase 6 (Saved Views)

</deferred>

---

*Phase: 04-dimension-filtering*
*Context gathered: 2026-04-11*
