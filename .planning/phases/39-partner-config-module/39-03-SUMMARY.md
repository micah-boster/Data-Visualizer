---
phase: 39-partner-config-module
plan: 03
subsystem: ui
tags: [partner-lists, derived-lists, schema-evolution, attribute-filter, segment, product-type, zod, sonner]

requires:
  - phase: 34-partner-lists
    provides: usePartnerLists hook, PartnerListsProvider context, PartnerListFilters shape, attribute-filter-bar, create-list-dialog, .strict() schema lock
  - phase: 39-01-pair-migration
    provides: PRODUCT_TYPE_LABELS, ACCOUNT_TYPE-keyed pair shape, additive-optional schema evolution precedent
  - phase: 39-02-segment-config
    provides: PartnerConfigProvider, usePartnerConfigContext().configs, SegmentRule.name surface (parallel Wave 2 — landed concurrently)

provides:
  - PartnerListFilters extended with PRODUCT_TYPE (display alias of ACCOUNT_TYPE) and SEGMENT (references SegmentRule.name) optional keys
  - PartnerList.source variant 'derived' for auto-maintained lists (alongside 'attribute' and 'manual')
  - computeDerivedLists(rows, now) — pure helper returning one PartnerList per distinct ACCOUNT_TYPE in the dataset, with stable IDs (DERIVED_LIST_ID_PREFIX + ACCOUNT_TYPE)
  - Derived auto-lists merged into usePartnerLists output without persisting to localStorage; deletion is a no-op that re-materializes on next render
  - Sidebar visual distinction for derived lists (Sparkles icon + "Auto" pill, disabled rename with tooltip, "reappears on refresh" sonner toast on delete)
  - SegmentResolver type + filter-evaluator handles PRODUCT_TYPE alias (cross-attribute AND with ACCOUNT_TYPE) and SEGMENT via optional resolver callback
  - Attribute filter bar extended to 3 ATTRIBUTES (Account Type, Product Type, Segment) with data-driven hide-when-empty render
  - CreateListDialog wires segmentResolver from usePartnerConfigContext (defensive try/catch for provider absence)
  - Two new smoke tests: derived-lists.smoke.ts (8 assertions), schema.additive-segment.smoke.ts (6 assertions including legacy-parse + .strict() lock)

affects: [39-04-segment-split-charts-kpis, future-pcfg-08-snowflake-storage]

tech-stack:
  added: []
  patterns:
    - "Auto-maintained list pattern: stable ID prefix (DERIVED_LIST_ID_PREFIX) + computeDerivedLists pure helper + hook-level merge that filters derived entries before persistPartnerLists writes localStorage"
    - "Derived-list deletion semantics: no-op on storage, transient in-memory removal, re-materialize on next render — communicated via sonner toast 'reappears on refresh'"
    - "Cross-attribute alias pattern: PRODUCT_TYPE evaluator-aliased to ACCOUNT_TYPE (same column) with cross-attribute AND when both filters are set; UI surfaces both as separate controls with identical value lists"
    - "Optional callback dependency injection for filter evaluator: SegmentResolver supplied by caller (create-list-dialog) keeps evaluator pure with no React/context coupling"
    - "Defensive try/catch around context hook for parallel-wave consumer: usePartnerConfigContext call wrapped so 39-03 compiles even if 39-02 hadn't landed yet (it had — but the pattern stays as cheap insurance)"

key-files:
  created:
    - src/lib/partner-lists/derived-lists.ts
    - src/lib/partner-lists/derived-lists.smoke.ts
    - src/lib/partner-lists/schema.additive-segment.smoke.ts
  modified:
    - src/lib/partner-lists/types.ts
    - src/lib/partner-lists/schema.ts
    - src/lib/partner-lists/filter-evaluator.ts
    - src/hooks/use-partner-lists.ts
    - src/contexts/partner-lists.tsx
    - src/components/partner-lists/partner-lists-sidebar-group.tsx
    - src/components/partner-lists/attribute-filter-bar.tsx
    - src/components/partner-lists/create-list-dialog.tsx
    - package.json

