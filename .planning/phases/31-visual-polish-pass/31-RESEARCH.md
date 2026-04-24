# Phase 31: Visual Polish Pass — Research

**Researched:** 2026-04-18
**Domain:** Pure CSS / Tailwind v4 token composition on top of Phases 26–30 primitives
**Confidence:** HIGH (domain is entirely in-repo; no external library discovery needed)

<user_constraints>
## User Constraints (from 31-CONTEXT.md)

### Locked Decisions

**Dividers & border consistency (DS-29, DS-32):**
- Gradient-fade dividers apply to **two places only**: horizontal section separators (KPI band ↔ charts ↔ table) and the ToolbarGroup vertical dividers shipped in Phase 29. Everything else keeps hard borders.
- Fade shape: **center-solid, transparent at both ends** — `linear-gradient(to right, transparent, <border>, transparent)` for horizontals; vertical equivalent for ToolbarGroup.
- Single border-opacity standard: **~8%** (very subtle hairline). Cards and the table should read as almost borderless and rely on surface + shadow (Phase 28) to define shape.
- **Same token in both modes** — one `--border-opacity` (or equivalent) variable; no separate dark-mode override.

**Dark mode glass highlight (DS-30):**
- Apply **only to `surface-raised`** (KPI cards, chart cards, query cards). Header, sidebar, and overlay/floating surfaces stay untouched.
- Technique: **inset `box-shadow` at the top edge** — e.g. `inset 0 1px 0 0 rgb(255 255 255 / 0.07)`. No border-top changes, no pseudo-elements.
- Intensity: **~6–8% white**. Subtle — noticed only when looked for.
- **Dark mode only.** Light mode gets no analogous treatment; Phase 28 shadows carry the elevation read there.

**Focus glow (DS-31):**
- Applies to **form controls + interactive containers**: inputs, selects, comboboxes, buttons, plus `focus-within` on ToolbarGroups and saved-view rows. Does **not** apply to every tab-stop (cells, icon buttons in a row are excluded).
- Color: the existing **`--ring` / accent token**. Do not introduce a new focus color — preserve single focus language across the app.
- Shape: **soft shadow-spread glow** — `box-shadow: 0 0 0 3px rgb(var(--ring) / 0.30)` (or equivalent). Diffused, not a hard outline.
- A11y fallback: **keep a visible hard outline** as fallback when `:focus-visible` isn't honored. Glow is static (no animation), so no `prefers-reduced-motion` concern.

**Hover & scrollbars (DS-33, DS-34):**
- Table row hover: **very soft neutral tint (~muted/4)** with `duration-quick` + `ease-default` from the Phase 26 motion tokens. Neutral, not accent-tinted.
- Hover signal is **tint only** — no geometry shift, no leading-edge accent bar, no chevron fade-in. Phase 30 owns any drill-affordance motion; this phase must not animate layout.
- Scrollbars: **thin, always-visible, theme-aware** (8–10px thumb, subtle track, follows light/dark). No overlay/fade-in behavior.
- Scrollbar scope: **only named scroll containers** (table, sidebar, popovers). Document/body scroll stays with the OS/browser default.

### Claude's Discretion

- Exact pixel sizes for scrollbar thumb/track (within the 8–10px band).
- Exact RGB values for the glass highlight and row-hover tint, within the stated intensity ranges.
- CSS token naming and whether to introduce new `--` variables vs. composing existing ones.
- Whether the glass highlight is a new surface token variant or a mixin applied at the surface-raised class level.
- Whether scrollbar styling is centralized in `globals.css` or scoped via a utility class applied per container.

### Deferred Ideas (OUT OF SCOPE)

- Drill-transition motion, hover lifts, press feedback, skeleton-to-content fades — all Phase 30 territory.
- A11Y audit (contrast, ARIA, keyboard-nav completeness, reduced-motion) — Phase 33.
- Light-mode analog to the glass highlight — explicitly declined.
- Row hover affordances beyond tint (accent bar, chevron) — available if Phase 30 or a later feature needs them.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DS-29 | Dividers use gradient fade (center-to-transparent) instead of hard border lines | §Divider Sites Inventory, §Gradient Divider Technique |
| DS-30 | Dark mode cards have hairline top highlight for glass effect | §Glass Highlight — Composition Sites, §Multi-Shadow Composition Pitfalls |
| DS-31 | Focus-within states use subtle glow ring instead of hard outline | §Focus Glow Audit, §Shared Focus Utility Strategy |
| DS-32 | Border opacities consistent across all components (one standard value) | §Border-Opacity Standard — Migration Scope |
| DS-33 | Table row hover uses smooth background tint transition | §Row Hover — Current State and Retune |
| DS-34 | Scrollbar styling refined and consistent in both themes | §Scrollbar Strategy, §Named Scroll Containers Inventory |
</phase_requirements>

## Summary

Phase 31 is a pure-CSS finishing pass. Everything sits on top of the tokens that shipped in Phase 26 (`--ring`, `--border`, `--duration-quick`, `--ease-default`, `--surface-raised`, `--hover-bg`, state colors), the elevation shadows from Phase 28 (`--shadow-elevation-raised` etc.), and the motion utilities from Phase 30 (`transition-colors duration-quick ease-default` row hover wiring). The six requirements each resolve to small, additive changes to `src/app/globals.css` and a handful of migration edits at existing surfaces — no new dependencies, no architectural moves, no new motion primitives.

Three things make the plan stable:

