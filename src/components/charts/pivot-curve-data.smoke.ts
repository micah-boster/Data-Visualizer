/**
 * Smoke test for Phase 40 PRJ-01: pivotCurveData emits batch_N__projected keys
 * when curve.projection is present.
 *
 * Asserts:
 * 1. A curve with no `projection` emits ONLY `batch_0` keys (no
 *    `batch_0__projected` pollution).
 * 2. A curve with `projection` emits BOTH `batch_0` and `batch_0__projected`
 *    at each month that exists in both.
 * 3. A curve with `projection` covering 80 months but `points` covering only
 *    12 months emits `batch_0__projected` for months 13-80 (full shadow per
 *    CONTEXT lock).
 *
 * Run: node --experimental-strip-types src/components/charts/pivot-curve-data.smoke.ts
 */

import assert from "node:assert/strict";
import {
  pivotCurveData,
  PROJECTED_KEY_SUFFIX,
} from "./pivot-curve-data.ts";
import type { BatchCurve, CurvePoint } from "../../types/partner-stats.ts";

function makePoints(months: number[], rateBase = 10): CurvePoint[] {
  return months.map((m) => ({
    month: m,
    amount: 0,
    recoveryRate: rateBase + m,
  }));
}

// --- Assertion 1: curve without projection -----------------------------------
{
  const curves: BatchCurve[] = [
    {
      batchName: "Batch A",
      totalPlaced: 100,
      ageInMonths: 6,
      points: makePoints([1, 2, 3, 4, 5, 6]),
      // no projection
    },
  ];
  const { data, keyMap } = pivotCurveData(curves, "recoveryRate");

  // No __projected keys anywhere in pivoted data
  for (const point of data) {
    for (const k of Object.keys(point)) {
      assert.equal(
        k.includes(PROJECTED_KEY_SUFFIX),
        false,
        `[1] No __projected key should leak into pivoted point at month ${point.month}; saw "${k}"`,
      );
    }
  }
  // KeyMap has only batch_0
  assert.deepEqual(
    [...keyMap.keys()].sort(),
    ["batch_0"],
    "[1] KeyMap should only contain batch_0 when no projection",
  );
}

// --- Assertion 2: curve with projection — both keys at overlapping months ----
{
  const curves: BatchCurve[] = [
    {
      batchName: "Batch B",
      totalPlaced: 100,
      ageInMonths: 6,
      points: makePoints([1, 2, 3, 4, 5, 6], 10), // recoveryRate = 11..16
      projection: makePoints([1, 2, 3, 4, 5, 6], 20), // recoveryRate = 21..26
    },
  ];
  const { data, keyMap } = pivotCurveData(curves, "recoveryRate");

  // KeyMap has both keys, both pointing to same batchName
  assert.equal(keyMap.get("batch_0"), "Batch B", "[2] keyMap batch_0 -> name");
  assert.equal(
    keyMap.get("batch_0__projected"),
    "Batch B",
    "[2] keyMap batch_0__projected -> same name",
  );

  // Every month has both batch_0 and batch_0__projected
  for (const point of data) {
    assert.notEqual(
      point.batch_0,
      undefined,
      `[2] batch_0 present at month ${point.month}`,
    );
    assert.notEqual(
      point.batch_0__projected,
      undefined,
      `[2] batch_0__projected present at month ${point.month}`,
    );
    // Sanity: actual=11+m, projected=21+m
    assert.equal(point.batch_0, 11 + point.month - 1);
    assert.equal(point.batch_0__projected, 21 + point.month - 1);
  }
  // Six months → six points
  assert.equal(data.length, 6, "[2] one row per month");
}

// --- Assertion 3: projection extends past actuals (12mo actuals, 80mo proj) --
{
  const actualMonths = Array.from({ length: 12 }, (_, i) => i + 1); // 1..12
  const projMonths = Array.from({ length: 80 }, (_, i) => i + 1); // 1..80
  const curves: BatchCurve[] = [
    {
      batchName: "Batch C",
      totalPlaced: 100,
      ageInMonths: 12,
      points: makePoints(actualMonths, 10),
      projection: makePoints(projMonths, 20),
    },
  ];
  const { data } = pivotCurveData(curves, "recoveryRate");

  // 80 month rows
  assert.equal(data.length, 80, "[3] 80 month rows when projection extends");

  // Months 1..12: both keys present
  for (let m = 1; m <= 12; m++) {
    const row = data.find((p) => p.month === m);
    assert.ok(row, `[3] row exists at month ${m}`);
    assert.notEqual(row!.batch_0, undefined, `[3] actual present at month ${m}`);
    assert.notEqual(
      row!.batch_0__projected,
      undefined,
      `[3] projected present at month ${m}`,
    );
  }
  // Months 13..80: ONLY projected key (actuals are absent)
  for (let m = 13; m <= 80; m++) {
    const row = data.find((p) => p.month === m);
    assert.ok(row, `[3] row exists at month ${m}`);
    assert.equal(
      row!.batch_0,
      undefined,
      `[3] actual is absent at month ${m} (only projection extends here)`,
    );
    assert.notEqual(
      row!.batch_0__projected,
      undefined,
      `[3] projected present at month ${m}`,
    );
  }
}

// --- Bonus: mixed batches (one with projection, one without) -----------------
{
  const curves: BatchCurve[] = [
    {
      batchName: "WithProj",
      totalPlaced: 100,
      ageInMonths: 3,
      points: makePoints([1, 2, 3], 10),
      projection: makePoints([1, 2, 3], 20),
    },
    {
      batchName: "NoProj",
      totalPlaced: 100,
      ageInMonths: 3,
      points: makePoints([1, 2, 3], 30),
      // no projection
    },
  ];
  const { data, keyMap } = pivotCurveData(curves, "recoveryRate");
  assert.equal(keyMap.get("batch_0__projected"), "WithProj", "mixed: batch_0 has proj");
  assert.equal(
    keyMap.get("batch_1__projected"),
    undefined,
    "mixed: batch_1 has NO __projected mapping",
  );
  for (const point of data) {
    assert.notEqual(point.batch_0__projected, undefined, "mixed: proj present");
    assert.equal(
      point.batch_1__projected,
      undefined,
      "mixed: batch without projection has no __projected key",
    );
  }
}

console.log("pivot-curve-data smoke OK");
