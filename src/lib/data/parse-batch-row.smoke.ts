/**
 * Phase 43 BND-01 — smoke test pinning the parser contract.
 *
 * Cases:
 *   1. Happy-path row → returns BatchRow with batchAgeMonths branded, curve
 *      populated from the wide columns, all rate-shaped fields preserved as
 *      number or null.
 *   2. Missing BATCH_AGE_IN_MONTHS → dropped with reason "invalid
 *      BATCH_AGE_IN_MONTHS".
 *   3. Negative BATCH_AGE_IN_MONTHS → dropped (asBatchAgeMonths throws
 *      RangeError).
 *   4. Missing PARTNER_NAME → dropped with reason "missing identity ...".
 *   5. Empty SMS_OPEN_RATE → field is null (DCR-08 preserved).
 *   6. Sparse curve (only months 1, 3, 6 populated) → curve array has 3
 *      entries, no NaN injection.
 *   7. parseBatchRows([happy, malformed, happy]) → rows.length === 2,
 *      dropped.length === 1.
 *
 * Run: node --experimental-strip-types src/lib/data/parse-batch-row.smoke.ts
 *
 * Registered as `npm run smoke:parse-batch-row` in package.json.
 */

import assert from 'node:assert/strict';

import {
  parseBatchRow,
  parseBatchRows,
  isRateShapedNullable,
  RATE_SHAPED_NULLABLE_FIELDS,
  DROP_REASON_INVALID_AGE,
  DROP_REASON_MISSING_IDENTITY,
} from './parse-batch-row.ts';
import { asBatchAgeMonths } from './types.ts';

// ---------------------------------------------------------------------------
// Fixture builders
// ---------------------------------------------------------------------------