1. **Surface inventory is bounded and known.** Every "surface-raised" today lives in ~17 files (grep: 17 hits for the literal string). Every named scroll container lives in 6 files. Every gradient divider target is already listed in CONTEXT. No broad audit is required before wave 1 — just a migration pass.
2. **The guard pattern is established.** Phase 27/28/29/30 each shipped a `check:*` POSIX-grep script (see `scripts/check-type-tokens.sh`, `scripts/check-surfaces.sh`, `scripts/check-components.sh`, `scripts/check-motion.sh`). A new `check:polish` guard should be modeled on these verbatim — same allowlist shape, same `find … | xargs grep -nE` idiom, same `set -euo pipefail`.
3. **No conflicts with Phase 30.** The table row hover wiring (`transition-colors duration-quick ease-default hover:bg-hover-bg`) is already live at `src/components/table/table-body.tsx:48`. DS-33 here is about retuning the tint intensity, not rewiring the transition.

**Primary recommendation:** Land DS-32 (border-opacity standard) first as a foundation — the other requirements either consume it (DS-29 gradient dividers need a canonical border color) or are orthogonal to it (DS-30, DS-31, DS-33, DS-34). Then land DS-30, DS-31, DS-33, DS-34 in parallel, and close with a `check:polish` guard + `/tokens` Visual Polish tab.

## Current Codebase State

### Phase 26 Tokens Available (reuse, do NOT reintroduce)

From `src/app/globals.css` (verified inline):

| Token | Value | Phase 31 Use |
|-------|-------|--------------|
| `--border` (light) | `color-mix(in oklch, var(--neutral-500) 15%, transparent)` | Base for gradient divider color; DS-32 canonical opacity source |
| `--border` (dark) | `color-mix(in oklch, oklch(1 0 0) 10%, transparent)` | Same |
| `--ring` | `var(--brand-green-bright)` in both modes | DS-31 focus glow color (DO NOT INTRODUCE NEW COLOR) |
| `--hover-bg` (light) | `color-mix(in oklch, var(--neutral-500) 8%, transparent)` | DS-33 row hover tint (may need retune per CONTEXT ~muted/4) |
| `--hover-bg` (dark) | `color-mix(in oklch, oklch(1 0 0) 6%, transparent)` | Same |
| `--duration-quick` | `120ms` | DS-33 row hover transition |
| `--ease-default` | `cubic-bezier(0.4, 0, 0.2, 1)` | DS-33 row hover easing |
| `--shadow-elevation-raised` | 3-layer shadow (incl. `inset 0 1px 0 0 oklch(1 0 0 / 0.08)` at light; `0.05` at dark) | DS-30 glass highlight — ALREADY has an inset highlight layer in dark mode |
| `--surface-raised` (light/dark) | `oklch(1 0.004 85)` / `oklch(0.22 0.012 60)` | DS-30 target surface |
| `--neutral-500` (both modes) | `oklch(0.62 0.014 …)` | Source for neutral row-hover tint |

**Critical finding for DS-30:** `--shadow-elevation-raised` (dark) ALREADY contains an inset rim highlight — `inset 0 1px 0 0 oklch(1 0 0 / 0.05)`. The Phase 31 glass highlight is a REFINEMENT of this value (to ~0.07 per CONTEXT), not a new shadow layer. Decision path: either bump the existing inset line inside `--shadow-elevation-raised` (dark), OR introduce `--shadow-glass-highlight: inset 0 1px 0 0 oklch(1 0 0 / 0.07)` as a companion token and compose it on `surface-raised` consumers. See pitfall below.

### Phase 28 Surface Composers (DS-30 targets)

Files that apply `surface-raised` or `shadow-elevation-raised` today (17 hits via grep, excluding /tokens demos):

Production sites consumed for DS-30:
- `src/components/patterns/stat-card.tsx` (line 113, chassis) — KPI cards
- `src/components/patterns/data-panel.tsx` (line 71, chassis) — chart/matrix shells
- `src/components/query/query-response.tsx` (3 variants)
- `src/components/query/query-search-bar.tsx`
- `src/components/anomaly/anomaly-summary-panel.tsx`
- `src/components/kpi/kpi-summary-cards.tsx` (skeleton + empty)

**Explicit non-targets per CONTEXT lock:**
- `src/components/layout/header.tsx` — translucent surface, NOT raised (confirmed by Phase 28 VERIFICATION and `check:surfaces` allowlist)
- Sidebar (`src/components/ui/sidebar.tsx`, `src/components/layout/app-sidebar.tsx`) — `surface-base`
- Overlays (popover / sheet / dialog / tooltip / combobox popup) — `surface-overlay` / `surface-floating`

### Phase 30 Motion Wiring (DS-33 baseline)

`src/components/table/table-body.tsx:48`:
```tsx
className="h-[var(--row-height)] transition-colors duration-quick ease-default hover:bg-hover-bg"
```

DS-33 scope here is **tint intensity retune only** (CONTEXT: "formalizes the tint intensity ~muted/4, not the transition wiring"). Current tint uses `--hover-bg` which resolves to `neutral-500 @ 8%` (light) and `white @ 6%` (dark). CONTEXT's ~muted/4 is a directional signal ("softer than current"); final RGB is Claude's Discretion. The existing token may already be close enough — validate in browser.

### Existing Scrollbar Code (DS-34 starting point)

`src/app/globals.css:608-630` already has `::-webkit-scrollbar` rules applied **globally** to every scroll container. This contradicts CONTEXT's "only named scroll containers; document/body scroll stays with OS default" lock.

Current rules:
```css
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
/* …thumb + track + dark-mode overrides */
```

Phase 31 must **narrow** this. Two viable approaches:

| Approach | Pros | Cons |
|----------|------|------|
| A) Scope to utility class (`.thin-scrollbar`) and apply per-container | Explicit opt-in; body scroll untouched; overridable per container | Requires editing every named scroll container + check:polish must enforce the class |
| B) Keep global rules but selectively un-style `html`/`body` | Less file-churn | Harder to reason about; violates "only named containers" intent |

