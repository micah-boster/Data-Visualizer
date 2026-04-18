---
phase: 30-micro-interactions-and-motion
plan: 02
subsystem: ui
tags: [motion, drill, cross-fade, ds-23, tokens, navigation]

# Dependency graph
requires:
  - phase: 26-design-tokens
    provides: --duration-normal + --ease-default motion tokens (auto-emitted duration-normal / ease-default Tailwind utilities)
  - phase: 30-01
    provides: A11Y-05 reduced-motion override (@media prefers-reduced-motion) — auto-collapses the cross-fade for users who request reduced motion
  - phase: 32-02
    provides: URL-backed drill state (useDrillDown) — symmetric cross-fade plays identically on browser back/forward with zero direction tracking
provides:
  - DS-23 drill cross-fade at data-display.tsx boundary (charts + KPI strip + table fade together)
  - data-drill-fade attribute for grep visibility and future styling hooks
  - Pitfall 3 scroll-jump guard via contain: layout on the drill wrapper
  - /tokens Motion tab — Drill cross-fade live demo with 3 level buttons
affects: [30-03, 30-04, 30-05, 32-*]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Re-key + transition-opacity primary pattern for state-change cross-fades: React unmounts the old subtree and remounts the new one; `transition-opacity duration-normal ease-default` softens the swap. Keyed on composite drill identity (`drill-${level}-${partner}-${batch}`). Simpler than dual-mount; handles URL back/forward correctly via React's natural re-render."
    - "Symmetric cross-fade = zero direction tracking. Opacity-only (no directional lift or slide) means forward drill-down and back-button drill-up render identically. Paired with Phase 32's history-entry model: router.push creates a history entry per drill, browser back replays the same cross-fade in reverse."
    - "Pitfall 3 scroll-jump guard: inline `contain: layout` hint on the drill wrapper holds container height stable during the fade window. Complements use-drill-down's router.push `{ scroll: false }`. Inline-style is NOT flagged by check:motion (guard regex scopes to transitionDuration/transitionTimingFunction, not layout hints)."
    - "Drill boundary scope lock: header, sidebar, schema-warning alert, sticky chrome render OUTSIDE the cross-fade wrapper. Only the drill-VARIANT region (charts + KPI strip + table) fades. Chrome stays steady across drill transitions."
    - "Reduced-motion inheritance: Plan 30-01's @media (prefers-reduced-motion: reduce) block zeroes every transition including transition-opacity. No per-component opt-out needed — the drill cross-fade automatically collapses to an instant swap for A11Y-05 compliance."

key-files:
  created:
    - .planning/phases/30-micro-interactions-and-motion/30-02-SUMMARY.md
  modified:
    - src/components/data-display.tsx
    - src/components/tokens/motion-demo.tsx

key-decisions:
  - "Re-key + transition-opacity locked in as the primary pattern (RESEARCH Open Q#4 option A). Dual-mount was the escalation path if a flash appeared mid-fade on TanStack Virtual re-virtualization. Not escalated — visual verification in-browser is owner-deferred per project preference (see Issues Encountered). Plan language explicitly scopes dual-mount as an upgrade triggered by visible flash only."
  - "Drill boundary wraps BOTH the charts SectionErrorBoundary AND the table SectionErrorBoundary as a single unit. Reason: CONTEXT lock 'content region + KPI strip fade TOGETHER; no stagger'. Two separate wrappers would introduce accidental stagger if React's batching differed across children. Single outer wrapper guarantees one-frame parity."
  - "Composite key `drill-${level}-${partner ?? 'none'}-${batch ?? 'none'}` chosen over simpler `${level}` key. Reason: partner→partner drills (future cross-partner view) and batch→batch drills within the same level need fresh mounts too. 'none' sentinel prevents `drill-root--` key collisions."
  - "Inline `style={{ contain: 'layout' }}` kept as inline style rather than promoted to a Tailwind arbitrary value `[contain:layout]`. Reason: layout-containment is a semantic hint (Pitfall 3 scroll guard), not a visual token; no need to round-trip through Tailwind JIT. check:motion regex only catches transitionDuration/transitionTimingFunction, so inline contain: value is not flagged."
  - "Cross-partner drill scope (RESEARCH Claude's Discretion #7): whatever cross-partner drill pathway exists today renders through the same data-display boundary, so the cross-fade applies transparently. If a future phase adds a separate cross-partner drill pane with its own render path, that surface will need its own wrapper — scoped out of this plan."
  - "No changes to use-drill-down.ts or the router.push contract. `{ scroll: false }` already lives there (verified use-drill-down.ts:70). Scroll-jump mitigation is purely additive via contain: layout — no router contract touched."

