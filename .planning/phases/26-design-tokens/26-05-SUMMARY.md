---
phase: 26-design-tokens
plan: 05
subsystem: ui
tags: [design-tokens, reference-page, tabs, base-ui, app-router, copy-to-clipboard, sonner, documentation]

# Dependency graph
requires:
  - phase: 26-01
    provides: Full Phase 26 token system (spacing, typography, surfaces, shadows, motion, radius, colors, state, neutrals, chart) in globals.css
  - phase: 26-02
    provides: Proven semantic-token consumption pattern (surface-raised + shadow-sm + text-* tokens in kpi-card)
  - phase: 26-03
    provides: Proven persistent-chrome token recipe (surface-raised + shadow-xs + px-page-gutter)
  - phase: 26-04
    provides: Proven density-variant pattern (data-density attribute + scoped CSS vars) on table rows
provides:
  - Unlisted /tokens reference route (robots.index = false) — direct URL access only, no nav link
  - TokenBrowser tabbed browser covering every Phase 26 token category in exactly 5 tabs (Spacing / Typography / Surfaces & Shadows / Motion / Colors)
  - Reusable TokenCard primitive rendering live example + CSS var + Tailwind class + copy-to-clipboard (Copy↔Check icon swap, sonner toast)
  - Live per-category demo components (spacing-ruler, type-specimen, shadow-sample, motion-demo, color-swatch) that dogfood the token system end-to-end
  - Canonical tabs import path (@base-ui/react/tabs) for this codebase until a shadcn wrapper is added
affects: [27-typography, 28-surfaces, 29-component-patterns, 30-motion, 31-polish]

# Tech tracking
tech-stack:
  added: []   # All deps (sonner, lucide-react, @base-ui/react) already present
  patterns:
    - "Unlisted App Router route pattern: metadata.robots = { index: false, follow: false } + no nav link (direct URL only)"
    - "Reusable TokenCard<live example, cssVar, tailwindClass> primitive as atomic unit for all token demos"
    - "Copy-to-clipboard idiom: navigator.clipboard.writeText + sonner toast + local Copy↔Check icon swap with 1500ms revert"
    - "Tailwind v4 template-literal class limitation workaround — inline style={{ backgroundColor: 'var(--X)' }} for dynamic swatches (neutrals, chart-*) whose classes cannot be statically scanned"
    - "Tabs primitive fallback path: @base-ui/react/tabs used directly when src/components/ui/tabs.tsx wrapper is absent — documented so future plans don't re-investigate"

key-files:
  created:
    - "src/app/tokens/page.tsx — unlisted route with robots.noindex metadata, renders <TokenBrowser />"
    - "src/components/tokens/token-browser.tsx — 5-tab shell (Spacing / Typography / Surfaces & Shadows / Motion / Colors) using @base-ui/react/tabs"
    - "src/components/tokens/token-card.tsx — reusable token display card with live example slot + CSS var + Tailwind class + copy-to-clipboard"
    - "src/components/tokens/spacing-ruler.tsx — numeric (1–12) + semantic (inline/stack/section/card-padding/page-gutter) spacing demos"
    - "src/components/tokens/type-specimen.tsx — 6 type tiers + 3 numeric variants with tabular-aligned digits"
    - "src/components/tokens/shadow-sample.tsx — shadow-xs/sm/md/lg samples + radius-sm/md/lg samples"
    - "src/components/tokens/motion-demo.tsx — 9 duration × easing combos with click-triggered translate demos"
    - "src/components/tokens/color-swatch.tsx — surfaces / accent + state / neutrals / chart / interaction swatches"
  modified: []

key-decisions:
  - "No shadcn Tabs wrapper in repo — used @base-ui/react/tabs directly. This is now the canonical tabs import path in the codebase until a wrapper is added."
  - "Tailwind v4 content scanner cannot see template-literal utility classes (e.g. `bg-neutral-${n}`). Dynamic swatches for neutrals and chart colors switched to inline style={{ backgroundColor: 'var(...)' }} during execution — documented so future palette demos use the same idiom."
  - "Page dogfoods the token system: its own chrome uses only tokens (bg-surface-base, p-page-gutter, gap-section, text-display, shadow-xs on cards) — no hardcoded p-4/text-2xl/etc. This is both a constraint and a correctness check."
  - "/tokens is unlisted — robots.index=false in metadata, no nav link in sidebar/header. Bookmarkable direct URL only. Serves as live documentation for the user (Micah) and a self-verification surface for future token work."

patterns-established:
  - "Unlisted reference-page pattern — can be reused for other internal dev surfaces (e.g., future /components, /playground, /debug routes)"
  - "TokenCard atomic unit — reusable primitive for any future token/design-system demo pages"
  - "Tailwind v4 dynamic color idiom — inline style for any bg/fg color computed at runtime from a token map"

requirements-completed: [DS-01, DS-02, DS-03, DS-04, DS-05, DS-06]

# Metrics
duration: ~70 min
completed: 2026-04-17
---

# Phase 26 Plan 05: /tokens Reference Page Summary

