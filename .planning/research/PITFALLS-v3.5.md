# Domain Pitfalls: Flexible Charts & Metabase Import

**Domain:** Adding flexible chart builder + Metabase query import to existing analytics app
**Project:** Bounce Data Visualizer v3.5
**Researched:** 2026-04-15
**Scope:** Integration pitfalls specific to this codebase, not general advice

---

## Critical Pitfalls

Mistakes that cause rewrites, data corruption, or broken saved views.

### Pitfall 1: ChartViewState Schema Break Destroys Saved Views

**What goes wrong:** The current `ChartViewState` in `src/lib/views/types.ts` is tightly coupled to collection curves (metric: recoveryRate|amount, hiddenBatches, showAverage, showAllBatches). A flexible chart builder needs fundamentally different state (chartType, xAxis, yAxis, series[], etc.). If you replace ChartViewState with a new shape, every saved view in localStorage fails Zod validation and gets silently dropped.

**Why it happens:** The Zod schema in `src/lib/views/schema.ts` uses `z.enum(['recoveryRate', 'amount'])` for metric and specific boolean fields. Any new chartState shape that doesn't match this enum will fail `safeParse`, and the app already handles failures by rejecting the view entirely.

**Consequences:** Users lose all 3 default views + any custom views they created. The "Financial Overview" and "New Batches" starter views both persist `chartState` with the old shape. No data loss in Snowflake, but workflow disruption for the 2-3 daily users.

**Prevention:**
1. Use a discriminated union for chartState: `{ type: 'curves', ...oldFields } | { type: 'custom', chartType, xAxis, yAxis, ... }`.
2. Add a migration layer that reads old chartState (no `type` field) and wraps it as `{ type: 'curves', ...existing }` before Zod validation.
3. Update `viewSnapshotSchema` to accept both shapes via `z.discriminatedUnion('type', [...])`.
4. Update `getDefaultViews()` in `src/lib/views/defaults.ts` to use the new discriminated shape.
5. Test by manually setting old-format views in localStorage and confirming they load.

**Detection:** Any existing saved view that includes `chartState` will fail to load after the change. Check the browser console for Zod parse errors.

**Phase:** Must be addressed in the very first phase of chart builder work, before any new chart state is persisted.

---

### Pitfall 2: MBQL is Underdocumented and Unstable -- Building a Full Parser is a Trap

**What goes wrong:** Teams attempt to build a comprehensive MBQL-to-SQL translator, discover the format is far more complex than expected, and spend weeks on edge cases. Metabase's own wiki labels their MBQL reference "(Incomplete)" and the format has been described by Metabase developers as "pretty hairy/wonky." Field references use integer IDs (`[:field-id 42]`) that are Metabase-instance-specific and meaningless outside that instance.

**Why it happens:** MBQL looks like simple JSON, so it seems parseable. But it includes: integer field IDs tied to Metabase's internal metadata catalog, foreign key traversals (`[:fk-> ...]`), datetime bucketing wrappers (`[:datetime-field ...]`), named aggregations, source-query nesting, binning strategies, and expression references -- none of which map cleanly to your Snowflake column names.

**Consequences:** Weeks spent on a parser that handles 60% of MBQL but breaks on the remaining 40%. The parser becomes a maintenance burden whenever Metabase updates its format.

