/**
 * Phase 39 PCFG-01..04 — pair encoding helpers.
 *
 * The canonical unit of analysis in the app is the
 * `(PARTNER_NAME, ACCOUNT_TYPE)` pair, NOT the partner alone. Multi-product
 * partners (Happy Money, Zable) split into multiple pair rows so the
 * "apples-and-oranges" rule (no cross-product blending) is enforced
 * structurally at the selection layer.
 *
 * CONTEXT locks honored here:
 *   - "no parent/child tree" — pairs are flat peer rows in the sidebar; this
 *     module exposes only flat `PartnerProductPair` records, never a nested
 *     partner→products shape. Sidebar suffix logic uses
 *     `displayNameForPair` with a caller-provided count.
 *   - "stable product-type order" — `PRODUCT_TYPE_ORDER` is the canonical
 *     ordering across the app (sidebar, root summary table, cross-partner
 *     matrix). Unknown types sort alphabetically AFTER the three known ones.
 *
 * Design notes:
 *   - Helpers are PURE — no React, no globals, no cached state. `displayNameForPair`
 *     accepts the `productsPerPartner` count as an argument so callers (sidebar
 *     pair-row rendering, cross-partner matrix entry construction) own the
 *     "how many products does this partner carry" computation once and pass
 *     the answer in. Keeps this module trivially testable in isolation
 *     (see `pair.smoke.ts`).
 *   - `pairKey` uses `::` as the separator. Partner names + ACCOUNT_TYPE values
 *     are plain ASCII in the dataset, so collision risk is nil.
 */

/** A canonical (partner, product) pair. Stored verbatim from row data. */
export interface PartnerProductPair {
  /** PARTNER_NAME from the row. */
  partner: string;
  /** ACCOUNT_TYPE from the row (e.g. THIRD_PARTY, PRE_CHARGE_OFF_FIRST_PARTY). */
  product: string;
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
 * Serialize a pair to a string key suitable for Map<string, X> usage.
 * Uses `::` as the separator (ASCII-safe given our PARTNER_NAME / ACCOUNT_TYPE
 * value space). Inverse of `parsePairKey`.
 */
export function pairKey(pair: PartnerProductPair): string {
  return `${pair.partner}::${pair.product}`;
}

/**
 * Parse a serialized pair key back into a `PartnerProductPair`.
 * Returns `null` if the string is malformed (no `::` separator).
 */
export function parsePairKey(key: string): PartnerProductPair | null {
  const ix = key.indexOf('::');
  if (ix < 0) return null;
  return { partner: key.slice(0, ix), product: key.slice(ix + 2) };
}

/**
 * Sort pairs in canonical order: partner alphabetical first, then within a
 * partner by `PRODUCT_TYPE_ORDER` index. Unknown product types sort
 * alphabetically after the known set.
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
    if (ai >= 0 && bi >= 0) return ai - bi;
    if (ai >= 0) return -1;
    if (bi >= 0) return 1;
    return a.product.localeCompare(b.product);
  });
}

/**
 * Build the user-facing display name for a pair.
 *
 * Single-product partners (`productsPerPartner === 1`) render as `partner`
 * (no suffix). Multi-product partners (`productsPerPartner > 1`) render as
 * `${partner} — ${product label}` (em-dash separator). The product label
 * comes from `PRODUCT_TYPE_LABELS`; unknown product types fall back to the
 * raw ACCOUNT_TYPE string.
 *
 * Caller passes `productsPerPartner` rather than this module computing it —
 * keeps the helper pure and lets callers compute the count once across many
 * pairs.
 */
export function displayNameForPair(
  pair: PartnerProductPair,
  productsPerPartner: number,
): string {
  if (productsPerPartner > 1) {
    const label = PRODUCT_TYPE_LABELS[pair.product] ?? pair.product;
    return `${pair.partner} — ${label}`;
  }
  return pair.partner;
}

/**
 * Display label for a single product type. Used for hover tooltips on
 * single-product sidebar rows (CONTEXT lock: "Product type is revealed on
 * hover via tooltip for consistency").
 */
export function labelForProduct(product: string): string {
  return PRODUCT_TYPE_LABELS[product] ?? product;
}
