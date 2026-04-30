/**
 * Pure evaluator that resolves a PartnerListFilters definition against
 * a row set and returns the set of matching PARTNER_NAME values.
 *
 * Multi-select semantics:
 * - Within an attribute: values are OR'd (`.some()`).
 * - Across attributes:   keys are AND'd (sequential checks must all pass).
 * - An empty-array or undefined entry for an attribute means
 *   "no constraint on this attribute" — all rows pass that check.
 *
 * Phase 39 additions:
 * - PRODUCT_TYPE is a display alias of ACCOUNT_TYPE — evaluator treats
 *   the two filter keys identically. If both are set simultaneously, the
 *   cross-attribute AND semantics intersect them (a row must match both).
 * - SEGMENT resolves against partner-config segment rules. An optional
 *   `segmentResolver` callback maps `(partner, product) → SegmentRule[]`;
 *   when present, a row must match at least one rule whose name appears
 *   in `filters.SEGMENT`. Without a resolver, the SEGMENT check is
 *   skipped with a console warning so the evaluator stays pure.
 *
 * Phase 44 VOC-05 addition (docs/adr/0002-revenue-model-scoping.md):
 * - REVENUE_MODEL is the third unit-of-analysis dimension (CONTINGENCY,
 *   DEBT_SALE). Evaluator treats it with the same cross-attribute AND /
 *   within-array OR semantics as ACCOUNT_TYPE. Rows missing a REVENUE_MODEL
 *   field degrade defensively (no match) — same convention as missing
 *   PRODUCT_TYPE today.
 *
 * This module has zero React / Next / Snowflake coupling so it can be
 * consumed by hooks, UI, and (future) tests without pulling in a runtime.
 */

import { getPartnerName, getStringField } from '@/lib/utils';
import type { PartnerListFilters } from './types';

/**
 * Lookup callback: returns the segment rules configured for a given pair.
 * Each rule defines a column + value-set; a row matches the rule iff
 * its column value is in the value-set.
 *
 * Caller-provided so this module avoids importing the partner-config
 * context. Wire from `usePartnerConfigContext().configs` in the dialog
 * (see `create-list-dialog.tsx`).
 */
export type SegmentResolver = (
  partner: string,
  product: string,
) => Array<{ name: string; column: string; values: string[] }>;

/**
 * Evaluate a filter definition against a row set.
 * Returns the set of unique PARTNER_NAME values that match all
 * specified attribute constraints.
 *
 * @param rows             Dataset rows.
 * @param filters          PartnerListFilters definition.
 * @param segmentResolver  Optional — required only when `filters.SEGMENT` is non-empty.
 */
export function evaluateFilters(
  rows: Array<Record<string, unknown>>,
  filters: PartnerListFilters,
  segmentResolver?: SegmentResolver,
): Set<string> {
  const matches = new Set<string>();

  // Phase 39 — PRODUCT_TYPE is a display alias of ACCOUNT_TYPE; both keys
  // are evaluated against the same ACCOUNT_TYPE column. Across attributes
  // we AND, so a row must satisfy both filter sets when both are present.
  const accountTypeFilter = filters.ACCOUNT_TYPE;
  const productTypeFilter = filters.PRODUCT_TYPE;
  const segmentFilter = filters.SEGMENT;
  // Phase 44 VOC-05 — REVENUE_MODEL third unit-of-analysis dimension.
  const revenueModelFilter = filters.REVENUE_MODEL;

  // Defensive: if SEGMENT was requested without a resolver, warn once and
  // skip the check rather than crashing or silently dropping all rows.
  const segmentActive = !!segmentFilter && segmentFilter.length > 0;
  if (segmentActive && !segmentResolver) {
    console.warn(
      '[partner-lists] SEGMENT filter present but no resolver supplied; filter ignored.',
    );
  }

  for (const row of rows) {
    // ACCOUNT_TYPE: within-attribute OR, across-attributes AND.
    if (accountTypeFilter && accountTypeFilter.length > 0) {
      const rowAccountType = getStringField(row, 'ACCOUNT_TYPE');
      if (!accountTypeFilter.some((value) => value === rowAccountType)) {
        continue;
      }
    }

    // PRODUCT_TYPE: display alias of ACCOUNT_TYPE. Evaluated identically
    // against the ACCOUNT_TYPE column. Cross-attribute AND with the
    // ACCOUNT_TYPE filter above.
    if (productTypeFilter && productTypeFilter.length > 0) {
      const rowAccountType = getStringField(row, 'ACCOUNT_TYPE');
      if (!productTypeFilter.some((value) => value === rowAccountType)) {
        continue;
      }
    }

    // Phase 44 VOC-05 — REVENUE_MODEL: third unit-of-analysis dimension.
    // Cross-attribute AND with ACCOUNT_TYPE / PRODUCT_TYPE / SEGMENT;
    // within-array OR. Rows missing REVENUE_MODEL degrade defensively to
    // no-match — same convention as missing PRODUCT_TYPE today. The
    // apples-and-oranges rule (Contingency vs Debt Sale economics differ)
    // forbids letting mismatched rows leak through, so the predicate
    // explicitly excludes rows lacking the field rather than skipping the
    // check. See docs/adr/0002-revenue-model-scoping.md.
    if (revenueModelFilter && revenueModelFilter.length > 0) {
      const rowRevenueModel = getStringField(row, 'REVENUE_MODEL');
      if (!rowRevenueModel) continue; // missing field → no match
      if (!revenueModelFilter.some((value) => value === rowRevenueModel)) {
        continue;
      }
    }

    // SEGMENT: requires a resolver to map (partner, product) → SegmentRule[].
    // A row matches the segment filter iff at least one rule whose name is
    // in `filters.SEGMENT` matches the row's column value.
    if (segmentActive && segmentResolver) {
      const partner = getPartnerName(row);
      const product = getStringField(row, 'ACCOUNT_TYPE');
      const rules = segmentResolver(partner, product);
      const namedRules = rules.filter((r) =>
        segmentFilter!.some((name) => name === r.name),
      );
      // No matching named rules means this pair has no segment with the
      // requested name; row excluded.
      if (namedRules.length === 0) continue;
      // Row matches if any of the matching-named rules' value-set covers
      // the row's column value.
      const rowMatchesAny = namedRules.some((rule) => {
        const colValue = getStringField(row, rule.column);
        return rule.values.some((v) => v === colValue);
      });
      if (!rowMatchesAny) continue;
    }
    // Future attributes add their own `if (filter && filter.length > 0)` block
    // here, mirroring the pattern. Each block is an AND gate.

    const partnerName = getPartnerName(row);
    if (partnerName) {
      matches.add(partnerName);
    }
  }

  return matches;
}
