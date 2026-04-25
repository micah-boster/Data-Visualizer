/**
 * Smoke test for Phase 39 PCFG-06 additive PRODUCT_TYPE / SEGMENT / derived
 * schema evolution.
 *
 * Asserts that legacy pre-Phase-39 PartnerList payloads (only ACCOUNT_TYPE,
 * source 'attribute' | 'manual') still pass `partnerListSchema.safeParse`
 * after the additive PRODUCT_TYPE + SEGMENT + 'derived' extensions land.
 * Mirrors Phase 32-02 / 34-04 / 38 FLT-01 additive-optional precedent.
 *
 * Run: node --experimental-strip-types src/lib/partner-lists/schema.additive-segment.smoke.ts
 */

import assert from 'node:assert/strict';

import { partnerListSchema } from './schema.ts';

// 1. Legacy payload — pre-Phase-39 shape with only ACCOUNT_TYPE + source 'attribute'
{
  const legacy = {
    id: 'legacy-1',
    name: '1st Party Partners',
    partnerIds: ['Acme', 'Beta'],
    filters: {
      ACCOUNT_TYPE: ['PRE_CHARGE_OFF_FIRST_PARTY'],
    },
    source: 'attribute',
    createdAt: 1000,
    updatedAt: 2000,
  };
  const result = partnerListSchema.safeParse(legacy);
  assert.equal(
    result.success,
    true,
    'legacy attribute-source payload still parses',
  );
}

// 2. Legacy manual payload — empty filters
{
  const legacy = {
    id: 'legacy-2',
    name: 'My Picks',
    partnerIds: ['Acme'],
    filters: {},
    source: 'manual',
    createdAt: 1000,
    updatedAt: 2000,
  };
  const result = partnerListSchema.safeParse(legacy);
  assert.equal(result.success, true, 'legacy manual-source payload still parses');
}

// 3. Phase 39 modern payload — PRODUCT_TYPE + SEGMENT keys present
{
  const modern = {
    id: 'modern-1',
    name: 'Spanish Speakers',
    partnerIds: ['Snap'],
    filters: {
      PRODUCT_TYPE: ['THIRD_PARTY'],
      SEGMENT: ['Spanish'],
    },
    source: 'attribute',
    createdAt: 1000,
    updatedAt: 2000,
  };
  const result = partnerListSchema.safeParse(modern);
  assert.equal(
    result.success,
    true,
    'modern PRODUCT_TYPE + SEGMENT payload parses',
  );
}

// 4. Derived-source payload — Phase 39 auto-list
{
  const derived = {
    id: '__derived__THIRD_PARTY',
    name: '3rd Party Partners',
    partnerIds: ['Acme', 'Beta'],
    filters: {
      ACCOUNT_TYPE: ['THIRD_PARTY'],
    },
    source: 'derived',
    createdAt: 1000,
    updatedAt: 2000,
  };
  const result = partnerListSchema.safeParse(derived);
  assert.equal(result.success, true, "derived-source payload parses");
}

// 5. Strict-mode lock — unknown attribute key still fails
{
  const bogus = {
    id: 'bogus',
    name: 'X',
    partnerIds: [],
    filters: {
      UNKNOWN_KEY: ['x'],
    },
    source: 'attribute',
    createdAt: 1000,
    updatedAt: 2000,
  };
  const result = partnerListSchema.safeParse(bogus);
  assert.equal(
    result.success,
    false,
    'unknown attribute key still rejected by .strict()',
  );
}

// 6. Source-enum lock — unknown source value still fails
{
  const bogus = {
    id: 'bogus',
    name: 'X',
    partnerIds: [],
    filters: {},
    source: 'mystery',
    createdAt: 1000,
    updatedAt: 2000,
  };
  const result = partnerListSchema.safeParse(bogus);
  assert.equal(
    result.success,
    false,
    "unknown source value rejected by enum lock",
  );
}

console.log('schema.additive-segment smoke OK');
