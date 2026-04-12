# Phase 12: Collection Curve Charts - Research

**Researched:** 2026-04-12
**Domain:** Recharts 3.x multi-line chart with numeric axis, lazy loading in Next.js 16
**Confidence:** HIGH

## Summary

Phase 12 builds the centerpiece visualization of v2.0: a multi-line chart overlaying batch collection curves at the partner drill-down level. The data layer is fully built (Phase 10) -- `usePartnerStats` returns `BatchCurve[]` with `CurvePoint[]` arrays already truncated at each batch's actual age. The chart component (`src/components/ui/chart.tsx`) wraps Recharts 3.8.0 with shadcn's `ChartContainer`/`ChartTooltip`/`ChartLegend` primitives.

The core challenge is data transformation: the existing `BatchCurve[]` (one array of points per batch) must be pivoted into Recharts' expected format (array of objects keyed by month, with one property per batch). The X-axis must be `type="number"` for proportional spacing of the non-uniform month milestones (1,2,3...12,15,18,21,24,30,36,48,60). Lazy loading uses `next/dynamic` with `ssr: false` since Recharts is a client-only SVG library.

**Primary recommendation:** Build a single `CollectionCurveChart` component that accepts `BatchCurve[]` and manages its own state (metric toggle, solo mode, batch visibility). Use `next/dynamic` to lazy-load it. Pivot data in a `useMemo` inside the component. Use shadcn's `ChartContainer` wrapper for theming consistency.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Chart appears **above** the batch table at partner drill-down level
- When KPI cards (Phase 11) exist, ordering is: chart first, then KPI cards, then table
- Responsive height: 40vh, scaling with viewport
- Full-width: matches the table width for consistent alignment
- Small header label: "Collection Curves"
- Most recent batch: bold line (3px) + primary chart color
- Older batches: each gets a unique color from the palette but at lower opacity/saturation (muted, thinner ~1.5px)
- Cap visible lines at ~8 most recent by default
- "Show all batches" toggle to reveal all lines for partners with many batches
- Hover tooltip: batch name + recovery rate at that month (e.g. "2024-Q1 Batch: 12.3% at Month 6") -- single line per point, not crosshair
- Click a line: isolate/solo mode -- dims all others, highlights the clicked batch. Click again to reset
- Metric toggle above the chart: "Recovery Rate %" / "Dollars Collected" -- both values exist in the data layer
- Partner average reference line: dashed, toggle on/off, default ON
- Legend: right side panel (vertical list with color swatches)
- Legend click: toggles individual line visibility on/off (separate from chart click isolate behavior)
- When batches are capped at 8: all batches listed in legend, hidden ones grayed out -- user can click to swap which are visible
- Subtle line-draw animation on chart load (lines animate left to right)

### Claude's Discretion
- Exact animation duration and easing
- Tooltip positioning and styling
- Legend panel width and responsive behavior on small screens
- "Show all batches" toggle styling and placement
- Grid line style and axis label formatting
- Empty state when a partner has only 1 batch (nothing to compare)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CURVE-01 | Multi-line chart at partner drill-down level overlaying collection curves for all batches | Recharts `LineChart` + multiple `Line` components; data pivot pattern; placement in `data-display.tsx` above table |
| CURVE-02 | X-axis is months-since-placement (numeric, proportionally spaced), Y-axis is recovery rate % | `XAxis type="number"` with explicit `ticks` array from `COLLECTION_MONTHS`; `YAxis` with `unit="%"` |
| CURVE-03 | Lines truncate at batch's `BATCH_AGE_IN_MONTHS` -- no false zero cliffs | Already handled in `reshapeCurves()` -- young batches have shorter `points[]` arrays; pivot must use `undefined` (not 0) for missing months |
| CURVE-04 | Most recent batch highlighted (bold/primary), older batches muted | Sort batches by recency, apply `strokeWidth: 3` + chart-1 color to newest, `strokeWidth: 1.5` + opacity to rest |
| CURVE-05 | Hover tooltip shows batch name and exact value at that month | Custom tooltip content component using `ChartTooltipContent` pattern |
| CURVE-06 | Optional partner average reference line | Compute average recovery rate per month across all batches; render as `ReferenceLine` or computed `Line` with `strokeDasharray` |
| CURVE-07 | Charts lazy-loaded (not in initial bundle) | `next/dynamic(() => import(...), { ssr: false, loading: ... })` |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| recharts | 3.8.0 | Line chart rendering | Already installed, shadcn chart wrapper built on it |
| next/dynamic | 16.2.3 | Lazy loading | Built-in Next.js code splitting, supports `ssr: false` |
| shadcn Chart | (bundled) | ChartContainer, ChartTooltip, ChartLegend | Already in `src/components/ui/chart.tsx` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | 1.8.0 | Toggle icons, legend indicators | Already installed, use for metric toggle and reference line toggle |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Recharts | Nivo / Victory | No -- Recharts already installed and integrated with shadcn |
| next/dynamic | React.lazy + Suspense | next/dynamic wraps React.lazy with SSR control; use it directly |

