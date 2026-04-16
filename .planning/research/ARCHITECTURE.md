# Architecture Patterns

**Domain:** Flexible chart builder + Metabase query import for existing Next.js analytics app (v3.5)
**Researched:** 2026-04-15

## Current Architecture (Baseline for v3.5)

```
Browser (React 19)
  |
  +-- useData() -----> GET /api/data -----> Snowflake (agg_batch_performance_summary)
  |                                          or static cache fallback
  +-- useAccountData() -> GET /api/accounts -> Snowflake (master_accounts)
  |
  +-- usePartnerStats(partnerName, allRows)
  |     |-- computeKpis()       (lib/computation/compute-kpis.ts)
  |     |-- computeNorms()      (lib/computation/compute-norms.ts)
  |     |-- reshapeCurves()     (lib/computation/reshape-curves.ts)  [wide-to-long]
  |     |-- computeTrending()   (lib/computation/compute-trending.ts)
  |
  +-- AnomalyProvider (React Context) -- z-score anomaly flags
  +-- PartnerNormsProvider (React Context) -- deviation coloring
  +-- CrossPartnerProvider (React Context) -- percentile rankings
  |
  +-- DataDisplay (orchestrator)
        |-- KpiSummaryCards (partner level)
        |-- CollectionCurveChart (partner level, dynamic import)
        |     |-- useCurveChartState (metric toggle, batch visibility, solo, anomaly coloring)
        |     |-- pivotCurveData (BatchCurve[] -> Recharts flat format)
        |     |-- CurveLegend + CurveTooltip
        |-- DataTable (TanStack Table + virtual scrolling)
        |-- CrossPartnerTrajectoryChart (root level)
        |-- PartnerComparisonMatrix (root level)
```

**Key characteristics relevant to v3.5:**
- All 477 batch rows (61 columns) fetched once, cached client-side via React Query
- `CollectionCurveChart` is hardcoded to collection curves only (recovery rate % or dollars collected vs months since placement)
- `ChartViewState` persists only `{ metric, hiddenBatches, showAverage, showAllBatches }` -- tightly coupled to curve semantics
- `COLUMN_CONFIGS` in `lib/columns/config.ts` provides complete metadata for all 61 columns: key, label, type (text/currency/percentage/count/date/number), identity flag
- `ALLOWED_COLUMNS` set prevents SQL injection in the API route
- Views are persisted in localStorage via `SavedView` with `ViewSnapshot` containing `chartState?: ChartViewState`
- Zod schema validates saved views on parse with graceful failure

## Recommended Architecture (v3.5)

Two loosely-coupled feature systems sharing one integration surface: the column metadata layer (`COLUMN_CONFIGS` + `ColumnConfig` type).

```
                          Existing System (unchanged)
                          ===========================
  Snowflake --> API Route --> React Query --> usePartnerStats --> computation hooks
                  |                               |
                  |                          AnomalyProvider, NormsProvider, etc.
                  |
                  v
            COLUMN_CONFIGS (61 cols with key, label, type)
                  |
                  |         New Systems (v3.5)
                  |         =================
                  v
        +------------------+          +----------------------+
        | Chart Definition |          | Metabase Import      |
        | (ChartDefinition |          | (MBQL/SQL parser)    |
        |  type + builder  |          |                      |
        |  UI)             |          | Outputs:             |
        |                  |          |  - ChartDefinition   |
        | Consumes:        |          |  - Column filters    |
        |  - column keys   |          |  - Dimension filters |
        |  - column types  |          +----------------------+
        |  - raw data rows |
        +------------------+
                  |
                  v
        +------------------+
        | UnifiedChart     |
        | (renders any     |
        |  chart type from |
        |  ChartDefinition)|
        +------------------+
```

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| `ChartDefinition` (type) | Serializable description of what to chart | ChartBuilder, UnifiedChart, ViewSnapshot, MetabaseImporter |
| `ChartBuilder` (UI) | Axis/type picker, collection curve preset button | COLUMN_CONFIGS, current data rows, UnifiedChart |
| `UnifiedChart` (renderer) | Renders LineChart/BarChart/ScatterChart from ChartDefinition | Recharts, data rows, ChartContainer (shadcn) |
| `useChartState` (hook) | Manages ChartDefinition + interaction state (hover, solo, toggles) | ChartBuilder, UnifiedChart, ViewSnapshot |
| `MetabaseImporter` (UI + parser) | Accepts MBQL JSON or SQL text, produces ChartDefinition + filters | ChartDefinition type, COLUMN_CONFIGS, ALLOWED_COLUMNS |
| `mbql-translator` (lib) | Pure function: MBQL JSON -> MetabaseQuery intermediate repr | COLUMN_CONFIGS |
| `sql-extractor` (lib) | Pure function: Metabase SQL string -> column/filter extraction | ALLOWED_COLUMNS |

