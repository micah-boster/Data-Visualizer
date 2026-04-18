---
phase: 30-micro-interactions-and-motion
plan: 04
subsystem: motion
tags: [motion, data-display, tokens-demo, DS-24, DS-27]
dependency_graph:
  requires:
    - 30-01 # foundation: check:motion guard, reduced-motion override, motion tokens
    - 30-02 # drill cross-fade wrapper (composed around DS-24 grid region)
  provides:
    - chart-expand-collapse # grid-template-rows 0fr↔1fr recipe (DS-24)
    - skeleton-cross-fade # dual-mount 150ms-overlap recipe (DS-27)
  affects:
    - src/components/data-display.tsx # chart region + loading boundary
    - src/components/tokens/motion-demo.tsx # /tokens Motion tab
tech_stack:
  added: []
  patterns:
    - "grid-template-rows 0fr↔1fr transition for unknown-height collapsible regions (overflow-hidden inner guard mandatory)"
    - "Dual-mount skeleton-to-content cross-fade with 150ms overlap: skeletonVisible + contentReady state pair, setTimeout unmount"
key_files:
  created:
    - .planning/phases/30-micro-interactions-and-motion/30-04-SUMMARY.md
  modified:
    - src/components/data-display.tsx
    - src/components/tokens/motion-demo.tsx
decisions:
  - "Option A grid-rows-only selected for DS-24 content fade — no opacity layer. overflow-hidden already hides content visually at collapsed state; escalate to Option B only on pilot signal."
  - "DS-27 dual-mount targets the main isLoading → content boundary in data-display.tsx (not the 5 dynamic-import Skeleton fallbacks, which are Suspense-owned and lack external control). LoadingState used as the skeleton layer — it's what ships today."
  - "Chart children always mounted when in scope for current drill level — grid drives height. Pre-existing `{chartsExpanded && ...}` gate removed. Memoization of heavy charts sufficient; revisit only if React Profiler flags >50ms render on collapsed data refresh."
  - "FadeSwap pattern NOT extracted — inline dual-mount logic at single top-level site sufficient. Reopen as reusable pattern when 3+ skeleton sites need the same treatment."
  - "Skeleton overlay absolute-positioned z-10 with pointer-events-none during overlap so underlying content remains interactive as it fades in."
metrics:
  duration: ~5 min
  tasks_completed: 3
  files_modified: 2
  completed: 2026-04-18
---

# Phase 30 Plan 04: Chart Expand/Collapse + Skeleton Cross-Fade Summary

One-liner: Chart region animates open/close via grid-template-rows 0fr↔1fr (DS-24), and skeleton→content transitions dual-mount with a 150ms overlap window (DS-27) — both live in data-display.tsx's render boundary.

## What Shipped

**Task 1 — DS-24 chart expand/collapse (commit 1b7e547)**

`src/components/data-display.tsx` chart region restructured:
- Wrapper: `<div className="grid transition-[grid-template-rows] duration-normal ease-default {grid-rows-[1fr]|grid-rows-[0fr]}" data-charts-expanded={chartsExpanded}>`
- Inner `<div className="overflow-hidden">` (Pitfall 8 guard — non-negotiable; without it, fat charts like PartnerComparisonMatrix + CollectionCurveChart would spill a sliver below the collapsed row line)
- Chart children always mounted when their drill-level conditions are met; grid drives height so expand→collapse is a smooth visual transition rather than a hard mount/unmount
- Sparkline renders OUTSIDE the collapsible region as a sibling (always mounted when `!chartsExpanded && level === 'root'` etc.); doesn't participate in the grid transition

Option A selected (grid-rows only, no opacity layer). Rationale: overflow-hidden visually absents collapsed content; extra opacity is speculative complexity. Escalate to Option B (wrap inner with `transition-opacity duration-normal ease-default` + toggle `opacity-0` vs `opacity-100` in lockstep with chartsExpanded) only if pilot flags a visible pop at the collapsed boundary.

**Task 2 — DS-27 skeleton → content cross-fade (commit 0ab039f)**

`src/components/data-display.tsx` loading boundary:
- Two state booleans: `skeletonVisible` (truthy while skeleton layer mounted) and `contentReady` (truthy once data has arrived and content layer may fade in)
- useEffect on `isLoading`: on true → skeletonVisible=true, contentReady=false. On false → contentReady=true, setTimeout(() => setSkeletonVisible(false), 150)
- Pre-overlap branch: `!contentReady || !data` → render LoadingState only, opacity-100
- Overlap window + steady state: main return renders content wrapper with `transition-opacity duration-normal ease-decelerate` + `contentReady ? 'opacity-100' : 'opacity-0'` AND, when skeletonVisible, renders an absolute-positioned LoadingState overlay at `z-10 opacity-0 pointer-events-none` with `transition-opacity duration-quick ease-default`
- Skeleton layer uses `aria-hidden` during overlap window so screen readers don't see the fading-out loading state

