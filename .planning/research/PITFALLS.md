# Domain Pitfalls

**Domain:** Adding visualization, conditional formatting, and comparison features to an existing data table application
**Project:** Bounce Data Visualizer v2.0 — Within-Partner Comparison
**Researched:** 2026-04-11
**Context:** Existing deployed app with 477 batch rows, 61 columns, TanStack Table with virtual scrolling, drill-down navigation, and static/dynamic Snowflake data.

---

## Critical Pitfalls

Mistakes that cause rewrites, broken data interpretation, or major performance regressions.

### Pitfall 1: Collection Curve Truncation Creates False Performance Narratives

**What goes wrong:** Batches at different ages have different numbers of valid collection curve data points. A 3-month-old batch only has COLLECTION_AFTER_1_MONTH through COLLECTION_AFTER_3_MONTH -- everything beyond that is null or zero. If the chart treats null/zero as "collected $0 at month 6," it creates a false cliff that makes young batches look like failures compared to mature batches.

**Why it happens:** The data has 20 collection curve columns (M1 through M60) but BATCH_AGE_IN_MONTHS determines how many are populated. The natural instinct is to plot all 20 points for every batch -- nulls silently become zeros in most charting libraries (Recharts renders null as 0 by default unless explicitly handled).

**Consequences:** The partnerships team draws wrong conclusions about batch quality. A new batch that is actually outperforming its cohort at the same age looks terrible because its line drops to zero at month 4 while older batches continue climbing. This directly undermines the v2.0 value proposition: surfacing abnormal performance accurately.

**Prevention:**
- Truncate each batch's curve series at its BATCH_AGE_IN_MONTHS value. Only plot data points where month <= batch age.
- Use explicit null handling in the charting library (Recharts accepts `connectNulls={false}` to end lines at null values).
- Add a visual indicator (dot or marker at the terminus) showing "data ends here, batch is X months old."
- Build a `truncateCurveAtAge(row)` utility tested with unit tests for batches at ages 1, 6, 12, 24, and 60 months.

**Detection:** If any collection curve line touches zero on the Y-axis after previously being positive, that is almost certainly a truncation bug rather than real data.

**Phase relevance:** Collection Curve Charts -- this must be correct before any overlay comparison works.

---

### Pitfall 2: Absolute Dollar Comparison Without Normalization

**What goes wrong:** Overlaying collection curves from batches with different TOTAL_AMOUNT_PLACED values makes comparison meaningless. A batch with $10M placed that collected $500K at M3 looks like it is destroying a $1M batch that collected $200K -- but the smaller batch actually has a 20% recovery rate vs 5%.

**Why it happens:** The raw COLLECTION_AFTER_X_MONTH columns are absolute dollar amounts (type: 'currency' in COLUMN_CONFIGS). Plotting raw values is the path of least resistance. Engineers see currency columns and chart currency values.

**Consequences:** Every visual comparison becomes misleading. The team focuses on high-dollar batches that may actually be underperforming relative to their size. The tool adds visual confidence to wrong conclusions -- worse than no chart at all.

**Prevention:**
- Default the collection curve chart to show recovery rate (COLLECTION_AFTER_X / TOTAL_AMOUNT_PLACED * 100) rather than absolute dollars.
- Provide a toggle for absolute vs. percentage view, but percentage must be the default.
- Pre-compute the percentage series during data transformation (in a useMemo), not inside the chart render loop.
- Handle division by zero: if TOTAL_AMOUNT_PLACED is 0 or null, show "N/A" instead of Infinity% or 0%.

**Detection:** If collection curves from the same partner fan out dramatically based on batch size rather than clustering by performance quality, the normalization is missing.

**Phase relevance:** Collection Curve Charts -- must be baked into the data transformation layer before chart rendering.

---

### Pitfall 3: Conditional Formatting That Re-renders the Entire Table

**What goes wrong:** The existing FormattedCell component (src/components/table/formatted-cell.tsx) runs threshold checks per-cell using static COLUMN_THRESHOLDS. Adding partner-relative conditional formatting (deviation from partner historical norms) requires computing the partner average first, then comparing each cell. If this computation happens inside the cell renderer, every cell recalculates on every table interaction (sort, filter, scroll).

**Why it happens:** The current threshold system uses a static O(1) lookup in getThreshold(). Partner-relative thresholds require aggregating across multiple rows to compute the partner mean. The temptation is to compute this inline: "just calculate the partner average in the cell renderer."

**Consequences:** With 477 rows x ~20 visible columns = ~9,500 visible cells, computing partner aggregates inside cell renderers means each sort/filter/scroll triggers thousands of redundant aggregate calculations. TanStack Table issue #4794 documents how unstable cell.getContext() references already cause unnecessary re-renders -- adding expensive computations per cell amplifies this.

