# Phase 22: UI Polish & Data Reliability - Research

**Researched:** 2026-04-14
**Domain:** Recharts tooltip/interaction fixes, collapsible UI, data normalization, schema validation
**Confidence:** HIGH

## Summary

Phase 22 addresses 4 user-reported UI issues and 3 data reliability issues. All work is within the existing codebase -- no new libraries needed. The chart tooltip bug is in `curve-tooltip.tsx` where it always renders the first payload entry regardless of which line is hovered. The chart collapse control already exists at root/partner level but needs a mini-preview sparkline state and the batch level needs it too. The comparison button (UI-03) does not exist as a standalone button -- the comparison matrix is always visible in the charts area; the issue is about clear labeling and context for what it shows. The data issues are visible in the static cache JSON files: `accounts-aff-aff_feb_26_lto_tertiary.json` has empty strings instead of nulls, and the `ACCOUNT_PUBLIC_ID` column is absent from some partner exports.

**Primary recommendation:** Fix the tooltip to track the hovered/clicked line, add sparkline mini-preview to the existing collapse toggle, improve comparison matrix card header with descriptive label and toggle states, normalize empty strings to null at JSON parse time in the static cache fallback, and add a Zod-based schema validator for cached JSON files.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Chart Collapse Control (UI-02): Collapse toggle in chart header bar with chevron/minimize icon in top-right. When collapsed show ~80px sparkline mini-preview. Always start expanded. Persist collapse state across navigation via localStorage.
- Comparison Button UX (UI-03): Rename to descriptive label (e.g. "Compare Partners") with hover tooltip. When active show inline context label. Same button toggles enter/exit (label switches between states).
- Missing Data Strategy (DATA-01, DATA-02): ACCOUNT_PUBLIC_ID treated as optional. Map columns by name not position. Missing columns get null defaults, extra columns ignored. Normalize empty strings to null at load time -- single fix point when parsing JSON.
- Validation Failure Behavior (DATA-03): Show error banner ("Data may be incomplete") but render what is valid. Validation runs lazily on first access. Errors logged to console.warn only. Schema validator is permissive -- check minimum required columns, allow extras and missing optionals.

### Claude's Discretion
- Feature degradation UX when columns are missing (silent vs subtle notice per feature context)
- Exact chart collapse animation and mini preview implementation
- Tooltip wording for comparison button
- Specific error banner styling and placement

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Recharts | 3.8.0 | Chart rendering (LineChart, Tooltip) | Already used for all curve charts |
| Zod | ^4.3.6 | Schema validation for cached JSON | Already used for saved view validation |
| lucide-react | ^1.8.0 | Icons (ChevronUp/Down, Minimize2, etc.) | Already used throughout the app |
| TanStack React Query | ^5.97.0 | Data fetching with caching | Already used for all API calls |
| Next.js | 16.2.3 | Framework | Project framework |

### Supporting (no new installs needed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| shadcn/ui components | -- | Button, Card, Alert, Tooltip | Already in `src/components/ui/` |

### Alternatives Considered
None -- all work uses existing stack.

**Installation:** No new packages needed.

## Architecture Patterns

### Relevant Project Structure
```
src/
├── components/charts/          # Curve chart, tooltip, legend, state hook
│   ├── collection-curve-chart.tsx   # Main chart component
│   ├── curve-tooltip.tsx            # TOOLTIP BUG LIVES HERE
│   ├── use-curve-chart-state.ts     # Chart interaction state
│   └── pivot-curve-data.ts          # Data transformation for Recharts
├── components/cross-partner/   # Comparison matrix, trajectory chart
│   └── comparison-matrix.tsx        # COMPARISON BUTTON LIVES HERE
├── components/data-display.tsx # CHART COLLAPSE TOGGLE LIVES HERE (root+partner)
├── lib/static-cache/           # Static JSON fallback
│   ├── fallback.ts                  # DATA LOADING + NORMALIZATION TARGET
│   └── *.json                       # Cached JSON files with data issues
├── lib/columns/
│   ├── account-config.ts            # ACCOUNT_PUBLIC_ID defined here
│   ├── schema-validator.ts          # Snowflake schema validator (live mode)
│   └── account-definitions.ts       # Account column TanStack defs
└── types/
    └── data.ts                      # DataResponse type
```

