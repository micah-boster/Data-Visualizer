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

/* eslint-disable @typescript-eslint/no-explicit-any */
interface CurveTooltipProps {
  active?: boolean;
  payload?: ReadonlyArray<Record<string, any>>;
  label?: string | number;
  keyMap: BatchKeyMap;
  metric: "recoveryRate" | "amount";
  batchAnomalies?: BatchAnomaly[];
  soloedBatch?: string | null;
  hoveredLineKey?: string | null;
  [key: string]: unknown;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

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
  hoveredLineKey,
}: CurveTooltipProps) {
  if (!active || !payload || payload.length === 0 || label === undefined) {
    return null;
  }

  // Priority: soloedBatch (clicked) > hoveredLineKey (nearest to cursor) > first entry
  const targetKey = soloedBatch ?? hoveredLineKey;
  const entry = targetKey
    ? payload.filter((p) => String(p.dataKey) === targetKey).find(
        (p) => p.value !== undefined && p.value !== null,
      )
    : payload.find(
        (p) => p.value !== undefined && p.value !== null,
      );
  if (!entry || entry.value === undefined) return null;

  const entryKey = String(entry.dataKey ?? "");
  const isAvg = entryKey === "__avg__";
  const batchInfo = keyMap.get(entryKey);
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
    <div className="rounded-lg bg-surface-overlay shadow-elevation-overlay px-3 py-2 text-body text-popover-foreground">
      <p className="text-title">{displayName}</p>
      <p className="text-body-numeric text-muted-foreground">
        {formatValue(entry.value, metric)} at Month {label}
      </p>
      {anomaly && anomaly.flags.length > 0 && (
        <p className="mt-1 flex items-center gap-1 text-caption text-red-500">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500" />
          {getMetricLabel(anomaly.flags[0].metric)}{" "}
          {formatDeviation(anomaly.flags[0].zScore, anomaly.flags[0].direction)}
        </p>
      )}
    </div>
  );
}

export { CHART_COLORS };