## Architecture Patterns

### Recommended Component Structure
```
src/
  components/
    charts/
      collection-curve-chart.tsx    # Main chart component (lazy-loaded target)
      curve-tooltip.tsx             # Custom tooltip for batch name + value
      curve-legend.tsx              # Right-side vertical legend with click handlers
      use-curve-chart-state.ts      # State: visibility, solo mode, metric toggle, avg toggle
      pivot-curve-data.ts           # Transform BatchCurve[] -> Recharts data format
```

### Pattern 1: Data Pivot for Multi-Line Recharts
**What:** Recharts needs a single flat array where each object has a shared X key and one Y key per series. BatchCurve[] is per-batch arrays of points. Must pivot.
**When to use:** Always -- this is the core data transformation.
**Example:**
```typescript
// Input: BatchCurve[] from usePartnerStats
// Output: Array<{ month: number; [batchName: string]: number | undefined }>

interface PivotedPoint {
  month: number;
  [batchName: string]: number | undefined;
}

function pivotCurveData(
  curves: BatchCurve[],
  metric: 'recoveryRate' | 'amount',
): PivotedPoint[] {
  // Collect all unique months across all curves
  const monthSet = new Set<number>();
  for (const curve of curves) {
    for (const pt of curve.points) {
      monthSet.add(pt.month);
    }
  }
  const months = Array.from(monthSet).sort((a, b) => a - b);

  // Build lookup per batch
  return months.map((month) => {
    const point: PivotedPoint = { month };
    for (const curve of curves) {
      const pt = curve.points.find((p) => p.month === month);
      // CRITICAL: use undefined, NOT 0, for months beyond batch age
      // This prevents false zero cliffs -- Recharts skips undefined values
      point[curve.batchName] = pt ? pt[metric] : undefined;
    }
    return point;
  });
}
```

### Pattern 2: Numeric X-Axis with Non-Uniform Ticks
**What:** Collection months are non-uniform: 1-12 monthly, then 15,18,21,24,30,36,48,60. XAxis must be `type="number"` with explicit ticks.
**When to use:** Always -- this is required by CURVE-02.
**Example:**
```typescript
import { COLLECTION_MONTHS } from '@/lib/computation/reshape-curves';

<XAxis
  dataKey="month"
  type="number"
  domain={[1, 'dataMax']}
  ticks={[...COLLECTION_MONTHS]}
  tickFormatter={(month: number) => `${month}mo`}
/>
```

### Pattern 3: Lazy Loading with next/dynamic
**What:** Wrap the chart component in `next/dynamic` so Recharts is not in the initial bundle.
**When to use:** CURVE-07.
**Example:**
```typescript
// In data-display.tsx or a parent component
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

const CollectionCurveChart = dynamic(
  () => import('@/components/charts/collection-curve-chart').then(
    (mod) => mod.CollectionCurveChart
  ),
  {
    ssr: false,
    loading: () => (
      <div className="h-[40vh] w-full">
        <Skeleton className="h-full w-full" />
      </div>
    ),
  }
);
```

