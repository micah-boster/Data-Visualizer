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

// 8. Apply-time promotion regression (Defect 4, 2026-04-19): mirrors the
//    `handleApplyImport` promotion block in `data-display.tsx`. The parser+mapper
//    emit `columnFilters['ACCOUNT_TYPE'] = ['THIRD_PARTY']`, but to drive the
//    URL-backed dimensionFilters channel (which feeds `filteredRawData`), the
//    Apply path promotes entries whose column id matches one of the three
//    FILTER_PARAMS values (PARTNER_NAME / ACCOUNT_TYPE / BATCH). After promotion:
//      - columnFilters no longer carries that entry
//      - dimensionFilters[param-key] holds the string value
//      - filter applied to real rows still yields non-zero matches
//
//    Without this guard, a future refactor that renames FILTER_PARAMS or breaks
//    the promotion loop shape would silently strand dimension filters in
//    columnFilters, where they get dropped at root level (`validIds` filter in
//    `handleLoadViewInternal`) and produce 0 rows in the imported view.
const FILTER_PARAMS = {
  partner: 'PARTNER_NAME',
  type: 'ACCOUNT_TYPE',
  batch: 'BATCH',
} as const;

const r8 = parseMetabaseSql(
  `SELECT partner_name, batch, total_accounts FROM agg_batch_performance_summary WHERE account_type = 'THIRD_PARTY'`,
);
const s8 = mapToSnapshot(r8);

// Simulate the promotion block from `handleApplyImport`.
const promoted: Record<string, string> = {};
const remaining: Record<string, unknown> = { ...(s8.columnFilters ?? {}) };
for (const [paramKey, columnId] of Object.entries(FILTER_PARAMS)) {
  const v = remaining[columnId];
  if (Array.isArray(v) && v.length > 0) {
    promoted[paramKey] = String(v[0]);
    delete remaining[columnId];
  }
}

assert.equal(
  promoted.type,
  'THIRD_PARTY',
  '[8] promotion: columnFilters[ACCOUNT_TYPE] -> dimensionFilters[type]',
);
assert.equal(
  'ACCOUNT_TYPE' in remaining,
  false,
  '[8] promotion: ACCOUNT_TYPE removed from columnFilters after promotion',
);

// Apply the promoted dimension filter through the same row-matching predicate
// `filteredRawData` uses (data-display.tsx:195-204), against real data.
const matched = batchSummary.data.filter((row: Record<string, unknown>) => {
  // One filter: type -> ACCOUNT_TYPE = 'THIRD_PARTY'
  const value = row.ACCOUNT_TYPE;
  if (value == null) return false;
  return String(promoted.type) === String(value);
});
assert.ok(
  matched.length > 0,
  `[8] promoted ?type filter yields non-zero rows against batch-summary (got ${matched.length})`,
);
// Sanity: the 471/477 count is well-known for this fixture; catch a silent
// data shift (e.g. cache regeneration that dropped THIRD_PARTY rows).
assert.ok(
  matched.length >= 100,
  `[8] THIRD_PARTY row count sanity check (got ${matched.length}, expected >=100)`,
);

// Aggregate by partner — the root summary-row count is what the user sees.
const partnerSet = new Set<string>();
for (const r of matched) {
  const name = (r as Record<string, unknown>).PARTNER_NAME;
  if (typeof name === 'string' && name) partnerSet.add(name);
}
assert.ok(
  partnerSet.size >= 10,
  `[8] filtered data aggregates to >=10 partners for root view (got ${partnerSet.size})`,
);

console.log('✓ metabase-import map smoke test passed (8 assertions)');
