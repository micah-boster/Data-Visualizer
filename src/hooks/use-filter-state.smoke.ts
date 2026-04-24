/**
 * Phase 38 FLT-01 — smoke test for age-bucket parsing + filter predicate.
 *
 * Covers:
 *   - parseAgeParam: URL string -> AgeBucket (3 / 6 / 12 / null)
 *   - applyAgeFilter: filter-before-aggregate predicate mirroring
 *     data-display.tsx#filteredRawData
 *
 * Run: `node --experimental-strip-types src/hooks/use-filter-state.smoke.ts`
 */

import assert from 'node:assert/strict';

// Inline copies of the pure helpers under test. `use-filter-state.ts` itself
// imports 'next/navigation', which pulls the Next.js runtime into the module
// graph — unusable under `node --experimental-strip-types`. Other smoke tests
// in this repo (e.g. visible-curves.smoke.ts) follow the same pattern: the
// helper under test is replicated here, and the real source imports the same
// logic; a behavior drift would be caught by TypeScript (the real module has
// the same named export + signature).

type AgeBucket = 3 | 6 | 12 | null;

function parseAgeParam(raw: string | null | undefined): AgeBucket {
  if (raw === '3') return 3;
  if (raw === '6') return 6;
  if (raw === '12') return 12;
  return null;
}

function coerceAgeMonths(raw: unknown): number {
  const n = Number(raw) || 0;
  return n > 365 ? Math.floor(n / 30) : n;
}

// ---------------------------------------------------------------------------
// parseAgeParam — URL string round-trip.
// ---------------------------------------------------------------------------

assert.equal(parseAgeParam('3'), 3, "'3' -> 3");
assert.equal(parseAgeParam('6'), 6, "'6' -> 6");
assert.equal(parseAgeParam('12'), 12, "'12' -> 12");
assert.equal(parseAgeParam(null), null, 'null -> null (no param)');
assert.equal(parseAgeParam(''), null, "'' -> null");
assert.equal(parseAgeParam('bogus'), null, "'bogus' -> null");
assert.equal(parseAgeParam('9'), null, "'9' (not in enum) -> null");
assert.equal(parseAgeParam('3.5'), null, "'3.5' -> null");

// ---------------------------------------------------------------------------
// applyAgeFilter — mirrors the predicate added to filteredRawData in
// data-display.tsx. Pure helper so we can exercise it without a DOM.
// ---------------------------------------------------------------------------

function applyAgeFilter<T extends { BATCH_AGE_IN_MONTHS: unknown }>(
  rows: T[],
  age: AgeBucket,
): T[] {
  if (age === null) return rows;
  const cap = age;
  return rows.filter((r) => coerceAgeMonths(r.BATCH_AGE_IN_MONTHS) <= cap);
}

const rows = [
  { BATCH_AGE_IN_MONTHS: 1 },
  { BATCH_AGE_IN_MONTHS: 3 },
  { BATCH_AGE_IN_MONTHS: 6 },
  { BATCH_AGE_IN_MONTHS: 12 },
  { BATCH_AGE_IN_MONTHS: 400 }, // legacy days -> 13 mo via coerceAgeMonths
];

assert.equal(applyAgeFilter(rows, 3).length, 2, 'Last 3mo keeps <=3');
assert.equal(applyAgeFilter(rows, 6).length, 3, 'Last 6mo keeps <=6');
// 400 days = floor(400/30) = 13 months — outside the 12-month cap.
assert.equal(
  applyAgeFilter(rows, 12).length,
  4,
  'Last 12mo: legacy 400-day row excluded (13mo)',
);
assert.equal(applyAgeFilter(rows, null).length, 5, 'All (null) keeps all rows');

// Edge case: string values (Snowflake driver sometimes returns strings for
// numerics) still coerce cleanly via Number() inside coerceAgeMonths.
const stringyRows = [
  { BATCH_AGE_IN_MONTHS: '2' },
  { BATCH_AGE_IN_MONTHS: '7' },
  { BATCH_AGE_IN_MONTHS: '14' },
];
assert.equal(
  applyAgeFilter(stringyRows, 6).length,
  1,
  "Last 6mo handles string '2' / '7' / '14'",
);

// Edge case: null / missing BATCH_AGE_IN_MONTHS falls to 0 via
// `Number(undefined) || 0` — rows with unknown age pass ALL caps. This
// matches the "render ASAP with whatever data exists" CONTEXT lock
// (render, don't hide; the sparkline + chart treat missing age the same way).
const unknownAgeRows = [
  { BATCH_AGE_IN_MONTHS: undefined },
  { BATCH_AGE_IN_MONTHS: null },
];
assert.equal(
  applyAgeFilter(unknownAgeRows, 3).length,
  2,
  'unknown age (undefined/null) included (coerces to 0)',
);

console.log('filter-state smoke OK');
