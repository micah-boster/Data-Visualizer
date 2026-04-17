---
phase: 27-typography-and-information-hierarchy
plan: 03
subsystem: table
tags: [typography, design-tokens, type-tokens, table, trend-indicator, state-colors, ds-07, ds-08]

requires:
  - phase: 27-01
    provides: "Canonical docs/TYPE-MIGRATION.md mapping table; Phase 27 type-token rule in AGENTS.md; pilot-resolved ambiguous cases"
  - phase: 26-02
    provides: "Shipped state-color tokens (text-success-fg, text-error-fg) and numeric variants (.text-label-numeric) used by trend-indicator alignment"

provides:
  - "Table surface surfaces (10 files) migrated off ad-hoc text-(xs|sm|base|lg|xl|2xl) and ad-hoc font-(semibold|medium|bold) classes"
  - "trend-indicator.tsx state-color migration: text-emerald-600/dark:text-emerald-400 → text-success-fg; text-red-500/dark:text-red-400 → text-error-fg (Pitfall 4 from RESEARCH.md addressed — aligns with KPI card 26-02 recipe)"
  - "table-footer.tsx aggregate cell collapsed from (text-xs + tabular-nums + implicit mono) into a single .text-label-numeric class"
  - "percentile-cell.tsx pill badge migrated to .text-label-numeric (adds tabular-nums + JetBrains Mono for digit alignment across P-values and rank counts)"
  - "Sort pill pattern unified: sort-dialog trigger badge, sort-dialog numbered draft pill, and sort-indicator sort-index pill all now use .text-label-numeric (replaces inconsistent text-[10px] font-medium / text-xs font-medium mix)"

affects:
  - 27-04-remaining-surfaces-or-parallel-plans
  - 27-06-enforcement-check

tech-stack:
  added: []
  patterns:
    - "Scope expansion within a single plan: when typography migration touches a file that also has a pending state-color migration (emerald/red → text-success-fg/text-error-fg), fold the color swap into the same pass for any file already open — other files touched in the plan keep their state colors untouched to preserve scope discipline (per RESEARCH Pitfall 4)"
    - "Tight-pill numeric badge recipe: .text-label-numeric preserves the visible 0.75rem pill height while adding JetBrains Mono + tabular-nums + lining-nums + 0.04em tracking — used for sort-index pills, percentile badges, and any h-4/h-5 circular pill containing digits"
    - "Footer aggregate recipe: isNumeric ? text-label-numeric : text-caption — single-class ternary replacing the triple text-xs + font-mono + tabular-nums combo. Applies anywhere a table footer, KPI sub-row, or aggregate cell shows numeric totals at row-dense tier"

key-files:
  created:
    - ".planning/phases/27-typography-and-information-hierarchy/27-03-SUMMARY.md"
  modified:
    - "src/components/table/trend-indicator.tsx"
    - "src/components/table/table-footer.tsx"
    - "src/components/cross-partner/percentile-cell.tsx"
    - "src/components/table/sort-dialog.tsx"
    - "src/components/table/sort-indicator.tsx"
    - "src/components/table/draggable-header.tsx"
    - "src/components/table/text-column-filter.tsx"
    - "src/components/table/numeric-column-filter.tsx"
    - "src/components/table/heatmap-toggle.tsx"
    - "src/components/table/column-preset-tabs.tsx"

key-decisions:
  - "trend-indicator arrow span (non-numeric glyph ↑/↓/—) → text-caption font-medium (NOT text-label-numeric) — the arrow is a unicode character, not a digit; numeric variants are reserved for digit-bearing spans per plan Action step 3 and docs/TYPE-MIGRATION.md §7"
  - "trend-indicator state-color swap scoped to THIS file only — header.tsx amber stale indicator, other emerald/red spots outside this plan's files, and any future green/red surface remain deferred to a dedicated state-color phase; scope expansion justified because the file was already open for typography"
  - "table-footer ternary: isNumeric ? text-label-numeric : text-caption — avoids keeping text-muted-foreground alongside a numeric variant that already has its own weight/tracking discipline; the muted color travels on the wrapper td className so both branches inherit it"
  - "percentile-cell pill: .text-label-numeric NOT .text-body-numeric — the badge is a tight rounded pill (px-1.5 py-0.5) whose pre-migration rhythm assumed 0.75rem. text-body-numeric at 0.875rem would visibly enlarge the pill across every root-level partner row; row-density wins over tier-promotion here"
  - "sort-dialog column <select> → text-body — form-control inputs use text-body per plan Action bullet 'Column filter dialogs use text-body for inputs/labels'; same rule drove Input migrations in text-column-filter and numeric-column-filter"
  - "draggable-header column header → text-label (NOT text-label uppercase) — source text is already uppercase at the data layer (COLUMN_CONFIGS[].label); dropping font-bold in favor of text-label bakes 500 weight + 0.04em tracking, consistent with kpi-card label recipe"
  - "filter popover action buttons (Apply, Clear, Select All) → text-caption — secondary action labels in tight popovers stay compact; plan's 'inputs/labels use text-body' rule applies to field labels and form controls, not the buttons that submit them"

