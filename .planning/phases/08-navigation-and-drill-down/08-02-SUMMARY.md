---
phase: 08-navigation-and-drill-down
plan: 02
status: complete
started: 2026-04-11
completed: 2026-04-11
---

## What was built

Account-level drill-down (NAV-02): the second level of the drill hierarchy. Users viewing a partner's batches can click a batch name to see account-level detail from the `master_accounts` Snowflake table.

## Files created
- `src/lib/columns/account-config.ts` — Curated 18-column config for master_accounts
- `src/lib/columns/account-definitions.ts` — TanStack ColumnDef[] for account table
- `src/app/api/accounts/route.ts` — API route with parameterized SQL (no injection risk)
- `src/hooks/use-account-data.ts` — TanStack Query hook, enabled only at batch drill level

## Files modified
- `src/components/data-display.tsx` — Orchestrates account data fetching at batch level, switches data source
- `src/components/table/data-table.tsx` — Accepts columnDefs override, partnerRowCount for breadcrumb
- `src/lib/table/hooks.ts` — Resets sorting on column change, simplified pinning

## Key decisions
- Account columns are a curated ~18-column subset (identity, financial, payment, timing, demographics, resolution)
- API uses parameterized WHERE clause via `executeQuery` binds parameter
- Loading state shown while account data fetches; error state falls back to partner level
- Table key changes on drill level + partner + batch to force clean remount
- Sorting resets when switching between batch and account column definitions

## Commits
1. `feat(08-02): add account column config, definitions, API route, and data hook`
2. `feat(08-02): wire account-level drill-down into DataTable and DataDisplay`
