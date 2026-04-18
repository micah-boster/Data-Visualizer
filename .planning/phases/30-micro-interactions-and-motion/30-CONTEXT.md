# Phase 30: Micro-Interactions & Motion - Context

**Gathered:** 2026-04-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Apply purposeful motion to state changes across the app, using Phase 26's existing motion tokens (`--duration-quick/normal/slow`, `--ease-default/spring/decelerate`) and Phase 28's already-defined static-rest + hover-elevation pairs. Scope is strictly DS-23 through DS-28:

1. **DS-23** Drill-down level transitions animate (not hard cut)
2. **DS-24** Chart expand/collapse animates height with content fade
3. **DS-25** Interactive cards translate-Y lift + shadow step on hover
4. **DS-26** Buttons micro-scale feedback (hover + active)
5. **DS-27** Skeleton → content smooth reveal
6. **DS-28** Sidebar open/close smooth width transition

A11Y-05 (`prefers-reduced-motion`) is formally owned by Phase 33 but ships here — full-disable compliance is baked into every transition on first write (cheaper than a retrofit sweep). Motion tokens are primitives from Phase 26; any gaps surface in this phase's pilots. Visual polish (gradient dividers, focus glows, dark-mode hairlines, border sweep) remains Phase 31.

</domain>

<decisions>
## Implementation Decisions

### Motion character & feel

- **Personality: Notion-restrained.** Matches Phase 28's "medium/soft" elevation intensity. Motion is visible and readable, never performs for its own sake. Cards lift, things fade, nothing bounces for decoration.
- **Default duration for simple state changes = `--duration-quick` (100ms).** Hover tint, focus, bg swaps, border-color shifts. Keeps UI feeling responsive.
- **Easing assignment:**
  - `--ease-default` for state changes (tint, color, opacity).
  - `--ease-spring` reserved for **lift moments** — card hover, drill transitions, press release.
  - `--ease-decelerate` for **arrivals** — skeleton → content, sidebar opening, new content entering.
- **Motion is mostly functional, small flourishes allowed.** Every motion should reinforce meaning (direction of drill, arrival of content, lift-on-hover as interactivity signal). Decorative flourishes permitted only on empty states, first-load moments, and signature interactions — not in the main work surface.

### Drill-down transition (DS-23)

- **Style: cross-fade only.** Old view fades out, new view fades in simultaneously. No slide, no scale. Works identically for forward nav and URL back-button (Phase 32) — reversible at any point.
- **Scope: content region + KPI strip fade together.** Header, sidebar, and sticky chrome stay mounted and steady. The body (table, charts) and the top KPI strip fade as one unit because KPI values are exactly what changes on drill — they belong in the content transition, not the chrome.
- **No stagger.** All children arrive together as one composed scene. Faster to parse, simpler to implement, matches Notion-restrained personality.
- **Duration: `--duration-normal` (200ms).** Drill is a larger context change than hover — wants a visible beat, short enough to chain quickly when navigating partner-after-partner.
- **URL-back compatibility:** because cross-fade is symmetric and direction-agnostic, browser back/forward replays the transition identically — no direction tracking needed.

### Card hover (DS-25)

- **Magnitude: subtle.** Translate-Y -1px + shadow step up. Phase 28 already defined the two elevation states (rest = `elevation-raised`, hover target = `elevation-overlay` for interactive cards) — Phase 30 only animates between them.
- **Scope: interactive cards only.** KPI cards that drill, chart cards that expand, table rows that open panels. Static cards (non-interactive containers) don't lift.
- **Transition properties:** `transform`, `box-shadow`. Duration `--duration-quick`, easing `--ease-spring` (the "physical object" moment).

### Button micro-scale (DS-26)

