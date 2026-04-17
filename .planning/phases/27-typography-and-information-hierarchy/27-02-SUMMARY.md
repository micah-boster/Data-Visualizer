---
phase: 27-typography-and-information-hierarchy
plan: 02
subsystem: ui
tags: [typography, design-tokens, charts, recharts, kpi, cross-partner, numeric-tick, tabular-nums, ds-07, ds-08, ds-10]

requires:
  - phase: 27-typography-and-information-hierarchy
    plan: 01
    provides: "Canonical docs/TYPE-MIGRATION.md mapping; SectionHeader (DS-10); pilot-resolved ambiguous cases in §4 + §10"

provides:
  - "12 chart + KPI + cross-partner surfaces migrated to type tokens (zero text-(xs|sm|base|lg|xl|2xl) and zero paired font-weight hits across the in-scope files)"
  - "Shared NumericTick helper (src/components/charts/numeric-tick.tsx) — reusable Recharts custom tick component baking JetBrains Mono + tabular-nums lining-nums via inline SVG style; used on both CollectionCurveChart and CrossPartnerTrajectoryChart XAxis + YAxis"
  - "Chart tooltip numeric values (curve-tooltip, trajectory-tooltip, ui/chart.tsx line 256) consolidated onto text-label-numeric / text-body-numeric — standalone tabular-nums fully eliminated from chart paths"
  - "Matrix cell pattern established: text-label uppercase text-muted-foreground for column headers; text-body for partner name / row labels; text-body-numeric for numeric cells; text-label-numeric when the row-height / micro-metric constraint demands the smaller tier (bar-ranking rank + value)"

affects:
  - 27-03-*-sweep
  - 27-04-*-sweep
  - 27-05-*-sweep
  - 27-06-enforcement-check

tech-stack:
  added: []
  patterns:
    - "Recharts numeric axis recipe: replace className='text-[10px]' (SVG <text> does not inherit Tailwind) with tick={<NumericTick />}; axis label via style={{ fontSize, fill }} not className"
    - "Chart tooltip numeric recipe: text-label-numeric (mono + tabular + lining baked) for the value span; surrounding label spans use text-body / text-caption / text-label per TYPE-MIGRATION table"
    - "Matrix cell recipe: isNumeric column → text-body-numeric (primary) OR text-label-numeric (when the row is micro-sized, e.g. bar rankings); text-body for partner name cells; text-label uppercase text-muted-foreground for column headers (overline)"

key-files:
  created:
    - "src/components/charts/numeric-tick.tsx"
  modified:
    - "src/components/charts/collection-curve-chart.tsx"
    - "src/components/charts/curve-tooltip.tsx"
    - "src/components/charts/curve-legend.tsx"
    - "src/components/cross-partner/trajectory-chart.tsx"
    - "src/components/cross-partner/trajectory-tooltip.tsx"
    - "src/components/cross-partner/trajectory-legend.tsx"
    - "src/components/cross-partner/comparison-matrix.tsx"
    - "src/components/cross-partner/matrix-heatmap.tsx"
    - "src/components/cross-partner/matrix-plain-table.tsx"
    - "src/components/cross-partner/matrix-bar-ranking.tsx"
    - "src/components/ui/chart.tsx"
    - "src/components/kpi/kpi-summary-cards.tsx"

