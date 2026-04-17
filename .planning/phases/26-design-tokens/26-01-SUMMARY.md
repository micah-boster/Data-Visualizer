---
phase: 26-design-tokens
plan: 01
subsystem: ui
tags: [tailwind-v4, design-tokens, oklch, next-font, inter, jetbrains-mono, shadcn, dark-mode]

# Dependency graph
requires:
  - phase: 25-code-health
    provides: clean baseline globals.css + no outstanding shadcn regressions
provides:
  - Full Tailwind v4 token namespace coverage — spacing, typography, shadow, motion, radius, neutral, surface, accent, state, interaction, chart — defined in `@theme` and `@theme inline`
  - Warm-paper OKLCH light theme + warm near-black dark theme with surface-raised LIGHTER than surface-base in dark (intentional inversion of shadcn convention, per CONTEXT lock)
  - shadcn variable re-map (background/card/popover/primary/border/ring/sidebar/chart-1..8 etc.) pointing at new surface & neutral tokens so every existing shadcn consumer keeps rendering
  - Font swap: Geist → Inter (sans) + JetBrains Mono (mono), loaded via `next/font/google` with `--font-inter` / `--font-jetbrains-mono` CSS variables retargeted into `--font-sans` / `--font-mono` via `@theme inline`
  - Density row-height tokens (`--table-row-height-dense` 32px, `--table-row-height-sparse` 40px) defined as raw tokens ready for plan 04
affects: [26-02 KPI card pilot, 26-03 header pilot, 26-04 table row pilot, 26-05 /tokens reference page, 27-typography, 28-surfaces, 29-component-patterns, 30-motion, 31-visual-polish]

# Tech tracking
tech-stack:
  added: [Inter (next/font/google), JetBrains_Mono (next/font/google)]
  patterns:
    - "@theme primitives + @theme inline semantic aliases — primitives live at root, aliases reference them so theme-varying surfaces work"
    - "Theme-varying colors defined as raw vars in :root/.dark, exposed to Tailwind via @theme inline color aliases (color-mix + var indirection)"
    - "shadcn re-map (not rename) — --background/--card/--popover/etc. keys preserved but point at new surface tokens so bg-background, bg-card, etc. utilities keep resolving"
    - "Namespace-driven naming — --spacing-*, --ease-*, --duration-*, --text-*, --shadow-*, --radius-*, --color-* chosen to let Tailwind v4 auto-emit utilities"
    - "Warm paper light / warm near-black dark with intentional raised>base inversion in dark mode (CONTEXT-locked)"

key-files:
  created: []
  modified:
    - src/app/globals.css (+379 / -85) — full token system
    - src/app/layout.tsx (+8 / -6) — Inter + JetBrains Mono loaders

key-decisions:
  - "Renamed namespaces per Tailwind v4 contract: --spacing-* (not --space-*) and --ease-* (not --easing-*) so utilities auto-emit. Semantic aliases (--spacing-inline/stack/section/card-padding/page-gutter, --ease-default/spring/decelerate) reference the numeric scale."
  - "Dark-mode surface-raised (0.22) is LIGHTER than surface-base (0.16) with surface-inset (0.12) darker still — inverts shadcn's conventional raised-is-darker pattern per CONTEXT lock. Verified via build emitting the layered ladder."
  - "shadcn vars re-mapped in place (--background → var(--surface-base), --card → var(--surface-raised), --popover → var(--surface-overlay), --primary → var(--accent-warm), --border → color-mix(in oklch, var(--neutral-500) 15%, transparent), --chart-1..8 → var(--chart-categorical-1..8)) in both :root and .dark blocks so existing utilities keep working without touching consumers."
  - "Font loaders use display: 'swap' for perceived-perf; `@theme inline` retargets --font-sans: var(--font-inter) and --font-mono: var(--font-jetbrains-mono) so font-sans / font-mono utilities downstream need zero edits."
  - "Multi-layer shadows with warm-tinted light mode (oklch 0.2 0.015 70 / alpha) and darker tinted dark mode (oklch 0 0 0 / alpha) — each size layers a tight inner and a wider soft blur for proper depth."
  - "Preview screenshots could not be captured (Snowflake auth timeouts block headless preview). User verified light + dark visually in their own browser and explicitly approved the checkpoint."

patterns-established:
  - "Pattern: primitives in @theme + aliases in @theme inline — reuse for all future semantic token additions"
  - "Pattern: theme-varying surfaces defined as raw vars in :root/.dark, exposed via @theme inline aliases — reuse for every surface/state/interaction token"
  - "Pattern: shadcn compatibility via re-map, never rename — preserves the contract with every existing ui/ component"
  - "Pattern: next/font variable retarget via @theme inline — `--font-sans: var(--font-inter)` means font swaps never require touching consumers"

requirements-completed: [DS-01, DS-02, DS-03, DS-04, DS-05, DS-06]

# Metrics
duration: ~55min
completed: 2026-04-17
---

# Phase 26 Plan 01: Design Token Foundation Summary

**Full Tailwind v4 token system (spacing/type/shadow/motion/radius/neutral/surface/accent/state/chart) in warm OKLCH, shadcn vars re-mapped onto surface tokens, fonts swapped to Inter + JetBrains Mono with dark-mode surface-raised intentionally lighter than base.**

## Performance

- **Duration:** ~55 min
- **Started:** 2026-04-16T23:10Z (approx — pre-checkpoint execution)
- **Completed:** 2026-04-17 (post-approval finalization)
- **Tasks:** 3 (2 auto + 1 checkpoint:human-verify)
- **Files modified:** 2

## Accomplishments

