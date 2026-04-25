'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { CurvePoint } from '@/types/partner-stats';
import type {
  CurvesResultsResponse,
  CurvesResultsWireRow,
} from '@/types/curves-results';

/**
 * Fetches modeled-projection rows from `/api/curves-results`. Mirrors the
 * `useData()` pattern (sibling TanStack Query) so the chart can render
 * actuals immediately and the modeled overlay appears when this query resolves.
 *
 * `staleTime: 5min` — projection data refreshes on warehouse ETL cadence,
 * not on user interaction.
 */
export function useCurvesResults() {
  return useQuery<CurvesResultsResponse>({
    queryKey: ['curves-results'],
    queryFn: async () => {
      const res = await fetch('/api/curves-results');
      if (!res.ok) {
        const err = await res
          .json()
          .catch(() => ({ error: 'Failed to fetch projections' }));
        throw new Error(err.error ?? 'Failed to fetch projections');
      }
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Build a stable `Map<"lenderId||batchName", CurvePoint[]>` from the
 * projection rows. The wire shape uses UPPERCASE Snowflake column names; this
 * helper reshapes to lowercase keys + the `CurvePoint` shape consumed by
 * `BatchCurve.points` so downstream rendering is agnostic to the data source.
 *
 * Phase 40 v1 is rate-only; `amount` is set to `0` per CONTEXT.md Deferred
 * Ideas ($ trajectory is out of scope for v1).
 *
 * Memoized on `data?.data` (the array reference is stable across unrelated
 * renders thanks to TanStack Query's structural-sharing default), so the
 * `Map` rebuild only runs when projection data actually changes.
 */
export function useCurvesResultsIndex(): Map<string, CurvePoint[]> {
  const { data } = useCurvesResults();
  return useMemo(() => {
    const map = new Map<string, CurvePoint[]>();
    if (!data?.data) return map;
    for (const row of data.data as CurvesResultsWireRow[]) {
      const lenderId = String(row.LENDER_ID ?? '');
      const batchName = String(row.BATCH_ ?? '');
      const month = Number(row.COLLECTION_MONTH);
      const projectedRate = Number(row.PROJECTED_RATE);
      if (!lenderId || !batchName || !Number.isFinite(month)) continue;
      const key = `${lenderId}||${batchName}`;
      const pts = map.get(key) ?? [];
      pts.push({ month, amount: 0, recoveryRate: projectedRate });
      map.set(key, pts);
    }
    return map;
  }, [data?.data]);
}
