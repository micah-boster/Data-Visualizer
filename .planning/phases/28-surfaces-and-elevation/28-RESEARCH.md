# Phase 28: Surfaces & Elevation - Research

**Researched:** 2026-04-17
**Domain:** Applying Phase 26 surface + shadow tokens across the app chrome and content containers (Tailwind v4 / Next.js 16 / @base-ui/react / shadcn)
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Elevation character**
- **Intensity: medium / soft.** Notion-style. Shadows are visible but soft — a noticeable step up from 26-02's current `shadow-sm` subtlety. Expect the semantic elevation recipes (below) to read heavier than today's pilots in isolation; the goal is more dimensional presence while staying restrained.
- **Dark mode primary signal = lighter surface on darker bg.** `surface-raised` already lighter than `surface-base` in dark mode carries the hierarchy. Shadows reinforce but don't do the heavy lifting — they'd look muddy otherwise.
- **Interactive surfaces lift on hover.** KPI cards that drill, table rows that open panels, chart cards — static rest shadow is one notch, hover bumps up one level. Static rest shadows are defined in Phase 28; the timing/transition behavior is Phase 30's job, but the two hover elevation states must be defined here so 30 has something to animate between.
- **Semantic elevation levels introduced.** Call sites never pick `shadow-sm` directly for primary containers — they reach for `elevation-chrome`, `elevation-raised`, `elevation-overlay`, `elevation-floating`. Matches Phase 26's semantic-over-raw ethos.

**Shadow tokens & glass**
- **Multi-layer composition: 3-layer (key + ambient + rim).** Every semantic elevation is a compound of: key shadow (directional, ~2-4px), ambient halo (soft, 8-24px), and a rim highlight (1px inner or outer on the top edge to catch light). Reads as physical objects, not drop-shadow decals. The "multi-layer" language in DS-11 + DS-15 means this for all elevations, not just popovers.
- **Semantic elevation catalog (4 levels):**
  - `elevation-chrome` → header, sidebar sticky edges (lowest presence)
  - `elevation-raised` → cards, KPIs, chart containers, hover state of chrome
  - `elevation-overlay` → popovers, dropdowns, tooltips, sticky table column header when scrolled
  - `elevation-floating` → dialogs, modals, command palette (heaviest)
- **Translucent surface variant introduced — header only.** Add a `surface-translucent` token (semi-opaque + `backdrop-blur`) and apply to the sticky header so content blurs underneath on scroll. 26-03 explicitly deferred the blur-glass aesthetic here as "a translucent surface variant rather than hand-rolled blur classes" — this fulfills that. Popovers stay opaque (readability against busy table bgs is a risk).
- **Raw `shadow-xs/sm/md/lg` tokens stay as primitives.** Semantic elevations are recipes that reference the raw tokens (e.g., `elevation-raised = shadow-sm + rim highlight + border`). UI code uses semantic tokens for primary containers; raw tokens remain available for edge cases (badges, chips, tooltips) where a full semantic elevation is overkill.

**Table recession**
- **"Inset" = `surface-inset` bg only** — no inner box-shadow, no dashed top border, no extra effects. The beige-recessed color contrast with `surface-base` does the work. Start here; add inner shadow only if pilot testing shows it doesn't read as recessed.
- **Drop the outer border / card wrapper around the DataTable.** The inset bg + padding + rounded corners defines the boundary. Reads as "the data lives in a recessed pane," not "a card containing a table." No nested picture-frame.
- **Row backgrounds are transparent over the inset bg.** No zebra striping. Hover = subtle bg tint (color, not elevation change). Rest rows pick up `surface-inset` by transparency.
- **Sticky column header is slightly raised within the inset pane.** Column header row sits at `surface-base` or `surface-raised` (pilot will pick) with a subtle bottom shadow that appears when the body scrolls underneath. Signals "this stays put" — matches the hover-lift philosophy that elevation marks affordance. Not `elevation-chrome`-heavy — a lighter treatment inside the inset.

**Sidebar depth**
- **Separation mechanism: background differential only.** No right-edge shadow, no vertical divider line. Color contrast between sidebar surface and main content surface is the full depth cue.
- **Surface pair: sidebar = `surface-base`, main content = `surface-raised`.** Content area lifts off the sidebar chrome — content is the focus, sidebar is the ground. Inverts the more common "sidebar-as-panel" pattern.
- **Three-surface interaction with the existing header = Claude's discretion.** Header already shipped at `surface-raised + shadow-xs` in 26-03. Whether Phase 28 (a) keeps header raised with the translucent variant stacked on top, (b) revisits the header surface choice, or (c) makes header/sidebar a unified chrome layer is a planning-time decision based on which combination reads cleanest in both modes after visual test.

