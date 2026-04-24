/**
 * Phase 38 MBI-01 — smoke test for the override merge helper.
 *
 * Covers every branch of `mergeOverride`:
 *   - null override (inference passes through)
 *   - concrete override type + null axes (type wins, axes fall through)
 *   - concrete override type + explicit axes (axes override wins)
 *   - 'none' (chart suppressed)
 *   - inference returned null + user picks a full chart (override fully wins)
 *
 * Run: `node --experimental-strip-types src/lib/metabase-import/override.smoke.ts`
 */

import assert from 'node:assert/strict';
import { mergeOverride } from './merge-override.ts';
import type { ChartInferenceResult } from './types.ts';

// Baseline inference: line chart on (date_col, revenue).
const inferred: ChartInferenceResult = {
  chartType: 'line',
  x: 'date_col',
  y: 'revenue',
  skipped: [],
};

// 1. No override → inferred passes through.
assert.deepEqual(
  mergeOverride(inferred, null, null, null),
  inferred,
  'null override returns inferred unchanged',
);

// 2. User picks bar + keeps inferred axes.
assert.deepEqual(
  mergeOverride(inferred, 'bar', null, null),
  { chartType: 'bar', x: 'date_col', y: 'revenue', skipped: [] },
  'bar override + null axes keeps inferred axes',
);

// 3. User picks bar + overrides X explicitly, keeps inferred Y.
assert.deepEqual(
  mergeOverride(inferred, 'bar', 'category', null),
  { chartType: 'bar', x: 'category', y: 'revenue', skipped: [] },
  'explicit X override wins, Y falls through to inferred',
);

// 4. User picks bar + overrides BOTH axes.
assert.deepEqual(
  mergeOverride(inferred, 'bar', 'category', 'count'),
  { chartType: 'bar', x: 'category', y: 'count', skipped: [] },
  'both explicit axes win',
);

// 5. User picks 'none' → chart suppressed; skipped[] carried through.
const withSkipped: ChartInferenceResult = {
  chartType: 'line',
  x: 'd',
  y: 'v',
  skipped: [{ raw: 'x', reason: 'y' }],
};
assert.deepEqual(
  mergeOverride(withSkipped, 'none', null, null),
  { chartType: null, x: null, y: null, skipped: [{ raw: 'x', reason: 'y' }] },
  "'none' suppresses chart and carries skipped entries",
);

// 6. Inference returned null (e.g. <2 matched columns) + user picks line +
//    both axes → override fully wins.
const empty: ChartInferenceResult = {
  chartType: null,
  x: null,
  y: null,
  skipped: [{ raw: 'chart-inference', reason: 'need at least 2 columns' }],
};
assert.deepEqual(
  mergeOverride(empty, 'line', 'x1', 'y1'),
  { chartType: 'line', x: 'x1', y: 'y1', skipped: [] },
  'full override wins over empty inference',
);

// 7. Inference returned null + user picks line but no axes → nullable axes
//    pass through as null (caller renders "pick a column").
assert.deepEqual(
  mergeOverride(empty, 'line', null, null),
  { chartType: 'line', x: null, y: null, skipped: [] },
  'nullable axes render as null (for UI "pick a column" affordance)',
);

console.log('override merge smoke OK');
