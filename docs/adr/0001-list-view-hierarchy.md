# ADR 0001 — List vs View Hierarchy

- **Status:** Accepted
- **Date:** 2026-04-29
- **Phase:** 44 (Vocabulary Lock & Glossary)
- **Requirement:** VOC-04
- **Authors:** Micah (decision); Claude (drafting)

## Status

Accepted.

## Context

Today the sidebar renders the **Partner Lists** section and the **Saved Views** section at the same visual hierarchy level with no signpost about how the two relate. A new user reading the sidebar can't tell that a *View* is a UI snapshot (columns + sort + filters + drill scope, persisted via `viewSnapshotSchema`) while a *List* is a data filter on partners (a persisted `PartnerList` of partner-product pairs the user can activate as a cross-app filter, optionally attribute-driven and refreshable).

The collision is observable in plain language too:

- A user says "save this list" — do they mean save the column configuration they're looking at, or save the filter they applied?
- A user says "open my Q3 list" — UI configuration, partner cohort, or both?
- The sidebar puts both at the same indent level, reinforcing the conflation rather than resolving it.

v5.0 introduces three additional concepts on top of this surface — Scorecard, Target, Triangulation — each with its own persistence semantics and surfacing in the sidebar. Without resolving the List/View collision *first*, the sidebar information architecture compounds: a new user landing in v5.0 would face five peer terms with no signposted relationships.

A meaningful piece of the substrate already exists in the codebase. As of Phase 34 (Partner Lists), the `ViewSnapshot` schema carries an additive-optional `listId?: string | null` field that records "this view was saved while List X was active." The Phase 34 wiring sanitizes the field on load (strips it if the referenced list no longer exists) but the sidebar render layer does not surface the binding visually — the field is plumbing without UI meaning. This ADR locks the conceptual model that gives the field meaning, and Plan 44-02 wires the sidebar render layer to honor it.

## Decision

**View-contains-List explicit hierarchy.** Keep both terms; signpost the relationship visually; do not merge.

- A **View** is a UI snapshot — saved column visibility, sort order, in-column filters, dimension filters, drill scope, chart configuration, and an optional reference to a List. Loading a View restores all of that state.
- A **List** is a data filter — a persisted collection of `(partner, product)` pairs, either attribute-driven (refreshable when source attributes change, e.g. a `PRODUCT_TYPE = THIRD_PARTY` list re-derives when new third-party partners onboard) or hand-picked (manual snapshot, no refresh). A List can be activated as a cross-app filter independently of any View.
- The **relationship:** a View *can* contain a List, via the `ViewSnapshot.listId` reference. When set, loading the View also activates the bound List. The Partner Lists sidebar section continues to surface standalone, independently-managed Lists for cases where the user wants the data filter without saving the surrounding UI state.

The sidebar enforces this conceptually:

- **Partner Lists** group renders standalone Lists.
- **Views** group renders Views as top-level entries; a View that carries a `listId` for an existing List shows that List as an expandable nested child row underneath the View row. Expanding is presentational only — clicking the View row still loads the full View snapshot; the nested affordance just lets the user see the binding without loading the View first.

## Alternatives Considered

### Merge into a single "Workspace" concept

Rename both Lists and Views to a unified "Workspace" abstraction that carries both the data filter and the UI state.

- **Why considered:** Eliminates the conceptual collision by collapsing two terms into one. Simpler vocabulary on the sidebar.
- **Why rejected:**
  - Forces a global rename across the codebase, the UI surfaces (sidebar group labels, breadcrumbs, `<Term>` registry, glossary), and saved-state migrations. Existing saved Views and Lists in user localStorage would need a migration path; the persistence-envelope schemaVersion would need a bump.
  - User mental-model retraining: every existing user has internalized "Lists vs Views" already. Workspace introduces a new term for an old concept they already understand.
  - Loses precision. A List has refresh semantics a View doesn't (attribute-driven Lists re-derive when their source attributes change); a View has UI-snapshot semantics a List doesn't (column visibility, sort, drill scope). One term that has to absorb both meanings is less precise than two terms with a clear hierarchy.
  - High churn for low marginal clarity.

### Demote Lists to plain filters (kill the List concept)

Treat partner cohorts as transient column filters; remove the persisted Partner Lists abstraction.

- **Why considered:** Sidebar becomes single-axis (just Views). Vocabulary shrinks.
- **Why rejected:**
  - Lists carry persistence semantics Views don't capture cleanly. An attribute-driven List re-derives when its underlying attributes change (a new partner joining a `PRODUCT_TYPE` adds them to the matching List automatically). Demoting Lists to inline filters loses that affordance and forces users to recreate the filter every time the source data changes.
  - The Phase 39 derived-list work (`computeDerivedLists`) builds on the persistence model: one auto-maintained List per distinct ACCOUNT_TYPE value in the dataset, re-materialized on every hydration. Demoting Lists to filters would require relocating that auto-maintenance somewhere else with no clean home.
  - Cross-app filter activation (`useActivePartnerList`) is already wired and load-bearing for the sidebar's active-state styling. Removing it forces a wider refactor.