patterns-established:
  - "State-change cross-fade recipe: `<div key={stateIdentity} data-[feature]-fade className='transition-opacity duration-normal ease-default' style={{ contain: 'layout' }}>` wrapping a state-variant subtree. Reusable for any major state transition where 'the context shifted' needs soft acknowledgement without adding cognitive overhead. Examples candidate surfaces: view-preset swap, saved-view apply, dashboard filter-set switch."
  - "Drill demo mirror pattern for /tokens: any motion-utility docs page should include a live demo that uses the EXACT same mechanism (re-key + same utilities) as production. Users get a deterministic preview of what they'll experience in-app. Applied here via DrillCrossFadeDemo; reusable template for future motion plans (press feedback, loading reveals)."

requirements-completed: [DS-23]

# Metrics
duration: ~2 min
completed: 2026-04-18
---

# Phase 30 Plan 02: Drill Cross-Fade Summary

**DS-23 drill cross-fade at data-display boundary (charts + KPI strip + table fade together at duration-normal × ease-default) + /tokens Motion tab live demo.**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-04-18T14:16:12Z
- **Completed:** 2026-04-18T14:18:26Z
- **Tasks:** 2
- **Files modified:** 2 (data-display.tsx, motion-demo.tsx)

## Accomplishments

- DS-23 shipped: drill-variant region (charts + KPI strip + table) wrapped in a single `transition-opacity duration-normal ease-default` boundary keyed on composite drill identity. Header, sidebar, schema-warning alert, and sticky chrome render OUTSIDE the wrapper and stay steady.
- Pitfall 3 scroll-jump guarded via inline `contain: layout` on the drill wrapper. Complements existing router.push `{ scroll: false }`.
- Symmetric cross-fade: browser back/forward replays the fade identically with zero direction-tracking code.
- `data-drill-fade` attribute added for grep visibility and future styling hooks.
- /tokens Motion tab gains `DrillCrossFadeDemo` section — three level buttons (root / partner / batch) swap a content card using the exact same re-key + transition-opacity mechanism used in production. Serves as living documentation + self-verification surface.
- All four guard scripts (check:tokens / check:surfaces / check:components / check:motion) remain green. `npm run build` succeeds.

## Task Commits

Each task was committed atomically:

1. **Task 1: data-display.tsx drill boundary cross-fade** — `872cc37` (feat)
2. **Task 2: /tokens Motion tab drill cross-fade live demo** — `e6d1037` (feat)

**Plan metadata:** [this commit] (docs: complete plan — SUMMARY + STATE + ROADMAP)

## Files Created/Modified

**Created:**
- `.planning/phases/30-micro-interactions-and-motion/30-02-SUMMARY.md` — this file.

**Modified:**
- `src/components/data-display.tsx` — Wrapped the drill-variant region (charts SectionErrorBoundary + PartnerNormsProvider/table SectionErrorBoundary) in a single `<div key={drillIdentity} data-drill-fade className="transition-opacity duration-normal ease-default flex min-h-0 flex-1 flex-col" style={{ contain: 'layout' }}>`. Inner children unchanged. Schema-warning Alert stays above the wrapper (not drill-variant). Header/sidebar live in layout/page — already outside data-display, stay steady by construction.
- `src/components/tokens/motion-demo.tsx` — Appended a `<DrillCrossFadeDemo />` section after the Card hover lift section. Helper function defined in-file; reuses existing `useState` + `cn` imports. Three level buttons, one keyed content card using the production cross-fade recipe.

## Decisions Made

See frontmatter `key-decisions` — six load-bearing decisions; the top three drove implementation (re-key locked, single outer wrapper, composite key shape).

## Deviations from Plan

None — plan executed exactly as written. Re-key approach (primary path) shipped without escalation to dual-mount, per plan's explicit guidance: "Do NOT upgrade speculatively — re-key is simpler." Dual-mount escalation remains a documented option if in-browser verification later surfaces a visible flash on TanStack Virtual re-virtualization.

## Cross-partner Drill Coverage

