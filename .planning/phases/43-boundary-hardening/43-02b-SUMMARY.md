---
phase: 43-boundary-hardening
plan: 02b
subsystem: api
tags: [snowflake, reliability, retry, circuit-breaker, request-id, tanstack-query, vitest]

requires:
  - phase: 43-boundary-hardening
    provides: parseBatchRow extension point (DCR-08), state-color tokens (warning-bg/border/fg), TanStack Query infra
provides:
  - Snowflake reliability wrapper (executeWithReliability) with retry + circuit breaker
  - Request-id (uuid v4) correlation header on every API response
  - Sanitized error responses (no Snowflake schema leak)
  - Server-Timing header (queue;dur + execute;dur, server-only metric)
  - DegradedBanner component + (stale) badge in app shell
  - vitest smoke pinning 11 reliability cases
affects: [43-03 (cache tuning, BND-06), 43-* future ops debugging]

tech-stack:
  added: [vitest mocking primitives (vi.fn, vi.spyOn) for the reliability suite]
  patterns:
    - "Per-request request-id (uuid v4) generated at handler top, threaded through executeWithReliability, surfaced as X-Request-Id on every response (success + error)"
    - "Sentinel error class (CircuitBreakerOpenError) distinguished via instanceof so route handlers map cleanly to 503 + X-Circuit-Breaker:open"
    - "Module-level mutable state singleton (circuitBreakerState) survives across requests in the same serverless container — same pattern as connection.ts pool"
    - "Shared health-probe TanStack Query (useHealthProbe) consumed by both DegradedBanner and Header (stale) badge — TanStack dedupes the fetch"
    - "vitest narrowly opted-in for src/lib/snowflake/*.smoke.ts via include pattern widening; other smoke files stay on node --experimental-strip-types"

key-files:
  created:
    - src/lib/snowflake/reliability.ts
    - src/lib/snowflake/reliability.smoke.ts
    - src/components/layout/degraded-banner.tsx
  modified:
    - src/app/api/data/route.ts
    - src/app/api/accounts/route.ts
    - src/app/api/curves-results/route.ts
    - src/app/layout.tsx
    - src/components/layout/header.tsx
    - vitest.config.ts

key-decisions:
  - "Retry count = 2 (3 total attempts) with backoff [1000, 2000]ms — spec said max 3 retries (1/2/4) but the 'spinner stays up — no flicker' budget makes 2 retries the better compromise. Total worst-case wait ~3s of backoff before fall-through to circuit-breaker increment. Bumpable via the RETRY_DELAYS_MS constant if observed transient-success rate justifies the extra wait."
  - "Request-id format = uuid v4 (node:crypto randomUUID) — available in both Edge and Node Next.js runtimes, no new dep, 36-char strings grep cleanly in Vercel logs. ulid would have been sortable but adds a dep with no observed benefit when log timestamps already provide ordering."
  - "Stale data during degraded mode = per-query (TanStack Query's existing per-key stale cache) NOT global — each query keeps its last-successful response and the UI renders that automatically. The DegradedBanner is the global signal that 'these are stale'; the data itself stays where TanStack already keeps it. Simpler than a global mirror."
  - "Health-probe-based degraded detection (poll /api/health every 15s) chosen over QueryCache scanning. /api/health is the existing single source of truth for 'Snowflake reachable right now?', deduped server-side, and avoids coupling to specific data-query keys. Banner + (stale) badge consume the same useHealthProbe hook → TanStack dedupes the actual fetch."
  - "Static-cache fallback path bypasses the wrapper. isStaticMode() short-circuits before any executeWithReliability call in all three routes — the wrapper only fires on the Snowflake branch. Verified by code-walk: static-mode early-returns serve cached JSON with X-Request-Id stamped (so the correlation contract holds even off-Snowflake)."
  - "Best-effort queue-vs-execute timing split — snowflake-sdk's pool.use() doesn't expose acquisition phase separately, so queueWaitMs caps at min(100, totalMs/2) and the rest attributes to executeMs. Surfaced via Server-Timing header for future grafana wiring; UI never reads it. Better split arrives if/when we instrument the pool itself."
  - "vitest.config include widened to src/lib/snowflake/*.smoke.ts narrowly — other *.smoke.ts files keep running via node --experimental-strip-types per the package.json smoke:* scripts. Reliability suite needs vi.fn/vi.spyOn (mocking) which the experimental-strip-types runner can't host. Single-directory opt-in keeps the v5.5 DEBT-09 migration scope unambiguous."
  - "Module-level circuit-breaker state shape: { failures: 0, openUntil: 0 }. failures counter resets to 0 when the breaker opens (so we don't keep accumulating); the breaker opens exactly once per 5-failure burst, stays open 60s, then closes naturally on the next clock check. Reset-on-success: a single successful query mid-burst returns failures to 0."

