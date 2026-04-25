/**
 * Phase 39 PCFG-06 — derived-list generator.
 *
 * `computeDerivedLists` returns one PartnerList per distinct ACCOUNT_TYPE
 * value present in the dataset (e.g. "1st Party Partners",
 * "3rd Party Partners", "Pre-Chargeoff 3rd Party Partners"). These lists
 * auto-maintain on every hydration:
 *
 *   1. They are NEVER persisted to localStorage. `usePartnerLists` strips
 *      `'derived'` lists before calling `persistPartnerLists`, so the
 *      stored array stays clean.
 *   2. They are computed fresh on every hook call from the supplied rows.
 *      A delete on a derived list is therefore a transient in-memory
 *      removal — it re-materializes on the next render that supplies the
 *      same row data.
 *   3. IDs are STABLE across calls so the merge in `usePartnerLists`
 *      doesn't duplicate them. ID format: `${DERIVED_LIST_ID_PREFIX}${ACCOUNT_TYPE}`
 *      using the raw ACCOUNT_TYPE value. Stable across browser refreshes
 *      and across separate users on the same dataset.
 *
 * Design notes:
 *   - Pure helper: no React, no globals, no I/O. `now` is injectable for
 *     deterministic tests.
 *   - Names use `PRODUCT_TYPE_LABELS` from `partner-config/pair.ts`
 *     suffixed with " Partners" (e.g. "1st Party Partners"). Unknown
 *     ACCOUNT_TYPE values fall back to `${rawValue} Partners`.
 *   - filters carries `{ ACCOUNT_TYPE: [value] }` so any UI surface that
 *     calls `evaluateFilters(list.filters)` works naturally.
 *   - source is `'derived'` to drive UI distinctions (icon/pill, disabled
 *     rename, "reappears on refresh" toast).
 */

import { PRODUCT_TYPE_LABELS } from '../partner-config/pair.ts';
import { getStringField } from '../utils.ts';
import type { PartnerList } from './types.ts';

/**
 * ID prefix for derived lists. Every derived list's id starts with this
 * prefix so callers can detect them via a startsWith check without
 * relying on the `source` field. Reserved prefix; not valid in UUIDs so
 * collisions with user-created lists are impossible.
 */
export const DERIVED_LIST_ID_PREFIX = '__derived__';

/**
 * Generate one PartnerList per distinct ACCOUNT_TYPE value present in
 * `rows`. IDs are stable across sessions:
 * `${DERIVED_LIST_ID_PREFIX}${ACCOUNT_TYPE_VALUE}`.
 *
 * `partnerIds` is the snapshot of matching PARTNER_NAME values at
 * generation time. `filters` is `{ ACCOUNT_TYPE: [value] }`.
 * `source` is `'derived'`. `createdAt` and `updatedAt` are both `now`.
 *
 * Empty input → empty array.
 */
export function computeDerivedLists(
  rows: Array<Record<string, unknown>>,
  now: number = Date.now(),
): PartnerList[] {
  // Group partner names by ACCOUNT_TYPE in one pass.
  const byAccountType = new Map<string, Set<string>>();
  for (const row of rows) {
    const accountType = getStringField(row, 'ACCOUNT_TYPE');
    if (!accountType) continue;
    const partner = getStringField(row, 'PARTNER_NAME');
    if (!partner) continue;
    let bucket = byAccountType.get(accountType);
    if (!bucket) {
      bucket = new Set<string>();
      byAccountType.set(accountType, bucket);
    }
    bucket.add(partner);
  }

  const out: PartnerList[] = [];
  for (const [accountType, partnerSet] of byAccountType) {
    const label = PRODUCT_TYPE_LABELS[accountType] ?? accountType;
    out.push({
      id: `${DERIVED_LIST_ID_PREFIX}${accountType}`,
      name: `${label} Partners`,
      partnerIds: Array.from(partnerSet).sort((a, b) => a.localeCompare(b)),
      filters: { ACCOUNT_TYPE: [accountType] },
      source: 'derived',
      createdAt: now,
      updatedAt: now,
    });
  }

  // Sort lists alphabetically by name for stable rendering order.
  out.sort((a, b) => a.name.localeCompare(b.name));
  return out;
}
