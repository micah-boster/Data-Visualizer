"use client";

import type { BatchKeyMap } from "@/components/charts/pivot-curve-data";

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
}: CurveTooltipProps) {
  if (!active || !payload || payload.length === 0 || label === undefined) {
    return null;
  }

  // Find the first entry with a defined value
  const entry = payload.find(
    (p) => p.value !== undefined && p.value !== null,
  );
  if (!entry || entry.value === undefined) return null;

  const isAvg = entry.dataKey === "__avg__";
  const displayName = isAvg
    ? "Partner Average"
    : keyMap.get(entry.dataKey ?? "") ?? entry.dataKey ?? "Unknown";

  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md">
      <p className="font-medium">{displayName}</p>
      <p className="text-muted-foreground">
        {formatValue(entry.value, metric)} at Month {label}
      </p>
    </div>
  );
}

export { CHART_COLORS };
