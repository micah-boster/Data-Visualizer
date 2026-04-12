# Feature Landscape: v2.0 Within-Partner Batch Comparison

**Domain:** Debt collection batch analytics -- within-partner comparison and trending
**Researched:** 2026-04-11
**Overall confidence:** MEDIUM-HIGH (domain patterns well-established, specific implementation details based on codebase analysis)

---

## Table Stakes

Features users expect in any analytics tool that compares cohort/batch performance over time. Missing these makes the v2 upgrade feel hollow.

### TS-1: Collection Curve Overlay Chart

| Attribute | Detail |
|-----------|--------|
| **What** | Multi-line chart overlaying collection curves (cumulative recovery % vs months-on-book) for multiple batches from the same partner. Each batch is a separate line, x-axis is months (1-60), y-axis is cumulative collection rate. |
| **Why expected** | This is the canonical "vintage analysis" chart used across all credit/collections analytics. Anyone who has seen a portfolio review deck expects this shape. It is the single most important visualization for answering "is this partner's latest batch performing better or worse than historical?" |
| **Complexity** | Medium |
| **Data dependency** | `COLLECTION_AFTER_1_MONTH` through `COLLECTION_AFTER_60_MONTH` (20 columns), `BATCH`, `PARTNER_NAME`, `BATCH_AGE_IN_MONTHS` |
| **Notes** | Lines must truncate at `BATCH_AGE_IN_MONTHS` -- newer batches will have shorter curves. This is standard vintage analysis behavior, not a bug. X-axis should use the actual month values (1,2,3...12,15,18,21,24,30,36,48,60) not equally spaced, since the collection columns are not evenly distributed. |

**Key behaviors:**
- Show at partner drill-down level (when user clicks into a partner, show their batches overlaid)
- Each line labeled by batch name
- Hover/tooltip shows exact collection % at that month for each batch
- Color-code lines so most recent batch stands out (e.g., bold/primary color for latest, muted for older)
- Optional: highlight a "partner average" reference line computed as mean of all visible batches

### TS-2: KPI Summary Cards at Partner Level

| Attribute | Detail |
|-----------|--------|
| **What** | 4-6 summary cards displayed above the batch table when drilled into a partner. Show aggregate metrics: total batches, total accounts placed, average collection rate at key milestones (3mo, 6mo, 12mo), total lifetime collected, average penetration rate. |
| **Why expected** | Every analytics dashboard places KPI cards at the top of a detail view. F-pattern eye tracking research confirms users look top-left first. Without summary cards, users must mentally aggregate the table below, which defeats the purpose of a visualization tool. |
| **Complexity** | Low |
| **Data dependency** | Aggregation across all batches for the selected partner: `TOTAL_ACCOUNTS`, `TOTAL_AMOUNT_PLACED`, `TOTAL_COLLECTED_LIFE_TIME`, `COLLECTION_AFTER_3_MONTH`, `COLLECTION_AFTER_6_MONTH`, `COLLECTION_AFTER_12_MONTH`, `PENETRATION_RATE_POSSIBLE_AND_CONFIRMED` |
| **Notes** | Cards should show the metric value plus a comparison indicator (e.g., "vs all partners" or trend arrow from previous batch). Keep it to 4-6 cards max -- more creates visual noise. |

**Key behaviors:**
- Visible only at partner drill-down level (not root level)
- Large primary number, small label, optional trend indicator
- Responsive layout: 3 cards per row on typical viewport, stack on narrow

### TS-3: Conditional Formatting Based on Partner Norms

| Attribute | Detail |
|-----------|--------|
| **What** | Cell-level color coding in the batch table showing whether a value is above/below the partner's own historical average for that metric. Green tint = above average (good), red tint = below average (bad), neutral = within normal range. |
| **Why expected** | The existing codebase already has `thresholds.ts` with static absolute thresholds. v2 needs to upgrade this to relative thresholds -- comparing each batch against that partner's own norm. This is the difference between "penetration rate is below 5%" (absolute) and "penetration rate is 40% below this partner's average" (relative). Relative comparison is far more useful for partnerships work because different partners have wildly different baseline performance. |
| **Complexity** | Medium |
| **Data dependency** | All numeric columns, computed partner-level mean/median as baseline |
| **Notes** | Must compute partner baselines client-side from the loaded batch data. Use standard deviation or percentage deviation from mean to set green/red thresholds. Extend existing `ThresholdConfig` system rather than replacing it. |