### Data Flow

**Current flow (unchanged):**
```
Snowflake -> /api/data (GET) -> React Query cache -> usePartnerStats -> computation hooks -> components
```

**New chart flow:**
```
User picks axes in ChartBuilder
  -> produces ChartDefinition { xAxis, yAxis[], chartType, groupBy?, preset? }
  -> UnifiedChart reads raw data rows from React Query cache
  -> pivots data in-memory based on ChartDefinition (new pivot-generic.ts)
  -> renders Recharts <LineChart> | <BarChart> | <ScatterChart>
```

**Metabase import flow:**
```
User pastes MBQL JSON or SQL into MetabaseImporter dialog
  -> parser extracts: source columns, aggregation, groupBy, filters, ordering
  -> field-mapper maps Metabase field references to COLUMN_CONFIGS keys
  -> outputs: ChartDefinition (if chartable) + columnFilters + dimensionFilters
  -> auto-applies to current view (table filters + chart config)
  -> unmapped fields surfaced as warnings, not errors
```

**Critical insight: No new API routes needed.** Both features operate on data already fetched. The existing `/api/data` route returns all 61 columns. Chart axis selection and Metabase import both work client-side against the cached dataset.

## New Types

### ChartDefinition (replaces ChartViewState)

```typescript
/** Serializable chart configuration -- persisted in SavedView.snapshot */
interface ChartDefinition {
  /** Chart type */
  chartType: 'line' | 'bar' | 'scatter';

  /** Column key for X axis (e.g. 'BATCH_AGE_IN_MONTHS') */
  xAxis: string;

  /** Column keys for Y axis (supports multi-series) */
  yAxis: string[];

  /** Optional: group data by this column (e.g. 'PARTNER_NAME' for per-partner lines) */
  groupBy?: string;

  /** Y-axis formatting hint (inferred from column type but overridable) */
  yAxisFormat?: 'currency' | 'percentage' | 'count' | 'number';

  /** Whether to show average/reference line */
  showAverage?: boolean;

  /** Preset identifier -- 'collection-curves' routes to existing CollectionCurveChart */
  preset?: 'collection-curves' | 'custom';

  /** Hidden series names (batch names or group values) */
  hiddenSeries?: string[];

  /** Show all series vs default limit */
  showAllSeries?: boolean;
}
```

### MetabaseQuery (intermediate representation)

```typescript
/** Parsed representation of a Metabase query (MBQL or extracted from SQL) */
interface MetabaseQuery {
  /** Source format that was imported */
  source: 'mbql' | 'sql';

  /** Columns referenced (mapped to COLUMN_CONFIGS keys) */
  columns: string[];

  /** Aggregation operations */
  aggregations: Array<{
    fn: 'count' | 'sum' | 'avg' | 'min' | 'max' | 'distinct';
    column?: string;
  }>;

  /** Group-by columns */
  breakout: string[];

  /** Filter conditions */
  filters: Array<{
    column: string;
    operator: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'between' | 'contains';
    value: unknown;
  }>;

  /** Sort order */
  orderBy: Array<{ column: string; direction: 'asc' | 'desc' }>;

  /** Row limit */
  limit?: number;

  /** Columns that could NOT be mapped (user needs to resolve) */
  unmappedFields: string[];

  /** Warnings about translation limitations */
  warnings: string[];
}
```