### Pattern 4: Partner Average Reference Line
**What:** Compute mean recovery rate at each month across all batches, render as a computed Line (not ReferenceLine, since it varies by X).
**When to use:** CURVE-06 -- the average is a curve, not a flat line.
**Example:**
```typescript
// Add an "__avg__" key to pivoted data
function addAverageSeries(
  pivoted: PivotedPoint[],
  curves: BatchCurve[],
  metric: 'recoveryRate' | 'amount',
): PivotedPoint[] {
  return pivoted.map((point) => {
    const values = curves
      .map((c) => {
        const pt = c.points.find((p) => p.month === point.month);
        return pt ? pt[metric] : undefined;
      })
      .filter((v): v is number => v !== undefined);

    return {
      ...point,
      __avg__: values.length > 0
        ? values.reduce((a, b) => a + b, 0) / values.length
        : undefined,
    };
  });
}

// Render as a Line with strokeDasharray for dashed appearance
<Line
  dataKey="__avg__"
  stroke="var(--muted-foreground)"
  strokeDasharray="6 3"
  strokeWidth={1.5}
  dot={false}
  name="Partner Average"
  connectNulls={false}
/>
```

### Pattern 5: Solo Mode via Click Handler
**What:** Clicking a line isolates it (dims all others). Click again resets. Separate from legend toggle.
**When to use:** User decision -- click interaction.
**Example:**
```typescript
// State in use-curve-chart-state.ts
const [soloedBatch, setSoloedBatch] = useState<string | null>(null);

// On Line click
const handleLineClick = (batchName: string) => {
  setSoloedBatch((prev) => (prev === batchName ? null : batchName));
};

// Apply to each Line's opacity
const getLineOpacity = (batchName: string) => {
  if (!soloedBatch) return isNewest ? 1 : 0.5;
  return soloedBatch === batchName ? 1 : 0.1;
};
```

### Anti-Patterns to Avoid
- **Using `dataKey` with dots or special chars in batch names:** Recharts interprets dots as nested property access. Sanitize batch names or use bracket notation. Consider mapping batch names to safe keys (e.g., `batch_0`, `batch_1`) with a lookup table.
- **Setting missing data to 0 instead of undefined:** This creates false zero cliffs (CURVE-03 violation). Always use `undefined` for months beyond a batch's age.
- **Categorical X-axis:** Using default `type="category"` makes months evenly spaced regardless of actual time gap. Must use `type="number"`.
- **Rendering all lines when partner has 30+ batches:** Overwhelms both visually and performance-wise. Cap at 8 visible, let legend toggle visibility.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Responsive chart container | Manual resize observer | Recharts `ResponsiveContainer` (via shadcn `ChartContainer`) | Already handles debounced resize, SSR dimensions |
| Line animation | Custom SVG path animation | Recharts built-in `isAnimationActive` + `animationDuration` + `animationEasing` | Built into Line component, handles path interpolation |
| Tooltip positioning | Manual mouse tracking | Recharts `Tooltip` + custom content component | Handles viewport edges, follows cursor automatically |
| Color palette generation | Manual color math | CSS custom properties `--chart-1` through `--chart-5` + oklch manipulation for extended palette | Theme-aware, dark mode compatible |

**Key insight:** Recharts 3.x handles animation, tooltip positioning, and responsive sizing internally. Focus custom code on data transformation and interaction state management, not rendering mechanics.

## Common Pitfalls

### Pitfall 1: Recharts Re-renders on Every State Change
**What goes wrong:** Chart re-animates on every hover/click because parent re-renders with new state.
**Why it happens:** State changes in parent cause child re-render; Recharts interprets new props as new data.
**How to avoid:** Memoize the pivoted data with `useMemo`. Keep chart state (solo, visibility) in a separate hook. Use `isAnimationActive` only on mount (set to false after initial render or use `animateNewValues={false}`).
**Warning signs:** Chart flickers or replays animation on hover.