**Key behaviors:**
- Active at partner drill-down level (where batches for one partner are visible)
- Color intensity proportional to deviation magnitude (subtle for small deviations, bold for large)
- Tooltip explains the deviation: "12.3% vs partner avg 18.7% (-34%)"
- Toggle on/off (some users prefer clean numbers)
- Apply to collection curve columns, penetration rates, conversion rates, and financial metrics

### TS-4: Batch-over-Batch Trending Indicators

| Attribute | Detail |
|-----------|--------|
| **What** | Up/down/flat trend arrows or mini-indicators in the table showing whether key metrics are improving or degrading across the most recent batches for a partner. |
| **Why expected** | "Is this getting better or worse?" is the first question a partnerships lead asks about any partner. A raw number without directional context forces the user to compare rows manually. |
| **Complexity** | Low-Medium |
| **Data dependency** | Same metrics as conditional formatting, plus batch ordering (by `BATCH` name or placement date) to determine "previous" vs "current" |
| **Notes** | Batches must be sortable chronologically. If batch naming follows a convention (e.g., "Partner_2024Q1"), parse for ordering. Otherwise, rely on `BATCH_AGE_IN_MONTHS` as a proxy for recency. |

**Key behaviors:**
- Show as small icon (arrow up/down/flat) next to the cell value
- Green up-arrow = improving, red down-arrow = degrading, gray dash = flat
- "Flat" threshold: changes within +/-5% of previous batch count as flat
- Compare current batch to immediately prior batch (not average)
- Visible at partner drill-down level

---

## Differentiators

Features that elevate the tool beyond what a typical BI dashboard provides. Not expected, but make the team say "this is better than anything we had before."

### D-1: Sparkline Mini-Charts in Table Cells

| Attribute | Detail |
|-----------|--------|
| **What** | Replace the 20 individual collection curve columns in the table with a single sparkline column showing the full curve shape inline. Hovering shows the full chart; clicking drills into the overlay view. |
| **Value proposition** | Collapses 20 columns into 1, making the table dramatically more scannable. Users can spot anomalous curve shapes (early plateau, sudden drop) at a glance without needing to read 20 numbers. |
| **Complexity** | Medium-High |
| **Data dependency** | `COLLECTION_AFTER_1_MONTH` through `COLLECTION_AFTER_60_MONTH`, `BATCH_AGE_IN_MONTHS` |
| **Notes** | Performance concern: rendering 50+ SVG sparklines in a virtualized table. Use lightweight SVG path generation (no full charting library needed for sparklines). React.memo aggressively. Consider canvas-based rendering if SVG is too slow. |

### D-2: Deviation Heatmap View

| Attribute | Detail |
|-----------|--------|
| **What** | An alternative view mode that shows the batch table as a heatmap where cell color intensity represents deviation from the partner average. Turns the table into a visual anomaly detector. |
| **Value proposition** | Instead of reading numbers, the user scans for "hot spots" of red (underperformance) or green (outperformance). Dramatically speeds up identification of problematic batches or metrics. |
| **Complexity** | Medium |
| **Data dependency** | All numeric columns, computed partner baselines |
| **Notes** | This is an extension of TS-3 (conditional formatting) pushed to its logical extreme. Could be implemented as a toggle: "Numbers" vs "Heatmap" view mode. HSL color interpolation for smooth gradients. |

### D-3: Collection Curve Shape Comparison

| Attribute | Detail |
|-----------|--------|
| **What** | Automatically classify batch collection curves into shape categories (early ramp, steady growth, plateau, s-curve, underperformer) and flag batches whose curve shape diverges from the partner's typical pattern. |
| **Value proposition** | Answers "this batch isn't just lower, it has a fundamentally different collection pattern" -- which suggests a different problem (bad data quality, different account mix, operational issue) vs just a weaker batch. |
| **Complexity** | High |
| **Data dependency** | Collection curve columns, partner historical curves |
| **Notes** | Simpler version: compute derivative of curve (slope at each interval) and flag batches where slope profile differs significantly. Full version would need clustering, which is v3 territory. |

### D-4: Time-Aligned Curve Comparison

