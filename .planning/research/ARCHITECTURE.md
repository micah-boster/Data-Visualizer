# Architecture Patterns

**Domain:** Within-partner batch comparison visualization (charts, conditional formatting, trending, KPI cards)
**Researched:** 2026-04-11
**Confidence:** HIGH -- based on direct codebase analysis of existing architecture

## Executive Summary

The existing app has a clean separation: React Query fetches all data upfront, drill-down is React state, TanStack Table handles rendering/filtering/sorting, and formatting+thresholds are pure functions. The v2 visualization features integrate naturally because **the data already exists client-side** -- batch rows include 19 `COLLECTION_AFTER_*_MONTH` columns and all the metrics needed for KPIs and trending. No new API endpoints are required. The work is entirely new client-side components that consume the same React Query cache, filtered by drill state.

## Current Architecture (As-Is)

```
page.tsx
  +-- DataDisplay (orchestrator)
       |-- useData()           -> React Query -> /api/data -> Snowflake (477+ rows, 61 cols)
       |-- useAccountData()    -> React Query -> /api/accounts -> Snowflake (partner+batch filter)
       |-- useDrillDown()      -> React state: root -> partner -> batch
       +-- DataTable
            |-- useDataTable()      -> TanStack Table instance
            |-- useFilterState()    -> URL-param dimension filters
            |-- useColumnFilters()  -> In-column numeric/text filters
            |-- useColumnManagement() -> Visibility, order, presets (localStorage)
            |-- useSavedViews()     -> View snapshots (localStorage)
            |-- TableHeader / TableBody / TableFooter
            |-- FilterBar / FilterChips
            +-- BreadcrumbTrail
```

**Key architectural facts:**
- All 477+ batch rows (61 columns each) are fetched once and cached client-side via React Query
- Partner drill-down is a client-side filter on `PARTNER_NAME`
- Batch drill-down triggers a separate API call for account-level data (`useAccountData`)
- The `COLLECTION_AFTER_*_MONTH` columns (M1 through M60, 19 columns) are already in every row
- Threshold-based conditional formatting already exists in `FormattedCell` + `thresholds.ts`
- `BATCH_AGE_IN_MONTHS` is an identity column -- always present, used for curve truncation
- `DataDisplay` already switches data sources by drill level in a `useMemo`

## Recommended Architecture (To-Be)

### Principle: Same Data, New Views

All four v2 features consume data already in the React Query cache. No new API endpoints. No new Snowflake queries. The architecture change is adding **visualization components alongside the table** at the partner drill-down level.

```
page.tsx
  +-- DataDisplay (orchestrator -- MODIFIED)
       |-- useData()              -> (unchanged)
       |-- useAccountData()       -> (unchanged)
       |-- useDrillDown()         -> (unchanged)
       |-- usePartnerStats()      -> NEW: derives KPIs + norms from partner batch rows
       |
       |-- [root level]           -> DataTable (unchanged)
       |
       +-- [partner level]        -> NEW LAYOUT
            |-- PartnerDashboard   -> NEW: container for partner-level viz
            |    |-- KPISummaryCards     -> NEW: 4-6 metric cards
            |    |-- CollectionCurveChart -> NEW: Recharts line chart
            |    +-- TrendingMetrics      -> NEW: sparklines or delta indicators
            |-- DataTable           -> MODIFIED: conditional formatting via norms
            +-- BreadcrumbTrail     -> (unchanged)
```

### Component Boundaries

| Component | Responsibility | Data Source | New/Modified |
|-----------|---------------|-------------|--------------|
| `DataDisplay` | Orchestration, layout switching by drill level | `useData()`, `useDrillDown()` | MODIFIED -- add partner dashboard layout |
| `usePartnerStats` | Compute partner historical norms, KPI aggregates, curve data | Filtered rows from `useData()` cache | NEW hook |
| `PartnerDashboard` | Layout container for viz components at partner level | Props from DataDisplay | NEW component |
| `KPISummaryCards` | Display 4-6 key metrics as cards | `usePartnerStats` output | NEW component |
| `CollectionCurveChart` | Recharts `<LineChart>` overlaying batch curves | Partner batch rows, collection columns | NEW component |
| `TrendingMetrics` | Batch-over-batch deltas for key metrics | `usePartnerStats` output | NEW component |
| `FormattedCell` | Cell rendering with conditional formatting | Threshold config + partner norms | MODIFIED -- accept norm-based thresholds |
| `thresholds.ts` | Threshold definitions and checking | Static config + computed norms | MODIFIED -- add dynamic norm thresholds |
| `DataTable` | Interactive table with all existing features | (unchanged) | MINOR -- pass norm context down |

