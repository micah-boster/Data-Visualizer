# Phase 20: Cross-Partner UI - Research

**Researched:** 2026-04-13
**Domain:** Cross-partner visualization — percentile columns, trajectory overlay chart, reference lines, comparison matrix
**Confidence:** HIGH

## Summary

Phase 20 is a pure UI/visualization phase. All data is already computed by Phase 19's `computeCrossPartnerData()` and exposed via `CrossPartnerProvider`/`useCrossPartnerContext()`. The codebase already has a mature Recharts 3.8.0 charting pattern (LineChart with custom tooltips, legends, hover state management) in the existing `CollectionCurveChart`. The new trajectory overlay chart reuses this pattern almost entirely, with the key difference being one line per partner (not per batch).

The root-level `DataDisplay` component already conditionally renders charts and panels based on `drillState.level === 'root'`. New cross-partner UI elements slot into this same pattern: percentile columns added to the root table's column definitions, trajectory chart rendered above the table at root level, and comparison matrix as a new component also at root level.

**Primary recommendation:** Build two plans: (1) percentile rank columns in root table + trajectory overlay chart with reference lines, (2) partner comparison matrix with three view modes. Both plans are Wave 1 since they have no inter-dependencies — they consume the same `CrossPartnerData` from context.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Show both formats combined: "P72 (3/8)" — percentile badge plus positional rank
- Green/yellow/red gradient color coding on percentile cells based on performance tier (top 25% = green, bottom 25% = red)
- All four key metrics get percentile rank columns: penetration rate, 6mo collection rate, 12mo collection rate, total collected
- Rank columns appear inline next to their corresponding metric value column (not grouped separately)
- Unique color per partner from a distinct palette, with clickable legend to toggle partners on/off
- Hover interaction: highlight hovered partner's line + dim all other lines + show tooltip with partner name and value at that month
- X-axis = months since placement (0, 1, 2... 12+) — normalized timeline, not calendar dates
- Y-axis = recovery rate %
- Three view modes: Heatmap table (default), Horizontal bar ranking, Plain table
- Orientation switchable: rows=partners/cols=metrics OR rows=metrics/cols=partners
- Click column/row headers to sort by that metric
- Best-in-class: black dashed line, labeled "Best-in-class (Partner X)"
- Portfolio average: gray dashed line, labeled "Portfolio Avg"
- Both reference lines always visible (not togglable)
- Dashed pattern distinguishes reference lines from solid partner lines

### Claude's Discretion
- Chart library choice and configuration
- Exact color palette for partner lines (ensure sufficient contrast for 8+ partners)
- Loading states and skeleton patterns
- Responsive behavior / mobile layout adjustments
- View mode toggle UI design (tabs, dropdown, icon buttons)
- Exact percentile tier thresholds (top/bottom quartile or custom breakpoints)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| XPC-05 | Percentile rank columns at root-level partner table for key metrics, rendered as "P72" or "3 of 8" format | Add 4 new column definitions to COLUMN_CONFIGS with custom cell renderer consuming `CrossPartnerData` from context |
| XPC-06 | Cross-partner trajectory overlay chart at root level showing each partner's average collection curve normalized by recovery rate % | New `CrossPartnerTrajectoryChart` component using Recharts LineChart, one Line per partner, consuming `CrossPartnerData.rankedPartners[].averageCurve` |
| XPC-07 | Best-in-class and portfolio average reference lines on trajectory chart | Two additional `ReferenceLine` or dashed `Line` elements: black dashed for best-in-class, gray dashed for portfolio average from `CrossPartnerData.portfolioAverageCurve` |
| XPC-08 | Partner comparison matrix/summary view with key metrics side-by-side | New `PartnerComparisonMatrix` component with 3 view modes (heatmap, bar, plain table), orientation toggle, sortable |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| recharts | 3.8.0 | LineChart, Line, XAxis, YAxis, Tooltip, Legend, ReferenceLine | Already used in CollectionCurveChart; Recharts 3.x has ReferenceLine with strokeDasharray for dashed lines |
| @tanstack/react-table | 8.21.3 | Column definitions for percentile columns | Already powers DataTable; new columns follow existing COLUMN_CONFIGS pattern |
| shadcn/ui | 4.2.0 | ChartContainer, Tabs, Table, Card components | Existing UI system; comparison matrix uses Card + Tabs for view modes |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | 1.8.0 | Icons for view mode toggles | BarChart3, Table, Grid3X3 icons for matrix view switcher |
| tailwindcss | existing | Color utilities for heatmap cells | bg-green-500/20, bg-yellow-500/20, bg-red-500/20 for tier colors |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Recharts ReferenceLine | Custom SVG overlay | ReferenceLine is built-in and supports strokeDasharray; no need for custom SVG |
| shadcn Tabs for view modes | Custom radio group | Tabs match existing UI patterns and provide keyboard navigation |

