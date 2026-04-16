---
phase: 25-code-health-bug-fixes
plan: 04
subsystem: code-health
tags: [react-19, react-compiler, usememo, useeffect, tanstack-table, hydration, refs]

# Dependency graph
requires:
  - phase: 24-stabilization
    provides: baseline KNOWN-ISSUES.md catalog with KI-12, KI-13, KI-14 flagged
  - phase: 25-code-health-bug-fixes
    provides: KI-22 cleanups (Plan A) and section error boundaries (Plan B) already applied; shared files de-conflicted
provides:
  - 2 KI-13 setState-in-effect refactors (column-group.tsx derived state, save-view-input.tsx onChange reset)
  - 3 KI-13 intentional opt-outs with inline justification comments (SSR hydration x2, sort-reset fire timing x1)
  - 1 KI-14 refactor (data-table.tsx setActivePresetRef moved to useEffect assignment)
  - 2 KI-14 intentional opt-outs with TanStack v8 pointer comments (useStableReactTable)
  - 2 KI-12 dep-array fixes (data-display.tsx tableData, batchCurve — sub-properties → object refs)
  - 1 KI-12 scoped opt-out (lib/table/hooks.ts columns memo — eslint-disable line-scoped, not function-wide)
  - KI-12, KI-13, KI-14 closed in docs/KNOWN-ISSUES.md with per-site notes
  - Summary table reconciled (Architecture 7→4, Medium 8→5, Total 20→17)
affects: [future React Compiler work, TanStack v9 migration, any refactor touching useStableReactTable]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Per-site pragmatic disposition for Compiler/anti-pattern warnings: fix only when the refactor is a clean drop-in; otherwise opt out with a one-line justification comment naming the constraint"
    - "Scope opt-outs narrowly: prefer eslint-disable-next-line over function-level 'use no memo' so Compiler can still optimize the rest of the hook/component"
    - "Document intent at the opt-out site, not in a separate doc — future passes read the code first"

key-files:
  created: []
  modified:
    - src/components/columns/column-group.tsx
    - src/components/views/save-view-input.tsx
    - src/hooks/use-column-management.ts
    - src/hooks/use-saved-views.ts
    - src/lib/table/hooks.ts
    - src/components/table/data-table.tsx
    - src/components/data-display.tsx
    - docs/KNOWN-ISSUES.md

key-decisions:
  - "KI-12 site 3 (lib/table/hooks.ts columns memo): scoped the opt-out to a single eslint-disable-next-line rather than a function-level 'use no memo' directive — the surrounding useDataTable hook has other memos (columnPinning, meta) that still benefit from Compiler optimization"
  - "KI-14 site 3 (data-table.tsx setActivePresetRef): useEffect assignment is safe because markCustomPreset only fires from user-initiated handlers that run after commit — click-verified in the browser, no one-render lag"
  - "KI-13 sites 2 & 3 (localStorage hydration effects): explicitly opted out — reading localStorage during render breaks Next.js SSR hydration, so these are deliberate patterns and must stay"
  - "KI-13 site 5 (lib/table/hooks.ts sort-reset effect): opted out — the reset must land after the new columns commit so TanStack's sortedRowModel sees a consistent (columns, sorting=[]) pair; a useMemo-based guard would shift timing"
  - "KI-14 sites 1 & 2 (useStableReactTable ref-access): opted out — intentional React-19 workaround for TanStack Table v8; fix requires TanStack v9 migration which is out of scope for this phase"

patterns-established:
  - "'Fix where safe, opt out where a rewrite risks UX shift' — per-site pragmatism is codified in the KNOWN-ISSUES resolution blocks"
  - "Every opt-out carries an inline comment naming the constraint (SSR hydration, TanStack v8, render-time options mutation, fire-timing sensitivity) so it does not re-trigger future passes"
  - "Escalation via checkpoint when behavior-verification is required rather than silent revert"

requirements-completed: [HEALTH-03, HEALTH-04, HEALTH-05]

# Metrics
duration: 33 min
completed: 2026-04-16
---

# Phase 25 Plan 04: Resolve KI-12, KI-13, KI-14 (Compiler + Effect + Ref Anti-Patterns) Summary

**Per-site disposition of 11 React anti-pattern sites across 7 files: 5 clean refactors, 6 intentional opt-outs with inline justification comments, and KI-12/KI-13/KI-14 all closed in KNOWN-ISSUES.md without any behavior regression.**

## Performance

- **Duration:** 33 min (including checkpoint deliberation)
- **Started:** 2026-04-16T18:30:00Z (approx — first task commit at 14:31 local)
- **Completed:** 2026-04-16T19:03:36Z
- **Tasks:** 5 (4 auto + 1 checkpoint)
- **Files modified:** 8 (7 source + 1 docs)

## Accomplishments

