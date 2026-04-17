---
phase: 26-design-tokens
plan: 04
subsystem: ui
tags: [design-tokens, tailwind-v4, table, tanstack-virtual, density, surface-inset, tabular-nums]

requires:
  - phase: 26-design-tokens
    provides: "Token infrastructure in globals.css (spacing/type/surface/motion/elevation) + --table-row-height-dense/sparse + --hover-bg re-mapped + duration-quick + ease-default"
provides:
  - "Table body + data-table wrapper migrated to Phase 26 tokens (surface-inset + density tokens + type scale + motion)"
  - "Density variant pattern proven end-to-end on the app's highest-traffic component"
  - "[data-density=\"dense\"|\"sparse\"] selector block in globals.css that exposes --row-height / --row-padding-y / --row-padding-x to descendants"
  - "Dense default locked at 32px; sparse tokens available for a future density-toggle UI phase"
affects: [27-typography-hierarchy, 28-surfaces-elevation, 29-component-patterns, 30-micro-interactions, future-density-toggle-phase]

tech-stack:
  added: []
  patterns:
    - "Density variant via [data-density] attribute on the table wrapper (not <body>/<html>) — scope-local, composable, Pattern 3 from 26-RESEARCH"
    - "CSS-var indirection: globals.css [data-density] blocks assign --row-height / --row-padding-y / --row-padding-x → consumers read via h-[var(--row-height)] / px-[var(--row-padding-x)] / py-[var(--row-padding-y)] (arbitrary Tailwind values)"
    - "Background-owner lives on the scroll wrapper (data-table.tsx), not on <tbody>, so surface-inset covers header + body + footer uniformly and density cascades to every descendant cell"
    - "Numeric vs text cells split at render time: text-body-numeric (tabular-nums + mono + lining-nums) for number columns, text-body for text columns — digits align vertically across rows"
    - "TanStack Virtual estimateSize hardcoded to dense default (32) with inline comment flagging sparse-mode requires dynamic wiring later — deliberate deferral, not an oversight"

key-files:
  created: []
  modified:
    - "src/app/globals.css — additive @layer base block with [data-density=\"dense\"|\"sparse\"] selectors mapping density to --row-height / --row-padding-y / --row-padding-x"
    - "src/components/table/table-body.tsx — pilot token migration: h-[var(--row-height)] / px-[var(--row-padding-x)] / py-[var(--row-padding-y)] / text-body | text-body-numeric / hover:bg-hover-bg duration-quick ease-default; virtualizer estimateSize 42 → 32"
    - "src/components/table/data-table.tsx — added data-density=\"dense\" + bg-surface-inset on the scrollable wrapper (background owner per Task 1 Pre-step resolution)"
    - ".planning/phases/26-design-tokens/26-04-PLAN.md — frontmatter updated to declare data-table.tsx in files_modified"

key-decisions:
  - "Background owner is the scroll wrapper (data-table.tsx), not table-body.tsx — resolves Task 1 Pre-step Blocker 4. Places bg-surface-inset at the level that visibly covers header + body + footer and lets the data-density attribute cascade to every cell descendant."
  - "TanStack Virtual estimateSize hardcoded to 32 (dense default) — sparse visual wiring requires dynamic estimateSize via data-density prop, deferred until a density-toggle UI phase. Inline comment flags this for future work."
  - "Density selector scoped to the table container (Pattern 3 from 26-RESEARCH), not <body>/<html> — a root-level density toggle can be layered on later without breaking this pilot."
  - "Numeric vs text cell typography split at render time based on column data type — text-body-numeric (mono + tabular-nums + lining-nums) for numbers, text-body (Inter) for text. Digits align vertically across rows."
  - "Post-plan brand palette swap (commit d2f0a16 shifted --chart-diverging-pos hue 145→165 for separation from brand-green) is transparent to this pilot. Table body references only surface/density/type/motion tokens — never brand or chart tokens directly. Cell heatmap tints are driven by diverging-pos and continue to work because the semantic re-map is in place."

patterns-established:
  - "Density variant pattern: [data-density=\"dense\"|\"sparse\"] attribute on a component wrapper → globals.css selector block assigns component-scoped --row-height / --padding vars → consumers use arbitrary Tailwind var() classes. Replicable for table/list/grid components."
  - "Background-owner pattern for scroll containers: surface token goes on the outermost scroll wrapper, not on <tbody> or the rows. Keeps header + body + footer visually unified and lets descendant vars cascade."
  - "Virtualizer estimateSize deferral pattern: when CSS drives visual height but the virtualizer needs a JS number, hardcode the default variant's value and leave an inline comment declaring the deferral. Avoids leaking sparse-mode complexity into the pilot."
  - "Discipline-preserving token consumption: components consume semantic tokens only (surface-inset, text-body, text-body-numeric, hover-bg, duration-quick, ease-default) — never raw brand/chart vars. Post-plan brand swaps pass through transparently, matching the 26-02 / 26-03 precedent."

