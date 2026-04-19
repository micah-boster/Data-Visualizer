---
phase: 36-chart-builder
plan: 03
subsystem: charts
tags: [recharts, chart-builder, stale-column, axis-eligibility, empty-state, type-tokens, node-strip-types]

# Dependency graph
requires:
  - phase: 36-chart-builder
    provides: "36-01 narrow variant aliases (LineChartDefinition / ScatterChartDefinition / BarChartDefinition / GenericChartDefinition) + getEligibleColumns/isColumnEligible axis-eligibility helpers + axisRefSchema shared axis shape"
provides:
  - "resolveColumnWithFallback(chartType, axis, requested) — pure helper returning { config, stale, requested } or null for axis-not-picked / no-eligible-column cases"
  - "StaleColumnWarning banner component ({ axis, missing, fallback }) — server-renderable, mirrors the schema-warning Alert recipe"
  - "GenericChart(definition, rows, onDefinitionChange) — variant-dispatch renderer for line / scatter / bar with per-variant ChartContainer wrapping (Pitfall 6 lock)"
  - "rechartsAxisType helper pattern — ColumnConfig.type → 'category' | 'number' derivation for Recharts XAxis `type` prop"
  - "smoke:charts npm script (13 assertions covering axis-not-picked, eligible-and-fresh, unknown-key stale fallback, ineligible-but-present stale fallback, scatter-Y numeric-eligible paths)"
affects: [36-chart-builder plans 04-05, 37-metabase-sql-import]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pitfall 3 lock: read-only axis resolution — resolveColumnWithFallback is pure; GenericChart NEVER invokes onDefinitionChange; stale-ref healing waits for an explicit toolbar pick (Plan 36-04)"
    - "Pitfall 5 lock: XAxis `type` derived via rechartsAxisType(ColumnConfig) — 'text' → 'category', numeric-family → 'number'. No hardcoded per-variant axis type"
    - "Pitfall 6 lock: one Recharts chart primitive per <ChartContainer>. Variant dispatch returns an entirely separate ChartContainer+primitive per branch — never a switch inside a single container"
    - "Fallback-column rendering + stale banner decoupled: resolver returns the fallback config, renderer uses it for axes AND renders <StaleColumnWarning> above the chart so the user sees both the intended key (`missing`) and the rendered substitute (`fallback`)"

key-files:
  created:
    - src/lib/charts/stale-column.ts
    - src/lib/charts/stale-column.smoke.ts
    - src/components/charts/stale-column-warning.tsx
    - src/components/charts/generic-chart.tsx
  modified:
    - package.json

key-decisions:
  - "resolveColumnWithFallback returns the fallback config (not just a stale flag) so the renderer can immediately render something useful — the banner surfaces the requested vs fallback delta, and the user's explicit re-pick (via Plan 36-04 toolbar) overwrites the stored ref later"
  - "rechartsAxisType ('category' | 'number') centralizes axis-type derivation in one place — line-X follows the resolved column's type, scatter-X is numeric by axis-eligibility rule, bar-X is categorical by axis-eligibility rule. Future date-axis support is one branch change away"
  - "Every variant wraps itself in its own <ChartContainer> (Pitfall 6). The three return branches share props via `chartConfig`, `chartClassName`, and `chartMargin` locals but never share a container — shadcn's ResponsiveContainer requires a single chart primitive child"
  - "Single-series ChartConfig keyed on Y column: `{ [yCol.key]: { label: yCol.label, color: 'var(--chart-1)' } }`. Neutral chart-1 color for all generic charts — anomaly-color language is preserved for CollectionCurveChart (preset), not this dispatcher"
  - "onDefinitionChange kept in props (per interfaces contract) but deliberately unused inside the renderer — eslint-disable-next-line comment on the destructure + renamed to `_onDefinitionChange` to preserve public surface without triggering the unused-var rule. Pitfall 3 is enforced by convention AND by readable intent"
  - "Chart height fixed at h-[40vh] w-full for all three variants — matches CollectionCurveChart rhythm. Integration callers (Plan 36-05's ChartPanel) can wrap in a different layout if needed"
  - "rows.length === 0 uses EmptyState variant='no-data' with 'No data for current filters' copy; x === null || y === null uses 'Pick axes to render' — two distinct empty states for two distinct trigger conditions (axes-not-picked vs dataset-empty), matching the Phase 29-03 variant-by-trigger-condition rule"
  - "Both stale banners render when both axes are stale — banners array collected in render order, stacked above the chart. Key-prop stability ('x-stale' / 'y-stale') keeps React reconciliation deterministic across re-renders"

