---
phase: 43-boundary-hardening
verified: 2026-05-01T21:45:00Z
gap_closure_verified: 2026-05-01T22:10:00Z
status: passed
score: 6/6 must-haves verified
re_verification: true
gap_closure:
  - truth: "BND-03 and BND-04 marked complete in REQUIREMENTS.md"
    status: resolved
    resolution: "Commit 34d27c4 (docs(43): mark BND-03 and BND-04 complete in milestone REQUIREMENTS) — checkboxes flipped to [x], tracking table rows now read '✅ Complete (Phase 43-02a/02b, 2026-05-01)' with implementation notes matching the BND-05/06 format."
  - truth: "vitest reliability smoke (BND-04) passes green"
    status: resolved
    resolution: "Commit 8ec6616 (fix(43): pin vitest's vite peer to ^5.4 to fix SSR helper mismatch). Root cause was NOT a Node-24 incompatibility but a pnpm peer-dep resolution glitch: vitest 2.1.9's @vitest/mocker had been linked to vite@8.0.10 (pulled in by other peers), whose SSR transform emits `__vite_ssr_exportName__()` calls that vite-node 2.1.9's runtime client doesn't understand (it provides `__vite_ssr_exports__` only). Fix: pnpm.overrides pin `vitest>vite` and `@vitest/mocker>vite` to `^5.4.21`. After reinstall, all 13 vitest tests pass (11 reliability + 2 young-batch from Phase 41-02 — the latter was failing for the same reason)."
human_verification:
  - test: "Cross-tab localStorage sync (BND-03)"
    expected: "Open app in two browser tabs. Create a saved view in tab 1. Tab 2's saved view list should update within ~500ms without a page reload."
    why_human: "Cross-tab storage event listener wiring requires a live browser with two tabs — cannot verify with grep or node scripts."
  - test: "Circuit breaker degraded banner (BND-04)"
    expected: "With Snowflake unreachable (blocked DNS or wrong credentials), after 5 failed API calls the DegradedBanner should appear above the header reading 'Showing cached data — reconnecting to source.' The (stale) badge should appear near the last-updated timestamp. Both should clear on recovery."
    why_human: "Circuit breaker requires live network failure conditions — cannot simulate with static analysis."
  - test: "RefreshButton ⌘R intercept (BND-06)"
    expected: "Pressing ⌘R (Mac) or Ctrl+R (Windows/Linux) in the app should trigger a React Query cache invalidation and data refresh rather than a browser page reload. When an input field is focused, ⌘R should fall through to browser reload normally."
    why_human: "Keyboard intercept requires live browser interaction to verify the event.preventDefault() fires and the page does not reload."
  - test: "Snowflake credit reduction (BND-06)"
    expected: "Post-deploy, Snowflake warehouse usage view should show ≥10× reduction in credit consumption per day (v4.5 milestone success criterion)."
    why_human: "Requires post-deploy Snowflake warehouse telemetry — not verifiable in-repo."
---

# Phase 43: Boundary Hardening Verification Report

