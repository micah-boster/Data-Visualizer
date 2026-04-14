"use client";

import type { BatchKeyMap } from "@/components/charts/pivot-curve-data";
import type { BatchAnomaly } from "@/types/partner-stats";
import { getMetricLabel, formatDeviation } from "@/lib/formatting/anomaly-labels";

/** Chart color array matching the 8 CSS chart variables. */
const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
  "var(--chart-7)",
  "var(--chart-8)",
];

interface CurveTooltipProps {
  active?: boolean;
  payload?: Array<{
    dataKey?: string;
    value?: number;
    color?: string;
  }>;
  label?: number;
  keyMap: BatchKeyMap;
  metric: "recoveryRate" | "amount";
  batchAnomalies?: BatchAnomaly[];
  soloedBatch?: string | null;
}

function formatValue(value: number, metric: "recoveryRate" | "amount"): string {
  if (metric === "recoveryRate") {
    return `${value.toFixed(1)}%`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(1)}k`;
  }
  return `$${value.toLocaleString()}`;
}

export function CurveTooltip({
  active,
  payload,
  label,
  keyMap,
  metric,
  batchAnomalies,
  soloedBatch,
}: CurveTooltipProps) {
  if (!active || !payload || payload.length === 0 || label === undefined) {
    return null;
  }

  // When a batch is soloed, show only that batch's data in the tooltip.
  // Otherwise, fall back to the first entry with a defined value (existing behavior).
  const entry = soloedBatch
    ? payload.filter((p) => p.dataKey === soloedBatch).find(
        (p) => p.value !== undefined && p.value !== null,
      )
    : payload.find(
        (p) => p.value !== undefined && p.value !== null,
      );
  if (!entry || entry.value === undefined) return null;

  const isAvg = entry.dataKey === "__avg__";
  const batchInfo = keyMap.get(entry.dataKey ?? "");
  const displayName = isAvg
    ? "Partner Average"
    : batchInfo ?? entry.dataKey ?? "Unknown";

  // Look up anomaly info for this batch
  const batchName = typeof batchInfo === "object" && batchInfo !== null && "batchName" in batchInfo
    ? (batchInfo as { batchName: string }).batchName
    : typeof batchInfo === "string" ? batchInfo : null;
  const anomaly = batchName && batchAnomalies
    ? batchAnomalies.find((b) => b.batchName === batchName && b.isFlagged)
    : null;

  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md">
      <p className="font-medium">{displayName}</p>
      <p className="text-muted-foreground">
        {formatValue(entry.value, metric)} at Month {label}
      </p>
      {anomaly && anomaly.flags.length > 0 && (
        <p className="mt-1 flex items-center gap-1 text-xs text-red-500">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500" />
          {getMetricLabel(anomaly.flags[0].metric)}{" "}
          {formatDeviation(anomaly.flags[0].zScore, anomaly.flags[0].direction)}
        </p>
      )}
    </div>
  );
}

export { CHART_COLORS };