patterns-established:
  - "Registry-derivation continued: GenericChart NEVER hardcodes column keys or type rules; it consumes COLUMN_CONFIGS only through resolveColumnWithFallback → getEligibleColumns / isColumnEligible. Adding a new column to config.ts automatically flows into the renderer"
  - "Fallback-render + stale-banner is the canonical pattern for any stored-config drift in this codebase going forward — preserves the user's data, renders something useful, and tells them what happened. Reusable in saved-view / preset / filter surfaces"
  - "Unused-but-contractual prop pattern — when a prop must appear in the public surface (per interfaces contract or downstream expectation) but is deliberately unused inside the component, mark it via `_`-prefix rename + a scoped eslint-disable-next-line. Communicates intent to readers and preserves compiler / lint discipline"

requirements-completed: [CHRT-03, CHRT-04, CHRT-05, CHRT-09]

# Metrics
duration: ~2 min (Task 3 only; Tasks 1 + 2 executed by prior continuation agents)
completed: 2026-04-19
---

# Phase 36 Plan 03: GenericChart Renderer Summary

**Variant-dispatch Recharts renderer (line / scatter / bar) built around resolveColumnWithFallback + StaleColumnWarning — stored column refs that drift out of the registry render against a fallback column WITH a visible banner, never silent failures and never auto-writebacks (Pitfall 3 lock).**

## Performance

- **Duration:** ~2 min (Task 3 only; Tasks 1 + 2 executed by prior continuation agents in the same session)
- **Started (Task 3):** 2026-04-19T21:07:17Z
- **Completed (Task 3):** 2026-04-19T21:09:51Z
- **Tasks:** 3 (all complete)
- **Files modified:** 5 (4 created + 1 modified across the whole plan)

## Accomplishments

- `resolveColumnWithFallback(chartType, axis, requested)` resolves a stored `{ column: string } | null` axis ref against the live `COLUMN_CONFIGS` + eligibility rules. Returns `null` for axis-not-picked, `{ config, stale: false, requested }` for eligible-and-fresh, `{ config: fallback, stale: true, requested }` for stale (missing-from-registry OR present-but-ineligible), and `null` when no eligible column exists at all. Pitfall 3 lock: pure / read-only.
- `StaleColumnWarning` inline Alert banner ({ axis, missing, fallback }) mirrors the schema-warning Alert recipe at `data-display.tsx:572-598`. Server-renderable, uses only named type tokens (.text-title / .text-body / .text-label-numeric), no hooks, no handlers.
- `GenericChart(definition, rows, onDefinitionChange)` dispatches on `definition.type` to render `<LineChart>` / `<ScatterChart>` / `<BarChart>`, each wrapped in its OWN `<ChartContainer>` (Pitfall 6). Renders `<EmptyState variant="no-data">` for axes-not-picked and for empty `rows`. Collects stale banners into an array and stacks them above the chart when either axis is stale. Never invokes `onDefinitionChange` — Pitfall 3 enforced.
- `rechartsAxisType(ColumnConfig)` helper derives Recharts `XAxis type` ('category' | 'number') from `ColumnConfig.type`. Pitfall 5 lock — no hardcoded per-variant axis types; adding a new column-type variant is one branch change here, not per-variant edits.
- `smoke:charts` npm script wired (`node --experimental-strip-types src/lib/charts/stale-column.smoke.ts`) — 13 assertions covering all resolver branches.

