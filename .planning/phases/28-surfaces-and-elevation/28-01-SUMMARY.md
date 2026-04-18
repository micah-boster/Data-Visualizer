---
phase: 28-surfaces-and-elevation
plan: 01
status: complete
completed_at: 2026-04-17
commits:
  - 64b246e feat(28-01): add semantic elevation tokens + translucent surface
  - f3eea28 feat(28-01): extend /tokens page with semantic elevation + glass samples
requirements_landed: [DS-11, DS-15, DS-17]
---

## What shipped

Phase 28's token foundation — 4 semantic elevation recipes, 1 translucent surface variant, and a /tokens browser section to preview/copy them.

### Token additions (globals.css)

Landed in `@theme` (light primaries), `.dark` (hand-tuned), `:root` + `.dark` (surface value), and `@theme inline` (alias).

**Semantic elevations (both modes)**

| Token | Light opacity stack | Dark opacity stack (pure black) |
|---|---|---|
| `--shadow-elevation-chrome` | 0.04 / 0.05 / rim 0.06 | 0.35 / 0.30 / rim 0.04 |
| `--shadow-elevation-raised` | 0.06 / 0.08 / rim 0.08 | 0.45 / 0.40 / rim 0.05 |
| `--shadow-elevation-overlay` | 0.08 / 0.12 / rim 0.10 | 0.55 / 0.45 / rim 0.07 |
| `--shadow-elevation-floating` | 0.10 / 0.16 / rim 0.12 | 0.65 / 0.55 / rim 0.09 |

Values follow 28-RESEARCH Example 1 starting recipe exactly for the light-mode stack. Dark-mode values extrapolated from the existing `--shadow-sm/md/lg` dark pattern (0.35 → 0.65 top-layer ramp, 0.30 → 0.55 ambient ramp) and paired with dimmer rim-highlights (0.04 → 0.09) so the inset line reads as depth, not glare.

**Translucent surface**

- Light: `color-mix(in oklch, var(--surface-raised) 80%, transparent)`
- Dark: `color-mix(in oklch, var(--surface-raised) 82%, transparent)` (2% more opaque per research recipe)

### Tailwind utility emission (confirmed via build)

- `shadow-elevation-chrome`, `shadow-elevation-raised`, `shadow-elevation-overlay`, `shadow-elevation-floating` — emit automatically from the `--shadow-*` namespace in `@theme`
- `bg-surface-translucent` — emits from the `--color-surface-translucent` alias in `@theme inline`

### /tokens browser layout

Kept the existing tab structure (`Surfaces & Shadows` is one tab, per 26-05 precedent). Did not add a separate Elevation tab — instead extended `ShadowSample` with three new sections below the raw-primitive grid:

1. **Semantic Elevations** — 4-up grid, one `TokenCard` per recipe, each sample padded with `size-28` (up from the raw primitives' `size-20`) so the outer ambient blur is never clipped (Pitfall 1). Each card shows the consumer guidance ("Consumers: KPI cards, chart shells, query cards") so downstream authors see where to reach for each level.
2. **Translucent Surface** — single card on a checkered `brand-green` / `brand-purple` backdrop so the 20% transparency reads as actual glass rather than looking opaque against raised paper.
3. **Radius** — unchanged, kept in place at the bottom.

Each sample hand-spells its className string (no template-literal interpolation) so Tailwind v4's content scanner picks up `shadow-elevation-chrome`, `shadow-elevation-raised`, `shadow-elevation-overlay`, `shadow-elevation-floating`, and `bg-surface-translucent` as literals.

## Deviations from 28-01-PLAN

None material. Dark-mode opacity values are the only "Claude's Discretion" fill-in the plan delegated; everything else matches the recipe in the plan verbatim.

## Build + verification

- `grep -c shadow-elevation- src/app/globals.css` = 8 ✅ (4 tokens × 2 modes)
- `grep -c surface-translucent src/app/globals.css` = 3 ✅ (:root, .dark, @theme inline alias)
- `grep -cE 'shadow-elevation-(chrome|raised|overlay|floating)' src/components/tokens/shadow-sample.tsx` = 12 ✅ (≥4 required)
- `npm run build` ✅ compiles clean in 3.6s, `/tokens` route still prerenders static
- No existing token renamed, moved, or removed — git diff confirms pure additions

## Handoff notes for Wave 2 (28-02/03/04)

- `shadow-elevation-chrome` + `bg-surface-translucent` + `backdrop-blur-md` are the three classes the header sweep (28-02) needs — all now available
- `shadow-elevation-raised` is ready for the KPI sweep (28-03)
- Table sweep (28-04) does NOT need any new elevation token — inset-recession is already carried by Phase 26's `bg-surface-inset`; 28-04's sticky column-header lift will likely use the raw `shadow-xs` plus a surface bg swap (see 28-04's key_links)

If a pilot finds the opacities read too heavy/light, adjustments happen in the pilot's gap closure, not here — the foundation is now locked.
