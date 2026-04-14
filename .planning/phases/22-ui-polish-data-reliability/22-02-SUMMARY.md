---
phase: 22-ui-polish-data-reliability
plan: 02
subsystem: data
tags: [zod, validation, normalization, static-cache, schema]

requires:
  - phase: 01-foundation
    provides: Static cache fallback system for Snowflake-less deployments
provides:
  - Empty string to null normalization at data loading boundary
  - Permissive Zod schema validation for cached JSON
  - Schema warning banner activation with "Data may be incomplete" message
affects: [static-cache, data-display]

tech-stack:
  added: []
  patterns:
    - "normalizeRow/normalizeData — single fix point for empty string normalization"
    - "validateCachedData — permissive Zod safeParse returning { data, missing, unexpected }"

key-files:
  created:
    - src/lib/static-cache/schema-validation.ts
  modified:
    - src/lib/static-cache/fallback.ts
    - src/components/data-display.tsx

key-decisions:
  - "Schema validation is permissive — warns via console.warn, never throws or blocks"
  - "ACCOUNT_PUBLIC_ID treated as optional — not in required columns list"
  - "Schema warning banner text updated from 'Schema mismatch detected' to 'Data may be incomplete'"
  - "Known columns set defined for unexpected column detection"

patterns-established:
  - "Normalization at data boundary: all downstream code sees null instead of empty strings"
  - "Permissive validation pattern: safeParse + column checks, always return data"

requirements-completed: []

duration: 5min
completed: 2026-04-14
---

# Plan 22-02: Data Reliability Summary

**Empty-string-to-null normalization and Zod schema validation at the static cache boundary**

## Performance

- **Duration:** 5 min
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- Empty strings in cached JSON normalized to null at load time, preventing NaN in downstream numeric operations
- Permissive Zod schema validation checks structure, required columns, and unexpected columns
- Missing ACCOUNT_PUBLIC_ID no longer crashes — treated as optional in validation
- Schema warnings surfaced via DataResponse.schemaWarnings, driving the "Data may be incomplete" Alert banner
- Validation runs lazily on first data access, not at module import time

## Task Commits

Each task was committed atomically:

1. **Task 1: Zod schema validation module** - `dcd0434` (feat)
2. **Task 2: Normalization + validation in fallback** - `59eee0e` (feat)
3. **Task 3: Schema warning banner text** - `5cfa83b` (fix)

## Files Created/Modified
- `src/lib/static-cache/schema-validation.ts` - New: Zod schema validator with permissive safeParse
- `src/lib/static-cache/fallback.ts` - Added normalizeRow/normalizeData, integrated validation
- `src/components/data-display.tsx` - Updated banner text to "Data may be incomplete"

## Decisions Made
- ACCOUNT_PUBLIC_ID not in required columns — app handles its absence gracefully
- Known columns set captures all expected Snowflake columns for unexpected detection
- Banner text changed to match DATA-03 spec wording

## Deviations from Plan
- Schema warning banner already existed in data-display.tsx from a prior phase. Task 3 only required updating the text wording — no new component creation needed.

## Issues Encountered
None.

## Next Phase Readiness
- All three data reliability issues (DATA-01 through DATA-03) resolved
- Empty strings normalized, missing columns handled, schema validated

---
*Phase: 22-ui-polish-data-reliability*
*Completed: 2026-04-14*
