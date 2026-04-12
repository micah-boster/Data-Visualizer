# Phase 14: Batch-over-Batch Trending - Research

**Researched:** 2026-04-12
**Domain:** UI integration — trend indicators in partner-level batch table
**Confidence:** HIGH

## Summary

Phase 10 already built the computation layer: `computeTrending()` in `src/lib/computation/compute-trending.ts` produces `TrendingData` with per-metric `BatchTrend` objects containing direction (up/down/flat), rolling average, and current value. The `usePartnerStats` hook in `src/hooks/use-partner-stats.ts` computes and exposes trending data per partner. **No computation work is needed.**

Phase 14 is entirely UI integration: rendering trend arrows next to metric values in the partner-level batch table, adding context-aware coloring (green = good direction for that metric), tooltips with baseline info, and handling insufficient-history edge cases.

**Primary recommendation:** Extend the existing `FormattedCell` component (or create a `TrendIndicator` wrapper) to render trend arrows. Pass trending data through TanStack Table meta at the partner drill level. Create a metric polarity map so the UI knows which direction is "good" for each metric.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Colored arrows: green up, red down, gray flat dash
- Color is context-aware — green = good direction for that metric (e.g. recovery up = green, delinquency up = red). Claude infers polarity from metric semantics.
- Arrow placement: right of the metric value (e.g. `78.2% ↑`). Keeps number alignment clean.
- Tooltip on hover shows baseline context: delta and rolling average (e.g. "Up 12% vs 4-batch avg of 69.5%")
- Curated subset, not all columns — avoid visual noise
- Confirmed metrics: Recovery rate %, Liquidation rate, Avg payment amount
- Claude also selects additional meaningful metrics from the batch table data model (target 3-5 total)
- Trend arrows appear at partner-level batch table only, not account-level drill-down
- Rolling window: fixed at 4 prior batches (use fewer if partner has < 5 total batches)
- Current batch is excluded from its own baseline
- Flat threshold: ±5% relative change (5% OF the baseline value, not absolute points)
- Uniform ±5% for all metrics — no per-metric thresholds
- Minimum to show trends: 3 total batches (2 baseline + 1 current). Partners with 1-2 batches get gray dash.
- Partners with fewer than 3 total batches: gray dash '—' where arrow would be, tooltip says "Need 3+ batches for trending"
- When baseline uses fewer than 4 batches (i.e. partner has 3-4 total): show a subtle visual cue (lighter/faded arrow or similar) to signal lower confidence
- Tooltip should still work on low-confidence arrows, showing the smaller baseline context

### Claude's Discretion
- Exact arrow icon/character choice and sizing
- Faded arrow implementation (opacity, lighter color, asterisk, etc.)
- Tooltip styling and positioning
- Algorithm documentation format (TREND-05)
- Selection of additional trending metrics beyond the 3 confirmed ones

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| TREND-01 | Trending indicators (up/down/flat) shown next to key metrics in the batch table at partner level | TrendIndicator component renders arrow next to value using TrendingData from usePartnerStats |
| TREND-02 | Comparison baseline is rolling partner average (last 4-6 batches), excluding the current batch | Already implemented in compute-trending.ts — uses 2-6 prior batches, excludes current |
| TREND-03 | Partners with fewer than 3 historical batches show "Insufficient history" instead of misleading trends | TrendingData.insufficientHistory flag already computed; UI renders gray dash with tooltip |
| TREND-04 | Flat threshold: changes within ±5% count as flat | Already implemented in compute-trending.ts with THRESHOLD = 0.05 |
| TREND-05 | Trending algorithm explicitly documented per project constraint | Create TRENDING-ALGORITHM.md in project docs |
</phase_requirements>

## Standard Stack

### Core (already in project)
| Library | Purpose | Why Standard |
|---------|---------|--------------|
| TanStack Table | Table rendering, meta data passing | Already used for all table views |
| Radix Tooltip (via shadcn/ui) | Hover tooltips | Already used in FormattedCell for threshold tooltips |
| Lucide React | Icon library | Already used throughout the app (AlertTriangle, X, etc.) |
| Tailwind CSS | Styling, opacity, color | Already used for all styling |

### No new dependencies needed
Phase 14 uses existing project infrastructure exclusively.

## Architecture Patterns

### Existing Data Flow (Phase 10)
```
Raw batch rows
  → usePartnerStats(partnerName, allRows)
    → computeTrending(partnerRows)
      → TrendingData { trends: BatchTrend[], insufficientHistory: boolean }
```

### Integration Pattern for Phase 14
```
DataDisplay (drillState.level === 'partner')
  → passes trending data through DataTable meta
    → FormattedCell / TrendIndicator reads meta
      → renders arrow + tooltip for trending metrics only
```

