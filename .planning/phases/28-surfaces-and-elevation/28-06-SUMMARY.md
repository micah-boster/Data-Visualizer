---
phase: 28-surfaces-and-elevation
plan: 06
status: complete
completed_at: 2026-04-17
commits:
  - d0648d5 feat(28-06): overlay family on semantic elevations
requirements_landed: [DS-15]
---

## What shipped

Nine overlay surfaces migrated to semantic elevations. Tooltip primitive intentionally preserved as the inverted pill.

### shadcn primitives (src/components/ui/*)

| File | Before key classes | After key classes |
|---|---|---|
| `popover.tsx` | `bg-popover p-2.5 shadow-md ring-1 ring-foreground/10` | `bg-surface-overlay p-2.5 shadow-elevation-overlay` |
| `sheet.tsx` | `bg-popover shadow-lg data-[side=*]:border-*` | `bg-surface-floating shadow-elevation-floating` (directional borders dropped) |
| `card.tsx` root | `rounded-xl bg-card py-4 ring-1 ring-foreground/10` + img `rounded-t-xl/b-xl` | `rounded-lg bg-surface-raised py-4 shadow-elevation-raised` + img `rounded-t-lg/b-lg` |
| `card.tsx` header | `rounded-t-xl` | `rounded-t-lg` (corner consistency with new outer radius) |
| `card.tsx` footer | `rounded-b-xl border-t bg-muted/50 p-4` | `rounded-b-lg border-t bg-muted/50 p-4` (radius normalized; rest as-is per plan) |
| `chart.tsx` Recharts tooltip | `border border-border/50 bg-background shadow-xl` | `bg-surface-overlay shadow-elevation-overlay` |
| `tooltip.tsx` | `bg-foreground text-background` **(unchanged)** | `bg-foreground text-background` — preservation comment added |

### Tooltip decision

**NOT migrated.** The shadcn tooltip primitive renders an inverted pill (`bg-foreground text-background`) that acts as a distinct hover-hint affordance — light-on-dark in light mode, dark-on-light in dark mode. Normalizing it to `bg-surface-overlay + shadow-elevation-overlay` would make every tooltip look like a mini popover, collapsing the visual distinction the research specifically flagged as worth keeping. A preservation comment was added immediately above the `<TooltipPrimitive.Popup>` className so future sweeps don't accidentally "fix" this.

### Call-site overlays

| File | Before | After |
|---|---|---|
| `query/query-command-dialog.tsx` | `rounded-xl bg-popover shadow-2xl ring-1 ring-foreground/10` | `rounded-xl bg-surface-floating shadow-elevation-floating` (rounded-xl retained per Pitfall 5 dialog exception) |
| `filters/filter-combobox.tsx` (popup only) | `rounded-md border bg-popover shadow-md` | `rounded-md bg-surface-overlay shadow-elevation-overlay` |
| `charts/curve-tooltip.tsx` | `rounded-lg border bg-popover ... shadow-md` | `rounded-lg bg-surface-overlay shadow-elevation-overlay ...` |
| `cross-partner/trajectory-tooltip.tsx` | `rounded-lg border bg-background/95 ... shadow-md backdrop-blur-sm` | `rounded-lg bg-surface-overlay shadow-elevation-overlay` (opacity + blur dropped per CONTEXT — popovers stay opaque) |

### Sort-dialog nested cards resolution

Nested row cards inside the sort dialog (lines 122 + 131) — can't double-shadow inside an already-shadowed dialog. Resolution:

- **Row container (line 122)**: `rounded-md border bg-card p-2` → `rounded-md bg-surface-raised/40 p-2`. Opacity-tinted raised surface provides separation without a second shadow.
- **Native select (line 131)**: `rounded-md border bg-background` → `rounded-md border border-input bg-surface-base`. Kept the border — this is a form control, not a card, and a11y requires a visible boundary. Swapped bg to surface-base (matches the app's form-control pattern) and made the border token-driven via `border-input`.

Deviation from plan literal: plan said "drop borders" for line 131. Kept it because native `<select>` without a border reads as broken. Flagged for a future form-control polish phase if the aesthetic reads off.

## Card.tsx footer observation

Card footer at line ~87 retains `bg-muted/50` + `border-t`. Per plan scope, left as-is. After the rounded-xl → rounded-lg swap on the outer Card, I normalized `rounded-b-xl` → `rounded-b-lg` on the footer so its bottom corners match the outer card — otherwise the footer would have straight corners inside the now-rounded-lg card, creating a visible corner mismatch.

No consumers use the Card footer in the current codebase (git grep confirms), so this is primitive-only polish. No visual impact on running app.

## Deviations from 28-06-PLAN

1. **Card.tsx inner img/header corners extended to match outer radius.** Plan only called for the outer `rounded-xl` → `rounded-lg` swap. Matching the `*:[img:first-child]:rounded-t-lg`, `*:[img:last-child]:rounded-b-lg`, CardHeader's `rounded-t-lg`, and CardFooter's `rounded-b-lg` keeps corners visually consistent.
2. **Sort-dialog select retained its border.** See above.
3. **Tooltip preservation comment** added above the Popup to prevent future "cleanup" passes from normalizing it.

## Verification

- All 9 target files (excluding tooltip by design) contain `shadow-elevation-(raised|overlay|floating)` — ✅
- tooltip.tsx still contains `bg-foreground` — ✅
- No remaining `ring-1 ring-foreground/10` in popover + card — ✅
- No remaining `backdrop-blur-sm` in trajectory-tooltip — ✅
- No remaining `shadow-md/lg/xl/2xl` across the 8 migrated files — ✅
- `npm run build` passes — ✅

## Pitfall 2 (z-index stacking) verification

No stacking conflicts introduced. Each overlay primitive retains its original z-50 anchor:
- Popover: `z-50` (Positioner) + `z-50` (Popup) — stacks above app header's z-20
- Sheet: `z-50` on Backdrop + Popup
- Command dialog: `z-50` on Backdrop + Popup
- Combobox popup: `z-50` on Positioner
- Chart tooltips (curve + trajectory): rendered by Recharts in portal-like positioning, not in the document flow — no z competition

## Handoff

- 28-07 will migrate `<main>` to `bg-surface-raised`. Popovers/dropdowns rendering above the content pane will now be `surface-overlay` on top of `surface-raised`. The overlay surfaces are lighter than raised (0.24 oklch dark vs 0.22 raised, 1.0 oklch light vs 1.0 raised same) so the lift is minimal on white-on-white — but the multi-layer shadow carries the depth. If pilot testing finds popovers feel flat on the new raised content pane, the elevation-overlay recipe's ambient blur radius (-4px blur offset, 0.12 opacity) is already the strongest non-floating tier and can't be pushed further without reclassifying to floating.
- 28-08 grep guard should: (a) whitelist `src/components/tokens/**` sample renderings, (b) flag any primary container in `src/components/**` that still uses `bg-card` + `shadow-(sm|md|lg|xl|2xl)` without `shadow-elevation-*`, (c) whitelist `src/components/ui/tooltip.tsx` explicitly (the `bg-foreground` pill is intentional).
