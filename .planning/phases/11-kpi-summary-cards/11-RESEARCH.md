# Phase 11: KPI Summary Cards - Research

**Researched:** 2026-04-12
**Domain:** React component composition, KPI display, number formatting, responsive layout
**Confidence:** HIGH

## Summary

Phase 11 is a UI-only phase. All computation infrastructure already exists: `usePartnerStats` returns a `KpiAggregates` object with all six metrics pre-computed, and `computeTrending` returns `BatchTrend[]` with direction/delta for rate metrics. The work is purely presentational -- building 6 card components that consume existing data, formatting values per user specs (abbreviated dollars, 1-decimal percentages), adding trend arrows to rate cards, and handling loading/empty states.

The project already uses shadcn's `Card` component (`src/components/ui/card.tsx`) with `size="sm"` support, Tailwind CSS v4 for responsive layout, `lucide-react` for icons, and has established patterns for skeleton loading states and tooltips. The existing `TrendIndicator` component in the table provides the exact trend arrow + color logic that can be reused or adapted for card-level trends.

**Primary recommendation:** Build a `KpiSummaryCards` component that takes `KpiAggregates` and `TrendingData` as props, renders 6 compact cards in a responsive CSS grid, and inserts into `data-display.tsx` at the partner drill-down level alongside the existing collection curve chart.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- 6 separate cards: Batches, Accounts, Penetration, 6mo Rate, 12mo Rate, Total Collected
- Compact, number-forward design: big number, small label underneath, trend arrow inline
- Subtle card borders (light border, no background fill)
- Dollar amounts abbreviated: $1.2M, $450K
- Percentages to one decimal: 23.4%
- Short labels: "Batches", "Accounts", "Penetration", "6mo Rate", "12mo Rate", "Total Collected"
- Green up arrow + delta percentage, red down arrow + delta, gray dash for flat
- Trends only on rate metrics (penetration, 6mo rate, 12mo rate)
- Rolling average = all prior batches except the latest
- Single-batch partner: gray dash with "1 batch -- no trend yet" note
- Skeleton cards (gray pulsing placeholders) during loading
- Metric not computable: show em-dash with explanation text
- Zero-batch partner: "No batch data available for this partner"
- Responsive: reflow to 2 rows on smaller screens

### Claude's Discretion
- Flat threshold (how much change counts as "flat" vs up/down)
- Exact card sizing, spacing, and typography
- Responsive breakpoint choices

### Deferred Ideas (OUT OF SCOPE)
None
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| KPI-01 | 4-6 KPI cards displayed above the batch table at partner drill-down level | 6 cards in responsive grid, inserted in `data-display.tsx` at partner level (same conditional as collection curve chart) |
| KPI-02 | Cards show: total batches, total accounts placed, weighted avg penetration rate, avg collection rate at 6mo and 12mo, total lifetime collected | All 6 values available from `KpiAggregates` type returned by `computeKpis()` |
| KPI-03 | Cards aggregate from the same filtered row set as the table (not raw data) | `usePartnerStats` already filters by partner name from allRows -- cards consume its output |
| KPI-04 | Each card shows trend indicator comparing latest batch to partner rolling average | `TrendingData` from `computeTrending()` provides direction, deltaPercent, baselineCount; trends applied to rate cards only per user decision |
</phase_requirements>

## Standard Stack

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.2.4 | Component framework | Project standard |
| shadcn Card | v4.2.0 | Card container primitives | Already in `src/components/ui/card.tsx` |
| Tailwind CSS | v4 | Styling and responsive grid | Project standard |
| lucide-react | 1.8.0 | Icons (ArrowUp, ArrowDown, Minus) | Already used project-wide |

### Supporting (Already Available)
| Library | Purpose | When to Use |
|---------|---------|-------------|
| `@/components/ui/skeleton` | Skeleton loading placeholders | Loading state for cards |
| `@/components/ui/tooltip` | Hover explanations | Trend delta tooltip, "no data" explanations |
| `@/lib/formatting` | Number formatting utilities | Percentages, counts (extend for abbreviated currency) |

