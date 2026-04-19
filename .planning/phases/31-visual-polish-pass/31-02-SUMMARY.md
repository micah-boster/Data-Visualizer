---
phase: 31-visual-polish-pass
plan: 02
subsystem: design-system
tags: [focus, a11y, DS-31, tokens, utilities]
requires:
  - .planning/phases/31-visual-polish-pass/31-CONTEXT.md
  - .planning/phases/31-visual-polish-pass/31-RESEARCH.md
  - .planning/phases/31-visual-polish-pass/31-01-SUMMARY.md
provides:
  - ".focus-glow utility in globals.css (@layer utilities)"
  - ".focus-glow-within utility in globals.css (@layer utilities, :has(:focus-visible))"
  - "Canonical app-level focus recipe for consumers outside shadcn primitives"
  - "Cluster-scoped keyboard-focus ring on ToolbarGroup Columns+Sort and Export+SaveView wrappers"
  - "Row-scoped keyboard-focus ring on saved-view rows (ViewItem)"
affects:
  - src/app/globals.css
  - src/components/filters/filter-combobox.tsx
  - src/components/toolbar/save-view-popover.tsx
  - src/components/toolbar/unified-toolbar.tsx
  - src/components/views/view-item.tsx
tech-stack:
  added: []
  patterns:
    - "Focus-glow utility pattern: soft box-shadow (--ring at 30% via color-mix in oklch) + hard outline/outline-offset a11y fallback, both inside a single :focus-visible selector"
    - ":has(:focus-visible) for focus-within scenarios so mouse clicks do NOT fire the glow (31-RESEARCH Pitfall 2)"
    - "Static glow — no transition-property, preserves the reduced-motion contract from Phase 30"
key-files:
  created:
    - ".planning/phases/31-visual-polish-pass/31-02-SUMMARY.md"
  modified:
    - "src/app/globals.css (+19 lines, two new utilities inside existing @layer utilities block)"
    - "src/components/filters/filter-combobox.tsx (-1/+1 line, focus:ring-* recipe -> .focus-glow)"
    - "src/components/toolbar/save-view-popover.tsx (-1/+1 line, focus:ring-* recipe -> .focus-glow + corrected outline-none -> focus:outline-none)"
    - "src/components/toolbar/unified-toolbar.tsx (+2 cluster wrapper divs with focus-glow-within + rounded-md)"
    - "src/components/views/view-item.tsx (+1 className token, focus-glow-within on row div)"
decisions:
  - "Plan listed views-sidebar.tsx as the saved-view row target; actual row lives in child view-item.tsx. Applied focus-glow-within there — one class per rendered row, correct scoping. views-sidebar.tsx was left untouched."
  - "Two ToolbarGroup cluster wrappers were introduced in unified-toolbar.tsx (Columns+Sort and Export+SaveView). Prior layout had these as sibling buttons separated by <ToolbarDivider /> inside one flex row — the new wrapper divs are additive (flex items-center gap-1 rounded-md focus-glow-within) and preserve the visual layout while giving each cluster an independent keyboard-focus ring."
  - "shadcn primitives deliberately left on their canonical focus-visible:ring-3 ring-ring/50 recipe; .focus-glow is the NEW single source of truth for app-level consumers ONLY. Migrating shadcn primitives belongs to a dedicated sweep phase."
  - "No transition-property on either utility. CONTEXT locks the glow as static; Phase 30's prefers-reduced-motion media query already zeroes transitions; a transition-shadow here would be the kind of regression check:polish (31-06) will negative-check."
metrics:
  duration: "~6 min"
  tasks: 3
  files: 5
  commits: 3
completed: 2026-04-18
---

# Phase 31 Plan 02: Focus-glow language (DS-31) Summary

One-liner: Ship canonical .focus-glow and .focus-glow-within utilities and migrate legacy hand-rolled focus-ring recipes at 2 sites + wire new focus-glow-within rings onto 2 ToolbarGroup clusters and the saved-view row — single focus language for the app, shadcn primitives intentionally out of scope.

## What shipped

