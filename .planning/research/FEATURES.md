# Feature Landscape: v3.5 Flexible Charts & Metabase Import

**Domain:** Flexible chart builder + Metabase query migration for debt collection batch analytics
**Researched:** 2026-04-15
**Overall confidence:** MEDIUM-HIGH (chart builder patterns well-established; Metabase MBQL import is niche but feasible given known schema)

---

## Pillar 1: Flexible Chart Builder

### Table Stakes

Features users expect from any chart builder in an analytics tool. Without these, the chart builder feels more restrictive than the hardcoded chart it replaces.

#### CB-TS-1: X-Axis Column Selector

| Attribute | Detail |
|-----------|--------|
| **What** | Dropdown to pick which column drives the X-axis. Options filtered to sensible types: categorical (PARTNER_NAME, BATCH, ACCOUNT_TYPE) for bar charts, numeric/date (BATCH_AGE_IN_MONTHS, any numeric metric) for line/scatter. |
| **Why expected** | The whole point of a chart builder is user-controlled axes. Without X-axis selection, it is just another hardcoded chart. |
| **Complexity** | Low |
| **Depends on** | Existing `COLUMN_CONFIGS` with type metadata (text, currency, percentage, count, number, date) |
| **Notes** | Pre-filter the column list by chart type: line/scatter need numeric X, bar charts accept categorical X. Default to BATCH_AGE_IN_MONTHS (matches existing collection curve). |

#### CB-TS-2: Y-Axis Column Selector (Single + Multi)

| Attribute | Detail |
|-----------|--------|
| **What** | Dropdown (or multi-select) for Y-axis columns. Must support at least 1 metric, ideally multiple for overlay comparison. Only numeric types eligible (currency, percentage, count, number). |
| **Why expected** | Y-axis selection is the other half of chart flexibility. Multi-Y enables "Total Placed vs Penetration Rate" comparisons that the hardcoded chart cannot do. |
| **Complexity** | Medium -- multi-Y requires dual Y-axis handling when mixing units (currency vs percentage). |
| **Depends on** | `COLUMN_CONFIGS` type metadata, Recharts `<YAxis yAxisId>` for dual-axis support |
| **Notes** | When Y columns have different units (e.g., currency + percentage), render two Y-axes (left/right). Recharts supports this natively with `yAxisId`. Limit to 2 distinct unit types to avoid visual chaos. |

#### CB-TS-3: Chart Type Selector (Line, Bar, Scatter)

| Attribute | Detail |
|-----------|--------|
| **What** | Toggle or dropdown to switch between line chart, bar chart, and scatter plot. The chart re-renders with the same data but different Recharts component (`<LineChart>`, `<BarChart>`, `<ScatterChart>`). |
| **Why expected** | Different data relationships call for different visual encodings. Trends need lines, distributions need bars, correlations need scatter. These three cover 95% of analytics use cases. |
| **Complexity** | Medium -- each chart type has different Recharts component APIs. Need a unified data adapter. |
| **Depends on** | Recharts (already in stack), shadcn `<ChartContainer>` (already in use) |
| **Notes** | Area charts are a visual variant of line charts and can be offered as a toggle on the line chart type rather than a separate type. Pie charts are intentionally excluded (see Anti-Features). |

#### CB-TS-4: Group-By / Color-By Dimension

| Attribute | Detail |
|-----------|--------|
| **What** | Optional selector to split data into series by a categorical column (e.g., color by PARTNER_NAME to see each partner as a separate line, or by ACCOUNT_TYPE to compare account types). |
| **Why expected** | Without grouping, every chart is a single series. Grouping is what makes charts insightful -- it answers "how does this metric differ across partners/batches?" |
| **Complexity** | Medium -- requires pivoting raw data by group key, generating one series per unique group value. |
| **Depends on** | Existing `pivotCurveData` pattern (already pivots by batch name), `CHART_COLORS` palette |
| **Notes** | Limit to one group dimension. Cap visible series at ~15 with a "show more" toggle (matches existing `showAllBatches` pattern). |

#### CB-TS-5: Collection Curves as a Preset