**Installation:**
```bash
# No new dependencies — all libraries already installed
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   ├── cross-partner/
│   │   ├── trajectory-chart.tsx           # XPC-06, XPC-07: Overlay chart with reference lines
│   │   ├── trajectory-tooltip.tsx         # Custom tooltip for trajectory chart
│   │   ├── trajectory-legend.tsx          # Clickable legend with partner toggle
│   │   ├── comparison-matrix.tsx          # XPC-08: Main matrix container with view mode tabs
│   │   ├── matrix-heatmap.tsx             # Heatmap table view mode
│   │   ├── matrix-bar-ranking.tsx         # Horizontal bar ranking view mode
│   │   ├── matrix-plain-table.tsx         # Plain table view mode
│   │   └── percentile-cell.tsx            # XPC-05: Shared cell renderer for percentile columns
│   ├── data-display.tsx                   # MODIFIED: Add trajectory chart + matrix at root level
│   └── table/data-table.tsx               # MODIFIED: Integrate percentile columns at root level
├── lib/
│   └── columns/
│       └── config.ts                      # MODIFIED: Add percentile rank column definitions
```

### Pattern 1: Context-Driven Column Injection (for percentile columns)

**What:** Column definitions that read from CrossPartnerProvider context to render percentile data alongside metric values.
**When to use:** When columns need data not present in the row itself.
**Approach:** The percentile columns are defined in COLUMN_CONFIGS with a custom cell renderer that calls `useCrossPartnerContext()` to look up the partner's percentile rank by matching PARTNER_NAME from the row data.

### Pattern 2: Recharts Multi-Line Chart (existing pattern extended)

**What:** One `<Line>` per partner, dynamically generated from `CrossPartnerData.rankedPartners`.
**When to use:** Trajectory overlay chart.
**Key differences from CollectionCurveChart:**
- Lines represent partners, not batches
- Data comes from `averageCurve.dollarWeighted` (default) or `averageCurve.equalWeight`
- Two extra dashed reference lines (best-in-class + portfolio avg)
- Hover dims all lines except hovered partner

### Pattern 3: View Mode State Machine (for comparison matrix)

**What:** Local state managing which view mode is active (heatmap | bar | plain), which orientation (partners-as-rows | metrics-as-rows), and sort column.
**When to use:** Components with multiple visualization modes.
**Implementation:** `useState` for viewMode, orientation, sortKey, sortDirection. Each view mode is a separate child component receiving the same sorted/filtered data.

### Anti-Patterns to Avoid
- **Don't compute percentile data in the cell renderer:** Cell renderers must only READ from context, not compute. All computation lives in Phase 19's `computeCrossPartnerData`.
- **Don't create a new LineChart component from scratch:** Extend the existing `CHART_COLORS` array and chart configuration pattern from `curve-tooltip.tsx`.
- **Don't use separate data fetching for matrix:** The comparison matrix consumes the same `CrossPartnerData` from context as everything else.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Dashed reference lines | Custom SVG path overlay | Recharts `<Line strokeDasharray="5 5">` or `<ReferenceLine>` | Built-in support with proper axis alignment |
| Heatmap cell colors | Manual RGB calculation | Tailwind color utilities with opacity | Consistent with existing conditional formatting in Phase 13 |
| View mode tabs | Custom radio buttons | shadcn `<Tabs>` component | Keyboard nav, ARIA, existing design system |
| Horizontal bar chart | Custom SVG bars | Recharts `<BarChart layout="vertical">` | Axis alignment, tooltips, responsive sizing |

## Common Pitfalls

### Pitfall 1: Partner Color Consistency
**What goes wrong:** Partner "Affirm" gets blue in the trajectory chart but green in the comparison matrix bar chart.
**Why it happens:** Colors assigned dynamically per render based on array index.
**How to avoid:** Build a deterministic `partnerColorMap` from sorted partner names at the top level, pass to all child components. Use the same map in both chart and matrix.

### Pitfall 2: Recharts Key Prop on Dynamic Lines
**What goes wrong:** Lines don't update when partner visibility toggles or data changes.
**Why it happens:** Recharts 3.x requires stable `key` props on `<Line>` elements.
**How to avoid:** Use `key={partnerName}` on each Line, not array index.

