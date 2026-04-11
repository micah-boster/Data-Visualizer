---
phase: 02-core-table-and-performance
plan: 01
subsystem: api, ui
tags: [tanstack-table, tanstack-virtual, column-config, presets, snowflake-schema]

requires:
  - phase: 01-02
    provides: Snowflake connection, column config system, API route, useData hook
provides:
  - Complete 61-column configuration with types, labels, and identity flags
  - Column presets (Finance, Outreach, All) for curated views
  - TanStack Table ColumnDef array builder
  - API returning all columns by default
  - Simplified useData hook (no column parameter)
affects: [02-02, 03, 04, 05, all-table-dependent-phases]

tech-stack:
  added: ["@tanstack/react-table@8.21.3", "@tanstack/react-virtual@3.13.23"]
  patterns: ["identity columns for preset inclusion", "buildColumnDefs pattern for type-safe column definitions"]

key-files:
  created:
    - src/lib/columns/presets.ts
    - src/lib/columns/widths.ts
    - src/lib/columns/definitions.ts
  modified:
    - src/lib/columns/config.ts
    - src/app/api/data/route.ts
    - src/hooks/use-data.ts
    - package.json

key-decisions:
  - "Queried live Snowflake schema to discover all 61 columns rather than guessing from name patterns"
  - "Finance preset includes collection curve at M3, M6, M12 for quick performance assessment"
  - "Outreach preset includes penetration rates and digital channel metrics (SMS, email, phone)"
  - "API always returns all 61 columns; visibility is client-side via TanStack Table VisibilityState"

patterns-established:
  - "Identity column pattern: columns with identity:true appear in every preset"
  - "Preset builder pattern: buildPreset() merges identity + extra columns into VisibilityState"

requirements-completed: [TABL-01, TABL-06]

duration: 8min
completed: 2026-04-10
---

# Phase 02 Plan 01: Column Config, Presets, and ColumnDef Builder Summary

**All 61 Snowflake columns configured with types and labels, 3 column presets defined, TanStack Table ColumnDef builder created, API updated to return full dataset**

## Performance

- **Duration:** 8 min
- **Started:** 2026-04-10
- **Completed:** 2026-04-10
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Expanded column config from 5 starter columns to all 61 Snowflake columns with correct types and human-readable labels
- Created 3 column presets (Finance: 13 cols, Outreach: 13 cols, All: 61 cols) with identity columns in every preset
- Built ColumnDef array from config for TanStack Table consumption
- API now returns all 61 columns by default; useData() simplified to no-param fetch

## Task Commits

Each task was committed atomically:

1. **Task 1: Install TanStack Table + Virtual and expand column config** - `818c93d` (feat)
2. **Task 2: Create ColumnDef builder and update API/hook** - `783439b` (feat)

## Files Created/Modified
- `src/lib/columns/config.ts` - Expanded to 61 columns with identity flag
- `src/lib/columns/presets.ts` - Finance, Outreach, All preset definitions
- `src/lib/columns/widths.ts` - Default column widths by data type
- `src/lib/columns/definitions.ts` - TanStack Table ColumnDef builder
- `src/app/api/data/route.ts` - Default to all columns instead of 5
- `src/hooks/use-data.ts` - Simplified to no-param fetch
- `package.json` - Added @tanstack/react-table and @tanstack/react-virtual

## Decisions Made
- Queried live Snowflake INFORMATION_SCHEMA to discover exact column names rather than guessing
- Finance preset focuses on placed balance, collected amounts, and collection curves (M3, M6, M12)
- Outreach preset focuses on penetration rates, conversion, and digital channel metrics
- All presets automatically include identity columns (PARTNER_NAME, LENDER_ID, BATCH, ACCOUNT_TYPE, BATCH_AGE_IN_MONTHS)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Column infrastructure complete, ready for Plan 02-02 (interactive table component)
- ColumnDef array, presets, and full data available for table rendering

## Self-Check: PASSED

---
*Phase: 02-core-table-and-performance*
*Completed: 2026-04-10*
