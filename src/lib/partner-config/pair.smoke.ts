/**
 * Smoke test for Phase 39 PCFG-01..04 pair encoding helpers.
 * Phase 44 VOC-05 — extended with REVENUE_MODEL third-dimension cases plus
 * backward-compat cases for legacy two-segment pair keys and existing callers
 * that omit the new `revenueModelsPerPair` argument.
 *
 * Verifies:
 *   - pairKey/parsePairKey roundtrip (with and without revenueModel)
 *   - parsePairKey returns null on malformed input
 *   - Legacy two-segment pair keys parse cleanly with revenueModel: undefined
 *   - sortPairs places PRE_CHARGE_OFF_FIRST_PARTY before THIRD_PARTY for the
 *     same partner (PRODUCT_TYPE_ORDER invariant)
 *   - sortPairs places unknown product types after known types alphabetically
 *   - sortPairs places CONTINGENCY before DEBT_SALE within (partner, product)
 *   - displayNameForPair returns bare name when productsPerPartner === 1;
 *     suffixed name when > 1
 *   - displayNameForPair appends revenue-model suffix only when
 *     revenueModelsPerPair > 1 AND the pair carries a revenueModel
 *   - displayNameForPair backward compat: omitting the third arg keeps every
 *     pre-Phase-44 call site producing byte-identical output
 *
 * Run: node --experimental-strip-types src/lib/partner-config/pair.smoke.ts
 */

import assert from "node:assert/strict";

import {
  pairKey,
  parsePairKey,
  sortPairs,
  displayNameForPair,
  labelForProduct,
  labelForRevenueModel,
  PRODUCT_TYPE_ORDER,
  REVENUE_MODEL_ORDER,
  REVENUE_MODEL_LABELS,
  type PartnerProductPair,
} from "./pair.ts";

// 1. pairKey / parsePairKey roundtrip — Phase 39 (no revenueModel)
{
  const pair: PartnerProductPair = {
    partner: "Happy Money",
    product: "PRE_CHARGE_OFF_FIRST_PARTY",
  };
  const key = pairKey(pair);
  assert.equal(
    key,
    "Happy Money::PRE_CHARGE_OFF_FIRST_PARTY::",
    "pairKey produces canonical separator with empty third segment when revenueModel is undefined",
  );
  const parsed = parsePairKey(key);
  assert.deepEqual(parsed, pair, "parsePairKey roundtrips the original pair without revenueModel");
}

// 2. pairKey / parsePairKey roundtrip — Phase 44 (with revenueModel)
{
  const pair: PartnerProductPair = {
    partner: "Happy Money",
    product: "THIRD_PARTY",
    revenueModel: "CONTINGENCY",
  };
  const key = pairKey(pair);
  assert.equal(
    key,
    "Happy Money::THIRD_PARTY::CONTINGENCY",
    "pairKey produces three-segment key when revenueModel is set",
  );
  const parsed = parsePairKey(key);
  assert.deepEqual(parsed, pair, "parsePairKey roundtrips the original pair with revenueModel");
}

// 3. parsePairKey: legacy two-segment key (pre-Phase-44 persisted pair keys)
{
  const legacyKey = "Affirm::PRE_CHARGE_OFF_FIRST_PARTY";
  const parsed = parsePairKey(legacyKey);
  assert.deepEqual(
    parsed,
    { partner: "Affirm", product: "PRE_CHARGE_OFF_FIRST_PARTY" },
    "legacy two-segment key parses with revenueModel: undefined for backward compat",
  );
}

// 4. parsePairKey: empty third segment resolves to undefined revenueModel
{
  const key = "Affirm::PRE_CHARGE_OFF_FIRST_PARTY::";
  const parsed = parsePairKey(key);
  assert.deepEqual(
    parsed,
    { partner: "Affirm", product: "PRE_CHARGE_OFF_FIRST_PARTY" },
    "three-segment key with empty trailing segment resolves to revenueModel: undefined",
  );
}

