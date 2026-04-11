# Phase 8: Navigation and Drill-Down - Context

**Gathered:** 2026-04-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Enable hierarchical drill-down navigation: users click a partner name to see that partner's batches, click a batch to see account-level detail (from `master_accounts` table), and navigate back up using a breadcrumb trail. The drill-down operates as an in-place filter on the same table — no new pages or panels.

</domain>

<decisions>
## Implementation Decisions

### Drill-down interaction
- Filter in place — clicking a partner name filters the current table to that partner's rows, no page navigation
- Click target is the partner name cell only (styled as a link), not the entire row
- At the batch summary level (agg_batch_performance_summary), drilling into a partner shows the same 61 columns, just filtered to that partner
- At the account level (master_accounts), a curated default column set is shown (not all 78 columns)
- Account-level view uses the same table experience — sortable, formatted, same UI patterns as the batch table
- Instant filter on drill-down — no transition animations

### Breadcrumb trail
- Always visible, even at root level (shows "All Batches" as baseline)
- Positioned between the filter bar and the table
- Root label: "All Batches"
- Each breadcrumb segment shows row count: "All Batches (533) > Partner: Acme (12) > Batch: 2024-Q1 (847)"
- Every segment is clickable to navigate back up to that level

### Data source for account drill-down
- `master_accounts` table confirmed available in Snowflake (78 columns)
- Key columns include: PARTNER_NAME, BATCH, ACCOUNT_TYPE, TOTAL_BALANCE, TOTAL_COLLECTED_ON_ACCOUNT, STATUS, PAYMENT_PLAN_STATE, ASSIGNMENT_DATE, US_STATE, and many more
- Join/filter path: batch-level rows link to master_accounts via PARTNER_NAME + BATCH columns
- Full two-level hierarchy ships in Phase 8: partner → batches (agg_batch_performance_summary) AND batch → accounts (master_accounts)

### View state and navigation
- Drilling down clears all active filters (fresh slate at each level)
- Navigating back up via breadcrumb restores the previous filter/sort state that was active before drilling down
- Drill-down state reflected in URL query params (e.g., ?partner=Acme&batch=Q1-2024) — views are shareable and bookmarkable
- Browser back button navigates up the drill hierarchy (matches breadcrumb behavior)

### Claude's Discretion
- Curated default column set for account-level view (pick the most useful ~15-20 columns)
- Exact breadcrumb styling and separator character
- How to store/restore previous filter state (stack, URL history, etc.)
- Loading state while fetching account-level data from Snowflake

</decisions>

<specifics>
## Specific Ideas

- The drill-down should feel like narrowing focus, not navigating away — same page, same table, just different data
- Breadcrumb row counts help orient users to how much data they're looking at before they even scroll
- URL state means team members can Slack each other a link to a specific partner's batch view

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 08-navigation-and-drill-down*
*Context gathered: 2026-04-11*