## Integration Points (Existing Code -> New Code)

### 1. ViewSnapshot.chartState: ChartViewState -> ChartDefinition

**File:** `src/lib/views/types.ts`
**Change:** Replace `ChartViewState` with `ChartDefinition`. This is the core type change.

```typescript
// BEFORE (current)
chartState?: ChartViewState;  // { metric, hiddenBatches, showAverage, showAllBatches }

// AFTER
chartState?: ChartDefinition; // { chartType, xAxis, yAxis[], groupBy?, preset?, ... }
```

**Migration:** Write a `migrateChartViewState(old: ChartViewState): ChartDefinition` function that converts existing saved views:
- `metric: 'recoveryRate'` -> `preset: 'collection-curves', chartType: 'line', xAxis: 'BATCH_AGE_IN_MONTHS', yAxis: ['recoveryRate']`
- `metric: 'amount'` -> same but `yAxis: ['amount']`
- `hiddenBatches` -> `hiddenSeries`
- `showAverage` / `showAllBatches` -> `showAverage` / `showAllSeries`

### 2. viewSnapshotSchema (Zod)

**File:** `src/lib/views/schema.ts`
**Change:** Update `chartState` schema to validate `ChartDefinition` shape. Use Zod `.union()` with `.transform()` to accept both old `ChartViewState` and new `ChartDefinition` format, auto-migrating old format on parse.

### 3. CollectionCurveChart stays intact

**File:** `src/components/charts/collection-curve-chart.tsx` (322 lines)
**Change:** None. Keep exactly as-is. The chart area in `data-display.tsx` switches between `CollectionCurveChart` and `UnifiedChart` based on `ChartDefinition.preset`.

Do NOT delete `CollectionCurveChart` or `useCurveChartState`. The collection curve preset has complex domain logic:
- Batch sorting by ageInMonths (newest first)
- Age-based X axis truncation (young batches stop at their actual age)
- Anomaly coloring (red/amber for flagged batches via `getAnomalyLineColor`)
- Recovery rate calculation (amount / totalPlaced * 100)
- Batch-specific legend with visibility toggles
- Snapshot/restore for view persistence

This is 300+ lines of domain-specific charting that should NOT be generalized.

### 4. data-display.tsx chart rendering

**File:** `src/components/data-display.tsx`
**Change:** The chart section currently unconditionally renders `CollectionCurveChart`. Add conditional:

```typescript
// Pseudocode for the chart area:
if (!chartDef || chartDef.preset === 'collection-curves') {
  // Existing behavior, backward compatible
  return <CollectionCurveChart curves={curves} ... />;
} else {
  // New custom chart
  return <UnifiedChart definition={chartDef} data={filteredRows} />;
}
```

### 5. ChartBuilder UI in chart header

**File:** New `src/components/charts/chart-builder.tsx`
**Integration:** Replaces the current "Recovery Rate % / Dollars Collected" toggle buttons when in custom mode. Provides:
- Chart type selector (line/bar/scatter icons)
- X-axis dropdown (populated from COLUMN_CONFIGS, any type)
- Y-axis multi-select (populated from COLUMN_CONFIGS, numeric types)
- GroupBy dropdown (text columns: PARTNER_NAME, ACCOUNT_TYPE, BATCH)
- "Collection Curves" preset button (returns to the specialized chart)

### 6. MetabaseImporter dialog

**File:** New `src/components/import/metabase-importer.tsx`
**Integration:** Accessible from sidebar or command palette. Dialog with:
- Tab for MBQL JSON (textarea + paste)
- Tab for SQL (textarea + paste)
- Parse button -> preview panel showing: mapped columns, filters, warnings
- Apply button -> sets `ChartDefinition` + column filters + dimension filters on current view
- Cancel button -> dismiss without changes

### 7. COLUMN_CONFIGS as the axis registry (no changes needed)

