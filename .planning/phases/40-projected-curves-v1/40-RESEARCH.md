# Phase 40: Projected Curves v1 — Research

**Researched:** 2026-04-24
**Domain:** Snowflake-sourced modeled-projection overlays on the collection-curve chart + KPI baseline selector
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Scope pivot** — The original ROADMAP wording described a **historical-average-based** projection line computed from the partner's own prior batches. The actual source of truth — `BOUNCE.FINANCE.CURVES_RESULTS` — already contains per-batch pre-modeled projections with 80-month horizons. Computing a historical average on top would be duplicate, weaker signal. **v1 uses the modeled-deal curves directly; no historical-avg computation is performed.** Target-anchored / partner-reported / confidence-band variants remain deferred to v5.0 Phase 49 as originally planned.

**Follow-up required:** `ROADMAP.md` (Phase 40 goal + success criteria) and `milestones/v4.1-REQUIREMENTS.md` (PRJ-01..05 wording) need re-sync to match this scope — the researcher/planner should surface that on the next pass.

#### Data source
- Snowflake table: `BOUNCE.FINANCE.CURVES_RESULTS`
- Grain: one row per `(LENDER_ID, BATCH_, PRICING_TYPE, VERSION, COLLECTION_MONTH)`; 80 months of projection per batch
- Canonical projection column for v1: `PROJECTED_FRACTIONAL`
- `PROJECTED_FRACTIONAL_DSC` and `PROJECTED_FRACTIONAL_INTERNAL` are deferred (see Deferred Ideas)
- No historical-average computation on our side — the warehouse is authoritative
- Not every batch has modeled data (observed nulls on older bounce_af batches like `AF_AUG_23`, `AF_SEP_23`) — hide projection for those

#### Projection shape + anchor
- **Per-batch rendering**: each displayed batch's actual line is paired with its own dashed modeled line. No synthetic aggregate "partner modeled" line (would be a lossy average on top of genuinely-divergent per-batch curves — 1.8× spread observed at month 6 within `bounce_af`).
- Projection renders as a **full shadow from month 1** through the chart's max displayed age — gives every actual data point a visual "was expected" counterpart, not just a forward tail.
- **Truncate at the chart's max displayed age** (same contract as CHT-01 — no empty whitespace past actuals).
- **Main collection-curve chart only** for v1. Chart Builder custom charts are out of scope.