- KI-13 dispositioned 5/5: 2 clean refactors (column-group.tsx, save-view-input.tsx), 3 intentional opt-outs (use-column-management.ts, use-saved-views.ts, lib/table/hooks.ts:140) — each with inline comment
- KI-14 dispositioned 3/3: 1 clean refactor (data-table.tsx:159 setActivePresetRef → useEffect), 2 intentional opt-outs (lib/table/hooks.ts:86 and :98 TanStack v8 workaround)
- KI-12 dispositioned 3/3: 2 dep-array fixes (tableData, batchCurve), 1 scoped opt-out (columns memo in useDataTable)
- `docs/KNOWN-ISSUES.md` reconciled: Resolved blocks with per-site notes for KI-12/13/14; summary table Architecture 7→4, Medium 8→5, Total 20→17
- Preset activation behavior click-verified in the browser after the KI-14 site 3 refactor (no one-render lag)
- `pnpm build` emits no new React Compiler warnings for the 3 KI-12 lines

## Task Commits

Each task was committed atomically:

1. **Task 1: KI-13 clean refactors + opt-outs (5 sites)** — `1973191` (refactor)
2. **Task 2: KI-14 refactor attempt + opt-outs (3 sites)** — `222dd33` (refactor)
3. **Task 3: KI-12 decisions (3 sites)** — `9320c03` (refactor)
4. **Task 4: Checkpoint — surface escalations** — (checkpoint, no commit; user approved 3 escalations without changes)
5. **Task 5: Close KI-12, KI-13, KI-14 in KNOWN-ISSUES.md** — `d2fa25e` (docs)

**Plan metadata:** follow-up commit will include this SUMMARY.md plus STATE.md/ROADMAP.md updates.

## Per-Site Disposition Table

### KI-13 (setState-in-effect, 5 sites)

| Site | File:Line | Disposition | Notes |
|------|-----------|-------------|-------|
| 1 | `src/components/columns/column-group.tsx:127` | **FIX** | `manualExpanded` + `searchAutoExpanded` → derived `expanded`. Auto-expand on search is now pure derivation; manual toggle stores a boolean override. |
| 2 | `src/hooks/use-column-management.ts:40` | **OPT-OUT** | Inline SSR hydration-guard comment. localStorage → state effect is deliberate to avoid Next.js hydration mismatch. |
| 3 | `src/hooks/use-saved-views.ts:68` | **OPT-OUT** | Same SSR hydration-guard pattern and comment. |
| 4 | `src/components/views/save-view-input.tsx:37` | **FIX** | New `handleNameChange` callback wired to onChange resets `showReplace` inline. Other setters of `name` (handleSave, handleCancel) already reset `showReplace` synchronously. No external `setName` callers exist; belt-and-suspenders internal guard was discussed at the checkpoint and declined by the user. |
| 5 | `src/lib/table/hooks.ts:140` | **OPT-OUT** | Inline comment on sort-reset effect. Fire timing is sensitive: reset must land after new columns commit so TanStack's sortedRowModel sees `(columns, sorting=[])` consistently. |

### KI-14 (ref-access-during-render, 3 sites)

| Site | File:Line | Disposition | Notes |
|------|-----------|-------------|-------|
| 1 | `src/lib/table/hooks.ts:86` | **OPT-OUT** | `tableRef.current.setOptions(...)` during render. Intentional React-19 workaround for TanStack Table v8. Inline comment plus expanded block comment point to v9 migration as the fix. |
| 2 | `src/lib/table/hooks.ts:98` | **OPT-OUT** | Same `useStableReactTable` function; `return tableRef.current;` during render. Same justification. |
| 3 | `src/components/table/data-table.tsx:159` | **FIX** | `setActivePresetRef.current = setActivePreset` moved into dep-less `useEffect`. Safe because `markCustomPreset` only fires from user-initiated handlers (post-commit). Click-verified: preset activation is immediate, no lag. |

### KI-12 (React Compiler memoization warnings, 3 sites)

| Site | File:Line | Disposition | Notes |
|------|-----------|-------------|-------|
| 1 | `src/components/data-display.tsx:147` | **FIX** | `tableData` deps: `[data?.data, accountData?.data, drillState.level, drillState.partner]` → `[data, accountData, drillState]`. Object refs are stable (TanStack Query + useDrillDown) so no extra recomputes. |
| 2 | `src/components/data-display.tsx:161` | **FIX** | `batchCurve` deps: sub-properties → `[drillState, partnerStats]`. Same rationale. |
| 3 | `src/lib/table/hooks.ts:127` | **OPT-OUT (scoped)** | `options` is a fresh literal on every render inside `DataTable`; broadening deps would thrash the memo. Opt-out scoped to a single `eslint-disable-next-line react-hooks/preserve-manual-memoization` with a one-line justification so the rest of `useDataTable` stays Compiler-optimized. Sub-property deps preserved. |

**Totals:** 5 refactors, 6 opt-outs — every opt-out has a source-file inline comment naming the constraint.

## Files Created/Modified

