# Phase 26: Design Tokens - Context

**Gathered:** 2026-04-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Establish the foundational design token system — spacing, typography, elevation, motion, surfaces, and semantic colors — as CSS custom properties integrated with Tailwind v4, consumed by every future component. Scope includes defining all tokens and piloting 2-3 components (KPI card, header, table row) to validate the system end-to-end. Broad application across the app is the job of Phases 27-31.

</domain>

<decisions>
## Implementation Decisions

### Visual reference & feel
- **Aesthetic anchor:** Linear — quiet, dense, data-first. Motion/decoration never announces itself.
- **Density:** Dense is the default across the app. Tokens MUST also define a **sparse variant** for column/row-level density (tables especially). Structured as component-level density variants (e.g., `--table-row-height-dense` + `--table-row-height-sparse`).
- **Warmth:** Warm paper — light mode uses cream/beige-tinted neutrals; dark mode uses warm dark (near-black with brown undertone).
- **Personality:** Subtle character — colored focus rings using warm accent, gentle gradient dividers (DS-29), one warm accent color used sparingly. Mostly quiet; personality lives in small distinctive touches.

### Scale values & granularity
- **Spacing:** Hybrid — numeric scale `--space-1..12` (4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96px) as the source of truth, with semantic aliases layered on top: `--space-inline`, `--space-stack`, `--space-section`, `--space-card-padding`, `--space-page-gutter`.
- **Typography ramp:** 6-level tight (Linear-ish): display 24px / heading 18px / title 15px / label 12px (uppercase, tracked) / body 14px / caption 12px.
- **Font families:** Inter for UI + JetBrains Mono (or equivalent mono) for tabular/code. Claude may propose equivalents if there's a reason (e.g., Geist) but defaults to Inter + JetBrains Mono.
- **Shadows:** Subtle multi-layer (Linear-style) — two-layer shadows (tight hard edge + wider soft blur). `shadow-xs` barely visible through `shadow-lg` still soft. Shadow color/tint tuned to warm paper.
- **Border radius:** 3 steps — `radius-sm` 4px (inputs, small buttons), `radius-md` 8px (cards, popovers), `radius-lg` 12px (modals, large panels).
- **Numeric type tokens:** Dedicated `body-numeric` / `label-numeric` variants with `font-variant-numeric: tabular-nums lining-nums` baked in — used wherever numbers appear (tables, KPI values, chart axes).

### Motion personality
- **Overall:** Between Linear-quick and warm-springy — occasional character allowed, but never annoying. Most motion invisible; tactile feedback where it earns its place.
- **Duration tokens:** `duration-quick` 120ms / `duration-normal` 200ms / `duration-slow` 320ms.
- **Easing tokens:** Three curves — `easing-default` (cubic-bezier(0.4, 0, 0.2, 1)) for most UI, `easing-spring` (cubic-bezier(0.34, 1.56, 0.64, 1), mild overshoot) for tactile feedback like card hover/press, `easing-decelerate` (cubic-bezier(0, 0, 0.2, 1)) for entrances (drill-down, skeleton-to-content).
- **Where motion lives:** Motion on containers (cards, panels, drill transitions, modals). **Silence on data** — numbers, values, and table cells snap into place. Never tween KPI values or data points.

### Surface system philosophy
- **Distinguishing cue:** Background shift + subtle shadow. Color-led hierarchy (not border-heavy). Borders used only where needed.
- **Depth strength:** Subtle but perceivable — you can tell the difference on inspection, but nothing screams.
- **Dark mode approach:** Warm dark with **lighter raised surfaces** (raised surfaces are LIGHTER than base in dark mode; inset darker still). Warmth preserved in dark mode.
- **Surface map (feeds Phase 28):**
  - `surface-base` → page background, sidebar
  - `surface-raised` → KPI cards, chart containers, header
  - `surface-inset` → table area
  - `surface-overlay` → popovers, dropdowns
  - `surface-floating` → modals, toasts
  - Sidebar is `surface-base` with a subtle right-edge treatment for separation.

### Implementation approach
- **Mechanism:** Tailwind v4 `@theme` block + CSS custom properties. Tailwind auto-generates utilities (e.g., `bg-surface-raised`, `text-display`), and the same values are exposed as `var(--surface-raised)` for direct CSS use. Verify current Tailwind version during research.
- **File layout:** Single `tokens.css` (location TBD during research — likely `src/styles/tokens.css` or integrated into `globals.css`) with clearly commented sections: `/* Spacing */`, `/* Typography */`, `/* Shadows */`, `/* Radius */`, `/* Motion */`, `/* Surfaces */`, `/* Colors */`.
- **Enforcement:** Strict by convention during Phase 26 — "no ad-hoc spacing/color/shadow values in new code." Enforced via code review. ESLint rule deferred to a later phase if drift becomes a problem.
- **shadcn integration:** Extend, don't replace. Existing shadcn CSS variables (`--background`, `--foreground`, etc.) continue to work for shadcn components. New tokens live alongside; where overlap exists, shadcn vars are re-mapped to reference the new surface/color tokens (e.g., `--background: var(--surface-base)`). Zero breakage for existing components.