**File:** `src/lib/columns/config.ts` (61 columns, unchanged)
**Integration:** The existing `ColumnConfig.type` field drives:
- **X-axis candidates:** All columns (text = categorical axis, numeric = continuous axis)
- **Y-axis candidates:** `currency`, `percentage`, `count`, `number` types only
- **Y-axis formatting:** `currency` -> `$` prefix, `percentage` -> `%` suffix, etc.
- **Metabase field mapping:** Column labels and keys used for fuzzy matching against Metabase field names

## New Files

| File | Type | Purpose |
|------|------|---------|
| `src/lib/charts/types.ts` | Type | `ChartDefinition` and related types |
| `src/lib/charts/pivot-generic.ts` | Lib | Generic data pivot for any ChartDefinition (handles groupBy, multi-Y, categorical X) |
| `src/lib/charts/presets.ts` | Lib | Preset ChartDefinitions (collection curves as default) |
| `src/lib/charts/format-axis.ts` | Lib | Y-axis tick formatter based on column type |
| `src/components/charts/unified-chart.tsx` | Component | Renders LineChart/BarChart/ScatterChart from ChartDefinition |
| `src/components/charts/chart-builder.tsx` | Component | Axis picker, type selector, preset button |
| `src/components/charts/use-chart-state.ts` | Hook | Manages ChartDefinition + generic interaction state |
| `src/lib/metabase/types.ts` | Type | `MetabaseQuery` intermediate representation |
| `src/lib/metabase/mbql-translator.ts` | Lib | MBQL JSON -> MetabaseQuery (handles source-table, filter, aggregation, breakout, fields, order-by, limit) |
| `src/lib/metabase/sql-extractor.ts` | Lib | SQL string -> MetabaseQuery (regex-based SELECT/FROM/WHERE/GROUP BY/ORDER BY extraction) |
| `src/lib/metabase/field-mapper.ts` | Lib | Maps Metabase field IDs/names -> COLUMN_CONFIGS keys (exact match + fuzzy fallback) |
| `src/components/import/metabase-importer.tsx` | Component | Import dialog with MBQL/SQL tabs, preview, apply |
| `src/lib/views/migrate-chart-state.ts` | Lib | ChartViewState -> ChartDefinition migration for backward compat |

## Modified Files

| File | Change | Risk |
|------|--------|------|
| `src/lib/views/types.ts` | Replace `ChartViewState` with `ChartDefinition` in `ViewSnapshot` | LOW -- add migration function |
| `src/lib/views/schema.ts` | Update Zod schema with union + transform for backward compat | LOW |
| `src/components/data-display.tsx` | Conditional chart rendering (preset vs custom) + chart builder mount | LOW -- additive change |
| `src/components/layout/app-sidebar.tsx` | Add Metabase Import entry to sidebar | LOW -- additive |
| `src/components/charts/use-curve-chart-state.ts` | No changes needed | NONE |
| `src/components/charts/collection-curve-chart.tsx` | No changes needed | NONE |

## Patterns to Follow

### Pattern 1: ChartDefinition as Single Source of Truth
**What:** All chart rendering flows through a `ChartDefinition` object. The builder produces it, views persist it, the renderer consumes it.
**When:** Always -- every chart in the system.
**Example:**
```typescript
// ChartBuilder produces:
const def: ChartDefinition = {
  chartType: 'bar',
  xAxis: 'PARTNER_NAME',
  yAxis: ['TOTAL_COLLECTED_LIFE_TIME', 'TOTAL_AMOUNT_PLACED'],
  yAxisFormat: 'currency',
  preset: 'custom',
};

// UnifiedChart consumes:
<UnifiedChart definition={def} data={rows} />
```

### Pattern 2: Preset Passthrough for Domain-Specific Charts
**What:** Collection curves have specialized logic. Instead of generalizing this into the chart builder, keep it as a preset that renders the existing `CollectionCurveChart`.
**When:** `ChartDefinition.preset === 'collection-curves'` or `chartDef` is undefined (backward compat).
**Why:** 300+ lines of domain logic (batch sorting, age truncation, anomaly coloring, recovery rate calc) that would degrade if forced through a generic renderer.

