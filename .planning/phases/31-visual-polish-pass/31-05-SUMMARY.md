---
phase: 31-visual-polish-pass
plan: 05
subsystem: ui
tags: [design-tokens, css, tailwind-v4, divider, gradient, layer-utilities]

# Dependency graph
requires:
  - phase: 31-01
    provides: retuned --border at 8% single standard — canonical divider gradient color source
  - phase: 26-01
    provides: semantic spacing alias --spacing-section (my-section utility) for vertical rhythm
  - phase: 29-04
    provides: ToolbarDivider component + sibling-pattern consumer wiring (unified-toolbar ×2, comparison-matrix ×1)
provides:
  - "DS-29: center-solid / transparent-ends gradient divider recipe shipped as two utilities (.divider-horizontal-fade, .divider-vertical-fade) + SectionDivider wrapper"
  - "Two horizontal section junctions in data-display.tsx: KPI band ↔ charts, and charts ↔ table"
  - "ToolbarDivider internal background swapped from bg-border to divider-vertical-fade — all 3 existing consumers inherit transparently"
affects: [31-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Utility-class + thin-wrapper-component pair (31-RESEARCH Option 2) over inline Tailwind arbitrary values — greppable token name, composable with other utilities"
    - "Server-renderable layout wrapper component (mirrors section-header.tsx precedent) for RSC usability"
    - "Token-level color sourcing (gradient consumes var(--border)) — downstream --border retunes propagate automatically"

key-files:
  created:
    - "src/components/layout/section-divider.tsx — new SectionDivider wrapper, server-renderable, applies divider-horizontal-fade + my-section"
  modified:
    - "src/app/globals.css — added .divider-horizontal-fade and .divider-vertical-fade inside @layer utilities (after .thin-scrollbar)"
    - "src/components/patterns/toolbar-divider.tsx — className swap bg-border → divider-vertical-fade; consumers unchanged"
    - "src/components/data-display.tsx — imported SectionDivider; placed 2 instances at the KPI↔charts and charts↔table junctions"

key-decisions:
  - "Horizontal divider placement at partner-level KPI↔charts junction nested inside the chart-expand grid (not as a top-level sibling of the error boundary) — keeps the divider visually tied to the chart region it separates, and benefits from the existing expand/collapse transition so the divider animates with its content"
  - "Charts↔table divider placed OUTSIDE the chart SectionErrorBoundary and BEFORE the PartnerNormsProvider — sits in the drill-fade wrapper alongside both subtrees so it co-re-keys on drill changes, with no effect on error isolation"
  - "SectionDivider uses my-section (Phase 26 semantic alias) for vertical rhythm — no new spacing primitives introduced, consistent with CONTEXT 'almost borderless, consistent spacing' intent"
  - "ToolbarDivider kept mx-0.5 h-4 w-px intact; only the background utility changed — preserves Phase 29-05 margin normalization and all 3 consumer sites inherit without prop or import edits"
  - "data-display.tsx <SectionDivider /> at partner-level KPI↔charts conditionally rendered inside the same `partnerStats?.curves.length >= 2` guard as CollectionCurveChart — no stray divider when the chart itself is absent"

patterns-established:
  - "Gradient-fade divider recipe: linear-gradient(direction, transparent, var(--border), transparent) — center-solid intentional faintness via the 8% --border, tapered ends defuse the 'framing' visual weight of hard borders"
  - "@layer utilities co-location: DS-29 utilities declared next to .thin-scrollbar / .hover-lift / .focus-glow as a single motion+polish token set"
  - "SectionDivider = SectionHeader sibling recipe (both server-renderable, both token-consuming, both scoped to layout semantics) — future layout primitives should follow this shape"

requirements-completed: [DS-29]

# Metrics
duration: ~8 min
completed: 2026-04-18
---

# Phase 31 Plan 05: Gradient Divider Summary

**DS-29 center-solid / transparent-ends gradient dividers shipped as two @layer utilities + SectionDivider wrapper; ToolbarDivider background swapped in-place; 2 horizontal junctions placed in data-display.tsx at KPI↔charts and charts↔table**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-04-19T01:58:00Z
- **Completed:** 2026-04-19T02:06:31Z
- **Tasks:** 3 (2 edits + 1 verification)
- **Files modified:** 4 (globals.css, section-divider.tsx [new], toolbar-divider.tsx, data-display.tsx)

## Accomplishments

- DS-29 utilities landed inside `@layer utilities`: `.divider-horizontal-fade` (height 1px, horizontal gradient) and `.divider-vertical-fade` (width 1px, vertical gradient) — both consume `var(--border)` (8% after 31-01) so future border retunes cascade automatically.
- `SectionDivider` component created (`src/components/layout/section-divider.tsx`) — server-renderable, role=presentation + aria-hidden, applies `divider-horizontal-fade` + `my-section` (Phase 26 semantic spacing alias).
- `ToolbarDivider` internal recipe swapped `bg-border` → `divider-vertical-fade`; all 3 existing consumers (unified-toolbar ×2, comparison-matrix ×1) inherit the change transparently — no import, prop, or margin edits.
- `data-display.tsx` now renders `<SectionDivider />` at the two canonical junctions: (1) between `KpiSummaryCards` and `CollectionCurveChart` at partner level — conditionally rendered inside the existing `curves.length >= 2` guard so no stray divider when the chart is absent; (2) between the chart expand `SectionErrorBoundary` and the `PartnerNormsProvider` that wraps the data table.
- All 4 design-system guards (check:tokens / check:surfaces / check:components / check:motion) exit 0; Next.js production build passes.
- Regression grep confirms only the 3 targeted files reference `divider-*-fade` utilities (globals.css declares, toolbar-divider.tsx consumes, section-divider.tsx consumes). The /tokens specimen in 31-06 will be the 4th.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add gradient divider utilities + SectionDivider component** — `53c42ba` (feat)
2. **Task 2: Swap ToolbarDivider internal recipe + place SectionDivider at data-display junctions** — `456e4ba` (feat)
3. **Task 3: Verify build + existing guards + regression scan** — no commit (verification only)

**Plan metadata:** (pending — docs commit follows)

## Files Created/Modified

- `src/app/globals.css` — appended 16-line DS-29 block inside `@layer utilities` after the `.thin-scrollbar` hover rule. Includes inline rationale comment documenting horizontal/vertical-only scope and CONTEXT lock for every-other-border.
- `src/components/layout/section-divider.tsx` (new, 23 lines) — `SectionDivider({ className })` component, server-renderable, `role="presentation"` + `aria-hidden="true"`, applies `divider-horizontal-fade my-section`.
- `src/components/patterns/toolbar-divider.tsx` — single-line className swap inside the render + JSDoc updated to document the Phase 31 DS-29 migration and the transparent-consumer property.
- `src/components/data-display.tsx` — added `SectionDivider` import next to the `SectionErrorBoundary` import; placed two `<SectionDivider />` instances with inline DS-29 comment markers at the KPI↔charts partner junction (inside the `curves.length >= 2` fragment) and the charts↔table junction (between the chart `SectionErrorBoundary` and the `PartnerNormsProvider`).

## Decisions Made

- **Horizontal placement at partner-level KPI↔charts junction nested inside the chart-expand grid** — keeps the divider tied to the chart region it separates, and lets the existing expand/collapse grid transition animate it alongside the chart. Alternative (top-level sibling) would have decoupled the divider from the chart, forcing manual reveal logic.
- **Horizontal placement at charts↔table junction outside the chart SectionErrorBoundary but before PartnerNormsProvider** — sits in the drill-fade wrapper so it co-re-keys on drill changes; kept out of the error boundary so an isolated chart error doesn't visually consume the divider slot.
- **Conditional render of junction 1** — wrapped in the existing `curves.length >= 2` guard so partners without enough curves to render a chart don't get a hanging divider. No additional null-guard logic needed.
- **`my-section` carries the rhythm** — no new spacing primitive introduced. Downstream layouts that want tighter/looser spacing can pass `className` overrides via the `SectionDivider` prop surface (documented in component JSDoc).
- **ToolbarDivider kept its `mx-0.5 h-4 w-px` skeleton** — only the background utility changed. This preserves the Phase 29-05 margin normalization and means the visual delta is color-depth only (from solid 8% tint to gradient peaking at 8% mid-span). Reopen only if in-browser review flags the tapered ends as reading weaker than the prior solid line at the toolbar's short 16px vertical span.

## Deviations from Plan

None — plan executed exactly as written.

The plan's Task 1 expected signature (globals.css utility declarations + new SectionDivider component mirroring section-header.tsx) landed verbatim. Task 2's JSX placements matched the "one divider between KPI band and charts, one divider between charts and table" directive; the current data-display.tsx structure places the KPI band and charts inside a shared `space-y-2` at partner level, so the KPI↔charts divider naturally slots between the two with `my-section` providing its own gap. No pre-existing spacing had to be removed.

No auto-fixes, no blockers, no scope expansion. Pre-existing unstaged modifications observed in the working tree (from prior parallel work in `.planning/*`, `src/lib/*`, `src/components/charts/use-curve-chart-state.ts`) were out of Plan 31-05 scope per the scope-boundary rule and were NOT staged in any task commit.

## Issues Encountered

None. All four guards + Next.js build + regression grep passed on first invocation.

Visual confirmation in `npm run dev` not attempted this session — /tokens specimen for DS-29 lands in Plan 31-06, where the gradient recipe will be documented visually alongside the 31-01 border retune, 31-02 focus-glow language, 31-03 thin-scrollbar scoping, and 31-04 hover tint.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Plan 31-06 (/tokens Visual Polish specimen) can now consume DS-29 — point the specimen at `.divider-horizontal-fade` + `.divider-vertical-fade` and show `<SectionDivider />` as the canonical JSX consumer.
- ToolbarDivider consumers require no follow-up — migration is transparent; toolbar clusters in unified-toolbar and comparison-matrix render with faint vertical gradients on next mount.
- `var(--border)` remains the single source of divider color — any future border-opacity retune propagates to both horizontal and vertical gradients without touching this plan's files.
- SectionDivider is available as a reusable primitive for future layout phases needing section-boundary dividers (reach for it before reaching for an ad-hoc `<hr>` or `border-t` line).

## Self-Check: PASSED

- FOUND: `.divider-horizontal-fade` + `.divider-vertical-fade` declarations in src/app/globals.css (inside `@layer utilities`, after `.thin-scrollbar` block).
- FOUND: src/components/layout/section-divider.tsx (23 lines, exports `SectionDivider`).
- FOUND: `divider-vertical-fade` in src/components/patterns/toolbar-divider.tsx (replaced `bg-border`).
- FOUND: 2 `<SectionDivider` JSX uses in src/components/data-display.tsx (KPI↔charts + charts↔table).
- FOUND: commit 53c42ba (Task 1).
- FOUND: commit 456e4ba (Task 2).
- FOUND: regression grep shows only 3 src/ files reference `divider-*-fade` (globals.css, toolbar-divider.tsx, section-divider.tsx — data-display.tsx uses the JSX wrapper instead).
- FOUND: `npm run build` completes successfully (✓ Compiled successfully in 3.1s; TypeScript pass; all 5 static pages prerendered).
- FOUND: check:tokens, check:surfaces, check:components, check:motion all exit 0.

---
*Phase: 31-visual-polish-pass*
*Completed: 2026-04-18*
