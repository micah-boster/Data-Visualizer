# Roadmap: Bounce Data Visualizer

## Milestones

- ✅ **v1.0 MVP** — Phases 1-9 (shipped 2026-04-12) — [Archive](milestones/v1.0-ROADMAP.md)
- ✅ **v2.0 Within-Partner Comparison** — Phases 10-14 (shipped 2026-04-12) — [Archive](milestones/v2.0-ROADMAP.md)
- ✅ **v3.0 Intelligence & Cross-Partner Comparison** — Phases 15-20 (shipped 2026-04-14) — [Archive](milestones/v3.0-ROADMAP.md)
- ✅ **v3.1 Stabilization & Code Quality** — Phases 21-24 (shipped 2026-04-14) — [Archive](milestones/v3.1-ROADMAP.md)
- 🚧 **v3.5 Flexible Charts & Metabase Import** — Phases 25-29 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-9) — SHIPPED 2026-04-12</summary>

- [x] Phase 1: Setup and Snowflake Infrastructure (2/2 plans)
- [x] Phase 2: Core Table and Performance (2/2 plans)
- [x] Phase 3: Data Formatting (2/2 plans)
- [x] Phase 4: Dimension Filtering (2/2 plans)
- [x] Phase 5: Column Management (3/3 plans)
- [x] Phase 6: Saved Views (3/3 plans)
- [x] Phase 7: Export (1/1 plan)
- [x] Phase 8: Navigation and Drill-Down (2/2 plans)
- [x] Phase 9: Vercel Deployment and Launch (1/1 plan)

</details>

<details>
<summary>✅ v2.0 Within-Partner Comparison (Phases 10-14) — SHIPPED 2026-04-12</summary>

- [x] Phase 10: Computation Layer & Charting Foundation (2/2 plans)
- [x] Phase 11: KPI Summary Cards (1/1 plan)
- [x] Phase 12: Collection Curve Charts (2/2 plans)
- [x] Phase 13: Conditional Formatting (2/2 plans)
- [x] Phase 14: Batch-over-Batch Trending (2/2 plans)

</details>

<details>
<summary>✅ v3.0 Intelligence & Cross-Partner Comparison (Phases 15-20) — SHIPPED 2026-04-14</summary>

- [x] Phase 15: Anomaly Detection Engine (2/2 plans) — completed 2026-04-12
- [x] Phase 16: Anomaly Detection UI (2/2 plans) — completed 2026-04-12
- [x] Phase 17: Claude Query Infrastructure (1/1 plan) — completed 2026-04-13
- [x] Phase 18: Claude Query UI (1/1 plan) — completed 2026-04-13
- [x] Phase 19: Cross-Partner Computation (1/1 plan) — completed 2026-04-13
- [x] Phase 20: Cross-Partner UI (2/2 plans) — completed 2026-04-14

</details>

<details>
<summary>✅ v3.1 Stabilization & Code Quality (Phases 21-24) — SHIPPED 2026-04-14</summary>

- [x] Phase 21: Critical Bug Fixes (1/1 plan) — completed 2026-04-14
- [x] Phase 22: UI Polish & Data Reliability (2/2 plans) — completed 2026-04-14
- [x] Phase 23: Verification & Housekeeping (2/2 plans) — completed 2026-04-14
- [x] Phase 24: Code Review & Refactoring (3/3 plans) — completed 2026-04-14

</details>

### 🚧 v3.5 Flexible Charts & Metabase Import (In Progress)

**Milestone Goal:** Add partner lists as a filtering primitive, replace the hardcoded collection curve chart with a unified chart system where users pick axes and chart type, and add Metabase SQL import to lower migration friction from existing dashboards.

- [ ] **Phase 25: Partner Lists** — Named partner groupings that filter the table and charts
- [ ] **Phase 26: Chart Schema & Migration** — ChartDefinition type system and backward-compatible view migration
- [ ] **Phase 27: Generic Chart Renderer** — Unified rendering of line, scatter, bar charts with collection curves as a preset
- [ ] **Phase 28: Chart Builder UI & View Integration** — User-facing axis/type pickers, preset management, and view persistence
- [ ] **Phase 29: Metabase SQL Import** — Parse pasted SQL, map to app configuration, preview and apply as saved view

## Phase Details

