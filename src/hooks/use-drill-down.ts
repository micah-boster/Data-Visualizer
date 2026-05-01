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
  /**
   * Phase 44 VOC-07 — REVENUE_MODEL component of the (partner, product,
   * revenue_model) triple. Optional / null because:
   *   - Root level: always null (no partner-product scope yet).
   *   - Single-revenue-model partners (the 34 of 38 partners on current
   *     data): null even at partner / batch level — the third dimension
   *     is meaningless when the (partner, product) is structurally bound
   *     to a single revenue model.
   *   - Multi-revenue-model partners (Advance Financial, Happy Money,
   *     Imprint, PatientFi): the value travels with `partner` + `product`
   *     so 3P-Contingency vs 3P-DebtSale drill states are distinct.
   *
   * URL slot: `?rm=<value>`. Backward compat: a URL without `?rm=`
   * produces `revenueModel === null`, identical to the pre-Phase-44
   * behavior. Pre-44 saved drill state restores cleanly because
   * absence-of-param is the legacy default.
   *
   * Additive-optional Phase 32 + Phase 39 precedent: extending DrillState
   * with a new optional field requires no schemaVersion bump because the
   * URL is the source of truth and `searchParams.get(...)` of an absent
   * param returns null naturally.
   */
  revenueModel: string | null;
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
/**
 * Phase 44 VOC-07: REVENUE_MODEL component of the (partner, product,
 * revenue_model) triple. Short slot `rm` continues the `?p=&pr=&b=` short-code
 * convention from Phase 32-01 — three lowercase letters, no collision with
 * use-filter-state.ts's FILTER_PARAMS.
 */
export const DRILL_REVENUE_MODEL_PARAM = 'rm';

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
    // Phase 44 VOC-07: ?rm= round-trip. Empty / absent → null (legacy default).
    const revenueModel = searchParams.get(DRILL_REVENUE_MODEL_PARAM);
    if (partner && batch)
      return { level: 'batch', partner, product, batch, revenueModel };
    if (partner)
      return {
        level: 'partner',
        partner,
        product,
        batch: null,
        revenueModel,
      };
    return {
      level: 'root',
      partner: null,
      product: null,
      batch: null,
      revenueModel: null,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsString]);

  const pushWith = useCallback(
    (next: {
      partner?: string | null;
      product?: string | null;
      batch?: string | null;
      revenueModel?: string | null;
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
      // Phase 44 VOC-07: revenueModel writes ?rm=<value>; null/empty deletes
      // the param so multi-model deselection or up-navigation drops the slot
      // cleanly (URL stays minimal at root).
      if ('revenueModel' in next) {
        if (next.revenueModel)
          params.set(DRILL_REVENUE_MODEL_PARAM, next.revenueModel);
        else params.delete(DRILL_REVENUE_MODEL_PARAM);
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
   *
   * Phase 44 VOC-07: when the pair carries a `revenueModel`, the third
   * dimension travels with it. Single-revenue-model pairs continue to pass
   * `revenueModel: undefined`, which translates to a `?rm=` deletion so the
   * URL stays minimal. Multi-model pairs (Advance Financial, Happy Money,
   * Imprint, PatientFi) push the actual value.
   */
  const drillToPair = useCallback(
    (pair: PartnerProductPair) =>
      pushWith({
        partner: pair.partner,
        product: pair.product,
        batch: null,
        // Pass `null` (not undefined) when the pair has no revenueModel so
        // pushWith deletes the slot — stale `?rm=` from a prior drill is
        // cleared cleanly when the user clicks a single-model pair.
        revenueModel: pair.revenueModel ?? null,
      }),
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
      // Phase 44 VOC-07: preserve revenueModel from the explicit pair when
      // provided (call sites that already know the third dimension), else
      // inherit from current drill state. Multi-model batch rows always
      // ride with their parent pair's revenueModel; single-model rows
      // continue to pass undefined → null and drop ?rm=.
      const revenueModel =
        pair !== undefined
          ? pair.revenueModel ?? null
          : state.revenueModel ?? null;
      pushWith({ partner, product, batch: batchName, revenueModel });
    },
    [pushWith, state.partner, state.product, state.revenueModel],
  );

  const navigateToLevel = useCallback(
    (level: DrillLevel) => {
      // Phase 39: 'partner' preserves both partner + product (the pair); only
      // batch is cleared. 'root' clears all three slots.
      // Phase 44 VOC-07: 'root' also clears revenueModel (third dimension is
      // meaningless above the partner-product scope). 'partner' preserves it
      // — coming back up from batch to partner inside a multi-model pair
      // should keep the user on the Contingency / DebtSale row they came
      // from, not bounce them to the partner-level mixed view.
      if (level === 'root')
        pushWith({
          partner: null,
          product: null,
          batch: null,
          revenueModel: null,
        });
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