### No New Dependencies Needed
This phase requires zero new package installations. Everything is already in the project.

## Architecture Patterns

### Recommended Component Structure
```
src/components/
├── kpi/
│   ├── kpi-summary-cards.tsx    # Grid container, maps KpiAggregates to cards
│   ├── kpi-card.tsx             # Single card: value + label + optional trend
│   └── kpi-trend-arrow.tsx      # Trend arrow with color + delta (or extract from existing TrendIndicator)
```

### Pattern 1: Data Flow (Props Down from DataDisplay)
**What:** `KpiSummaryCards` receives `partnerStats.kpis` and `partnerStats.trending` as props from `data-display.tsx`, same as collection curve chart receives `partnerStats.curves`.
**When to use:** Always -- this follows the established pattern in `data-display.tsx`.
**Example:**
```typescript
// In data-display.tsx, alongside the existing collection curve conditional:
{drillState.level === 'partner' && partnerStats && (
  <KpiSummaryCards
    kpis={partnerStats.kpis}
    trending={partnerStats.trending}
  />
)}
```

### Pattern 2: Card Configuration Array
**What:** Define card specs as a typed array to avoid repetitive JSX. Each spec maps a KPI key to its label, format function, and whether it gets a trend indicator.
**When to use:** For the 6-card grid -- keeps the component DRY and easy to reorder.
**Example:**
```typescript
interface CardSpec {
  key: keyof KpiAggregates;
  label: string;
  format: (value: number) => string;
  trendMetric?: string; // Snowflake column name for trend lookup
}

const CARD_SPECS: CardSpec[] = [
  { key: 'totalBatches', label: 'Batches', format: formatCount },
  { key: 'totalAccounts', label: 'Accounts', format: formatCount },
  { key: 'weightedPenetrationRate', label: 'Penetration', format: (v) => formatPercentage(v, 1), trendMetric: 'PENETRATION_RATE_POSSIBLE_AND_CONFIRMED' },
  { key: 'collectionRate6mo', label: '6mo Rate', format: (v) => formatPercentage(v, 1), trendMetric: 'COLLECTION_AFTER_6_MONTH' },
  { key: 'collectionRate12mo', label: '12mo Rate', format: (v) => formatPercentage(v, 1), trendMetric: 'COLLECTION_AFTER_12_MONTH' },
  { key: 'totalCollected', label: 'Total Collected', format: formatAbbreviatedCurrency },
];
```

### Pattern 3: Responsive CSS Grid with Tailwind
**What:** Use CSS Grid for the 6-card layout with responsive breakpoints.
**When to use:** For the card container.
**Example:**
```typescript
// 2 columns on mobile, 3 on medium, 6 on large
<div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
  {cards}
</div>
```

### Pattern 4: Reuse Existing Trend Logic
**What:** The existing `TrendIndicator` in `src/components/table/trend-indicator.tsx` uses `getPolarity()` for context-aware coloring and the same `BatchTrend` type. The card trend arrow should reuse the same color logic (emerald for good, red for bad, muted for flat).
**When to use:** For the 3 rate cards that show trends.

### Anti-Patterns to Avoid
- **Re-computing KPIs in the card component:** Data is already computed by `usePartnerStats`. Cards are purely presentational.
- **Using Card with background fill:** User specified "subtle card borders, no background fill." Use `ring-1` border styling, override the default Card background.
- **Hardcoding trend thresholds differently:** `computeTrending` already uses a 5% threshold. Cards should consume the direction from `TrendingData`, not re-derive it.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Number formatting | Custom toLocaleString calls | `@/lib/formatting` module | Already handles currency, percentages, counts consistently |
| Trend direction logic | Custom comparison in cards | `computeTrending()` output | Already computes direction, delta, baselineCount with 5% threshold |
| Skeleton loading | Custom animation CSS | `@/components/ui/skeleton` | Project-standard pulsing placeholder |
| Tooltip on hover | Custom hover state | `@/components/ui/tooltip` | Already used throughout the app |
| Polarity-aware coloring | Hardcoded green=up, red=down | `getPolarity()` from metric-polarity.ts | All metrics here are higher_is_better, but using polarity keeps it correct |