### Data Flow

```
React Query Cache (useData -> 477+ rows, 61 cols)
    |
    |--- [root level] ---> DataTable (all rows, no change)
    |
    +--- [partner level] ---> filter rows by PARTNER_NAME (existing logic in DataDisplay)
              |
              |--- usePartnerStats(partnerRows)
              |       |-- KPI aggregates (avg placed, total collected, penetration rate, etc.)
              |       |-- Historical norms (mean + stddev per metric across batches)
              |       +-- Collection curve data (reshape rows -> chart series)
              |
              |--- KPISummaryCards   <-- KPI aggregates
              |--- CollectionCurveChart <-- curve series data
              |--- TrendingMetrics   <-- batch-over-batch deltas
              +--- DataTable         <-- rows + norms (for conditional formatting)
```

**Critical insight:** The collection curve columns (`COLLECTION_AFTER_1_MONTH` through `COLLECTION_AFTER_60_MONTH`) need to be reshaped from wide format (19 columns per row) to long format (array of `{month, amount}` per batch) for charting. Each batch becomes a line series. `BATCH_AGE_IN_MONTHS` determines how many months of data are valid -- truncate nulls beyond batch age.

## New and Modified Files

```
src/
  hooks/
    use-partner-stats.ts              # NEW: derive KPIs, norms, curve data from partner rows
  lib/
    charts/
      collection-curves.ts            # NEW: reshape wide->long, series builder
    formatting/
      thresholds.ts                   # MODIFIED: add norm-based dynamic thresholds
  components/
    partner/
      partner-dashboard.tsx           # NEW: layout container
      kpi-summary-cards.tsx           # NEW: metric cards using shadcn/ui Card
      collection-curve-chart.tsx      # NEW: Recharts LineChart
      trending-metrics.tsx            # NEW: delta indicators / sparklines
    table/
      formatted-cell.tsx              # MODIFIED: accept norm context via React Context
    data-display.tsx                  # MODIFIED: partner-level layout branching
```

## Patterns to Follow

### Pattern 1: Derived State Hook (usePartnerStats)

All v2 computations derive from existing cached data. Use a custom hook with `useMemo` to avoid recomputation.

**What:** Single hook that takes partner batch rows and returns all computed values (KPIs, norms, chart series).
**When:** Whenever the user drills into a partner.
**Why:** Centralizes all partner-level computation. Components receive pre-computed data, staying pure/presentational.

```typescript
interface PartnerStats {
  kpis: KPIData[];
  norms: Record<string, { mean: number; stddev: number }>;
  collectionCurves: ChartSeries[];
  trending: TrendingMetric[];
}

function usePartnerStats(partnerRows: Record<string, unknown>[]): PartnerStats {
  return useMemo(() => {
    const kpis = computeKPIs(partnerRows);
    const norms = computeNorms(partnerRows);
    const collectionCurves = reshapeCollectionCurves(partnerRows);
    const trending = computeTrending(partnerRows);
    return { kpis, norms, collectionCurves, trending };
  }, [partnerRows]);
}
```

### Pattern 2: Wide-to-Long Reshape for Charts

Collection data is stored as 19 columns per row (Snowflake convention). Charts need it as arrays.

**What:** Pure function that transforms `{COLLECTION_AFTER_1_MONTH: 5000, COLLECTION_AFTER_2_MONTH: 8000, ...}` into `[{month: 1, amount: 5000}, {month: 2, amount: 8000}, ...]` per batch.
**When:** Building chart series for `CollectionCurveChart`.

```typescript
const COLLECTION_MONTHS = [1,2,3,4,5,6,7,8,9,10,11,12,15,18,21,24,30,36,48,60];

interface CurvePoint { month: number; amount: number | null; }
interface ChartSeries { batchName: string; batchAge: number; data: CurvePoint[]; }

function reshapeCollectionCurves(rows: Record<string, unknown>[]): ChartSeries[] {
  return rows.map(row => ({
    batchName: String(row.BATCH),
    batchAge: Number(row.BATCH_AGE_IN_MONTHS) || 0,
    data: COLLECTION_MONTHS
      .filter(m => m <= (Number(row.BATCH_AGE_IN_MONTHS) || 0))
      .map(m => ({
        month: m,
        amount: row[`COLLECTION_AFTER_${m}_MONTH`] as number | null,
      })),
  }));
}
```

### Pattern 3: Norm-Based Conditional Formatting (Extending Existing)

The existing `thresholds.ts` uses static absolute thresholds (e.g., penetration rate below 5%). Extend it to support dynamic norms computed per-partner.