**Unlisted, tabbed /tokens reference route dogfooding every Phase 26 token — 5 tabs, live demos, copy-to-clipboard — using only tokens for its own styling.**

## Performance

- **Duration:** ~70 min (Tasks 1 + 2 execution + human verification)
- **Started:** 2026-04-17T11:37Z (approx, first commit 2c3b05e)
- **Completed:** 2026-04-17T13:00Z (approx, finalization after user approval)
- **Tasks:** 3 (2 auto + 1 human-verify checkpoint — approved)
- **Files created:** 8 (1 route page + 7 components)
- **Files modified:** 0 (no existing files touched; pure new-surface plan)

## Accomplishments

- Shipped unlisted `/tokens` route with `robots: { index: false, follow: false }` metadata and no nav link — bookmarkable direct URL only.
- Built TokenBrowser with exactly 5 tabs (Spacing / Typography / Surfaces & Shadows / Motion / Colors) via `@base-ui/react/tabs`. Default tab: Spacing.
- Built reusable TokenCard primitive with live example slot, CSS var readout, Tailwind class readout, and two copy buttons (var + class) using `navigator.clipboard.writeText` + sonner toast + Copy↔Check icon swap (1500ms revert).
- Filled every tab with live, token-driven demos:
  - **Spacing:** 12 numeric (`--spacing-1..12`) + 5 semantic aliases (inline/stack/section/card-padding/page-gutter).
  - **Typography:** 6 tiers (display/heading/title/label/body/caption) + 3 numeric variants (display-numeric/body-numeric/label-numeric) with tabular-aligned digits.
  - **Surfaces & Shadows:** 5 surface swatches (base/raised/inset/overlay/floating) + 4 shadows (xs/sm/md/lg) + 3 radii (sm/md/lg) co-located.
  - **Motion:** 9 duration × easing combos, each card with a click-triggered `translate-x-20` box applying that exact `var(--duration-*)` + `var(--ease-*)` combination.
  - **Colors:** accent + state badges (success/warning/error/info with bg/border/fg composed), 11-step neutrals ladder, 8-color categorical chart palette + diverging gradient, interaction tokens (focus-ring, selection-bg, hover-bg) demoed on a sample button/tile.
- User visually verified `/tokens` in both light and dark mode in their own browser (standing preference — preview_screenshot flow unavailable due to Snowflake auth timeouts on headless preview) and approved.

## Task Commits

Each task committed atomically:

1. **Task 1: Scaffold /tokens route + TokenBrowser shell + TokenCard primitive** — `2c3b05e` (feat)
2. **Task 2: Fill all tab bodies with live demos for every Phase 26 token** — `e949294` (feat)
3. **Task 3: Human verify — /tokens page dogfoods system correctly in both modes** — approved (checkpoint, no commit)

**Post-plan follow-on** (not part of 26-05 plan scope — user-requested brand palette swap):
- `d2f0a16` — `feat(26-01): adopt Bounce brand palette — green primary + purple secondary`. This swap replaced `accent-warm` with `brand-green` / `brand-green-bright` / `brand-purple` across the codebase. The `/tokens` color-swatch component and the `bg-accent-warm` demo fills in spacing-ruler / shadow-sample / motion-demo were updated as part of that commit to reflect the new brand tokens.

**Plan metadata:** this SUMMARY commit (docs: complete plan)

## Files Created/Modified

Created:
- `src/app/tokens/page.tsx` — unlisted route with robots.noindex metadata; renders `<TokenBrowser />`.
- `src/components/tokens/token-browser.tsx` — client component, 5 tabs via `@base-ui/react/tabs`, `bg-surface-base min-h-screen` shell with `max-w-6xl mx-auto` container and `flex flex-col gap-section` layout.
- `src/components/tokens/token-card.tsx` — reusable display card. Props: `label`, `cssVar`, `tailwindClass?`, `value?`, `children` (live example). Styling uses only tokens (`bg-surface-raised rounded-lg p-card-padding shadow-xs flex flex-col gap-stack`). Two copy buttons (var + class) with Copy↔Check icon swap.
- `src/components/tokens/spacing-ruler.tsx` — numeric (1–12) + semantic aliases.
- `src/components/tokens/type-specimen.tsx` — type tiers + numeric variants.
- `src/components/tokens/shadow-sample.tsx` — shadow + radius samples co-located.
- `src/components/tokens/motion-demo.tsx` — 9-card interactive motion playground.
- `src/components/tokens/color-swatch.tsx` — category-driven swatch grid renderer (surfaces / accent-state / neutrals / chart / interaction).

Modified: none (new-surface-only plan).

## Decisions Made