### Pitfall 2: Batch Names with Special Characters
**What goes wrong:** Recharts `dataKey` interprets dots as nested access. Batch name "2024.Q1" breaks.
**Why it happens:** Recharts uses lodash-style property access for `dataKey`.
**How to avoid:** Map batch names to sanitized keys (`batch_0`, `batch_1`, etc.) and maintain a lookup table for display names. Use the lookup in tooltip and legend.
**Warning signs:** Lines don't render, or show `undefined` values.

### Pitfall 3: Animation Conflicts with Dynamic Line Count
**What goes wrong:** When toggling batch visibility or switching metrics, Recharts animations can conflict -- old lines animate out while new lines animate in, causing visual chaos.
**Why it happens:** Recharts tracks lines by `dataKey`. Changing visible lines means adding/removing `Line` components.
**How to avoid:** Use the `hide` prop on `Line` instead of conditionally rendering `Line` components. Hidden lines still exist in DOM but are not visible. This lets Recharts track state cleanly.
**Warning signs:** Lines jump or flash when toggling visibility.

### Pitfall 4: Legend Click Handler Scope
**What goes wrong:** shadcn's `ChartLegendContent` doesn't support click handlers out of the box. Need custom legend.
**Why it happens:** The built-in legend is purely presentational.
**How to avoid:** Build a custom `CurveLegend` component that reads from chart config but manages its own click state for toggling visibility.
**Warning signs:** Legend is unclickable or clicks don't affect chart.

### Pitfall 5: Tooltip Shows All Series at a Given X
**What goes wrong:** Default Recharts tooltip shows all series values at the hovered X position, not just the hovered line.
**Why it happens:** Recharts `Tooltip` defaults to showing all payload entries at the active coordinate.
**How to avoid:** Use a custom tooltip content component that filters to only show the nearest/active line. Use `activeDot` on `Line` and check `payload` in tooltip to match only the active series.
**Warning signs:** Tooltip shows 8+ lines of data on hover, overwhelming the user.

### Pitfall 6: SSR Hydration with Recharts
**What goes wrong:** Recharts uses SVG and browser APIs that don't exist on the server. Hydration mismatch.
**Why it happens:** Chart renders differently on server vs client.
**How to avoid:** Use `next/dynamic` with `ssr: false` (CURVE-07 requirement). The loading skeleton covers the SSR gap.
**Warning signs:** Console hydration warnings, chart flickers on load.

## Code Examples

### Complete Chart Shell
```typescript
'use client';

import { useMemo, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { BatchCurve } from '@/types/partner-stats';
import { COLLECTION_MONTHS } from '@/lib/computation/reshape-curves';
import { ChartContainer } from '@/components/ui/chart';

interface CollectionCurveChartProps {
  curves: BatchCurve[];
}

export function CollectionCurveChart({ curves }: CollectionCurveChartProps) {
  const [metric, setMetric] = useState<'recoveryRate' | 'amount'>('recoveryRate');
  const [soloedBatch, setSoloedBatch] = useState<string | null>(null);
  const [showAverage, setShowAverage] = useState(true);
  const [hiddenBatches, setHiddenBatches] = useState<Set<string>>(new Set());

  // Sort by age descending (newest = shortest age first)
  const sortedCurves = useMemo(
    () => [...curves].sort((a, b) => a.ageInMonths - b.ageInMonths),
    [curves],
  );

  // Most recent = lowest ageInMonths
  const newestBatch = sortedCurves[0]?.batchName;

  // ... pivot data, build chart config, render
}
```

### Color Palette for 8+ Lines
```typescript
// 5 CSS variables already defined. For up to 8 visible lines:
// Use chart-1 for newest (bold), chart-2 through chart-5 for next 4,
// then generate additional muted colors:
const EXTENDED_COLORS = [
  'var(--chart-1)', // newest batch -- bold
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  'oklch(0.6 0.1 200)',  // muted teal
  'oklch(0.6 0.1 290)',  // muted purple
  'oklch(0.6 0.1 60)',   // muted gold
];

// For dark mode, adjust lightness:
// Already handled by CSS variables for first 5.
// Extended colors use oklch which is theme-independent --
// consider adding --chart-6 through --chart-8 in globals.css.
```

