---
phase: 36-chart-builder
plan: 05
subsystem: charts
tags: [recharts, chart-builder, presets, axis-eligibility, type-tokens, tooltips]

requires:
  - phase: 36-chart-builder/01
    provides: ChartDefinition discriminated union + axis-eligibility helpers
  - phase: 36-chart-builder/02
    provides: chart-presets slice + useChartPresets hook + BUILTIN_PRESETS
  - phase: 36-chart-builder/03
    provides: GenericChart renderer + StaleColumnWarning + resolveColumnWithFallback
  - phase: 36-chart-builder/04
    provides: AxisPicker, ChartBuilderToolbar, PresetMenu, SavePresetPopover, switchChartType
provides:
  - ChartPanel dispatcher routing between preset and generic branches
  - Unified 4-icon chart-type segmented control (curves/line/scatter/bar) visible on both branches
  - Curated axis dropdowns (17-entry headline-metrics allowlist; 2-entry line-X allowlist)
  - Series/Label picker across all three generic variants with per-chart semantics
  - Multi-series pivot + sidebar legend for line/bar; grouped scatter with hover-only labeling
  - Drill-through row filtering (partnerRows / batchRows) in data-display.tsx
  - Type-aware axis labels, ticks, and tooltips (currency/percentage/count/number)
  - ScatterTooltip with series-aware three-row layout
  - Single-series bars with per-bar color cycling + value labels on top
  - Per-view chart state persistence (CHRT-13) end-to-end
affects: [v4.1, v4.5, v5.0-*, future chart types like heatmap/funnel]

tech-stack:
  added: []
  patterns:
    - "Dispatcher wrapper: ChartPanel owns branch routing, delegates rendering to specialized components"
    - "Shared segmented control composed across branches (preset + generic)"
    - "Explicit axis-curation allowlist as UX polish layer over the registry"
    - "Per-chart semantic overloading of a single schema field (series: split vs. color/label)"
    - "Custom tooltip components for chart types whose payload shape doesn't fit shadcn's single-formatter iteration (scatter)"

key-files:
  created:
    - src/components/charts/chart-panel.tsx
    - src/components/charts/chart-type-segmented-control.tsx
    - src/components/charts/generic-chart-legend.tsx
    - src/components/charts/scatter-tooltip.tsx
  modified:
    - src/components/charts/axis-picker.tsx
    - src/components/charts/chart-builder-toolbar.tsx
    - src/components/charts/collection-curve-chart.tsx
    - src/components/charts/generic-chart.tsx
    - src/components/charts/numeric-tick.tsx
    - src/components/charts/stale-column-warning.tsx
    - src/components/data-display.tsx
    - src/lib/charts/transitions.ts
    - src/lib/charts/transitions.smoke.ts
    - src/lib/columns/axis-eligibility.ts
    - src/lib/columns/axis-eligibility.smoke.ts
    - src/lib/views/schema.ts

key-decisions:
  - "Unified 4-icon chart-type selector on BOTH branches (not just generic). Rejected original plan's CONTEXT lock (hide toolbar on preset) because users had no reachable entry point to the generic builder — everything had to funnel through the Presets menu."
  - "Axis dropdowns curate through a headline-metrics allowlist, not the raw 61-column registry. Dropping COLLECTION_AFTER_N_MONTH + balance-band slices from chart pickers. Adding a new column to COLUMN_CONFIGS does NOT auto-appear in chart dropdowns — explicit opt-in."
  - "Series field added to scatter variant (originally scoped line+bar only). Scatter's series carries different semantics (per-point color + tooltip label) than line/bar (grouped series), so the toolbar labels the picker 'Label' on scatter and 'Series' on line/bar."
  - "On-chart scatter point labels abandoned after visual overlap confirmed unworkable at realistic point counts. Tooltip is the sole source of truth for per-point identification."
  - "Single-series bar charts use <Cell> to cycle CHART_COLORS per category instead of a single flat fill. Multi-series bars retain series-based coloring (no value labels; they'd overlap)."
  - "ChartPanel passes partnerRows / batchRows (drill-filtered) to GenericChart instead of the global filteredRawData. Fixed a silent bug where chart showed every partner's rows even inside a partner drill-down."
  - "Tooltip numeric values render with .text-body-numeric (tabular-nums, mono, no letter-spacing) instead of .text-label-numeric. The latter's letter-spacing created an apparent 'double space' between value and name."
  - "Scatter uses a custom ScatterTooltip component (not shadcn's ChartTooltipContent). Recharts' ScatterChart emits a 2-item payload per point which breaks shadcn's single-formatter iteration model (Y formatter applied to X value, NaN in label header)."