### Pattern 1: Recharts Custom Tooltip with Active Line Tracking
**What:** The current tooltip always shows the first payload entry. Recharts 3.x `Tooltip` passes all visible line payloads to the `content` render function. The tooltip needs to identify which specific line is being hovered.
**When to use:** When multiple `<Line>` components overlap and user needs to see data for the hovered line, not just whichever is first.
**Implementation approach:**
- Recharts 3.x `Tooltip` component receives the full `payload` array. Each entry has a `dataKey` that maps to the line being hovered.
- The current code does `payload.find(p => p.value !== undefined)` which always returns the first line with data at that X position, ignoring which line the mouse is near.
- Fix: Use `soloedBatch` from `useCurveChartState` -- when a user clicks a batch line, the tooltip should filter payload to show only that batch's data. When no batch is soloed, show the nearest/hovered line.
- Recharts `activeDot` already has an `onClick` handler calling `handleLineClick(key)`. The solo state exists. The tooltip just needs to consume it.
**Confidence:** HIGH -- verified in codebase.

### Pattern 2: Collapsible Chart with Sparkline Preview
**What:** The chart area at root and partner levels already has a collapse toggle (`chartsExpanded` state in `data-display.tsx`, persisted to localStorage). The missing feature is the mini sparkline preview (~80px) when collapsed.
**When to use:** When collapsed, render a tiny version of the chart without axes, labels, or interactivity.
**Implementation approach:**
- Use Recharts `<LineChart>` with minimal configuration: no `<XAxis>`, `<YAxis>`, `<CartesianGrid>`, `<Tooltip>`. Just lines in a tiny container (~80px height).
- At root level, the sparkline shows the cross-partner trajectory (simplified).
- At partner level, the sparkline shows the collection curves (simplified).
- Batch level does NOT currently have a collapse toggle -- needs one added.
**Confidence:** HIGH -- existing collapse state + Recharts sparkline is standard pattern.

### Pattern 3: Data Normalization at Load Boundary
**What:** Normalize empty strings to null when JSON data is loaded, at the boundary (in `fallback.ts` for static mode, in the API response handler for live mode).
**When to use:** Always -- single fix point prevents empty-string bugs from propagating.
**Implementation approach:**
- Add a `normalizeRow()` function that maps over record values, converting `""` to `null`.
- Apply in `getStaticBatchData()` and `getStaticAccountData()` in `fallback.ts`.
- For live Snowflake mode, apply after `executeQuery()` in the API routes.
- This is the "single fix point" from user's decision.
**Confidence:** HIGH -- simple transformation.

### Pattern 4: Zod Schema Validation for Cached JSON
**What:** Validate cached JSON files have minimum required columns before serving them. Permissive -- allow extras, allow missing optional columns, only fail on missing required columns.
**When to use:** In static mode, when loading cached JSON.
**Implementation approach:**
- Define a Zod schema for `DataResponse` with required fields (`data` array, each row must have certain keys).
- Batch data required columns: `PARTNER_NAME`, `BATCH` (minimum for the app to function).
- Account data required columns: `PARTNER_NAME`, `BATCH` (ACCOUNT_PUBLIC_ID is optional per user decision).
- Use `z.safeParse()` -- on failure, log `console.warn` and return data with a `schemaWarnings` flag.
- Validation is lazy (runs on first access) -- use the same caching pattern as `schema-validator.ts`.
**Confidence:** HIGH -- Zod already in project, `safeParse` pattern already used in `views/schema.ts`.

### Anti-Patterns to Avoid
- **Modifying JSON files directly:** Do NOT edit the cached JSON files to fix empty strings. Normalize at runtime so new exports work automatically.
- **Column position-based mapping:** The user explicitly decided columns are mapped by name, not position. Never assume column order.
- **Blocking startup with validation:** Validation is lazy on first access, not at app startup. No eagerly-loaded validation.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Schema validation | Custom JSON shape checker | Zod safeParse | Already in project, handles edge cases |
| Sparkline chart | Canvas-based mini chart | Recharts LineChart (no axes) | Consistent with existing chart stack |
| Persistent collapse state | Custom state manager | localStorage (already used) | Pattern already established in data-display.tsx |

