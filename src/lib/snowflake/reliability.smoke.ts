/**
 * Reliability wrapper smoke — pins retry, circuit-breaker, and hard-fail
 * behavior with a mocked `queryFn`. No real Snowflake connection. Phase 43
 * BND-04 Plan 02b owns these contracts.
 *
 * Run via: `npm run test:vitest -- reliability`
 *
 * Lives next to reliability.ts as a `*.smoke.ts` (the existing project
 * convention) — vitest.config.ts include pattern was widened in this plan
 * to pick up `src/lib/snowflake/*.smoke.ts` so it runs alongside the
 * existing *.test.ts suite.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  executeWithReliability,
  isTransientSnowflakeError,
  CircuitBreakerOpenError,
  circuitBreakerState,
  __resetReliabilityStateForTests,
} from './reliability';

const REQUEST_ID = '00000000-0000-4000-8000-000000000001';

beforeEach(() => {
  __resetReliabilityStateForTests();
  vi.useRealTimers();
});

describe('isTransientSnowflakeError', () => {
  it('classifies ECONNRESET as transient', () => {
    expect(isTransientSnowflakeError({ code: 'ECONNRESET' })).toBe(true);
  });

  it('classifies known Snowflake API codes as transient', () => {
    expect(isTransientSnowflakeError({ code: '390114' })).toBe(true);
    expect(isTransientSnowflakeError({ code: '000625' })).toBe(true);
    expect(isTransientSnowflakeError({ code: '000604' })).toBe(true);
  });

  it('classifies messages matching the network pattern as transient', () => {
    expect(isTransientSnowflakeError(new Error('Network connection lost'))).toBe(true);
    expect(isTransientSnowflakeError(new Error('Request timeout exceeded'))).toBe(true);
  });

  it('does NOT classify syntax errors as transient', () => {
    expect(
      isTransientSnowflakeError(new Error('SQL compilation error: syntax error line 1'))
    ).toBe(false);
  });
});

describe('executeWithReliability — happy path', () => {
  it('returns rows on first attempt with retries=0', async () => {
    const queryFn = vi.fn().mockResolvedValue([{ id: 1 }]);
    const result = await executeWithReliability(queryFn, { requestId: REQUEST_ID });

    expect(result.rows).toEqual([{ id: 1 }]);
    expect(result.retries).toBe(0);
    expect(queryFn).toHaveBeenCalledTimes(1);
    expect(circuitBreakerState.failures).toBe(0);
  });

  it('captures non-negative queueWaitMs and executeMs', async () => {
    const queryFn = vi.fn().mockResolvedValue([]);
    const result = await executeWithReliability(queryFn, { requestId: REQUEST_ID });

    expect(result.queueWaitMs).toBeGreaterThanOrEqual(0);
    expect(result.executeMs).toBeGreaterThanOrEqual(0);
  });
});

describe('executeWithReliability — transient retry', () => {
  it('retries on ECONNRESET twice then succeeds with retries=2', async () => {
    const transientErr = Object.assign(new Error('socket hang up'), {
      code: 'ECONNRESET',
    });
    const queryFn = vi
      .fn()
      .mockRejectedValueOnce(transientErr)
      .mockRejectedValueOnce(transientErr)
      .mockResolvedValueOnce([{ id: 42 }]);

    // Speed test up: stub setTimeout so backoff is instant. We cast through
    // unknown because vi.spyOn's typed signature for `setTimeout` is fussy
    // about the union-of-overloads signature; the runtime behaviour is the
    // simple "invoke the callback synchronously" stub.
    const originalSetTimeout = global.setTimeout;
    (global as unknown as { setTimeout: (cb: () => void) => number }).setTimeout = (
      cb: () => void
    ) => {
      cb();
      return 0;
    };

    try {
      const result = await executeWithReliability(queryFn, { requestId: REQUEST_ID });
      expect(result.rows).toEqual([{ id: 42 }]);
      expect(result.retries).toBe(2);
      expect(queryFn).toHaveBeenCalledTimes(3);
      // success resets failure counter
      expect(circuitBreakerState.failures).toBe(0);
    } finally {
      global.setTimeout = originalSetTimeout;
    }
  });
});

describe('executeWithReliability — hard-fail (no retry)', () => {
  it('throws immediately on syntax error and increments failure counter', async () => {
    const syntaxErr = new Error('SQL compilation error: syntax error line 1');
    const queryFn = vi.fn().mockRejectedValue(syntaxErr);

    await expect(
      executeWithReliability(queryFn, { requestId: REQUEST_ID })
    ).rejects.toThrow('SQL compilation error');

    expect(queryFn).toHaveBeenCalledTimes(1);
    expect(circuitBreakerState.failures).toBe(1);
  });
});

describe('executeWithReliability — circuit breaker', () => {
  it('opens after 5 consecutive non-transient failures and rejects 6th call without invoking queryFn', async () => {
    const syntaxErr = new Error('SQL compilation error: invalid identifier');
    const queryFn = vi.fn().mockRejectedValue(syntaxErr);

    // 5 failures trip the breaker.
    for (let i = 0; i < 5; i++) {
      await expect(
        executeWithReliability(queryFn, { requestId: REQUEST_ID })
      ).rejects.toThrow();
    }
    expect(queryFn).toHaveBeenCalledTimes(5);
    expect(circuitBreakerState.openUntil).toBeGreaterThan(Date.now());

    // 6th call: queryFn must NOT be invoked; we get the sentinel error.
    await expect(
      executeWithReliability(queryFn, { requestId: REQUEST_ID })
    ).rejects.toBeInstanceOf(CircuitBreakerOpenError);
    expect(queryFn).toHaveBeenCalledTimes(5);
  });

  it('auto-closes after the open duration elapses (advance fake clock)', async () => {
    const syntaxErr = new Error('permission denied');
    const queryFn = vi
      .fn<() => Promise<unknown[]>>()
      .mockRejectedValueOnce(syntaxErr)
      .mockRejectedValueOnce(syntaxErr)
      .mockRejectedValueOnce(syntaxErr)
      .mockRejectedValueOnce(syntaxErr)
      .mockRejectedValueOnce(syntaxErr)
      .mockResolvedValueOnce([{ id: 'after-recovery' }]);

    for (let i = 0; i < 5; i++) {
      await expect(
        executeWithReliability(queryFn, { requestId: REQUEST_ID })
      ).rejects.toThrow();
    }
    expect(circuitBreakerState.openUntil).toBeGreaterThan(Date.now());

    // Simulate clock advance past the open window by mutating openUntil
    // directly — equivalent to advancing fake timers but doesn't require
    // wrapping the whole test in vi.useFakeTimers (which would also intercept
    // our retry sleep in other suites).
    circuitBreakerState.openUntil = Date.now() - 1;

    const result = await executeWithReliability(queryFn, { requestId: REQUEST_ID });
    expect(result.rows).toEqual([{ id: 'after-recovery' }]);
    expect(circuitBreakerState.failures).toBe(0);
  });

  it('resets the failure counter on a single success between failures', async () => {
    const syntaxErr = new Error('SQL compilation error: invalid identifier');
    const queryFn = vi
      .fn<() => Promise<unknown[]>>()
      .mockRejectedValueOnce(syntaxErr)
      .mockRejectedValueOnce(syntaxErr)
      .mockRejectedValueOnce(syntaxErr)
      .mockRejectedValueOnce(syntaxErr)
      .mockResolvedValueOnce([{ id: 'recovered' }]);

    for (let i = 0; i < 4; i++) {
      await expect(
        executeWithReliability(queryFn, { requestId: REQUEST_ID })
      ).rejects.toThrow();
    }
    expect(circuitBreakerState.failures).toBe(4);

    // 5th call succeeds — counter resets to 0, breaker stays closed.
    const result = await executeWithReliability(queryFn, { requestId: REQUEST_ID });
    expect(result.rows).toEqual([{ id: 'recovered' }]);
    expect(circuitBreakerState.failures).toBe(0);
    expect(circuitBreakerState.openUntil).toBe(0);
  });
});
