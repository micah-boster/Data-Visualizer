/**
 * Smoke test for the segment evaluator (Phase 39 PCFG-05).
 *
 * Verifies:
 *   1. Empty segments → all rows in `other`, zero overlap.
 *   2. Two non-overlapping segments → row counts sum, zero overlap, zero in `other`.
 *   3. Overlapping segments → overlapRowCount === N, overlapping row appears
 *      in BOTH segment buckets (intentional double-count for Setup warning).
 *   4. Uncovered rows land in `other`.
 *   5. Invariant: sum(bySegment) + other.length === rows.length + overlapRowCount.
 *   6. Numeric/string parity — String() coercion handles mixed-type column values.
 *
 * Run: node --experimental-strip-types src/lib/partner-config/segment-evaluator.smoke.ts
 */

import assert from 'node:assert/strict';

import { evaluateSegments } from './segment-evaluator.ts';
import type { SegmentRule } from './types.ts';

// 1. Empty segments → all rows in `other`, zero overlap.
{
  const rows = [{ LENDER_ID: 'a' }, { LENDER_ID: 'b' }, { LENDER_ID: 'c' }];
  const out = evaluateSegments(rows, []);
  assert.equal(out.other.length, 3, 'all rows fall into Other when no segments');
  assert.equal(out.overlapRowCount, 0, 'no overlap with empty segments');
  assert.equal(out.bySegment.size, 0, 'bySegment is empty');
}

// 2. Two non-overlapping segments → counts sum, zero overlap, zero in Other.
{
  const segments: SegmentRule[] = [
    { id: '1', name: 'Bank A', column: 'LENDER_ID', values: ['a'] },
    { id: '2', name: 'Bank B', column: 'LENDER_ID', values: ['b'] },
  ];
  const rows = [
    { LENDER_ID: 'a' },
    { LENDER_ID: 'a' },
    { LENDER_ID: 'b' },
  ];
  const out = evaluateSegments(rows, segments);
  assert.equal(out.bySegment.get('Bank A')!.length, 2, 'Bank A has 2 rows');
  assert.equal(out.bySegment.get('Bank B')!.length, 1, 'Bank B has 1 row');
  assert.equal(out.other.length, 0, 'no uncovered rows');
  assert.equal(out.overlapRowCount, 0, 'zero overlap on disjoint values');
}

// 3. Overlapping segments → overlapRowCount === 1, row appears in BOTH buckets.
{
  // Rule A matches LENDER_ID 'x' OR 'y'; rule B matches LENDER_ID 'y' OR 'z'.
  // Row { LENDER_ID: 'y' } overlaps both.
  const segments: SegmentRule[] = [
    { id: '1', name: 'Group A', column: 'LENDER_ID', values: ['x', 'y'] },
    { id: '2', name: 'Group B', column: 'LENDER_ID', values: ['y', 'z'] },
  ];
  const rows = [
    { LENDER_ID: 'x' },
    { LENDER_ID: 'y' }, // <-- overlaps
    { LENDER_ID: 'z' },
  ];
  const out = evaluateSegments(rows, segments);
  assert.equal(out.bySegment.get('Group A')!.length, 2, 'Group A has 2 rows (x + y)');
  assert.equal(out.bySegment.get('Group B')!.length, 2, 'Group B has 2 rows (y + z)');
  assert.equal(out.overlapRowCount, 1, 'one row counted as overlapping');
  assert.equal(out.other.length, 0, 'no uncovered rows');
}

// 4. Uncovered rows land in Other; invariant for partial coverage.
{
  const segments: SegmentRule[] = [
    { id: '1', name: 'Bank A', column: 'LENDER_ID', values: ['a'] },
  ];
  const rows = [
    { LENDER_ID: 'a' },
    { LENDER_ID: 'b' }, // uncovered
    { LENDER_ID: 'c' }, // uncovered
  ];
  const out = evaluateSegments(rows, segments);
  assert.equal(out.bySegment.get('Bank A')!.length, 1, '1 row in Bank A');
  assert.equal(out.other.length, 2, '2 rows uncovered land in Other');
  assert.equal(out.overlapRowCount, 0, 'no overlap when only one segment');
}

// 5. Invariant: sum(bySegment) + other.length === rows.length + overlapRowCount.
{
  const segments: SegmentRule[] = [
    { id: '1', name: 'A', column: 'LENDER_ID', values: ['x', 'y'] },
    { id: '2', name: 'B', column: 'LENDER_ID', values: ['y', 'z'] },
    { id: '3', name: 'C', column: 'LENDER_ID', values: ['z'] }, // overlap with B on z
  ];
  const rows = [
    { LENDER_ID: 'x' }, // A only
    { LENDER_ID: 'y' }, // A + B (overlap)
    { LENDER_ID: 'z' }, // B + C (overlap)
    { LENDER_ID: 'q' }, // Other
  ];
  const out = evaluateSegments(rows, segments);
  let sumBySegment = 0;
  for (const arr of out.bySegment.values()) sumBySegment += arr.length;
  // x→A=1, y→A+B=2, z→B+C=2 → sum=5; other=1; rows=4; overlapping=2 (y,z).
  // Invariant: 5 + 1 === 4 + 2 → 6 === 6.
  assert.equal(
    sumBySegment + out.other.length,
    rows.length + out.overlapRowCount,
    'invariant holds: per-segment + other === rows + overlap (overlaps double-counted)',
  );
  assert.equal(out.overlapRowCount, 2, 'two overlapping rows (y, z)');
}

// 6. Numeric/string parity via String() coercion.
{
  const segments: SegmentRule[] = [
    { id: '1', name: 'NumericMatch', column: 'LENDER_ID', values: ['42'] },
  ];
  const rows = [
    { LENDER_ID: 42 }, // number — should match '42' via String() coercion
    { LENDER_ID: '42' }, // string — should also match
    { LENDER_ID: 99 }, // does not match
  ];
  const out = evaluateSegments(rows, segments);
  assert.equal(
    out.bySegment.get('NumericMatch')!.length,
    2,
    'string values match numeric column data via String() coercion',
  );
  assert.equal(out.other.length, 1, 'unmatched numeric row goes to Other');
}

// 7. null/undefined cells skipped — never count as a match.
{
  const segments: SegmentRule[] = [
    { id: '1', name: 'NotEmpty', column: 'LENDER_ID', values: ['a'] },
  ];
  const rows = [
    { LENDER_ID: 'a' },
    { LENDER_ID: null },
    { LENDER_ID: undefined },
    {},
  ];
  const out = evaluateSegments(rows, segments);
  assert.equal(out.bySegment.get('NotEmpty')!.length, 1, 'only the explicit a row matched');
  assert.equal(out.other.length, 3, 'null/undefined/missing rows fall into Other');
}

console.log('segment-evaluator smoke OK');
