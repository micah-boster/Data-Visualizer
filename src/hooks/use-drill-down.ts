'use client';

import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { useCallback, useMemo } from 'react';

export type DrillLevel = 'root' | 'partner' | 'batch';

export interface DrillState {
  level: DrillLevel;
  partner: string | null;
  batch: string | null;
}

/**
 * URL-backed drill-down state hook.
 *
 * Drill state lives in URL search params so browser back/forward traverse
 * drill levels and deep-links into partner/batch views work from cold load.
 *
 * Param names intentionally differ from `use-filter-state.ts`'s FILTER_PARAMS
 * (`partner`/`batch`): drill uses `p` and `b`. This avoids a collision where
 * dimension-filter state and drill state would otherwise share URL slots.
 *
 * Mirrors the memo-key discipline in `use-filter-state.ts`: state and the
 * setter memoize off `paramsString` (the serialized query), not the
 * `searchParams` object reference, to prevent the useSearchParams re-render
 * loop.
 *
 * Drill transitions use `router.push` (not `replace`) so each drill level
 * creates a distinct browser history entry — back pops exactly one level.
 * Scroll is pinned with `{ scroll: false }` so drilling doesn't jump to top.
 */

// Param names chosen to avoid collision with use-filter-state.ts's FILTER_PARAMS
// (`partner` / `batch` are already taken by dimension filters).
const DRILL_PARTNER_PARAM = 'p';
const DRILL_BATCH_PARAM = 'b';

export function useDrillDown() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  // Use searchParams.toString() as dependency to avoid reference-change re-renders.
  const paramsString = searchParams.toString();

  const state: DrillState = useMemo(() => {
    const partner = searchParams.get(DRILL_PARTNER_PARAM);
    const batch = searchParams.get(DRILL_BATCH_PARAM);
    if (partner && batch) return { level: 'batch', partner, batch };
    if (partner) return { level: 'partner', partner, batch: null };
    return { level: 'root', partner: null, batch: null };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsString]);

  const pushWith = useCallback(
    (next: { partner?: string | null; batch?: string | null }) => {
      const params = new URLSearchParams(searchParams.toString());
      if ('partner' in next) {
        if (next.partner) params.set(DRILL_PARTNER_PARAM, next.partner);
        else params.delete(DRILL_PARTNER_PARAM);
      }
      if ('batch' in next) {
        if (next.batch) params.set(DRILL_BATCH_PARAM, next.batch);
        else params.delete(DRILL_BATCH_PARAM);
      }
      const qs = params.toString();
      // NAV-02: push (not replace) so browser back pops a history entry.
      // scroll: false so drill-in doesn't jump the user to the top of the page.
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [paramsString, pathname, router],
  );

  const drillToPartner = useCallback(
    (partnerName: string) => pushWith({ partner: partnerName, batch: null }),
    [pushWith],
  );

  const drillToBatch = useCallback(
    (batchName: string, partnerName?: string) =>
      pushWith({ partner: partnerName ?? state.partner, batch: batchName }),
    [pushWith, state.partner],
  );

  const navigateToLevel = useCallback(
    (level: DrillLevel) => {
      if (level === 'root') pushWith({ partner: null, batch: null });
      else if (level === 'partner') pushWith({ batch: null });
      // 'batch' is deepest — no-op
    },
    [pushWith],
  );

  return { state, drillToPartner, drillToBatch, navigateToLevel };
}
