---
phase: 30-micro-interactions-and-motion
plan: 05
subsystem: motion
tags: [motion, sidebar, shadcn, tokens-demo, DS-28, phase-close]
dependency_graph:
  requires:
    - 30-01 # motion tokens + check:motion guard + A11Y-05 reduced-motion override + .hover-lift
    - 30-02 # drill cross-fade (composition reference for /tokens aggregator)
    - 30-03 # button press-scale + DataPanel.interactive (referenced in aggregator)
    - 30-04 # chart expand/collapse + skeleton cross-fade (referenced in aggregator)
  provides:
    - sidebar-lockstep # DS-28 — duration-normal width transition with direction-aware easing on shadcn Sidebar primitive
    - phase-30-motion-suite # full DS-23..28 + A11Y-05 coverage live on /tokens Motion tab
    - ui-primitive-retarget-precedent # single shadcn primitive (sidebar.tsx) hand-retargeted while allowlist keeps ui/** wholesale per Phase 28 precedent
  affects:
    - src/components/ui/sidebar.tsx # only shadcn ui/ primitive currently on motion tokens
    - src/components/tokens/motion-demo.tsx # /tokens Motion tab — canonical reference surface
    - scripts/check-motion.sh # allowlist-notes comment header documents ui/** carve-out rationale
tech_stack:
  added: []
  patterns:
    - "Direction-aware easing via group-data-[state=expanded]:ease-decelerate + group-data-[state=collapsed]:ease-default — shadcn Sidebar carries data-state on outer <div>, child elements use Tailwind group-data variants to conditionally pick arrival vs departure curve"
    - "Flex-driven lockstep — sibling width change inside a flex row carries main-content margin in lockstep without explicit transition on the inset; no will-change, no margin transition needed for this primitive"
    - "ui/** wholesale allowlist — Phase 28 precedent preserved. sidebar.tsx retargeted manually; sheet.tsx / popover.tsx / dialog.tsx carry known shadcn motion debt. Future sweep can pick these off one primitive at a time"
key_files:
  created:
    - .planning/phases/30-micro-interactions-and-motion/30-05-SUMMARY.md
  modified:
    - src/components/ui/sidebar.tsx
    - src/components/tokens/motion-demo.tsx
    - scripts/check-motion.sh
key_decisions:
  - "SidebarInset (line 305) left UNTOUCHED — flex-driven margin shift is visually smooth per human-verify check #7; no explicit transition-[margin,width] added. Reopen only if future layout change breaks the lockstep (e.g., absolute-positioned inset)."
  - "SidebarRail (line 292) transition-all ease-linear left UNTOUCHED — no numeric duration hardcode, out of plan scope per Phase 27/28 scope-discipline precedent. Carries the same ui/** allowlist rationale."
  - "Option A (ui/** wholesale allowlist) shipped over Option B (per-file allowlist). Matches Phase 28 precedent; sheet.tsx/popover.tsx/dialog.tsx keep shadcn defaults until a dedicated sweep phase. scripts/check-motion.sh comment header documents the carve-out."
  - "Human-verify checkpoint approved all 9 checks on first pass — zero regressions surfaced, no Plan 30-06 gap-closure needed."
requirements_completed:
  - DS-28
  - A11Y-05  # shipped in 30-01; plan frontmatter lists it as part of the Phase 30 coverage set
  - DS-23    # shipped in 30-02; listed in plan frontmatter
  - DS-24    # shipped in 30-04; listed in plan frontmatter
  - DS-25    # shipped in 30-01 + 30-03; listed in plan frontmatter
  - DS-26    # shipped in 30-03; listed in plan frontmatter
  - DS-27    # shipped in 30-04; listed in plan frontmatter
metrics:
  duration: ~4 min (Tasks 1+2 autonomous) + human-verify checkpoint
  tasks_completed: 3
  files_modified: 3
  completed: 2026-04-18
---

# Phase 30 Plan 05: Sidebar Lockstep + Phase 30 Close-Out Summary

**DS-28 sidebar lockstep retargeted on shadcn Sidebar primitive via group-data-[state] direction-aware easing at --duration-normal; /tokens Motion tab gains SidebarLockstepDemo + Phase 30 aggregator; human-verify checkpoint signed off on the full DS-23..28 + A11Y-05 motion suite end-to-end.**

## Performance

- **Duration:** ~4 min autonomous + human-verify window
- **Completed:** 2026-04-18
- **Tasks:** 3 (2 autonomous + 1 human-verify checkpoint)
- **Files modified:** 3

## Accomplishments

