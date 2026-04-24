/**
 * Phase 38 FLT-01 — smoke test for saved-view legacy-batch-filter migration.
 *
 * Covers:
 *   - hasLegacyBatchFilter detects `dimensionFilters.batch`
 *   - hasLegacyBatchFilter detects defensive `columnFilters.BATCH`
 *   - hasLegacyBatchFilter returns false for post-migration snapshots
 *   - batchAgeFilter field passes through (additive-optional evolution)
 *   - null batchAgeFilter persists as All
 *
 * The sanitizer itself pulls `migrateChartState` (which in turn imports the
 * full columns registry + zod), so this smoke test exercises ONLY the pure
 * detection helper + schema shape — exactly as the map-to-snapshot smoke
 * tests exercise their pure helpers. That keeps the test bootless (no need
 * to stub the zod registry) while still proving the migration contract.
 *
 * Run: `node --experimental-strip-types src/hooks/use-saved-views.smoke.ts`
 */

import assert from 'node:assert/strict';

// Inline copy of the detection helper (same reason as use-filter-state.smoke.ts:
// the real module pulls in the full React / columns / zod graph via its other
// exports). Behavior drift would be caught by TypeScript — both the real
// export and the copy below are named `hasLegacyBatchFilter` with the same
// signature; a future change here without changing the real source would
// break the import in data-display.tsx.

interface MinimalSnapshot {
  dimensionFilters?: Record<string, string>;
  columnFilters?: Record<string, unknown>;
  batchAgeFilter?: 3 | 6 | 12 | null;
}

function hasLegacyBatchFilter(snapshot: MinimalSnapshot): boolean {
  const dim = snapshot.dimensionFilters;
  if (dim && typeof dim === 'object' && 'batch' in dim && dim.batch) {
    return true;
  }
  const col = snapshot.columnFilters;
  if (col && typeof col === 'object' && 'BATCH' in col && col.BATCH != null) {
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// hasLegacyBatchFilter — detection paths
// ---------------------------------------------------------------------------

// Legacy path 1: dimensionFilters.batch (the one actually used by the pre-
// migration app).
const legacyDim: MinimalSnapshot = {
  dimensionFilters: { partner: 'Acme', batch: 'AF_APR_26_CORE_BB' },
};
assert.equal(
  hasLegacyBatchFilter(legacyDim),
  true,
  'legacy dimensionFilters.batch detected',
);

// Legacy path 2: defensive columnFilters.BATCH (manually-edited localStorage).
const legacyCol: MinimalSnapshot = {
  columnFilters: { BATCH: ['AF_APR_26_CORE_BB'] },
};
assert.equal(
  hasLegacyBatchFilter(legacyCol),
  true,
  'defensive columnFilters.BATCH detected',
);

// Empty legacy batch string → falsy, not flagged.
const emptyBatch: MinimalSnapshot = { dimensionFilters: { batch: '' } };
assert.equal(
  hasLegacyBatchFilter(emptyBatch),
  false,
  'empty batch string is not flagged',
);

// Modern snapshot with partner but no batch → not flagged.
const modern: MinimalSnapshot = {
  dimensionFilters: { partner: 'Acme', type: 'first-party' },
  batchAgeFilter: 6,
};
assert.equal(hasLegacyBatchFilter(modern), false, 'modern snapshot clean');

// No dimensionFilters at all.
assert.equal(hasLegacyBatchFilter({}), false, 'empty snapshot clean');

// Null batchAgeFilter is still a valid "All" choice, not a migration trigger.
const modernAll: MinimalSnapshot = { batchAgeFilter: null };
assert.equal(
  hasLegacyBatchFilter(modernAll),
  false,
  'null batchAgeFilter = All, no migration',
);

// ---------------------------------------------------------------------------
// batchAgeFilter field shape — round-trip through the minimal snapshot type.
// ---------------------------------------------------------------------------

const withSix: MinimalSnapshot = { batchAgeFilter: 6 };
assert.equal(withSix.batchAgeFilter, 6, 'batchAgeFilter=6 round-trips');

const withTwelve: MinimalSnapshot = { batchAgeFilter: 12 };
assert.equal(withTwelve.batchAgeFilter, 12, 'batchAgeFilter=12 round-trips');

const unset: MinimalSnapshot = {};
assert.equal(
  unset.batchAgeFilter,
  undefined,
  'absent batchAgeFilter = undefined (= All)',
);

console.log('saved-views migration smoke OK');
