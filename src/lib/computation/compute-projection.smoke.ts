/**
 * Smoke tests for compute-projection.ts (Phase 40 Plan 03 Task 1).
 *
 * Run with: node --experimental-strip-types src/lib/computation/compute-projection.smoke.ts
 *
 * Exits non-zero on any failed assertion. No test framework — matches Phase
 * 35/36/37/38 precedent of inline smoke modules.
 */

import { strict as assert } from 'node:assert';
import {
  modeledRateAtMonth,
  computeModeledDelta,
} from './compute-projection.ts';
import type { BatchCurve, CurvePoint } from '../../types/partner-stats.ts';

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    passed += 1;
    // eslint-disable-next-line no-console
    console.log(`  PASS  ${name}`);
  } catch (err) {
    failed += 1;
    // eslint-disable-next-line no-console
    console.error(`  FAIL  ${name}`);
    // eslint-disable-next-line no-console
    console.error(err);
  }
}

// --- Fixtures -------------------------------------------------------------

function makeProjection(rate6: number): CurvePoint[] {
  return [
    { month: 1, amount: 0, recoveryRate: 5 },
    { month: 3, amount: 0, recoveryRate: 20 },
    { month: 6, amount: 0, recoveryRate: rate6 },
    { month: 12, amount: 0, recoveryRate: 60 },
  ];
}

const curveWithoutProjection: BatchCurve = {
  batchName: 'AF_AUG_23',
  totalPlaced: 1_000_000,
  ageInMonths: 18,
  points: [],
  // projection intentionally omitted
};

const curveWithProjection: BatchCurve = {
  batchName: 'AF_FEB_25',
  totalPlaced: 1_000_000,
  ageInMonths: 6,
  points: [],
  projection: makeProjection(40),
};

const curveWithZeroModeled: BatchCurve = {
  batchName: 'AF_DEC_24',
  totalPlaced: 1_000_000,
  ageInMonths: 6,
  points: [],
  projection: makeProjection(0),
};

// --- Tests ----------------------------------------------------------------

test('modeledRateAtMonth returns null when projection is absent', () => {
  assert.equal(modeledRateAtMonth(curveWithoutProjection, 6), null);
});

test('modeledRateAtMonth returns the recoveryRate at the matching month', () => {
  assert.equal(modeledRateAtMonth(curveWithProjection, 6), 40);
});

test('modeledRateAtMonth returns null when month is outside coverage', () => {
  assert.equal(modeledRateAtMonth(curveWithProjection, 99), null);
});

test('computeModeledDelta — delta exactly at threshold maps to flat', () => {
  // modeled=40, actual=42 → delta = +5.0 → exactly threshold → flat (uses >)
  const trend = computeModeledDelta(
    curveWithProjection,
    6,
    42,
    'COLLECTION_AFTER_6_MONTH',
  );
  assert.notEqual(trend, null);
  assert.equal(trend!.direction, 'flat');
  // Use closeTo-style guard — JS floating-point math on (42-40)/40*100
  // is exactly 5 in this case, but assert with tolerance for safety.
  assert.ok(Math.abs(trend!.deltaPercent - 5) < 1e-9);
  assert.equal(trend!.metric, 'COLLECTION_AFTER_6_MONTH');
  assert.equal(trend!.batchName, 'AF_FEB_25');
});

test('computeModeledDelta — delta above threshold maps to up', () => {
  // modeled=40, actual=44 → delta = +10 → up
  const trend = computeModeledDelta(
    curveWithProjection,
    6,
    44,
    'COLLECTION_AFTER_6_MONTH',
  );
  assert.notEqual(trend, null);
  assert.equal(trend!.direction, 'up');
  assert.ok(Math.abs(trend!.deltaPercent - 10) < 1e-9);
});

test('computeModeledDelta — delta below negative threshold maps to down', () => {
  // modeled=40, actual=36 → delta = -10 → down
  const trend = computeModeledDelta(
    curveWithProjection,
    6,
    36,
    'COLLECTION_AFTER_6_MONTH',
  );
  assert.notEqual(trend, null);
  assert.equal(trend!.direction, 'down');
  assert.ok(Math.abs(trend!.deltaPercent - -10) < 1e-9);
});

test('computeModeledDelta returns null when projection is absent', () => {
  assert.equal(
    computeModeledDelta(curveWithoutProjection, 6, 42, 'X'),
    null,
  );
});

test('computeModeledDelta returns null when modeled rate is zero (divide-by-zero guard)', () => {
  assert.equal(
    computeModeledDelta(curveWithZeroModeled, 6, 42, 'X'),
    null,
  );
});

// --- Summary --------------------------------------------------------------

// eslint-disable-next-line no-console
console.log(`\n  ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
