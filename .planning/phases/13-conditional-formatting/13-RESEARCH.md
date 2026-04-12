# Phase 13: Conditional Formatting - Research

**Researched:** 2026-04-12
**Domain:** Table cell conditional formatting with deviation-based color coding
**Confidence:** HIGH

## Summary

Phase 13 adds deviation-based conditional formatting to the batch table at the partner drill-down level. The existing codebase already has: (1) a `FormattedCell` component with static threshold-based formatting and tooltips, (2) `computeNorms()` producing mean/stddev per metric, (3) CSS variables for cell tints, and (4) drill-down state detection. The work is primarily extending existing patterns rather than introducing new libraries.

The main challenge is threading partner norms through to `FormattedCell` without prop-drilling (React Context is the right tool), computing continuous opacity from deviation magnitude, and adding a localStorage-persisted toggle. No new dependencies are needed.

**Primary recommendation:** Create a `PartnerNormsContext` that provides norms + toggle state, extend `FormattedCell` to consume it for deviation-based formatting at partner level while preserving existing static thresholds at root level.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Cell background tint (not text color) — light green/red wash, numbers stay default text color
- Continuous gradient — opacity scales smoothly with deviation magnitude, no discrete steps
- Neutral zone (within 1.5 stddev): no color at all, plain cell
- Green/red palette is fine for now — tooltips provide the numbers so color isn't the only signal
- Format: "12.3% vs partner avg 18.7% (-34%)" — value, benchmark, and percentage deviation
- Hover trigger (standard mouse hover, disappears on leave)
- No tooltip on neutral cells — only colored cells get tooltips
- Dollar columns show percentage deviation: "$1.2M vs partner avg $1.8M (-33%)"
- Toggle in table toolbar/header area — small switch labeled "Heatmap"
- State persists in localStorage across sessions
- When off: all cell backgrounds return to default, tooltips disappear — clean numbers only
- Strictly the listed metrics only: collection curve milestones (3mo, 6mo, 9mo, 12mo rates), penetration rate, conversion rate, total collected
- Other numeric columns stay plain
- Polarity: higher is always better (green = above avg) for all formatted metrics
- Footer/aggregate row: no formatting, only individual batch rows