**Recommendation:** Approach A. It aligns with Phase 26's `[data-density="dense"]` scope-local pattern and the existing `.hover-lift` class idiom. The utility class can live in `@layer utilities` in globals.css.

## DS-29: Gradient Dividers — Divider Sites Inventory

### Horizontal dividers — audit (from `border-t` / `<Separator>` / `<hr>` grep)

**In-scope (per CONTEXT — section separators between KPI band / charts / table):**

The data-display.tsx layout currently has implicit section breaks between:
1. KPI summary cards → charts expand region (line 579-611)
2. Charts region → data-table (line 619+ continuing past the sparkline)

These are **currently implicit** (padding + surface change), not rendered as actual `<hr>` or Separator. Phase 31 DS-29 either:
- (a) Adds explicit gradient dividers as new elements between these sections, OR
- (b) Introduces a `SectionDivider` component and places it at the two junctions.

**Out-of-scope (keep hard borders per CONTEXT):**
- `src/components/ui/card.tsx:87` — card footer `border-t` (card-internal, not section)
- `src/components/patterns/data-panel.tsx:84` — DataPanel footer `border-t border-border` (panel-internal)
- `src/components/toolbar/filter-popover.tsx:118` — popover internal `border-t pt-3`
- `src/components/charts/curve-legend.tsx:78` — legend internal `border-t border-border`
- `src/components/cross-partner/matrix-*.tsx` — table row `border-b` (row separators, not section)
- `src/components/table/column-preset-tabs.tsx:13` — tab row bottom border
- `src/components/toolbar/unified-toolbar.tsx:127` — toolbar bottom border
- `src/components/layout/header.tsx` — NO border-b (shadow-xs is carrying the separation per Phase 26-03)
- `<hr>` — zero hits in src/

### Vertical dividers — audit

**In-scope (ToolbarGroup):**
- `src/components/patterns/toolbar-divider.tsx` — canonical recipe `mx-0.5 h-4 w-px bg-border`. This is the ONE target for DS-29 vertical fade. Today it's a hard 1px line.
- 3 consumption sites per Phase 29 VERIFICATION: `unified-toolbar.tsx` (×2), `comparison-matrix.tsx` (×1).

**Out-of-scope (keep hard):**
- `src/components/layout/header.tsx:34` — `<Separator orientation="vertical" className="mr-2 !h-4" />` (layout chrome, keep solid)
- `src/components/ui/sidebar.tsx:646` — inline menu tree `border-l border-sidebar-border` (structural indent, keep solid)
- `src/components/patterns/stat-card.tsx:288` — comparison `divide-x divide-border` (two-column split inside a card — internal, keep solid per CONTEXT)
- `src/components/cross-partner/trajectory-legend.tsx:35` — legend inline `bg-border` pill separator (legend-internal)

### Gradient Divider Technique

Two viable implementations:

**Option 1 — Tailwind arbitrary value on each instance:**
```tsx
<div className="h-px w-full bg-[linear-gradient(to_right,transparent,var(--border),transparent)]" />
```

**Option 2 — Utility class in globals.css:**
```css
@layer utilities {
  .divider-horizontal-fade {
    height: 1px;
    width: 100%;
    background: linear-gradient(to right, transparent, var(--border), transparent);
  }
  .divider-vertical-fade {
    width: 1px;
    height: 100%;
    background: linear-gradient(to bottom, transparent, var(--border), transparent);
  }
}
```

**Recommendation:** Option 2 (utility class). Precedent: `.hover-lift` in globals.css (line 566) is the same idiom — composite CSS property that would be fragile as inline Tailwind arbitrary value. Added benefit: the utility name is greppable, so the `check:polish` guard can forbid raw `linear-gradient(to right, transparent, …)` outside the allowlist.

**API surface:** expose as a small `SectionDivider` React component in `src/components/layout/section-divider.tsx` (mirroring `section-header.tsx` precedent). Avoid ToolbarDivider refactor — it's already a small composable; update its internal className to include `divider-vertical-fade` recipe and keep the wrapper component unchanged (existing 3 import sites don't change).

## DS-30: Glass Highlight — Composition Sites

### Where it applies (surface-raised consumers, dark mode only)

Same list as §Phase 28 Surface Composers above. Pragmatically this is:
- StatCard chassis (affects every KPI card)
- DataPanel chassis (affects every chart/matrix/query shell)
- Anomaly panel
- Query response / search bar
- KPI skeleton + empty states

### Two implementation paths

**Path A — Bump existing `--shadow-elevation-raised` inset layer (dark):**
```css
/* .dark { ... } */
--shadow-elevation-raised:
  0 1px 2px 0 oklch(0 0 0 / 0.45),
  0 4px 12px -2px oklch(0 0 0 / 0.40),
  inset 0 1px 0 0 oklch(1 0 0 / 0.07);  /* was 0.05 */
```

Pro: zero consumer edits. Con: couples the elevation token to the glass-highlight intensity; if Phase 32+ wants to re-tune one independently, they're now tangled.

**Path B — Composition via new companion token:**
```css
.dark {
  --shadow-glass-highlight: inset 0 1px 0 0 oklch(1 0 0 / 0.07);
}
:root {
  --shadow-glass-highlight: 0 0 #0000;  /* no-op in light mode */
}
```

Then on each surface-raised consumer: `className="… shadow-elevation-raised shadow-[var(--shadow-glass-highlight)]"` — but Tailwind shadow composition is the pitfall (see below).

**Recommendation:** Path A. CONTEXT language ("inset `box-shadow` at the top edge"; "Apply only to `surface-raised`"; "Dark mode only") describes a surface-intrinsic property, not a composable modifier. The existing `--shadow-elevation-raised` dark value already has the inset layer — Phase 31 is tuning it, not architecting new. Path B would require touching ~7 consumer files AND fighting Tailwind box-shadow composition.

