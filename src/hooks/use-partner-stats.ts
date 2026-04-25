'use client';

import { useMemo } from 'react';
import type { PartnerStats } from '@/types/partner-stats';
import { reshapeCurves } from '@/lib/computation/reshape-curves';
import { computeNorms } from '@/lib/computation/compute-norms';
import { computeKpis } from '@/lib/computation/compute-kpis';
import { computeTrending } from '@/lib/computation/compute-trending';
import { computeAnomalies } from '@/lib/computation/compute-anomalies';
import { useCurvesResultsIndex } from '@/hooks/use-curves-results';

/**
 * Compute structured partner analytics from raw batch rows.
 *
 * Filters allRows to the given partner, then composes KPI aggregates,
 * metric norms, collection curve series, and batch-over-batch trending.
 *
 * Phase 40 PRJ-01 — merges modeled-projection points onto each `BatchCurve`
 * via a `(LENDER_ID, BATCH_)` lookup. The lookup is per-batch (not partner-
 * uniform) per Pitfall 1: a single PARTNER_NAME may span multiple LENDER_IDs.
 * Batches without modeled coverage keep `projection: undefined` (graceful
 * degradation — consumers must check for undefined).
 *
 * Returns null when no partner is selected or no data matches.
 */
export function usePartnerStats(
  partnerName: string | null,
  allRows: Record<string, unknown>[],
): PartnerStats | null {
  // Stable Map<"lenderId||batchName", CurvePoint[]> — rebuilt only when the
  // /api/curves-results query data changes (TanStack Query structural sharing
  // keeps the data reference stable across unrelated renders). Pulled outside
  // the memo so first paint of actuals isn't blocked on projections (per
  // RESEARCH "don't block first paint").
  const projectionIndex = useCurvesResultsIndex();

  return useMemo(() => {
    if (!partnerName || allRows.length === 0) return null;

    const partnerRows = allRows.filter(
      (r) => String(r.PARTNER_NAME ?? '') === partnerName,
    );

    if (partnerRows.length === 0) return null;

    // Per-batch lenderId lookup (Pitfall 1 — partner may span multiple lenders,
    // so a partner-uniform lookup would silently drop projections for batches
    // under a non-default lender). Walk partnerRows once.
    const lenderByBatch = new Map<string, string>();
    for (const r of partnerRows) {
      const batch = String(r.BATCH_ ?? '');
      const lender = String(r.LENDER_ID ?? '');
      if (batch && lender && !lenderByBatch.has(batch)) {
        lenderByBatch.set(batch, lender);
      }
    }

    const norms = computeNorms(partnerRows);

    // Partners with <3 batches get anomalies from the root-level
    // AnomalyProvider (which has portfolio norms). For partner-level
    // drill-down with sufficient history, compute inline.
    const anomalies =
      partnerRows.length >= 3
        ? computeAnomalies(partnerRows, norms)
        : undefined;

    // Merge modeled projection onto each curve. Lookup miss → projection stays
    // undefined → consumer renders actuals only (graceful per Pitfall 4).
    const curves = reshapeCurves(partnerRows).map((curve) => {
      const lenderId = lenderByBatch.get(curve.batchName) ?? '';
      const projection = projectionIndex.get(`${lenderId}||${curve.batchName}`);
      return { ...curve, projection };
    });

    return {
      kpis: computeKpis(partnerRows),
      norms,
      curves,
      trending: computeTrending(partnerRows),
      anomalies,
    };
  }, [partnerName, allRows, projectionIndex]);
}
