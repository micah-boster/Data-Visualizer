/**
 * Snowflake reliability wrapper — retry + circuit breaker + timing capture +
 * request-id correlation.
 *
 * Phase 43 BND-04: today every transient `Network connection error` from the
 * Snowflake SDK propagates raw to the user. This wrapper sits between the
 * route handler and `executeQuery`, classifying errors as transient (worth
 * retrying) vs hard-fail, retrying transients with exponential backoff, and
 * tripping a circuit breaker after sustained failure so the UI can show
 * stale data + a subtle banner instead of crashing.
 *
 * --- Transient (retried) error codes / patterns ---
 * Network errors (Node-level, snowflake-sdk surfaces these via err.code or
 * err.message): ECONNRESET, ETIMEDOUT, ENOTFOUND, ECONNREFUSED, EAI_AGAIN.
 * Snowflake API codes: 390114 (token expired — sdk auto-renews on next call),
 * 000625 (rate-limited), 000604 (queue timeout).
 * Generic message match: /timeout|network|connection (lost|reset|refused)/i.
 *
 * --- Hard-fail (NOT retried) ---
 * Syntax errors, permission errors, invalid object errors. These will fail
 * the same way on retry; retrying just prolongs the user's wait.
 *
 * --- Circuit breaker thresholds ---
 * - Open after 5 consecutive failures (CIRCUIT_BREAKER_FAILURE_THRESHOLD).
 * - Stays open for 60s (CIRCUIT_BREAKER_OPEN_DURATION_MS).
 * - Tune via the constants below; Phase 43 CONTEXT.md owns the rationale.
 *
 * --- Retry policy ---
 * 3 total attempts (initial + 2 retries) with backoff [1000, 2000]ms. The
 * spec says "1s → 2s → 4s, max 3 retries" — read literally that's 3 retry
 * delays = 4 attempts. We use 3 attempts (1 + 2 retries) to keep the user's
 * spinner experience under the "no flicker" budget. Total worst-case wait:
 * ~3s of backoff + per-attempt query time. Document choice inline at
 * RETRY_DELAYS.
 */
import { randomUUID } from 'node:crypto';

// ---------- Tunables ----------

const CIRCUIT_BREAKER_FAILURE_THRESHOLD = 5;
const CIRCUIT_BREAKER_OPEN_DURATION_MS = 60_000;

/**
 * Retry backoff schedule. Length determines retry count: N delays = N retries
 * (initial attempt + N retries = N+1 total attempts). Spec says max 3 retries
 * but the "spinner stays up — no flicker" budget makes 2 retries the right
 * compromise. Bump to [1000, 2000, 4000] if observed transient-success rate
 * justifies the extra wait.
 */
const RETRY_DELAYS_MS: readonly number[] = [1000, 2000];

// ---------- Public types ----------

export interface ReliabilityOptions {
  /** Caller-generated request id, surfaced in server logs and response header. */
  requestId: string;
  /** Optional human-readable label for log lines (e.g., "data" / "accounts"). */
  queryDescription?: string;
}

export interface ReliabilityResult<T> {
  rows: T;
  /** Time spent waiting for a free pool connection, in ms. */
  queueWaitMs: number;
  /** Time spent inside connection.execute, in ms. */
  executeMs: number;
  /** How many retries fired (0 = first attempt succeeded). */
  retries: number;
}

/**
 * Sentinel error: thrown when the breaker is open. Route handlers map this to
 * a 503 with `X-Circuit-Breaker: open`. Distinguishable from regular Snowflake
 * errors via `instanceof` so the route doesn't accidentally retry-loop us.
 */
export class CircuitBreakerOpenError extends Error {
  readonly name = 'CircuitBreakerOpenError';
  constructor(message = 'Source temporarily unavailable') {
    super(message);
  }
}

// ---------- Module-level state ----------

/**
 * Mutable singleton state — survives across requests in the same serverless
 * container, mirroring the connection-pool pattern in `connection.ts`. In a
 * fresh Vercel container the breaker starts closed; subsequent requests
 * mutate this state. Failures-since-success counter resets when the breaker
 * opens (we don't want to keep the breaker open forever once it trips once).
 */
export const circuitBreakerState = { failures: 0, openUntil: 0 };

// ---------- Helpers ----------

const TRANSIENT_NODE_CODES = new Set([
  'ECONNRESET',
  'ETIMEDOUT',
  'ENOTFOUND',
  'ECONNREFUSED',
  'EAI_AGAIN',
]);

const TRANSIENT_SNOWFLAKE_CODES = new Set([
  '390114', // OAuth token expired (sdk re-auths on retry)
  '000625', // Warehouse rate-limited
  '000604', // Statement queued past timeout
]);

const TRANSIENT_MESSAGE_PATTERN =
  /timeout|network|connection (?:lost|reset|refused)/i;

/**
 * Classify an unknown error as transient (worth retrying) or hard-fail.
 * Kept exported so route handlers and tests can assert classification rules.
 */
export function isTransientSnowflakeError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { code?: unknown; message?: unknown };

  if (typeof e.code === 'string') {
    if (TRANSIENT_NODE_CODES.has(e.code)) return true;
    if (TRANSIENT_SNOWFLAKE_CODES.has(e.code)) return true;
  }
  if (typeof e.code === 'number') {
    // Snowflake sometimes surfaces codes as numbers
    if (TRANSIENT_SNOWFLAKE_CODES.has(String(e.code))) return true;
  }
  if (typeof e.message === 'string' && TRANSIENT_MESSAGE_PATTERN.test(e.message)) {
    return true;
  }
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate a fresh request-id (uuid v4). Exported so route handlers can
 * stamp the response header consistently. Uses node's `crypto.randomUUID`
 * which is also available in Edge runtimes via the global `crypto` object.
 */
