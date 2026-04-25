'use client';

import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { useCallback, useMemo } from 'react';
import type { PartnerProductPair } from '@/lib/partner-config/pair';

export type DrillLevel = 'root' | 'partner' | 'batch';

export interface DrillState {
  level: DrillLevel;
  partner: string | null;
  /**
   * Phase 39 PCFG-03 — product (= ACCOUNT_TYPE) component of the
   * canonical (partner, product) pair. Travels with `partner` on partner-
   * and batch-level drill states. `null` only at root level OR for legacy
   * deep-links missing `?pr=` (validation effect in data-display.tsx steps
   * those up to root with a sonner toast).
   */
  product: string | null;
  batch: string | null;
}

/**
 * URL-backed drill-down state hook.
 *
 * Drill state lives in URL search params so browser back/forward traverse
 * drill levels and deep-links into partner/batch views work from cold load.
 *
 * Phase 39 PCFG-03: extended to carry product alongside partner. URL slots
 * are now `?p=<partner>&pr=<product>&b=<batch>` — three independent params.
 * `partner` + `product` always travel together at partner / batch levels;
 * the validation effect in `data-display.tsx` steps deep-links missing
 * `?pr=` up to root (Pitfall 2 in 39-RESEARCH).
 *
 * Param names intentionally differ from `use-filter-state.ts`'s FILTER_PARAMS
 * (`partner`/`type`): drill uses `p`, `pr`, and `b`. This avoids collisions
 * where dimension-filter state and drill state would otherwise share URL slots.
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

// Param names chosen to avoid collision with use-filter-state.ts's FILTER_PARAMS.
const DRILL_PARTNER_PARAM = 'p';
const DRILL_BATCH_PARAM = 'b';
/** Phase 39 PCFG-03: ACCOUNT_TYPE component of the pair. */
export const DRILL_PRODUCT_PARAM = 'pr';

export function useDrillDown() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  // Use searchParams.toString() as dependency to avoid reference-change re-renders.
  const paramsString = searchParams.toString();

  const state: DrillState = useMemo(() => {
    const partner = searchParams.get(DRILL_PARTNER_PARAM);
    const product = searchParams.get(DRILL_PRODUCT_PARAM);
    const batch = searchParams.get(DRILL_BATCH_PARAM);
    if (partner && batch) return { level: 'batch', partner, product, batch };
    if (partner) return { level: 'partner', partner, product, batch: null };
    return { level: 'root', partner: null, product: null, batch: null };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsString]);

  const pushWith = useCallback(
    (next: {
      partner?: string | null;
      product?: string | null;
      batch?: string | null;
    }) => {
      const params = new URLSearchParams(searchParams.toString());
      if ('partner' in next) {
        if (next.partner) params.set(DRILL_PARTNER_PARAM, next.partner);
        else params.delete(DRILL_PARTNER_PARAM);
      }
      if ('product' in next) {
        if (next.product) params.set(DRILL_PRODUCT_PARAM, next.product);
        else params.delete(DRILL_PRODUCT_PARAM);
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

  /**
   * Phase 39 PCFG-03 canonical drill setter — writes BOTH partner and product
   * (the pair) atomically. Replaces the legacy `drillToPartner(name)` shape;
   * sidebar pair rows and root-table pair cells call this.
   */
  const drillToPair = useCallback(
    (pair: PartnerProductPair) =>
      pushWith({ partner: pair.partner, product: pair.product, batch: null }),
    [pushWith],
  );

  /**
   * Phase 39 deprecation shim. Throws in development if called without a
   * product — every call site must migrate to `drillToPair`. Kept as a thin
   * wrapper so tooling that grep'd for `drillToPartner` can be migrated
   * deliberately rather than silently fail at runtime.
   */
  const drillToPartner = useCallback(
    (_partnerName: string) => {
      const msg =
        'drillToPartner is deprecated as of Phase 39 — use drillToPair({ partner, product }). ' +
        'Selecting a partner without a product would re-introduce cross-product blending.';
      if (process.env.NODE_ENV !== 'production') {
        throw new Error(msg);
      } else {
        // eslint-disable-next-line no-console
        console.error(msg);
      }
    },
    [],
  );

  const drillToBatch = useCallback(
    (batchName: string, pair?: PartnerProductPair) => {
      const partner = pair?.partner ?? state.partner;
      const product = pair?.product ?? state.product;
      pushWith({ partner, product, batch: batchName });
    },
    [pushWith, state.partner, state.product],
  );

  const navigateToLevel = useCallback(
    (level: DrillLevel) => {
      // Phase 39: 'partner' preserves both partner + product (the pair); only
      // batch is cleared. 'root' clears all three slots.
      if (level === 'root') pushWith({ partner: null, product: null, batch: null });
      else if (level === 'partner') pushWith({ batch: null });
      // 'batch' is deepest — no-op
    },
    [pushWith],
  );

  return {
    state,
    drillToPair,
    drillToPartner,
    drillToBatch,
    navigateToLevel,
  };
}