**Light mode:** per CONTEXT lock, NO light-mode analog. `--shadow-elevation-raised` (light) keeps `inset 0 1px 0 0 oklch(1 0 0 / 0.08)` untouched — this is already doing heavy lifting in light mode as a top rim highlight on warm paper, and CONTEXT declined a further treatment.

### Multi-shadow composition pitfall

**Pitfall:** CSS `box-shadow` is comma-separated layers, and Tailwind's `shadow-*` utilities emit `box-shadow: value`, NOT `box-shadow: inherit, value`. If you write `<div class="shadow-elevation-raised shadow-[inset_0_1px_0_0_rgb(255_255_255/0.07)]">`, the second utility **replaces** the first — the 3-layer elevation shadow is clobbered and only the 1-layer inset remains.

This rules out stacking via two Tailwind utilities. Options:
1. Compose shadows inside the CSS var (Path A — recommended).
2. Use `box-shadow: var(--shadow-elevation-raised), inset 0 1px 0 0 rgb(255 255 255 / 0.07);` via inline style (check:motion would currently NOT flag this since it only catches transitionDuration inline styles; check:surfaces already allowlists `surface-raised` and elevation tokens). But inline styles break the token discipline.
3. Create a combined CSS class `.surface-raised-glass` that sets `background-color: var(--surface-raised); box-shadow: var(--shadow-elevation-raised); position: relative;` then uses `::before` for the highlight — rejected by CONTEXT ("no pseudo-elements").

Path A via `--shadow-elevation-raised` tuning is the only clean route.

## DS-31: Focus Glow — Audit and Shared Utility

### Current focus-visible inventory (23 hits in 10 files)

**shadcn primitives already using `--ring` via `focus-visible:ring-3 focus-visible:ring-ring/50` (or similar):**
- `src/components/ui/button.tsx:7` — canonical recipe (`focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50`)
- `src/components/ui/input.tsx:12` — same recipe
- `src/components/ui/checkbox.tsx:13`
- `src/components/ui/switch.tsx:19`
- `src/components/ui/sidebar.tsx` — 5 hits (`focus-visible:ring-2`, uses `ring-sidebar-ring`)
- `src/components/ui/scroll-area.tsx:21` — `focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1`

**App-level hand-rolled focus:**
- `src/components/tokens/token-browser.tsx` — 6 tab triggers using `focus-visible:ring-2 focus-visible:ring-ring` (tokens surface, arguably in demo scope)
- `src/components/tokens/motion-demo.tsx` — 3 hits
- `src/components/tokens/token-card.tsx` — 2 hits
- `src/components/tokens/color-swatch.tsx` — 1 hit
- `src/components/toolbar/save-view-popover.tsx:97` — raw `focus:ring-1 focus:ring-ring` (NOT focus-visible; legacy pattern)
- `src/components/filters/filter-combobox.tsx:37` — `focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1`

### focus-within — only 1 hit

`src/components/ui/sidebar.tsx:569` — `group-focus-within/menu-item:opacity-100` (decorative, not a visible focus ring)

This is significant: CONTEXT requires `focus-within` rings on ToolbarGroups and saved-view rows, and **neither currently has any focus-within treatment**. Those are net-new additions, not migrations.

### Applies-to scoping (per CONTEXT)

| Target | Current | Phase 31 Action |
|--------|---------|------------------|
| Button (default/secondary/outline/ghost/destructive/link) | `focus-visible:ring-3 ring-ring/50` — already a spread-glow | **Keep; tune opacity if needed** |
| Input | `focus-visible:ring-3 ring-ring/50` | **Keep; tune** |
| Checkbox, Switch, Scroll Area | `focus-visible:ring-[3px] ring-ring/50` | **Keep; normalize to shared utility** |
| Combobox (filter-combobox.tsx) | `focus:ring-2 focus:ring-ring focus:ring-offset-1` (old `focus:`, NOT `focus-visible:`) | **Migrate to focus-visible + shared utility** |
| Save-view popover input | `focus:ring-1 focus:ring-ring` | **Migrate** |
| ToolbarGroup (via ToolbarDivider/unified-toolbar.tsx) | No focus-within | **Add `focus-within:` glow on parent cluster** |
| Saved-view rows (views-sidebar.tsx) | Individual items only | **Add `focus-within:` glow on list row** |
| Table cells | NO focus treatment | **Excluded per CONTEXT (not every tab-stop)** |
| Icon buttons in row | NO focus treatment | **Excluded per CONTEXT** |

### Shared focus utility strategy

**Recommendation:** Introduce `.focus-glow` utility in `@layer utilities` and standardize the shape:

```css
@layer utilities {
  .focus-glow:focus-visible {
    outline: 2px solid var(--ring); /* a11y fallback, visible when ring shadow fails */
    outline-offset: 2px;
    box-shadow: 0 0 0 3px color-mix(in oklch, var(--ring) 30%, transparent);
  }
  .focus-glow-within:focus-within {
    /* Same visual, applied at parent level */
    outline: 2px solid var(--ring);
    outline-offset: 2px;
    box-shadow: 0 0 0 3px color-mix(in oklch, var(--ring) 30%, transparent);
  }
}
```

Advantages:
- Single source of truth for the "focus language"
- A11y fallback (outline) sits inside the utility so every consumer gets it for free
- `check:polish` can forbid raw `focus-visible:ring-[Npx]` outside shadcn primitives allowlist

**Note on shadcn primitives:** the existing `focus-visible:ring-3 ring-ring/50` recipe in button/input produces approximately the same visual effect (spread-glow at ~50% opacity). CONTEXT's 30% value is softer. Decision to align or keep divergent is Claude's Discretion. Recommendation: normalize — retarget shadcn primitives' className to use `focus-glow` so the "single focus language" is literally a single class.

