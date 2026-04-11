# Phase 3: Data Formatting - Research

**Researched:** 2026-04-10
**Domain:** Client-side number/date formatting, TanStack Table cell renderers, conditional styling
**Confidence:** HIGH

## Summary

Phase 3 transforms raw numeric values in the table into human-readable formatted strings. The existing codebase is well-prepared for this: `definitions.ts` explicitly defers cell rendering to Phase 3, every column already has a `type` field in `ColumnConfig` (currency, percentage, count, number, date, text), and the table body uses `flexRender` which will automatically pick up custom `cell` functions.

The core work is: (1) build formatter functions per column type using `Intl.NumberFormat`, (2) add `cell` renderers to column definitions, (3) apply right-alignment to numeric columns via Tailwind, (4) add zero-dimming and null styling, (5) add conditional formatting (negative red, outlier background tints) with tooltip explanations, and (6) update the footer `formatAggregate` to use the same formatters.

**Primary recommendation:** Create a centralized `src/lib/formatting/` module with pure formatter functions per type, then wire them into column definitions via a `cell` property. Use `Intl.NumberFormat` for locale-aware formatting. Keep formatting logic separate from rendering logic (formatters return strings, cell renderers handle JSX/styling).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Percentages: 1 decimal place default (12.3%) -- configurable via a settings control
- Currency: always show cents ($1,234.56) -- no abbreviation, no truncation
- Counts: full number with commas (1,234,567) -- no abbreviation
- Very small values: show "<0.1%" instead of rounding to "0.0%"
- All numeric columns right-aligned
- Dates: short readable format (Jan 15, 2024) -- no ambiguous numeric formats
- Absolute dates only -- no relative time
- Timestamps: show date only in cell, full timestamp in tooltip
- Nulls: em dash -- carried from Phase 1
- Zeros: displayed normally but visually dimmed (lighter text color)
- Null and zero styling are distinct
- Aggregates exclude nulls
- Negative numbers: red text
- Outlier emphasis: subtle background tint (light red/green)
- Thresholds: fixed per column type, hardcoded
- Tooltip explanation on tinted cells

### Claude's Discretion
- Exact threshold values per column type
- Exact dimmed color values for zeros vs null styling (within dark/light mode themes)
- Exact red/green tint values for outlier backgrounds
- How to integrate precision settings control (popover from toolbar or settings panel)
- Whether to add settings control in this phase or defer to Phase 5

### Deferred Ideas (OUT OF SCOPE)
- User-configurable outlier thresholds (v2 Intelligence layer)
- Statistical outlier detection (mean +/- 2 sigma) (v2 anomaly detection)
- Abbreviated large values ($1.2M) -- decided against for v1
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FMT-01 | Currency values display with $ and commas | `Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })` in formatter module; cell renderer in column definitions |
| FMT-02 | Percentages display with % symbol and appropriate decimal places | `Intl.NumberFormat` with `minimumFractionDigits: 1, maximumFractionDigits: 1` plus `<0.1%` threshold check |
| FMT-03 | Large numbers display with commas | `Intl.NumberFormat('en-US')` for count/number types |
| FMT-04 | Numeric columns right-aligned | Tailwind `text-right` class applied via column meta type check in table-body |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Intl.NumberFormat | Built-in | Number/currency/percentage formatting | Browser-native, locale-aware, zero dependencies, handles edge cases (negative, rounding) |
| Intl.DateTimeFormat | Built-in | Date formatting | Same benefits; produces "Jan 15, 2024" format natively |
| @tanstack/react-table | ^8.21.3 | Cell renderers via `cell` property on ColumnDef | Already installed; cell rendering is the standard extension point |
| Tailwind CSS | ^4 | Alignment, conditional color classes | Already installed; `text-right`, `text-destructive`, custom tint utilities |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @base-ui/react Tooltip | ^1.3.0 | Tooltip for conditional formatting explanations | Already installed; wrap tinted cells |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Intl.NumberFormat | numeral.js / d3-format | Extra dependency for no benefit; Intl is standard and sufficient |
| Custom formatter fns | Column-level inline formatting | Inline formatting in each ColumnDef is harder to test and maintain |