key-decisions:
  - "NumericTick typed with optional x/y/payload (not required) — Recharts injects these at runtime, but TypeScript sees the JSX element passed to `tick={<NumericTick />}` as having no props. Loosening the type to optional + a guard (return null when undefined) keeps strict mode happy without `any`. This is the canonical typing for any Recharts custom tick component in this codebase."
  - "Axis label (YAxis `label` prop) style moved from className to an inline style object. Recharts propagates `label.className` to the SVG <text>, but Tailwind arbitrary classes like text-[11px] read as a literal font-size that SVG honors — swapping to style: { fontSize: 11, fill: 'var(--muted-foreground)' } is more explicit and matches the NumericTick pattern."
  - "Matrix column headers → text-label uppercase text-muted-foreground (overline). Previous pattern was font-medium text-muted-foreground with no size token; promoting to text-label bakes weight 500 + 0.04em tracking + 12px size + uppercase. Reads as column-meta, aligns with kpi-card overline pattern shipped in 26-02."
  - "Matrix numeric cells → text-body-numeric in heatmap + plain-table (standard row height), text-label-numeric in bar-ranking (tight bar rows). Bar ranking's rank index and value share the same micro-tier to visually anchor against the single-line bar height (h-5); heatmap + plain-table have taller rows so the body tier reads cleaner."
  - "trajectory-tooltip hovered-row emphasis: previous pattern was font-semibold on the row; tokens own weight, so resolved to `text-title` (0.9375rem, weight 500) for the hovered entry vs. text-caption for reference lines and non-hovered partners. Creates a subtle prominence without injecting font-semibold."
  - "Curve tooltip displayName span: previous pattern was plain `<p className='font-medium'>` (standalone weight) — resolved to `text-title` so the token carries the weight. Tooltip body value span uses text-body-numeric (mono + tabular) since the time-at-month string contains digits."
  - "ui/chart.tsx is inside the ui/** allowlist BUT this plan's project_constraints pins line 256 tooltip value as in-scope (already first-party-modified per RESEARCH). Only that span migrated (font-mono font-medium tabular-nums → text-label-numeric font-medium). The surrounding text-xs on the tooltip wrapper (line 194) is shadcn's own default and remains allowlisted."
  - "percentile-cell.tsx NOT migrated in this plan. It lives in src/components/cross-partner/ but is not listed in this plan's files_modified frontmatter; parallel sweep plans (27-03 / 27-04 / 27-05) own it. Respected the parallel_execution_note boundary to avoid commit conflicts."
  - "Button size='sm' keeps its shadcn internal text-sm (allowlist); caller-level `text-xs` on the Button's className was redundant and dropped. The h-7 spacing override stays because spacing is explicitly out of scope for Phase 27."

patterns-established:
  - "Pattern: src/components/charts/numeric-tick.tsx is the canonical Recharts numeric tick for this codebase. Future charts (CHRT-03..06 in later phases) that render axes with digits should import it rather than re-inline the style object."
  - "Pattern: chart tooltips follow the three-tier rhythm — display name (text-title), contextual label (text-body / text-caption), numeric value (text-body-numeric or text-label-numeric). Reference reshape: curve-tooltip.tsx and trajectory-tooltip.tsx."
  - "Pattern: cross-partner matrix views share a consistent tier — column headers overline (text-label uppercase), row headers text-body, numeric cells text-body-numeric (or text-label-numeric in micro-row contexts). Reusable when cross-partner heatmap/plain/bar are extended."

requirements-completed: [DS-07, DS-08, DS-10]

duration: ~5 min
completed: 2026-04-17
---

# Phase 27 Plan 02: Chart + KPI + Cross-Partner Surface Sweep Summary

**Swept the 12 chart-related surfaces (collection-curve-chart, trajectory-chart, both tooltips, both legends, ui/chart.tsx tooltip value, KPI summary wrapper, and all 4 cross-partner matrix views) to type tokens. Shipped the shared `<NumericTick>` Recharts helper that bakes JetBrains Mono + tabular-nums onto every chart axis digit via inline SVG style — closing the `text-[10px]` className no-op baseline.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-04-17T20:41:54Z
- **Completed:** 2026-04-17T20:46:44Z
- **Tasks:** 3 (2 auto + 1 checkpoint auto-approved via workflow.auto_advance)
- **Files modified:** 13 (1 created, 12 modified)

## Accomplishments

