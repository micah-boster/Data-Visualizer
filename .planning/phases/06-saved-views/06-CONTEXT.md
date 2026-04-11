# Phase 6: Saved Views - Context

**Gathered:** 2026-04-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Let users save, load, and delete named table configurations (filters, visible columns, column order, sort state, column widths) that persist across browser sessions via localStorage. Login-based server-side persistence is out of scope for this phase.

</domain>

<decisions>
## Implementation Decisions

### Save experience
- Inline save flow in the toolbar — "Save View" button expands an inline name input + save button, no modal
- Duplicate names trigger a "Replace existing view?" confirmation before overwriting
- No dirty-state tracking — views are snapshots, users freely change things after loading without any unsaved-changes indicator
- Deleting a view is immediate with an undo Sonner toast (no confirmation dialog)

### View switcher
- Sidebar panel (collapsible), collapsed by default — user clicks a "Views" button to open it
- Each view shows name only — no summary or metadata subtitle
- Include a "Reset" / "Clear" option in the sidebar to return to the default unfiltered table state

### What gets saved
- Filters, visible columns, column order, sort state, and column widths — all captured as a raw snapshot
- Column preset references are NOT saved — always save the actual column list regardless of how the user arrived at it
- Persisted in localStorage for now (per-device/browser)
- No limit on number of saved views

### Default/starter views
- Ship with 2-3 pre-built starter views (Claude picks based on data model and partnerships use case)
- Starter views are restorable defaults — users can delete/modify them, but a "Restore defaults" option brings them back
- First load shows the default unfiltered table, not a starter view

### Claude's Discretion
- Exact starter view configurations (which columns, filters, sort for each)
- Sidebar panel width, animation, and toggle button placement
- Inline save input styling and keyboard shortcuts (Enter to save, Escape to cancel)
- localStorage key naming and data structure
- How "Restore defaults" is surfaced in the UI

</decisions>

<specifics>
## Specific Ideas

- localStorage for now, but ultimately there should be a login mechanism with server-side saving (future phase)
- Delete flow should use Sonner toast with undo — consistent with the export toast pattern already in the app (Phase 7)

</specifics>

<deferred>
## Deferred Ideas

- User authentication / login mechanism — future phase
- Server-side view persistence (tied to login) — future phase

</deferred>

---

*Phase: 06-saved-views*
*Context gathered: 2026-04-11*
