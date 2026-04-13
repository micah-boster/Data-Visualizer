# Phase 16: Anomaly Detection UI - Research

**Researched:** 2026-04-12
**Domain:** React UI components (badges, popovers, chart highlighting) consuming computed anomaly data
**Confidence:** HIGH

## Summary

Phase 16 is a pure UI layer consuming anomaly data already computed and exposed by Phase 15. The `AnomalyProvider` context already wraps the component tree and provides `partnerAnomalies: Map<string, PartnerAnomaly>` via `useAnomalyContext()`. Each `PartnerAnomaly` contains batch-level flags, severity scores, metric groups, and z-score deviations.

The implementation requires four UI additions: (1) a Status column with colored badge cells in the TanStack Table at root and partner drill-down levels, (2) a click-triggered Popover showing anomaly detail per row, (3) a collapsible summary panel at root level, and (4) anomalous batch highlighting on the Recharts collection curve chart.

**Primary recommendation:** Build all anomaly UI components as standalone modules that consume `useAnomalyContext()` and inject into existing table/chart infrastructure through established patterns (custom column defs, chart props, layout slots in DataDisplay).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Colored dot indicator (small circle) -- yellow for warning, red for critical (two severity levels)
- Status column positioned as the first (leftmost) column in both root and drill-down tables
- Empty cell for non-anomalous rows -- anomalies stand out by contrast, no green dot for healthy rows
- Badge is clickable to open the detail popover
- Click-triggered (not hover) -- popover stays open until dismissed
- Header shows severity label + anomalous metric count (e.g., "Warning -- 3 anomalous metrics")
- Shows ALL anomalous metrics (no truncation/pagination)
- Each metric displays: metric name, actual value, expected range, deviation magnitude
- Collapsed by default -- compact bar showing "X anomalies detected" with expand toggle
- Shows top 5 flagged entities sorted by severity
- Each entry shows: entity name + severity level + top anomalous metric
- Clicking an entry drills into that partner/batch
- Panel appears at the top of root-level view only
- Anomalous batch curves rendered in warning/red color with thicker stroke
- Non-anomalous curves get subtle opacity reduction when anomalies are present
- Hovering an anomalous curve shows tooltip with anomaly info
- Anomaly highlighting is always on -- no toggle control

### Claude's Discretion
- Exact dot size and color hex values (within yellow/red palette)
- Popover positioning and dismiss behavior
- Summary panel expand/collapse animation
- Chart opacity values for dimmed curves
- Tooltip layout and formatting details

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AD-07 | Anomaly badge in Status column on partner/batch rows | TanStack custom column def with `AnomalyBadge` cell renderer, injected at position 0 |
| AD-08 | Popover showing anomalous metrics, values, ranges, deviations | shadcn/ui `Popover` + custom `AnomalyDetail` content component |
| AD-09 | Collapsible summary panel at root level with top flagged entities | Custom `AnomalySummaryPanel` with `Collapsible` pattern, placed in DataDisplay before table |
| AD-10 | Anomalous batches highlighted on collection curve charts | Recharts `Line` stroke/strokeWidth/opacity props driven by anomaly data lookup |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @tanstack/react-table | ^8.21.3 | Table with custom column defs | Already in project, Status column is a custom ColumnDef |
| recharts | 3.8.0 | Collection curve charts | Already in project, Line props support dynamic stroke/opacity |
| shadcn/ui (popover) | Already installed | Click-triggered popover | `src/components/ui/popover.tsx` already exists |
| lucide-react | ^1.8.0 | Icons (ChevronDown, AlertTriangle, etc.) | Already in project |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| tailwind-merge / clsx | Already installed | Conditional class composition | Badge color classes, opacity classes |
| tw-animate-css | Already installed | Collapse/expand animation | Summary panel expand toggle |

### Alternatives Considered
None -- all required libraries are already in the project. No new dependencies needed.

## Architecture Patterns