- **NumericTick helper shipped** at `src/components/charts/numeric-tick.tsx`. Uses inline SVG style (`fontFamily: 'var(--font-mono), ...'`, `fontVariantNumeric: 'tabular-nums lining-nums'`, `fontSize: 11`, `fill: 'var(--muted-foreground)'`) because SVG `<text>` does not inherit Tailwind classes. Optional-typed x/y/payload + null guard satisfies TypeScript strict mode when the component is passed as a JSX element to `tick={<NumericTick />}` (Recharts injects positional props at runtime).
- **CollectionCurveChart + TrajectoryChart axes** migrated. Both XAxis (month numbers) and YAxis (recovery rate %, dollars) now render tabular digits in mono; `className="text-[10px]"` no-op removed from both. YAxis `label` props moved from `className: 'text-[11px]'` to `style: { fontSize: 11, fill: 'var(--muted-foreground)' }` for explicit SVG propagation.
- **Curve tooltip + trajectory tooltip + ui/chart.tsx tooltip value** consolidated onto `.text-label-numeric` / `.text-body-numeric`. Standalone `tabular-nums` and `font-mono` fully removed from chart paths — the tokens bake those traits.
- **Cross-partner matrix surfaces** (heatmap, plain-table, bar-ranking) use the same tier: column headers = overline (`text-label uppercase text-muted-foreground`), row / partner labels = `text-body`, numeric cells = `text-body-numeric` (heatmap, plain) or `text-label-numeric` (bar-ranking micro-rows).
- **KPI summary wrapper** migrated (zero-batch fallback message `text-sm` → `text-body`). No section title above the grid, so no SectionHeader adoption — plan anticipated this.
- **Grep checks pass** for every file in this plan's frontmatter files_modified scope:
  - `rg -n 'text-(xs|sm|base|lg|xl|2xl)' src/components/charts/ src/components/cross-partner/trajectory-* src/components/ui/chart.tsx` → 0 hits (after filtering to in-scope lines; ui/chart.tsx line 194 is shadcn-primitive allowlist)
  - `rg -n '\bfont-(semibold|medium|bold)\b' src/components/charts/ src/components/cross-partner/trajectory-* src/components/cross-partner/matrix-* src/components/cross-partner/comparison-matrix.tsx src/components/kpi/kpi-summary-cards.tsx` → 0 hits across plan scope (font-medium preserved in ui/chart.tsx tooltip emphasis per plan project_constraints)
  - `rg -n '\btabular-nums\b' src/components/charts/ src/components/cross-partner/trajectory-* src/components/cross-partner/matrix-*` → 0 hits (standalone tabular-nums folded into .text-*-numeric; only remaining appearance is `fontVariantNumeric: 'tabular-nums lining-nums'` inside NumericTick's SVG style, which is the CSS property value, not the Tailwind class)
- **npm run build** passes (TypeScript strict mode).

## Task Commits

1. **Task 1: Migrate charts + chart tooltip + axis tick strategy** — `7fdd266` (feat)
2. **Task 2: Migrate KPI summary wrapper + cross-partner matrix surfaces** — `da683e2` (feat)
3. **Task 3: Human-verify checkpoint** — auto-approved via `workflow.auto_advance=true` (no commit; orchestrator auto-advances)

## Files Created/Modified

- `src/components/charts/numeric-tick.tsx` (created, ~45 lines) — shared NumericTick Recharts component
- `src/components/charts/collection-curve-chart.tsx` — axes use NumericTick; axis label inline style; h-7 button classes drop redundant text-xs; header h3 text-sm font-medium → text-title; empty-state p text-sm → text-body; Months Since Placement p text-[11px] → text-caption
- `src/components/charts/curve-tooltip.tsx` — wrapper text-sm → text-body; displayName font-medium → text-title; value span → text-body-numeric; anomaly footer text-xs → text-caption
- `src/components/charts/curve-legend.tsx` — wrapper text-xs → text-caption
- `src/components/cross-partner/trajectory-chart.tsx` — same axis pattern as collection-curve-chart; CardTitle text-sm font-medium → text-title; Months Since Placement p text-[11px] → text-caption; Button size=sm drops redundant text-xs
- `src/components/cross-partner/trajectory-tooltip.tsx` — month header text-xs font-medium → text-label; rows use text-title (hovered) / text-caption text-muted-foreground (reference) / text-caption (other); value span standalone tabular-nums → text-label-numeric
- `src/components/cross-partner/trajectory-legend.tsx` — wrapper text-xs → text-caption
- `src/components/cross-partner/comparison-matrix.tsx` — CardTitle → text-title; tooltip Info copy text-xs → text-caption; partner-count pill text-xs → text-caption; view-mode button labels drop text-xs
- `src/components/cross-partner/matrix-heatmap.tsx` — table wrapper drops text-xs; column headers overline (text-label uppercase); row header → text-body; numeric cells tabular-nums → text-body-numeric
- `src/components/cross-partner/matrix-plain-table.tsx` — same pattern as heatmap
- `src/components/cross-partner/matrix-bar-ranking.tsx` — metric selector buttons text-xs → text-caption; rank index + value text-xs tabular-nums → text-label-numeric; partner name text-xs font-medium → text-body
- `src/components/ui/chart.tsx` — tooltip value span (line 256) font-mono font-medium tabular-nums → text-label-numeric font-medium (scoped exception per plan project_constraints)
- `src/components/kpi/kpi-summary-cards.tsx` — zero-batch fallback text-sm → text-body

## Decisions Made

See `key-decisions` in frontmatter. Highlights:

- **NumericTick optional-typed x/y/payload + null guard.** Canonical TypeScript shape for Recharts custom tick components in this codebase. Lets us write `tick={<NumericTick />}` (Recharts injects x/y/payload at render time) without `any` or a cast.
- **Axis `label` prop via `style` object, not `className`.** Recharts' label propagates style more reliably than Tailwind arbitrary values when the downstream element is SVG `<text>`. Matches the NumericTick pattern for consistency.
- **Matrix column headers promoted to `.text-label uppercase text-muted-foreground` overline.** Previous pattern (`font-medium text-muted-foreground` with no token) was bare — the new overline treatment aligns cross-partner column headers with the kpi-card label recipe shipped in 26-02 and gives column-meta a distinct visual anchor from the body row text.
- **Matrix numeric cells split: text-body-numeric (heatmap / plain-table) vs text-label-numeric (bar-ranking).** Bar ranking lives inside tight `h-5` bar rows — text-body (0.875rem) would crowd against the bar; text-label-numeric (0.75rem + tabular mono) sits cleanly.
- **trajectory-tooltip hovered emphasis via `text-title`, not `font-semibold`.** Tokens own weight (500 from text-title); still visually prominent against text-caption non-hovered rows.
- **percentile-cell.tsx skipped deliberately.** Not in this plan's files_modified scope; parallel-sweep plans 27-03..27-05 own remaining cross-partner files. Respected parallel_execution_note boundary.

## Deviations from Plan

None - plan executed exactly as written.

One clarification added (not a deviation): the plan's project_constraints at line 126 called out ui/chart.tsx line 256 as in-scope. While validating the migration I confirmed line 194's `text-xs` on the tooltip wrapper is shadcn's own default size and NOT a caller-level override — left allowlisted. This matches the plan's own narrowing of "first-party-modified file per RESEARCH, not pristine shadcn" to the tooltip value line, not the whole file.

## Issues Encountered

One: NumericTick's initial strict-required typing on x/y/payload failed TypeScript when passed as `tick={<NumericTick />}` because React sees the JSX element as having zero props at compile time. Resolved by making those fields optional with an early-null-return guard — canonical pattern for Recharts custom ticks in this codebase. Documented in key-decisions.

## Authentication Gates

None.

## User Setup Required

None.

## Next Phase Readiness

- **NumericTick ready for reuse.** Any future chart (CHRT-03..06 later phases) with numeric axes should import `src/components/charts/numeric-tick.tsx` rather than inline the SVG style.
- **Matrix tier pattern established.** Future cross-partner views or similar tabular comparison surfaces can follow the column-header-overline / row-header-body / numeric-cell-numeric-variant recipe documented in patterns-established.
- **Parallel-wave collision avoided.** `percentile-cell.tsx` intentionally untouched — remains for whichever of 27-03 / 27-04 / 27-05 owns it.
- **Grep guard will pass.** All in-scope files in this plan now satisfy the sentinel commands that will land in Plan 27-06 enforcement; the remaining non-zero greps in cross-partner/ and charts/ come from parallel-plan-owned files (percentile-cell) and the shadcn ui/ allowlist.
- **No blockers.** Ready for Plan 27-03 / 27-04 / 27-05 continuation or Plan 27-06 kickoff after all Wave 2 plans ship.

## Self-Check: PASSED

- `src/components/charts/numeric-tick.tsx` exists on disk
- All 12 plan-scoped files exist on disk (7 chart + 5 matrix/kpi/ui)
- `.planning/phases/27-typography-and-information-hierarchy/27-02-SUMMARY.md` exists on disk
- Commit `7fdd266` (Task 1) found in `git log --oneline --all`
- Commit `da683e2` (Task 2) found in `git log --oneline --all`
- `npm run build` passes after both tasks

---
*Phase: 27-typography-and-information-hierarchy*
*Completed: 2026-04-17*