| Attribute | Detail |
|-----------|--------|
| **What** | On the collection curve overlay chart, allow toggling between "absolute time" (calendar date on x-axis) and "relative time" (months-since-placement on x-axis). Default to relative time. |
| **Value proposition** | Relative time answers "at the same point in their lifecycle, how do these batches compare?" while absolute time answers "what was happening across all batches during Q3 2024?" Both questions matter. |
| **Complexity** | Low (if chart is already built) |
| **Data dependency** | Collection curve columns plus batch placement dates (may need to be derived or added) |

### D-5: Exportable Partner Summary Report

| Attribute | Detail |
|-----------|--------|
| **What** | One-click export of the partner drill-down view (KPI cards + collection curve chart + batch table) as a formatted PDF or image for sharing in Slack/email. |
| **Value proposition** | Partnerships team frequently shares batch performance summaries with leadership. Currently they screenshot. A clean export saves time and looks professional. |
| **Complexity** | Medium |
| **Notes** | html2canvas or similar for screenshot-to-image. PDF generation adds complexity. Start with "copy chart as image" and "download as PNG." |

---

## Anti-Features

Features to explicitly NOT build in v2.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Cross-partner normalization/comparison | Requires statistical baseline model to normalize across different partner characteristics (balance sizes, account types, vintages). Premature without understanding what "comparable" means for this team. Explicitly scoped as v3+. | Keep comparison within-partner only. Surface raw numbers side by side if users want to glance across partners. |
| AI-powered anomaly detection | v3 feature per PROJECT.md. Adding ML/AI to the anomaly detection before the team even has the basic visualizations would be premature. The conditional formatting (TS-3) gives them 80% of the value with 10% of the complexity. | Use statistical deviation (mean +/- 1.5 SD) for conditional formatting. Simple, explainable, debuggable. |
| Predictive curve projection | "Given the first 6 months, where will this batch be at 12 months?" is appealing but requires a forecasting model. Out of scope per PROJECT.md. | Show the curve as-is, truncated at `BATCH_AGE_IN_MONTHS`. Users can visually extrapolate from the overlay. |
| Real-time data streaming | Batch/scheduled refresh is sufficient per PROJECT.md. Collection data updates daily at most. | Keep existing React Query refetch with appropriate stale times. |
| Mobile-responsive charts | 2-3 desktop users. Charts need hover interactions that don't translate to mobile well. | Desktop-first. Charts can be responsive within reason but don't optimize for phone. |
| Editable thresholds UI | Building a UI for users to customize conditional formatting thresholds adds significant complexity for 2-3 users. | Hardcode sensible defaults (1 SD, 1.5 SD). Can always add a settings panel later if users request it. |
| Dashboard drag-and-drop layout | v3 feature. The current single-page drill-down model is the right UX for now. | Keep the linear flow: root table -> partner view (cards + chart + table) -> batch detail. |

---

## Feature Dependencies

```
KPI Summary Cards (TS-2)
  |-- Requires: partner drill-down (already exists)
  |-- Requires: client-side aggregation of batch data (new)

Collection Curve Overlay (TS-1)
  |-- Requires: charting library (new dependency -- Recharts recommended)
  |-- Requires: partner drill-down (already exists)
  |-- Requires: collection curve columns (already in data)

Conditional Formatting (TS-3)
  |-- Requires: partner baseline computation (new)
  |-- Extends: existing thresholds.ts system
  |-- Requires: partner drill-down (already exists)

Batch Trending Indicators (TS-4)
  |-- Requires: batch chronological ordering (may need logic)
  |-- Requires: partner drill-down (already exists)
  |-- Depends on: TS-3 baseline computation (shared logic)

Sparkline Mini-Charts (D-1)
  |-- Requires: TS-1 charting infrastructure or lightweight SVG
  |-- Requires: virtual scrolling compatibility (already exists)

Deviation Heatmap (D-2)
  |-- Requires: TS-3 conditional formatting system (extends it)

Collection Curve Shape Comparison (D-3)
  |-- Requires: TS-1 (overlay chart)
  |-- Requires: curve classification logic (new, complex)
```

**Build order implication:** TS-2 (KPI cards) is independent and low complexity -- build first. TS-1 (chart) introduces the charting library -- build second. TS-3 (conditional formatting) builds the baseline computation -- third. TS-4 (trending) reuses TS-3 logic -- fourth. Differentiators layer on top.

---

## MVP Recommendation

**Phase 1 -- Foundation (build first):**
1. **KPI Summary Cards (TS-2)** -- Low complexity, high visibility, no new dependencies
2. **Collection Curve Overlay Chart (TS-1)** -- Core v2 value prop, introduces Recharts