- Extended `src/app/globals.css` from ~85 token lines to a full token system (~380 lines added) covering all six DS-01..DS-06 requirement categories
- Established warm-paper OKLCH palette (light: cream/paper-white surfaces, hue ~85; dark: warm near-black, hue ~60 with brown undertone) — intentional inversion in dark mode where surface-raised sits between inset (darkest) and base
- Re-mapped every shadcn surface variable onto the new `--surface-*` / `--neutral-*` tokens inside both `:root` and `.dark` blocks so existing shadcn-driven UI (sidebar, cards, popovers, buttons, table) continues to render with zero consumer edits
- Swapped fonts Geist → Inter + JetBrains Mono via `next/font/google`, with `@theme inline` retargeting `--font-sans` and `--font-mono` so downstream `font-sans` / `font-mono` utilities automatically pick up the new faces
- Density pair tokens (`--table-row-height-dense` 32px, `--table-row-height-sparse` 40px) pre-staged as raw tokens for plan 04 (table row pilot) to consume
- Build passes cleanly; user approved visual verification of light + dark modes after inspecting in own browser (preview tool blocked by Snowflake auth timeouts)

## Task Commits

Each task was committed atomically:

1. **Task 1: Define full token system in globals.css** — `4ef2c69` (feat)
2. **Task 2: Swap Geist → Inter + JetBrains Mono in layout.tsx** — `151dff7` (feat)
3. **Task 3: Human verify — light + dark mode render correctly** — APPROVED (checkpoint; no code commit)

**Plan metadata:** docs commit for SUMMARY + STATE + ROADMAP + REQUIREMENTS (this finalization).

## Files Created/Modified

- `src/app/globals.css` — Full token system: @theme primitives (spacing-1..12, text-display/heading/title/body/label/caption with line-height & weight, shadow-xs/sm/md/lg multi-layer, duration-quick/normal/slow, ease-default/spring/decelerate, radius-sm/md/lg, density row-heights), @theme inline semantic aliases (spacing-inline/stack/section/card-padding/page-gutter, color-surface-base/raised/inset/overlay/floating, color-neutral-50..950, color-accent-warm, color-success/warning/error/info -bg/border/fg, color-focus-ring/selection-bg/hover-bg, color-chart-categorical-1..8, chart-diverging-neg/neu/pos, font-sans/mono/heading retarget), `:root` warm-paper raw values + shadcn re-map, `.dark` warm near-black raw values with raised>base inversion + shadcn re-map
- `src/app/layout.tsx` — Replaced `Geist` / `Geist_Mono` imports and loader calls with `Inter` + `JetBrains_Mono` using `--font-inter` / `--font-jetbrains-mono` variable names and `display: 'swap'`; updated html/body className references accordingly

## Decisions Made

- Used Tailwind v4 namespace naming (--spacing-*, --ease-*) instead of stylistic names (--space-*, --easing-*) so utilities auto-emit. Trade-off: CONTEXT referenced `--space-*` informally; plan's NOTE comment block in globals.css explains the namespace-driven rationale.
- Kept `--radius: 0.625rem` alongside new `--radius-sm/md/lg` as a legacy alias so shadcn primitives referencing `var(--radius)` keep working (verified via grep before writing).
- Shadow color tints: warm brown-tint in light (oklch 0.2 0.015 70 / alpha), cold near-black in dark (oklch 0 0 0 / alpha) — deeper shadows scale alpha not radius alone.
- Used `display: 'swap'` on both font loaders for perceived-performance during cold loads.
- Cell heatmap tokens (`--cell-zero`, `--cell-tint-low`, `--cell-tint-high`) re-mapped onto the chart diverging palette instead of independent tuning, so heatmap cells inherit palette consistency without a separate knob.

## Deviations from Plan

None — plan executed exactly as written. No deviation rules triggered.

The only notable flow-deviation: the Task 3 checkpoint's how-to-verify script called for `preview_screenshot` of light + dark modes, but the headless preview browser could not complete the auth flow due to Snowflake query timeouts (environment-level constraint, not a plan defect). User performed the visual verification in their own browser and provided approval, matching their standing preference to verify CSS changes visually before pushing.

## Issues Encountered

- Headless preview unreachable for screenshot capture (Snowflake auth / long-running query timeouts on the preview runner). Worked around by user verifying in local browser and providing explicit approval. No code or token changes resulted from this.

## User Setup Required

None — no external service configuration needed. The new fonts load at build time via `next/font/google`.

## Next Phase Readiness

- Token foundation complete and verified in both modes; Wave 2 pilots (26-02 KPI card, 26-03 Header, 26-04 Table row) can now consume `--color-surface-raised`, `--text-*`, `--spacing-*`, `--shadow-*`, `--radius-*`, density tokens etc. without further token work.
- `--color-accent-warm` is live and already driving `--primary` / `--ring`; pilots should lean on it for focus treatments and brand moments.
- Density tokens pre-staged for plan 04 — table row pilot can ship data-density-attr scoping there without touching globals.css again.
- No regressions in existing shadcn consumers confirmed visually by user.

## Self-Check: PASSED

- SUMMARY file: FOUND: .planning/phases/26-design-tokens/26-01-SUMMARY.md
- Commit 4ef2c69 (Task 1): FOUND
- Commit 151dff7 (Task 2): FOUND
- Requirements DS-01..DS-06: foundation present in globals.css (spacing/type/shadow/motion/surface/both-modes)
- Both modes verified: user-approved in own browser after Snowflake-preview workaround

---
*Phase: 26-design-tokens*
*Plan: 26-01*
*Completed: 2026-04-17*