## Common Pitfalls

### Pitfall 1: Recharts Tooltip Payload Order
**What goes wrong:** Tooltip `payload` array order depends on `<Line>` render order, not mouse proximity. The "nearest line" is not reliably the first payload entry.
**Why it happens:** Recharts sends all visible line values at the hovered X position. It does not sort by visual proximity to cursor.
**How to avoid:** Use the `soloedBatch` state from `useCurveChartState` to filter tooltip content. When soloed, show only that batch. When not soloed, consider showing all batches at that X point (multi-line tooltip) or use Recharts' built-in nearest-line detection.
**Warning signs:** Tooltip always shows the same batch regardless of which line is clicked/hovered.

### Pitfall 2: Hydration Mismatch with localStorage
**What goes wrong:** Server renders with default state, client reads localStorage and gets different state, causing hydration mismatch.
**Why it happens:** `localStorage` is only available on client. Next.js SSR renders without it.
**How to avoid:** The existing pattern in `data-display.tsx` already handles this correctly -- `useState(() => { if (typeof window === 'undefined') return true; return localStorage.getItem(...) })`. Follow this same pattern for any new persisted state.
**Warning signs:** Console warnings about hydration mismatch on first render.

### Pitfall 3: Empty String vs Null in Downstream Computation
**What goes wrong:** Code checks `value == null` but empty strings `""` slip through, causing NaN in numeric operations or empty cells where a dash should appear.
**Why it happens:** Snowflake exports and JSON serialization may produce `""` instead of `null` for missing values.
**How to avoid:** Normalize at load boundary (single fix point). After normalization, all downstream code can rely on `null` for missing values.
**Warning signs:** NaN values in computed columns, empty cells instead of em-dash placeholder.

### Pitfall 4: Missing Column Crashes Column Definition
**What goes wrong:** `ACCOUNT_PUBLIC_ID` is in `ACCOUNT_COLUMN_CONFIGS` but missing from some JSON files. The `accessorKey` tries to read it, gets `undefined`, renders nothing. This is actually fine for rendering but may crash sorting or filtering if they assume the value exists.
**Why it happens:** Not all partner data exports include all columns.
**How to avoid:** Column definitions already handle `null` display (nullDisplay: '\u2014'). The normalization step converts undefined to null. Just ensure the column config has `identity: true` but the sort/filter logic handles nulls gracefully.
**Warning signs:** Sort crashes or NaN comparisons on the Account ID column.

### Pitfall 5: Recharts 3.x API Changes
**What goes wrong:** Recharts 3.x has some API differences from 2.x. Docs and examples online may reference 2.x API.
**Why it happens:** The project uses Recharts 3.8.0 which is relatively new.
**How to avoid:** The existing chart code is working and tested. Follow the same patterns for sparkline implementation. Do not introduce new Recharts features without verifying they work in 3.x.
**Warning signs:** TypeScript errors on Recharts component props.

## Code Examples

### Tooltip Fix: Filter by Soloed Batch
```typescript
// In curve-tooltip.tsx - CurveTooltip component
// Current bug: uses payload.find(p => p.value !== undefined) -- always first line
// Fix: accept soloedBatch prop, filter payload accordingly

interface CurveTooltipProps {
  active?: boolean;
  payload?: Array<{ dataKey?: string; value?: number; color?: string }>;
  label?: number;
  keyMap: BatchKeyMap;
  metric: "recoveryRate" | "amount";
  batchAnomalies?: BatchAnomaly[];
  soloedBatch?: string | null; // NEW: from useCurveChartState
}

// When soloed, filter to that batch only:
const relevantPayload = soloedBatch
  ? payload.filter(p => p.dataKey === soloedBatch)
  : payload;
// Then render relevantPayload entries
```

### Sparkline Mini Preview
```typescript
// Minimal Recharts sparkline (no axes, no interaction)
<div className="h-[80px] w-full opacity-60">
  <LineChart data={sparklineData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
    {lines.map((key, i) => (
      <Line
        key={key}
        dataKey={key}
        stroke={CHART_COLORS[i % CHART_COLORS.length]}
        strokeWidth={1}
        dot={false}
        isAnimationActive={false}
      />
    ))}
  </LineChart>
</div>
```

