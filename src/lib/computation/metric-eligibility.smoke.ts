import assert from 'node:assert/strict';
import {
  isMetricEligible,
  metricHorizonMonths,
} from './metric-eligibility.ts';

// Strict eligibility — batch age must reach metric horizon
assert.equal(isMetricEligible(4, 'COLLECTION_AFTER_12_MONTH'), false);
assert.equal(isMetricEligible(11.99, 'COLLECTION_AFTER_12_MONTH'), false);
assert.equal(isMetricEligible(12, 'COLLECTION_AFTER_12_MONTH'), true);
assert.equal(isMetricEligible(24, 'COLLECTION_AFTER_12_MONTH'), true);

// 6-month metric
assert.equal(isMetricEligible(5.99, 'COLLECTION_AFTER_6_MONTH'), false);
assert.equal(isMetricEligible(6, 'COLLECTION_AFTER_6_MONTH'), true);

// Always-evaluable metrics (horizon 0)
assert.equal(
  isMetricEligible(0, 'PENETRATION_RATE_POSSIBLE_AND_CONFIRMED'),
  true,
);
assert.equal(isMetricEligible(0.5, 'RECOVERY_RATE_X'), true);

// Defensive: NaN / negative ages are ineligible
assert.equal(isMetricEligible(NaN, 'COLLECTION_AFTER_3_MONTH'), false);
assert.equal(isMetricEligible(-1, 'COLLECTION_AFTER_3_MONTH'), false);

// Horizon lookup
assert.equal(metricHorizonMonths('COLLECTION_AFTER_3_MONTH'), 3);
assert.equal(metricHorizonMonths('UNKNOWN_METRIC'), 0);

console.log('metric-eligibility smoke OK');