**Installation:**
```bash
# No new dependencies needed -- all tools already in the project
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── lib/
│   └── formatting/
│       ├── numbers.ts        # formatCurrency, formatPercentage, formatCount, formatNumber
│       ├── dates.ts          # formatDate, formatTimestamp
│       ├── thresholds.ts     # Outlier threshold configs per column type
│       └── index.ts          # Re-exports
├── lib/
│   └── columns/
│       └── definitions.ts    # UPDATE: add cell renderers using formatters
├── components/
│   └── table/
│       ├── formatted-cell.tsx  # Cell wrapper component handling null/zero/outlier styling
│       └── table-body.tsx      # UPDATE: add alignment classes based on column type
```

### Pattern 1: Centralized Formatter Functions (Pure Functions)
**What:** Each column type gets a pure formatter function that takes a raw value and returns a formatted string. No JSX, no side effects.
**When to use:** Always -- formatters are reused in cell rendering, footer aggregates, and future export.
**Example:**
```typescript
// src/lib/formatting/numbers.ts

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const percentFormatter = new Intl.NumberFormat('en-US', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const countFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
});

export function formatCurrency(value: number): string {
  return currencyFormatter.format(value);
  // Produces: "$1,234.56", "-$1,234.56"
}

export function formatPercentage(value: number): string {
  // Data comes as 0-100 range, not 0-1
  // Check for very small values
  if (value > 0 && value < 0.1) return '<0.1%';
  if (value < 0 && value > -0.1) return '>-0.1%';
  return `${value.toFixed(1)}%`;
}

export function formatCount(value: number): string {
  return countFormatter.format(value);
  // Produces: "1,234,567"
}
```

**IMPORTANT: Percentage data format.** The Snowflake column data for percentages (penetration rates, open rates, etc.) likely comes as whole numbers (e.g., `12.3` meaning 12.3%), NOT as decimals (e.g., `0.123`). The existing footer `formatAggregate` treats them as whole numbers (`value.toFixed(1) + '%'`). Do NOT use `Intl.NumberFormat` with `style: 'percent'` since that multiplies by 100. Instead, manually format with `toFixed(1) + '%'`.

### Pattern 2: Cell Renderer Component
**What:** A React component that wraps formatted values with conditional styling (zero dimming, negative red, outlier tint, tooltip).
**When to use:** As the `cell` property in column definitions.
**Example:**
```typescript
// src/components/table/formatted-cell.tsx
interface FormattedCellProps {
  value: unknown;
  formattedValue: string;
  type: string;
  columnKey: string;
}

export function FormattedCell({ value, formattedValue, type, columnKey }: FormattedCellProps) {
  const numValue = typeof value === 'number' ? value : null;

  // Zero styling: dimmed text
  if (numValue === 0) {
    return <span className="text-muted-foreground/60">{formattedValue}</span>;
  }

  // Negative styling: red text
  if (numValue !== null && numValue < 0) {
    return <span className="text-destructive">{formattedValue}</span>;
  }

  // Outlier check
  const threshold = getThreshold(columnKey, type);
  if (threshold && numValue !== null) {
    const { isLow, isHigh, reason } = checkThreshold(numValue, threshold);
    if (isLow || isHigh) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={isLow ? 'bg-red-500/10 rounded px-1 -mx-1' : 'bg-green-500/10 rounded px-1 -mx-1'}>
              {formattedValue}
            </span>
          </TooltipTrigger>
          <TooltipContent>{reason}</TooltipContent>
        </Tooltip>
      );
    }
  }

  return <>{formattedValue}</>;
}
```

### Pattern 3: Column Definition Cell Integration
**What:** Wire formatters into TanStack Table's `cell` property on each ColumnDef.
**When to use:** In the `buildColumnDefs` function.
**Example:**
```typescript
// src/lib/columns/definitions.ts (updated)
export function buildColumnDefs(): ColumnDef<Record<string, unknown>>[] {
  return COLUMN_CONFIGS.map((config) => ({
    id: config.key,
    accessorKey: config.key,
    header: config.label,
    size: config.identity ? IDENTITY_WIDTH : (WIDTH_BY_TYPE[config.type] ?? 110),
    minSize: 60,
    maxSize: 400,
    enableSorting: true,
    meta: {
      type: config.type,
      identity: config.identity,
    },
    cell: ({ getValue }) => {
      // Returns ReactNode via FormattedCell component
      // Null handling stays in table-body (em dash fallback)
      const value = getValue();
      if (value == null) return null; // table-body handles null display
      return getCellRenderer(config.type, config.key, value);
    },
  }));
}
```

