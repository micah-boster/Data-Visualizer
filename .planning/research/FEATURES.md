# Features Research: Bounce Data Visualizer

> **Research type**: Features dimension for internal data analytics dashboard
> **Domain**: Debt collection partnerships team — account health, batch performance, collection curves, engagement metrics
> **Data source**: Snowflake (`agg_batch_performance_summary` + future tables)
> **Users**: 2-3 internal partnerships team members, desktop only
> **Replaces**: Static Metabase dashboards + non-deterministic Claude/Snowflake queries

---

## Table Stakes (Must-Have or Users Leave)

These are baseline features users expect from any data exploration tool. Missing any of these makes the tool feel broken compared to even Metabase.

### TS-1: Interactive Data Table with Sort/Filter
**What**: Tabular view of batch performance data with column sorting (asc/desc), column-level filtering (text search, numeric ranges, date ranges), and multi-column sort.
**Why table stakes**: Every spreadsheet and BI tool has this. Users will immediately try to click column headers to sort and type to filter. If it does not work, the tool feels broken.
**Complexity**: Low-Medium. Standard data grid component (AG Grid, TanStack Table). The 61-column width of `agg_batch_performance_summary` adds complexity around horizontal scrolling and column management.
**Dependencies**: Data fetching layer (API to Snowflake), column type detection for appropriate filter controls.

### TS-2: Column Visibility and Reordering
**What**: Show/hide columns, drag-to-reorder columns, resize column widths. Persist preferences within a session at minimum.
**Why table stakes**: With 61 columns, users cannot work without hiding irrelevant ones. Metabase already supports column hiding. This is the bare minimum for a wide-table tool.
**Complexity**: Low. Built into most data grid libraries. The main work is a clean column picker UI.
**Dependencies**: TS-1 (data table).

### TS-3: Global and Dimension Filters
**What**: Filter the entire dataset by partner, account type, batch, time period. Applied above the table as persistent filter controls (dropdowns, date pickers). Filters compose with AND logic.
**Why table stakes**: The PROJECT.md lists this as an active requirement. Users need to slice data by partner/batch/period to do their job. Without this, every view shows everything, which is useless for a partnerships team managing specific accounts.
**Complexity**: Medium. Requires fetching distinct filter values from Snowflake, maintaining filter state, and passing filter criteria to queries. Cascading filters (partner selection narrows batch options) adds complexity but is expected.
**Dependencies**: Data fetching layer, knowledge of dimension columns in the schema.

### TS-4: Data Loading and Refresh
**What**: Load data from Snowflake on page load or explicit refresh. Show loading states. Handle errors gracefully (connection failures, timeouts, empty results).
**Why table stakes**: The tool is useless if it cannot reliably fetch and display data. Users need to know when data is stale and be able to refresh.
**Complexity**: Medium. Snowflake query execution, server-side credential management, caching strategy (to avoid hitting Snowflake on every interaction), and error handling.
**Dependencies**: Snowflake connector, API layer, secure credential storage.

### TS-5: Saved Views
**What**: Save the current state of filters, column visibility, column order, sort order, and any applied configurations as a named view. Load saved views from a list. Support both personal and shared views (for 2-3 users, shared is fine as default).
**Why table stakes**: PROJECT.md lists this as a core requirement. The whole point of building custom tooling over Claude+Snowflake is that Claude queries are non-deterministic and cannot be saved/reused. If users cannot save and return to their views, they lose the primary advantage over the current workflow.
**Complexity**: Medium. Serializing view state to JSON, storing in a database or local storage (for MVP, localStorage or a simple DB table is fine), loading/applying state on selection.
**Dependencies**: TS-1, TS-2, TS-3 (all contribute state that needs saving).

### TS-6: Basic Data Formatting
**What**: Appropriate formatting for different data types: currency with dollar signs and commas, percentages with % symbol, dates in readable format, large numbers with abbreviations or commas. Right-align numeric columns.
**Why table stakes**: Raw unformatted numbers from Snowflake (e.g., `0.0342` instead of `3.42%`, `1234567.89` instead of `$1,234,567.89`) make data unreadable. Every BI tool formats data.
**Complexity**: Low. Column-type-based formatters. Requires a mapping of columns to their data types/display formats.
**Dependencies**: TS-1 (data table), schema metadata.