key-decisions:
  - "PRODUCT_TYPE stored as a SEPARATE optional filter key (not folded into ACCOUNT_TYPE) — keeps the evaluator semantics explicit (cross-attribute AND when both are set) and lets the UI render two distinct labeled controls. Storing them as one key would have required a runtime mode flag and broken the additive-optional schema invariant"
  - "DERIVED_LIST_ID_PREFIX = '__derived__' (double-underscore reserved sentinel) — chosen because crypto.randomUUID() output never starts with this prefix, so collisions with user-created lists are impossible. Downstream callers detect derived lists via id.startsWith() — cheaper than touching list.source"
  - "Derived lists computed inside usePartnerLists from a new optional `rows` arg (not threaded as props) — keeps the merge logic colocated with persistence/CRUD, ensures derived lists auto-strip on persistence, and prevents accidental dual-source-of-truth issues. The provider sources rows via useData() (TanStack Query dedupes — no extra request)"
  - "Visual distinction = Sparkles icon + 'Auto' pill (NOT just one) — icon is fast-glance, pill is explicit. The pill uses .text-label tier (12px / mono / weight 500) which preserves type-token discipline (no ad-hoc font-medium pairing). Disabling rename with a tooltip explanation reads better than hiding it (the lock is visible)"
  - "Derived deletion fires a sonner toast 'Auto-list — will reappear on next refresh' but the deleteList hook returns undefined for derived ids (no storage mutation) — the toast is the recovery affordance, not the visible removal. The active-partner-list sanitizer takes care of clearing activeListId if the user had the derived list active"
  - "Open Q #4 resolved via 'derived variant + reappears-on-refresh semantics' — the alternative was a permanent 'don't-show' flag that would have required additional storage state and made undelete more complex. Re-derivation gives the user a single mental model: derived lists are computed, not stored"
  - "SegmentResolver type lives in filter-evaluator.ts (not types.ts) — keeps the module export surface focused: the evaluator file is the single import path for both `evaluateFilters` and the resolver type. Caller wires the resolver from `usePartnerConfigContext().configs` in create-list-dialog"
  - "evaluateFilters logs a console.warn when SEGMENT filter is set without a resolver but does NOT throw — defensive: a hand-edited localStorage payload with a stale SEGMENT entry shouldn't crash list rendering; degrade gracefully instead"
  - "create-list-dialog wraps usePartnerConfigContext() in try/catch (defensive against parallel-wave provider absence) — the hook still gets called every render so Rules of Hooks aren't violated; only the throw path is caught. Plan 39-02 had landed by the time 39-03 finished, but the defensive pattern stays as insurance for future refactors"
  - "filter-evaluator passes segmentResolver only when filters.SEGMENT is non-empty (perf optimization in create-list-dialog) — skips per-row lookup work for the common case (lists without SEGMENT constraints)"

patterns-established:
  - "Auto-maintained derived data pattern (DERIVED_LIST_ID_PREFIX + computeDerivedLists + storage-level filter-out + sidebar visual distinction + sonner re-materialize toast) is reusable for any future feature that needs to surface system-computed entries alongside user-created ones (e.g. derived saved views, auto-cohorts)"
  - "Cross-attribute alias pattern (PRODUCT_TYPE → ACCOUNT_TYPE) — when two UI labels need to map to the same backing column, give them separate optional filter keys and AND them in the evaluator. Avoids the 'mode flag' anti-pattern and preserves additive-optional schema evolution"
  - "Defensive context-hook consumption (try/catch around use*Context for parallel-wave consumers) is now an established pattern — Rules of Hooks aren't violated as long as the hook is called every render; only the throw-from-missing-provider path is caught"

requirements-completed: [PCFG-06]

duration: 9 min
completed: 2026-04-25
---

# Phase 39 Plan 03: Partner Lists Extension Summary

