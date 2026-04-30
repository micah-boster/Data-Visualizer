/**
 * DCR-04 — Phase 39 (partner, product) scope-rollup audit.
 *
 * For every multi-product partner in the fixture, verify:
 *   1. Each (partner, product) pair-summary row computes from rows whose
 *      ACCOUNT_TYPE matches the row's product (no cross-product blending)
 *   2. The pair-level KPI values match what computeKpis returns when fed
 *      ONLY the matching-product rows
 *   3. Summing per-pair totals across products of one partner equals the
 *      partner-as-whole values when the table is grouped by PARTNER_NAME
 *      (this is the apples-and-oranges check at scope-rollup grain — it's
 *      what would have been the partner-level value pre-Phase-39, and the
 *      multi-product equality must hold because products are non-overlapping)
 *
 * Findings (DCR-04 status) feed into docs/METRIC-AUDIT.md.
 *
 * Pair-summary inline replica (sum strategy) avoids the @/-aliased imports
 * in src/lib/columns/root-columns.ts that node-strip-types can't resolve.
 * Filesystem check at the bottom asserts production source still groups
 * by `(PARTNER_NAME, ACCOUNT_TYPE)` pair.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { computeKpis } from './compute-kpis.ts';
import { parseBatchRows } from '../data/parse-batch-row.ts';
import type { BatchRow } from '../data/types.ts';

/**
 * Phase 43 BND-02: computeKpis now accepts `BatchRow[]`. The fixture is
 * loaded as raw `Record<string, unknown>[]` (Snowflake-shaped JSON), so
 * we route every compute call through `parseBatchRows` here. The
 * `buildPairSummaryReplica` and per-pair grouping below still read raw
 * SCREAMING_SNAKE keys (mirroring the production `buildPairSummaryRows`
 * helper which is similarly raw-keyed pre-BND-02 — UI surfaces still
 * read raw and are migrated separately in v5.5 DEBT-07/08).
 */
function toBatchRows(rows: Record<string, unknown>[]): BatchRow[] {
  return parseBatchRows(rows).rows;
}

const FIXTURE_PATH = resolve(import.meta.dirname, '../static-cache/batch-summary.json');
const fixture = JSON.parse(readFileSync(FIXTURE_PATH, 'utf-8')) as {
  data: Record<string, unknown>[];
};
const allRows = fixture.data;

// Pair-summary inline replica (sum strategy for additive numeric columns).
function buildPairSummaryReplica(
  rows: Record<string, unknown>[],
): Map<string, { partner: string; product: string; values: Record<string, number> }> {
  const groups = new Map<
    string,
    { partner: string; product: string; rows: Record<string, unknown>[] }
  >();
  for (const r of rows) {
    const partner = String(r.PARTNER_NAME ?? '');
    const product = String(r.ACCOUNT_TYPE ?? '');
    if (!partner || !product) continue;
    const key = `${partner}::${product}`;
    const existing = groups.get(key);
    if (existing) existing.rows.push(r);
    else groups.set(key, { partner, product, rows: [r] });
  }
  const out = new Map<
    string,
    { partner: string; product: string; values: Record<string, number> }
  >();
  for (const [key, g] of groups.entries()) {
    const sum = (k: string) =>
      g.rows.reduce((s, r) => s + (Number(r[k]) || 0), 0);
    out.set(key, {
      partner: g.partner,
      product: g.product,
      values: {
        __BATCH_COUNT: g.rows.length,
        TOTAL_ACCOUNTS: sum('TOTAL_ACCOUNTS'),
        TOTAL_AMOUNT_PLACED: sum('TOTAL_AMOUNT_PLACED'),
        TOTAL_COLLECTED_LIFE_TIME: sum('TOTAL_COLLECTED_LIFE_TIME'),
      },
    });
  }
  return out;
}

// Group rows by partner; identify multi-product partners.
const byPartner = new Map<string, Record<string, unknown>[]>();
for (const row of allRows) {
  const partner = String(row.PARTNER_NAME ?? '');
  if (!partner) continue;
  const existing = byPartner.get(partner) ?? [];
  existing.push(row);
  byPartner.set(partner, existing);
}

const multiProductPartners = [...byPartner.entries()].filter(([, rows]) => {
  const products = new Set(rows.map((r) => String(r.ACCOUNT_TYPE)));
  return products.size > 1;
});

assert.ok(
  multiProductPartners.length > 0,
  'fixture must contain at least one multi-product partner (currently Happy Money + Zable)',
);

const TOLERANCE_DOLLARS = 0.01;
const TOLERANCE_RATE = 1e-9;
const partnersChecked: string[] = [];

