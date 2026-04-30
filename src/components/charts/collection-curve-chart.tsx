"use client";

import React, { Fragment, useMemo, useState, useCallback, useRef, useEffect } from "react";
import type { CollectionCurveDefinition } from "@/lib/views/types";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { ChartContainer } from "@/components/ui/chart";
import type { ChartConfig } from "@/components/ui/chart";
import type { BatchCurve } from "@/types/partner-stats";
import type { DrillLevel } from "@/hooks/use-drill-down";
import type { BaselineMode } from "@/components/kpi/baseline-selector";
import { useAnomalyContext } from "@/contexts/anomaly-provider";
import { usePartnerConfigContext } from "@/contexts/partner-config";
import { COLLECTION_MONTHS } from "@/lib/computation/reshape-curves";
import { averageCurvesPerSegment } from "@/lib/partner-config/segment-split";
import type { PartnerProductPair } from "@/lib/partner-config/pair";
import {
  pivotCurveData,
  type PivotedPoint,
} from "@/components/charts/pivot-curve-data";
import { useCurveChartState } from "@/components/charts/use-curve-chart-state";
import { CurveTooltip, CHART_COLORS } from "@/components/charts/curve-tooltip";
import { CurveLegend } from "@/components/charts/curve-legend";
import { NumericTick } from "@/components/charts/numeric-tick";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { DataPanel } from "@/components/patterns/data-panel";
import { BarChart3 } from "lucide-react";

interface CollectionCurveChartProps {
  curves: BatchCurve[];
  /** Ref for capturing current chart state (view save flow) */
  chartSnapshotRef?: React.MutableRefObject<(() => CollectionCurveDefinition) | null>;
  /** Ref for restoring chart state (view load flow) */
  chartLoadRef?: React.MutableRefObject<((state: CollectionCurveDefinition) => void) | null>;
  /**
   * Phase 36.x — rendered at the front of the DataPanel actions slot so the
   * chart-type segmented control (curves/line/scatter/bar) is visible even on
   * the preset branch. Lets users swap to a generic chart without opening the
   * Presets menu.
   */
  chartTypeSelector?: React.ReactNode;
  /**
   * Rendered alongside the metric-toggle cluster in the DataPanel actions slot.
   * Keeps the Presets ▾ menu reachable from the preset branch per
   * 36-RESEARCH Open Q #4.
   */
  presetMenu?: React.ReactNode;
  /**
   * Phase 39 PCFG-07 — when set, enables the optional split-by-segment toggle.
   * The toggle only renders when the active pair has segments configured. When
   * `pair` is null (root-level / cross-partner view) the toggle never appears.
   */
  pair?: PartnerProductPair | null;
  /**
   * Phase 39 PCFG-07 — pair-filtered typed rows used to compute per-segment
   * curves when the split toggle is on. Required when `pair` is non-null.
   * Sourced from `usePartnerStats(pair).rawRows` in the parent.
   *
   * Phase 43 BND-02: typed as `BatchRow[]`.
   */
  rawRows?: import('@/lib/data/types').BatchRow[];
  /**
   * Phase 40.1 PRJ-09 — drill level from the parent. Gates projection
   * visibility together with `baselineMode` and `visibleBatchKeys.length`.
   * Default `'root'` so missing-prop callers never accidentally render
   * dashed projection lines. See `projectionScopeAllows` in the inner
   * component for the predicate logic.
   */
  drillLevel?: DrillLevel;
  /**
   * Phase 40.1 PRJ-09 / PRJ-13 — baseline mode from the panel-level
   * BaselineSelector. Gates projection visibility on partner-aggregate views
   * (batch-level is decoupled per RESEARCH § Pitfall 7 Option 2). Default
   * `'rolling'` so missing-prop callers don't accidentally render projections
   * on aggregate scopes.
   */
  baselineMode?: BaselineMode;
}