### TS-7: Export to CSV/Excel
**What**: Export the current filtered/sorted view to CSV or Excel file. Include applied filters in the filename or a header row.
**Why table stakes**: Users will need to share data with others who do not have tool access, paste into presentations, or do one-off analysis in Excel. This is expected from any data tool.
**Complexity**: Low. Client-side CSV generation from current table data. Excel export adds slight complexity (library like SheetJS).
**Dependencies**: TS-1 (data table), current filter/sort state.

### TS-8: Responsive Data Grid Performance
**What**: The table must handle the full dataset without freezing, lagging, or becoming unusable. Pagination or virtual scrolling for large result sets. Target: render 10,000+ rows at 61 columns without degradation.
**Why table stakes**: If the tool is slow, users go back to Metabase or Excel. Performance is not a feature, it is a prerequisite.
**Complexity**: Medium. Virtual scrolling (only render visible rows), server-side pagination, or a hybrid approach. Most React data grid libraries handle this, but configuration matters.
**Dependencies**: TS-1 (data table), data fetching strategy (paginated queries vs. full load).

---

## Differentiators (Competitive Advantage)

These features make the tool meaningfully better than Metabase + Claude/Snowflake. They justify building custom tooling.

### D-1: Anomaly Highlighting / Threshold-Based Visual Indicators
**What**: Automatically flag cells, rows, or metrics that are outside expected thresholds. Color-code cells (red/yellow/green) based on configurable rules. Examples: penetration rate below 2%, sudden MoM drop > 15%, collection curve falling below portfolio benchmark.
**Why differentiating**: This is the core value proposition from PROJECT.md: "Surface abnormal account and batch performance data so the partnerships team can focus energy where it matters most." Metabase does not do conditional cell formatting well. This is the single biggest reason to build custom tooling.
**Complexity**: Medium-High. Requires defining threshold rules (hardcoded initially, user-configurable later), applying them across metrics, and rendering visual indicators. The "what is abnormal" logic is domain-specific and needs partnerships team input.
**Dependencies**: TS-1 (data table), TS-6 (formatting), domain knowledge of normal ranges for each metric.

### D-2: Period-Over-Period Change Tracking
**What**: Show MoM (month-over-month), WoW (week-over-week), and batch-over-batch deltas inline in the table or as a dedicated comparison view. Display as absolute change and percentage change. Highlight significant changes.
**Why differentiating**: PROJECT.md lists this as an active requirement. Currently users manually compare Metabase snapshots or ask Claude to compute deltas. Having this built-in with visual indicators (arrows, color coding) makes trend detection instant rather than manual.
**Complexity**: High. Requires querying multiple time periods, computing deltas, and aligning data across periods. Batch-over-batch comparison requires matching batches across time. The data model needs to support temporal joins.
**Dependencies**: TS-4 (data loading), TS-3 (time period filters), schema understanding of temporal dimensions.

### D-3: Collection Curve Visualization
**What**: Line/area chart showing collection progression from month 1 through month 60 for selected batches or accounts. Overlay multiple batches for comparison. Show portfolio benchmark as a reference line.
**Why differentiating**: Collection curves are the fundamental performance metric in debt collection. The `agg_batch_performance_summary` table includes this data (1-60 month columns). Visualizing curves rather than staring at 60 numeric columns is a massive usability improvement that Metabase struggles with for this column layout.
**Complexity**: Medium. Charting library (Recharts, Nivo, or similar). The data transformation from wide-format (60 columns) to chart-friendly format (rows of month/value) is the main complexity.
**Dependencies**: TS-4 (data loading), TS-3 (filters to select which batches to plot).

### D-4: Benchmark Comparison
**What**: Compare any batch or account's metrics against portfolio-level benchmarks, partner-level averages, or custom peer groups. Show deviation from benchmark as a percentage or absolute value. Integrate with anomaly highlighting (D-1).
**Why differentiating**: PROJECT.md explicitly mentions "vs. portfolio benchmarks" as a change tracking dimension. Knowing that a batch is at 3.2% penetration is only meaningful if you know the benchmark is 4.5%. This contextualizes every metric.
**Complexity**: Medium. Requires computing or storing benchmarks (portfolio averages, partner averages), and displaying them alongside actual values. Benchmark computation can be a scheduled Snowflake query.
**Dependencies**: D-1 (anomaly highlighting), TS-4 (data loading), benchmark data source.