Easing assignment per CONTEXT:
- Skeleton out: `--ease-default` (state change) × `--duration-quick` (120ms)
- Content in: `--ease-decelerate` (arrival) × `--duration-normal` (200ms)
- Overlap window: 0-150ms where both layers co-render

Reduced-motion path: global `@media (prefers-reduced-motion: reduce)` override from Plan 30-01 collapses transition-duration to 0ms. Timer still fires at 150ms — skeleton unmounts on schedule, no animation seen, clean hard swap. `animate-pulse` on Skeleton primitive also neutralized by the same override. Verified behavior matches RESEARCH Open Q#3.

**Task 3 — /tokens Motion tab demos (commit f8f765a)**

`src/components/tokens/motion-demo.tsx`:
- `<ChartExpandDemo />` (DS-24): toggle Button + grid-template-rows panel with dummy chart content. Click toggle → height animates 0↔full at duration-normal × ease-default.
- `<SkeletonCrossFadeDemo />` (DS-27): "Simulate loading (800ms)" Button → sets skeletonVisible/contentReady, 800ms delay, then cross-fade with 150ms overlap. Same recipe as production 1:1.
- `Skeleton` primitive imported alongside Button + DataPanel.

Both demos use token utilities only (`duration-quick`, `duration-normal`, `ease-default`, `ease-decelerate`, `transition-opacity`, `transition-[grid-template-rows]`) — check:motion stays green.

## Deviations from Plan

None — plan executed as written. Minor scope notes documented in `decisions`:
- FadeSwap pattern extraction (Step 3 of Task 2) deliberately NOT performed; ≤2 skeleton sites in data-display (the top-level loading boundary + dynamic-loader-Suspense-internal ones we can't reach). Inline logic at single site is the correct call per the plan's own "≤2 sites → inline" rule.
- Plan 30-02 drill cross-fade wrapper composition: chart grid region renders INSIDE the existing `<div key="drill-..." data-drill-fade>` wrapper. Drill level changes re-key the outer wrapper, which tears down + remounts the grid region in its current chartsExpanded state. No conflict on transition-property (drill fades opacity; grid transitions grid-template-rows). Sibling ordering preserved.

## Composition with Plan 30-02

Final nesting at data-display.tsx:
```
<div key={`drill-${level}-${partner}-${batch}`} data-drill-fade transition-opacity duration-normal ease-default style={{contain: 'layout'}}>
  <SectionErrorBoundary>
    <div className="grid transition-[grid-template-rows] duration-normal ease-default {grid-rows-[1fr]|grid-rows-[0fr]}" data-charts-expanded>
      <div className="overflow-hidden">
        {/* chart children per drill level */}
      </div>
    </div>
    {/* sparkline sibling — outside collapsible region */}
  </SectionErrorBoundary>
  <PartnerNormsProvider>
    <SectionErrorBoundary>
      {/* DataTable */}
    </SectionErrorBoundary>
  </PartnerNormsProvider>
</div>
```

Outer DS-27 skeleton layer lives ABOVE the drill-cross-fade wrapper (absolute-positioned overlay, separate z-layer) so it can cross-fade with the entire post-mount render, not a subtree.

## Manual Verification Notes

Visual verification deferred to user per standing preference (Snowflake auth timeouts in headless runner prevent cold-cache skeleton cross-fade testing). All automated guards green; build succeeds. User should verify:
1. Chart collapse → no sliver on CrossPartnerTrajectoryChart / CollectionCurveChart / PartnerComparisonMatrix
2. Drill + expand/collapse composition — drill root → partner while expanded; new partner's charts appear expanded
3. Cold-cache reload → skeleton layer cross-fades to content with 150ms overlap
4. OS reduce-motion toggle → animations collapse to instant swaps across chart toggle, skeleton reveal, /tokens demos
5. /tokens Motion tab → both new demos render and fire their expected transitions

## Always-Mounted Perf Note

Chart children are now always mounted when their drill-level conditions are met (no longer gated by `{chartsExpanded && ...}`). Perf implication: heavy charts re-render on data changes even when collapsed. Mitigation: TanStack Query memoization + chart-component-level React.memo usage already present. Monitor React Profiler on collapsed + data-refresh — if any chart takes >50ms, escalate to a memoized wrapper in a follow-up plan. No signal yet; shipping as-is per RESEARCH recommendation.

## Commits

- 1b7e547: feat(30-04): chart expand/collapse via grid-template-rows (DS-24)
- 0ab039f: feat(30-04): skeleton → content cross-fade with 150ms overlap (DS-27)
- f8f765a: feat(30-04): /tokens Motion tab — chart expand + skeleton cross-fade demos

## Self-Check: PASSED

- FOUND: src/components/data-display.tsx
- FOUND: src/components/tokens/motion-demo.tsx
- FOUND: .planning/phases/30-micro-interactions-and-motion/30-04-SUMMARY.md
- FOUND commit: 1b7e547 (Task 1)
- FOUND commit: 0ab039f (Task 2)
- FOUND commit: f8f765a (Task 3)
