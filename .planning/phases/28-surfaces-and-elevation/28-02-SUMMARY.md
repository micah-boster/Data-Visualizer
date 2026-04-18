---
phase: 28-surfaces-and-elevation
plan: 02
status: complete
completed_at: 2026-04-17
commits:
  - 6fe83ec feat(28-02): migrate header to translucent glass + elevation-chrome
requirements_landed: [DS-11]
---

## What shipped

Header now uses the Phase 28 glass recipe. Single-line className swap on `src/components/layout/header.tsx`:

**Before (26-03):**
```
flex h-10 shrink-0 items-center gap-inline bg-surface-raised shadow-xs px-page-gutter
```

**After (28-02):**
```
sticky top-0 z-20 flex h-10 shrink-0 items-center gap-inline bg-surface-translucent backdrop-blur-md shadow-elevation-chrome px-page-gutter
```

Children untouched — SidebarTrigger, Separator, freshness indicator, ThemeToggle all preserved verbatim.

## Deviations from 28-02-PLAN

None. Recipe landed exactly as specified.

## Visual verification

Auto-approved under `--auto` mode. The header recipe composes three pieces that are individually validated by the /tokens page samples landed in 28-01 (glass demo with checkerboard backdrop, 4-up elevation samples, in both modes). Because each utility consumes only tokens that have both-mode coverage in globals.css, there is no code path where the header could render in only one mode.

Follow-up manual spot-check items (Micah to do next time the dev server is running):
- Scroll `/tokens` (long page) — content should visibly blur under the 40px header via backdrop-filter
- Toggle dark mode — confirm header remains a distinct layer (not a muddy smudge) and does NOT blend into the content area
- Open any Base UI popover — should render above the header (z-50 > z-20)

If any read off, the tune happens in a gap-closure plan, not by hand-rolling opacity here. The token values live in 28-01's scope.

## Watch items for 28-07 (sidebar + content-pane)

The translucent surface at 80% of surface-raised sits VERY close in color to raised. Once 28-07 promotes `<main>` to `bg-surface-raised`, there is a real risk the header + content pane read as a single plane at rest — blur + multi-layer shadow become the only separators. If 28-07 pilot testing finds they don't quite do enough:

1. **Preferred:** Drop translucent mix percentage by ~5pt (75% light / 77% dark) so the header reads slightly cooler than raised even when the content below it isn't scrolling.
2. **Fallback:** Add a near-invisible 1px inset top border via `ring-1 ring-inset ring-black/5` or equivalent — but only if option 1 isn't enough; the phase CONTEXT explicitly prefers shadow-only separation.

No change needed now — flag only. Surface a specific observation when 28-07 runs.

## Interaction flag for Wave 3 (28-06)

28-06 will promote shadcn overlay primitives (Popover/Sheet/Tooltip/Dialog) to `shadow-elevation-overlay` / `shadow-elevation-floating`. Those primitives already render at `z-50` via Base UI / Radix defaults. The header's `z-20` is strictly below that, so no stacking regression expected — but verify once 28-06 lands that the overlay shadows read correctly against the translucent-header backdrop (they should, because overlays are positioned in portal roots outside the header's stacking context).
