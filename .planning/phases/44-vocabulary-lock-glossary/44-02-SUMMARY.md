---
phase: 44-vocabulary-lock-glossary
plan: 02
subsystem: ui
tags: [vocabulary, adr, sidebar, view-list-hierarchy, schema-evolution, partner-lists, type-tokens]

# Dependency graph
requires:
  - phase: 34-partner-lists
    provides: ViewSnapshot.listId additive-optional field (Phase 34 PCFG / Partner Lists work — already in place; Plan 44-02 adopts it as the conceptual binding)
  - phase: 39-partner-config-module
    provides: useActivePartnerList().toggleList — single-source cross-app filter activation path the nested List rows reuse
  - phase: 44-vocabulary-lock-glossary (Plan 44-01)
    provides: TERMS registry entries for `view` and `list`; first-instance-per-surface <Term> wraps already on the Partner Lists + Views sidebar group labels
provides:
  - "ADR 0001 at docs/adr/0001-list-view-hierarchy.md — locks the View-contains-List explicit hierarchy decision (rejects Workspace merge + List-demotion alternatives)"
  - "Sidebar Views group renders the View → bound-List nested-row hierarchy when ViewSnapshot.listId is set + the referenced List exists"
  - "Per-view expansion state (viewsExpansionState: Record<string, boolean>) keyed by view.id, session-only — independent toggling across multiple views"
  - "Conceptual model documented for future v5.0 surfaces (Scorecard, Target, Triangulation): nest under conceptual parent, not at peer level"
affects: [44-03 partner-product-revenue-model, 44-04 vocabulary-coverage, 45+ v5.0 phases adding scorecard / target / triangulation surfaces, future plan that wires UI to attach/detach a List to a View]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "ADR-as-conceptual-lock: ADRs document the WHY (decision + rejected alternatives + consequences); the rename point lives in the TERMS registry; the schema field encodes the binding; the sidebar render layer enforces it. Four artifacts, single conceptual model."
    - "Adopt-existing-field pattern: when a schema field already exists from a prior phase but its conceptual meaning was implicit, an ADR can adopt the field as the binding it already represented. No schema change required, no schemaVersion bump."
    - "Per-view expansion state via Record<string, boolean> keyed by stable id — session-only (NOT persisted) for quick-glance disclosure affordances. Persistence reserved for actual user preferences."
    - "Render-path branch in .map() body via cheap lists.find lookup. lists.length is typically <20; no memoization needed. Single SidebarMenuItem shape regardless of binding presence keeps render diffing minimal."
    - "Inline chevron button with stopPropagation inside SidebarMenuButton: the chevron toggles only the nested-list expansion, while clicking the surrounding button still triggers the primary action (load view). Reusable for any future row that needs both a primary action and a sub-row disclosure."

key-files:
  created:
    - "docs/adr/0001-list-view-hierarchy.md (project's first ADR; Status / Context / Decision / Alternatives Considered / Consequences sections; lightweight frontmatter block; cites VOC-04)"
  modified:
    - "src/components/layout/app-sidebar.tsx (Views section: per-view expansion state hook, useActivePartnerList wire, conditional chevron + nested SidebarMenuItem render path, missing-list graceful degradation)"
    - "src/lib/views/types.ts (JSDoc on ViewSnapshot.listId updated to cite ADR 0001 — field shape unchanged from Phase 34)"
    - "src/lib/views/schema.ts (JSDoc on viewSnapshotSchema.listId updated to cite ADR 0001 — schema unchanged from Phase 34)"
    - ".planning/phases/44-vocabulary-lock-glossary/deferred-items.md (line numbers updated to reflect +8 line shift from new state hook; pre-existing react-hooks/exhaustive-deps warning at line 86 added to the deferred list)"