export function CollectionCurveChart({ curves, chartSnapshotRef, chartLoadRef, chartTypeSelector, presetMenu, pair, rawRows, drillLevel = 'root', baselineMode = 'rolling' }: CollectionCurveChartProps) {
  // Phase 39 PCFG-07 — segment-split state. Independent per-view (the KPI
  // block has its own toggle). Hidden entirely when the active pair has no
  // configured segments — preserves zero-regression behavior for the
  // pair-rolled-up default.
  const partnerConfig = usePartnerConfigContext();
  const segments = useMemo(
    () => (pair ? partnerConfig.getConfig(pair)?.segments ?? [] : []),
    [pair, partnerConfig],
  );
  const segmentToggleAvailable = segments.length > 0;
  const [splitBySegmentRaw, setSplitBySegment] = useState(false);
  // Derive effective split state — if segments aren't available, force false
  // even when local state still says true (handles the edge case where the
  // user opened Setup mid-session and removed segments). Avoids a reset
  // useEffect (which trips react-hooks/set-state-in-effect lint rule).
  const splitBySegment = segmentToggleAvailable && splitBySegmentRaw;

  // Phase 39 PCFG-07 — when split mode is on, replace the per-batch curves
  // with one synthetic curve per segment (dollar-weighted average over the
  // segment's batches). Reuses the entire downstream chart pipeline by feeding
  // BatchCurve[]-shaped records through. Other-bucket curves only appear when
  // uncovered rows exist.
  const effectiveCurves = useMemo<BatchCurve[]>(() => {
    if (!splitBySegment || !segmentToggleAvailable || !rawRows) return curves;
    const segCurves = averageCurvesPerSegment(rawRows, segments);
    return segCurves
      .filter((s) => s.curve.points.length > 0)
      .map((s) => s.curve);
  }, [splitBySegment, segmentToggleAvailable, rawRows, segments, curves]);

  return (
    <CollectionCurveChartInner
      curves={effectiveCurves}
      chartSnapshotRef={chartSnapshotRef}
      chartLoadRef={chartLoadRef}
      chartTypeSelector={chartTypeSelector}
      presetMenu={presetMenu}
      drillLevel={drillLevel}
      baselineMode={baselineMode}
      segmentToggle={
        segmentToggleAvailable ? (
          <label className="flex items-center gap-2 text-label text-muted-foreground">
            <Switch
              size="sm"
              checked={splitBySegment}
              onCheckedChange={setSplitBySegment}
              aria-label="Split by segment"
            />
            <span>Split by segment</span>
          </label>
        ) : null
      }
    />
  );
}

interface CollectionCurveChartInnerProps {
  curves: BatchCurve[];
  chartSnapshotRef?: React.MutableRefObject<(() => CollectionCurveDefinition) | null>;
  chartLoadRef?: React.MutableRefObject<((state: CollectionCurveDefinition) => void) | null>;
  chartTypeSelector?: React.ReactNode;
  presetMenu?: React.ReactNode;
  segmentToggle?: React.ReactNode;
  /** Phase 40.1 PRJ-09 — gates projection <Line> visibility (see predicate). */
  drillLevel: DrillLevel;
  /** Phase 40.1 PRJ-09 / PRJ-13 — partner-level scope gate for projection. */
  baselineMode: BaselineMode;
}

