/**
 * Smoke test for Phase 39 PCFG-01..04 pair encoding helpers.
 *
 * Verifies:
 *   - pairKey/parsePairKey roundtrip
 *   - parsePairKey returns null on malformed input
 *   - sortPairs places PRE_CHARGE_OFF_FIRST_PARTY before THIRD_PARTY for the
 *     same partner (PRODUCT_TYPE_ORDER invariant)
 *   - sortPairs places unknown product types after known types alphabetically
 *   - displayNameForPair returns bare name when productsPerPartner === 1;
 *     suffixed name when > 1
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
  PRODUCT_TYPE_ORDER,
  type PartnerProductPair,
} from "./pair.ts";

// 1. pairKey / parsePairKey roundtrip
{
  const pair: PartnerProductPair = {
    partner: "Happy Money",
    product: "PRE_CHARGE_OFF_FIRST_PARTY",
  };
  const key = pairKey(pair);
  assert.equal(key, "Happy Money::PRE_CHARGE_OFF_FIRST_PARTY", "pairKey produces canonical separator");
  const parsed = parsePairKey(key);
  assert.deepEqual(parsed, pair, "parsePairKey roundtrips the original pair");
}

// 2. parsePairKey returns null on malformed input
{
  assert.equal(parsePairKey("bogus-no-separator"), null, "missing :: returns null");
  assert.equal(parsePairKey(""), null, "empty string returns null");
}

// 3. sortPairs: PRE_CHARGE_OFF_FIRST_PARTY before THIRD_PARTY within same partner
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
  // PRODUCT_TYPE_ORDER asserted as non-empty so the invariant is statically obvious
  assert.equal(
    PRODUCT_TYPE_ORDER[0],
    "PRE_CHARGE_OFF_FIRST_PARTY",
    "PRODUCT_TYPE_ORDER starts with 1st Party",
  );
}

// 4. sortPairs: unknown product types sort after known ones, alphabetically
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

// 5. sortPairs: across partners, alphabetical by partner first
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

// 6. displayNameForPair: single-product = bare name, multi-product = suffixed
{
  const pair: PartnerProductPair = {
    partner: "Happy Money",
    product: "PRE_CHARGE_OFF_FIRST_PARTY",
  };
  assert.equal(
    displayNameForPair(pair, 1),
    "Happy Money",
    "single-product partner shows name only",
  );
  assert.equal(
    displayNameForPair(pair, 2),
    "Happy Money — 1st Party",
    "multi-product partner shows suffix with em-dash",
  );

  const unknownPair: PartnerProductPair = {
    partner: "Acme",
    product: "WEIRD_TYPE",
  };
  assert.equal(
    displayNameForPair(unknownPair, 2),
    "Acme — WEIRD_TYPE",
    "unknown product type falls back to raw value",
  );
}

// 7. labelForProduct: known and unknown
{
  assert.equal(labelForProduct("PRE_CHARGE_OFF_FIRST_PARTY"), "1st Party");
  assert.equal(labelForProduct("THIRD_PARTY"), "3rd Party");
  assert.equal(labelForProduct("UNRECOGNIZED"), "UNRECOGNIZED");
}

console.log("pair smoke OK");
