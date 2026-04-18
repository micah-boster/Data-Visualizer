---
phase: 29-component-patterns
plan: 05
status: complete
completed: 2026-04-18
tasks: 3/3
commits: 3
duration: ~15 min (orchestrator inline; Wave 2 agent rate-limited before start)
---

# 29-05 SUMMARY — Component Patterns Guard + /tokens Aggregator

## Objective
Ship the phase closer: POSIX grep guard enforcing Phase 29 invariants, `npm run check:components` alias, a 6th "Component Patterns" tab on /tokens aggregating the four Wave 1 specimens, and gap closure for the comparison-matrix divider deferred from Plan 04.

## Tasks

### Task 1 — Guard + npm alias (commit 97b6c0b)
- **scripts/check-components.sh** — POSIX bash, `set -euo pipefail`, modeled on `check-surfaces.sh` / `check-type-tokens.sh`. No ripgrep dependency.
- Two checks, each with inline rationale:
  1. Legacy-import check: `from '@/components/(kpi/kpi-card|empty-state|filters/filter-empty-state)'` — zero hits required.
  2. Ad-hoc-divider check: `(mx-0\.5|mx-1) h-4 w-px bg-border` — zero hits outside `src/components/patterns/**`, `src/components/tokens/**`, `src/app/tokens/**`.
- **Allowlist expansion (deviation from plan's minimal example):** added `src/components/tokens/` and `src/app/tokens/` to the divider-recipe check. Rationale: the Plan 04 toolbar specimen legitimately references the recipe as documentation inside `<code>…</code>` JSX text. The plan's CONTEXT project-constraints section explicitly listed these directories for the divider-recipe check; the example script block was non-exhaustive.
- **package.json** — `check:components` alias; scripts block reordered alphabetically (`check:components`, `check:surfaces`, `check:tokens`).
- Made executable (`chmod +x`); initial run correctly reported 1 expected hit at `comparison-matrix.tsx:100` (Task 3 target).

### Task 2 — Aggregator + 6th tab (commit 789b890)
- **src/components/tokens/component-patterns-specimen.tsx** (new) — `ComponentPatternsSpecimen` client component. Stacks `StatCardSpecimen`, `DataPanelSpecimen`, `EmptyStateSpecimen`, `ToolbarSpecimen` inside a `<TooltipProvider>` wrap. Inline JSDoc cites 29-RESEARCH Pitfall 7 as the TooltipProvider rationale.
- **src/components/tokens/token-browser.tsx** — added `value="patterns"` `<Tabs.Tab>` after Colors, matching the exact className pattern of the other 5 tabs; added matching `<Tabs.Panel value="patterns">` rendering the aggregator. Docblock updated from "exactly 5" to "6" tabs. Base-ui Tabs API used as-is per Phase 26-05 canon.

### Task 3 — Comparison-matrix divider migration (commit 2925bf3)
- **src/components/cross-partner/comparison-matrix.tsx:100** — the conditional `<span className="mx-1 h-4 w-px bg-border" />` replaced with `<ToolbarDivider />`. Import added.
- Margin normalization `mx-1 → mx-0.5` accepted per plan's resolved decision #5. No visual regression expected at typical button-cluster densities; dogfoodable on /tokens via Component Patterns tab.

## Verification (full suite, all exit 0)
```
npm run check:tokens     ✓
npm run check:surfaces   ✓
npm run check:components ✓
npm run build            ✓  (all 7 routes compile, /tokens included)
```

Spot greps:
- `grep -rE "from ['\"]@/components/(kpi/kpi-card|empty-state|filters/filter-empty-state)['\"]" src/` → **0 hits**
- `grep -rE '(mx-0\.5|mx-1) h-4 w-px bg-border' src/ | grep -v '^src/components/patterns/\|^src/components/tokens/\|^src/app/tokens/'` → **0 hits**
- Legacy files: `kpi/kpi-card.tsx`, `empty-state.tsx`, `filters/filter-empty-state.tsx` → all deleted in Wave 1 (verified).

## Deviations
1. **Allowlist expanded beyond the plan's example script.** Added `src/components/tokens/` and `src/app/tokens/` to the divider-recipe check so that `<code>mx-0.5 h-4 w-px bg-border</code>` documentation inside toolbar specimen doesn't false-fail the guard. Justified inline in the script. Matches CONTEXT project-constraints allowlist.
2. **Wave 2 orchestration path:** initial executor agent spawn hit a model rate limit and returned without work. Execution fell back to orchestrator-inline — atomic commits per task preserved, full suite green, all SUMMARY / STATE / ROADMAP / REQUIREMENTS deliverables shipped.

## Pending Todos (to bubble up to STATE.md)
From earlier wave-1 SUMMARYs (carried forward; not introduced by 29-05):
- Extend `DataResponse.meta` with `source: 'cache' | 'snowflake'` so `StatCard.stale` gets a live signal (Pitfall 1 — 29-01).
- Wire `StatCard.comparison` into a cross-partner drill-in consumer once one exists (Pitfall 2 — 29-01).
- Collection-curve-chart empty-state shell currently wraps ad-hoc empty handling in a DataPanel (29-02 TODO(29-03) comment) — consider replacing with `<EmptyState variant="no-data" />` in a follow-up polish phase.

## Self-Check: PASSED
- All 3 task commits landed.
- Full 4-check suite green.
- /tokens gains 6th tab; pattern files referenced correctly.
- Comparison-matrix gap closed; no residual `mx-1 h-4 w-px bg-border` in app code.
- DS-18 / DS-19 / DS-20 / DS-21 / DS-22 all mechanically guarded at phase close.

## Phase 29 Close Confirmation
Phase 29 is **CI-guarded AND dogfooded on /tokens**. Any future PR that re-introduces a legacy import or ad-hoc divider will fail `npm run check:components`. Any future contributor visiting /tokens → Component Patterns tab sees the canonical shape of all four patterns.
