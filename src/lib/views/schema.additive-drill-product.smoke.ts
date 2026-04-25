/**
 * Smoke test for Phase 39 PCFG-03 additive `drill.product` evolution.
 *
 * Asserts that a legacy snapshot with `drill: { partner, batch }` (no product)
 * still passes `viewSnapshotSchema.safeParse` after the new `product?` field
 * is added. Mirrors the Phase 32-02 / 34-04 / 38 FLT-01 additive-optional
 * precedent.
 *
 * Run: node --experimental-strip-types src/lib/views/schema.additive-drill-product.smoke.ts
 */

import assert from "node:assert/strict";

import { viewSnapshotSchema } from "./schema.ts";

// Legacy ViewSnapshot — drill carries partner + batch but no product
// (the pre-Phase-39 shape).
const legacy = {
  sorting: [],
  columnVisibility: {},
  columnOrder: [],
  columnFilters: {},
  dimensionFilters: {},
  columnSizing: {},
  drill: {
    partner: "Happy Money",
    batch: "BATCH_2024_01",
  },
};

const result = viewSnapshotSchema.safeParse(legacy);
assert.equal(
  result.success,
  true,
  "legacy ViewSnapshot without drill.product still parses",
);

// New shape with explicit product also parses.
const modern = {
  sorting: [],
  columnVisibility: {},
  columnOrder: [],
  columnFilters: {},
  dimensionFilters: {},
  columnSizing: {},
  drill: {
    partner: "Happy Money",
    batch: "BATCH_2024_01",
    product: "PRE_CHARGE_OFF_FIRST_PARTY",
  },
};

const modernResult = viewSnapshotSchema.safeParse(modern);
assert.equal(
  modernResult.success,
  true,
  "ViewSnapshot with drill.product parses",
);

console.log("schema.additive-drill-product smoke OK");
