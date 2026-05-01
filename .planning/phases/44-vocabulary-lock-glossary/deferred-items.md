# Phase 44 — Deferred Items

Out-of-scope discoveries logged during plan execution. Per SCOPE BOUNDARY
rule, executor agents do not fix these — they're handed back to the
project owner / future plans.

## Pre-existing lint errors on hydration-safe localStorage reads

**Discovered:** 44-01 Task 3 lint pass

**Files:**

- `src/components/layout/app-sidebar.tsx:114` (was :106 pre-44-02) —
  `setPartnersExpanded(true)` inside hydration-effect (POL-02 pattern, Phase 38)
- `src/components/layout/app-sidebar.tsx:132` (was :124 pre-44-02) —
  `setViewsExpanded(false)` inside hydration-effect (same pattern)
- `src/components/partner-lists/partner-lists-sidebar-group.tsx:87` —
  `setExpanded(false)` inside hydration-effect (same pattern)
- `src/components/layout/app-sidebar.tsx:86` (warning, pre-44-02) —
  `react-hooks/exhaustive-deps` on `allRows` logical expression
  (`const allRows = queryData?.data ?? [];` could change on every render
  for the setupPairScopedRows useMemo). Pre-existing from Phase 39-02
  PCFG-05 ContextMenu wiring.

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

## Pre-existing lint warnings on use-drill-down.ts deprecation shim

**Discovered:** 44-04 Task 1 lint pass

**Files:**

- `src/hooks/use-drill-down.ts:188` (was :119 pre-44-04) —
  `'_partnerName' is defined but never used` (`@typescript-eslint/no-unused-vars`)
- `src/hooks/use-drill-down.ts:195` (was :126 pre-44-04) —
  Unused `eslint-disable-next-line no-console` directive

**Why pre-existing:** Phase 39 PCFG-03 added a deprecation shim for the
legacy `drillToPartner(name)` API that throws in development; the param
is intentionally prefixed `_` to mark it unused, but the workspace ESLint
config doesn't honor the `_` convention. The unused-disable directive on
the `console.error` fallback was added defensively — neither lint warning
indicates a real problem.

**Verified pre-existing via:** `git stash push src/hooks/use-drill-down.ts
&& npm run lint -- src/hooks/use-drill-down.ts` reproduces the same 2
warnings on the unmodified file (44-04 Task 1 only extended the file
additively; the warnings are on unmodified lines).

**Owning phase:** Future eslint-config tweak (configure
`argsIgnorePattern: '^_'` in @typescript-eslint/no-unused-vars) or
deprecation-shim removal pass; not a Phase 44 deliverable.

## Pre-existing lint error on partner-setup-sheet.tsx hydrationKey

**Discovered:** 44-04 Task 2 lint pass

**File:**

- `src/components/partner-config/partner-setup-sheet.tsx:71` (was :69
  pre-44-04 — line shift from the new Revenue Model section in Task 2) —
  `setHydrationKey((k) => k + 1)` inside open-detection useEffect
  (`react-hooks/set-state-in-effect`)

**Why pre-existing:** The hydrationKey bump on Sheet open→close→open
re-hydrates the segment editor's stored config. Pattern is intentional —
see component docstring ("hydrationKey bumps on every false→true
transition so the editor's useEffect picks up the latest stored config").
Refactor would require subscribing the editor to an external store
(useSyncExternalStore) or moving the open state outside the Sheet's
controlled-component contract. Phase 39 PCFG-05 origin.

**Verified pre-existing via:** `git stash push partner-setup-sheet.tsx
&& npm run lint -- partner-setup-sheet.tsx` reproduces the same 3 errors
+ 1 warning on the unmodified file (44-04 Task 2 only adds a Revenue
Model read-out section; the linted-pattern lines are pre-existing — line
number shifted from :69 to :71 due to the additive section).

**Owning phase:** Future hooks-cleanup pass (could be co-located with the
app-sidebar.tsx hydration-safe pattern items above); not a Phase 44
deliverable.
