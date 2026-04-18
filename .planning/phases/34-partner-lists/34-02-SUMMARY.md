---
phase: 34-partner-lists
plan: 02
subsystem: ui
tags: [partner-lists, sidebar, filter-before-aggregate, react-context, sonner]

# Dependency graph
requires:
  - phase: 34-partner-lists
    plan: 01
    provides: "usePartnerLists() CRUD hook + ActivePartnerListProvider context"
  - phase: 25-filter-quality
    provides: "filter-before-aggregate contract + getPartnerName helper"
provides:
  - "<PartnerListsSidebarGroup /> — sidebar group renderer with activate/edit/delete"
  - "PartnerListsProvider — single upstream usePartnerLists() call + nested ActivePartnerListProvider"
  - "usePartnerListsContext() — consume shared lists + CRUD from any descendant"
  - "SidebarDataPopulator.allowedPartnerIds prop — narrows displayed partners without changing roster source"
  - "filteredRawData now filters by activeList.partnerIds AFTER dimension filters (single path)"
affects: [34-03-creation-dialog, 34-04-integration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Upstream-provider / downstream-consumer pattern for usePartnerLists — hook is called ONCE in PartnerListsProvider (providers.tsx tree) and distributed via context to siblings (AppSidebar, DataDisplay). Alternative option-(a) prop threading only works when both consumers share a parent; in this tree they do not."
    - "Additive filter-pass in filteredRawData — dimension filters first, then activeList.partnerIds narrowing. Keeps the Phase 25 filter-before-aggregate contract intact (one memo, one path) while layering the new semantic."
    - "Display-scoping prop (allowedPartnerIds: string[] | null) that narrows DISPLAY without changing the source roster — preserves Phase 25 navigation-integrity lock on SidebarDataPopulator.allData while letting active-list activation visually scope the Partners sidebar section."
    - "Stacked SidebarMenuAction hover actions via className='right-7' + default right-1 — composes cleanly with the shadcn primitive's absolute positioning instead of a popover fallback."

key-files:
  created:
    - "src/components/partner-lists/partner-lists-sidebar-group.tsx"
    - "src/contexts/partner-lists.tsx"
  modified:
    - "src/app/providers.tsx"
    - "src/components/layout/app-sidebar.tsx"
    - "src/components/data-display.tsx"

key-decisions:
  - "ActivePartnerListProvider placement escalated from app-sidebar.tsx to providers.tsx — AppSidebar and DataDisplay are siblings under SidebarProvider in layout.tsx, so the provider must live higher than both. PartnerListsProvider wraps usePartnerLists() and nests ActivePartnerListProvider with the shared lists array."
  - "Option (a) prop-threading (plan default) replaced with option (b) context-provider — option (a) requires both consumers under one component; they aren't. PartnerListsProvider solves this with a single upstream hook call + downstream context broadcast. Plan's escalation clause anticipated this."
  - "Stacked SidebarMenuAction (edit + delete) via className='right-7' override on the edit action, keeping delete at default right-1. Chose the two-action recipe over the popover-menu fallback the plan floated — shadcn SidebarMenuAction composes cleanly via its className override, no base-ui popover needed."
  - "Empty-state row uses a disabled SidebarMenuButton with the text-caption token on the label (NOT the EmptyState pattern primitive) — matches the existing 'No saved views' treatment in app-sidebar.tsx and respects the plan's sidebar-idiom lock."
  - "No-op onCreateList / onEditList handlers in app-sidebar.tsx with inline 'Wired by Plan 03' comments — scope boundary with Plan 03's CreateListDialog; no placeholder toast, no disabled styling (the buttons render but clicking them is inert)."
  - "filteredRawData memo extended with a SECOND filter pass (not a separate memo) — keeps a single source of truth; downstream consumers (partnerStats, tableData, cross-partner providers, QueryCommandDialog) inherit the list filter automatically with zero per-site edits."
  - "SidebarDataPopulator.allowedPartnerIds: string[] | null prop — null sentinel = no active list = render everyone. Prop threads from data-display.tsx only; no other src/ file reads it. Roster source (allData) stays data.data per Phase 25 lock."

patterns-established:
  - "Upstream single-hook-call + downstream context provider — any future user-owned collection hook (usePartnerLists, useSavedViews, etc.) that needs to feed siblings should follow this shape: a provider file that owns the hook call and exposes its return value via createContext."
  - "Additive-filter layering inside filteredRawData — Phase 25 dimension-filter pass, then Phase 34 partner-list pass, both inside the same useMemo. Next additive layer (e.g., date-range, anomaly-only) slots in as a third pass with zero architectural change."
  - "Display-scoping prop pattern (allowedIds: string[] | null) — narrows what a component RENDERS without changing its DATA SOURCE. Applied to SidebarDataPopulator here; reusable for any surface that needs to conditionally restrict display while preserving nav/integrity semantics."

requirements-completed: [LIST-03, LIST-05]

# Metrics
duration: ~5 min
completed: 2026-04-18
---

# Phase 34 Plan 02: Partner Lists Sidebar + Filter Wiring Summary

**Partner Lists sidebar group + cross-app activation wire-through: new sidebar section with activate/rename/delete (sonner undo), shared PartnerListsProvider in providers.tsx, and a single-path extension of filteredRawData that threads activeList through the Phase 25 filter-before-aggregate pipeline.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-04-18T19:32:42Z
- **Completed:** 2026-04-18T19:37:11Z
- **Tasks:** 3
- **Files created:** 2 (partner-lists-sidebar-group.tsx, contexts/partner-lists.tsx)
- **Files modified:** 3 (providers.tsx, app-sidebar.tsx, data-display.tsx)

## Accomplishments

- `PartnerListsSidebarGroup` component with full activate/edit/delete flow (rename delegated to Plan 03).
- Sonner undo toast on delete, mirroring `handleDeleteView` exactly (5s duration, restoreList callback).
- Shared `PartnerListsProvider` ensures a single upstream `usePartnerLists()` call; sibling consumers (sidebar + data-display) read from the same context.
- `ActivePartnerListProvider` now lives in `providers.tsx`, wrapping both `<AppSidebar />` and `<DataDisplay />` (previously orphaned).
- `filteredRawData` memo extended with an additive second pass (activeList.partnerIds narrowing) — downstream consumers (KPIs, trajectory chart, comparison matrix, table, QueryCommandDialog) inherit the list filter with zero per-site edits.
- `SidebarDataPopulator` narrows its displayed partners via `allowedPartnerIds` when a list is active; roster source remains `data.data` (Phase 25 lock preserved).
- All 4 check:* guards green + `npm run build` succeeds with zero TS errors.

## Task Commits

Each task was committed atomically:

1. **Task 1: PartnerListsSidebarGroup component** — `1aa72b6` (feat)
2. **Task 2: Wire sidebar + shared provider** — `e9b2f20` (feat)
3. **Task 3: filteredRawData + SidebarDataPopulator threading** — `e275f6f` (feat)

**Plan metadata commit:** pending final docs commit.

## Files Created/Modified

Created:
- `src/components/partner-lists/partner-lists-sidebar-group.tsx` — sidebar group component (136 lines) with activate/edit/delete + sonner undo.
- `src/contexts/partner-lists.tsx` — `PartnerListsProvider` owning the single `usePartnerLists()` call and nesting `ActivePartnerListProvider`.

Modified:
- `src/app/providers.tsx` — wrapped children in `<PartnerListsProvider>` between `SidebarDataProvider` and the app tree.
- `src/components/layout/app-sidebar.tsx` — imported `PartnerListsSidebarGroup` + `usePartnerListsContext`; rendered the group as the first child of `<SidebarContent>`; wired `lists` + `deleteList` + `restoreList` as props.
- `src/components/data-display.tsx` — imported `useActivePartnerList`; extended `filteredRawData` with an active-list filter pass; added `allowedPartnerIds` prop to `SidebarDataPopulator` and narrowed its partner roster display when non-null.

## Decisions Made

- **Provider location** — `ActivePartnerListProvider` mounted in `providers.tsx` (not `app-sidebar.tsx`) because `AppSidebar` and `DataDisplay` are siblings under `SidebarProvider` in `layout.tsx`. Plan's escalation clause anticipated this exact tree shape.
- **Single-hook-call strategy** — Created `PartnerListsProvider` + `usePartnerListsContext()` rather than the plan's default option-(a) prop threading. Prop threading only works when consumers share a parent; they don't in this layout tree.
- **Stacked SidebarMenuAction recipe** — Edit action gets `className="right-7"`, delete stays at default `right-1`. Shadcn's primitive composes cleanly via className override; the popover fallback the plan floated is unnecessary here.
- **Empty-state row idiom** — Disabled `SidebarMenuButton` + `text-caption text-muted-foreground` on the label (matches `No saved views` treatment); not the `EmptyState` pattern primitive (which is for main-surface empties).
- **No-op onCreateList / onEditList** — Handlers left as `() => { /* Wired by Plan 03 */ }` with inline comments. Clicking the '+' is inert until Plan 03 lands; this is the documented scope boundary.
- **Additive filter layering** — `filteredRawData` extended with a second pass (activeList.partnerIds) AFTER dimension filters. Single memo, single source of truth, zero downstream changes.
- **Display-scoping prop shape** — `allowedPartnerIds: string[] | null` on `SidebarDataPopulator`; `null` = show everyone, non-null = narrow. Preserves `allData = data.data` (Phase 25 navigation-integrity lock) while letting an active list visually scope the Partners sidebar section.

## Deviations from Plan

### Auto-fixed Issues

None required. The plan's option-(a) "thread CRUD as props from AppSidebar" was swapped to option (b) via `PartnerListsProvider`, but this was an explicit escalation path the plan itself anticipated ("if AppSidebar is structured such that its JSX does NOT encompass data-display.tsx, escalate: the provider must live HIGHER in the tree"). Not a deviation — a documented branch.

### Scope Notes

- `PartnerListsProvider` is a new file not listed in the plan's `<output>` section (plan listed 1 new + 2 modified; actual is 2 new + 3 modified). The extra file (`src/contexts/partner-lists.tsx`) is the concrete mechanism by which the escalation clause was honored — pure scope mechanics, not scope expansion.

**Total deviations:** 0 auto-fixed, 1 anticipated-branch (provider escalation), 1 scope-mechanics note (extra provider file).
**Impact on plan:** Zero behavioral or API-contract change versus the plan's `<interfaces>` block. All public props for `PartnerListsSidebarGroupProps` match the revised Task 2 interface exactly.

## Issues Encountered

- None. All four guards (`check:tokens`, `check:surfaces`, `check:components`, `check:motion`) green from the first run of Task 1 onward; build passed at every task boundary.

## User Setup Required

None. Plan 02 ships a user-visible UI surface (empty Partner Lists group + inert "+" button in the header) but no external configuration. End-to-end verification (create → activate → filter cascade) becomes possible once Plan 03 ships the CreateListDialog; Plan 04 is the integration checkpoint.

## Next Phase Readiness

- **Plan 03** can import `usePartnerListsContext()` from `@/contexts/partner-lists` and call `createList({ source: 'attribute' | 'manual' })` directly. The CreateListDialog also needs to be mounted somewhere inside `PartnerListsProvider` — simplest location is adjacent to the sidebar group inside `<AppSidebar />` (hoist the dialog open-state up there, replace the no-op `onCreateList` / `onEditList` with `setDialogOpen(...)` calls).
- **Plan 04** can verify end-to-end: create a list via the dialog → click it in the sidebar → observe table/KPIs/charts all filter to the list → observe Partners sidebar section narrow to the list's members → delete via the sidebar's trash icon → undo via the toast.
- No blockers. All four requirements documented in this plan's frontmatter (LIST-03, LIST-05) are now functionally complete at the wiring layer; end-to-end verification lives in Plan 04.

## Self-Check: PASSED

- `src/components/partner-lists/partner-lists-sidebar-group.tsx` present on disk.
- `src/contexts/partner-lists.tsx` present on disk.
- `src/app/providers.tsx`, `src/components/layout/app-sidebar.tsx`, `src/components/data-display.tsx` modifications verified via git log + git diff.
- Commits `1aa72b6`, `e9b2f20`, `e275f6f` verified in `git log --oneline -5`.
- Acceptance contract: `rg activeList` in data-display.tsx returns 5 hits (import + hook call + 2 memo refs + JSX prop); `rg allowedPartnerIds` returns hits only in data-display.tsx; `rg PartnerListsSidebarGroup` returns hits only in its own file + app-sidebar.tsx.
- All four check scripts (tokens, surfaces, components, motion) + `npm run build` green.

---
*Phase: 34-partner-lists*
*Completed: 2026-04-18*
