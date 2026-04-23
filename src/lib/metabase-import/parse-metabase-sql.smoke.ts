/**
 * Phase 37 — smoke test for parseMetabaseSql.
 * Run via: npm run smoke:metabase-import
 *
 * Mirrors the --experimental-strip-types convention established by Phase
 * 35/36 smoke scripts (no test framework dependency).
 *
 * Covers 37-PLAN Task 2 <done>:
 *   - 6 fixture files parse without throwing
 *   - Unknown columns skipped with 'column not in schema'
 *   - Template tags ({{var}} + [[...]]) stripped before parse
 *   - Aggregates / GROUP BY / JOIN / CTE / WINDOW / OR / non-SELECT land in
 *     skippedColumns or unsupportedConstructs
 *   - Malformed SQL produces parseError (never throws)
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseMetabaseSql } from './parse-metabase-sql.ts';

const read = (f: string): string =>
  readFileSync(new URL(`./fixtures/${f}`, import.meta.url), 'utf8');

// 1. Simple SELECT — 3 columns matched, zero skipped, zero filters, zero sort.
const r1 = parseMetabaseSql(read('simple-select.sql'));
assert.equal(r1.parseError, undefined, '[1] simple-select: no parse error');
assert.equal(r1.matchedColumns.length, 3, '[1] 3 columns matched');
assert.equal(r1.skippedColumns.length, 0, '[1] no skipped columns');
assert.equal(r1.matchedFilters.length, 0, '[1] no filters');
assert.equal(r1.matchedSort.length, 0, '[1] no sort');

// 2. with-where-in — 4 columns + 3 filters (eq + in + between) + 1 sort DESC.
const r2 = parseMetabaseSql(read('with-where-in.sql'));
assert.equal(r2.parseError, undefined, '[2] with-where-in: no parse error');
assert.equal(r2.matchedColumns.length, 4, '[2] 4 columns matched');
assert.equal(r2.matchedFilters.length, 3, '[2] 3 filters matched');
assert.ok(
  r2.matchedFilters.some((f) => f.operator === 'eq'),
  '[2] eq filter present',
);
assert.ok(
  r2.matchedFilters.some((f) => f.operator === 'in'),
  '[2] in filter present',
);
assert.ok(
  r2.matchedFilters.some((f) => f.operator === 'between'),
  '[2] between filter present',
);
assert.equal(r2.matchedSort.length, 1, '[2] 1 sort entry');
assert.equal(r2.matchedSort[0]?.desc, true, '[2] sort is DESC');

// 3. Quoted identifiers — case-folded to uppercase, matched against ALLOWED_COLUMNS.
const r3 = parseMetabaseSql(read('quoted-identifiers.sql'));
assert.equal(r3.parseError, undefined, '[3] quoted-identifiers: no parse error');
assert.equal(
  r3.matchedColumns.length,
  2,
  '[3] quoted identifiers case-fold to uppercase',
);
assert.equal(r3.matchedFilters.length, 1, '[3] quoted WHERE filter matched');

// 4. group-by-bar — columns skipped (aggregate), unsupportedConstructs accumulates.
const r4 = parseMetabaseSql(read('group-by-bar.sql'));
assert.equal(r4.parseError, undefined, '[4] group-by-bar: no parse error');
assert.ok(
  r4.unsupportedConstructs.some((c) => c.kind === 'groupby'),
  '[4] groupby flagged',
);
assert.ok(
  r4.unsupportedConstructs.some((c) => c.kind === 'aggregate'),
  '[4] aggregate flagged',
);
assert.ok(r4.skippedColumns.length >= 1, '[4] at least one skipped column (SUM)');

// 5. unsupported-join — JOIN + subquery both flagged.
const r5 = parseMetabaseSql(read('unsupported-join.sql'));
assert.equal(r5.parseError, undefined, '[5] unsupported-join: no parse error');
assert.ok(
  r5.unsupportedConstructs.some((c) => c.kind === 'join'),
  '[5] JOIN flagged',
);

// 6. Template tags — {{var}} + [[...]] stripped before parse; NO parseError.
const r6 = parseMetabaseSql(read('template-tags.sql'));
assert.equal(
  r6.parseError,
  undefined,
  '[6] template tags stripped before parse — no parseError',
);

// 7. Unknown column — silently skipped with reason.
const r7 = parseMetabaseSql(
  `SELECT bogus_column, partner_name FROM agg_batch_performance_summary`,
);
assert.equal(r7.matchedColumns.length, 1, '[7] one column matched');
assert.equal(
  r7.skippedColumns[0]?.reason,
  'column not in schema',
  '[7] unknown column skipped with reason',
);

// 8. Malformed SQL — parseError populated, not thrown.
const r8 = parseMetabaseSql(`SELECT FROM WHERE`);
assert.ok(r8.parseError, '[8] parse error captured, not thrown');
assert.ok(
  typeof r8.parseError?.message === 'string' && r8.parseError.message.length > 0,
  '[8] parse error has a message',
);

// 9. Phase 37 Defect 5 — invalid enum value on ACCOUNT_TYPE routes to
//    skippedFilters with a valid-values hint. Paste `account_type = 'Consumer'`
//    (the real bug that motivated this defect round) and assert:
//      - no entry in matchedFilters for ACCOUNT_TYPE
//      - an entry in skippedFilters with reason mentioning "Account Type"
//      - validValues list contains the three real ACCOUNT_TYPE values
const r9 = parseMetabaseSql(read('invalid-enum-value.sql'));
assert.equal(r9.parseError, undefined, '[9] invalid-enum-value: no parse error');
assert.equal(
  r9.matchedFilters.filter((f) => f.columnKey === 'ACCOUNT_TYPE').length,
  0,
  '[9] ACCOUNT_TYPE filter NOT matched when value is outside enum',
);
const enumSkip = r9.skippedFilters.find((s) =>
  s.reason.includes('Account Type'),
);
assert.ok(enumSkip, '[9] skippedFilters contains an Account Type enum-miss entry');
assert.ok(
  enumSkip!.validValues && enumSkip!.validValues.length === 3,
  '[9] validValues list has 3 Account Type entries',
);
assert.ok(
  enumSkip!.validValues!.includes('THIRD_PARTY'),
  '[9] validValues contains real ACCOUNT_TYPE value',
);
assert.ok(
  enumSkip!.raw.includes('Consumer'),
  '[9] skip raw preserves the offending literal for the preview label',
);

// 10. IN with an invalid enum value — whole filter skipped (no partial-accept).
const r10 = parseMetabaseSql(
  `SELECT partner_name FROM agg_batch_performance_summary WHERE account_type IN ('THIRD_PARTY', 'Consumer')`,
);
assert.equal(
  r10.matchedFilters.filter((f) => f.columnKey === 'ACCOUNT_TYPE').length,
  0,
  '[10] ACCOUNT_TYPE IN filter skipped when any value is outside enum',
);
const inSkip = r10.skippedFilters.find((s) => s.reason.includes('Account Type'));
assert.ok(inSkip, '[10] IN with invalid enum lands in skippedFilters');
assert.ok(
  inSkip!.validValues && inSkip!.validValues.includes('THIRD_PARTY'),
  '[10] IN skip carries validValues hint too',
);

// 11. Valid enum value passes through (regression guard — makes sure the new
//     validation path doesn't reject values it should accept).
const r11 = parseMetabaseSql(
  `SELECT partner_name FROM agg_batch_performance_summary WHERE account_type = 'THIRD_PARTY'`,
);
assert.equal(
  r11.matchedFilters.filter((f) => f.columnKey === 'ACCOUNT_TYPE').length,
  1,
  '[11] valid ACCOUNT_TYPE value still matches',
);

console.log('✓ metabase-import parse smoke test passed (11 fixtures / cases)');