requirements-completed: [DS-01, DS-02, DS-04, DS-05, DS-06]

duration: ~22min
completed: 2026-04-17
---

# Phase 26 Plan 04: Table Row Pilot Summary

**Table body + data-table wrapper migrated to Phase 26 tokens: bg-surface-inset on the scroll wrapper, density-driven row height + padding via data-density attribute + CSS var indirection, text-body/text-body-numeric typography split by column type, and duration-quick + ease-default on hover transitions — dense locked at 32px, sparse variant plumbed (CSS-only; UI toggle deferred).**

## Performance

- **Duration:** ~22 min (Task 1 implementation + verify + commit + checkpoint stop; human-verify approval instant on resume)
- **Started:** 2026-04-17T11:10:00Z (approx)
- **Completed:** 2026-04-17T11:32:00Z (approx; final commit timestamp)
- **Tasks:** 2 (1 auto, 1 checkpoint:human-verify)
- **Files modified:** 4 (globals.css, table-body.tsx, data-table.tsx, plan frontmatter)

## Accomplishments

- Density variant pattern proven end-to-end on the app's most data-dense component — the batch performance table.
- Surface-inset confirmed visually recessed below surface-raised KPI cards + surface-base page chrome in both light and dark modes (user-verified in own browser).
- Numeric columns now render with tabular-nums + lining-nums + JetBrains Mono so digits align vertically across rows, proving DS-02 in a production component.
- Hover transition consumes --duration-quick (120ms) and --ease-default (cubic-bezier(0.4, 0, 0.2, 1)) — DS-04 motion tokens land on their first production interaction.
- Plan 26-04 frontmatter updated to accurately declare src/components/table/data-table.tsx as a file_modified (reflects Blocker 4 Pre-step resolution).
- Token infrastructure from 26-01 proven once more — zero changes to globals.css primitives were needed beyond the additive [data-density] selector block.

## Task Commits

Each task committed atomically:

1. **Task 1: Add [data-density] selectors + migrate table-body + data-table wrapper** — `55a5a1d` (feat)
2. **Task 2: Human verify — rows dense in both modes; sparse wiring functional** — APPROVED (checkpoint, no commit)

**Plan metadata:** `{pending — this commit}` (docs: complete plan 26-04)

## Files Created/Modified

- `src/app/globals.css` — appended an `@layer base` block with `[data-density="dense"]` and `[data-density="sparse"]` selectors that assign `--row-height` (from `--table-row-height-dense`/`-sparse`), `--row-padding-y` (`--spacing-2`/`--spacing-3`), and `--row-padding-x` (`--spacing-3`/`--spacing-4`). Descendants consume the three vars.
- `src/components/table/table-body.tsx` — swapped hardcoded `px-3 py-2 text-sm` + `hover:bg-muted/50` for token-driven `h-[var(--row-height)]` on `<tr>`, `px-[var(--row-padding-x)] py-[var(--row-padding-y)] text-body | text-body-numeric` on `<td>`, `hover:bg-hover-bg duration-quick ease-default` for row hover. TanStack Virtual `estimateSize` updated 42 → 32 (dense default) with inline comment flagging sparse mode needs dynamic wiring.
- `src/components/table/data-table.tsx` — added `data-density="dense"` attribute + `bg-surface-inset` class on the scrollable wrapper element (the correct background owner per Task 1 Pre-step greps — covers header + body + footer and provides the density cascade root).
- `.planning/phases/26-design-tokens/26-04-PLAN.md` — frontmatter `files_modified` list expanded to include `src/components/table/data-table.tsx` with an explanatory comment.

## Decisions Made

See frontmatter `key-decisions`. Highlights:

