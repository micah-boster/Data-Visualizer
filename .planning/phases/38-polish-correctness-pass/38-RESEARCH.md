# Phase 38: Polish + Correctness Pass — Research

**Researched:** 2026-04-24
**Domain:** In-app polish pass across sidebar, columns, chart, KPI, filters, and Metabase Import
**Confidence:** HIGH (this is a codebase-touch phase — every recommendation is grounded in a read of the target file, not training-data hypothesis)

## Summary

Phase 38 is a batched 17-item polish phase against v4.0. All work is surgical edits to existing files — no new infrastructure, no library swaps, no contract changes. The research scope was to locate the exact files/lines to change per requirement, confirm existing patterns (localStorage persistence, tooltips, sonner toasts, @base-ui/react primitives) the planner should reuse, and flag the few places where edit mechanics are subtle (preset-sync on chart-state, filter-before-aggregate contract, saved-view migration).

Three findings that could re-shape planning if missed:

1. **`BATCH_AGE_IN_MONTHS` is already a usable filter dimension.** CONTEXT lock says age-bucket presets for FLT-01 — and `BATCH_AGE_IN_MONTHS` is already in `COLUMN_CONFIGS` (type `number`, identity column, `src/lib/columns/config.ts:53`). `reshape-curves.ts:23` has a legacy-days→months coercion (`rawAge > 365 ? Math.floor(rawAge / 30) : rawAge`) — the FLT-01 filter MUST apply the same coercion or will mis-bucket legacy cached rows.
2. **KPI cascade redesign is bigger than the existing fixed 6-card grid.** `KpiSummaryCards` (the consumer) hardcodes `CARD_SPECS` as a static 6-item array and `computeKpis` returns exactly those 6 aggregates. KPI-01 needs a cohort-max-age-driven cascade (1–2 cards per tier) — this means `computeKpis` gains a `maxBatchAge` output and `KpiSummaryCards` gains a cascade-selector. Plan must NOT just re-template the grid.
3. **Chart x-axis fix (CHT-01) is a 2-line change; avg-series truncation is the real work.** `collection-curve-chart.tsx:203-204` already computes `maxAge` and clips `collectionMonthsTicks` — the x-axis whitespace bug is that `domain={[1, maxAge]}` uses `maxAge = Math.max(..., 1)`, so a single 4-month batch draws to month 4 correctly BUT `addAverageSeries` in `pivot-curve-data.ts` iterates over `sortedMonths` which is collected from ALL batch points. The avg line overshoots because pivot-data includes months beyond the visible batches' ages only when a HIDDEN older batch still has points there — need to gate avg computation + pivot on the `visibleBatchKeys` set, not on all `sortedCurves`.

**Primary recommendation:** Organize plans by work area (branding/sidebar, columns/formatting, chart, KPI, filters, layout, MBI) and keep each plan to a single file family where possible. Reuse existing patterns (`charts-expanded` localStorage, sonner toasts, `Tooltip`/`TooltipTrigger`/`TooltipContent` primitive, `ChartTypeSegmentedControl`) rather than introducing new ones.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**FLT-01 (Date-range filter):**
- Filter dimension: `BATCH_AGE_IN_MONTHS` — Snowflake has no date columns today.
- UX: Preset chips only in Phase 38 — "Last 3mo" (age ≤ 3), "Last 6mo" (age ≤ 6), "Last 12mo" (age ≤ 12), "All" (no filter). No custom calendar.
- Cascade: Full AND-combine with partner + account-type filters, upstream of aggregation per Phase 25 filter-before-aggregate contract.
- Saved-view migration: Views with legacy batch filters drop the filter on load and show a sonner toast ("Batch filter removed — re-save with date range"). No attempt to translate batch IDs → age buckets.
- Data note: When v4.5 Phase 41 adds a real date column, it must be `BATCH_PLACEMENT_DATE = MIN(ASSIGNMENT_DATE) per batch`, not origination-based.
- First-party DPD concern: Account-level DPD uses `ORIGINATION_DATE` on individual rows during drill-down — unaffected.

**CHT-04 (Laptop layout):**
- Mechanism: Capped max-heights. No resize handle, no auto-collapse.
- Breakpoint: `@media (max-height: 900px)` — desktop behavior unchanged.
- Ratios: Chart panel `max-height: 48vh` when expanded; table container `min-height: 320px` (~8 rows at dense density) and scrolls internally via existing TanStack Virtual. Sticky toolbar + KPI strip stay at natural height above.
- Default expanded state: Honor existing `charts-expanded` localStorage — no viewport-conditional force-collapse.
- Scroll: Table container scrolls; page stays put.

**KPI-02 delta copy:** Exactly `vs 3-batch rolling avg`. Applies to every delta label on KPI cards that use the rolling-avg baseline.

**KPI-04 suppression rule:** Rolling-avg delta for an Xmo rate card requires ≥3 prior batches that have reached X months of age. Applied uniformly across horizons (3mo, 6mo, 12mo). 'Since inception' card always shows the delta if any prior batch exists. When suppressed, card renders value only with no delta indicator — no "vs N/A", no misleading 0%.

**POL-01 (Branding):**
- Logo asset landed: `public/bounce-mark.svg` (currentColor, canonical for sidebar) + `public/bounce-mark-brand.svg` (brand-green `#03542C` fixed, for splash/marketing). Both 313×145 viewBox, ~2.16:1 aspect ratio.
- Mark form: Icon-mark only (arc symbol). Wider than the current "B" block — confirm header layout accommodates a ~20–24px-tall mark (target width ~48–52px) without clipping the app title. If layout is tight, reduce mark size; do NOT swap back to wordmark.
- Dark variant: Use `bounce-mark.svg` (currentColor) — let sidebar foreground token drive color. No separate dark file.
- Swap site: `src/components/layout/app-sidebar.tsx:65` — replace `<span className="text-title">B</span>` with either inline SVG (cleanest for currentColor) or `<img>` referencing `/bounce-mark.svg`. Inline is preferred so CSS color inherits; `next/image` doesn't propagate currentColor to SVG fills.

**POL-02 (Collapsed sidebar partners list):** Partners list pre-collapsed on first-ever load; user's expand/collapse choice thereafter persists in localStorage. Matches existing `charts-expanded` pattern.

### Claude's Discretion