### Reduced-motion interaction

CONTEXT states "glow is static (no animation), so no prefers-reduced-motion concern." This is correct — no `transition-shadow` should be added. Phase 30's `@media (prefers-reduced-motion: reduce)` block in globals.css zeroes `transition-duration`, which means even if someone ADDs a transition-shadow by accident, reduced-motion users get instant-on. **Verification step for the planner:** the `.focus-glow` utility must NOT include a `transition-property: box-shadow`. Add this to the `check:polish` guard as a negative rule.

## DS-32: Border-Opacity Standard — Migration Scope

### Current state (grep for `border/[0-9]+`)

**Direct hits in app code:** only 1 in `src/components/ui/chart.tsx:1` (literal `border/` pattern; probably a class-list concat). No `border/50`, `border/30`, `border/20`, or raw hex `border-[#…]` patterns in app code.

**What grep MISSED but matters:**
- `src/components/ui/button.tsx:14` — `dark:border-input` (not `border/50` syntax, but uses `--input` which is its own opacity value `color-mix(in oklch, oklch(1 0 0) 15%, transparent)` — higher than `--border` at 10%)
- `src/components/ui/input.tsx:12` — `border-input` (same)
- Multiple `border-border` (canonical, untouched — consumes `--border`)
- `src/components/toolbar/save-view-popover.tsx:97` — bare `border` (uses default `--border`)
- `src/components/cross-partner/matrix-*.tsx` — table row `border-b` with no color (default `--border`)

### What changes under CONTEXT lock

CONTEXT says "single border-opacity standard: ~8%" — tighter than the current `--border` (light: 15%, dark: 10%). It also says "same token in both modes — one `--border-opacity` variable; no separate dark-mode override."

This is a **token retune**, not a component sweep. Two implementation paths:

**Path A — Retune `--border` directly (both modes to 8%):**
```css
:root {
  --border: color-mix(in oklch, var(--neutral-500) 8%, transparent);
}
.dark {
  --border: color-mix(in oklch, oklch(1 0 0) 8%, transparent);
}
```
Pro: zero consumer edits. Every `border-border`, `bg-border`, `divide-border` site automatically softens. Also updates `--sidebar-border` by cascade if aliased.

Con: shadcn's `--input` (15% in both modes) stays louder than `--border`. Form controls will visibly have HARDER borders than card/table chrome. CONTEXT doesn't explicitly address `--input` — the planner needs to decide whether form-control `border-input` also softens. Recommendation: leave `--input` unchanged — form controls benefit from a slightly stronger frame for affordance; this is the shadcn convention.

**Path B — Introduce new `--border-hairline` token and migrate:**
```css
:root, .dark {
  --border-hairline: color-mix(in oklch, currentColor 8%, transparent);
}
```
Con: requires touching every `border-border` site. Given the "near-borderless" intent, Path A wins.

### Dark-mode same-token note

CONTEXT explicitly says "same token in both modes." Literal reading: the `color-mix` source is the same construction in both blocks (neutral-500 in light, white in dark) but the OPACITY is 8% in both. This matches Path A's shape.

**Caveat:** a literal "one var for both modes" reading could mean `--border: color-mix(in oklch, currentColor 8%, transparent)` (using `currentColor` so it picks up `--foreground` naturally). This is clever but risky — `currentColor` depends on the text color of the consumer, and `bg-border` utilities use `background-color`, which ignores `currentColor`. Verify empirically or stick with the two-block (light/dark) construction. Recommendation: two-block for predictability.

### Guard — check:polish for DS-32

Pattern to catch regressions:
- Forbid `border-\[(#|rgb|oklch|var\()` (raw hex/rgb/oklch/var border colors) outside allowlist
- Forbid `border-(border|input|sidebar-border)/[0-9]+` (opacity overrides on border tokens)
- Forbid `border-(red|emerald|amber|blue|…)-[0-9]+` (raw Tailwind palette border colors) — Phase 28 precedent, extend to app code

## DS-33: Row Hover — Current State and Retune

### Current state

`src/components/table/table-body.tsx:48`:
```tsx
<tr
  className="h-[var(--row-height)] transition-colors duration-quick ease-default hover:bg-hover-bg"
>
```

This is Phase 30-03 output. Works correctly. Honors reduced-motion via the globals.css `@media` block.

### What Phase 31 retunes

CONTEXT: "very soft neutral tint (~muted/4)". Current `--hover-bg`:
- Light: `color-mix(in oklch, var(--neutral-500) 8%, transparent)` — 8% neutral
- Dark: `color-mix(in oklch, oklch(1 0 0) 6%, transparent)` — 6% white

"muted/4" is a directional phrase — implies /4 opacity on `--muted` (the shadcn semantic muted background token). `--muted` is aliased to `--surface-inset` in both modes (light `oklch(0.965 0.012 85)` warm cream, dark `oklch(0.12 0.010 60)` warm near-black). Applying /4 (25%) of that against the raised card is near-invisible in dark mode.

**Realistic read:** CONTEXT's "~muted/4" is a shorthand for "about one quarter as strong as muted, or about one quarter through the hover-bg scale." The existing `--hover-bg` (8% light / 6% dark) may already be approximately right; DS-33 is about validating visually in-browser and re-tuning only if it reads too hot.

**Recommendation:** Keep `--hover-bg` as-is; if visual QA flags the row hover as too loud vs. CONTEXT target (Linear/Notion feel), soften to 5% light / 4% dark. Claude's Discretion explicitly allows this exact tune.

**No wiring change.** Table row class `hover:bg-hover-bg` stays. DS-33 ships as a token-value change only, or as a no-op if current values are judged sufficient.

### Out-of-table hover sites (DS-33 explicitly scopes to table rows)

