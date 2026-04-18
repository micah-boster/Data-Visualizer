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
 * This module has zero React / Next / Snowflake coupling so it can be
 * consumed by hooks, UI, and (future) tests without pulling in a runtime.
 */

import { getPartnerName, getStringField } from '@/lib/utils';
import type { PartnerListFilters } from './types';

/**
 * Evaluate a filter definition against a row set.
 * Returns the set of unique PARTNER_NAME values that match all
 * specified attribute constraints.
 */
export function evaluateFilters(
  rows: Array<Record<string, unknown>>,
  filters: PartnerListFilters,
): Set<string> {
  const matches = new Set<string>();

  for (const row of rows) {
    // ACCOUNT_TYPE: within-attribute OR, across-attributes AND.
    const accountTypeFilter = filters.ACCOUNT_TYPE;
    if (accountTypeFilter && accountTypeFilter.length > 0) {
      const rowAccountType = getStringField(row, 'ACCOUNT_TYPE');
      if (!accountTypeFilter.some((value) => value === rowAccountType)) {
        continue;
      }
    }
    // Future attributes add their own `if (filter && filter.length > 0)` block
    // here, mirroring the ACCOUNT_TYPE pattern. Each block is an AND gate.

    const partnerName = getPartnerName(row);
    if (partnerName) {
      matches.add(partnerName);
    }
  }

  return matches;
}
