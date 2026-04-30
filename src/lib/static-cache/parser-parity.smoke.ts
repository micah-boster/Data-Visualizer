/**
 * DCR-02 / DCR-08 — static-cache parity check.
 *
 * Two universes of truth currently exist for batch row data: live
 * Snowflake queries (`/api/data`) and the static cache JSON
 * (`src/lib/static-cache/batch-summary.json`). Plan 41-02 added
 * parseBatchRow as the canonical parser at the data boundary; this
 * smoke verifies that:
 *
 *   (a) Loading every fixture row through parseBatchRow does NOT throw
 *       and resolves rate-shaped nullable fields to number | null
 *   (b) Computing KPIs over the parsed cache produces the same numerical
 *       result as computing over the unparsed cache for non-nullable
 *       metrics (regression guard — parser must be additive, not lossy)
 *   (c) Reports observed null/number counts for the rate-shaped fields
 *       so a future cache regeneration that introduces nullish values is
 *       detectable from CI output. Today's cache predates DCR-08 and does
 *       NOT carry the 7 rate-shaped fields at all (observed in Plan 41-05).
 *
 * Phase 43 BND-01 will widen parseBatchRow to brand BatchAgeMonths and
 * bake long-format curves; this smoke is then extended in Phase 43.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  parseBatchRow,
  RATE_SHAPED_NULLABLE_FIELDS,
} from '../data/parse-batch-row.ts';
import { computeKpis } from '../computation/compute-kpis.ts';

const FIXTURE_PATH = resolve(import.meta.dirname, 'batch-summary.json');
const fixture = JSON.parse(readFileSync(FIXTURE_PATH, 'utf-8')) as {
  data: Record<string, unknown>[];
};
const rawRows = fixture.data;
assert.ok(rawRows.length > 0, 'fixture must have rows');

// (a) Parse every row — no throws.
const parsedRows = rawRows.map(parseBatchRow);
assert.equal(parsedRows.length, rawRows.length);

// Verify rate-shaped fields are properly typed as number | null when present.
let nullishCount = 0;
let numberCount = 0;
let absentCount = 0;
for (const row of parsedRows) {
  for (const field of RATE_SHAPED_NULLABLE_FIELDS) {
    if (!(field in row)) {
      absentCount++;
      continue;
    }
    const value = row[field];
    if (value === null) {
      nullishCount++;
      continue;
    }
    if (typeof value === 'number') {
      numberCount++;
      continue;
    }
    assert.fail(
      `parseBatchRow left ${field} as type ${typeof value} (value=${JSON.stringify(value)}) — must be number | null`,
    );
  }
}

// (b) Non-nullable metrics: compute parity. Parsing must NOT change values
// for fields outside the rate-shaped sentinel list.
const TOLERANCE = 0.01;
const kpisRaw = computeKpis(rawRows);
const kpisParsed = computeKpis(parsedRows);

assert.equal(
  kpisRaw.totalAccounts,
  kpisParsed.totalAccounts,
  'parsing should not change totalAccounts (non-rate-shaped sum)',
);
assert.equal(
  kpisRaw.totalBatches,
  kpisParsed.totalBatches,
  'parsing should not change totalBatches',
);
assert.ok(
  Math.abs(kpisRaw.totalPlaced - kpisParsed.totalPlaced) < TOLERANCE,
  `totalPlaced parity: raw=${kpisRaw.totalPlaced} parsed=${kpisParsed.totalPlaced}`,
);
assert.ok(
  Math.abs(kpisRaw.totalCollected - kpisParsed.totalCollected) < TOLERANCE,
  `totalCollected parity: raw=${kpisRaw.totalCollected} parsed=${kpisParsed.totalCollected}`,
);
assert.ok(
  Math.abs(kpisRaw.collectionRate3mo - kpisParsed.collectionRate3mo) < 1e-9,
  `collectionRate3mo parity: raw=${kpisRaw.collectionRate3mo} parsed=${kpisParsed.collectionRate3mo}`,
);
assert.ok(
  Math.abs(kpisRaw.collectionRate6mo - kpisParsed.collectionRate6mo) < 1e-9,
  `collectionRate6mo parity: raw=${kpisRaw.collectionRate6mo} parsed=${kpisParsed.collectionRate6mo}`,
);
assert.ok(
  Math.abs(kpisRaw.collectionRate12mo - kpisParsed.collectionRate12mo) < 1e-9,
  `collectionRate12mo parity: raw=${kpisRaw.collectionRate12mo} parsed=${kpisParsed.collectionRate12mo}`,
);
assert.ok(
  Math.abs(kpisRaw.weightedPenetrationRate - kpisParsed.weightedPenetrationRate) < 1e-9,
  `weightedPenetrationRate parity: raw=${kpisRaw.weightedPenetrationRate} parsed=${kpisParsed.weightedPenetrationRate}`,
);

// (c) Diagnostic output for cache shape — visible in CI, helps detect
// future cache regenerations that introduce nullish rate-shaped values.
const totalRateSlots =
  parsedRows.length * RATE_SHAPED_NULLABLE_FIELDS.length;
console.log(
  `parser-parity smoke OK (rows=${parsedRows.length}, rate-shaped slots=${totalRateSlots}: null=${nullishCount}, number=${numberCount}, absent=${absentCount})`,
);
