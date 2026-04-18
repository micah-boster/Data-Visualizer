# Phase 34: Partner Lists - Context

**Gathered:** 2026-04-16 (originally Phase 25 in v3.5, renumbered to Phase 34 when v3.5 absorbed into v4.0)
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can create, manage, and apply named partner groupings to focus the table and charts on specific subsets of partners. Lists are persisted in localStorage alongside saved views. Creating, editing, deleting, and activating lists are all in scope. Chart builder and flexible chart types are separate phases.

</domain>

<decisions>
## Implementation Decisions

### List creation flow
- Dialog/modal triggered by a "+ New List" action in the sidebar
- Dual-pane transfer UI inside the dialog: available partners on left, selected on right
- Single flow with attribute filters at top that narrow the available partners, then user checks/unchecks from filtered results (no tabs)
- After attribute filters narrow the list, user can manually add/remove individual partners before saving
- Name is prompted at save time, not upfront

### Sidebar placement & activation
- Partner Lists section appears ABOVE the Partners section in the sidebar (lists filter what's below)
- When a list is active, the Partners section filters down to only show partners in that list (drill-down still works within that filtered set)
- Toggle behavior: clicking the active list deactivates it and returns to all partners
- Lists show just the name in the sidebar — no count badges

### Attribute filtering
- **v1 scope (this phase):** ACCOUNT_TYPE only. PRODUCT_TYPE and REVENUE_BAND are not in the schema today (verified against `src/lib/columns/config.ts`); adding them is out-of-scope data-pipeline work.
- Multi-select on ACCOUNT_TYPE (e.g. Enterprise AND SMB returns partners matching either)
- Filter UI should be built so additional attributes can be added later without a breaking change
- Lists snapshot the matching partners at creation time (stored as partner IDs)
- A "Refresh" action on the list re-runs the original filter criteria to capture new matches
- Filter criteria are stored alongside the snapshot so refresh is possible
- **Decision made:** 2026-04-18 — reduced from three attributes to one after research surfaced the schema gap. Manual dual-pane selection remains the primary creation path; ACCOUNT_TYPE is the narrowing aid.

### List-to-view relationship
- Lists and views are independent concepts — lists exist as their own entities in localStorage
- A saved view can optionally reference a partner list (by list ID)
- Lists are shared: the same list can be referenced by multiple views; editing the list affects all
- Manual list selection always wins — switching lists doesn't mark the view as "modified"
- Active list persists across view switches; loading a view without a list reference does NOT clear the active list
- Only explicitly toggling or switching the list changes it

### Claude's Discretion
- Exact dialog sizing and responsive behavior
- Filter dropdown component choice
- Dual-pane transfer animation/transitions
- How "Refresh" action is surfaced (inline button, context menu, etc.)
- localStorage schema for partner lists

</decisions>

<specifics>
## Specific Ideas

- The creation dialog is a single unified flow: filters at top narrow the dual-pane list, no tab switching needed
- Lists section above Partners reinforces the mental model that lists scope what you see below
- Snapshot-with-refresh is the key compromise: predictable by default, updatable when needed

</specifics>

<deferred>
## Deferred Ideas

- **PRODUCT_TYPE and REVENUE_BAND attribute filters** — not in `src/lib/columns/config.ts` today. Requires upstream data-pipeline work (Snowflake column additions or derived-band product decision on what the bucket boundaries should be). Candidates to pair with Phase 38 (Scorecard Ingestion) or a dedicated attribute-enrichment phase. Filter UI built in Phase 34 should accept additional attributes additively.

</deferred>

---

*Phase: 34-partner-lists (renumbered from 25-partner-lists)*
*Context gathered: 2026-04-16*