Other hover handlers in the app (button, filter chips, menu items) use `hover:bg-muted`, `hover:bg-muted/30`, `hover:bg-muted/50` — not `hover:bg-hover-bg`. CONTEXT scopes DS-33 to **table rows only**. These other sites are:
- Unchanged by Phase 31
- Candidates for a future hover-token sweep (but not in this phase)

## DS-34: Scrollbar Strategy

### Named scroll containers (from `overflow-y-auto|overflow-auto` grep)

| File | Site | Scrollbar Owner |
|------|------|-----------------|
| `src/components/table/data-table.tsx:347` | Main table body wrapper (`overflow-auto rounded-lg bg-surface-inset`) | YES — primary target |
| `src/components/ui/sidebar.tsx:374` | SidebarContent (`overflow-auto`, already has `no-scrollbar` class) | Tricky — has opt-out class |
| `src/components/filters/filter-combobox.tsx:45` | Combobox popup (`max-h-60 overflow-auto`) | YES — popover-style |
| `src/components/table/sort-dialog.tsx:116` | Dialog body (`flex-1 overflow-y-auto`) | YES — popover-style |
| `src/components/query/query-response.tsx:94` | Query response body (`max-h-[200px] overflow-y-auto`) | YES — popover-style |
| `src/components/charts/curve-legend.tsx:33` | Curve legend list (`overflow-y-auto`) | Secondary |

Plus shadcn primitives: ScrollArea (`src/components/ui/scroll-area.tsx`) uses @base-ui's primitive with its own thumb styling (orthogonal to native scrollbars).

### Cross-browser technique (verified against current MDN / CSS docs)

**Firefox / modern Chromium (2025+):**
```css
.thin-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: var(--scrollbar-thumb) var(--scrollbar-track);
}
```

**WebKit (Chrome, Safari):**
```css
.thin-scrollbar::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}
.thin-scrollbar::-webkit-scrollbar-track {
  background: var(--scrollbar-track);
}
.thin-scrollbar::-webkit-scrollbar-thumb {
  background: var(--scrollbar-thumb);
  border-radius: 4px;
  border: 2px solid var(--scrollbar-track); /* optional — creates inset look */
}
.thin-scrollbar::-webkit-scrollbar-thumb:hover {
  background: var(--scrollbar-thumb-hover);
}
```

Both are layered together — `scrollbar-width`/`scrollbar-color` are ignored by WebKit (no-op fallback), `::-webkit-scrollbar` is ignored by Firefox.

### Token definitions (Claude's Discretion on values, within 8–10px band)

```css
:root {
  --scrollbar-track: transparent;
  --scrollbar-thumb: color-mix(in oklch, var(--neutral-500) 30%, transparent);
  --scrollbar-thumb-hover: color-mix(in oklch, var(--neutral-500) 45%, transparent);
}
.dark {
  --scrollbar-thumb: color-mix(in oklch, oklch(1 0 0) 20%, transparent);
  --scrollbar-thumb-hover: color-mix(in oklch, oklch(1 0 0) 35%, transparent);
}
```

The existing globals.css rules (line 608-630) are close to this intent but apply globally. Phase 31 should:
1. **Remove** the global `::-webkit-scrollbar` rules from `@layer base`
2. **Add** `.thin-scrollbar` utility in `@layer utilities` with both `scrollbar-width/color` + `::-webkit-scrollbar`
3. **Apply** `.thin-scrollbar` to each named container above

### Centralize vs. per-container (Claude's Discretion)

**Recommendation:** Centralized utility class (`.thin-scrollbar`). Precedent: `.hover-lift`. Allows a single definition and greppable adoption.

### Scrollbar guard

`check:polish` should forbid `::-webkit-scrollbar` outside:
- `src/app/globals.css` (the definition site)
- shadcn primitives allowlist (ScrollArea has its own styling)

And forbid global `body`/`html` scrollbar rules in globals.css outside the utility class context.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| New motion timing for focus glow | Custom `transition-[box-shadow]` timing | Nothing — glow is static per CONTEXT | Keeps reduced-motion story intact |
| New focus color | Add a "brand-focus" or "halo" token | `var(--ring)` | CONTEXT locks single focus language |
| Per-component focus ring recipe | `focus-visible:ring-2 ring-ring` in every new component | `.focus-glow` utility | Single source of truth, guardable |
| Separate light-mode glass highlight | Pseudo-element, light-mode inset shadow | Nothing — CONTEXT explicitly declined | Phase 28 shadows already carry elevation in light |
| Custom scrollbar JS library (e.g. OverlayScrollbars, simplebar) | NPM install | CSS-only approach | Scope is thin visible bar; CSS-only is cross-browser-viable in 2026 |
| Per-card glass-highlight class | Add `.card-glass` variant, wire into StatCard / DataPanel | Bump `--shadow-elevation-raised` inset layer | Shadow composition is the pitfall |

## Common Pitfalls

### Pitfall 1: Tailwind shadow utility replacement (DS-30 blocker)

**What goes wrong:** Stacking two `shadow-*` utilities clobbers instead of composing.

```tsx
<div className="shadow-elevation-raised shadow-[inset_0_1px_0_0_rgb(255_255_255/0.07)]">
  {/* Only the inset shadow survives; the 3-layer elevation shadow is GONE */}
</div>
```

**Why:** Each Tailwind shadow utility emits a complete `box-shadow: …` declaration, so the second wins in CSS cascade.

**How to avoid:** Compose inside the CSS variable (Path A — bump the inset layer inside `--shadow-elevation-raised` dark mode).

**Warning sign:** DataPanel in dark mode loses its ambient diffuse shadow after the glass highlight lands. If panels look flat in dark, the shadow was replaced not composed.

### Pitfall 2: focus-within triggering on child hover (DS-31)