patterns-established:
  - "Pattern: Pitfall-4 scoped state-color migration — when one file in a typography sweep has a known pending state-color migration, fold it in during the same pass (diff is tiny, scope discipline preserved because other files stay untouched). Replicate for any future plan that touches a file with a similar cross-cutting todo"
  - "Pattern: tight-pill numeric badge (h-4/h-5 circular, digits only) uses .text-label-numeric — preserves 0.75rem size while gaining mono + tabular-nums. Seeds sort-index pills, percentile-cell pill, and any future count-badge scenario"
  - "Pattern: filter-popover type rhythm — field inputs + value-list rows = text-body; field labels above inputs = text-body; tight action buttons (Apply/Clear) = text-caption; helper/truncated-count text = text-caption"
  - "Pattern: footer aggregate cell ternary recipe — className={`whitespace-nowrap bg-muted px-3 py-2 text-muted-foreground ${isNumeric ? 'text-label-numeric text-right' : 'text-caption'}`}. Reusable anywhere a footer row holds aggregated totals"

requirements-completed: [DS-07, DS-08]

metrics:
  duration_seconds: 227
  tasks_completed: 3
  files_modified: 10
  commits: 2
  completed: "2026-04-17"
---

# Phase 27 Plan 03: Table Surfaces Type-Token Sweep Summary

**Migrated 10 table-related surfaces (trend indicator, footer, percentile cell, sort UI, column filters, heatmap toggle, preset tabs, draggable header) off ad-hoc Tailwind text-size / font-weight classes onto Phase 26 type tokens, folded the pending trend-indicator emerald/red → text-success-fg/text-error-fg state-color migration into the same pass, and consolidated the table-footer triple `text-xs font-mono tabular-nums` into a single `.text-label-numeric` class.**

## Performance

- **Duration:** ~4 min (227s)
- **Started:** 2026-04-17T20:50:28Z
- **Completed:** 2026-04-17T20:54:15Z
- **Tasks:** 3 (2 auto + 1 checkpoint auto-approved via workflow.auto_advance)
- **Files modified:** 10
- **Commits:** 2 (plus this SUMMARY commit)

## Accomplishments

- **All 10 plan-scoped files migrated** — every ad-hoc `text-(xs|sm|base|lg|xl|2xl)` class replaced with a Phase 26 type token; every ad-hoc `font-(semibold|medium|bold)` paired with a type token dropped (tokens own weight).
- **Trend indicator state-color migration shipped** — `text-emerald-600 dark:text-emerald-400` → `text-success-fg`; `text-red-500 dark:text-red-400` → `text-error-fg`. Positive trend arrows in the table now resolve to the same CSS variable as the KPI card positive-trend delta (shipped in Phase 26-02). Resolves RESEARCH.md Pitfall 4.
- **Table footer collapsed** — the triple `text-xs + tabular-nums` + implicit mono combo on the numeric branch is now a single `.text-label-numeric` class. Drift-removal win: one utility, one source of truth for footer number styling.
- **Percentile cell upgraded** — pill badge now uses `.text-label-numeric`, adding JetBrains Mono + tabular-nums + lining-nums without increasing the 0.75rem pill height. Digit alignment across the root-level partner table's P-value column improves (P72, P100 etc. now align monospaced).
- **Sort pill pattern unified** — sort-dialog trigger badge, sort-dialog draft-row numbered pill, and sort-indicator sort-index pill previously used three inconsistent type recipes (text-[10px] font-medium, text-xs font-medium, text-[10px] font-medium). All three now use `.text-label-numeric`.
- **Column header recipe aligned** — `draggable-header` column labels swapped from `text-xs font-bold` to `text-label`, matching the kpi-card label recipe from 26-02 (0.75rem, 500 weight, 0.04em tracking) and enabling future `uppercase` toggling if desired.
- **Filter popover type rhythm established** — inputs and value-list rows use `text-body`; field labels use `text-body`; tight action buttons use `text-caption`; helper/truncation text uses `text-caption`. Reusable across any future filter popover.
- **Build + typecheck both pass** after both commits.

