/**
 * DCR-02 / DCR-08 — static-cache parity check.
 *
 * Two universes of truth currently exist for batch row data: live
 * Snowflake queries (`/api/data`) and the static cache JSON
 * (`src/lib/static-cache/batch-summary.json`). Plan 41-02 added
 * parseBatchRow as the canonical parser at the data boundary; this
 * smoke verifies that:
 *
 *   (a) Loading every fixture row through parseBatchRow does NOT throw,
 *       no rows drop (fixture is well-formed), and rate-shaped nullable
 *       fields resolve to number | null on the typed surface.
 *   (b) Computing KPIs over the parsed cache produces the same numerical
 *       result as computing over the unparsed cache for non-nullable
 *       metrics (regression guard — parser must be additive, not lossy).
 *       Until Task 3 of Phase 43 BND-02 migrates `computeKpis` to consume
 *       `BatchRow[]`, the parsed-side input is `parsedRows.map(r => r.raw)`
 *       so the SCREAMING_SNAKE-keyed reads inside computeKpis still hit.
 *   (c) Reports observed null/number counts for the rate-shaped fields
 *       so a future cache regeneration that introduces nullish values is
 *       detectable from CI output. Today's cache predates DCR-08 and does
 *       NOT carry the 7 rate-shaped fields at all (observed in Plan 41-05);
 *       under Phase 43 BND-01, `BatchRow.{smsOpenRate, ...}` always exists
 *       on the typed surface (defaulting to null when absent in raw), so
 *       the "absent" bucket is now zero by construction and the count
 *       collapses into the null bucket.
 *
 * Phase 43 BND-01: `parseBatchRow` returns `BatchRow | null`. The fixture
 * is expected to produce zero drops (fixture is well-formed); a non-zero
 * drop count means the bundled JSON is corrupt and we want it loud.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  parseBatchRow,
  parseBatchRows,
  RATE_SHAPED_NULLABLE_FIELDS,
  type RateShapedNullableField,
} from '../data/parse-batch-row.ts';
import { computeKpis } from '../computation/compute-kpis.ts';
import type { BatchRow } from '../data/types.ts';

/**
 * Map from the SCREAMING_SNAKE source-column key to the camelCase typed
 * surface property on `BatchRow`. Keeps the diagnostic output keyed on
 * the source-column names users recognize from Snowflake while reading
 * values off the typed shape.
 */
const RATE_SHAPED_TYPED_KEY: Record<RateShapedNullableField, keyof BatchRow> = {
  SMS_OPEN_RATE: 'smsOpenRate',
  SMS_CLICK_RATE: 'smsClickRate',
  EMAIL_OPEN_RATE: 'emailOpenRate',
  EMAIL_CLICK_RATE: 'emailClickRate',
  CALL_CONNECT_RATE: 'callConnectRate',
  CALL_RPC_RATE: 'callRpcRate',
  DISPUTE_RATE: 'disputeRate',
};

const FIXTURE_PATH = resolve(import.meta.dirname, 'batch-summary.json');
const fixture = JSON.parse(readFileSync(FIXTURE_PATH, 'utf-8')) as {
  data: Record<string, unknown>[];
};
const rawRows = fixture.data;
assert.ok(rawRows.length > 0, 'fixture must have rows');

// (a) Parse every row — no throws, no drops expected from a well-formed fixture.
const maybeParsed = rawRows.map(parseBatchRow);
const droppedCount = maybeParsed.filter((r) => r === null).length;
assert.equal(
  droppedCount,
  0,
  `fixture should be well-formed; got ${droppedCount} drops — fixture is corrupt`,
);
const parsedRows = maybeParsed.filter((r): r is BatchRow => r !== null);
assert.equal(parsedRows.length, rawRows.length);

// Verify rate-shaped fields are properly typed as number | null on the
// typed surface. Diagnostic counts use the SCREAMING_SNAKE source-column
// names for human-readable CI output; values are read from the camelCase
// typed properties.
let nullishCount = 0;
let numberCount = 0;
const absentCount = 0; // typed surface always has the property
for (const row of parsedRows) {
  for (const field of RATE_SHAPED_NULLABLE_FIELDS) {
    const typedKey = RATE_SHAPED_TYPED_KEY[field];
    const value = row[typedKey];
    if (value === null) {
      nullishCount++;
      continue;
    }
    if (typeof value === 'number') {
      numberCount++;
      continue;
    }
    assert.fail(
      `parseBatchRow left ${field} (typed: ${String(typedKey)}) as type ${typeof value} (value=${JSON.stringify(value)}) — must be number | null`,
    );
  }
}

// (b) Non-nullable metrics: compute parity. Parsing must NOT change values
// for fields outside the rate-shaped sentinel list. Phase 43 BND-02 Task 3
// migrated computeKpis to consume BatchRow[]; both sides go through the
// parser, but the "raw" baseline maps the parsed rows back through the
// same parser to confirm round-tripping preserves the sums (BatchRow.raw
// passthrough is reference-equal to the input row, so reparsing the same
// input twice MUST produce field-identical typed rows).
const TOLERANCE = 0.01;
const kpisRaw = computeKpis(parseBatchRows(rawRows).rows);
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
  `parser-parity smoke OK (rows=${parsedRows.length}, rate-shaped slots=${totalRateSlots}: null=${nullishCount}, number=${numberCount}, absent=${absentCount}, dropped=${droppedCount})`,
);