### D-5: Dashboard Layout with Reorderable Widgets
**What**: A dashboard view (separate from the table view) with draggable, resizable widgets: summary KPI cards, charts, mini-tables. Users can arrange widgets and save layouts. Think: a personalized command center, not just a data table.
**Why differentiating**: PROJECT.md mentions "custom dashboard layouts" as a requirement. Metabase dashboards exist but are rigid and hard to customize. A drag-and-drop dashboard where each user arranges their own view is a genuine workflow improvement.
**Complexity**: High. Requires a layout engine (react-grid-layout or similar), widget system (KPI card, chart, table as widget types), layout persistence, and state management across widgets.
**Dependencies**: TS-5 (saved views), D-3 (charts as widgets), TS-1 (tables as widgets).

### D-6: Drill-Down Navigation
**What**: Click on a partner to see their batches. Click on a batch to see account-level detail. Click on an account to see its full metric history. Breadcrumb navigation to track drill path.
**Why differentiating**: The partnerships team workflow moves from portfolio overview to specific problem accounts. A drill-down path (portfolio > partner > batch > account) matches this workflow. Currently this requires multiple separate Metabase queries or Claude conversations.
**Complexity**: Medium-High. Requires multiple query levels, context passing between views, and a navigation model. Depends on which Snowflake tables are available at each level.
**Dependencies**: TS-3 (filters), TS-4 (data loading), multiple Snowflake tables (starts with `agg_batch_performance_summary`, expands to `master_accounts` etc.).

### D-7: Inline Sparklines and Mini-Charts
**What**: Small trend indicators within table cells showing the last N periods of a metric. Lets users scan a table of 50 batches and instantly see which ones are trending up/down without opening a full chart.
**Why differentiating**: This is information density that no standard BI tool provides well. A partnerships person scanning batch performance can see trends at a glance without clicking into each one.
**Complexity**: Medium. Sparkline rendering in table cells (lightweight SVG or canvas). Requires historical data for each metric to be available or fetchable.
**Dependencies**: TS-1 (data table), D-2 (period-over-period data availability).

### D-8: Quick Summary / KPI Cards
**What**: Top-of-page summary showing key portfolio-level metrics: total accounts, total balance, average penetration rate, average engagement rate, counts of accounts in different health categories. Updates based on active filters.
**Why differentiating**: Gives immediate context before diving into the table. Answers "how are we doing overall?" in 2 seconds. Metabase can do this but requires separate dashboard tiles that do not update with table filters.
**Complexity**: Low-Medium. Aggregate queries, summary card components. The key is making them reactive to the same filters as the table.
**Dependencies**: TS-3 (filters), TS-4 (data loading).

---

## Anti-Features (Deliberately NOT Building)

These are features that seem logical but would add complexity, distract from core value, or are explicitly out of scope for the MVP.

### AF-1: Natural Language / AI Query Interface
**Why not**: PROJECT.md explicitly puts this in v2 scope. The whole rationale for the tool is that Claude+Snowflake queries are non-deterministic. Building deterministic, saveable views is the priority. Adding AI querying back in contradicts the core value proposition until the deterministic foundation is solid.
**Risk of including**: Scope creep, distraction from core table/view features, and it reintroduces the non-determinism problem the tool is meant to solve.

### AF-2: User Authentication / Multi-Tenancy
**Why not**: 2-3 internal users. Adding auth adds login friction, session management complexity, and solves no real problem for this team size. PROJECT.md explicitly defers this.
**Risk of including**: Over-engineering for 2-3 users. Adds 1-2 weeks of work for zero user value.
**Revisit when**: Team grows beyond 5 users or data sensitivity requires access controls.

### AF-3: Write-Back to Snowflake
**Why not**: This is a read-only analytics tool. Allowing edits creates data integrity risks, requires audit logging, and conflates the tool's purpose. PROJECT.md explicitly marks this out of scope.
**Risk of including**: Accidental data corruption, need for undo/audit trail, and scope expansion into data management territory.

### AF-4: Real-Time Data Streaming
**Why not**: Debt collection data changes on batch/scheduled refresh cycles (daily or weekly), not in real-time. WebSocket connections, streaming infrastructure, and real-time UI updates add massive complexity for data that changes once a day.
**Risk of including**: Infrastructure complexity (websockets, event streams), increased Snowflake costs, and no user benefit since the underlying data is batch-processed anyway.

### AF-5: Mobile-Responsive UI
**Why not**: 2-3 desktop users. Wide data tables with 61 columns are fundamentally incompatible with mobile screens. The effort to make this responsive would compromise the desktop experience.
**Risk of including**: Worse desktop UX from responsive compromises, significant CSS/layout work for zero actual mobile usage.

