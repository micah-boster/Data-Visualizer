/**
 * Smoke test for the TERMS vocabulary registry (Phase 44 VOC-02).
 *
 * Three assertions:
 *   1. Every entry has non-empty label and definition; definition ends with a
 *      period (forces sentence punctuation — popover bodies should always
 *      read as complete sentences).
 *   2. Every `seeAlso` cross-reference points at a valid TermName (no
 *      dangling links — a removed term must surface here, not in a runtime
 *      console error).
 *   3. The registry is exhaustive against a hard-coded checklist of the 12
 *      Phase 44 v4.5 terms — catches accidental term removal during refactors
 *      AND accidental term addition (e.g. a future contributor appending a
 *      v5.0 term here instead of in their phase plan).
 *
 * Run: node --experimental-strip-types src/lib/vocabulary.smoke.ts
 *
 * This file deliberately uses only a relative `./vocabulary.ts` import so it
 * runs under node --experimental-strip-types without `@/` alias support.
 */

import assert from 'node:assert/strict';

import { TERMS, type TermDefinition, type TermName } from './vocabulary.ts';

// `Object.entries(TERMS)` widens to `[string, unknown][]` under TS strict
// mode because TERMS is an `as const` object literal — re-cast through
// the known shape so the assertions below see the typed entry.
const ENTRIES = Object.entries(TERMS) as Array<[string, TermDefinition]>;

// ---------------------------------------------------------------------------
// 1. Per-entry shape assertions: non-empty label/definition, sentence period.
// ---------------------------------------------------------------------------
for (const [key, entry] of ENTRIES) {
  assert.ok(
    entry.label.length > 0,
    `TERMS[${key}].label must be non-empty`,
  );
  assert.ok(
    entry.definition.length > 0,
    `TERMS[${key}].definition must be non-empty`,
  );
  assert.ok(
    entry.definition.endsWith('.'),
    `TERMS[${key}].definition must end with a period (forces sentence punctuation)`,
  );
  assert.ok(
    Array.isArray(entry.synonyms),
    `TERMS[${key}].synonyms must be an array`,
  );
  assert.ok(
    Array.isArray(entry.seeAlso),
    `TERMS[${key}].seeAlso must be an array`,
  );
}

// ---------------------------------------------------------------------------
// 2. Cross-reference integrity — every seeAlso entry is a registered TermName.
// ---------------------------------------------------------------------------
const validKeys = new Set(Object.keys(TERMS));
for (const [key, entry] of ENTRIES) {
  for (const ref of entry.seeAlso) {
    assert.ok(
      validKeys.has(ref),
      `TERMS[${key}].seeAlso references unknown term '${ref}' — dangling cross-reference`,
    );
  }
}

// ---------------------------------------------------------------------------
// 3. Exhaustiveness — registry contents match the hard-coded v4.5 checklist.
//    Sorted-equality so diff is legible on failure.
//
//    Plan 44-01 seeded the first 12 terms; Plan 44-03 added revenueModel,
//    contingency, debtSale alongside the REVENUE_MODEL plumbing for VOC-05.
// ---------------------------------------------------------------------------
const EXPECTED_TERMS: TermName[] = [
  'partner',
  'product',
  'batch',
  'account',
  'metric',
  'curve',
  'anomaly',
  'norm',
  'list',
  'view',
  'preset',
  'percentile',
  // Plan 44-03 (VOC-05) — REVENUE_MODEL third-dimension scoping
  'revenueModel',
  'contingency',
  'debtSale',
];

const actualKeys = Object.keys(TERMS).slice().sort();
const expectedKeys = EXPECTED_TERMS.slice().sort();

assert.deepStrictEqual(
  actualKeys,
  expectedKeys,
  'TERMS registry keys must match the hard-coded v4.5 checklist exactly — ' +
    'no missing terms, no surprise additions (v5.0 terms ship with v5.0 phases).',
);

console.log('\u2713 vocabulary smoke OK');
