# Roadmap: Bounce Data Visualizer

## Overview

Nine phases that build the tool from a validated Snowflake connection to a fully deployed, interactive batch performance explorer. The order is non-negotiable: data before UI, table before filtering, filtering before saved views, and saved views before navigation — each phase depends on the one before it being stable. Deployment infrastructure goes first (phase 1) so the integration risk with Snowflake credentials is resolved before any UI work begins. Navigation goes last because it depends on additional Snowflake tables that may not be ready at MVP time.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Setup and Snowflake Infrastructure** - Scaffold the Next.js app, prove Snowflake connectivity, and validate data quality before any UI is built
- [ ] **Phase 2: Core Table and Performance** - Ship a working interactive table that handles the full 533-row dataset without lag
- [ ] **Phase 3: Data Formatting** - Format raw Snowflake numbers into human-readable currency, percentages, and comma-separated values
- [ ] **Phase 4: Dimension Filtering** - Add partner, account type, and batch filter controls that compose with AND logic
- [ ] **Phase 5: Column Management** - Enable users to show/hide columns, drag-reorder them, and filter by value/range within columns
- [ ] **Phase 6: Saved Views** - Let users save, load, and delete named table configurations that persist across browser sessions
- [ ] **Phase 7: Export** - Let users download the current filtered and formatted table view as CSV
- [ ] **Phase 8: Navigation and Drill-Down** - Enable partner-to-batch drill-down with breadcrumb trail and back navigation
- [ ] **Phase 9: Vercel Deployment and Launch** - Deploy the completed app to Vercel and hand off to the partnerships team

## Phase Details

### Phase 1: Setup and Snowflake Infrastructure
**Goal**: The Next.js app is scaffolded, Snowflake connectivity is proven with real data, and the data layer is validated before any UI work begins
**Depends on**: Nothing (first phase)
**Requirements**: DATA-01, DATA-02, DATA-03, DEPL-02
**Success Criteria** (what must be TRUE):
  1. The app runs locally and a `/api/query` route handler returns real rows from `agg_batch_performance_summary`
  2. Snowflake credentials are stored in environment variables and never appear in client-side code or network responses
  3. A loading state is visible while a Snowflake query executes, and a friendly error message appears if the query fails
  4. The user can trigger a data refresh from the UI without reloading the page and see updated data
  5. Row counts, column names, and sample values from the Snowflake response match expected schema (validated manually)
**Plans:** 2 plans
Plans:
- [ ] 01-01-PLAN.md — Scaffold Next.js project with shadcn/ui, dark mode, sidebar layout, and providers
- [ ] 01-02-PLAN.md — Snowflake data layer, API route, client data display with loading/error/refresh states

### Phase 2: Core Table and Performance
**Goal**: Users can view batch performance data in a sortable, interactive table that handles the full dataset without lag
**Depends on**: Phase 1
**Requirements**: TABL-01, TABL-02, TABL-06
**Success Criteria** (what must be TRUE):
  1. User can see batch performance rows rendered in a table on first page load
  2. User can click any column header to sort ascending, then click again to sort descending
  3. User can sort by multiple columns simultaneously (e.g., partner then batch date)
  4. The table scrolls and sorts without visible lag on the full 533-row dataset
**Plans:** 2 plans
Plans:
- [ ] 02-01-PLAN.md — Expand column config to all 61 columns, define presets, create ColumnDef builder, update API to fetch all columns
- [ ] 02-02-PLAN.md — Build full interactive table with virtualization, sorting, column pinning, presets, sticky header/footer

### Phase 3: Data Formatting
**Goal**: Every numeric value in the table displays in a human-readable format appropriate to its data type
**Depends on**: Phase 2
**Requirements**: FMT-01, FMT-02, FMT-03, FMT-04
**Success Criteria** (what must be TRUE):
  1. Dollar amounts display as "$1,234.56" — with dollar sign, commas, and two decimal places
  2. Percentage values display as "12.3%" — with percent symbol and appropriate decimal places
  3. Large non-currency numbers display with comma separators (e.g., "1,234,567")
  4. All numeric columns are right-aligned in the table
**Plans**: TBD