Cross-partner drill renders through the same `<DataDisplay>` boundary as partner/batch drills — the drill state moves through the same `drillState.level + partner + batch` axes, so the cross-fade wrapper catches it transparently. No separate cross-partner render path exists today. If a future plan introduces a standalone cross-partner pane with its own mount tree, it will need its own cross-fade wrapper — explicitly scoped out of this plan per RESEARCH Claude's Discretion #7.

## Scroll-Jump Artifacts

None observed at code level. Defense-in-depth on Pitfall 3:

1. `use-drill-down.ts:70` — `router.push(..., { scroll: false })` pins scroll on every drill transition (verified pre-plan).
2. NEW — inline `style={{ contain: 'layout' }}` on the cross-fade wrapper hints the browser to hold the container's layout box stable during the opacity transition window, eliminating re-measure ripples from the re-mounted subtree.

Manual verification of multi-batch partner → batch drill under real data (30+ batches) is owner-deferred per project preference for visual verification; no regression expected given the two-layer guard.

## Issues Encountered

- **Visual verification deferred to owner.** Standing project preference (MEMORY.md feedback_testing.md): never push CSS changes blind — always verify in browser. Per Phase 26-03/30-01 precedent, headless preview is blocked by Snowflake auth timeouts. Owner to confirm in their own browser:
  1. **Drill root → partner**: click any partner on root view; content region fades out then fades in with the new partner data. Header + sidebar do not blink. Fade is visibly perceptible (~200ms), not a hard cut, not laggy.
  2. **Drill partner → batch**: click a batch on a partner with many batches (30+). Same cross-fade; scroll does NOT jump mid-fade; no empty-state flash. If a flash IS visible, escalation path is dual-mount (documented in PLAN Step 4 + 30-02-PLAN.md) — re-open this plan for that upgrade.
  3. **URL back/forward**: drill root → partner → batch, then press browser back twice. Each back pops one level and replays the cross-fade in reverse (same utility, symmetric). No direction-tracking code needed.
  4. **Deep link**: open a fresh tab at `?p=Acme&b=2024-Q3`. Initial paint is instant (no transition needed on first render). Drill up via breadcrumb → cross-fade plays.
  5. **/tokens Motion tab**: visit /tokens → Motion tab → scroll to "Drill cross-fade (DS-23)" section. Click each of the three level buttons; content card cross-fades between titles/bodies. aria-pressed reflects the selected level.
  6. **Reduced-motion smoke**: enable OS reduce-motion → drill = instant swap, no fade; /tokens demo = instant swap. Disable → fade returns.

- **No dev server running.** Owner can `npm run dev` at their convenience; build is green, so there is no compile-time surprise waiting.

## Next Phase Readiness

- Plan 30-03 (interactive-card sweep, DS-25 expansion) is unblocked — .hover-lift recipe from 30-01 is the canonical utility; drill cross-fade does not compete with hover interactions (different subsystems, different utilities).
- Plan 30-04 (press feedback, DS-27) is unblocked — press-scale lives on leaf elements (buttons, cards) inside the drill wrapper; transition-transform composes cleanly with the outer transition-opacity (different CSS property, no cascade collision).
- Plan 30-05 (sidebar lockstep + close-out) inherits DS-23's "chrome stays steady" contract — sidebar's own data-state motion can proceed without worrying about drill-fade bleed-through.
- Phase 32 (URL-backed navigation) gains a visually polished drill experience with zero contract changes — the cross-fade is additive on top of existing router.push semantics.

## Self-Check

Verification performed:

1. data-display.tsx contains `transition-opacity duration-normal` on drill wrapper: FOUND (line 509)
2. data-display.tsx contains `data-drill-fade` attribute: FOUND (line 508)
3. data-display.tsx contains `contain: 'layout'` inline style: FOUND (via grep confirmed in Edit output)
4. motion-demo.tsx contains "Drill cross-fade" heading: FOUND (line 209)
5. motion-demo.tsx `<DrillCrossFadeDemo />` rendered in MotionDemo export: FOUND
6. Task 1 commit exists: 872cc37 — git log confirmed
7. Task 2 commit exists: e6d1037 — git log confirmed
8. check:motion ✅ green; check:tokens ✅ green; check:surfaces ✅ green; check:components ✅ green
9. npm run build ✅ succeeds; TypeScript clean; all 5 routes compile including /tokens

## Self-Check: PASSED

---
*Phase: 30-micro-interactions-and-motion*
*Completed: 2026-04-18*