**PartnerListFilters gains PRODUCT_TYPE (display alias) + SEGMENT (config-driven) optional keys; auto-maintained derived lists (one per distinct ACCOUNT_TYPE) merge into the sidebar with Sparkles + "Auto" pill, never touching localStorage and re-materializing on every render.**

## Performance

- **Duration:** 9 min
- **Started:** 2026-04-25T03:01:18Z
- **Completed:** 2026-04-25T03:10:33Z
- **Tasks:** 4 (3 auto + 1 checkpoint:human-verify, auto-approved per workflow.auto_advance)
- **Files modified:** 9 modified, 3 created (1 source + 2 smoke tests)

## Accomplishments

- **Schema evolution (additive-optional):** `PartnerListFilters` extended with `PRODUCT_TYPE?: string[]` and `SEGMENT?: string[]`. `partnerListSchema` keeps `.strict()` (unknown keys still fail) but accepts the two new optional fields. `source` enum widened to `'attribute' | 'manual' | 'derived'`. Smoke test confirms legacy pre-Phase-39 payloads with only ACCOUNT_TYPE (and 'attribute' or 'manual' source) parse cleanly.
- **Derived auto-list generator:** `computeDerivedLists(rows, now)` returns one PartnerList per distinct ACCOUNT_TYPE value (e.g. "1st Party Partners", "3rd Party Partners", "Pre-Chargeoff 3rd Party Partners"). Stable IDs via `DERIVED_LIST_ID_PREFIX + ACCOUNT_TYPE_VALUE`. partnerIds is a sorted snapshot of matching PARTNER_NAMEs at generation time. filters carries `{ ACCOUNT_TYPE: [value] }`. source is `'derived'`. createdAt + updatedAt = now (injectable for deterministic tests).
- **Hook merge + persistence guarantee:** `usePartnerLists(rows?)` accepts an optional rows arg. When supplied, derived lists are computed via useMemo and merged into the returned `lists` (de-duped by id, derived wins on collision). The persistence effect filters derived entries before calling `persistPartnerLists` — derived lists never touch localStorage. Mutating ops (`deleteList`, `renameList`, `updateList`, `refreshList`) are no-ops on derived ids with dev-only `console.warn`s.
- **Provider integration:** `PartnerListsProvider` reads dataset rows via `useData()` (TanStack Query dedupes — same `['data']` queryKey shared with all other consumers, no extra request) and passes them to `usePartnerLists(rows)`. Pre-data render returns user lists only; derived lists materialize when the query resolves.
- **Sidebar visual distinction:** Derived lists render with `Sparkles` icon (instead of `List`) plus an "Auto" pill (`.text-label` tier — 12px / mono / weight 500) on the right. Rename action wrapped in `Tooltip` with `disabled` + opacity-50 styling and `aria-label="Auto-lists can't be renamed"`. Delete fires a sonner toast `Auto-list — will reappear on next refresh.` with the list name in the description; the underlying storage stays untouched, so the next render re-materializes it. The active-partner-list sanitizer handles clearing activeListId if the deleted list was active.
- **Filter evaluator extensions:** `evaluateFilters(rows, filters, segmentResolver?)` handles PRODUCT_TYPE identically to ACCOUNT_TYPE (cross-attribute AND when both are set). SEGMENT filter resolves via the optional `segmentResolver` callback that maps `(partner, product) → SegmentRule[]`; missing resolver triggers a `console.warn` and skips the SEGMENT check (degrade-don't-crash). New `SegmentResolver` type exported.
- **Attribute filter bar (data-driven):** `ATTRIBUTES` config has 3 entries: ACCOUNT_TYPE, PRODUCT_TYPE, SEGMENT. `availableValues` prop type widened to `Partial<Record<'ACCOUNT_TYPE'|'PRODUCT_TYPE'|'SEGMENT', string[]>>`. Existing `options.length === 0` hide-control logic naturally hides SEGMENT when no segments are configured anywhere.
- **CreateListDialog wires PRODUCT_TYPE + SEGMENT:** `availableValues` memo computes ACCOUNT_TYPE + PRODUCT_TYPE (identical sorted distinct values) plus SEGMENT (deduped `SegmentRule.name` across all configured pairs from `usePartnerConfigContext().configs`). `segmentResolver` memoized on configs and passed to `evaluateFilters` only when `filters.SEGMENT?.length > 0` (perf — skips per-row lookup for the common case). Defensive try/catch around `usePartnerConfigContext()` lets the dialog compile and run even if PartnerConfigProvider isn't mounted.

## Task Commits

1. **Task 1: Schema + evaluator + derived-lists generator (pure data layer)** — `1f298c6` (feat)
2. **Task 2: Wire derived lists into usePartnerLists + sidebar surface** — `d33ccdb` (feat)
3. **Task 3: Extend attribute filter bar with PRODUCT_TYPE + SEGMENT** — `67f2783` (feat)
4. **Task 4: Visual verify checkpoint** — auto-approved per `workflow.auto_advance`; pre-existing `globals.css` build failure logged to deferred-items.md (Phase 39-01)

**Plan metadata:** appended in final commit.

## Files Created/Modified

### Created
- `src/lib/partner-lists/derived-lists.ts` — pure `computeDerivedLists` helper + `DERIVED_LIST_ID_PREFIX` export
- `src/lib/partner-lists/derived-lists.smoke.ts` — 8 assertions: empty input, three-bucket case, ID stability, source === 'derived', filters.ACCOUNT_TYPE shape, name labels (known + unknown), partnerIds dedupe + missing-row exclusion, now timestamp wiring
- `src/lib/partner-lists/schema.additive-segment.smoke.ts` — 6 assertions: legacy attribute payload parses, legacy manual payload parses, modern PRODUCT_TYPE+SEGMENT payload parses, derived-source payload parses, .strict() unknown-key still rejected, unknown source enum still rejected

### Modified
- `src/lib/partner-lists/types.ts` — `AttributeKey` union extended; `PartnerListFilters` gains `PRODUCT_TYPE?` + `SEGMENT?`; `PartnerList.source` adds `'derived'` with JSDoc explaining auto-regenerate semantics
- `src/lib/partner-lists/schema.ts` — `attributeFiltersSchema` gains optional PRODUCT_TYPE + SEGMENT (`.strict()` preserved); `partnerListSchema.source` enum extended with `'derived'`
- `src/lib/partner-lists/filter-evaluator.ts` — PRODUCT_TYPE alias logic (cross-attribute AND with ACCOUNT_TYPE); SEGMENT path with optional `segmentResolver` parameter; new `SegmentResolver` type export; defensive console.warn when SEGMENT requested without resolver
- `src/hooks/use-partner-lists.ts` — optional `rows` arg; useMemo over `computeDerivedLists`; merge logic (user lists + derived, derived wins on id collision); persistence filters derived ids out before write; mutating ops no-op on derived ids with dev warnings
- `src/contexts/partner-lists.tsx` — `useData()` integration to source rows; passes rows to `usePartnerLists(rows)`; updated JSDoc explaining TanStack Query dedupe
- `src/components/partner-lists/partner-lists-sidebar-group.tsx` — `isDerived` helper; Sparkles icon swap; "Auto" pill render (`.text-label`); delete handler routes derived ids to sonner toast (no storage mutation); rename action wrapped in Tooltip + `disabled` for derived
- `src/components/partner-lists/attribute-filter-bar.tsx` — `ATTRIBUTES` config has 3 entries (ACCOUNT_TYPE, PRODUCT_TYPE, SEGMENT); `availableValues` prop type widened; updated JSDoc explaining alias semantics + cross-attribute AND
- `src/components/partner-lists/create-list-dialog.tsx` — defensive `usePartnerConfigContext()` try/catch; `availableValues` memo computes all 3 attribute keys (with PRODUCT_TYPE = ACCOUNT_TYPE values); `segmentResolver` memo wired to evaluateFilters only when SEGMENT is active
- `package.json` — `smoke:derived-lists` + `smoke:schema-additive-segment` scripts

## Decisions Made

See `key-decisions` in frontmatter. Highlights:

- **PRODUCT_TYPE = separate optional filter key, not a mode flag on ACCOUNT_TYPE.** Storing them as one key would have required a runtime "mode" indicator and broken additive-optional schema evolution. As separate keys, the evaluator semantics stay explicit (cross-attribute AND), legacy lists (ACCOUNT_TYPE only) still parse, and future attribute additions follow the same pattern.
- **Derived list ID prefix `'__derived__'` (double-underscore sentinel).** crypto.randomUUID() output never starts with double-underscores, so collisions with user-created list IDs are impossible. Callers detect derived lists via cheap `id.startsWith()` rather than reading `list.source`.
- **Derived lists computed inside the hook from an optional `rows` arg (NOT threaded as props).** Keeps merge logic colocated with persistence/CRUD, guarantees derived lists auto-strip on persistence, prevents dual-source-of-truth bugs. The provider sources rows via the same `useData()` query the rest of the app reads — TanStack Query dedupes by queryKey so no extra fetch.
- **Visual distinction = Sparkles icon + "Auto" pill.** Icon is fast-glance, pill is explicit. The pill uses `.text-label` (12px / mono / weight 500) — preserves type-token discipline (no ad-hoc `font-medium` pairing).
- **Disabling rename via Tooltip + `disabled` (not hiding the button).** The lock is visible so the affordance is discoverable; tooltip explains why. Per Plan 03 explicit guidance.
- **Open Q #4 resolved via "derived variant + reappears-on-refresh".** Alternative would have been a permanent "don't show" flag with additional storage state and undelete complexity. Re-derivation gives users a single mental model.
- **SegmentResolver lives in filter-evaluator.ts (not types.ts).** Single import path for the evaluator + its resolver type. Caller wires the resolver from `usePartnerConfigContext().configs`.
- **filter-evaluator degrades gracefully on missing resolver.** A hand-edited localStorage payload with stale SEGMENT entry should not crash; logs a `console.warn` and skips the SEGMENT check.
- **Defensive try/catch around `usePartnerConfigContext()` in create-list-dialog.** Plan 39-02 had landed by the time 39-03 finished, but the defensive pattern stays as cheap insurance for future refactors. Rules of Hooks not violated — the hook is called every render; only the throw path is caught.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Smoke-test runtime path resolution required `.ts` extensions and relative imports**
- **Found during:** Task 1 verification (`npm run smoke:derived-lists` first run)
- **Issue:** `derived-lists.ts` originally imported `@/lib/partner-config/pair` and `@/lib/utils` — Node's `--experimental-strip-types` runner doesn't honor TypeScript path aliases at runtime. Result: `ERR_MODULE_NOT_FOUND: Cannot find package '@/lib'`.
- **Fix:** Converted imports in `derived-lists.ts` to relative paths with explicit `.ts` extensions (`../partner-config/pair.ts`, `../utils.ts`) — matches the established pattern in other smoke-tested modules (`migrate-chart.ts`, `views/schema.ts`, `partner-config/pair.ts`).
- **Files modified:** `src/lib/partner-lists/derived-lists.ts` (3 import lines)
- **Verification:** Both smoke tests pass; `tsc --noEmit` still clean (TS resolves both alias and relative paths)
- **Committed in:** `1f298c6` (Task 1 commit)

**2. [Rule 2 - Missing Critical] activeListId sanitization for derived-list deletes**
- **Found during:** Task 2 design review (active-partner-list provider behavior)
- **Issue:** When a derived list is "deleted" (sonner toast only — no storage mutation), the user might still have it set as active. The hook returns undefined for derived ids, so the activeListId stays set, but the list re-materializes on next render — meaning activeListId remains valid. No actual bug, but worth verifying the sanitizer doesn't fire unnecessarily.
- **Fix:** No code change needed — verified the existing `ActivePartnerListProvider` sanitizer effect uses `lists.some((l) => l.id === activeListId)`, and since derived lists ARE in the merged `lists` array (re-materialized every render), the sanitizer correctly leaves activeListId alone. Documented this explicitly in the sidebar group's `handleDelete` comment.
- **Files modified:** None (verification only)
- **Verification:** Code review confirms behavior; no runtime test changes needed.

**3. [Rule 3 - Blocking] No project-level `npm run typecheck` script**
- **Found during:** Task 1 verification (plan calls `npm run typecheck`)
- **Issue:** package.json doesn't define a `typecheck` script. Phase 39-01 SUMMARY notes this implicitly — it ran `npx tsc --noEmit` directly.
- **Fix:** Used `npx tsc --noEmit` for all typecheck verifications throughout plan execution. Did NOT add a new script — that's a separate hygiene concern outside this plan's scope.
- **Files modified:** None
- **Verification:** All three task-level typecheck runs are clean (only the pre-existing axe-core deferred error).

---

**Total deviations:** 3 auto-fixed (1 blocking imports + 1 verification + 1 verification-method).
**Impact on plan:** All three are minor. The smoke-test relative-path conversion preserves the plan's intent (smoke tests run via `node --experimental-strip-types`). No architectural changes.

## Issues Encountered

### Pre-existing `npm run build` CSS compilation failure (deferred)

`npm run build` continues to fail on the pre-existing `CssSyntaxError: Missed semicolon` in `src/app/globals.css` (Phase 38 / Tailwind v4 / Turbopack regression). Per the `<auto_advance>` directive, this is treated as a known pre-existing issue unrelated to plan 39-03 work. Verification via `npx tsc --noEmit` (clean), `npm run check:tokens` (green), `npm run check:surfaces` (green), and the two new smoke tests (pass) is sufficient.

Already logged in `.planning/phases/39-partner-config-module/deferred-items.md` from Phase 39-01.

## User Setup Required

None — Phase 39-03 is purely additive UI/data-layer work; no external service configuration needed.

## Next Phase Readiness

- **Plan 39-04 (Segment-split charts/KPIs) ready:** PartnerListFilters now supports SEGMENT, and the filter-evaluator threads through `segmentResolver` from `usePartnerConfigContext`. Plan 39-04 can wire the same resolver into chart/KPI computation paths to apply per-segment filtering.
- **PCFG-06 closed:** PartnerListFilters extended with PRODUCT_TYPE + SEGMENT, schema additive-optional, derived auto-lists generated and surfaced.
- **PCFG-07 (final phase 39 requirement):** No new dependencies introduced by this plan; downstream Snowflake-storage migration (deferred) can read the new schema shape directly.
- **Outstanding:** pre-existing `globals.css` build failure (see Deferred Items). Does not block dev or smoke tests, only `npm run build`.

## Self-Check: PASSED

- Created files exist on disk: `src/lib/partner-lists/derived-lists.ts`, `src/lib/partner-lists/derived-lists.smoke.ts`, `src/lib/partner-lists/schema.additive-segment.smoke.ts` (all verified)
- Per-task commits exist in git log: `1f298c6` (Task 1), `d33ccdb` (Task 2), `67f2783` (Task 3) — all reachable from HEAD
- Smoke tests pass: `npm run smoke:derived-lists` (8 assertions) ✓, `npm run smoke:schema-additive-segment` (6 assertions) ✓
- Typecheck clean across repo (excluding pre-existing axe-core deferred error)
- check:tokens + check:surfaces green
- Build fails on pre-existing globals.css issue (deferred — Phase 39-01 deferred-items.md, expected per auto_advance)

---

*Phase: 39-partner-config-module*
*Completed: 2026-04-25*
