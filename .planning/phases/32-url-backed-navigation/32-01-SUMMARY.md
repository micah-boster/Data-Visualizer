---
phase: 32-url-backed-navigation
plan: 01
subsystem: navigation
tags: [next-navigation, useSearchParams, useRouter, url-state, sonner, drill-down]

# Dependency graph
requires:
  - phase: 08-navigation-drill-down
    provides: useDrillDown hook and its 13 consumer call sites
  - phase: 25-code-health
    provides: use-filter-state.ts URL-backed pattern (reference mirror)
provides:
  - URL-backed drill state via ?p=<partner>&b=<batch> search params
  - Browser back/forward navigation between drill levels
  - Deep-linkable drill URLs with graceful stale-param handling (toast + step-up)
  - Zero-churn public API: all 13 existing useDrillDown consumers unchanged
affects: [32-02, saved-views, breadcrumb, any-phase-adding-drill-consumers]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "URL as source of truth for navigational state (mirrors use-filter-state.ts)"
    - "paramsString memo-key discipline to avoid useSearchParams freeze/re-render loop"
    - "router.push (not replace) for drill transitions so browser history pops one level at a time"
    - "{ scroll: false } on every drill push to prevent scroll-to-top jumps"
    - "Stale-param validation effect: toast + navigateToLevel step-up (non-destructive)"
    - "Orthogonal URL axes — filter params (partner/batch) and drill params (p/b) intentionally coexist"

key-files:
  created: []
  modified:
    - src/hooks/use-drill-down.ts
    - src/components/data-display.tsx

key-decisions:
  - "Drill param names: p (partner) and b (batch) — distinct from filter params partner/batch to avoid URL slot collision with use-filter-state.ts FILTER_PARAMS"
  - "router.push with { scroll: false } — NOT router.replace — so each drill creates a history entry (NAV-02 back button contract)"
  - "Stale-param handling: sonner toast + navigateToLevel step-up (partner-missing → root, batch-missing → partner). Non-destructive, preserves user history"
  - "use-filter-state.ts left untouched — Phase 25 regression guard honored"
  - "Filter (?partner=X) and drill (?p=X) params for the same partner coexist by design — filter = which rows qualify, drill = which row is focused; orthogonal axes"

patterns-established:
  - "URL-backed hook: mirror use-filter-state.ts exactly — useSearchParams + usePathname + useRouter, paramsString memo-key, string-serialized pushes"
  - "Deep-link validation: effect that runs when data loads, compares URL state to dataset, toasts + steps up (no crash, no error page)"
  - "Public-API-first hook rewrites: preserve exported types and function shapes so consumers need zero edits"

requirements-completed: [NAV-01, NAV-02, NAV-03]

# Metrics
duration: 45min
completed: 2026-04-16
---

# Phase 32 Plan 01: URL-Backed Drill Hook Summary

**useDrillDown rewritten as URL-backed hook (next/navigation useSearchParams + router.push) with sonner toast for stale deep-links; zero consumer churn across 13 call sites**

## Performance

- **Duration:** ~45 min (Task 1 + Task 2 implementation, then human-verify checkpoint)
- **Started:** 2026-04-16T22:00:00Z (approx — plan created at 61e239c)
- **Completed:** 2026-04-16T22:13:00Z (task commits) + human-verify approval this session
- **Tasks:** 3 (2 auto + 1 human-verify checkpoint)
- **Files modified:** 2

## Accomplishments

- `useDrillDown` now reads drill state from URL (`?p=<partner>&b=<batch>`) and writes via `router.push({ scroll: false })` — browser back/forward buttons now pop drill levels one at a time.
- Deep-linkable URLs: pasting `?p=X&b=Y` cold-loads directly into the batch drill.
- Stale-param guard in `data-display.tsx` surfaces a sonner toast and steps up one level when a URL references a partner or batch not present in the loaded dataset.
- Public API preserved exactly — all 13 existing consumers of `useDrillDown` / `DrillLevel` / `DrillState` required zero edits.
- `use-filter-state.ts` untouched — Phase 25 regression guard honored.

## Task Commits

1. **Task 1: Rewrite useDrillDown as URL-backed hook** — `0e4650a` (feat)
2. **Task 2: Add stale-param validation + toast in data-display** — `0d21652` (feat)
3. **Task 3: Human-verify URL-backed drill end-to-end** — APPROVED by user (checkpoint — no code commit)

**Plan metadata:** pending (docs commit at end of this summary)

## Files Created/Modified