// 5. parsePairKey returns null on malformed input
{
  assert.equal(parsePairKey("bogus-no-separator"), null, "missing :: returns null");
  assert.equal(parsePairKey(""), null, "empty string returns null");
}

// 6. sortPairs: PRE_CHARGE_OFF_FIRST_PARTY before THIRD_PARTY within same partner
{
  const input: PartnerProductPair[] = [
    { partner: "Happy Money", product: "THIRD_PARTY" },
    { partner: "Happy Money", product: "PRE_CHARGE_OFF_FIRST_PARTY" },
  ];
  const out = sortPairs(input);
  assert.equal(
    out[0].product,
    "PRE_CHARGE_OFF_FIRST_PARTY",
    "1st Party sorts before 3rd Party for same partner",
  );
  assert.equal(out[1].product, "THIRD_PARTY", "3rd Party second");
  assert.equal(
    PRODUCT_TYPE_ORDER[0],
    "PRE_CHARGE_OFF_FIRST_PARTY",
    "PRODUCT_TYPE_ORDER starts with 1st Party",
  );
}

// 7. sortPairs: unknown product types sort after known ones, alphabetically
{
  const input: PartnerProductPair[] = [
    { partner: "Acme", product: "ZZZ_UNKNOWN" },
    { partner: "Acme", product: "AAA_UNKNOWN" },
    { partner: "Acme", product: "THIRD_PARTY" },
  ];
  const out = sortPairs(input);
  assert.equal(out[0].product, "THIRD_PARTY", "known type sorts first");
  assert.equal(out[1].product, "AAA_UNKNOWN", "unknown types alphabetical: A before Z");
  assert.equal(out[2].product, "ZZZ_UNKNOWN", "unknown types alphabetical: Z last");
}

// 8. sortPairs: across partners, alphabetical by partner first
{
  const input: PartnerProductPair[] = [
    { partner: "Zable", product: "THIRD_PARTY" },
    { partner: "Acme", product: "THIRD_PARTY" },
    { partner: "Happy Money", product: "PRE_CHARGE_OFF_FIRST_PARTY" },
  ];
  const out = sortPairs(input);
  assert.equal(out[0].partner, "Acme", "alphabetical: Acme first");
  assert.equal(out[1].partner, "Happy Money", "alphabetical: Happy Money second");
  assert.equal(out[2].partner, "Zable", "alphabetical: Zable last");
}

// 9. sortPairs: within (partner, product), CONTINGENCY before DEBT_SALE
{
  const input: PartnerProductPair[] = [
    { partner: "Happy Money", product: "THIRD_PARTY", revenueModel: "DEBT_SALE" },
    { partner: "Happy Money", product: "THIRD_PARTY", revenueModel: "CONTINGENCY" },
  ];
  const out = sortPairs(input);
  assert.equal(
    out[0].revenueModel,
    "CONTINGENCY",
    "CONTINGENCY sorts before DEBT_SALE within (partner, product)",
  );
  assert.equal(out[1].revenueModel, "DEBT_SALE", "DEBT_SALE second");
  assert.equal(
    REVENUE_MODEL_ORDER[0],
    "CONTINGENCY",
    "REVENUE_MODEL_ORDER starts with CONTINGENCY",
  );
}

// 10. sortPairs: undefined revenueModel sorts before defined for the same (partner, product)
{
  const input: PartnerProductPair[] = [
    { partner: "Happy Money", product: "THIRD_PARTY", revenueModel: "CONTINGENCY" },
    { partner: "Happy Money", product: "THIRD_PARTY" },
  ];
  const out = sortPairs(input);
  assert.equal(
    out[0].revenueModel,
    undefined,
    "undefined revenueModel sorts before defined within same (partner, product)",
  );
  assert.equal(out[1].revenueModel, "CONTINGENCY", "defined revenueModel second");
}

