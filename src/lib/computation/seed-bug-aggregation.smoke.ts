/**
 * DCR-05 regression smoke for DCR-01 (seed-bug aggregation).
 *
 * Pins three specific behaviors fixed in Plan 41-01:
 *   (a) Per-column avgWeighted strategy with aggregationWeight: 'PLACED'
 *       computes dollar-weighted, NOT arithmetic mean of percentages
 *   (b) Numeric column with aggregation: 'none' returns null primary
 *       (em-dash in UI) — covers LENDER_ID-style identity columns that
 *       must NOT sum
 *   (c) Adding a column WITHOUT meta.aggregation falls through to legacy
 *       meta.type dispatch (backward compatibility): currency → sum
 *
 * Negative test: confirm dollar-weighted result is NOT close to the
 * arithmetic mean (catches DCR-01 regression).
 */

import assert from 'node:assert/strict';
import type { Row, Column } from '@tanstack/react-table';

import { computeAggregates } from '../table/aggregations.ts';

// Synthetic fixture: 3 batches with very different weights (ensures
// arithmetic mean and dollar-weighted diverge by a wide margin).
const rows = [
  { id: '1', PEN: 90, PLACED: 50_000 },   // small, high rate
  { id: '2', PEN: 10, PLACED: 1_000_000 }, // big, low rate
  { id: '3', PEN: 20, PLACED: 500_000 },  // mid
] as Record<string, unknown>[];

// Build minimum TanStack-Table-shaped Row + Column objects. computeAggregates
// only reads `row.getValue(colId)` and `row.original`, plus `column.id` and
// `column.columnDef.meta` — so a thin shim suffices.
function fakeRow(r: Record<string, unknown>): Row<Record<string, unknown>> {
  return {
    getValue: (k: string) => r[k],
    original: r,
  } as unknown as Row<Record<string, unknown>>;
}

function fakeColumn(
  id: string,
  meta: Record<string, unknown>,
): Column<Record<string, unknown>> {
  return {
    id,
    columnDef: { meta },
  } as unknown as Column<Record<string, unknown>>;
}

const tableRows = rows.map(fakeRow);

// (a) Dollar-weighted penetration via avgWeighted strategy.
const penAvgWeighted = computeAggregates(tableRows, [
  fakeColumn('PEN', {
    type: 'percentage',
    aggregation: 'avgWeighted',
    aggregationWeight: 'PLACED',
  }),
]);
const sumWeighted = 90 * 50_000 + 10 * 1_000_000 + 20 * 500_000;
const totalWeight = 50_000 + 1_000_000 + 500_000;
const expectedDollarWeighted = sumWeighted / totalWeight; // ~ 13.46

assert.ok(
  penAvgWeighted.PEN !== undefined,
  'avgWeighted aggregate result must be defined for PEN column',
);
assert.ok(
  Math.abs((penAvgWeighted.PEN.primary ?? 0) - expectedDollarWeighted) < 0.01,
  `dollar-weighted: expected ~${expectedDollarWeighted}, got ${penAvgWeighted.PEN.primary}`,
);
assert.equal(
  penAvgWeighted.PEN.label,
  'Avg',
  'avgWeighted strategy must label as "Avg"',
);

// Negative test: arithmetic mean would be 40 — confirm result is NOT 40.
const arithmetic = (90 + 10 + 20) / 3; // 40
assert.ok(
  Math.abs((penAvgWeighted.PEN.primary ?? 0) - arithmetic) > 1,
  `REGRESSION: result ${penAvgWeighted.PEN.primary} is too close to arithmetic mean ${arithmetic}. DCR-01 seed bug returned.`,
);

// (b) LENDER_ID-style column with aggregation: 'none' on a NUMERIC type —
// must return null primary (em-dash in UI), NOT sum the IDs.
const idAggResult = computeAggregates(tableRows, [
  fakeColumn('id', { type: 'number', aggregation: 'none' }),
]);
assert.equal(
  idAggResult.id.primary,
  null,
  'LENDER_ID-style column with aggregation: "none" must return primary=null (em-dash in UI)',
);
assert.equal(
  idAggResult.id.label,
  '\u2014',
  '"none" strategy on numeric column must label with em-dash',
);

// Negative test: confirm summing the ids would have produced 1+2+3=6, and
// that the actual result is NOT that.
assert.notEqual(
  idAggResult.id.primary,
  6,
  'REGRESSION: aggregation "none" must NOT sum identity values',
);

// (c) Backward compatibility: column without explicit meta.aggregation
// falls through to legacy meta.type dispatch. currency → sum.
const legacyCurrency = computeAggregates(tableRows, [
  fakeColumn('PLACED', { type: 'currency' }), // no aggregation declared
]);
assert.equal(
  legacyCurrency.PLACED.primary,
  50_000 + 1_000_000 + 500_000,
  'Legacy meta.type=currency without aggregation must still sum',
);
assert.equal(
  legacyCurrency.PLACED.label,
  'Sum',
  'sum strategy must label as "Sum"',
);

// (d) Backward compat: percentage type without explicit aggregation falls
// to avgWeighted (no weight = arithmetic mean).
const legacyPercentage = computeAggregates(tableRows, [
  fakeColumn('PEN', { type: 'percentage' }), // no aggregation declared
]);
assert.equal(
  legacyPercentage.PEN.label,
  'Avg',
  'legacy percentage falls to avgWeighted',
);
assert.ok(
  Math.abs((legacyPercentage.PEN.primary ?? 0) - arithmetic) < 0.01,
  `legacy percentage with no aggregationWeight should produce arithmetic mean (${arithmetic}), got ${legacyPercentage.PEN.primary}`,
);

console.log('seed-bug-aggregation smoke OK');