### Pattern 4: Right-Alignment via Column Meta
**What:** Apply `text-right` to numeric column cells by checking column meta type.
**When to use:** In table-body.tsx and table-header.tsx td/th elements.
**Example:**
```typescript
// In table-body.tsx, within the td element:
const meta = cell.column.columnDef.meta as { type?: string } | undefined;
const isNumeric = meta?.type && ['currency', 'percentage', 'count', 'number'].includes(meta.type);

<td className={cn(
  "overflow-hidden text-ellipsis whitespace-nowrap px-3 py-2 text-sm",
  isNumeric && "text-right tabular-nums"
)}>
```

### Anti-Patterns to Avoid
- **Inline formatting in JSX:** Do NOT put `toLocaleString()` calls inside JSX. Extract to reusable formatter functions.
- **Intl.NumberFormat with style: 'percent' for whole-number percentages:** This multiplies by 100 (0.5 becomes "50%"). The data is already in whole-number form, so use manual formatting.
- **Creating new Intl.NumberFormat instances per render:** Intl.NumberFormat construction is expensive. Create formatters once at module scope and reuse.
- **Formatting in the accessor:** Keep `accessorKey` returning raw values so sorting works correctly on numeric values, not formatted strings.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Currency formatting | Manual string concatenation with $ and commas | `Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })` | Handles negatives (-$1,234.56), decimal precision, edge cases |
| Number grouping | Regex-based comma insertion | `Intl.NumberFormat('en-US')` | Handles all number sizes, locale edge cases |
| Date formatting | Manual month name lookup + concatenation | `Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })` | Handles timezone, locale, edge cases |

**Key insight:** `Intl` APIs are free (zero-bundle-cost), well-tested, and handle edge cases that manual formatting misses (negative currency display, rounding modes, very large numbers).

## Common Pitfalls

### Pitfall 1: Percentage Data Already in Whole Numbers
**What goes wrong:** Using `Intl.NumberFormat` with `style: 'percent'` on values that are already 0-100 scale produces "1234%" instead of "12.34%".
**Why it happens:** Intl percent style expects 0-1 range and multiplies by 100.
**How to avoid:** Use manual formatting: `value.toFixed(1) + '%'`. The existing footer code already does this correctly.
**Warning signs:** Percentages showing 100x too large in the table.

### Pitfall 2: Formatting Breaks Sorting
**What goes wrong:** If formatting is applied via `accessorFn` instead of `cell`, TanStack Table sorts by the formatted string ("$100.00" < "$99.00" alphabetically).
**Why it happens:** TanStack Table sorts by accessor value, not by cell display.
**How to avoid:** Always use `accessorKey` for raw data and `cell` for formatted display. Never transform values in the accessor.
**Warning signs:** Currency columns sorting incorrectly, small amounts appearing after large amounts.

### Pitfall 3: Intl.NumberFormat Instance Creation per Render
**What goes wrong:** Performance degrades with 61 columns x 1000+ rows if formatters are created per cell.
**Why it happens:** `new Intl.NumberFormat()` is relatively expensive (~0.1ms per creation).
**How to avoid:** Create formatter instances at module scope (outside component/function), reuse across all cells.
**Warning signs:** Scrolling jank in virtual list, especially on lower-end machines.

### Pitfall 4: Zero vs Null Confusion in Conditional Checks
**What goes wrong:** `if (!value)` treats both 0 and null as falsy, so zeros get em-dash treatment instead of dimmed-zero treatment.
**Why it happens:** JavaScript truthiness conflates 0, null, undefined, and empty string.
**How to avoid:** Always use explicit null checks: `value == null` for nulls, `value === 0` for zeros. The existing table-body already does `cell.getValue() != null` correctly.
**Warning signs:** Zero values showing as em dashes.

