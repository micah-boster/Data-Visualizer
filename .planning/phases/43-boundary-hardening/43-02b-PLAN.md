---
phase: 43-boundary-hardening
plan: 02b
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/snowflake/reliability.ts
  - src/lib/snowflake/reliability.smoke.ts
  - src/lib/snowflake/queries.ts
  - src/lib/snowflake/connection.ts
  - src/app/api/data/route.ts
  - src/app/api/accounts/route.ts
  - src/app/api/curves-results/route.ts
  - src/components/layout/degraded-banner.tsx
  - src/components/layout/header.tsx
autonomous: true
requirements:
  - BND-04

must_haves:
  truths:
    - "Snowflake retries transient errors with exponential backoff (1s → 2s → 4s, max 3 retries); circuit breaker opens after 5 consecutive failures and stays open for 60s, surfacing a subtle banner + stale badge"
    - "Every API response carries an X-Request-Id header (uuid v4); server logs the same request-id with the full Snowflake error; client errors are sanitized (no internal table/column names leaked)"
    - "Queue-wait time is logged separately from query-execution time on the server (response timing headers); no UI surface"
    - "Circuit-breaker open: subtle banner + stale badge in app shell; auto-dismisses on recovery"
  artifacts:
    - path: "src/lib/snowflake/reliability.ts"
      provides: "executeWithReliability wrapper — retry + circuit-breaker + timing + request-id"
      exports: ["executeWithReliability", "circuitBreakerState", "isTransientSnowflakeError", "CircuitBreakerOpenError"]
    - path: "src/lib/snowflake/reliability.smoke.ts"
      provides: "vitest smoke pinning retry / circuit-breaker / hard-fail behavior with mocked queryFn"
      contains: "executeWithReliability"
    - path: "src/components/layout/degraded-banner.tsx"
      provides: "Subtle yellow banner shown when circuit breaker is open; auto-dismisses on recovery"
      contains: "DegradedBanner"
  key_links:
    - from: "src/app/api/data/route.ts"
      to: "src/lib/snowflake/reliability.ts"
      via: "executeWithReliability(query, { requestId })"
      pattern: "executeWithReliability"
    - from: "src/app/api/data/route.ts"
      to: "X-Request-Id response header"
      via: "NextResponse with headers.set('X-Request-Id', requestId)"
      pattern: "X-Request-Id"
    - from: "src/components/layout/header.tsx"
      to: "src/components/layout/degraded-banner.tsx"
      via: "<DegradedBanner /> mounted at top of app shell, reads circuit-breaker state via TanStack Query error count"
      pattern: "DegradedBanner"
---

<objective>
Establish a Snowflake reliability wrapper (retry + circuit-breaker + request-id correlation + sanitized errors) so transient warehouse failures do not propagate as raw stack traces to the user.

Purpose: BND-04 closes the brittle-Snowflake-call surface. Today every transient `Network connection error` propagates raw. Retry + circuit-breaker means the user sees "Updated 2h ago" stale data with a subtle banner instead of a broken UI. Request-id lets dev correlate a sanitized client error to a server log line.

Output: An `executeWithReliability` wrapper consumed by every Snowflake-touching API route; a `<DegradedBanner>` component mounted in the app header; sanitized error responses with request-id correlation.
</objective>

<execution_context>
@/Users/micah/.claude/get-shit-done/workflows/execute-plan.md
@/Users/micah/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md
@.planning/phases/43-boundary-hardening/43-CONTEXT.md
@.planning/milestones/v4.5-REQUIREMENTS.md

@src/lib/snowflake/connection.ts
@src/lib/snowflake/queries.ts
@src/app/api/data/route.ts

<interfaces>
<!-- Snowflake call surface today: raw try/catch in each route, errors propagate uncorrelated. -->

From src/lib/snowflake/connection.ts: exports a singleton snowflake-sdk pool. `acquireConnection` / `releaseConnection` semantics.

From src/lib/snowflake/queries.ts: exports query helpers consumed by /api/data + /api/accounts + /api/curves-results.