- **POL-05 heatmap tooltip copy**: Planner writes a short explanatory string ("Colors cells by deviation from the partner's norm range" or similar).
- **POL-06 header truncation**: Native `title` attribute vs tooltip primitive; precise `max-width`. Planner picks.
- **FLT-02 filter help tooltips**: Copy for each of the three filters. Planner writes.
- **MBI-01 chart-type override**: UI pattern locked (mirrors Phase 36's `ChartBuilderToolbar` segmented control). Copy for the inference-reason helper text is planner's call.
- **CHT-01 "currently displayed" semantics**: "Currently displayed vintages" = the batches whose curves are visible after user's curve-selection and filter state. Planner confirms by reading the existing selection state in `collection-curve-chart.tsx`.

### Deferred Ideas (OUT OF SCOPE)

**To v4.5 Phase 41 (Data Correctness Audit):**
1. `BATCH_PLACEMENT_DATE` Snowflake view column (unblocks custom calendar on FLT-01).
2. Custom date-range calendar UI ("Custom" chip on the date-range filter).
3. Horizon-matched commitment rate (KPI-03 full UI moves to Phase 41).

**Phase 38 scope shrinks 18 → 17 items** because KPI-03 defers to v4.5 Phase 41. Update `v4.1-REQUIREMENTS.md` to mark KPI-03 as deferred when the Phase 38 plan lands.

**Out of scope for this phase (already belong elsewhere):**
- Per-product splitting (Happy Money 1st vs 3rd party blending) — Phase 39 owns it.
- Projected-curve overlays and "vs projected curve" KPI baseline — Phase 40 owns it.
- Resize handle between chart + table — not shipping in Phase 38.
- Metabase card JSON paste / URL import (MBI-02, MBI-03) — already deferred.

### Specific Follow-ups (locked for future)

- localStorage parity: POL-02 collapsed state uses the same pattern as `charts-expanded` (Phase 30-04 precedent). Key name follows same convention (`partners-list-collapsed` or similar).
- Schema-aware date filter defaults: Once v4.5 Phase 41 adds `BATCH_PLACEMENT_DATE`, the existing preset chips should continue to work unchanged — they gain a "Custom" option alongside. Don't rewrite presets; layer calendar on top.
- Phase 41 (v4.5 Data Correctness Audit) inherits three new work items from this discussion. Worth noting at the top of 41-CONTEXT.md when it's gathered.

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| POL-01 | Bounce logo replaces "B" letter-mark in sidebar header | `app-sidebar.tsx:64-66` — inline SVG swap. Both `public/bounce-mark.svg` (currentColor) and `bounce-mark-brand.svg` present. |
| POL-02 | Partners list collapsible + pre-collapsed on first load | New state mirroring `charts-expanded` pattern in `data-display.tsx:123-134`. Partners section at `app-sidebar.tsx:95-157`. |
| POL-03 | Column picker no longer locks identity columns | `IDENTITY_COLUMNS` in `src/lib/columns/config.ts:146-148`; identity-lock enforced in `column-group.tsx:10, 75` (disabled Checkbox) and `use-column-management.ts:64-65` (toggleColumn early return). Keep defaults but drop disabled gate. |
| POL-04 | `formatPercentage` uses 2 decimals when `\|v\| < 10`, 1 decimal when `\|v\| ≥ 10` | `src/lib/formatting/numbers.ts:42-55`. 4 call-sites: `kpi-summary-cards.tsx:21,27,33` (explicit `,1`), `table-footer.tsx:28` (default), `generic-chart.tsx:113` (explicit `,0`). Implicit callers via `getFormatter` in `definitions.ts`. |
| POL-05 | Heatmap toggle tooltip | `src/components/table/heatmap-toggle.tsx:18-31` — wrap `<Label>` or Switch in `Tooltip`/`TooltipTrigger`/`TooltipContent` from `src/components/ui/tooltip.tsx`. |
| POL-06 | Header truncation (ellipsis, max-width, stable row-height, full-on-hover) | `src/components/table/draggable-header.tsx:104` — `line-clamp-2 break-words leading-tight`. Replace with `truncate`-style ellipsis + `title={label}` OR Tooltip wrap. |
| CHT-01 | X-axis + avg-series clip to max-age of displayed vintages; no min-age gate | `collection-curve-chart.tsx:203-204` computes `maxAge` over ALL `sortedCurves`; avg-series built from ALL pivot rows in `pivot-curve-data.ts:74-83, 100-123`. Fix: compute `maxAge` over `visibleBatchKeys`, rebuild pivot/avg over visible subset only. Min-age gate: data-display.tsx:924 already gates `partnerStats.curves.length >= 2` — CHT-01 lock says "render ASAP" so likely drop the `>= 2` guard (planner confirms intent). |
| CHT-02 | Avg line in proximity hover tooltip | `collection-curve-chart.tsx:134-180` computes closest line among `visibleBatchKeys` only. Add `__avg__` entry when `showAverage` true so cursor can land on it. `CurveTooltip` (`curve-tooltip.tsx`) already handles `__avg__` display. |
| CHT-03 | Curve legend scrolls | `curve-legend.tsx:33` — already has `thin-scrollbar overflow-y-auto` but no `max-h`. Add `max-h-[calc(100vh-Xpx)]` or `max-h-[40vh]` so "show all" stays in-viewport. |
| CHT-04 | Laptop (≤900px) chart/table layout | See user_constraints above. Files: `data-display.tsx:902-952` (chart grid wrapper), `data-display.tsx:973` (table container). Add `@media (max-height: 900px)` block(s) to `globals.css` or use Tailwind arbitrary variants. |
| KPI-01 | Graduated cascade based on cohort max batch age | `src/components/kpi/kpi-summary-cards.tsx:15-37` hardcodes 6-card grid; `src/lib/computation/compute-kpis.ts` returns fixed `{ collectionRate6mo, collectionRate12mo, ... }`. Redesign: compute `maxBatchAge` in KpiAggregates, derive cascade tier, render 1–2 cards per tier + identity cards. |
| KPI-02 | Delta labels explicitly "vs 3-batch rolling avg" | `StatCard.trend` rendering (`src/components/patterns/stat-card.tsx`) — TrendLine sub-component. Text location is the existing trend explanatory phrase. |
| KPI-03 | Matching-horizon commitment rate secondary line | **DEFERRED to Phase 41** per CONTEXT.md. Requires new Snowflake column. Remove from Phase 38 scope when plan lands. |
| KPI-04 | Suppress rolling-avg delta when cohort too young | `src/lib/computation/compute-trending.ts:27-29, 45-47` already returns `insufficientHistory: true` for < 3 batches. Per-horizon suppression (3mo card needs ≥3 batches that reached 3mo; 6mo card needs ≥3 that reached 6mo) is new logic — add to `computeTrending` or in the card branching. |
| FLT-01 | Batch filter replaced with age-bucket preset chips | Files: `use-filter-state.ts:11-15` (FILTER_PARAMS — drop `batch`, add new age field), `data-display.tsx:329-354` (batch-options derivation), `toolbar/filter-popover.tsx` (batch combobox), and `filter-bar.tsx` (unused component — `data-display.tsx` already uses `filter-popover.tsx` directly). Saved-view migration in `use-saved-views.ts:32-67` (`sanitizeSnapshot`). Sonner toast via existing `toast()` import. |
| FLT-02 | Inline help tooltips on each filter | `toolbar/filter-popover.tsx:97-128` — 3 `<label>` blocks gain Tooltip primitive or native `title`. |
| FLT-03 | PARTNER_NAME column auto-hides when sidebar-scoped to a single partner | `data-display.tsx` — Active partner-list scope lives in `useActivePartnerList()` (`src/contexts/active-partner-list.tsx` via sidebar's `activeListId`). Single-partner check: when `activeList?.partnerIds.length === 1` OR when URL filter `?partner=X` pins to one value OR drill is partner-level, thread a `hidePartnerColumn` override into `columnVisibility`. Plan must disambiguate which "sidebar scoped" semantics apply. |
| MBI-01 | Import Preview chart-type override | `preview-step.tsx:190-207` Chart section is the swap site. Reuse `ChartTypeSegmentedControl` from `src/components/charts/chart-type-segmented-control.tsx` (supports line / scatter / bar + collection-curve — filter to line/scatter/bar/none for import). X/Y pickers can reuse `AxisPicker` from `src/components/charts/axis-picker.tsx`. Inference reason source: `result.inferredChart.skipped[].reason` + derivation from `inferChart` rules in `chart-inference.ts:86-107`. |

</phase_requirements>

## Standard Stack

### Core (already in use — do not introduce alternatives)
| Library | Version | Purpose | Where It's Used |
|---------|---------|---------|-----------------|
| React | 19 | UI | everywhere |
| Next.js | 16.2.x | App framework | App Router |
| Tailwind CSS | v4 | Styling | `src/app/globals.css` |
| @base-ui/react | — | Tooltip, Popover, Sheet primitives | `src/components/ui/*` |
| shadcn/ui (local copies) | — | Button, Switch, Label, Sidebar, Sheet composed on base-ui | `src/components/ui/*` |
| TanStack Table | 8 | Column picker, table state, column visibility | `src/components/table/**`, `src/hooks/use-column-management.ts` |
| TanStack Virtual | — | Table row virtualization (CHT-04 dependency) | existing in `data-table.tsx` |
| Recharts | — | LineChart / scatter / bar primitives | `src/components/charts/**` |
| Sonner | — | Toast notifications | `toast()` called from `data-display.tsx` |
| zod | — | Saved-view schema validation | `src/lib/views/schema.ts` |

### Supporting (pattern precedents — mirror, don't reinvent)
| Pattern | Source | When to Use |
|---------|--------|-------------|
| `charts-expanded` localStorage | `data-display.tsx:123-134` | POL-02 `partners-list-collapsed` |
| `sanitizeSnapshot` + additive-optional zod fields | `use-saved-views.ts:32-67`, `lib/views/types.ts:70,82,87` | FLT-01 legacy batch-filter migration |
| Sonner toast on load with `action: { label: 'Undo' }` | `data-display.tsx:570-619` | FLT-01 "Batch filter removed" toast |
| Tooltip primitive (base-ui) | `src/components/ui/tooltip.tsx` | POL-05, POL-06, FLT-02 |
| Segmented control (4-item, icon-only, pressed state) | `src/components/charts/chart-type-segmented-control.tsx` | MBI-01 chart-type override |
| `AxisPicker` with eligibility-gated columns | `src/components/charts/axis-picker.tsx` | MBI-01 X/Y pickers |
| `@media (max-height: X)` in globals.css | NOT currently used — this phase introduces it | CHT-04 |

### Alternatives Considered (reject)
| Instead of | Reject | Why |
|------------|--------|-----|
| `next/image` for POL-01 mark | Inline SVG | `<Image>` cannot propagate `currentColor` to inner SVG `fill` — dark mode adaptation would require a second file. CONTEXT-locked. |
| Headless UI / Radix Collapsible for POL-02 | Boolean state + CSS | Shadcn Sidebar is already grid-based with `data-state` attributes; a hand-rolled `useState<boolean>` + `max-h-0 ↔ max-h-fit` or `grid-rows-[0fr] ↔ [1fr]` matches `data-display.tsx:902-907` chart-expand precedent. |
| Building a Calendar primitive for FLT-01 | Preset chips only | CONTEXT lock: "No custom calendar in Phase 38." |
| Adding `BATCH_PLACEMENT_DATE` Snowflake column | `BATCH_AGE_IN_MONTHS` with legacy-coercion | CONTEXT lock: real date column deferred to Phase 41. |

**Installation:**
No new packages required. Every requirement uses libraries already in the tree.

## Architecture Patterns

### Project Structure (relevant slices)
```
src/
├── components/
│   ├── layout/
│   │   └── app-sidebar.tsx          # POL-01 swap site; POL-02 collapse lives here
│   ├── charts/
│   │   ├── collection-curve-chart.tsx  # CHT-01, CHT-02 edits
│   │   ├── curve-legend.tsx            # CHT-03 max-h
│   │   ├── curve-tooltip.tsx           # already handles __avg__
│   │   ├── pivot-curve-data.ts         # CHT-01 avg-series scoping
│   │   ├── chart-panel.tsx             # no edits expected
│   │   ├── chart-type-segmented-control.tsx  # reuse for MBI-01
│   │   ├── chart-builder-toolbar.tsx   # pattern reference for MBI-01
│   │   └── axis-picker.tsx             # reuse for MBI-01
│   ├── columns/
│   │   ├── column-picker-sidebar.tsx   # POL-03 (lock removal propagates here via use-column-management)
│   │   └── column-group.tsx            # POL-03 disabled-Checkbox gate
│   ├── filters/                        # filter-bar.tsx unused by data-display.tsx
│   ├── kpi/
│   │   └── kpi-summary-cards.tsx       # KPI-01, KPI-02, KPI-04
│   ├── metabase-import/
│   │   ├── preview-step.tsx            # MBI-01 Chart section swap
│   │   └── import-sheet.tsx            # no edits
│   ├── patterns/
│   │   └── stat-card.tsx               # KPI-02 trend text (TrendLine sub-component)
│   ├── table/
│   │   ├── draggable-header.tsx        # POL-06
│   │   ├── heatmap-toggle.tsx          # POL-05
│   │   └── data-table.tsx              # CHT-04 table container
│   ├── toolbar/
│   │   └── filter-popover.tsx          # FLT-01, FLT-02
│   └── data-display.tsx                # Central orchestrator — CHT-04, FLT-03 touch here
├── hooks/
│   ├── use-column-management.ts        # POL-03 toggleColumn lock
│   ├── use-filter-state.ts             # FLT-01 URL params (drop `batch`, add age)
│   └── use-saved-views.ts              # FLT-01 saved-view migration
├── lib/
│   ├── columns/
│   │   ├── config.ts                   # IDENTITY_COLUMNS lives here; BATCH_AGE_IN_MONTHS defined
│   │   └── definitions.ts              # column renderer incl. PARTNER_NAME drill cell
│   ├── computation/
│   │   ├── compute-kpis.ts             # KPI-01 aggregates redesign
│   │   ├── compute-trending.ts         # KPI-04 suppression logic
│   │   └── reshape-curves.ts           # age-coercion precedent (>365 days)
│   ├── formatting/numbers.ts           # POL-04 formatPercentage
│   ├── metabase-import/
│   │   └── chart-inference.ts          # MBI-01 helper-text source
│   └── views/
│       ├── schema.ts                   # FLT-01 additive schema field if needed
│       └── types.ts                    # ViewSnapshot; sourceQuery evolution precedent
└── app/
    └── globals.css                     # CHT-04 @media (max-height: 900px) lives here
```

### Pattern 1: localStorage-backed boolean with first-load default
**What:** Persist user's expand/collapse choice; on first visit, pre-collapse.
**When to use:** POL-02.
**Example (adapt from `data-display.tsx:123-134`):**
```tsx
// Source: src/components/data-display.tsx:123
const [chartsExpanded, setChartsExpanded] = useState(() => {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem('charts-expanded') !== 'false';
});
const toggleCharts = useCallback(() => {
  setChartsExpanded((prev) => {
    const next = !prev;
    localStorage.setItem('charts-expanded', String(next));
    return next;
  });
}, []);
```

**For POL-02 the default flips** (pre-collapsed on first load). Adapt by inverting the sentinel:
```tsx
// First-ever visit: localStorage.getItem(...) === null → default to COLLAPSED
// Subsequent visits: respect the persisted choice.
const [partnersExpanded, setPartnersExpanded] = useState(() => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('partners-list-collapsed') === 'false';
});
```
Key name must be a NEW key (not reuse `charts-expanded`).

### Pattern 2: Sonner toast on load with migration notice
**What:** When a saved view loads with legacy data that cannot be translated, strip the field and show a toast.
**When to use:** FLT-01 legacy batch filter migration.
**Example (precedent — `data-display.tsx:570-619` already calls `toast()` with action):**
```tsx
toast('Batch filter removed', {
  description: 'Re-save this view with a date range to restore filtering',
  duration: 5000,
});
```
The migration itself belongs in `sanitizeSnapshot` (use-saved-views.ts) — strip `snapshot.dimensionFilters.batch` or the `columnFilters['BATCH']` key. Emit the toast from the caller (handleLoadView) because sanitize runs both at hydration AND load — no toast on hydration.

### Pattern 3: Tooltip wrap (base-ui)
**What:** Add explanatory hover tooltips.
**When to use:** POL-05, POL-06 (if not going native `title`), FLT-02.
**Example:**
```tsx
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

<Tooltip>
  <TooltipTrigger render={<span />}>
    {/* actual element */}
  </TooltipTrigger>
  <TooltipContent>Colors cells by deviation from the partner's norm range</TooltipContent>
</Tooltip>
```
Wrap a global `<TooltipProvider>` only once per tree; it's likely already in `providers.tsx` or a layout component (confirmed by use in `filter-popover.tsx:51-80`).

### Pattern 4: additive-optional zod field for ViewSnapshot evolution
**What:** Extend `ViewSnapshot` without breaking legacy saved views.
**When to use:** FLT-01 if the age-bucket filter persists into saved views as a new slot.
**Precedent:** `drill?` (NAV-04), `listId?` (Phase 34), `sourceQuery?` (Phase 37). Three prior precedents — this is the canonical additive path.
```tsx
// lib/views/types.ts — example new field
batchAgeFilter?: 3 | 6 | 12 | null;  // null = All
```
Sanitize in `sanitizeSnapshot`, migrate legacy `dimensionFilters.batch` → drop field + toast.

### Pattern 5: Chart-type segmented control + axis pickers (MBI-01)
**What:** Mirror `ChartBuilderToolbar` pattern in the Preview Chart section.
**When to use:** MBI-01.
**Precedent:** `src/components/charts/chart-builder-toolbar.tsx:78-114`.
**Adaptation:** Drop the `collection-curve` segment (Import doesn't produce preset curves) OR add a `none` segment. Pre-select based on `result.inferredChart.chartType`. Render X/Y `AxisPicker`s beneath, pre-filled from `result.inferredChart.x/y`. Emit helper text like "Inferred from GROUP BY + AVG aggregate" derived from the three `inferChart` rules in `chart-inference.ts:86-107` (hasGroupBy → bar, date+numeric → line, 2+ numeric → scatter) or from `result.inferredChart.skipped[].reason`.

### Anti-Patterns to Avoid
- **Do NOT** hand-roll a new `<Tooltip>` shell — use `src/components/ui/tooltip.tsx`.
- **Do NOT** introduce Tailwind's default `text-xs/sm/base/lg/xl/2xl` in `src/` outside the allowlist (`src/components/ui/**`, `src/app/tokens/**`, `src/components/tokens/**`). Use the 6 named type tokens (see CLAUDE.md/AGENTS.md).
- **Do NOT** pair `font-semibold/font-medium/font-bold` with a type token — tokens own weight.
- **Do NOT** reuse the `charts-expanded` key for POL-02. A dedicated key keeps them independent.
- **Do NOT** reshape `IDENTITY_COLUMNS` itself for POL-03 — they must remain identity for `isIdentity: true` consumers (presets, widths). Only remove the *lock* in the picker UI + toggleColumn guard.
- **Do NOT** attempt to translate legacy `batch` filter values to age buckets on saved-view load — CONTEXT-locked as lossy.
- **Do NOT** gate chart render on `curves.length >= 2` (CHT-01 says "render ASAP"). Current gate lives in `data-display.tsx:924`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Chart-type segmented control for MBI-01 | Custom button row | `ChartTypeSegmentedControl` | Already built, a11y-correct (`role=group`, `aria-pressed`), handles the same 4 types. |
| Axis pickers for MBI-01 | Custom `<select>` | `AxisPicker` + `isColumnEligible` | Already handles stale-column warnings, numeric/text gating per chart type. |
| Tooltips for POL-05/FLT-02 | `<div>` absolute overlay | Base-ui `Tooltip` primitive | Portal, keyboard, screen reader support. |
| Sidebar collapse/expand for POL-02 | New Collapsible primitive | Boolean state + CSS grid-rows transition | `data-display.tsx:902-907` establishes the grid-rows pattern at the framework level. |
| Saved-view migration for FLT-01 | Manual localStorage JSON.parse | `sanitizeSnapshot` in `use-saved-views.ts` | Single source of truth; zod schema evolution pattern already proven 3x. |
| Header truncation for POL-06 | Custom `text-overflow` CSS | Tailwind `truncate` + native `title` OR Tooltip | `truncate` is a single class that does `overflow-hidden text-ellipsis whitespace-nowrap` in one shot. |

**Key insight:** This codebase has mature patterns for every idiom Phase 38 touches. Research did NOT find any gaps that demand new primitives. Every deliverable is a localized edit.

## Common Pitfalls

### Pitfall 1: `BATCH_AGE_IN_MONTHS` legacy-days encoding
**What goes wrong:** Filtering rows by `age <= 3` matches 0 rows in static cache mode.
**Why it happens:** `reshape-curves.ts:23` coerces values > 365 from days to months; raw Snowflake returns months, but static cache (`src/lib/static-cache/`) may hold pre-coercion days.
**How to avoid:** Apply the same coercion in the FLT-01 filter predicate:
```tsx
const rawAge = Number(row.BATCH_AGE_IN_MONTHS) || 0;
const ageInMonths = rawAge > 365 ? Math.floor(rawAge / 30) : rawAge;
```
Or (cleaner) extract the coercion into a helper in `src/lib/utils.ts` and use it in both `reshape-curves.ts` and the new filter.
**Warning signs:** Preset chip "Last 3mo" selects nothing; "All" shows unexpected count deltas from vintage counts.

### Pitfall 2: CHT-01 avg-series vs. pivot-data scope
**What goes wrong:** Avg line extends past the x-axis domain even after clipping the ticks.
**Why it happens:** `pivotCurveData` iterates ALL `sortedCurves` (`pivot-curve-data.ts:45-86`); `addAverageSeries` averages across ALL pivot rows. If a HIDDEN older batch has points at month 36, those months appear in `sortedMonths` and the avg line gets values there even though no visible batch has data. The chart's `domain={[1, maxAge]}` clips rendering but the line mathematically exists.
**How to avoid:** Compute `maxAge` over `visibleBatchKeys` only AND pass only visible curves to `pivotCurveData`, OR filter `pivotedData` by `month <= maxAge` after building. Also gate `addAverageSeries` to only compute avg from visible batch keys.
**Warning signs:** Phantom avg line extends to month 36 when user has only March batches selected.

### Pitfall 3: KPI-01 cascade — not just a grid redesign
**What goes wrong:** Planner templates `CARD_SPECS` with conditional render and loses trend wiring; `computeKpis` still returns fixed 6mo/12mo even when cohort is 3-month-max.
**Why it happens:** `computeKpis` hardcodes `sumCollection6 / totalPlaced` (6-month horizon); `KpiSummaryCards` has a dedicated `collectionRate12mo === 0` special case (`kpi-summary-cards.tsx:103-120`). The cascade design requires new aggregates (3mo rate, "rate since inception") AND new max-batch-age calculation.
**How to avoid:** Extend `KpiAggregates` with `maxBatchAgeMonths`, `collectionRate3mo`, `collectionRateSinceInception`; extend `CARD_SPECS` to include those. Render sub-selection by tier in `KpiSummaryCards`.
**Warning signs:** Partner with only 3mo batches still sees "6mo Rate" card rendering 0%.

### Pitfall 4: KPI-04 suppression differs per horizon
**What goes wrong:** `compute-trending.ts:27-29` currently suppresses when `rows.length < 3` (any cohort). KPI-04 requires suppression when fewer than 3 prior batches have REACHED the card's horizon (e.g. 3mo card needs ≥3 batches with age ≥ 3mo).
**Why it happens:** Current `insufficientHistory` is a single boolean across all metrics.
**How to avoid:** Either return per-metric suppression flags, or suppress at render time in `KpiSummaryCards` using the curve data (`partnerStats.curves`) to count how many batches have `ageInMonths >= horizon`. The latter is lighter because `partnerStats.curves` is already on hand.
**Warning signs:** 3mo card shows a delta when partner has 2 batches that reached 3 months.

### Pitfall 5: FLT-03 "sidebar scoped to single partner" — disambiguation
**What goes wrong:** Three candidate meanings; planner picks wrong one:
1. URL filter `?partner=X` pins to one value.
2. Active partner list (LIST-03) has `partnerIds.length === 1`.
3. Drill state is `partner` level (drillState.partner !== null).

**Why it happens:** All three are "sidebar-scoped" in plain English.
**How to avoid:** Re-read CONTEXT — the wording is "sidebar is scoped to a single partner". Case 2 (active partner list of size 1) is the CONTEXT-intended interpretation (the sidebar row-set IS the partner list). Plan MUST disambiguate. Case 3 already hides PARTNER_NAME via column visibility? No — `definitions.ts` always emits the column; visibility is driven by `columnVisibility` state in `use-column-management.ts`. Thread a `hidePartnerColumn` override into the initial visibility merge, driven by `activeList?.partnerIds.length === 1` (and optionally case 3).
**Warning signs:** User filters `?partner=X` but PARTNER_NAME column still visible — or user activates a 1-partner list and column DOES hide (that's the win).

### Pitfall 6: Type-token discipline (CLAUDE.md/AGENTS.md)
**What goes wrong:** New helper text uses `text-xs` — `check:tokens` guard (see STATE.md Phase 27-06) fails CI.
**Why it happens:** Tailwind's default scale is the muscle memory; token scale requires explicit tokens.
**How to avoid:** Stick to `text-display`, `text-heading`, `text-title`, `text-body`, `text-label`, `text-caption` (and `-numeric` variants for digits). Do not pair with `font-*` weight utilities. Scripts live at `scripts/check-type-tokens.sh` (Phase 27-06).
**Warning signs:** CI fails on the PR; local `npm run check:tokens` echoes an offending line.

### Pitfall 7: PARTNER_NAME cell is drillable — don't break drill when hiding
**What goes wrong:** FLT-03 hides PARTNER_NAME column but drill-to-partner logic keyed off clicking the partner cell.
**Why it happens:** `definitions.ts:54-62` and `root-columns.ts:51-58` both render PARTNER_NAME as `DrillableCell` at root. At partner drill level, the column may be redundantly rendered (if the planner misreads).
**How to avoid:** At partner drill-level the root summary table isn't in play (only batch table renders per-partner-level rows); hiding the column in visibility state is safe because other drill entry-points (sidebar click, URL `?p=X`) remain. Confirm root-level auto-hide only fires when sidebar list is partner-scoped AND drillLevel === 'root'.
**Warning signs:** User can't drill back into a partner from any table surface.

### Pitfall 8: CHT-04 `@media (max-height)` conflict with grid-rows animation
**What goes wrong:** `data-display.tsx:902-907` uses `grid-rows-[0fr] ↔ [1fr]` for chart expand/collapse. Adding `max-height: 48vh` on the child could trigger overflow inside the `overflow-hidden` wrapper at line 910, clipping the chart before it fills.
**Why it happens:** `grid-rows-[1fr]` lets the content determine height; a child with `max-height` caps height BELOW 1fr — grid tries to fill the slot while child refuses.
**How to avoid:** Apply the `max-height: 48vh` media query to `.overflow-hidden > .shrink-0` (the chart's inner container) at `data-display.tsx:910-911`, not to the grid row. Combine with `min-height: 320px` on the table's `min-h-0 flex-1` wrapper (`data-display.tsx:973`). Verify in browser at ≤900px viewport.
**Warning signs:** Chart is visually clipped mid-expand; table appears too short or overlaps.

### Pitfall 9: POL-03 — identity flag has DOUBLE duty
**What goes wrong:** Planner removes `identity: true` from `PARTNER_NAME` in config to drop the lock — breaks preset builders, width calculation, and cell drill-down.
**Why it happens:** `ColumnConfig.identity` drives (a) the lock (remove this), (b) default visibility in presets (`presets.ts:17`), (c) column widths (`IDENTITY_WIDTH` in `definitions.ts:95`), (d) filter enable (`enableColumnFilter: !config.identity`).
**How to avoid:** Keep `identity: true` on config records. Remove the lock at two sites only: `use-column-management.ts:64-65` (toggleColumn early return) and `column-group.tsx:73-79` (Checkbox disabled prop + draggable gate). Checkbox still checked-by-default via getDefaultVisibility.
**Warning signs:** Presets break; column widths change unexpectedly; identity filter toggles now appear.

## Code Examples

### Example A — POL-04 formatPercentage redesign
**Current `src/lib/formatting/numbers.ts:42-55`:**
```tsx
export function formatPercentage(value: number, decimals: number = 1): string {
  const v = toNum(value) * 100;
  const threshold = Math.pow(10, -decimals);
  if (v > 0 && v < threshold) return `<${threshold.toFixed(decimals)}%`;
  if (v < 0 && v > -threshold) return `>-${threshold.toFixed(decimals)}%`;
  return `${v.toFixed(decimals)}%`;
}
```

**Proposed (POL-04 rule baked in, `decimals` parameter becomes an override):**
```tsx
export function formatPercentage(value: number, decimals?: number): string {
  const v = toNum(value) * 100;
  const effectiveDecimals =
    decimals ?? (Math.abs(v) < 10 ? 2 : 1);
  const threshold = Math.pow(10, -effectiveDecimals);
  if (v > 0 && v < threshold) return `<${threshold.toFixed(effectiveDecimals)}%`;
  if (v < 0 && v > -threshold) return `>-${threshold.toFixed(effectiveDecimals)}%`;
  return `${v.toFixed(effectiveDecimals)}%`;
}
```
Call-site impact: `kpi-summary-cards.tsx:21,27,33` can drop `, 1` explicit arg (rule now baked in). `generic-chart.tsx:113` explicitly passes `0` — keep as override. `table-footer.tsx:28` uses the default — picks up new rule automatically.

### Example B — POL-05 heatmap tooltip
```tsx
// src/components/table/heatmap-toggle.tsx
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

return (
  <Tooltip>
    <TooltipTrigger render={
      <div className="flex items-center gap-1.5">
        <Switch id="heatmap-toggle" ... />
        <Label htmlFor="heatmap-toggle" className="cursor-pointer text-caption">
          Heatmap
        </Label>
      </div>
    } />
    <TooltipContent>
      Colors cells by how far each value deviates from the partner's norm
    </TooltipContent>
  </Tooltip>
);
```

### Example C — CHT-01 avg-series + x-axis clip (visible-scope)
```tsx
// collection-curve-chart.tsx
const visibleCurves = useMemo(
  () => sortedCurves.filter((_, i) => visibleBatchKeys.includes(`batch_${i}`)),
  [sortedCurves, visibleBatchKeys],
);

const maxAge = Math.max(
  ...visibleCurves.map((c) => c.ageInMonths),
  1,
);
const collectionMonthsTicks = COLLECTION_MONTHS.filter((m) => m <= maxAge);

// Pivot and avg-series both see only visible curves:
const { data: pivotedRaw, keyMap } = useMemo(
  () => pivotCurveData(visibleCurves, metric),
  [visibleCurves, metric],
);
// ...and clip to maxAge
const pivotedData = useMemo(
  () => {
    const withAvg = showAverage ? addAverageSeries(pivotedRaw, visibleCurves) : pivotedRaw;
    return withAvg.filter((p) => p.month <= maxAge);
  },
  [pivotedRaw, showAverage, visibleCurves, maxAge],
);
```
**Caution:** `visibleBatchKeys` are positional (batch_0, batch_1) keyed to the full `sortedCurves` array. If we shrink the curves passed to `pivotCurveData`, keys get reassigned — hidden batches disappear from the pivoted output, which IS what we want for avg computation, but `CurveTooltip` / `hoveredLineKey` logic in the same file may still reference pre-shrink keys. Re-verify the hoveredLineKey flow when rebasing.

### Example D — CHT-02 avg in proximity hover
```tsx
// collection-curve-chart.tsx handleChartMouseMove
const keysForProximity = showAverage
  ? [...visibleBatchKeys, '__avg__']
  : visibleBatchKeys;

const entries = keysForProximity
  .map((key) => ({ key, value: dataPoint[key] as number | undefined }))
  .filter((e): e is { key: string; value: number } => e.value != null);
```
`CurveTooltip` (`curve-tooltip.tsx:69-73`) already prints "Partner Average" when `entryKey === '__avg__'` — no tooltip edits required.

### Example E — FLT-01 age-bucket filter in data-display filteredRawData
```tsx
// Age helper (shared with reshape-curves.ts)
function coerceAgeMonths(raw: unknown): number {
  const n = Number(raw) || 0;
  return n > 365 ? Math.floor(n / 30) : n;
}

// In filteredRawData memo, AFTER dimension filters and BEFORE active list:
const ageBucket = searchParams.get('age'); // '3' | '6' | '12' | null
if (ageBucket) {
  const cap = Number(ageBucket);
  out = out.filter((row) => coerceAgeMonths(row.BATCH_AGE_IN_MONTHS) <= cap);
}
```
`use-filter-state.ts:11-15` FILTER_PARAMS: drop `batch`, add `age`. Planner decides whether `age` is a FILTER_PARAM (column-backed) or a standalone URL param (more likely — it's a value-range, not a single-value equality).

### Example F — MBI-01 Chart override in preview-step
```tsx
// preview-step.tsx — replace lines 190-207 Chart section
<PreviewSection title="Chart" ...>
  <div className="flex items-center gap-inline px-2 py-1">
    <ChartTypeSegmentedControl
      // Filter to line/scatter/bar only (no collection-curve in Import)
      activeType={overrideType ?? result.inferredChart.chartType ?? 'line'}
      onTypeClick={setOverrideType}
    />
    <span className="text-caption text-muted-foreground">
      {result.inferredChart.chartType
        ? `Inferred from ${inferenceReason(result)}`
        : 'No chart inferred'}
    </span>
  </div>
  {overrideType !== 'none' && (
    <>
      <AxisPicker chartType={overrideType} axis="x" value={overrideX} onChange={setOverrideX} placeholder="Pick column" />
      <AxisPicker chartType={overrideType} axis="y" value={overrideY} onChange={setOverrideY} placeholder="Pick column" />
    </>
  )}
</PreviewSection>
```
State lives in `ImportSheet` (elevated above PreviewStep) so `onApply` can merge overrides into the ParseResult before calling `onImportSql`. Handler in `import-sheet.tsx:76-80` gains override merge.

## State of the Art

| Old Approach | Current Approach | When Changed |
|--------------|------------------|--------------|
| Raw `Tailwind text-xs/sm` | 6 named type tokens (text-body/caption/label/title/heading/display) | Phase 27 |
| `font-medium` + token pairing | Token owns weight (bake 500 into `.text-label`, etc.) | Phase 27-06 |
| Legacy batch filter | Age-bucket preset chips (Phase 38) → custom calendar (Phase 41) | This phase |
| `KpiCard` | `StatCard` (Phase 29-01) | Already migrated; Phase 38 only edits content |
| Hand-rolled Tailwind arbitrary class for motion duration | `duration-quick/normal/slow` semantic tokens | Phase 30-01 |
| `recoveryRate` hardcoded formatter `${v.toFixed(1)}%` in `curve-tooltip.tsx:34-36` | Candidate for `formatPercentage(v / 100)` call — aligns with POL-04 | This phase (opt-in) |

**Deprecated/outdated:**
- `src/components/filters/filter-bar.tsx` — no longer consumed by `data-display.tsx`. The active filter UI is `src/components/toolbar/filter-popover.tsx`. Planner may delete `filter-bar.tsx` + `filter-combobox.tsx` callers if dead code confirmed — grep shows `filter-bar` is only self-referenced and from planning docs. This is an opportunistic cleanup, not required for Phase 38.

## Open Questions

1. **POL-06 choice: native `title` vs Tooltip primitive**
   - What we know: both render "full label on hover"; native `title` is free (0 deps, 0 JS) but no custom styling; Tooltip gives design-system consistency but adds mount cost per header cell.
   - What's unclear: whether dragging-handler + Tooltip coexist cleanly (Tooltip open may block drag pointer events).
   - Recommendation: Native `title={flexRender-result-as-string}` for v1 — add Tooltip only if pilot feedback asks for it. Headers re-render on every drill-change/filter-change; cheaper to skip the extra mount.

2. **FLT-03 scope — which "sidebar scoped" interpretation?**
   - What we know: Three candidates (URL filter, active-list of 1, drill-level partner).
   - What's unclear: CONTEXT uses "sidebar is scoped" — slightly ambiguous.
   - Recommendation: Clarify in plan-check. Most likely interpretation: active partner list `partnerIds.length === 1`. (The sidebar list IS the scope.)

3. **KPI-04 suppression semantics — 3 prior batches at horizon OR current cohort size?**
   - What we know: CONTEXT says "≥3 prior batches that have reached X months of age".
   - What's unclear: "Prior" excludes the latest? Or just means all batches ≥ X months old?
   - Recommendation: Prior = all batches other than the latest that have reached X months (matches "prior" wording in compute-trending.ts:40).

4. **CHT-01 min-age gate removal — keep the `partnerStats.curves.length >= 2` guard?**
   - What we know: `data-display.tsx:924` gates ChartPanel on `curves.length >= 2`. CONTEXT-lock says "render ASAP with whatever data exists (no minimum-age gate)".
   - What's unclear: Is "2 curves" the min-age gate, or is there a separate early-data gate somewhere in computation?
   - Recommendation: Drop the `>= 2` gate (render even with 1 curve). Confirm no other early-data gate exists by grepping for `curves.length`, `ageInMonths < ` in chart files.

5. **FLT-01 persistence shape — new `ViewSnapshot` field or overload existing `dimensionFilters`?**
   - What we know: `dimensionFilters: Record<string, string>` is the canonical URL-to-column map. An age bucket is NOT a column filter — it's a row-predicate on `BATCH_AGE_IN_MONTHS <=`.
   - What's unclear: Overload `dimensionFilters['age'] = '3'` (stringly-typed) or add dedicated `batchAgeFilter?: 3|6|12|null`.
   - Recommendation: Dedicated additive-optional field (Pattern 4) — matches drill/listId/sourceQuery precedent and is type-safe.

6. **POL-02 collapse visual — match shadcn Sidebar's `data-state` grid pattern?**
   - What we know: Shadcn Sidebar uses grid-template-rows transition (see Phase 30-04 DS-24). Partners section is inside `SidebarGroupContent` — the Menu is `<SidebarMenu>`.
   - What's unclear: Whether SidebarGroupContent supports a collapsible state out of the box.
   - Recommendation: Hand-roll with a boolean + `grid-rows-[0fr]/[1fr]` wrapping the partner `<SidebarMenu>` portion (NOT the group label). Chevron icon on SidebarGroupLabel click, similar to `column-group.tsx:156-169`.

## Validation Architecture

> `.planning/config.json` has no `workflow.nyquist_validation` field (not set). Workflow shows `research/plan_check/verifier/auto_advance: true`. Nyquist section included as optional scaffolding — remove if planner confirms not in use.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Node `--experimental-strip-types` + `node:assert/strict` (project precedent Phase 35-01) |
| Config file | `tsconfig.json` — `allowImportingTsExtensions: true` (Phase 35-01) |
| Quick run command | `node --experimental-strip-types src/lib/<module>.smoke.ts` |
| Full suite command | No consolidated runner — each `.smoke.ts` runs standalone. Planner may add a simple `npm run smoke` that globs `src/**/*.smoke.ts`. |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| POL-01 | Sidebar renders SVG mark, not "B" | smoke (render-count not meaningful) | manual — visual verify | Wave 0 manual |
| POL-02 | Partner list collapsed on first load; persisted thereafter | smoke unit for localStorage logic + manual visual | `node --experimental-strip-types src/hooks/use-partners-collapsed.smoke.ts` | Wave 0 new smoke + manual |
| POL-03 | toggleColumn no longer early-returns on identity | unit | `node --experimental-strip-types src/hooks/use-column-management.smoke.ts` | Wave 0 new smoke |
| POL-04 | `formatPercentage(0.0972)` === `"9.72%"`; `formatPercentage(0.103)` === `"10.3%"` | unit | `node --experimental-strip-types src/lib/formatting/numbers.smoke.ts` | Wave 0 new smoke |
| POL-05 | Tooltip appears on hover | manual | — | manual-only |
| POL-06 | Headers truncate; full on hover | manual | — | manual-only |
| CHT-01 | X-axis domain = max visible age | smoke (maxAge derivation) + manual | `node --experimental-strip-types src/components/charts/visible-curves.smoke.ts` | Wave 0 new smoke + manual |
| CHT-02 | Avg line in proximity hover | manual | — | manual-only |
| CHT-03 | Legend scrolls | manual | — | manual-only |
| CHT-04 | Chart + table usable at ≤900px height | manual | — | manual-only |
| KPI-01 | Cascade selects correct cards per max batch age | unit | `node --experimental-strip-types src/lib/computation/cascade.smoke.ts` | Wave 0 new smoke |
| KPI-02 | Delta label text === "vs 3-batch rolling avg" | smoke (string check) + manual | assert by grep on stat-card.tsx | Wave 0 |
| KPI-03 | DEFERRED | — | — | N/A |
| KPI-04 | Suppress delta when < 3 prior batches at horizon | unit | `node --experimental-strip-types src/lib/computation/suppression.smoke.ts` | Wave 0 new smoke |
| FLT-01 | Age-bucket filter applies correctly | unit | `node --experimental-strip-types src/hooks/use-filter-state.smoke.ts` | Wave 0 new smoke |
| FLT-01 migration | Legacy batch filter stripped + toast emitted | unit + manual | `node --experimental-strip-types src/hooks/use-saved-views.smoke.ts` | Wave 0 new smoke + manual |
| FLT-02 | Tooltip renders for each filter | manual | — | manual-only |
| FLT-03 | PARTNER_NAME column auto-hides when active-list has 1 partner | manual | — | manual-only |
| MBI-01 | Override control shows + emits correct definition | manual + unit for the merge helper | `node --experimental-strip-types src/lib/metabase-import/override.smoke.ts` | Wave 0 new smoke + manual |

### Sampling Rate
- **Per task commit:** `npm run build && npm run check:tokens && npm run check:motion && <new smoke for this task>` (build ensures no type regressions).
- **Per wave merge:** all smoke files + `check:tokens`/`check:surfaces`/`check:components`/`check:motion`.
- **Phase gate:** full suite green + visual verification in browser at 900px height + reduced-motion off/on.

### Wave 0 Gaps
- [ ] `src/lib/formatting/numbers.smoke.ts` — covers POL-04.
- [ ] `src/lib/computation/cascade.smoke.ts` — covers KPI-01.
- [ ] `src/lib/computation/suppression.smoke.ts` — covers KPI-04.
- [ ] `src/hooks/use-filter-state.smoke.ts` — covers FLT-01.
- [ ] `src/hooks/use-saved-views.smoke.ts` extension — covers FLT-01 migration.
- [ ] `src/hooks/use-column-management.smoke.ts` — covers POL-03.
- [ ] `src/components/charts/visible-curves.smoke.ts` — covers CHT-01.
- [ ] `src/lib/metabase-import/override.smoke.ts` — covers MBI-01.
- [ ] Consolidated `npm run smoke` script (optional quality-of-life).

*(Not a framework install — project uses Node native strip-types, no vitest/jest. Matches test-infra-deferral pattern from Phase 25/27-06/29-05/30-05/35-01.)*

## Sources

### Primary (HIGH confidence) — direct code reads from this session
- `/Users/micah/Desktop/CODE/DATA VISUALIZER/src/components/layout/app-sidebar.tsx` — POL-01/02 swap site confirmed at :65
- `/Users/micah/Desktop/CODE/DATA VISUALIZER/src/components/charts/collection-curve-chart.tsx` — CHT-01/02/03 source of record
- `/Users/micah/Desktop/CODE/DATA VISUALIZER/src/components/charts/pivot-curve-data.ts` — avg-series logic
- `/Users/micah/Desktop/CODE/DATA VISUALIZER/src/components/charts/curve-tooltip.tsx` — tooltip already handles __avg__
- `/Users/micah/Desktop/CODE/DATA VISUALIZER/src/components/charts/curve-legend.tsx` — CHT-03 max-h add-site
- `/Users/micah/Desktop/CODE/DATA VISUALIZER/src/components/charts/chart-builder-toolbar.tsx` — MBI-01 pattern
- `/Users/micah/Desktop/CODE/DATA VISUALIZER/src/components/charts/chart-type-segmented-control.tsx` — MBI-01 reuse
- `/Users/micah/Desktop/CODE/DATA VISUALIZER/src/components/metabase-import/preview-step.tsx` — MBI-01 swap site at Chart section :190-207
- `/Users/micah/Desktop/CODE/DATA VISUALIZER/src/components/kpi/kpi-summary-cards.tsx` — KPI-01/02/04 redesign
- `/Users/micah/Desktop/CODE/DATA VISUALIZER/src/components/table/draggable-header.tsx` — POL-06 line :104
- `/Users/micah/Desktop/CODE/DATA VISUALIZER/src/components/table/heatmap-toggle.tsx` — POL-05
- `/Users/micah/Desktop/CODE/DATA VISUALIZER/src/components/columns/column-group.tsx` — POL-03 lock site at :73-79
- `/Users/micah/Desktop/CODE/DATA VISUALIZER/src/components/toolbar/filter-popover.tsx` — FLT-01/02
- `/Users/micah/Desktop/CODE/DATA VISUALIZER/src/components/data-display.tsx` — filter pipeline + CHT-04 + FLT-03
- `/Users/micah/Desktop/CODE/DATA VISUALIZER/src/components/ui/tooltip.tsx` — primitive for POL-05/06/FLT-02
- `/Users/micah/Desktop/CODE/DATA VISUALIZER/src/hooks/use-filter-state.ts` — FLT-01 URL param map
- `/Users/micah/Desktop/CODE/DATA VISUALIZER/src/hooks/use-saved-views.ts` — FLT-01 migration site
- `/Users/micah/Desktop/CODE/DATA VISUALIZER/src/hooks/use-column-management.ts` — POL-03 toggle gate at :64-65
- `/Users/micah/Desktop/CODE/DATA VISUALIZER/src/lib/formatting/numbers.ts` — POL-04 formatter at :42-55
- `/Users/micah/Desktop/CODE/DATA VISUALIZER/src/lib/columns/config.ts` — IDENTITY_COLUMNS + BATCH_AGE_IN_MONTHS
- `/Users/micah/Desktop/CODE/DATA VISUALIZER/src/lib/columns/definitions.ts` — PARTNER_NAME drill cell
- `/Users/micah/Desktop/CODE/DATA VISUALIZER/src/lib/computation/compute-kpis.ts` — KPI-01 aggregates
- `/Users/micah/Desktop/CODE/DATA VISUALIZER/src/lib/computation/compute-trending.ts` — KPI-04 suppression
- `/Users/micah/Desktop/CODE/DATA VISUALIZER/src/lib/computation/reshape-curves.ts` — FLT-01 age-coercion precedent at :23
- `/Users/micah/Desktop/CODE/DATA VISUALIZER/src/lib/metabase-import/chart-inference.ts` — MBI-01 helper-text source
- `/Users/micah/Desktop/CODE/DATA VISUALIZER/src/lib/views/types.ts` — ViewSnapshot evolution history
- `/Users/micah/Desktop/CODE/DATA VISUALIZER/public/bounce-mark.svg` — POL-01 asset confirmed
- `/Users/micah/Desktop/CODE/DATA VISUALIZER/.planning/milestones/v4.1-REQUIREMENTS.md` — requirement text
- `/Users/micah/Desktop/CODE/DATA VISUALIZER/.planning/phases/38-polish-correctness-pass/38-CONTEXT.md` — locked decisions

### Secondary (MEDIUM confidence) — STATE.md historical context
- Phase 27-06 check:tokens script (`scripts/check-type-tokens.sh`)
- Phase 30-04 DS-24 grid-rows pattern (`data-display.tsx:902-907`)
- Phase 34-02 filteredRawData pipeline
- Phase 35-01 Node strip-types smoke-test recipe
- Phase 37-01/02/03 Metabase Import precedents

### Tertiary (LOW confidence) — not used; this phase's primary sources are all first-party code

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every library confirmed by inspection; no training-data assumptions.
- Architecture: HIGH — patterns sourced from concrete file precedents; STATE.md corroborates.
- Pitfalls: HIGH — each pitfall grounded in a specific code site. Pitfall 2 (avg-series scope) specifically double-verified by reading `pivot-curve-data.ts` end-to-end.
- Test map: MEDIUM — the project's smoke-test pattern is proven but not strictly enforced; planner may choose to skip smoke authoring for the lowest-risk items (POL-05/06 are visual and honestly best served by human-verify).

**Research date:** 2026-04-24
**Valid until:** 2026-05-24 (30 days — this codebase churns quickly and planner should re-verify file paths if delayed beyond one sprint).