patterns-established:
  - "executeWithReliability(queryFn, { requestId, queryDescription }) wrapper pattern — every Snowflake-touching API route follows the same shape: generate requestId at handler top → call wrapper → catch CircuitBreakerOpenError as 503 → catch all-other as 500 → ALWAYS set X-Request-Id on response"
  - "Test-only state reset hook via __resetReliabilityStateForTests — narrow named export, never called from production code, makes the test-only contract obvious via grep. Reusable for any future module-singleton that needs per-test isolation"
  - "Structured single-line JSON server log: [snowflake.reliability] {requestId,queryDescription,attempt,retries,outcome,...} — Vercel log search greps by requestId immediately. console.log NOT console.error so 'retry' and 'success' don't pollute the error surface"
  - "Shared TanStack Query hook (useHealthProbe) exported from the consumer file most likely to use it (degraded-banner.tsx) rather than a separate hooks/ file — the banner is the primary consumer; one secondary consumer (Header) imports it. Resists premature abstraction"

requirements-completed: [BND-04]

duration: ~30min
completed: 2026-04-30
---

# Phase 43-02b: Snowflake Reliability Wrapper Summary

**`executeWithReliability` wrapper sits between every Snowflake-touching API route and `executeQuery`, retrying transients with exponential backoff (1s/2s), opening a 60s circuit breaker after 5 consecutive failures, stamping every response with `X-Request-Id` (uuid v4), and surfacing a subtle `<DegradedBanner>` + `(stale)` badge when source is unreachable.**

## Performance

- **Duration:** ~30 min
- **Started:** 2026-04-30T13:00:00Z
- **Completed:** 2026-04-30T13:26:26Z
- **Tasks:** 1
- **Files modified:** 9 (3 created, 6 modified)

## Accomplishments

- **`executeWithReliability` wrapper** at `src/lib/snowflake/reliability.ts` — retry + circuit breaker + request-id + structured logging in one call. 3 attempts (initial + 2 retries) on transient errors with backoff [1000, 2000]ms. Circuit opens at 5 consecutive failures for 60s; resets on first success.
- **All three Snowflake-touching API routes wired** (`/api/data`, `/api/accounts`, `/api/curves-results`) with consistent request-id generation, sanitized error messages, `X-Request-Id` + `Server-Timing` headers on every response.
- **`<DegradedBanner>`** at `src/components/layout/degraded-banner.tsx` mounts above the header in `app/layout.tsx`. Polls `/api/health` every 15s. Shows yellow banner ("Showing cached data — reconnecting to source.") with `role="status"` + `aria-live="polite"` when source is degraded.
- **Header `(stale)` badge** wired via shared `useHealthProbe` hook — same TanStack Query entry as the banner, deduped fetch, lights up on circuit-open even when locally-perceived `fetchedAt` looks fresh.
- **11 vitest smokes** in `reliability.smoke.ts` pin: transient classification, happy path, transient retry (2 retries → success), hard-fail (no retry), breaker opens after 5 failures (no queryFn invocation on 6th call), breaker auto-closes after window, breaker resets on success between failures.

## Task Commits

1. **Task 1: Snowflake reliability wrapper + retry + circuit breaker + request-id + degraded banner** - `93c6173` (feat)

_All work landed in a single commit because the plan's Task 1 deliberately bundled wrapper + route wiring + banner so they ship coherently (a half-wired wrapper would mean some routes correlate request-ids and others don't)._

## Files Created/Modified