function CollectionCurveChartInner({ curves, chartSnapshotRef, chartLoadRef, chartTypeSelector, presetMenu, segmentToggle, drillLevel, baselineMode }: CollectionCurveChartInnerProps) {
  // Find batch anomalies for the partner whose curves we're displaying.
  // Match by batchName overlap between curves and anomaly data.
  const { partnerAnomalies } = useAnomalyContext();
  const batchAnomalies = useMemo(() => {
    if (curves.length === 0) return undefined;
    const curveNames = new Set(curves.map((c) => c.batchName));
    for (const [, partner] of partnerAnomalies) {
      const match = partner.batches.some((b) => curveNames.has(b.batchName));
      if (match) return partner.batches;
    }
    return undefined;
  }, [curves, partnerAnomalies]);

  const {
    metric,
    soloedBatch,
    showAverage,
    showAllBatches,
    sortedCurves,
    newestBatchKey,
    visibleBatchKeys,
    defaultVisibleKeys,
    hiddenBatches,
    toggleMetric,
    handleLineClick,
    toggleBatchVisibility,
    toggleAverage,
    toggleShowAll,
    getLineOpacity,
    getLineStrokeWidth,
    getAnomalyLineColor,
    getChartSnapshot,
    restoreChartState,
  } = useCurveChartState(curves, batchAnomalies);

  // Wire snapshot/restore refs for view save/load
  useEffect(() => {
    if (chartSnapshotRef) chartSnapshotRef.current = getChartSnapshot;
    if (chartLoadRef) chartLoadRef.current = restoreChartState;
  }, [chartSnapshotRef, chartLoadRef, getChartSnapshot, restoreChartState]);

  // Phase 40.1 PRJ-09 — projection visibility scope gate.
  //
  // Batch-level drill ALWAYS shows projections (drilling into a batch is an
  // intentional inspection act — RESEARCH § Pitfall 7 Option 2 decouples
  // batch-level from baselineMode). Partner-level requires BOTH modeled mode
  // AND single-batch focus to keep aggregates legible (CONTEXT § Phase
  // Boundary issue 1: 8-20 dashed siblings on partner-aggregate = unreadable).
  //
  // Disambiguation: CONTEXT trigger-table (line 36) reads `drillState.level
  // === 'batch' OR visibleBatchCount === 1` with no baselineMode qualifier on
  // the partner-level row. The plan implements the more restrictive
  // `baselineMode === 'modeled' AND single batch` predicate at partner-level
  // per RESEARCH § Pitfall 7 Option 2 — RESEARCH supersedes the more
  // permissive CONTEXT-table reading because the unification phrase ("modeled
  // mode affects chart + KPIs + table together") implies a mode gate on the
  // partner-aggregate level. Without it, a user in rolling-mode would still
  // see one dashed line whenever they narrowed the legend, contradicting the
  // unified-mental-model contract.
  const projectionScopeAllows =
    drillLevel === 'batch' ||
    (drillLevel === 'partner' && baselineMode === 'modeled' && visibleBatchKeys.length === 1);

  // Phase 40.1 PRJ-10 — coverage-absent caption gate.
  //
  // When the scope predicate says "should render projection" but the focused
  // batch has no projection coverage, show a small caption in the actions
  // slot (mirrors the KPI baseline-absent recipe at kpi-summary-cards.tsx:460).
  // The "focused" batch is sortedCurves[0] at batch-level (single curve in)
  // or visibleBatchKeys[0] at partner-level narrowed-to-one.
  const focusedHasProjection = (() => {
    if (!projectionScopeAllows) return true; // gate hides projection anyway; no caption needed
    if (drillLevel === 'batch') {
      return sortedCurves.some((c) => c.projection && c.projection.length > 0);
    }
    // partner-level narrowed to one
    const idx = parseInt(visibleBatchKeys[0]?.replace('batch_', '') ?? '-1', 10);
    return Boolean(sortedCurves[idx]?.projection?.length);
  })();
  const showCoverageAbsent = projectionScopeAllows && !focusedHasProjection;

  // Phase 38 CHT-01: derive the user-visible subset of curves. visibleBatchKeys
  // is positional ("batch_0", "batch_1", ...) against sortedCurves index order.
  // maxAge, the partner-average, and the pivot-month clipping ALL key off this
  // subset so the x-axis domain + avg line stay inside currently-displayed
  // vintages and don't overshoot into empty future-age whitespace.
  const visibleCurves = useMemo(() => {
    const visibleSet = new Set(visibleBatchKeys);
    return sortedCurves.filter((_, i) => visibleSet.has(`batch_${i}`));
  }, [sortedCurves, visibleBatchKeys]);

  // Limit x-axis ticks to the oldest CURRENTLY-DISPLAYED batch's age so the
  // chart doesn't stretch into empty space on the right.
  const maxAge = Math.max(...visibleCurves.map((c) => c.ageInMonths), 1);
  const collectionMonthsTicks = COLLECTION_MONTHS.filter((m) => m <= maxAge);

  // Pivot data for Recharts flat format. Pivot is keyed to ALL sortedCurves
  // so Line components (rendered from sortedCurves.map) can continue to toggle
  // via the `hide` prop and keep stable `batch_${i}` references.
  const { data: pivotedRaw, keyMap } = useMemo(
    () => pivotCurveData(sortedCurves, metric),
    [sortedCurves, metric],
  );

  // Optionally add the partner-average series scoped to the currently-visible
  // batch keys only, then clip the dataset to maxAge so the avg line stops at
  // the oldest visible vintage (no phantom tail past visible data).
  const pivotedData = useMemo(() => {
    const withAvg = showAverage
      ? pivotedRaw.map<PivotedPoint>((point) => {
          let sum = 0;
          let count = 0;
          for (const key of visibleBatchKeys) {
            const val = point[key];
            if (val !== undefined) {
              sum += val;
              count += 1;
            }
          }
          return { ...point, __avg__: count > 0 ? sum / count : undefined };
        })
      : pivotedRaw;
    return withAvg.filter((p) => p.month <= maxAge);
  }, [pivotedRaw, showAverage, visibleBatchKeys, maxAge]);

  // Build ChartConfig for shadcn ChartContainer
  const chartConfig = useMemo(() => {
    const cfg: ChartConfig = {};
    sortedCurves.forEach((curve, i) => {
      const key = `batch_${i}`;
      cfg[key] = {
        label: curve.batchName,
        color: CHART_COLORS[i % CHART_COLORS.length],
      };
    });
    if (showAverage) {
      cfg.__avg__ = {
        label: "Partner Average",
        color: "var(--muted-foreground)",
      };
    }
    return cfg;
  }, [sortedCurves, showAverage]);

  // Track which line the mouse is closest to (by Y position).
  // Two mechanisms: (1) activeDot onMouseEnter for direct hits,
  // (2) chart onMouseMove with clientY for proximity detection.
  const [hoveredLineKey, setHoveredLineKey] = useState<string | null>(null);
  const chartWrapperRef = useRef<HTMLDivElement>(null);

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const handleChartMouseMove = useCallback(
    (_state: any, event: React.MouseEvent) => {
      const wrapper = chartWrapperRef.current;
      if (!wrapper || !event) return;

      // Use activeTooltipIndex to find the data point at the hovered X
      const idx = _state?.activeTooltipIndex;
      if (idx == null || idx < 0 || idx >= pivotedData.length) return;

      const dataPoint = pivotedData[idx];
      if (!dataPoint) return;

      // Get mouse Y relative to chart wrapper
      const rect = wrapper.getBoundingClientRect();
      const mouseY = event.clientY - rect.top;
      const chartHeight = rect.height;

      // Phase 38 CHT-02: include the partner-average series in proximity
      // candidates when it's visible, so hovering near the avg line surfaces
      // its tooltip entry alongside batch lines. __avg__ is not in
      // visibleBatchKeys (that set tracks user-selected batch curves only).
      const keysForProximity = showAverage
        ? [...visibleBatchKeys, "__avg__"]
        : visibleBatchKeys;

      // Collect all visible line values at this data point.
      const entries = keysForProximity
        .map((key) => ({ key, value: dataPoint[key] as number | undefined }))
        .filter((e): e is { key: string; value: number } => e.value != null);

      if (entries.length === 0) return;

      // Y axis: top of wrapper ≈ max value, bottom ≈ 0 (inverted)
      const values = entries.map((e) => e.value);
      const maxVal = Math.max(...values);
      const minVal = Math.min(0, ...values);
      const range = maxVal - minVal || 1;

      // Convert mouse Y ratio to approximate data value
      const mouseValue = maxVal - (mouseY / chartHeight) * range;

      // Find the entry whose value is closest to the mouse position
      let closest = entries[0];
      let closestDist = Math.abs(entries[0].value - mouseValue);
      for (const e of entries) {
        const dist = Math.abs(e.value - mouseValue);
        if (dist < closestDist) {
          closest = e;
          closestDist = dist;
        }
      }
      setHoveredLineKey(closest.key);
    },
    [visibleBatchKeys, pivotedData, showAverage],
  );
  /* eslint-enable @typescript-eslint/no-explicit-any */

  const handleChartMouseLeave = useCallback(() => {
    setHoveredLineKey(null);
  }, []);

  // Empty state: no curves at all
  // TODO(29-03): consider replacing empty body with <EmptyState variant="no-data" />
  // once Plan 29-03 ships. Not imported here to keep waves parallel.
  if (curves.length === 0) {
    return (
      <DataPanel title="Collection Curves">
        <div className="flex h-[clamp(180px,24vh,280px)] w-full flex-col items-center justify-center gap-2 text-muted-foreground">
          <BarChart3 className="h-10 w-10 opacity-30" />
          <p className="text-body">No collection curve data available</p>
        </div>
      </DataPanel>
    );
  }

  // Metric-toggle cluster drives the UI-04 view switch. Toggling between
  // Recovery Rate % and Dollars Collected updates the chart data, Y-axis
  // formatting, and tooltip values reactively via `metric` state in
  // useCurveChartState. Flows through DataPanel's actions slot.
  return (
    <DataPanel
      title="Collection Curves"
      contentClassName="space-y-2"
      actions={
        <div className="flex items-center gap-inline">
          {chartTypeSelector ?? null}
          <div className="flex gap-1">
            <Button
              variant={metric === "recoveryRate" ? "default" : "outline"}
              size="sm"
              className="h-7"
              onClick={metric === "recoveryRate" ? undefined : toggleMetric}
            >
              Recovery Rate %
            </Button>
            <Button
              variant={metric === "amount" ? "default" : "outline"}
              size="sm"
              className="h-7"
              onClick={metric === "amount" ? undefined : toggleMetric}
            >
              Dollars Collected
            </Button>
          </div>
          {/* Phase 39 PCFG-07 — split-by-segment toggle. Only rendered when
              the active pair has segments configured. Independent from the
              KPI block's toggle (per-view local state). */}
          {segmentToggle ?? null}
          {presetMenu ?? null}
          {/* Phase 40.1 PRJ-10 — coverage-absent caption. Renders in the
              actions slot when the scope predicate allows projection but the
              focused batch has no projection coverage. Mirrors the KPI
              baseline-absent recipe (kpi-summary-cards.tsx:460). */}
          {showCoverageAbsent && (
            <p className="text-caption text-muted-foreground">
              No modeled curve for this batch
            </p>
          )}
        </div>
      }
    >
      {/* Chart + Legend layout */}
      <div className="flex gap-4">
        {/* Chart area */}
        <div className="flex-1 flex flex-col" ref={chartWrapperRef}>
          <ChartContainer
            config={chartConfig}
            className="h-[clamp(180px,24vh,280px)] w-full"
            role="img"
            aria-label={`Collection curves: recovery rate over months on book across ${sortedCurves.length} ${sortedCurves.length === 1 ? 'batch' : 'batches'}. Sibling data table provides the same data in accessible tabular form.`}
          >
            <LineChart data={pivotedData} margin={{ top: 5, right: 10, bottom: 5, left: 10 }} onMouseMove={handleChartMouseMove} onMouseLeave={handleChartMouseLeave}>
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-muted"
              />
              <XAxis
                type="number"
                dataKey="month"
                ticks={collectionMonthsTicks}
                domain={[1, maxAge]}
                tickFormatter={(m: number) => `${m}`}
                tick={<NumericTick />}
                height={40}
                label={{
                  value: 'Months Since Placement',
                  position: 'insideBottom',
                  offset: 0,
                  style: { fontSize: 11, fill: 'var(--muted-foreground)', textAnchor: 'middle' },
                }}
              />
              <YAxis
                tickFormatter={
                  metric === "recoveryRate"
                    ? (v: number) => `${v}%`
                    : (v: number) =>
                        v >= 1_000
                          ? `$${(v / 1_000).toFixed(0)}k`
                          : `$${v}`
                }
                width={55}
                tick={<NumericTick anchor="end" dy={4} />}
                label={{ value: metric === "recoveryRate" ? "Recovery Rate %" : "Dollars Collected", angle: -90, position: "insideLeft", offset: 5, style: { fontSize: 11, fill: 'var(--muted-foreground)' } }}
              />
              <Tooltip
                content={(props) => (
                  <CurveTooltip
                    {...props}
                    keyMap={keyMap}
                    metric={metric}
                    batchAnomalies={batchAnomalies}
                    soloedBatch={soloedBatch}
                    hoveredLineKey={hoveredLineKey}
                  />
                )}
              />
              {/* One Line per batch -- use hide prop, not conditional rendering.
                  Phase 40 PRJ-01/03: when curve.projection exists, render a sibling
                  dashed <Line> in the same hue at 60% opacity. Hide-coupled to the
                  actual line (Pattern 5 — toggling actual hides modeled too).
                  isAnimationActive={false} on projection avoids Pitfall 3 re-animation
                  when the second query resolves after actuals have already rendered. */}
              {sortedCurves.map((curve, i) => {
                const key = `batch_${i}`;
                const projKey = `${key}__projected`;
                const anomalyColor = getAnomalyLineColor(key);
                const baseColor = anomalyColor ?? CHART_COLORS[i % CHART_COLORS.length];
                const isVisible = visibleBatchKeys.includes(key);
                const hasProjection =
                  curve.projection !== undefined && curve.projection.length > 0;
                return (
                  <Fragment key={key}>
                    <Line
                      dataKey={key}
                      type="monotone"
                      stroke={baseColor}
                      strokeWidth={getLineStrokeWidth(key)}
                      strokeOpacity={getLineOpacity(key)}
                      dot={false}
                      activeDot={{
                        r: 5,
                        onMouseEnter: () => setHoveredLineKey(key),
                        onClick: () => handleLineClick(key),
                        cursor: "pointer",
                      }}
                      hide={!isVisible}
                      connectNulls={false}
                      isAnimationActive={true}
                      animationDuration={1000}
                      animationEasing="ease-in-out"
                    />
                    {hasProjection && (
                      <Line
                        dataKey={projKey}
                        type="monotone"
                        stroke={baseColor}
                        strokeDasharray="6 3"
                        strokeOpacity={0.6}
                        strokeWidth={1.5}
                        dot={false}
                        // Phase 40.1 PRJ-09 — second gate stacked on the
                        // existing legend-visibility gate. projectionScopeAllows
                        // false on partner-aggregate multi-batch views (kills
                        // 8-20 dashed siblings); always true on batch-level.
                        hide={!isVisible || !projectionScopeAllows}
                        connectNulls={false}
                        isAnimationActive={false}
                      />
                    )}
                  </Fragment>
                );
              })}
              {/* Average reference line */}
              {showAverage && (
                <Line
                  dataKey="__avg__"
                  stroke="var(--muted-foreground)"
                  strokeDasharray="6 3"
                  strokeWidth={1.5}
                  dot={false}
                  name="Partner Average"
                  connectNulls={false}
                  isAnimationActive={true}
                />
              )}
            </LineChart>
          </ChartContainer>
        </div>

        {/* Right-side legend */}
        <CurveLegend
          keyMap={keyMap}
          visibleBatchKeys={visibleBatchKeys}
          defaultVisibleKeys={defaultVisibleKeys}
          hiddenBatches={hiddenBatches}
          newestBatchKey={newestBatchKey}
          showAverage={showAverage}
          showAllBatches={showAllBatches}
          totalBatchCount={sortedCurves.length}
          onToggleBatch={toggleBatchVisibility}
          onToggleAverage={toggleAverage}
          onToggleShowAll={toggleShowAll}
        />
      </div>
    </DataPanel>
  );
}
