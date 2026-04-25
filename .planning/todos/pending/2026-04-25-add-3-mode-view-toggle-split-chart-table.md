---
created: 2026-04-25T01:24:18.061Z
title: Add 3-mode view toggle: split, chart, table
area: ui
files:
  - src/components/data-display.tsx:944-1004
  - src/components/charts/collection-curve-chart.tsx:277
  - src/components/cross-partner/trajectory-chart.tsx:152
  - src/hooks/use-data.ts (charts-expanded localStorage)
---

## Problem

Phase 38's CHT-04 work converged on a content-sized chart with the table
claiming remaining space via `flex-1`. That gives one fixed split. But
the right split depends on the user's task:

- **Reading curves** (debugging a partner's collection trajectory) wants
  a big chart and a small table.
- **Scanning rows** (finding the worst-performing batch in a list of
  500) wants a big table and the chart out of the way.
- **Comparing both** (identifying outliers, the default workflow) wants
  the current split.

A single static layout can't serve all three well. Phase 38 currently
exposes only a 2-state toggle (`chartsExpanded`: true/false → chart
visible vs collapsed-to-sparkline), persisted in localStorage as
`charts-expanded`.

## Solution

Generalize `chartsExpanded` (boolean) to `viewMode` (3-state enum):

```ts
type ViewMode = 'split' | 'chart' | 'table';
```

- **`split`** (default): KPI strip + chart at clamp-capped height
  (current behavior) + table claims `flex-1` of remaining space.
- **`chart`**: KPI strip + chart fills `flex-1`; table collapses to its
  thead + tfoot only (or is hidden entirely behind a "show table"
  affordance).
- **`table`**: chart collapses to a sparkline-style row (or hides
  entirely behind "show chart"); table claims everything.

Persistence: rename `charts-expanded` → `view-mode` localStorage key.
Migrate existing values (true → split, false → table) on read.

UI: small segmented control in the chart panel toolbar (similar to the
existing `$ Weighted` / `Equal Weight` cluster). Three icon buttons:
split-pane, maximize-chart, maximize-table. Or keyboard shortcut: `1` /
`2` / `3` while the chart-or-table region has focus.

Out of scope until reviewed:
- Resizable drag handle between chart and table (more complex, may
  conflict with column-resize drag handlers).
- Per-drill-level mode persistence (might want chart-mode at partner
  drill but table-mode at root — TBD).

This obsoletes the current `chartsExpanded` toggle and the freshly-
landed clamp-capped chart heights in CollectionCurveChart and
CrossPartnerTrajectoryChart, which both become the `split` mode's
chart-height policy. The `chart` and `table` modes need their own
height policies (e.g., chart in `chart` mode = `flex-1` not clamp).
