import assert from 'node:assert/strict';
import { assertSegmentsNonOverlapping } from './compute-kpis.ts';

// `process.env.NODE_ENV` is typed `readonly` under TS 5.x lib.dom defs.
// Cast through Record so the smoke can flip it without compromising the
// production assertion's semantics. Smoke is the only place this is needed.
const env = process.env as Record<string, string | undefined>;

// Non-overlapping: sum equals total → no throw, no log
assertSegmentsNonOverlapping([100, 200, 300], 600);

// Within tolerance (floating-point drift)
assertSegmentsNonOverlapping([100.001, 199.998, 300.001], 600);

// Violation in dev mode → throws
const prevEnv = env.NODE_ENV;
env.NODE_ENV = 'development';
assert.throws(() => assertSegmentsNonOverlapping([100, 200, 350], 600));
env.NODE_ENV = prevEnv;

// Violation in prod mode → logs, does not throw
env.NODE_ENV = 'production';
const origError = console.error;
let logged = false;
console.error = () => {
  logged = true;
};
try {
  assertSegmentsNonOverlapping([100, 200, 350], 600);
} finally {
  console.error = origError;
  env.NODE_ENV = prevEnv;
}
assert.equal(logged, true, 'prod-mode violation should console.error');

console.log('apples-and-oranges smoke OK');
