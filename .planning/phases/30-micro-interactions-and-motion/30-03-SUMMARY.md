---
phase: 30-micro-interactions-and-motion
plan: 03
subsystem: ui
tags: [motion, buttons, press-scale, hover-lift, data-panel, tokens, ds-25, ds-26]

# Dependency graph
requires:
  - phase: 26-design-tokens
    provides: --duration-quick motion token
  - phase: 28-shadows-elevation
    provides: --shadow-elevation-raised / --shadow-elevation-overlay pair (lift target)
  - phase: 29-component-patterns
    provides: DataPanel pattern (DS-19) — extended here with interactive prop
  - plan: 30-01
    provides: .hover-lift utility, [data-press-scale] reduced-motion override, check:motion guard
provides:
  - Button press-scale on default + secondary variants (DS-26)
  - data-press-scale attribute on Button for A11Y-05 reduced-motion neutralize
  - DataPanel.interactive?: boolean prop surface (DS-25 sweep)
  - /tokens Motion tab — button press demo + DataPanel hover-lift demo
affects: [30-04, 30-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Variant-scoped press-scale: cva variants extend with hover:not-aria-[haspopup]:scale-[1.01] active:not-aria-[haspopup]:scale-[0.98] on default + secondary only. Replaces prior base-class translate-y-px (Pitfall 7: no composite translate+scale transforms)."
    - "data-press-scale runtime attribute: Button function sets data-press-scale={pressScale || undefined} so React omits the attribute on non-scaled variants. Pairs with A11Y-05 globals.css override ([data-press-scale]:hover / :active → transform: none)."
    - "DataPanel interactive prop mirrors StatCard.interactive (Plan 30-01): conditional .hover-lift on the chassis, no change to static default. JSDoc identical to StatCard.interactive copy for pattern consistency."

key-files:
  created:
    - .planning/phases/30-micro-interactions-and-motion/30-03-SUMMARY.md
  modified:
    - src/components/ui/button.tsx
    - src/components/patterns/data-panel.tsx
    - src/components/tokens/motion-demo.tsx

key-decisions:
  - "Pitfall 7 resolution: base-class active:not-aria-[haspopup]:translate-y-px REMOVED, replaced by variant-scoped hover:/active: scale on default + secondary only. Eliminates the 'nudges down AND shrinks' composite-transform effect. Other variants (outline/ghost/destructive/link) lose the translate feedback entirely — acceptable per DS-26 scope lock (only primary-tier variants express press-scale; others use bg tint)."
  - "data-press-scale runtime attribute over base-class data attribute: Button function checks variant === 'default' || variant === 'secondary' and emits the attribute only on those variants. React's convention (undefined attribute values are omitted) keeps ghost/outline/destructive/link DOM output clean. Reduced-motion CSS override ([data-press-scale]:hover → transform: none) lands on exactly the elements that scale."
  - "Base class gains duration-quick alongside existing transition-all. Previously transition-all fell back to Tailwind's 150ms default (a check:motion Check-5 soft miss — only caught literal `duration-150`, but the 30ms delta between 150ms and --duration-quick's 120ms is within perceptual tolerance). Explicit duration-quick removes the implicit-fallback footgun."
  - "aria-haspopup exception preserved via not-aria-[haspopup]: Tailwind v4 modifier on both hover and active scale utilities. Dropdown triggers with variant='default' or variant='secondary' still don't scale — the menu opening IS the feedback (Pitfall 7 locked)."
  - "DataPanel call-site wiring: all 3 existing DataPanel consumers (comparison-matrix, trajectory-chart, collection-curve-chart) leave interactive=false. None of them have an onClick on the panel itself — their interactivity lives inside the actions slot (view-mode toggle buttons, metric toggles) or inside the content (chart interaction, row clicks). Per plan guidance ('wire interactive={true} on ANY existing call sites that already have an onClick or data-click handler'), no panels qualify. Prop surface ships unused outside the /tokens specimen; wires on when a drill-expand or expand-to-overlay feature lands."
  - "Icon-size + default-variant edge case: when a caller uses <Button variant='default' size='icon-sm'> (rare edge; sticky primary icon button), the variant's scale utilities apply. CONTEXT lock was 'icon-chip + ghost stay unscaled'. Ghost variant handles the 99% case (toolbar icon chips); default+icon-size is a prominent primary affordance that deserves the scale. Decision locked: scale applies."
  - "--duration-micro (60ms) NOT introduced. CONTEXT mentioned it as a possible follow-up if 120ms press feels laggy; no pilot signal yet. duration-quick (120ms) consistent across color, bg, transform. Reopen only if in-browser feedback flags press as sluggish."
  - "DataPanel demo on /tokens uses REAL DataPanel import (not a raw div mimic). Dogfoods the pattern: /tokens page's pattern-sweep section demonstrates the exact component consumers will use. Real DataPanel requires only title + children — trivial to satisfy with a demo copy. Interactive panel gains eyebrow 'click to expand / drill' to hint the interactive affordance."

patterns-established:
  - "Variant-scoped press-scale recipe (DS-26): hover:not-aria-[haspopup]:scale-[1.01] active:not-aria-[haspopup]:scale-[0.98] applied per variant, not on base. Reusable shape for future variant-scoped micro-interactions (e.g. destructive-tier press glow, success-tier flash)."
  - "Runtime data-attr for reduced-motion participation: data-press-scale={pressScale || undefined} pattern — React omits undefined attributes, CSS targets the attribute presence. Replaces class-list matching for A11Y override targeting. Applicable to any future scaled/translated component that needs reduced-motion neutralize without opting into a class-based selector."
  - "Interactive-pattern prop mirror: when sweeping DS-25 across pattern components (DataPanel now; future potentially EmptyState-with-action, ToolbarDivider-as-click-handle, etc.), copy the StatCard.interactive JSDoc verbatim. Keeps the interactive-cards family readable as one recipe across pattern surfaces."

requirements-completed: [DS-25, DS-26]

# Metrics
duration: ~2 min
completed: 2026-04-18
---

# Phase 30 Plan 03: Button press-scale + DataPanel hover-lift sweep

**DS-26 variant-scoped button press-scale (default + secondary) with data-press-scale reduced-motion attr + DS-25 DataPanel.interactive hover-lift prop + /tokens Motion tab demos.**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-04-18T14:22:36Z
- **Completed:** 2026-04-18T14:24:57Z
- **Tasks:** 3
- **Files modified:** 3 (button.tsx, data-panel.tsx, motion-demo.tsx)

## Accomplishments

- DS-26 live: `<Button variant="default">` and `<Button variant="secondary">` scale 1.01 on hover, 0.98 on active. Other variants (outline/ghost/destructive/link) use bg tint only.
- Pitfall 7 resolved: base-class `active:not-aria-[haspopup]:translate-y-px` removed. No composite translate+scale reads.
- data-press-scale attribute wired on default/secondary variants — participates in the A11Y-05 reduced-motion override from Plan 30-01.
- aria-haspopup buttons (dropdown triggers) opt out of scale via `not-aria-[haspopup]:` modifier on both hover and active utilities. Menu opening remains the feedback.
- DataPanel gains `interactive?: boolean` prop surface — JSDoc mirrors StatCard.interactive (Plan 30-01). Chassis conditionally applies .hover-lift.
- Base class Button gains `duration-quick` — replaces Tailwind's implicit 150ms fallback with the explicit token-backed 120ms.
- /tokens Motion tab gains two new sections: "Button press scale (DS-26)" with all 6 variants labeled by scale behavior, and "Panel hover lift (DS-25)" with real DataPanel instances (interactive + static side by side).

## Task Commits

Each task was committed atomically:

1. **Task 1: Button press-scale on default + secondary variants (DS-26)** — `09cbad1` (feat)
2. **Task 2: DataPanel interactive prop + hover-lift sweep (DS-25)** — `3230962` (feat)
3. **Task 3: /tokens Motion tab — button press + DataPanel hover-lift demos** — `28543b6` (feat)

**Plan metadata:** [this commit] (docs: SUMMARY + STATE + ROADMAP)

## Files Created/Modified

**Created:**
- `.planning/phases/30-micro-interactions-and-motion/30-03-SUMMARY.md` - This summary.

**Modified:**
- `src/components/ui/button.tsx` - Removed base-class translate-y-px; added variant-scoped `hover:not-aria-[haspopup]:scale-[1.01] active:not-aria-[haspopup]:scale-[0.98]` to default + secondary; added `duration-quick` on base class; Button function emits `data-press-scale={pressScale || undefined}` on default/secondary variants.
- `src/components/patterns/data-panel.tsx` - Added `interactive?: boolean` prop with JSDoc matching StatCard.interactive wording; chassis conditionally applies `.hover-lift` when interactive.
- `src/components/tokens/motion-demo.tsx` - Added "Button press scale (DS-26)" section (all 6 variants labeled by scale behavior) + "Panel hover lift (DS-25)" section (real DataPanel with interactive={true} alongside static DataPanel).

## Decisions Made

See frontmatter `key-decisions` — the Pitfall 7 translate-removal, the data-press-scale runtime-attr approach, and the DataPanel call-site wiring deferral are the load-bearing ones.

## Deviations from Plan

None — plan executed exactly as written. All 3 tasks completed, all 4 guards green, build green.

### Pitfall 4 resolution on data-panel.tsx chassis

The DataPanel chassis had no pre-existing `transition-*` utility (line 63 baseline was `rounded-lg bg-surface-raised p-card-padding shadow-elevation-raised`). No merge / swap required — `.hover-lift` added cleanly as a conditional class via `cn()`. Pitfall 4 (mutually-exclusive-transition-property rule) did not engage.

### DataPanel call-site wiring decisions

Audited all 3 existing DataPanel consumers:
1. `src/components/cross-partner/comparison-matrix.tsx` — actions slot carries view-mode toggle buttons; panel itself has no onClick. **interactive: false** (unchanged).
2. `src/components/cross-partner/trajectory-chart.tsx` — actions slot carries $ Weighted / Equal Weight toggles; panel itself has no onClick. **interactive: false** (unchanged).
3. `src/components/charts/collection-curve-chart.tsx` — actions slot carries Recovery Rate / Dollars toggle; panel itself has no onClick. **interactive: false** (unchanged).

Per plan guidance: "wire `interactive={true}` on ANY existing call sites that already have an onClick or data-click handler." Zero qualify. Prop surface ships live but unused outside the /tokens specimen. When a drill-expand or overlay-expand feature lands, those consumers will set `interactive={true}`.

### Icon-size + default-variant edge case

CONTEXT lock was "icon-chip + ghost stay unscaled." Ghost variant handles the 99% case (unified-toolbar icon chips) without scale. If a caller uses `<Button variant="default" size="icon-sm">`, the default variant's scale utilities apply. That's a rare edge (sticky primary icon action), and the scale reads as tactile for a prominent affordance. **Locked: scale applies; no size-based override.**

### --duration-micro (60ms) decision

CONTEXT floated --duration-micro as a possible follow-up if 120ms press feels laggy. No pilot signal yet — not adding speculatively. duration-quick (120ms) consistent across color, bg, transform. Reopen only if in-browser feedback flags press as sluggish; add in a dedicated plan with a single-site pilot first.

## Issues Encountered

None. All checks green on first run. No auth gates, no architectural decisions required.

## Next Phase Readiness

- Plan 30-04 + 30-05 (remaining phase work) can build on the variant-scoped press-scale pattern for any future tactile-press variants (e.g. destructive-tier, success-tier).
- The `data-press-scale` runtime-attribute pattern is reusable for any future scaled/translated component that needs A11Y-05 reduced-motion participation.
- DataPanel.interactive prop is ready to wire when a drill-expand or overlay-expand feature lands — no further plan work needed; just set `interactive={true}` at the consumer.
- check:motion guard remains green; no new violations introduced.

## Verification Log

Manual verification checklist (requires user browser session — project preference: verify CSS visually before pushing per MEMORY feedback_testing):

1. **Button press scale — primary:** Visit any `<Button variant="default">` in the app. Hover → slight scale-up. Press → scale-down. Release → spring easing return.
2. **Button press scale — secondary:** Same on `<Button variant="secondary">`.
3. **Non-scaling variants:** Hover/press outline, ghost, destructive, link — bg tint changes, NO scale. Icon-chip buttons (variant="ghost" size="icon-sm") in unified-toolbar stay still when mousing across.
4. **aria-haspopup exception:** Dropdown triggers (column picker, view selector) do NOT scale even with default/secondary variant — menu opening is the feedback.
5. **Composite transform absence:** Press a default-variant button — clean shrink only, NOT down-nudge + shrink.
6. **DataPanel hover lift:** /tokens Motion tab → "Panel hover lift (DS-25)" section → hover Interactive panel → translate-Y -1px + shadow step (elevation-raised → elevation-overlay). Hover Static panel → no change.
7. **Reduced-motion smoke:** System Settings → Accessibility → Display → Reduce motion ON. Reload. Press primary button → no scale. Hover DataPanel on /tokens → no lift. Toggle OFF → motion returns.
8. **All guards + build green:** `npm run check:motion && npm run check:tokens && npm run check:surfaces && npm run check:components && npm run build` — all green (confirmed in-session).

## Self-Check

Verification performed:

1. src/components/ui/button.tsx contains `hover:not-aria-[haspopup]:scale-[1.01]` + `active:not-aria-[haspopup]:scale-[0.98]`: FOUND (lines 12, 16)
2. src/components/ui/button.tsx no longer contains `active:not-aria-[haspopup]:translate-y-px`: CONFIRMED (grep returns no match)
3. src/components/ui/button.tsx contains `data-press-scale`: FOUND (line 54)
4. src/components/ui/button.tsx base class contains `duration-quick`: FOUND (line 7)
5. src/components/patterns/data-panel.tsx contains `interactive?: boolean`: FOUND (line 54)
6. src/components/patterns/data-panel.tsx contains `hover-lift`: FOUND (line 72)
7. src/components/tokens/motion-demo.tsx contains "Button press scale": FOUND (line 177)
8. src/components/tokens/motion-demo.tsx contains "Panel hover lift": FOUND (line 233)
9. Task commits exist: `09cbad1`, `3230962`, `28543b6` — all present in git log
10. All 4 check scripts green: check:motion ✅, check:tokens ✅, check:surfaces ✅, check:components ✅
11. Build green: `npm run build` succeeded, all routes compile

## Self-Check: PASSED

---
*Phase: 30-micro-interactions-and-motion*
*Completed: 2026-04-18*