- **Background owner = scroll wrapper, not `<tbody>`.** Resolves Task 1 Pre-step Blocker 4. Grep surfaced the wrapper in `data-table.tsx`; applying `bg-surface-inset` there makes DS-05 observable on the header + body + footer uniformly and gives `data-density` a single, well-scoped cascade root.
- **TanStack Virtual `estimateSize` = 32 (dense default).** Sparse visual support requires dynamic `estimateSize` wired to a `data-density` prop — explicitly out of scope for Phase 26, deferred to the density-toggle UI phase. Inline comment preserves the pointer for future work.
- **Density selector scoped to the table container, not `<body>`/`<html>`.** Matches Pattern 3 from 26-RESEARCH. A global density toggle can layer on later without breaking this pilot.
- **Post-plan brand palette swap (`d2f0a16`) is transparent.** The table body consumes only semantic tokens (surface-inset, density, text-body, text-body-numeric, hover-bg, duration-quick, ease-default) — never brand or chart tokens. Heatmap cell tints (driven by `--chart-diverging-pos`) continue to work through the semantic re-map. Hue shift 145° → 165° does not affect this plan's scope.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] files_modified list expanded mid-task to include `src/components/table/data-table.tsx`**
- **Found during:** Task 1 Pre-step (grep for table background owner)
- **Issue:** Plan's base `files_modified` only listed `table-body.tsx` + `globals.css`. The Pre-step grep revealed that the table's background + density cascade root lives on the scroll wrapper in `data-table.tsx`, not on `<tbody>`. Applying `bg-surface-inset` on `<tbody>` alone would leave the header + footer uncovered and violate the DS-05 observable-on-rendered-table truth.
- **Fix:** Added `bg-surface-inset` and `data-density="dense"` to the scroll wrapper element in `data-table.tsx`. Updated the plan's frontmatter `files_modified` to declare the file, per the Blocker 4 Pre-step contract ("update frontmatter dynamically before writing").
- **Files modified:** `src/components/table/data-table.tsx`, `.planning/phases/26-design-tokens/26-04-PLAN.md`
- **Verification:** Build passed. Grep confirms `data-density` present in both `table-body.tsx` ancestors and the wrapper. Human verification confirmed surface-inset visible on the full table area in both modes.
- **Committed in:** `55a5a1d` (Task 1 commit)

**2. [Rule 3 — Blocking, deferred-scope] TanStack Virtual `estimateSize` wired to dense-only**
- **Found during:** Task 1 (virtualizer migration)
- **Issue:** Plan explicitly anticipated this in project_constraints ("TanStack Virtual's `estimateSize` is a JS number, not a CSS var… update the `estimateSize` hardcoded number to 32 (dense default); document that sparse mode will need separate handling in a future phase"). Classified here for record-keeping.
- **Fix:** Hardcoded `estimateSize` to `32` with inline comment: `// Dense default — sparse (40px) would need dynamic estimate via data-density prop`.
- **Files modified:** `src/components/table/table-body.tsx`
- **Verification:** Build passed; user confirmed scroll + row rendering at 32px. Sparse visual layout intentionally out of scope — users flipping `data-density` in devtools see CSS vars update (confirmed via `preview_eval`-style testing) but virtualizer estimates stay at 32 until a future phase wires them dynamically.
- **Committed in:** `55a5a1d` (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (2 Rule 3 — Blocking; one was a genuine discovery, the other was anticipated by the plan and recorded for traceability).
**Impact on plan:** No scope creep. Deviation 1 was required for correctness (DS-05 observable-on-table truth). Deviation 2 matched plan's own constraint statement. Both committed within Task 1's atomic commit.

## Issues Encountered

None beyond the deviations above. Build passed first try; user approved visual verification on first look in own browser.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Density variant pattern is now a proven, reusable primitive for Phase 29 (Component Patterns) and any future toolbar/list/panel with density modes.
- `--hover-bg` + `--duration-quick` + `--ease-default` now proven on a production interaction — Phase 30 (Micro-Interactions & Motion) can lean on the same recipe.
- Plan 26-05 (unlisted `/tokens` reference page) is the remaining Phase 26 plan. All four pilots (KPI card, header, table row) have shipped; 26-05 can render a living reference without fear of token churn.
- Deferred for a future phase: density-toggle UI + dynamic TanStack Virtual `estimateSize` wiring so sparse becomes a first-class visual mode.
- Post-plan brand palette swap (`d2f0a16`) successfully passed through three pilots (26-02 KPI, 26-03 header, 26-04 table) without a single consumer edit — the semantic-token discipline is working. Future pilots should preserve it.

## Self-Check: PASSED

- FOUND: `.planning/phases/26-design-tokens/26-04-SUMMARY.md` (this file, 13kb)
- FOUND: `src/app/globals.css` (modified in `55a5a1d`)
- FOUND: `src/components/table/table-body.tsx` (modified in `55a5a1d`)
- FOUND: `src/components/table/data-table.tsx` (modified in `55a5a1d`)
- FOUND: commit `55a5a1d` on git log
- VERIFIED: STATE.md updated — progress 52 → 53 plans, current plan advanced to 26-05, decisions added
- VERIFIED: ROADMAP.md updated — Phase 26 row 3/5 → 4/5, 26-04 checkbox ticked, milestone bullet reflects 4 shipped pilots
- VERIFIED: v4.0-REQUIREMENTS.md traceability table updated for DS-01, DS-02, DS-04, DS-05, DS-06 with 26-04 credit

---
*Phase: 26-design-tokens*
*Completed: 2026-04-17*