**Prevention:**
- Pre-compute partner aggregates in a useMemo that depends only on the raw data, not on table state (sorting, filtering, column visibility).
- Store the computed norms in a lookup: `Map<partnerName, Map<columnKey, { mean, stddev }>>`.
- Pass the lookup to FormattedCell via React context or a stable prop reference.
- Extend the existing ThresholdConfig/ThresholdResult interfaces to support dynamic thresholds alongside existing static ones -- do not create a parallel system.
- Profile with React DevTools before and after: FormattedCell render time should not increase by more than 0.1ms per cell.

**Detection:** Sort a column after adding conditional formatting. If there is a visible delay (>200ms) that did not exist before, aggregation is leaking into the render path.

**Phase relevance:** Conditional Formatting -- the aggregation layer must be built and memoized before touching FormattedCell.

---

### Pitfall 4: Chart Components Inside Table Rows Kill Virtual Scrolling

**What goes wrong:** If sparklines or mini collection curve charts are embedded directly in table cells, each chart creates a heavy React subtree with SVG elements. The virtualizer (TanStack Virtual, currently configured with overscan: 10) creates and destroys these as rows scroll in and out of view, causing visible jank and GC pressure.

**Why it happens:** The natural UX idea is "show a mini collection curve right in the table row." This works in static tables but fights with TanStack Virtual's recycling model. The existing TableBody component already processes each visible cell through flexRender -- adding SVG chart components multiplies the cost per cell by 10-50x.

**Consequences:** Scroll performance degrades from smooth 60fps to stuttering. Each row entering the viewport mounts a new chart component with SVG nodes. With overscan of 10, that is 10 chart instances mounting on every scroll event.

**Prevention:**
- Do NOT embed chart components in table cells. Show collection curves in a detail panel/drawer that opens on row click, outside the virtual scroll container.
- If inline visualization is truly needed, use CSS-only approaches (gradient backgrounds representing values) or pre-rendered static SVG strings, not React chart components.
- The detail panel approach also works better with the existing drill-down UX (click partner -> see batches + chart).

**Detection:** Scroll the table after adding any visualization to cells. If it feels noticeably worse than before, chart-in-cell is the cause.

**Phase relevance:** Collection Curve Charts -- architecture decision that must be made before any chart implementation.

---

### Pitfall 5: KPI Aggregation Disagreeing with Table Totals

**What goes wrong:** KPI summary cards show one number (e.g., "Total Collected: $4.2M") while the table footer (TableFooter component) shows a different number. This happens when KPI cards aggregate over the full dataset while the table footer aggregates over filtered/visible rows, or vice versa.

**Why it happens:** The existing TableFooter aggregates over `table.getRowModel().rows` -- which reflects current filters and sorting. KPI cards that compute from the raw `data` prop or from a separate React Query cache will show unfiltered totals. The mismatch is subtle and erodes trust immediately.

**Consequences:** Users lose confidence in the tool. "Why does the card say $4.2M but the table says $3.8M?" The answer (filters) is correct but not obvious. With only 2-3 users, one bad trust experience can kill adoption.

**Prevention:**
- KPI cards must aggregate from the same row set as the table. Use `table.getFilteredRowModel().rows` for filter-respecting totals.
- If showing both filtered and unfiltered, label explicitly: "Filtered: $3.8M of $4.2M total."
- Show context: "Showing 234 of 477 batches" next to filtered KPIs.
- Never silently mix filtered and unfiltered aggregations in the same view.
- Wire KPI aggregation through a single `useKpiAggregation(rows)` hook that both cards and footer can share.

**Detection:** Apply any filter, then compare KPI card values to table footer values. If they diverge, the aggregation sources differ.

**Phase relevance:** KPI Summary Cards -- must be wired to the correct data source from the start.

---

## Moderate Pitfalls

### Pitfall 6: Charting Library Bundle Size Regression

**What goes wrong:** Adding Recharts adds ~150KB gzipped to the JavaScript bundle. The current app loads fast on Vercel -- this can noticeably increase initial paint time, especially since charts are only needed at the partner drill-down level, not on the root table view.

**Prevention:**
- Lazy-load chart components with Next.js `dynamic()` and `{ ssr: false }` -- charts are only needed at drill-down, not on initial page load.
- Consider lightweight alternatives if Recharts proves too heavy: raw SVG for simple line charts with 20 data points per series is straightforward and zero-dependency.
- Measure bundle size before and after with `next build` output -- set a budget of <50KB added to the initial route.

**Phase relevance:** Collection Curve Charts -- the import strategy is an early architecture decision.

---

