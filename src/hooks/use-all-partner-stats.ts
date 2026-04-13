'use client';

import { useMemo } from 'react';
import type { CrossPartnerData } from '@/types/partner-stats';
import { computeCrossPartnerData } from '@/lib/computation/compute-cross-partner';

/**
 * Compute cross-partner stats for ALL partners from the full dataset.
 * Includes per-partner KPIs, percentile rankings, average curves,
 * activity classification, and portfolio outlier flags.
 *
 * Memoized on allRows reference -- 477 rows across ~10 partners is trivial
 * but avoids redundant work on re-renders from filter/sort changes.
 */
export function useAllPartnerStats(
  allRows: Record<string, unknown>[],
): CrossPartnerData | null {
  return useMemo(() => {
    if (allRows.length === 0) return null;
    return computeCrossPartnerData(allRows);
  }, [allRows]);
}
