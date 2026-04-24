import assert from 'node:assert/strict';
import { selectCascadeTier } from './compute-kpis.ts';

// < 3 months — single "Rate since inception" card.
assert.deepEqual(selectCascadeTier(0), ['rateSinceInception']);
assert.deepEqual(selectCascadeTier(2.9), ['rateSinceInception']);

// 3 ≤ age < 6 — 3mo + since-inception.
assert.deepEqual(selectCascadeTier(3), ['rate3mo', 'rateSinceInception']);
assert.deepEqual(selectCascadeTier(5.9), ['rate3mo', 'rateSinceInception']);

// 6 ≤ age < 12 — 3mo + 6mo.
assert.deepEqual(selectCascadeTier(6), ['rate3mo', 'rate6mo']);
assert.deepEqual(selectCascadeTier(11.9), ['rate3mo', 'rate6mo']);

// ≥ 12 — 6mo + 12mo.
assert.deepEqual(selectCascadeTier(12), ['rate6mo', 'rate12mo']);
assert.deepEqual(selectCascadeTier(48), ['rate6mo', 'rate12mo']);

console.log('cascade smoke OK');
