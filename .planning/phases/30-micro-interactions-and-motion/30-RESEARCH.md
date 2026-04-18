# Phase 30: Micro-Interactions & Motion - Research

**Researched:** 2026-04-18
**Domain:** CSS motion, Tailwind v4 motion utilities, `prefers-reduced-motion`, POSIX grep CI enforcement
**Confidence:** HIGH (surfaces all located in-repo; Tailwind v4 custom-property auto-emit behavior verified in working code)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Motion character & feel**
- **Personality: Notion-restrained.** Matches Phase 28's "medium/soft" elevation intensity. Motion is visible and readable, never performs for its own sake. Cards lift, things fade, nothing bounces for decoration.
- **Default duration for simple state changes = `--duration-quick` (100ms).** Hover tint, focus, bg swaps, border-color shifts. Keeps UI feeling responsive. (NOTE: actual token value is 120ms per globals.css; CONTEXT said 100ms — see Open Question #1.)
- **Easing assignment:**
  - `--ease-default` for state changes (tint, color, opacity).
  - `--ease-spring` reserved for **lift moments** — card hover, drill transitions, press release.
  - `--ease-decelerate` for **arrivals** — skeleton → content, sidebar opening, new content entering.
- **Motion is mostly functional, small flourishes allowed.** Every motion should reinforce meaning. Decorative flourishes permitted only on empty states, first-load moments, and signature interactions — not in the main work surface.

**Drill-down transition (DS-23)**
- **Style: cross-fade only.** Old view fades out, new view fades in simultaneously. No slide, no scale. Reversible at any point — works for browser back/forward.
- **Scope: content region + KPI strip fade together.** Header, sidebar, and sticky chrome stay mounted and steady. The body (table, charts) and the top KPI strip fade as one unit.
- **No stagger.** All children arrive together as one composed scene.
- **Duration: `--duration-normal` (200ms).**
- **URL-back compatibility:** symmetric cross-fade is direction-agnostic — browser back/forward replays transition identically, no direction tracking needed.

**Card hover (DS-25)**
- **Magnitude: subtle.** Translate-Y -1px + shadow step up.
- **Scope: interactive cards only** (KPI cards that drill, chart cards that expand, table rows that open panels). Static cards don't lift.
- **Transition properties:** `transform`, `box-shadow`. Duration `--duration-quick`, easing `--ease-spring`.
- Phase 28 already defined rest (`elevation-raised`) + hover target (`elevation-overlay`) — Phase 30 only animates between them.

**Button micro-scale (DS-26)**
- **Scope: primary and secondary buttons only.** Icon-chip (unified-toolbar) + ghost buttons (dropdowns) do **not** scale — bg tint alone.
- **Hover: scale(1.01).** **Active: scale(0.98)** with `--ease-spring`.
- **Transition property:** `transform`. Duration `--duration-quick` or a new `--duration-micro` if pilot shows 100ms feels laggy.

**Skeleton → content reveal (DS-27)**
- **Cross-fade with ~150ms overlap.** Skeleton fades out while content fades in.
- **Easing:** `--ease-decelerate` for incoming content, `--ease-default` for outgoing skeleton.
- Shimmer is Phase 29 territory; Phase 30 owns how the skeleton leaves.

**Sidebar open/close (DS-28)**
- **Lockstep width animation.** Sidebar width + main-content margin animate together at `--duration-normal`.
- **May need `will-change: width, margin`** to avoid reflow jank. Pilot-driven.
- **Easing:** `--ease-decelerate` opening, `--ease-default` closing.

**Reduced-motion policy**
- **Full disable when `prefers-reduced-motion: reduce`.**
  - All `transition-duration` → `0ms` via global media query override.
  - All `translate` / `scale` → identity transforms.
  - Cross-fades become instant swaps.
  - Skeleton → content becomes hard swap.
- Ships A11Y-05 here (ahead of Phase 33) to avoid a retrofit sweep.

**Token discipline**
- **CI grep guard: `check:motion`** — mirrors Phase 27's `check:tokens` and Phase 28's `check:surfaces`.
  - Forbids `duration-[Nms]`, `ease-[cubic-bezier(…)]`, inline `style={{ transitionDuration: … }}`, `animation-duration-[…]`, raw `transition: … Nms …`.
  - Requires `--duration-*` / `--ease-*` tokens (or Tailwind utilities that resolve to them).
- **Token additions are pilot-first.** Likely gaps: `--duration-micro` (~60ms), `--ease-enter` / `--ease-exit`. Added in the plan where first needed.
- **Semantic-over-raw stays the rule** (same as Phase 27 typography, Phase 28 elevation).

**Plan cadence**
- **Pilot → verify → sweep**, matching Phase 26 and Phase 28 rhythm.
- Expected breakdown (~5 plans):
  1. **Motion foundation** — `prefers-reduced-motion` global override, `check:motion` CI guard, `/tokens` Motion tab extension, card-hover pilot (DS-25 on KPI cards).
  2. **Drill transition** (DS-23).
  3. **Buttons + cards sweep** (DS-25 full + DS-26).
  4. **Skeleton + chart expand/collapse** (DS-27 + DS-24).
  5. **Sidebar + cleanup** (DS-28 + final `/tokens` + grep-guard enforcement verification).

### Claude's Discretion

- **Chart expand/collapse strategy (DS-24)** — explicit-height CSS transition vs `grid-template-rows: 0fr → 1fr` trick vs fixed-snap heights. Pilot-driven.
- **Table row hover feedback** — duration/easing wiring may land here; full treatment in Phase 31.
- **Drillable row hover cue** — whether drillable rows get an additional affordance signal (subtle chevron fade-in, cursor, edge tint).
- **Press-state de-elevation on cards** — whether `-1px` translate returns to 0 on active/press.
- **Motion variants by surface depth** — whether `elevation-floating` (dialogs, modals, command palette) gets distinct entry motion.
- **Exact pilot order** — KPI-card hover is a strong candidate.
- **Whether `--duration-micro` and `--ease-enter`/`--ease-exit` get added** — pilot-driven.
- **Cross-partner view drill transitions** — whether they reuse the same cross-fade.

### Deferred Ideas (OUT OF SCOPE)

- Gradient dividers, dark-mode hairline highlights, focus glow rings, border opacity sweep, scrollbar polish — **Phase 31**.
- Table row hover bg tint transition (DS-33) — **Phase 31** scope (may touch here if overlapping).
- Full accessibility audit (ARIA, keyboard nav, contrast, axe-core) — **Phase 33**. Only A11Y-05 ships in Phase 30.
- Storybook / motion-specific visual regression tests — same call as Phase 29: `/tokens` + grep guard cover ground.
- Route-level page transitions — app is drill-in-place.
- Parallax, scroll-linked, scroll-triggered motion — **rejected**, not deferred (outside Notion-restrained personality).
- Rich entry choreography for dialogs/command-palette — Claude's Discretion above; default to cross-fade unless pilot shows otherwise.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DS-23 | Drill-down level transitions animate (cross-fade, no hard cut) | Located drill render boundary at `src/components/data-display.tsx:494-532`. `drillState.level` switches the charts + table content; KPI strip is inside `drillState.level === 'partner'` branch at 504-509. Header/sidebar stay mounted — confirmed by drill rendering inside `<SectionErrorBoundary>` inside the main content area, never touching `<Header>` or `<AppSidebar>`. Cross-fade implementation: mount both old+new atop each other with `transition-opacity`, keyed on drill identity. URL-back compat per 32-RESEARCH: `router.push` on drill = browser history entries; symmetric cross-fade needs no direction tracking. |
| DS-24 | Chart expand/collapse animates height with content fade | Located at `src/components/data-display.tsx:494-531`. `chartsExpanded` boolean (state at 129, toggled via `toggleCharts` passed to toolbar at 566) gates the chart region. Current code is a hard mount/unmount. Pattern 1 (grid-template-rows 0fr→1fr, recommended) avoids layout measurement. An existing precedent uses explicit maxHeight at `src/components/anomaly/anomaly-summary-panel.tsx:63` (`transition-all duration-200`). |
| DS-25 | Interactive cards translate-Y -1px + shadow step on hover using Phase 28 elevation-raised → elevation-overlay pair | Phase 28 elevation tokens defined at `src/app/globals.css:92-107` (light) and `:436-451` (dark). StatCard chassis at `src/components/patterns/stat-card.tsx:101` already has `shadow-elevation-raised`. DataPanel chassis at `src/components/patterns/data-panel.tsx:63`. Interactive vs static distinction needs an `interactive` prop on these patterns (or a `hover-lift` utility class). |
| DS-26 | Primary + secondary buttons scale(1.01) on hover / scale(0.98) on active; icon-chip + ghost stay unscaled | Button variants at `src/components/ui/button.tsx:9-34`. Has `transition-all` already. Current `active:not-aria-[haspopup]:translate-y-px` at line 7 is the existing press feedback — will need retuning. Primary = `default` variant, secondary = `secondary` variant (lines 11, 14-15). Ghost/outline/link variants stay un-scaled. `icon-sm`/`icon-xs`/`icon-lg` sizes present — icon-chip = `icon*` sizes, typically rendered with `variant="ghost"` in unified-toolbar. |
| DS-27 | Skeleton → content cross-fade with ~150ms overlap | Skeleton primitive at `src/components/ui/skeleton.tsx` uses `animate-pulse`. Consumers at `data-display.tsx:39-97` (dynamic import loaders), `patterns/stat-card.tsx:212-218` (loading branch), `loading-state.tsx`. Existing pattern: caller renders `<Skeleton />` vs `<Content />` conditional on `loading` boolean. Cross-fade needs both mounted briefly — either via a `<FadeSwap>` pattern component or a CSS opacity transition keyed on a content-ready flag. |
| DS-28 | Sidebar open/close animates width + main-content margin lockstep at --duration-normal | shadcn Sidebar primitive at `src/components/ui/sidebar.tsx`. Current motion: hardcoded `transition-[width] duration-200 ease-linear` at line 221 (sidebar-gap) + line 233 (sidebar-container) + `transition-[margin,opacity] duration-200 ease-linear` at line 403 (group-label). Main content is `<SidebarInset>` (line 305) which has NO transition today — margin shift is driven by sidebar-gap width change inside the flex row. Phase 30 must retarget these utilities from `duration-200 ease-linear` to `duration-normal ease-decelerate` (open) / `ease-default` (close). |
| A11Y-05 | `@media (prefers-reduced-motion: reduce)` disables ALL transitions/transforms globally | Added to `src/app/globals.css`. Existing `@media (prefers-reduced-motion: no-preference)` block at globals.css:562-566 (theme-transition) is the counter-pattern to leverage. Phase 30 adds the inverse `reduce` block that zeroes `transition-duration` and removes translate/scale. |
</phase_requirements>

## Summary

Phase 30 is a **CSS-only motion phase** — no new JS libraries, no Framer Motion (explicitly excluded in REQUIREMENTS.md Out-of-Scope). The entire surface area is already instrumented with Phase 26 motion tokens (`--duration-quick/normal/slow` + `--ease-default/spring/decelerate`) and Phase 28 elevation pairs (`shadow-elevation-raised` → `shadow-elevation-overlay`). Tailwind v4's `@theme` auto-emit behavior from `--duration-*` and `--ease-*` namespaces means `duration-quick`, `ease-spring` etc. are already live utility classes — 16 existing usages across 7 files confirm the wiring works.

The phase is five parallel tracks bound together by a single global `prefers-reduced-motion` override + a POSIX grep CI guard (`check:motion`) modeled verbatim on the three existing Phase 27/28/29 guards. Each micro-interaction (drill cross-fade, chart expand, card hover-lift, button press, skeleton cross-fade, sidebar lockstep) is a local CSS change at a known file location. The risk surface is the shadcn Sidebar primitive — its hardcoded `duration-200 ease-linear` needs token retargeting without regressing the `group-data-[collapsible=*]` state machine.

The pilot-before-sweep cadence has shipped successfully in Phases 26 and 28. The same rhythm applies here: Wave 1 ships motion foundation + one pilot (KPI card hover), Waves 2-4 sweep each DS-23..28 surface, Wave 5 lands enforcement + `/tokens` Motion tab demos + closeout.

**Primary recommendation:** Ship the `prefers-reduced-motion` global override and the `check:motion` grep guard in Wave 1 so every subsequent wave gets automatic A11Y-05 coverage and token-discipline enforcement on first commit — no retrofit pass.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Tailwind v4 | `^4` (via `@tailwindcss/postcss`) | CSS utility layer auto-emitting from `@theme` tokens | Already installed, already generating `duration-quick`/`ease-spring` utilities from globals.css:110-115 tokens |
| CSS `prefers-reduced-motion` media query | native | Accessibility opt-out | W3C Media Queries L5 standard; shipped in every modern browser since ~2018 |
| POSIX `find + grep -nE` | native shell | CI enforcement script | Matches Phase 27 (`check:tokens`), Phase 28 (`check:surfaces`), Phase 29 (`check:components`) precedent — ripgrep NOT guaranteed on dev/CI machines |

**No new dependencies.** REQUIREMENTS.md explicitly excludes `Framer Motion or heavy animation lib — CSS transitions + Web Animations API sufficient for scope`.

### Supporting (already in repo, consumed as-is)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@base-ui/react` | `^1.3.0` | Primitives with data-state attributes for drive CSS transitions | Already powers Dialog (`data-ending-style:opacity-0 data-starting-style:opacity-0 transition`), Popover, Sheet — re-use this mechanism for cross-fades where a primitive is available |
| `lucide-react` | `^1.8.0` | Icons (no motion role) | Ignored for Phase 30 |
| `tw-animate-css` | `^1.4.0` | Keyframe helper (`animate-pulse`, `animate-spin`) | Skeleton pulse already consumes; Phase 30 does NOT add new keyframe animations |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| CSS transitions on `[data-drill-level]` attribute | React Transition Group / react-transition-state | 3rd-party dep; overkill for 200ms cross-fade; doesn't compose with URL-driven drill state. Rejected. |
| `grid-template-rows: 0fr → 1fr` for chart expand | `maxHeight` with measured pixel value | `maxHeight` requires ResizeObserver for dynamic content; grid-rows handles unknown heights natively (Chrome 117+, Safari 17+, Firefox 117+ — all shipped by 2023-09). Recommended. |
| Global `*` selector in reduced-motion override | Per-component `motion-reduce:` variants | Per-component = retrofit risk (Phase 33 regret). Global `*` matches CONTEXT lock ("full disable, no per-component opt-out"). |
| New `--duration-micro` token speculatively | Pilot first; add only if 120ms feels laggy on button press | CONTEXT: "Don't add speculatively." Defer to pilot feedback. |

**Installation:** *None required.*

## Architecture Patterns

### Recommended Project Structure (additions only)

```
src/
├── app/globals.css                           # Add reduced-motion override + `hover-lift` utility (NEW)
├── components/patterns/                      # Phase 29 home; may add `hover-lift` as prop on StatCard/DataPanel
├── components/tokens/motion-demo.tsx          # EXTEND with live demos of each shipped micro-interaction
scripts/
└── check-motion.sh                           # NEW POSIX guard (mirrors check-type-tokens.sh)
package.json                                  # Add "check:motion": "bash scripts/check-motion.sh"
```

No new folders.

### Pattern 1: Tailwind v4 custom motion token auto-emit

**What:** Tailwind v4's `@theme` block auto-emits utility classes from specific namespaces. `--duration-quick: 120ms` becomes `.duration-quick { transition-duration: 120ms }`. `--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1)` becomes `.ease-spring { transition-timing-function: cubic-bezier(...) }`.

**When to use:** Every Phase 30 motion site. Never write `duration-[120ms]` or `transition-duration: var(--duration-quick)` inline — always use the auto-emitted utility.

**Example (verified in-repo, `src/components/patterns/stat-card.tsx:101`):**
```tsx
// Source: StatCard chassis (already shipped)
const CARD_CLASSES =
  'rounded-lg bg-surface-raised p-card-padding shadow-elevation-raised transition-colors duration-quick ease-default';
```

**Verification:** `grep -r "duration-quick" src/` returns 16 hits across 7 files including `src/components/table/table-body.tsx:48` (`transition-colors duration-quick ease-default hover:bg-hover-bg`). The utility is live.

### Pattern 2: Global reduced-motion override

**What:** Single media query in globals.css zeroes all transition/animation durations and neutralizes transforms.

**When to use:** Exactly once, app-wide. Pair with CONTEXT lock "no per-component opt-out."

**Example (to add to `src/app/globals.css`):**
```css
/* Source: modeled on existing @media (prefers-reduced-motion: no-preference) block at globals.css:562-566 */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    transition-duration: 0ms !important;
    transition-delay: 0ms !important;
    animation-duration: 0ms !important;
    animation-delay: 0ms !important;
    animation-iteration-count: 1 !important;
  }
  /* Neutralize lift/scale transforms so the motionless state is also positionless.
     Scope to elements that use Phase 30's hover-lift/press-scale utilities. */
  .hover-lift:hover, .hover-lift:focus-visible {
    transform: none !important;
  }
  [data-press-scale]:active,
  [data-press-scale]:hover {
    transform: none !important;
  }
}
```

**Note on `!important`:** Required because Tailwind utilities have specificity 0,1,0 and inline `style={transform: ...}` always wins unauthored. The `web.dev` article warns that duration hacks "are not guaranteed on all websites" — we're using `transition-duration: 0ms` + transform override, which IS guaranteed (no Web Animations API usage in this codebase, confirmed by grep: zero `element.animate(` call sites).

### Pattern 3: Chart expand/collapse via `grid-template-rows`

**What:** Replace `{expanded && <Charts />}` conditional mount with a container that uses `grid-template-rows: 1fr` (expanded) / `0fr` (collapsed) + inner `overflow: hidden`. Transitioning `grid-template-rows` handles unknown content heights natively.

**When to use:** DS-24 chart expand/collapse at `data-display.tsx:494-531`.

**Example:**
```tsx
// Source: CSS Grid trick, shipped in Chrome 117, Safari 17, Firefox 117 (2023-09+)
<div
  className={cn(
    'grid transition-[grid-template-rows] duration-normal ease-default',
    chartsExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
  )}
>
  <div className="overflow-hidden">
    {/* Chart content — mounted even when collapsed, height driven by grid */}
    <CrossPartnerTrajectoryChart />
    {/* ... */}
  </div>
</div>
```

**Alternative:** explicit `maxHeight` with JS-measured value. Rejected because (a) requires ResizeObserver, (b) breaks when chart internal layout shifts, (c) CSS-only solution preserves "no new JS" phase constraint.

### Pattern 4: Cross-fade via dual-mount + opacity

**What:** For drill transitions and skeleton→content, render both outgoing and incoming layers with absolute positioning + opacity transition.

**When to use:** DS-23 (drill level change) and DS-27 (skeleton → content).

**Example (drill):**
```tsx
// Source: composition of existing drillState + transition-opacity utility
<div className="relative">
  <div
    key={`drill-${drillState.level}-${drillState.partner}-${drillState.batch}`}
    className="transition-opacity duration-normal ease-default"
    // React re-keys on drill change; outgoing layer is already unmounted
    // Alternative: keep a second layer mounted briefly for true cross-fade
  >
    {/* content region + KPI strip */}
  </div>
</div>
```

**Simpler alternative:** single-layer fade-on-change using React transitions API or CSS `@starting-style`. The `@base-ui/react` primitives already use `data-starting-style:opacity-0 data-ending-style:opacity-0` — see `src/components/query/query-command-dialog.tsx:45` for the canonical in-repo usage.

**Pilot to answer:** true cross-fade (both layers visible briefly) vs re-key fade (slight flash). Start with re-key; upgrade to dual-mount if pilot shows flash.

### Pattern 5: Hover-lift utility class

**What:** One utility that composes translate-Y + shadow transition on hover, reused across every interactive card.

**When to use:** DS-25 card hover across KPI, chart, drill-capable rows.

**Example (add to globals.css `@layer utilities`):**
```css
/* Source: new utility, composes Phase 28 elevation tokens + Phase 26 motion tokens */
@layer utilities {
  .hover-lift {
    /* Rest state already set by shadow-elevation-raised on consumer */
    transition-property: transform, box-shadow;
    transition-duration: var(--duration-quick);
    transition-timing-function: var(--ease-spring);
  }
  .hover-lift:hover {
    transform: translateY(-1px);
    box-shadow: var(--shadow-elevation-overlay);
  }
}
```

**Alternative:** use Tailwind utilities directly (`transition-[transform,box-shadow] duration-quick ease-spring hover:-translate-y-px hover:shadow-elevation-overlay`). Rejected because:
1. Longer class list repeated on every interactive card (DRY violation).
2. Grep guard has cleaner allowlist rule against `hover:-translate-y-*` if not wrapped in the utility.
3. Utility class centralizes the reduced-motion override target.

### Pattern 6: Press-scale on Button

**What:** Button variant-aware transform on hover + active.

**When to use:** DS-26, scoped to `variant="default"` + `variant="secondary"`.

**Example (modify `src/components/ui/button.tsx` cva variants):**
```tsx
// Source: extend existing buttonVariants cva
variants: {
  variant: {
    default: "bg-primary text-primary-foreground hover:scale-[1.01] active:scale-[0.98] ...",
    secondary: "bg-secondary text-secondary-foreground hover:scale-[1.01] active:scale-[0.98] ...",
    // ghost, outline, destructive, link: NO scale (bg tint only, matches CONTEXT lock)
  }
}
// Base class stays `transition-all` (already present)
// Remove existing `active:not-aria-[haspopup]:translate-y-px` from base (superseded by variant-scoped scale)
```

**Gotcha:** `transition-all` is coarse — picks up every animatable property. The CONTEXT duration-quick (120ms) applies to color + bg + transform via the same base class. Acceptable because all are simultaneous feedback for the same press event.

### Anti-Patterns to Avoid

- **Per-component `motion-reduce:` overrides.** CONTEXT explicitly forbids this. Use the global `@media (prefers-reduced-motion: reduce)` block.
- **`duration-[200ms]` / `ease-[cubic-bezier(...)]`.** Grep guard blocks. Always use `duration-normal` / `ease-default`.
- **Inline `style={{ transitionDuration: '200ms' }}`.** Grep guard blocks. One allowlist carve-out: `src/components/tokens/motion-demo.tsx` already uses `style={{ transitionDuration: \`var(--duration-${duration})\` }}` for the interactive demo — that's legitimate because it's dynamic-keyed; allowlist `src/components/tokens/**`.
- **Stagger on drill children.** CONTEXT lock: "all children arrive together as one composed scene."
- **Fade+slide combos.** CONTEXT lock: cross-fade only, no slide, no scale on drill.
- **`transition-all` with `!important` in reduced-motion block.** Use `transition-duration: 0ms !important` — preserves display/layout instant transitions.
- **Animating `height` directly.** Causes layout thrash. Use `grid-template-rows` (Pattern 3) or `maxHeight` with measured values.
- **Animating color on numeric text (KPI value).** Phase 26 motion lock: "motion lives on containers, never on data values." The KPI number itself should not tween.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Reduced-motion detection from JS (`matchMedia('(prefers-reduced-motion: reduce)')`) | `useReducedMotion()` hook | Single CSS media query | CSS-native, no JS round-trip, can't forget to subscribe to change events, no SSR hydration mismatch. W3C standard. |
| Cross-fade coordination state machine | `useTransition`, timeline libs, GSAP | Re-key the React element + CSS `transition-opacity` OR dual-mount + CSS transitions | 200ms cross-fade doesn't need timeline orchestration. `@base-ui/react` primitives already provide data-state attributes for this. |
| Chart height animation from measured pixels | `ResizeObserver` + `maxHeight` JS | `grid-template-rows: 0fr → 1fr` (Pattern 3) | Native CSS, handles dynamic content, Chrome/Safari/Firefox all shipped 2023-09. |
| Sidebar width interpolation | JS-driven rAF loop | shadcn primitive's existing `transition-[width]` with token retargeting | Already works; only retarget `duration-200 ease-linear` → `duration-normal ease-decelerate`/`ease-default` per CONTEXT. |
| Button press/release timing | `requestAnimationFrame` chain | CSS `:hover` + `:active` pseudo-classes | Browser-managed; zero JS; automatic touch support. |
| Motion preference fallback for Safari <14 | Polyfill or library detect | Drop the motion — ship zero motion to unsupported browsers | The `prefers-reduced-motion` media query returns false in legacy browsers, so transitions still run. Phase targets modern browsers per project context (internal 2-3 user team, desktop-first). |
| Motion keyframe library | `tw-animate-css` already imported; keyframes not needed for this phase | No new keyframes | Phase 30 scope is transitions + cross-fades, not keyframe animations. Skeleton pulse is Phase 29 territory. |

**Key insight:** Every motion surface in this phase is a transition between two static states — ideal CSS territory. JS motion libraries are justified for complex orchestrations (physics sims, gesture-driven, scroll-linked) that Phase 30 explicitly rejects.

## Common Pitfalls

### Pitfall 1: `transition-all` sweeping unintended properties

**What goes wrong:** A card with `transition-all duration-quick` animates color AND transform AND shadow AND background. Text color tweening looks flickery on theme toggle.

**Why it happens:** Tailwind `transition-all` = `transition-property: all`. Fine for buttons where every property changes for the same user event, regressive for containers that swap theme colors.

**How to avoid:** Scope transitions to specific properties:
- Card hover: `transition-[transform,box-shadow]`
- Button press: `transition-all` is acceptable (simultaneous feedback)
- Theme toggle: already isolated by `.theme-transition` class at globals.css:563

**Warning signs:** "Flicker when I switch dark mode" / "numbers look weird for 120ms on hover" — both mean a container has `transition-all` when it wants `transition-colors` or `transition-[transform,box-shadow]`.

### Pitfall 2: Sidebar transition-timing regression

**What goes wrong:** Retargeting `src/components/ui/sidebar.tsx:221,233` from `duration-200 ease-linear` to `duration-normal ease-decelerate` opens OK, but closing with `ease-decelerate` looks sluggish (arrival curve applied to departure).

**Why it happens:** `ease-decelerate` = `cubic-bezier(0, 0, 0.2, 1)` — fast start, slow end. Great for arrivals, poor for departures.

**How to avoid:** Split: opening uses `ease-decelerate`, closing uses `ease-default` per CONTEXT. Drive via `data-state="expanded"` vs `data-state="collapsed"` — the sidebar already has this attribute at `src/components/ui/sidebar.tsx:211`.

**Pattern:**
```tsx
// Drive via existing data-state attribute
"transition-[width] duration-normal data-[state=expanded]:ease-decelerate data-[state=collapsed]:ease-default"
```

**Warning signs:** "Close feels slower than open" or reverse. Usually a single easing used for both directions.

### Pitfall 3: Scroll jump on drill cross-fade

**What goes wrong:** Drilling partner→batch changes the row count and triggers a scroll jump. Cross-fade exposes the jump, making it feel worse than a hard cut.

**Why it happens:** Content region height changes during the opacity transition. Browser reflows the scroll container mid-fade.

**How to avoid:** 
- Drill router.push already uses `{ scroll: false }` (verified at `src/hooks/use-drill-down.ts:31`).
- During transition, keep the container height stable — CSS `contain: layout` on the drill boundary, or fix-height parent.
- Verify visually on the partner-with-many-batches → batch-detail drill (the most extreme row-count delta).

**Warning signs:** "Page jumps when I drill into the big partner." Pilot MUST include a multi-batch partner to catch this.

### Pitfall 4: StatCard chassis already has `transition-colors`

**What goes wrong:** Adding `transition-[transform,box-shadow] duration-quick ease-spring hover:-translate-y-px hover:shadow-elevation-overlay` on top of the existing `transition-colors duration-quick ease-default` at `src/components/patterns/stat-card.tsx:101` creates two overlapping transition declarations.

**Why it happens:** Tailwind `transition-colors` → `transition-property: color, background-color, border-color, ...`. Adding `transition-[transform,box-shadow]` on the same element overrides — the LAST wins (CSS cascade).

**How to avoid:** Merge into single property list: `transition-[color,background-color,transform,box-shadow]` OR use a composed utility class (Pattern 5's `hover-lift`) that owns the full declaration.

**Warning signs:** Hover lift works but color transitions stop happening (or vice versa). Always one or the other when both were intended.

### Pitfall 5: `!important` blasting through into `/tokens` motion demo

**What goes wrong:** Global `transition-duration: 0ms !important` in reduced-motion breaks the `/tokens` motion demo, which needs to demonstrate actual timings so QA can visually verify token values.

**Why it happens:** `*` + `!important` hits everything including demo surfaces.

**How to avoid:** 
- Accept the tradeoff: `/tokens` page with OS-level reduced-motion correctly disables demo motion, which is actually faithful to the user's preference. Demo page is only for users checking the system; those users can temporarily disable reduced-motion OS-wide.
- Alternative: scope the override to `body:not([data-motion-demo])`; add `data-motion-demo` attribute on `/tokens`. Rejected as over-engineering.

**Warning signs:** Token QA reports "motion demos don't animate on my machine." Check OS reduced-motion setting first.

### Pitfall 6: grep guard false-negative on escaped patterns

**What goes wrong:** `check:motion` greps for `duration-\[` but misses `duration-['2' + '00ms']` or template-literal `duration-${ms}ms`.

**Why it happens:** POSIX grep can't parse JS template literals.

**How to avoid:** 
- Grep for literal bad patterns (the common 95%): `duration-\[[0-9]+ms\]`, `ease-\[cubic-bezier`.
- Grep for `transitionDuration\s*:` and `transitionTimingFunction\s*:` in JSX style props.
- Grep for raw `transition:\s+[a-z-]+\s+[0-9]+ms` in className strings and CSS.
- Accept template-literal edge cases WON'T be caught; they're rare (motion-demo.tsx is the only in-repo case, already allowlisted).

**Warning signs:** Motion regresses in production, grep guard stays green. Manually audit any PR that touches motion-adjacent files.

### Pitfall 7: `active:not-aria-[haspopup]:translate-y-px` base-class collision

**What goes wrong:** Button base class at `src/components/ui/button.tsx:7` already has `active:not-aria-[haspopup]:translate-y-px`. Adding variant-scoped `active:scale-[0.98]` layers two transforms → `translate + scale` composite, looks off-balance.

**Why it happens:** CSS `transform: translateY(1px) scale(0.98)` is the composition browsers apply.

**How to avoid:** 
- Remove `active:not-aria-[haspopup]:translate-y-px` from base.
- Add variant-scoped `active:scale-[0.98]` on `default` + `secondary` only.
- Ghost/outline get nothing (CONTEXT lock).
- `aria-haspopup` buttons (dropdowns) — keep them unscaled too (they already open menus; no press-scale needed).

**Warning signs:** "Buttons feel weird when pressed" / "primary button nudges down AND shrinks" — two transforms composing.

### Pitfall 8: Chart expand/collapse with `grid-template-rows` breaks with `overflow-hidden`-free children

**What goes wrong:** Chart content overflows the collapsed grid row, content spills below the collapsed container.

**Why it happens:** `grid-template-rows: 0fr` clips the row to 0px, but inner content renders at natural size without an inner `overflow: hidden`.

**How to avoid:** Always wrap collapsible content in an inner `<div className="overflow-hidden">`. Verify on the fattest chart in the phase (PartnerComparisonMatrix or CollectionCurveChart).

**Warning signs:** "Collapsing charts leaves a sliver of chart visible below the toolbar."

## Code Examples

### Auto-emit motion tokens (already live in-repo)

```tsx
// Source: src/components/patterns/stat-card.tsx:101
const CARD_CLASSES =
  'rounded-lg bg-surface-raised p-card-padding shadow-elevation-raised transition-colors duration-quick ease-default';
```

```tsx
// Source: src/components/table/table-body.tsx:48
<tr className="h-[var(--row-height)] transition-colors duration-quick ease-default hover:bg-hover-bg" />
```

### Reduced-motion override (to add to globals.css)

```css
/* Source: new; modeled on globals.css:562-566 inverse */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    transition-duration: 0ms !important;
    transition-delay: 0ms !important;
    animation-duration: 0ms !important;
    animation-delay: 0ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
  }
  .hover-lift:hover,
  .hover-lift:focus-visible,
  [data-press-scale]:active {
    transform: none !important;
  }
}
```

### Hover-lift utility (to add to globals.css `@layer utilities`)

```css
/* Source: new; composes Phase 28 elevation pair + Phase 26 motion tokens */
@layer utilities {
  .hover-lift {
    transition-property: transform, box-shadow;
    transition-duration: var(--duration-quick);
    transition-timing-function: var(--ease-spring);
  }
  .hover-lift:hover {
    transform: translateY(-1px);
    box-shadow: var(--shadow-elevation-overlay);
  }
}
```

### Chart expand/collapse with grid-rows (Pattern 3)

```tsx
// Source: proposed refactor of src/components/data-display.tsx:494-531
<SectionErrorBoundary resetKeys={[data]}>
  <div
    className={cn(
      'grid transition-[grid-template-rows] duration-normal ease-default',
      chartsExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
    )}
  >
    <div className="overflow-hidden">
      <div className="shrink-0 px-2 pt-2 space-y-2">
        {drillState.level === 'root' && <CrossPartnerTrajectoryChart />}
        {/* ... */}
      </div>
    </div>
  </div>
  {/* Sparkline outside collapsible region — always mounted */}
  {!chartsExpanded && drillState.level === 'root' && <RootSparkline />}
</SectionErrorBoundary>
```

### Sidebar dual-easing retarget (Pattern — CONTEXT honors)

```tsx
// Source: proposed refactor of src/components/ui/sidebar.tsx:221,233
// Before: transition-[width] duration-200 ease-linear
// After:  transition-[width] duration-normal data-[state=expanded]:ease-decelerate data-[state=collapsed]:ease-default

// NOTE: the sidebar is shadcn's ui/ primitive. Phase 28 allowlisted src/components/ui/**
// in check:surfaces — Phase 30 must decide: patch primitive (carry shadcn maintenance cost)
// vs override externally via CSS in globals.css (cleaner, but couples to shadcn's internal selectors).
// RECOMMENDATION: patch primitive; leave a comment referencing Phase 30 lock.
```

### Check:motion guard (POSIX, mirrors check:tokens/check:surfaces/check:components)

```bash
#!/usr/bin/env bash
# scripts/check-motion.sh — Phase 30 motion token enforcement
set -euo pipefail

files_to_check() {
  find src -type f \
    \( -name '*.ts' -o -name '*.tsx' -o -name '*.js' -o -name '*.jsx' \) \
    -not -path 'src/components/ui/*'           \
    -not -path 'src/app/tokens/*'               \
    -not -path 'src/components/tokens/*'
}

FAIL=0

# Check 1: arbitrary duration brackets
BRACKET_DURATION=$(files_to_check | xargs grep -nE 'duration-\[[0-9]+m?s\]' 2>/dev/null || true)
if [ -n "$BRACKET_DURATION" ]; then
  echo "$BRACKET_DURATION"
  echo "❌ Found duration-[Nms]. Use duration-quick / duration-normal / duration-slow." 1>&2
  FAIL=1
fi

# Check 2: arbitrary easing cubic-bezier
BRACKET_EASE=$(files_to_check | xargs grep -nE 'ease-\[cubic-bezier' 2>/dev/null || true)
if [ -n "$BRACKET_EASE" ]; then
  echo "$BRACKET_EASE"
  echo "❌ Found ease-[cubic-bezier(...)]. Use ease-default / ease-spring / ease-decelerate." 1>&2
  FAIL=1
fi

# Check 3: inline style transitionDuration / transitionTimingFunction
INLINE_STYLE=$(files_to_check | xargs grep -nE '(transitionDuration|transitionTimingFunction)\s*:' 2>/dev/null || true)
if [ -n "$INLINE_STYLE" ]; then
  echo "$INLINE_STYLE"
  echo "❌ Found inline style transitionDuration / transitionTimingFunction. Use utility classes." 1>&2
  FAIL=1
fi

# Check 4: raw transition shorthand with numeric ms (in className)
RAW_SHORTHAND=$(files_to_check | xargs grep -nE 'transition:\s+[a-z-]+[^"]*[0-9]+m?s' 2>/dev/null || true)
if [ -n "$RAW_SHORTHAND" ]; then
  echo "$RAW_SHORTHAND"
  echo "❌ Found raw 'transition: ... Nms' shorthand. Use Tailwind utilities." 1>&2
  FAIL=1
fi

# Check 5: numeric duration-150/200/300 etc. (Tailwind defaults that bypass tokens)
NUMERIC_DURATION=$(files_to_check | xargs grep -nE '(^|[^a-zA-Z0-9-])duration-(75|100|150|200|300|500|700|1000)([^a-zA-Z0-9-]|$)' 2>/dev/null || true)
if [ -n "$NUMERIC_DURATION" ]; then
  echo "$NUMERIC_DURATION"
  echo "❌ Found numeric duration-* utilities. Use duration-quick/normal/slow." 1>&2
  FAIL=1
fi

[ "$FAIL" -eq 1 ] && exit 1
echo "✅ Motion tokens enforced."
```

**Allowlist note:** `src/components/ui/**` is excluded (shadcn primitives carry hardcoded motion — e.g. `sidebar.tsx`, `sheet.tsx`, `popover.tsx`). Wave 5 MUST patch shadcn primitives to use tokens, OR extend the allowlist comment to carry known-debt justifications (Phase 28 precedent: allowlist with comment). **Recommendation:** patch `sidebar.tsx` (DS-28 requires it anyway); leave `sheet.tsx`/`popover.tsx` on defaults (150ms sits close to `--duration-quick 120ms`, visual diff negligible).

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| JS-measured `maxHeight` for collapse animations | CSS `grid-template-rows: 0fr → 1fr` | Chrome 117, Safari 17, Firefox 117 (2023-09) | No JS, handles dynamic heights natively. |
| Framer Motion / Motion One for page transitions | CSS `@starting-style` + `@base-ui/react` primitives' `data-starting-style` / `data-ending-style` | Next.js 15+ / Base UI 1.x | Zero-dep motion on primitives; already shipping in this repo (query-command-dialog, sheet, popover). |
| `useReducedMotion()` React hook | Pure CSS `@media (prefers-reduced-motion: reduce)` | Always was native | Simpler, SSR-safe, no hydration mismatch. |
| Tailwind `duration-150` / `duration-200` (config-time tokens) | Tailwind v4 `@theme` auto-emit from `--duration-*` namespace | Tailwind v4 (2024) | Custom tokens become first-class utilities without a JS config file. |
| Per-component `motion-reduce:` variants | Global `@media (prefers-reduced-motion: reduce)` with `!important` | 2025+ design-token discipline | Prevents retrofit sweeps; single source of truth. |

**Deprecated/outdated:**
- `tailwindcss-animated` plugin — not needed with v4 `@theme`.
- `transition: all` on containers — scoped property lists are stricter.
- `framer-motion` for non-orchestrated state transitions — CSS suffices.

## Open Questions

1. **CONTEXT says `--duration-quick = 100ms`; globals.css says `120ms`.**
   - What we know: `src/app/globals.css:110` defines `--duration-quick: 120ms`. CONTEXT.md:29 claims "--duration-quick (100ms)".
   - What's unclear: is the phase decision to RE-TUNE the foundation token from 120ms → 100ms, or is CONTEXT citing an approximation?
   - Recommendation: treat as a token-retune question for the planner. If pilot feedback says 120ms feels right, leave the token; if 100ms feels right, the phase ships a 1-line globals.css edit (and the motion-demo.tsx text "120ms · ..." at line 21 needs sync-update). Either way: NO `--duration-micro` speculative add.

2. **Should the reduced-motion override also zero the header's `backdrop-blur-md`?**
   - What we know: `src/components/layout/header.tsx:32` uses `backdrop-blur-md`. Some vestibular-sensitivity sources flag blur as a motion trigger; web.dev doesn't.
   - What's unclear: CONTEXT lock is "all transition-duration to 0ms and removes translate/scale transforms" — backdrop-blur is a static filter, not a transition.
   - Recommendation: leave backdrop-blur unchanged. Reduced-motion scope is animated transitions and transforms only. If feedback surfaces, add `@media (prefers-reduced-motion: reduce) header { backdrop-filter: none; }` in a follow-up.

3. **Should `animate-pulse` on `<Skeleton />` and `bg-warning-fg animate-pulse` dot in Header be disabled under reduced-motion?**
   - What we know: The global override `animation-duration: 0ms !important; animation-iteration-count: 1 !important` disables BOTH. Existing `animate-pulse` keyframe will render a single static frame.
   - What's unclear: does a single-frame pulse look correct, or should it render a specific "resting" opacity?
   - Recommendation: test in pilot. `animate-pulse` default keyframe holds the element at ~100% opacity at iteration-count=1, which should look like a static muted block — fine. Confirm on stale-indicator dot.

4. **Drill cross-fade: re-key vs dual-mount?**
   - What we know: Re-key fade is simpler (one DOM layer, React handles mount lifecycle). Dual-mount avoids any flash of unmounted state.
   - What's unclear: whether partner→batch drill exposes a flash when the table re-mounts (TanStack Virtual re-virtualizes).
   - Recommendation: start with re-key + CSS `transition-opacity duration-normal`. Upgrade to dual-mount if pilot shows flash. The planner should scope Wave 2 (drill) with this escalation path.

5. **Allowlist carve-outs for motion-demo.tsx's inline `style={{ transitionDuration: ... }}`?**
   - What we know: `src/components/tokens/motion-demo.tsx:104-105` uses `style={{ transitionDuration: \`var(--duration-${duration})\`, transitionTimingFunction: \`var(--ease-${easing})\` }}` because the demo iterates all 9 combinations.
   - What's unclear: whether the demo should be rewritten to use dynamic classNames (`duration-${d}` + `ease-${e}`).
   - Recommendation: extend the `check:motion` allowlist to include `src/components/tokens/**` (already excluded by Phase 28/29 guards). The demo is legitimate dynamic iteration — allowlisting matches the exact pattern Phase 27/28/29 established.

## Validation Architecture

> Skipped per `.planning/config.json` — `workflow.nyquist_validation` is not set. Phase 30 follows the established check:tokens/surfaces/components CI-guard pattern: grep guard is the tripwire, `/tokens` page is the visual QA surface, and visual verification (per `feedback_testing` memory) is the acceptance gate.

## Sources

### Primary (HIGH confidence)

- `src/app/globals.css:109-115` — motion token definitions (`--duration-quick: 120ms`, `--duration-normal: 200ms`, `--duration-slow: 320ms`, `--ease-default`, `--ease-spring`, `--ease-decelerate`)
- `src/app/globals.css:562-566` — existing `@media (prefers-reduced-motion: no-preference)` inverse block to model from
- `src/app/globals.css:92-107` + `:436-451` — Phase 28 elevation pairs (`--shadow-elevation-raised` → `--shadow-elevation-overlay`)
- `src/components/ui/sidebar.tsx:221,233,292,403` — shadcn Sidebar hardcoded `duration-200 ease-linear` call sites
- `src/components/ui/button.tsx:7-41` — Button cva variants, `transition-all` base class, existing `active:...translate-y-px`
- `src/components/ui/skeleton.tsx` — Skeleton primitive with `animate-pulse`
- `src/components/patterns/stat-card.tsx:101` — StatCard chassis with existing `transition-colors duration-quick ease-default`
- `src/components/patterns/data-panel.tsx:63` — DataPanel chassis (no transition today)
- `src/components/data-display.tsx:129-135, 494-531` — `chartsExpanded` state + render boundary for drill content
- `src/components/data-display.tsx:566` — `onToggleCharts={toggleCharts}` wire to toolbar
- `src/hooks/use-drill-down.ts:29-32, 39-50` — `router.push` + `{ scroll: false }` drill mechanism
- `scripts/check-type-tokens.sh` — POSIX grep guard model (Phase 27)
- `scripts/check-surfaces.sh` — POSIX grep guard model with allowlist (Phase 28)
- `scripts/check-components.sh` — POSIX grep guard model with two checks + allowlist (Phase 29)
- `src/components/tokens/token-browser.tsx:57-61, 92-94` — Motion tab wiring for `/tokens` page
- `src/components/tokens/motion-demo.tsx` — existing 9-combo duration × easing playground to extend
- Tailwind v4 `duration-quick`/`ease-spring` auto-emit verified by 16 + 18 in-repo usages across 7 files each
- `package.json:8-10` — existing `check:components`/`check:surfaces`/`check:tokens` script pattern to mirror

### Secondary (MEDIUM confidence)

- Tailwind v4 docs ([tailwindcss.com/docs/transition-duration](https://tailwindcss.com/docs/transition-duration)) — bracket + CSS variable utility syntax; @theme auto-emit confirmed via in-repo usage (not explicit in docs)
- web.dev article [prefers-reduced-motion](https://web.dev/articles/prefers-reduced-motion) — media query best practices; `animation: none` safer than duration hacks when JS depends on `animationend` events; confirmed no `animationend` usage in this codebase via grep

### Tertiary (LOW confidence)

- *(none — all phase-critical claims verified in-repo or via authoritative docs)*

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — all tokens already defined, all surfaces located at exact file:line, no new dependencies needed
- Architecture Patterns: HIGH — `grid-template-rows`/hover-lift/cross-fade all have in-repo precedents or documented browser support ≥2023
- Pitfalls: HIGH — Pitfalls 2, 4, 7 discovered by reading existing component code; Pitfalls 1, 3, 5, 6, 8 are well-documented in browser/CSS literature
- Grep guard structure: HIGH — three identical precedents (Phases 27/28/29) shipped; same shell harness works

**Research date:** 2026-04-18
**Valid until:** 2026-05-18 — stable CSS features, no fast-moving deps; revisit only if Tailwind v5 ships or a new Phase 30 pilot surfaces a token gap

---
*Phase 30 — Micro-Interactions & Motion — RESEARCH complete*