### 1. New utilities in globals.css (@layer utilities)

```css
.focus-glow:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: 2px;
  box-shadow: 0 0 0 3px color-mix(in oklch, var(--ring) 30%, transparent);
}
.focus-glow-within:has(:focus-visible) {
  outline: 2px solid var(--ring);
  outline-offset: 2px;
  box-shadow: 0 0 0 3px color-mix(in oklch, var(--ring) 30%, transparent);
}
```

- Placed inside the existing `@layer utilities { ... }` block next to `.hover-lift` and the `.text-*-numeric` variants — same block, no new layer introduced.
- Outline + outline-offset is the hard a11y fallback for when box-shadow is clipped (e.g. inside overflow:hidden containers) or when the browser does not honor :focus-visible.
- The soft diffused glow is the visible "focus language" — identical in light and dark (driven by `--ring`, which is `var(--brand-green-bright)` in both themes).
- `:has(:focus-visible)` on the within variant is the non-negotiable recipe for interactive containers: `:focus-within` would fire on mouse-click focus as well, causing the glow to flicker during normal mouse use (31-RESEARCH Pitfall 2).
- No transition-property declared. Static glow honors the CONTEXT lock and Phase 30 A11Y-05 reduced-motion story.

### 2. Legacy migrations

- **src/components/filters/filter-combobox.tsx** — Combobox.Input trigger.
  - Before: `focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1`
  - After: `focus:outline-none focus-glow`
  - Note: the legacy recipe used bare `focus:` (fires on mouse click too). Switching to `.focus-glow` migrates it to `:focus-visible` (keyboard-only) automatically via the utility's own selector.

- **src/components/toolbar/save-view-popover.tsx** — Save View name input.
  - Before: `outline-none focus:ring-1 focus:ring-ring`
  - After: `focus:outline-none focus-glow`
  - Note: bare `outline-none` also replaced with `focus:outline-none` so the default browser focus outline only suppresses during focus, not in all states.

- **Legacy-recipe audit post-migration:** `grep -rE "focus:ring-[0-9]" src/components/` returns zero matches (not just outside the shadcn ui/ allowlist — zero matches period, because shadcn primitives use `focus-visible:ring-*`, not `focus:ring-*`).

### 3. New focus-glow-within wiring

- **src/components/toolbar/unified-toolbar.tsx** — two cluster wrapper divs introduced.
  - Columns + Sort cluster: `<div className="flex items-center gap-1 rounded-md focus-glow-within">` wraps the Columns Tooltip and the Sort Tooltip (both render Buttons).
  - Export + Save view cluster: `<div className="flex items-center gap-1 rounded-md focus-glow-within">` wraps the Export Tooltip and the SaveViewPopover.
  - The two clusters remain separated by `<ToolbarDivider />` (Phase 29-04 pattern). The outer `<div className="flex items-center gap-1 shrink-0">` row continues to hold Query / Anomaly / Charts buttons, the dropdowns, the Filters popover, and both clusters.
  - `rounded-md` on each cluster wrapper shapes the glow so it reads as a single cluster outline rather than a raw rectangular halo.

- **src/components/views/view-item.tsx** — saved-view row.
  - Added `focus-glow-within` to the row's root `<div>` that already carried `group flex items-center gap-1 rounded-md px-2 hover:bg-accent/50 transition-colors`. Now tabbing to the inner Load button or Delete icon lights up the full row boundary via `:has(:focus-visible)`.

## Verification

- Task 1 verification: `grep -n "\\.focus-glow" src/app/globals.css` → 4 lines; 2 selectors `:focus-visible` / `:has(:focus-visible)` as required by the plan's automated check.
- Task 2 verification: `grep -rE "focus:ring-[0-9]" src/components/` → zero matches.
- Task 3 verification: `grep -c "focus-glow-within" src/components/toolbar/unified-toolbar.tsx src/components/views/view-item.tsx` → 2 and 1 respectively.
- All four check:* guards green on first run: `check:tokens`, `check:surfaces`, `check:motion`, `check:components`.
- `next build` green (Turbopack, TypeScript, static page generation, route manifest) on first run — no auto-fixes needed.