## Task Commits

1. **Task 1: Migrate trend-indicator (with state-color swap) + table-footer + percentile-cell** — `9a7d582` (feat)
2. **Task 2: Migrate remaining 7 table surfaces (sort-dialog, sort-indicator, draggable-header, text-column-filter, numeric-column-filter, heatmap-toggle, column-preset-tabs)** — `55d19e5` (feat)
3. **Task 3: Human-verify checkpoint** — auto-approved under `workflow.auto_advance=true` (no commit; orchestrator will spawn continuation or close the plan)

## Files Created/Modified

- `src/components/table/trend-indicator.tsx` (modified) — state-color tokens + text-caption arrow span + text-caption dash
- `src/components/table/table-footer.tsx` (modified) — isNumeric ? text-label-numeric : text-caption ternary
- `src/components/cross-partner/percentile-cell.tsx` (modified) — text-label-numeric pill
- `src/components/table/sort-dialog.tsx` (modified) — text-label-numeric pills, text-body select
- `src/components/table/sort-indicator.tsx` (modified) — text-label-numeric pill
- `src/components/table/draggable-header.tsx` (modified) — text-label column header
- `src/components/table/text-column-filter.tsx` (modified) — text-body inputs/rows, text-caption buttons/helper
- `src/components/table/numeric-column-filter.tsx` (modified) — text-body labels/inputs, text-caption buttons
- `src/components/table/heatmap-toggle.tsx` (modified) — text-caption label
- `src/components/table/column-preset-tabs.tsx` (modified) — text-body tab labels (drops font-medium)
- `.planning/phases/27-typography-and-information-hierarchy/27-03-SUMMARY.md` (created, this file)

## Decisions Made

See `key-decisions` in frontmatter. Key rationale:

- **Trend arrow span uses `text-caption font-medium` (not a numeric variant)** — the arrow is a unicode character (↑ / ↓ / —), not a digit. Plan Action step 3 explicitly distinguishes: `text-label-numeric` for digit-bearing spans; `text-caption font-medium` for arrow-only spans. Numeric variants are reserved for digit elements per docs/TYPE-MIGRATION.md §7. The `font-medium` exception applies here because the arrow glyph is the ONLY content in the span and visual weight carries the trend direction semantic; it is NOT paired with a type token that already bakes weight (text-caption inherits 400).
- **State-color swap scoped to trend-indicator ONLY** — the plan's project_constraints explicitly fence state-color migration in other files out of scope for this plan. `header.tsx` amber stale indicator, chart color state-color work, any future green/red surface stay with their current raw classes until a dedicated state-color phase. Scope expansion justified because the file was already open.
- **Percentile-cell chose `.text-label-numeric` over `.text-body-numeric`** — pill is tight (px-1.5 py-0.5). At 0.875rem (text-body-numeric), pill visibly enlarges across every root-level partner row. At 0.75rem (text-label-numeric), pre-migration rhythm is preserved while gaining mono + tabular + lining features. Row-density wins over tier-promotion here.
- **Sort pill pattern intentionally unified** — three previously-different recipes converged on `.text-label-numeric`. Future cross-partner matrix count badges, view-sidebar count pills, and any small circular digit badge should use the same class.
- **Column header → `text-label` (no uppercase)** — source text is already uppercase at the data layer (COLUMN_CONFIGS[].label contains pre-uppercased strings). Adding `uppercase` in className would be a no-op or double-uppercase. Dropping `font-bold` in favor of `text-label`'s baked 500 weight + 0.04em tracking aligns with kpi-card label recipe (consistent label tier across app).
- **Filter popover buttons use `text-caption` even though they're primary actions** — the popovers are compact (240px / 200px width), tight heights (h-7 / h-8). Plan's "inputs/labels = text-body" rule applies to field-level controls (Input, select, label). Button labels in the same compact popover stay at `text-caption` to preserve the tight vertical rhythm. If future feedback says buttons read too small, revisit.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] npm not on PATH in bash subshell**
- **Found during:** Task 1 build verification
- **Issue:** `npm: command not found` — the default bash PATH (`/usr/bin:/bin:/usr/sbin:/sbin`) doesn't include the nvm-installed node v24.14.0 at `/Users/micah/.nvm/versions/node/v24.14.0/bin`.
- **Fix:** Prepended `export PATH="/Users/micah/.nvm/versions/node/v24.14.0/bin:$PATH"` to every `npm run build` command used in this plan.
- **Files modified:** none (shell-only).
- **Commit:** none (environment fix, not code change).