### AF-6: Complex Alerting / Notification System
**Why not**: With 2-3 users who check the tool regularly, push notifications, email alerts, and Slack integrations are premature. The anomaly highlighting (D-1) surfaces issues when users look at the tool, which is sufficient for MVP.
**Risk of including**: Notification fatigue, infrastructure for email/Slack integration, alert rule management UI.
**Revisit when**: If users express they want to be notified without opening the tool, or if the user base grows.

### AF-7: Pixel-Perfect PDF Report Generation
**Why not**: CSV/Excel export (TS-7) covers the "share with others" use case. PDF reports require a templating engine, layout system, and design effort disproportionate to the value for 2-3 internal users.
**Risk of including**: Significant frontend complexity, maintenance burden for report templates, and it is a different product (reporting) vs. the product being built (exploration).

### AF-8: Custom SQL Query Editor
**Why not**: The tool's value is pre-built, deterministic views. A SQL editor re-introduces the "unstructured query" problem and requires SQL injection protection, query timeouts, result caching, and Snowflake cost controls.
**Risk of including**: Security surface area, Snowflake cost risk from expensive queries, and it undercuts the "saved views" value proposition.

---

## Feature Dependencies Map

```
TS-4 (Data Loading)
  |
  +-- TS-1 (Data Table)
  |     |
  |     +-- TS-2 (Column Visibility/Reorder)
  |     +-- TS-6 (Data Formatting)
  |     +-- TS-7 (Export CSV/Excel)
  |     +-- TS-8 (Grid Performance)
  |     +-- D-7 (Sparklines) --> needs D-2
  |
  +-- TS-3 (Filters)
  |     |
  |     +-- D-2 (Period-over-Period) --> needs temporal data model
  |     +-- D-3 (Collection Curves)
  |     +-- D-8 (KPI Cards)
  |
  +-- TS-5 (Saved Views) --> needs TS-1, TS-2, TS-3
  |
  +-- D-1 (Anomaly Highlighting) --> needs TS-1, TS-6, domain thresholds
  |     |
  |     +-- D-4 (Benchmark Comparison)
  |
  +-- D-5 (Dashboard Layout) --> needs TS-5, D-3, TS-1
  |
  +-- D-6 (Drill-Down) --> needs TS-3, multiple Snowflake tables
```

## Recommended Build Order

**Wave 1 — Foundation (must ship first)**
1. TS-4: Data Loading (Snowflake connection, API layer)
2. TS-1: Interactive Data Table
3. TS-6: Data Formatting
4. TS-8: Grid Performance

**Wave 2 — Usability (makes it usable daily)**
5. TS-2: Column Visibility/Reorder
6. TS-3: Global Filters
7. TS-7: Export

**Wave 3 — Core Value (the reason to build this)**
8. D-1: Anomaly Highlighting
9. D-2: Period-over-Period Change Tracking
10. TS-5: Saved Views
11. D-8: KPI Summary Cards

**Wave 4 — Power Features (delight)**
12. D-3: Collection Curve Visualization
13. D-4: Benchmark Comparison
14. D-7: Sparklines
15. D-5: Dashboard Layout
16. D-6: Drill-Down Navigation

---

## Complexity Summary

| Feature | Complexity | Category |
|---------|-----------|----------|
| TS-1: Data Table | Low-Medium | Table Stakes |
| TS-2: Column Visibility | Low | Table Stakes |
| TS-3: Global Filters | Medium | Table Stakes |
| TS-4: Data Loading | Medium | Table Stakes |
| TS-5: Saved Views | Medium | Table Stakes |
| TS-6: Data Formatting | Low | Table Stakes |
| TS-7: Export | Low | Table Stakes |
| TS-8: Grid Performance | Medium | Table Stakes |
| D-1: Anomaly Highlighting | Medium-High | Differentiator |
| D-2: Period-over-Period | High | Differentiator |
| D-3: Collection Curves | Medium | Differentiator |
| D-4: Benchmark Comparison | Medium | Differentiator |
| D-5: Dashboard Layout | High | Differentiator |
| D-6: Drill-Down | Medium-High | Differentiator |
| D-7: Sparklines | Medium | Differentiator |
| D-8: KPI Cards | Low-Medium | Differentiator |

---

*Research completed: 2026-04-10*
*Source: Domain analysis of internal analytics tooling patterns, PROJECT.md requirements, debt collection industry data workflows*