## Deviations from Plan

### Saved-view row file retargeted

- **Found during:** Task 3.
- **Plan said:** Add `focus-glow-within` to the saved-view row element in `src/components/toolbar/views-sidebar.tsx`.
- **Actual file path:** The row lives in `src/components/views/view-item.tsx` (the per-row component), not under `src/components/toolbar/` and not in `views-sidebar.tsx` itself. `views-sidebar.tsx` lives at `src/components/views/views-sidebar.tsx` and is the Sheet chrome; it maps rows through `<ViewItem .../>`.
- **Fix:** Applied `focus-glow-within` to the root `<div>` of `ViewItem` — one class per rendered row, correct scoping. `views-sidebar.tsx` intentionally left untouched because its own focusable children (Sheet chrome, reset buttons) are already shadcn primitives with their own focus-visible recipes.
- **Commit:** 582d202

### ToolbarGroup cluster wrappers created (not pre-existing)

- **Found during:** Task 3.
- **Plan language implied:** "the wrapping div's className" as if the clusters already had their own wrappers.
- **Reality:** The Columns+Sort pair and the Export+SaveView pair were sibling Tooltips inside one outer flex row, separated by `<ToolbarDivider />` rather than by wrapper divs.
- **Fix:** Introduced two additive cluster wrapper divs with `flex items-center gap-1 rounded-md focus-glow-within`. Preserves gap + layout; adds cluster-scoped focus ring per plan intent.
- **Scope:** Additive only; no existing class tokens reshuffled. `<ToolbarDivider />` between clusters remains unchanged.
- **Commit:** 582d202

No auth gates. No architectural (Rule 4) deviations. No deferred items.

## Decisions Made

- Two-wrapper introduction accepted over a single outer wrapper — plan explicitly wanted two independent clusters (left Columns/Sort, right Export/SaveView) with their own focus halos.
- `rounded-md` on cluster wrappers accepted — gives the glow a clean shape; no other geometry change.
- shadcn primitives (`ui/button.tsx`, `ui/input.tsx`, etc.) deliberately NOT migrated. They use the shadcn-canonical `focus-visible:ring-3 ring-ring/50` recipe and their migration belongs to a dedicated shadcn sweep phase. `.focus-glow` is the NEW single source of truth for app-level consumers OUTSIDE that allowlist.
- `focus-visible:ring-[0-9]` recipes in shadcn ui/** were NOT flagged. Plan's legacy-recipe audit grep `focus:ring-[0-9]` (bare `focus:`) intentionally does not match the shadcn `focus-visible:` variant — so the shadcn primitives pass through the check untouched.

## Follow-ups

- **check:polish (Plan 31-06) negative check for raw focus-ring recipes** outside ui/** can now be authored. Grep pattern: `grep -rnE "focus(-visible)?:ring-[0-9]" src/` with allowlist for `src/components/ui/**`. Secondary: `grep -rn "focus-within:" src/components/ --include="*.tsx"` should be empty (all focus-within scenarios now use `.focus-glow-within`).
- **Dedicated shadcn primitive focus sweep** — migrate ui/button.tsx, ui/input.tsx, ui/checkbox.tsx, ui/switch.tsx, ui/scroll-area.tsx, ui/sidebar.tsx onto `.focus-glow` in a future plan. Scope-locked out of 31-02 per plan §<objective>.

## Commits

| Task | Hash     | Message                                                                 |
| ---- | -------- | ----------------------------------------------------------------------- |
| 1    | 3329aa9  | feat(31-02): add .focus-glow and .focus-glow-within utilities           |
| 2    | bce2d6b  | refactor(31-02): migrate legacy focus recipes to .focus-glow            |
| 3    | 582d202  | feat(31-02): wire focus-glow-within onto ToolbarGroup clusters + saved-view rows |

## Self-Check: PASSED

All 5 modified/created files verified present on disk. All 3 per-task commit hashes (3329aa9, bce2d6b, 582d202) reachable in git log.
