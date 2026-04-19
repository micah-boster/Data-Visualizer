/**
 * Smoke test for migrateChartState. Run via:
 *   npm run smoke:migrate-chart
 *
 * Uses --experimental-strip-types (Node 22+) — no test framework dependency.
 * Covers CHRT-02 contract: legacy→v2, idempotency, failure fallbacks.
 */
import assert from 'node:assert/strict';
import { migrateChartState, DEFAULT_COLLECTION_CURVE } from './migrate-chart.ts';
import { chartDefinitionSchema } from './schema.ts';

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

// --- Phase 36 additions ---------------------------------------------------

// 6. Valid line variant parses and narrows on discriminator.
const lineSafe = chartDefinitionSchema.safeParse({
  type: 'line',
  version: 1,
  x: { column: 'BATCH_AGE_IN_MONTHS' },
  y: { column: 'TOTAL_COLLECTED_LIFE_TIME' },
});
assert.equal(lineSafe.success, true, 'valid line variant parses');
assert.equal(
  lineSafe.success && lineSafe.data.type,
  'line',
  'line discriminator narrows',
);

// 7. Valid scatter variant parses.
const scatterSafe = chartDefinitionSchema.safeParse({
  type: 'scatter',
  version: 1,
  x: { column: 'AVG_EXPERIAN_CA_SCORE' },
  y: { column: 'TOTAL_COLLECTED_LIFE_TIME' },
});
assert.equal(scatterSafe.success, true, 'valid scatter variant parses');

// 8. Valid bar variant parses.
const barSafe = chartDefinitionSchema.safeParse({
  type: 'bar',
  version: 1,
  x: { column: 'PARTNER_NAME' },
  y: { column: 'TOTAL_AMOUNT_PLACED' },
});
assert.equal(barSafe.success, true, 'valid bar variant parses');

// 9. Null axes allowed (empty-builder state).
const lineNullAxes = chartDefinitionSchema.safeParse({
  type: 'line',
  version: 1,
  x: null,
  y: null,
});
assert.equal(lineNullAxes.success, true, 'line with null axes parses');

// 10. Pitfall 1 guard — cross-variant shape rejected (collection-curve body
// under line discriminator requires x/y, which are absent → parse fails).
const crossVariant = chartDefinitionSchema.safeParse({
  type: 'line',
  version: 1,
  metric: 'recoveryRate',
  hiddenBatches: [],
});
assert.equal(
  crossVariant.success,
  false,
  'collection-curve body under line discriminator is rejected',
);
// Belt-and-suspenders: wrong version on line variant also fails.
const lineWrongVersion = chartDefinitionSchema.safeParse({
  type: 'line',
  version: 2,
  x: null,
  y: null,
});
assert.equal(
  lineWrongVersion.success,
  false,
  'line variant with version:2 is rejected',
);

// 11. migrateChartState round-trips a v1 line record idempotently.
const lineV1 = {
  type: 'line' as const,
  version: 1 as const,
  x: { column: 'BATCH_AGE_IN_MONTHS' },
  y: { column: 'TOTAL_COLLECTED_LIFE_TIME' },
};
const roundTrip = migrateChartState(lineV1);
assert.deepEqual(
  roundTrip,
  lineV1,
  'migrateChartState is idempotent on v1 line records',
);

console.log('✓ migrate-chart smoke test passed (11 assertions)');
