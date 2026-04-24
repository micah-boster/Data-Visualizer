# Phase 26: Design Tokens - Research

**Researched:** 2026-04-16
**Domain:** Design tokens via Tailwind v4 `@theme` + CSS custom properties, shadcn coexistence, Next.js 16 app router
**Confidence:** HIGH (stack is fully verified against source and Tailwind v4 docs)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Visual reference & feel**
- **Aesthetic anchor:** Linear — quiet, dense, data-first. Motion/decoration never announces itself.
- **Density:** Dense is the default across the app. Tokens MUST also define a sparse variant for column/row-level density (tables especially). Structured as component-level density variants (e.g., `--table-row-height-dense` + `--table-row-height-sparse`).
- **Warmth:** Warm paper — light mode uses cream/beige-tinted neutrals; dark mode uses warm dark (near-black with brown undertone).
- **Personality:** Subtle character — colored focus rings using warm accent, gentle gradient dividers (DS-29), one warm accent color used sparingly.

**Scale values & granularity**
- **Spacing:** Hybrid — numeric scale `--space-1..12` (4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96px) as the source of truth, with semantic aliases layered on top: `--space-inline`, `--space-stack`, `--space-section`, `--space-card-padding`, `--space-page-gutter`.
- **Typography ramp:** 6-level tight (Linear-ish): display 24px / heading 18px / title 15px / label 12px (uppercase, tracked) / body 14px / caption 12px.
- **Font families:** Inter for UI + JetBrains Mono (or equivalent mono) for tabular/code. Claude may propose equivalents if there's a reason (e.g., Geist) but defaults to Inter + JetBrains Mono.
- **Shadows:** Subtle multi-layer (Linear-style) — two-layer shadows (tight hard edge + wider soft blur). `shadow-xs` barely visible through `shadow-lg` still soft. Shadow color/tint tuned to warm paper.
- **Border radius:** 3 steps — `radius-sm` 4px (inputs, small buttons), `radius-md` 8px (cards, popovers), `radius-lg` 12px (modals, large panels).
- **Numeric type tokens:** Dedicated `body-numeric` / `label-numeric` variants with `font-variant-numeric: tabular-nums lining-nums` baked in — used wherever numbers appear (tables, KPI values, chart axes).

**Motion personality**
- **Overall:** Between Linear-quick and warm-springy. Most motion invisible; tactile feedback where it earns its place.
- **Duration tokens:** `duration-quick` 120ms / `duration-normal` 200ms / `duration-slow` 320ms.
- **Easing tokens:** `easing-default` (cubic-bezier(0.4, 0, 0.2, 1)), `easing-spring` (cubic-bezier(0.34, 1.56, 0.64, 1), mild overshoot), `easing-decelerate` (cubic-bezier(0, 0, 0.2, 1)).
- **Where motion lives:** Motion on containers (cards, panels, drill transitions, modals). **Silence on data** — numbers, values, and table cells snap into place. Never tween KPI values or data points.

**Surface system philosophy**
- **Distinguishing cue:** Background shift + subtle shadow. Color-led hierarchy (not border-heavy).
- **Depth strength:** Subtle but perceivable.
- **Dark mode approach:** Warm dark with **lighter raised surfaces** (raised surfaces are LIGHTER than base in dark mode; inset darker still). Warmth preserved in dark mode.
- **Surface map:** `surface-base` (page/sidebar) / `surface-raised` (KPI cards, chart containers, header) / `surface-inset` (table area) / `surface-overlay` (popovers, dropdowns) / `surface-floating` (modals, toasts). Sidebar is `surface-base` with a subtle right-edge treatment.

**Implementation approach**
- **Mechanism:** Tailwind v4 `@theme` block + CSS custom properties. Verify Tailwind version during research (confirmed v4.2.2 — see Standard Stack).
- **File layout:** Single `tokens.css` (location TBD during research — likely `src/styles/tokens.css` or integrated into `globals.css`) with clearly commented sections.
- **Enforcement:** Strict by convention during Phase 26 — "no ad-hoc spacing/color/shadow values in new code." Enforced via code review.
- **shadcn integration:** Extend, don't replace. Existing shadcn CSS variables continue to work. New tokens live alongside; where overlap exists, shadcn vars are re-mapped to reference the new surface/color tokens (e.g., `--background: var(--surface-base)`). Zero breakage for existing components.

**Semantic color tokens**
- **State colors:** Full set — `success` / `warning` / `error` / `info`, each with `-bg`, `-border`, and `-fg` variants.
- **Interaction tokens:** `--focus-ring` (warm accent), `--selection-bg` (subtle accent tint), `--hover-bg` (neutral tint), `--hover-elevation` (shadow bump).
- **Accent:** Single warm accent (amber/ochre/terracotta family). Specific hue is Claude's Discretion.
- **Chart colors:** `--chart-categorical-1..8` + `--chart-diverging` palette (heatmap/anomaly red↔green↔neutral).
- **Neutral scale:** Full 11-step `--neutral-50..950` with warm undertone (stone/khaki-adjacent, not cool slate).

**Migration strategy**
- **Scope:** Phase 26 defines all tokens AND pilots 2-3 components.
- **Pilot components:** KPI card (surface-raised, new type scale), header (shadow + density), table row (inset + dense/sparse variants).
- **Rollout state:** Pilot components fully converted to tokens; everything else stays on current hardcoded Tailwind values. Clear before/after contrast.
- **Visual regression:** Manual browser verification using `preview_screenshot` + `preview_inspect` in both light and dark mode before/after the pilot migrations.