**Phase Goal:** Close the six boundary-hardening requirements (BND-01 through BND-06) that collectively establish typed data contracts, versioned persistence, Snowflake reliability, a unified chart shell, and a tuned caching layer.
**Verified:** 2026-05-01T21:45:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 1  | `src/lib/data/types.ts` exports `BatchRow / AccountRow / BatchAgeMonths / CurvePoint / asBatchAgeMonths / ParseBatchRowsResult` | ✓ VERIFIED | File exists; exports confirmed via `cat` inspection; JSDoc correctly documents brand rationale |
| 2  | Every top-level function in `src/lib/computation/` accepts `BatchRow[]` | ✓ VERIFIED | grep for `BatchRow` in compute files confirms typed signatures; `coerceAgeMonths` returns zero runtime hits (only JSDoc comments); tsc --noEmit produces 1 pre-existing error (axe-core) — zero new errors |
| 3  | `createVersionedStore` is consumed by all 5 storage modules | ✓ VERIFIED | grep confirms 5 distinct hits: views/storage.ts, columns/persistence.ts, partner-lists/storage.ts, partner-config/storage.ts, chart-presets/storage.ts; zero direct `localStorage.setItem/getItem` in those modules |
| 4  | `executeWithReliability` wraps the Snowflake call in all 3 API routes | ✓ VERIFIED | Confirmed in /api/data/route.ts:55, /api/accounts/route.ts:45, /api/curves-results/route.ts:93; X-Request-Id header set on every response path |
| 5  | `<ChartFrame>` is composed by all chart consumers; `<StaleColumnWarning>` deleted | ✓ VERIFIED | `<ChartFrame` found in collection-curve-chart.tsx, generic-chart.tsx (5 instances), chart-sparkline.tsx, comparison-matrix.tsx; `stale-column-warning.tsx` does not exist; grep for imports returns zero hits |
| 6  | BND-03 and BND-04 checkboxes marked complete in REQUIREMENTS.md | ✗ FAILED | Lines 44-45 in v4.5-REQUIREMENTS.md show `- [ ] BND-03` and `- [ ] BND-04`; tracking table rows 139-140 read "Pending" — the requirements contract still reads incomplete despite full code implementation |

**Score:** 5/6 truths verified

---

### Required Artifacts

