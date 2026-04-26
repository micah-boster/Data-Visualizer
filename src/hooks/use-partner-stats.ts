'use client';

import { useMemo } from 'react';
import type { PartnerStats } from '@/types/partner-stats';
import type { PartnerProductPair } from '@/lib/partner-config/pair';
import { reshapeCurves } from '@/lib/computation/reshape-curves';
import { computeNorms } from '@/lib/computation/compute-norms';
import { computeKpis } from '@/lib/computation/compute-kpis';
import { computeTrending } from '@/lib/computation/compute-trending';
import { computeAnomalies } from '@/lib/computation/compute-anomalies';
import { useCurvesResultsIndex } from '@/hooks/use-curves-results';
import { getBatchName, getPartnerName, getStringField } from '@/lib/utils';

/**
 * Compute structured partner analytics from raw batch rows.
 *
 * Phase 39 PCFG-03: filters by `(partner, product)` pair, not by partner
 * name alone. Calling with a multi-product partner without a product would
 * blend 1st + 3rd party rows together — the pair-aware filter prevents
 * that structurally.
 *
 * Phase 40 PRJ-01 — merges modeled-projection points onto each `BatchCurve`
 * via a `(LENDER_ID, BATCH_)` lookup. The lookup is per-batch (not partner-
 * uniform) per Pitfall 1: a single PARTNER_NAME may span multiple LENDER_IDs.
 * Batches without modeled coverage keep `projection: undefined` (graceful
 * degradation — consumers must check for undefined).
 *
 * Returns null when no pair is selected or no data matches the pair.
 */
export function usePartnerStats(
  pair: PartnerProductPair | null,
  allRows: Record<string, unknown>[],
): PartnerStats | null {
  // Stable Map<"lenderId||batchName", CurvePoint[]> — rebuilt only when the
  // /api/curves-results query data changes (TanStack Query structural sharing
  // keeps the data reference stable across unrelated renders). Pulled outside
  // the memo so first paint of actuals isn't blocked on projections (per
  // RESEARCH "don't block first paint").
  const projectionIndex = useCurvesResultsIndex();

  return useMemo(() => {
    if (!pair || allRows.length === 0) return null;

    const partnerRows = allRows.filter(
      (r) =>
        getPartnerName(r) === pair.partner &&
        getStringField(r, 'ACCOUNT_TYPE') === pair.product,
    );

    if (partnerRows.length === 0) return null;

    // Per-batch lenderId lookup (Pitfall 1 — partner may span multiple lenders,
    // so a partner-uniform lookup would silently drop projections for batches
    // under a non-default lender). Walk partnerRows once.
    // Audit 2026-04-26 (40.1-01-AUDIT.md): zero cross-lender batch-name
    // collisions in the production snapshot (477 (pair, batch) entries scanned,
    // including the worst-case 3-lender Imprint family) — first-seen-wins is
    // safe. Re-run the audit if the data model evolves.
    const lenderByBatch = new Map<string, string>();
    for (const r of partnerRows) {
      // Read via getBatchName (column is `BATCH`, not `BATCH_` — that's
      // CURVES_RESULTS' column. Mismatched field names previously left this
      // map empty, suppressing all projection lookups.)
      const batch = getBatchName(r);
      const lender = String(r.LENDER_ID ?? '');
      if (batch && lender && !lenderByBatch.has(batch)) {
        lenderByBatch.set(batch, lender);
      }
    }

    const norms = computeNorms(partnerRows);

    // Pairs with <3 batches get anomalies from the root-level
    // AnomalyProvider (which has portfolio norms). For pair-level
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
      // Phase 39 PCFG-07 — expose pair-filtered rows so segment-split
      // consumers (chart, KPI block) can call splitRowsBySegment directly
      // without re-implementing the pair-filter predicate. The reference is
      // stable inside this useMemo (a single filter() call); downstream
      // consumers should treat it as immutable.
      rawRows: partnerRows,
    };
  }, [pair, allRows, projectionIndex]);
}
