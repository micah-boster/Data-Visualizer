/**
 * Phase 39 PCFG-01..04 — pair encoding helpers.
 * Phase 44 VOC-05/06 — extended additively with optional `revenueModel` so the
 * unit of analysis becomes `(partner, product, revenue_model)` once the ETL
 * (live 2026-04-29) surfaces the third dimension. See
 * docs/adr/0002-revenue-model-scoping.md for the third-dimension scoping
 * decision.
 *
 * The canonical unit of analysis in the app is the
 * `(PARTNER_NAME, ACCOUNT_TYPE)` pair, NOT the partner alone, and now
 * `(PARTNER_NAME, ACCOUNT_TYPE, REVENUE_MODEL)` for the four multi-model
 * partners (Advance Financial, Happy Money, Imprint, PatientFi). Multi-product
 * partners (Happy Money, Zable) and multi-revenue-model partners split into
 * multiple pair rows so the "apples-and-oranges" rule (no cross-product /
 * cross-revenue-model blending) is enforced structurally at the selection
 * layer.
 *
 * CONTEXT locks honored here:
 *   - "no parent/child tree" — pairs are flat peer rows in the sidebar; this
 *     module exposes only flat `PartnerProductPair` records, never a nested
 *     partner→products shape. Sidebar suffix logic uses
 *     `displayNameForPair` with a caller-provided count.
 *   - "stable product-type order" — `PRODUCT_TYPE_ORDER` is the canonical
 *     ordering across the app (sidebar, root summary table, cross-partner
 *     matrix). Unknown types sort alphabetically AFTER the three known ones.
 *   - "stable revenue-model order" — `REVENUE_MODEL_ORDER` mirrors the
 *     PRODUCT_TYPE_ORDER pattern: CONTINGENCY → DEBT_SALE; unknown values sort
 *     alphabetically after the known set.
 *
 * Design notes:
 *   - Helpers are PURE — no React, no globals, no cached state.
 *     `displayNameForPair` accepts the `productsPerPartner` count + the
 *     optional `revenueModelsPerPair` count as arguments so callers (sidebar
 *     pair-row rendering, cross-partner matrix entry construction) own the
 *     "how many products / revenue models does this partner-product carry"
 *     computation once and pass the answer in. Keeps this module trivially
 *     testable in isolation (see `pair.smoke.ts`).
 *   - `pairKey` uses `::` as the separator. Partner names + ACCOUNT_TYPE +
 *     REVENUE_MODEL values are plain ASCII in the dataset, so collision risk
 *     is nil. The third segment is empty when `revenueModel` is undefined,
 *     keeping the key reversible by `parsePairKey`.
 *   - `revenueModelsPerPair` defaults to 1 so existing callers (Phase 39
 *     sidebar / cross-partner matrix) keep working byte-identically until
 *     Plan 44-04 wires the multi-model rendering.
 */

/** A canonical (partner, product[, revenue_model]) pair. Stored verbatim from row data. */
export interface PartnerProductPair {
  /** PARTNER_NAME from the row. */
  partner: string;
  /** ACCOUNT_TYPE from the row (e.g. THIRD_PARTY, PRE_CHARGE_OFF_FIRST_PARTY). */
  product: string;
  /**
   * Phase 44 VOC-05 — REVENUE_MODEL from the row (CONTINGENCY or DEBT_SALE).
   * Optional for backward compatibility: pre-Phase-44 callers and persisted
   * pair keys (Saved Views, drill state, cross-partner entries) parse cleanly
   * with `revenueModel === undefined`. Plan 44-04 wires the sidebar / Partner
   * Setup / breadcrumb consumers to pass the real value.
   */
  revenueModel?: string;
}

/**
 * Stable product-type ordering. Within a multi-product partner, pairs render
 * 1st Party → 3rd Party → Pre-Chargeoff 3rd Party. Any unknown ACCOUNT_TYPE
 * value sorts alphabetically AFTER these three.
 */