**Phase 2 -- Intelligence (build second):**
3. **Conditional Formatting with Partner Norms (TS-3)** -- Upgrades existing threshold system
4. **Batch-over-Batch Trending (TS-4)** -- Shares baseline computation with TS-3

**Phase 3 -- Polish (if time permits):**
5. **Sparkline Mini-Charts (D-1)** -- Nice-to-have compression of 20 columns

**Defer to v3:**
- Deviation Heatmap (D-2) -- cool but the conditional formatting handles 80% of the need
- Curve Shape Comparison (D-3) -- needs more sophisticated analysis
- Exportable Reports (D-5) -- nice but not core to the comparison workflow

---

## Data Column Mapping

How existing 61 columns map to v2 features:

| Feature | Columns Used | Column Group |
|---------|-------------|--------------|
| Collection Curve Chart | `COLLECTION_AFTER_{1..60}_MONTH` (20 cols) | collection-curves |
| Curve Truncation | `BATCH_AGE_IN_MONTHS` | identity |
| KPI Cards | `TOTAL_ACCOUNTS`, `TOTAL_AMOUNT_PLACED`, `TOTAL_COLLECTED_LIFE_TIME`, `COLLECTION_AFTER_{3,6,12}_MONTH`, `PENETRATION_RATE_POSSIBLE_AND_CONFIRMED` | Various |
| Conditional Formatting | All numeric columns (40+ cols) | All groups |
| Trending Indicators | Key metrics subset: `COLLECTION_AFTER_{3,6,12}_MONTH`, `PENETRATION_RATE_*`, `RAITO_FIRST_TIME_CONVERTED_ACCOUNTS`, `TOTAL_COLLECTED_LIFE_TIME` | collection-curves, penetration, conversion, payments |
| Batch Ordering | `BATCH`, `BATCH_AGE_IN_MONTHS` | identity |
| Sparklines | `COLLECTION_AFTER_{1..60}_MONTH` (20 cols), `BATCH_AGE_IN_MONTHS` | collection-curves, identity |

**No new Snowflake columns needed.** All v2 features derive from existing `agg_batch_performance_summary` data. The `ACCOUNT_PUBLIC_ID` column (listed as active requirement) is for account-level drill-down, not for within-partner comparison features.

---

## Existing Infrastructure to Extend

| Existing System | v2 Extension |
|----------------|--------------|
| `thresholds.ts` (static absolute thresholds) | Add relative threshold computation: per-partner mean/SD calculation, extend `ThresholdConfig` with a `relative` mode |
| `use-drill-down.ts` (partner/batch state) | KPI cards and chart render conditionally based on `drillState.level === 'partner'` |
| `data-display.tsx` (layout orchestrator) | Add chart and KPI card components between breadcrumb and table at partner level |
| `groups.ts` (column grouping) | Sparkline feature would add a synthetic "Curve" column that reads from the collection-curves group |
| `FormattedCell` component | Extend to render trend arrows and relative-deviation colors |
| TanStack Virtual (virtualization) | Must remain performant with sparklines added to cells |

---

## Sources

- [Vintage analysis methodology](https://www.listendata.com/2019/09/credit-risk-vintage-analysis.html) -- canonical structure for collection curve overlay charts
- [Vintage curves explanation](https://www.finleycms.com/blog/what-are-vintage-curves/) -- x-axis = age, y-axis = cumulative metric, each line = one cohort
- [KPI dashboard best practices](https://tabulareditor.com/blog/kpi-card-best-practices-dashboard-design) -- F-pattern layout, comparison context, 4-6 card limit
- [Dashboard design principles](https://www.datacamp.com/tutorial/dashboard-design-tutorial) -- visual hierarchy, summary-then-detail pattern
- [React charting libraries 2025](https://blog.logrocket.com/best-react-chart-libraries-2025/) -- Recharts recommended for composable React-first charting
- [Batch comparison analytics](https://www.trendminer.com/resources/batch-comparison-and-live-monitoring) -- overlay visualization for multi-batch comparison
- [React sparklines in tables](https://www.shadcn.io/blocks/tables-sparkline) -- sparkline integration patterns with shadcn/ui tables
- [Heatmap visualization guide](https://www.atlassian.com/data/charts/heatmap-complete-guide) -- when and how to use color-coded data matrices
