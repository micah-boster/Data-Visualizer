---
phase: 34-partner-lists
plan: 01
subsystem: ui
tags: [partner-lists, localStorage, zod, react-context, hydration-safe]

# Dependency graph
requires:
  - phase: 25-filter-quality
    provides: "filter-before-aggregate pattern + getPartnerName helper in src/lib/utils.ts"
provides:
  - "PartnerList / PartnerListFilters / AttributeKey types (v1 scope: ACCOUNT_TYPE)"
  - "partnerListSchema / partnerListsArraySchema (strict zod, additive-optional evolution)"
  - "loadPartnerLists / persistPartnerLists + PARTNER_LISTS_STORAGE_KEY"
  - "getDefaultPartnerLists() returning [] for v1"
  - "evaluateFilters(rows, filters) -> Set<PARTNER_NAME> (within-attr OR, cross-attr AND)"
  - "usePartnerLists() hook: createList, deleteList, restoreList, renameList, updateList, refreshList, getList, hasListWithName"
  - "ActivePartnerListProvider + useActivePartnerList() (memory-only activeListId, toggleList click-to-deactivate, stale-ID recovery)"
affects: [34-02-sidebar, 34-03-creation-dialog, 34-04-integration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Hydration-safe localStorage CRUD hook pattern — useState([]) + useEffect(load) + hasHydrated ref gate on useEffect(persist). Mirrors useSavedViews; reusable for any future user-owned persisted collection."
    - "Context-prop-injection pattern — ActivePartnerListProvider accepts `lists` as prop instead of owning storage. Keeps a single source of truth in usePartnerLists() higher up the tree; both sidebar + dialog read the same array."
    - "Strict-zod + additive-optional schema evolution — attributeFiltersSchema uses .strict() so unknown keys fail safeParse; new attributes must land as explicit `.optional()` fields in schema.ts. Forces migration thinking at the schema edge."
    - "Source-locked-at-creation — PartnerList.source is set once at createList() and excluded from updateList()'s Pick<> type. Attribute lists and manual lists are type-stable forever (Pitfall 7)."

key-files:
  created:
    - "src/lib/partner-lists/types.ts"
    - "src/lib/partner-lists/schema.ts"
    - "src/lib/partner-lists/storage.ts"
    - "src/lib/partner-lists/defaults.ts"
    - "src/lib/partner-lists/filter-evaluator.ts"
    - "src/hooks/use-partner-lists.ts"
    - "src/contexts/active-partner-list.tsx"
  modified: []

key-decisions:
  - "source: 'attribute' | 'manual' locked at createList time and excluded from updateList's Pick<> — attribute-driven lists always get a Refresh action, manual hand-picked lists never do (Pitfall 7)"
  - "activeListId is memory-only (useState<string | null>), NOT persisted to localStorage — page reload returns to 'no active list' per CONTEXT Open Q #3; consistent with a non-modal, opt-in filter semantics"
  - "ActivePartnerListProvider accepts `lists` as prop instead of owning storage — keeps a single source of truth in usePartnerLists higher up the tree and lets sidebar + dialog read the same array"
  - "attributeFiltersSchema is .strict() — unknown keys fail at parse time, forcing a schema update (additive .optional() fields) before new attributes can land. v1 carries ACCOUNT_TYPE only; PRODUCT_TYPE / REVENUE_BAND deferred per CONTEXT.md 2026-04-18"
  - "filter-evaluator.ts consumes Array<Record<string, unknown>> rather than DataResponse — stays portable and testable without coupling to Snowflake-specific types"
  - "Stale-ID recovery lives on the provider (useEffect sanitizer) rather than on the hook — sidebar reverts to 'no active' after a delete without any consumer-side plumbing"

patterns-established:
  - "Hydration-safe persisted-collection hook (useState([]) + load/persist effects + hasHydrated ref) — applicable to any future user-owned list"
  - "Context-prop-injection for derived app-wide state — provider consumes data from a sibling hook; useful whenever two surfaces need to read the same collection"
  - "Strict-zod + additive-optional schema evolution — new attributes land as `.optional()` without breaking legacy payloads"

requirements-completed: [LIST-04]

# Metrics
duration: ~3 min
completed: 2026-04-18
---

# Phase 34 Plan 01: Partner Lists Data Layer Summary

**Partner-lists plumbing: types, strict-zod schema, SSR-safe localStorage CRUD, hydration-safe `usePartnerLists` hook, and an `ActivePartnerListProvider` context with click-to-deactivate + stale-ID recovery.**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-04-18T19:25:52Z
- **Completed:** 2026-04-18T19:29:07Z
- **Tasks:** 3
- **Files created:** 7
- **Files modified:** 0

## Accomplishments
- 7 new files under `src/lib/partner-lists/`, `src/hooks/`, and `src/contexts/`; zero existing files touched.
- Public API matches the plan's `<interfaces>` block verbatim (including `updateList` on `UsePartnerListsResult`).
- Hydration-safe pattern (useState([]) + useEffect(load) + hasHydrated ref) applied to `usePartnerLists`, mirroring `useSavedViews` structurally.
- ActivePartnerListProvider accepts `lists` as a prop (single source of truth in the hook), implements click-active-to-deactivate via `toggleList`, and resets `activeListId` to `null` when the referenced list is deleted.
- Strict-zod schema at load-time so corrupt or unknown-key payloads fall back to `[]` instead of crashing (matches Phase 25 decision).
- All four guards green (`check:tokens`, `check:surfaces`, `check:components`, `check:motion`); `npm run build` succeeds with zero TS errors.

## Task Commits

Each task was committed atomically:

1. **Task 1: types/schema/storage/defaults/filter-evaluator** — `5f70a3b` (feat)
2. **Task 2: usePartnerLists hydration-safe CRUD hook** — `92c3d50` (feat)
3. **Task 3: ActivePartnerListProvider context** — `907ae89` (feat)

**Plan metadata commit:** pending final docs commit.

## Files Created/Modified

Created:
- `src/lib/partner-lists/types.ts` — PartnerList, PartnerListFilters, AttributeKey type definitions (v1 scope: ACCOUNT_TYPE).
- `src/lib/partner-lists/schema.ts` — strict zod schemas (`partnerListSchema`, `partnerListsArraySchema`) with additive-optional evolution.
- `src/lib/partner-lists/storage.ts` — SSR-safe `loadPartnerLists` / `persistPartnerLists` + `PARTNER_LISTS_STORAGE_KEY = 'bounce-dv-partner-lists'`.
- `src/lib/partner-lists/defaults.ts` — `getDefaultPartnerLists()` returns `[]` for v1.
- `src/lib/partner-lists/filter-evaluator.ts` — pure `evaluateFilters(rows, filters): Set<string>` with within-attribute OR / across-attribute AND semantics.
- `src/hooks/use-partner-lists.ts` — `usePartnerLists()` hook exposing full CRUD + `updateList` + `refreshList` (attribute-source-only).
- `src/contexts/active-partner-list.tsx` — `ActivePartnerListProvider` + `useActivePartnerList()` with `toggleList` click-to-deactivate and stale-ID recovery effect.

Modified: None.

## Decisions Made
- `source: 'attribute' | 'manual'` locked at creation and excluded from `updateList`'s Pick<> type (Pitfall 7). Attribute lists always get Refresh; manual hand-picked lists never do.
- `activeListId` is memory-only (`useState<string | null>`), NOT persisted — page reload returns to "no active list" per CONTEXT Open Q #3.
- `ActivePartnerListProvider` consumes `lists` as a prop rather than owning storage — single source of truth lives in `usePartnerLists` higher up the tree.
- `attributeFiltersSchema` is `.strict()` — unknown attribute keys fail `safeParse`, forcing a schema update (additive `.optional()` fields) before a new attribute can land.
- `filter-evaluator.ts` accepts `Array<Record<string, unknown>>` rather than a Snowflake-specific type — keeps it portable and testable.
- Stale-ID recovery lives on the provider via `useEffect` — sidebar reverts cleanly after a delete without consumer plumbing.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Imported `JSX` as a named type from `react`**
- **Found during:** Task 3 (build verification)
- **Issue:** TypeScript reported `Cannot find namespace 'JSX'` on the `ActivePartnerListProvider` return type. React 19 no longer exposes `JSX` as a global namespace; it must be imported from `react`.
- **Fix:** Added `type JSX` to the existing `import ... from 'react'` statement.
- **Files modified:** `src/contexts/active-partner-list.tsx`
- **Verification:** `npm run build` passes; all four check:* guards green.
- **Committed in:** `907ae89` (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking).
**Impact on plan:** Single import adjustment; no scope expansion, no behavioral change. The API shape in the plan's `<interfaces>` block is unchanged.

## Issues Encountered
- None beyond the React-19 `JSX` namespace blocker noted above.

## User Setup Required
None — no external service configuration required. This plan ships pure data-layer primitives; first user-visible behavior lands in Plans 02 (sidebar) + 03 (dialog).

## Next Phase Readiness
- Plan 02 (sidebar section) can import from `@/hooks/use-partner-lists` and `@/contexts/active-partner-list` directly.
- Plan 03 (creation dialog) can call `createList({ source: 'attribute' | 'manual' })` and `evaluateFilters(rows, filters)` to build the live preview.
- Plan 04 (integration) can wrap the app in `<ActivePartnerListProvider lists={lists}>` and read `activeList.partnerIds` anywhere a cross-app filter is needed.
- No blockers. `ACCOUNT_TYPE` is the only v1 attribute — additional attributes require a strict-schema update (documented inline in `schema.ts`).

## Self-Check: PASSED

All 7 created files verified on disk. All 3 task commits verified in git log.

---
*Phase: 34-partner-lists*
*Completed: 2026-04-18*