export const PRODUCT_TYPE_ORDER: readonly string[] = [
  'PRE_CHARGE_OFF_FIRST_PARTY',
  'THIRD_PARTY',
  'PRE_CHARGE_OFF_THIRD_PARTY',
] as const;

/** Display label for a known product type. Unknown values pass through unmodified. */
export const PRODUCT_TYPE_LABELS: Record<string, string> = {
  PRE_CHARGE_OFF_FIRST_PARTY: '1st Party',
  THIRD_PARTY: '3rd Party',
  PRE_CHARGE_OFF_THIRD_PARTY: 'Pre-Chargeoff 3rd Party',
};

/**
 * Phase 44 VOC-05 — stable revenue-model ordering. Within a multi-revenue-model
 * pair, rows render CONTINGENCY → DEBT_SALE. Unknown REVENUE_MODEL values sort
 * alphabetically AFTER the known set. Mirrors the PRODUCT_TYPE_ORDER recipe.
 */
export const REVENUE_MODEL_ORDER: readonly string[] = [
  'CONTINGENCY',
  'DEBT_SALE',
] as const;

/**
 * Phase 44 VOC-05 — display labels for revenue models. CONTEXT.md sidebar
 * format example "Happy Money 3P-Contingency" pins capitalized first letter,
 * no space — these labels are appended verbatim after the em-dash separator
 * in `displayNameForPair`.
 */
export const REVENUE_MODEL_LABELS: Record<string, string> = {
  CONTINGENCY: 'Contingency',
  DEBT_SALE: 'DebtSale',
};

/**
 * Serialize a pair to a string key suitable for Map<string, X> usage.
 * Uses `::` as the separator (ASCII-safe given our PARTNER_NAME / ACCOUNT_TYPE /
 * REVENUE_MODEL value space). Inverse of `parsePairKey`.
 *
 * Phase 44 VOC-05 — the third `::` separator is always emitted; the trailing
 * segment is empty when `revenueModel` is undefined. Keeps the key fully
 * reversible without ambiguity (a partner / product containing `::` would be
 * an unrecoverable collision today, but neither the dataset nor the
 * REVENUE_MODEL enum carries such values).
 */
export function pairKey(pair: PartnerProductPair): string {
  return `${pair.partner}::${pair.product}::${pair.revenueModel ?? ''}`;
}

/**
 * Parse a serialized pair key back into a `PartnerProductPair`.
 * Returns `null` if the string is malformed.
 *
 * Phase 44 VOC-05 — split on `::` with limit 3. Legacy two-segment keys
 * (`partner::product`, no third `::`) parse cleanly with
 * `revenueModel: undefined` for backward compatibility with pre-Phase-44
 * persisted Saved Views and drill state. New three-segment keys with an empty
 * third segment also resolve to `revenueModel: undefined`. Non-empty third
 * segment surfaces as `revenueModel: <value>`.
 */
export function parsePairKey(key: string): PartnerProductPair | null {
  if (key.length === 0) return null;
  const firstIx = key.indexOf('::');
  if (firstIx < 0) return null;
  const partner = key.slice(0, firstIx);
  const rest = key.slice(firstIx + 2);
  const secondIx = rest.indexOf('::');
  if (secondIx < 0) {
    // Legacy two-segment key — pre-Phase-44 persisted pair keys land here.
    return { partner, product: rest };
  }
  const product = rest.slice(0, secondIx);
  const revenueModelSegment = rest.slice(secondIx + 2);
  if (revenueModelSegment.length === 0) {
    return { partner, product };
  }
  return { partner, product, revenueModel: revenueModelSegment };
}

/**
 * Sort pairs in canonical order: partner alphabetical first, then within a
 * partner by `PRODUCT_TYPE_ORDER` index, then within a (partner, product) by
 * `REVENUE_MODEL_ORDER` index. Unknown product / revenue-model types sort
 * alphabetically after the known set within their respective layer.
 *
 * Returns a new array — does NOT mutate the input.
 */