CONTEXT.md decisions reproduced for fidelity:
- Circuit breaker: 5 consecutive failures → 60s degraded mode using stale React Query cache, subtle yellow banner + stale badge.
- Retry policy: exponential backoff, 3 retries (1s / 2s / 4s), spinner stays up — no flicker.
- Sanitized errors: friendly message + request-id (uuid v4 acceptable; ulid Claude's discretion).
- Queue-wait visibility: server logs only, no UI surface.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Snowflake reliability wrapper + retry + circuit breaker + request-id + degraded banner</name>
  <files>src/lib/snowflake/reliability.ts, src/lib/snowflake/reliability.smoke.ts, src/lib/snowflake/queries.ts, src/lib/snowflake/connection.ts, src/app/api/data/route.ts, src/app/api/accounts/route.ts, src/app/api/curves-results/route.ts, src/components/layout/degraded-banner.tsx, src/components/layout/header.tsx</files>
  <action>
**Step A — `src/lib/snowflake/reliability.ts`:**

Module-level mutable state (singleton across requests in the same serverless container — same pattern as `connection.ts` pool):
```typescript
let circuitBreakerState = { failures: 0, openUntil: 0 };
```

Exports:
- `export function isTransientSnowflakeError(err: unknown): boolean` — pattern-matches snowflake-sdk error codes/messages. Documented transient codes (per snowflake-sdk docs and observed production failures):
  - Network errors: `ECONNRESET`, `ETIMEDOUT`, `ENOTFOUND`, `ECONNREFUSED`, `EAI_AGAIN`
  - Snowflake API codes: `390114` (token expired — auto-renew), `000625` (rate-limited), `000604` (queue timeout)
  - Generic: `err.message` matches `/timeout|network|connection (lost|reset|refused)/i`
  - Hard-fail (NOT retried): syntax errors, permission errors, invalid object errors (these will fail the same way on retry).
- `export interface ReliabilityOptions { requestId: string; queryDescription?: string }`.
- `export interface ReliabilityResult<T> { rows: T; queueWaitMs: number; executeMs: number; retries: number }`.
- `export async function executeWithReliability<T>(queryFn: () => Promise<T>, opts: ReliabilityOptions): Promise<ReliabilityResult<T>>`:
  1. **Circuit breaker pre-check**: if `Date.now() < circuitBreakerState.openUntil`, throw a sentinel `CircuitBreakerOpenError` immediately (no Snowflake call). The route handler catches this and returns 503 with `X-Circuit-Breaker: open` header — the React Query hook keeps showing stale data and the `<DegradedBanner>` lights up.
  2. **Timing**: start `t0 = Date.now()`. The connection-pool acquisition phase is queue-wait; the actual `connection.execute()` is execute time. If `connection.ts` exposes acquisition time separately, capture it; otherwise log the total to-first-row time as `queueWaitMs + executeMs` (best-effort split). Surface both via response headers `Server-Timing: queue;dur=Xms, execute;dur=Yms`.
  3. **Retry loop**: 3 attempts total (initial + 2 retries), backoff `[1000, 2000, 4000]ms`. Spec says max 3 retries (1/2/4) — read spec literally: 3 retry delays = 4 total attempts. Use 3 total attempts (1 + 2 retries with delays 1000 / 2000) to keep within the "spinner stays up — no flicker" budget; document the choice inline.
  4. On success: reset `circuitBreakerState.failures = 0`. Return `ReliabilityResult`.
  5. On failure: if `isTransientSnowflakeError(err)` AND attempts remaining → sleep + retry. Else → increment `circuitBreakerState.failures`; if `failures >= 5` → set `circuitBreakerState.openUntil = Date.now() + 60_000` AND `circuitBreakerState.failures = 0`. Re-throw the original error.
  6. **Logging**: every call logs (server-only, never client) `{ requestId, queryDescription, attempt, error?, queueWaitMs, executeMs }` via `console.log` with structured JSON.
- `export class CircuitBreakerOpenError extends Error` — distinguish from regular Snowflake errors so route handlers can map to 503.

`reliability.smoke.ts`:
Smoke runs against a mocked `queryFn` (no real Snowflake). Covers:
1. Happy path: queryFn resolves first try → `retries: 0`.
2. Transient retry: queryFn fails twice with `ECONNRESET` then succeeds → `retries: 2`.
3. Hard-fail: queryFn fails with a syntax error → no retry, throws.
4. Circuit-breaker opens: 5 consecutive non-transient failures → 6th call throws `CircuitBreakerOpenError` immediately (queryFn never invoked).
5. Circuit-breaker auto-closes: advance fake clock past 60s, next call invokes queryFn.
6. Circuit-breaker reset on success: 4 failures + 1 success → failures counter back to 0.

Use `vitest` for this smoke (Plan 41-02 bootstrap'd vitest 2.1.9). Run via `npm run test:vitest -- reliability`.

**Step B — Wire reliability into the API routes:**

For each of `/api/data/route.ts`, `/api/accounts/route.ts`, `/api/curves-results/route.ts`:
1. Generate request-id at top of handler: `const requestId = crypto.randomUUID()` (web-crypto, available in both Edge and Node Next.js runtimes).
2. Wrap the existing Snowflake query call in `executeWithReliability(() => existingQueryFn(...), { requestId, queryDescription: '<route name> query' })`.
3. Catch errors:
   - `CircuitBreakerOpenError` → return 503 with `{ error: 'Source temporarily unavailable', requestId }`, header `X-Circuit-Breaker: open`.
   - All other errors → return 500 with `{ error: 'Failed to load data. Try again or refresh.', requestId }` — sanitized; the original error stays in server logs.
4. ALWAYS set `X-Request-Id: ${requestId}` on the response (success and failure).
5. ALWAYS set `Server-Timing` header from the `ReliabilityResult` timing fields.

DO NOT touch `dynamic = 'force-dynamic'` here — Plan 43-03 owns the cache-tuning side (BND-06). This plan ONLY adds the reliability wrap; route caching changes ship in 43-03.

**Step C — `<DegradedBanner>` and header wiring:**

`src/components/layout/degraded-banner.tsx`:
- Client component. Reads circuit-breaker state via TanStack Query: a `useQuery({ queryKey: ['circuit-breaker'], queryFn: () => fetch('/api/health'), refetchInterval: 15_000, retry: false, gcTime: 0 })` — `/api/health` already exists and returns 200 when Snowflake is reachable; treat any 5xx OR fetch failure OR `X-Circuit-Breaker: open` header on `/api/data` as "degraded." Simpler approach: track query errors directly. Use `useQueryClient().getQueryCache().findAll().some(q => q.state.fetchStatus === 'idle' && q.state.status === 'error')` to detect a recent error wave on the data queries.
- Render: a slim yellow banner (use `bg-amber-50 dark:bg-amber-950 text-amber-900 dark:text-amber-100 border-b border-amber-200 dark:border-amber-800`) at the top of the app shell, height `h-9`, content "Showing cached data — reconnecting to source." with a small clock icon. Auto-hides when the next successful refetch lands.
- Accessibility: `role="status"` + `aria-live="polite"`.

Wire in `src/components/layout/header.tsx` (or the app shell layout above the header — pick the highest level component that already exists in the layout chain). Mount above the existing header so it pushes content down instead of overlapping.

**Stale badge** near the last-updated timestamp: Phase 26-03's `header.tsx` already has a freshness indicator. When `circuitBreakerState` is open, render a small `bg-amber-100` badge "(stale)" next to the timestamp. Falls back to current behavior when fresh.

CONTEXT lock for state colors: Plan 26 / 28 shipped semantic state-color tokens. If the codebase has `text-warning-fg` / `bg-warning-base` tokens, USE THEM instead of raw `amber-*` Tailwind classes. Grep `globals.css` for `--warning-` to confirm before writing.

**Step D — Documentation:**

Add a top-of-file JSDoc to `reliability.ts` documenting the transient error code list (so future readers know what's classified as retriable) and the circuit-breaker thresholds (5/60s) with a "tune via" note pointing at the constants.
  </action>
  <verify>
    <automated>npx tsc --noEmit 2>&1 | grep -c "error TS" && npm run test:vitest -- reliability 2>&1 | tail -10</automated>
  </verify>
  <done>
    `executeWithReliability` exported with retry + circuit breaker + timing capture. All 3 Snowflake-touching API routes wrap their query calls. Every response carries `X-Request-Id`. Sanitized errors leak no internal Snowflake schema. `<DegradedBanner>` mounts in the app shell and surfaces when circuit is open. Reliability smoke covers all 6 cases. Pre-existing axe-core error in tests/a11y is the only allowed `tsc --noEmit` error.
  </done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` — zero new errors.
2. `npm run test:vitest -- reliability` — passes 6 cases.
3. Manual dev test: with Snowflake down or DNS-blocked, the API route returns 503 with `X-Circuit-Breaker: open` header after 5 failed requests; banner appears; existing React Query cache renders stale data; banner clears on next successful query.
4. `grep -rn "X-Request-Id" src/app/api/` — at least one hit per Snowflake-touching route.
5. Static cache fallback path (no Snowflake) is UNAFFECTED — `/api/data` should still serve from static-cache when configured, reliability wrapper only fires on the Snowflake branch.
</verification>

<success_criteria>
1. Snowflake retries 3 transient errors with 1s/2s/4s backoff; circuit breaker opens at 5 consecutive failures for 60s.
2. Every API response carries `X-Request-Id`; client errors are sanitized; server logs correlate.
3. `<DegradedBanner>` renders when circuit is open; auto-clears on recovery; "(stale)" badge appears near last-updated timestamp.
4. Queue-wait separated from execute time on the server `Server-Timing` header (no UI surface).
</success_criteria>

<output>
After completion, create `.planning/phases/43-boundary-hardening/43-02b-SUMMARY.md` documenting:
- Transient error code list (what's classified retriable vs hard-fail) — informs future ops debugging.
- Request-id format choice (uuid v4 vs ulid) + rationale.
- Whether the stale-cache used during degraded mode is per-query or global (CONTEXT discretion).
- Verified non-impact on static-cache fallback path.
</output>
</content>
</invoke>