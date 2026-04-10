---
phase: 01-setup-and-snowflake-infrastructure
plan: 02
subsystem: api, ui
tags: [snowflake-sdk, tanstack-query, api-route, data-fetching, loading-states]

requires:
  - phase: 01-01
    provides: Next.js project scaffold, providers, layout shell, TanStack Query client
provides:
  - Snowflake connection pool singleton
  - Promise-wrapped query executor with 45s timeout
  - Column configuration system with schema validation
  - /api/data GET endpoint with SQL injection prevention
  - useData TanStack Query hook
  - Loading, error, and empty state components
  - Data freshness context and header timestamp display
  - Manual refresh without page reload
affects: [02, 03, 04, 05, all-data-dependent-phases]

tech-stack:
  added: []
  patterns: [connection-pool-singleton, promise-query-wrapper, column-allow-list, data-freshness-context]

key-files:
  created:
    - src/lib/snowflake/connection.ts
    - src/lib/snowflake/queries.ts
    - src/lib/snowflake/types.ts
    - src/lib/columns/config.ts
    - src/lib/columns/schema-validator.ts
    - src/app/api/data/route.ts
    - src/hooks/use-data.ts
    - src/components/loading-state.tsx
    - src/components/error-state.tsx
    - src/components/empty-state.tsx
    - src/components/data-display.tsx
    - src/contexts/data-freshness.tsx
    - src/types/data.ts
  modified:
    - src/components/layout/header.tsx
    - src/app/providers.tsx
    - src/app/page.tsx

key-decisions:
  - "Column config starts with 5 known columns -- schema validator will report the rest after first connection"
  - "45-second query timeout to leave headroom under Vercel's 60-second function limit"
  - "Schema validation cached at module scope for container lifetime"
  - "Data freshness uses React Context to decouple header display from data fetch logic"

patterns-established:
  - "Snowflake access: only through /api route handlers, never in client components"
  - "Column validation: all user-provided column names checked against ALLOWED_COLUMNS set"
  - "Data hook: useData() returns full useQuery result, components compose loading/error/success states"
  - "Freshness context: DataDisplay updates context, Header reads it -- clean separation"

requirements-completed: [DATA-01, DATA-02, DATA-03]

duration: 10min
completed: 2026-04-10
---

# Plan 01-02: Snowflake Data Layer Summary

**End-to-end Snowflake data pipeline with connection pooling, /api/data route, client hook, and polished loading/error/empty states**

## Performance

- **Duration:** 10 min
- **Tasks:** 2 automated + 1 checkpoint (pending)
- **Files modified:** 16

## Accomplishments
- Snowflake connection pool singleton with env var validation and auto-configuration
- Promise-wrapped query executor with 45-second timeout for serverless safety
- /api/data GET route with column allow-list for SQL injection prevention
- Schema validator comparing Snowflake INFORMATION_SCHEMA against local config
- useData TanStack Query hook with automatic cache invalidation on column changes
- Polished loading spinner, error alert with retry, and empty state components
- Data freshness timestamp in header with stale data warning (amber pulse after 5min)
- Manual refresh button that re-fetches without page reload

## Task Commits

1. **Task 1: Snowflake connection layer, column config, and API route** - `e84201f` (feat)
2. **Task 2: Client data hook, loading/error/empty states, data freshness, and refresh** - `e2a22a0` (feat)

## Files Created/Modified
- `src/lib/snowflake/connection.ts` - Connection pool singleton with env validation
- `src/lib/snowflake/queries.ts` - Promise-wrapped executeQuery with 45s timeout
- `src/lib/snowflake/types.ts` - Snowflake-specific TypeScript interfaces
- `src/lib/columns/config.ts` - Column definitions with type, label, visibility
- `src/lib/columns/schema-validator.ts` - Schema drift detection against Snowflake
- `src/app/api/data/route.ts` - GET endpoint with column validation and error handling
- `src/types/data.ts` - Shared DataResponse and DataError types
- `src/hooks/use-data.ts` - TanStack Query wrapper for /api/data
- `src/components/data-display.tsx` - Data orchestrator with preview table
- `src/components/loading-state.tsx` - Centered spinner with message
- `src/components/error-state.tsx` - Error alert with retry button
- `src/components/empty-state.tsx` - No data message
- `src/contexts/data-freshness.tsx` - Context for header timestamp sync
- `src/components/layout/header.tsx` - Added freshness timestamp and stale indicator
- `src/app/providers.tsx` - Added DataFreshnessProvider
- `src/app/page.tsx` - Replaced placeholder with DataDisplay

## Decisions Made
- Schema validation silently fails rather than blocking data fetch -- better UX for first-time users
- Column config starts intentionally sparse (5 columns) -- schema validator reports the rest
- Data freshness uses React Context rather than prop drilling to keep header/display decoupled

## Deviations from Plan
None - plan executed as written.

## Issues Encountered
None.

## User Setup Required

**Snowflake credentials must be configured before the checkpoint can be verified.**

1. Copy `.env.example` to `.env.local`
2. Fill in Snowflake credentials (account, username, password, warehouse, database, schema, role)
3. Run `pnpm dev`
4. Visit http://localhost:3000

## Next Phase Readiness
- Data pipeline is complete and ready for table rendering (Phase 2)
- Column config needs expansion after first Snowflake connection (schema validator will report actual columns)
- All loading/error states are reusable for future data-fetching components

---
*Phase: 01-setup-and-snowflake-infrastructure*
*Completed: 2026-04-10*