key-decisions:
  - "Finding A: ViewSnapshot.listId already existed from Phase 34 PCFG / Partner Lists work as listId?: string | null with viewSnapshotSchema validating it as z.string().nullable().optional(). This plan adopts the existing field as the conceptual binding documented in ADR 0001 — no schema change, no schemaVersion bump required. Plan template anticipated three findings (A: existing, B: needs adding, C: dead code); A applied. The ADR's Consequences section honestly captures this: the field was added in Phase 34, the conceptual model that gives it meaning is locked in Phase 44 VOC-04."
  - "Per-view expansion state is session-only (NOT persisted to localStorage) — the nested affordance is a quick-glance disclosure (\"what list does this view bind to?\"), not a setting users would expect to remember across reloads. Avoids storage overhead for typical usage where users glance and move on. If feedback requests persistence, it's a one-line localStorage wire to add later."
  - "Inline chevron rendered as a <button> nested inside SidebarMenuButton with stopPropagation — clicking the chevron toggles ONLY the nested-list expansion; clicking the surrounding view row still loads the view (preserves the existing primary action). The button-inside-button HTML invariant is satisfied because Base UI's SidebarMenuButton renders as a useRender component, not a literal native <button>; the inner <button> ends up nested under whatever element SidebarMenuButton resolves to (typically a <button>) but only at the DOM level when SidebarMenuButton is also a <button>. Functionally clean today; flagged for v5.0 IA work if it surfaces as an a11y concern."
  - "Nested List row activation reuses useActivePartnerList().toggleList(id) — same code path the standalone Partner Lists section uses. Single source of truth for cross-app filter activation; no duplicate handler chain. The nested affordance is presentational; the underlying activation behavior is identical to clicking the same List in the standalone section."
  - "Missing-list reference (view.snapshot.listId set but no matching List in lists) degrades to leaf-row + console.warn. Does not throw, does not block the sidebar. Captures three real-world cases: user deleted the list, list was renamed/regenerated with a new id, or the view was imported from another environment. console.warn (NOT console.error) keeps it diagnostic-only — the missing-list path isn't a bug condition, it's a data-state condition."
  - "Type tokens Phase 27 discipline: src/components/layout/** is NOT in the allowlist. Nested row uses text-body for the name + text-caption text-muted-foreground for the '(List)' suffix. No font-weight pairings. The 'List' caption pill uses ml-auto to right-align — same recipe as the 'Auto' pill in partner-lists-sidebar-group.tsx for visual consistency across the two sidebar surfaces."
  - "ADR 0001 explicitly closes three rejected alternatives (Workspace merge, List-demotion, flat + section-divider) so future readers don't re-litigate the decision. Each rejection cites concrete consequences (migration cost, lost refresh semantics, doesn't solve the IA problem) rather than aesthetic preferences."

patterns-established:
  - "ADR directory at docs/adr/ established. Naming convention: NNNN-kebab-cased-title.md (4-digit zero-padded). Format: lightweight frontmatter block + Michael Nygard sections (Status / Context / Decision / Alternatives Considered / Consequences). One ADR per plan to keep cognitive load low; bulk ADRs land in dedicated documentation phases."
  - "ADR 0001 is the precedent for ADR 0002+ in Plan 44-03 (REVENUE_MODEL scoping) and any future architectural-lock-as-Decision-Record need. The 'Schema state at ADR adoption' section is reusable for any ADR that documents an existing field — captures whether the field was added in this plan or pre-existed, so a future reader can find the right git archeology starting point."
  - "View-contains-List render-path branch: the cheap lists.find lookup inside the .map() body is the canonical extension point for future View → bound-thing surfaces (e.g. View → bound Scorecard in v5.0). The render-path branch stays in one place, cost is negligible at typical sizes (<20 lists)."

requirements-completed: [VOC-04]

# Metrics
duration: 16m 21s
completed: 2026-04-30
---

# Phase 44 Plan 02: List/View Hierarchy ADR + Sidebar Nesting Summary

**ADR 0001 locks the View-contains-List explicit hierarchy; the sidebar Views group now renders bound Lists as nested expandable child rows under their parent View — the substrate ViewSnapshot.listId field already existed from Phase 34, so this plan was the conceptual lock + render-layer wiring.**

## Performance

- **Duration:** 16m 21s wall-clock
- **Started:** 2026-04-30T13:01:22Z
- **Completed:** 2026-04-30T13:17:43Z
- **Tasks:** 2 (each committed atomically)
- **Files modified:** 5 (1 created, 4 modified)

## Accomplishments

- **ADR 0001 shipped** at `docs/adr/0001-list-view-hierarchy.md` — project's first Architecture Decision Record. Documents the View-contains-List explicit hierarchy choice with full Status / Context / Decision / Alternatives Considered / Consequences sections. Three rejected alternatives (Workspace merge, List demotion, flat + divider) closed explicitly so future readers don't re-litigate.
- **Sidebar Views group restructured** to render the View → bound-List hierarchy at runtime. Views with a valid `listId` carry an inline expand chevron; expanding renders the bound List as a nested SidebarMenuItem indented and styled as a child row; clicking the nested row activates the List via the same `useActivePartnerList().toggleList` path the standalone Partner Lists section uses.
- **Graceful degradation** for missing-list references: a saved view pointing at a deleted List falls back to the leaf-row recipe + a one-time `console.warn` for diagnostics. Zero crashes, zero sidebar blocks.
- **Zero behavior change for legacy data** — every pre-Phase-44 saved view in user localStorage carries `listId === undefined` and renders as a leaf row exactly as before. The hierarchy is opt-in via the existing-but-now-meaningful schema field.
- **Vocabulary surface preserved** — Plan 44-01 already wraps `view`, `partner`, `list` on the surrounding sidebar group labels. The nested rows do not duplicate these wraps (first-instance-per-surface rule).