### Key Files to Modify

| File | Change |
|------|--------|
| `src/components/data-display.tsx` | Compute partnerStats when at partner drill level, pass via DataTable |
| `src/components/table/data-table.tsx` | Accept trending data in meta, pass through to cells |
| `src/components/table/formatted-cell.tsx` | Add TrendIndicator rendering for trended metrics |
| `src/lib/computation/compute-trending.ts` | Minor: update TRENDING_METRICS to match confirmed + selected metrics |
| `src/types/partner-stats.ts` | Possibly extend BatchTrend with delta/percentage fields for tooltip |

### New Files

| File | Purpose |
|------|---------|
| `src/components/table/trend-indicator.tsx` | TrendIndicator component — arrow + tooltip |
| `src/lib/computation/metric-polarity.ts` | Map of metric → polarity (higher_is_better / lower_is_better) |
| `docs/TRENDING-ALGORITHM.md` | Algorithm documentation (TREND-05) |

### Metric Polarity Map

Context-aware coloring requires knowing which direction is "good" for each metric:

| Metric Key | Polarity | Rationale |
|------------|----------|-----------|
| PENETRATION_RATE | higher_is_better | More accounts contacted = better |
| CONVERSION_RATE | higher_is_better | More accounts paying = better |
| TOTAL_COLLECTED | higher_is_better | More money collected = better |
| COLLECTION_AFTER_6_MONTH | higher_is_better | Higher recovery at 6mo = better |
| COLLECTION_AFTER_12_MONTH | higher_is_better | Higher recovery at 12mo = better |

**Note:** The confirmed metrics from CONTEXT.md are "Recovery rate %, Liquidation rate, Avg payment amount." These map to:
- Recovery rate % → PENETRATION_RATE or CONVERSION_RATE (closest available)
- Liquidation rate → TOTAL_COLLECTED / TOTAL_AMOUNT_PLACED (computed or COLLECTION_AFTER_*)
- Avg payment amount → not currently in TRENDING_METRICS, but exists in data

The compute-trending.ts already uses 5 metrics. We should review with the existing data model to confirm the exact mapping and potentially adjust TRENDING_METRICS to match the user's confirmed list.

### TanStack Table Meta Extension

Current meta interface (`TableDrillMeta`) passes drill callbacks. Extend to include trending:

```typescript
export interface TableDrillMeta {
  onDrillToPartner?: (name: string) => void;
  onDrillToBatch?: (name: string) => void;
  drillLevel?: DrillLevel;
  trending?: TrendingData; // NEW: trend data for partner-level view
}
```

Cell renderers check `meta.trending` and look up the current column key in the trends array.

### TrendIndicator Component Pattern