patterns-established:
  - "Pattern: pivotForSeries() pure helper transforms row-level data into wide-format buckets keyed on X with one key per distinct series value. Used by line + bar; scatter keeps its own scatterGroups construction that preserves per-group row arrays for Recharts' per-Scatter data binding."
  - "Pattern: rechartsAxisType(col) → 'category' | 'number' discriminator derived from ColumnConfig.type (not hardcoded per variant). Allows a future ordinal type to pass through without modifying every variant."
  - "Pattern: axisFormatter(col) vs tooltipFormatter(col) split — axes use compact abbreviations (formatAbbreviatedCurrency, percentage with 0 decimals) while tooltips use full precision (formatCurrency, percentage with 1 decimal)."

requirements-completed:
  - CHRT-03
  - CHRT-04
  - CHRT-05
  - CHRT-06
  - CHRT-09
  - CHRT-11
  - CHRT-13

duration: ~4h (Task 1+2: ~15 min, Task 3 checkpoint + refinement iteration: ~3.5h)
completed: 2026-04-23
---

# Phase 36 Plan 05: ChartPanel Integration Summary

**Generic chart builder shipped end-to-end: users can toggle between Collection Curves and line/scatter/bar from any drill-down, with curated axis pickers, multi-series grouping, type-aware formatting, and per-view persistence.**

## Performance

- **Duration:** ~4h total (2026-04-22 afternoon through 2026-04-23 afternoon, with an overnight pause between checkpoint and UX iteration)
- **Tasks:** 3 code tasks + 1 substantial post-checkpoint refinement pass
- **Files modified:** 16 (3 new, 13 edits)
- **Final commit (refinement pass):** `c8f6c90`
- **Prior commits:**
  - `1e10456` — Task 1: CollectionCurveChart presetMenu + ChartPanel dispatcher
  - `03086ff` — Task 2: Wire ChartPanel into data-display.tsx (partner + batch render sites)

## Accomplishments

### Shipped per plan

- `ChartPanel` dispatcher routes between `CollectionCurveChart` (preset branch) and `GenericChart` + `ChartBuilderToolbar` (generic branch) based on `definition.type === 'collection-curve'`.
- `CollectionCurveChart` extended with `presetMenu` + `chartTypeSelector` ReactNode props so the preset branch exposes the shared controls alongside its own metric-toggle cluster.
- Both chart render sites in `data-display.tsx` (`partnerStats.curves` branch + `batchCurve` branch) now go through `<ChartPanel …>`.
- Per-view persistence: `chartDefinition` state saves/loads through the existing view snapshot mechanism (CHRT-13 verified by save/reload cycle).

### Expanded scope during human-verify iteration

The plan's human-verify checkpoint uncovered meaningful UX gaps that weren't visible until the integration ran against real drill-down data. The following landed beyond the original plan scope but were judged too tightly coupled to split into a gap-closure phase:

- **Unified chart-type selector.** Original plan hid `ChartBuilderToolbar` on the preset branch (CONTEXT lock). In practice this meant users had no reachable UI path from Collection Curves to the generic builder — the only entry was via React DevTools. The new `ChartTypeSegmentedControl` is rendered on both branches.
- **Axis curation.** The raw 61-column registry produced unreadable dropdowns (20 `COLLECTION_AFTER_N_MONTH` + 16 balance-band columns). Added `CHART_HEADLINE_METRICS` (17 entries) + `CHART_LINE_X_OPTIONS` (2 entries) allowlists in `axis-eligibility.ts`.
- **Series / Label picker.** Added to all three generic variants (schema extended for scatter too). Line + bar pivot into grouped series; scatter colors + labels each point. `seedGenericFromPreset` auto-seeds `series: { column: 'BATCH' }` on preset→generic transitions.
- **Drill-through row filtering.** `data-display.tsx` was passing `filteredRawData` (all partners) to `ChartPanel`. Fixed with `partnerRows` / `batchRows` memos. Real bug that would have shipped silently otherwise.
- **Type-aware formatting across axes + tooltips.** Derived per-column formatters from `ColumnConfig.type`; axes use compact forms, tooltips use full precision. Axis labels rendered via Recharts' native `label` prop.
- **Custom `ScatterTooltip`.** Recharts' scatter payload shape (2 items per point, one per axis) is incompatible with shadcn's `ChartTooltipContent` single-formatter iteration. Custom component reads the row directly and renders one typed line per axis + optional series line.
- **Bar chart polish.** Per-bar color cycling via `<Cell>` for single-series (12 batches → 12 colors vs. one flat fill); value labels on top with `<LabelList>` formatted per column type. Multi-series bars keep series colors; labels gated off to avoid overlap.
- **Sidebar legend.** Recharts' default `<Legend>` wrapped catastrophically at 200+ batches (Affirm drill-down). New `GenericChartLegend` fixed-width scrollable sidebar with color swatch + truncated label per series.

