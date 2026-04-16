# Technology Stack

**Project:** Bounce Data Visualizer v3.5 -- Flexible Charts & Metabase Import
**Researched:** 2026-04-15
**Scope:** NEW additions only for v3.5. Existing stack (Next.js 16, React 19, TanStack Table, React Query, Recharts 3.8, Tailwind 4, shadcn/ui, Snowflake SDK, Zod 4, AI SDK, simple-statistics) is validated and unchanged.

> Previous stack research (v2.0 Recharts/KPIs, v3.0 AI SDK/anomaly detection) remains valid and is not repeated here. This document covers only v3.5 additions.

## Key Finding: One New Dependency

The flexible chart builder requires zero new libraries -- Recharts 3.8.0 already ships LineChart, BarChart, ScatterChart, and ComposedChart. The Metabase import feature needs one new dependency: `node-sql-parser` for parsing Metabase-exported SQL. MBQL import is custom code (it is just JSON).

## Recommended Stack Additions

### Flexible Chart Builder: No New Dependencies

Recharts 3.8.0 (already installed at exact version) includes every chart type the chart builder needs:

| Recharts Component | Chart Builder Use | Already In Codebase |
|--------------------|-------------------|:-------------------:|
| `LineChart` | Line type selection, collection curve preset | Yes |
| `BarChart` | Bar type selection for categorical comparisons | No (available) |
| `ScatterChart` | Scatter type for correlation analysis | No (available) |
| `ComposedChart` | Mixed chart overlay (line + bar on same axes) | No (available) |
| `XAxis` / `YAxis` | User-selectable axes mapped to column keys | Yes |
| `Tooltip` / `Legend` | Shared chrome across all chart types | Yes |

**Verified:** `node_modules/recharts/lib/chart/` contains `BarChart.js`, `ScatterChart.js`, and `ComposedChart.js`. All export React components that accept the same data format as LineChart.

The shadcn `ChartContainer` wrapper (`src/components/ui/chart.tsx`) wraps `ResponsiveContainer` and injects CSS variable theming. It works with any Recharts chart component -- no modification needed.

**Confidence: HIGH** -- Verified by filesystem inspection. Already running Recharts 3.8.0 with React 19.2.4 in production.

### Metabase MBQL Import: Custom Parser (No Library)

MBQL (Metabase Query Language) is a JSON format with a known, stable schema. There are no npm libraries for parsing MBQL -- Metabase's own parser is Clojure-only. But none is needed because MBQL is structured JSON that `JSON.parse()` + Zod handles directly.

The MBQL structure to support:

```json
{
  "database": 1,
  "type": "query",
  "query": {
    "source-table": 2,
    "fields": [["field-id", 14], ["field-id", 7]],
    "aggregation": [["avg", ["field-id", 14]]],
    "breakout": [["field-id", 7]],
    "filter": ["and", [">", ["field-id", 14], 100]],
    "order-by": [["asc", ["field-id", 7]]],
    "limit": 500
  }
}
```

Key MBQL concepts to translate:
- **`source-table`**: Map Metabase table ID to known Snowflake tables (`agg_batch_performance_summary`, `master_accounts`)
- **`aggregation`**: `avg`, `count`, `sum`, `min`, `max`, `distinct`, `stddev` -- map to Snowflake aggregate functions
- **`breakout`**: GROUP BY columns -- map field IDs to `COLUMN_CONFIGS` keys
- **`filter`**: `and`/`or`/`not` + comparison operators -- map to WHERE clauses
- **`fields`**: SELECT columns -- map field IDs to column keys
- **`order-by`**: ORDER BY with asc/desc

**Why custom, not a library:**
1. MBQL is just JSON -- no parsing step, just validation and translation
2. No MBQL libraries exist on npm
3. Translation target is narrow: 2 known Snowflake tables, 61+78 known columns
4. Zod schema validation catches malformed input before translation begins
5. Field ID-to-column mapping is a simple lookup table the user configures on import

