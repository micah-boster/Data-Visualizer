'use client';

import { useMemo } from 'react';
import type { PartnerAnomaly } from '@/types/partner-stats';
import { computeAllPartnerAnomalies } from '@/lib/computation/compute-anomalies';
import { parseBatchRows } from '@/lib/data/parse-batch-row';

/**
 * Compute anomaly status for ALL partners from the full dataset.
 * Used at root level to show partner anomaly flags without drilling down.
 * Memoized on allRows reference -- 477 rows x 11 metrics is trivial but
 * avoid redundant work on re-renders from filter/sort changes.
 *
 * Phase 43 BND-02: routes raw `/api/data` rows through `parseBatchRows`
 * before compute. The drop-toast UX lives in `use-partner-stats.ts`
 * (single-toast contract per query result); this hook stays silent on
 * drops to avoid duplicate toasts when multiple hooks observe the same
 * input.
 */
export function useAllPartnerAnomalies(
  allRows: Record<string, unknown>[],
): Map<string, PartnerAnomaly> {
  return useMemo(() => {
    if (allRows.length === 0) return new Map();
    const { rows: parsedRows } = parseBatchRows(allRows);
    if (parsedRows.length === 0) return new Map();
    return computeAllPartnerAnomalies(parsedRows);
  }, [allRows]);
}