### Claude's Discretion
- Exact green/red color values and opacity curve
- Max opacity cap (so tints don't overwhelm readability)
- Transition animation when toggling on/off
- Tooltip positioning and delay timing

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| COND-01 | Cells color-coded by deviation from partner historical norm | Extend `FormattedCell` with deviation logic consuming `PartnerNormsContext`; norms already computed by `computeNorms()` |
| COND-02 | Norms computed as partner mean ± 1.5 stddev, pre-computed in `usePartnerStats` and provided via React Context | `computeNorms()` already returns `{ mean, stddev, count }` per metric; add Context provider wrapping partner-level table |
| COND-03 | Color intensity proportional to deviation magnitude | Continuous opacity mapping: `opacity = clamp(abs(zScore - 1.5) / maxZ, 0, maxOpacity)` with CSS `rgba()` or oklch alpha |
| COND-04 | Active at partner drill-down level only | `drillState.level` already available; Context provides null at root level, FormattedCell falls through to existing static thresholds |
| COND-05 | Applied to: collection curve milestones, penetration rates, conversion rate, total collected | Define `HEATMAP_COLUMNS` set from existing `COLUMN_CONFIGS` keys; only these columns query norms |
| COND-06 | Tooltip explains deviation with format "12.3% vs partner avg 18.7% (-34%)" | Extend tooltip in `FormattedCell`; format using existing `getFormatter()` for consistent number formatting |
| COND-07 | Toggle on/off for users who prefer clean numbers | localStorage-persisted Switch component in table toolbar; toggle state in Context |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React Context | (built-in) | Provide norms + toggle state to cells | Already used for `DataFreshnessContext`; avoids prop-drilling through table layers |
| shadcn/ui Switch | (installed) | Toggle component | Consistent with existing UI; already in the project |
| Tailwind CSS | (installed) | Opacity/color utility classes | Already used for all styling |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| oklch color space | (CSS native) | Perceptually uniform color tints | Already used in `globals.css` for cell-tint-low/high |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| React Context | Props drilling | Context avoids threading norms through DataTable → TableBody → TableRow → FormattedCell |
| oklch alpha for opacity | rgba backgrounds | oklch is already the project standard and perceptually uniform |
| CSS transition for toggle | No animation | Smooth 150ms transition improves polish at near-zero cost |

**Installation:** No new packages needed.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── contexts/
│   └── partner-norms.tsx          # NEW: PartnerNormsContext (norms + toggle)
├── lib/formatting/
│   ├── thresholds.ts              # EXISTING: static thresholds (untouched)
│   ├── deviation.ts               # NEW: deviation computation + color mapping
│   └── index.ts                   # UPDATE: re-export deviation utilities
├── components/table/
│   ├── formatted-cell.tsx         # UPDATE: add deviation formatting path
│   └── heatmap-toggle.tsx         # NEW: toolbar switch
└── hooks/
    └── use-heatmap-preference.ts  # NEW: localStorage persistence
```

### Pattern 1: Context-Based Conditional Formatting
**What:** PartnerNormsContext provides `{ norms, heatmapEnabled, toggleHeatmap }` to the cell tree. At root level, norms is null, so FormattedCell falls through to existing static thresholds.
**When to use:** When cell formatting depends on computed data from a parent scope (partner norms).
**Example:**
```typescript
// PartnerNormsContext
interface PartnerNormsValue {
  norms: Record<string, MetricNorm> | null;
  heatmapEnabled: boolean;
  toggleHeatmap: () => void;
}
```

### Pattern 2: Deviation-to-Opacity Mapping
**What:** Convert z-score to a continuous opacity value. Values within 1.5 stddev get opacity 0 (neutral). Beyond that, opacity scales linearly to a capped max.
**When to use:** For the continuous gradient requirement.
**Example:**
```typescript
function deviationToOpacity(value: number, norm: MetricNorm): number {
  if (norm.stddev === 0 || norm.count < 2) return 0;
  const zScore = Math.abs((value - norm.mean) / norm.stddev);
  if (zScore <= 1.5) return 0; // neutral zone
  // Scale from 0 at z=1.5 to maxOpacity at z=4
  const maxOpacity = 0.35;
  const maxZ = 4;
  return Math.min((zScore - 1.5) / (maxZ - 1.5), 1) * maxOpacity;
}
```

### Pattern 3: Dual-Mode Cell Formatting
**What:** FormattedCell checks context first. If at partner level with heatmap enabled, use deviation formatting. Otherwise, fall through to existing static threshold logic.
**When to use:** This exact phase — layering new formatting on existing.

### Anti-Patterns to Avoid
- **Modifying static thresholds for partner level:** Keep the two systems separate. Static thresholds at root, deviation at partner.
- **Prop-drilling norms through table layers:** Use Context instead.
- **Discrete color steps (bands):** User explicitly chose continuous gradient.
- **Formatting footer/aggregate rows:** User explicitly excluded these.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Toggle persistence | Custom storage API | Simple `localStorage.getItem/setItem` with a hook | Tiny scope, no need for abstraction |
| Tooltip component | Custom tooltip | shadcn `Tooltip` (already used in FormattedCell) | Consistent behavior, accessibility built-in |
| Switch component | Custom toggle | shadcn `Switch` (already installed) | Matches design system |

**Key insight:** Nearly everything needed is already in the codebase — this phase is extension, not greenfield.

## Common Pitfalls

### Pitfall 1: Static Thresholds Broken at Root Level
**What goes wrong:** Accidentally applying deviation formatting at root level, or removing static threshold checks.
**Why it happens:** Both systems live in FormattedCell — easy to short-circuit the wrong one.
**How to avoid:** Guard deviation path with `norms !== null && heatmapEnabled` check. Keep static threshold path completely untouched.
**Warning signs:** Root-level cells gain/lose background colors after the change.

### Pitfall 2: Division by Zero in Stddev
**What goes wrong:** Partners with 1 batch have stddev=0, causing NaN in z-score calculation.
**Why it happens:** `computeNorms` returns stddev=0 for single-batch partners.
**How to avoid:** Early return opacity 0 when stddev === 0 or count < 2.
**Warning signs:** NaN showing in cell styles or tooltips.

### Pitfall 3: Percentage Deviation for Dollar Columns
**What goes wrong:** Showing absolute deviation for currency columns instead of percentage deviation.
**Why it happens:** Not checking column type when computing deviation display.
**How to avoid:** Always compute percentage deviation for tooltip display: `((value - mean) / mean) * 100`.
**Warning signs:** Tooltip showing "$50 vs partner avg $200 (-$150)" instead of "(-75%)".

### Pitfall 4: Opacity Too Strong
**What goes wrong:** Cells become illegible because background tint is too saturated.
**Why it happens:** Unbounded opacity or max opacity set too high.
**How to avoid:** Cap max opacity at 0.35 (or similar). Test with extreme outliers.
**Warning signs:** Numbers hard to read against colored background.

### Pitfall 5: Formatting Footer Row
**What goes wrong:** Aggregate/footer row gets heatmap coloring.
**Why it happens:** Footer cells pass through the same FormattedCell.
**How to avoid:** FormattedCell or the Context should provide a way to detect footer context (e.g., `isFooter` flag or separate rendering path for footer).
**Warning signs:** Footer cells showing green/red tints.

### Pitfall 6: Collection Milestone Column Key Mismatch
**What goes wrong:** The HEATMAP_COLUMNS set doesn't match the actual Snowflake column keys.
**Why it happens:** Context says "3mo, 6mo, 9mo, 12mo" but actual keys are `COLLECTION_AFTER_3_MONTH`, etc.
**How to avoid:** Use exact keys from `COLUMN_CONFIGS` and `computeNorms` ALL_METRICS.
**Warning signs:** Some columns not getting formatted despite being in the "apply to" list.

## Code Examples

### Deviation Computation
```typescript
interface DeviationResult {
  zScore: number;
  percentDeviation: number;
  direction: 'above' | 'below' | 'neutral';
  opacity: number;
}

function computeDeviation(
  value: number,
  norm: MetricNorm,
): DeviationResult | null {
  if (norm.count < 2 || norm.stddev === 0) return null;

  const zScore = (value - norm.mean) / norm.stddev;
  const absZ = Math.abs(zScore);

  if (absZ <= 1.5) {
    return { zScore, percentDeviation: 0, direction: 'neutral', opacity: 0 };
  }

  const maxOpacity = 0.35;
  const maxZ = 4;
  const opacity = Math.min((absZ - 1.5) / (maxZ - 1.5), 1) * maxOpacity;
  const percentDeviation = norm.mean !== 0
    ? ((value - norm.mean) / norm.mean) * 100
    : 0;

  return {
    zScore,
    percentDeviation,
    direction: value > norm.mean ? 'above' : 'below',
    opacity,
  };
}
```

### Tooltip Text Generation
```typescript
function formatDeviationTooltip(
  formattedValue: string,
  formattedMean: string,
  percentDeviation: number,
): string {
  const sign = percentDeviation > 0 ? '+' : '';
  return `${formattedValue} vs partner avg ${formattedMean} (${sign}${percentDeviation.toFixed(0)}%)`;
}
```

### Heatmap Toggle Hook
```typescript
const STORAGE_KEY = 'bounce-heatmap-enabled';

function useHeatmapPreference(): [boolean, () => void] {
  const [enabled, setEnabled] = useState(() => {
    if (typeof window === 'undefined') return true;
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === null ? true : stored === 'true';
  });

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  return [enabled, toggle];
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Discrete color bands (red/yellow/green) | Continuous opacity gradient | Current best practice | More informative, less visually jarring |
| Static thresholds | Deviation-based (z-score) | This phase | Adapts to each partner's historical performance |
| RGB color space | oklch color space | CSS Color Level 4 | Perceptually uniform — tints look equally intense at same opacity |

**Deprecated/outdated:**
- The existing `COLUMN_THRESHOLDS` static system remains for root-level only. Not deprecated, just scoped differently.

## Open Questions

1. **Exact column keys for "collection curve milestones (3mo, 6mo, 9mo, 12mo)"**
   - What we know: Context says 3mo, 6mo, 9mo, 12mo rates. The Snowflake columns are `COLLECTION_AFTER_3_MONTH`, `COLLECTION_AFTER_6_MONTH`, `COLLECTION_AFTER_9_MONTH`, `COLLECTION_AFTER_12_MONTH`. These are currency (absolute dollar) columns, not rate columns.
   - What's unclear: Whether "rates" means recovery rate % (which doesn't exist as a column) or the absolute collection amounts.
   - Recommendation: Use the absolute collection columns since those are what exist. The deviation from partner mean works the same way regardless of units.

2. **PENETRATION_RATE column key**
   - What we know: Multiple penetration rate columns exist: `PENETRATION_RATE_POSSIBLE_AND_CONFIRMED`, `PENETRATION_RATE_CONFIRMED_ONLY`, `PENETRATION_RATE_POSSIBLE_ONLY`.
   - Recommendation: Use `PENETRATION_RATE_POSSIBLE_AND_CONFIRMED` as the primary one — it's the most comprehensive.

3. **CONVERSION_RATE column key**
   - What we know: Column is `RAITO_FIRST_TIME_CONVERTED_ACCOUNTS` (note the typo in Snowflake).
   - Recommendation: Use this key directly.

4. **TOTAL_COLLECTED column key**
   - What we know: `TOTAL_COLLECTED_LIFE_TIME` is the existing column.
   - Recommendation: Use `TOTAL_COLLECTED_LIFE_TIME`.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `src/hooks/use-partner-stats.ts`, `src/lib/computation/compute-norms.ts`, `src/components/table/formatted-cell.tsx`, `src/lib/formatting/thresholds.ts`
- Codebase analysis: `src/types/partner-stats.ts` (MetricNorm type), `src/hooks/use-drill-down.ts` (DrillState type)
- Codebase analysis: `src/lib/columns/config.ts` (all 61 column definitions with types)
- Codebase analysis: `src/contexts/data-freshness.tsx` (existing Context pattern)
- Codebase analysis: `src/app/globals.css` (oklch cell tint CSS variables)

### Secondary (MEDIUM confidence)
- oklch color space behavior — well-documented CSS standard, perceptually uniform

### Tertiary (LOW confidence)
- None — all findings verified against codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries already installed and used
- Architecture: HIGH - extending existing patterns (Context, FormattedCell)
- Pitfalls: HIGH - identified from codebase structure analysis

**Research date:** 2026-04-12
**Valid until:** 2026-05-12 (stable — no external dependencies)