**Prevention:**
1. Do NOT build a full MBQL parser. Instead, support two simpler paths:
   - **SQL import** (primary): Accept the SQL that Metabase generates (visible in Metabase's query inspector via "View the SQL"). This maps directly to Snowflake since your app already uses Snowflake SQL.
   - **MBQL "recipe" import** (secondary): Support only the subset needed -- extract table name, aggregation type, breakout fields, and filters. Map these to your column metadata system rather than trying to replicate Metabase's full query compiler.
2. For MBQL field references, require users to provide a field-ID-to-column-name mapping (or auto-detect from column names in the MBQL filter values).
3. Set a hard scope limit: support `source-table`, `aggregation`, `breakout`, `filter`, `order-by`, `limit`. Reject anything with `source-query`, `expressions`, `joins`, or `binning-strategy` with a clear error message.

**Detection:** If the MBQL parser file exceeds ~200 lines, scope is creeping. If you're writing Metabase-version-specific conditionals, you've gone too far.

**Phase:** Address during Metabase import phase. Define the supported MBQL subset before writing any parser code.

---

### Pitfall 3: Axis Selection Without Type Guards Produces Nonsense Charts

**What goes wrong:** The flexible chart builder lets users pick any column for X and Y axes. User selects PARTNER_NAME (text) for Y-axis and gets a blank chart or NaN errors. Or they put PENETRATION_RATE (0-1 range) on the same Y-axis as TOTAL_AMOUNT_PLACED ($millions) and get a chart where one series is an invisible flat line at zero.

**Why it happens:** The column metadata system (`ColumnConfig.type`) already classifies columns as text, currency, percentage, count, number, and date. But a naive axis selector shows all 61 columns without filtering by compatibility.

**Consequences:** Users create broken charts, lose trust in the tool, and go back to Metabase. With only 2-3 users, even one bad experience has outsized impact.

**Prevention:**
1. Filter axis options by column type: X-axis allows text (categorical), date, and number; Y-axis allows only numeric types (currency, count, percentage, number).
2. When Y-axis has mixed types (e.g., currency + percentage), auto-create dual Y-axes or warn the user.
3. Use `ColumnConfig.type` to auto-select the right formatter for each axis. The formatters already exist in `src/lib/formatting/numbers.ts` -- reuse `getFormatter()`.
4. For scatter plots specifically, both axes must be numeric.
5. Default to sensible axis choices: X = BATCH_AGE_IN_MONTHS, Y = first visible currency column.

**Detection:** Any chart where Y-axis renders a text column, or where two series differ by 1000x in scale.

**Phase:** Core chart builder phase. Build the type-filtered axis selector before the chart rendering.

---

## Moderate Pitfalls

### Pitfall 4: Recharts Component Swap Breaks Anomaly Integration

**What goes wrong:** The current `CollectionCurveChart` is deeply integrated with the anomaly system -- it reads `useAnomalyContext()`, matches batch anomalies to curve lines, applies red/amber stroke colors, and adjusts opacity. A new flexible chart component that doesn't wire up anomaly awareness loses this functionality silently. No error, just missing anomaly highlights.

**Prevention:**
1. Extract anomaly-chart integration into a reusable hook (or keep the existing `useCurveChartState` anomaly logic as a composable piece).
2. The new chart builder should accept an optional "anomaly overlay" config that maps series keys to anomaly status.
3. Keep collection curves as a preset that automatically enables anomaly integration, so existing behavior is preserved without user action.
4. Test by navigating to a partner with known anomalies and confirming highlights still appear.

**Phase:** Chart builder phase. When replacing CollectionCurveChart, verify anomaly integration first.

---

### Pitfall 5: Collection Curve Preset Regression

**What goes wrong:** Collection curves work perfectly today -- multi-line overlay, batch visibility toggles, average line, metric switch, view save/restore, anomaly highlighting, legend with show-all toggle. When replaced by a "flexible chart builder," some of this specialized behavior gets lost because the generic system doesn't account for it.

**Prevention:**
1. Keep collection curves as a first-class preset, not just "a line chart with certain columns selected." The preset should auto-configure: X = collection month (1-60), Y = recovery rate or dollars, series = one per batch, with the existing toggle/legend/anomaly behavior.
2. The `useCurveChartState` hook has 240 lines of battle-tested interaction logic. Don't rewrite it; wrap or compose it.
3. Create a test checklist of current curve behaviors before starting: metric toggle, solo mode, batch visibility, show-all, average line, anomaly coloring, view snapshot/restore. Verify each still works after the refactor.

**Phase:** Chart builder phase. Build the curve preset first as a "port" of existing behavior, then add flexible axes on top.

---

### Pitfall 6: Metabase SQL Import Runs Arbitrary Queries Against Snowflake

**What goes wrong:** The app accepts Metabase-generated SQL and executes it against Snowflake. A user pastes a query that references tables outside `agg_batch_performance_summary` or `master_accounts`, or includes DDL/DML statements. The app either errors confusingly or, worse, executes something unintended.

**Why it happens:** Metabase SQL can reference any table the Metabase user has access to. Your app only knows about 2 tables.

**Prevention:**
1. Do NOT execute imported SQL directly. Parse it to extract: source table, selected columns, WHERE filters, GROUP BY, ORDER BY, LIMIT.
2. Validate the source table is in your allowlist (`agg_batch_performance_summary`, `master_accounts`).
3. Validate selected columns against `ALLOWED_COLUMNS` (already exists in `src/lib/columns/config.ts`).
4. Reconstruct a sanitized query from the parsed components rather than passing through the raw SQL.
5. If the SQL references unknown tables or uses CTEs/subqueries/UDFs, reject with a clear message: "This query references tables not available in the Data Visualizer. Only batch performance and account data are supported."
6. The existing `ALLOWED_COLUMNS` Set and `ColumnConfig` system are the right foundation -- extend them, don't bypass them.

**Phase:** Metabase import phase. SQL parsing and validation is the first step before any query execution.

---

### Pitfall 7: Percentage Values Mismatched Between Metabase and App

**What goes wrong:** Metabase stores and displays percentages as 0-100 (e.g., 55%), but your Snowflake data and `formatPercentage()` function expect 0-1 range (0.55 = 55%). Imported Metabase queries that filter on percentage columns use 0-100 values, producing wrong filter results or charts showing 5500%.

**Prevention:**
1. When importing filters on percentage-type columns, check whether the value is > 1. If so, divide by 100 before applying.
2. Document this in the import UI: "Percentage values are stored as decimals (0.55 = 55%)."
3. Use `ColumnConfig.type === 'percentage'` to identify which columns need this normalization.

**Phase:** Metabase import phase. Add normalization during the filter translation step.

---

### Pitfall 8: Chart Builder State Bloats ViewSnapshot

**What goes wrong:** A flexible chart builder with multiple chart configurations (type, axes, series, colors, aggregations) significantly increases the size of `ViewSnapshot` objects stored in localStorage. With multiple saved views, each containing complex chart configs, localStorage approaches its 5MB limit.

**Prevention:**
1. Store chart configs compactly: use column keys (strings) not full column objects, omit default values.
2. Consider a `chartConfigs: ChartConfig[]` array (for multiple charts per view) rather than a single `chartState`.
3. But for v3.5 with 2-3 users and simple charts, this is unlikely to hit limits. Just be aware and don't store redundant data.
4. If adding multiple charts per view, set a reasonable limit (4-6 charts max).

**Phase:** Chart builder phase. Design the schema compactly from the start.

---

## Minor Pitfalls

### Pitfall 9: Recharts Type Switching Requires Component Swap, Not Prop Change

**What goes wrong:** Developer assumes switching from LineChart to BarChart is a prop change. In Recharts, each chart type is a separate component (LineChart, BarChart, ScatterChart) with different child components (Line vs Bar vs Scatter). Dynamic switching requires conditional rendering of entirely different component trees.

**Prevention:**
1. Build a `ChartRenderer` component that switches on `chartType` and renders the appropriate Recharts component tree.
2. Use Recharts' `ComposedChart` for mixed types (line + bar) if needed, but be aware it has its own API constraints.
3. Share common components (XAxis, YAxis, CartesianGrid, Tooltip) across chart types via a shared config.

**Phase:** Chart builder phase. Architectural decision at the start.

---

### Pitfall 10: MBQL Field IDs Are Meaningless Outside Metabase

**What goes wrong:** MBQL references fields by integer IDs (`[:field-id 42]`) that are internal to a specific Metabase instance's metadata catalog. Without access to that Metabase instance's API, there's no way to resolve ID 42 to a column name.

**Prevention:**
1. For MBQL import, require users to provide the "View SQL" output (which uses actual column names) rather than raw MBQL JSON.
2. If supporting MBQL JSON, attempt to infer column names from filter values or aggregation context, but treat field IDs as opaque and ask users to map them.
3. Alternatively, if you have access to the Metabase API, fetch the field metadata via `GET /api/field/:id`. But this adds a dependency on Metabase being accessible, which conflicts with the static-cache architecture.

**Phase:** Metabase import phase. Decide early whether to require SQL or support raw MBQL.

---

### Pitfall 11: Dynamic Imports of Chart Components Break SSR

**What goes wrong:** The existing chart is already dynamically imported with `ssr: false` (line 37-50 of data-display.tsx). New chart builder components must follow the same pattern. If a developer adds a new chart component with a regular import, Next.js SSR will fail because Recharts uses browser APIs.

**Prevention:**
1. All new chart components must use `dynamic(() => import(...), { ssr: false })`.
2. Consider creating a single `DynamicChartBuilder` entry point rather than multiple dynamic imports.

**Phase:** Chart builder phase. Use the existing pattern.

---

### Pitfall 12: Importing Metabase Questions vs. Native Queries

**What goes wrong:** Metabase has two query modes: "Simple/Custom Questions" (MBQL) and "Native Queries" (raw SQL). Users may not know which they're pasting. The import UI must handle both, or clearly distinguish.

**Prevention:**
1. Auto-detect the format: if the input is valid JSON with a `database` and `query` key containing `source-table`, it's MBQL. If it looks like SQL (starts with SELECT, WITH, etc.), treat as SQL.
2. Provide two input modes with a toggle: "Paste SQL" and "Paste Metabase JSON." Default to SQL since it's more natural for the Snowflake backend.
3. In Metabase, users can get the SQL for any question via "View the SQL" button -- guide users to this in the UI.

**Phase:** Metabase import phase. UX decision for the import dialog.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Chart builder: schema | #1 ChartViewState break destroys saved views | Discriminated union + migration layer FIRST |
| Chart builder: axis selection | #3 Nonsense charts from unguarded axes | Filter options by ColumnConfig.type |
| Chart builder: curve preset | #5 Regression of existing curve behavior | Port existing behavior as preset before adding flexibility |
| Chart builder: anomalies | #4 Silent loss of anomaly highlights | Wire anomaly context into new chart component |
| Chart builder: rendering | #9 Component swap needed per chart type | Use ChartRenderer switch or ComposedChart |
| Metabase: MBQL scope | #2 Parser scope creep | Hard limit on supported MBQL subset |
| Metabase: SQL safety | #6 Arbitrary query execution | Parse and reconstruct, never pass-through |
| Metabase: percentages | #7 Value range mismatch | Normalize on percentage-typed columns |
| Metabase: input format | #12 MBQL vs SQL confusion | Auto-detect + default to SQL |
| Metabase: field IDs | #10 MBQL field IDs unresolvable | Prefer SQL import, MBQL as secondary |

## Recommended Phase Order Based on Pitfalls

1. **Chart schema migration** -- Pitfall #1 must be resolved before any chart state changes ship. Extend `ChartViewState` with discriminated union and migration. Low risk, high importance.
2. **Chart builder with curve preset** -- Port existing collection curves as a preset (#5), wire anomaly integration (#4), then add flexible axis selection (#3). Ship the preset first to prevent regression.
3. **Metabase SQL import** -- SQL is the natural path (#2, #10). Parse, validate against ALLOWED_COLUMNS (#6), normalize percentages (#7). Lower complexity than MBQL.
4. **Metabase MBQL import (limited)** -- Only if SQL import proves insufficient. Limit to the subset defined in #2. Auto-detect format (#12).

## Sources

- [(Incomplete) MBQL Reference -- Metabase Wiki](https://github.com/metabase/metabase/wiki/(Incomplete)-MBQL-Reference) -- official, acknowledged incomplete
- [MBQL to SQL translation discussion](https://discourse.metabase.com/t/mbql-sql-translation/11752) -- community confirmation of complexity
- [MBQL schema sharing investigation](https://github.com/metabase/metabase/issues/12238) -- confirms field IDs are instance-specific
- [MBQL document structure issue](https://github.com/metabase/metabase/issues/2457) -- Metabase acknowledges documentation gaps
- Codebase: `src/lib/views/schema.ts` (Zod validation), `src/lib/views/types.ts` (ChartViewState), `src/lib/columns/config.ts` (ALLOWED_COLUMNS, ColumnConfig.type), `src/lib/formatting/numbers.ts` (percentage handling), `src/components/charts/collection-curve-chart.tsx` (anomaly integration), `src/components/charts/use-curve-chart-state.ts` (curve interaction logic), `src/lib/views/defaults.ts` (starter views with chartState)