**What goes wrong:** A `focus-within:` glow on ToolbarGroup fires every time any child button is clicked (click steals focus), so the glow flickers on during mouse use — not just keyboard.

**Why:** `focus-within` triggers on any descendant focus, including programmatic focus from clicks.

**How to avoid:** Use `:has(:focus-visible)` instead of `:focus-within` where supported (ES2023+ CSS, Chrome 105+, Firefox 121+, Safari 15.4+). All Phase 26+ browser support assumptions already include these.

```css
.focus-glow-within:has(:focus-visible) {
  box-shadow: 0 0 0 3px …;
}
```

**Fallback:** If `:has()` support is a concern, keep `focus-within` and accept the minor cosmetic difference — this is UX-acceptable and CONTEXT doesn't require strict keyboard-only semantics here.

### Pitfall 3: Gradient-divider anti-aliasing (DS-29)

**What goes wrong:** On fractional-pixel layouts (common with responsive grids), a 1px gradient line with transparent ends can render as a barely-visible half-pixel smear.

**How to avoid:** Use explicit height via CSS (`height: 1px`, not Tailwind `h-px` which maps to `height: 1px` anyway — same thing, but verify). On vertical: `width: 1px; height: 100%`. Avoid `h-[0.5px]` or sub-pixel values.

### Pitfall 4: Scrollbar rule leakage to body (DS-34)

**What goes wrong:** `::-webkit-scrollbar` in `@layer base` applies to `html` and `body` by default (no selector prefix). CONTEXT requires "document/body scroll stays with OS default."

**How to avoid:** Scope to `.thin-scrollbar` utility class only. Verify in `npm run dev` on a page with document-level scroll — the body scrollbar should match OS/browser default, not the themed thin bar.

### Pitfall 5: Border opacity cascade to `--input` (DS-32)

**What goes wrong:** Retuning `--border` to 8% without re-checking `--input` (currently 15%) leaves form controls with HARDER borders than cards. Visually inconsistent.

**How to avoid:** Explicit decision — document in plan whether `--input` also moves to 8% or stays at 15%. Recommendation: keep `--input` at 15% for form-control affordance; document the divergence as intentional.

### Pitfall 6: Phase 30 `.hover-lift` + `transition-colors` DS-33 merge (DS-33)

**What goes wrong:** If a planner migrates a surface that has BOTH `.hover-lift` (Phase 30) and `hover:bg-hover-bg` for row hover, the `transition-property` on `.hover-lift` (transform, box-shadow) excludes `background-color`. Row hover tint transitions abruptly.

**How to avoid:** Phase 30 already documents this (globals.css:565 comment: "Do NOT stack with transition-colors"). DS-33 scopes to table rows, which do NOT have hover-lift — verify no planner accidentally adds both.

### Pitfall 7: gradient divider color in both modes

**What goes wrong:** `linear-gradient(to right, transparent, var(--border), transparent)` reads strong in light mode (border is neutral-500 at 15% — visible) but weak in dark mode (border is white at 10% on near-black — even weaker once middle-faded).

**How to avoid:** If DS-32 retunes `--border` to 8% in both modes, the gradient divider will be VERY faint. Two options:
1. Accept faint dividers (matches "almost borderless" CONTEXT intent)
2. Use a dedicated `--divider-gradient-stop` token at higher opacity (~15–20%) for the gradient midpoint

Recommendation: option 1. Trust CONTEXT; validate in browser.

## Validation Architecture

`.planning/config.json` nyquist_validation flag — checked via `cat .planning/config.json`. Not read in this session; if absent, use project convention. Phases 26–30 have NOT produced explicit automated test files — all validation is via `check:*` grep guards plus manual browser verification. Follow that pattern.

### New guard: `check:polish` (npm alias → `bash scripts/check-polish.sh`)

Model on `check-surfaces.sh` / `check-motion.sh` structure:

```bash
#!/usr/bin/env bash
set -euo pipefail

files_to_check() {
  find src -type f \
    \( -name '*.ts' -o -name '*.tsx' -o -name '*.js' -o -name '*.jsx' \) \
    -not -path 'src/components/ui/*' \
    -not -path 'src/components/tokens/*' \
    -not -path 'src/app/tokens/*' \
    -not -path 'src/app/globals.css'
}

FAIL=0

# Check 1: raw divider color (linear-gradient with transparent stops outside allowlist)
# Check 2: border opacity overrides (border-border/50, border-input/30 etc.)
# Check 3: raw hex/rgb/oklch border colors (border-[#...], border-[rgb(...)]
# Check 4: Tailwind palette border colors (border-red-500, border-emerald-600)
# Check 5: raw ::-webkit-scrollbar outside globals.css + ui/ allowlist
# Check 6: focus-visible:ring-* raw recipes outside shadcn primitives
# Check 7: inset box-shadow top-edge hardcodes (inset_0_1px_0_0_rgb…) outside globals.css

if [ "$FAIL" -eq 1 ]; then exit 1; fi
echo "✅ Visual polish tokens enforced."
```

Allowlist: same shape as predecessors — shadcn `ui/`, `tokens/` demos, `app/tokens/`, `globals.css`.

### Per-requirement verification

| REQ | Automated | Manual |
|-----|-----------|--------|
| DS-29 | Grep for `linear-gradient(to right, transparent, var(--border)` appearing in globals.css; grep for `SectionDivider` or `divider-horizontal-fade` at the two section boundaries | Browser: verify fade visible in both modes, center-solid |
| DS-30 | Grep `--shadow-elevation-raised` in .dark block for `inset 0 1px 0 0 oklch(1 0 0 / 0.0[67])` | Browser: dark-mode KPI / chart / query cards show faint top-edge highlight |
| DS-31 | `.focus-glow` utility in globals.css; tab through app, verify glow on inputs / buttons / ToolbarGroup / saved-view rows | Browser: tab keyboard navigation visible in both modes |
| DS-32 | `--border` value in :root + .dark both at 8%; `check:polish` exits 0 | Browser: cards/table read as near-borderless |
| DS-33 | Visual — `--hover-bg` token unchanged OR soft-tuned; transition wiring already live | Browser: table row hover matches Linear/Notion feel |
| DS-34 | `.thin-scrollbar` utility in globals.css; applied on 6 named containers; `check:polish` exits 0 | Browser: body scroll uses OS default; table/sidebar/popover scrollbars themed |

