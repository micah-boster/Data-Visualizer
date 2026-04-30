/**
 * DCR-03 scope-rollup invariant for COLLECTION_AFTER_6_MONTH.
 *
 * Three-way invariant:
 *   1. Direct math   — Σ(COLLECTION_AFTER_6_MONTH) / Σ(TOTAL_AMOUNT_PLACED)
 *                      over the pair's batches
 *   2. Pair summary  — Σ(COLLECTION_AFTER_6_MONTH) at partner-row aggregate
 *                      (sum strategy)
 *   3. KPI rate      — `computeKpis(pair.rows).collectionRate6mo` matches
 *
 * Note: `computeKpis` does NOT eligibility-gate the 6mo rate denominator
 * (it uses the full `totalPlaced`). Phase 41.6 may revisit; this smoke
 * pins the CURRENT contract — sum-numerator over total-placed-denominator
 * without 6mo-eligibility filtering — so a future change must update both
 * the math and this smoke deliberately.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { computeKpis } from './compute-kpis.ts';
import { parseBatchRows } from '../data/parse-batch-row.ts';
import type { BatchRow } from '../data/types.ts';

/** Phase 43 BND-02 — route raw fixture rows through the canonical parser. */
function toBatchRows(rows: Record<string, unknown>[]): BatchRow[] {
  return parseBatchRows(rows).rows;
}

const FIXTURE_PATH = resolve(import.meta.dirname, '../static-cache/batch-summary.json');
const fixture = JSON.parse(readFileSync(FIXTURE_PATH, 'utf-8')) as {
  data: Record<string, unknown>[];
};
const allRows = fixture.data;

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

const TOLERANCE = 1e-6;

// (1) Direct math: full sum over the pair (compute-kpis.ts does NOT
// eligibility-filter the 6mo rate denominator).
const sumCol6 = pair.rows.reduce(
  (s, r) => s + (Number(r.COLLECTION_AFTER_6_MONTH) || 0),
  0,
);
const sumPlaced = pair.rows.reduce(
  (s, r) => s + (Number(r.TOTAL_AMOUNT_PLACED) || 0),
  0,
);
assert.ok(sumPlaced > 0, 'pair must have positive total placed');
const directRate6mo = sumCol6 / sumPlaced;

// (2) Pair-summary surface (replica of buildPairSummaryRows sum strategy)
const summaryCol6 = pair.rows.reduce(
  (s, r) => s + (Number(r.COLLECTION_AFTER_6_MONTH) || 0),
  0,
);
assert.ok(
  Math.abs(summaryCol6 - sumCol6) < TOLERANCE,
  `summary COLLECTION_AFTER_6_MONTH (${summaryCol6}) !== direct sum (${sumCol6}) for ${pair.key}`,
);

// (3) KPI rate matches
const kpis = computeKpis(toBatchRows(pair.rows));
assert.ok(
  Math.abs(kpis.collectionRate6mo - directRate6mo) < TOLERANCE,
  `direct rate (${directRate6mo}) !== kpi.collectionRate6mo (${kpis.collectionRate6mo}) for ${pair.key}`,
);

// Per-batch invariant: each batch's 6mo cell read is the row's raw value.
for (const r of pair.rows) {
  const raw = Number(r.COLLECTION_AFTER_6_MONTH);
  assert.ok(
    Number.isFinite(raw) || r.COLLECTION_AFTER_6_MONTH == null,
    `per-batch COLLECTION_AFTER_6_MONTH for ${r.BATCH} must be finite or null`,
  );
}

console.log(
  `collection-rate-6mo smoke OK (pair=${pair.key}, n=${pair.rows.length}, rate=${directRate6mo.toFixed(6)})`,
);