## Common Pitfalls

### Pitfall 1: Abbreviated Currency Formatter Missing
**What goes wrong:** The existing `formatCurrency` produces `$1,234,567.89` but the user wants `$1.2M` and `$450K`.
**Why it happens:** No abbreviated currency formatter exists in `@/lib/formatting/numbers.ts` yet.
**How to avoid:** Add a `formatAbbreviatedCurrency` function to the formatting module. Use thresholds: >= 1M shows `$X.XM`, >= 1K shows `$XXXK`, below 1K shows full dollars.
**Warning signs:** Card showing `$1,234,567.89` instead of `$1.2M`.

### Pitfall 2: Trend Metric Name Mismatch
**What goes wrong:** Card tries to look up trend for a metric but finds nothing because the metric key in `TRENDING_METRICS` uses Snowflake column names (e.g., `COLLECTION_AFTER_6_MONTH`) while the KPI type uses camelCase (`collectionRate6mo`).
**Why it happens:** Two different naming conventions between `KpiAggregates` and `BatchTrend.metric`.
**How to avoid:** The card spec array must map each KPI key to the correct Snowflake column name for trend lookup. See the `trendMetric` field in the CardSpec pattern above.
**Warning signs:** Rate cards showing no trend arrow when they should.

### Pitfall 3: Collection Rate Trends vs Collection Amount Trends
**What goes wrong:** `computeTrending` computes trends on `COLLECTION_AFTER_6_MONTH` and `COLLECTION_AFTER_12_MONTH` which are raw dollar amounts in Snowflake, but the KPI cards show collection *rates* (as percentage of total placed). The trend direction for the raw amount might differ from the rate.
**Why it happens:** Trending is computed on raw column values, not on computed rates.
**How to avoid:** For the cards, the trend direction from `computeTrending` is still directionally correct for comparison purposes (higher collection amounts generally correlate with higher rates for same-partner batches). Accept this as a reasonable approximation. If exact rate-based trending is needed later, it would require changes to `computeTrending`.
**Warning signs:** Trend arrow saying "up" when the rate percentage is actually down. Monitor during testing.

### Pitfall 4: Single-Batch Partners
**What goes wrong:** `computeTrending` returns `insufficientHistory: true` for partners with < 3 batches, but the user specifically wants a "1 batch -- no trend yet" note for single-batch partners.
**Why it happens:** The trending system treats < 3 batches as insufficient, but 2-batch partners should probably show trends (or at minimum, a different message than 1-batch).
**How to avoid:** Check `trending.batchCount` to differentiate: 1 batch = "1 batch -- no trend yet", 2 batches = show dash with "Need 3+ batches", 3+ batches = show actual trends.

### Pitfall 5: Card Background vs Border Styling
**What goes wrong:** The shadcn `Card` component has a default `bg-card` background and `ring-1 ring-foreground/10` border. User wants "no background fill" with subtle borders.
**Why it happens:** Default Card styling includes background color.
**How to avoid:** Override with `className="bg-transparent"` or a similar approach. The `ring-1 ring-foreground/10` border is already subtle and matches the request.

## Code Examples

### Abbreviated Currency Formatter
```typescript
// Add to src/lib/formatting/numbers.ts
export function formatAbbreviatedCurrency(value: number): string {
  const v = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (v >= 1_000_000) {
    return `${sign}$${(v / 1_000_000).toFixed(1)}M`;
  }
  if (v >= 1_000) {
    return `${sign}$${Math.round(v / 1_000)}K`;
  }
  return `${sign}$${Math.round(v)}`;
}
```

### KPI Card Component Shape
```typescript
// src/components/kpi/kpi-card.tsx
interface KpiCardProps {
  label: string;
  value: string;
  trend?: {
    direction: 'up' | 'down' | 'flat';
    deltaPercent: number;
  } | null;
  insufficientHistory?: boolean;
  batchCount?: number;
  noData?: boolean;       // true when metric can't be computed (e.g., no 12mo data)
  noDataReason?: string;  // e.g., "No batches at 12mo yet"
}
```

