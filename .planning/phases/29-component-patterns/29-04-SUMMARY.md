---
phase: 29-component-patterns
plan: 04
subsystem: ui
tags: [react, tailwind, tokens, toolbar, patterns]

requires:
  - phase: 26-design-tokens
    provides: bg-border token used by divider recipe
  - phase: 27-typography-hierarchy
    provides: type-token discipline honored by specimen
  - phase: 29-component-patterns (plan 02 DataPanel, plan 03 EmptyState)
    provides: /tokens specimen file naming convention (patterns-specimen-*.tsx)
provides:
  - ToolbarDivider sibling component with canonical recipe (mx-0.5 h-4 w-px bg-border, aria-hidden)
  - Migrated unified-toolbar.tsx — 2 raw divider divs replaced by <ToolbarDivider />
  - /tokens specimen — 3-cluster toolbar mock (not yet wired into token-browser; Plan 05 aggregates)
affects: [phase-29-plan-05-aggregator, future-toolbar-surfaces]

tech-stack:
  added: []
  patterns:
    - "Sibling divider pattern — <ToolbarDivider /> placed between cluster siblings (vs wrapping in ToolbarGroup) preserves conditional-rendering shape and matches the h-4 w-px bg-border recipe already in place"
    - "Tiny server-safe pattern component — no 'use client', no hooks, no handlers; single optional className prop composed via cn()"

key-files:
  created:
    - src/components/patterns/toolbar-divider.tsx
    - src/components/tokens/patterns-specimen-toolbar.tsx
    - .planning/phases/29-component-patterns/deferred-items.md
  modified:
    - src/components/toolbar/unified-toolbar.tsx

key-decisions:
  - "Sibling-pattern over ToolbarGroup wrapper (resolved decision #5) — less invasive migration, preserves today's isRoot conditional rendering shape without restructuring cluster nesting"
  - "No conditional guards on migrated dividers — Pitfall 5 analysis confirmed both sites are always flanked by at least one visible button (Columns/Sort always render; Export/SaveView always render); stray-divider risk is nil"
  - "comparison-matrix.tsx:110 mx-1 divider explicitly out of scope — per resolved decision #5 scope reduction; Plan 05's grep guard will audit (allowlist + inline justification OR flag for separate sweep)"
  - "Specimen NOT wired into token-browser.tsx — Plan 05 aggregator owns wiring; keeps each pattern plan's scope to its own file(s)"

patterns-established:
  - "Sibling vertical divider: import { ToolbarDivider } from '@/components/patterns/toolbar-divider'; place between cluster siblings"
  - "Pattern-directory layout: src/components/patterns/{name}.tsx + src/components/tokens/patterns-specimen-{name}.tsx — one source-of-truth file + one /tokens demo"

requirements-completed: [DS-21]

duration: 2min
completed: 2026-04-18
---

# Phase 29 Plan 04: ToolbarDivider Summary

**ToolbarDivider sibling component (mx-0.5 h-4 w-px bg-border, aria-hidden) shipped; 2 raw divider divs in unified-toolbar.tsx migrated; /tokens specimen staged for Plan 05 aggregator wire-up.**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-04-18T04:18:05Z
- **Completed:** 2026-04-18T04:19:52Z
- **Tasks:** 2
- **Files modified:** 3 (2 created, 1 modified)

## Accomplishments

- Shipped `src/components/patterns/toolbar-divider.tsx` — tiny server-safe `<ToolbarDivider />` with the canonical `mx-0.5 h-4 w-px bg-border` recipe + `aria-hidden` and an optional className override.
- Migrated `src/components/toolbar/unified-toolbar.tsx` — both raw `<div className="mx-0.5 h-4 w-px bg-border" />` sites (previously at lines ~168, ~236) replaced by `<ToolbarDivider />`. Grep guard confirms zero raw recipes remain in the file; 3 ToolbarDivider references (1 import + 2 JSX usages).
- Added `/tokens` specimen (`src/components/tokens/patterns-specimen-toolbar.tsx`) rendering a 3-cluster toolbar mock with 2 dividers, ready for Plan 05 to wire into `token-browser.tsx`.

## Task Commits

1. **Task 1: Create ToolbarDivider component and /tokens specimen** — `51e99e0` (feat)
2. **Task 2: Migrate unified-toolbar.tsx dividers** — `560a036` (refactor)

**Plan metadata:** _this commit_ (docs: complete plan)

## Files Created/Modified

- `src/components/patterns/toolbar-divider.tsx` (created) — Sibling vertical divider component; single named export, optional className, aria-hidden.
- `src/components/tokens/patterns-specimen-toolbar.tsx` (created) — /tokens demo rendering a 3-cluster mock toolbar with 2 ToolbarDividers inside a surface-raised card.
- `src/components/toolbar/unified-toolbar.tsx` (modified) — Added `ToolbarDivider` import; replaced 2 raw divider divs with `<ToolbarDivider />`; no other changes.
- `.planning/phases/29-component-patterns/deferred-items.md` (created) — Logs pre-existing build errors in files unrelated to this plan (collection-curve-chart, data-display EmptyState call) verified via baseline stash-compare; owners are prior-phase refactors and Plan 05 EmptyState migration.

