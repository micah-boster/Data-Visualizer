"use client";

import React, { useMemo, useState, useCallback, useRef, useEffect } from "react";
import type { ChartViewState } from "@/lib/views/types";
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
import { useAnomalyContext } from "@/contexts/anomaly-provider";
import { COLLECTION_MONTHS } from "@/lib/computation/reshape-curves";
import {
  pivotCurveData,
  addAverageSeries,
} from "@/components/charts/pivot-curve-data";
import { useCurveChartState } from "@/components/charts/use-curve-chart-state";
import { CurveTooltip, CHART_COLORS } from "@/components/charts/curve-tooltip";
import { CurveLegend } from "@/components/charts/curve-legend";
import { NumericTick } from "@/components/charts/numeric-tick";
import { Button } from "@/components/ui/button";
import { BarChart3 } from "lucide-react";

interface CollectionCurveChartProps {
  curves: BatchCurve[];
  /** Ref for capturing current chart state (view save flow) */
  chartSnapshotRef?: React.MutableRefObject<(() => ChartViewState) | null>;
  /** Ref for restoring chart state (view load flow) */
  chartLoadRef?: React.MutableRefObject<((state: ChartViewState) => void) | null>;
}

export function CollectionCurveChart({ curves, chartSnapshotRef, chartLoadRef }: CollectionCurveChartProps) {
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

  // Pivot data for Recharts flat format
  const { data: pivotedRaw, keyMap } = useMemo(
    () => pivotCurveData(sortedCurves, metric),
    [sortedCurves, metric],
  );

  // Optionally add average series
  const pivotedData = useMemo(
    () =>
      showAverage
        ? addAverageSeries(pivotedRaw, sortedCurves)
        : pivotedRaw,
    [pivotedRaw, showAverage, sortedCurves],
  );

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

      // Collect all visible line values at this data point
      const entries = visibleBatchKeys
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
    [visibleBatchKeys, pivotedData],
  );
  /* eslint-enable @typescript-eslint/no-explicit-any */

  const handleChartMouseLeave = useCallback(() => {
    setHoveredLineKey(null);
  }, []);

  // Empty state: no curves at all
  if (curves.length === 0) {
    return (
      <div className="flex h-[40vh] w-full flex-col items-center justify-center gap-2 text-muted-foreground">
        <BarChart3 className="h-10 w-10 opacity-30" />
        <p className="text-body">No collection curve data available</p>
      </div>
    );
  }

  // Limit x-axis ticks to the oldest batch's age so the chart doesn't
  // stretch into empty space on the right.
  const maxAge = Math.max(...sortedCurves.map((c) => c.ageInMonths), 1);
  const collectionMonthsTicks = COLLECTION_MONTHS.filter((m) => m <= maxAge);

  return (
    <div className="w-full space-y-2">
      {/* Header with metric toggle — this IS the metric view switch (UI-04).
          Toggling between Recovery Rate % and Dollars Collected updates the
          chart data, Y-axis formatting, and tooltip values reactively via
          the `metric` state in useCurveChartState. */}
      <div className="flex items-center justify-between">
        <h3 className="text-title text-muted-foreground">
          Collection Curves
        </h3>
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
      </div>

      {/* Chart + Legend layout */}
      <div className="flex gap-4">
        {/* Chart area */}
        <div className="flex-1 flex flex-col" ref={chartWrapperRef}>
          <ChartContainer config={chartConfig} className="h-[40vh] w-full">
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
              {/* One Line per batch -- use hide prop, not conditional rendering */}
              {sortedCurves.map((_, i) => {
                const key = `batch_${i}`;
                const anomalyColor = getAnomalyLineColor(key);
                return (
                  <Line
                    key={key}
                    dataKey={key}
                    type="monotone"
                    stroke={anomalyColor ?? CHART_COLORS[i % CHART_COLORS.length]}
                    strokeWidth={getLineStrokeWidth(key)}
                    strokeOpacity={getLineOpacity(key)}
                    dot={false}
                    activeDot={{
                      r: 5,
                      onMouseEnter: () => setHoveredLineKey(key),
                      onClick: () => handleLineClick(key),
                      cursor: "pointer",
                    }}
                    hide={!visibleBatchKeys.includes(key)}
                    connectNulls={false}
                    isAnimationActive={true}
                    animationDuration={1000}
                    animationEasing="ease-in-out"
                  />
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
          <p className="text-center text-caption text-muted-foreground -mt-1">Months Since Placement</p>
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
    </div>
  );
}
