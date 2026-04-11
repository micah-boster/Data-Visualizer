# Phase 2: Core Table and Performance - Context

**Gathered:** 2026-04-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Render batch performance data from `/api/data` in an interactive, sortable table using TanStack Table. Users can view data, sort by any column (single and multi), and switch between curated column presets. This phase builds the core table that later phases layer filtering, column management, and drill-down onto.

</domain>

<decisions>
## Implementation Decisions

### Table layout & density
- **Comfortable row height** (~40-44px) — balanced between data density and readability, like Linear's issue list
- **Horizontal scroll with frozen columns** — first 1-2 identity columns (partner name, batch) pinned left while user scrolls right through metrics
- **Smart default column widths, user-resizable** — each column gets a sensible width by data type (narrow for %, wider for names), users can drag column borders to resize
- **Virtualized scrolling** — all ~533 rows rendered in a single scrollable view, only visible rows in the DOM for performance. No pagination.

### Default columns & column presets
- **8-12 columns per preset** — curated starting sets, not the full 61
- **Multiple named column presets** — launch with at least 2-3 presets:
  - **Finance**: identity columns + placed balance, gross collected, net revenue, collection rate
  - **Outreach / Penetration**: identity columns + contact rates, payment counts, unique payers, penetration metrics
  - (Claude to curate exact column lists from schema based on these themes)
- **Tab bar above the table** to switch presets — horizontal tabs like "Finance | Outreach | All", one-click switching
- Identity columns always present across all presets: partner name, batch identifier, account type, key dates

### Sort behavior & indicators
- **Shift+click for quick multi-sort** — click = single sort on that column, Shift+click = add as next sort level
- **Sort dialog for explicit control** — separate panel/popover to build multi-sort rules, reorder priority, remove sorts
- **Default sort: partner name ascending** on first load
- **Arrow icon + numbered badge** on sorted column headers — up/down arrow for direction, small circled number (1, 2, 3) for multi-sort priority
- **Sort state persists across data refresh** — user's sort stays when they hit refresh, only data updates

### Visual treatment & polish
- **Subtle row hover highlight** — light tint on mouseover for row tracking
- **Subtle zebra striping** — alternating very light background on even rows for scanning wide tables
- **Sticky header with distinct background** — pinned as user scrolls, slightly darker/tinted background, bold text, clear separator
- **Sticky summary footer** — pinned at bottom with aggregates (sum, avg, count) for key numeric columns. Updates dynamically as data changes.

### Claude's Discretion
- Exact column widths per data type
- Specific columns in each preset (using schema knowledge and domain judgment)
- Summary footer aggregate functions per column type
- Exact color values for zebra striping, hover states, header tint (within dark mode and light mode themes)
- Sort dialog design details
- Virtual scroll implementation approach (TanStack Virtual vs alternatives)

</decisions>

<specifics>
## Specific Ideas

- **Explainable data transformations** (cross-cutting principle): Any data transformation in this software must be explainable with an explicit algorithm. No black-box transformations. If AI is involved (future), track prompts used.
- **Work view vision**: The table is the bottom half of an eventual split-screen work view (graph top, data bottom). Build the table to work standalone now, but design it so it can be composed into a split layout later.
- **Widget / dashboard vision**: Views can eventually be saved as widgets and arranged on dashboards. The column preset + sort state is the seed of a "view" concept.
- Tab bar preset switcher should feel like it belongs — not tacked on. It's a core navigation element.

</specifics>

<deferred>
## Deferred Ideas

- **Split work view** (graph top / table bottom, graph visualizes selected rows) — future phase (likely v2 Visualization)
- **Saved views as widgets, widgets on dashboards** — future phase (v4 Visual Polish & Dashboards per VISION.md)
- **Explainable transformations principle** — applies across all phases, should be added to PROJECT.md as a constraint

</deferred>

---

*Phase: 02-core-table-and-performance*
*Context gathered: 2026-04-10*