| Attribute | Detail |
|-----------|--------|
| **What** | Pre-configured chart preset that replicates the current `CollectionCurveChart` behavior: X = month since placement, Y = recovery rate or dollars, grouped by batch. One-click to load, fully editable after loading. |
| **Why expected** | The existing collection curve chart is the primary chart users know. Replacing it with a generic builder that requires manual setup every time would be a regression. Presets bridge familiarity with flexibility. |
| **Complexity** | Low -- it is just a saved configuration of the chart builder selections. |
| **Depends on** | CB-TS-1 through CB-TS-4 |
| **Notes** | Store presets as named `ChartBuilderState` objects. The collection curve preset should be the default when entering partner drill-down. Additional presets can be user-created (see Differentiators). |

#### CB-TS-6: Proper Axis Formatting

| Attribute | Detail |
|-----------|--------|
| **What** | Y-axis and tooltips auto-format based on column type: currency gets `$X,XXX` or `$Xk`, percentages get `X.X%`, counts get comma separation. X-axis formats categoricals as-is, numbers/dates appropriately. |
| **Why expected** | Raw numbers without formatting are unreadable. The existing chart already does this for recovery rate and dollars -- the flexible builder must match or exceed that quality for all 61 columns. |
| **Complexity** | Low -- existing `getFormatter()` in `src/lib/formatting/` already handles all column types. Reuse it. |
| **Depends on** | Existing formatting infrastructure (`getFormatter`, `isNumericType`) |
| **Notes** | The formatter lookup uses column `type` from `COLUMN_CONFIGS`. Tooltip should show the human-readable `label`, not the raw Snowflake column name. |

#### CB-TS-7: Chart State Persistence in Views

| Attribute | Detail |
|-----------|--------|
| **What** | The chart builder configuration (X, Y, chart type, group-by, filters) persists when the user saves a view, and restores when they load that view. |
| **Why expected** | The existing `ChartViewState` already persists metric, hidden batches, showAverage, showAllBatches. Users will expect the new builder's state to persist the same way. Losing chart config on view switch would be confusing. |
| **Complexity** | Low-Medium -- requires extending `ChartViewState` type and `viewSnapshotSchema` Zod schema. |
| **Depends on** | Existing view persistence system (`ViewSnapshot`, `savedViewSchema`, `viewSnapshotSchema`), existing `chartSnapshotRef` / `chartLoadRef` pattern |
| **Notes** | Extend `ChartViewState` to include `xAxis`, `yAxes`, `chartType`, `groupBy`, and retain backward compatibility with existing saved views (old `metric`/`hiddenBatches` fields map to the collection curve preset). |

### Differentiators

Features that set the chart builder apart from basic implementations. Not expected, but significantly increase value.

#### CB-D-1: User-Saveable Chart Presets

| Attribute | Detail |
|-----------|--------|
| **What** | Users can name and save their own chart configurations as presets alongside the built-in Collection Curves preset. Accessible from a dropdown. |
| **Value** | Eliminates repetitive setup for frequently used charts (e.g., "Penetration Rate by Partner", "SMS Engagement by Batch Age"). |
| **Complexity** | Low -- reuses existing saved views localStorage pattern. |
| **Notes** | Store alongside view snapshots or as a separate localStorage key. Small team (2-3 users) means localStorage is fine. |

#### CB-D-2: Smart Column Suggestions

| Attribute | Detail |
|-----------|--------|
| **What** | When user selects an X-axis column, the Y-axis dropdown surfaces likely-useful columns first (e.g., selecting BATCH_AGE_IN_MONTHS suggests collection-related Y columns; selecting PARTNER_NAME suggests aggregate metrics). |
| **Value** | Reduces cognitive load of scanning 61 columns. Makes the builder feel intelligent rather than mechanical. |
| **Complexity** | Medium -- requires column affinity mapping (can be hardcoded based on `COLUMN_CONFIGS` groups). |
| **Notes** | Use the existing column group definitions in `src/lib/columns/groups.ts` to cluster related columns. |

#### CB-D-3: Inline Trend/Reference Lines

| Attribute | Detail |
|-----------|--------|
| **What** | Optional reference lines on charts: partner average, portfolio average, or custom threshold value. Toggleable like the existing "Show Average" on collection curves. |
| **Value** | Context lines transform charts from "here is data" to "here is data and here is what normal looks like." |
| **Complexity** | Low -- Recharts `<ReferenceLine>` component. Already implemented for the average line in collection curves. |
| **Notes** | Reuse the existing `addAverageSeries` pattern. For portfolio-level references, compute from existing `crossPartnerData`. |

