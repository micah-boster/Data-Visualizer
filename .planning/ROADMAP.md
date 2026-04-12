# Roadmap: Bounce Data Visualizer

## Milestones

- ✅ **v1.0 MVP** — Phases 1-9 (shipped 2026-04-12) — [Archive](milestones/v1.0-ROADMAP.md)
- 🔄 **v2.0 Within-Partner Comparison** — Phases 10-14

## Overview

Five phases that add within-partner batch comparison capabilities on top of the v1 table. The order follows data dependencies: computation layer first, then simple visualizations, then charts (introduces Recharts), then conditional formatting (extends existing system), then trending (reuses computation). Snowflake credentials are a separate prerequisite handled outside this roadmap.

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

- [x] **Phase 10: Computation Layer & Charting Foundation** — Install Recharts, update chart colors, build usePartnerStats hook with curve reshape, norms, and KPI aggregation (completed 2026-04-12)
- [ ] **Phase 11: KPI Summary Cards** — Display 4-6 metric cards above the batch table at partner drill-down level
- [x] **Phase 12: Collection Curve Charts** — Multi-line Recharts overlay of batch collection curves at partner level (completed 2026-04-12)
- [x] **Phase 13: Conditional Formatting** — Cell color-coding by deviation from partner historical norms (completed 2026-04-12)
- [x] **Phase 14: Batch-over-Batch Trending** — Trending indicators showing metric direction across recent batches (completed 2026-04-12)

## Phase Details

### Phase 10: Computation Layer & Charting Foundation
**Goal**: The data computation layer and charting infrastructure are in place so all subsequent visualization phases can consume pre-computed data
**Depends on**: v1.0 (complete)
**Requirements**: FOUND-01, FOUND-02, FOUND-03, FOUND-04, FOUND-05, CARRY-01
**Success Criteria** (what must be TRUE):
  1. `usePartnerStats` hook returns KPI aggregates, norms, curve series, and trending data for any partner
  2. Collection curves are reshaped to long format and truncated at batch age
  3. Recovery rate % is the default curve metric (not absolute dollars)
  4. Recharts renders a basic line chart without errors on React 19
  5. Chart CSS variables produce distinguishable colors for 5+ overlaid lines
**Plans:** 2/2 plans complete
Plans:
- [ ] 10-01-PLAN.md — usePartnerStats hook with type definitions, curve reshape, norms, KPIs, and trending computation
- [ ] 10-02-PLAN.md — Install Recharts via shadcn, update chart CSS colors, add ACCOUNT_PUBLIC_ID column

### Phase 11: KPI Summary Cards
**Goal**: When drilled into a partner, users see 4-6 headline metrics at a glance before scanning the batch table
**Depends on**: Phase 10
**Requirements**: KPI-01, KPI-02, KPI-03, KPI-04
**Success Criteria** (what must be TRUE):
  1. 4-6 KPI cards visible above the batch table at partner drill-down level
  2. Cards show total batches, total accounts, weighted penetration rate, collection rates at 6mo/12mo, total collected
  3. Card values match the table footer aggregations (same filtered data source)
  4. Each card has a trend indicator comparing latest batch to rolling average
**Plans:** 1 plan
Plans:
- [ ] 11-01-PLAN.md — KPI card components, abbreviated currency formatter, and integration into partner drill-down view

### Phase 12: Collection Curve Charts
**Goal**: Users can visually compare batch collection trajectories for any partner, seeing at a glance which batches are outperforming or underperforming
**Depends on**: Phase 10
**Requirements**: CURVE-01, CURVE-02, CURVE-03, CURVE-04, CURVE-05, CURVE-06, CURVE-07
**Success Criteria** (what must be TRUE):
  1. Line chart appears at partner drill-down level showing all batches' collection curves overlaid
  2. X-axis is proportionally-spaced months (not categorical), Y-axis is recovery rate %
  3. Young batches' lines end at their actual age — no false zero cliffs
  4. Most recent batch is visually highlighted, older batches muted
  5. Hover shows batch name and value at each point
  6. Chart is lazy-loaded (not in initial page bundle)
**Plans:** 2/2 plans complete
Plans:
- [ ] 12-01-PLAN.md — Data pivot utility, chart state hook, and extended CSS color palette
- [ ] 12-02-PLAN.md — Chart component with tooltip, legend, lazy-loaded integration into partner view

### Phase 13: Conditional Formatting
**Goal**: The batch table highlights values that deviate significantly from the partner's own historical norm, making outliers instantly visible
**Depends on**: Phase 10
**Requirements**: COND-01, COND-02, COND-03, COND-04, COND-05, COND-06, COND-07
**Success Criteria** (what must be TRUE):
  1. Cells at partner drill-down level are tinted green/red based on deviation from partner mean
  2. Color intensity reflects deviation magnitude
  3. Tooltip explains the deviation (value vs partner avg)
  4. Formatting can be toggled off
  5. Existing static threshold formatting at root level is not broken
**Plans**: TBD

### Phase 14: Batch-over-Batch Trending
**Goal**: Users can see at a glance whether key metrics are improving or degrading across a partner's recent batches
**Depends on**: Phase 10
**Requirements**: TREND-01, TREND-02, TREND-03, TREND-04, TREND-05
**Success Criteria** (what must be TRUE):
  1. Trend arrows (up/down/flat) appear next to key metrics in the batch table at partner level
  2. Baseline is rolling partner average (last 4-6 batches, excluding current)
  3. Partners with fewer than 3 batches show "Insufficient history"
  4. Trending algorithm is documented
**Plans**: TBD

## Progress

**Execution Order:**
Phases 10 first (foundation), then 11-14 can proceed. Phases 11, 12, 13 depend on 10 but are independent of each other. Phase 14 depends on 10.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 10. Computation Layer & Charting Foundation | 2/2 | Complete    | 2026-04-12 |
| 11. KPI Summary Cards | 0/1 | Planning complete | - |
| 12. Collection Curve Charts | 2/2 | Complete    | 2026-04-12 |
| 13. Conditional Formatting | 2/2 | Complete    | 2026-04-12 |
| 14. Batch-over-Batch Trending | 2/2 | Complete    | 2026-04-12 |

---
*Last updated: 2026-04-12 after Phase 11 planning*
