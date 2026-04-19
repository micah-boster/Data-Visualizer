/**
 * Smoke test for migrateChartState. Run via:
 *   npm run smoke:migrate-chart
 *
 * Uses --experimental-strip-types (Node 22+) — no test framework dependency.
 * Covers CHRT-02 contract: legacy→v2, idempotency, failure fallbacks.
 */
import assert from 'node:assert/strict';
import { migrateChartState, DEFAULT_COLLECTION_CURVE } from './migrate-chart.ts';

// 1. Legacy fixture round-trips to v2 shape.
const legacy = {
  metric: 'amount',
  hiddenBatches: [],
  showAverage: true,
  showAllBatches: false,
};
const migrated = migrateChartState(legacy);
assert.equal(
  migrated?.type,
  'collection-curve',
  'legacy migrates to collection-curve variant',
);
assert.equal(migrated?.version, 2, 'legacy gains version: 2');
assert.equal(
  migrated?.type === 'collection-curve' && migrated.metric,
  'amount',
  'preserves metric',
);

// 2. Idempotency — re-running on v2 returns equivalent v2.
const twice = migrateChartState(migrated);
assert.deepEqual(
  twice,
  migrated,
  'idempotent: migrating a v2 record returns the same shape',
);

// 3. Missing metric → DEFAULT fallback.
const brokenLegacy = { hiddenBatches: [] };
const fallback1 = migrateChartState(brokenLegacy);
assert.deepEqual(
  fallback1,
  DEFAULT_COLLECTION_CURVE,
  'missing metric falls back to default',
);

// 4. Unknown type → DEFAULT fallback.
const unknownVariant = { type: 'bar', version: 2, anything: 'goes' };
const fallback2 = migrateChartState(unknownVariant);
assert.deepEqual(
  fallback2,
  DEFAULT_COLLECTION_CURVE,
  'unknown type falls back to default',
);

// 5. undefined / null input → undefined output (absent chartState).
assert.equal(migrateChartState(undefined), undefined, 'undefined passes through');
assert.equal(migrateChartState(null), undefined, 'null passes through as undefined');

console.log('✓ migrate-chart smoke test passed (5 assertions)');
