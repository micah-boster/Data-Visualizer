/**
 * Smoke test for switchChartType + seedGenericFromPreset. Run via:
 *   npm run smoke:transitions
 *
 * Uses --experimental-strip-types (Node 22+) — no test framework dependency.
 * Covers Phase 36 Plan 04 carryover contract: segmented-control clicks
 * dispatch switchChartType and the result honors the RESEARCH §Pattern 5
 * carryover rules + the CONTEXT-locked preset→generic conversion.
 */
import assert from 'node:assert/strict';
import {
  switchChartType,
  seedGenericFromPreset,
} from './transitions.ts';
import { DEFAULT_COLLECTION_CURVE } from '../views/migrate-chart.ts';
import { COLUMN_CONFIGS } from '../columns/config.ts';
import { isNumericType } from '../formatting/numbers.ts';
import type {
  ChartDefinition,
  CollectionCurveDefinition,
  LineChartDefinition,
} from '../views/types.ts';

// Helper — lookup a column config by key (pure, local).
function col(key: string) {
  return COLUMN_CONFIGS.find((c) => c.key === key);
}

// ---------- 1. Same-type no-op returns reference-equal input ----------
const lineEmpty: LineChartDefinition = {
  type: 'line',
  version: 1,
  x: null,
  y: null,
};
assert.equal(
  switchChartType(lineEmpty, 'line'),
  lineEmpty,
  'same-type switch returns reference-equal input',
);

// ---------- 2. Generic → 'collection-curve' returns DEFAULT_COLLECTION_CURVE ----------
const toPreset = switchChartType(lineEmpty, 'collection-curve');
assert.equal(
  toPreset,
  DEFAULT_COLLECTION_CURVE,
  'generic → collection-curve resets to DEFAULT_COLLECTION_CURVE (reference equality)',
);

// ---------- 3. 'collection-curve' → 'line' seeded by preset ----------
const presetRecovery: CollectionCurveDefinition = {
  type: 'collection-curve',
  version: 2,
  metric: 'recoveryRate',
  hiddenBatches: [],
  showAverage: true,
  showAllBatches: false,
};
const toLine = switchChartType(presetRecovery, 'line') as LineChartDefinition;
assert.equal(toLine.type, 'line', 'preset → line has type: "line"');
assert.equal(toLine.version, 1, 'preset → line has version: 1');
assert.equal(
  toLine.x?.column,
  'BATCH_AGE_IN_MONTHS',
  'preset → line X defaults to BATCH_AGE_IN_MONTHS',
);
assert.ok(toLine.y, 'preset → line Y is not null');
const yCol = col(toLine.y!.column);
assert.ok(
  yCol && isNumericType(yCol.type),
  `preset → line Y column resolves to a numeric COLUMN_CONFIGS entry (got ${toLine.y!.column})`,
);

// ---------- 4. 'collection-curve' → 'bar' with metric:'amount' ----------
const presetAmount: CollectionCurveDefinition = {
  type: 'collection-curve',
  version: 2,
  metric: 'amount',
  hiddenBatches: [],
  showAverage: true,
  showAllBatches: false,
};
const toBar = switchChartType(presetAmount, 'bar') as ChartDefinition & {
  type: 'bar';
};
assert.equal(toBar.type, 'bar', 'preset (amount) → bar has type: "bar"');
assert.equal(
  toBar.x?.column,
  'BATCH',
  'preset (amount) → bar X defaults to BATCH',
);
assert.equal(
  toBar.y?.column,
  'TOTAL_COLLECTED_LIFE_TIME',
  'preset (amount) → bar Y maps to TOTAL_COLLECTED_LIFE_TIME',
);

// ---------- 5. 'collection-curve' → 'scatter' leaves X null ----------
const toScatter = seedGenericFromPreset(presetRecovery, 'scatter') as ChartDefinition & {
  type: 'scatter';
};
assert.equal(toScatter.type, 'scatter', 'preset → scatter has type: "scatter"');
assert.equal(toScatter.x, null, 'preset → scatter X is null (user picks)');
assert.ok(toScatter.y, 'preset → scatter Y is not null');
const scatterYCol = col(toScatter.y!.column);
assert.ok(
  scatterYCol && isNumericType(scatterYCol.type),
  'preset → scatter Y is a numeric COLUMN_CONFIGS entry',
);

// ---------- 6. Generic line → bar with X numeric clears X to null ----------
const lineWithNumericX: LineChartDefinition = {
  type: 'line',
  version: 1,
  x: { column: 'TOTAL_COLLECTED_LIFE_TIME' },
  y: { column: 'TOTAL_COLLECTED_LIFE_TIME' },
};
const lineToBar = switchChartType(lineWithNumericX, 'bar') as ChartDefinition & {
  type: 'bar';
};
assert.equal(
  lineToBar.x,
  null,
  'line → bar clears numeric X (bar X must be categorical)',
);
assert.equal(
  lineToBar.y?.column,
  'TOTAL_COLLECTED_LIFE_TIME',
  'line → bar carries numeric Y (Y is numeric across all chart types)',
);

// ---------- 7. Generic line → scatter honors per-chart X eligibility ----------
// Phase 36.x curation: line X allowlist (BATCH_AGE_IN_MONTHS, BATCH) does NOT
// intersect the scatter X allowlist (headline metrics). So line → scatter
// MUST clear X. Y is a headline metric eligible on both, so it carries.
const lineBothNumeric: LineChartDefinition = {
  type: 'line',
  version: 1,
  x: { column: 'BATCH_AGE_IN_MONTHS' },
  y: { column: 'TOTAL_COLLECTED_LIFE_TIME' },
};
const lineToScatter = switchChartType(lineBothNumeric, 'scatter') as ChartDefinition & {
  type: 'scatter';
};
assert.equal(
  lineToScatter.x,
  null,
  'line → scatter clears X (BATCH_AGE_IN_MONTHS not in scatter allowlist)',
);
assert.equal(
  lineToScatter.y?.column,
  'TOTAL_COLLECTED_LIFE_TIME',
  'line → scatter carries headline-metric Y unchanged',
);

// ---------- 8. Freshness: generic → generic returns a NEW object, not the input ----------
assert.notEqual(
  lineToScatter,
  lineBothNumeric,
  'generic → generic returns a fresh object (not the input reference)',
);

console.log('✓ transitions smoke test passed (16 assertions)');