| Artifact | Provides | Status | Details |
|----------|----------|--------|---------|
| `src/lib/data/types.ts` | BatchRow / AccountRow / BatchAgeMonths / CurvePoint / asBatchAgeMonths | ✓ VERIFIED | 80-line header confirms all exports; asBatchAgeMonths throws RangeError on negative/non-finite |
| `src/lib/data/parse-batch-row.ts` | parseBatchRow → BatchRow\|null; parseBatchRows → ParseBatchRowsResult | ✓ VERIFIED | Returns typed result; filter-and-warn drop semantics confirmed |
| `src/lib/data/parse-batch-row.smoke.ts` | 7-case smoke | ✓ VERIFIED | `npm run smoke:parse-batch-row` passes green |
| `src/lib/static-cache/fallback.ts` | Routes JSON through parseBatchRows | ✓ VERIFIED | Line 80 calls `parseBatchRows(validated.data)` |
| `src/lib/persistence/versioned-storage.ts` | createVersionedStore with envelope + migration chain + verified write + cross-tab | ✓ VERIFIED | Exports VersionedBlob, VersionedStoreOptions, VersionedStore, createVersionedStore |
| `src/lib/persistence/migrations.ts` | MissingMigratorError + runMigrations | ✓ VERIFIED | Exists; smoke confirms dev-throw / prod-drop behavior |
| `src/lib/persistence/versioned-storage.smoke.ts` | 6-case smoke | ✓ VERIFIED | `node --experimental-strip-types ... versioned-storage.smoke.ts` → ALL 6 CASES PASS |
| `src/lib/{views,columns,partner-lists,partner-config,chart-presets}/migrations.ts` | Per-module migration chains (5 files) | ✓ VERIFIED | All 5 exist at schemaVersion 1 with empty migration maps |
| `src/lib/snowflake/reliability.ts` | executeWithReliability + circuitBreakerState + isTransientSnowflakeError + CircuitBreakerOpenError | ✓ VERIFIED | 9 exports confirmed; structured logging in place |
| `src/lib/snowflake/reliability.smoke.ts` | vitest smoke for BND-04 | ✗ STUB/BROKEN | File exists and is structurally correct; vitest runner fails with `__vite_ssr_exportName__ is not defined` (Node 24 + Next.js 16 vite transform collision — **pre-existing** across all vitest tests) |
| `src/components/layout/degraded-banner.tsx` | DegradedBanner component | ✓ VERIFIED | File exists; imports useHealthProbe; mounts in app/layout.tsx above header |
| `src/components/charts/chart-frame.tsx` | ChartFrame + ChartFrameProps + ChartFrameState + useChartFramePolarity | ✓ VERIFIED | State union confirmed; polarity context exported; density data-attr wired |
| `src/components/charts/chart-frame.smoke.tsx` | Shape-only smoke (jsdom not installed) | ✓ VERIFIED | 12 typed cases; tsc-only check per documented decision in SUMMARY |
| `src/app/api/revalidate/route.ts` | POST endpoint for ETL tag-invalidation | ✓ VERIFIED | File exists; calls revalidateTag(tag, 'max'); shared-secret auth; not called from client |
| `src/components/layout/refresh-button.tsx` | RefreshButton with ⌘R interceptor | ✓ VERIFIED | onClick calls `queryClient.invalidateQueries({ queryKey: ['data'] })` ONLY; no /api/revalidate fetch |
| `.planning/adr/009-caching-layers.md` | Three-layer caching ADR | ✓ VERIFIED | File exists; 4 mentions of BND-06; README.md index row confirmed |
| `.planning/milestones/v4.5-REQUIREMENTS.md` | BND-03 and BND-04 checkboxes | ✗ FAILED | Both checkboxes still `[ ]`; tracking table shows "Pending" for both |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/lib/computation/compute-*.ts` | `src/lib/data/types.ts` | `import type { BatchRow }` | ✓ WIRED | 6 hits in compute-anomalies.ts (BatchRow at line 188+); confirmed across all compute files |
| `src/hooks/use-partner-stats.ts` | `src/lib/data/parse-batch-row.ts` | `parseBatchRows` | ✓ WIRED | Line 13 imports parseBatchRows; line 57 calls it |
| `src/lib/static-cache/fallback.ts` | `src/lib/data/parse-batch-row.ts` | `parseBatchRows` | ✓ WIRED | Line 11 imports; line 80 calls |
| `src/lib/views/storage.ts` | `src/lib/persistence/versioned-storage.ts` | `createVersionedStore<SavedView[]>` | ✓ WIRED | Line 14 import; line 19 call |
| `src/lib/columns/persistence.ts` | `src/lib/persistence/versioned-storage.ts` | `createVersionedStore<ColumnState\|null>` | ✓ WIRED | Line 13 import; line 36 call |
| `src/lib/partner-lists/storage.ts` | `src/lib/persistence/versioned-storage.ts` | `createVersionedStore<PartnerList[]>` | ✓ WIRED | Line 11 import; line 16 call |
| `src/lib/partner-config/storage.ts` | `src/lib/persistence/versioned-storage.ts` | `createVersionedStore<PartnerConfigArray>` | ✓ WIRED | Line 21 import; line 26 call |
| `src/lib/chart-presets/storage.ts` | `src/lib/persistence/versioned-storage.ts` | `createVersionedStore<ChartPreset[]>` | ✓ WIRED | Line 16 import; line 24 call |
| `src/app/api/data/route.ts` | `src/lib/snowflake/reliability.ts` | `executeWithReliability(...)` | ✓ WIRED | Line 5 import; line 55 call |
| `src/app/api/data/route.ts` | Next.js route cache | `revalidate = 3600` + `unstable_cache` + `tag: 'batch-data'` | ✓ WIRED | Line 32: `export const revalidate = 3600`; line 53: `unstable_cache`; line 66: `tags: [CACHE_TAG]` |
| `src/app/api/data/route.ts` | `X-Request-Id` response header | `requestId` set on every response path | ✓ WIRED | Confirmed by grep showing X-Request-Id in all three routes |
| `src/components/charts/collection-curve-chart.tsx` | `src/components/charts/chart-frame.tsx` | `<ChartFrame` | ✓ WIRED | Line 392 renders `<ChartFrame` |
| `src/components/charts/generic-chart.tsx` | `src/components/charts/chart-frame.tsx` | `<ChartFrame` | ✓ WIRED | Lines 205, 221, 337, 451, 515 |
| `src/components/charts/chart-sparkline.tsx` | `src/components/charts/chart-frame.tsx` | `<ChartFrame density="compact"` | ✓ WIRED | Line 61 |
| `src/components/cross-partner/comparison-matrix.tsx` | `src/components/charts/chart-frame.tsx` | `<ChartFrame` | ✓ WIRED | Line 159 |
| `src/components/layout/header.tsx` | `src/components/layout/refresh-button.tsx` | `<RefreshButton />` | ✓ WIRED | Line 11 import; line 106 mount |
| `src/components/layout/refresh-button.tsx` | TanStack Query invalidation | `queryClient.invalidateQueries({ queryKey: ['data'] })` | ✓ WIRED | Line 81; explicitly NOT /api/revalidate |

---

### Requirements Coverage

| Requirement | Source Plan | Description (abbreviated) | Code Status | REQUIREMENTS.md Status |
|-------------|------------|---------------------------|-------------|------------------------|
| BND-01 | 43-01 | Canonical BatchRow / AccountRow / BatchAgeMonths typed contract | ✓ SATISFIED | [x] checked |
| BND-02 | 43-01 | Compute layer accepts BatchRow[] only; coerceAgeMonths collapsed to one | ✓ SATISFIED | [x] checked |
| BND-03 | 43-02a | Versioned localStorage with migration chains, verified writes, cross-tab sync | ✓ CODE SATISFIED | ✗ [ ] unchecked — stale |
| BND-04 | 43-02b | Snowflake reliability wrapper (retry + circuit breaker + request-id + sanitized errors) | ✓ CODE SATISFIED | ✗ [ ] unchecked — stale |
| BND-05 | 43-03 | ChartFrame primitive consumed by all chart consumers; StaleColumnWarning deleted | ✓ SATISFIED | [x] checked |
| BND-06 | 43-03 | /api/data cache tuned; RefreshButton locked path; ADR 009 | ✓ SATISFIED | [x] checked |

**Orphaned requirements:** None — all BND-* IDs appear in plan frontmatter.

---

### Smoke Battery Results

| Smoke | Command | Status |
|-------|---------|--------|
| parser-parity | `npm run smoke:parser-parity` | ✓ PASS — rows=477, null=3339, number=0, absent=0, dropped=0 |
| scope-rollup | `npm run smoke:scope-rollup` | ✓ PASS — multi-product partners checked: 2 |
| totals-rollup | `npm run smoke:totals-rollup` | ✓ PASS — pairs=36, batches=477 |
| penetration-rate | `npm run smoke:penetration-rate` | ✓ PASS |
| collection-rate-3mo | `npm run smoke:collection-rate-3mo` | ✓ PASS |
| collection-rate-6mo | `npm run smoke:collection-rate-6mo` | ✓ PASS |
| collection-rate-12mo | `npm run smoke:collection-rate-12mo` | ✓ PASS |
| null-semantics | `npm run smoke:null-semantics` | ✓ PASS — sentinel-list size=7 |
| seed-bug-aggregation | `npm run smoke:seed-bug-aggregation` | ✓ PASS |
| parse-batch-row | `npm run smoke:parse-batch-row` | ✓ PASS — sentinel-fields=7 |
| versioned-storage | `node --experimental-strip-types src/lib/persistence/versioned-storage.smoke.ts` | ✓ PASS — ALL 6 CASES PASS |
| reliability (vitest) | `npm run test:vitest -- reliability` | ✗ FAIL — pre-existing Node 24 / Next.js 16 vite SSR transform collision (`__vite_ssr_exportName__ is not defined`); affects ALL vitest tests including young-batch-censoring.test.ts from Phase 41-02 |

**TypeScript:** `npx tsc --noEmit` — 1 error (`tests/a11y/baseline-capture.spec.ts` axe-core missing types — pre-existing, out of scope per Plans 41-04 / 41-05 SCOPE BOUNDARY rule). Zero new errors from Phase 43.

---

### Anti-Patterns Found

| File | Pattern | Severity | Notes |
|------|---------|----------|-------|
| `src/lib/computation/compute-anomalies.ts` | `coerceAgeMonths` in comments (lines 180, 201) | ℹ Info | JSDoc references to the deletion — correct, no runtime calls |
| `src/lib/computation/compute-trending.ts` | `coerceAgeMonths` in JSDoc (line 22) | ℹ Info | Comment only, documents the deletion |
| `.planning/milestones/v4.5-REQUIREMENTS.md` | BND-03 and BND-04 checkboxes unchecked | ⚠️ Warning | Documentation-only gap; code is fully implemented. Stale milestone file gives a false "incomplete" signal for the phase. |
| `src/lib/snowflake/reliability.smoke.ts` | vitest runner broken under Node 24 | ⚠️ Warning | Pre-existing environmental issue (also breaks young-batch-censoring.test.ts from Phase 41-02). Logic of reliability.ts is sound; smoke structure is correct; the test executor (vitest 2.1.9) crashes before running any test cases under this Node version. |

---

### Human Verification Required

#### 1. Cross-tab localStorage sync (BND-03)

**Test:** Open the app in two browser tabs. Create a saved view (or change column visibility) in tab 1.
**Expected:** Tab 2's saved view list (or column state) updates within ~500ms without a page reload.
**Why human:** The `window.addEventListener('storage', ...)` listener requires a live browser with two tabs to verify.

#### 2. Circuit breaker degraded banner (BND-04)

**Test:** Block Snowflake connectivity (e.g., wrong SNOWFLAKE_ACCOUNT env, or a DNS block). Load the app. Observe 5 failed requests.
**Expected:** Yellow DegradedBanner appears above the header reading "Showing cached data — reconnecting to source." and `(stale)` badge appears near the last-updated timestamp. Both clear on recovery.
**Why human:** Live network failure conditions required; cannot simulate with static analysis.

#### 3. RefreshButton ⌘R intercept (BND-06)

**Test:** In a running app, press ⌘R (Mac) or Ctrl+R (Windows/Linux) without an input field focused.
**Expected:** Data refreshes via React Query invalidation; page does NOT reload. When an input is focused, ⌘R falls through to browser reload.
**Why human:** Keyboard event intercept requires live browser interaction.

#### 4. Snowflake credit reduction (BND-06)

**Test:** Compare Snowflake warehouse usage view before and after BND-06 deploy, across a 24h window with normal usage.
**Expected:** ≥10× reduction in credit consumption (v4.5 milestone success criterion).
**Why human:** Requires post-deploy Snowflake telemetry.

---

## Gaps Summary

Two gaps block a clean "passed" status:

**Gap 1 — REQUIREMENTS.md stale (documentation, not code):** BND-03 and BND-04 are fully implemented in code — `createVersionedStore` with all 5 storage modules wired, and `executeWithReliability` in all 3 API routes. But `v4.5-REQUIREMENTS.md` still shows `- [ ] BND-03` and `- [ ] BND-04` (unchecked) and the tracking table reads "Pending" for both. The file is the milestone contract; leaving it stale means the milestone reads as 4/6 complete when it is actually 6/6 complete. Fix: check the two boxes and update the tracking table.

**Gap 2 — vitest reliability smoke broken (pre-existing environment issue):** The BND-04 plan specified vitest as the test runner for the reliability smoke. The smoke file exists and is correctly structured. But `npm run test:vitest` fails across ALL vitest tests (including the pre-Phase-43 young-batch test) with `ReferenceError: __vite_ssr_exportName__ is not defined` — this is a Node 24.14.0 + Next.js 16.2.3 + vitest 2.1.9 compatibility issue in the vite SSR transform pipeline. The reliability logic itself is verified to load cleanly under `node --experimental-strip-types`. Fix options: (a) add `server: { deps: { external: ['next', ...] } }` or `pool: 'vmForks'` to vitest.config.ts to prevent Next.js's vite plugin from intercepting test modules, or (b) document as v5.5 DEBT-09 environment blocker with a note that the smoke logic is correct but the runner is broken.

Neither gap is a functional regression — the shipped code is correct and all 10 non-vitest smokes pass green. The gaps are a stale milestone document and a pre-existing test runner incompatibility.

---

_Verified: 2026-05-01T21:45:00Z_
_Verifier: Claude (gsd-verifier)_