// 11. displayNameForPair: backward-compat — omitting third arg matches Phase 39 behavior
{
  const pair: PartnerProductPair = {
    partner: "Happy Money",
    product: "PRE_CHARGE_OFF_FIRST_PARTY",
  };
  assert.equal(
    displayNameForPair(pair, 1),
    "Happy Money",
    "single-product partner shows name only (Phase 39 contract preserved)",
  );
  assert.equal(
    displayNameForPair(pair, 2),
    "Happy Money — 1st Party",
    "multi-product partner shows product suffix (Phase 39 contract preserved)",
  );

  const unknownPair: PartnerProductPair = {
    partner: "Acme",
    product: "WEIRD_TYPE",
  };
  assert.equal(
    displayNameForPair(unknownPair, 2),
    "Acme — WEIRD_TYPE",
    "unknown product type falls back to raw value (Phase 39 contract preserved)",
  );
}

// 12. displayNameForPair: revenue-model suffix only when revenueModelsPerPair > 1
{
  const pair: PartnerProductPair = {
    partner: "Happy Money",
    product: "THIRD_PARTY",
    revenueModel: "CONTINGENCY",
  };
  // Multi-product, multi-revenue-model: full suffix
  assert.equal(
    displayNameForPair(pair, 2, 2),
    "Happy Money — 3rd Party-Contingency",
    "multi-product + multi-revenue-model: name — Product-RevenueModel",
  );
  // Multi-product, single revenue-model: product suffix only
  assert.equal(
    displayNameForPair(pair, 2, 1),
    "Happy Money — 3rd Party",
    "multi-product + single revenue-model: no revenue-model suffix",
  );
  // Single product (so productsPerPartner=1), multi-revenue-model: revenue-model suffix only
  // (Real-world example: a partner with a single product but two revenue models — Advance Financial.)
  assert.equal(
    displayNameForPair(pair, 1, 2),
    "Happy Money-Contingency",
    "single product + multi-revenue-model: revenue-model suffix only, no product suffix",
  );
}

// 13. displayNameForPair: single-everything renders bare partner name
{
  const pair: PartnerProductPair = {
    partner: "Affirm",
    product: "PRE_CHARGE_OFF_FIRST_PARTY",
    revenueModel: "CONTINGENCY",
  };
  assert.equal(
    displayNameForPair(pair, 1, 1),
    "Affirm",
    "single product + single revenue model: bare partner name (no suffixes)",
  );
}

// 14. displayNameForPair: multi-revenue-model arg without revenueModel field on pair → no suffix
{
  const pair: PartnerProductPair = {
    partner: "Happy Money",
    product: "THIRD_PARTY",
  };
  assert.equal(
    displayNameForPair(pair, 2, 2),
    "Happy Money — 3rd Party",
    "revenueModelsPerPair>1 but pair has no revenueModel: no suffix (defensive)",
  );
}

// 15. labelForProduct: known and unknown
{
  assert.equal(labelForProduct("PRE_CHARGE_OFF_FIRST_PARTY"), "1st Party");
  assert.equal(labelForProduct("THIRD_PARTY"), "3rd Party");
  assert.equal(labelForProduct("UNRECOGNIZED"), "UNRECOGNIZED");
}

// 16. labelForRevenueModel: known and unknown
{
  assert.equal(labelForRevenueModel("CONTINGENCY"), "Contingency");
  assert.equal(labelForRevenueModel("DEBT_SALE"), "DebtSale");
  assert.equal(labelForRevenueModel("UNRECOGNIZED"), "UNRECOGNIZED");
  // REVENUE_MODEL_LABELS is the rename point — assert the canonical mapping
  assert.equal(REVENUE_MODEL_LABELS.CONTINGENCY, "Contingency");
  assert.equal(REVENUE_MODEL_LABELS.DEBT_SALE, "DebtSale");
}

console.log("pair smoke OK");
