# Phase 1: Setup and Snowflake Infrastructure - Context

**Gathered:** 2026-04-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Prove Snowflake connectivity works and validate data quality before building any UI. Deliver: Next.js project scaffolding, Snowflake API route handler, credential management, loading/error/empty states, data refresh, and schema validation. No table component — that's Phase 2.

</domain>

<decisions>
## Implementation Decisions

### API shape & data loading
- Full dataset load (~533 rows) — fetch all rows at once, filter/sort client-side
- Pagination deferred to later version when data volume grows
- Session-scoped caching — cache query results for the session, no manual refresh needed between interactions
- Curated default columns (~20 most-used) with easy opt-in to all 61. User can change which columns load.
- Static/rarely-changing dimension data (partner names, account types, batch list) cached locally for speed
- Single `/api/data` endpoint that accepts query parameters (columns, filters), but server-side code structured as modular query builders for future extensibility
- Internals ready to split into dedicated endpoints when more tables arrive in v3

### Error & loading UX
- Loading: centered spinner with descriptive message ("Loading data from Snowflake...")
- Errors: inline error message in the main content area with a retry button. No toast notifications.
- Data freshness: always-visible timestamp ("Data as of 2:30 PM") plus a visual indicator/warning when data is stale
- Empty state: clear message "No data matches your filters" with suggestion to adjust filters

### Project scaffolding
- Component library: shadcn/ui + Tailwind CSS — full source ownership for visual customization
- Visual style: clean and readable with creative presentation and subtle details throughout. Not generic enterprise — should feel distinctive.
- Page layout: sidebar (for future navigation/drill-down) + main content area from day one
- Dark mode: supported from day one. Set up theme toggle and ensure all components work in both modes.
- TanStack Table for data grid (Phase 2), but scaffolding includes the shell/layout

### Data validation
- Hardcoded column config for known columns (type mapping: currency, percentage, count, text, etc.)
- Auto-detect fallback for untyped/new columns (default to text or number based on Snowflake metadata)
- Null values display as dash (—) in all contexts
- Schema validation on startup: verify Snowflake schema matches expected column list, show warning on mismatch (missing/renamed columns)
- Data quality is generally reliable — no need for aggressive sanitization

### Claude's Discretion
- Exact spinner design and animation
- Stale data threshold timing
- Modular query builder internal architecture
- Tailwind theme token structure
- Dark mode toggle placement and mechanism

</decisions>

<specifics>
## Specific Ideas

- The final product should be "really, really strong visually" — invest in design foundations now even though Phase 1 is infrastructure
- shadcn/ui chosen specifically because it allows full visual customization vs fighting an opinionated library
- Sidebar included from day one to avoid layout refactoring when drill-down arrives in Phase 8
- Column config should be easy to extend — when new tables arrive in v3, adding column definitions should be straightforward

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-setup-and-snowflake-infrastructure*
*Context gathered: 2026-04-10*
