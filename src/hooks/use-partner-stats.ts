'use client';

import { useMemo } from 'react';
import type { PartnerStats } from '@/types/partner-stats';
import { reshapeCurves } from '@/lib/computation/reshape-curves';
import { computeNorms } from '@/lib/computation/compute-norms';
import { computeKpis } from '@/lib/computation/compute-kpis';
import { computeTrending } from '@/lib/computation/compute-trending';

/**
 * Compute structured partner analytics from raw batch rows.
 *
 * Filters allRows to the given partner, then composes KPI aggregates,
 * metric norms, collection curve series, and batch-over-batch trending.
 *
 * Returns null when no partner is selected or no data matches.
 */
export function usePartnerStats(
  partnerName: string | null,
  allRows: Record<string, unknown>[],
): PartnerStats | null {
  return useMemo(() => {
    if (!partnerName || allRows.length === 0) return null;

    const partnerRows = allRows.filter(
      (r) => String(r.PARTNER_NAME ?? '') === partnerName,
    );

    if (partnerRows.length === 0) return null;

    return {
      kpis: computeKpis(partnerRows),
      norms: computeNorms(partnerRows),
      curves: reshapeCurves(partnerRows),
      trending: computeTrending(partnerRows),
    };
  }, [partnerName, allRows]);
}
