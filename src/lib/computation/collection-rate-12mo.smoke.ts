/**
 * DCR-03 scope-rollup invariant for COLLECTION_AFTER_12_MONTH.
 *
 * Three-way invariant:
 *   1. Direct math   — Σ(COLLECTION_AFTER_12_MONTH) / Σ(TOTAL_AMOUNT_PLACED)
 *                      over the pair's batches
 *   2. Pair summary  — Σ(COLLECTION_AFTER_12_MONTH) at partner-row aggregate
 *                      (sum strategy)
 *   3. KPI rate      — `computeKpis(pair.rows).collectionRate12mo` matches
 *
 * DCR-07 horizon contract: a batch with BATCH_AGE_IN_MONTHS < 12 has not
 * reached the 12-month horizon. The anomaly detector censors such batches
 * via `isMetricEligible` (see metric-eligibility.ts), but the headline rate
 * computed by `computeKpis` still SUMS COLLECTION_AFTER_12_MONTH over all
 * batches (young batches typically contribute 0 to the numerator).
 *
 * This smoke pins the CURRENT CONTRACT — sum-numerator over total-placed
 * with no 12mo-eligibility filtering at the rate-derivation layer — and
 * also asserts that the anomaly-detector censoring path (isMetricEligible)
 * correctly excludes a young batch.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { computeKpis } from './compute-kpis.ts';
import { parseBatchRows } from '../data/parse-batch-row.ts';
import { asBatchAgeMonths, type BatchRow } from '../data/types.ts';

/** Phase 43 BND-02 — route raw fixture rows through the canonical parser. */
function toBatchRows(rows: Record<string, unknown>[]): BatchRow[] {
  return parseBatchRows(rows).rows;
}
import { isMetricEligible } from './metric-eligibility.ts';

const FIXTURE_PATH = resolve(import.meta.dirname, '../static-cache/batch-summary.json');
const fixture = JSON.parse(readFileSync(FIXTURE_PATH, 'utf-8')) as {
  data: Record<string, unknown>[];
};
const allRows = fixture.data;

// Pick a pair with at least one young (<12mo) AND at least one mature
// (>=12mo) batch so the eligibility-censoring assertion has teeth.
const pair = (() => {
  const seen = new Map<string, Record<string, unknown>[]>();
  for (const row of allRows) {
    const key = `${row.PARTNER_NAME}::${row.ACCOUNT_TYPE}`;
    const existing = seen.get(key) ?? [];
    existing.push(row);
    seen.set(key, existing);
  }
  for (const [key, rows] of seen.entries()) {
    if (rows.length < 3) continue;
    const ages = rows.map((r) => Number(r.BATCH_AGE_IN_MONTHS));
    const hasYoung = ages.some((a) => a < 12);
    const hasMature = ages.some((a) => a >= 12);
    if (!hasYoung || !hasMature) continue;
    return { key, rows };
  }
  throw new Error('No suitable pair (mixed-age) in fixture');
})();

const TOLERANCE = 1e-6;

// (1) Direct math
const sumCol12 = pair.rows.reduce(
  (s, r) => s + (Number(r.COLLECTION_AFTER_12_MONTH) || 0),
  0,
);
const sumPlaced = pair.rows.reduce(
  (s, r) => s + (Number(r.TOTAL_AMOUNT_PLACED) || 0),
  0,
);
assert.ok(sumPlaced > 0, 'pair must have positive total placed');
const directRate12mo = sumCol12 / sumPlaced;

// (2) Pair-summary surface (sum strategy)
const summaryCol12 = pair.rows.reduce(
  (s, r) => s + (Number(r.COLLECTION_AFTER_12_MONTH) || 0),
  0,
);
assert.ok(
  Math.abs(summaryCol12 - sumCol12) < TOLERANCE,
  `summary COLLECTION_AFTER_12_MONTH (${summaryCol12}) !== direct sum (${sumCol12}) for ${pair.key}`,
);

// (3) KPI rate matches
const kpis = computeKpis(toBatchRows(pair.rows));
assert.ok(
  Math.abs(kpis.collectionRate12mo - directRate12mo) < TOLERANCE,
  `direct rate (${directRate12mo}) !== kpi.collectionRate12mo (${kpis.collectionRate12mo}) for ${pair.key}`,
);

// (4) DCR-07 eligibility: a young batch (<12mo) is NOT eligible for the
// 12mo metric in the anomaly-detector path.
const youngBatch = pair.rows.find(
  (r) => Number(r.BATCH_AGE_IN_MONTHS) < 12,
);
assert(youngBatch, 'fixture invariant: pair must include at least one <12mo batch');
const youngAge = Number(youngBatch.BATCH_AGE_IN_MONTHS);
assert.equal(
  isMetricEligible(asBatchAgeMonths(youngAge), 'COLLECTION_AFTER_12_MONTH'),
  false,
  `young batch (age=${youngAge}) must NOT be eligible for COLLECTION_AFTER_12_MONTH`,
);

const matureBatch = pair.rows.find(
  (r) => Number(r.BATCH_AGE_IN_MONTHS) >= 12,
);
assert(matureBatch, 'fixture invariant: pair must include at least one >=12mo batch');
const matureAge = Number(matureBatch.BATCH_AGE_IN_MONTHS);
assert.equal(
  isMetricEligible(asBatchAgeMonths(matureAge), 'COLLECTION_AFTER_12_MONTH'),
  true,
  `mature batch (age=${matureAge}) must be eligible for COLLECTION_AFTER_12_MONTH`,
);

console.log(
  `collection-rate-12mo smoke OK (pair=${pair.key}, n=${pair.rows.length}, rate=${directRate12mo.toFixed(6)}, censored-young=${youngAge}mo)`,
);
