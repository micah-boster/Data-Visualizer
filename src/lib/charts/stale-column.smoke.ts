/**
 * Smoke test for resolveColumnWithFallback. Run via:
 *   npm run smoke:charts
 *
 * Uses --experimental-strip-types (Node 22+) — no test framework dependency.
 * Covers the Plan 36-03 contract locked in 36-03-PLAN.md:
 *   - null request → null return (axis not yet picked)
 *   - eligible key → not stale
 *   - unknown key → stale with fallback
 *   - ineligible-for-axis key → stale with fallback
 *   - cross-type eligible key (numeric Y under scatter) → not stale
 */
import assert from 'node:assert/strict';
import { resolveColumnWithFallback } from './stale-column.ts';
import { getEligibleColumns } from '../columns/axis-eligibility.ts';

// 1. requested: null → null.
assert.equal(
  resolveColumnWithFallback('line', 'x', null),
  null,
  'null request returns null (axis not yet picked)',
);
assert.equal(
  resolveColumnWithFallback('scatter', 'y', null),
  null,
  'null request returns null on any chart type / axis',
);

// 2. Line X with an eligible registry key → not stale.
const lineXHit = resolveColumnWithFallback('line', 'x', {
  column: 'BATCH_AGE_IN_MONTHS',
});
assert.ok(lineXHit, 'line X with BATCH_AGE_IN_MONTHS resolves to non-null');
assert.equal(lineXHit!.stale, false, 'eligible key is not stale');
assert.equal(
  lineXHit!.config.key,
  'BATCH_AGE_IN_MONTHS',
  'eligible key resolves to its own config',
);
assert.equal(
  lineXHit!.requested,
  'BATCH_AGE_IN_MONTHS',
  'requested echoes back the original key',
);

// 3. Line X with a key not in COLUMN_CONFIGS → stale + fallback to first eligible.
const lineXMissing = resolveColumnWithFallback('line', 'x', {
  column: 'NONEXISTENT_KEY',
});
assert.ok(lineXMissing, 'missing key still resolves (fallback path)');
assert.equal(lineXMissing!.stale, true, 'missing key is stale');
assert.equal(
  lineXMissing!.requested,
  'NONEXISTENT_KEY',
  'requested preserves the original missing key (for banner display)',
);
const firstLineXEligible = getEligibleColumns('line', 'x')[0];
assert.equal(
  lineXMissing!.config.key,
  firstLineXEligible.key,
  'fallback resolves to first eligible column for (line, x)',
);

// 4. Bar X with a numeric key → ineligible for bar-X (wants categorical) → stale.
const barXNumeric = resolveColumnWithFallback('bar', 'x', {
  column: 'TOTAL_COLLECTED_LIFE_TIME',
});
assert.ok(barXNumeric, 'ineligible-but-present key still resolves (fallback path)');
assert.equal(
  barXNumeric!.stale,
  true,
  'numeric column under bar X is stale (bar X is categorical-only)',
);
assert.equal(
  barXNumeric!.requested,
  'TOTAL_COLLECTED_LIFE_TIME',
  'requested preserves the original key (for banner display)',
);
assert.equal(
  barXNumeric!.config.type,
  'text',
  'fallback for bar X is a text-type column (categorical)',
);

// 5. Scatter Y with a numeric key → eligible (Y is numeric-only across all
//    chart types), so NOT stale even though the column is also valid on line Y.
const scatterYNumeric = resolveColumnWithFallback('scatter', 'y', {
  column: 'TOTAL_COLLECTED_LIFE_TIME',
});
assert.ok(scatterYNumeric, 'scatter Y + numeric key resolves to non-null');
assert.equal(
  scatterYNumeric!.stale,
  false,
  'numeric column is eligible on Y for every chart type — not stale',
);
assert.equal(
  scatterYNumeric!.config.key,
  'TOTAL_COLLECTED_LIFE_TIME',
  'scatter Y + numeric key resolves to its own config',
);

console.log('✓ stale-column smoke test passed (13 assertions)');
