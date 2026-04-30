# Phase 44 — Deferred Items

Out-of-scope discoveries logged during plan execution. Per SCOPE BOUNDARY
rule, executor agents do not fix these — they're handed back to the
project owner / future plans.

## Pre-existing lint errors on hydration-safe localStorage reads

**Discovered:** 44-01 Task 3 lint pass

**Files:**

- `src/components/layout/app-sidebar.tsx:106` — `setPartnersExpanded(true)`
  inside hydration-effect (POL-02 pattern, Phase 38)
- `src/components/layout/app-sidebar.tsx:124` — `setViewsExpanded(false)`
  inside hydration-effect (same pattern, later phase)
- `src/components/partner-lists/partner-lists-sidebar-group.tsx:87` —
  `setExpanded(false)` inside hydration-effect (same pattern)

**Rule:** `react-hooks/set-state-in-effect`

**Why pre-existing:** The hydration-safe pattern that reads `localStorage`
inside `useEffect` is intentional — see app-sidebar.tsx:96-107 docstring
("Reading localStorage inside the useState initializer ... is NOT safe
here — it runs synchronously on the first client render before hydration
commits, producing an aria-expanded / grid-rows className mismatch vs the
server HTML"). Refactor would require moving collapse state into a hook
that uses an SSR-safe `useSyncExternalStore` pattern.

**Verified pre-existing via:** `git stash && npx eslint ...` reproduces the
same 3 errors + 1 warning on the unmodified files (44-01 Task 3 only added
`<Term>` JSX inside the same render trees; the linted-pattern lines are
pre-existing).

**Owning phase:** Future hooks-cleanup pass; not a Phase 44 deliverable.