### Phase 4: Dimension Filtering
**Goal**: Users can narrow the table to specific partners, account types, and batches using composable filter controls
**Depends on**: Phase 3
**Requirements**: FILT-01, FILT-02, FILT-03, FILT-04, FILT-05
**Success Criteria** (what must be TRUE):
  1. User can select a partner from a dropdown and the table immediately updates to show only that partner's rows
  2. User can select an account type from a dropdown to further narrow results
  3. User can search for and select a specific batch from a dropdown or search input
  4. When multiple filters are active, only rows matching ALL selected filters are shown
  5. Each active filter is displayed as a visible chip or tag that can be individually removed with a single click
**Plans**: TBD

### Phase 5: Column Management
**Goal**: Users can control which of the 61 columns are visible, reorder them by dragging, and filter within column values
**Depends on**: Phase 4
**Requirements**: TABL-03, TABL-04, TABL-05
**Success Criteria** (what must be TRUE):
  1. User can open a column picker and toggle individual columns on or off, with the table updating immediately
  2. User can drag a column header to a new position and the column order persists while using the table
  3. User can filter a text column by typing a search string and only matching rows appear
  4. User can filter a numeric column by entering a min/max range
**Plans**: TBD

### Phase 6: Saved Views
**Goal**: Users can save their current table configuration as a named view and reload it in a future session
**Depends on**: Phase 5
**Requirements**: VIEW-01, VIEW-02, VIEW-03, VIEW-04
**Success Criteria** (what must be TRUE):
  1. User can type a name and save the current combination of filters, visible columns, column order, and sort state as a named view
  2. User can see a list of previously saved views and click one to restore the full table configuration
  3. User can delete a saved view from the list and it no longer appears
  4. Saved views are still available after closing and reopening the browser (persisted across sessions)
**Plans**: TBD

### Phase 7: Export
**Goal**: Users can download the current filtered and formatted table view as a CSV file
**Depends on**: Phase 6
**Requirements**: EXPO-01, EXPO-02
**Success Criteria** (what must be TRUE):
  1. User can click an export button and receive a CSV file download in the browser
  2. The downloaded CSV contains only the rows visible after active filters are applied
  3. The downloaded CSV contains only the columns currently visible in the table (hidden columns are excluded)
**Plans**: TBD

### Phase 8: Navigation and Drill-Down
**Goal**: Users can click into a partner to see their batches, click into a batch to see account-level detail, and navigate back up the hierarchy
**Depends on**: Phase 7
**Requirements**: NAV-01, NAV-02, NAV-03, NAV-04
**Success Criteria** (what must be TRUE):
  1. User can click a partner name in the table and see a view filtered to only that partner's batches
  2. User can click a batch identifier and see account-level detail (when additional Snowflake tables are available)
  3. A breadcrumb trail shows the current drill path (e.g., "All > Partner: Acme > Batch: 2024-Q1")
  4. User can click any breadcrumb segment to navigate back up to that level of the hierarchy
**Plans**: TBD

### Phase 9: Vercel Deployment and Launch
**Goal**: The completed app is deployed to Vercel, accessible via URL to all partnerships team members, with Snowflake credentials secured in environment variables
**Depends on**: Phase 8
**Requirements**: DEPL-01
**Success Criteria** (what must be TRUE):
  1. The app is accessible via a public Vercel URL without requiring local setup
  2. All partnerships team members can load the app and interact with live Snowflake data from their browsers
  3. Snowflake credentials are confirmed to exist only in Vercel environment variables, not in any deployed code or client bundle
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8 -> 9

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Setup and Snowflake Infrastructure | 0/2 | Planning complete | - |
| 2. Core Table and Performance | 0/2 | Planning complete | - |
| 3. Data Formatting | 0/TBD | Not started | - |
| 4. Dimension Filtering | 0/TBD | Not started | - |
| 5. Column Management | 0/TBD | Not started | - |
| 6. Saved Views | 0/TBD | Not started | - |
| 7. Export | 0/TBD | Not started | - |
| 8. Navigation and Drill-Down | 0/TBD | Not started | - |
| 9. Vercel Deployment and Launch | 0/TBD | Not started | - |
