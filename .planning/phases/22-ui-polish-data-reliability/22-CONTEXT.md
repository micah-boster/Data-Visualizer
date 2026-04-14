# Phase 22: UI Polish & Data Reliability - Context

**Gathered:** 2026-04-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix 4 user-reported UI issues (chart tooltip, chart collapse, comparison button, view switch) and 3 data loading issues (missing column, empty strings, schema validation). No new features — this phase resolves gaps UI-01 through UI-04 and DATA-01 through DATA-03.

</domain>

<decisions>
## Implementation Decisions

### Chart Collapse Control (UI-02)
- Collapse toggle lives in the **chart header bar** — chevron/minimize icon in top-right corner
- When collapsed, show a **mini preview** (~80px sparkline height) so users still see the trend at a glance
- **Always start expanded** at all levels, including partner drill — user manually collapses
- **Persist collapse state** across navigation (switching partners/views remembers the preference)

### Comparison Button UX (UI-03)
- **Rename button** to something descriptive (e.g., "Compare Partners") with a **hover tooltip** explaining what comparison mode shows
- When comparison mode is active, show an **inline context label** near the table/chart indicating comparison is active — subtle, not a banner
- **Toggle the same button** to exit comparison mode (button label switches between enter/exit states) — no separate exit button

### Missing Data Strategy (DATA-01, DATA-02)
- App **handles missing columns gracefully** — ACCOUNT_PUBLIC_ID treated as optional
- Map columns **by name, not position** — missing columns get null defaults, extra columns ignored
- **Normalize empty strings to null at load time** — single fix point when parsing JSON, all downstream code works as-is
- Flexible schema: work with whatever columns are present

### Validation Failure Behavior (DATA-03)
- When cached JSON fails schema validation: **show error banner** ("Data may be incomplete") but **render what's valid** — best effort
- Validation runs **lazily on first access**, not at startup — no startup delay
- Validation errors logged to **console.warn only** — no debug panel
- Schema validator is **permissive** — check that minimum required columns exist, allow extras and missing optionals

### Claude's Discretion
- Feature degradation UX when columns are missing (silent vs subtle notice — decide per feature context)
- Exact chart collapse animation and mini preview implementation
- Tooltip wording for comparison button
- Specific error banner styling and placement

</decisions>

<specifics>
## Specific Ideas

- Mini preview should be sparkline-height (~80px) — enough to see the trend shape without details
- Comparison button needs to communicate what it does BEFORE clicking, not just after
- Inline context label for comparison mode should be subtle — not a big colored banner

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 22-ui-polish-data-reliability*
*Context gathered: 2026-04-14*
