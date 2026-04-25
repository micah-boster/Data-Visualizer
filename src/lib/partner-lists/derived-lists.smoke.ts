/**
 * Smoke test for Phase 39 PCFG-06 derived-list generator.
 *
 * Verifies:
 *   - Empty rows → empty output
 *   - Three distinct ACCOUNT_TYPE values → three lists
 *   - IDs stable across calls (merge/de-dup safety in usePartnerLists)
 *   - Each derived list has source === 'derived'
 *   - filters.ACCOUNT_TYPE === [value]
 *   - Names use PRODUCT_TYPE_LABELS for known types, raw value for unknown
 *   - partnerIds dedupes by PARTNER_NAME within an ACCOUNT_TYPE bucket
 *
 * Run: node --experimental-strip-types src/lib/partner-lists/derived-lists.smoke.ts
 */

import assert from 'node:assert/strict';

import {
  computeDerivedLists,
  DERIVED_LIST_ID_PREFIX,
} from './derived-lists.ts';

// Helper: shape a row record from compact tuples.
function row(partner: string, accountType: string): Record<string, unknown> {
  return { PARTNER_NAME: partner, ACCOUNT_TYPE: accountType };
}

// 1. Empty rows → empty output
{
  const out = computeDerivedLists([]);
  assert.deepEqual(out, [], 'empty rows return empty array');
}

// 2. Three distinct ACCOUNT_TYPE values → three lists
{
  const rows = [
    row('Acme', 'PRE_CHARGE_OFF_FIRST_PARTY'),
    row('Acme', 'THIRD_PARTY'),
    row('Beta', 'THIRD_PARTY'),
    row('Gamma', 'PRE_CHARGE_OFF_THIRD_PARTY'),
  ];
  const out = computeDerivedLists(rows, 1000);
  assert.equal(out.length, 3, 'three distinct ACCOUNT_TYPE values → three lists');
}

// 3. IDs are stable across calls — merge logic in usePartnerLists relies on this
{
  const rows = [
    row('Acme', 'PRE_CHARGE_OFF_FIRST_PARTY'),
    row('Beta', 'THIRD_PARTY'),
  ];
  const first = computeDerivedLists(rows, 1000);
  const second = computeDerivedLists(rows, 2000);
  assert.equal(
    first.length,
    second.length,
    'same input → same number of lists',
  );
  const firstIds = new Set(first.map((l) => l.id));
  const secondIds = new Set(second.map((l) => l.id));
  assert.equal(firstIds.size, secondIds.size, 'id sets are same size');
  for (const id of firstIds) {
    assert.ok(secondIds.has(id), `id ${id} stable across calls`);
  }
}

// 4. Each derived list has source === 'derived'
{
  const rows = [row('Acme', 'THIRD_PARTY')];
  const out = computeDerivedLists(rows, 1000);
  for (const list of out) {
    assert.equal(list.source, 'derived', "every list has source === 'derived'");
  }
}

// 5. filters.ACCOUNT_TYPE === [value]
{
  const rows = [
    row('Acme', 'PRE_CHARGE_OFF_FIRST_PARTY'),
    row('Beta', 'THIRD_PARTY'),
  ];
  const out = computeDerivedLists(rows, 1000);
  for (const list of out) {
    assert.ok(
      list.filters.ACCOUNT_TYPE && list.filters.ACCOUNT_TYPE.length === 1,
      'filters.ACCOUNT_TYPE has exactly one entry',
    );
    // The filter value should match the ACCOUNT_TYPE the list was derived from
    // (extractable from the id suffix).
    const accountType = list.id.slice(DERIVED_LIST_ID_PREFIX.length);
    assert.equal(
      list.filters.ACCOUNT_TYPE![0],
      accountType,
      'filter value matches the source ACCOUNT_TYPE',
    );
  }
}

// 6. Names use PRODUCT_TYPE_LABELS for known types, raw value for unknown
{
  const rows = [
    row('Acme', 'PRE_CHARGE_OFF_FIRST_PARTY'),
    row('Beta', 'THIRD_PARTY'),
    row('Gamma', 'WEIRD_UNKNOWN_TYPE'),
  ];
  const out = computeDerivedLists(rows, 1000);
  const namesById = new Map(out.map((l) => [l.id, l.name]));
  assert.equal(
    namesById.get(`${DERIVED_LIST_ID_PREFIX}PRE_CHARGE_OFF_FIRST_PARTY`),
    '1st Party Partners',
    'known type uses PRODUCT_TYPE_LABELS',
  );
  assert.equal(
    namesById.get(`${DERIVED_LIST_ID_PREFIX}THIRD_PARTY`),
    '3rd Party Partners',
    'THIRD_PARTY → "3rd Party Partners"',
  );
  assert.equal(
    namesById.get(`${DERIVED_LIST_ID_PREFIX}WEIRD_UNKNOWN_TYPE`),
    'WEIRD_UNKNOWN_TYPE Partners',
    'unknown type falls back to raw value with " Partners" suffix',
  );
}

// 7. partnerIds dedupes within an ACCOUNT_TYPE bucket and excludes empty/missing
{
  const rows = [
    row('Acme', 'THIRD_PARTY'),
    row('Acme', 'THIRD_PARTY'), // duplicate
    row('Beta', 'THIRD_PARTY'),
    row('', 'THIRD_PARTY'), // missing partner — excluded
    row('Gamma', ''), // missing accountType — excluded
  ];
  const out = computeDerivedLists(rows, 1000);
  assert.equal(out.length, 1, 'one bucket: THIRD_PARTY');
  const list = out[0];
  assert.deepEqual(
    list.partnerIds,
    ['Acme', 'Beta'],
    'partnerIds deduped + sorted, missing rows excluded',
  );
}

// 8. createdAt + updatedAt set from `now` argument
{
  const out = computeDerivedLists([row('Acme', 'THIRD_PARTY')], 12345);
  assert.equal(out[0].createdAt, 12345, 'createdAt = now');
  assert.equal(out[0].updatedAt, 12345, 'updatedAt = now');
}

console.log('derived-lists smoke OK');