## Task Commits

Each task was committed atomically:

1. **Task 1: resolveColumnWithFallback helper + smoke** — `fcffd67` (feat) — prior continuation agent
2. **Task 2: StaleColumnWarning banner component** — `c9b2622` (feat) — prior continuation agent
3. **Task 3: GenericChart line/scatter/bar dispatcher** — `976db7e` (feat)

**Plan metadata:** (pending — this SUMMARY commit)

## Files Created/Modified

- `src/lib/charts/stale-column.ts` — `resolveColumnWithFallback` + `ResolvedColumn` type; consumes `COLUMN_CONFIGS` + `getEligibleColumns` / `isColumnEligible`; pure/read-only.
- `src/lib/charts/stale-column.smoke.ts` — 13 assertions: axis-not-picked, line-X eligible-and-fresh, line-X unknown-key stale fallback, line-X present-but-ineligible stale fallback, bar-X numeric-ineligible → text fallback, scatter-Y numeric eligible, edge cases.
- `src/components/charts/stale-column-warning.tsx` — Inline Alert banner. Server-renderable. Props: `{ axis: 'X' | 'Y'; missing: string; fallback: string }`. Type-token compliant.
- `src/components/charts/generic-chart.tsx` — 265-line renderer (well over the 120-minimum). Imports `ChartContainer` + `ChartTooltipContent`, Recharts primitives (LineChart / ScatterChart / BarChart + axes + CartesianGrid + Tooltip), `NumericTick`, `StaleColumnWarning`, `EmptyState`, `resolveColumnWithFallback`, narrow variant aliases. Three return branches, one `ChartContainer` per branch, single-series `ChartConfig` keyed on Y column. `onDefinitionChange` destructured with `_`-prefix + eslint-disable-next-line (unused-but-contractual pattern).
- `package.json` — `smoke:charts` script entry.

## Decisions Made

See `key-decisions` frontmatter. Summary of the load-bearing ones:

1. **Fallback-render + stale-banner** — resolver returns a usable config even on stale; the renderer shows BOTH the requested (missing) key and the actually-rendered (fallback) key via the banner. Reusable for any future stored-config drift surface.
2. **Three Pitfall locks concentrated in this plan** — Pitfall 3 (read-only axis resolution), Pitfall 5 (XAxis type derivation via helper), Pitfall 6 (one Recharts primitive per `<ChartContainer>`). Plan 36-05 integration can plug in cleanly without re-discovering these.
3. **Fixed h-[40vh] w-full sizing** — matches CollectionCurveChart rhythm; integration callers override via wrapper layout if needed.
4. **Unused-but-contractual `onDefinitionChange` prop** — kept in the public surface per interfaces contract; destructured with `_`-prefix + scoped eslint-disable to communicate intent.
5. **Single-series neutral `var(--chart-1)` color** — anomaly-color language reserved for `CollectionCurveChart` (preset); generic line/scatter/bar use the neutral chart-1 token.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Rewrote doc-comment that tripped check:tokens guard**
- **Found during:** Task 3 verification (`npm run check:tokens`)
- **Issue:** The `/** ... */` block comment at the top of `generic-chart.tsx` referenced the forbidden class-name patterns verbatim (e.g. `text-xs/sm/base/lg/xl/2xl` and `font-semibold/medium/bold`) to describe what the file AVOIDS. The POSIX-grep-based `scripts/check-type-tokens.sh` does not distinguish code from comments and flagged the comment as two violations.
- **Fix:** Rewrote the comment to describe the rule semantically ("sticks to the 6 named type tokens only; no ad-hoc Tailwind text-size utilities; no ad-hoc font-weight utilities") without naming the forbidden tokens in a way the regex would match. Single edit to lines 26-29.
- **Files modified:** `src/components/charts/generic-chart.tsx`
- **Verification:** `npm run check:tokens` re-ran green.
- **Committed in:** `976db7e` (Task 3 commit — fix folded into the single atomic Task 3 commit; guard passed before commit landed).

