"use client";

import type { BatchKeyMap } from "@/components/charts/pivot-curve-data";
import type { BatchAnomaly } from "@/types/partner-stats";
import { getMetricLabel, formatDeviation } from "@/lib/formatting/anomaly-labels";
import { composeBatchTooltipRow } from "@/components/charts/compose-batch-tooltip-row";

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

  // Priority: soloedBatch (clicked) > hoveredLineKey (nearest to cursor) > first entry.
  // Phase 40 lock: proximity targets the actual line key — never the
  // __projected sibling (Pitfall 5: keep one tooltip-target per batch). The
  // modeled value is composed onto the same row below.
  const isProjectedTarget = (k: string | null | undefined): boolean =>
    typeof k === "string" && k.endsWith("__projected");
  const safeHovered = isProjectedTarget(hoveredLineKey)
    ? (hoveredLineKey as string).replace(/__projected$/, "")
    : hoveredLineKey ?? null;
  const targetKey = soloedBatch ?? safeHovered;

  const entry = targetKey
    ? payload.filter((p) => String(p.dataKey) === targetKey).find(
        (p) => p.value !== undefined && p.value !== null,
      )
    : payload.find(
        (p) => p.value !== undefined && p.value !== null
          // Don't pick a __projected entry as the tooltip target — composing
          // happens below from the actual entry.
          && !String(p.dataKey).endsWith("__projected"),
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

  // Phase 40 PRJ-03: when the hovered batch has a __projected value at this
  // month, render a "Modeled" sub-line with delta-vs-actual. Partner-average
  // (__avg__) row is unchanged — no modeled companion (CONTEXT lock).
  const projectedValue = !isAvg
    ? (() => {
        // Find the __projected sibling for THIS batch in the payload.
        const projKey = `${entryKey}__projected`;
        const projEntry = payload.find(
          (p) => String(p.dataKey) === projKey && p.value !== undefined && p.value !== null,
        );
        return projEntry ? Number(projEntry.value) : null;
      })()
    : null;

  // Compose modeled-row data via the pure helper. The chart's `metric` axis
  // is "recoveryRate" | "amount"; for polarity coloring we use a known
  // higher_is_better key (collection rate). Phase 40 v1 chart is rate-only;
  // amount path stays delta-suppressed per CONTEXT Deferred Ideas.
  const modeledRow = projectedValue != null && metric === "recoveryRate"
    ? composeBatchTooltipRow(
        Number(entry.value),
        projectedValue,
        // Recovery rate: higher is better → positive delta = beat the model.
        "COLLECTION_AFTER_6_MONTH",
      )
    : null;

  return (
    <div className="rounded-lg bg-surface-overlay shadow-elevation-overlay px-3 py-2 text-body text-popover-foreground">
      <p className="text-title">{displayName}</p>
      <p className="text-body-numeric text-muted-foreground">
        {formatValue(entry.value, metric)} at Month {label}
      </p>
      {modeledRow && modeledRow.modeled != null && (
        <p className="mt-0.5 flex items-baseline gap-2 text-caption text-muted-foreground">
          <span className="text-label uppercase">Modeled</span>
          <span className="text-body-numeric">
            {formatValue(modeledRow.modeled, metric)}
          </span>
          {modeledRow.deltaPercent != null && (
            <span
              className={
                "text-caption " +
                (modeledRow.direction === "positive"
                  ? "text-emerald-500"
                  : modeledRow.direction === "negative"
                    ? "text-red-500"
                    : "text-muted-foreground")
              }
            >
              {modeledRow.deltaPercent > 0 ? "+" : ""}
              {modeledRow.deltaPercent.toFixed(1)}%
            </span>
          )}
        </p>
      )}
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
