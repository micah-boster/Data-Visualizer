import assert from 'node:assert/strict';
import { computeSuppression } from './compute-trending.ts';

const batch = (age: number) => ({ ageInMonths: age });

// Scenario 1: 4 batches all at age 12mo.
// Sorted descending: [12, 12, 12, 12]; latest = last (12), prior = first 3.
// Prior count at every horizon (3/6/12) = 3 ⇒ NOT suppressed.
const s1 = computeSuppression([batch(12), batch(12), batch(12), batch(12)]);
assert.equal(s1.rate3mo, false, 's1: 3 prior reached 3mo');
assert.equal(s1.rate6mo, false, 's1: 3 prior reached 6mo');
assert.equal(s1.rate12mo, false, 's1: 3 prior reached 12mo');
assert.equal(s1.rateSinceInception, false, 's1: has prior');

// Scenario 2: 4 batches with ages 2, 4, 5, 7 — latest = youngest (2mo).
// Sorted desc: [7, 5, 4, 2]; prior = [7, 5, 4] (drop trailing 2).
// 3mo horizon: all 3 prior reached (7/5/4 each ≥ 3) ⇒ NOT suppressed.
// 6mo horizon: only 7 reached ⇒ 1 < 3 ⇒ suppressed.
// 12mo horizon: 0 reached ⇒ suppressed.
// sinceInception: has prior ⇒ NOT suppressed.
const s2 = computeSuppression([batch(2), batch(4), batch(5), batch(7)]);
assert.equal(s2.rate3mo, false, 's2: 3 prior reached 3mo');
assert.equal(s2.rate6mo, true, 's2: only 1 prior reached 6mo');
assert.equal(s2.rate12mo, true, 's2: 0 prior reached 12mo');
assert.equal(s2.rateSinceInception, false, 's2: has prior');

// Scenario 3: 1 batch total → no prior batches.
// Every horizon suppressed; rateSinceInception also suppressed.
const s3 = computeSuppression([batch(15)]);
assert.equal(s3.rate3mo, true);
assert.equal(s3.rate6mo, true);
assert.equal(s3.rate12mo, true);
assert.equal(s3.rateSinceInception, true, 's3: no priors');

// Scenario 4: 0 batches → still returns structure; every horizon suppressed.
const s4 = computeSuppression([]);
assert.equal(s4.rate3mo, true);
assert.equal(s4.rate6mo, true);
assert.equal(s4.rate12mo, true);
assert.equal(s4.rateSinceInception, true);

// Scenario 5: 5 batches at age 8mo — latest = one of the 8mo; prior = 4 × 8mo.
// 3mo: 4 reached ≥ 3 ⇒ not suppressed.
// 6mo: 4 reached ≥ 3 ⇒ not suppressed.
// 12mo: 0 reached ⇒ suppressed.
const s5 = computeSuppression([
  batch(8),
  batch(8),
  batch(8),
  batch(8),
  batch(8),
]);
assert.equal(s5.rate3mo, false);
assert.equal(s5.rate6mo, false);
assert.equal(s5.rate12mo, true, 's5: no batches at 12mo yet');
assert.equal(s5.rateSinceInception, false);

// Scenario 6 (boundary): exactly 3 prior batches at horizon.
// Ages: [12, 12, 12, 1] — sorted desc [12,12,12,1]; prior [12,12,12].
// 12mo: exactly 3 reached ⇒ 3 < 3 is false ⇒ NOT suppressed.
const s6 = computeSuppression([batch(1), batch(12), batch(12), batch(12)]);
assert.equal(s6.rate12mo, false, 's6: exactly 3 prior reached 12mo (boundary)');

console.log('suppression smoke OK');