**Token discoverability**
- **Reference page:** In-app `/tokens` route rendering every token — swatches, spacing ruler, type specimens, shadow samples, motion demos.
- **Structure:** Tabbed by category — Spacing / Typography / Surfaces / Motion / Colors. Each token shows: live example + token name + CSS var + Tailwind class + copy-to-clipboard.
- **Access:** Always accessible in production, unlisted route (no nav link). No auth gate.

### Claude's Discretion
- Exact hue/HSL/OKLCH of the warm accent (must complement warm paper + not clash with chart palette).
- Specific shadow blur radii, opacities, and tint values for multi-layer shadows in both modes.
- Exact OKLCH values for the 11-step warm neutral scale in light + dark.
- Exact chart categorical palette hues.
- Specific semantic alias mapping (which numeric step each semantic alias points to).
- Mono font choice if a better alternative to JetBrains Mono exists.
- `/tokens` page interaction details (copy feedback, layout within tabs, responsive behavior).
- Letter-spacing values for the label tier.
- How shadcn color variables are specifically re-mapped onto new surface tokens.

### Deferred Ideas (OUT OF SCOPE)
- ESLint rule enforcing token usage in new code.
- Visual regression tooling (Playwright/Percy snapshots).
- Density toggle UI control.
- Broad migration of remaining ~78 components to type/surface tokens (owned by Phases 27-31).
- Storybook.
- Token naming refactor of shadcn variables (replacing `--background` etc. with our names).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DS-01 | Spacing scale (4px grid) defined as CSS custom properties and used by at least 3 refactored components | Tailwind v4 `--spacing-*` namespace (see Standard Stack); numeric `--space-1..12` + semantic aliases confirmed valid syntax; 3 pilot components located (KPI card, header, table row) |
| DS-02 | Typography scale (display/heading/title/label/body/caption) with size/line-height/weight/tracking | Tailwind v4 `--text-*` namespace supports `--text-{name}--line-height` suffix; 6-tier scale matches v4 shape; font-variant-numeric works via utilities, or embedded in custom class |
| DS-03 | Elevation system (shadow-xs through shadow-lg) with multi-layer shadows, light/dark variants | Tailwind v4 `--shadow-*` namespace supports arbitrary names and comma-separated multi-layer values; `.dark` class variant already set up via `@custom-variant dark` in globals.css |
| DS-04 | Motion tokens (duration-quick/normal/slow, easing-default/spring/decelerate) | Tailwind v4 `--duration-*` and `--ease-*` namespaces confirmed; current code uses CSS `transition-colors` / `animate-pulse` / `tw-animate-css` — no framer-motion |
| DS-05 | Surface system (surface-base/raised/inset/overlay/floating) with consistent border/shadow/background | Surface tokens live as `--color-surface-*` or raw `--surface-*` custom properties; shadcn `--background`, `--card`, `--popover`, `--sidebar` can be re-mapped via `@theme inline` to `var(--surface-*)` |
| DS-06 | All tokens work correctly in both light and dark mode | Existing `.dark` class variant (`@custom-variant dark (&:is(.dark *))`) + `:root` and `.dark` selector blocks already operational; `next-themes` `attribute="class"` wired up in providers.tsx |
</phase_requirements>

## Summary

The project is on Tailwind CSS **v4.2.2** with zero `tailwind.config.*` file — all configuration is CSS-first via `@theme` in `src/app/globals.css`. shadcn is installed (v4.2.0, style `base-nova`) and writes CSS variables directly into `:root` and `.dark` selectors (not into `@theme`). Dark mode is class-based via `next-themes` (`attribute="class"`) with a custom `@custom-variant dark (&:is(.dark *))` declared in globals.css. Fonts are loaded via `next/font/google` (currently Geist + Geist_Mono — decision calls for Inter + JetBrains Mono).

The existing token surface is narrow: shadcn-generated color vars (`--background`, `--foreground`, `--card`, `--popover`, `--primary`, `--secondary`, `--muted`, `--accent`, `--destructive`, `--border`, `--input`, `--ring`, `--chart-1..8`, `--sidebar*`), three project-specific cell-tint vars (`--cell-zero`, `--cell-tint-low`, `--cell-tint-high`), one `--radius` scalar that feeds computed `--radius-sm..4xl`, and two font-family vars. There are no spacing, shadow, motion, surface, or typography tokens today — every card, padding, shadow, and text size is hand-specified via Tailwind utilities. The pilot components (KpiCard, Header, TableBody row) are all small and self-contained, making them safe test beds.