### Phase 25: Partner Lists
**Goal**: Users can create, manage, and apply named partner groupings to focus the table and charts on specific subsets of partners
**Depends on**: Phase 24 (v3.1 complete)
**Requirements**: LIST-01, LIST-02, LIST-03, LIST-04, LIST-05
**Success Criteria** (what must be TRUE):
  1. User can create a partner list by manually selecting partners from the full partner set and giving it a name
  2. User can create a partner list by filtering on partner attributes (product type, revenue band, account type) and the matching partners are captured
  3. User can load a saved partner list and the table and charts immediately filter to show only those partners
  4. Partner lists survive page reloads (persisted in localStorage alongside saved views)
  5. User can rename or delete an existing partner list from the sidebar
**Plans**: TBD

Plans:
- [ ] 25-01: TBD
- [ ] 25-02: TBD

### Phase 26: Chart Schema & Migration
**Goal**: Existing saved views survive the transition to a flexible chart type system without data loss
**Depends on**: Phase 25
**Requirements**: CHRT-01, CHRT-02
**Success Criteria** (what must be TRUE):
  1. All existing saved views (3 defaults + any user-created) load without errors after the schema change
  2. ChartDefinition type accepts line, scatter, and bar configurations with validated axis and type fields
  3. Old ChartViewState objects in localStorage are automatically migrated to ChartDefinition on first load
**Plans**: TBD

Plans:
- [ ] 26-01: TBD

### Phase 27: Generic Chart Renderer
**Goal**: Users can see line, scatter, and bar charts rendered from any numeric columns, and collection curves look identical to before
**Depends on**: Phase 26
**Requirements**: CHRT-03, CHRT-04, CHRT-05, CHRT-06
**Success Criteria** (what must be TRUE):
  1. A line chart renders with any numeric column on Y and a time/numeric column on X, with correct axis formatting
  2. A scatter plot renders with any two numeric columns as X and Y axes
  3. A bar chart renders comparing a metric across batches or partners
  4. Collection curves preset produces visually identical output to the current CollectionCurveChart (anomaly colors, solo mode, batch visibility toggles, average line all preserved)
**Plans**: TBD

Plans:
- [ ] 27-01: TBD
- [ ] 27-02: TBD

### Phase 28: Chart Builder UI & View Integration
**Goal**: Users can configure their own charts through dropdowns, save configurations as presets, and have chart state persist with saved views
**Depends on**: Phase 27
**Requirements**: CHRT-07, CHRT-08, CHRT-09, CHRT-10, CHRT-11, CHRT-12, CHRT-13
**Success Criteria** (what must be TRUE):
  1. User can select X-axis and Y-axis columns from filtered dropdowns (numeric/date for X, numeric-only for Y) and see the chart update
  2. User can switch between line, scatter, and bar chart types and the chart re-renders immediately
  3. User can save a custom chart configuration as a named preset and reload it with one click
  4. Collection curves are available as a built-in preset that restores full collection curve behavior
  5. Chart configuration round-trips through the saved views system (save view, reload page, chart config restored)
**Plans**: TBD

Plans:
- [ ] 28-01: TBD
- [ ] 28-02: TBD

### Phase 29: Metabase SQL Import
**Goal**: Users can paste a Metabase SQL query and have it translated into an app view configuration, lowering migration friction from existing Metabase dashboards
**Depends on**: Phase 26 (uses ChartDefinition type; independent of Phases 27-28 chart rendering)
**Requirements**: META-01, META-02, META-03, META-04, META-05
**Success Criteria** (what must be TRUE):
  1. User can paste Metabase-exported SQL into an import dialog accessible from the sidebar
  2. User can see a preview of matched columns (recognized), skipped columns (unrecognized), extracted filters and sort order before applying
  3. Clicking "Apply" creates a ViewSnapshot with correct table columns, filters, and chart config derived from the SQL
  4. Imported configuration only references columns in the existing allow-list (no arbitrary SQL execution, no injection)
**Plans**: TBD

Plans:
- [ ] 29-01: TBD
- [ ] 29-02: TBD

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1-9 | v1.0 | 18/18 | Complete | 2026-04-12 |
| 10-14 | v2.0 | 9/9 | Complete | 2026-04-12 |
| 15-20 | v3.0 | 9/9 | Complete | 2026-04-14 |
| 21-24 | v3.1 | 8/8 | Complete | 2026-04-14 |
| 25. Partner Lists | v3.5 | 0/TBD | Not started | - |
| 26. Chart Schema & Migration | v3.5 | 0/TBD | Not started | - |
| 27. Generic Chart Renderer | v3.5 | 0/TBD | Not started | - |
| 28. Chart Builder UI & View Integration | v3.5 | 0/TBD | Not started | - |
| 29. Metabase SQL Import | v3.5 | 0/TBD | Not started | - |

---
*Last updated: 2026-04-15 after v3.5 roadmap revision*