- `src/components/columns/column-group.tsx` — Replaced `useEffect([searchFilter, filteredColumns]) → setExpanded(true)` with `const expanded = manualExpanded ?? searchAutoExpanded`; toggle button now sets `manualExpanded` to an explicit boolean.
- `src/components/views/save-view-input.tsx` — Removed `useEffect([name]) → setShowReplace(false)`; added `handleNameChange` callback (wired to onChange) that resets both `name` and `showReplace` synchronously.
- `src/hooks/use-column-management.ts` — Added inline SSR hydration-guard comment above the localStorage→state effect.
- `src/hooks/use-saved-views.ts` — Same SSR hydration-guard comment.
- `src/lib/table/hooks.ts` — (1) Expanded block comment + per-line markers on `useStableReactTable` ref-write/read during render. (2) Scoped `eslint-disable-next-line react-hooks/preserve-manual-memoization` on `columns` memo with justification. (3) Opt-out comment on sort-reset effect explaining fire-timing sensitivity. (4) `Updater`/`TableState` imports already removed by Plan A.
- `src/components/table/data-table.tsx` — `setActivePresetRef.current = setActivePreset` moved from render into a dep-less `useEffect`.
- `src/components/data-display.tsx` — `tableData` and `batchCurve` dep arrays changed from sub-properties to object refs.
- `docs/KNOWN-ISSUES.md` — KI-12, KI-13, KI-14 each gained a Resolved block with per-site notes and commit hashes. Summary table: Architecture 7→4, Medium 8→5, Total 20→17.

## Decisions Made

- **KI-12 site 3 opt-out scope:** Single-line `eslint-disable` instead of function-level `'use no memo'`. Rationale: `useDataTable` contains `columnPinning`, `meta`, and other memos that still benefit from Compiler optimization; a function-wide opt-out would broaden the disable unnecessarily.
- **KI-14 site 3 approach:** `useEffect` assignment over `useEffectEvent`. Rationale: the ref-consumer (`markCustomPreset` in `useColumnManagement`) only fires from user handlers that run after commit. A plain `useEffect` (no deps, runs after every render) is the minimal change that satisfies both the Compiler and the original non-re-subscribing call site semantics.
- **KI-13 site 4 internal guards declined:** User approved "skip" at the Task 4 checkpoint for adding defensive `setShowReplace(false)` calls adjacent to internal `setName('')` calls inside `handleSave` / `handleCancel`. Rationale: those handlers already reset `showReplace` alongside the `setName('')` they perform, so the belt-and-suspenders addition is redundant.
- **Three escalations surfaced at the checkpoint, all approved:** (a) KI-12 site 3 opt-out was accepted without dev-run thrashing test, (b) KI-14 site 3 useEffect refactor was click-verified in the browser post-checkpoint, (c) KI-13 site 4 internal guards were skipped.

## Deviations from Plan

None — plan executed exactly as written. Every fix/opt-out decision in the plan's inventory was honored, and the three judgement calls flagged for checkpoint were resolved with user approval without deviating from the planned site-level dispositions.

## Issues Encountered

- **Behavior-verification required before committing KI-14 site 3:** The `useEffect` assignment introduced a theoretical risk of a one-render lag between the latest `setActivePreset` being set on the ref and a consumer reading it. Resolved by click-verifying preset activation in the browser during the checkpoint (Task 4) — preset indicator snaps immediately, no lag. This was surfaced and approved at the checkpoint rather than resolved silently.
- **KI-12 site 3 alternative considered:** Pre-stabilizing `options` in the `DataTable` caller via `useMemo` would let the memo depend on the object ref cleanly, but it would shift Compiler-related complexity from `useDataTable` into every caller. The scoped eslint-disable is a simpler, more local opt-out.

## User Setup Required

None — pure refactor, no external service configuration.

## Next Phase Readiness

- Plan D completes the final plan in Phase 25 (Plan A / Plan B / Plan C / Plan D all shipped). All three KIs are closed; summary counts reconciled.
- Phase 25 is ready for closure. Next step per the roadmap: Phase 26 (TBD — user/product decision).
- Opt-out comments are scoped and specific so future passes (React Compiler upgrades, TanStack v9 migration) can re-assess without re-discovering the original intent.

## Self-Check: PASSED

Verified:
- All 8 modified files present on disk (via `git diff` against 846ed5e baseline)
- Task commits present in `git log`: `1973191` (KI-13), `222dd33` (KI-14), `9320c03` (KI-12), `d2fa25e` (KNOWN-ISSUES)
- KI-12, KI-13, KI-14 each have a "Resolved" block in `docs/KNOWN-ISSUES.md` (verified via `grep -A 15 "^### KI-XX:" ... | grep -q Resolved`)
- Summary table reconciled: Architecture 4, Medium 5, Total 17
- Every opt-out site in source has an inline comment naming the constraint (SSR hydration, TanStack v8, fire timing, options thrashing)

---
*Phase: 25-code-health-bug-fixes*
*Completed: 2026-04-16*
