import type { MetricNorm } from '@/types/partner-stats';

/**
 * Column keys eligible for deviation-based heatmap formatting.
 *
 * Per user decision: collection curve milestones (3mo, 6mo, 9mo, 12mo),
 * penetration rate, conversion rate, and total collected.
 */
export const HEATMAP_COLUMNS = new Set([
  'COLLECTION_AFTER_3_MONTH',
  'COLLECTION_AFTER_6_MONTH',
  'COLLECTION_AFTER_9_MONTH',
  'COLLECTION_AFTER_12_MONTH',
  'PENETRATION_RATE_POSSIBLE_AND_CONFIRMED',
  'RAITO_FIRST_TIME_CONVERTED_ACCOUNTS',
  'TOTAL_COLLECTED_LIFE_TIME',
]);

export interface DeviationResult {
  zScore: number;
  percentDeviation: number;
  direction: 'above' | 'below' | 'neutral';
  opacity: number;
}

/** Max background opacity for deviation tints — keeps text readable. */
const MAX_OPACITY = 0.35;

/** Z-score at which opacity reaches maximum. */
const MAX_Z = 4;

/** Z-score threshold for neutral zone (no coloring). */
const NEUTRAL_THRESHOLD = 1.5;

/**
 * Compute deviation of a value from a partner's historical norm.
 *
 * Returns null if the norm has insufficient data (fewer than 2 batches
 * or zero standard deviation). Values within 1.5 stddev are neutral
 * (no color). Beyond that, opacity scales linearly to MAX_OPACITY at
 * z=4, clamped.
 *
 * Polarity: higher is always better (above = green, below = red).
 */
export function computeDeviation(
  value: number,
  norm: MetricNorm,
): DeviationResult | null {
  if (norm.count < 2 || norm.stddev === 0) return null;

  const zScore = (value - norm.mean) / norm.stddev;
  const absZ = Math.abs(zScore);

  if (absZ <= NEUTRAL_THRESHOLD) {
    return { zScore, percentDeviation: 0, direction: 'neutral', opacity: 0 };
  }

  const opacity =
    Math.min((absZ - NEUTRAL_THRESHOLD) / (MAX_Z - NEUTRAL_THRESHOLD), 1) *
    MAX_OPACITY;

  const percentDeviation =
    norm.mean !== 0 ? ((value - norm.mean) / norm.mean) * 100 : 0;

  const direction: 'above' | 'below' = value > norm.mean ? 'above' : 'below';

  return { zScore, percentDeviation, direction, opacity };
}

/**
 * Format tooltip text for a deviation-colored cell.
 *
 * Produces the user-specified format:
 *   "12.3% vs partner avg 18.7% (-34%)"
 *   "$1.2M vs partner avg $1.8M (-33%)"
 */
export function formatDeviationTooltip(
  formattedValue: string,
  formattedMean: string,
  percentDeviation: number,
): string {
  const sign = percentDeviation > 0 ? '+' : '';
  const pct = `${sign}${Math.round(percentDeviation)}%`;
  return `${formattedValue} vs partner avg ${formattedMean} (${pct})`;
}