### Pitfall 5: Tooltip Wrapping Breaks Virtual Scroll Performance
**What goes wrong:** Every cell wrapped in a Tooltip component (even when no tooltip is shown) adds significant DOM overhead.
**Why it happens:** Tooltip components render portal/positioner elements even when closed.
**How to avoid:** Only wrap cells that actually have tooltip content (outlier-tinted cells). Use conditional rendering, not blanket wrapping.
**Warning signs:** Scroll performance regression after adding conditional formatting.

### Pitfall 6: Dark Mode Color Contrast
**What goes wrong:** Background tints that look good in light mode become invisible or too harsh in dark mode.
**Why it happens:** Opacity-based tints interact differently with light vs dark backgrounds.
**How to avoid:** Define tint colors using CSS custom properties or Tailwind's dark: variant. Test both modes.
**Warning signs:** Outlier tints invisible in dark mode, or overly saturated.

## Code Examples

### Currency Formatting
```typescript
// Module-scoped formatter (created once, reused)
const currencyFmt = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatCurrency(value: number): string {
  return currencyFmt.format(value);
}
// formatCurrency(1234.5)    -> "$1,234.50"
// formatCurrency(-1234.5)   -> "-$1,234.50"
// formatCurrency(0)         -> "$0.00"
```

### Percentage Formatting (Whole Number Input)
```typescript
export function formatPercentage(value: number, decimals: number = 1): string {
  // Handle very small positive values
  if (value > 0 && value < Math.pow(10, -decimals)) {
    return `<${Math.pow(10, -decimals).toFixed(decimals)}%`;
  }
  return `${value.toFixed(decimals)}%`;
}
// formatPercentage(12.34)  -> "12.3%"
// formatPercentage(0.05)   -> "<0.1%"
// formatPercentage(0)      -> "0.0%"
```

### Count/Number Formatting
```typescript
const countFmt = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const numberFmt = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });

export function formatCount(value: number): string {
  return countFmt.format(value);
}
// formatCount(1234567) -> "1,234,567"

export function formatNumber(value: number): string {
  return numberFmt.format(value);
}
// formatNumber(1234.5) -> "1,234.5"
```

### Date Formatting
```typescript
const dateFmt = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

const timestampFmt = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZoneName: 'short',
});

export function formatDate(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return dateFmt.format(date);
}
// formatDate("2024-01-15") -> "Jan 15, 2024"

export function formatTimestamp(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return timestampFmt.format(date);
}
// Used in tooltip for timestamp columns
```

### Right-Alignment Check Helper
```typescript
const NUMERIC_TYPES = new Set(['currency', 'percentage', 'count', 'number']);

export function isNumericType(type: string): boolean {
  return NUMERIC_TYPES.has(type);
}
```

### Threshold Configuration
```typescript
// src/lib/formatting/thresholds.ts
export interface ThresholdConfig {
  low?: { value: number; reason: string };
  high?: { value: number; reason: string };
}

// Thresholds keyed by column key or column type
export const COLUMN_THRESHOLDS: Record<string, ThresholdConfig> = {
  // Collection rate thresholds (percentage columns related to collection)
  'PENETRATION_RATE_POSSIBLE_AND_CONFIRMED': {
    low: { value: 5, reason: 'Penetration rate below 5% threshold' },
    high: { value: 50, reason: 'Penetration rate above 50% threshold' },
  },
  'PENETRATION_RATE_CONFIRMED_ONLY': {
    low: { value: 5, reason: 'Confirmed penetration rate below 5% threshold' },
    high: { value: 50, reason: 'Confirmed penetration rate above 50% threshold' },
  },
  // SMS/Email engagement thresholds
  'OUTBOUND_SMS_OPEN_RATE_FROM_DELIVERED': {
    low: { value: 10, reason: 'SMS open rate below 10% threshold' },
    high: { value: 60, reason: 'SMS open rate above 60% threshold' },
  },
  'OUTBOUND_EMAIL_OPEN_RATE_FROM_DELIVERED': {
    low: { value: 5, reason: 'Email open rate below 5% threshold' },
    high: { value: 40, reason: 'Email open rate above 40% threshold' },
  },
  // Conversion rate
  'RAITO_FIRST_TIME_CONVERTED_ACCOUNTS': {
    low: { value: 3, reason: 'First-time conversion rate below 3% threshold' },
    high: { value: 25, reason: 'First-time conversion rate above 25% threshold' },
  },
};

export function checkThreshold(
  value: number,
  config: ThresholdConfig
): { isLow: boolean; isHigh: boolean; reason: string | null } {
  if (config.low && value < config.low.value) {
    return { isLow: true, isHigh: false, reason: config.low.reason };
  }
  if (config.high && value > config.high.value) {
    return { isLow: false, isHigh: true, reason: config.high.reason };
  }
  return { isLow: false, isHigh: false, reason: null };
}
```