### Data Normalization Function
```typescript
// In fallback.ts or a shared utility
function normalizeRow(row: Record<string, unknown>): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    normalized[key] = value === "" ? null : value;
  }
  return normalized;
}

function normalizeData(response: DataResponse): DataResponse {
  return {
    ...response,
    data: response.data.map(normalizeRow),
  };
}
```

### Cached JSON Schema Validation (Zod)
```typescript
// Permissive schema -- check structure and minimum required columns
import { z } from 'zod';

const dataRowSchema = z.record(z.string(), z.unknown());

const dataResponseSchema = z.object({
  data: z.array(dataRowSchema),
  meta: z.object({
    rowCount: z.number(),
    fetchedAt: z.string(),
    columns: z.array(z.string()),
  }),
});

// Validate minimum required columns exist in at least the first row
function validateRequiredColumns(
  data: Record<string, unknown>[],
  required: string[],
): { valid: boolean; missing: string[] } {
  if (data.length === 0) return { valid: true, missing: [] };
  const firstRow = data[0];
  const keys = new Set(Object.keys(firstRow));
  const missing = required.filter(col => !keys.has(col));
  return { valid: missing.length === 0, missing };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| No collapse | Root/partner charts have collapse toggle | Phase 21 (existing) | Batch level still missing |
| Recharts 2.x | Recharts 3.8.0 | Pre-v3.0 | Some API differences, follow existing patterns |
| No schema validation on cached JSON | Schema validation on Snowflake via INFORMATION_SCHEMA | Pre-v3.0 | Need equivalent for static mode |

## Open Questions

1. **Comparison button scope clarification**
   - What we know: The comparison matrix already renders at root level inside the collapsible charts area. There is no standalone "comparison button" that toggles a mode.
   - What's unclear: Is UI-03 about adding a toggle button that shows/hides the comparison matrix separately from the trajectory chart? Or is it about the view mode toggle buttons within the matrix card header?
   - Recommendation: Based on CONTEXT.md decisions ("rename button", "toggle the same button to exit"), this likely refers to making the chart collapse toggle more descriptive and adding clear labels to the comparison matrix card. Implement as: (a) the comparison matrix card header gets a descriptive title and hover tooltip, (b) the view mode toggle buttons inside the matrix get clearer labels. If a standalone comparison toggle is needed, add it to the chart header bar alongside the collapse chevron.

2. **View switch to chart (UI-04)**
   - What we know: The comparison matrix has an internal view mode toggle (heatmap/bar/table). The curve chart has a metric toggle (Recovery Rate % / Dollars Collected).
   - What's unclear: Which "metric view" switch should update which chart? The success criterion says "switching metric views updates the chart to reflect the selected metric."
   - Recommendation: This likely refers to the comparison matrix view mode toggle -- when switching between heatmap/bar/table, the chart should update. The code already does this. If it refers to a global metric selector that should also update the curve chart, that would need the metric state lifted to the parent. Investigate whether this bug is actually present or already fixed.

## Sources

### Primary (HIGH confidence)
- Codebase inspection: `src/components/charts/curve-tooltip.tsx` -- tooltip bug confirmed
- Codebase inspection: `src/components/data-display.tsx` -- collapse toggle exists at root/partner, missing at batch
- Codebase inspection: `src/lib/static-cache/fallback.ts` -- no normalization or validation
- Codebase inspection: `src/lib/static-cache/accounts-aff-aff_feb_26_lto_tertiary.json` -- empty strings confirmed, ACCOUNT_PUBLIC_ID missing confirmed
- Codebase inspection: `src/components/cross-partner/comparison-matrix.tsx` -- view mode toggle exists
- Codebase inspection: `src/lib/columns/account-config.ts` -- ACCOUNT_PUBLIC_ID defined as identity column
- Codebase inspection: `src/lib/views/schema.ts` -- Zod validation pattern exists in project

### Secondary (MEDIUM confidence)
- Recharts 3.x Tooltip behavior based on existing working code patterns in the project

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new libraries, all existing
- Architecture: HIGH -- all changes are in identified files with clear patterns
- Pitfalls: HIGH -- confirmed through code inspection and data file examination

**Research date:** 2026-04-14
**Valid until:** 2026-05-14 (stable domain, no external dependencies)