### Pattern 3: Column Type as Axis Constraint
**What:** Use `ColumnConfig.type` to constrain axis dropdowns.
**When:** Populating ChartBuilder dropdowns.
**Example:**
```typescript
const numericTypes = new Set(['currency', 'percentage', 'count', 'number']);
const yAxisOptions = COLUMN_CONFIGS.filter(c => numericTypes.has(c.type));
const xAxisOptions = COLUMN_CONFIGS; // any column can be X axis
```

### Pattern 4: Metabase Import as View Configuration (Not Query Execution)
**What:** The importer does NOT execute queries against Snowflake. It translates a Metabase query into view configuration (column visibility, filters, chart definition) applied to the already-fetched dataset.
**When:** Always. The app operates on a fixed 477-row dataset.
**Why:** Executing arbitrary SQL would require a dangerous new API endpoint. The dataset is small and pre-fetched. Import says "show these columns, filter to these values, chart this way."

### Pattern 5: Graceful Degradation for Unmapped Fields
**What:** When a Metabase query references fields not in COLUMN_CONFIGS, show warnings, not errors. Apply what maps, flag the rest.
**When:** MBQL field IDs or SQL column names that do not match the 61 known columns.
**Example:**
```typescript
const result = translateMBQL(mbqlJson);
if (result.unmappedFields.length > 0) {
  toast.warning(`${result.unmappedFields.length} fields could not be mapped`);
}
// Still apply the mapped portions
```