### /tokens Visual Polish tab

Model on Phase 29 / Phase 30 precedent: add a 7th tab `value="polish"` to `src/components/tokens/token-browser.tsx`. Create `src/components/tokens/visual-polish-specimen.tsx` wrapping six specimen sub-demos:
- gradient-divider-demo.tsx (horizontal + vertical fade)
- glass-highlight-demo.tsx (light-mode "no-op" callout + dark-mode card with highlight)
- focus-glow-demo.tsx (input, button, ToolbarGroup focus-within)
- border-standard-demo.tsx (side-by-side old 15% vs new 8%)
- row-hover-demo.tsx (static table rendering with hover)
- scrollbar-demo.tsx (thin-scrollbar opt-in vs OS default)

## Sources

### Primary (HIGH confidence)
- `src/app/globals.css` (full file read) — ground truth for tokens
- `src/components/patterns/toolbar-divider.tsx`, `data-panel.tsx`, `stat-card.tsx` (current recipes)
- `scripts/check-motion.sh`, `check-surfaces.sh` (guard pattern template)
- `.planning/phases/30-VERIFICATION.md` — confirmed Phase 30 state; row hover already wired
- `.planning/phases/28-VERIFICATION.md` — surface-raised consumer list
- `.planning/phases/29-VERIFICATION.md` — ToolbarDivider + pattern inventory
- `.planning/phases/26-VERIFICATION.md` — token inventory + shadcn re-map

### Secondary (MEDIUM confidence — grep counts)
- `grep "border/[0-9]" src/` → 1 hit (low-scope migration)
- `grep "focus-visible:ring" src/` → 23 hits across 10 files (shared utility candidate)
- `grep "focus-within" src/` → 1 hit (net-new adds needed for DS-31 CONTEXT scope)
- `grep "overflow-y-auto|overflow-auto" src/` → 6 named containers for DS-34
- `grep "hover:bg-hover-bg" src/` → 1 hit (table-body) + 1 demo (motion-demo)
- `grep "surface-raised|shadow-elevation-raised" src/` → 17 files, 7 production consumers

### Tertiary (LOW confidence — open questions below)
- Cross-browser viability of `scrollbar-width: thin` on 2026-current Safari — believed HIGH confidence (shipped in Safari 18.2), but not freshly verified against MDN for this session

## Open Questions

1. **Should `--input` soften to 8% alongside `--border` for DS-32?**
   - What we know: `--input` is currently 15% in both modes, producing visibly harder form-control borders.
   - What's unclear: whether "single border-opacity standard" in CONTEXT means literally all border tokens or just the `--border` cascade family.
   - Recommendation: keep `--input` at 15% for form-control affordance; document as intentional divergence; revisit in a11y audit (Phase 33) if contrast suffers.

2. **Does DS-30 glass highlight go via Path A (token bump) or Path B (composition class)?**
   - What we know: Path A is zero-edit and avoids the Tailwind shadow-composition pitfall.
   - What's unclear: whether the planner values future independent tuning of glass highlight vs. elevation layers.
   - Recommendation: Path A (token bump). Phase 32+ can always split if needed.

3. **Is `.hover-bg` (current 8%/6%) already at CONTEXT's "~muted/4" target for DS-33?**
   - What we know: Phase 26 set these values; Phase 30 wired them to table rows.
   - What's unclear: whether CONTEXT's "~muted/4" reads as softer than current tokens.
   - Recommendation: land DS-33 as a VALIDATION plan (no token change) plus optional retune if browser QA flags the tint as too loud.

4. **Should ToolbarDivider internal recipe change or should gradient fade be a wrapper modifier?**
   - What we know: ToolbarDivider is a 1-line component with 3 consumer sites. CONTEXT lists ToolbarGroup vertical dividers as in-scope for gradient fade.
   - What's unclear: whether the gradient fade applies always (internal recipe swap) or only on certain clusters.
   - Recommendation: always — swap internal recipe from `bg-border` to `divider-vertical-fade` utility. Simpler, one-change, matches CONTEXT intent of app-wide consistency.

5. **Does `check:polish` need to cover DS-29 section-divider placement (positive check)?**
   - What we know: POSIX grep guards are negative (forbid patterns) by precedent.
   - What's unclear: whether to also positively assert `<SectionDivider />` exists between the two canonical section junctions in data-display.tsx.
   - Recommendation: no — positive placement checks are fragile. Rely on plan verification + /tokens demo + browser check.

## Metadata

**Confidence breakdown:**
- User constraints / decisions: HIGH — copied verbatim from CONTEXT.md
- Current codebase state: HIGH — all findings backed by direct file reads + grep
- Implementation techniques (gradient, glass, focus-glow, scrollbar): HIGH — standard CSS, verified against globals.css existing patterns
- Migration scope (grep counts): MEDIUM — grep can miss composed className patterns; browser verification needed per site
- Pitfalls: HIGH for shadow composition (Tailwind docs confirm), MEDIUM for focus-within vs. `:has(:focus-visible)` browser-support edge cases

**Research date:** 2026-04-18
**Valid until:** 2026-05-18 — stable domain (pure CSS on in-repo tokens); no external deps likely to churn in a month