#### CB-D-4: Chart Export (PNG/SVG)

| Attribute | Detail |
|-----------|--------|
| **What** | One-click export of the current chart as PNG or SVG for pasting into emails/reports. |
| **Value** | The partnerships team shares insights with stakeholders who do not have app access. Chart screenshots are manual and low-quality. |
| **Complexity** | Low -- `html-to-image` or `dom-to-image-more` library captures the chart container. Recharts also supports `toSVGElement()` on some components. |
| **Notes** | Add a small download icon button in the chart toolbar. |

### Anti-Features

Features to explicitly NOT build for v3.5.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Pie/donut charts | Pie charts are universally criticized for analytics (hard to compare slices, misleading for >5 categories). The data here is batch-level with 20+ groups. | Bar chart handles the same use case better. Offer horizontal bar for categorical comparisons. |
| Drag-and-drop chart builder (Tableau-style) | Massive UX complexity for 2-3 users. Overkill when dropdowns accomplish the same selection with less code. | Dropdown selectors for X, Y, group-by. Simple, direct, fast. |
| Free-form SQL chart queries | Already explicitly out of scope (text-to-SQL risk). The chart builder operates on the existing loaded dataset, not arbitrary queries. | Chart builder works on data already in the table/view. Metabase import handles new queries. |
| Real-time chart updates | Data refreshes on page load or manual refresh. No WebSocket streaming needed for batch data that changes daily. | Keep existing React Query cache + manual refresh. |
| 3D charts | Visual noise, no analytical value. | Stick to 2D. |
| Dashboard grid with multiple charts | v4 feature (documented in Out of Scope). v3.5 is one chart at a time, editable. | Single chart panel with flexible configuration. |

---

## Pillar 2: Metabase Query Import

### Table Stakes

Features needed for Metabase import to be usable rather than a novelty.

#### MI-TS-1: Paste MBQL JSON Import

| Attribute | Detail |
|-----------|--------|
| **What** | A modal or panel where users paste the JSON `dataset_query` from a Metabase question. The app parses the MBQL structure and extracts: source table, selected fields, filters, aggregations, breakouts, and sorting. Maps these to the app's known columns and filter system. |
| **Why expected** | MBQL JSON is how Metabase stores every query-builder question. Users can copy it from Metabase's API response or browser devtools. It is the canonical format for structured Metabase queries. |
| **Complexity** | High -- MBQL uses integer field IDs that must be mapped to column names. The app needs a field-ID-to-column-name mapping table, or must accept MBQL that has been annotated with field names. |
| **Depends on** | Understanding of MBQL structure (source-table, breakout, aggregation, filter, fields, order-by) |
| **Notes** | MBQL uses `[:field <id> {:base-type :type/Integer}]` references. Since we only have two tables (batch summary + master accounts), the mapping is finite and manageable. Recommend requiring users to include the field metadata (available from Metabase API `/api/table/:id/fields`) or building a static mapping from the known Snowflake schema. MBQL 4 (legacy) format should be the target since it is simpler and available via `?legacy-mbql=true` API parameter. |

#### MI-TS-2: Paste SQL Import