- **Scope: primary and secondary buttons only.** Icon-chip buttons in the unified-toolbar and ghost buttons in dropdowns do **not** scale — bg tint alone handles their feedback. Prevents a twitchy toolbar when mousing across adjacent icon chips.
- **Hover: scale(1.01)** — per roadmap acceptance criteria.
- **Active: scale(0.98)** — per roadmap acceptance criteria. The tactile press moment uses `--ease-spring` so the release feels sprung.
- **Transition property:** `transform`. Duration `--duration-quick` or a new `--duration-micro` if pilot testing shows 100ms feels laggy for taps.

### Skeleton → content reveal (DS-27)

- **Cross-fade with ~150ms overlap.** Skeleton fades out while content fades in, brief overlap window. Same mental model as drill cross-fade — consistency across the app's "content appearing" moments.
- **Easing:** `--ease-decelerate` for incoming content (arrival), `--ease-default` for outgoing skeleton.
- **Shimmer is Phase 29 territory** — skeleton visual is defined there; Phase 30 owns how the skeleton leaves.

### Sidebar open/close (DS-28)

- **Lockstep width animation.** Sidebar width and main-content margin animate together at `--duration-normal`. Sidebar contents stay visible throughout the transition (no fade).
- **May need `will-change: width, margin`** to avoid reflow jank on the main content area. Pilot-driven.
- **Easing:** `--ease-decelerate` for opening (content arriving), `--ease-default` for closing.

### Reduced-motion policy

- **Full disable when `prefers-reduced-motion: reduce` is set.**
  - All `transition-duration` values → `0ms` via a global media query override.
  - All `translate` / `scale` → identity transforms (no lift, no scale).
  - Cross-fades become instant swaps (opacity transition duration = 0).
  - Skeleton → content becomes a hard swap at the moment data arrives.
- Ships A11Y-05 in Phase 30 (ahead of Phase 33) to avoid a retrofit sweep later. Matches the "motion must be purposeful" ethos — if motion isn't welcome, skip it entirely.

### Token discipline

- **CI grep guard: `check:motion`** — mirrors Phase 27's `check:tokens` and Phase 28's surface guard.
  - Forbids `duration-[Nms]`, `ease-[cubic-bezier(…)]`, inline `style={{ transitionDuration: … }}`, `animation-duration-[…]`, raw `transition: … Nms …`.
  - Requires `--duration-*` / `--ease-*` tokens (or Tailwind utilities that resolve to them).
  - Runs in the CI check that already blocks on token regressions.
- **Token additions are pilot-first.** Likely gaps: `--duration-micro` (~60ms) for button press if 100ms feels laggy, `--ease-enter` / `--ease-exit` if `--ease-decelerate` / `--ease-default` don't cover every arrival/departure cleanly. Added in the plan where first needed, surfaced to `/tokens` page, added to Phase 26 foundation file.
- **Semantic-over-raw stays the rule** (same as Phase 27 typography, Phase 28 elevation): if a call site wants a custom easing, the token is wrong — not the call site.

### Plan cadence

- **Pilot → verify → sweep**, matching Phase 26 and Phase 28 rhythm and the `feedback_testing` memory (test visually, never ship blind).
- Expected breakdown (~5 plans, planner to confirm):
  1. **Motion foundation** — `prefers-reduced-motion` global override, `check:motion` CI guard, `/tokens` page motion section, card-hover pilot (DS-25 on KPI cards).
  2. **Drill transition** (DS-23) — cross-fade on drill level change, URL-back compatible, covers main drill + cross-partner drill.
  3. **Buttons + cards sweep** (DS-25 full sweep across all interactive cards, DS-26 across primary/secondary buttons).
  4. **Skeleton + chart expand/collapse** (DS-27 + DS-24).
  5. **Sidebar + cleanup** (DS-28 + any final `/tokens` motion additions + grep-guard enforcement verification).
- Planner picks first pilot; can collapse or split plans based on surface area found during research.

### Claude's Discretion