**2. [Rule 3 - Blocking] Switched from `React.ReactElement` to named `ReactElement` import**
- **Found during:** Task 3 authoring (before first verification run)
- **Issue:** Used `React.ReactElement[]` to type the `banners` array but had not imported the React namespace — would fail tsc at compile time.
- **Fix:** Added `import type { ReactElement } from 'react';` at the top of the imports block and changed the annotation to `ReactElement[]`. Matches React 19 / Next 16 convention of avoiding the default-namespace import.
- **Files modified:** `src/components/charts/generic-chart.tsx`
- **Verification:** `npx tsc --noEmit` clean on this file (only the pre-existing axe-core error remains, out-of-scope per `.planning/phases/36-chart-builder/deferred-items.md`).
- **Committed in:** `976db7e` (Task 3 commit — folded into single atomic commit).

---

**Total deviations:** 2 auto-fixed (both Rule 3 — Blocking, both self-caught during pre-commit verification)
**Impact on plan:** Zero scope change. Both fixes were internal to the Task 3 deliverable — a comment rewrite and an import-shape adjustment. Neither changes the component's public surface, behavior, or the interfaces contract. No deviations on Tasks 1 + 2 (executed by prior agents per resume state).

## Issues Encountered

- `npx tsc --noEmit` surfaced `tests/a11y/baseline-capture.spec.ts(18,29): error TS2307: Cannot find module 'axe-core'` — pre-existing Phase-33 error, already logged in `.planning/phases/36-chart-builder/deferred-items.md` (installed `@axe-core/playwright` but spec imports `axe-core` directly). Not a Phase 36 regression; my changes introduce zero new tsc errors. Confirmed unchanged from the plan's `<verify>` note.

## User Setup Required

None.

## Next Phase Readiness

- Wave 2 downstream: Plan 36-04 (running in parallel) can `import { resolveColumnWithFallback } from '@/lib/charts/stale-column'` from its toolbar's column-picker for healing gestures, and Plan 36-05's ChartPanel dispatcher can `import { GenericChart } from '@/components/charts/generic-chart'` + `import { StaleColumnWarning } from '@/components/charts/stale-column-warning'` without further contract edits.
- `onDefinitionChange` is already threaded through `GenericChartProps` — Plan 36-05's ChartPanel passes it into `GenericChart` unchanged; the builder toolbar (Plan 36-04) owns the callback's actual dispatch wiring.
- Pitfall 3 / 5 / 6 locks are concentrated here — downstream plans inherit them for free by using `GenericChart`, not by re-implementing axis resolution or Recharts composition.
- Phase 36 dual Y-axis concern (STATE.md blockers) still open — `GenericChart` ships single-Y-axis in v1; dual-Y would need a second `<YAxis orientation="right">` + a second data-key plumbing through `GenericChartDefinition`. Deferred to post-36 if demand surfaces.
- CHRT-03 / CHRT-04 / CHRT-05 / CHRT-09 satisfied. Full UI closure (toolbar + preset menu + chart-panel integration) lands in Plans 36-04 and 36-05.

## Self-Check

- FOUND: src/lib/charts/stale-column.ts
- FOUND: src/lib/charts/stale-column.smoke.ts
- FOUND: src/components/charts/stale-column-warning.tsx
- FOUND: src/components/charts/generic-chart.tsx
- FOUND: package.json (smoke:charts script entry)
- FOUND: fcffd67 (Task 1 commit — prior agent)
- FOUND: c9b2622 (Task 2 commit — prior agent)
- FOUND: 976db7e (Task 3 commit — this session)

## Self-Check: PASSED

All 5 claimed files present on disk. All 3 task commits present in git log.

---
*Phase: 36-chart-builder*
*Completed: 2026-04-19*