### Trend Arrow for Cards
```typescript
// Reuse the same color logic from TrendIndicator
const arrow = direction === 'up' ? '↑' : direction === 'down' ? '↓' : '—';
const colorClass = direction === 'flat'
  ? 'text-muted-foreground'
  : direction === 'up'
    ? 'text-emerald-600 dark:text-emerald-400'
    : 'text-red-500 dark:text-red-400';

// Delta display: "+12.3%" or "-5.1%"
const deltaDisplay = direction !== 'flat'
  ? `${direction === 'up' ? '+' : ''}${deltaPercent.toFixed(1)}%`
  : null;
```

### Integration Point in data-display.tsx
```typescript
// Insert BEFORE the collection curve chart, AFTER schema warnings
{drillState.level === 'partner' && partnerStats && (
  <div className="shrink-0">
    <KpiSummaryCards
      kpis={partnerStats.kpis}
      trending={partnerStats.trending}
    />
  </div>
)}
```

### Skeleton Loading Cards
```typescript
// Show when partnerStats is null but drillState.level === 'partner'
<div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
  {Array.from({ length: 6 }).map((_, i) => (
    <div key={i} className="rounded-xl p-4 ring-1 ring-foreground/10">
      <Skeleton className="mb-2 h-8 w-20" />
      <Skeleton className="h-4 w-16" />
    </div>
  ))}
</div>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Inline card styles | Tailwind CSS utility classes | Already in use | Consistent with project |
| Custom card markup | shadcn Card primitives | Already in use | Use existing `Card` component or lightweight custom div |
| Full-precision numbers in KPI | Abbreviated display ($1.2M) | This phase | New formatter needed |

**Note on shadcn Card usage:** The shadcn Card component is relatively heavyweight for this use case (many data-slot attributes, nested gap/padding). For compact KPI cards with a single number + label, a simple `div` with matching ring/rounded classes may be cleaner. Either approach works -- the user's "subtle card borders, no background fill" spec is the key constraint.

## Open Questions

1. **Collection rate trend accuracy**
   - What we know: `computeTrending` trends on raw `COLLECTION_AFTER_6_MONTH` dollar amounts, not on the rate (amount/placed). Cards display the rate.
   - What's unclear: Whether the raw amount trend ever diverges meaningfully from the rate trend for same-partner batches with varying placement amounts.
   - Recommendation: Accept the approximation for now. Flag for review in testing. If divergence is observed, add rate-based trending to `computeTrending` later.

2. **Flat threshold value**
   - What we know: `computeTrending` uses 5% (THRESHOLD = 0.05). This is marked as Claude's discretion.
   - Recommendation: Use the existing 5% threshold from `computeTrending` rather than introducing a separate threshold for cards. Consistency is more important than tuning.

## Sources

### Primary (HIGH confidence)
- Project source code: `src/hooks/use-partner-stats.ts`, `src/lib/computation/compute-kpis.ts`, `src/lib/computation/compute-trending.ts` -- verified all KPI fields and trending data structures
- Project source code: `src/components/data-display.tsx` -- verified integration point and existing pattern for partner-level components
- Project source code: `src/components/table/trend-indicator.tsx` -- verified trend arrow color logic and polarity handling
- Project source code: `src/components/ui/card.tsx`, `src/components/ui/skeleton.tsx` -- verified available UI primitives
- Project source code: `src/lib/formatting/numbers.ts` -- verified existing formatters and identified gap (no abbreviated currency)
- Project source code: `src/types/partner-stats.ts` -- verified `KpiAggregates` and `TrendingData` type shapes

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries already installed and in use
- Architecture: HIGH - follows established patterns in data-display.tsx
- Pitfalls: HIGH - identified from direct code inspection of type mismatches and formatter gaps
- Formatting: HIGH - verified existing formatters, identified specific gap to fill

**Research date:** 2026-04-12
**Valid until:** 2026-05-12 (stable -- no external dependencies changing)