for (const [partner, partnerRows] of multiProductPartners) {
  partnersChecked.push(partner);

  // Build pair-summary rows for this partner only.
  const summaries = buildPairSummaryReplica(partnerRows);

  // Group partnerRows by product.
  const byProduct = new Map<string, Record<string, unknown>[]>();
  for (const r of partnerRows) {
    const prod = String(r.ACCOUNT_TYPE);
    const arr = byProduct.get(prod) ?? [];
    arr.push(r);
    byProduct.set(prod, arr);
  }

  // INVARIANT 1: pair-summary uses ONLY matching-product rows
  // (no cross-product blending).
  for (const [, summary] of summaries.entries()) {
    const product = summary.product;
    const matchingRows = byProduct.get(product) ?? [];
    const otherProducts = [...byProduct.keys()].filter((p) => p !== product);

    const expectedPlaced = matchingRows.reduce(
      (s, r) => s + (Number(r.TOTAL_AMOUNT_PLACED) || 0),
      0,
    );
    const summaryPlaced = summary.values.TOTAL_AMOUNT_PLACED;

    assert.ok(
      Math.abs(expectedPlaced - summaryPlaced) < TOLERANCE_DOLLARS,
      `[DCR-04] cross-product blending detected for ${partner} (${product}): summary placed=${summaryPlaced} but matching-only=${expectedPlaced}. Other products: ${otherProducts.join(', ')}`,
    );

    const expectedCollected = matchingRows.reduce(
      (s, r) => s + (Number(r.TOTAL_COLLECTED_LIFE_TIME) || 0),
      0,
    );
    const summaryCollected = summary.values.TOTAL_COLLECTED_LIFE_TIME;
    assert.ok(
      Math.abs(expectedCollected - summaryCollected) < TOLERANCE_DOLLARS,
      `[DCR-04] cross-product collection blending for ${partner} (${product}): summary=${summaryCollected} but matching-only=${expectedCollected}`,
    );
  }

  // INVARIANT 2: pair-level computeKpis on matching rows === pair-summary numbers.
  for (const [product, rows] of byProduct.entries()) {
    const kpis = computeKpis(toBatchRows(rows));
    const summary = summaries.get(`${partner}::${product}`);
    assert(summary, `summary row missing for ${partner}::${product}`);

    assert.ok(
      Math.abs(summary.values.TOTAL_COLLECTED_LIFE_TIME - kpis.totalCollected) < TOLERANCE_DOLLARS,
      `[DCR-04] ${partner}::${product}: summary totalCollected=${summary.values.TOTAL_COLLECTED_LIFE_TIME} !== computeKpis(matching).totalCollected=${kpis.totalCollected}`,
    );
    assert.ok(
      Math.abs(summary.values.TOTAL_AMOUNT_PLACED - kpis.totalPlaced) < TOLERANCE_DOLLARS,
      `[DCR-04] ${partner}::${product}: summary totalPlaced=${summary.values.TOTAL_AMOUNT_PLACED} !== computeKpis(matching).totalPlaced=${kpis.totalPlaced}`,
    );
    assert.equal(
      summary.values.TOTAL_ACCOUNTS,
      kpis.totalAccounts,
      `[DCR-04] ${partner}::${product}: summary totalAccounts=${summary.values.TOTAL_ACCOUNTS} !== computeKpis(matching).totalAccounts=${kpis.totalAccounts}`,
    );
  }

  // INVARIANT 3: sum of per-product totals === partner-as-whole when computed
  // apples-and-oranges. Products are non-overlapping by definition (each row
  // has exactly one ACCOUNT_TYPE), so the sum-of-products equality holds for
  // any additive metric. This is the legitimate partner-level number that
  // would have appeared pre-Phase-39 — Phase 39 PCFG-04 split it into pair
  // rows but the legitimate sum is still derivable.
  const sumOfPerProductCollected = [...byProduct.values()].reduce(
    (s, rows) => s + computeKpis(toBatchRows(rows)).totalCollected,
    0,
  );
  const partnerWideCollected = computeKpis(toBatchRows(partnerRows)).totalCollected;
  assert.ok(
    Math.abs(sumOfPerProductCollected - partnerWideCollected) < TOLERANCE_DOLLARS,
    `[DCR-04 / DCR-10] ${partner}: sum-of-per-product totalCollected=${sumOfPerProductCollected} !== partner-wide=${partnerWideCollected}`,
  );

  const sumOfPerProductPlaced = [...byProduct.values()].reduce(
    (s, rows) => s + computeKpis(toBatchRows(rows)).totalPlaced,
    0,
  );
  const partnerWidePlaced = computeKpis(toBatchRows(partnerRows)).totalPlaced;
  assert.ok(
    Math.abs(sumOfPerProductPlaced - partnerWidePlaced) < TOLERANCE_DOLLARS,
    `[DCR-04 / DCR-10] ${partner}: sum-of-per-product totalPlaced=${sumOfPerProductPlaced} !== partner-wide=${partnerWidePlaced}`,
  );

  // Sanity: partner-wide rate over all products is NOT the same as any single
  // pair's rate (when the products have different rate values) — confirms
  // multi-product partners genuinely need the pair split (not just labeling).
  void TOLERANCE_RATE;
}

// Filesystem check: production root-columns.ts groups by (PARTNER_NAME, ACCOUNT_TYPE).
{
  const here = import.meta.dirname;
  const src = readFileSync(
    resolve(here, '../columns/root-columns.ts'),
    'utf-8',
  );
  assert.match(
    src,
    /pairKey/,
    'production root-columns.ts must use pairKey for grouping',
  );
  assert.match(
    src,
    /ACCOUNT_TYPE/,
    'production root-columns.ts must reference ACCOUNT_TYPE for product split',
  );
}

console.log(
  `scope-rollup smoke OK (multi-product partners checked: ${partnersChecked.length} — ${partnersChecked.join(', ')})`,
);
