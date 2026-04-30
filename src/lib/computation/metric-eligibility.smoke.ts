import assert from 'node:assert/strict';
import {
  isMetricEligible,
  metricHorizonMonths,
} from './metric-eligibility.ts';
import { asBatchAgeMonths, type BatchAgeMonths } from '../data/types.ts';

// Phase 43 BND-02: isMetricEligible is now branded — construct via the
// asBatchAgeMonths coercion site for valid (non-negative finite) ages, and
// cast for the defensive NaN / negative test cases (which assert the
// internal Number.isFinite gate fires regardless of brand provenance).
const m = (n: number): BatchAgeMonths => asBatchAgeMonths(n);

// Strict eligibility — batch age must reach metric horizon
assert.equal(isMetricEligible(m(4), 'COLLECTION_AFTER_12_MONTH'), false);
assert.equal(isMetricEligible(m(11.99), 'COLLECTION_AFTER_12_MONTH'), false);
assert.equal(isMetricEligible(m(12), 'COLLECTION_AFTER_12_MONTH'), true);
assert.equal(isMetricEligible(m(24), 'COLLECTION_AFTER_12_MONTH'), true);

// 6-month metric
assert.equal(isMetricEligible(m(5.99), 'COLLECTION_AFTER_6_MONTH'), false);
assert.equal(isMetricEligible(m(6), 'COLLECTION_AFTER_6_MONTH'), true);

// Always-evaluable metrics (horizon 0)
assert.equal(
  isMetricEligible(m(0), 'PENETRATION_RATE_POSSIBLE_AND_CONFIRMED'),
  true,
);
assert.equal(isMetricEligible(m(0.5), 'RECOVERY_RATE_X'), true);

// Defensive: NaN / negative ages are ineligible. asBatchAgeMonths throws
// on these, so we type-cast directly to verify the runtime gate inside
// isMetricEligible still rejects.
assert.equal(
  isMetricEligible(NaN as unknown as BatchAgeMonths, 'COLLECTION_AFTER_3_MONTH'),
  false,
);
assert.equal(
  isMetricEligible(-1 as unknown as BatchAgeMonths, 'COLLECTION_AFTER_3_MONTH'),
  false,
);

// Horizon lookup
assert.equal(metricHorizonMonths('COLLECTION_AFTER_3_MONTH'), 3);
assert.equal(metricHorizonMonths('UNKNOWN_METRIC'), 0);

console.log('metric-eligibility smoke OK');
