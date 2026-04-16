# Phase 32: URL-Backed Navigation - Context

**Gathered:** 2026-04-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Move drill-down state (partner, batch) from React state (`useDrillDown`) into URL query params so the browser back/forward buttons navigate drill levels, URLs are deep-linkable, and saved views can optionally include drill state for shareable bookmarks.

Scope: drill state only (partner + batch). Filters, columns, chart state, and sort stay out of the URL — they belong to saved views or future phases.

</domain>

<decisions>
## Implementation Decisions

### URL format & params
- Query params, not path segments: `?partner=<slug>&batch=<iso-date>`
- Human-readable slugs for partner (matches existing naming), ISO date for batch
- Only partner + batch are URL-backed. Filters, columns, active saved view, chart tab all stay out of the URL
- Every drill-in pushes a new browser history entry (not replace). Drill-up pops history — no custom handling needed

### Back button behavior
- Back pops exactly one drill level at a time: `partner+batch` → `partner` → root
- State preserved across back/forward navigation:
  - Active dimension filters
  - Loaded saved view (columns, sort, conditional formats)
  - Scroll position at each drill level
  - Chart tab / chart selection at each drill level
- Remember last viewed state at each level (e.g., if user drilled into Partner A, backed out, then drilled into Partner B, going back lands on Partner B not Partner A)
- Forward button is fully symmetric — free via standard `history` API

### Deep-link edge cases
- **Stale params** (partner/batch no longer exists): render empty drill state + toast "Partner X not found". User can navigate back manually. Non-destructive — don't auto-redirect, don't show error page
- **Cold load** (URL loaded before data ready): render app shell with loading skeleton, resolve drill state once data arrives. Matches existing initial-load pattern
- **Legacy URLs** (saved-view links pre-NAV with no drill params): treat absence of drill params as root view. Full backward compatibility, zero migration
- **Copy shareable link UI**: the browser URL "just works" for Phase 32. A dedicated copy-link button in the breadcrumb is deferred to a later polish phase

### Saved view integration (NAV-04)
- Per-view opt-in: when saving a view while drilled in, a checkbox "Include current drill state" appears (defaults unchecked)
- Checkbox only renders if user is currently drilled in — keeps root-level save dialog uncluttered
- View schema extended with an optional `drill: { partner?: string; batch?: string }` field. Existing saved views remain valid (no migration needed)
- When a saved view with drill state is loaded, the URL updates to match (push, not replace) — back button returns the user to their pre-load state

### Claude's Discretion
- Exact param names if they conflict with existing query strings (but prefer `partner` and `batch`)
- How to wire `useSearchParams` safely given the known "freeze" gotcha (research this)
- Loading skeleton styling during cold-load resolution
- Toast component reuse for stale-param warnings
- Exact migration strategy for any in-memory drill state → URL state transition

</decisions>

<specifics>
## Specific Ideas

- "Known gotcha with useSearchParams freezes" called out in roadmap — research how the app currently interacts with Next.js search params before writing the new hook
- Drill state URL model should mirror the breadcrumb structure: the URL and breadcrumb agree about what level the user is at
- Treat URLs as the source of truth for drill state — `useDrillDown` becomes a thin adapter over `useSearchParams`

</specifics>

<deferred>
## Deferred Ideas

- **Copy-shareable-link button** in the breadcrumb with a "Copied!" toast — deferred to a later UI polish phase
- **Filters in URL** (dimension filter state as query params) — out of scope for this phase; a potential future "workspace URL" feature
- **Active saved view in URL** (e.g., `?view=monthly-trends`) — out of scope; blurs the line with the saved-view feature
- **Dedicated 'drilled bookmarks' UI** as a concept separate from saved views — rejected in favor of extending the existing view schema

</deferred>

---

*Phase: 32-url-backed-navigation*
*Context gathered: 2026-04-16*