### Keep both flat, add a section divider

Leave Lists and Views as peer sidebar groups; add a visual separator and a tooltip explaining the difference.

- **Why considered:** Minimal change. No schema work, no UI restructure.
- **Why rejected:**
  - Doesn't actually convey the hierarchy. The reader still has to learn the difference; the divider just adds visual noise without resolving the conceptual collision.
  - Tooltip on a section divider is not discoverable — users who don't hover never see the explanation, and the explanation lives outside the surface where it's most needed.
  - Doesn't position the surface for v5.0's three additional concepts (Scorecard, Target, Triangulation). A flat sidebar with five peer groups is not a workable information architecture.

## Consequences

### Schema (existing, documented here)

- `ViewSnapshot.listId?: string | null` already exists in `src/lib/views/types.ts` (added in Phase 34 alongside the Partner Lists work) and `viewSnapshotSchema` already validates it as `z.string().nullable().optional()` in `src/lib/views/schema.ts`. This ADR documents the conceptual meaning of that field — it is the binding that makes a View "contain" a List.
- The field follows the additive-optional schema-evolution pattern (Phase 32-02 / 34-04 / 38 FLT-01 / 39 PCFG-03 precedent): legacy view blobs without the field continue to parse cleanly via zod's `.optional()` semantics; no migration, no `schemaVersion` bump required.
- Sanitization on load (`useSavedViews.sanitizeSnapshot`) already strips the field when the referenced List no longer exists. Non-destructive recovery — the View still loads with no list activation.

### Sidebar (wired by Plan 44-02)

- Views SidebarGroup renders Views as top-level entries.
- A View row shows an expand chevron when (a) `view.listId` is set AND (b) a matching `PartnerList` exists in the current `lists` array.
- Expanding renders the bound List as a nested child row indented under the View, with a `(List)` suffix or eyebrow for visual disambiguation.
- Clicking the nested row activates the bound List as a cross-app filter via `useActivePartnerList().toggleList(id)`, the same code path the Partner Lists section uses.
- Views without a `listId` render as leaf rows (no chevron) — current behavior preserved for every existing saved view in user localStorage.
- Views with a `listId` that references a missing List degrade gracefully: render as a leaf row + console.warn once. Do not throw, do not block the sidebar.
- Loading a View still loads the full UI snapshot; the nested List affordance is presentational, not a behavior change.
- Empty states preserved: zero Views renders the existing "No saved views" row; zero Lists in Partner Lists renders the existing empty state.

### Vocabulary registry (already in place from Plan 44-01)

- The `TERMS` registry at `src/lib/vocabulary.ts` defines `view` and `list` separately, each with its own one-sentence definition. `<Term name="view">` and `<Term name="list">` popovers surface those definitions in-product.
- This ADR is the canonical source for *what each one IS*; the registry is the surface that exposes those definitions to users at the point of use.
- The first-instance-per-surface wraps from Plan 44-01 already cover the sidebar surfaces this plan touches:
  - Partner Lists group label wraps `<Term name="partner">Partner</Term> <Term name="list">Lists</Term>`.
  - Views group label wraps `<Term name="view">Views</Term>`.
  - Plan 44-02's nested-row rendering does not need to add new wraps — the parent row labels already provide the first-instance coverage.

### v5.0 forward-compatibility

- This ADR records the **principle**: "surfaces nest under their conceptual parent rather than peering at the top level when there is a hierarchy to express."
- v5.0 phases that add Scorecard, Target, and Triangulation surfaces inherit this pattern. A Scorecard tied to a partner-product pair nests under that pair; a Target tied to a Scorecard nests under it; etc. Specific v5.0 nesting choices are out of scope for this ADR — the principle is what governs.
- **Workspace rename remains rejected.** Today's mental model ("Lists vs Views") is preserved; only the relationship between them becomes explicit.

### Out of scope (deferred to future plans)

- **UI to attach/detach a List to a View.** Plan 44-02 ships the schema substrate (already in place from Phase 34) and the sidebar render path. The user-facing flow that lets a user say "bind this List to this View when I save it" is a separate plan — likely a checkbox in the save-view dialog or a context-menu action on a saved-view row. Existing saved Views all carry `listId === undefined` initially and render as leaf rows; nothing about today's UX changes for data created pre-this-plan.
- **Sidebar IA reorganization at a wider scope** (Workspaces / Partners / Tools restructure) — explicitly deferred per `v4.5-REQUIREMENTS.md` to post-v5.0, depending on the v5.0 surface count.

### Schema state at ADR adoption (Phase 44)

`ViewSnapshot` **already had** an explicit `listId?: string | null` field at the time this ADR was adopted (added in Phase 34 PCFG / Partner Lists work). Plan 44-02 does not introduce the field — it adopts the existing field as the conceptual binding documented here, and wires the sidebar render layer to honor it. This ADR governs the conceptual model; the sidebar render layer enforces the model via the `listId` lookup; the schema field is the persistence surface that connects the two.
