'use client';

import { useMemo } from 'react';
import type { PartnerAnomaly } from '@/types/partner-stats';
import { computeAllPartnerAnomalies } from '@/lib/computation/compute-anomalies';

/**
 * Compute anomaly status for ALL partners from the full dataset.
 * Used at root level to show partner anomaly flags without drilling down.
 * Memoized on allRows reference -- 477 rows x 11 metrics is trivial but
 * avoid redundant work on re-renders from filter/sort changes.
 */
export function useAllPartnerAnomalies(
  allRows: Record<string, unknown>[],
): Map<string, PartnerAnomaly> {
  return useMemo(() => {
    if (allRows.length === 0) return new Map();
    return computeAllPartnerAnomalies(allRows);
  }, [allRows]);
}