### Claude's Discretion
- Content-region scope: whether the whole content pane is one big `surface-raised` plate (with nested cards using their own raised treatment) vs. content-region stays `surface-base` and individual cards raise. Pilot and pick whichever reads cleanest.
- Exact chrome fit: how header + sidebar + content interact given sidebar = base and content = raised. Pilot-driven.
- Exact hover-lift magnitude (one notch up from rest — but "notch" sizing is pilot-tested).
- Exact shadow color values (warm-tinted oklch offsets vs. neutral rgba) and opacity per layer of the 3-layer compounds.
- Sticky table column-header surface choice (`surface-base` vs. `surface-raised` inside the inset pane).
- Pilot surface order and sweep cadence — match Phase 26 / Phase 27 pattern (one plan per surface: header upgrade, KPI cards retune, table, charts, popovers/dropdowns, sidebar, cleanup sweep). Planner picks first pilot.
- Whether `elevation-chrome-hover` needs to be a distinct named token or is handled by `elevation-raised` as the hover target.
- ESLint / grep CI guard to prevent regression onto ad-hoc shadow + border combos post-sweep (mirrors Phase 27's enforcement approach).

### Deferred Ideas (OUT OF SCOPE)
- **Hover lift transition timing, press-state de-elevation, drill animation elevation changes** — Phase 30 (Micro-Interactions & Motion). Phase 28 defines the static rest + hover elevation states; Phase 30 animates between them.
- **Translucent variant on popovers/dropdowns/dialogs** — Phase 31 (Visual Polish). Header-only for now; broader glass treatment is polish work.
- **Gradient dividers, dark-mode highlight edges, focus glow rings, border consistency sweep** — Phase 31 (Visual Polish).
- **Component patterns that compose surfaces (StatCard, DataPanel, SectionHeader actions, ToolbarGroup, EmptyState)** — Phase 29. Phase 28 treats raw containers; Phase 29 builds the reusable composed shapes on top.
- **Drilled-in view surfacing per-batch KPI cards at the top** — own phase, not Phase 28.
- **Zebra striping, row-hover-lifts-to-raised, inner-shadow wells on the table** — rejected for Phase 28 (transparent rows over inset bg was chosen).
</user_constraints>

<phase_requirements>
## Phase Requirements (DS-11 through DS-17)

| ID | Description (from ROADMAP.md success criteria) | Research Support |
|----|-----------------------------------------------|------------------|
| DS-11 | Header uses subtle bottom shadow (not just border-b) creating a float effect — evolve to multi-layer compound + translucent variant | §Current Inventory → header.tsx already at `bg-surface-raised shadow-xs`; §Token Design → `elevation-chrome` + `surface-translucent`; §Shadcn Override Matrix → header is owned by us (not a shadcn primitive) |
| DS-12 | KPI cards use surface-raised (border + soft shadow) — they pop off the background | §Current Inventory → `kpi-card.tsx:48` already at `rounded-lg border border-border bg-surface-raised p-card-padding shadow-sm`; §Token Design → retune to `elevation-raised` recipe; §Gap → `kpi-summary-cards.tsx:59,71` skeleton wrappers still on `rounded-xl border border-border/50 bg-transparent p-4` — must be migrated |
| DS-13 | Table area uses surface-inset — slightly recessed, data is the focus | §Current Inventory → `data-table.tsx:347` already `bg-surface-inset overflow-auto`; §Sweep Targets → drop outer `border` wrapper per CONTEXT; §Pitfalls → scroll clipping + sticky column header inside inset |
| DS-14 | Chart containers use surface-raised with consistent padding and corner radius | §Current Inventory → charts live inside `data-display.tsx:497 px-2 pt-2 space-y-2` wrapper with NO raised container around individual charts; §Sweep Targets → `collection-curve-chart.tsx`, `cross-partner/trajectory-chart.tsx`, `root-sparkline.tsx`, `partner-sparkline.tsx`, `cross-partner/comparison-matrix.tsx` each need a raised shell |
| DS-15 | Popovers and dropdowns use surface-overlay with multi-layer shadows | §Shadcn Override Matrix → `ui/popover.tsx:40` ships `bg-popover shadow-md ring-1 ring-foreground/10`; override strategy defined; §Sweep Targets → `ui/popover.tsx`, `ui/sheet.tsx`, `ui/tooltip.tsx`, `filter-combobox.tsx:45` combobox popup, `query-command-dialog.tsx:45` dialog popup, `curve-tooltip.tsx:84`, `trajectory-tooltip.tsx:39` |
| DS-16 | Sidebar has subtle depth separation from main content (right edge treatment) | §Current Inventory → `app-sidebar.tsx:34` uses `variant="inset"` which in shadcn v4 wraps MAIN in rounded-xl+shadow-sm (not sidebar itself); §Token Design → `surface-base` sidebar + `surface-raised` content pane = depth via bg differential per CONTEXT; §Shadcn Override Matrix → `ui/sidebar.tsx:310` SidebarInset currently `md:peer-data-[variant=inset]:m-2 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow-sm` — aligns with intent but shadow token is raw, not semantic |
| DS-17 | All surface treatments are consistent — no more 3 different card styles | §Sweep → 17+ containers enumerated; §Enforcement Guard → POSIX grep pattern analogous to Phase 27's `check-type-tokens.sh` to forbid `rounded-lg border bg-(card\|transparent)` + raw `shadow-(xs\|sm\|md\|lg)` on primary containers outside allowlist |
</phase_requirements>

## Summary

Phase 28 is a **mechanical sweep applying Phase 26's surface + shadow primitives to every container in the app**, layered with one net-new addition: a semantic elevation catalog (`elevation-chrome`, `elevation-raised`, `elevation-overlay`, `elevation-floating`) built as 3-layer shadow recipes, plus a `surface-translucent` variant wired to the sticky header. Phase 27 established a strong execution template — one pilot per surface, Wave-based cadence, a `/tokens` page demo block, and a CI grep guard. Phase 28 follows the exact same template with one complication: shadcn primitives (Card, Popover, Sheet, Tooltip, shadcn Sidebar variant="inset") ship with their own `shadow-*`, `ring-1`, and `rounded-*` defaults that conflict with the new semantic recipes. The repo does NOT use Radix — it uses `@base-ui/react` v1.3.0 via shadcn v4.2.0, so override strategy is `className` composition against `cn()` — not `data-slot` overrides or forking primitives.

The token scaffolding already exists: `--shadow-xs/sm/md/lg` are defined as multi-layer warm-tinted oklch compounds (`globals.css:72-82`, `:391-400`), `--surface-base/raised/inset/overlay/floating` are defined per-mode with the intended dark-mode inversion (`:225-229`, `:342-346`), and three pilots already consume them cleanly (`kpi-card.tsx`, `header.tsx`, `data-table.tsx` scroll wrapper). The 4-level semantic elevation catalog is **additive** — it composes the existing raw shadow primitives, does not replace them. The largest technical risk is the sidebar decision: the current `app-sidebar.tsx` uses shadcn's `variant="inset"` which inverts the CONTEXT's locked architecture (shadcn's inset wraps the MAIN content in rounded+shadow, but CONTEXT wants bg differential only — sidebar = base, content = raised, no shadow on the content pane border). Reconciling those is a first-plan pilot decision.

**Primary recommendation:** Add four `elevation-*` CSS custom properties + one `surface-translucent` property to `globals.css` in Wave 1 (token foundation plan), then execute the container sweep in Waves 2-3 following the Phase 26 pilot order: header (translucent upgrade) → KPI cards (retune) → chart containers (new raised shells) → table inset cleanup (drop outer border, add sticky column-header lift) → popover/dropdown/tooltip family (shadcn override pattern) → sidebar/content three-surface reconciliation. Close with a grep guard in Wave 4 (`scripts/check-surfaces.sh` analogous to `check-type-tokens.sh`) and a `/tokens` page elevation section.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard (for this repo) |
|---------|---------|---------|--------------|
| Tailwind CSS | v4 (`tailwindcss: ^4`, `@tailwindcss/postcss: ^4`) | Utility classes + `@theme` namespace-driven token emission | Already authoritative — `@theme` auto-generates `shadow-*`, `bg-*`, `rounded-*` utilities from CSS custom properties |
| `@base-ui/react` | `^1.3.0` | Headless primitives underlying shadcn (Popover, Dialog, Tooltip, Combobox, Switch, Checkbox, Separator, Button, ScrollArea, Tabs) — NOT Radix | All `src/components/ui/*.tsx` wrap Base UI, not Radix. Override patterns differ from Radix docs. |
| `shadcn` | `^4.2.0` (registry) | Pre-composed UI wrappers over Base UI — re-rendered locally in `src/components/ui/` | Components live in-repo, are editable, and already re-mapped to Phase 26 tokens (`--card: var(--surface-raised)`, `--popover: var(--surface-overlay)`, etc.) |
| Next.js | `16.2.3` | App Router, RSC, `next/font/google` for Inter + JetBrains Mono | Only relevant for layout/chrome composition; no Phase 28 concern beyond existing SSR patterns |
| React | `19.2.4` | Runtime | No impact |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `tailwind-merge` (via `cn()`) | `^3.5.0` | Composes overriding classes without conflicts — lets callers pass `className="shadow-none"` and have it beat the primitive's `shadow-md` | Required for every shadcn override — `cn(primitiveClasses, callerClassName)` already wired in every `ui/*.tsx` |
| `class-variance-authority` | `^0.7.1` | `cva` — used in `ui/button.tsx` and `ui/sidebar.tsx` for variant slots | Not needed for Phase 28 (no new variants); read-only |
| `tw-animate-css` | `^1.4.0` | `data-open:animate-in` / `data-closed:animate-out` classes on popovers + dialogs | Not modified; existing enter/exit animations remain |
| `next-themes` | `^0.4.6` | `.dark` class on `<html>` — drives the `:root` vs `.dark` token split | Already wired; verify both modes per pilot |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| 3-layer compound shadow via CSS custom property string | Tailwind `shadow-[...]` arbitrary value per call site | Arbitrary-value scattering defeats the whole semantic-token discipline. Token-as-compound wins. |
| Custom ESLint rule for forbidden ad-hoc surface+shadow classes | POSIX grep script mirroring `check-type-tokens.sh` | Precedent from 27-06 is decisive: grep is 15 lines, runs <1s, zero AST complexity. Use grep. |
| Forking shadcn primitives to bake in semantic elevation | Override via caller `className` on the primitive instances | Shadcn-v4 pattern is "own your copy" — files live at `src/components/ui/*.tsx` and are already edited. Edit the file once, don't fork a separate primitive. |
| Replace raw `--shadow-*` with semantic `--elevation-*` only | Keep raw primitives AND add semantic layer on top (CONTEXT-locked) | CONTEXT explicitly keeps raw tokens for edge cases. Additive, not replacement. |

**No new npm dependencies required for Phase 28.** All token and sweep work is CSS + className changes.

## Architecture Patterns

### Token Layer (Wave 1 foundation plan)

Extend `src/app/globals.css` in the existing `@theme` and `@theme inline` blocks. Additive — do not rename or remove existing tokens.

```
src/app/
└── globals.css      # Add --elevation-* (raw compounds, :root + .dark) + --color-surface-translucent + @theme inline aliases
```

**Key design decision:** Tailwind v4's `--shadow-*` namespace emits `shadow-elevation-chrome` etc. automatically **if** the tokens live under that namespace. Naming them `--shadow-elevation-chrome` causes Tailwind to emit `shadow-elevation-chrome` utility classes → call sites write `shadow-elevation-chrome` (not `elevation-chrome`). Alternative: name them `--elevation-chrome` outside the `--shadow-*` namespace and have call sites use arbitrary `shadow-[var(--elevation-chrome)]`. First approach is preferred — emits a real utility, stays consistent with `shadow-sm` etc.

### Surface Sweep Pattern (Phase 26/27 template)

Phase 26 established a pilot-then-sweep cadence that Phase 27 reused verbatim. Phase 28 follows the same structure:

```
Wave 1 (foundation):  Plan 28-01 — Add elevation-* + surface-translucent tokens to globals.css
                                    + /tokens page elevation section demo
Wave 2 (pilots, parallel-capable):
                      Plan 28-02 — Header translucent upgrade (DS-11)
                      Plan 28-03 — KPI cards retune to elevation-raised (DS-12)
                      Plan 28-04 — Table inset cleanup + sticky column-header lift (DS-13)
Wave 3 (sweeps):
                      Plan 28-05 — Chart container raised shells (DS-14) covering
                                    CollectionCurveChart, CrossPartnerTrajectoryChart,
                                    PartnerComparisonMatrix, RootSparkline, PartnerSparkline
                      Plan 28-06 — Popover/Sheet/Tooltip overlay sweep (DS-15) —
                                    override shadcn primitives in src/components/ui/,
                                    plus curve-tooltip, trajectory-tooltip,
                                    filter-combobox popup, query-command-dialog popup
                      Plan 28-07 — Sidebar + content-pane three-surface reconciliation (DS-16)
Wave 4 (enforcement):
                      Plan 28-08 — scripts/check-surfaces.sh POSIX grep guard
                                    + npm run check:surfaces
                                    + DS-17 cleanup of any stragglers surfaced by the grep
```

Plans within Wave 2 are parallel-safe (touch disjoint files). Wave 3 plans are also mostly disjoint; popover sweep touches `src/components/ui/` which is the allowlisted carveout per Phase 27's enforcement pattern.

### Pattern 1: Semantic Elevation Compound

**What:** Define each elevation level as a multi-layer box-shadow string. Reference it via Tailwind's emitted `shadow-*` utility.

**When to use:** Every primary container — header, cards, chart shells, popover bodies, dialog bodies. NOT for badges/chips/inline pills (those stay on `shadow-xs` or no shadow).

**Example:** (approximate — exact opacities are Claude's Discretion per CONTEXT)

```css
/* Source: Tailwind v4 @theme docs + existing globals.css:73-82 precedent */
@theme {
  /* Raw primitives (already exist) */
  --shadow-xs: 0 1px 2px 0 oklch(0.2 0.015 70 / 0.04);
  --shadow-sm: 0 1px 2px 0 oklch(0.2 0.015 70 / 0.05), 0 2px 6px -2px oklch(0.2 0.015 70 / 0.06);
  /* ... */

  /* Semantic elevation recipes (NEW — Phase 28) */
  --shadow-elevation-chrome:
    0 1px 2px 0 oklch(0.2 0.015 70 / 0.04),                           /* key */
    0 2px 8px -2px oklch(0.2 0.015 70 / 0.05),                        /* ambient */
    inset 0 1px 0 0 oklch(1 0 0 / 0.06);                              /* rim highlight */
  --shadow-elevation-raised:
    0 1px 2px 0 oklch(0.2 0.015 70 / 0.06),
    0 4px 12px -2px oklch(0.2 0.015 70 / 0.08),
    inset 0 1px 0 0 oklch(1 0 0 / 0.08);
  --shadow-elevation-overlay:
    0 2px 4px 0 oklch(0.2 0.015 70 / 0.08),
    0 8px 24px -4px oklch(0.2 0.015 70 / 0.12),
    inset 0 1px 0 0 oklch(1 0 0 / 0.10);
  --shadow-elevation-floating:
    0 4px 8px 0 oklch(0.2 0.015 70 / 0.10),
    0 16px 40px -8px oklch(0.2 0.015 70 / 0.16),
    inset 0 1px 0 0 oklch(1 0 0 / 0.12);
}

.dark {
  /* Re-tinted for dark — shadows carry LESS weight, surface color inversion does the lifting per CONTEXT */
  --shadow-elevation-chrome:
    0 1px 2px 0 oklch(0 0 0 / 0.30),
    0 2px 8px -2px oklch(0 0 0 / 0.25),
    inset 0 1px 0 0 oklch(1 0 0 / 0.04);
  /* ... each level similarly rebalanced */
}
```

**Usage:** `className="bg-surface-raised shadow-elevation-raised rounded-lg p-card-padding"`

### Pattern 2: Translucent Surface (header-only)

**What:** Semi-opaque surface + `backdrop-blur` baked into a single CSS custom property reference + utility.

**When to use:** Sticky header only in Phase 28. Other sticky chrome (toolbar, sticky table column header) is OUT of scope for translucency per CONTEXT.

**Example:**

```css
:root {
  --color-surface-translucent: color-mix(in oklch, var(--surface-raised) 80%, transparent);
}
.dark {
  --color-surface-translucent: color-mix(in oklch, var(--surface-raised) 82%, transparent);
}
```

Header usage:
```tsx
// src/components/layout/header.tsx
<header className="bg-surface-translucent backdrop-blur-md shadow-elevation-chrome ...">
```

Note: `backdrop-blur-md` is a built-in Tailwind v4 utility; no token needed for the blur radius itself. CONTEXT notes popovers stay opaque.

### Pattern 3: Shadcn Override via `className` Composition

**What:** Shadcn primitives in `src/components/ui/` already use `cn(defaultClasses, className)`. To retune the default shadow/ring/radius, edit the primitive file directly — do NOT fork.

**When to use:** Every primitive that ships its own shadow/border/ring.

**Example:**

```tsx
// Source: src/components/ui/popover.tsx (current state + Phase 28 target)

// BEFORE (current):
<PopoverPrimitive.Popup
  className={cn(
    "z-50 flex w-72 ... rounded-lg bg-popover p-2.5 ... shadow-md ring-1 ring-foreground/10 ...",
    className
  )}
/>

// AFTER (Phase 28 target — swap shadow-md for semantic elevation, drop conflicting ring):
<PopoverPrimitive.Popup
  className={cn(
    "z-50 flex w-72 ... rounded-lg bg-surface-overlay p-2.5 ... shadow-elevation-overlay ...",
    className
  )}
/>
```

**Critical:** The existing shadcn primitives ALREADY reference `bg-popover`, `bg-card`, etc. — which Phase 26 re-mapped to the surface tokens. So `bg-popover` IS `surface-overlay` by re-map. The Phase 28 changes are (a) swap `shadow-md` → `shadow-elevation-overlay`, (b) drop `ring-1 ring-foreground/10` if the multi-layer shadow's rim highlight carries separation (pilot-driven), (c) optionally switch `bg-popover` → `bg-surface-overlay` for call-site legibility (identical visually since `--popover: var(--surface-overlay)` in both modes).

### Anti-Patterns to Avoid

- **Adding a second shadow via `className` prop on a shadcn primitive.** `cn()` doesn't intelligently merge `shadow-md` + `shadow-elevation-overlay` — both become active and compound. Edit the primitive file, don't stack.
- **Wrapping a shadcn primitive in another `<div className="shadow-...">` to "add" elevation.** The primitive is already the container; double-wrapping breaks portal positioning (popover/tooltip/dialog portal to body).
- **Applying `shadow-elevation-*` to a badge/chip/inline pill.** Semantic elevations are for containers. Badges stay flat or on `shadow-xs`.
- **Ad-hoc `bg-*/50` opacity tinting on surface tokens.** Surface tokens are designed opaque; opacity-tinted surfaces don't compose predictably with the 3-layer shadow's rim highlight.
- **Forking a shadcn primitive into a new file.** Repo pattern is "edit `src/components/ui/popover.tsx`"; a new `src/components/ui/surfaces-popover.tsx` fractures the primitive tree.

## Current Inventory (what exists today)

### Already consuming Phase 26 surface/shadow tokens (do not regress)
| File | Current token usage | DS-# coverage | Phase 28 action |
|------|--------------------|---------------|-----------------|
| `src/components/layout/header.tsx:32` | `bg-surface-raised shadow-xs px-page-gutter` | DS-11 (partial — border dropped, shadow thin) | Upgrade to `elevation-chrome` + `surface-translucent` + `backdrop-blur-md` |
| `src/components/kpi/kpi-card.tsx:48` | `rounded-lg border border-border bg-surface-raised p-card-padding shadow-sm transition-colors duration-quick ease-default` | DS-12 | Retune to `elevation-raised` recipe; decide whether the explicit `border border-border` still earns its place once rim highlight is in |
| `src/components/table/data-table.tsx:347` | `bg-surface-inset overflow-auto` on scroll wrapper | DS-13 | Remove outer `border` wrapper per CONTEXT; add sticky column-header lift inside inset pane |
| `src/app/globals.css:73-82, 391-400` | `--shadow-xs/sm/md/lg` raw multi-layer | Foundation | Add `--shadow-elevation-*` semantic recipes + `--color-surface-translucent` |
| `src/app/layout.tsx:42-47` | `<SidebarInset>` wraps header + main; `<main className="... p-2 md:p-3">` content area has NO surface class | DS-16 | Reconcile the three-surface layout per CONTEXT (sidebar=base, content=raised, header=?) |

### Ad-hoc shadow + border containers that must be migrated (sweep targets)

Enumerated from grep scan of `shadow-|border|bg-card|bg-popover|bg-muted|bg-background|rounded-lg|rounded-md|rounded-xl|ring-1|backdrop-blur`:

**High-priority primary containers (must move to semantic elevation):**

| File:Line | Current classes | Fix target | DS-# |
|-----------|-----------------|------------|------|
| `src/components/kpi/kpi-summary-cards.tsx:59` | `rounded-xl border border-border/50 bg-transparent p-4` (skeleton cells) | `rounded-lg bg-surface-raised shadow-elevation-raised p-card-padding` (match real KpiCard) | DS-12 |
| `src/components/kpi/kpi-summary-cards.tsx:71` | `rounded-xl border border-border/50 bg-transparent` (zero-batch empty) | same as above, with muted content | DS-12 |
| `src/components/anomaly/anomaly-summary-panel.tsx:41` | `rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30` (ad-hoc amber palette — NOT state tokens) | Either: (a) `rounded-lg bg-warning-bg border-warning-border shadow-elevation-raised` or (b) alert role semantic, not a surface. Planning decision. | DS-14 adjacent |
| `src/components/query/query-response.tsx:44` | `rounded-lg border bg-card p-4` | `rounded-lg bg-surface-raised shadow-elevation-raised p-card-padding` | DS-14 |
| `src/components/query/query-response.tsx:62` | `rounded-lg border border-destructive/20 bg-card p-4` (error variant) | same surface, keep destructive border accent | DS-14 |
| `src/components/query/query-response.tsx:94` | `rounded-lg border bg-card p-4 max-h-[200px] overflow-y-auto` | same as above | DS-14 |
| `src/components/query/query-search-bar.tsx:127` | `rounded-lg border bg-card p-3 shadow-sm` | `rounded-lg bg-surface-raised shadow-elevation-raised p-card-padding` | DS-14 |
| `src/components/charts/curve-tooltip.tsx:84` | `rounded-lg border bg-popover px-3 py-2 text-body text-popover-foreground shadow-md` | `rounded-lg bg-surface-overlay shadow-elevation-overlay px-3 py-2` (drop border — rim highlight handles edge) | DS-15 |
| `src/components/cross-partner/trajectory-tooltip.tsx:39` | `rounded-lg border bg-background/95 px-3 py-2 shadow-md backdrop-blur-sm` (translucent per-tooltip — CONTEXT says popovers stay opaque) | `rounded-lg bg-surface-overlay shadow-elevation-overlay px-3 py-2` (drop `bg-background/95` + `backdrop-blur-sm`) | DS-15 |

**Shadcn primitive files that ship conflicting defaults (edit in place):**

| File:Line | Current conflicting defaults | Phase 28 change | DS-# |
|-----------|------------------------------|-----------------|------|
| `src/components/ui/popover.tsx:40` | `rounded-lg bg-popover p-2.5 shadow-md ring-1 ring-foreground/10` | `rounded-lg bg-surface-overlay p-2.5 shadow-elevation-overlay` — drop the ring (rim layer handles it) | DS-15 |
| `src/components/ui/tooltip.tsx:53` | `rounded-md px-3 py-1.5 bg-foreground text-background` (inverted solid tooltip — intentional contrast pattern) | **Decision point**: leave inverted tooltip as-is (it's a distinct affordance, not an overlay surface), OR normalize to `surface-overlay` tooltips — CONTEXT doesn't specify | DS-15 |
| `src/components/ui/sheet.tsx:56` | `bg-popover ... shadow-lg ... data-[side=*]:border-*` | `bg-surface-floating shadow-elevation-floating` — drop directional borders per CONTEXT "no outer border wrappers" | DS-15 |
| `src/components/ui/sheet.tsx:31` | `fixed inset-0 bg-black/10 ... supports-backdrop-filter:backdrop-blur-xs` (overlay backdrop) | Keep — backdrop is correct; blur-xs stays | — |
| `src/components/ui/card.tsx:15` | `rounded-xl bg-card py-4 ring-1 ring-foreground/10` — no shadow, ring-only | `rounded-lg bg-surface-raised shadow-elevation-raised py-4` — unify to elevation + drop ring. **Note:** `Card` may or may not be consumed by app code (check usage); the primary card in the app is `KpiCard` which doesn't use this primitive | DS-12 |
| `src/components/ui/card.tsx:87` | `rounded-b-xl border-t bg-muted/50 p-4` (footer stripe) | Pilot-driven — may or may not survive | — |
| `src/components/ui/sidebar.tsx:245` | `group-data-[variant=floating]:rounded-lg group-data-[variant=floating]:shadow-sm group-data-[variant=floating]:ring-1` | Floating variant is NOT USED (`app-sidebar.tsx:34` uses `variant="inset"`); can leave or swap for `shadow-elevation-raised` | DS-16 |
| `src/components/ui/sidebar.tsx:310` | `SidebarInset` — `md:peer-data-[variant=inset]:m-2 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow-sm` | THIS IS THE KEY LINE for DS-16. Current: content pane gets `shadow-sm`. Per CONTEXT: depth = bg differential only (sidebar=base, content=raised), no shadow on content-pane border. Options: (a) keep shadow-sm and accept redundant cue, (b) swap to `shadow-elevation-chrome`, (c) drop the shadow entirely per CONTEXT lock. Requires pilot. | DS-16 |
| `src/components/ui/chart.tsx:194` | `rounded-lg border border-border/50 bg-background px-2.5 py-1.5 shadow-xl` (Recharts tooltip shell) | `rounded-lg bg-surface-overlay shadow-elevation-overlay px-2.5 py-1.5` | DS-15 |

**Chart containers needing new raised shells (DS-14):**

The app currently renders charts inside `data-display.tsx:497` as a bare `<div className="shrink-0 px-2 pt-2 space-y-2">` — individual charts have NO raised container around them. Phase 28 adds a shell.

| Chart component | Current outer state | Phase 28 target |
|-----------------|--------------------|-----------------|
| `src/components/charts/collection-curve-chart.tsx` | Direct `ChartContainer` from shadcn `ui/chart.tsx` | Wrap with `div.bg-surface-raised.shadow-elevation-raised.rounded-lg.p-card-padding` shell |
| `src/components/cross-partner/trajectory-chart.tsx` | Raw Recharts + legend | Same raised shell |
| `src/components/cross-partner/comparison-matrix.tsx` | Tabbed matrix views | Same raised shell |
| `src/components/charts/root-sparkline.tsx` | Collapsed-state sparkline | Same raised shell (pilot-driven — collapsed state may stay ungrouped) |
| `src/components/charts/partner-sparkline.tsx` | Collapsed-state sparkline | Same raised shell (pilot-driven) |

**Other (lower priority — likely fold into cleanup sweep DS-17):**

| File:Line | Treatment |
|-----------|-----------|
| `src/components/table/sort-dialog.tsx:122,131` | `rounded-md border bg-card p-2` / `rounded-md border bg-background` — internal card rows inside a popover. Reach for `surface-overlay` nested tokens or drop borders. |
| `src/components/filters/filter-combobox.tsx:37,45` | `rounded-md border border-input bg-background` (trigger) + `rounded-md border bg-popover shadow-md` (popup) — popup migrates to `shadow-elevation-overlay`; trigger stays form-control treatment |
| `src/components/filters/filter-chips.tsx:43` | `rounded-full bg-muted text-caption` — chip, stays flat per anti-pattern |
| `src/components/query/query-command-dialog.tsx:45` | `rounded-xl bg-popover shadow-2xl ring-1 ring-foreground/10` — dialog popup, swap to `shadow-elevation-floating` |
| `src/components/table/table-body.tsx:50` | `bg-muted/30` zebra stripe — CONTEXT locks transparent rows over inset; REMOVE |
| `src/components/anomaly/anomaly-toolbar-trigger.tsx:82` | inline `hover:bg-muted` dropdown item — stays (hover color, not container surface) |
| `src/components/views/view-item.tsx:15` | `rounded-md px-2 hover:bg-accent/50` — list-item hover, stays |
| `src/components/cross-partner/matrix-*.tsx` | Various `hover:bg-muted/50` rows + `bg-muted` mini-chart shells — row hovers stay, chart shells get raised if not already |

### Containers that should NOT be changed (stable)

- `src/components/ui/*.tsx` FORM CONTROLS: `input.tsx`, `checkbox.tsx`, `switch.tsx`, `separator.tsx`, `skeleton.tsx`, `button.tsx` — these are leaf controls, not surfaces. Untouched.
- Row-level hover states (`hover:bg-muted`, `hover:bg-accent/50`) — interaction color, not surface elevation.
- Chip / badge / pill components (`query-scope-pill.tsx`, `filter-chips.tsx`, `query-suggested-prompts.tsx`) — inline meta, not surfaces.
- `src/components/tokens/*` — allowlisted per Phase 27 precedent; `/tokens` reference page dogfoods every token variant.

## Shadcn Override Matrix (DS-15 critical)

The repo uses `@base-ui/react` (Base UI), NOT Radix. Override strategies differ.

| Primitive | Base UI underneath | Current defaults (conflict with Phase 28) | Override strategy |
|-----------|-------------------|-------------------------------------------|-------------------|
| `Card` | Plain `<div>` — not Base UI | `rounded-xl bg-card py-4 ring-1 ring-foreground/10` | Edit `ui/card.tsx` directly; replace classes |
| `Popover` | `@base-ui/react/popover` | `rounded-lg bg-popover p-2.5 shadow-md ring-1 ring-foreground/10` | Edit `ui/popover.tsx`; drop `shadow-md` + `ring-1`, add `shadow-elevation-overlay` |
| `Tooltip` | `@base-ui/react/tooltip` | `rounded-md bg-foreground text-background` (inverted) | DECISION: keep inverted tooltip OR normalize to surface. CONTEXT doesn't specify. Recommend: keep inverted (it's a distinct affordance pattern used for dense hover hints — normalizing would make them feel like popovers). |
| `Sheet` | `@base-ui/react/dialog` | `bg-popover shadow-lg data-[side=*]:border-*` | Edit `ui/sheet.tsx`; drop side-specific borders, swap shadow for `shadow-elevation-floating`, consider `bg-surface-floating` |
| `Dialog` (query command) | `@base-ui/react/dialog` (inlined in `query-command-dialog.tsx`, not a shadcn wrapper) | `rounded-xl bg-popover shadow-2xl ring-1 ring-foreground/10` | Edit call site directly |
| `Combobox` popup | `@base-ui/react/combobox` (inlined in `filter-combobox.tsx`) | `rounded-md border bg-popover shadow-md` | Edit call site directly |
| `Sidebar` + `SidebarInset` | shadcn composition over `@base-ui/react/merge-props` | `SidebarInset: md:rounded-xl md:shadow-sm` + `Sidebar[variant=floating]: rounded-lg shadow-sm ring-1` | Edit `ui/sidebar.tsx` to align with CONTEXT (bg-differential only); depending on pilot decision, may require switching `app-sidebar.tsx:34` off `variant="inset"` |
| `ScrollArea` | `@base-ui/react/scroll-area` | No shadow | Untouched |

**Override mechanism:** `cn(primitiveClasses, callerClassName)` is already wired in every `ui/*.tsx` via `lib/utils.ts`. `tailwind-merge` (v3.5.0) handles same-namespace conflicts (e.g., caller's `shadow-none` beats primitive's `shadow-md`). For cross-namespace changes (dropping a `ring-1`), the primitive file must be edited — `tailwind-merge` can't remove a class that the caller didn't specify.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Multi-layer shadow stacking | Custom `<div>` with absolutely-positioned pseudo-elements for "key + ambient + rim" | Single CSS custom property with comma-separated box-shadow layers | CSS box-shadow supports N comma-separated layers natively; pseudo-elements break stacking context + portal positioning |
| Translucent sticky header | Scroll-listener JS toggling a `isScrolled` class | `backdrop-blur-md bg-surface-translucent` applied unconditionally | Backdrop filter handles the blur per-frame at GPU level; JS scroll listeners thrash layout |
| Surface color-mix opacity | Hand-authored per-token `oklch(... / 0.8)` variants | `color-mix(in oklch, var(--surface-raised) 80%, transparent)` | color-mix keeps a single source-of-truth for the base surface and derives the translucent variant; swapping the base updates both automatically |
| Shadcn primitive forking to bake in Phase 28 surfaces | New `src/components/ui/elevated-popover.tsx` wrapping the existing one | Edit `src/components/ui/popover.tsx` directly | Shadcn-v4 ethos is "own your copy" — the files are already in-repo for editing. Forking doubles the maintenance surface. |
| Dark-mode shadow re-derivation | Computing dark shadows via CSS `calc()` / `color-mix` on the light values | Separate explicit `.dark { --shadow-elevation-*: ... }` block mirroring Phase 26's pattern | Phase 26 precedent (`globals.css:391-400`) — dark shadows are hand-tuned darker/more-opaque because ambient physics differ in dark mode. Calc-derivation loses intent. |
| Enforcement guard | Custom ESLint rule (`no-restricted-syntax` on JSX `className` attribute values) | POSIX grep script (`scripts/check-surfaces.sh`) analogous to Phase 27's `check-type-tokens.sh` | Phase 27-06 decisively chose grep over custom ESLint AST; same rationale applies (15 lines, <1s, zero install footprint) |

**Key insight:** Phase 26 + 27 already built 80% of the infrastructure. Phase 28 is overwhelmingly a sweep + one small foundation addition (4 new CSS vars + 1 translucent variant). Do not introduce new libraries; the work is taxonomic and mechanical.

## Common Pitfalls

### Pitfall 1: Shadow clipping in scroll containers
**What goes wrong:** A chart card with `shadow-elevation-raised` placed inside `<div className="overflow-hidden">` or `<div className="overflow-auto">` has its shadow clipped at the container edge — looks like someone cut the shadow with scissors.
**Why it happens:** `overflow: hidden/auto/scroll` creates a clipping context for descendants, including their drop shadows.
**How to avoid:** (a) Ensure the elevation container sits OUTSIDE any `overflow-hidden` ancestor, OR (b) give the scroll wrapper enough padding on all sides to accommodate the shadow blur (≥24px ambient radius). For the table inset wrapper (`data-table.tsx:347`), the inset bg is the recession cue — the scroll-clipped shadow is fine because the surface IS the signal.
**Warning signs:** In DevTools, the computed `box-shadow` renders but is visually absent or truncated. The `/tokens` elevation demo page must put each elevation sample on a generously padded parent to avoid masking this pitfall during verification.

### Pitfall 2: Popover z-index + portal conflicts
**What goes wrong:** A popover uses `shadow-elevation-overlay` but renders BEHIND a sticky header or another overlapping element.
**Why it happens:** Base UI's popover portals the content to `<body>` (end of DOM) and applies `z-50`. The sticky header is `z-10` by default. But if a chart container or dialog sets a higher z-index, popovers stack wrong.
**How to avoid:** Phase 28 does NOT introduce new z-index values. Audit current z-indices during the popover sweep: `ui/popover.tsx:35` (Positioner z-50), `ui/popover.tsx:40` (Popup z-50), `ui/sheet.tsx:31,52` (Overlay z-50, Popup z-50), `ui/tooltip.tsx:48,51` (z-50), `query-command-dialog.tsx:44,45` (z-50). Header has no explicit z; SidebarInset in `ui/sidebar.tsx:310` has no explicit z. No conflicts today; pilot verification confirms.
**Warning signs:** Popover content appears behind table header when scrolled; tooltip cut off by chart container.

### Pitfall 3: Dark-mode shadow muddiness
**What goes wrong:** Applying light-mode shadow values (warm oklch with ~0.08 opacity) to dark mode makes cards look like they have a greasy halo — shadows don't physically read on near-black surfaces.
**Why it happens:** Ambient occlusion in dark scenes is lower-contrast than bright scenes; the brain interprets soft shadows on black as smudge, not depth.
**How to avoid:** CONTEXT locks this: "dark mode primary signal = lighter surface on darker bg. Shadows reinforce but don't do the heavy lifting — they'd look muddy otherwise." Dark-mode `--shadow-elevation-*` values are hand-tuned (not derived) — darker base color (pure black at higher opacity), or borderline invisible for `elevation-chrome`. Phase 26's `.dark { --shadow-xs: 0 1px 2px 0 oklch(0 0 0 / 0.35); }` is the template — use pure black at higher opacity, not warm-tinted.
**Warning signs:** Dark-mode cards look smudged; can't tell card from background at a glance; edge outlines in DevTools are invisible but somehow the card looks dirty.

### Pitfall 4: Sticky column header elevation without scroll context
**What goes wrong:** Adding `shadow-elevation-overlay` to the sticky table column header (`<thead>`) makes the shadow render ALL THE TIME, even when nothing is scrolled underneath. Reads as a random raised strip.
**Why it happens:** `position: sticky` just pins the element; the shadow is painted unconditionally unless explicitly gated.
**How to avoid:** Use an intersection-observer-backed state class, OR use `data-[stuck]:shadow-elevation-overlay` with an IntersectionObserver wrapper, OR apply the shadow unconditionally but lighter (`shadow-xs`) so it doesn't jar at rest. Pilot-driven. A third option: pure visual gradient inside the sticky thead that fades in on scroll via `@supports (animation-timeline: scroll())` — but that's Phase 30 motion work.
**Warning signs:** User reports "the column header has a weird glowy bar even when I haven't scrolled."

### Pitfall 5: `rounded-lg` vs `rounded-xl` inconsistency
**What goes wrong:** Some containers use `rounded-xl` (12px = `--radius-lg`), some use `rounded-lg` (8px = `--radius-md`). DS-17 calls for consistent surface treatment.
**Why it happens:** Phase 26 registered 3 radius tokens (`--radius-sm: 4px`, `--radius-md: 8px`, `--radius-lg: 12px`), but Tailwind emits utilities `rounded-sm/md/lg` which conflict with Tailwind's default `rounded-lg: 0.5rem (8px)` and `rounded-xl: 0.75rem (12px)`. Current repo mixes `rounded-lg` (kpi-card, popover, curve-tooltip) and `rounded-xl` (shadcn card.tsx, query-command-dialog, kpi-summary-cards skeleton).
**How to avoid:** Phase 28 locks a single radius per semantic elevation level:
- `elevation-chrome` + `elevation-raised` → `rounded-lg` (= `var(--radius-md)` 8px per Phase 26 `@theme` block)
- `elevation-overlay` + `elevation-floating` → `rounded-lg` (same 8px — consistency per DS-17)
- Exception: dialogs/modals (`elevation-floating`) may take `rounded-xl` (12px) for the heavier visual weight — pilot decides
Note: Tailwind v4 `--radius-*` tokens emit `rounded-*` utilities; kpi-card's `rounded-lg` is `var(--radius-md) = 8px` (NOT Tailwind default's 8px rounded-lg), confirming alignment. Phase 26-01 kept `--radius: 0.625rem` as a legacy alias because `ui/sonner.tsx` consumes it — don't remove.
**Warning signs:** Screenshots in RESEARCH / VERIFICATION show mismatched corner radii across containers of the same elevation level.

### Pitfall 6: The `variant="inset"` shadcn Sidebar collision with CONTEXT
**What goes wrong:** `app-sidebar.tsx:34` declares `<Sidebar variant="inset">`. This makes shadcn's `SidebarInset` wrap the main content in `md:rounded-xl md:shadow-sm` (ui/sidebar.tsx:310). But CONTEXT locks "separation mechanism: background differential only. No right-edge shadow, no vertical divider line. Color contrast between sidebar surface and main content surface is the full depth cue."
**Why it happens:** shadcn's `inset` variant solves a different architectural problem (frosted main-content panel with rounded corners inset from the sidebar); CONTEXT wants flat bg-differential.
**How to avoid:** DS-16 plan must decide:
  - **Option A:** Keep `variant="inset"` but edit `ui/sidebar.tsx:310` to drop `md:shadow-sm` and keep only `bg-surface-raised` + `rounded-xl`. Accepts the rounded-corner inset aesthetic.
  - **Option B:** Switch `app-sidebar.tsx:34` to `variant="sidebar"` (or omit variant) and apply `bg-surface-raised` directly to `<main>` in `layout.tsx:44`. Loses the rounded inset look, gains pure bg-differential.
  - **Option C:** Invent a new variant (`variant="inset-flat"`) — over-engineering for one use case.
  Recommend Option B unless visual testing shows Option A reads cleaner.
**Warning signs:** Sidebar + content feels like "one big paneled area" instead of "content floating on chrome rail" per CONTEXT's inverted metaphor.

### Pitfall 7: Header is `surface-raised` AND content is `surface-raised` — no separation
**What goes wrong:** Per CONTEXT, content = `surface-raised`. Header already shipped at `surface-raised` (26-03). Two adjacent `surface-raised` regions read as one unbroken plate.
**Why it happens:** CONTEXT flags this as "Claude's Discretion — how header + sidebar + content interact given sidebar = base and content = raised. Pilot-driven."
**How to avoid:** Options for the header:
  - Keep header `surface-raised` + `surface-translucent` backdrop-blur so it visually separates via transparency/blur even when bg color matches content.
  - Promote header to a distinct surface (re-introduce a `surface-chrome` or shift to `surface-overlay`-tier base color) — but that contradicts CONTEXT's intent of keeping header lightweight.
  - Use `elevation-chrome`'s rim highlight (`inset 0 1px 0 0 oklch(1 0 0 / 0.06)`) as the only visual boundary.
  Recommend: translucent variant + rim highlight does the separation work. Verify in pilot (Plan 28-02).
**Warning signs:** Visual test shows header blends into content area seamlessly in dark mode (where color differential is smaller).

## Code Examples

### Example 1: Adding the four elevation tokens + translucent variant

```css
/* Source: extension of existing globals.css:33-100 @theme block + :root / .dark blocks */
/* Pattern: Phase 26-01 additive token pattern */

@theme {
  /* ...existing spacing/type/shadow tokens... */

  /* === SEMANTIC ELEVATION === (DS-11, DS-15) Phase 28
     3-layer compounds: key (directional) + ambient (soft halo) + rim (top highlight).
     Light-mode values. Dark-mode overrides live in .dark block. */
  --shadow-elevation-chrome:
    0 1px 2px 0 oklch(0.2 0.015 70 / 0.04),
    0 2px 8px -2px oklch(0.2 0.015 70 / 0.05),
    inset 0 1px 0 0 oklch(1 0 0 / 0.06);
  --shadow-elevation-raised:
    0 1px 2px 0 oklch(0.2 0.015 70 / 0.06),
    0 4px 12px -2px oklch(0.2 0.015 70 / 0.08),
    inset 0 1px 0 0 oklch(1 0 0 / 0.08);
  --shadow-elevation-overlay:
    0 2px 4px 0 oklch(0.2 0.015 70 / 0.08),
    0 8px 24px -4px oklch(0.2 0.015 70 / 0.12),
    inset 0 1px 0 0 oklch(1 0 0 / 0.10);
  --shadow-elevation-floating:
    0 4px 8px 0 oklch(0.2 0.015 70 / 0.10),
    0 16px 40px -8px oklch(0.2 0.015 70 / 0.16),
    inset 0 1px 0 0 oklch(1 0 0 / 0.12);
}

@theme inline {
  /* Translucent surface alias — header-only consumer per CONTEXT */
  --color-surface-translucent: var(--surface-translucent);
}

:root {
  /* ...existing surface tokens... */
  --surface-translucent: color-mix(in oklch, var(--surface-raised) 80%, transparent);
}

.dark {
  /* Re-tinted for dark — shadows carry LESS weight; surface-color inversion does the lifting */
  --shadow-elevation-chrome:
    0 1px 2px 0 oklch(0 0 0 / 0.30),
    0 2px 8px -2px oklch(0 0 0 / 0.25),
    inset 0 1px 0 0 oklch(1 0 0 / 0.04);
  --shadow-elevation-raised:
    0 1px 2px 0 oklch(0 0 0 / 0.40),
    0 4px 12px -2px oklch(0 0 0 / 0.30),
    inset 0 1px 0 0 oklch(1 0 0 / 0.05);
  --shadow-elevation-overlay:
    0 2px 4px 0 oklch(0 0 0 / 0.45),
    0 8px 24px -4px oklch(0 0 0 / 0.40),
    inset 0 1px 0 0 oklch(1 0 0 / 0.06);
  --shadow-elevation-floating:
    0 4px 8px 0 oklch(0 0 0 / 0.50),
    0 16px 40px -8px oklch(0 0 0 / 0.50),
    inset 0 1px 0 0 oklch(1 0 0 / 0.08);

  --surface-translucent: color-mix(in oklch, var(--surface-raised) 82%, transparent);
}
```

(Exact opacities are Claude's Discretion per CONTEXT; these are a starting recipe.)

### Example 2: Header translucent upgrade (DS-11, Plan 28-02 target)

```tsx
// Source: src/components/layout/header.tsx:32 current → Phase 28 target
// CURRENT:
<header className="flex h-10 shrink-0 items-center gap-inline bg-surface-raised shadow-xs px-page-gutter">

// PHASE 28:
<header className="flex h-10 shrink-0 items-center gap-inline bg-surface-translucent backdrop-blur-md shadow-elevation-chrome px-page-gutter sticky top-0 z-20">
```

Notes:
- Add `sticky top-0 z-20` if not already provided by parent (confirm via `layout.tsx:42-47` — currently `<SidebarInset>` wraps `<Header />` without sticky; may need to add here or at layout).
- `backdrop-blur-md` is a Tailwind v4 built-in; no new token needed for blur radius.
- `z-20` chosen to sit above content but below popovers (`z-50`).

### Example 3: KPI card retune (DS-12, Plan 28-03 target)

```tsx
// Source: src/components/kpi/kpi-card.tsx:48 current → Phase 28 target
// CURRENT:
const cardClasses =
  'rounded-lg border border-border bg-surface-raised p-card-padding shadow-sm transition-colors duration-quick ease-default';

// PHASE 28 (drop border — rim highlight in elevation-raised carries the edge):
const cardClasses =
  'rounded-lg bg-surface-raised p-card-padding shadow-elevation-raised transition-colors duration-quick ease-default';
```

Decision: keep `transition-colors duration-quick ease-default` — Phase 30 will add a `hover:shadow-elevation-overlay` transition on top. Phase 28 defines the rest state only.

### Example 4: Popover shadcn primitive override (DS-15, Plan 28-06 target)

```tsx
// Source: src/components/ui/popover.tsx:40 current → Phase 28 target
// CURRENT:
<PopoverPrimitive.Popup
  className={cn(
    "z-50 flex w-72 origin-(--transform-origin) flex-col gap-2.5 rounded-lg bg-popover p-2.5 text-sm text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-hidden duration-100 ...animations...",
    className
  )}
/>

// PHASE 28:
<PopoverPrimitive.Popup
  className={cn(
    "z-50 flex w-72 origin-(--transform-origin) flex-col gap-2.5 rounded-lg bg-surface-overlay p-2.5 text-sm text-popover-foreground shadow-elevation-overlay outline-hidden duration-100 ...animations...",
    className
  )}
/>
```

Changes:
- `bg-popover` → `bg-surface-overlay` (visually identical — `--popover: var(--surface-overlay)` — but legible at call site).
- `shadow-md` → `shadow-elevation-overlay`.
- Drop `ring-1 ring-foreground/10` — the rim highlight layer inside `elevation-overlay` replaces it.

Same pattern for `ui/sheet.tsx`, `ui/card.tsx`, Recharts tooltip shell in `ui/chart.tsx:194`.

### Example 5: Chart shell wrapping (DS-14, Plan 28-05 target)

```tsx
// Source: new pattern for src/components/charts/collection-curve-chart.tsx and siblings
// Wrap existing chart content with a semantic-elevation shell:

<div className="rounded-lg bg-surface-raised shadow-elevation-raised p-card-padding">
  {/* existing CollectionCurveChart content stays untouched */}
  <ChartContainer config={config} className="h-[40vh] w-full">
    <LineChart data={data}>...</LineChart>
  </ChartContainer>
</div>
```

### Example 6: Sidebar three-surface reconciliation (DS-16, Plan 28-07 target — Option B recommended)

```tsx
// Source: src/app/layout.tsx:42-47 + src/components/layout/app-sidebar.tsx:34 + src/components/ui/sidebar.tsx:310

// OPTION B (RECOMMENDED — pure bg-differential):
// 1. app-sidebar.tsx:34 → drop variant="inset":
<Sidebar collapsible="icon">

// 2. ui/sidebar.tsx:210 (Sidebar default, not floating/inset branch) already uses bg-sidebar
//    which Phase 26 mapped to var(--surface-base). No change needed.

// 3. layout.tsx:44 → apply surface-raised to main:
<SidebarInset>
  <Header />
  <main className="flex-1 overflow-x-hidden p-2 md:p-3 bg-surface-raised">
    {children}
  </main>
</SidebarInset>

// 4. ui/sidebar.tsx:310 SidebarInset → remove inset-specific m-2/rounded-xl/shadow-sm (unused after Option B):
// Accept default empty className; SidebarInset becomes a pass-through main wrapper.
```

Verify Option B with pilot: sidebar visually distinct from content via warm-paper vs. paper-white contrast (light) and warm-near-black vs. lighter-warm-dark (dark).

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| shadcn-v3 Radix primitives | shadcn-v4 `@base-ui/react` primitives | shadcn v4 release (2025) | Override patterns via `className + cn()` are the same conceptually, but Base UI's `data-slot` / `data-side=*` attribute conventions differ subtly from Radix. Repo is already fully on Base UI. |
| Tailwind v3 `theme()` config in `tailwind.config.js` | Tailwind v4 `@theme` block in CSS with namespace-driven utility emission | Tailwind v4 release (2025) | No JS config file; tokens ARE the theme; `--shadow-elevation-*` auto-emits `shadow-elevation-*` utilities. |
| Per-component opacity-tinted border (`border/50`) for elevation signaling | Multi-layer box-shadow with rim highlight | Linear/Notion-era "physical-object" shadow idiom (2023+) | Rim highlight (`inset 0 1px 0 0 white/6%`) is the modern "top edge catches light" cue; replaces the old `border/50` soft-edge hack. |
| Single-layer `box-shadow: 0 2px 4px rgba(0,0,0,0.1)` | 2-3 layer compound (key + ambient + optional rim) | ~2020 | Already baked into Phase 26's raw `--shadow-sm/md/lg`; Phase 28's semantic layer adds a 3rd rim layer. |
| Hand-rolled `backdrop-filter: blur()` classes | `backdrop-blur-*` Tailwind utility + `color-mix(in oklch, surface 80%, transparent)` | Tailwind v3.3+ (backdrop utilities); v4 `color-mix` support | Fully supported in modern Chromium + WebKit + Firefox; no polyfill concern for v4.0 users. |

**Deprecated/outdated:**
- **`bg-card` / `bg-popover` in new code** — these still work (Phase 26 re-mapped them to `var(--surface-raised)` / `var(--surface-overlay)`) but new code should prefer the semantic surface token directly (`bg-surface-raised`) for legibility.
- **`ring-1 ring-foreground/10` as surface-edge cue** — superseded by `elevation-*` rim highlight layer. Can be dropped from shadcn primitives when swapping to semantic elevation.
- **`backdrop-blur-sm` on `trajectory-tooltip.tsx:39`** — translucent popovers are explicitly OUT of scope per CONTEXT (header-only). Migrate to opaque `surface-overlay`.

## Open Questions

1. **Does the sidebar need to leave `variant="inset"` entirely (Option B), or can `variant="inset"` be edited in `ui/sidebar.tsx:310` to drop `md:shadow-sm` while keeping the rounded-corner aesthetic (Option A)?**
   - What we know: CONTEXT locks bg-differential-only; current SidebarInset applies `md:rounded-xl md:shadow-sm`. Both options satisfy "no shadow-driven depth," but Option A preserves the rounded-corner visual that Option B loses.
   - What's unclear: does the rounded-corner inset aesthetic conflict with CONTEXT's "content floats on chrome rail" metaphor?
   - Recommendation: Plan 28-07 pilots BOTH options in light + dark mode, user picks. Lean Option B based on CONTEXT language ("content is the focus, sidebar is the ground" — flat bg reads more like "ground").

2. **Should the `Tooltip` primitive (`ui/tooltip.tsx:53`) normalize to `surface-overlay` + `elevation-overlay`, or keep its current inverted `bg-foreground text-background` affordance?**
   - What we know: Tooltip is currently a distinct pattern — solid dark pill in light mode, light pill in dark mode, used for dense hover hints on KPI cards and sidebar menu items.
   - What's unclear: CONTEXT doesn't call out tooltip specifically. Lumping it into `surface-overlay` would remove the visual distinction from popovers; keeping inverted preserves the affordance but fragments the "all overlays use surface-overlay" story.
   - Recommendation: Keep inverted. Affordance > uniformity here.

3. **Does `elevation-chrome-hover` need to be a distinct named token, or is `elevation-raised` the hover target for chrome-level surfaces?**
   - What we know: CONTEXT flags this as Claude's Discretion. Chrome rest state is `elevation-chrome`; hover state lifts one notch.
   - What's unclear: if the lift is exactly `elevation-raised`, no new token is needed; the hover utility is simply `hover:shadow-elevation-raised`. If it needs an intermediate level, a fifth elevation token is required.
   - Recommendation: Start with 4-level catalog; use `hover:shadow-elevation-raised` as the chrome-hover target. Add a 5th level only if pilot shows the gap is too large visually.

4. **Should the `Card` shadcn primitive (`ui/card.tsx`) be migrated at all, given that the app uses `KpiCard` (a custom component) instead of `Card` as the primary card in the UI?**
   - What we know: Searching for `<Card`-import in `src/components/` (excluding `ui/`) would confirm usage. `query-response.tsx` uses `bg-card` inline not `<Card>`; `kpi-card.tsx` is custom.
   - What's unclear: actual `<Card>` consumers.
   - Recommendation: Plan 28-05 or 28-08 greps for `<Card|from.*ui/card` usage; if zero, `ui/card.tsx` update is still worthwhile for consistency (primitives should match the system) but is lower priority. If non-zero, migrate in the appropriate plan.

5. **Does the `anomaly-summary-panel.tsx:41` hardcoded `amber-200/50 dark:amber-800/950` palette migrate to state-color tokens (`bg-warning-bg border-warning-border`) as part of Phase 28, or is it deferred to a state-color consolidation pass?**
   - What we know: Phase 26-03 explicitly deferred amber stale-state colors in `header.tsx` as "state-color migration is cross-cutting work owned by a later dedicated phase." Then Phase 27 / commit eec44ca migrated them anyway when a typography sweep passed through.
   - What's unclear: scope discipline. Phase 28 is a SURFACE sweep, not a state-color sweep. But `anomaly-summary-panel`'s container IS a surface using a palette color.
   - Recommendation: Migrate opportunistically (like 27-03 Pitfall 4 pattern — "when a surface sweep touches a file with a pending state-color todo, fold it in"). Flag in the plan's Deviations section.

## Sources

### Primary (HIGH confidence)
- `src/app/globals.css:1-539` — Full Phase 26 token system, existing `--shadow-*` multi-layer definitions, `@theme inline` surface aliases, `:root` / `.dark` per-mode values. Authoritative for every claim about existing tokens.
- `src/components/ui/{popover,sheet,tooltip,card,sidebar,chart,button,input,switch,checkbox}.tsx` — shadcn primitives in-repo; every override target + conflict cited is verified from these files.
- `src/components/{kpi/kpi-card,layout/header,table/data-table}.tsx` — verified Phase 26 pilot consumers; current classes cited line-by-line.
- `.planning/phases/26-design-tokens/{26-RESEARCH,26-VERIFICATION}.md` + `26-01..05-SUMMARY.md` — Phase 26 token system and pilot execution history. Authoritative for token semantics and sweep-pattern precedent.
- `.planning/phases/27-typography-and-information-hierarchy/27-06-PLAN.md` — Phase 27 enforcement-guard pattern (`scripts/check-type-tokens.sh`). Directly reusable for Phase 28's `check-surfaces.sh`.
- `.planning/phases/28-surfaces-and-elevation/28-CONTEXT.md` — locked decisions for this phase.
- `package.json` — confirms `@base-ui/react: ^1.3.0`, `tailwindcss: ^4`, `shadcn: ^4.2.0`, `tailwind-merge: ^3.5.0`, `next: 16.2.3`, `next-themes: ^0.4.6`. No new dependencies needed.

### Secondary (MEDIUM confidence)
- Phase 26-05 `/tokens` reference page pattern (unlisted, robots noindex, tabbed browser) — precedent for Phase 28 elevation demo section placement.
- `.planning/STATE.md` decisions `[Phase 26-03]` through `[Phase 27-06]` — repeatedly flag semantic-over-raw discipline, sweep cadence, grep-over-ESLint-rule choice, `/tokens` dogfooding pattern.

### Tertiary (LOW confidence)
- None. This research did not rely on WebSearch — all claims are grounded in the local repo and existing planning docs.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — pinned versions in package.json, primitives read directly from source
- Architecture patterns: HIGH — patterns are direct continuations of Phase 26 + 27 shipped work
- Sweep inventory: HIGH — grep output over `src/` enumerated every relevant container
- Pitfalls: HIGH for 1-6 (repo-grounded), MEDIUM for 7 (visual-test-pending pilot decision)
- Token design (exact opacities): MEDIUM — CONTEXT explicitly assigns opacity tuning to Claude's Discretion + pilot verification

**Research date:** 2026-04-17
**Valid until:** ~2026-05-17 (30 days — stable stack, no active shadcn/Base UI/Tailwind breaking releases anticipated in window)