#### Visual treatment
- Dashed line, **same hue as the batch's actual line**, at **~60% opacity** — eye pairs them instantly without extra cognitive load. Satisfies PRJ-03's "subdued color" requirement without losing batch identity.
- Included in the **proximity-hover tooltip**, labeled "Modeled", with **delta vs actual** on the same row (consistent with CHT-02's partner-avg-in-hover pattern).
- **One legend entry per batch** — toggling a batch's actual silently toggles its modeled companion. No doubling of legend entries (avoids re-triggering CHT-04 scroll pain).
- Existing CHT-02 partner-average actuals line is **unchanged** — no modeled counterpart for it.

#### KPI baseline UX (PRJ-04)
- **Panel-level selector** at the top of the KPI row: one control switches baseline for all cards ("Compare vs: rolling avg | modeled curve"). Not per-card — keeps the KPI row's story consistent.
- "Vs modeled curve" **joins** "vs rolling avg" as an additional option — does NOT replace it. Rolling avg is still useful for trend-vs-recent-self reads and for scopes without modeled coverage.
- **Default remains "rolling avg"** on load — zero-regression for existing users; modeled is opt-in for now.
- **Baseline-absent state** when the selected scope has no modeled coverage: card renders with the rate value but no delta, labeled "No modeled curve for this scope" and offering a "switch to rolling avg" recovery action. No silent fallbacks (per KPI-02's explicit-baseline-labeling spirit and KPI-04's suppress-misleading-deltas spirit).

#### PRJ-05 (segment-aware) note
- With modeled curves now stored at batch level (not segment level), Phase 39's segment split affects only the **actuals side** of the comparison. The same per-batch modeled curve is the benchmark; filtering actuals to a segment and comparing against the batch's modeled curve still works. No segment-specific modeled data is needed from the warehouse for v1.

### Claude's Discretion
- Exact dash pattern (dash length / gap ratio)
- Hover row ordering (actual vs modeled row position) and exact delta format
- Exact copy for the baseline-absent empty state on KPI cards
- Query shape / caching strategy for joining `CURVES_RESULTS` into the existing chart pipeline
- How `LENDER_ID` in `CURVES_RESULTS` maps to the app's partner identity (researcher should confirm the join)
- Handling of multiple `VERSION` rows per batch (latest? specific pinned version?) — researcher should confirm which version is "current"

### Deferred Ideas (OUT OF SCOPE)
- **$ trajectory / absolute-dollar projections** — out of scope for v1 (rate-only). Future phase when dollar-chart views need a projection overlay.
- **`PROJECTED_FRACTIONAL_DSC` and `PROJECTED_FRACTIONAL_INTERNAL` variants** — selector UI / multi-variant rendering deferred. v1 uses `PROJECTED_FRACTIONAL` only.
- **Chart Builder custom-chart projection overlays** — custom charts don't all share batch-age semantics. Future phase; gate by x-axis/y-axis schema when it arrives.
- **Aggregate partner-level modeled line** (mean of per-batch projections) — ruled out for v1 after data showed genuine per-batch divergence. Reconsider only if users specifically ask for a single reference line.
- **Modeled-curve toggle persistence** (localStorage/URL-sync for the KPI baseline selector) — v1 is session-only. Persistence is a later polish.
- **Target-anchored / partner-reported / confidence-band variants** — explicitly slotted for v5.0 Phase 49 (Dynamic Curve Re-Projection). Not v4.1.
- **Per-card baseline override** (mixing baselines across KPI cards) — ruled out for v1 in favor of panel-level consistency. Reconsider if user workflows demand it.
- **ROADMAP + REQUIREMENTS re-sync for Phase 40** (goal wording + PRJ-01 rewording from "rolling historical average" to "modeled curve from CURVES_RESULTS") — not a new phase, but a documentation task the planner should include or flag.
</user_constraints>

<phase_requirements>
## Phase Requirements

**Important context for the planner:** The CONTEXT.md scope pivot supersedes the literal wording of PRJ-01 and PRJ-02 in `milestones/v4.1-REQUIREMENTS.md`. The requirements below are the **pivoted** versions the plans must satisfy; the original rolling-historical-average wording is out of scope. A documentation re-sync task (ROADMAP + v4.1 requirements) should be folded into this phase or explicitly tracked as a follow-up.

| ID | Original requirement | Pivoted behavior for v1 | Research Support |
|----|---------------------|-------------------------|-----------------|
| PRJ-01 | "Collection curve chart renders a projected-trajectory line alongside actual batch curves, computed from the rolling historical average of that partner's prior batches at each age" | Collection curve chart renders **per-batch modeled projection lines** alongside actual batch curves, sourced from `BOUNCE.FINANCE.CURVES_RESULTS.PROJECTED_FRACTIONAL`. No historical-average computation. Batches without modeled data render actuals only. | Data source contract below (§ "Modeled-curve data source"); pivot helper extension in § "Architecture Patterns / Pattern 2"; API route extension in § "Pattern 1" |
| PRJ-02 | "The projection extends from the last actual data point to the max-age of the displayed vintages (same truncation contract as CHT-01)" | Projection renders as a **full shadow from month 1** through the visible x-axis domain (max age of visible batches). Clipped to the same `maxAge` CollectionCurveChart already computes for actuals + partner-avg. | § "Pattern 3: Truncation contract reuse" — share `maxAge` derivation already in `collection-curve-chart.tsx:105` |
| PRJ-03 | "Projection is visually distinct from actuals (dashed line, subdued color, labeled 'Projected')" | Dashed line (`strokeDasharray="6 3"` or similar), **same hue as the batch's actual line**, ~60% opacity. Labeled "Modeled" in the proximity tooltip. One legend entry per batch (toggling actual toggles modeled). | Existing dashed-line precedents in § "Pattern 4"; legend-coupling pattern in § "Pattern 5" |
| PRJ-04 | "KPI cards that currently show 'vs 3-batch rolling avg' gain an option to show 'vs projected curve'" | **Panel-level selector** at top of KPI row switches baseline for all cards (joins, does not replace, rolling-avg). Default = rolling-avg. "Baseline-absent" state when scope has no modeled coverage. `StatCard.trendLabel` prop already supports non-default copy — plumb through. | § "Pattern 6"; § "Don't Hand-Roll" re: `StatCard` trendLabel/suppressDelta reuse; existing `selectCascadeTier`/`suppressDelta` extension pattern |
| PRJ-05 | "When a partner has segments configured (from Phase 39), projections compute per segment when segment split is active" | Modeled curves stay **per-batch** (warehouse grain); Phase 39 segment-split filters the actuals side only, modeled line is the same benchmark. No new warehouse work. Degrades gracefully if Phase 39 hasn't shipped. | § "PRJ-05 mechanics"; independent of Phase 39 shipping order |
</phase_requirements>

## Summary

Phase 40 is primarily an **overlay integration** on the existing `CollectionCurveChart` plus a **baseline-selector UX** on `KpiSummaryCards`. Every piece of infrastructure required (per-batch pivoted Recharts data, dashed-line rendering via `strokeDasharray`, per-series legend toggling, `maxAge` truncation to the visible subset, `StatCard.trendLabel` override) already exists and is exercised by current code. The net-new work is: (1) a Snowflake query against `BOUNCE.FINANCE.CURVES_RESULTS` keyed by `LENDER_ID` + `BATCH_` and returning `(month, PROJECTED_FRACTIONAL)` per batch, (2) a small client-side shape (`BatchCurve.projection?: CurvePoint[]`) wired through the pivot helper, (3) a `StatCard`-compatible "vs modeled" baseline calculator, and (4) a panel-level selector above `KpiSummaryCards` that routes the chosen baseline into per-card `trendLabel` + computed delta.

The key risks are (a) cross-partner join shape — the app keys off `PARTNER_NAME`, the warehouse keys off `LENDER_ID`, and the same partner may have multiple lenders; (b) the `VERSION` column in `CURVES_RESULTS` — multiple pricing versions per batch means we need a deterministic "current version" selector; and (c) performance — the existing data pipeline fetches the full `agg_batch_performance_summary` in one query, and adding a second fetch (or a join) shouldn't slow first paint. All three are tractable with standard patterns used elsewhere in the codebase.

**Primary recommendation:** Add a second TanStack Query (`useCurvesResults`) that fetches projection rows via a new `/api/curves-results` route, reshape them into a `Map<batchKey, CurvePoint[]>`, and merge into `BatchCurve` at the partner-stats level. Render in `CollectionCurveChart` by extending the existing pivot to carry `batch_N__projected` keys. For KPI-04, add a panel-level `baselineMode` useState in `data-display.tsx`, compute a modeled-baseline delta alongside the existing rolling-avg delta, and route the active one into `StatCard.trend` + `trendLabel`.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `recharts` | 3.8.0 | Line chart with dashed overlay via `strokeDasharray` | Already the chart primitive; the partner-average reference line (`collection-curve-chart.tsx:347-358`) is the identical pattern this phase extends |
| `@tanstack/react-query` | 5.97.0 | Cache the second Snowflake fetch (`useCurvesResults`) | Existing `useData()` hook sets the pattern; adding a sibling query keeps the loading semantics consistent |
| `snowflake-sdk` | 2.4.0 | `BOUNCE.FINANCE.CURVES_RESULTS` query | Pooled via `src/lib/snowflake/queries.ts`; 45s timeout; identical mechanism to `/api/data` route |
| `zod` | 4.3.6 | Row-shape validation for new CURVES_RESULTS columns (at the API boundary) | Precedent: `src/lib/views/schema.ts`, `src/lib/columns/schema-validator.ts` |
| `next` | 16.2.3 | `/api/curves-results` route handler | Same shape as `/api/data/route.ts`; `force-dynamic` + `ALLOWED_COLUMNS` guard |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `lucide-react` | 1.8.0 | Icons on the baseline-selector control + baseline-absent state | Already used by `StatCard` (AlertTriangle, Database) |
| `sonner` | 2.0.7 | Optional toast when switching to "modeled" in a partially-covered scope | Precedent: legacy-batch-filter toast in `data-display.tsx` |
| `@base-ui/react` | 1.3.0 | `Tooltip` / `Popover` / `ToggleGroup` primitives for the selector | Already used throughout the app — `StatCard` tooltips, `PresetMenu` popover, `ChartTypeSegmentedControl` toggle group |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Second TanStack Query | Inline the projection JOIN into the existing `/api/data` query | The base query is already 61 columns × ~500 rows and runs per `useData()`. Adding an 80-row-per-batch JOIN would 80× the response size and latency. Sibling query isolates cost and lets the chart stay functional without modeled data. |
| Second Recharts `<Line>` per batch | Single `<Line>` with conditional `strokeDasharray` prop | Recharts doesn't support conditional dash-per-segment on a single series; the partner-avg reference line precedent is a separate `<Line>`. Two lines per batch is idiomatic for this library. |
| Store modeled per-segment | Keep per-batch, filter actuals only | User decision lock in CONTEXT — warehouse stores per-batch modeled; segment split affects actuals only. Avoids a warehouse-side schema change. |
| Rendering `<ReferenceLine>` | `<Line>` with `strokeDasharray` | `ReferenceLine` is for horizontal/vertical threshold markers (fixed `y=X` or `x=X`), not month-varying series. `<Line>` with dashes is the correct primitive. |

**Installation:** No new npm dependencies. Phase 40 is purely a feature extension on the existing stack.

## Architecture Patterns

### Recommended Project Structure

Files this phase touches (and where new files would live):

```
src/
├── app/api/
│   └── curves-results/          # NEW — Snowflake fetch for BOUNCE.FINANCE.CURVES_RESULTS
│       └── route.ts
├── lib/
│   ├── computation/
│   │   ├── reshape-curves.ts    # EXTEND — add projection points alongside actuals (or keep separate)
│   │   ├── compute-kpis.ts      # EXTEND — add modeled-baseline rate computation (per horizon)
│   │   └── compute-projection.ts # NEW — small helper: curve-at-age for a given horizon
│   ├── snowflake/
│   │   └── queries.ts           # (unchanged — executeQuery reused)
│   └── columns/
│       └── curves-results-config.ts # NEW — allow-list for new projection columns
├── hooks/
│   ├── use-data.ts              # (unchanged)
│   ├── use-curves-results.ts    # NEW — sibling query for CURVES_RESULTS
│   └── use-partner-stats.ts     # EXTEND — merge projection into BatchCurve[]
├── components/
│   ├── charts/
│   │   ├── collection-curve-chart.tsx  # EXTEND — render per-batch modeled line
│   │   ├── pivot-curve-data.ts         # EXTEND — emit batch_N__projected keys
│   │   ├── curve-tooltip.tsx           # EXTEND — "Modeled" row with delta-vs-actual
│   │   └── curve-legend.tsx            # (unchanged — one entry per batch)
│   └── kpi/
│       ├── kpi-summary-cards.tsx       # EXTEND — accept baselineMode prop, route to StatCard.trendLabel
│       └── baseline-selector.tsx       # NEW — segmented control above KPI row
└── types/
    └── partner-stats.ts         # EXTEND — BatchCurve.projection?: CurvePoint[]
```

### Pattern 1: Sibling TanStack Query for the projection data

**What:** Add `useCurvesResults()` hook that mirrors `useData()` but targets `/api/curves-results`. Both queries resolve independently; the chart renders actuals immediately and the modeled overlay appears when the second query resolves.

**When to use:** Any time a secondary data source must coexist with the base dataset without blocking first paint.

**Example:**
```typescript
// Source: Mirrors src/hooks/use-data.ts
'use client';
import { useQuery } from '@tanstack/react-query';
import type { CurvesResultsResponse } from '@/types/curves-results';

export function useCurvesResults() {
  return useQuery<CurvesResultsResponse>({
    queryKey: ['curves-results'],
    queryFn: async () => {
      const res = await fetch('/api/curves-results');
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to fetch projections' }));
        throw new Error(err.error ?? 'Failed to fetch projections');
      }
      return res.json();
    },
    // Long stale time — projection data refreshes on warehouse ETL cadence, not user action.
    staleTime: 5 * 60 * 1000,
  });
}
```

**API route shape** (follows `/api/data/route.ts` precedent verbatim — allow-list columns, schema validation, `force-dynamic`, static-mode fallback):

```typescript
// Source: Mirrors src/app/api/data/route.ts
export const dynamic = 'force-dynamic';

export async function GET(/* request */) {
  if (isStaticMode()) {
    // Phase 40: static fallback returns empty projections — chart gracefully
    // renders actuals only (see § "Common Pitfalls").
    return NextResponse.json({ data: [], meta: { rowCount: 0, fetchedAt: new Date().toISOString() } });
  }

  // Pin to the latest VERSION per (LENDER_ID, BATCH_, PRICING_TYPE) to resolve the
  // Claude's-discretion VERSION question deterministically.
  const sql = `
    WITH latest AS (
      SELECT LENDER_ID, BATCH_, PRICING_TYPE, MAX(VERSION) AS version
      FROM BOUNCE.FINANCE.CURVES_RESULTS
      GROUP BY LENDER_ID, BATCH_, PRICING_TYPE
    )
    SELECT c.LENDER_ID, c.BATCH_, c.PRICING_TYPE, c.COLLECTION_MONTH, c.PROJECTED_FRACTIONAL
    FROM BOUNCE.FINANCE.CURVES_RESULTS c
    JOIN latest l
      ON c.LENDER_ID = l.LENDER_ID
      AND c.BATCH_ = l.BATCH_
      AND c.PRICING_TYPE = l.PRICING_TYPE
      AND c.VERSION = l.version
    WHERE c.PROJECTED_FRACTIONAL IS NOT NULL
  `;
  const rows = await executeQuery(sql);
  return NextResponse.json({ data: rows, meta: { ... } });
}
```

### Pattern 2: Extend `BatchCurve` with optional projection points

**What:** Add `projection?: CurvePoint[]` to `BatchCurve`. `usePartnerStats` merges the projection rows into each curve by `(partner, batch)` key.

**When to use:** Whenever a secondary per-batch series must travel alongside the primary series through downstream consumers without forking their prop shapes.

**Example:**
```typescript
// Source: Extends src/types/partner-stats.ts
export interface BatchCurve {
  batchName: string;
  totalPlaced: number;
  ageInMonths: number;
  points: CurvePoint[];
  /** Phase 40 PRJ-01 — optional modeled projection from BOUNCE.FINANCE.CURVES_RESULTS.
   *  Absent when the batch has no modeled coverage. 80 months of PROJECTED_FRACTIONAL,
   *  clipped to the same months array as `points` at render time (CHT-01 truncation). */
  projection?: CurvePoint[];
}
```

Merge in `usePartnerStats` (mirrors existing composition):
```typescript
// Source: Extends src/hooks/use-partner-stats.ts
const projectionIndex = useCurvesResultsIndex(); // Map<`${lenderId}||${batchName}`, CurvePoint[]>

const curves = reshapeCurves(partnerRows).map((curve) => ({
  ...curve,
  projection: projectionIndex.get(`${lenderIdFor(curve.batchName)}||${curve.batchName}`),
}));
```

### Pattern 3: Truncation contract reuse (PRJ-02 / CHT-01)

**What:** The existing CollectionCurveChart already computes `maxAge` from the user-visible subset (`collection-curve-chart.tsx:93-106`). The modeled line uses the **same** `maxAge` — pivot projection points through the same `.filter((p) => p.month <= maxAge)` pass.

**When to use:** Always. This is the load-bearing invariant of CHT-01 (no empty whitespace past actuals) and the CONTEXT lock for PRJ-02.

**Example:**
```typescript
// Source: Extends src/components/charts/collection-curve-chart.tsx:119-135
const pivotedData = useMemo(() => {
  const withProjection = showProjection
    ? pivotedRaw.map<PivotedPoint>((point) => {
        const next = { ...point };
        // For each visible batch, pull projected value at this month.
        visibleBatchKeys.forEach((key) => {
          const curveIdx = parseInt(key.replace('batch_', ''), 10);
          const curve = sortedCurves[curveIdx];
          const projPoint = curve?.projection?.find((p) => p.month === point.month);
          if (projPoint) next[`${key}__projected`] = projPoint[metric];
        });
        return next;
      })
    : pivotedRaw;
  // ... existing avg merge ...
  return withAvg.filter((p) => p.month <= maxAge); // CHT-01 truncation — unchanged
}, [pivotedRaw, visibleBatchKeys, maxAge, sortedCurves, metric, showProjection]);
```

### Pattern 4: Dashed-line rendering per batch

**What:** One `<Line>` per batch for the modeled series, `strokeDasharray="6 3"` (same pattern used today for partner-average at `collection-curve-chart.tsx:351`), color = batch actual color, `strokeOpacity={0.6}`, `hide` tied to the batch's actual visibility.

**When to use:** Paired overlay series that must read as "shadow of the primary" — dashed + same hue + subdued opacity is the convention already established by the partner-average line.

**Example:**
```tsx
// Source: Extends src/components/charts/collection-curve-chart.tsx:319-345
{sortedCurves.map((curve, i) => {
  const key = `batch_${i}`;
  const projKey = `${key}__projected`;
  const baseColor = anomalyColor ?? CHART_COLORS[i % CHART_COLORS.length];
  return (
    <Fragment key={key}>
      <Line
        dataKey={key}
        stroke={baseColor}
        // ... existing actual-line props ...
      />
      {curve.projection && (
        <Line
          dataKey={projKey}
          stroke={baseColor}
          strokeDasharray="6 3"
          strokeOpacity={0.6}
          strokeWidth={1.5}
          dot={false}
          hide={!visibleBatchKeys.includes(key)}  // toggles with actual — PRJ-03 lock
          connectNulls={false}
          isAnimationActive={false}  // see Pitfall 3 below
        />
      )}
    </Fragment>
  );
})}
```

### Pattern 5: Legend-coupling (one entry per batch)

**What:** `CurveLegend` stays unchanged — it already renders one button per `defaultVisibleKeys` entry (`curve-legend.tsx:35-62`). Toggling a batch flips `hiddenBatches`, which flips the `hide` prop on both the actual `<Line>` and the modeled `<Line>` via the shared `visibleBatchKeys.includes(key)` test.

**When to use:** Always for Phase 40. Doubling the legend would regress CHT-03's "scrolls instead of overflowing" work and violate the CONTEXT lock.

### Pattern 6: Panel-level baseline selector (PRJ-04)

**What:** A `BaselineSelector` component rendered above `KpiSummaryCards` in `data-display.tsx`. Holds `baselineMode: 'rolling' | 'modeled'` in a `useState` at the `data-display.tsx` level. Passes the mode into `KpiSummaryCards`, which threads it into `StatCard` via `trendLabel` + a computed `trend.deltaPercent`.

**When to use:** Always for PRJ-04. CONTEXT locks this as panel-level, not per-card.

**Example:**
```tsx
// Source: NEW src/components/kpi/baseline-selector.tsx — mirrors ChartTypeSegmentedControl
'use client';
import { ToggleGroup, ToggleGroupItem } from '@base-ui/react/toggle-group';

export type BaselineMode = 'rolling' | 'modeled';

export function BaselineSelector({
  value, onChange, modeledAvailable,
}: {
  value: BaselineMode;
  onChange: (m: BaselineMode) => void;
  modeledAvailable: boolean;
}) {
  return (
    <div className="flex items-center gap-inline">
      <span className="text-caption text-muted-foreground">Compare vs:</span>
      <ToggleGroup value={value} onValueChange={onChange}>
        <ToggleGroupItem value="rolling">Rolling avg</ToggleGroupItem>
        <ToggleGroupItem value="modeled" disabled={!modeledAvailable}>
          Modeled curve
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}
```

**KPI wiring:**
```tsx
// Source: Extends src/components/kpi/kpi-summary-cards.tsx
const isSuppressed = baselineMode === 'rolling'
  ? (trending?.suppressDelta?.[spec.key] ?? true)
  : !projectionDelta; // modeled-baseline suppression: absent when no modeled coverage at this horizon

const trendLabel = baselineMode === 'rolling'
  ? 'vs 3-batch rolling avg'   // StatCard default; omit for cleanliness
  : 'vs modeled curve';

const trend = baselineMode === 'rolling'
  ? rollingTrend  // existing path
  : projectionDelta;  // NEW: { direction, deltaPercent, metric } computed from modeled-curve-at-horizon
```

### Anti-Patterns to Avoid

- **Building a partner-level aggregate modeled line** (mean of per-batch projections) — CONTEXT ruled this out. The warehouse data has genuine per-batch divergence (1.8× spread at month 6 observed); averaging loses that signal.
- **Storing segment-level modeled curves client-side** — Phase 40 decision: segment split affects actuals only. Don't reshape modeled by segment.
- **Computing historical averages on actuals** — the ROADMAP wording implies this; CONTEXT pivot overrides it. The warehouse is authoritative.
- **Silent fallback from "modeled" to "rolling"** when modeled coverage is absent — violates the CONTEXT baseline-absent UX lock and KPI-02/KPI-04 precedent of explicit suppression.
- **Blocking first paint on the projections query** — the chart must render actuals immediately and fade modeled in when ready (same loading discipline as anomaly/norm overlays today).
- **Adding `<ReferenceLine>` primitives** — `ReferenceLine` is for fixed thresholds, not month-varying series. Use `<Line>` with `strokeDasharray`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Dashed projection line rendering | Custom SVG paths | Recharts `<Line strokeDasharray="6 3">` | Exists, styles tested (partner-avg line) |
| Projection at a specific age (e.g., "modeled rate at 6mo") | Linear interpolation across 80 months | Exact month lookup in `CurvePoint[]` (warehouse already emits one row per `COLLECTION_MONTH`) | Warehouse grain is per-month, interpolation adds bugs |
| Trend-delta UX (arrow + `+X.X%` + color) | New component | Reuse `StatCard.trend` + `trendLabel` prop | `StatCard.trendLabel` was shipped in Phase 38 specifically "for Phase 40" per `stat-card.tsx:124-129` |
| Modeled-absent "no delta" suppression | New state in KPI | Extend `SuppressDeltaFlags` semantics OR compute per-card | `StatCard.insufficientData` + `noData` branches already exist for the em-dash + tooltip recipe |
| Per-batch color-matching for projection | Recompute color map | Read `CHART_COLORS[i % 8]` with same index as actual | Already exported from `curve-tooltip.tsx`; used by legend + chart |
| Latest-version selection per batch | Client-side `Array.reduce` over all versions | SQL `MAX(VERSION) + JOIN` at the warehouse | Pushes the selection to where the data lives; single transit payload |
| Static-mode handling | New fallback JSON fixtures | Return empty `data: []` from the API route when `isStaticMode()` | Chart already gracefully handles `projection: undefined` per-batch |
| Panel-level toggle chrome | New primitive | `@base-ui/react/toggle-group` (pattern from `ChartTypeSegmentedControl`) | Established pattern, a11y-verified |

**Key insight:** Phase 38's `StatCard.trendLabel` refactor and the `SuppressDeltaFlags` structure were deliberately designed to be extended by Phase 40 (see `stat-card.tsx:124-129` and `kpi-summary-cards.tsx:71-73` comments). The baseline selector is the final piece of plumbing — all downstream surfaces already accept override copy and suppression signals.

## Common Pitfalls

### Pitfall 1: `LENDER_ID` vs `PARTNER_NAME` join

**What goes wrong:** The app's partner-stats pipeline keys off `PARTNER_NAME` (e.g., "Affirm"). The warehouse keys off `LENDER_ID` (e.g., `AFRM`). A single partner may have multiple lender IDs — the CONTEXT flagged this as a Claude-discretion item.

**Why it happens:** No single source of truth for partner↔lender today; the app has been operating in partner-name space only since v1.

**How to avoid:**
- Probe `agg_batch_performance_summary` at runtime — both `PARTNER_NAME` and `LENDER_ID` columns exist in the registry (`config.ts:49-50`). Build an in-memory `Map<batchName, lenderId>` at the `usePartnerStats` level keyed by the Snowflake batch row, then look up projections via `(lenderId, batchName)`.
- **Do not** hard-code a partner-to-lender mapping — the app should degrade gracefully if new partners/lenders appear without code changes.
- If projection rows are returned keyed only by `LENDER_ID + BATCH_`, the client-side merge is a direct key lookup. Matching fails → batch has no projection → chart renders actuals only.

**Warning signs:** Modeled line missing for a partner where the warehouse clearly has data; cross-check a single known batch's `LENDER_ID` in `agg_batch_performance_summary` against `BOUNCE.FINANCE.CURVES_RESULTS`.

### Pitfall 2: Multiple `VERSION` rows per batch

**What goes wrong:** `CURVES_RESULTS` has grain `(LENDER_ID, BATCH_, PRICING_TYPE, VERSION, COLLECTION_MONTH)`. Without version pinning, a single batch can return duplicate month rows from re-pricing events.

**Why it happens:** Warehouse stores the model history; each re-pricing adds a new `VERSION` row.

**How to avoid:**
- SQL-side `MAX(VERSION) + JOIN` to pin to the latest version per `(LENDER_ID, BATCH_, PRICING_TYPE)` (see Pattern 1 example). Client receives a single month series per batch.
- **Document this** in the `/api/curves-results` route: "v1 uses the latest VERSION; version-history UX is deferred."
- If `PRICING_TYPE` varies within a batch (CONTEXT mentions AF vs CCB variants), the JOIN preserves all pricing types — decide in Task 1 whether to filter to a single pricing type per batch or render N modeled lines per batch. **Recommendation:** v1 shows one modeled line per batch (filter to the dominant/latest `PRICING_TYPE` row-count-wise); multi-pricing-type overlay is a v5.0 concern.

**Warning signs:** Modeled line appears "wavy" or has multiple overlapping lines per batch; count distinct `PRICING_TYPE` values per batch at query time to detect.

### Pitfall 3: Recharts animation on overlay mount

**What goes wrong:** When the second query resolves and modeled lines mount after the actuals are already animated, Recharts' default `animationDuration={1000}` on the new `<Line>` components causes a second animation pass that looks like a glitch.

**Why it happens:** Existing actual lines animate on first mount (`collection-curve-chart.tsx:340`). The projection lines mount later and trigger their own animation.

**How to avoid:**
- Set `isAnimationActive={false}` on projection `<Line>` components OR use a matching short `animationDuration` that feels like a "reveal" rather than a "redraw."
- Precedent: CHT-02 partner-avg line uses `isAnimationActive={true}` with default duration; for this overlay, turning animation off is cleaner because the user sees actuals first and should see modeled as a subtle addition, not a redraw.

**Warning signs:** Visual "flash" when the projections query resolves; jarring delay between chart render and overlay appearance.

### Pitfall 4: Missing modeled coverage on older batches

**What goes wrong:** CONTEXT notes that older `bounce_af` batches (`AF_AUG_23`, `AF_SEP_23`) have null `PROJECTED_FRACTIONAL`. If the code assumes every batch has modeled data, the chart throws or renders a phantom line at zero.

**Why it happens:** Warehouse doesn't backfill historical modeled curves uniformly.

**How to avoid:**
- Make `BatchCurve.projection` strictly optional. Every consumer checks `curve.projection && ...` before rendering.
- In `KpiSummaryCards`, derive `modeledAvailable: boolean` from the set of visible batches (at minimum one batch has projection data at the card's horizon) and disable the "modeled" selector toggle with a tooltip ("No modeled data in this scope") when false.
- Per-card "baseline-absent" state when `baselineMode === 'modeled'` but the specific card's horizon has no modeled value — use `StatCard.noData` + `noDataReason`, or render value-only with a subtle "No modeled curve for this scope" caption.

**Warning signs:** 0.00% modeled values (treating null as 0); unexpected NaN deltas in KPI cards; partial legend entries for batches without modeled data.

### Pitfall 5: Double-counting the pivot — keys colliding

**What goes wrong:** `pivotCurveData` emits keys `batch_0`, `batch_1`, .... If we naively add `batch_0_projected` as a sibling, an accidental substring check or regex on key names in the tooltip proximity logic (`collection-curve-chart.tsx:189-213`) could include both series as "candidates" and produce doubled tooltip entries or incorrect closest-line math.

**Why it happens:** The proximity logic uses `[...visibleBatchKeys, "__avg__"]` — a flat list. If `batch_0__projected` is appended without being explicitly labeled, the closest-match logic doesn't distinguish actual from modeled.

**How to avoid:**
- Pick a key convention that's **grep-unique**: `batch_0__projected` (double underscore) distinguishes from any future `batch_N_*` keys.
- Extend the tooltip proximity list with projections explicitly when modeled is visible; emit a single tooltip row per batch that shows **both actual and modeled values** with a delta, rather than two separate tooltip candidates. CONTEXT locks the row to label "Modeled" with "delta vs actual" on the same row.

**Warning signs:** Hovering a batch shows two tooltip rows for the same batch; tooltip "closest to cursor" math jumps between actual and modeled lines unpredictably.

### Pitfall 6: PRJ-05 without Phase 39 — degradation path

**What goes wrong:** Phase 39 may or may not have shipped when Phase 40 lands. If PRJ-05 is implemented conditionally on segment state that doesn't exist yet, the code path is dead.

**Why it happens:** Both phases were flagged as potentially parallel; order is not guaranteed.

**How to avoid:**
- Design PRJ-05 as "when segment split is active, filter actuals by segment; modeled stays per-batch unchanged." If Phase 39 hasn't shipped, segment split is never active → behavior degrades to plain per-batch comparison. No dead code, no feature flag.
- Specifically: do **not** add a `useSegmentState()` hook; read segment state from wherever Phase 39 exposes it (probably `usePartnerSegmentConfig` or similar per 39-CONTEXT) and let the absence of a segment produce the unsegmented view.
- Coordination note in the plan: "If Phase 39 ships first, PRJ-05 wire-up is a 10-line consumer extension. If Phase 39 ships later, PRJ-05 is already satisfied by graceful-default behavior."

**Warning signs:** Plan introducing segment-aware branches without a clear fallback for "no segments configured."

### Pitfall 7: `PROJECTED_FRACTIONAL` units

**What goes wrong:** The column name hints at "fractional" (0..1 scale), but the app's `recoveryRate` is stored as percentage (0..100). If units don't match, the modeled line plots at 1/100th the actual line's height.

**Why it happens:** Warehouse columns often use fractions; app computation converts to percentage via `(amount / totalPlaced) * 100` (`reshape-curves.ts:44`).

**How to avoid:**
- **Verify units at query time** by pulling one known row's `PROJECTED_FRACTIONAL` and comparing to the same batch's actual `COLLECTION_AFTER_X_MONTH / TOTAL_AMOUNT_PLACED`. If modeled is 0-1 and actual is 0-100, multiply modeled × 100 at the API boundary (in the route handler) so the client-side shape is consistent percentage.
- Include this as a smoke assertion: `projectedFractional * 100 ≈ actualRecoveryRate` for a known-good batch-month pair.

**Warning signs:** Modeled line appears flat near the x-axis; scales look wrong; plotting at 0.3 instead of 30.

### Pitfall 8: Cache bloat from the second query

**What goes wrong:** `CURVES_RESULTS` is per-month per-batch per-version — easily 10k+ rows. Without filtering/indexing, client memory grows and the `useCurvesResultsIndex` map rebuild is slow.

**Why it happens:** Warehouse granularity is higher than the app needs.

**How to avoid:**
- Filter at SQL time: `WHERE PROJECTED_FRACTIONAL IS NOT NULL` (drops backfill gaps); `JOIN latest` (drops all but current version).
- Shape the API response as `Array<{ lenderId, batchName, month, projectedRate }>` — drop unused columns before returning. Smaller payload, smaller index.
- Use `useMemo` for the `Map<string, CurvePoint[]>` build, keyed on the query's `dataUpdatedAt`. TanStack Query handles staleness; the hook just needs to avoid rebuilding on unrelated renders.

**Warning signs:** First-paint-to-overlay latency > 1s in dev; Chrome memory profiler shows large retained arrays in the query cache.

## Code Examples

### Modeled-curve data source — API route snippet

```typescript
// Source: NEW src/app/api/curves-results/route.ts
// Pattern: src/app/api/data/route.ts
import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/snowflake/queries';
import { isStaticMode } from '@/lib/static-cache/fallback';

export const dynamic = 'force-dynamic';

const CURVES_SQL = `
  WITH latest AS (
    SELECT LENDER_ID, BATCH_, PRICING_TYPE, MAX(VERSION) AS version
    FROM BOUNCE.FINANCE.CURVES_RESULTS
    WHERE PROJECTED_FRACTIONAL IS NOT NULL
    GROUP BY LENDER_ID, BATCH_, PRICING_TYPE
  )
  SELECT
    c.LENDER_ID    AS "lenderId",
    c.BATCH_       AS "batchName",
    c.COLLECTION_MONTH AS "month",
    c.PROJECTED_FRACTIONAL * 100 AS "projectedRate"  -- see Pitfall 7
  FROM BOUNCE.FINANCE.CURVES_RESULTS c
  JOIN latest l
    ON c.LENDER_ID = l.LENDER_ID
    AND c.BATCH_ = l.BATCH_
    AND c.PRICING_TYPE = l.PRICING_TYPE
    AND c.VERSION = l.version
  WHERE c.PROJECTED_FRACTIONAL IS NOT NULL
  ORDER BY c.LENDER_ID, c.BATCH_, c.COLLECTION_MONTH
`;

export async function GET() {
  if (isStaticMode()) {
    return NextResponse.json({ data: [], meta: { rowCount: 0, fetchedAt: new Date().toISOString() } });
  }
  try {
    const rows = await executeQuery(CURVES_SQL);
    return NextResponse.json({
      data: rows,
      meta: { rowCount: rows.length, fetchedAt: new Date().toISOString() },
    });
  } catch (error) {
    console.error('Curves results query error:', { message: error instanceof Error ? error.message : 'Unknown error' });
    return NextResponse.json({ error: 'Failed to fetch projections' }, { status: 500 });
  }
}
```

### Projection index helper

```typescript
// Source: NEW src/hooks/use-curves-results.ts
'use client';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

export interface ProjectionRow {
  lenderId: string;
  batchName: string;
  month: number;
  projectedRate: number;
}

export function useCurvesResults() {
  return useQuery<{ data: ProjectionRow[] }>({
    queryKey: ['curves-results'],
    queryFn: async () => {
      const res = await fetch('/api/curves-results');
      if (!res.ok) throw new Error('Failed to fetch projections');
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });
}

/** Index projection rows into Map<"lenderId||batchName", CurvePoint[]>. Stable across renders. */
export function useCurvesResultsIndex() {
  const { data } = useCurvesResults();
  return useMemo(() => {
    const map = new Map<string, Array<{ month: number; amount: number; recoveryRate: number }>>();
    if (!data?.data) return map;
    for (const row of data.data) {
      const key = `${row.lenderId}||${row.batchName}`;
      const pts = map.get(key) ?? [];
      // Phase 40 v1 is rate-only; amount stays 0 (see Deferred: $ trajectory).
      pts.push({ month: row.month, amount: 0, recoveryRate: row.projectedRate });
      map.set(key, pts);
    }
    return map;
  }, [data?.data]);
}
```

### Modeled delta for KPI baseline

```typescript
// Source: NEW src/lib/computation/compute-projection.ts
import type { BatchCurve, BatchTrend } from '@/types/partner-stats';

/** Find the modeled rate at a specific horizon for a batch. Returns null if no modeled coverage at that month. */
export function modeledRateAtMonth(curve: BatchCurve, month: number): number | null {
  const p = curve.projection?.find((pt) => pt.month === month);
  return p ? p.recoveryRate : null;
}

/**
 * Compute the "vs modeled curve" delta for the latest batch at a given horizon.
 * Returns null when no modeled coverage at that horizon → KpiSummaryCards renders
 * the baseline-absent state.
 */
export function computeModeledDelta(
  latestCurve: BatchCurve,
  horizon: 3 | 6 | 12,
  actualRate: number,
  metricKey: string,  // e.g. 'COLLECTION_AFTER_6_MONTH' — for polarity lookup
): BatchTrend | null {
  const modeled = modeledRateAtMonth(latestCurve, horizon);
  if (modeled == null || modeled === 0) return null;
  const deltaPercent = ((actualRate - modeled) / modeled) * 100;
  const THRESHOLD = 5;
  const direction: 'up' | 'down' | 'flat' =
    deltaPercent > THRESHOLD ? 'up' : deltaPercent < -THRESHOLD ? 'down' : 'flat';
  return {
    batchName: latestCurve.batchName,
    metric: metricKey,
    value: actualRate,
    rollingAvg: modeled,  // reuses the BatchTrend shape; field name is vestigial
    direction,
    deltaPercent,
    baselineCount: 1,
  };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| ROADMAP wording: "rolling historical average" projection | Per-batch modeled curves from `BOUNCE.FINANCE.CURVES_RESULTS` | CONTEXT gathering, 2026-04-24 | Requirements doc re-sync needed (PRJ-01 wording); implementation simpler — no client-side averaging math |
| `CollectionCurveChart` plots actuals + partner-avg only | + Per-batch modeled overlay (dashed, same hue, 60% opacity) | This phase | Second data source, second `<Line>` per batch, same `maxAge` truncation |
| KPI cards baseline = "vs 3-batch rolling avg" (locked copy) | Panel-level toggle between rolling-avg and modeled-curve baselines | This phase (PRJ-04) | `StatCard.trendLabel` prop already supports override — wiring is the net-new work |
| `SuppressDeltaFlags` suppresses when history is insufficient | + Suppress when modeled coverage is absent at the card's horizon | This phase | Extension, not replacement; keeps rolling-avg path working |

**Deprecated / outdated:**
- **CONTEXT's own "historical-average-based projection" reading of PRJ-01/PRJ-02** — confirmed pivoted in CONTEXT itself. The planner should surface the REQUIREMENTS re-sync task.
- **Nothing else deprecated.** Every file this phase touches is current and actively maintained.

## Open Questions

1. **How does `LENDER_ID` join to app partners for multi-lender partners?**
   - What we know: `LENDER_ID` is a registered column in `COLUMN_CONFIGS` (identity column). `agg_batch_performance_summary` carries both `PARTNER_NAME` and `LENDER_ID` on every row.
   - What's unclear: whether all batches for a single `PARTNER_NAME` have a single `LENDER_ID` or many. CONTEXT flags this as Claude-discretion.
   - Recommendation: At query time in `usePartnerStats`, build `lenderByBatch: Map<batchName, lenderId>` directly from `partnerRows`. Look up projections via `(lenderId, batchName)` without assuming partner-level uniformity. This is correct for both 1:1 and 1:N mappings.

2. **Which `PRICING_TYPE` should the "current" modeled line show when a batch has multiple pricing types?**
   - What we know: CONTEXT mentions AF vs CCB pricing variants within the same batch can materially differ.
   - What's unclear: whether the app should show one line per pricing type, pick the dominant one, or sum-weight.
   - Recommendation: v1 picks the latest `VERSION` per `(lenderId, batchName, pricingType)` via the SQL `MAX(VERSION) + JOIN` pattern; if multiple pricing types remain, v1 picks the pricing type with the most modeled months (deterministic fallback). Surface multi-pricing overlay in Deferred Ideas for v5.0.

3. **Should the baseline selector persist across sessions?**
   - What we know: CONTEXT locks v1 as **session-only**.
   - What's unclear: whether users will ask for persistence as soon as v1 ships.
   - Recommendation: Honor CONTEXT — no localStorage/URL sync in v1. Plan can pre-stub the shape behind a comment so Phase 41+ extension is a one-line add.

4. **Modeled-curve animation semantics when modeled coverage appears after actuals have rendered**
   - What we know: Pitfall 3 above. Two defensible paths.
   - What's unclear: whether users prefer "reveal animation" (matches anomaly overlay pattern) or "instant mount" (less jarring).
   - Recommendation: `isAnimationActive={false}` on projection lines in v1; if feedback prefers a subtle reveal, add `animationDuration={400}` in a fast-follow. Cheap to flip either way.

5. **Units of `PROJECTED_FRACTIONAL` — fractional (0..1) or percentage (0..100)?**
   - What we know: Column name hints fractional; app internals use percentage.
   - What's unclear: empirical — requires one live query to confirm.
   - Recommendation: In Task 1 of the plan, do a one-off `SELECT PROJECTED_FRACTIONAL FROM ... LIMIT 5` against a known batch and compare to actuals; hardcode the `× 100` conversion in the API route (as shown in Pattern 1). Smoke-test it.

6. **What should the KPI baseline-absent empty state actually say?**
   - What we know: CONTEXT leaves exact copy to Claude's discretion.
   - What's unclear: tone — "No modeled curve for this scope" vs "Modeled baseline unavailable" vs "—".
   - Recommendation: "No modeled curve for this scope" with a "switch to rolling avg" button, matching the CONTEXT language verbatim. `StatCard.noData` + `noDataReason` tooltip path already exists for this recipe.

## Sources

### Primary (HIGH confidence)
- `src/components/charts/collection-curve-chart.tsx` — existing chart rendering, `maxAge` derivation, partner-avg dashed-line precedent (lines 93-135, 319-358)
- `src/components/charts/pivot-curve-data.ts` — existing pivot helper; extension point for projection keys
- `src/components/charts/curve-tooltip.tsx` — tooltip recipe; extension point for "Modeled" row
- `src/components/charts/curve-legend.tsx` — one-entry-per-batch legend; unchanged for PRJ-03
- `src/components/kpi/kpi-summary-cards.tsx` — KPI rendering; extension point for baseline mode (lines 63-98, 175-202)
- `src/components/patterns/stat-card.tsx` — `trendLabel` override shipped in Phase 38 specifically for Phase 40 (lines 122-129); `noData` + `insufficientData` + `noDataReason` branches available
- `src/lib/computation/compute-kpis.ts` — cascade-tier selector reusable for modeled-baseline per-horizon suppression
- `src/lib/computation/compute-trending.ts` — `computeSuppression` pattern to mirror for modeled suppression (lines 47-65); `BatchTrend` shape reusable
- `src/hooks/use-partner-stats.ts` — composition site for merging projections into `BatchCurve[]`
- `src/hooks/use-data.ts` — TanStack Query pattern for sibling `useCurvesResults` hook
- `src/app/api/data/route.ts` — API route template (allow-list, schema-validator, static-mode fallback)
- `src/lib/snowflake/queries.ts` + `src/lib/snowflake/connection.ts` — pooled executor reused as-is
- `src/lib/static-cache/fallback.ts` — `isStaticMode()` contract; Phase 40 API route returns empty array in static mode
- `src/lib/views/types.ts` + `src/lib/views/schema.ts` — `ChartDefinition` union; no schema change needed for v1 (collection-curve variant's shape doesn't need to carry modeled-curve toggle state — it's session-only, not persisted)
- `src/types/partner-stats.ts` — `BatchCurve` extension point (`projection?: CurvePoint[]`); `BatchTrend` / `SuppressDeltaFlags` extension points for KPI
- `src/lib/columns/config.ts` — `PARTNER_NAME` (line 49) and `LENDER_ID` (line 50) both registered; confirms the join key is available on every row
- `.planning/phases/40-projected-curves-v1/40-CONTEXT.md` — the locked decisions
- `.planning/milestones/v4.1-REQUIREMENTS.md` — PRJ-01..05 original wording
- `.planning/STATE.md` — Phase 38 lock-ins: `stat-card.tsx` `DEFAULT_TREND_EXPLANATION` shipped as module constant "so Phase 40 projected-curve baseline overrides per-card via the prop; no caller-side edits needed for the default path" (State entry Phase 38-04); `compute-trending.ts` `suppressDelta` computed on ALL return paths so KpiSummaryCards can make per-card decisions (Phase 38-04)
- `.planning/phases/39-partner-config-module/39-CONTEXT.md` — segment state expectations relevant to PRJ-05 degradation path

### Secondary (MEDIUM confidence)
- `node_modules/recharts/types/cartesian/ReferenceLine.d.ts` — confirmed `<ReferenceLine>` exists but is for fixed thresholds only (not month-varying series), reinforcing the `<Line strokeDasharray>` recommendation
- `src/components/cross-partner/trajectory-chart.tsx` (lines 215-237) — additional dashed-line precedent at the portfolio level using `strokeDasharray="8 4"` and `"5 5"`, confirming dashed-overlay pattern is battle-tested across the app

### Tertiary (LOW confidence)
- None — this phase is almost entirely an integration on well-exercised primitives inside the repo. No WebSearch findings were relied on because Context7/official sources weren't required: the work is repo-local.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every library is already in `package.json`, exercised by current code, and the patterns are direct extensions of shipped code paths.
- Architecture: HIGH — sibling TanStack query, per-batch overlay `<Line>`, panel-level `ToggleGroup`, and `StatCard.trendLabel` routing are all established patterns with precedent in this codebase.
- Pitfalls: MEDIUM — data-shape pitfalls (LENDER_ID join, VERSION handling, units) cannot be fully resolved without a live Snowflake probe; plan should include a Task 1 "confirm" step before building on top. Rendering/UX pitfalls are HIGH confidence.
- KPI extension: HIGH — Phase 38-04 explicitly shipped the needed override scaffolding for this phase (documented in `stat-card.tsx:122-129` and STATE.md).

**Research date:** 2026-04-24
**Valid until:** 2026-05-24 (30 days — data-pipeline state is stable; pivot-from-original-ROADMAP confirmed by CONTEXT; Phase 38 refactors provide the baseline APIs)
