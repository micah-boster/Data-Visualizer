/**
 * DCR-07 synthetic test — young-batch censoring.
 *
 * Fixture: 5 young (4-month-old) + 5 old (24-month-old) batches under one
 * partner. The young batches' COLLECTION_AFTER_12_MONTH metric is structurally
 * near-zero — they haven't reached the 12-month horizon. Without the
 * eligibility filter, anomaly detection would compute norms across all 10
 * batches' 12mo values, then flag the young batches as low-outliers
 * (z-score below threshold). With the filter, the young batches are
 * skipped on the 12mo metric — they only flag if anomalous within their
 * own age cohort (which, by construction in this fixture, they are not).
 *
 * This test pins the eligibility-filter behavior so DCR-07 cannot
 * silently regress.
 *
 * computeAnomalies signature (verified against current export):
 *   computeAnomalies(rows, norms) → AnomalyReport { partner: PartnerAnomaly }
 *   - rows: Record<string, unknown>[] for ONE partner (caller pre-groups)
 *   - norms: Record<string, MetricNorm> (caller computes via computeNorms)
 *   - PartnerAnomaly.batches: BatchAnomaly[] each with `batchName`, `flags`
 *
 * Batch age extraction: compute-anomalies.ts reads `BATCH_AGE_IN_MONTHS`
 * via `coerceAgeMonths(row.BATCH_AGE_IN_MONTHS)`. The test fixture writes
 * to that field directly.
 */

import { describe, it, expect } from 'vitest';
import { computeAnomalies } from './compute-anomalies';
import { computeNorms } from './compute-norms';

const PARTNER = 'TestPartner';
const PRODUCT = '3P';

interface FixtureBatch {
  PARTNER_NAME: string;
  ACCOUNT_TYPE: string;
  BATCH: string;
  LENDER_ID: string;
  BATCH_AGE_IN_MONTHS: number;
  TOTAL_AMOUNT_PLACED: number;
  TOTAL_COLLECTED_LIFE_TIME: number;
  PENETRATION_RATE_POSSIBLE_AND_CONFIRMED: number;
  RAITO_FIRST_TIME_CONVERTED_ACCOUNTS: number;
  COLLECTION_AFTER_3_MONTH: number;
  COLLECTION_AFTER_6_MONTH: number;
  COLLECTION_AFTER_12_MONTH: number;
}

function makeBatch(
  name: string,
  ageMonths: number,
  col3: number,
  col6: number,
  col12: number,
): FixtureBatch {
  return {
    PARTNER_NAME: PARTNER,
    ACCOUNT_TYPE: PRODUCT,
    BATCH: name,
    LENDER_ID: 'TEST_LENDER',
    BATCH_AGE_IN_MONTHS: ageMonths,
    TOTAL_AMOUNT_PLACED: 1_000_000,
    TOTAL_COLLECTED_LIFE_TIME: 250_000,
    PENETRATION_RATE_POSSIBLE_AND_CONFIRMED: 25,
    RAITO_FIRST_TIME_CONVERTED_ACCOUNTS: 0.5,
    COLLECTION_AFTER_3_MONTH: col3,
    COLLECTION_AFTER_6_MONTH: col6,
    COLLECTION_AFTER_12_MONTH: col12,
  };
}

const YOUNG_BATCH_AGE = 4;
const OLD_BATCH_AGE = 24;

describe('DCR-07 — young-batch censoring', () => {
  it('does not flag young batches on COLLECTION_AFTER_12_MONTH (ineligible — 4mo < 12mo horizon)', () => {
    // 5 young at 4mo: 12mo metric is structurally near-zero (no time to mature).
    // 5 old at 24mo: 12mo metric is fully populated, clustered ~600k.
    const youngBatches = [0, 1, 2, 3, 4].map((i) =>
      makeBatch(`young_${i}`, YOUNG_BATCH_AGE, 50_000, 100_000, 0),
    );
    const oldBatches = [0, 1, 2, 3, 4].map((i) =>
      makeBatch(`old_${i}`, OLD_BATCH_AGE, 200_000, 400_000, 600_000 + i * 5_000),
    );
    const allBatches = [...youngBatches, ...oldBatches] as unknown as Record<
      string,
      unknown
    >[];

    const norms = computeNorms(allBatches);
    const report = computeAnomalies(allBatches, norms);

    // Find every flag on COLLECTION_AFTER_12_MONTH and confirm none are on a
    // young batch — eligibility filter must remove the young batches from
    // evaluation on this metric.
    const youngBatchNames = new Set(youngBatches.map((b) => b.BATCH));
    for (const batch of report.partner.batches) {
      if (!youngBatchNames.has(batch.batchName)) continue;
      const has12moFlag = batch.flags.some(
        (f) => f.metric === 'COLLECTION_AFTER_12_MONTH',
      );
      expect(has12moFlag).toBe(false);
    }
  });

  it('still evaluates young batches on PENETRATION_RATE (always-eligible — horizon 0)', () => {
    // PENETRATION_RATE_POSSIBLE_AND_CONFIRMED is in ANOMALY_METRICS and has
    // horizon 0 (always eligible regardless of batch age). A young batch
    // that is anomalous on penetration MUST still flag — the eligibility
    // filter does NOT silently swallow legitimate flags on metrics whose
    // horizon the batch HAS reached.
    //
    // Note: COLLECTION_AFTER_3_MONTH is not in ANOMALY_METRICS (only 6 + 12
    // are), so 3mo is not a valid "eligible for young batch" probe via
    // anomaly detection. Penetration is a cleaner proxy for the same
    // contract: post-filter, eligible metrics are still evaluated.
    const HOMO = 25; // homogeneous penetration cluster
    const OUTLIER = 2; // far-low outlier (>2σ below)
    const youngHomogeneous = [0, 1, 2, 3].map((i) => {
      const b = makeBatch(`young_${i}`, YOUNG_BATCH_AGE, 0, 0, 0);
      b.PENETRATION_RATE_POSSIBLE_AND_CONFIRMED = HOMO + i * 0.1;
      return b;
    });
    const youngOutlier = (() => {
      const b = makeBatch('young_outlier', YOUNG_BATCH_AGE, 0, 0, 0);
      b.PENETRATION_RATE_POSSIBLE_AND_CONFIRMED = OUTLIER;
      return b;
    })();
    const oldHomogeneous = [0, 1, 2, 3, 4].map((i) => {
      const b = makeBatch(
        `old_${i}`,
        OLD_BATCH_AGE,
        200_000,
        400_000,
        600_000,
      );
      b.PENETRATION_RATE_POSSIBLE_AND_CONFIRMED = HOMO + i * 0.1;
      return b;
    });
    const allBatches = [
      ...youngHomogeneous,
      youngOutlier,
      ...oldHomogeneous,
    ] as unknown as Record<string, unknown>[];

    const norms = computeNorms(allBatches);
    const report = computeAnomalies(allBatches, norms);

    const outlierBatch = report.partner.batches.find(
      (b) => b.batchName === 'young_outlier',
    );
    expect(outlierBatch).toBeDefined();

    const flaggedOnPenetration = outlierBatch!.flags.some(
      (f) => f.metric === 'PENETRATION_RATE_POSSIBLE_AND_CONFIRMED',
    );
    expect(flaggedOnPenetration).toBe(true);
  });
});
