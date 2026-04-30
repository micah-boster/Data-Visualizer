/**
 * DCR-03 scope-rollup invariant for sum-strategy volume metrics:
 *   TOTAL_AMOUNT_PLACED, TOTAL_COLLECTED_LIFE_TIME, TOTAL_ACCOUNTS,
 *   __BATCH_COUNT
 *
 * For each: assert that
 *   sum(per-batch.X) === pair-summary.X === computeKpis(pair.rows).total*
 *
 * The Σ-equality contract is the load-bearing invariant for triangulation:
 * v5.0 Phase 47 reads `docs/METRIC-AUDIT.md` to know totals match Snowflake;
 * this smoke verifies the math holds at every drill level so the audit
 * doc's ✅ status is grounded in code.
 *
 * Pair-summary values are computed inline here (replicating the sum
 * branches of buildPairSummaryRows) to keep the smoke self-contained
 * — production helper imports `@/components/...` which node-strip-types
 * cannot resolve. Same Σ formula; filesystem check pins production.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { computeKpis } from './compute-kpis.ts';

const FIXTURE_PATH = resolve(import.meta.dirname, '../static-cache/batch-summary.json');
const fixture = JSON.parse(readFileSync(FIXTURE_PATH, 'utf-8')) as {
  data: Record<string, unknown>[];
};
const allRows = fixture.data;

// Pair-summary inline replica (sum strategy for additive numeric columns).
// Mirrors `buildPairSummaryRows` in src/lib/columns/root-columns.ts; the
// filesystem check at the bottom of this smoke pins the production source.
function buildPairSummaryReplica(
  rows: Record<string, unknown>[],
): Record<string, Record<string, number>> {
  const groups = new Map<string, Record<string, unknown>[]>();
  for (const r of rows) {
    const key = `${r.PARTNER_NAME}::${r.ACCOUNT_TYPE}`;
    const existing = groups.get(key) ?? [];
    existing.push(r);
    groups.set(key, existing);
  }
  const out: Record<string, Record<string, number>> = {};
  for (const [key, group] of groups.entries()) {
    const sum = (k: string) =>
      group.reduce((s, r) => s + (Number(r[k]) || 0), 0);
    out[key] = {
      __BATCH_COUNT: group.length,
      TOTAL_ACCOUNTS: sum('TOTAL_ACCOUNTS'),
      TOTAL_AMOUNT_PLACED: sum('TOTAL_AMOUNT_PLACED'),
      TOTAL_COLLECTED_LIFE_TIME: sum('TOTAL_COLLECTED_LIFE_TIME'),
      COLLECTION_AFTER_6_MONTH: sum('COLLECTION_AFTER_6_MONTH'),
      COLLECTION_AFTER_12_MONTH: sum('COLLECTION_AFTER_12_MONTH'),
    };
  }
  return out;
}

// Pick a pair with multiple batches.
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
    return { key, rows };
  }
  throw new Error('No suitable pair (>=3 batches) in fixture');
})();

const TOLERANCE_DOLLARS = 0.01;

// Direct sums
const sumPlaced = pair.rows.reduce(
  (s, r) => s + (Number(r.TOTAL_AMOUNT_PLACED) || 0),
  0,
);
const sumCollected = pair.rows.reduce(
  (s, r) => s + (Number(r.TOTAL_COLLECTED_LIFE_TIME) || 0),
  0,
);
const sumAccounts = pair.rows.reduce(
  (s, r) => s + (Number(r.TOTAL_ACCOUNTS) || 0),
  0,
);
const batchCount = pair.rows.length;

// Pair-summary replica
const allSummariesByKey = buildPairSummaryReplica(allRows);
const pairSummary = allSummariesByKey[pair.key];
assert(pairSummary, `summary row missing for ${pair.key}`);

// Summary === direct
assert.ok(
  Math.abs(pairSummary.TOTAL_AMOUNT_PLACED - sumPlaced) < TOLERANCE_DOLLARS,
  `TOTAL_AMOUNT_PLACED: summary (${pairSummary.TOTAL_AMOUNT_PLACED}) !== direct (${sumPlaced})`,
);
assert.ok(
  Math.abs(pairSummary.TOTAL_COLLECTED_LIFE_TIME - sumCollected) < TOLERANCE_DOLLARS,
  `TOTAL_COLLECTED_LIFE_TIME: summary (${pairSummary.TOTAL_COLLECTED_LIFE_TIME}) !== direct (${sumCollected})`,
);
assert.equal(
  pairSummary.TOTAL_ACCOUNTS,
  sumAccounts,
  `TOTAL_ACCOUNTS: summary (${pairSummary.TOTAL_ACCOUNTS}) !== direct (${sumAccounts})`,
);
assert.equal(
  pairSummary.__BATCH_COUNT,
  batchCount,
  `__BATCH_COUNT: summary (${pairSummary.__BATCH_COUNT}) !== direct (${batchCount})`,
);

// KPI === direct
const kpis = computeKpis(pair.rows);
assert.ok(
  Math.abs(kpis.totalPlaced - sumPlaced) < TOLERANCE_DOLLARS,
  `KPI totalPlaced (${kpis.totalPlaced}) !== direct (${sumPlaced})`,
);
assert.ok(
  Math.abs(kpis.totalCollected - sumCollected) < TOLERANCE_DOLLARS,
  `KPI totalCollected (${kpis.totalCollected}) !== direct (${sumCollected})`,
);
assert.equal(
  kpis.totalAccounts,
  sumAccounts,
  `KPI totalAccounts (${kpis.totalAccounts}) !== direct (${sumAccounts})`,
);
assert.equal(
  kpis.totalBatches,
  batchCount,
  `KPI totalBatches (${kpis.totalBatches}) !== direct (${batchCount})`,
);

// Root-scope: sum of per-pair summaries === computeKpis on all rows.
const rootKpis = computeKpis(allRows);
const summaryEntries = Object.values(allSummariesByKey);
const summedPlacedAcrossPairs = summaryEntries.reduce(
  (s, r) => s + r.TOTAL_AMOUNT_PLACED,
  0,
);
const summedCollectedAcrossPairs = summaryEntries.reduce(
  (s, r) => s + r.TOTAL_COLLECTED_LIFE_TIME,
  0,
);
const summedAccountsAcrossPairs = summaryEntries.reduce(
  (s, r) => s + r.TOTAL_ACCOUNTS,
  0,
);
const summedBatchesAcrossPairs = summaryEntries.reduce(
  (s, r) => s + r.__BATCH_COUNT,
  0,
);

assert.ok(
  Math.abs(rootKpis.totalPlaced - summedPlacedAcrossPairs) < TOLERANCE_DOLLARS,
  `root: KPI totalPlaced (${rootKpis.totalPlaced}) !== sum-of-pair-summaries (${summedPlacedAcrossPairs})`,
);
assert.ok(
  Math.abs(rootKpis.totalCollected - summedCollectedAcrossPairs) < TOLERANCE_DOLLARS,
  `root: KPI totalCollected (${rootKpis.totalCollected}) !== sum-of-pair-summaries (${summedCollectedAcrossPairs})`,
);
assert.equal(
  rootKpis.totalAccounts,
  summedAccountsAcrossPairs,
  `root: KPI totalAccounts (${rootKpis.totalAccounts}) !== sum-of-pair-summaries (${summedAccountsAcrossPairs})`,
);
assert.equal(
  rootKpis.totalBatches,
  summedBatchesAcrossPairs,
  `root: KPI totalBatches (${rootKpis.totalBatches}) !== sum-of-pair-summaries (${summedBatchesAcrossPairs})`,
);

// Filesystem check: production buildPairSummaryRows still sums these
// columns. Catches drift in either direction.
{
  const here = import.meta.dirname;
  const src = readFileSync(
    resolve(here, '../columns/root-columns.ts'),
    'utf-8',
  );
  for (const col of [
    'TOTAL_ACCOUNTS',
    'TOTAL_AMOUNT_PLACED',
    'TOTAL_COLLECTED_LIFE_TIME',
    'COLLECTION_AFTER_6_MONTH',
    'COLLECTION_AFTER_12_MONTH',
  ]) {
    const re = new RegExp(`sum\\(['\"]${col}['\"]\\)`);
    assert.match(
      src,
      re,
      `production buildPairSummaryRows must sum ${col}`,
    );
  }
  assert.match(
    src,
    /__BATCH_COUNT:\s*rows\.length/,
    'production buildPairSummaryRows must compute __BATCH_COUNT as rows.length',
  );
}

console.log(
  `totals-rollup smoke OK (pair=${pair.key}, n=${batchCount}; root: pairs=${summaryEntries.length}, batches=${rootKpis.totalBatches}, placed=$${rootKpis.totalPlaced.toFixed(2)})`,
);