- `src/hooks/use-drill-down.ts` — Rewritten from in-memory React state to URL-backed via `useSearchParams` + `useRouter` from `next/navigation`. Exports unchanged: `useDrillDown`, `DrillLevel`, `DrillState`.
- `src/components/data-display.tsx` — Added stale-param validation effect that checks `drillState.partner` / `drillState.batch` against `data.data` and fires a sonner toast + `navigateToLevel` step-up when stale. Existing `window.history.replaceState` call in `handleLoadView` preserved (still exactly 1 occurrence).

## Decisions Made

**Drill param names: `p` and `b` (not `partner` and `batch`)**
`use-filter-state.ts` already claims `partner` and `batch` as dimension-filter params (FILTER_PARAMS constant, lines 11-15). Reusing those names would make filter state and drill state fight over the same URL slots. CONTEXT.md's Claude's Discretion clause and RESEARCH.md Pattern 6 both permit renaming on conflict, so the hook uses `p` for partner drill and `b` for batch drill. Rationale documented in JSDoc at the top of `use-drill-down.ts`.

**`router.push` with `{ scroll: false }` — NOT `router.replace`**
NAV-02 ("browser back button pops exactly one drill level") requires each drill transition to create a history entry. `replace` would mutate the current entry and break the back-button contract. `scroll: false` prevents the drill-in from jumping the user to the top of the page.

**Stale-param handling: toast + step-up, not error page**
CONTEXT.md specifies non-destructive handling. The validation effect calls `navigateToLevel` (which itself uses `router.push`), so the user's history gets a "returned to root" entry rather than silently clobbering the stale URL. Partner-missing steps up to root; batch-missing steps up to partner.

**Filter and drill params coexist by design**
User observed during verification that `?partner=Affirm&p=Affirm&b=<date>` shows both axes simultaneously when filtering to a single partner and drilling into that same partner. Confirmed intentional: filter params gate which rows qualify for aggregation, drill params select which row is focused. Two orthogonal URL axes; removing one to mirror the other would break Phase 25's filter-before-aggregate contract.

## Deviations from Plan

None — plan executed exactly as written. Both Task 1 and Task 2 landed on first pass with TSC + ESLint clean. Human-verify checkpoint approved all 8 scenarios without revisions.

## Issues Encountered

None during implementation. One clarifying question from the user during verification (why `?partner=X&p=X` shows both params); answered with the "orthogonal axes" framing above and user was satisfied.

## Verification Notes (from Task 3 checkpoint)

- **Next.js 16.2.0-16.2.2 stale-params regression (RESEARCH.md Pitfall 4):** Did NOT surface. Project is pinned to `next@16.2.3` per `package.json`, which is past the regression window. No freeze or re-render loop observed during the 8-scenario walkthrough.
- **13 consumer sites:** Zero edits required. Grep for `useDrillDown|drillState|drillToPartner|drillToBatch|navigateToLevel` showed every consumer still compiles and behaves identically under the URL-backed hook. No surprises to flag for Plan 02.
- **`use-filter-state.ts` unchanged:** Verified via `git diff 61e239c..0d21652 --stat -- src/hooks/use-filter-state.ts` (no entry in diff stat). Phase 25 regression guard honored.
- **All 8 human-verify scenarios passed:**
  1. Drill-in pushes history entries (`p` then `p+b`); no scroll jump.
  2. Back pops exactly one level at a time (`b` → `p` → root).
  3. Forward is symmetric.
  4. Deep link cold-loads directly into batch drill after skeleton.
  5. Stale partner shows toast + returns to root.
  6. Stale batch shows toast + returns to partner view.
  7. Dimension filters survive drill transitions (filter param + drill param coexist).
  8. No console errors or re-render warnings.

## User Setup Required

None — no external service configuration introduced.

## Next Phase Readiness

- **Plan 32-02 can proceed:** URL-backed drill foundation is in place. Plan 02 will wire saved-view persistence / breadcrumb UI / any other URL-facing drill surface on top of this hook. No risks to flag from the 13-consumer audit.
- **No blockers.**

---
*Phase: 32-url-backed-navigation*
*Completed: 2026-04-16*

## Self-Check: PASSED

- FOUND: `.planning/phases/32-url-backed-navigation/32-01-SUMMARY.md`
- FOUND: commit `0e4650a` (Task 1)
- FOUND: commit `0d21652` (Task 2)
- FOUND: `src/hooks/use-drill-down.ts`
- FOUND: `src/components/data-display.tsx`
