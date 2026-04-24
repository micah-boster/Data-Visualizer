/**
 * Smoke test for Phase 38 CHT-01 visible-scope curve derivation.
 *
 * Verifies that maxAge is computed against the user-visible subset of curves
 * (driven by visibleBatchKeys) rather than the full sortedCurves array. This
 * is the logic that prevents the x-axis + partner-average line from overshoot-
 * ing past the oldest currently-displayed vintage.
 *
 * Run: node --experimental-strip-types src/components/charts/visible-curves.smoke.ts
 */

import assert from "node:assert/strict";

// Pure helper extraction — mirrors the logic in collection-curve-chart.tsx so
// the derivation can be tested without React / Recharts / the chart-state hook.
function maxAgeFromVisible(
  sortedCurves: Array<{ ageInMonths: number }>,
  visibleBatchKeys: string[],
): number {
  const visibleSet = new Set(visibleBatchKeys);
  const visibleCurves = sortedCurves.filter((_, i) =>
    visibleSet.has(`batch_${i}`),
  );
  return Math.max(...visibleCurves.map((c) => c.ageInMonths), 1);
}

// Scenario: 4 batches in sorted order with ages 2, 5, 12, 36.
const curves = [
  { ageInMonths: 2 },
  { ageInMonths: 5 },
  { ageInMonths: 12 },
  { ageInMonths: 36 },
];

// User shows only the first two (youngest).
assert.equal(
  maxAgeFromVisible(curves, ["batch_0", "batch_1"]),
  5,
  "max is 5 when showing 2mo+5mo",
);

// User shows all — max is 36.
assert.equal(
  maxAgeFromVisible(curves, ["batch_0", "batch_1", "batch_2", "batch_3"]),
  36,
  "max is 36 when showing all",
);

// User shows only the 12mo batch.
assert.equal(
  maxAgeFromVisible(curves, ["batch_2"]),
  12,
  "max is 12 when showing only batch_2",
);

// User shows nothing (edge case) — falls back to 1 so Recharts gets a valid domain.
assert.equal(
  maxAgeFromVisible(curves, []),
  1,
  "falls back to 1 when no curves visible",
);

// User shows only the oldest — visible max tracks that single batch.
assert.equal(
  maxAgeFromVisible(curves, ["batch_3"]),
  36,
  "max is 36 when showing only the oldest",
);

// Non-existent key is ignored gracefully.
assert.equal(
  maxAgeFromVisible(curves, ["batch_99"]),
  1,
  "falls back to 1 when visible key does not match any curve",
);

console.log("visible-curves smoke OK");