## Decisions Made

- **Sibling pattern locked over ToolbarGroup wrapping.** Honors resolved decision #5 — less invasive, preserves today's `isRoot` conditional rendering shape without restructuring cluster nesting.
- **No conditional `{isRoot && <ToolbarDivider />}` guards added.** Pitfall-5 analysis: the first divider sits between [Query, Anomalies, Charts] (always) and [Preset?, Heatmap?, Columns, Sort, Filters?] — Columns + Sort always render, so the right side is always visible. The second divider sits between […Filters?] and [Export, SaveView] — Export + SaveView always render. Both dividers always flanked by visible content; no stray-divider scenario to guard against.
- **comparison-matrix.tsx:110 mx-1 divider left as-is.** Per resolved decision #5 scope reduction, this plan scopes to `unified-toolbar.tsx` only. Different margin (`mx-1` vs `mx-0.5`), conditional on `viewMode !== 'bar'`, lives inside a DataPanel actions cluster. Plan 05's `check:components` grep guard will sweep it — either allowlist with inline justification or flag for a separate migration pass.
- **Specimen not yet wired into `token-browser.tsx`.** Plan 05 aggregator owns wiring. Keeps each pattern plan's scope bounded to its own file(s).

## Deviations from Plan

None — plan executed exactly as written. No auto-fixes applied within the plan's scope.

## Issues Encountered

**Pre-existing `npm run build` type errors (out of scope).** `npm run build` fails with TypeScript errors in `src/components/charts/collection-curve-chart.tsx:69` (missing `getChartSnapshot` on `useCurveChartState` return) and `src/components/data-display.tsx:440` (missing `variant` on `<EmptyState />` call site introduced by Plan 29-03). Both errors were verified pre-existing by stashing the 29-04 working-tree changes and re-running `npm run build` — errors reproduce identically. Neither file is touched by 29-04. Logged in `.planning/phases/29-component-patterns/deferred-items.md`; owners are:
- `collection-curve-chart.tsx` — earlier-phase working-tree refactor of `use-curve-chart-state.ts` (uncommitted).
- `data-display.tsx` EmptyState call — Plan 29-05 (which migrates ad-hoc empty-state call sites and deletes legacy).

Scoped verification for this plan's files passes:
- `npm run check:tokens` — PASS (no ad-hoc text-size / font-weight classes introduced).
- `npm run check:surfaces` — PASS (no ad-hoc shadow / card-frame combos introduced).
- `npx tsc --noEmit` — zero errors in the three files 29-04 touched (`toolbar-divider.tsx`, `patterns-specimen-toolbar.tsx`, `unified-toolbar.tsx`).
- Grep guard `grep -c "h-4 w-px bg-border" src/components/toolbar/unified-toolbar.tsx` — 0.
- Grep guard `grep -c "ToolbarDivider" src/components/toolbar/unified-toolbar.tsx` — 3.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- **DS-21 partially satisfied.** `unified-toolbar.tsx` sites migrated; `comparison-matrix.tsx:110` audit is owed by Plan 29-05.
- **Specimen ready for Plan 05 wire-up.** `ToolbarSpecimen` exported from `src/components/tokens/patterns-specimen-toolbar.tsx`; Plan 05 aggregator imports it alongside StatCard/DataPanel/EmptyState specimens.
- **Plan 29-05 enforcement guard (`check:components`) should:**
  1. Flag any raw `h-4 w-px bg-border` occurrences in `src/` outside the pattern file itself.
  2. Audit `comparison-matrix.tsx:110` `mx-1 h-4 w-px bg-border` — decide allowlist + justification OR migrate in a separate follow-up.
  3. Consider asserting `grep -c ToolbarDivider src/components/toolbar/unified-toolbar.tsx >= 3` as a regression guard against future raw-divider reintroduction.
- **Build-error owners outside this plan.** Two pre-existing type errors need resolution before full `npm run build` passes again — tracked in `deferred-items.md`.

## Self-Check: PASSED

All claimed artifacts verified:
- FOUND: src/components/patterns/toolbar-divider.tsx
- FOUND: src/components/tokens/patterns-specimen-toolbar.tsx
- FOUND: src/components/toolbar/unified-toolbar.tsx
- FOUND: .planning/phases/29-component-patterns/29-04-SUMMARY.md
- FOUND: .planning/phases/29-component-patterns/deferred-items.md
- FOUND: commit 51e99e0 (Task 1)
- FOUND: commit 560a036 (Task 2)

---
*Phase: 29-component-patterns*
*Completed: 2026-04-18*
