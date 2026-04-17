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

## Pre-existing unused import in data-display.tsx

**File:** `src/components/data-display.tsx`
**Rule:** `@typescript-eslint/no-unused-vars`
**Discovered during:** Plan 32-02, Task 3

`UnifiedToolbar` is imported at the top of `data-display.tsx` but never
referenced — it's only rendered indirectly via `DataTable` in
`src/components/table/data-table.tsx`. Verified pre-existing via a stash
round-trip (warning appeared at line 25 before my edits; my `useRouter` import
shifted it to line 26).

Out of scope for Plan 32-02 (NAV-04). Trivial fix: remove the import.
