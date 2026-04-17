# Deferred Items — Phase 32

## Pre-existing lint error in SaveViewPopover

**File:** `src/components/toolbar/save-view-popover.tsx`
**Rule:** `react-hooks/set-state-in-effect`
**Discovered during:** Plan 32-02, Task 2

The `useEffect(() => { ... }, [open])` cleanup branch calls `setName('')` and
`setShowReplace(false)` synchronously. This rule (part of React 19 / React
Compiler linting) flagged the existing code before Plan 02 changes; my edits
preserve the same pattern (adding `setIncludeDrill(false)` alongside).

Verified pre-existing via `git stash && npx eslint ... && git stash pop` ->
same error at the previous line number (38, pre-change).

Out of scope for Plan 32-02 (NAV-04). Candidate fix: refactor popover open/close
to drive resets from `onOpenChange` instead of an effect, or migrate to a
controlled form state.