### Semantic color tokens
- **State colors:** Full set — `success` / `warning` / `error` / `info`, each with `-bg`, `-border`, and `-fg` variants. Covers anomaly badges, toasts, validation messages.
- **Interaction tokens:** Dedicated — `--focus-ring` (uses warm accent), `--selection-bg` (subtle accent tint), `--hover-bg` (neutral tint), `--hover-elevation` (shadow bump).
- **Accent:** Single warm accent (amber/ochre/terracotta family, complementary to warm paper) used for focus, selection, primary actions. Specific hue is Claude's Discretion — must not fight chart palette.
- **Chart colors:** In scope. Define `--chart-categorical-1..8` (qualitative comparisons like partner series) and a `--chart-diverging` palette (heatmap/anomaly red↔green↔neutral). Living here ensures dark-mode adaptation.
- **Neutral scale:** Full 11-step scale `--neutral-50..950` with a warm undertone (stone/khaki-adjacent, not cool slate). Borders, muted text, and shadcn tokens all pull from this scale.

### Migration strategy
- **Scope:** Phase 26 defines all tokens AND pilots 2-3 components to validate the system end-to-end.
- **Pilot components:** KPI card (surface-raised, new type scale), header (shadow + density), table row (inset + dense/sparse variants). These prove tokens work before Phase 27/28 commit to them.
- **Rollout state:** Pilot components fully converted to tokens; everything else stays on current hardcoded Tailwind values. Clear before/after contrast.
- **Visual regression:** Manual browser verification using `preview_screenshot` + `preview_inspect` in both light and dark mode before/after the pilot migrations. Screenshots attached to plan verification.

### Token discoverability
- **Reference page:** In-app `/tokens` route that renders every token — swatches, spacing ruler, type specimens, shadow samples, motion demos. Dogfoods the token system.
- **Structure:** Tabbed by category — Spacing / Typography / Surfaces / Motion / Colors. Each token shows: live example + token name + CSS var + Tailwind class + copy-to-clipboard.
- **Access:** Always accessible in production, unlisted route (no nav link). No auth gate. Useful for bookmarking and showing the system off on Vercel deploys.

### Claude's Discretion
- Exact hue/HSL of the warm accent (must complement warm paper + not clash with chart palette).
- Specific shadow blur radii, opacities, and tint values for multi-layer shadows in both modes.
- Exact HSL/OKLCH values for the 11-step warm neutral scale in light + dark.
- Exact chart categorical palette hues (8 distinguishable colors that work in both modes).
- Specific semantic alias mapping (which numeric step each semantic alias points to).
- Mono font choice if a better alternative to JetBrains Mono exists (Geist Mono, IBM Plex Mono, etc.).
- `/tokens` page interaction details (copy feedback, layout within tabs, responsive behavior).
- Letter-spacing values for the label tier (uppercase + tracked).
- How shadcn color variables are specifically re-mapped onto new surface tokens.

</decisions>

<specifics>
## Specific Ideas

- **Linear** as the aesthetic anchor — "quiet, dense, information-first."
- **Warm paper** feel — cream/beige in light mode, warm dark with brown undertone in dark mode.
- Fonts: **Inter** (UI) + **JetBrains Mono** (tabular/code) as the starting point.
- Motion guidance: "Some occasional character is great but I don't want it to be annoying" — hence mild spring (1.56 overshoot, not 2+), short durations (120/200/320).
- Density: Dense default, sparse option specifically for columns/rows (tables are the primary sparse-mode target).
- shadcn coexistence is non-negotiable — extending, not replacing.
- `/tokens` page is also for **the user** — Micah wants to be able to browse and bookmark it, not just devs.

</specifics>

<deferred>
## Deferred Ideas

- **ESLint rule** enforcing token usage in new code — deferred. Revisit once drift patterns emerge across Phases 27-31.
- **Visual regression tooling** (Playwright/Percy snapshots) — separate phase. Manual screenshot comparison is sufficient for Phase 26.
- **Density toggle UI control** (the user-facing switch that flips dense ↔ sparse) — Phase 26 defines only the token variants needed. The toggle control itself belongs in a later phase (Phase 29 Component Patterns or standalone).
- **Broad migration** of remaining ~78 components to type/surface tokens — Phase 27 (Typography & Hierarchy) and Phase 28 (Surfaces & Elevation) own that work.
- **Storybook** as an additional discoverability surface — not worth the dep; `/tokens` route covers it.
- **Token naming refactor of shadcn variables** (replacing `--background` etc. with our names) — keeping shadcn intact. Re-addressable in a future cleanup phase if ever needed.

</deferred>

---

*Phase: 26-design-tokens*
*Context gathered: 2026-04-16*