### Recommended Component Structure
```
src/
  components/
    anomaly/
      anomaly-badge.tsx       # Colored dot + click handler
      anomaly-detail.tsx      # Popover content (metric list)
      anomaly-summary-panel.tsx  # Collapsible panel for root view
    charts/
      (modify existing collection-curve-chart.tsx)
  lib/
    columns/
      anomaly-column.ts       # TanStack ColumnDef for Status column
    formatting/
      anomaly-labels.ts       # Metric display name mapping, range formatting
```

### Pattern 1: Status Column via Custom ColumnDef
**What:** Create a dedicated TanStack `ColumnDef` for the Status column that renders an `AnomalyBadge` cell. The column reads anomaly data from table meta (passed through `useAnomalyContext`).
**When to use:** For injecting computed (non-Snowflake) data into the table.
**Key details:**
- The column must be prepended to the column array (position 0) in `definitions.ts` or `hooks.ts`
- At root level: look up `partnerAnomalies.get(row.PARTNER_NAME)`
- At partner level: look up batch anomaly from `partnerAnomalies.get(drillState.partner).batches.find(b => b.batchName === row.BATCH)`
- Column should NOT appear in column picker/presets (it's always visible, not user-configurable)
- Column should have `enableSorting: false, enableHiding: false`

### Pattern 2: Anomaly Data via Table Meta
**What:** Pass anomaly context data through TanStack Table's `meta` option, which is already used for drill callbacks and trending data (`TableDrillMeta` interface).
**When to use:** When cell renderers need access to computed data not present in the row object.
**Key details:**
- Extend `TableDrillMeta` with `anomalyMap?: Map<string, PartnerAnomaly>`
- Pass from DataDisplay through the existing `useDataTable` options pattern
- Cell renderer accesses via `ctx.table.options.meta`

### Pattern 3: Chart Anomaly Highlighting via Props
**What:** Pass batch anomaly status to `CollectionCurveChart` as a prop, then conditionally style each `<Line>` element.
**When to use:** For visually distinguishing anomalous vs. normal batches on the chart.
**Key details:**
- The `useCurveChartState` hook already manages per-batch opacity and stroke width
- Add anomaly status as input, override stroke color (red/amber) and strokeWidth for flagged batches
- Reduce opacity of non-flagged batches when any anomalies are present
- The chart already has a custom tooltip (`CurveTooltip`) -- extend it with anomaly info

### Anti-Patterns to Avoid
- **Duplicating anomaly computation in UI components:** Always consume from `useAnomalyContext()`, never re-compute
- **Adding anomaly data to Snowflake row objects:** The Status column is a virtual column, not a data column
- **Hover-triggered popovers:** User locked this as click-triggered; hover can fire accidentally on dense tables
- **Adding Status to column picker/presets:** This column is always-on, not user-configurable

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Popover positioning | Custom absolute positioning | shadcn/ui Popover (Radix) | Handles viewport edges, scroll, focus management |
| Collapse animation | Manual height transition | tw-animate-css or Radix Collapsible | Handles accessibility, reduced-motion |
| Metric formatting | Inline format logic | Extend existing `getFormatter()` from `src/lib/formatting/` | Consistent formatting across app |

## Common Pitfalls

### Pitfall 1: Status Column Breaking Column Management
**What goes wrong:** Adding a column to the definitions array can break column presets, saved views, and the column picker.
**Why it happens:** The column management system (`useColumnManagement`) tracks visibility by column ID. A new column appearing in presets disrupts saved state.
**How to avoid:** Mark the Status column with `enableHiding: false` and exclude it from preset/visibility logic. Pin it to the left.
**Warning signs:** Column disappears when switching presets, or appears in the column picker.

### Pitfall 2: Anomaly Lookup Performance at Partner Level
**What goes wrong:** Looking up batch anomaly for each row in the partner drill-down triggers repeated map lookups.
**Why it happens:** The cell renderer runs for every visible row on every render.
**How to avoid:** The partner's `PartnerAnomaly.batches` array is small (5-30 batches typically). A simple `find()` is fine. Do NOT premature-optimize with a secondary Map.
**Warning signs:** None expected -- 477 rows total, <30 per partner.

### Pitfall 3: Chart Re-renders on Anomaly Data Changes
**What goes wrong:** Passing anomaly data as a new object reference on each render causes the chart to re-render unnecessarily.
**Why it happens:** `useMemo` in the anomaly context returns a new Map when `allRows` changes.
**How to avoid:** The anomaly map reference is already stable via `useMemo` in `useAllPartnerAnomalies`. Just ensure the chart component receives a stable reference, not a derived object created inline.
**Warning signs:** Chart flickering on unrelated state changes.

### Pitfall 4: Severity Threshold Mapping
**What goes wrong:** Confusion between "warning" and "critical" severity when the anomaly engine only produces a continuous `severityScore`.
**Why it happens:** Phase 15 computes a composite severity score but doesn't classify into discrete levels.
**How to avoid:** Define severity thresholds in the UI layer: e.g., `severityScore > 0 && flagCount < 4 -> warning`, `flagCount >= 4 -> critical`. Keep the threshold logic in one place (a utility function).
**Warning signs:** Inconsistent badge colors between table and summary panel.

## Code Examples

### Anomaly Badge Cell Renderer
```typescript
// Access anomaly data from table meta
const meta = ctx.table.options.meta as TableDrillMeta;
const partnerName = String(ctx.row.original.PARTNER_NAME ?? '');
const anomaly = meta.anomalyMap?.get(partnerName);
if (!anomaly?.isFlagged) return null; // Empty cell for non-anomalous
// Render colored dot
```

### Recharts Dynamic Line Styling
```typescript
// In CollectionCurveChart, per-Line props:
<Line
  stroke={isAnomalous ? 'var(--destructive)' : CHART_COLORS[i]}
  strokeWidth={isAnomalous ? 3 : getLineStrokeWidth(key)}
  strokeOpacity={hasAnyAnomalies && !isAnomalous ? 0.3 : getLineOpacity(key)}
/>
```

### Summary Panel Entity List
```typescript
// Sort partners by severity, take top 5
const topFlagged = [...partnerAnomalies.entries()]
  .filter(([, a]) => a.isFlagged)
  .sort((a, b) => b[1].severityScore - a[1].severityScore)
  .slice(0, 5);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Radix Popover v1 | shadcn/ui Popover (Radix v2) | Already in project | Use existing component |
| Custom chart tooltips | Recharts custom tooltip component | Already in project | Extend CurveTooltip |

## Open Questions

1. **Severity threshold values**
   - What we know: Phase 15 produces continuous `severityScore` and `flags.length`
   - What's unclear: Exact cutoff between warning and critical
   - Recommendation: Use `flagCount >= 4` as critical, `2-3` as warning. This maps naturally to "many metrics off" vs. "a couple metrics off". Adjustable in a single constant.

2. **Norms display in popover**
   - What we know: The popover must show "expected range" per metric
   - What's unclear: The `MetricAnomaly` type stores `value` and `zScore` but not the norm's `mean`/`stddev` directly
   - Recommendation: Pass norms through table meta alongside anomaly data, or compute `expectedRange` = `[mean - 2*stddev, mean + 2*stddev]` at render time from the norm lookup

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `src/lib/computation/compute-anomalies.ts`, `src/contexts/anomaly-provider.tsx`, `src/types/partner-stats.ts`
- Codebase analysis: `src/lib/columns/definitions.ts`, `src/lib/table/hooks.ts`, `src/components/charts/collection-curve-chart.tsx`
- Codebase analysis: `src/components/ui/popover.tsx` (shadcn/ui already installed)

### Secondary (MEDIUM confidence)
- TanStack Table meta pattern: established in project's own `TableDrillMeta` interface
- Recharts Line styling: established in project's `useCurveChartState` hook

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries already in the project
- Architecture: HIGH - extending established patterns (table meta, chart props, context consumers)
- Pitfalls: HIGH - identified from direct codebase analysis of existing column/chart infrastructure

**Research date:** 2026-04-12
**Valid until:** 2026-05-12 (stable -- internal patterns, no external API changes)
