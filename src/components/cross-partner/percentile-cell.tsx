'use client';

/**
 * Percentile badge cell renderer for root-level partner table.
 * Displays combined format: "P72 (3/8)" with tier-based color coding.
 */

interface PercentileCellProps {
  /** Percentile value from quantileRank (0-1 scale) */
  percentile: number | null;
  /** Positional rank (1-based) */
  rank: number | null;
  /** Total ranked partners */
  total: number;
}

export function PercentileCell({ percentile, rank, total }: PercentileCellProps) {
  if (percentile == null || rank == null) {
    return <span className="text-muted-foreground">{'\u2014'}</span>;
  }

  const pValue = Math.round(percentile * 100);
  const tier = pValue >= 75 ? 'top' : pValue <= 25 ? 'bottom' : 'mid';
  const colorClass = {
    top: 'bg-green-500/20 text-green-700 dark:text-green-400',
    mid: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400',
    bottom: 'bg-red-500/20 text-red-700 dark:text-red-400',
  }[tier];

  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-label-numeric ${colorClass}`}
    >
      P{pValue} ({rank}/{total})
    </span>
  );
}