### Recommended CSS Custom Properties for Formatting Colors
```css
/* Add to globals.css */
:root {
  --cell-zero: oklch(0.7 0 0);           /* Dimmed zero text - light mode */
  --cell-negative: oklch(0.577 0.245 27); /* Red for negatives (reuse destructive) */
  --cell-tint-low: oklch(0.95 0.03 25);  /* Light red background tint */
  --cell-tint-high: oklch(0.95 0.03 145); /* Light green background tint */
}
.dark {
  --cell-zero: oklch(0.45 0 0);           /* Dimmed zero text - dark mode */
  --cell-negative: oklch(0.704 0.191 22); /* Red for negatives (reuse destructive) */
  --cell-tint-low: oklch(0.25 0.04 25);  /* Dark red background tint */
  --cell-tint-high: oklch(0.25 0.04 145); /* Dark green background tint */
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| numeral.js / accounting.js | Intl.NumberFormat | Intl has been stable for years | Zero-dependency formatting, better locale support |
| Manual toLocaleString per render | Module-scoped Intl instances | Performance best practice | Avoids repeated construction cost |
| CSS text-align in style prop | Tailwind text-right + tabular-nums | Tailwind v4 standard | Consistent with project styling approach; tabular-nums ensures monospace digit alignment |

## Open Questions

1. **Percentage data range confirmation**
   - What we know: Footer code uses `value.toFixed(1) + '%'`, suggesting values are in 0-100 range
   - What's unclear: Whether all percentage columns use the same range (some could be 0-1 decimals from Snowflake)
   - Recommendation: Add a quick validation in dev mode that warns if percentage values > 100 or < -100. Assume 0-100 range based on existing code.

2. **Settings control timing**
   - What we know: User wants percentage precision to be configurable
   - What's unclear: Whether to build the settings UI in Phase 3 or defer to Phase 5
   - Recommendation: Build the formatting system to accept precision as a parameter (default 1), but defer the UI settings control to Phase 5 (Column Management) which already deals with column configuration. This keeps Phase 3 focused on display formatting.

3. **Date columns in current dataset**
   - What we know: Column config includes a `date` type but no columns in the current 61-column schema are typed as `date`
   - What's unclear: Whether date formatting will be needed for this phase
   - Recommendation: Implement date formatters for completeness (they're trivial), but the main testing focus should be on currency/percentage/count types.

## Sources

### Primary (HIGH confidence)
- Existing codebase: `src/lib/columns/config.ts` -- all 61 column types and keys
- Existing codebase: `src/lib/columns/definitions.ts` -- explicit comment "Phase 3 handles formatting"
- Existing codebase: `src/components/table/table-body.tsx` -- current cell rendering pattern
- Existing codebase: `src/components/table/table-footer.tsx` -- existing formatAggregate showing data conventions
- MDN Intl.NumberFormat documentation -- formatting API reference

### Secondary (MEDIUM confidence)
- TanStack Table v8 cell rendering -- `cell` property on ColumnDef accepts render function
- Tailwind CSS v4 -- `tabular-nums` utility for aligned numeric columns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all tools are browser-native or already installed
- Architecture: HIGH -- clear integration points in existing code, explicit Phase 3 placeholder
- Pitfalls: HIGH -- based on direct code analysis and well-known JavaScript formatting issues
- Thresholds: MEDIUM -- reasonable defaults chosen but will need tuning with real data

**Research date:** 2026-04-10
**Valid until:** 2026-05-10 (stable domain, no rapidly changing dependencies)