### Pitfall 7: Conditional Formatting Color Conflicts with Existing Theme

**What goes wrong:** The app already has conditional styling in FormattedCell: zero values get dimmed text (--cell-zero), negatives get red (text-destructive), outliers get tinted backgrounds (--cell-tint-low, --cell-tint-high). Adding partner-deviation formatting introduces a second layer of color meaning. A cell could simultaneously be "high outlier" by static threshold AND "below partner average" by dynamic threshold -- two conflicting visual signals on the same cell.

**Prevention:**
- Define a clear priority: partner-relative deviation overrides static thresholds when both apply, since deviation from norm is the v2.0 value proposition.
- Use distinct visual channels: keep existing background tints for static outliers, use left-border color for partner-deviation signals.
- Document the visual language and test all combinations: what does a cell look like when it is zero AND below partner norm? Below static threshold AND above partner norm?
- Never stack two background colors.

**Phase relevance:** Conditional Formatting -- design the visual hierarchy before writing CSS.

---

### Pitfall 8: Batch-Over-Batch Trending Computed from Wrong Baseline

**What goes wrong:** "Trending" implies comparison to a baseline, but which one? Common mistakes: comparing to the immediately previous batch (volatile -- one bad batch skews everything), comparing to the global average (meaningless for partners with unique profiles), or comparing to a fixed historical period that no longer represents current portfolio quality.

**Why it happens:** There is no single "right" baseline. Without deliberate design, each developer picks whatever makes sense to them, leading to inconsistent trend calculations across different metrics.

**Prevention:**
- Use rolling partner average (last 4-6 batches for the same partner) as baseline -- not global average and not single-batch comparison.
- Exclude the current batch from its own baseline (avoid self-reference bias).
- Handle partners with fewer than 3 historical batches: show "Insufficient history" rather than computing a misleading trend from 1-2 data points.
- Document the algorithm explicitly per the project constraint: "Every data transformation must have an explicit, documented algorithm."
- Make the baseline window configurable (3/6/12 batches) but default to 6.

**Phase relevance:** Batch-Over-Batch Trending -- the algorithm design phase, before any UI.

---

### Pitfall 9: Drill-Down State Lost When Charts Mount

**What goes wrong:** The existing drill-down uses React state (known tech debt -- not URL params). The DataTable component already has `key={...drillState...}` which remounts the entire table on drill-down changes. If chart components trigger state changes or re-renders in the DataDisplay component tree, the user's drill-down position could be lost.

**Why it happens:** Charts that fetch their own data or manage their own state can trigger cascading re-renders up the component tree. A new useEffect in a chart component that runs on mount could inadvertently trigger a state update that resets drill-down.

**Prevention:**
- Charts must be children of the drill-down view, not siblings that could trigger a key change on DataTable.
- If charts need their own data fetching, use separate React Query keys that do not invalidate the main `['data']` query key.
- Test the full drill-down flow (root -> partner -> batch -> back to partner) after adding every chart component.
- Consider this the right time to finally move drill-down to URL params (fixing the known tech debt) -- it would make the state resilient to any re-render.

**Phase relevance:** Architecture -- decide chart placement relative to the drill-down hierarchy before building.

---

### Pitfall 10: Collection Curve X-Axis Gaps at Non-Linear Intervals

**What goes wrong:** The collection curve columns are M1-M12 (monthly), then M15, M18, M21, M24, M30, M36, M48, M60. If plotted with equal categorical spacing, the visual implies monthly granularity throughout, making the 3-year gap between M36 and M60 look like a one-month gap.

**Prevention:**
- Use a true numeric X-axis (months as numbers: 1, 2, 3, ..., 15, 18, ..., 60) with proportional spacing, not categorical labels.
- This naturally shows the data density difference between early months and later milestones.
- Label the X-axis "Months Since Placement" to make the scale clear.

**Phase relevance:** Collection Curve Charts -- axis configuration detail, easy to miss.

---

### Pitfall 11: Saved Views Not Capturing Chart State

**What goes wrong:** The existing ViewSnapshot captures sorting, columnVisibility, columnOrder, columnFilters, dimensionFilters, and columnSizing. It does not capture chart-specific state: which batches are selected for overlay, absolute vs. percentage toggle, zoom level. Loading a saved view restores the table but resets chart settings to defaults.

**Prevention:**
- Extend ViewSnapshot interface early with optional chart state fields (even if initially empty).
- Design chart state as serializable from the start -- no React refs or DOM state.
- Make chart state restoration backwards-compatible: old saved views missing chart fields load with sensible defaults.
- Add chart state fields incrementally as each chart feature ships.

**Phase relevance:** All chart phases -- extend the type early, populate it as features land.

---

## Minor Pitfalls