**What:** Compute mean and standard deviation per metric across a partner's batches. Flag values >1.5 stddev from mean.
**When:** At partner drill-down level, applied to the DataTable cells.
**Integration point:** Use React Context (`PartnerNormsContext`) to provide norms without prop-drilling through TanStack Table column definitions.

```typescript
// New type alongside existing ThresholdConfig
interface NormThreshold {
  mean: number;
  stddev: number;
}

// New function alongside existing checkThreshold
function checkNormThreshold(
  value: number,
  norm: NormThreshold,
  zThreshold: number = 1.5
): ThresholdResult {
  const zScore = (value - norm.mean) / norm.stddev;
  if (zScore < -zThreshold) {
    return { isLow: true, isHigh: false, reason: `${Math.abs(zScore).toFixed(1)} std devs below partner avg` };
  }
  if (zScore > zThreshold) {
    return { isLow: false, isHigh: true, reason: `${zScore.toFixed(1)} std devs above partner avg` };
  }
  return { isLow: false, isHigh: false, reason: null };
}
```

**How FormattedCell changes:** Currently `FormattedCell` calls `getThreshold(columnKey)` for static thresholds. Add a `useContext(PartnerNormsContext)` call. When norms are present (partner level), check norm thresholds in addition to static thresholds. Norm-based formatting uses a different visual treatment (e.g., amber tint vs. existing blue/red tint) so users can distinguish "absolute outlier" from "relative to partner norm."

### Pattern 4: Conditional Layout by Drill Level

DataDisplay already switches data source by drill level. Extend this to switch layout.

**What:** At root level, show only the DataTable. At partner level, show PartnerDashboard above the DataTable. At batch level, show account DataTable (existing).

```typescript
// In DataDisplay, within the return JSX
{drillState.level === 'partner' && partnerStats && (
  <PartnerDashboard
    stats={partnerStats}
    partnerName={drillState.partner!}
  />
)}
```

The `PartnerDashboard` renders in the gap between breadcrumbs and table, taking a fixed height (e.g., 320px) with the table flexing below it.

## Anti-Patterns to Avoid

### Anti-Pattern 1: Separate API Endpoints for Chart Data
**What:** Creating `/api/charts/collection-curves` or similar.
**Why bad:** The data is already client-side in the React Query cache. A new endpoint would duplicate data transfer, add Snowflake query latency, and create a sync problem between table and chart data.
**Instead:** Derive chart data from the existing React Query cache using `useMemo`.

### Anti-Pattern 2: Global Charting State
**What:** Putting chart selection state, zoom level, or highlighted series in a global store or saved views.
**Why bad:** Chart state is local to the partner view. It resets when navigating away, and that is the correct behavior.
**Instead:** Keep chart interaction state local to `CollectionCurveChart` with `useState`.

### Anti-Pattern 3: Computing Norms on Every Render
**What:** Recomputing mean/stddev inside `FormattedCell` for each cell.
**Why bad:** With 477+ rows x 61 columns, this creates O(rows * columns * rows) computation on every table interaction.
**Instead:** Compute norms once in `usePartnerStats` (memoized), provide via React Context.

### Anti-Pattern 4: Canvas-Based Charts for This Dataset
**What:** Using Canvas rendering (Nivo Canvas, ECharts Canvas) for collection curves.
**Why bad:** Overkill. The dataset per partner is small (typically 5-20 batches with 19 data points each, so max ~380 SVG points). Canvas adds complexity without benefit.
**Instead:** Use Recharts SVG-based `<LineChart>` -- simple API, composable, React-native.

### Anti-Pattern 5: Reshaping Data in the Chart Component
**What:** Doing the wide-to-long column reshape inside the chart render function.
**Why bad:** Couples data transformation to presentation. Makes testing harder. Runs on every re-render.
**Instead:** Reshape in `usePartnerStats` (or in `lib/charts/collection-curves.ts`), pass clean series data to chart component.

## Charting Library: Recharts

**Recommendation:** Recharts. It is the most popular React charting library (13M+ weekly npm downloads), uses a declarative component API that matches the existing codebase style (shadcn/ui + Tailwind), and handles the dataset size (max ~20 lines x 19 points) with zero performance concerns.

**React 19.2 compatibility note:** Recharts has a known `react-is` dependency mismatch with React 19. Fix by adding to `package.json`:
```json
"overrides": {
  "react-is": "^19.2.0"
}
```

**Alternatives rejected:**
| Library | Why Not |
|---------|---------|
| Nivo | Heavier bundle, D3 dependency, more complex API. Overkill for line charts + sparklines. |
| Victory | Less community adoption (360K vs 13M weekly downloads), cross-platform focus not relevant. |
| Tremor | Built on Recharts anyway -- adds an abstraction layer the project does not need. |

