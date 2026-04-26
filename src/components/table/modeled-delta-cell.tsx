'use client';

import { getPolarity } from '@/lib/computation/metric-polarity';

/**
 * Sub-threshold (in percentage points). Deltas with |Δ| below this render
 * as flat (gray, "0.0pp"). Rationale: recoveryRate is displayed at 1
 * decimal of precision elsewhere — anything below 0.1pp would be rounding
 * noise, and 0.5pp is a comfortable buffer above that. Consistent with
 * how the chart's modeled overlay positions "near the line" reads.
 */
const FLAT_THRESHOLD = 0.5;

interface ModeledDeltaCellProps {
  /**
   * Signed Δ in percentage points (actual − modeled). Positive means
   * actual exceeds modeled.
   *
   * Scale: 0..100 (NOT 0..1). recoveryRate is stored 0..100 throughout
   * the app per Phase 40 Pitfall 5; this component does NOT divide by
   * 100 before formatting. Pass `(actualPercent - modeledPercent)`
   * already on the 0..100 scale.
   */
  deltaPercent: number;
  /**
   * Snowflake column key for `getPolarity` lookup (e.g.
   * `'COLLECTION_AFTER_6_MONTH'`). Determines whether positive Δ
   * renders green (higher_is_better) or red (lower_is_better).
   */
  metricKey: string;
}

/**
 * Polarity-colored signed Δ cell for the modeled-vs-actual delta column
 * (Phase 40.1 PRJ-11 / Plan 03 table integration).
 *
 * Renders `${sign}${deltaPercent.toFixed(1)}pp` ("pp" = percentage
 * points; the difference of two percentages is in pp, not %, by
 * convention). Color follows the same polarity rule as
 * `TrendIndicator`:
 *
 * - up + higher_is_better OR down + lower_is_better → green (good)
 * - up + lower_is_better OR down + higher_is_better → red (bad)
 * - flat (|Δ| < 0.5pp) → gray
 *
 * No tooltip wrapper by design: a tooltip on every row would be visual
 * noise. Column header carries the explanation instead.
 */
export function ModeledDeltaCell({ deltaPercent, metricKey }: ModeledDeltaCellProps) {
  const direction: 'up' | 'down' | 'flat' =
    deltaPercent > FLAT_THRESHOLD
      ? 'up'
      : deltaPercent < -FLAT_THRESHOLD
        ? 'down'
        : 'flat';

  const polarity = getPolarity(metricKey);
  const isPositive =
    (direction === 'up' && polarity === 'higher_is_better') ||
    (direction === 'down' && polarity === 'lower_is_better');

  let colorClass: string;
  if (direction === 'flat') {
    colorClass = 'text-muted-foreground';
  } else if (isPositive) {
    colorClass = 'text-success-fg';
  } else {
    colorClass = 'text-error-fg';
  }

  // Format flat as "0.0pp" (no sign, regardless of input sign noise).
  let formatted: string;
  if (direction === 'flat') {
    formatted = '0.0pp';
  } else {
    const sign = deltaPercent > 0 ? '+' : '';
    formatted = `${sign}${deltaPercent.toFixed(1)}pp`;
  }

  return (
    <span className={`text-body-numeric ${colorClass}`}>{formatted}</span>
  );
}