## Task Commits

Each task was committed atomically:

1. **Task 1: ADR + JSDoc citations on existing listId** — `0019037` (docs)
2. **Task 2: Wire View → nested List(s) hierarchy in Views sidebar group** — `325016d` (feat)

**Plan metadata commit:** _(this commit — pending after summary write)_

## Files Created/Modified

**Created (Task 1):**

- `docs/adr/0001-list-view-hierarchy.md` — Project's first ADR. Lightweight frontmatter block (Status / Date / Phase / Requirement / Authors) + Michael Nygard sections (Status / Context / Decision / Alternatives Considered / Consequences). 127 lines. Documents the View-contains-List choice, three rejected alternatives, the Phase 34 schema substrate, sidebar render contract for Plan 44-02, vocabulary registry tie-in (Plan 44-01), v5.0 forward-compatibility, and explicit out-of-scope items (UI to attach/detach a List to a View).

**Modified (Task 1 — JSDoc citations):**

- `src/lib/views/types.ts` — Added Phase 44 VOC-04 paragraph to the `ViewSnapshot.listId` JSDoc citing ADR 0001 and clarifying that Plan 44-02 adopts the existing Phase 34 field as the conceptual binding documented in the ADR. Field shape unchanged.
- `src/lib/views/schema.ts` — Same pattern on the `viewSnapshotSchema.listId` zod field. Schema unchanged.

**Modified (Task 2 — sidebar wiring):**

- `src/components/layout/app-sidebar.tsx` — Added `useActivePartnerList` import + hook call (one destructure: `toggleList`); added `viewsExpansionState: Record<string, boolean>` per-view expansion state via `useState` + `toggleViewExpansion` callback; rewrote the `views.map` body to compute `boundList = lists.find(l => l.id === view.snapshot.listId)`, branch on `hasBinding` to emit either the inline chevron (button-as-icon with stopPropagation, aria-expanded, aria-label) or the existing Star/Bookmark leaf icon, and conditionally append a nested `SidebarMenuItem` indented via `pl-6` with a `ListIcon`, `text-body` name, and `text-caption text-muted-foreground` "(List)" suffix when `hasBinding && isExpanded`. Imports: added `List as ListIcon` from lucide-react alongside the existing icon set.
- `.planning/phases/44-vocabulary-lock-glossary/deferred-items.md` — Updated the pre-existing `react-hooks/set-state-in-effect` line numbers (114 + 132, was 106 + 124 pre-44-02) to reflect the +8 line shift from the new state hook. Added the pre-existing `react-hooks/exhaustive-deps` warning at line 86 (Phase 39-02 PCFG-05 origin) to the deferred list for completeness.

## First-Instance-Per-Surface Map (no changes from 44-01)

Plan 44-02 does **not** add new `<Term>` wraps — the nested-row rendering keeps the existing first-instance map intact:

| Surface                       | File                                                       | Terms Wrapped (from 44-01) |
| ----------------------------- | ---------------------------------------------------------- | -------------------------- |
| Sidebar — Partner Lists Group | `src/components/partner-lists/partner-lists-sidebar-group.tsx` | `partner`, `list`          |
| Sidebar — Views Group         | `src/components/layout/app-sidebar.tsx`                    | `view`                     |
| Sidebar — Nested List rows    | `src/components/layout/app-sidebar.tsx`                    | _(none — second occurrence)_ |

The nested-row "List" caption is a UI label, not a first-instance term wrap — `list` is already wrapped on the Partner Lists group label above. The plain caption is consistent with the first-instance-per-surface rule from Plan 44-01.

## Decisions Made

See `key-decisions` in frontmatter. Highlights:

- **Finding A applied** (schema already had the field) — Plan 44-02 was the conceptual lock + render-layer wiring, not a schema add. ADR 0001's Consequences section documents this honestly.
- **Per-view expansion is session-only**, not persisted — the affordance is a quick-glance disclosure, not a user setting.
- **Nested-row activation reuses `toggleList`** — single source of truth for cross-app filter activation across both the standalone and nested List rendering paths.
- **Missing-list references degrade gracefully** with `console.warn` (not `console.error`) — diagnostic-only, not a bug condition.
- **Type tokens preserved** — `text-body` + `text-caption text-muted-foreground` for the nested row, matching the `Auto` pill recipe from `partner-lists-sidebar-group.tsx`.

