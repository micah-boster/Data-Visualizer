---
phase: 31-visual-polish-pass
plan: 01
subsystem: ui
tags: [design-tokens, css, tailwind-v4, globals, shadow, border, oklch]

# Dependency graph
requires:
  - phase: 26-design-tokens
    provides: globals.css token architecture (:root + .dark), --border/--input split, shadow-elevation layers
  - phase: 28-surfaces
    provides: --shadow-elevation-raised multi-layer shadow, surface-raised consumers (KPI/chart/query cards)
provides:
  - "DS-32: single --border opacity standard (8%) across :root and .dark"
  - "DS-30: dark-mode --shadow-elevation-raised inset glass highlight bumped 0.05 -> 0.07"
  - "--input intentional divergence at 15% documented inline"
affects: [31-02, 31-03, 31-04, 31-05, 31-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Token-level retune (Path A) over per-consumer edits — zero consumer file touches"
    - "Inline rationale comments adjacent to token declarations documenting Phase intent + intentional divergences"

key-files:
  created: []
  modified:
    - "src/app/globals.css — --border retuned in :root + .dark; --shadow-elevation-raised inset bumped in .dark"

key-decisions:
  - "--border dropped to 8% in BOTH :root and .dark — unified opacity standard; cards read as near-borderless per CONTEXT lock"
  - "--input intentionally held at 15% in both modes — form-control affordance requires stronger frame; documented as divergence"
  - "Light-mode --shadow-elevation-raised explicitly NOT given an inset highlight per CONTEXT lock — dark-only glass effect"
  - "No new --border-opacity variable introduced — in-place retune keeps the 'single source' discipline"
  - "--sidebar-border kept at its existing color-mix literal (not cascaded) — out of plan scope; a future pass can alias it to --border"

patterns-established:
  - "Token-retune pattern: change value inside CSS custom property, rely on cascade to propagate to every consumer — avoids Tailwind shadow-composition pitfall (Pitfall 1 from 31-RESEARCH)"
  - "Multi-layer shadow surgical edit: modify single layer (third, inset) without disturbing ambient + diffuse drop-shadow layers"

requirements-completed: [DS-30, DS-32]

# Metrics
duration: ~3 min
completed: 2026-04-18
---

# Phase 31 Plan 01: Border & Glass Highlight Token Retune Summary

**DS-32 --border dropped to 8% in both modes + DS-30 dark --shadow-elevation-raised inset bumped to 7% — two-hunk globals.css edit, zero consumer files touched**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-04-18T19:43:12Z
- **Completed:** 2026-04-18T19:46:00Z
- **Tasks:** 3 (2 edits + 1 verification)
- **Files modified:** 1 (src/app/globals.css)

## Accomplishments

- DS-32 shipped: `--border` now a single 8% standard in `:root` (was 15%) and `.dark` (was 10%); cards/panels/table inherit near-borderless read automatically
- DS-30 shipped: dark-mode `--shadow-elevation-raised` third-layer inset bumped from `oklch(1 0 0 / 0.05)` to `oklch(1 0 0 / 0.07)` — KPI/chart/query card top-edge glass highlight is visibly softer-but-present
- Zero consumer file edits — Path A token-retune strategy from 31-RESEARCH preserved; Tailwind shadow-composition pitfall (Pitfall 1) avoided
- Rationale comments inline in globals.css document Phase 31 intent and the `--input` intentional divergence
- All four design-system guards (check:tokens / check:surfaces / check:components / check:motion) exit 0; Next.js build passes

## Task Commits

Each task was committed atomically:

1. **Task 1: Retune --border to 8% single standard** - `ef83e56` (feat)
2. **Task 2: Bump dark --shadow-elevation-raised inset highlight to 7%** - `0eec2ea` (feat)
3. **Task 3: Verify build + run existing guards + visual sanity** - no commit (verification only)

**Plan metadata:** (pending — docs commit follows)

## Files Created/Modified

- `src/app/globals.css`
  - `:root` — `--border` 15% → 8% (neutral-500 base); rationale comment block added above
  - `.dark` — `--border` 10% → 8% (oklch white base); one-line rationale comment added
  - `.dark` — `--shadow-elevation-raised` third layer (inset highlight) 0.05 → 0.07; rationale comment added
  - `--input` (both modes) — unchanged at 15% (intentional divergence, documented in comment)
  - `--sidebar-border` (both modes) — unchanged (out of plan scope; carries its own 15%/10% literals as before)

## Decisions Made

- **Unified 8% --border across both modes** over keeping mode-asymmetric values — CONTEXT locks "single border-opacity standard"; simpler to reason about and explain in /tokens reference.
- **--input held at 15%** — form controls benefit from a more visible frame for affordance (per 31-RESEARCH Pitfall 5); documented as intentional divergence inline rather than silently keeping the old value.
- **No `--border-opacity` helper variable introduced** — retuning the literal value in place honors "single source" discipline; adding a scalar would add indirection without downstream payoff.
- **Light-mode `--shadow-elevation-raised` not given a matching inset highlight** — CONTEXT explicitly declines; the light-mode analog would conflict with the "cards read as paper on paper" light aesthetic.
- **`--sidebar-border` left untouched** — currently carries its own 15%/10% `color-mix` literals (not an alias to `--border`). Aliasing would be a cleaner cascade but is out of this plan's scope; flagged as a candidate follow-up, not a deviation.

## Deviations from Plan

None - plan executed exactly as written.

Two-hunk edit landed as specified. No auto-fixes, no blockers, no scope expansion. Light-mode `--shadow-elevation-raised` remained untouched per CONTEXT lock. `--input` and `--sidebar-border` remained at 15%/10% per plan direction.

## Issues Encountered

None. All four guards + Next.js build passed on first invocation.

Observed pre-existing unstaged modifications in `src/components/charts/use-curve-chart-state.ts` and `src/components/data-display.tsx` predated this plan (visible in the starting `git status` snapshot) and are out of Plan 31-01 scope per the scope-boundary rule. No attempt made to auto-fix or revert.

No visual sanity-check in `npm run dev` attempted this session — /tokens Visual Polish specimen lands in Plan 31-06, which is where the DS-32 (side-by-side 15% vs 8% border specimen) and DS-30 (dark-mode glass highlight specimen) outcomes will be visually documented.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 31-05 (gradient divider) can now consume the retuned `--border` as its canonical divider color source
- Dark-mode `surface-raised` consumers (KPI cards, chart cards, query cards) will automatically render with the softer 7% top-edge highlight the next time they mount
- No downstream plan depends on the shadow bump value — rebasing the 0.07 figure is safe if future visual review calls for more/less glass
- The four design-system guards remain green; subsequent Phase 31 plans inherit a clean baseline

## Self-Check: PASSED

- FOUND: src/app/globals.css (line 329 `--border: ... 8%, transparent` in :root; line 476 `--border: ... 8%, transparent` in .dark; line 450 `inset 0 1px 0 0 oklch(1 0 0 / 0.07)` in .dark `--shadow-elevation-raised`)
- FOUND: commit ef83e56 (Task 1)
- FOUND: commit 0eec2ea (Task 2)
- FOUND: no matches for old `inset 0 1px 0 0 oklch(1 0 0 / 0.05)`
- FOUND: all four check:* guards exit 0
- FOUND: `npm run build` completes successfully

---
*Phase: 31-visual-polish-pass*
*Completed: 2026-04-18*
