/**
 * Phase 37 — smoke test for mapToSnapshot.
 * Run via: npm run smoke:metabase-map
 *
 * Covers 37-PLAN Task 3 <done>:
 *   - columnOrder reflects SELECT order
 *   - columnVisibility is explicit (matched true, all others false)
 *   - text `eq` -> string[] (checklist filter)
 *   - numeric `between` -> { min, max } (range filter)
 *   - ORDER BY DESC -> sorting { id, desc: true }
 *   - Inferred chart (when present) is a valid ChartDefinition
 *   - sourceQuery is NEVER set by the mapper (Plan 03 owns Apply-time write)
 */

import assert from 'node:assert/strict';
import { parseMetabaseSql } from './parse-metabase-sql.ts';
import { mapToSnapshot } from './map-to-snapshot.ts';
import { DEFAULT_COLUMNS } from '../columns/config.ts';

// 1. Simple SELECT -> columnOrder + explicit visibility map.
const r1 = parseMetabaseSql(
  'SELECT partner_name, batch FROM agg_batch_performance_summary',
);
const s1 = mapToSnapshot(r1);
assert.deepEqual(
  s1.columnOrder,
  ['PARTNER_NAME', 'BATCH'],
  '[1] columnOrder reflects SELECT order (uppercase)',
);
assert.equal(
  s1.columnVisibility?.['PARTNER_NAME'],
  true,
  '[1] matched column visible',
);
assert.equal(s1.columnVisibility?.['BATCH'], true, '[1] matched column visible');
const hiddenKeys = DEFAULT_COLUMNS.filter(
  (k) => k !== 'PARTNER_NAME' && k !== 'BATCH',
);
assert.ok(
  hiddenKeys.some((k) => s1.columnVisibility?.[k] === false),
  '[1] at least one unmatched column is explicitly hidden',
);

// 2. eq on text column -> string[] filter shape.
const r2 = parseMetabaseSql(
  `SELECT partner_name FROM agg_batch_performance_summary WHERE account_type = 'Consumer'`,
);
const s2 = mapToSnapshot(r2);
assert.deepEqual(
  s2.columnFilters?.['ACCOUNT_TYPE'],
  ['Consumer'],
  '[2] text eq -> [value] checklist shape',
);

// 3. between on numeric column -> { min, max } shape.
const r3 = parseMetabaseSql(
  `SELECT batch_age_in_months FROM agg_batch_performance_summary WHERE batch_age_in_months BETWEEN 3 AND 12`,
);
const s3 = mapToSnapshot(r3);
assert.deepEqual(
  s3.columnFilters?.['BATCH_AGE_IN_MONTHS'],
  { min: 3, max: 12 },
  '[3] numeric between -> { min, max } range shape',
);

// 4. ORDER BY DESC -> sorting { id, desc: true }.
const r4 = parseMetabaseSql(
  `SELECT partner_name FROM agg_batch_performance_summary ORDER BY partner_name DESC`,
);
const s4 = mapToSnapshot(r4);
assert.deepEqual(
  s4.sorting,
  [{ id: 'PARTNER_NAME', desc: true }],
  '[4] ORDER BY DESC -> sorting desc:true',
);

// 5. Inferred chart embeds into chartState with a valid variant type.
const r5 = parseMetabaseSql(
  `SELECT partner_name, total_accounts FROM agg_batch_performance_summary`,
);
const s5 = mapToSnapshot(r5);
if (s5.chartState) {
  assert.ok(
    ['line', 'scatter', 'bar'].includes(s5.chartState.type),
    '[5] chartState type is a valid Phase 36 variant',
  );
}

// 6. sourceQuery NOT set by mapper (Apply path owns it).
assert.equal(s5.sourceQuery, undefined, '[6] mapper never sets sourceQuery');

console.log('✓ metabase-import map smoke test passed (6 assertions)');