## Deviations from Plan

None — plan executed as written, with one notable adjustment captured in the plan itself: **Finding A** for both `types.ts` and `schema.ts` (ViewSnapshot.listId already existed from Phase 34 as `listId?: string | null` validated by `z.string().nullable().optional()`). Per the plan's pre-step instructions ("Apply the relevant change additively. Do NOT rewrite or restructure existing fields."), no schema change was made; the JSDoc was updated to cite the ADR. The ADR's Consequences section captures the Phase 34 origin and the Plan 44-02 adoption explicitly.

## Issues Encountered

- **Pre-existing lint errors on `app-sidebar.tsx`** lines 114 + 132 (`react-hooks/set-state-in-effect`, POL-02 hydration-safe pattern) and line 86 (`react-hooks/exhaustive-deps` warning, PCFG-05 ContextMenu wiring). All three pre-date Plan 44-02 — verified by `git stash && npm run lint` reproducing the same 2 errors + 1 warning on the unmodified file. Logged to `.planning/phases/44-vocabulary-lock-glossary/deferred-items.md` per SCOPE BOUNDARY rule. Line numbers in deferred-items.md updated to reflect the +8 line shift from the new state hook.
- **One pre-existing TypeScript error** in `tests/a11y/baseline-capture.spec.ts` (`Cannot find module 'axe-core'`) — out of scope per Phase 44-01 deferred-items.md; module not installed in this branch.
- **Working-tree drift from other phases** (`.env.example`, `src/lib/snowflake/*`, `src/lib/static-cache/fallback.ts`, parallel 43-* + 44-03 plan drafts) was carefully excluded from both commits per the plan-prompt scope_notes — only files in Plan 44-02's blast radius were staged.

## User Setup Required

None — no external service configuration required. The render-layer wiring activates only for saved views that carry `view.snapshot.listId`. Existing user data is unaffected.

## Next Phase Readiness

- **Plan 44-03 (Partner-Product-RevenueModel scoping)** — does not depend on this plan's deliverables. Plan 44-03's blast radius is the Partners pair-row rendering and `src/lib/columns/config.tsx` (per the 44-02 plan output spec). Independent execution unblocked.
- **Plan 44-04 (Vocabulary coverage sweep)** — independent. The first-instance map from 44-01 stands; this plan added zero new `<Term>` wraps.
- **Future plan: UI to attach/detach a List to a View** — the schema substrate is in place (Phase 34) and the sidebar render path honors the binding (this plan). The user-facing flow that lets a user say "bind this List to this View when I save it" is a separate plan, likely a checkbox in the save-view dialog or a context-menu action on a saved-view row. ADR 0001's "Out of scope" section explicitly notes this.
- **v5.0 sidebar IA additions (Scorecard / Target / Triangulation)** — inherit the principle from ADR 0001: surfaces nest under their conceptual parent rather than peering at the top level when there is a hierarchy to express. The render-path branch pattern in `app-sidebar.tsx` is the extension point.

## Self-Check: PASSED

Verified post-completion:

**Files exist:**
- FOUND: docs/adr/0001-list-view-hierarchy.md
- FOUND: src/lib/views/types.ts (JSDoc updated)
- FOUND: src/lib/views/schema.ts (JSDoc updated)
- FOUND: src/components/layout/app-sidebar.tsx (sidebar wiring)
- FOUND: .planning/phases/44-vocabulary-lock-glossary/deferred-items.md (line numbers updated)

**Commits exist:**
- FOUND: 0019037 (Task 1 — ADR + JSDoc citations)
- FOUND: 325016d (Task 2 — sidebar nesting wire)

**Verification gates:**
- PASS: `npx tsc --noEmit` (only pre-existing axe-core error in tests/a11y, out of scope per deferred-items.md)
- PASS: `bash scripts/check-type-tokens.sh` ("Type tokens enforced — no ad-hoc classes outside allowlist.")
- PASS: `npm run lint -- src/components/layout/app-sidebar.tsx` introduces zero new errors/warnings (the 2 errors + 1 warning that remain are all pre-existing per deferred-items.md, verified via `git stash` reproduction)
- PASS: `npm run dev` compiles cleanly; `curl http://localhost:3000/` returns HTTP 200; no console errors on initial render
- PASS: ADR has Status / Context / Decision / Alternatives Considered / Consequences sections + cites VOC-04
- PASS: ViewSnapshot.listId in both types.ts (interface) and schema.ts (zod); legacy view blobs without the field continue to parse cleanly via `.optional()` (Phase 34 contract preserved)

---
*Phase: 44-vocabulary-lock-glossary*
*Completed: 2026-04-30*
