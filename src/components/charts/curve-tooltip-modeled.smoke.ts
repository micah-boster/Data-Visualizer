/**
 * Smoke test for Phase 40 PRJ-03: composeBatchTooltipRow helper.
 *
 * Asserts the math + suppression logic that drives the "Modeled" row in the
 * proximity tooltip:
 *   1. actual=42, modeled=40 → delta = +5.0%, direction='positive' (higher_is_better)
 *   2. actual=42, modeled=undefined → modeled=null, deltaPercent=null
 *   3. actual=42, modeled=0 → deltaPercent=null (divide-by-zero suppression)
 *   4. lower_is_better polarity flips direction sign (uses AVG_AMOUNT_PLACED)
 *   5. tiny delta (|d|<0.1pp) reads as 'flat'
 *
 * Run: node --experimental-strip-types src/components/charts/curve-tooltip-modeled.smoke.ts
 */

import assert from "node:assert/strict";
import {
  composeBatchTooltipRow,
  formatDeltaPercent,
} from "./compose-batch-tooltip-row.ts";

// --- 1. positive delta, higher_is_better metric ------------------------------
{
  const row = composeBatchTooltipRow(42, 40, "COLLECTION_AFTER_6_MONTH");
  assert.equal(row.actual, 42);
  assert.equal(row.modeled, 40);
  assert.ok(row.deltaPercent != null);
  assert.ok(
    Math.abs(row.deltaPercent! - 5.0) < 1e-9,
    `expected +5.0% delta, got ${row.deltaPercent}`,
  );
  assert.equal(row.direction, "positive", "actual > modeled on higher_is_better → positive");
  assert.equal(formatDeltaPercent(row.deltaPercent), "+5.0%");
}

// --- 2. modeled absent → no delta segment -----------------------------------
{
  const row = composeBatchTooltipRow(42, undefined, "COLLECTION_AFTER_6_MONTH");
  assert.equal(row.modeled, null, "[2] modeled is null when undefined input");
  assert.equal(row.deltaPercent, null, "[2] deltaPercent suppressed");
  assert.equal(row.direction, null, "[2] direction null when no delta");

  const rowNull = composeBatchTooltipRow(42, null, "COLLECTION_AFTER_6_MONTH");
  assert.equal(rowNull.modeled, null);
  assert.equal(rowNull.deltaPercent, null);
}

// --- 3. modeled === 0 → divide-by-zero suppression ---------------------------
{
  const row = composeBatchTooltipRow(42, 0, "COLLECTION_AFTER_6_MONTH");
  assert.equal(row.modeled, 0, "[3] modeled value preserved");
  assert.equal(
    row.deltaPercent,
    null,
    "[3] deltaPercent null when modeled=0 (no Infinity%)",
  );
  assert.equal(row.direction, null);
}

// --- 4. lower_is_better polarity inverts direction --------------------------
{
  // AVG_AMOUNT_PLACED is lower_is_better in METRIC_POLARITY.
  // actual > modeled → unfavorable on a lower-is-better metric.
  const row = composeBatchTooltipRow(120, 100, "AVG_AMOUNT_PLACED");
  assert.ok(row.deltaPercent != null);
  assert.ok(
    Math.abs(row.deltaPercent! - 20.0) < 1e-9,
    `expected +20.0% delta, got ${row.deltaPercent}`,
  );
  assert.equal(
    row.direction,
    "negative",
    "[4] +20% on lower_is_better metric reads as negative",
  );

  const rowDown = composeBatchTooltipRow(80, 100, "AVG_AMOUNT_PLACED");
  assert.equal(
    rowDown.direction,
    "positive",
    "[4] -20% on lower_is_better metric reads as positive",
  );
}

// --- 5. tiny delta reads as flat --------------------------------------------
{
  const row = composeBatchTooltipRow(40.05, 40.0, "COLLECTION_AFTER_6_MONTH");
  // ((40.05 - 40) / 40) * 100 = 0.125% — within 0.1pp threshold? No, 0.125 > 0.1
  // Use a smaller delta to actually be flat.
  assert.equal(row.direction, "positive", "[5] 0.125% reads as positive (above flat threshold)");

  const rowFlat = composeBatchTooltipRow(40.01, 40.0, "COLLECTION_AFTER_6_MONTH");
  // (0.01/40)*100 = 0.025% < 0.1 → flat
  assert.equal(rowFlat.direction, "flat", "[5] 0.025% reads as flat");
}

// --- 6. NaN / Infinity actual is suppressed ---------------------------------
{
  const row = composeBatchTooltipRow(Number.NaN, 40, "COLLECTION_AFTER_6_MONTH");
  assert.equal(row.deltaPercent, null, "[6] NaN actual → no delta");
  const rowInf = composeBatchTooltipRow(Number.POSITIVE_INFINITY, 40, "COLLECTION_AFTER_6_MONTH");
  assert.equal(rowInf.deltaPercent, null, "[6] Infinity actual → no delta");
}

// --- 7. negative delta on higher_is_better → 'negative' ---------------------
{
  const row = composeBatchTooltipRow(36, 40, "COLLECTION_AFTER_6_MONTH");
  assert.ok(row.deltaPercent! < 0, "[7] negative delta numeric");
  assert.equal(formatDeltaPercent(row.deltaPercent), "-10.0%");
  assert.equal(row.direction, "negative", "[7] underperforming → negative");
}

console.log("curve-tooltip-modeled smoke OK");