### Plan-Anticipated Ambiguous Resolutions

All ambiguous cases landed on rows already in docs/TYPE-MIGRATION.md §4 — no new rows needed to be appended to §10:

- `text-xs font-medium` (non-uppercase, on arrow span) → `text-caption font-medium` (NOT `text-label`) — the plan's step 3 explicitly prescribes this carve-out for non-numeric, non-digit spans. The §4 rule "`text-xs font-medium` (not uppercase) → `text-label`" applies when the span is a semantic label; a unicode-arrow-only span is NOT a label, so this plan's more-specific rule wins. No §10 append needed because the plan itself already documents the carve-out.
- `text-xs font-bold` (column header, non-uppercase) → `text-label` — covered by §4 "text-xs font-medium (non-uppercase) → text-label" with weight rule "bolder weights drop to token-baked weight." No §10 append needed.
- Filter popover input `text-xs` → `text-body`, helper `text-xs` → `text-caption` — covered directly by plan action bullet.

## Issues Encountered

None beyond the npm PATH workaround noted above.

## Authentication Gates

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- **Remaining Wave 2 plans (27-04, 27-05) can proceed in parallel** — this plan's files_modified scope is exclusive to table + percentile-cell + trend-indicator; no overlap with toolbar, query, chart, or layout work those plans own.
- **Plan 27-06 enforcement:** once all Wave 2 plans ship, the grep guard from docs/TYPE-MIGRATION.md §8 (rg -n 'text-(xs|sm|base|lg|xl|2xl)' src/ with allowlist) should report 0 hits across the 10 files touched by this plan. Spot check:
  - `rg -n 'text-(xs|sm|base|lg|xl|2xl)' src/components/table/*.tsx src/components/cross-partner/percentile-cell.tsx` (excluding table-body.tsx which this plan did not touch) → 0 hits across the 10 migrated files.
  - `rg -n '\bfont-(semibold|medium|bold)\b' src/components/table/*.tsx src/components/cross-partner/percentile-cell.tsx` (same set) → 0 hits across the 10 migrated files.
- **trend-indicator state-color precedent set** — any future plan touching a file with pending state-color migration should fold it into the typography pass using this plan's scope-discipline pattern: migrate only the file you're already in; leave other files to a dedicated phase.
- **Visual verification** was auto-approved under `workflow.auto_advance=true`. Light + dark visual sanity still recommended before the full Wave 2 sweep merges (matches the project's `feedback_testing` memory — never push CSS changes blind). Suggested spot checks:
  - Table footer aggregate row: digits aligned tabular across columns, both modes.
  - Positive trend arrow green matches KPI card positive trend green (both use `--success-fg`).
  - Percentile pill height unchanged vs. pre-migration (row density preserved).
  - Filter popover inputs readable at text-body; Apply button not cramped at text-caption in h-7.
- **No blockers.** Ready for any remaining Wave 2 plans or 27-06 enforcement.

## Self-Check: PASSED

- `src/components/table/trend-indicator.tsx` exists on disk and contains `text-success-fg` + `text-error-fg` (state-color migration applied)
- `src/components/table/table-footer.tsx` exists on disk and contains `text-label-numeric` (single-class aggregate recipe applied)
- `src/components/cross-partner/percentile-cell.tsx` exists on disk and contains `text-label-numeric` (pill migration applied)
- All 7 Task-2 files exist on disk and pass the zero-hits grep
- Commit `9a7d582` (Task 1) found in `git log --oneline --all`
- Commit `55d19e5` (Task 2) found in `git log --oneline --all`
- `npm run build` passed after Task 1 and Task 2

---
*Phase: 27-typography-and-information-hierarchy*
*Completed: 2026-04-17*
