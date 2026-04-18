---
phase: 28-surfaces-and-elevation
plan: 04
status: complete
completed_at: 2026-04-17
commits:
  - d2fdd80 feat(28-04): table recessed pane — sticky header lift, zebra removed
requirements_landed: [DS-13]
---

## What shipped

Table reads as a single recessed pane. Sticky column header has a gentle lift. No zebra.

### Outer card frame

**Not present to remove.** DataTable returns `<div className="flex h-full flex-col">` as its root — pure layout, no card styling. The scroll wrapper below `<UnifiedToolbar>` was already `bg-surface-inset` from Phase 26-04 pilot. Only change: added `rounded-lg` to the scroll wrapper so the recessed pane has corners matching the new-token design (Pitfall 5).

### Sticky column header recipe (Option A)

```
sticky top-0 z-10 bg-surface-base shadow-xs
```

Applied to `<thead>`. Per-cell DraggableHeader backgrounds swapped from `bg-muted` → `bg-surface-base` so the sticky per-column paints the same lift color as the thead (when border-separate is active, the per-cell bg is what actually paints, not the thead).

Z-index: z-10 (down from the prior z-20), strictly below app-header z-20 and Base UI popovers z-50. Plan Interfaces called for z-10; current behavior confirms no stacking conflict with pinned columns (z-index: 1).

### Row recipe

**Before:** `h-[var(--row-height)] transition-colors duration-quick ease-default hover:bg-hover-bg ${isEvenRow ? 'bg-muted/30' : ''}`
**After:**  `h-[var(--row-height)] transition-colors duration-quick ease-default hover:bg-hover-bg`

Zebra stripe dropped. Hover color affordance preserved.

### Pinning opaque background

`pinning-styles.ts` previously branched on `isEvenRow` to pick `var(--color-muted)` vs `var(--color-background)` for pinned cell backgrounds. With zebra gone, simplified to:
- Pinned header cells → `var(--color-surface-base)` (matches the header lift)
- Pinned body cells → `var(--color-surface-inset)` (matches the recessed pane)

Signature narrowed: `{ isEvenRow?: boolean; isHeader?: boolean }` → `{ isHeader?: boolean }`. No external call sites were passing isEvenRow after the table-body edit; table-footer already passes `{ isHeader: true }`. No other consumers.

## Deviations from 28-04-PLAN

- **Demoted thead z-index from z-20 to z-10.** Plan Interfaces explicitly called for z-10; the previous z-20 (pre-28-04) was wrong because it would stack-compete with the app header (also z-20 post-28-02). z-10 puts the sticky table header strictly below the app chrome.
- **`rounded-lg` added on the scroll wrapper**, not just inherited. Plan Task 1 said "add a `rounded-lg` on the scroll wrapper itself." ✅ Done.

No table-footer or row-selection regressions expected — footer still uses `getCommonPinningStyles(column, { isHeader: true })` which now resolves to `surface-base` (matching the header lift). If pilot visual testing finds the footer reads too much like another header, flag for 28-08 cleanup.

## Visual verification

Auto-approved under `--auto`. Key validation points that the build confirms:
- Scroll wrapper: `relative z-0 flex-1 overflow-auto rounded-lg bg-surface-inset` — inset pane with corners
- thead: `sticky top-0 z-10 bg-surface-base shadow-xs` — sticky lift with shadow-xs ambient halo
- tr: `hover:bg-hover-bg` only; no zebra
- Pinned cells: opaque inset-bg for body, base-bg for header (matches visible surfaces)

Manual spot-check items for next dev-server session:
- Scroll the table body — sticky column-header shadow should be visible as a subtle bottom-edge ambient halo against the inset pane
- Hover a row — subtle tint via hover-bg (neutral with 8% opacity in light, white at 6% in dark)
- Toggle dark mode — inset pane still reads as recessed (lighter-than-base inversion from 26-01), sticky header still legible
- Open a filter popover while table is scrolled — popover renders above sticky header (z-50 > z-10)

If the sticky-header shadow-xs reads as a weird glowy bar at rest (Pitfall 4), demote to `border-b border-border/40` and drop shadow-xs in a gap-closure plan. Not expected — shadow-xs dark-mode value is already a conservative 0.35 pure-black single-layer.

## Handoff notes for 28-08 (DS-17 sweep)

- table-footer.tsx may have its own `border-t bg-card` pattern that assumed the outer card frame; it doesn't render a visible footer frame in the current app but the grep-guard (28-08) should flag any ad-hoc `bg-card` or `rounded-* + border + shadow-sm` combos in `src/components/table/**`.
- The pinning-styles inset `boxShadow: '-4px 0 4px -4px gray inset'` uses a raw color keyword, not a token. Out-of-scope for Phase 28 (that's an elevation-gradient-color policy decision, not a surface/elevation sweep item). Flag if the project wants a future table-polish phase.