```typescript
// Renders: "78.2% ↑" with colored arrow and tooltip
function TrendIndicator({ trend, formattedValue, lowConfidence }) {
  const arrow = trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '—';
  const polarity = getPolarity(trend.metric);
  const isPositive = (trend.direction === 'up' && polarity === 'higher_is_better') ||
                     (trend.direction === 'down' && polarity === 'lower_is_better');
  const colorClass = trend.direction === 'flat' ? 'text-muted-foreground' :
                     isPositive ? 'text-emerald-600' : 'text-red-500';
  const opacityClass = lowConfidence ? 'opacity-50' : '';

  // Tooltip shows: "Up 12% vs 4-batch avg (69.5%)"
  const delta = ((trend.value - trend.rollingAvg) / trend.rollingAvg * 100).toFixed(1);
  const tooltipText = `${direction} ${Math.abs(delta)}% vs ${baselineCount}-batch avg (${formatValue(trend.rollingAvg)})`;
}
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tooltips | Custom hover/position logic | Radix Tooltip (shadcn/ui) | Already used in FormattedCell, handles positioning, accessibility |
| Arrow icons | SVG sprites or custom paths | Unicode characters (↑↓—) or Lucide icons | Simpler, consistent with text, no icon loading |
| Color theming | Hardcoded hex values | Tailwind classes + CSS variables | Dark mode support, consistency with existing theme |

## Common Pitfalls

### Pitfall 1: Trending on Wrong Drill Level
**What goes wrong:** Arrows appear at root level (all partners) or batch level (accounts)
**Why it happens:** Not gating trend rendering to partner drill level only
**How to avoid:** Check `meta.drillLevel === 'partner'` before rendering TrendIndicator; at root/batch level, render normal cell
**Warning signs:** Arrows visible at root summary view

### Pitfall 2: Stale Trending Data After Partner Switch
**What goes wrong:** Trending from previous partner visible momentarily
**Why it happens:** usePartnerStats recomputes on partner change but React may render stale data
**How to avoid:** usePartnerStats already depends on partnerName in useMemo; DataTable has key that changes on drill state — existing pattern handles this

### Pitfall 3: Arrow Color Mismatch with Metric Semantics
**What goes wrong:** Green arrow on a metric where "up" is bad (e.g., delinquency)
**Why it happens:** Not implementing polarity map, treating all "up" as green
**How to avoid:** Create explicit polarity map, test each metric's color assignment

### Pitfall 4: Tooltip Formatting Inconsistency
**What goes wrong:** Tooltip shows raw numbers instead of formatted values (e.g., 0.782 instead of 78.2%)
**Why it happens:** Using raw trend.rollingAvg without applying the column's formatter
**How to avoid:** Pass the column type to TrendIndicator, use existing getFormatter() to format tooltip values

### Pitfall 5: Batch Sort Order Assumption
**What goes wrong:** Trending computes wrong "latest" batch
**Why it happens:** Batch names like "MAR_26" sort alphabetically, not chronologically
**How to avoid:** compute-trending.ts already sorts by BATCH string. Verify batch naming convention ensures chronological sort (currently uses month abbreviation + year, which may not sort correctly across years). May need to use BATCH_AGE_IN_MONTHS as sort key instead.

## Code Examples

### Extending FormattedCell with Trend Support

The existing `getCellRenderer` in `formatted-cell.tsx` is the integration point. When trending data is available and the column is a trended metric, wrap the result with TrendIndicator:

```typescript
// In definitions.ts cell renderer, after getting formatted value:
const trend = meta?.trending?.trends.find(t => t.metric === config.key);
if (trend && meta?.drillLevel === 'partner') {
  return <TrendIndicator trend={trend} formattedValue={formatted} lowConfidence={...} />;
}
return getCellRenderer(config.type, config.key, value);
```

### Low Confidence Detection

```typescript
// Low confidence = partner has 3-4 total batches (baseline uses < 4 batches)
// Count batches from the data length passed to computeTrending
// Need to expose baseline count in TrendingData or compute from partnerRows.length
const lowConfidence = partnerRows.length < 5; // 3-4 total = low confidence
```

### Insufficient History Rendering

```typescript
// When insufficientHistory is true, render gray dash for all trended metrics
if (meta?.trending?.insufficientHistory) {
  return (
    <Tooltip>
      <TooltipTrigger className="text-muted-foreground">
        {formattedValue} <span className="text-xs">—</span>
      </TooltipTrigger>
      <TooltipContent>Need 3+ batches for trending</TooltipContent>
    </Tooltip>
  );
}
```

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| No trending | Phase 10 built computation | Phase 14 only needs UI wiring |
| computeTrending returns basic data | May need to add delta percentage to BatchTrend | Cleaner tooltip computation |

## Open Questions

1. **Batch Sort Order**
   - What we know: compute-trending.ts sorts by BATCH string (e.g., "MAR_26")
   - What's unclear: Does this produce correct chronological order across year boundaries?
   - Recommendation: Validate with actual data; if not chronological, use BATCH_AGE_IN_MONTHS as sort key

2. **Exact Metric Mapping**
   - What we know: User confirmed "Recovery rate %, Liquidation rate, Avg payment amount"
   - What's unclear: Exact Snowflake column key mapping for "Recovery rate %" and "Liquidation rate"
   - Recommendation: Review COLUMN_CONFIGS to find the best match; PENETRATION_RATE and CONVERSION_RATE are the closest candidates

3. **BatchTrend Type Extension**
   - What we know: Current type has value, rollingAvg, direction
   - What's unclear: Whether to add precomputed delta percentage and baseline count
   - Recommendation: Add `deltaPercent: number` and `baselineCount: number` to BatchTrend for cleaner tooltip rendering

## Sources

### Primary (HIGH confidence)
- `src/lib/computation/compute-trending.ts` — existing computation implementation
- `src/types/partner-stats.ts` — BatchTrend and TrendingData types
- `src/hooks/use-partner-stats.ts` — existing hook composing all partner analytics
- `src/components/table/formatted-cell.tsx` — existing cell rendering pattern with tooltips
- `src/lib/columns/definitions.ts` — column definition and cell renderer structure
- `src/components/data-display.tsx` — drill-down data flow and DataTable rendering

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries, all existing
- Architecture: HIGH — clear extension points in existing code
- Pitfalls: HIGH — well-understood React/TanStack patterns

**Research date:** 2026-04-12
**Valid until:** 2026-05-12 (stable — internal codebase patterns)