### Pitfall 3: Context Not Available in Column Cell Renderers
**What goes wrong:** `useCrossPartnerContext()` throws "must be used within CrossPartnerProvider" in column cell renderer.
**Why it happens:** Column cell renderers are functions, not React components with hooks.
**How to avoid:** Use the `cell` property in column definition which receives a React component (not a plain function). Or pass crossPartnerData as a prop through DataTable, making it available to cell renderers without hooks.

### Pitfall 4: Percentile Column Width
**What goes wrong:** "P72 (3/8)" text overflows or wraps awkwardly in narrow columns.
**Why it happens:** Combined format is wider than typical metric values.
**How to avoid:** Use compact formatting with fixed column width. Render percentile badge as a colored chip with min-width.

### Pitfall 5: Dashed Line Rendering in Recharts 3.x
**What goes wrong:** `strokeDasharray` on ReferenceLine doesn't render at correct position.
**Why it happens:** ReferenceLine in Recharts 3.x works on categorical or numerical axes differently.
**How to avoid:** For overlay lines that follow the same X-axis as data, use regular `<Line>` elements with `strokeDasharray` property instead of `<ReferenceLine>`. Add best-in-class and portfolio-avg as data series in the pivoted data.

## Code Examples

### Percentile Cell Renderer Pattern
```typescript
// Percentile badge with color coding
function PercentileCell({ percentile, rank, total }: {
  percentile: number; // 0-1 from quantileRank
  rank: number;       // positional rank (1-based)
  total: number;      // total ranked partners
}) {
  const pValue = Math.round(percentile * 100);
  const tier = pValue >= 75 ? 'top' : pValue <= 25 ? 'bottom' : 'mid';
  const colorClass = {
    top: 'bg-green-500/20 text-green-700 dark:text-green-400',
    mid: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400',
    bottom: 'bg-red-500/20 text-red-700 dark:text-red-400',
  }[tier];

  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${colorClass}`}>
      P{pValue} ({rank}/{total})
    </span>
  );
}
```

### Trajectory Chart Data Pivoting
```typescript
// Pivot cross-partner curves for Recharts flat format
function pivotTrajectoryData(
  partners: CrossPartnerEntry[],
  portfolioAvg: CurvePoint[],
  bestInClass: { name: string; curve: CurvePoint[] },
  mode: 'equalWeight' | 'dollarWeighted',
) {
  const months = COLLECTION_MONTHS;
  return months.map((month) => {
    const point: Record<string, number> = { month };
    for (const p of partners) {
      const curvePoints = p.averageCurve[mode];
      const cp = curvePoints.find((c) => c.month === month);
      if (cp) point[p.partnerName] = cp.recoveryRate;
    }
    // Add reference lines as data series
    const avgPt = portfolioAvg.find((c) => c.month === month);
    if (avgPt) point['__portfolioAvg__'] = avgPt.recoveryRate;
    const bestPt = bestInClass.curve.find((c) => c.month === month);
    if (bestPt) point['__bestInClass__'] = bestPt.recoveryRate;
    return point;
  });
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Recharts 2.x custom shapes | Recharts 3.x with strokeDasharray on Line | 2024 | Dashed lines work directly on Line elements |
| CSS-in-JS for conditional cell colors | Tailwind utility classes | Project convention | Consistent with Phase 13 conditional formatting |

## Open Questions

1. **Averaging mode toggle location**
   - The trajectory chart needs a toggle for equal-weight vs dollar-weighted curves
   - Recommendation: Small toggle/dropdown within the chart card header, defaulting to dollar-weighted per CONTEXT.md

2. **Percentile column ordering**
   - CONTEXT says "inline next to corresponding metric" — but root-level table may not show all metric columns
   - Recommendation: Add percentile columns to COLUMN_CONFIGS, conditionally visible when at root level. They appear in the column picker for user control.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `src/components/charts/collection-curve-chart.tsx` — existing Recharts LineChart pattern
- Codebase analysis: `src/lib/computation/compute-cross-partner.ts` — data structure contract
- Codebase analysis: `src/types/partner-stats.ts` — CrossPartnerData, CrossPartnerEntry, PercentileRanks types
- Codebase analysis: `src/contexts/cross-partner-provider.tsx` — context provider pattern
- Codebase analysis: `src/components/data-display.tsx` — root-level rendering and provider nesting

### Secondary (MEDIUM confidence)
- Recharts 3.x documentation — Line strokeDasharray, ReferenceLine API

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in use, no new deps
- Architecture: HIGH — extends established patterns (charts, context, columns)
- Pitfalls: HIGH — identified from existing codebase patterns and Recharts behavior

**Research date:** 2026-04-13
**Valid until:** 2026-05-13 (stable — internal codebase patterns)
