# Deferred Items — Phase 32

Out-of-scope issues discovered during Phase 32 plan execution. Not fixed per the executor's SCOPE BOUNDARY rule (only fix issues directly caused by current task changes).

## Plan 32-01

### Pre-existing ESLint warning in `src/components/data-display.tsx`

- **Line 25:** `'UnifiedToolbar' is defined but never used` (`@typescript-eslint/no-unused-vars`)
- **Status:** Pre-existing on `main` prior to Plan 32-01 changes (verified via `git stash` + lint).
- **Action taken:** None. Out of scope for Plan 32-01 which touches only the stale-param validation effect.
- **Suggested follow-up:** Remove the unused `UnifiedToolbar` import in a standalone cleanup commit or whenever the next plan touches this file's imports.