### Pitfall 12: Currency Formatting Inconsistency Between Table and Charts

**What goes wrong:** The table uses formatCurrency/formatPercentage from src/lib/formatting/numbers.ts. Charts use their own axis/tooltip formatters. If these are different functions, "$1,234,567" in the table might appear as "$1.2M" on the chart axis.

**Prevention:**
- Reuse existing formatCurrency and formatPercentage functions as chart axis tick formatters and tooltip formatters.
- Create a small `chartFormatters.ts` utility that wraps existing formatters for the charting library's tick/label API.

**Phase relevance:** Collection Curve Charts -- use existing formatters from day one.

---

### Pitfall 13: Chart Tooltips Clashing with Table Tooltips

**What goes wrong:** The existing app uses radix-based tooltips (shadcn/ui) on table cells for threshold explanations. Charting libraries (Recharts) have their own built-in tooltip system. When charts appear near the table, z-index collisions cause chart tooltips to render behind sticky table headers or vice versa.

**Prevention:**
- Set explicit z-index layers in a shared constants file: table headers > chart tooltips > table cells.
- Prefer custom chart tooltips using the existing shadcn/ui Tooltip component over Recharts' built-in tooltip, for visual consistency.
- Test chart interactions with sticky headers visible.

**Phase relevance:** Collection Curve Charts -- test during implementation.

---

### Pitfall 14: Overloading the Partner Drill-Down View

**What goes wrong:** The partner drill-down currently shows a filtered batch table. Adding KPI cards, collection curve charts, trending indicators, and conditional formatting all at once creates a cluttered, slow-loading view.

**Prevention:**
- Use progressive disclosure: KPI cards at top (lightweight summary), table below (existing), charts in expandable section or tab.
- Do not render all charts on mount -- use lazy rendering triggered by user interaction (click to expand, tab to switch).
- Set a performance budget: partner drill-down must reach interactive state within 200ms of click.

**Phase relevance:** All v2.0 phases -- monitor cumulative UI density as each feature lands.

---

## Phase-Specific Warnings

| Phase Topic | Most Likely Pitfall | Severity | Mitigation |
|-------------|-------------------|----------|------------|
| Collection Curve Charts | Truncation at batch age (P1) | Critical | Truncate by BATCH_AGE_IN_MONTHS, never plot past age |
| Collection Curve Charts | Absolute vs. normalized (P2) | Critical | Default to recovery rate %, toggle for absolute |
| Collection Curve Charts | Charts in table cells (P4) | Critical | Detail panel, not inline |
| Collection Curve Charts | Non-linear x-axis (P10) | Minor | Numeric axis with proportional spacing |
| Conditional Formatting | Re-render cascade (P3) | Critical | Pre-compute in useMemo, pass via context |
| Conditional Formatting | Color conflicts (P7) | Moderate | Define visual priority, separate channels |
| Batch-Over-Batch Trending | Wrong baseline (P8) | Moderate | Rolling partner avg, min 3 batches |
| KPI Summary Cards | Aggregation mismatch (P5) | Critical | Wire to table's filtered row model |
| KPI Summary Cards | Bundle size (P6) | Moderate | Lazy-load with dynamic() |
| All Visualization | Drill-down state (P9) | Moderate | Charts inside drill hierarchy |
| All Visualization | Saved view gaps (P11) | Minor | Extend ViewSnapshot early |
| All Visualization | View overload (P14) | Minor | Progressive disclosure, lazy render |

---

## Sources

- **Codebase analysis (HIGH confidence):** `src/components/table/formatted-cell.tsx`, `src/lib/formatting/thresholds.ts`, `src/components/table/table-body.tsx`, `src/lib/columns/config.ts`, `src/components/data-display.tsx`, `src/hooks/use-drill-down.ts`
- [Recharts Performance Optimization Guide](https://recharts.github.io/en-US/guide/performance/) -- data reduction and memoization strategies
- [TanStack Table re-render issue #4794](https://github.com/TanStack/table/issues/4794) -- cell.getContext() causing full table re-renders
- [React Dashboard Re-render Optimization](https://medium.com/@sosohappy/react-rendering-bottleneck-how-i-cut-re-renders-by-60-in-a-complex-dashboard-ed14d5891c72) -- KPI card re-render patterns
- [Recovery Curves in Collection Management](https://www.happyprime.co.nz/post/the-use-of-recovery-curves-in-collection-and-write-off-management) -- collection curve visualization domain patterns
- [Recharts slow with large data issue #1146](https://github.com/recharts/recharts/issues/1146) -- SVG rendering performance limits
- [Best React Chart Libraries 2025](https://blog.logrocket.com/best-react-chart-libraries-2025/) -- library comparison and performance characteristics