| Attribute | Detail |
|-----------|--------|
| **What** | Accept raw SQL (from Metabase's "Native Query" mode or any SQL editor) and extract column references, WHERE clauses, GROUP BY, and ORDER BY to map to the app's filter/sort/group system. |
| **Why expected** | Many Metabase questions are written as native SQL rather than using the query builder. SQL is also the lingua franca -- users may have queries from other tools. |
| **Complexity** | High -- SQL parsing is notoriously difficult to do correctly. Full SQL parsing requires a parser library. |
| **Depends on** | SQL parsing capability |
| **Notes** | Do NOT build a full SQL parser. Instead, use regex-based extraction for the common patterns: `SELECT columns FROM table WHERE conditions ORDER BY columns`. Support the 80% case (simple SELECT with WHERE/ORDER BY) and show a clear error for queries too complex to parse. Alternatively, use a lightweight SQL parser like `node-sql-parser` (npm package with 1M+ weekly downloads, supports Snowflake dialect). |

#### MI-TS-3: Translation Preview

| Attribute | Detail |
|-----------|--------|
| **What** | After parsing MBQL or SQL, show the user what will be applied: "Columns: X, Y, Z. Filters: Partner = Affirm. Sort: Total Placed DESC." with a confirm/edit step before applying. |
| **Why expected** | Blind import is scary. Users need to verify the translation before it changes their view. Every import tool shows a preview. |
| **Complexity** | Low -- it is a summary display of the parsed result. |
| **Depends on** | MI-TS-1 or MI-TS-2 parser output |
| **Notes** | Show matched columns in green, unmatched/skipped columns in yellow with explanation. This builds trust in the import process. |

#### MI-TS-4: Apply as View Configuration

| Attribute | Detail |
|-----------|--------|
| **What** | The parsed query applies to the existing app state: sets column visibility, filters, sorting, and optionally chart configuration. Result is a standard ViewSnapshot that can be saved. |
| **Why expected** | The import must do something useful. Parsing without applying is a dead end. Applying as a view integrates seamlessly with the existing saved views system. |
| **Complexity** | Medium -- mapping parsed columns to `COLUMN_CONFIGS` keys, parsed filters to the app's filter format, parsed sorting to TanStack `SortingState`. |
| **Depends on** | MI-TS-1/MI-TS-2 output, existing view system (`ViewSnapshot`, `SavedView`) |
| **Notes** | Columns that exist in the query but not in `COLUMN_CONFIGS` are silently skipped with a warning in the preview (MI-TS-3). This handles queries referencing tables/columns outside the app's scope. |

### Differentiators

#### MI-D-1: Metabase Question URL Import

| Attribute | Detail |
|-----------|--------|
| **What** | Instead of pasting JSON, user pastes a Metabase question URL (e.g., `https://metabase.bounce.com/question/42`). The app calls Metabase API to fetch the question's `dataset_query` automatically. |
| **Value** | Much lower friction than copying JSON from devtools. Paste URL, see preview, confirm. |
| **Complexity** | Medium -- requires Metabase API credentials (API key or session token) stored server-side. Network request to external Metabase instance. |
| **Notes** | Requires `METABASE_URL` and `METABASE_API_KEY` env vars. API call: `GET /api/card/:id` returns `dataset_query`. This is a stretch goal -- paste JSON works without any Metabase connectivity. |

#### MI-D-2: Saved Import Mappings

| Attribute | Detail |
|-----------|--------|
| **What** | When a user imports a Metabase query, save the original query alongside the translated view so they can re-import or compare later. |
| **Value** | Creates an audit trail of "this view came from Metabase question #42" and enables re-sync if the Metabase query changes. |
| **Complexity** | Low -- extend `SavedView` with an optional `sourceQuery` field. |
| **Notes** | Store the raw MBQL/SQL string and a timestamp. |

#### MI-D-3: Column Auto-Mapping with Fuzzy Match

| Attribute | Detail |
|-----------|--------|
| **What** | When SQL references columns by slightly different names (e.g., `total_amt_placed` vs `TOTAL_AMOUNT_PLACED`), use fuzzy string matching to suggest the correct app column. |
| **Value** | Handles the common case where SQL column aliases differ from Snowflake column names. Reduces manual fixup. |
| **Complexity** | Low-Medium -- Levenshtein distance or simple normalization (lowercase, strip underscores) on the 61 known column names. |
| **Notes** | Show fuzzy matches as suggestions in the preview, not auto-applied. Let the user confirm. |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Execute imported SQL against Snowflake | Security risk (SQL injection), and the app already has a fixed schema. Imported queries should configure the view, not run arbitrary SQL. | Parse the SQL to extract intent (columns, filters, sorts), apply as view config on the existing dataset. |
| Full Metabase dashboard import | Dashboards contain layout, multiple cards, parameters, custom styling. Way too complex for v3.5. | Import individual questions (cards) one at a time. |
| Bi-directional sync with Metabase | Writing back to Metabase's API to update questions. The app is a migration destination, not a sync partner. | One-way import only. |
| MBQL 5 support | MBQL 5 uses UUIDs and complex nested structures. Metabase API supports `?legacy-mbql=true` for MBQL 4, which is dramatically simpler. | Target MBQL 4 (legacy) format only. Document that users should export with `?legacy-mbql=true`. |

---

## Feature Dependencies

```
CB-TS-1 (X-Axis Selector) ─┐
CB-TS-2 (Y-Axis Selector) ─┼─→ CB-TS-3 (Chart Type) ─→ CB-TS-5 (Presets) ─→ CB-D-1 (User Presets)
CB-TS-4 (Group-By)        ─┘         │
                                      ├─→ CB-TS-6 (Axis Formatting) [parallel, uses existing formatters]
                                      ├─→ CB-TS-7 (View Persistence) [after state shape stabilizes]
                                      └─→ CB-D-3 (Reference Lines) [after basic charts work]

MI-TS-1 (MBQL Import) ─┐
MI-TS-2 (SQL Import)   ─┼─→ MI-TS-3 (Preview) ─→ MI-TS-4 (Apply as View)
                        │
                        └─→ MI-D-1 (URL Import) [stretch, needs Metabase API creds]

CB-TS-7 (View Persistence) ←── MI-TS-4 (Apply as View) [import produces a ViewSnapshot]
```

---

## MVP Recommendation

### Phase 1: Chart Builder Core (build first)

Prioritize:
1. **CB-TS-1** X-Axis Selector -- the foundation
2. **CB-TS-2** Y-Axis Selector -- completes the builder
3. **CB-TS-3** Chart Type Selector -- visual variety
4. **CB-TS-4** Group-By Dimension -- makes charts insightful
5. **CB-TS-5** Collection Curves Preset -- backward compatibility, day-one utility
6. **CB-TS-6** Axis Formatting -- polish (reuses existing code)

Defer to Phase 1b:
- **CB-TS-7** View Persistence -- wait for chart state shape to stabilize
- **CB-D-2** Smart Suggestions -- nice-to-have, not blocking
- **CB-D-4** Chart Export -- small scope, can slot in anytime

### Phase 2: Metabase Import (build second)

Prioritize:
1. **MI-TS-2** SQL Import -- higher value, SQL is universal, most Metabase "native queries" are SQL
2. **MI-TS-3** Translation Preview -- trust-building step
3. **MI-TS-4** Apply as View -- makes import useful
4. **MI-TS-1** MBQL Import -- after SQL works, MBQL is the structured variant

Defer:
- **MI-D-1** URL Import -- needs Metabase API creds, can add later
- **MI-D-3** Fuzzy Column Matching -- only needed if column name mismatches prove common

**Rationale:** Chart builder first because it has immediate daily value for the 2-3 users. Metabase import second because it is a migration tool (used occasionally when porting existing Metabase questions), not a daily-use feature. SQL import before MBQL because SQL is more universal and the team already writes SQL for Metabase native queries.

---

## Complexity Summary

| Feature | Complexity | New Dependencies | Risk |
|---------|-----------|-----------------|------|
| Chart builder (all table stakes) | Medium | None (Recharts already in stack) | Low -- well-understood patterns |
| Chart presets | Low | None | Low |
| Chart view persistence | Low-Medium | Zod schema extension | Low -- extends existing pattern |
| MBQL JSON parser | High | None, but requires field-ID mapping | Medium -- MBQL format is underdocumented |
| SQL parser | High | `node-sql-parser` (new dependency) | Medium -- SQL edge cases |
| Translation preview | Low | None | Low |
| Apply as view config | Medium | None | Low -- maps to existing ViewSnapshot |

---

## Sources

- [Metabase MBQL Reference (GitHub Wiki)](https://github.com/metabase/metabase/wiki/(Incomplete)-MBQL-Reference) -- MBQL structure, field references, query clauses
- [Metabase API Documentation](https://www.metabase.com/docs/latest/api) -- Card endpoints, export formats
- [Metabase API Changelog](https://www.metabase.com/docs/latest/developers-guide/api-changelog) -- MBQL 5 vs MBQL 4, legacy-mbql parameter
- [NN/g: Choosing Chart Types](https://www.nngroup.com/articles/choosing-chart-types/) -- Chart type selection UX guidance
- [Pencil & Paper: Dashboard Design UX Patterns](https://www.pencilandpaper.io/articles/ux-pattern-analysis-data-dashboards) -- Analytics dashboard best practices
- Existing codebase: `COLUMN_CONFIGS` (61 columns with type metadata), `CollectionCurveChart`, `pivotCurveData`, `ChartViewState`, `ViewSnapshot`