### Integration Point in data-display.tsx
```typescript
// In DataDisplay, conditionally render chart above table at partner level:
import dynamic from 'next/dynamic';
import { usePartnerStats } from '@/hooks/use-partner-stats';

const CollectionCurveChart = dynamic(
  () => import('@/components/charts/collection-curve-chart')
    .then((mod) => mod.CollectionCurveChart),
  { ssr: false, loading: () => <Skeleton className="h-[40vh] w-full" /> }
);

// Inside DataDisplay render:
{drillState.level === 'partner' && partnerStats?.curves && (
  <CollectionCurveChart curves={partnerStats.curves} />
)}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Recharts 2.x with class components | Recharts 3.x with function components + hooks | 3.0 release | Simpler API, better tree-shaking, animation defaults to "auto" (respects prefers-reduced-motion) |
| Manual ResponsiveContainer sizing | shadcn ChartContainer with initialDimension | shadcn chart component | Eliminates SSR flash -- renders at initial dimensions before measuring |
| Custom color management | CSS custom properties via ChartConfig | shadcn chart | Theme-aware colors that work in light/dark mode |

**Deprecated/outdated:**
- `isAnimationActive={true}` hard-coded: Use `"auto"` (default in 3.x) which respects `prefers-reduced-motion` for accessibility.
- Recharts `Legend` with onClick: The built-in Legend doesn't support interactive click-to-toggle well. Build custom legend component.

## Open Questions

1. **Batch name sanitization strategy**
   - What we know: Batch names come from Snowflake `BATCH` column. Unknown if they contain dots, brackets, or other Recharts-problematic characters.
   - What's unclear: Exact format of batch names in production data.
   - Recommendation: Defensively map to safe keys (`batch_0`, `batch_1`) with display name lookup. Zero risk approach.

2. **Chart-to-table interaction**
   - What we know: CONTEXT.md defines click-to-isolate on the chart. No mention of chart-to-table linking (e.g., clicking a line scrolls table to that batch).
   - What's unclear: Whether this cross-component interaction is desired.
   - Recommendation: Out of scope for Phase 12. Could be added later with shared state.

3. **Extended color palette for dark mode**
   - What we know: 5 chart colors defined with dark mode variants. Need up to 8.
   - What's unclear: Whether 3 additional CSS variables should be added to globals.css.
   - Recommendation: Add `--chart-6`, `--chart-7`, `--chart-8` to globals.css for full theme support. Low effort, high consistency.

## Sources

### Primary (HIGH confidence)
- Recharts 3.8.0 type definitions -- `node_modules/recharts/types/` (Line, XAxis, ReferenceLine, LineChart)
- shadcn Chart component -- `src/components/ui/chart.tsx` (ChartContainer, ChartTooltip, ChartLegend APIs)
- Next.js 16.2.3 lazy loading docs -- `node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md`
- Phase 10 data layer -- `src/lib/computation/reshape-curves.ts`, `src/types/partner-stats.ts`, `src/hooks/use-partner-stats.ts`

### Secondary (MEDIUM confidence)
- Recharts multi-line patterns with numeric axis -- based on type definitions and API surface analysis

### Tertiary (LOW confidence)
- Extended color palette suggestions -- based on oklch color space knowledge, should be validated visually

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already installed and verified in codebase
- Architecture: HIGH - Data layer types known, Recharts API verified from type definitions
- Pitfalls: HIGH - Based on actual Recharts 3.x type analysis and known React patterns
- Data transformation: HIGH - BatchCurve types and pivot requirements fully understood from source

**Research date:** 2026-04-12
**Valid until:** 2026-05-12 (stable stack, no pending upgrades)
