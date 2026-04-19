# Phase 36: Chart Builder (Renderer + UI) — Research

**Researched:** 2026-04-18
**Domain:** Generic chart rendering (line/scatter/bar) + inline builder toolbar + preset catalog (localStorage), composed on top of Phase 35's `ChartDefinition` discriminated union.
**Confidence:** HIGH — every architectural claim is grounded in a direct file read inside this repo. Recharts / zod / column-registry APIs verified against installed packages.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Builder UI surface**
- Builder lives in an **inline header toolbar directly above the chart canvas** — zero extra clicks, always visible, composes with the existing `DataPanel` pattern (Phase 29).
- Audience is the **internal partnerships team (power users)** — surface real column names directly, density over hand-holding, no progressive-disclosure / advanced-mode split.
- **Always editable** — any change re-renders instantly, no Save button gate, no edit-mode toggle. Matches existing filter/sort behavior.
- **Builder toolbar is hidden for the collection-curve preset** — preset keeps its current controls (metric toggle, solo mode, average line, batch visibility). The generic axis/type builder only appears once the user switches away from the preset to line/scatter/bar.

**Chart type switch + carryover**
- **Icon segmented control** in the header toolbar (line / scatter / bar icons) — one click, always visible, matches `ToolbarGroup` density.
- When switching **between generic types**: **X/Y axes carry** if still valid for the new type; **type-specific options reset** (bar orientation, scatter point sizing, etc. at Claude's discretion per type). If the carried axis is invalid under the new type, **clear it and prompt the user to pick**.
- Switching **from collection-curve preset → generic type**: **convert with sensible defaults**. Preset's `metric` field maps to generic Y-axis. X defaults to batch/time. Preset-only fields (`hiddenBatches`, `showAverage`, `showAllBatches`) are discarded on exit. User lands on a rough equivalent and tunes from there.
- **Default chart for a view with no `chartState`**: the **collection-curve preset** — preserves current behavior, zero-migration feel for existing views.

**Axis column filtering + validation**
- **Strict-by-type X-axis eligibility** — line: time/ordinal columns; scatter: numeric; bar: categorical (partner, batch, dimension values). Dropdown only shows valid picks for the current chart type. Source of truth is the existing column registry in `src/lib/columns/`.
- **Y-axis: numeric columns only** (percent, count, amount) — drawn from column-format metadata. No synthetic `count(categorical)` options in this phase.
- **Stale column refs on load → visible warning banner on the chart**: something like "X-axis column `<name>` not available — using `<fallback>`", plus a fallback render so the chart still appears. This is stronger than Phase 35's silent migration fallback because the error is now user-visible state (a picked column was lost), not an infrastructure rewrap.
- **Single-series only this phase** — group-by (CHRT-14) is explicitly deferred. No `groupBy` field on `ChartDefinition` yet; add later without breaking changes.

**Preset save/load UX**
- **Single `Presets ▾` dropdown** in the chart toolbar. Menu structure: built-ins at top (with lock/badge), user presets below, `Save current as preset…` at the bottom. Mirrors the shipped Saved Views UX.
- **Save flow: modal prompt with a name field** (Save / Cancel). Simple and consistent with Saved Views.
- **Built-ins are visibly distinct and read-only** — lock icon / badge, can't be renamed or deleted. Collection Curves is the one built-in preset required by CHRT-12; Claude may add others if a second naturally falls out of implementation, otherwise keep the catalog to one.
- **Chart config persists per saved view** (CHRT-13) on `ViewSnapshot.chartState` using the `ChartDefinition` union from Phase 35. Presets are reusable shortcuts that apply a `ChartDefinition` — they are not the canonical storage of chart state.

### Claude's Discretion
- Exact column-registry integration (how "numeric" / "categorical" / "time" is determined from existing format metadata).
- Rendering library choice for the 3 generic chart types (Recharts is already in the stack — default to it unless a concrete blocker appears).
- Type-specific render options: line interpolation, bar orientation/grouping, scatter point size — any sensible default, no user-facing toggle required this phase.
- Empty state before X/Y are picked on a fresh generic chart (`EmptyState` pattern from Phase 29 is the obvious fit).
- Color palette for generic charts — reuse anomaly color language where it makes sense, neutral palette otherwise.
- Preset storage location (localStorage key, keyed by user) — follow the pattern used by Saved Views.
- Internal naming (`ChartBuilder`, `ChartToolbar`, `PresetMenu`, etc.).
- Tooltip / drill-through parity for scatter and bar — match collection-curve feel at Claude's discretion; full interaction parity is not a phase requirement.

### Deferred Ideas (OUT OF SCOPE)
- **Group-by / multi-series charts** (CHRT-14) — not in v4.0; add a `groupBy` field to `ChartDefinition` variants when the feature lands.
- **Dual Y-axis** (CHRT-15) — not in v4.0.
- **Explicit edit-mode / confirm-discard flow** — rejected in favor of always-editable.
- **Synthetic `count(categorical)` Y-axis options** — useful for bar charts but adds picker complexity.
- **Advanced type-specific render toggles** (smooth vs linear line, horizontal bar, scatter point sizing by column) — Claude picks defaults this phase.
- **Shared / cross-view presets** — all presets scoped per-view via the built-in catalog; no user-level shared preset library.
- **Partner-list filter field on `ChartDefinition`** — still deferred; partner-list integration belongs on the view filter slice.
- **Full interaction parity (drill-through + rich tooltips) for scatter and bar** — target feel-parity with collection curves at Claude's discretion.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CHRT-03 | User can view a line chart with any numeric Y-axis and time/numeric X-axis | Recharts 3.8 `LineChart` + `XAxis type="number"`/categorical + `Line` variant already in use at `src/components/charts/collection-curve-chart.tsx:6-12` and `src/components/cross-partner/trajectory-chart.tsx:4-11`. Reuse `ChartContainer` wrapper from `src/components/ui/chart.tsx`. |
| CHRT-04 | User can view a scatter plot with any two numeric columns | Recharts 3.8 exports `ScatterChart` + `Scatter` (verified `node_modules/recharts/types/index.d.ts`: `export { ScatterChart } from './chart/ScatterChart';`). Not yet used in repo — establish new composition. |
| CHRT-05 | User can view a bar chart comparing a metric across batches or partners | Recharts 3.8 exports `BarChart` + `Bar`. Not yet used. Identity categorical columns in registry (`PARTNER_NAME`, `BATCH`, `ACCOUNT_TYPE`) feed X; numeric columns feed Y. |
| CHRT-06 | Collection curves render identically to current behavior | `CollectionCurveChart` stays at `src/components/charts/collection-curve-chart.tsx` (327 lines of domain logic). Phase 36 wraps its existing component in a preset adapter — does NOT move, fork, or rewrite it. Preset-specific `useCurveChartState` (`src/components/charts/use-curve-chart-state.ts`) and legend/tooltip siblings stay untouched. |
| CHRT-07 | User can select X-axis column from a filtered dropdown | Column registry at `src/lib/columns/config.ts:12` already carries `type: 'text' \| 'currency' \| 'percentage' \| 'count' \| 'date' \| 'number'`. New helper derives X-axis eligibility by chart type from these values (see "Column Registry → Axis Eligibility" §). Popover + keyboard navigation already exist via `@base-ui/react` (same primitive `SaveViewPopover` uses). |
| CHRT-08 | User can select Y-axis column from a filtered dropdown | Same registry; Y eligibility uses `isNumericType(col.type)` which already exists (`src/lib/formatting/numbers.ts:68`: returns true for currency / percentage / count / number). |
| CHRT-09 | User can switch chart type and the chart re-renders immediately | `ChartDefinition` variant change triggers a re-render of the renderer; toolbar dispatches a single `setChartDefinition(next)` call. No debounce, no save gate. |
| CHRT-10 | User can save chart configuration as a named preset | New `src/lib/chart-presets/` slice mirrors the Saved Views pattern (types / schema / storage / defaults + `useChartPresets` hook). localStorage key `bounce-dv-chart-presets`. Save modal prompts for name (reuse Popover pattern from `save-view-popover.tsx`). |
| CHRT-11 | User can load a previously saved chart preset with one click | Preset menu click → `setChartDefinition(preset.definition)`. Deep-copy on apply (Pitfall 6). |
| CHRT-12 | Collection curves available as a built-in preset | Built-in catalog at `src/lib/chart-presets/defaults.ts` exports `BUILTIN_PRESETS` with one entry: `{ id: 'builtin:collection-curves', name: 'Collection Curves', locked: true, definition: DEFAULT_COLLECTION_CURVE }`. Built-ins merge ahead of user presets; locked flag drives UI badge + disabled delete/rename. |
| CHRT-13 | Chart configuration persists with saved views | `ViewSnapshot.chartState: ChartDefinition` slot already exists (Phase 35). Phase 36 extends the discriminated union with `line`/`scatter`/`bar` variants — zod `z.discriminatedUnion('type', […])` at `src/lib/views/schema.ts:33` gains three siblings. Existing `chartSnapshotRef`/`chartLoadRef` pattern in `data-display.tsx:490-491` generalizes from `CollectionCurveDefinition` to `ChartDefinition`. |
</phase_requirements>

## Summary

Phase 36 is the largest v4.0 feature phase: it ships a generic chart renderer (line/scatter/bar), an inline builder toolbar above the chart canvas, and a preset catalog (built-in + user-defined) that writes through `ViewSnapshot.chartState`. The architecture is unusually well-staged — Phase 35 already landed the type/schema plumbing, the Phase 29 `DataPanel` + `ToolbarDivider` + `EmptyState` patterns are the canonical surfaces for every piece of UI this phase needs, Recharts 3.8 ships all three chart types natively, and the column registry already carries the format metadata needed to derive strict-by-type axis eligibility.

The work splits cleanly into four seams: (1) extend the `ChartDefinition` discriminated union with three new variants + migration/default updates; (2) build a small `chart-presets/` feature slice (localStorage entity, hook, built-in catalog) that mirrors Saved Views 1:1; (3) ship a generic renderer `GenericChart` that dispatches on variant and a `ChartBuilderToolbar` that lives above it inside the `DataPanel` `actions` slot; (4) wrap `CollectionCurveChart` as the preset and build a `ChartPanel` dispatcher at the call site (`data-display.tsx`) that renders preset vs generic. The non-obvious risks are: the **browser-seed-vs-hydration** timing issue surfaced by Phase 35-02 (useSavedViews hydration effect writes back and overwrites seeded localStorage before human-verify can observe the seeded state); stale-column-ref handling (the new user-facing concern — no existing banner surface in the chart area); and avoiding the partner-list scope creep that the deferred-ideas list guards against.

**Primary recommendation:** Split into three waves of plans. Wave 1 (foundation, parallel-safe): extend `chartDefinitionSchema` with line/scatter/bar variants + derive axis eligibility helper + create `chart-presets/` slice. Wave 2: `GenericChart` renderer + `ChartBuilderToolbar` + `StaleColumnWarning` banner. Wave 3: `ChartPanel` dispatcher + Presets dropdown + end-to-end wiring in `data-display.tsx`. Use the existing `DataPanel.actions` slot as the builder mount point — no new chart-shell component needed. Use a fresh localStorage key `bounce-dv-chart-presets` and mirror the Saved Views storage/hook pattern 1:1.

## Standard Stack

### Core (already installed — no new runtime deps)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `recharts` | 3.8.0 | Generic line/scatter/bar rendering | Project-wide standard (CollectionCurveChart, trajectory-chart, root-sparkline). All three types (`LineChart`, `ScatterChart`, `BarChart`) verified exported in `node_modules/recharts/types/index.d.ts`. shadcn `ChartContainer` wrapper at `src/components/ui/chart.tsx` already present — use it. |
| `zod` | 4.3.6 | Schema validation of localStorage-loaded presets + extended `chartDefinitionSchema` variants | Already the project's validation layer; Phase 35 established `z.discriminatedUnion('type', […])` pattern at `src/lib/views/schema.ts:33`. |
| `@base-ui/react` | 1.3.0 | Popover primitive for Presets dropdown + rename/save modal | Already used by `PresetDropdown` (column presets) + `SaveViewPopover`. Same primitive — no new UI dep. |
| `lucide-react` | 1.8.0 | Icons (LineChart, ScatterChart, BarChart3, Lock for built-ins, ChevronDown for dropdown) | Already the repo's icon library. Canonical mappings: `LineChart` / `ScatterChart` / `BarChart3` / `Sparkles` (preset menu) / `Lock` (built-in badge). |
| `sonner` | 2.0.7 | Toast on preset save / delete with undo | Already used for view save/delete toasts in `data-display.tsx:415-421`. Mirror the pattern. |

### Supporting (existing project patterns, not external libraries)

| Pattern | File | Purpose |
|---------|------|---------|
| `ChartContainer` wrapper | `src/components/ui/chart.tsx:42` | Required outer wrapper for any Recharts component in this codebase. Owns theme-aware CSS variables and shadcn style overrides. |
| `ChartTooltipContent` | `src/components/ui/chart.tsx:119` | Shadcn-themed tooltip. Generic renderer should use it as the default; preset retains its custom `CurveTooltip` untouched. |
| `DataPanel` pattern | `src/components/patterns/data-panel.tsx` | Title + actions slot + content slot. Builder toolbar lives in `actions`, chart lives in `children`. |
| `EmptyState` pattern | `src/components/patterns/empty-state.tsx` | `variant='no-data'` for "pick an X and Y to see a chart" empty state before axes are picked on a fresh generic chart. |
| `ToolbarDivider` | `src/components/patterns/toolbar-divider.tsx` | Vertical separator between segmented-control and axis-picker clusters in the builder toolbar. |
| `NumericTick` | `src/components/charts/numeric-tick.tsx` | Canonical Recharts custom tick for this codebase (Phase 27-02 lock). Generic renderer's Y-axis should use it. |
| `SectionHeader` (via DataPanel) | `src/components/layout/section-header.tsx` | `DataPanel` composes this internally; title/actions rhythm already correct. No direct use by this phase. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Recharts 3.8 for all three types | Visx, Observable Plot, D3 direct | Recharts already owns CollectionCurveChart + trajectory-chart. Introducing a second library fractures the visual language and doubles bundle size. No concrete blocker identified for line/scatter/bar. **Recommend: Recharts.** |
| A new `ChartShell` wrapper component | Reuse `DataPanel` with builder toolbar in `actions` slot | `DataPanel` already owns the chart-panel surface recipe (surface-raised + shadow-elevation-raised + padding) that CollectionCurveChart adopted in 29-02. Introducing `ChartShell` duplicates that recipe. **Recommend: DataPanel + actions.** |
| Writing a dedicated picker primitive for X/Y | Reuse `FilterCombobox` pattern (popover + search + single-select) | `src/components/toolbar/filter-popover.tsx` + `filter-combobox.tsx` already implement the keyboard-nav-able popover-combobox pattern used across the app. **Recommend: extract or compose** the same pattern into an `AxisPicker`. |
| Entity-shaped `ChartPreset` with its own `id`/`name`/`createdAt` | Reuse `ChartDefinition` as preset value | Presets NEED entity metadata (the menu has to display names, sort by recency, track built-in vs user). `ChartDefinition` is the *value* of a preset; the preset entity wraps it. **Recommend two types:** `ChartDefinition` (value, already exists) + `ChartPreset` (entity: `{ id, name, locked, createdAt, definition }`). |
| Inline axis options on the toolbar | Single-pick popover + chevron | Dropdown-with-search scales to 60+ columns in the registry. Inline radio pills would wrap wildly. **Recommend: popover picker** with keyboard nav. |
| Fork `CollectionCurveChart` into a preset component tree | Wrap it as-is, render conditionally by variant type | CONTEXT locks "collection curves render identically." The 327-line component + 245-line hook + legend + tooltip are a cohesive contract. Any fork risks rendering drift (CHRT-06 failure). **Recommend: wrap in place, render via variant switch.** |

**Installation:** No new runtime dependencies. All required primitives are present in the stack.

```bash
# No-op: every library needed is already installed.
```

## Architecture Patterns

### Recommended Project Structure

```
src/
├── components/
│   ├── charts/
│   │   ├── collection-curve-chart.tsx         # UNCHANGED — the preset
│   │   ├── chart-panel.tsx                    # NEW — dispatcher: renders GenericChart OR CollectionCurveChart based on variant
│   │   ├── generic-chart.tsx                  # NEW — renderer for line/scatter/bar
│   │   ├── chart-builder-toolbar.tsx          # NEW — segmented control + axis pickers
│   │   ├── axis-picker.tsx                    # NEW — popover combobox for X/Y selection
│   │   ├── preset-menu.tsx                    # NEW — Presets ▾ dropdown
│   │   ├── save-preset-popover.tsx            # NEW — modal/popover for naming a new preset (mirrors save-view-popover.tsx)
│   │   ├── stale-column-warning.tsx           # NEW — inline banner for stale X/Y refs
│   │   ├── curve-legend.tsx                   # UNCHANGED — preset-only
│   │   ├── curve-tooltip.tsx                  # UNCHANGED — preset-only
│   │   ├── numeric-tick.tsx                   # UNCHANGED — reused by generic Y-axis
│   │   ├── pivot-curve-data.ts                # UNCHANGED — preset-only
│   │   └── use-curve-chart-state.ts           # UNCHANGED — preset-only
│   └── (existing patterns + toolbar unchanged)
├── hooks/
│   └── use-chart-presets.ts                   # NEW — localStorage-backed preset hook (mirrors use-saved-views.ts)
└── lib/
    ├── chart-presets/                         # NEW slice (mirrors src/lib/partner-lists/ shape)
    │   ├── types.ts
    │   ├── schema.ts
    │   ├── storage.ts
    │   └── defaults.ts                        # BUILTIN_PRESETS — Collection Curves entry
    ├── columns/
    │   ├── axis-eligibility.ts                # NEW — derives X/Y candidate columns by chart type
    │   └── config.ts                          # UNCHANGED (source of truth for eligibility)
    └── views/
        ├── schema.ts                          # EXTENDED — add line/scatter/bar variants to chartDefinitionSchema
        ├── types.ts                           # AUTO — z.infer keeps it in sync; add narrow aliases
        └── migrate-chart.ts                   # OPTIONAL edit — revalidation path already accepts any valid variant
```

### Pattern 1: Extending the `ChartDefinition` Discriminated Union

**What:** Add three sibling variants to the existing `z.discriminatedUnion('type', [...])` in `src/lib/views/schema.ts`. Each variant carries its own `version: z.literal(1)` (start line/scatter/bar at v1; collection-curve is at v2 because it migrated from legacy).

**When to use:** Any time a new chart type lands. Additive — no breakage to existing saved views because the zod schema relaxation at `viewSnapshotSchema.chartState: z.unknown().optional()` (line 51) means parse never rejects; `migrateChartState` validates inside `sanitizeSnapshot`.

**Example (proposed):**
```typescript
// src/lib/views/schema.ts — append siblings to chartDefinitionSchema

const axisRefSchema = z.object({
  /** Snowflake column key (uppercase) from COLUMN_CONFIGS. */
  column: z.string(),
});

const lineChartVariantSchema = z.object({
  type: z.literal('line'),
  version: z.literal(1),
  x: axisRefSchema.nullable(),   // null = axis not picked yet
  y: axisRefSchema.nullable(),
});

const scatterChartVariantSchema = z.object({
  type: z.literal('scatter'),
  version: z.literal(1),
  x: axisRefSchema.nullable(),
  y: axisRefSchema.nullable(),
});

const barChartVariantSchema = z.object({
  type: z.literal('bar'),
  version: z.literal(1),
  x: axisRefSchema.nullable(),
  y: axisRefSchema.nullable(),
});

export const chartDefinitionSchema = z.discriminatedUnion('type', [
  collectionCurveVariantSchema,
  lineChartVariantSchema,
  scatterChartVariantSchema,
  barChartVariantSchema,
]);
```

```typescript
// src/lib/views/types.ts — add narrow aliases alongside CollectionCurveDefinition

export type ChartDefinition = z.infer<typeof chartDefinitionSchema>;
export type CollectionCurveDefinition = Extract<ChartDefinition, { type: 'collection-curve' }>;
export type LineChartDefinition = Extract<ChartDefinition, { type: 'line' }>;
export type ScatterChartDefinition = Extract<ChartDefinition, { type: 'scatter' }>;
export type BarChartDefinition = Extract<ChartDefinition, { type: 'bar' }>;
export type GenericChartDefinition = LineChartDefinition | ScatterChartDefinition | BarChartDefinition;
```

Source: `src/lib/views/schema.ts:33`, Phase 35-RESEARCH § Pattern 2.

### Pattern 2: Column Registry → Axis Eligibility (single source of truth)

**What:** A pure function that classifies each `ColumnConfig` entry by axis role given a chart type. Lives in `src/lib/columns/axis-eligibility.ts`. Reads directly from `COLUMN_CONFIGS`. Never a hand-maintained list.

**Derivation rules (from CONTEXT "Axis column filtering + validation"):**

| Chart Type | X Eligibility | Y Eligibility |
|-----------|--------------|--------------|
| line | `type === 'date' \|\| type === 'number' \|\| type === 'text' && identity` (time/ordinal) | numeric (currency/percentage/count/number) |
| scatter | numeric | numeric |
| bar | `type === 'text'` + identity columns (PARTNER_NAME, LENDER_ID, BATCH, ACCOUNT_TYPE) | numeric |

**Why this classification:** The registry at `src/lib/columns/config.ts` already carries `type: 'text' \| 'currency' \| 'percentage' \| 'count' \| 'date' \| 'number'` + `identity: boolean`. `isNumericType` already exists at `src/lib/formatting/numbers.ts:68` and returns true for currency/percentage/count/number — reuse it verbatim. Categorical is the negation: `type === 'text'`. Time is `type === 'date'`. Ordinal (batch age in months) is `type === 'number'` AND `identity === true`. No new metadata fields needed.

**Example (proposed):**
```typescript
// src/lib/columns/axis-eligibility.ts (new)
import { COLUMN_CONFIGS, type ColumnConfig } from './config';
import { isNumericType } from '@/lib/formatting/numbers';

export type ChartTypeForAxis = 'line' | 'scatter' | 'bar';
export type AxisRole = 'x' | 'y';

function isCategorical(col: ColumnConfig): boolean {
  return col.type === 'text';
}
function isTime(col: ColumnConfig): boolean {
  return col.type === 'date';
}
function isOrdinal(col: ColumnConfig): boolean {
  // Identity-flagged numeric columns like BATCH_AGE_IN_MONTHS make sense as an X-axis for line charts.
  return col.type === 'number' && col.identity;
}

export function getEligibleColumns(
  chartType: ChartTypeForAxis,
  axis: AxisRole,
): ColumnConfig[] {
  if (axis === 'y') {
    return COLUMN_CONFIGS.filter((c) => isNumericType(c.type));
  }
  // axis === 'x'
  switch (chartType) {
    case 'line':
      return COLUMN_CONFIGS.filter(
        (c) => isTime(c) || isNumericType(c.type) || (isCategorical(c) && c.identity),
      );
    case 'scatter':
      return COLUMN_CONFIGS.filter((c) => isNumericType(c.type));
    case 'bar':
      return COLUMN_CONFIGS.filter(isCategorical);
  }
}

export function isColumnEligible(
  chartType: ChartTypeForAxis,
  axis: AxisRole,
  columnKey: string | null | undefined,
): boolean {
  if (!columnKey) return false;
  return getEligibleColumns(chartType, axis).some((c) => c.key === columnKey);
}
```

Source: `src/lib/columns/config.ts:9-16` (ColumnConfig type), `src/lib/formatting/numbers.ts:68` (isNumericType).

### Pattern 3: `ChartPanel` Dispatcher (preset vs generic)

**What:** A thin component at `src/components/charts/chart-panel.tsx` that reads `ViewSnapshot.chartState.type` and renders either `CollectionCurveChart` (preset) or `GenericChart` (line/scatter/bar). Owns the `ChartBuilderToolbar` mount — toolbar is hidden entirely when the preset is active (CONTEXT lock).

**When to use:** Replace direct `<CollectionCurveChart curves={...} />` renders at the 2 call sites in `data-display.tsx:660` and `:666`. `ChartPanel` owns the `DataPanel` wrapper for the generic case; the preset keeps its own `DataPanel` internally (as it does today) for zero visual drift.

**Example (sketch):**
```typescript
// src/components/charts/chart-panel.tsx (new)
'use client';

import { CollectionCurveChart } from './collection-curve-chart';
import { GenericChart } from './generic-chart';
import { ChartBuilderToolbar } from './chart-builder-toolbar';
import { PresetMenu } from './preset-menu';
import { DataPanel } from '@/components/patterns/data-panel';
import type { ChartDefinition, CollectionCurveDefinition } from '@/lib/views/types';
import type { BatchCurve } from '@/types/partner-stats';

interface ChartPanelProps {
  definition: ChartDefinition;
  onDefinitionChange: (next: ChartDefinition) => void;
  /** Rows available to the generic renderer — filteredRawData at the call site. */
  rows: Array<Record<string, unknown>>;
  /** Pre-computed curves only used by the collection-curve preset branch. */
  curves?: BatchCurve[];
  chartSnapshotRef?: React.MutableRefObject<(() => CollectionCurveDefinition) | null>;
  chartLoadRef?: React.MutableRefObject<((state: CollectionCurveDefinition) => void) | null>;
}

export function ChartPanel(props: ChartPanelProps) {
  const { definition, onDefinitionChange, rows, curves, chartSnapshotRef, chartLoadRef } = props;

  if (definition.type === 'collection-curve') {
    // Preset owns its own DataPanel chrome + actions slot. Builder toolbar hidden
    // (CONTEXT lock). Preset menu still reachable — rendered alongside the existing
    // metric toggle in the preset's own actions via a small adapter prop.
    return (
      <CollectionCurveChart
        curves={curves ?? []}
        chartSnapshotRef={chartSnapshotRef}
        chartLoadRef={chartLoadRef}
        presetMenu={<PresetMenu definition={definition} onDefinitionChange={onDefinitionChange} />}
      />
    );
  }

  // Generic branch: line / scatter / bar
  return (
    <DataPanel
      title={TITLE_BY_TYPE[definition.type]}
      actions={
        <div className="flex items-center gap-inline">
          <ChartBuilderToolbar definition={definition} onChange={onDefinitionChange} />
          <PresetMenu definition={definition} onDefinitionChange={onDefinitionChange} />
        </div>
      }
    >
      <GenericChart definition={definition} rows={rows} onDefinitionChange={onDefinitionChange} />
    </DataPanel>
  );
}
```

Source: CollectionCurveChart shell (`src/components/charts/collection-curve-chart.tsx:197-220` — DataPanel + actions slot), existing dispatcher-by-level pattern in `data-display.tsx:867-1038`.

### Pattern 4: Chart Presets Slice (mirrors Saved Views 1:1)

**What:** A new feature slice at `src/lib/chart-presets/` that mirrors the shape of `src/lib/views/` and `src/lib/partner-lists/`. Adds a `useChartPresets` hook at `src/hooks/use-chart-presets.ts` that mirrors `useSavedViews` (empty-init → hydrate-from-localStorage → sanitize → persist-on-change).

**Entity shape:**
```typescript
// src/lib/chart-presets/types.ts (new)
import type { ChartDefinition } from '@/lib/views/types';

export interface ChartPreset {
  /** Unique id. `builtin:*` for locked built-ins; crypto.randomUUID() for user presets. */
  id: string;
  /** User-visible name (required, trimmed). */
  name: string;
  /** True for built-ins (Collection Curves). Locked = cannot rename/delete. */
  locked: boolean;
  /** Timestamp (Date.now()). Built-ins use 0. */
  createdAt: number;
  /** The actual chart configuration this preset applies. */
  definition: ChartDefinition;
}
```

**localStorage contract:**
- Key: `bounce-dv-chart-presets` (mirrors `bounce-dv-saved-views` and `bounce-dv-partner-lists`).
- Storage type: `ChartPreset[]` — **user presets only**. Built-ins are code-defined (never persisted).
- Merge on read: built-ins first, user presets after, dedupe by `id`.

**Hook surface (mirrors useSavedViews):**
```typescript
useChartPresets(): {
  presets: ChartPreset[];             // built-ins + user, sorted
  savePreset: (name, definition) => ChartPreset;
  deletePreset: (id) => ChartPreset | undefined;
  restorePreset: (preset) => void;    // undo hook for toast
  hasPresetWithName: (name) => boolean;
  renamePreset: (id, name) => void;
  getPreset: (id) => ChartPreset | undefined;
}
```

**Sanitization on load (self-heal pattern):** Drop any user preset whose `definition` fails `chartDefinitionSchema.safeParse` (same "stale references dropped silently" posture Phase 34-04 established for `listId` sanitization in `useSavedViews`).

Source: `src/lib/views/storage.ts`, `src/lib/partner-lists/storage.ts`, `src/hooks/use-saved-views.ts`.

### Pattern 5: Inline Builder Toolbar (always-editable, no Save gate)

**What:** Chart type segmented control + X picker + Y picker + stale-ref warning, all in a single row mounted in the `DataPanel.actions` slot. Every change dispatches `onDefinitionChange(next)` immediately — no debounce, no save-pending state.

**Layout:**
```
[ LineIcon | ScatterIcon | BarIcon ]   (ToolbarDivider)   X: [Pick column ▾]   Y: [Pick column ▾]   (ToolbarDivider)   [Presets ▾]
```

**Type carryover rules (from CONTEXT "Chart type switch + carryover"):**
- Switching generic → generic: if current `x` column key is eligible for the new type, keep it; else set to `null` (user prompted to pick). Same for `y`.
- Switching collection-curve → generic (line/scatter/bar):
  - Default `y` = null (the preset's `metric` field is not a column — it's a computed series; no meaningful carry).
  - Default `x` = null; user picks. (Alternatively: seed with `BATCH` for bar and `BATCH_AGE_IN_MONTHS` for line — simple sensible-default per CONTEXT. Recommend `null` for both to avoid silent type mismatches; the `EmptyState` guides the user.)
- Switching generic → collection-curve: replace definition with `DEFAULT_COLLECTION_CURVE` (imported from `src/lib/views/migrate-chart.ts:40`). Discards generic axes — CONTEXT locks this.

**Dispatcher helper (proposed):**
```typescript
// src/lib/charts/transitions.ts (optional small helper)
import type { ChartDefinition } from '@/lib/views/types';
import { DEFAULT_COLLECTION_CURVE } from '@/lib/views/migrate-chart';
import { isColumnEligible } from '@/lib/columns/axis-eligibility';

export function switchChartType(
  current: ChartDefinition,
  nextType: ChartDefinition['type'],
): ChartDefinition {
  if (current.type === nextType) return current;
  if (nextType === 'collection-curve') return DEFAULT_COLLECTION_CURVE;
  if (current.type === 'collection-curve') {
    return { type: nextType, version: 1, x: null, y: null };
  }
  // Generic → generic: carry axes if still eligible.
  const xCol = current.x?.column ?? null;
  const yCol = current.y?.column ?? null;
  return {
    type: nextType,
    version: 1,
    x: isColumnEligible(nextType, 'x', xCol) ? current.x : null,
    y: isColumnEligible(nextType, 'y', yCol) ? current.y : null,
  };
}
```

### Pattern 6: Stale Column Warning Banner

**What:** A compact inline warning rendered at the top of the generic chart content area when a saved view's `chartState` references a column key that isn't in `COLUMN_CONFIGS` (e.g., column was removed or renamed server-side).

**Trigger:** Inside `GenericChart` render, resolve `definition.x.column` + `definition.y.column` against `COLUMN_CONFIGS`. When a resolved column is missing: render banner + pick a sensible fallback (first eligible column for that axis), chart still renders.

**Why not rely on sanitization at load?** Saved-view `chartState` is not column-pruned today. Phase 35's `migrateChartState` only narrows legacy→v2 shapes; it does not validate axis column keys against the live registry. And per CONTEXT, stale column refs are now **user-visible state** — silent drop is rejected. The banner is the correct surface.

**Why inline in the chart, not as a toast?** Toast dismisses on its own and loses the context ("which chart?"). An inline banner persists until the user resolves it (picks a new column, which overwrites `definition.x`).

**Proposed component (sketch):**
```typescript
// src/components/charts/stale-column-warning.tsx (new)
import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function StaleColumnWarning({ axis, missing, fallback }: { axis: 'X' | 'Y'; missing: string; fallback: string }) {
  return (
    <Alert className="mb-stack">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription>
        <span className="text-title">{axis}-axis column </span>
        <code className="text-label-numeric px-1 rounded bg-muted">{missing}</code>
        <span> not available — using </span>
        <code className="text-label-numeric px-1 rounded bg-muted">{fallback}</code>
      </AlertDescription>
    </Alert>
  );
}
```

Source: existing Alert pattern at `src/components/data-display.tsx:572-598` (schema warnings — same visual recipe).

### Pattern 7: Presets Menu (built-ins + user + save action)

**What:** A single Popover mounted in the builder toolbar. Menu structure follows the shipped Saved Views UX:

```
┌ Presets ▾ ────────────────────┐
│ BUILT-IN                       │
│   🔒 Collection Curves   ✓     │
│                                │
│ YOUR PRESETS                   │
│   Recovery by Partner         │
│   Volume Trajectory           │
│                                │
│ ─────────────────             │
│   ＋ Save current as preset…  │
└────────────────────────────────┘
```

**Behaviors:**
- Click built-in → `onDefinitionChange(builtin.definition)`.
- Click user preset → `onDefinitionChange(preset.definition)` + highlight `✓`.
- Click Save → opens `SavePresetPopover` (modal — name field + Save/Cancel). On submit → `savePreset(name, currentDefinition)`, toast "Preset saved" with undo, close popover.
- Built-ins show a lock icon and have no rename/delete affordance. User presets expose delete on hover (mirror `ViewItem` pattern in `src/components/views/view-item.tsx`).

**Active-preset detection:** The menu's checkmark lights on the preset whose `definition` deep-equals the current chart definition. Treat as a comparison helper (`isSameDefinition(a, b)` via ignoring `version` differences). Nice-to-have — if ambiguous (user tweaked axis from preset), no checkmark is fine.

Source: existing `PresetDropdown` at `src/components/toolbar/preset-dropdown.tsx` (structurally identical) + `SaveViewPopover` at `src/components/toolbar/save-view-popover.tsx` (modal-naming recipe).

### Pattern 8: Generic Chart Renderer (variant-dispatch)

**What:** A single component `GenericChart` that switches on `definition.type` to render the right Recharts composition. Shares: `ChartContainer` wrapper, `CartesianGrid`, `ChartTooltipContent`, `NumericTick` for numeric axes, chart palette.

**Shape sketch:**
```typescript
// src/components/charts/generic-chart.tsx (new)
'use client';
import { LineChart, Line, ScatterChart, Scatter, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { ChartContainer, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { EmptyState } from '@/components/patterns/empty-state';
import { NumericTick } from './numeric-tick';
import { StaleColumnWarning } from './stale-column-warning';
import type { GenericChartDefinition } from '@/lib/views/types';

// Resolve column from COLUMN_CONFIGS; fall back to first eligible column if missing.
// Render <StaleColumnWarning /> above chart if fallback kicked in.
// If x or y not picked AND no fallback needed → render EmptyState variant="no-data".
```

**Type-specific defaults (Claude's discretion per CONTEXT):**
- Line: `type="monotone"` (smooth), `strokeWidth={2}`, `dot={false}`.
- Scatter: point size `r={4}`, single-series (no `ZAxis`).
- Bar: vertical bars (`layout="horizontal"` — Recharts "horizontal layout" = vertical bars in practice; verify the prop name matches the library semantics before committing), no grouping (single-series).

**Empty states:**
- Fresh generic chart with `x: null && y: null` → `<EmptyState variant="no-data" title="Pick axes to render" description="Select an X and Y column from the toolbar." />`
- `rows.length === 0` with axes picked → `<EmptyState variant="no-data" title="No data for current filters" />` (follows Phase 29 classification — trigger is "dataset empty after filters," not "no picks yet").

### Anti-Patterns to Avoid
- **Do NOT fork `CollectionCurveChart`.** CHRT-06 requires visually identical output. Wrap the existing component; never duplicate.
- **Do NOT store preset metadata on `ChartDefinition`.** The definition is the value; `ChartPreset` is the entity with `id`/`name`/`locked`/`createdAt`. Collapsing them pollutes every persisted `ViewSnapshot.chartState` with preset metadata.
- **Do NOT write stale column refs back to localStorage on the next save.** If the user tweaks axes in the builder, the write-back is the new clean state (no stale ref). If they don't tweak, the stale ref stays — that's acceptable; the banner keeps them informed.
- **Do NOT use shadcn's `ChartConfig` type name for your own config shape.** It's already exported from `src/components/ui/chart.tsx:15`. Keep using `ChartDefinition`. (Phase 35 already resolved this naming.)
- **Do NOT hand-maintain a "numeric columns list" or "categorical columns list".** Derive from `COLUMN_CONFIGS` + existing `isNumericType`. CONTEXT lock.
- **Do NOT add `groupBy` to any new variant.** CHRT-14 is deferred; keep variants single-series. Adding the field now risks a partial, misleading implementation.
- **Do NOT introduce a new chart library.** Recharts owns it (already in the stack, all three types verified exported).
- **Do NOT render the builder toolbar when the collection-curve preset is active.** CONTEXT lock. The preset keeps its bespoke metric-toggle actions; the builder is for generic types only.
- **Do NOT render the `ChartBuilderToolbar` outside a `DataPanel.actions` slot.** The panel recipe (Phase 29) owns chart-shell elevation + padding; bolt-on toolbars fracture the visual language.
- **Do NOT use Tailwind's `text-xs`/`text-sm`/`text-base`/etc. in new chart builder code.** Phase 27 type tokens only — `text-display` / `text-heading` / `text-title` / `text-body` / `text-label` / `text-caption` (+ numeric variants). Tokens own weight — do NOT pair `font-semibold` / `font-medium` / `font-bold` with a type token. Guard is at `scripts/check-type-tokens.sh`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Generic chart rendering (line/scatter/bar) | D3 + SVG by hand | Recharts 3.8 `LineChart` / `ScatterChart` / `BarChart` | Recharts already owns CollectionCurveChart + trajectory-chart. All three types are native exports. |
| Column classification for axis eligibility | Hand-maintained string arrays in multiple files | `src/lib/columns/axis-eligibility.ts` derived from `COLUMN_CONFIGS` | Drift-proof; single source of truth. `isNumericType` already exists at `src/lib/formatting/numbers.ts:68`. |
| Preset localStorage persistence | Ad-hoc get/set with JSON.parse | Mirror `src/lib/views/storage.ts` (zod `safeParse` + try/catch + `'use client'` hook) | Battle-tested in Phases 6, 34; handles SSR + private browsing + quota + corrupt payloads. |
| Preset deduplication / built-in merge | Runtime flag on each user preset | `builtin:*` id prefix + code-defined `BUILTIN_PRESETS` array | Built-ins never persist; user presets merge after. Prefix prevents id collision. |
| Popover-with-search picker | Custom Combobox | Reuse `filter-combobox.tsx` pattern (or call it directly if its surface fits) | Already keyboard-nav'd, focus-glow-within wired, Phase 31 scroll polish applied. |
| Modal-style save prompt | Custom dialog | Mirror `SaveViewPopover` at `src/components/toolbar/save-view-popover.tsx` — popover w/ input + Save/Replace + Enter/Esc | Dup-name handling (`isDuplicate && !showReplace` → "Replace?") already solved. |
| Type-token weight / font-size compliance | Manual audit | `npm run check:tokens` guard script | Already in CI; catches violations at commit time (Phase 27-06). |
| Surface recipe for chart panel | Hand-rolled border + shadow combos | `<DataPanel title=… actions=…>` | Panel recipe locked in 29-02; surface guard at `npm run check:surfaces`. |
| Empty state for "no axes picked" | Ad-hoc text + icon | `<EmptyState variant="no-data" title=… description=… />` | Canonical since 29-03; consistent across app. |
| Vertical separator between toolbar clusters | `<div className="bg-border" />` | `<ToolbarDivider />` | Canonical recipe; component guard at `npm run check:components`; divider-vertical-fade inherited from Phase 31 automatically. |
| Toast for save/delete/undo | sonner import boilerplate | Existing `handleDeleteView`/`handleSaveView` recipe in `data-display.tsx:411-480` | Mirror 1:1; undo action already wired. |
| Deep-equal for active-preset detection | `JSON.stringify(a) === JSON.stringify(b)` | Small `isSameDefinition(a, b)` helper with discriminator-aware compare | Stable key order matters for `JSON.stringify` — hard to guarantee; explicit compare is short and correct. |

**Key insight:** Every piece of infrastructure this phase needs already has a precedent in the codebase. The phase risk is composition, not invention. The biggest single gotcha is the **browser-seed-vs-hydration** issue Phase 35-02 flagged — any attempt to seed localStorage before load will be silently overwritten by `useSavedViews`'s hydration-then-persist effect at `src/hooks/use-saved-views.ts:94-108`. This matters for human-verify scenarios (see Pitfall 2).

## Common Pitfalls

### Pitfall 1: `ChartDefinition` variants that silently parse as each other
**What goes wrong:** zod's `discriminatedUnion` requires the discriminator (`type`) to be a **literal** on every variant. If a variant accidentally declares `type: z.string()` or a non-literal schema, `safeParse` stops narrowing by discriminator and silently accepts cross-variant shapes.
**Why it happens:** Easy copy-paste error when adding variants.
**How to avoid:** Every new variant keeps `type: z.literal('line')` / `z.literal('scatter')` / `z.literal('bar')`. The smoke test (CHRT-01/02 extension) should include a `{ type: 'line', version: 1, ... }` case that parses only as the line variant.
**Warning signs:** Phase 35 smoke test (`src/lib/views/migrate-chart.smoke.ts`) fails when extended with new variants.

### Pitfall 2: Browser-seed-vs-hydration collision (Phase 35-02 precedent)
**What goes wrong:** You seed `localStorage['bounce-dv-saved-views']` by hand in devtools to test a stale-column ref scenario — then reload and the hydration effect overwrites your seed because `useSavedViews` fires a `persistSavedViews` on every render after hydration (`src/hooks/use-saved-views.ts:104-108`).
**Why it happens:** `useEffect(() => { if (hasHydrated.current) persistSavedViews(views) }, [views])` runs after hydration, so the first write-back cycle overwrites any unseeded mutation.
**How to avoid:** For human-verify of stale-column banner, either (a) open devtools → seed localStorage → navigate directly (no reload that retriggers hydration), or (b) use the smoke-test path — extend `src/lib/views/migrate-chart.smoke.ts` with a "stale column" assertion rather than relying on browser seeding. The E2E-harness nice-to-have captured in `.planning/STATE.md` Phase 35-02 continues to apply here.
**Warning signs:** `localStorage.getItem('bounce-dv-saved-views')` returns the app's default immediately after reload, not the seeded value.

### Pitfall 3: Fallback column selection for stale refs causes infinite warning
**What goes wrong:** The stale-column warning banner picks a fallback column and uses it for rendering, but never overwrites the stale ref in `definition.x.column`. Every re-render keeps the warning visible forever.
**Why it happens:** The renderer resolves on read but doesn't dispatch a change.
**How to avoid:** Fallback is **read-only in the renderer**. The warning stays visible until the user picks a new column via the builder (which dispatches `onDefinitionChange` and overwrites the stale ref). Do NOT auto-heal by calling `onDefinitionChange` in a render effect — that creates a render loop and also silently mutates saved state without user intent (which contradicts CONTEXT's "user-visible state" lock).
**Warning signs:** Banner flickers or the user sees a mismatch between banner's "using X" text and the actual rendered axis label.

### Pitfall 4: Preset's `definition` is mutated by reference after apply
**What goes wrong:** `onDefinitionChange(preset.definition)` shares a reference with the built-in catalog / user preset array. Next tweak of an axis mutates the preset itself.
**Why it happens:** Object spread is not a deep clone.
**How to avoid:** Apply presets via `structuredClone(preset.definition)` (built-in in modern browsers; Next 16 + Node 20 confirms availability) or equivalent JSON.parse/stringify round-trip. Never hand out a live reference to a preset's `definition`.
**Warning signs:** Editing an axis after applying a preset appears to "modify the preset" on next load.

### Pitfall 5: Recharts cartesian chart type mismatch (common to all three)
**What goes wrong:** A line chart with `XAxis type="number"` against a categorical column key produces a blank chart, because Recharts tries to coerce `'Acme Lending'` to a number.
**Why it happens:** Each chart type requires the right `XAxis type` matching the underlying data dtype.
**How to avoid:** Derive `XAxis type` from the resolved X column's registry type: `text` → `type="category"`, `number`/`date` → `type="number"` (with proper domain). For scatter, both axes are `type="number"` always. For bar, X is `type="category"` always. Centralize this in a tiny helper to avoid branching in the render tree.
**Warning signs:** Chart renders as an empty grid with axis labels but no line/bars/points.

### Pitfall 6: shadcn `ChartContainer` requires `ResponsiveContainer`'s children shape
**What goes wrong:** You pass a bare `<LineChart>` as `<ChartContainer>`'s child, but ChartContainer's `children` prop is typed as `React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>["children"]` (see `src/components/ui/chart.tsx:51-53`). Some Recharts chart component unions don't satisfy that prop without an explicit cast.
**Why it happens:** ResponsiveContainer expects a **single** child that is one of the chart primitives, not a fragment or array.
**How to avoid:** Always render one chart primitive as the direct child of `ChartContainer`. If you need to conditionally pick line/scatter/bar, do the conditional outside the `ChartContainer` wrapper — render a different `ChartContainer` per branch, or use `{chartType === 'line' ? <LineChart>…</LineChart> : <ScatterChart>…</ScatterChart>}` as the sole child. Existing precedent at `src/components/charts/collection-curve-chart.tsx:226-306`.
**Warning signs:** TypeScript errors about `ReactElement` vs `ReactNode`, or runtime "ResponsiveContainer expects a single child" warnings.

### Pitfall 7: Type-token guard breakage on new chart builder files
**What goes wrong:** A new `chart-builder-toolbar.tsx` uses `text-xs` or `font-semibold` on a `text-title` — the `npm run check:tokens` guard fails post-commit.
**Why it happens:** Easy to slip in Tailwind default text sizes while iterating on layout.
**How to avoid:** Lean on the 6 named type tokens + 3 numeric variants exclusively. Label tier for picker labels (`X:`, `Y:`), body tier for picker button text, caption for helper text. Weight is baked in — never pair font-weight utilities. Run `npm run check:tokens` before committing.
**Warning signs:** Pre-commit / CI guard script output.

### Pitfall 8: Migration path for legacy `CollectionCurveDefinition` consumers
**What goes wrong:** `data-display.tsx:490-491` declares `chartSnapshotRef` / `chartLoadRef` as `React.MutableRefObject<(() => CollectionCurveDefinition) | null>`. Generalizing these to `ChartDefinition` means TypeScript stops narrowing on the `type === 'collection-curve'` branch without an explicit guard.
**Why it happens:** Phase 35 intentionally kept the refs narrow to the preset variant because that was the only variant. Phase 36 has two options: (a) keep the refs narrow (preset-only) and accept that line/scatter/bar variants don't round-trip through the preset's ref mechanism — they round-trip directly through `ChartDefinition` state owned by `ChartPanel`; or (b) generalize the refs to `ChartDefinition` and narrow at each call site.
**How to avoid:** **Recommend (a)**: keep `CollectionCurveDefinition`-typed refs for the preset's bespoke save/load hookup (metric toggle state, batch hidden set — domain-specific to the preset). For generic types, the `ChartPanel` owns `definition` as plain React state and writes it into `ViewSnapshot.chartState` via a different (simpler) snapshot path. Two snapshot mechanisms: one for the preset (preserves `hiddenBatches` etc.), one for generic (state is the whole definition).
**Warning signs:** `data-display.tsx` TS errors at lines 388-389 after the ref type change.

### Pitfall 9: Preset apply races with active chart's internal state (preset branch)
**What goes wrong:** User clicks "Collection Curves" preset while the collection-curve chart is already mounted. `onDefinitionChange(preset.definition)` updates `ViewSnapshot.chartState` but the in-component state (`useCurveChartState`'s `metric`, `hiddenBatches`) doesn't change — visual state is desynced from stored state.
**Why it happens:** `useCurveChartState` owns its state independently; `restoreChartState` is called via `chartLoadRef` but that path is wired only to view-load, not preset-apply.
**How to avoid:** When the preset branch is already mounted AND user applies a `collection-curve`-type preset, also invoke `chartLoadRef.current?.(preset.definition)` to push the new state into the preset's internal hook. Centralize in `onDefinitionChange` handler at the `ChartPanel` level.
**Warning signs:** Applying Collection Curves preset flips the metric in `ViewSnapshot.chartState` but UI still shows the old metric toggle highlight.

## Code Examples

Verified patterns already in this repo (read via direct file access):

### Example 1: DataPanel with actions slot (canonical chart-shell)
```typescript
// Source: src/components/charts/collection-curve-chart.tsx:197-220
<DataPanel
  title="Collection Curves"
  contentClassName="space-y-2"
  actions={
    <div className="flex gap-1">
      {/* metric toggle cluster */}
    </div>
  }
>
  {/* chart body */}
</DataPanel>
```

### Example 2: Recharts LineChart inside ChartContainer (in-repo pattern)
```typescript
// Source: src/components/charts/collection-curve-chart.tsx:226-306
<ChartContainer config={chartConfig} className="h-[40vh] w-full">
  <LineChart data={pivotedData} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
    <XAxis type="number" dataKey="month" ticks={…} tick={<NumericTick />} />
    <YAxis tickFormatter={…} tick={<NumericTick anchor="end" dy={4} />} />
    <Tooltip content={…} />
    {/* Line / Scatter / Bar primitive go here */}
  </LineChart>
</ChartContainer>
```

### Example 3: localStorage-backed hook with zod sanitization (mirror for presets)
```typescript
// Source: src/hooks/use-saved-views.ts:82-108
export function useSavedViews(knownListIds?: Set<string>) {
  const [views, setViews] = useState<SavedView[]>([]);
  const hasHydrated = useRef(false);
  useEffect(() => {
    let loaded = loadSavedViews();
    if (loaded.length === 0) loaded = getDefaultViews();
    const ids = knownListIds ?? new Set<string>();
    setViews(sanitizeViews(loaded, ids));
    hasHydrated.current = true;
  }, [knownListIds]);
  useEffect(() => {
    if (!hasHydrated.current) return;
    persistSavedViews(views);
  }, [views]);
  // … CRUD methods
}
```

### Example 4: Discriminated-union schema (extension point for new variants)
```typescript
// Source: src/lib/views/schema.ts:33-36 — variants extend here
export const chartDefinitionSchema = z.discriminatedUnion('type', [
  collectionCurveVariantSchema,
  // Phase 36 will add line / bar / scatter variants here.
]);
```

### Example 5: Save-name modal recipe (mirror for SavePresetPopover)
```typescript
// Source: src/components/toolbar/save-view-popover.tsx:50-63
function handleSubmit() {
  if (!trimmed) return;
  if (isDuplicate && !showReplace) {
    setShowReplace(true);
    return;
  }
  if (isDuplicate) onReplace(trimmed, options);
  else onSave(trimmed, options);
  setOpen(false);
}
```

### Example 6: Alert banner for warnings (template for StaleColumnWarning)
```typescript
// Source: src/components/data-display.tsx:572-598
<Alert className="relative shrink-0 mx-2 mt-2">
  <AlertTriangle className="h-4 w-4" />
  <AlertDescription className="pr-8">
    <span className="text-title">Data may be incomplete. </span>
    {/* inline details */}
  </AlertDescription>
</Alert>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single `CollectionCurveChart` hardcoded into `data-display.tsx` | `ChartPanel` dispatcher renders preset OR generic based on `ViewSnapshot.chartState.type` | Phase 36 (this phase) | Opens the door to line/scatter/bar without touching the preset's internals. |
| `ChartDefinition` = collection-curve only | `ChartDefinition` = union of 4 variants (collection-curve + line + scatter + bar) | Phase 36 | User-selectable chart types. |
| Stale column refs silently dropped during view migration | Stale column refs kept in state, user-visible warning banner with graceful fallback render | Phase 36 | Honors CONTEXT "user-visible state" lock; lets users see and resolve stale refs. |
| No preset catalog | `bounce-dv-chart-presets` localStorage + built-in catalog | Phase 36 | CHRT-10/11/12 satisfied. |
| Axis eligibility implicit (collection curve always had fixed axes) | Axis eligibility derived from `COLUMN_CONFIGS` + chart type | Phase 36 | Single source of truth; no hand-maintained list. |

**Deprecated/outdated:** None — all prior surfaces (CollectionCurveChart, use-curve-chart-state, legend, tooltip) are explicitly preserved by CONTEXT lock.

## Open Questions

1. **`x` / `y` default when switching from collection-curve → generic?**
   - What we know: CONTEXT says "convert with sensible defaults." Preset `metric` does not map to any `ColumnConfig` (it's a computed series: recovery rate or dollars collected derived from batch curves).
   - What's unclear: Whether to seed `x = { column: 'BATCH_AGE_IN_MONTHS' }` (ordinal) or `y = null` (prompt user) for line, and similar seeding for scatter/bar.
   - Recommendation: Seed both `x` and `y` to `null` and show `<EmptyState variant="no-data" title="Pick axes to render" />`. Keeps the conversion deterministic and avoids misleading the user with an arbitrary default. Flag for planner to confirm.

2. **Should the preset catalog's Collection Curves entry be the same reference as `DEFAULT_COLLECTION_CURVE`?**
   - What we know: `DEFAULT_COLLECTION_CURVE` is exported from `src/lib/views/migrate-chart.ts:40` and used as migration fallback. It's a concrete `CollectionCurveDefinition`.
   - What's unclear: Whether `BUILTIN_PRESETS[0].definition === DEFAULT_COLLECTION_CURVE` is desirable or whether the preset should carry its own default (e.g., `metric: 'recoveryRate'` vs `'amount'`).
   - Recommendation: Reference `DEFAULT_COLLECTION_CURVE` directly. Keeps a single source of truth; any future tweak propagates.

3. **Presets stored per-user vs per-browser (global)?**
   - What we know: CONTEXT locks "per-view only" as **out of scope** — but doesn't say per-user. v4.0 has no user auth (per `REQUIREMENTS.md` "User authentication | Small team, defer to v5").
   - What's unclear: Without auth, "per-user" and "per-browser" are the same thing. Use the device-level localStorage namespace already established (`bounce-dv-*` prefix).
   - Recommendation: Device-level localStorage, `bounce-dv-chart-presets`. When auth lands, migration is a small rehydrate pass (same pattern Phase 34 would use for partner-lists).

4. **Where does the preset menu live — inside the DataPanel's `actions` slot or outside?**
   - What we know: CONTEXT places it in the chart toolbar. In the generic branch, the toolbar is in `actions`. In the preset branch, the current preset (collection-curve) has its own metric-toggle cluster in `actions`.
   - What's unclear: Should the preset branch also show a Presets ▾ (alongside metric toggle) or should presets only be accessible via the generic-chart toolbar?
   - Recommendation: **Always visible in both branches** — "Collection Curves" must be reachable (CHRT-12 + preset switching). In the preset branch, `CollectionCurveChart` accepts a new `presetMenu?: ReactNode` prop and renders it alongside the metric toggle. In the generic branch, it's in the builder toolbar.

5. **Type narrowing when the user picks an invalid/stale column?**
   - What we know: Pitfall 3 covers the fallback for already-stored stale refs.
   - What's unclear: What happens in the UI between "picked new type" and "picked new column" — e.g., user switches from line to bar, line's `x` (numeric column) becomes invalid under bar, so `x` is cleared. Does the picker show the clear, or should we auto-pick the first eligible categorical?
   - Recommendation: Clear (`x: null`) and show the EmptyState "Pick axes" — matches CONTEXT "If the carried axis is invalid under the new type, clear it and prompt the user to pick."

## Validation Architecture

`.planning/config.json` has no `workflow.nyquist_validation` key — `workflow` is `{ research, plan_check, verifier, auto_advance }`. Phase 35 established the `node --experimental-strip-types` + `node:assert/strict` smoke harness; Phase 36 should extend that, not introduce vitest.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Node `--experimental-strip-types` + `node:assert/strict` (Phase 35-01 precedent) |
| Config file | None (smoke runs standalone) |
| Quick run command | `npm run smoke:migrate-chart` (existing; extend the suite inline) |
| Full suite command | `npm run build && npm run smoke:migrate-chart && npm run check:tokens && npm run check:surfaces && npm run check:components && npm run check:motion && npm run check:polish` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CHRT-03 | Line chart renders with numeric Y + time/numeric X | manual + smoke | Browser UAT; smoke: `chartDefinitionSchema.safeParse({type:'line',version:1,x:{column:'BATCH_AGE_IN_MONTHS'},y:{column:'TOTAL_COLLECTED_LIFE_TIME'}}).success === true` | Wave 0 extends |
| CHRT-04 | Scatter renders with two numeric columns | manual + smoke | Browser UAT; smoke: scatter variant safeParse success for valid numeric pair | Wave 0 extends |
| CHRT-05 | Bar renders with categorical X + numeric Y | manual + smoke | Browser UAT; smoke: bar variant safeParse success | Wave 0 extends |
| CHRT-06 | Collection curves visually identical | manual UAT | Side-by-side comparison of preset in Phase 36 branch vs main | Manual |
| CHRT-07 | X-axis column picker filtered by chart type | unit | Wave 0 smoke: `getEligibleColumns('bar', 'x')` returns only `type === 'text'` columns | Wave 0 creates |
| CHRT-08 | Y-axis column picker is numeric-only | unit | Wave 0 smoke: `getEligibleColumns(anyType, 'y').every(c => isNumericType(c.type))` | Wave 0 creates |
| CHRT-09 | Chart type switch re-renders immediately | manual | Browser UAT: click line → bar → scatter, see instant re-render | Manual |
| CHRT-10 | User can save chart configuration as preset | manual + unit | Smoke: `savePreset(name, def)` → `presets` contains entry; localStorage write verified | Wave 0 creates |
| CHRT-11 | User can load a preset with one click | manual + unit | Smoke: `onDefinitionChange(preset.definition)` → `ViewSnapshot.chartState` deep-equals preset def | Wave 0 creates |
| CHRT-12 | Collection Curves available as built-in preset | unit | Smoke: `BUILTIN_PRESETS[0].id === 'builtin:collection-curves'` + `.locked === true` | Wave 0 creates |
| CHRT-13 | Chart config persists with saved views | manual | Save view → reload → verify `ViewSnapshot.chartState` restored | Manual + existing Phase 35 smoke extended |
| Stale column banner | Stale ref triggers warning + fallback render | manual UAT | Devtools-seed localStorage with invalid column key → reload → banner visible + chart still renders with fallback | Manual (Pitfall 2 applies) |

### Sampling Rate
- **Per task commit:** `npm run check:tokens && npm run smoke:migrate-chart` (fast; catches token + migration regressions).
- **Per wave merge:** `npm run build` + all 5 `check:*` guards + smoke.
- **Phase gate:** Full suite + manual UAT of each chart type + stale-banner visual check before `/gsd:verify-work`.

### Wave 0 Gaps
- [ ] Extend `src/lib/views/migrate-chart.smoke.ts` with `chartDefinitionSchema` cases for each new variant (valid line, valid scatter, valid bar, cross-variant safeParse non-acceptance — covers Pitfall 1).
- [ ] `src/lib/columns/axis-eligibility.ts` + smoke assertions (covers CHRT-07, CHRT-08 at the helper layer).
- [ ] `src/lib/chart-presets/*` files + smoke assertions (localStorage round-trip + `BUILTIN_PRESETS` invariants + sanitize-drops-malformed — covers CHRT-10, CHRT-11, CHRT-12).
- [ ] No new npm scripts needed — extend the existing `smoke:migrate-chart` harness in place (keeps CI surface flat).

## Sources

### Primary (HIGH confidence — direct file reads)
- `src/lib/views/schema.ts:33` — `chartDefinitionSchema` discriminated union extension point.
- `src/lib/views/types.ts:27-31` — `ChartDefinition`, `CollectionCurveDefinition` type aliases.
- `src/lib/views/migrate-chart.ts:40-47` — `DEFAULT_COLLECTION_CURVE` (re-used as built-in preset value).
- `src/lib/views/defaults.ts:77-84, 171-178` — seeded v2 chartState shapes in starter views.
- `src/hooks/use-saved-views.ts:82-108` — hydration-then-persist effect (Pitfall 2 root cause).
- `src/lib/columns/config.ts:9-113` — `ColumnConfig` type + all 61 registry entries + `DEFAULT_COLUMNS` / `IDENTITY_COLUMNS` exports.
- `src/lib/formatting/numbers.ts:68-70` — `isNumericType` (reused by axis eligibility).
- `src/components/charts/collection-curve-chart.tsx` — preset component (327 lines, untouched by this phase; wrapped by `ChartPanel`).
- `src/components/charts/use-curve-chart-state.ts:171-212` — `getChartSnapshot` / `restoreChartState` (preset-only contract).
- `src/components/data-display.tsx:388-491` — consumer call sites for chart snapshot/load refs + narrowing precedent.
- `src/components/ui/chart.tsx:15, 42-82, 119-271` — `ChartConfig` shadcn type, `ChartContainer`, `ChartTooltipContent`.
- `src/components/patterns/data-panel.tsx` — canonical chart-shell pattern (title + actions + children + footer).
- `src/components/patterns/empty-state.tsx` — EmptyState variant catalog (`no-data` / `no-results` / `error` / `permissions`).
- `src/components/patterns/toolbar-divider.tsx` — canonical cluster separator.
- `src/components/toolbar/preset-dropdown.tsx` — structural template for Presets ▾ menu.
- `src/components/toolbar/save-view-popover.tsx` — modal-naming recipe (dup-name "Replace?" flow).
- `src/components/views/views-sidebar.tsx` — Sheet-based list UX (not the recommended fit for the Presets menu — it's a dropdown, not a sheet — but confirms the naming-modal pattern).
- `src/lib/views/storage.ts` — localStorage read/write pattern with zod safeParse + try/catch (SSR-safe; private-browsing-safe).
- `src/lib/partner-lists/storage.ts`, `src/lib/partner-lists/types.ts` — parallel precedent for a feature slice + hook.
- `src/hooks/use-partner-lists.ts` — hook contract template (`UsePartnerListsResult`).
- `src/components/cross-partner/trajectory-chart.tsx:4-12` — second in-repo Recharts LineChart composition.
- `src/components/charts/numeric-tick.tsx` — canonical Recharts custom tick (Phase 27-02 lock — use for generic Y-axis).
- `package.json` — Recharts 3.8.0, zod 4.3.6, React 19.2.4, Next 16.2.3 confirmed installed; existing `npm run smoke:migrate-chart` + `check:*` scripts.
- `node_modules/recharts/types/index.d.ts` — verified exports: `LineChart`, `ScatterChart`, `BarChart`, `Scatter`, `Bar`, `Line`, `XAxis`, `YAxis`, `CartesianGrid`, `Tooltip`, `ResponsiveContainer`.
- `.planning/phases/36-chart-builder/36-CONTEXT.md` — locked decisions + discretion + deferred ideas.
- `.planning/phases/35-chart-schema-migration/35-RESEARCH.md` — discriminated-union pattern, Pitfall 1 (schema vs migration ordering), hydration-vs-seed collision root-cause.
- `.planning/phases/35-chart-schema-migration/35-CONTEXT.md` — upstream schema decisions.
- `.planning/STATE.md` — Phase 35-02 partial-verification + browser-seed-vs-hydration decision log.
- `.planning/milestones/v4.0-REQUIREMENTS.md:92-104` — CHRT-01..13 requirement text.
- `.planning/ROADMAP.md:331-347` — Phase 36 detail section.
- `CLAUDE.md` / `AGENTS.md` — type-token rules, "Next.js you don't know" warning, SectionHeader canonical location.

### Secondary (MEDIUM confidence)
- Recharts 3.x documentation (ScatterChart API, BarChart API) cross-referenced against `node_modules/recharts/types/chart/*.d.ts` directly — these are .d.ts reads so effectively primary.
- Base UI Popover primitive behavior — confirmed via existing repo usage in `PresetDropdown` and `SaveViewPopover`.

### Tertiary (LOW confidence)
- None. Every claim in this research is grounded in a file that exists in the repo or a package whose types are in `node_modules/`.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Recharts, zod, shadcn ChartContainer, all existing patterns verified installed and in use.
- Architecture: HIGH — every proposed pattern has a direct precedent in the codebase (Phase 29 patterns, Phase 34 feature-slice shape, Phase 35 discriminated union, Phase 32 additive-optional schema evolution).
- Pitfalls: HIGH — Pitfalls 1-5 are rooted in specific files/lines; Pitfall 2 (hydration collision) is the documented Phase 35-02 finding; Pitfalls 6-9 are TypeScript-narrowing / UI-state regressions that fall naturally out of the architecture.
- Test infrastructure: MEDIUM — no vitest; extends the existing node-strip-types smoke runner. Acceptable for a Phase 36 but the E2E-harness nice-to-have from Phase 35 continues to apply for stale-column UAT.

**Recommended plan/wave breakdown (non-binding):**
- **Wave 1 (foundation, parallel-safe):**
  - Plan A: Extend `chartDefinitionSchema` with line/scatter/bar variants + update types.ts narrows + extend migrate-chart.smoke.ts. Author `axis-eligibility.ts` helper + smoke assertions.
  - Plan B: Create `src/lib/chart-presets/` slice + `useChartPresets` hook + BUILTIN_PRESETS (Collection Curves) + smoke assertions.
- **Wave 2 (UI components, serial after Wave 1):**
  - Plan C: `GenericChart` renderer (dispatches line/scatter/bar) + `StaleColumnWarning` + EmptyState integration.
  - Plan D: `ChartBuilderToolbar` (segmented control + AxisPicker × 2 + divider) + `PresetMenu` + `SavePresetPopover`.
- **Wave 3 (integration + wiring):**
  - Plan E: `ChartPanel` dispatcher (preset vs generic branch) + wire `CollectionCurveChart` to accept `presetMenu` prop + update `data-display.tsx` call sites (`:660`, `:666`) + handle `onDefinitionChange` with preset-branch Pitfall 9 synchronization.

**Research date:** 2026-04-18
**Valid until:** 2026-05-18 (30 days — all claims are grounded in the repo; Recharts / zod / Next are stable within this window.)
