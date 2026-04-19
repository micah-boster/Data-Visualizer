/**
 * Smoke test for chart-presets. Run via:
 *   npm run smoke:chart-presets
 *
 * Uses --experimental-strip-types (Node 22+) — no test framework
 * dependency. Locks BUILTIN_PRESETS invariants + sanitization contracts
 * at the pure data/schema layer. React hooks are NOT tested here
 * (they can't run in Node) — the hook's hydration logic is exercised
 * by the app in-browser.
 */
import assert from 'node:assert/strict';
import { BUILTIN_PRESETS } from './defaults.ts';
import { chartPresetSchema, chartPresetsArraySchema } from './schema.ts';
import { CHART_PRESETS_STORAGE_KEY } from './storage.ts';
import { DEFAULT_COLLECTION_CURVE } from '../views/migrate-chart.ts';

// 1. BUILTIN_PRESETS has at least one entry.
assert.ok(
  BUILTIN_PRESETS.length >= 1,
  'BUILTIN_PRESETS carries at least one built-in',
);

// 2. First built-in is the Collection Curves preset with the locked id.
assert.equal(
  BUILTIN_PRESETS[0].id,
  'builtin:collection-curves',
  'built-in id uses the literal builtin: prefix',
);

// 3. Built-in is locked.
assert.equal(BUILTIN_PRESETS[0].locked, true, 'built-in is locked');

// 4. Built-in name is the exact literal (no i18n / no computed name).
assert.equal(
  BUILTIN_PRESETS[0].name,
  'Collection Curves',
  'built-in name is "Collection Curves"',
);

// 5. Reference equality with DEFAULT_COLLECTION_CURVE — proves the
//    single-source-of-truth link. If this breaks, someone duplicated
//    the literal instead of importing it.
assert.equal(
  BUILTIN_PRESETS[0].definition,
  DEFAULT_COLLECTION_CURVE,
  'built-in definition IS DEFAULT_COLLECTION_CURVE (reference equality)',
);

// 6. Every built-in passes chartPresetSchema.safeParse.
for (const preset of BUILTIN_PRESETS) {
  const parsed = chartPresetSchema.safeParse(preset);
  assert.ok(
    parsed.success,
    `built-in "${preset.id}" passes chartPresetSchema`,
  );
}

// 7. Sanitize-drop: a user preset whose `definition` field is malformed
//    fails safeParse. Mirrors the Phase 34 sanitizeSnapshot pattern.
const malformed = [
  {
    id: 'x',
    name: 'bad',
    locked: false,
    createdAt: 1,
    definition: { wrong: 'shape' },
  },
];
const malformedParsed = chartPresetsArraySchema.safeParse(malformed);
assert.equal(
  malformedParsed.success,
  false,
  'malformed definition is rejected by chartPresetsArraySchema',
);

// 8. Valid round-trip: a user preset wrapping the Plan 36-01 line
//    variant passes safeParse. x/y null is legal for a freshly-
//    created line chart (user hasn't picked axes yet).
const validUserPreset = {
  id: 'user-abc',
  name: 'My line chart',
  locked: false,
  createdAt: 1700000000000,
  definition: {
    type: 'line',
    version: 1,
    x: null,
    y: null,
  },
};
const validParsed = chartPresetSchema.safeParse(validUserPreset);
assert.ok(
  validParsed.success,
  'valid line-variant user preset passes chartPresetSchema',
);

// 9. Storage key literal — prevents typo regressions on downstream
//    consumers that might hardcode the key.
assert.equal(
  CHART_PRESETS_STORAGE_KEY,
  'bounce-dv-chart-presets',
  'CHART_PRESETS_STORAGE_KEY matches the locked literal',
);

console.log('✓ chart-presets smoke test passed (9 assertions)');