**Primary recommendation:** Keep `src/app/globals.css` as the single CSS entry point and add a dedicated `@theme` / `@layer base` section for the new tokens *in the same file* (not a separate `tokens.css` import — Tailwind v4's `@theme` directive is most reliable when defined inline in the entry CSS). Use `@theme inline` for semantic aliases that reference raw custom properties defined in `:root`/`.dark`. Re-map shadcn vars by rewriting `--background: var(--surface-base)` etc. inside the existing `:root`/`.dark` blocks — do **not** rename shadcn vars. Pilot with three tokens-native wrappers around existing components rather than rewriting shadcn primitives.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| tailwindcss | 4.2.2 | CSS-first design system framework | Already installed; CSS-first `@theme` is the v4 idiom |
| @tailwindcss/postcss | ^4 | Tailwind v4 PostCSS adapter | Already wired via `postcss.config.mjs` |
| next | 16.2.3 | App framework (App Router) | Already installed |
| next-themes | ^0.4.6 | Dark mode toggle (`attribute="class"`) | Already mounted in `src/app/providers.tsx` |
| next/font/google | bundled | Self-hosted font loading | Already used for Geist/Geist_Mono — swap in Inter + JetBrains Mono |
| shadcn | 4.2.0 | UI primitives + CSS var scaffold | Already installed; must coexist |
| tw-animate-css | ^1.4.0 | Pre-built CSS keyframe utilities | Already installed; used for skeleton/toast animations |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | ^1.8.0 | Icon system | Use for `/tokens` page copy-to-clipboard affordance (Check/Copy) |
| sonner | ^2.0.7 | Toast (already used for app feedback) | Optional copy-success feedback on `/tokens` page |
| clsx + tailwind-merge | — | Conditional className merging | Use in `/tokens` page token cards (existing `cn()` helper at `@/lib/utils`) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Inline `@theme` in globals.css | Separate `src/styles/tokens.css` imported into globals.css | Extra file boundary without clarity gain; Tailwind v4 prefers one entry. Keep inline. |
| `next/font/google` Inter + JetBrains Mono | Keep existing Geist/Geist_Mono | Geist is closely related to Inter but Linear anchor specifies Inter. Swap unless font-loading regression shows up. |
| Static CSS tokens | CSS-in-JS (e.g., vanilla-extract) | Adds dep, no benefit — Tailwind v4 already handles CSS vars natively. |
| framer-motion for drill transitions | Pure CSS transitions + `tw-animate-css` | OUT OF SCOPE per v4 REQUIREMENTS.md — "Framer Motion or heavy animation lib" is explicitly excluded. |

**Installation:** No new dependencies required. All libraries already in `package.json`. Font family swap is a code change only (Geist → Inter, Geist_Mono → JetBrains_Mono).

## Architecture Patterns

### Recommended File Structure

```
src/
├── app/
│   ├── globals.css          # Single CSS entry — @theme block lives here (extended)
│   ├── layout.tsx           # Update next/font imports: Inter + JetBrains_Mono
│   └── tokens/              # NEW: unlisted /tokens route
│       └── page.tsx         # Tabbed token browser (client component)
├── components/
│   ├── kpi/kpi-card.tsx     # PILOT: migrate to token classes
│   ├── layout/header.tsx    # PILOT: migrate to token classes
│   ├── table/table-body.tsx # PILOT: migrate row styling to density tokens
│   └── tokens/              # NEW (optional): /tokens page section components
│       ├── token-card.tsx
│       ├── spacing-ruler.tsx
│       ├── type-specimen.tsx
│       ├── shadow-sample.tsx
│       └── motion-demo.tsx
```

No new top-level directories. `/tokens` as an app-router route is a single folder addition under `src/app/`.

### Pattern 1: Extending Tailwind v4 Theme Inline

**What:** Use `@theme` to register namespaced tokens that generate utilities; use `@theme inline` for semantic aliases that should resolve to another token's value (rather than a `var()` reference).

**When to use:** `@theme` for primitive numeric values (`--space-4: 16px`); `@theme inline` for semantic aliases (`--space-card-padding: var(--space-4)` where you want the utility to emit the raw value, not `var(--space-4)`).

**Example (verified against https://tailwindcss.com/docs/theme):**
```css
/* src/app/globals.css */
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";

@custom-variant dark (&:is(.dark *));

@theme {
  /* Spacing — primitive numeric scale */
  --spacing-1: 4px;
  --spacing-2: 8px;
  --spacing-3: 12px;
  --spacing-4: 16px;
  --spacing-5: 20px;
  --spacing-6: 24px;
  --spacing-8: 32px;
  /* ...etc */

  /* Shadows — multi-layer */
  --shadow-xs: 0 1px 2px 0 rgb(0 0 0 / 0.04);
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.04), 0 2px 6px -2px rgb(0 0 0 / 0.06);
  --shadow-md: 0 2px 4px 0 rgb(0 0 0 / 0.04), 0 6px 12px -4px rgb(0 0 0 / 0.08);
  --shadow-lg: 0 4px 8px 0 rgb(0 0 0 / 0.04), 0 12px 24px -8px rgb(0 0 0 / 0.10);

  /* Motion */
  --duration-quick: 120ms;
  --duration-normal: 200ms;
  --duration-slow: 320ms;
  --ease-default: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease-decelerate: cubic-bezier(0, 0, 0.2, 1);

  /* Type scale — supports per-token line-height via --text-*--line-height */
  --text-display: 1.5rem;
  --text-display--line-height: 1.2;
  --text-display--font-weight: 600;
  --text-heading: 1.125rem;
  --text-heading--line-height: 1.35;
  --text-heading--font-weight: 600;
  --text-title: 0.9375rem;
  --text-title--line-height: 1.4;
  --text-title--font-weight: 500;
  --text-body: 0.875rem;
  --text-body--line-height: 1.5;
  --text-label: 0.75rem;
  --text-label--line-height: 1.4;
  --text-label--letter-spacing: 0.04em;
  --text-label--font-weight: 500;
  --text-caption: 0.75rem;
  --text-caption--line-height: 1.4;

  /* Radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
}

@theme inline {
  /* Semantic spacing aliases that resolve to the primitive scale */
  --spacing-inline: var(--spacing-2);
  --spacing-stack: var(--spacing-3);
  --spacing-section: var(--spacing-6);
  --spacing-card-padding: var(--spacing-4);
  --spacing-page-gutter: var(--spacing-4);

  /* Surface aliases — resolved per theme below */
  --color-surface-base: var(--surface-base);
  --color-surface-raised: var(--surface-raised);
  --color-surface-inset: var(--surface-inset);
  --color-surface-overlay: var(--surface-overlay);
  --color-surface-floating: var(--surface-floating);
}

:root {
  /* Raw surface values — light (warm paper) */
  --surface-base: oklch(0.985 0.008 85);       /* cream */
  --surface-raised: oklch(1 0.004 85);         /* paper-white, slightly above base */
  --surface-inset: oklch(0.965 0.012 85);      /* recessed beige */
  --surface-overlay: oklch(1 0 0);
  --surface-floating: oklch(1 0 0);

  /* Re-map shadcn vars to new surfaces — zero breakage */
  --background: var(--surface-base);
  --card: var(--surface-raised);
  --popover: var(--surface-overlay);
  /* ...etc */
}

.dark {
  /* Warm dark; raised is LIGHTER than base */
  --surface-base: oklch(0.16 0.012 60);        /* warm near-black */
  --surface-raised: oklch(0.22 0.012 60);      /* lighter brown */
  --surface-inset: oklch(0.12 0.010 60);       /* darker recessed */
  --surface-overlay: oklch(0.24 0.012 60);
  --surface-floating: oklch(0.26 0.012 60);

  --background: var(--surface-base);
  --card: var(--surface-raised);
  --popover: var(--surface-overlay);
}
```

Tailwind auto-generates `p-card-padding`, `bg-surface-raised`, `shadow-xs`, `duration-quick`, `ease-spring`, `text-display`, `rounded-md` etc. And all values are simultaneously accessible as `var(--spacing-card-padding)` for arbitrary CSS.

### Pattern 2: Numeric Type Variant via Custom Utility

**What:** Create named type tokens like `text-body-numeric` that bake in `font-variant-numeric: tabular-nums lining-nums`.

**When to use:** Anywhere numeric data is rendered — KPI values, table cells, chart axes.

Tailwind v4's `--text-*` namespace only sets `font-size` + optional `--line-height` / `--letter-spacing` / `--font-weight`. It does not set `font-variant-numeric`. Two options:

- **Option A (simpler):** Declare utilities in `@layer utilities`:
  ```css
  @layer utilities {
    .text-body-numeric {
      font-size: var(--text-body);
      line-height: var(--text-body--line-height);
      font-variant-numeric: tabular-nums lining-nums;
      font-family: var(--font-mono), ui-monospace, monospace;
    }
    .text-label-numeric {
      font-size: var(--text-label);
      line-height: var(--text-label--line-height);
      letter-spacing: var(--text-label--letter-spacing);
      font-variant-numeric: tabular-nums lining-nums;
    }
  }
  ```
- **Option B:** Continue using Tailwind's `tabular-nums` utility alongside the type token (`text-body tabular-nums`). Matches what the codebase does today. Less expressive but zero new mechanism.

Recommend **Option A** — the CONTEXT explicitly says "dedicated variants ... used wherever numbers appear," which implies a single-purpose class, not a composed pair.

### Pattern 3: Density Variants via `data-*` Attribute

**What:** Two tokens per dimensional property (`--table-row-height-dense: 32px` / `--table-row-height-sparse: 40px`), selected by a `data-density="dense|sparse"` attribute on a container.

**When to use:** Table rows, toolbar density, list spacing. Density scope is a container, not a single element.

```css
@layer base {
  [data-density="dense"] {
    --row-height: var(--table-row-height-dense);
    --row-padding-y: var(--spacing-2);
  }
  [data-density="sparse"] {
    --row-height: var(--table-row-height-sparse);
    --row-padding-y: var(--spacing-3);
  }
}
```

Phase 26 defines the tokens and ships with dense as the default (no toggle UI — deferred). Pilot table-body reads `var(--row-height)` / `var(--row-padding-y)`.

### Pattern 4: shadcn Coexistence via Re-mapping

shadcn's CSS variables (`--background`, `--card`, `--popover`, `--primary`, `--secondary`, `--muted`, `--accent`, `--border`, `--input`, `--ring`, `--sidebar*`) are consumed by ~16 UI primitives in `src/components/ui/`. Do **not rename** them. Instead, rewrite their *values* inside `:root` / `.dark` to reference the new `--surface-*` / `--neutral-*` tokens:

```css
:root {
  --background: var(--surface-base);
  --foreground: var(--neutral-900);
  --card: var(--surface-raised);
  --card-foreground: var(--neutral-900);
  --popover: var(--surface-overlay);
  --border: oklch(from var(--neutral-500) l c h / 0.15);
  /* ...etc */
}
```

This is the "extend, don't replace" strategy — shadcn's `bg-background`, `bg-card`, `border-border` etc. all keep working, but their pixel output now comes from the token system. The `@theme inline` block in the existing globals.css already does this structure for several vars — follow the same pattern.

### Anti-Patterns to Avoid

- **Defining tokens outside a Tailwind namespace:** `--card-padding: 1.5rem` in `@theme` won't generate a utility. Must use `--spacing-card-padding`.
- **Using `@theme` for values that change between light/dark:** `@theme` is one-shot; put theme-varying values in `:root` / `.dark` and then *alias* them in `@theme inline`.
- **Renaming shadcn vars:** Explicitly out of scope per Deferred Ideas.
- **Tweening numeric KPI values:** Locked decision — "silence on data." Only containers animate.
- **Defining font loading in a CSS @font-face rule:** Next.js App Router uses `next/font/google` for self-hosting + zero CLS. Do not add a raw `<link>` or `@font-face`.
- **Relying on `@apply` in component files:** v4 supports `@apply` but only inside CSS files that are part of the Tailwind build graph (i.e., globals.css). Don't use it in `.module.css` files — it breaks theme resolution.
- **Assuming raised is always darker:** Dark mode raised is LIGHTER than base — opposite of intuition. Any existing `dark:bg-muted` etc. that assumes darker-is-raised will need visual review.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Dark mode toggle | Custom theme context | `next-themes` (already installed + mounted) | Already wired; class-based via `attribute="class"`; SSR-safe with `suppressHydrationWarning` |
| Self-hosted fonts | Raw `@font-face` + font files | `next/font/google` (`Inter`, `JetBrains_Mono`) | Zero CLS, automatic preload, served from same origin |
| Copy-to-clipboard on /tokens | Manual textarea selection | `navigator.clipboard.writeText` (native) | Works in modern browsers; no lib needed |
| Tab UI on /tokens | Custom tab system | Existing shadcn primitives or Base UI Tabs | Project has `@base-ui/react` installed; use it rather than rolling a tab widget |
| Toast feedback for copy | Custom toast | `sonner` (already installed, Toaster mounted in layout.tsx) | One-liner: `toast.success('Copied')` |
| Multi-layer shadow composition | SCSS-style mixins | Comma-separated CSS values in a single `--shadow-*` | Tailwind v4 accepts multi-value shadow tokens directly |
| Token documentation page | Mdx/Storybook | Plain Next.js page at `src/app/tokens/page.tsx` | Storybook explicitly deferred; one page serves users + devs |

**Key insight:** Every structural primitive needed for Phase 26 is already installed. No new deps. The "build" is 90% writing CSS tokens and 10% React plumbing for the `/tokens` browser page.

## Common Pitfalls

### Pitfall 1: Font swap ignores existing font CSS var references
**What goes wrong:** Replacing `Geist` → `Inter` in `layout.tsx` breaks the `--font-geist-mono` reference in `@theme inline` (globals.css line 13).
**Why it happens:** `next/font/google` generates CSS vars from the `variable` option passed to it (`--font-geist-sans`, `--font-geist-mono`). Renaming the import changes the var name.
**How to avoid:** Either (a) keep the existing `--font-geist-*` variable names but point them at `Inter` / `JetBrains_Mono` imports (slightly confusing naming but zero downstream changes), or (b) rename to `--font-inter` / `--font-jetbrains-mono` AND update the `@theme inline --font-sans`/`--font-mono` lines to match. Recommend (b) for clarity.
**Warning signs:** After the swap, `font-sans` utility still renders Geist — means the @theme inline line still points at `var(--font-geist-sans)`.

### Pitfall 2: shadcn vars define `--border` via opacity alpha, but token system uses named neutrals
**What goes wrong:** Current `.dark` defines `--border: oklch(1 0 0 / 10%)`. Re-mapping to `var(--neutral-700)` may produce a visually different hairline because transparency interacts with backdrop.
**Why it happens:** Transparency-based borders blend with surface color; opaque neutral borders don't.
**How to avoid:** For borders, keep an opacity-style token (`--border-subtle: color-mix(in oklch, var(--neutral-500) 15%, transparent)`) rather than a flat neutral. Visual-verify both modes after re-map.
**Warning signs:** Hairline borders look heavier or disappear entirely on `surface-raised` cards after the re-map.

### Pitfall 3: Dark mode raised-lighter-than-base inversion breaks dark-mode-specific utility usage
**What goes wrong:** Existing code like `className="bg-muted dark:bg-muted/80"` or `dark:bg-zinc-900` assumes raised = darker in dark mode. After the surface-raised redefinition, these components become *darker* than the (now lighter) raised surface — the hierarchy inverts.
**Why it happens:** shadcn's default pattern is "dark-mode = darker = recessed." Warm-paper-with-lighter-raised flips that convention.
**How to avoid:** Audit the 3 pilot components first. For the broader app (Phases 27-31), track a checklist of `dark:` utilities that reference background/surface and plan rework. In pilot components specifically, replace `dark:bg-muted` with `bg-surface-raised` (no dark variant needed — the token already handles both modes).
**Warning signs:** In dark mode, a KPI card looks flat/dimmer than the page background — the raised card is drawing as darker.

### Pitfall 4: `tabular-nums` already scattered across 10 files — partial adoption of `text-body-numeric` creates inconsistency
**What goes wrong:** New `.text-body-numeric` utility ships; pilot components use it; but the remaining ~10 files still say `className="... tabular-nums"` producing two ways to express the same intent.
**Why it happens:** Pilot-only scope is explicit, but the utility's discoverability pressures developers to use it everywhere.
**How to avoid:** Document in `/tokens` page: "body-numeric is the canonical variant; existing `tabular-nums` utility usage will be migrated in Phase 27 (Typography)." Do not migrate non-pilot files in Phase 26.
**Warning signs:** A reviewer asks "why did you use text-body-numeric here but not there?" — intentional per roadmap, but needs the explanation.

### Pitfall 5: `@theme inline` vs `@theme` — picking the wrong one
**What goes wrong:** Semantic aliases defined in plain `@theme` emit `p-card-padding { padding: var(--spacing-card-padding) }`. If a component then sets `--spacing-card-padding` inline (e.g., a dense-mode override via `data-density`), the container *does* respect it — which is usually the goal. But raw `@theme` aliases also leak the bare var references into every utility, bloating `var()` chains.
**Why it happens:** The two keywords look interchangeable. `@theme inline` resolves the reference at *build time*; `@theme` (non-inline) keeps the `var()` at runtime.
**How to avoid:** Use `@theme inline` for fixed aliases (`--spacing-section: var(--spacing-6)`). Use plain `@theme` when you actively want runtime overridability (e.g., `data-density` toggles). For Phase 26, most semantic aliases should be `@theme inline` because density is the only runtime-overridable dimension, and density-specific tokens are named separately (`--table-row-height-dense`).
**Warning signs:** DevTools shows `padding: var(--spacing-card-padding)` resolving to an unexpected value after an `@theme inline` alias change — cache may need a rebuild; Tailwind v4 CSS is compiled, not interpreted in browser.

### Pitfall 6: shadcn's `tailwind.css` import is a virtual entry — don't try to read it directly
**What goes wrong:** The first line of globals.css is `@import "shadcn/tailwind.css"`, but the `shadcn` npm package (v4.2.0) ships only the CLI — there is no `tailwind.css` file at `node_modules/shadcn/tailwind.css`. Assuming it provides tokens will lead you to duplicate them.
**Why it happens:** Modern shadcn uses the `shadcn/ui` *registry* (fetched at install time via the CLI) to scaffold components + base CSS. The `@import` string resolves through the shadcn CLI's styling layer or is effectively a no-op if already materialized into globals.css.
**How to avoid:** Treat globals.css as the source of truth. All shadcn tokens visible in `:root` / `.dark` were written there by the CLI at install time and are now project-owned. Do not search the `shadcn` package for token values.
**Warning signs:** `find node_modules/shadcn` shows only a CLI bundle — confirmed via file inspection.

### Pitfall 7: Build verification needs both `pnpm`/`npm` and visual in-browser
**What goes wrong:** `next build` succeeds but surfaces still look wrong because Tailwind v4 compiles tokens silently; typos in `@theme` names produce no error, just no utility.
**Why it happens:** Tailwind v4 is a CSS compiler — unused/unreferenced tokens simply don't emit utilities. No type-check layer on token names.
**How to avoid:** After every token-scale change, run `next build` AND load the app at `localhost:3000` with `preview_screenshot` + `preview_inspect` (per user memory: "Test visually first"). Specifically inspect a styled element's computed padding/color to verify the token chain resolved.
**Warning signs:** A utility class like `bg-surface-raised` has no effect — check that `--color-surface-raised` exists in `@theme inline` (not just `--surface-raised` in `:root`).

## Code Examples

Verified patterns from official sources and in-repo inspection:

### Swapping Fonts (Geist → Inter + JetBrains Mono)
Source: `node_modules/next/dist/docs/01-app/01-getting-started/13-fonts.md`

```tsx
// src/app/layout.tsx
import { Inter, JetBrains_Mono } from 'next/font/google';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
});

// <html className={`${inter.variable} ${jetbrainsMono.variable} ...`}>
```

Then in globals.css `@theme inline`:
```css
--font-sans: var(--font-inter);
--font-mono: var(--font-jetbrains-mono);
--font-heading: var(--font-inter);
```

### Defining a Multi-Layer Shadow Scale
Source: https://tailwindcss.com/docs/box-shadow (Tailwind v4 `--shadow-*` namespace)

```css
@theme {
  --shadow-xs: 0 1px 2px 0 oklch(0 0 0 / 0.04);
  --shadow-sm: 0 1px 2px 0 oklch(0 0 0 / 0.05), 0 2px 6px -2px oklch(0 0 0 / 0.06);
  --shadow-md: 0 2px 4px 0 oklch(0 0 0 / 0.05), 0 6px 12px -4px oklch(0 0 0 / 0.08);
  --shadow-lg: 0 4px 8px 0 oklch(0 0 0 / 0.06), 0 12px 24px -8px oklch(0 0 0 / 0.10);
}

.dark {
  /* Override shadow base for darker tint so shadows remain visible */
  --shadow-xs: 0 1px 2px 0 oklch(0 0 0 / 0.35);
  /* ...etc */
}
```

Emits utilities `shadow-xs` through `shadow-lg`.

### Defining an OKLCH Color Scale with Warm Undertone
Source: globals.css patterns + https://oklch.com

```css
:root {
  /* 11-step warm neutral — hue ~60-85 (stone/khaki) */
  --neutral-50:  oklch(0.985 0.004 75);
  --neutral-100: oklch(0.97  0.006 75);
  --neutral-200: oklch(0.93  0.008 75);
  --neutral-300: oklch(0.87  0.010 75);
  --neutral-400: oklch(0.76  0.012 75);
  --neutral-500: oklch(0.62  0.014 75);
  --neutral-600: oklch(0.50  0.014 75);
  --neutral-700: oklch(0.38  0.012 75);
  --neutral-800: oklch(0.28  0.010 75);
  --neutral-900: oklch(0.20  0.008 75);
  --neutral-950: oklch(0.14  0.006 75);
}
```

Alias into `@theme inline --color-neutral-*` to generate `bg-neutral-500`, `text-neutral-700`, etc.

### `/tokens` Page Skeleton (App Router)
Source: https://nextjs.org/docs/app/api-reference/file-conventions/page

```tsx
// src/app/tokens/page.tsx
import { TokenBrowser } from '@/components/tokens/token-browser';

export const metadata = {
  title: 'Tokens — Bounce Data Visualizer',
  robots: { index: false, follow: false }, // unlisted
};

export default function TokensPage() {
  return <TokenBrowser />;
}
```

Unlisted = no sidebar/header nav entry; `robots: index: false` keeps it out of crawlers even on production Vercel deploys. Accessible via direct URL `/tokens`.

### Custom Duration + Easing Utility Usage

```css
@theme {
  --duration-quick: 120ms;
  --duration-normal: 200ms;
  --duration-slow: 320ms;
  --ease-default: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease-decelerate: cubic-bezier(0, 0, 0.2, 1);
}
```

Usage: `transition-colors duration-quick ease-default`, `hover:scale-[1.01] transition-transform duration-normal ease-spring`.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `tailwind.config.js` with `theme.extend` | CSS `@theme` in globals.css | Tailwind v4.0 (Jan 2025) | **This project is already on v4 CSS-first — no config file exists.** Do not reintroduce `tailwind.config.ts`. |
| HSL color channels (`hsl(var(--x))`) | OKLCH values directly | v4 default palette | shadcn v4 already outputs OKLCH (confirmed in globals.css). Continue using OKLCH. |
| `darkMode: 'class'` in config | `@custom-variant dark (&:is(.dark *))` in CSS | v4 | Already present on line 5 of globals.css. |
| `@apply` for base utilities | Direct `@theme` tokens + utility classes | v4 | `@apply` still works but discouraged outside globals.css; new tokens should avoid it. |
| `transition-all` | Scoped transitions (`transition-colors`, `transition-transform`) | Always best practice | Existing code already does this. Keep pattern. |

**Deprecated/outdated:**
- `@tailwind base; @tailwind components; @tailwind utilities;` directives — replaced by `@import "tailwindcss";` in v4.
- Plugin-based dark mode — replaced by `@custom-variant`.
- `theme.extend.spacing` in JS — replaced by `--spacing-*` CSS namespace.

## Open Questions

1. **Should the `/tokens` page be SSR or CSR?**
   - What we know: App Router supports both. Server components render static token swatches fine. Copy-to-clipboard + motion demos need client.
   - What's unclear: Whether a single `'use client'` page is simpler than a server shell with client islands.
   - Recommendation: Single client component (`'use client'` at top of `page.tsx`). The entire page is interactive (tabs, copy buttons) — no SSR benefit.

2. **Exact letter-spacing value for the label tier.**
   - What we know: CONTEXT says "uppercase, tracked" for 12px label. Typical range 0.03–0.08em.
   - What's unclear: Claude's Discretion.
   - Recommendation: `0.04em` (conservative — matches Linear's own labeling). Visually verify at pilot-time.

3. **Should density toggling happen via data-attribute on `<body>` or on `<table>` only?**
   - What we know: Dense is app default. Sparse is primarily for tables. Toggle UI is deferred.
   - What's unclear: Whether Phase 26 should ship a `data-density` on root (enabling future global toggle) or scope to `<table>`.
   - Recommendation: Scope to `<table>` in pilot. Root-level density can be added later without breaking.

4. **JetBrains Mono vs Geist Mono for the mono family.**
   - What we know: CONTEXT prefers JetBrains Mono with Claude's Discretion to propose equivalents.
   - What's unclear: Whether the existing Geist Mono is already "good enough" for the data-dense tabular use case.
   - Recommendation: Go with JetBrains Mono per locked default. It's sharper for tabular figures and signals "engineering/data tool" clearly. Swap is trivial (`next/font/google` import change).

5. **Where should `tokens.css` live (single file in globals.css vs separate file)?**
   - What we know: CONTEXT says "location TBD during research — likely `src/styles/tokens.css` or integrated into `globals.css`."
   - What's unclear: Extracting vs keeping inline.
   - Recommendation: **Keep inline in globals.css.** Tailwind v4's `@theme` must be in the entry CSS graph; a separate file adds `@import` indirection with no payoff. Use CSS comments (`/* === SPACING === */`) to create visual sections. If the file exceeds ~400 lines, reconsider in a future phase.

## Sources

### Primary (HIGH confidence)
- `src/app/globals.css` (inspected) — current token surface, @custom-variant dark, @theme inline pattern, shadcn vars
- `src/app/layout.tsx` (inspected) — next/font/google usage, suppressHydrationWarning, SidebarProvider layout
- `src/app/providers.tsx` (inspected) — next-themes `attribute="class"` + `disableTransitionOnChange`
- `src/components/kpi/kpi-card.tsx` (inspected) — pilot component A; current styling (`rounded-xl border border-border/50 bg-transparent p-4`)
- `src/components/layout/header.tsx` (inspected) — pilot component B; current styling (`border-b border-border/50 bg-background/80 backdrop-blur-sm`)
- `src/components/table/table-body.tsx` (inspected) — pilot component C; current row styling (`transition-colors hover:bg-muted/50`, `px-3 py-2 text-sm`), row height `estimateSize: 42`
- `src/components/ui/card.tsx` (inspected) — shadcn Card primitive, ring-based border, `rounded-xl` default
- `src/components/ui/sidebar.tsx` (inspected) — shadcn sidebar variant="inset" (matches CONTEXT's "sidebar is surface-base with subtle right-edge")
- `src/components/theme-toggle.tsx` (inspected) — next-themes `setTheme` pattern
- `package.json` (inspected) — Tailwind 4, Next 16.2.3, React 19, shadcn 4.2.0, tw-animate-css 1.4.0, sonner 2.0.7, next-themes 0.4.6, lucide-react 1.8.0, tailwind-merge 3.5.0, @base-ui/react 1.3.0 (usable for Tabs on /tokens)
- `node_modules/tailwindcss/package.json` — version 4.2.2 confirmed
- `node_modules/next/dist/docs/01-app/01-getting-started/11-css.md` — Tailwind v4 setup with Next.js App Router
- `node_modules/next/dist/docs/01-app/01-getting-started/13-fonts.md` — next/font/google pattern
- `postcss.config.mjs` — `@tailwindcss/postcss` plugin wired
- `components.json` — shadcn config: css `src/app/globals.css`, baseColor `neutral`, cssVariables `true`, style `base-nova`

### Secondary (MEDIUM confidence — WebFetch against authoritative docs)
- https://tailwindcss.com/docs/theme — `@theme` vs `@theme inline`, namespace list (`--spacing-*`, `--color-*`, `--text-*`, `--font-*`, `--shadow-*`, `--duration-*`, `--ease-*`, etc.)
- https://tailwindcss.com/docs/transition-duration — `--duration-*` namespace confirmed
- https://tailwindcss.com/docs/font-variant-numeric — `tabular-nums` + `lining-nums` combinable

### Tertiary (LOW confidence / general knowledge)
- OKLCH color practices (general perceptual uniformity knowledge — no citation; confirm visually during pilot)
- Linear's exact shadow/letter-spacing values (inference from aesthetic descriptions; confirm visually during pilot)

## Build Verification

**Commands to run:**
- `npm run build` — full production build (runs `next build`); verifies Tailwind compiles all token references, catches syntax errors in `@theme` blocks
- `npm run dev` — local dev server at `localhost:3000`; hot-reloads CSS token changes instantly
- `npm run lint` — ESLint pass (does not enforce token usage — deferred)

**Visual verification loop (per user memory "Test visually first"):**
1. `mcp__Claude_Preview__preview_start` → launches dev server in preview harness
2. `mcp__Claude_Preview__preview_screenshot` → before-state capture
3. Apply token change
4. `mcp__Claude_Preview__preview_screenshot` → after-state capture (light mode)
5. Toggle dark mode via ThemeToggle → `preview_screenshot` (dark mode)
6. `mcp__Claude_Preview__preview_inspect` with CSS selectors on pilot components — verify computed `padding`, `background-color`, `box-shadow`, `font-family` match token values

**Where pilot components render in the app:**
- KPI card: drill into a partner (sidebar → any partner) → 6-card grid above the table
- Header: top bar on every page
- Table row: default view (batch performance table) after data loads

## Existing CSS Custom Property Inventory

Full list from globals.css — what exists today that must continue working:

**shadcn color vars (keep — re-map values):**
`--background`, `--foreground`, `--card`, `--card-foreground`, `--popover`, `--popover-foreground`, `--primary`, `--primary-foreground`, `--secondary`, `--secondary-foreground`, `--muted`, `--muted-foreground`, `--accent`, `--accent-foreground`, `--destructive`, `--border`, `--input`, `--ring`

**shadcn chart vars (keep — re-map to `--chart-categorical-*`):**
`--chart-1` through `--chart-8`

**shadcn sidebar vars (keep):**
`--sidebar`, `--sidebar-foreground`, `--sidebar-primary`, `--sidebar-primary-foreground`, `--sidebar-accent`, `--sidebar-accent-foreground`, `--sidebar-border`, `--sidebar-ring`

**Project-specific cell tint vars (keep):**
`--cell-zero`, `--cell-tint-low`, `--cell-tint-high` — used by heatmap cells; should be re-mapped to reference `--chart-diverging` palette once that exists.

**Radius scalar (keep):**
`--radius: 0.625rem` + computed `--radius-sm`/`-md`/`-lg`/`-xl`/`-2xl`/`-3xl`/`-4xl`. Decision: **replace the computed ladder with explicit `--radius-sm: 4px / --radius-md: 8px / --radius-lg: 12px`** matching CONTEXT's locked 3-step system. The existing `--radius: 0.625rem` (10px) will no longer be the multiplier source — can keep as a legacy alias or remove.

**Font vars (keep, retarget):**
`--font-sans`, `--font-mono`, `--font-heading` — all currently point at Geist derivatives. Retarget to Inter + JetBrains Mono.

## Validation Architecture

Skipped — `.planning/config.json` does not set `workflow.nyquist_validation` to `true`. Project uses visual verification loop (preview_screenshot + preview_inspect) per locked migration strategy in CONTEXT.md.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions confirmed against package.json and node_modules
- Tailwind v4 @theme syntax: HIGH — verified against official docs (tailwindcss.com/docs/theme)
- Pilot component locations & current styling: HIGH — inspected source
- shadcn re-mapping mechanics: HIGH — same mechanism already used in `@theme inline` block
- Dark-mode raised-lighter inversion impact: MEDIUM — speculative for non-pilot components (will surface in Phases 27-31)
- Warm paper exact OKLCH values: LOW — Claude's Discretion, verify visually in pilot
- `/tokens` page architecture: MEDIUM — standard App Router pattern, but interaction details are Claude's Discretion

**Research date:** 2026-04-16
**Valid until:** 2026-05-16 (Tailwind v4 is stable; Next.js 16 is stable; shadcn OKLCH migration is complete — no known upcoming breaking changes in this window)