### Requirements closed

- **CHRT-03** — Line chart variant renders via Recharts with per-series grouping when `series` set.
- **CHRT-04** — Scatter plot renders with numeric X + Y and optional series-based coloring.
- **CHRT-05** — Bar chart renders with categorical X and per-bar color cycling.
- **CHRT-06** — Visual parity preserved: Collection Curves output identical to pre-Phase-36 (metric toggle, solo-on-click, average line, batch visibility pills).
- **CHRT-09** — Chart-type switch toolbar always visible; one-click swap between all four variants.
- **CHRT-11** — One-click preset load including back-to-preset from any generic chart.
- **CHRT-13** — Per-view persistence: saved views capture and restore `chartState` for both preset and generic variants.

## Deviations from plan

1. **Scope expansion during checkpoint iteration** (documented above). Decision tree: ship inline as part of 36-05 vs. spawn a gap-closure phase. Chose inline because changes were tightly interleaved (unified selector dictates CollectionCurveChart prop shape; axis curation dictates picker contracts; series field dictates schema + transitions + toolbar + renderer). A gap-closure phase would have meant shipping 36-05 with a broken UX for a day.
2. **Original plan's "no visible builder UI when Collection Curves is active" (CONTEXT lock)** — reversed. Users testing the live app made it clear the lock produced a dead-end UX. The new rule: chart-type selector is always visible; specialized controls (metric toggle, batch pills) remain CollectionCurveChart's responsibility on the preset branch.
3. **Scatter on-chart point labels** — started as "labels below each point when count ≤ 30," removed after user feedback that even at 12 points the labels overlapped. Hover-only via tooltip is the final behavior.

## Verification

All five DS guards green on the final commit:
- `check:tokens` — no ad-hoc type utilities outside allowlist
- `check:surfaces` — no raw shadow + card-frame combos
- `check:components` — no legacy imports, no ad-hoc toolbar dividers
- `check:motion` — no raw durations/easings
- `check:polish` — no raw border colors, focus-ring regressions, scrollbar leaks

All five phase-36 smoke tests pass (total: 64 assertions):
- `smoke:migrate-chart` — 11 assertions
- `smoke:axis-eligibility` — updated for curation (headline metrics: 17, line X: 2)
- `smoke:chart-presets` — 9 assertions
- `smoke:charts` — 13 assertions (resolveColumnWithFallback)
- `smoke:transitions` — 16 assertions (updated for new series carryover)

`npx tsc --noEmit` clean on all new/touched files. One pre-existing Phase-33 error in `tests/a11y/baseline-capture.spec.ts` (axe-core import) remains out of scope; logged in `.planning/phases/36-chart-builder/deferred-items.md`.

## What's next

Phase 36 complete unlocks Phase 37 (Metabase SQL Import) on the milestone v4.0 roadmap — which has already shipped most of its plans during Phase 36's iteration. See v4.0 progress in ROADMAP.md for remaining work.

Forward implications:
- Future chart types (heatmap, funnel, geo) can plug into the same dispatcher + toolbar + presets machinery with minimal scaffolding: extend `ChartDefinition` discriminated union, add variant render in `GenericChart`, drop an icon into `ChartTypeSegmentedControl`.
- The headline-metrics allowlist may need a per-subsystem variant when Cross-Partner Comparison (v3) surfaces introduce metrics that don't belong in the daily-driver chart pickers.
- `pivotForSeries` is a candidate for extraction into `@/lib/charts/` when a second consumer appears.