**Confidence: HIGH** -- MBQL schema documented on [Metabase GitHub Wiki](https://github.com/metabase/metabase/wiki/(Incomplete)-MBQL-Reference). The format is stable across MBQL 4 and MBQL 5.

### Metabase SQL Import: node-sql-parser

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `node-sql-parser` | ^5.4.0 | Parse Metabase-exported SQL into traversable AST | Snowflake dialect support, 1.2M+ weekly npm downloads, actively maintained, parses SELECT into AST with table/column/filter extraction |

Metabase users can also export their questions as raw SQL (type: "native" queries). These need parsing to extract:
- Source tables (validate against known schema)
- Selected columns (map to `COLUMN_CONFIGS` keys)
- WHERE clauses (translate to app dimension/column filters)
- GROUP BY (translate to chart axis grouping)
- ORDER BY (translate to TanStack Table sorting state)
- Aggregations (translate to computed Y-axis metrics)

**Why `node-sql-parser`:**

| Parser | Snowflake | Bundle Size | Approach | Verdict |
|--------|:---------:|-------------|----------|---------|
| `node-sql-parser` | Yes | ~200KB | PEG-based AST | Use this |
| `sql-parser-cst` | Yes | ~500KB+ | Full CST | Overkill -- CST preserves whitespace/comments we don't need |
| `js-sql-parser` | No | ~80KB | MySQL-only | Wrong dialect |
| `dt-sql-parser` | No | ~2MB | ANTLR4 | Designed for editor autocomplete, massive bundle |
| Custom regex | N/A | 0 | Fragile | Breaks on CTEs, subqueries, aliases, CASE expressions |

**Confidence: MEDIUM** -- `node-sql-parser` lists Snowflake in supported dialects and has recent Snowflake-specific commits. However, depth of support for Snowflake-specific syntax (QUALIFY, LATERAL FLATTEN, MATCH_RECOGNIZE) is not fully verified. For Metabase-generated SQL, which uses standard SELECT/WHERE/GROUP BY/HAVING, this coverage is sufficient.

## What NOT to Add

| Library | Why Skip |
|---------|----------|
| **Nivo / Victory / Visx / ECharts / Chart.js** | Recharts 3.8 already installed, integrated with shadcn theme, covers all needed chart types. A second charting library creates bundle bloat, inconsistent styling, and dual API patterns. |
| **@tanstack/react-charts** | Pre-1.0, would require ripping out all existing Recharts code. |
| **sql.js / alasql / duckdb-wasm** | Full SQL engines. We need to *parse*, not *execute*. Snowflake executes queries. |
| **Any MBQL npm library** | None exist. MBQL is JSON; `JSON.parse()` + Zod is the parser. |
| **D3 directly** | Recharts already wraps D3. Direct D3 adds complexity with no gain. |
| **lodash / ramda** | Codebase uses native array methods throughout. No gap to fill. |
| **Form library (react-hook-form, formik)** | Chart builder UI is a few selects and toggles, not a complex form. Controlled components with React state are simpler. |
| **Drag-and-drop library** | Dashboard layout with drag/drop widgets is explicitly v4 scope. |

## Installation

```bash
# Single new dependency for v3.5
npm install node-sql-parser
```

**Total new dependencies: 1 package** (`node-sql-parser`)

No environment variables needed. No infrastructure changes. No new services.

## Architecture Integration Points

### Chart Builder + Existing View System

The existing `ChartViewState` type in `src/lib/views/types.ts` needs extending to support flexible charts:

```typescript
// Current (collection curves only)
interface ChartViewState {
  metric: 'recoveryRate' | 'amount';
  hiddenBatches: string[];
  showAverage: boolean;
  showAllBatches: boolean;
}

// Extended for v3.5 flexible charts
interface ChartViewState {
  // Preset mode (backward-compatible with existing saved views)
  preset: 'collection-curves' | 'custom';
  // Collection curve fields (active when preset = 'collection-curves')
  metric?: 'recoveryRate' | 'amount';
  hiddenBatches?: string[];
  showAverage?: boolean;
  showAllBatches?: boolean;
  // Flexible chart fields (active when preset = 'custom')
  chartType?: 'line' | 'bar' | 'scatter';
  xAxis?: string;           // COLUMN_CONFIGS key
  yAxis?: string[];          // One or more COLUMN_CONFIGS keys
  groupBy?: string;          // Optional series grouping column
}
```

The Zod schema in `src/lib/views/schema.ts` gets a matching update. Existing saved views without `preset` default to `'collection-curves'` for backward compatibility.

### Chart Builder + COLUMN_CONFIGS

The 61-column `COLUMN_CONFIGS` array in `src/lib/columns/config.ts` already provides metadata for axis pickers:
- **X-axis candidates**: Any column (text for categories, number/date for continuous)
- **Y-axis candidates**: Columns where `type` is `'currency'`, `'percentage'`, `'count'`, or `'number'`
- **Group-by candidates**: Columns where `type` is `'text'` (PARTNER_NAME, ACCOUNT_TYPE, BATCH)
- **Labels**: `config.label` provides human-readable axis/legend labels

No new metadata needed. The existing `ColumnConfig.type` field drives axis picker filtering.

### Metabase Import + Existing View System

The import flow produces a `ViewSnapshot` (the same type used by saved views):

```
MBQL JSON or SQL text
  --> Parse (Zod validation for MBQL, node-sql-parser for SQL)
  --> Extract: table, columns, filters, aggregations, grouping
  --> Validate columns against COLUMN_CONFIGS keys
  --> Map to ViewSnapshot:
        - columns --> columnVisibility + columnOrder
        - filters --> columnFilters + dimensionFilters
        - ordering --> sorting
        - aggregation + grouping --> ChartViewState (yAxis, groupBy, chartType)
  --> User reviews + adjusts in preview UI
  --> Save as new SavedView (existing localStorage persistence)
```

This means Metabase import reuses the entire existing save/load infrastructure. No new persistence layer needed.

### Metabase Field ID Resolution

MBQL uses numeric `field-id` references (e.g., `["field-id", 14]`), not column names. The importer needs a mapping step:

1. User pastes MBQL JSON
2. App extracts all `field-id` values
3. UI presents a mapping table: "Field 14 = ?" with a dropdown of `COLUMN_CONFIGS` options
4. User maps each field ID to a known column
5. Mapping is saved for reuse (subsequent imports from same Metabase instance auto-resolve)

This interactive mapping avoids requiring Metabase API access or database connectivity to resolve field IDs -- important because Bounce's Metabase instance may not be API-accessible from the Vercel deployment.

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Chart types | Recharts 3.8 (existing) | Add Nivo for scatter/bar | Second charting library, different theming system, bundle cost. Recharts already has ScatterChart and BarChart. |
| MBQL parsing | Custom Zod-validated JSON parser | N/A | No npm libraries exist for MBQL. It is just JSON with known structure. |
| SQL parsing | `node-sql-parser` | `sql-parser-cst` | CST preserves whitespace/comments we don't need; larger bundle; AST is the right abstraction for translation. |
| SQL parsing | `node-sql-parser` | Custom regex | Breaks on CTEs, subqueries, CASE expressions, string literals containing SQL keywords. |
| Chart config state | Extend existing `ChartViewState` | Separate chart state system | Already have view save/restore plumbing in `src/lib/views/`. Extending it maintains one state model. |
| Metabase field mapping | Interactive UI mapper | Auto-resolve via Metabase API | Metabase API may not be accessible from Vercel. Interactive mapping is self-contained and works offline. |

## Version Verification

| Package | Status | Version | Notes |
|---------|--------|---------|-------|
| `recharts` | Installed | 3.8.0 | BarChart, ScatterChart, ComposedChart confirmed in `node_modules` |
| `zod` | Installed | ^4.3.6 | MBQL schema validation, ChartViewState schema extension |
| `node-sql-parser` | **NEW** | ^5.4.0 | Snowflake dialect, actively maintained, 1.2M+ weekly downloads |

## Sources

- Recharts chart components: **Verified via filesystem** -- `node_modules/recharts/lib/chart/{BarChart,ScatterChart,ComposedChart}.js` confirmed present (HIGH confidence)
- [Recharts examples gallery](https://recharts.github.io/en-US/examples/) -- scatter, bar, composed chart examples (HIGH confidence)
- [MBQL Reference -- Metabase GitHub Wiki](https://github.com/metabase/metabase/wiki/(Incomplete)-MBQL-Reference) -- aggregation types, filter clauses, field references, expression operators (HIGH confidence)
- [Metabase API documentation](https://www.metabase.com/learn/metabase-basics/administration/administration-and-operation/metabase-api) -- dataset_query structure, native vs MBQL query types (HIGH confidence)
- [Metabase API changelog](https://www.metabase.com/docs/latest/developers-guide/api-changelog) -- MBQL 5 serialization format (MEDIUM confidence)
- [node-sql-parser GitHub](https://github.com/taozhi8833998/node-sql-parser) -- Snowflake dialect support, AST structure (MEDIUM confidence)
- [Metabase native query format](https://discourse.metabase.com/t/native-sql-query-question-json-data-get/9329) -- native SQL query JSON structure (MEDIUM confidence)
- Existing codebase files inspected:
  - `src/components/ui/chart.tsx` -- shadcn ChartContainer wrapper
  - `src/components/charts/collection-curve-chart.tsx` -- current chart implementation
  - `src/lib/views/types.ts` -- ChartViewState and ViewSnapshot types
  - `src/lib/views/schema.ts` -- Zod validation schemas
  - `src/lib/columns/config.ts` -- 61-column metadata with types
  - `src/lib/snowflake/types.ts` -- SchemaColumn type
  - `package.json` -- current dependency versions

---
*Stack research for: Bounce Data Visualizer v3.5 flexible charts & Metabase import*
*Researched: 2026-04-15*
