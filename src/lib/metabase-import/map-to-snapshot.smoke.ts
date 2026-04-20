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
 *   - Scenario-A regression (2026-04-19): filter value round-trips against a
 *     real ACCOUNT_TYPE from the shipped static-cache data (guards the "fixture
 *     ≠ data" trap that produced Plan-03 Defect 2).
 */

import assert from 'node:assert/strict';
import { parseMetabaseSql } from './parse-metabase-sql.ts';
import { mapToSnapshot } from './map-to-snapshot.ts';
import { DEFAULT_COLUMNS } from '../columns/config.ts';
import batchSummary from '../static-cache/batch-summary.json' with { type: 'json' };

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

// 7. Scenario-A regression (Defect 2, 2026-04-19): when a WHERE literal is a
//    REAL `ACCOUNT_TYPE` enum from the shipped static-cache data, the mapped
//    filter value must round-trip to match at least one row via the same
//    exact-string-equality path `filteredRawData` uses in `data-display.tsx`
//    (lines 200-204: `String(cf.value) === String(row[cf.id])`).
//
//    Without this guard, a future mapper change that e.g. lower-cases text
//    enum values would silently break the apply pipeline for all static-cache
//    tests — the Scenario A fixture would still parse, but the toolbar chip
//    would render against 0 rows.
//
//    The PRIOR Scenario-A fixture used `'Consumer'`, which is NOT a real
//    ACCOUNT_TYPE in the batch-summary data (actual values: THIRD_PARTY,
//    PRE_CHARGE_OFF_FIRST_PARTY, PRE_CHARGE_OFF_THIRD_PARTY). That fixture is
//    now corrected in the plan; this assertion locks it in as a regression
//    guard.
const realAccountType = 'THIRD_PARTY';
const sampleRow = batchSummary.data.find(
  (r: Record<string, unknown>) => r.ACCOUNT_TYPE === realAccountType,
);
assert.ok(
  sampleRow,
  `[7] precondition: batch-summary.json contains at least one row with ACCOUNT_TYPE='${realAccountType}'`,
);

const r7 = parseMetabaseSql(
  `SELECT partner_name FROM agg_batch_performance_summary WHERE account_type = '${realAccountType}'`,
);
const s7 = mapToSnapshot(r7);
const mapped = s7.columnFilters?.['ACCOUNT_TYPE'];
assert.deepEqual(
  mapped,
  [realAccountType],
  `[7] text eq preserves value verbatim (no case/format mutation)`,
);
assert.equal(
  String((mapped as string[])[0]),
  String(sampleRow!.ACCOUNT_TYPE),
  `[7] mapped filter value matches real row via String()==String() — same path filteredRawData uses`,
);

console.log('✓ metabase-import map smoke test passed (7 assertions)');