- **Chart expand/collapse strategy (DS-24)** — explicit-height CSS transition vs `grid-template-rows: 0fr → 1fr` trick vs fixed-snap heights. Pilot-driven; must handle unknown content heights cleanly.
- **Table row hover feedback** — bg tint transition is already implied by Phase 28's "smooth background tint transition" language (DS-33, Phase 31). Phase 30 may add duration/easing wiring; full treatment is Phase 31.
- **Drillable row hover cue** — whether drillable rows get an additional affordance signal (subtle chevron fade-in, cursor, edge tint). Pilot or defer to polish.
- **Press-state de-elevation on cards** — whether the `-1px` translate returns to 0 on active/press (giving a "push down" feel) or just releases on mouse-up. Pilot preference.
- **Motion variants by surface depth** — whether `elevation-floating` (dialogs, modals, command palette) get a distinct entry motion (scale-in + fade vs pure fade). Claude picks.
- **Exact pilot order** — first surface to pilot the motion foundation on. KPI-card hover is a strong candidate (low risk, high visibility, already has the Phase 28 elevation states).
- **Whether `--duration-micro` and `--ease-enter`/`--ease-exit` get added** — determined by pilot need. Don't add speculatively.
- **Cross-partner view drill transitions** — whether cross-partner drill-in uses the same cross-fade or gets its own treatment given the different view shape. Default to same cross-fade unless pilot shows it reads poorly.

</decisions>

<specifics>
## Specific Ideas

- **Phase 26 / 28 rhythm is the reference.** Foundation + pilot + sweep + /tokens doc + enforcement. Don't invent a new cadence — the three-phase design track has a working pattern.
- **Phase 28 left hover elevation states explicitly for Phase 30 to animate.** "Static rest shadows are defined in Phase 28; the timing/transition behavior is Phase 30's job, but the two hover elevation states must be defined here so 30 has something to animate between." — Phase 28 CONTEXT. Honor that handoff: Phase 30 wires the transition between already-defined states; it does not redefine the states.
- **URL-backed drill (Phase 32) must keep working.** Back/forward through browser history must not break the cross-fade. Symmetric direction-agnostic cross-fade was chosen partly for this reason — any URL navigation (back, forward, deep-link, saved-view drill) plays the same transition.
- **`prefers-reduced-motion` compliance is non-negotiable.** Full disable, not partial reduce. Users who set the preference often have vestibular issues where even a 1px translate is disturbing.
- **Motion tokens own character.** If a call site wants to write `duration-150 ease-[cubic-bezier(…)]`, the token catalog is incomplete — fix the catalog, not the call site. Same discipline that made Phase 27 typography and Phase 28 surfaces hold.
- **The grep guard is the tripwire, not the test.** Phase 27 and Phase 28 both proved that without CI enforcement, token discipline decays. `check:motion` is cheap to write and pays recurring dividends.

</specifics>

<deferred>
## Deferred Ideas

- **Gradient dividers, dark-mode hairline highlights, focus glow rings, border opacity sweep, scrollbar polish** — Phase 31 (Visual Polish).
- **Table row hover bg tint transition (DS-33)** — listed under Visual Polish (Phase 31). Phase 30 may wire duration/easing for it if it overlaps, but the full treatment is Phase 31's scope.
- **Full accessibility audit (ARIA, keyboard nav, contrast, axe-core)** — Phase 33. Only A11Y-05 (`prefers-reduced-motion`) ships in Phase 30.
- **Storybook / motion-specific visual regression tests** — same call as Phase 29: `/tokens` page + grep guard cover the ground, no new tooling.
- **Route-level page transitions** — app is drill-in-place; no route-level transitions needed. If the app ever adds true multi-route navigation (settings page, etc.), revisit.
- **Parallax, scroll-linked, or scroll-triggered motion** — outside Notion-restrained personality; not needed for a data-dense analytics tool. Rejected, not deferred.
- **Rich entry choreography for dialogs/command-palette** — marked as Claude's Discretion above. If a distinct treatment emerges from pilots, it ships with Phase 30; otherwise it stays on the default cross-fade and can be revisited in polish.

</deferred>

---

*Phase: 30-micro-interactions-and-motion*
*Context gathered: 2026-04-18*
