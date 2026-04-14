"use client";

import { useMemo } from "react";
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
import type { BatchCurve, BatchAnomaly } from "@/types/partner-stats";
import { useAnomalyContext } from "@/contexts/anomaly-provider";
import { COLLECTION_MONTHS } from "@/lib/computation/reshape-curves";
import {
  pivotCurveData,
  addAverageSeries,
} from "@/components/charts/pivot-curve-data";
import { useCurveChartState } from "@/components/charts/use-curve-chart-state";
import { CurveTooltip, CHART_COLORS } from "@/components/charts/curve-tooltip";
import { CurveLegend } from "@/components/charts/curve-legend";
import { Button } from "@/components/ui/button";
import { BarChart3 } from "lucide-react";

interface CollectionCurveChartProps {
  curves: BatchCurve[];
}

export function CollectionCurveChart({ curves }: CollectionCurveChartProps) {
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
  } = useCurveChartState(curves, batchAnomalies);

  // Pivot data for Recharts flat format
  const { data: pivotedRaw, keyMap } = useMemo(
    () => pivotCurveData(sortedCurves, metric),
    [sortedCurves, metric],
  );

  // Optionally add average series
  const pivotedData = useMemo(
    () =>
      showAverage
        ? addAverageSeries(pivotedRaw, sortedCurves, metric)
        : pivotedRaw,
    [pivotedRaw, showAverage, sortedCurves, metric],
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

  // Empty state: no curves at all
  if (curves.length === 0) {
    return (
      <div className="flex h-[40vh] w-full flex-col items-center justify-center gap-2 text-muted-foreground">
        <BarChart3 className="h-10 w-10 opacity-30" />
        <p className="text-sm">No collection curve data available</p>
      </div>
    );
  }

  const collectionMonthsTicks = [...COLLECTION_MONTHS];

  return (
    <div className="w-full space-y-2">
      {/* Header with metric toggle */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">
          Collection Curves
        </h3>
        <div className="flex gap-1">
          <Button
            variant={metric === "recoveryRate" ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs"
            onClick={metric === "recoveryRate" ? undefined : toggleMetric}
          >
            Recovery Rate %
          </Button>
          <Button
            variant={metric === "amount" ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs"
            onClick={metric === "amount" ? undefined : toggleMetric}
          >
            Dollars Collected
          </Button>
        </div>
      </div>

      {/* Chart + Legend layout */}
      <div className="flex gap-4">
        {/* Chart area */}
        <div className="flex-1 flex flex-col">
          <ChartContainer config={chartConfig} className="h-[40vh] w-full">
            <LineChart data={pivotedData} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-muted"
              />
              <XAxis
                type="number"
                dataKey="month"
                ticks={collectionMonthsTicks}
                domain={[1, "dataMax"]}
                tickFormatter={(m: number) => `${m}`}
                className="text-[10px]"
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
                label={{ value: metric === "recoveryRate" ? "Recovery Rate %" : "Dollars Collected", angle: -90, position: "insideLeft", offset: 5, className: "fill-muted-foreground text-[11px]" }}
              />
              <Tooltip
                content={
                  <CurveTooltip keyMap={keyMap} metric={metric} batchAnomalies={batchAnomalies} soloedBatch={soloedBatch} />
                }
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
                      r: 4,
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
          <p className="text-center text-[11px] text-muted-foreground -mt-1">Months Since Placement</p>
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