- **No shadcn Tabs wrapper present — used `@base-ui/react/tabs` directly.** This becomes the canonical tabs import path for the codebase until a wrapper is added. Noted in SUMMARY so future plans don't re-investigate.
- **Tailwind v4 content scanner can't see template-literal classes.** Dynamic swatches whose class names are computed at render time (neutrals, chart-*) switched to inline `style={{ backgroundColor: 'var(--X)' }}` during Task 2 execution. Static utility classes continue to use `className` as normal.
- **Dogfooding discipline:** the page's own chrome uses only tokens (bg-surface-base, p-card-padding, gap-section, text-display, etc.). No hardcoded `p-4` / `text-2xl` / etc. outside the demo slots that intentionally showcase those utilities.
- **Unlisted-route pattern:** `robots: { index: false, follow: false }` in metadata + deliberate choice not to add a nav link anywhere. Direct URL only — bookmarkable by the user, invisible to crawlers and casual navigation.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] No shadcn Tabs wrapper — fell back to `@base-ui/react/tabs`**
- **Found during:** Task 1 pre-step (tabs primitive source determination).
- **Issue:** `src/components/ui/tabs.tsx` does not exist. Plan anticipated both outcomes and instructed "use what's there".
- **Fix:** Imported Tabs primitive directly from `@base-ui/react/tabs` (already a project dependency per 26-RESEARCH.md). Did NOT run `npx shadcn add tabs` (plan explicitly disallowed auto-install).
- **Files modified:** src/components/tokens/token-browser.tsx (import path).
- **Verification:** `npm run build` passes; all 5 tabs render and switch correctly in both modes.
- **Committed in:** 2c3b05e (Task 1).

**2. [Rule 1 - Bug] Tailwind v4 template-literal class scanner limitation**
- **Found during:** Task 2 (color-swatch for neutrals + chart palettes).
- **Issue:** Tailwind v4's content scanner statically analyzes source and cannot see classes constructed from template literals like `bg-neutral-${n}` or `bg-chart-${i}`. Using these strings for dynamic swatches produced unstyled elements because the classes were never emitted.
- **Fix:** For swatch elements whose background color is computed from a token map at render time (neutrals 50..950, chart categorical 1..8, diverging gradient stops), switched from `className={\`bg-neutral-${n}\`}` to `style={{ backgroundColor: 'var(--neutral-' + n + ')' }}`. Static utility classes (e.g., `bg-surface-raised`) continue to use `className`.
- **Files modified:** src/components/tokens/color-swatch.tsx.
- **Verification:** All neutrals + chart swatches render correctly in both light and dark mode; user confirmed visually.
- **Committed in:** e949294 (Task 2).

### Follow-on Work (Outside Plan Scope)

Not a plan deviation — happened after Task 2 commit e949294 during user review of the full phase-26 output:

- **User-requested brand palette swap — `d2f0a16`** renamed `accent-warm` to brand tokens (`brand-green`, `brand-green-bright`, `brand-purple`) and retuned several "positive performance" green hues across the token system. The `/tokens` color-swatch component was updated as part of that swap to show the three brand swatches in place of the single `accent-warm` swatch, and the `bg-accent-warm` demo fills in `spacing-ruler.tsx`, `shadow-sample.tsx`, and `motion-demo.tsx` were switched to `bg-brand-green`. These are follow-on edits layered on top of this plan's commits and are owned by the brand-palette commit, not this plan.

---

**Total deviations:** 2 auto-fixed (1 Rule 3 blocking, 1 Rule 1 bug). Plus 1 out-of-scope follow-on (user-driven brand swap).
**Impact on plan:** Both auto-fixes necessary and narrowly scoped. No scope creep. Canonical tabs path and the Tailwind v4 template-literal workaround are documented as reusable patterns for future work.

## Issues Encountered

None. Preview_screenshot flow remained unavailable (Snowflake auth timeouts in headless preview — recurring Phase 26 constraint, not new). User verified visually in own browser per standing preference.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- **Phase 26 is complete.** All 5 plans shipped: 26-01 (foundation), 26-02 (KPI card pilot), 26-03 (header pilot), 26-04 (table row pilot), 26-05 (/tokens reference page). All 6 requirements (DS-01 through DS-06) are now fully credited across foundation + 3 pilots + reference page.
- **Ready for Phase 27 (Typography & Information Hierarchy)** and **Phase 28 (Surfaces & Elevation)** — they can run in parallel per v4.0-ROADMAP.md. Token infrastructure is stable, pilots have proven consumption patterns, and `/tokens` serves as live documentation for both phases' implementers.
- **Ready for Phase 26 verification (`/gsd:verify-work 26`)** before transitioning.
- **No blockers carried forward.** Dual Y-axis chart concern (flagged for Phase 36) remains open but unrelated to Phase 26.

## Self-Check

Files verified on disk:
- FOUND: src/app/tokens/page.tsx
- FOUND: src/components/tokens/token-browser.tsx
- FOUND: src/components/tokens/token-card.tsx
- FOUND: src/components/tokens/spacing-ruler.tsx
- FOUND: src/components/tokens/type-specimen.tsx
- FOUND: src/components/tokens/shadow-sample.tsx
- FOUND: src/components/tokens/motion-demo.tsx
- FOUND: src/components/tokens/color-swatch.tsx

Commits verified:
- FOUND: 2c3b05e (Task 1)
- FOUND: e949294 (Task 2)
- FOUND: d2f0a16 (post-plan brand swap follow-on)

## Self-Check: PASSED

---
*Phase: 26-design-tokens*
*Completed: 2026-04-17*