## Integration Points (Explicit)

### 1. DataDisplay.tsx -- Layout Change (MODIFIED)
**Current:** Renders `<DataTable>` inside a flex column for all drill levels.
**Change:** At partner level, insert `<PartnerDashboard>` between breadcrumbs and DataTable. Pass `partnerRows` (already computed in the `tableData` useMemo at line 44-55) to `usePartnerStats`.
**Risk:** Low. The existing `drillState.level` branching pattern is already established.

### 2. FormattedCell.tsx -- Norm-Based Formatting (MODIFIED)
**Current:** Uses static `COLUMN_THRESHOLDS` from `thresholds.ts` (lines 49-68).
**Change:** Add `useContext(PartnerNormsContext)` call. When norms are available and a column has a norm, apply norm-based tinting alongside existing static thresholds. Use amber for "above partner norm" vs. existing blue/red for absolute thresholds.
**Risk:** Medium. Must not break existing formatting behavior at root level (where norms context is empty/null).

### 3. thresholds.ts -- Dynamic Threshold Support (MODIFIED)
**Current:** Only static thresholds keyed by column name, `checkThreshold()` function.
**Change:** Add `NormThreshold` type and `checkNormThreshold()` function. Existing code untouched.
**Risk:** Low. Additive change only.

### 4. package.json -- Add Recharts (MODIFIED)
**Change:** `npm install recharts` + add `"overrides": { "react-is": "^19.2.0" }` to package.json.
**Risk:** Low-Medium. The react-is override is well-documented but should be tested before building chart components.

## Suggested Build Order

Build order is driven by dependencies -- each phase unlocks the next.

```
Phase 1: usePartnerStats + data reshaping utilities (no UI)
   |  (everything else depends on this computation layer)
   v
Phase 2: KPI Summary Cards (simplest viz, validates data flow)
   |  (proves the dashboard layout and DataDisplay changes work)
   v
Phase 3: Collection Curve Chart (Recharts, most impactful feature)
   |  (chart infrastructure now exists, Recharts proven to work)
   v
Phase 4: Conditional Formatting with partner norms
   |  (extends existing threshold system, needs stable norms)
   v
Phase 5: Trending Metrics (batch-over-batch deltas, optional sparklines)
```

**Rationale:**
1. **usePartnerStats first** because every other feature consumes its output. Building the pure computation layer with tests ensures correctness before any UI work.
2. **KPIs second** because they are the simplest visualization (shadcn/ui Card components with numbers) and validate the DataDisplay layout change + data flow end-to-end.
3. **Collection curves third** because they are the highest-value feature (the core "within-partner comparison" goal) and require the Recharts dependency to be added and verified.
4. **Conditional formatting fourth** because it modifies existing components (`FormattedCell`) and needs the norms computation to be stable and tested.
5. **Trending fifth** because it builds on the same stats infrastructure and can optionally reuse Recharts for sparklines.

## Scalability Considerations

| Concern | Current (477 rows) | At 2K rows | At 10K rows |
|---------|-------------------|------------|-------------|
| Partner stats computation | Instant (<1ms for ~20 rows per partner) | Instant | Consider server-side computation |
| Collection curve rendering | 5-20 lines x 19 points, trivial SVG | Same (per-partner) | Same (per-partner, not data-dependent) |
| Norm computation | O(batches x metrics), trivial | Trivial | May want to precompute in Snowflake |
| React Query cache size | ~2MB estimated | ~8MB | Consider pagination or partial loading |
| FormattedCell with norms | Context lookup per cell, negligible | Negligible | Negligible (norms are precomputed) |

At current scale (477 rows, ~37 partners averaging ~13 batches each), all computations are trivially fast client-side. No architecture changes needed until total row count exceeds ~5K.

## Sources

- Codebase analysis: direct file reads of `data-display.tsx`, `use-drill-down.ts`, `use-data.ts`, `formatted-cell.tsx`, `thresholds.ts`, `config.ts`, `aggregations.ts`, `data-table.tsx`, `use-account-data.ts`, `queries.ts`, `route.ts`
- [Recharts vs Nivo vs Victory -- npm-compare](https://npm-compare.com/@nivo/bar,recharts,victory) (download statistics, feature comparison)
- [Recharts React 19 compatibility -- GitHub Issue #4558](https://github.com/recharts/recharts/issues/4558) (react-is override fix)
- [Recharts React 19.2 rendering issue -- GitHub Issue #6857](https://github.com/recharts/recharts/issues/6857) (confirms override still needed for 19.2)
- [npm trends: nivo vs recharts vs victory](https://npmtrends.com/nivo-vs-recharts-vs-victory) (adoption data)