### Pattern 6: MBQL Translation via Operator Map
**What:** Map MBQL operators to the app's filter/aggregation system using a lookup table, not a general-purpose parser.
**When:** Translating MBQL JSON.
**Why:** MBQL has a finite set of operators relevant to this dataset. A lookup table is simpler, more debuggable, and sufficient for the 61-column schema.
**Example:**
```typescript
const MBQL_FILTER_OPS: Record<string, MetabaseQuery['filters'][0]['operator']> = {
  '=': 'eq', '!=': 'neq', '>': 'gt', '<': 'lt',
  '>=': 'gte', '<=': 'lte', 'between': 'between', 'contains': 'contains',
};
const MBQL_AGG_OPS: Record<string, MetabaseQuery['aggregations'][0]['fn']> = {
  'count': 'count', 'sum': 'sum', 'avg': 'avg',
  'min': 'min', 'max': 'max', 'distinct': 'distinct',
};
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Generalizing CollectionCurveChart into UnifiedChart
**What:** Trying to make the collection curve chart "just another chart type" in the generic system.
**Why bad:** Collection curves have unique data reshaping (wide-to-long via `reshapeCurves`), batch-age X axis, anomaly coloring via `getAnomalyLineColor`, recovery rate vs dollar toggle, and batch-specific legend with per-batch visibility. Forcing through a generic renderer either loses features or bloats the generic system.
**Instead:** Keep `CollectionCurveChart` as-is. The chart area switches between it and `UnifiedChart` based on the preset field.

### Anti-Pattern 2: New API Endpoint for Metabase SQL Execution
**What:** Creating a `/api/metabase-query` route that executes imported SQL directly against Snowflake.
**Why bad:** SQL injection risk, arbitrary query execution, circumvents ALLOWED_COLUMNS, could scan any table. Violates the read-only constraint on known tables.
**Instead:** Parse SQL client-side to extract columns/filters, apply as view configuration against existing dataset.

### Anti-Pattern 3: Separate Chart State Hooks Per Chart Type
**What:** Having `useCurveChartState`, `useBarChartState`, `useScatterChartState` etc.
**Why bad:** Duplicated interaction patterns (hover, toggle, series visibility).
**Instead:** One `useChartState(chartDef)` for generic charts. `useCurveChartState` remains only for the collection-curves preset.

### Anti-Pattern 4: Breaking Saved View Compatibility
**What:** Changing `ViewSnapshot.chartState` type without migration, corrupting existing localStorage views.
**Why bad:** Users lose their 3 default views (Financial Overview, Outreach Performance, New Batches) plus any custom views.
**Instead:** Zod `.union()` detects old shape, `.transform()` runs `migrateChartViewState()`. Old views auto-upgrade on next load.

### Anti-Pattern 5: Building a Full MBQL Parser
**What:** Implementing a complete MBQL specification including joins, nested queries, expressions, temporal bucketing.
**Why bad:** Massive scope. The app has one table (61 columns). Users are pasting simple Metabase questions, not building complex multi-table queries.
**Instead:** Support the subset of MBQL that maps to the known schema: source-table, basic filters (=, >, <, between, contains), simple aggregations (count, sum, avg), breakout on text columns, order-by, limit. Flag unsupported clauses as warnings.

## Build Order (Dependency-Aware)

### Phase 1: Foundation Types + Generic Pivot
1. `src/lib/charts/types.ts` -- ChartDefinition, related types
2. `src/lib/charts/pivot-generic.ts` -- data pivot for any ChartDefinition (groupBy, multi-Y, categorical X)
3. `src/lib/charts/presets.ts` -- collection-curves preset definition
4. `src/lib/charts/format-axis.ts` -- Y-axis formatters from column type

### Phase 2: Unified Chart Renderer
5. `src/components/charts/unified-chart.tsx` -- renders from ChartDefinition
6. `src/components/charts/use-chart-state.ts` -- generic chart interaction hook (series visibility, hover, tooltips)

### Phase 3: Chart Builder UI
7. `src/components/charts/chart-builder.tsx` -- axis picker + type selector + preset button

### Phase 4: View Integration
8. `src/lib/views/migrate-chart-state.ts` -- backward compat migration function
9. Modify `src/lib/views/types.ts` -- swap ChartViewState for ChartDefinition
10. Modify `src/lib/views/schema.ts` -- update Zod schema with union + transform
11. Modify `src/components/data-display.tsx` -- conditional chart rendering, mount chart builder

### Phase 5: Metabase Import (independent of chart builder)
12. `src/lib/metabase/types.ts` -- MetabaseQuery type
13. `src/lib/metabase/field-mapper.ts` -- Metabase field names/IDs -> COLUMN_CONFIGS keys
14. `src/lib/metabase/mbql-translator.ts` -- MBQL JSON parser (operator map approach)
15. `src/lib/metabase/sql-extractor.ts` -- SQL column/filter extraction (regex-based)
16. `src/components/import/metabase-importer.tsx` -- import dialog UI
17. Modify `src/components/layout/app-sidebar.tsx` -- add import entry

**Phase ordering rationale:**
- Types first (Phase 1) because everything depends on `ChartDefinition`
- Renderer before builder (Phase 2 before 3) so the builder can preview results during development
- View integration (Phase 4) after both renderer and builder exist, since it wires them into the persistence layer
- Metabase import (Phase 5) is independent -- it outputs `ChartDefinition` + filters, so it only needs the types from Phase 1. Can be built in parallel with Phases 2-4 if desired.

## Scalability Considerations

Not a traditional scalability concern -- this is a 2-3 user internal tool with 477 rows. The relevant dimensions:

| Concern | Now (477 rows, 61 cols) | If dataset grows (5K rows) | If columns grow (100+ cols) |
|---------|------------------------|---------------------------|----------------------------|
| Client-side pivot | Instant (<1ms) | Still fast (<50ms) | Dropdown UX needs search/filter |
| Chart rendering | Recharts handles fine | May need data sampling for scatter | N/A |
| Metabase field mapping | O(n) exact match | Same | Need fuzzy matching for names |
| View persistence | localStorage sufficient | Same | Same |
| MBQL translation | Simple operator map | Same | Column map grows but still O(1) lookup |

## Sources

- Existing codebase analysis (HIGH confidence -- direct code reading of all integration points)
- [Metabase MBQL Reference](https://github.com/metabase/metabase/wiki/(Incomplete)-MBQL-Reference) (MEDIUM confidence -- incomplete wiki but core structure is documented)
- [Recharts GitHub](https://github.com/recharts/recharts) (HIGH confidence -- library already in use in the codebase)
- [Metabase MBQL schema discussion](https://discourse.metabase.com/t/where-to-get-api-query-schema-specification/5483) (LOW confidence -- community discussion, not official docs)