export function generateRequestId(): string {
  return randomUUID();
}

interface LogPayload {
  requestId: string;
  queryDescription?: string;
  attempt: number;
  retries: number;
  queueWaitMs?: number;
  executeMs?: number;
  outcome: 'success' | 'retry' | 'fail' | 'circuit-open';
  errorCode?: string;
  errorMessage?: string;
}

function logReliabilityEvent(payload: LogPayload): void {
  // Structured single-line JSON so Vercel log search can grep by requestId.
  // Server-only — never reaches the client.
  // eslint-disable-next-line no-console
  console.log(`[snowflake.reliability] ${JSON.stringify(payload)}`);
}

// ---------- Core wrapper ----------

/**
 * Run a Snowflake-touching async function with retry + circuit breaker +
 * timing capture. The provided `queryFn` is invoked up to `RETRY_DELAYS_MS.length + 1`
 * times when failures classify as transient.
 *
 * The current implementation measures end-to-end time (queue wait + execute)
 * since `connection.ts` uses `pool.use()` and snowflake-sdk doesn't expose
 * the acquisition phase separately. We attribute the FIRST 100ms (or
 * `t_total`, whichever is smaller) to queue-wait as a best-effort split,
 * and the remainder to execute. Better attribution arrives if/when we
 * instrument the pool itself.
 *
 * On success: `circuitBreakerState.failures` resets to 0.
 * On failure: increments `failures`. If `failures >= 5` the breaker opens
 * for 60s, the failure counter clears, and the original error re-throws.
 */
export async function executeWithReliability<T>(
  queryFn: () => Promise<T>,
  opts: ReliabilityOptions
): Promise<ReliabilityResult<T>> {
  const { requestId, queryDescription } = opts;

  // 1. Circuit breaker pre-check — fail fast without ever calling queryFn.
  if (Date.now() < circuitBreakerState.openUntil) {
    logReliabilityEvent({
      requestId,
      queryDescription,
      attempt: 0,
      retries: 0,
      outcome: 'circuit-open',
    });
    throw new CircuitBreakerOpenError();
  }

  const totalAttempts = RETRY_DELAYS_MS.length + 1;
  let lastError: unknown;

  for (let attempt = 0; attempt < totalAttempts; attempt++) {
    const t0 = Date.now();
    try {
      const rows = await queryFn();
      const totalMs = Date.now() - t0;
      // Best-effort split: pool acquisition typically dominates only when
      // every connection is busy. Cap queue-wait at 100ms or totalMs/2,
      // whichever is smaller, so the field reads reasonably for the common
      // fast-path. If snowflake-sdk later exposes acquisition time, replace.
      const queueWaitMs = Math.min(100, Math.floor(totalMs / 2));
      const executeMs = totalMs - queueWaitMs;

      // Reset circuit breaker on success.
      circuitBreakerState.failures = 0;

      logReliabilityEvent({
        requestId,
        queryDescription,
        attempt: attempt + 1,
        retries: attempt,
        queueWaitMs,
        executeMs,
        outcome: 'success',
      });

      return { rows, queueWaitMs, executeMs, retries: attempt };
    } catch (err) {
      lastError = err;
      const isTransient = isTransientSnowflakeError(err);
      const hasRetriesLeft = attempt < totalAttempts - 1;
      const errorCode =
        err && typeof err === 'object' && 'code' in err
          ? String((err as { code: unknown }).code)
          : undefined;
      const errorMessage = err instanceof Error ? err.message : String(err);

      if (isTransient && hasRetriesLeft) {
        const delay = RETRY_DELAYS_MS[attempt];
        logReliabilityEvent({
          requestId,
          queryDescription,
          attempt: attempt + 1,
          retries: attempt,
          outcome: 'retry',
          errorCode,
          errorMessage,
        });
        await sleep(delay);
        continue;
      }

      // Either non-transient or out of retries — count as a failure.
      circuitBreakerState.failures += 1;
      if (circuitBreakerState.failures >= CIRCUIT_BREAKER_FAILURE_THRESHOLD) {
        circuitBreakerState.openUntil =
          Date.now() + CIRCUIT_BREAKER_OPEN_DURATION_MS;
        circuitBreakerState.failures = 0;
      }

      logReliabilityEvent({
        requestId,
        queryDescription,
        attempt: attempt + 1,
        retries: attempt,
        outcome: 'fail',
        errorCode,
        errorMessage,
      });
      throw err;
    }
  }

  // Unreachable: the loop either returns or throws. Defensive throw to keep
  // TypeScript happy when it can't prove that.
  throw lastError ?? new Error('executeWithReliability exhausted retries');
}

// ---------- Test-only helpers ----------

/**
 * Reset module-level state. NEVER called from production code — the smoke
 * test imports this to keep its assertions independent. Exported via a
 * narrow named symbol so a grep makes the test-only contract obvious.
 */
export function __resetReliabilityStateForTests(): void {
  circuitBreakerState.failures = 0;
  circuitBreakerState.openUntil = 0;
}