function happyRow(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    PARTNER_NAME: 'Acme',
    ACCOUNT_TYPE: 'THIRD_PARTY',
    BATCH: 'ACME_FEB_26',
    LENDER_ID: 'acme',
    BATCH_AGE_IN_MONTHS: 6,
    TOTAL_ACCOUNTS: 100,
    TOTAL_AMOUNT_PLACED: 1_000_000,
    TOTAL_CONVERTED_ACCOUNTS: 25,
    TOTAL_COLLECTED_LIFE_TIME: 50_000,
    AVG_AMOUNT_PLACED: 10_000,
    COLLECTION_AFTER_3_MONTH: 30_000,
    COLLECTION_AFTER_6_MONTH: 50_000,
    COLLECTION_AFTER_12_MONTH: null,
    SMS_OPEN_RATE: 12.5,
    SMS_CLICK_RATE: 2.0,
    EMAIL_OPEN_RATE: null,
    EMAIL_CLICK_RATE: 0,
    CALL_CONNECT_RATE: 0.5,
    CALL_RPC_RATE: '',
    DISPUTE_RATE: 0.1,
    COLLECTION_AFTER_1_MONTH: 5_000,
    COLLECTION_AFTER_2_MONTH: 15_000,
    COLLECTION_AFTER_4_MONTH: 40_000,
    COLLECTION_AFTER_5_MONTH: 45_000,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Cases
// ---------------------------------------------------------------------------

// 1. Happy path
{
  const parsed = parseBatchRow(happyRow());
  assert.ok(parsed !== null, 'happy row should parse');
  assert.equal(parsed!.partnerName, 'Acme');
  assert.equal(parsed!.accountType, 'THIRD_PARTY');
  assert.equal(parsed!.batchName, 'ACME_FEB_26');
  assert.equal(parsed!.lenderId, 'acme');

  // Branded age — equal to a manually-constructed brand.
  assert.equal(parsed!.batchAgeMonths, asBatchAgeMonths(6));
  assert.equal(parsed!.batchAgeMonths, 6);

  // Volume passes through.
  assert.equal(parsed!.totalAccounts, 100);
  assert.equal(parsed!.totalAmountPlaced, 1_000_000);
  assert.equal(parsed!.totalCollectedLifeTime, 50_000);

  // Horizon: present preserved, null preserved.
  assert.equal(parsed!.collectionAfter3Month, 30_000);
  assert.equal(parsed!.collectionAfter6Month, 50_000);
  assert.equal(parsed!.collectionAfter12Month, null);

  // Rate-shaped: number, null, 0, empty-as-null.
  assert.equal(parsed!.smsOpenRate, 12.5);
  assert.equal(parsed!.emailOpenRate, null);
  assert.equal(parsed!.emailClickRate, 0, 'genuine 0 stays 0');
  assert.equal(parsed!.callRpcRate, null, 'empty string becomes null');
  assert.equal(parsed!.disputeRate, 0.1);

  // Curve baked: months 1..6 populated (all wide columns provided), no 12mo
  // because COLLECTION_AFTER_12_MONTH is null.
  assert.ok(parsed!.curve.length >= 6, 'curve has at least 6 points');
  const curveMonths = parsed!.curve.map((p) => p.month).sort((a, b) => a - b);
  assert.deepEqual(
    curveMonths,
    [1, 2, 3, 4, 5, 6],
    'happy row populates months 1..6 only',
  );
  // recoveryRate is on 0..100 scale: 30_000 / 1_000_000 * 100 = 3 at month 3.
  const m3 = parsed!.curve.find((p) => p.month === 3);
  assert.equal(m3?.recoveryRate, 3, 'recoveryRate is percentage on 0..100 scale');

  // Raw passthrough preserved.
  assert.equal(parsed!.raw.PARTNER_NAME, 'Acme');
  assert.equal(parsed!.raw.SMS_OPEN_RATE, 12.5, 'raw preserves original key');
}

// 2. Missing BATCH_AGE_IN_MONTHS → dropped
{
  const result = parseBatchRows([
    happyRow({ BATCH_AGE_IN_MONTHS: undefined }),
  ]);
  assert.equal(result.rows.length, 0);
  assert.equal(result.dropped.length, 1);
  assert.equal(result.dropped[0].reason, DROP_REASON_INVALID_AGE);
  assert.equal(result.dropped[0].sample.PARTNER_NAME, 'Acme');
}

// 3. Negative BATCH_AGE_IN_MONTHS → dropped (asBatchAgeMonths throws)
{
  const result = parseBatchRows([happyRow({ BATCH_AGE_IN_MONTHS: -3 })]);
  assert.equal(result.rows.length, 0);
  assert.equal(result.dropped.length, 1);
  assert.equal(result.dropped[0].reason, DROP_REASON_INVALID_AGE);
}

// 4. Missing PARTNER_NAME → dropped
{
  const result = parseBatchRows([happyRow({ PARTNER_NAME: '' })]);
  assert.equal(result.rows.length, 0);
  assert.equal(result.dropped.length, 1);
  assert.equal(result.dropped[0].reason, DROP_REASON_MISSING_IDENTITY);
}

// 5. Empty SMS_OPEN_RATE → null (DCR-08 contract preserved)
{
  const parsed = parseBatchRow(happyRow({ SMS_OPEN_RATE: '' }));
  assert.ok(parsed !== null, 'row still parses with empty SMS_OPEN_RATE');
  assert.equal(parsed!.smsOpenRate, null, 'empty rate-shaped field is null');
}

// 6. Sparse curve — only months 1, 3, 6 populated
{
  const parsed = parseBatchRow(
    happyRow({
      // Wipe out the other months so only 1, 3, 6 remain populated.
      COLLECTION_AFTER_2_MONTH: null,
      COLLECTION_AFTER_4_MONTH: null,
      COLLECTION_AFTER_5_MONTH: null,
      // Leave COLLECTION_AFTER_1_MONTH, _3_MONTH, _6_MONTH set from happyRow.
    }),
  );
  assert.ok(parsed !== null);
  const months = parsed!.curve.map((p) => p.month).sort((a, b) => a - b);
  assert.deepEqual(months, [1, 3, 6], 'sparse curve has 3 entries');
  for (const point of parsed!.curve) {
    assert.ok(
      Number.isFinite(point.recoveryRate),
      `month ${point.month} has finite recoveryRate (no NaN injection)`,
    );
  }
}

// 7. parseBatchRows partitions correctly across mixed input
{
  const happy1 = happyRow({ BATCH: 'ACME_FEB_26' });
  const malformed = happyRow({ BATCH: 'ACME_BAD', BATCH_AGE_IN_MONTHS: -1 });
  const happy2 = happyRow({ BATCH: 'ACME_MAR_26' });
  const result = parseBatchRows([happy1, malformed, happy2]);

  assert.equal(result.rows.length, 2);
  assert.equal(result.dropped.length, 1);
  assert.deepEqual(
    result.rows.map((r) => r.batchName),
    ['ACME_FEB_26', 'ACME_MAR_26'],
    'happy rows preserve order and drop the malformed one',
  );
  assert.equal(result.dropped[0].reason, DROP_REASON_INVALID_AGE);
}

// 8. Sentinel list integrity (cross-plan tie to Plan 41-02 + Plan 41-03)
{
  assert.equal(RATE_SHAPED_NULLABLE_FIELDS.length, 7);
  assert.ok(RATE_SHAPED_NULLABLE_FIELDS.includes('DISPUTE_RATE'));
  assert.equal(isRateShapedNullable('SMS_OPEN_RATE'), true);
  assert.equal(isRateShapedNullable('PARTNER_NAME'), false);
}

console.log(
  `parse-batch-row smoke OK (sentinel-fields=${RATE_SHAPED_NULLABLE_FIELDS.length})`,
);