export function sortPairs(
  pairs: PartnerProductPair[],
): PartnerProductPair[] {
  return [...pairs].sort((a, b) => {
    if (a.partner !== b.partner) return a.partner.localeCompare(b.partner);
    const ai = PRODUCT_TYPE_ORDER.indexOf(a.product);
    const bi = PRODUCT_TYPE_ORDER.indexOf(b.product);
    if (ai >= 0 && bi >= 0) {
      if (ai !== bi) return ai - bi;
    } else if (ai >= 0) {
      return -1;
    } else if (bi >= 0) {
      return 1;
    } else if (a.product !== b.product) {
      return a.product.localeCompare(b.product);
    }
    // Same partner + product: compare revenueModel as the third dimension.
    const arm = a.revenueModel;
    const brm = b.revenueModel;
    if (arm === brm) return 0;
    if (arm === undefined) return -1; // undefined sorts before defined
    if (brm === undefined) return 1;
    const ari = REVENUE_MODEL_ORDER.indexOf(arm);
    const bri = REVENUE_MODEL_ORDER.indexOf(brm);
    if (ari >= 0 && bri >= 0) return ari - bri;
    if (ari >= 0) return -1;
    if (bri >= 0) return 1;
    return arm.localeCompare(brm);
  });
}

/**
 * Build the user-facing display name for a pair.
 *
 * Single-product partners (`productsPerPartner === 1`) render as `partner`
 * (no product suffix). Multi-product partners (`productsPerPartner > 1`)
 * render as `${partner} — ${product label}` (em-dash separator). The product
 * label comes from `PRODUCT_TYPE_LABELS`; unknown product types fall back to
 * the raw ACCOUNT_TYPE string.
 *
 * Phase 44 VOC-05 — when `revenueModelsPerPair > 1` AND the pair carries a
 * `revenueModel`, append `-${revenueModelLabel}` to the display name (e.g.
 * "Happy Money — 3rd Party-Contingency"). The label comes from
 * `REVENUE_MODEL_LABELS`; unknown values fall back to the raw value.
 *
 * `revenueModelsPerPair` defaults to 1 (no suffix) so every pre-Phase-44
 * caller (Phase 39 sidebar render, cross-partner matrix entry construction)
 * keeps producing byte-identical labels. Plan 44-04 will pass the real count
 * from the sidebar / breadcrumb call sites that surface the multi-model
 * partners.
 *
 * Caller passes `productsPerPartner` and `revenueModelsPerPair` rather than
 * this module computing them — keeps the helper pure and lets callers compute
 * the counts once across many pairs.
 */
export function displayNameForPair(
  pair: PartnerProductPair,
  productsPerPartner: number,
  revenueModelsPerPair: number = 1,
): string {
  const productSuffix =
    productsPerPartner > 1
      ? ` — ${PRODUCT_TYPE_LABELS[pair.product] ?? pair.product}`
      : '';
  const revenueModelSuffix =
    revenueModelsPerPair > 1 && pair.revenueModel
      ? `-${REVENUE_MODEL_LABELS[pair.revenueModel] ?? pair.revenueModel}`
      : '';
  return `${pair.partner}${productSuffix}${revenueModelSuffix}`;
}

/**
 * Display label for a single product type. Used for hover tooltips on
 * single-product sidebar rows (CONTEXT lock: "Product type is revealed on
 * hover via tooltip for consistency").
 */
export function labelForProduct(product: string): string {
  return PRODUCT_TYPE_LABELS[product] ?? product;
}

/**
 * Phase 44 VOC-05 — display label for a single revenue model. Mirrors
 * `labelForProduct`. Used by Plan 44-04 for hover tooltips on multi-revenue-
 * model sidebar rows + the AttributeFilterBar control's chip text.
 */
export function labelForRevenueModel(revenueModel: string): string {
  return REVENUE_MODEL_LABELS[revenueModel] ?? revenueModel;
}
