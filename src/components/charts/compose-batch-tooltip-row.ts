/**
 * Phase 40 PRJ-03 — pure helper that composes the per-batch tooltip row data:
 * actual value + optional modeled value + signed delta-vs-modeled.
 *
 * Extracted from `curve-tooltip.tsx` so the math (delta sign + suppression) is
 * smoke-testable without rendering React. Callers turn the resulting shape
 * into JSX with type tokens for layout.
 *
 * Locks (from CONTEXT/PLAN):
 * - Delta = ((actual - modeled) / modeled) * 100  → "tracking vs the model"
 * - Suppress delta when modeled === 0 (avoids divide-by-zero / Infinity).
 * - Suppress delta when modeled or actual is non-finite.
 * - Polarity-aware direction: 'higher_is_better' metrics → up = good.
 */

import type { MetricPolarity } from "../../lib/computation/metric-polarity.ts";
import { getPolarity } from "../../lib/computation/metric-polarity.ts";

export interface BatchTooltipRowComposition {
  /** Actual value at this month (always present when this helper is called). */
  actual: number;
  /** Modeled value at this month, when modeled coverage exists. */
  modeled: number | null;
  /**
   * Signed delta percent vs modeled. `null` when:
   *  - no modeled value
   *  - modeled === 0 (divide-by-zero)
   *  - either input is non-finite
   */
  deltaPercent: number | null;
  /**
   * Polarity-aware direction tag:
   *  - 'positive': delta is favorable (higher than model when higher_is_better, etc.)
   *  - 'negative': delta is unfavorable
   *  - 'flat': delta within ±0.1pp (tiny differences read as flat)
   *  - null: when deltaPercent is null
   */
  direction: "positive" | "negative" | "flat" | null;
}

/** Threshold (in percentage points of delta) below which a delta reads as flat. */
const FLAT_THRESHOLD = 0.1;

/**
 * Compose a tooltip row for a single batch at the hovered month.
 *
 * @param actual    actual value at hovered month (e.g., recoveryRate %)
 * @param modeled   modeled value at hovered month, or undefined/null when absent
 * @param metric    semantic metric key for polarity lookup (e.g.,
 *                  "COLLECTION_AFTER_6_MONTH"). The chart's "metric" axis is
 *                  recoveryRate vs amount, but tooltip coloring follows the
 *                  underlying business polarity. Pass a higher_is_better metric
 *                  for the v1 recovery-rate chart.
 */
export function composeBatchTooltipRow(
  actual: number,
  modeled: number | null | undefined,
  metric: string,
): BatchTooltipRowComposition {
  // No modeled coverage at this month → actual-only row.
  if (modeled == null || !Number.isFinite(modeled) || !Number.isFinite(actual)) {
    return {
      actual,
      modeled: modeled == null || !Number.isFinite(modeled) ? null : modeled,
      deltaPercent: null,
      direction: null,
    };
  }

  // Divide-by-zero guard — a modeled value of exactly 0 is plausible at month 1
  // for some metrics; suppress the delta rather than emitting Infinity%.
  if (modeled === 0) {
    return { actual, modeled, deltaPercent: null, direction: null };
  }

  const deltaPercent = ((actual - modeled) / modeled) * 100;

  // Polarity-aware direction: for higher_is_better metrics, positive delta is
  // good (we beat the model). For lower_is_better, the inverse.
  const polarity: MetricPolarity = getPolarity(metric);
  let direction: BatchTooltipRowComposition["direction"];
  if (Math.abs(deltaPercent) < FLAT_THRESHOLD) {
    direction = "flat";
  } else if (polarity === "higher_is_better") {
    direction = deltaPercent > 0 ? "positive" : "negative";
  } else {
    direction = deltaPercent > 0 ? "negative" : "positive";
  }

  return { actual, modeled, deltaPercent, direction };
}

/**
 * Format a delta percent for display: "+5.2%", "-3.1%", "0.0%".
 * Returns "—" when delta is null (caller should typically suppress the segment
 * entirely instead of showing a placeholder).
 */
export function formatDeltaPercent(deltaPercent: number | null): string {
  if (deltaPercent == null || !Number.isFinite(deltaPercent)) return "—";
  const sign = deltaPercent > 0 ? "+" : "";
  return `${sign}${deltaPercent.toFixed(1)}%`;
}
