'use client';

import { useMemo } from 'react';
import type { CrossPartnerData } from '@/types/partner-stats';
import { computeCrossPartnerData } from '@/lib/computation/compute-cross-partner';
import { parseBatchRows } from '@/lib/data/parse-batch-row';

/**
 * Compute cross-partner stats for ALL partners from the full dataset.
 * Includes per-partner KPIs, percentile rankings, average curves,
 * activity classification, and portfolio outlier flags.
 *
 * Memoized on allRows reference -- 477 rows across ~10 partners is trivial
 * but avoids redundant work on re-renders from filter/sort changes.
 *
 * Phase 43 BND-02: routes the raw `/api/data` rows through `parseBatchRows`
 * before compute. The drop-toast UX lives in `use-partner-stats.ts`
 * (single-toast contract per query result); this hook stays silent on
 * drops to avoid duplicate toasts when both hooks observe the same input.
 * Static cache fallback already passes the bundled JSON through the parser
 * at boot, so a clean fixture produces zero drops here.
 */
export function useAllPartnerStats(
  allRows: Record<string, unknown>[],
): CrossPartnerData | null {
  return useMemo(() => {
    if (allRows.length === 0) return null;
    const { rows: parsedRows } = parseBatchRows(allRows);
    if (parsedRows.length === 0) return null;
    return computeCrossPartnerData(parsedRows);
  }, [allRows]);
}
