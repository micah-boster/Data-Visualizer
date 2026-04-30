/**
 * DCR-05 regression smoke for DCR-08 (null-vs-zero semantics).
 *
 * Pins these behaviors fixed in Plan 41-02:
 *   (a) parseBatchRow turns null/undefined/empty/NaN-string rate-shaped
 *       values into null
 *   (b) parseBatchRow preserves a genuine 0 as 0 (not null)
 *   (c) Non-rate-shaped fields pass through unchanged
 *   (d) isRateShapedNullable type-guard returns true for the 7 rate-shaped
 *       fields, false otherwise
 *   (e) RATE_SHAPED_NULLABLE_FIELDS sentinel list matches what's documented
 *       in the polarity audit (DISPUTE_RATE present — Plan 41-03 cross-ref)
 *
 * Cross-plan alignment: any change to the sentinel list MUST also update
 * docs/POLARITY-AUDIT.md (which lists the same 7 fields with their
 * polarity classification).
 */

import assert from 'node:assert/strict';
import {
  parseBatchRow,
  isRateShapedNullable,
  RATE_SHAPED_NULLABLE_FIELDS,
} from '../data/parse-batch-row.ts';

// (a) Nullish handling for rate-shaped fields
const rowNullish: Record<string, unknown> = {
  SMS_OPEN_RATE: null,
  EMAIL_OPEN_RATE: undefined,
  CALL_CONNECT_RATE: '',
  DISPUTE_RATE: 'not-a-number',
};
const parsedNullish = parseBatchRow(rowNullish);
assert.equal(parsedNullish.SMS_OPEN_RATE, null);
assert.equal(parsedNullish.EMAIL_OPEN_RATE, null);
assert.equal(parsedNullish.CALL_CONNECT_RATE, null);
assert.equal(
  parsedNullish.DISPUTE_RATE,
  null,
  'NaN string should parse to null, not 0',
);

// (b) Genuine zero preserved
const rowZero: Record<string, unknown> = {
  SMS_OPEN_RATE: 0,
  EMAIL_OPEN_RATE: '0',
  CALL_CONNECT_RATE: 0.0,
};
const parsedZero = parseBatchRow(rowZero);
assert.equal(parsedZero.SMS_OPEN_RATE, 0);
assert.equal(parsedZero.EMAIL_OPEN_RATE, 0);
assert.equal(parsedZero.CALL_CONNECT_RATE, 0);

// (c) Genuine non-zero preserved
const rowReal: Record<string, unknown> = {
  SMS_OPEN_RATE: '12.5',
  DISPUTE_RATE: 0.5,
};
const parsedReal = parseBatchRow(rowReal);
assert.equal(parsedReal.SMS_OPEN_RATE, 12.5);
assert.equal(parsedReal.DISPUTE_RATE, 0.5);

// (d) Non-rate-shaped fields pass through unchanged
const rowMixed: Record<string, unknown> = {
  SMS_OPEN_RATE: null, // rate-shaped → null
  TOTAL_AMOUNT_PLACED: '1000000', // not rate-shaped → unchanged
  PARTNER_NAME: 'Acme', // not rate-shaped
  COLLECTION_AFTER_6_MONTH: '500000', // not rate-shaped (CONTEXT lock — collection rates remain `number`)
};
const parsedMixed = parseBatchRow(rowMixed);
assert.equal(parsedMixed.SMS_OPEN_RATE, null);
assert.equal(
  parsedMixed.TOTAL_AMOUNT_PLACED,
  '1000000',
  'non-rate-shaped passes through',
);
assert.equal(parsedMixed.PARTNER_NAME, 'Acme');
assert.equal(
  parsedMixed.COLLECTION_AFTER_6_MONTH,
  '500000',
  'collection rate is NOT in rate-shaped nullable list (CONTEXT lock)',
);

// (e) isRateShapedNullable type-guard
assert.equal(isRateShapedNullable('SMS_OPEN_RATE'), true);
assert.equal(isRateShapedNullable('SMS_CLICK_RATE'), true);
assert.equal(isRateShapedNullable('EMAIL_OPEN_RATE'), true);
assert.equal(isRateShapedNullable('EMAIL_CLICK_RATE'), true);
assert.equal(isRateShapedNullable('CALL_CONNECT_RATE'), true);
assert.equal(isRateShapedNullable('CALL_RPC_RATE'), true);
assert.equal(isRateShapedNullable('DISPUTE_RATE'), true);
assert.equal(isRateShapedNullable('COLLECTION_AFTER_6_MONTH'), false);
assert.equal(isRateShapedNullable('PARTNER_NAME'), false);
assert.equal(
  isRateShapedNullable('PENETRATION_RATE_POSSIBLE_AND_CONFIRMED'),
  false,
  'penetration is NOT rate-shaped nullable (its denominator — placed dollars — is always present)',
);

// (f) Sentinel list matches polarity audit doc — DISPUTE_RATE must be present.
assert.ok(
  RATE_SHAPED_NULLABLE_FIELDS.includes('DISPUTE_RATE'),
  'DISPUTE_RATE missing from RATE_SHAPED_NULLABLE_FIELDS — polarity audit (Plan 41-03) cross-references this list',
);
assert.equal(
  RATE_SHAPED_NULLABLE_FIELDS.length,
  7,
  'RATE_SHAPED_NULLABLE_FIELDS must contain exactly 7 entries (CONTEXT lock); update docs/POLARITY-AUDIT.md if you change this',
);

console.log(
  `null-semantics smoke OK (sentinel-list size=${RATE_SHAPED_NULLABLE_FIELDS.length})`,
);