- **DS-28 sidebar lockstep** — lines 221 (sidebar-gap), 233 (sidebar-container), 403 (group-label) of `src/components/ui/sidebar.tsx` retargeted from `transition-[width] duration-200 ease-linear` to `transition-[width] duration-normal group-data-[state=expanded]:ease-decelerate group-data-[state=collapsed]:ease-default`. Opening uses arrival curve (decelerate); closing uses state-change default. Main content shifts in lockstep via existing flex sibling layout — no additional transition needed on SidebarInset.
- **/tokens Motion tab close-out** — SidebarLockstepDemo (DS-28) and Phase30Aggregator sections landed in `src/components/tokens/motion-demo.tsx`. Aggregator lists all 7 coverage items (DS-23..28 + A11Y-05) with back-references to in-page sections; anchor IDs `ds-23` and `ds-28` added for deep-linking.
- **Allowlist rationale documented** — `scripts/check-motion.sh` header gains allowlist-notes comment explaining ui/** wholesale carve-out, sidebar.tsx manual retarget, and other primitives' continued shadcn debt. No logic change to the script itself.
- **Phase 30 close-out** — human-verify checkpoint APPROVED on first pass. All 9 browser-verified checks passed (/tokens demos, KPI hover, drill cross-fade, chart expand/collapse, button press, skeleton cross-fade, sidebar lockstep, reduced-motion, all guards + build green).

## Task Commits

1. **Task 1 — Retarget sidebar.tsx motion to tokens (DS-28)** — `92cc355` (refactor)
2. **Task 2 — /tokens Motion tab: sidebar lockstep demo + Phase 30 aggregator** — `671f2b7` (feat)
3. **Task 3 — Human-verify checkpoint** — APPROVED (no commit; sign-off only)

**Plan metadata + Phase 30 close-out:** final commit ships SUMMARY.md + STATE.md + ROADMAP.md + REQUIREMENTS.md.

Intermediate STATE commit during pause: `4179d81` (docs(30-05): STATE pause at human-verify checkpoint).

## Files Created/Modified

- `src/components/ui/sidebar.tsx` — three call sites retargeted (lines 221, 233, 403). data-state carrier is the outer wrapper at line 211 (verified during execution); child elements use Tailwind `group-data-[state=expanded]:` / `group-data-[state=collapsed]:` variants to pick direction-aware easing.
- `src/components/tokens/motion-demo.tsx` — two final sections added: SidebarLockstepDemo (faux flex two-column with toggle Button → demo sidebar width w-48 ↔ w-12 at duration-normal with data-state-driven easing; sidebar contents use `whitespace-nowrap` so they don't reflow during the width tween) and Phase30Aggregator (bullet list with DS-23..28 + A11Y-05 labels pointing back to in-page sections).
- `scripts/check-motion.sh` — comment header gains ALLOWLIST NOTES block: ui/** (shadcn primitives, sidebar.tsx manually retargeted, sheet/popover/dialog retain shadcn debt per Phase 28 precedent), tokens/** (motion-demo inline-style 9-combo iteration), app/tokens/** (token reference page).

## Decisions Made

**1. SidebarInset left untouched (flex-driven lockstep verified sufficient).**
Plan's Step 3 offered two paths: leave SidebarInset's margin shift to the existing flex sibling layout, OR add an explicit `transition-[margin,width] duration-normal group-data-[state=expanded]:ease-decelerate group-data-[state=collapsed]:ease-default` to the inset. Tasks 1+2 committed the flex-driven path pending human-verify signal. Check #7 ("Sidebar lockstep") passed cleanly — main content shifts smoothly in both directions with no reflow jitter — so the untouched path ships. Escalate to explicit transition only if a future layout change (e.g., absolute-positioned SidebarInset) breaks the lockstep.

**2. SidebarRail (line 292) transition-all ease-linear out of plan scope.**
Line 292 carries `transition-all ease-linear` with no numeric duration hardcode, so it doesn't violate the `duration-\d+` check:motion pattern. Leaving it untouched mirrors Phase 27/28 scope-discipline precedent: don't sweep beyond plan scope just because an adjacent call site exists. If a future plan chooses to sweep ease-linear usage across ui/** primitives, SidebarRail is a natural inclusion.

**3. Option A (wholesale ui/** allowlist) shipped over Option B (per-file allowlist).**
shadcn primitives beyond sidebar.tsx (sheet.tsx, popover.tsx, dialog.tsx at minimum) carry their own hardcoded `duration-200 ease-linear` patterns. Removing ui/** from the allowlist would either require retargeting all of them in this plan (scope creep) or adding per-file allowlist entries (more churn than a single carve-out). Phase 28 established the precedent that ui/** carries known shadcn motion debt as a group; this plan preserves that. `scripts/check-motion.sh` header now documents the rationale inline so future Claude or Micah doesn't need to re-derive it.

**4. Human-verify checkpoint approved on first pass.**
All 9 checks passed cleanly — no issues surfaced, no Plan 30-06 gap-closure needed. This is the first time in Phase 30 that every motion surface has been co-verified in a single browser session with reduced-motion toggling. The `/tokens` Motion tab served as the primary reference surface; the in-app verification (KPI hover, drill, chart toggle, button press, skeleton reveal, sidebar toggle) confirmed each demo matches production behavior 1:1.

## Deviations from Plan

None — plan executed as written. Scope notes captured in `key_decisions`.

- SidebarInset decision: human-verify ratified the flex-driven path documented in Tasks 1+2 commit messages; no post-verify patch needed.
- Line 292 scope discipline: documented decision to leave out, not a deviation.
- Allowlist shape: Option A shipped as the plan's RECOMMENDED path.

## Issues Encountered

None during execution. Human-verify checkpoint returned "approved" on first pass with all 9 checks green.

## /tokens Motion Tab — Final Section Order

The Motion tab is now the authoritative reference surface for every Phase 30 motion recipe. Section order as shipped:

1. **Reduced motion** (A11Y-05) — explanatory text + live media-query indicator
2. **Duration × Easing** (DS-04 from Phase 26) — 9-combo inline-style grid
3. **Card hover lift** (DS-25) — StatCard.interactive pilot
4. **Drill cross-fade** (DS-23) — re-key demo with `#ds-23` anchor
5. **Button press scale** (DS-26) — default + secondary variants + opt-out examples
6. **Panel hover lift** (DS-25) — DataPanel.interactive
7. **Chart expand / collapse** (DS-24) — grid-template-rows demo
8. **Skeleton → content** (DS-27) — dual-mount 150ms overlap demo
9. **Sidebar lockstep** (DS-28, NEW) — faux flex two-column with `#ds-28` anchor
10. **Phase 30 motion surfaces** (NEW aggregator) — bullet list with DS-23..28 + A11Y-05

## Known Debt

shadcn primitives beyond sidebar.tsx still carry hardcoded `duration-200 ease-linear`:
- `src/components/ui/sheet.tsx` — overlay + content slide-in
- `src/components/ui/popover.tsx` — open/close
- `src/components/ui/dialog.tsx` — overlay fade + content zoom-in
- Likely others (tooltip, dropdown-menu) carry similar shadcn defaults

These are covered by the ui/** wholesale allowlist; a future dedicated plan can sweep them with the same retarget pattern sidebar.tsx adopted here. Not scoped to Phase 30.

## Phase 30 Coverage Summary

Every motion requirement in v4.0 now shipped and user-verified:

| ID | Surface | Plan | Mechanism |
|----|---------|------|-----------|
| DS-23 | Drill cross-fade | 30-02 | Composite re-key + `transition-opacity duration-normal ease-default` + `contain: layout` scroll-jump guard |
| DS-24 | Chart expand/collapse | 30-04 | `grid-template-rows 0fr↔1fr` with overflow-hidden inner guard (Pitfall 8) |
| DS-25 | Card/panel hover lift | 30-01 + 30-03 | `.hover-lift` utility; StatCard.interactive + DataPanel.interactive prop surfaces |
| DS-26 | Button press scale | 30-03 | `hover:scale-[1.01] active:scale-[0.98]` on default + secondary only; `not-aria-[haspopup]` opt-out; `data-press-scale` attr for reduced-motion neutralize |
| DS-27 | Skeleton → content | 30-04 | Dual-mount 150ms overlap window with `ease-decelerate` arrival + `ease-default` skeleton departure |
| DS-28 | Sidebar lockstep | 30-05 | `transition-[width] duration-normal` with `group-data-[state=expanded]:ease-decelerate` + `group-data-[state=collapsed]:ease-default` |
| A11Y-05 | Reduced motion | 30-01 | Top-level `@media (prefers-reduced-motion: reduce)` override collapsing all `transition-duration` + `animation-duration` to 0 with `!important` |

**Enforcement:** `npm run check:motion` (scripts/check-motion.sh, 5 checks) blocks regressions on future PRs — POSIX grep over transition/duration/easing patterns with scope-discipline allowlist for ui/**, tokens/**, and app/tokens/**.

## Next Phase Readiness

- **Phase 30 ready to close** via `/gsd:verify-phase 30` or equivalent close-out workflow.
- **Next phase:** Phase 31 — Visual Polish (DS-29..34): gradient-fade dividers, dark-mode hairline highlights, focus-within glow rings, border-opacity standardization, table row hover tint, scrollbar styling.
- **Phase 31 context ready** — `.planning/phases/31-visual-polish/` context already captured (see prior commit `ff53cb1`).
- **No blockers.** All five guards green (check:motion, check:tokens, check:surfaces, check:components, check:type-tokens). Build green. No motion JS libraries introduced (Out-of-Scope honored).

## Commits

- `92cc355` — refactor(30-05): retarget sidebar.tsx motion to tokens (DS-28)
- `671f2b7` — feat(30-05): /tokens sidebar lockstep demo + Phase 30 aggregator (DS-28)
- `4179d81` — docs(30-05): STATE pause at human-verify checkpoint (intermediate)

## Self-Check: PASSED

- FOUND: src/components/ui/sidebar.tsx
- FOUND: src/components/tokens/motion-demo.tsx
- FOUND: scripts/check-motion.sh
- FOUND: .planning/phases/30-micro-interactions-and-motion/30-05-SUMMARY.md
- FOUND commit: 92cc355 (Task 1)
- FOUND commit: 671f2b7 (Task 2)

---
*Phase: 30-micro-interactions-and-motion*
*Completed: 2026-04-18*