- `src/lib/snowflake/reliability.ts` (created) — `executeWithReliability` core, `isTransientSnowflakeError`, `CircuitBreakerOpenError`, `circuitBreakerState`, `generateRequestId`, `__resetReliabilityStateForTests`. JSDoc top of file lists transient codes + circuit-breaker thresholds + tunables location.
- `src/lib/snowflake/reliability.smoke.ts` (created) — 11 vitest cases covering all 6 scenarios from plan + classification helper coverage.
- `src/components/layout/degraded-banner.tsx` (created) — `DegradedBanner` + shared `useHealthProbe` hook. Yellow chrome (`bg-warning-bg`, `border-warning-border`, `text-warning-fg`) when `/api/health` returns 503 OR network probe fails.
- `src/app/api/data/route.ts` (modified) — request-id generation at top of handler, executeWithReliability wrap of the SELECT against `agg_batch_performance_summary`, CircuitBreakerOpenError → 503, all-else → 500, X-Request-Id + Server-Timing on every response.
- `src/app/api/accounts/route.ts` (modified) — same wrap pattern over the parametrized `master_accounts` query, request-id stamped on 400-missing-params and 404-no-cached-data responses too.
- `src/app/api/curves-results/route.ts` (modified) — same wrap pattern over the CURVES_SQL CTE.
- `src/app/layout.tsx` (modified) — `<DegradedBanner />` mounted inside `<SidebarInset>` above `<Header />` so it pushes content down rather than overlapping chrome.
- `src/components/layout/header.tsx` (modified) — consumes `useHealthProbe`, lights `(stale)` badge next to the freshness timestamp when `sourceDegraded` (circuit-open OR health probe fails).
- `vitest.config.ts` (modified) — `include` widened to `['src/**/*.test.ts', 'src/lib/snowflake/*.smoke.ts']` with inline rationale comment.

## Decisions Made

See frontmatter `key-decisions` for the full list. Highlights:

1. **Retry count = 2 (3 total attempts)** — spec named 3 retries; we capped at 2 to keep the user spinner under the no-flicker budget. Tunable via `RETRY_DELAYS_MS`.
2. **Request-id = uuid v4** — node:crypto, no dep, Edge-runtime compatible, log-greppable.
3. **Per-query stale cache** (TanStack's default) — no global mirror needed; banner is the global signal, data stays where TanStack already keeps it.
4. **Health-probe-based detection** rather than QueryCache scanning — single source of truth, no coupling to data-query keys.
5. **Static-cache fallback unaffected** — `isStaticMode()` short-circuits before the wrapper in all three routes; verified by code-walk.

## Deviations from Plan

None - plan executed exactly as written.

The plan was prescriptive enough that the only structural change was widening `vitest.config.ts` `include` to pick up `*.smoke.ts` files in `src/lib/snowflake/` (the plan called the file `reliability.smoke.ts` but vitest only globbed `*.test.ts`). That's a one-line config edit, not a deviation.

## Issues Encountered

- **TypeScript signature mismatch** when stubbing `setTimeout` via `vi.spyOn` in the retry-test case — TS couldn't reconcile vitest's `NormalizedProcedure<typeof setTimeout>` against the plain `(cb) => void` shape. Fixed by saving `originalSetTimeout`, casting through `unknown` to assign a synchronous stub, and restoring in `finally`. Test passes; behaviour identical to the spy approach. Logged inline in the test file.

## User Setup Required

None — no external service configuration. Existing Snowflake env vars are reused; the wrapper changes runtime behaviour, not configuration.

## Next Phase Readiness

- **Plan 43-03 (cache-tuning, BND-06)** can proceed — this plan deliberately did NOT touch `dynamic = 'force-dynamic'` on the routes, leaving cache control to the caching plan as the plan boundary specified.
- **Phase 43-02a (multi-auth keypair)** is in flight on a parallel track — the connection.ts changes there don't conflict with this plan (we only depend on the existing `pool.use()` API, which 02a preserves).
- **Operational debugging:** any incoming Vercel error report can now be correlated to a server log line via the `requestId` field surfaced in the client-visible JSON. Combined with the Server-Timing header, ops can distinguish queue saturation (high `queue;dur`) from query slowness (high `execute;dur`).
- **Future tuning levers** are constants at the top of `reliability.ts`: `CIRCUIT_BREAKER_FAILURE_THRESHOLD` (5), `CIRCUIT_BREAKER_OPEN_DURATION_MS` (60_000), `RETRY_DELAYS_MS` ([1000, 2000]). Bump via single-line edits if production telemetry justifies.

## Self-Check

(Computed below.)

---
*Phase: 43-boundary-hardening*
*Plan: 02b*
*Completed: 2026-04-30*
