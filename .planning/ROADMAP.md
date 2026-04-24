# Roadmap: Bounce Data Visualizer

## Milestones

- ✅ **v1.0 MVP** — Phases 1-9 (shipped 2026-04-12) — [Archive](milestones/v1.0-ROADMAP.md)
- ✅ **v2.0 Within-Partner Comparison** — Phases 10-14 (shipped 2026-04-12) — [Archive](milestones/v2.0-ROADMAP.md)
- ✅ **v3.0 Intelligence & Cross-Partner Comparison** — Phases 15-20 (shipped 2026-04-14) — [Archive](milestones/v3.0-ROADMAP.md)
- ✅ **v3.1 Stabilization & Code Quality** — Phases 21-24 (shipped 2026-04-14) — [Archive](milestones/v3.1-ROADMAP.md)
- ~~v3.5 Flexible Charts & Metabase Import~~ — Absorbed into v4.0 before work started
- 🚧 **v4.0 Design System & Daily-Driver UX** — Phases 25-37 (in progress) — [Roadmap](milestones/v4.0-ROADMAP.md)
- 📋 **v4.1 Feedback-Driven Polish** — Phases 38-40 (planned) — [Roadmap](milestones/v4.1-ROADMAP.md)
- 📋 **v4.5 Correctness & Security Foundation** — Phases 41-42 (planned; 43-44 reserved slack) — [Roadmap](milestones/v4.5-ROADMAP.md)
- 📋 **v5.0 External Intelligence** — Phases 45-49 (planned) — [Roadmap](milestones/v5.0-ROADMAP.md)
- 📋 **v5.5 Real-Use Hardening** — Phases 50-51 (planned) — [Roadmap](milestones/v5.5-ROADMAP.md)
- 📋 **v6.0 Proactive Intelligence & Action** — Phases 52-57 (planned) — [Roadmap](milestones/v6.0-ROADMAP.md)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-9) — SHIPPED 2026-04-12</summary>

- [x] Phase 1: Setup and Snowflake Infrastructure (2/2 plans)
- [x] Phase 2: Core Table and Performance (2/2 plans)
- [x] Phase 3: Data Formatting (2/2 plans)
- [x] Phase 4: Dimension Filtering (2/2 plans)
- [x] Phase 5: Column Management (3/3 plans)
- [x] Phase 6: Saved Views (3/3 plans)
- [x] Phase 7: Export (1/1 plan)
- [x] Phase 8: Navigation and Drill-Down (2/2 plans)
- [x] Phase 9: Vercel Deployment and Launch (1/1 plan)

</details>

<details>
<summary>✅ v2.0 Within-Partner Comparison (Phases 10-14) — SHIPPED 2026-04-12</summary>

- [x] Phase 10: Computation Layer & Charting Foundation (2/2 plans)
- [x] Phase 11: KPI Summary Cards (1/1 plan)
- [x] Phase 12: Collection Curve Charts (2/2 plans)
- [x] Phase 13: Conditional Formatting (2/2 plans)
- [x] Phase 14: Batch-over-Batch Trending (2/2 plans)

</details>

<details>
<summary>✅ v3.0 Intelligence & Cross-Partner Comparison (Phases 15-20) — SHIPPED 2026-04-14</summary>

- [x] Phase 15: Anomaly Detection Engine (2/2 plans) — completed 2026-04-12
- [x] Phase 16: Anomaly Detection UI (2/2 plans) — completed 2026-04-12
- [x] Phase 17: Claude Query Infrastructure (1/1 plan) — completed 2026-04-13
- [x] Phase 18: Claude Query UI (1/1 plan) — completed 2026-04-13
- [x] Phase 19: Cross-Partner Computation (1/1 plan) — completed 2026-04-13
- [x] Phase 20: Cross-Partner UI (2/2 plans) — completed 2026-04-14

</details>

<details>
<summary>✅ v3.1 Stabilization & Code Quality (Phases 21-24) — SHIPPED 2026-04-14</summary>

- [x] Phase 21: Critical Bug Fixes (1/1 plan) — completed 2026-04-14
- [x] Phase 22: UI Polish & Data Reliability (2/2 plans) — completed 2026-04-14
- [x] Phase 23: Verification & Housekeeping (2/2 plans) — completed 2026-04-14
- [x] Phase 24: Code Review & Refactoring (3/3 plans) — completed 2026-04-14

</details>

### 🚧 v4.0 Design System & Daily-Driver UX (In Progress)

**Milestone Goal:** Invest in design foundation, fix code health, then build deferred features on the polished base. The app should feel like a product, not a prototype.

**Design Foundation (Phases 25-31):**
- [x] **Phase 25: Code Health & Bug Fixes** — Fix root filter bug, add error boundaries, clean React anti-patterns (completed 2026-04-16)
- [x] **Phase 26: Design Tokens** — Spacing, typography, elevation, motion, and surface token system (5/5 plans — foundation + KPI card + header + table row pilots + unlisted /tokens reference page all shipped 2026-04-17)
- [x] **Phase 27: Typography & Information Hierarchy** — Type scale applied across app, tabular figures, consistent labeling (completed 2026-04-17)
- [x] **Phase 28: Surfaces & Elevation** — Every container uses a named surface — cards float, tables recede, popovers lift (completed 2026-04-18)
- [x] **Phase 29: Component Patterns** — StatCard, DataPanel, SectionHeader, ToolbarGroup, EmptyState (completed 2026-04-18)
- [x] **Phase 30: Micro-Interactions & Motion** — Drill transitions, hover lifts, press feedback, loading reveals, sidebar lockstep (completed 2026-04-18)
- [x] **Phase 31: Visual Polish Pass** — Gradient dividers, dark mode highlights, focus glows, border consistency (completed 2026-04-19)

**Structural (Phase 32):**
- [x] **Phase 32: URL-Backed Navigation** — Drill state in URL params, browser back button, deep-linking (2/2 plans — URL-backed useDrillDown + saved views carry optional drill state, shipped 2026-04-17)

**Quality (Phase 33):**
- [x] **Phase 33: Accessibility Audit** — axe-core, ARIA, keyboard nav, contrast, reduced motion (5/5 plans — 6-guard parity portfolio complete, A11Y-01..04 shipped, check:a11y BLOCKING in CI, shipped 2026-04-23)

**Features (Phases 34-37, carried from v3.5):**
- [x] **Phase 34: Partner Lists** — Named partner groupings for filtering (completed 2026-04-18)
- [x] **Phase 35: Chart Schema & Migration** — ChartDefinition type, backward-compatible view migration (completed 2026-04-19)
- [x] **Phase 36: Chart Builder** — Generic renderer + builder UI, collection curves as preset (completed 2026-04-24)
- [x] **Phase 37: Metabase SQL Import** — Parse SQL, map to app config, preview and apply (3/3 plans — parser/mapper foundation + wizard UI + apply pipeline with 5-round defect closure, shipped 2026-04-23)

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1-9 | v1.0 | 18/18 | Complete | 2026-04-12 |
| 10-14 | v2.0 | 9/9 | Complete | 2026-04-12 |
| 15-20 | v3.0 | 9/9 | Complete | 2026-04-14 |
| 21-24 | v3.1 | 8/8 | Complete | 2026-04-14 |
| 25. Code Health & Bug Fixes | v4.0 | 4/4 | Complete | 2026-04-16 |
| 26. Design Tokens | v4.0 | 5/5 | Complete | 2026-04-17 |
| 27. Typography & Hierarchy | 7/7 | Complete   | 2026-04-24 | - |
| 28. Surfaces & Elevation | 8/8 | Complete   | 2026-04-18 | - |
| 29. Component Patterns | 5/5 | Complete    | 2026-04-18 | - |
| 30. Micro-Interactions & Motion | 4/5 | Complete    | 2026-04-18 | - |
| 31. Visual Polish Pass | 6/6 | Complete    | 2026-04-19 | - |
| 32. URL-Backed Navigation | v4.0 | 2/2 | Complete | 2026-04-17 |
| 33. Accessibility Audit | 5/5 | Complete    | 2026-04-23 | - |
| 34. Partner Lists | 4/4 | Complete    | 2026-04-19 | - |
| 35. Chart Schema & Migration | 2/2 | Complete    | 2026-04-19 | - |
| 36. Chart Builder | 5/5 | Complete    | 2026-04-24 | - |
| 37. Metabase SQL Import | 3/3 | Complete    | 2026-04-24 | - |
| 38. Polish + Correctness Pass | v4.1 | 0/TBD | Planned | - |
| 39. Partner Config Module | v4.1 | 0/TBD | Planned | - |
| 40. Projected Curves v1 | v4.1 | 0/TBD | Planned | - |
| 41. Data Correctness Audit | v4.5 | 0/TBD | Planned | - |
| 42. Ingestion-Surface Security Review | v4.5 | 0/TBD | Planned | - |
| 43-44. (reserved — insert-phase slack) | — | — | — | - |
| 45. Scorecard Ingestion Pipeline | v5.0 | 0/TBD | Planned | - |
| 46. Contractual Target Management | v5.0 | 0/TBD | Planned | - |
| 47. Triangulation Views | v5.0 | 0/TBD | Planned | - |
| 48. Scorecard Reconciliation | v5.0 | 0/TBD | Planned | - |
| 49. Dynamic Curve Re-Projection | v5.0 | 0/TBD | Planned | - |
| 50. Behavioral QA from Usage | v5.5 | 0/TBD | Planned | - |
| 51. Tech Debt Sweep | v5.5 | 0/TBD | Planned | - |
| 52. Weekly Partner Highlights | v6.0 | 0/TBD | Planned* | - |
| 53. Pattern Alerts | v6.0 | 0/TBD | Planned | - |
| 54. MBR Pipeline Integration | v6.0 | 0/TBD | Planned | - |
| 55. Action Connections | v6.0 | 0/TBD | Planned | - |
| 56. Temporal Intelligence | v6.0 | 0/TBD | Planned | - |
| 57. NLQ Enhancements | v6.0 | 0/TBD | Planned | - |

\* Phase 52 flagged for review — may be deprioritized in favor of deeper MBR integration (Phase 54)

## Phase Details

### Phase 26: Design Tokens

**Goal**: Establish the foundational design token system — spacing, typography, elevation, motion, and surface primitives that every component will use
**Depends on**: Phase 25
**Effort**: Medium (decisions + CSS infrastructure + Tailwind integration)
**Requirements**: DS-01 through DS-06
**Success Criteria** (what must be TRUE):
  1. Spacing scale (4px grid) defined as CSS custom properties and used by at least 3 refactored components
  2. Typography scale (display, heading, title, label, body, caption) defined with font-size/line-height/weight/tracking
  3. Elevation system (shadow-xs through shadow-lg) defined as multi-layer shadows with light/dark variants
  4. Motion tokens (duration-quick/normal/slow, easing-default/spring/decelerate) defined and documented
  5. Surface system (surface-base, surface-raised, surface-inset, surface-overlay, surface-floating) defined with consistent border/shadow/background treatments
  6. All tokens work correctly in both light and dark mode
**Plans**: 5 plans
- [x] 26-01-PLAN.md — Token infrastructure in globals.css (all categories) + font swap Geist→Inter/JetBrains Mono + shadcn re-map (shipped 2026-04-17)
- [x] 26-02-PLAN.md — Pilot: migrate KPI card to surface-raised + type tokens + tabular numerics (shipped 2026-04-17)
- [x] 26-03-PLAN.md — Pilot: migrate Header to surface-raised + shadow-xs + type tokens (shipped 2026-04-17)
- [x] 26-04-PLAN.md — Pilot: migrate Table row to surface-inset + density tokens (dense/sparse variants) (shipped 2026-04-17)
- [x] 26-05-PLAN.md — Unlisted /tokens reference page with tabbed token browser and copy-to-clipboard (shipped 2026-04-17)

---

### Phase 27: Typography & Information Hierarchy

**Goal**: Apply the type scale across the app — consistent heading levels, tabular figures in all numeric contexts, proper label/value relationships, overline-style category labels
**Depends on**: Phase 26
**Effort**: Medium (touch ~78 components, tedious but mechanical)
**Requirements**: DS-07 through DS-10
**Success Criteria** (what must be TRUE):
  1. Every text element in the app uses a named type scale token (no more ad-hoc text-sm/text-2xl)
  2. All numeric displays use tabular figures (tabular-nums) — table cells, KPI values, chart axes
  3. KPI card labels use overline style (uppercase, tracked, smaller) distinct from body text
  4. Section headers (Charts, Table, Comparison) have consistent heading treatment with optional action slots
**Plans**: 7 plans
Plans:
- [x] 27-01-PLAN.md — Foundation: migration table + SectionHeader component + pilot migration (anomaly-detail.tsx) (shipped 2026-04-17)
- [x] 27-02-PLAN.md — Sweep: KPI summary, charts, cross-partner matrix, chart tooltip (axis NumericTick adoption) (shipped 2026-04-17)
- [x] 27-03-PLAN.md — Sweep: table surfaces + state-color expansion in trend-indicator (shipped 2026-04-17)
- [x] 27-04-PLAN.md — Sweep: toolbar, popovers, filters, column picker, saved views (shipped 2026-04-17)
- [x] 27-05-PLAN.md — Sweep: sidebar, breadcrumb, query UI, anomaly panels, empty/error/loading states (shipped 2026-04-17)
- [x] 27-06-PLAN.md — Enforcement: grep-in-CI guard + /tokens page SectionHeader + numeric-variant demos (shipped 2026-04-17)
- [x] 27-07-PLAN.md — UAT Gap #1 close-out: right-align /tokens numeric-variants three-row inset so tabular-nums visibly aligns decimal points (shipped 2026-04-17, SUMMARY 2026-04-23)

---

### Phase 28: Surfaces & Elevation

**Goal**: Apply the surface and shadow system to every container in the app — cards float, tables recede, popovers lift, the header has presence
**Depends on**: Phase 26 (tokens defined). Can run in parallel with Phase 27.
**Effort**: Medium (~15-20 components, shadcn overrides are the tricky part)
**Requirements**: DS-11 through DS-17
**Success Criteria** (what must be TRUE):
  1. Header uses subtle bottom shadow (not just border-b) creating a float effect
  2. KPI cards use surface-raised (border + soft shadow) — they pop off the background
  3. Table area uses surface-inset — slightly recessed, data is the focus
  4. Chart containers use surface-raised with consistent padding and corner radius
  5. Popovers and dropdowns use surface-overlay with multi-layer shadows
  6. Sidebar has subtle depth separation from main content (right edge treatment)
  7. All surface treatments are consistent — no more 3 different card styles
**Plans**: 8 plans
Plans:
- [x] 28-01-PLAN.md — Foundation: 4 semantic elevation tokens + surface-translucent + /tokens demo section
- [x] 28-02-PLAN.md — Pilot: Header translucent + backdrop-blur + elevation-chrome + sticky
- [x] 28-03-PLAN.md — Pilot: KPI cards + skeleton + empty-state retune to elevation-raised
- [x] 28-04-PLAN.md — Pilot: Table inset cleanup — drop outer frame, sticky column header lift, remove zebra
- [x] 28-05-PLAN.md — Sweep: Chart container raised shells + query cards + anomaly panel
- [x] 28-06-PLAN.md — Sweep: Popover/Sheet/Dialog/Combobox/Recharts overlay family
- [x] 28-07-PLAN.md — Sweep: Sidebar (base) + content (raised) three-surface reconciliation
- [x] 28-08-PLAN.md — Enforcement: scripts/check-surfaces.sh POSIX grep guard + DS-17 cleanup
**Status**: ✅ Complete (2026-04-17) — 8/8 plans shipped; all DS-11→DS-17 verified; check:surfaces guard green

### Phase 29: Component Patterns

**Goal**: Five reusable composed patterns (StatCard, DataPanel, SectionHeader-extended, ToolbarGroup, EmptyState) standardize common UI shapes; legacy components are deleted, every call site is migrated, and a CI grep guard prevents regression
**Depends on**: Phase 26 (tokens), Phase 27 (type scale), Phase 28 (surfaces — all complete)
**Effort**: Medium (~5 patterns + full migration + grep guard + /tokens demo additions)
**Requirements**: DS-18 through DS-22
**Success Criteria** (what must be TRUE):
  1. StatCard renders all first-class states (value, loading, error, no-data, insufficient-data, stale, comparison) at one canonical size with polarity-aware trend on a second line
  2. DataPanel exposes header/content/footer slots; header is required and composes the existing SectionHeader internally
  3. EmptyState ships four variants (no-data, no-results, error, permissions) each with a canonical Lucide icon and a sensible default CTA that callers can override or suppress
  4. ToolbarGroup separates semantically distinct button clusters in unified-toolbar with a subtle vertical divider
  5. SectionHeader is extended only where DataPanel migration surfaces a concrete gap (no speculative extension)
  6. KpiCard, src/components/empty-state.tsx, and src/components/filters/filter-empty-state.tsx are deleted; zero imports remain (no parallel-support window)
  7. `check:components` npm script (POSIX grep guard, modeled on check:tokens / check:surfaces) is wired into CI and green
  8. `/tokens` page gains a Component Patterns section with a live example of every variant of every pattern
**Plans**: 5 plans (4 pattern plans in Wave 1 + 1 enforcement plan in Wave 2)
Plans:
- [x] 29-01-PLAN.md — StatCard pattern + migrate kpi-summary-cards + delete legacy KpiCard + /tokens specimen (DS-18)
- [x] 29-02-PLAN.md — DataPanel pattern + migrate 3 chart/matrix shells (comparison-matrix, trajectory-chart, collection-curve-chart) + /tokens specimen (DS-19, DS-20)
- [x] 29-03-PLAN.md — EmptyState pattern (4 variants) + migrate data-display + data-table + delete 2 legacy files + /tokens specimen (DS-22)
- [x] 29-04-PLAN.md — ToolbarDivider sibling pattern + migrate unified-toolbar 2 divider sites + /tokens specimen (DS-21)
- [x] 29-05-PLAN.md — Enforcement: scripts/check-components.sh POSIX guard + npm alias + /tokens Component Patterns 6th tab aggregator + comparison-matrix:110 divider gap closure (DS-18, DS-19, DS-20, DS-21, DS-22)
**Status**: ✅ Complete (2026-04-18) — 5/5 plans shipped; all DS-18..22 verified (14/14 must-haves in 29-VERIFICATION.md); `npm run check:components` guard live; /tokens dogfoods pattern system (6 tabs)

### Phase 30: Micro-Interactions & Motion

**Goal**: Apply purposeful motion to state changes across the app using Phase 26's existing motion tokens and Phase 28's elevation pairs — drill cross-fade, chart expand/collapse, interactive card hover lift, button micro-scale, skeleton→content reveal, sidebar lockstep width — all gated by `prefers-reduced-motion` and enforced by a `check:motion` grep guard
**Depends on**: Phase 26 (motion tokens --duration-*/--ease-*), Phase 28 (elevation-raised / elevation-overlay pairs), Phase 29 (component patterns to animate). Runs independently of Phase 32 (URL-back compat is direction-agnostic by design).
**Effort**: Medium (6 motion surfaces + A11Y-05 reduced-motion media query + check:motion POSIX guard + /tokens Motion tab additions)
**Requirements**: DS-23 through DS-28, A11Y-05 (reduced-motion, shipped here to avoid Phase 33 retrofit)
**Success Criteria** (what must be TRUE):
  1. Drill-down transitions cross-fade (content region + KPI strip together, header/sidebar/chrome steady) at --duration-normal with no stagger
  2. Chart expand/collapse animates height with content fade, honoring --duration-normal + --ease-default
  3. Interactive cards (KPI, chart, drill-capable rows) translate-Y -1px + shadow step up on hover using Phase 28 elevation-raised → elevation-overlay pair, --duration-quick + --ease-spring
  4. Primary + secondary buttons scale(1.01) on hover and scale(0.98) on active with --duration-quick; icon-chip + ghost buttons stay unscaled (bg tint only)
  5. Skeleton → content cross-fades with ~150ms overlap (--ease-decelerate incoming, --ease-default outgoing)
  6. Sidebar open/close animates width + main-content margin in lockstep at --duration-normal with --ease-decelerate (open) / --ease-default (close)
  7. `@media (prefers-reduced-motion: reduce)` sets ALL transition-duration to 0ms and removes translate/scale transforms — global media query, no per-component opt-out
  8. `check:motion` POSIX grep guard (modeled on check:tokens / check:surfaces / check:components) flags raw duration-[Nms] / ease-[cubic-bezier(…)] / inline transitionDuration / raw transition: … Nms outside allowlist
  9. `/tokens` Motion tab gains live demos of every animated surface shipping in this phase
**Plans**: 5 plans (1 foundation + 3 sweeps/pilots + 1 enforcement/close-out across 4 waves)
Plans:
- [x] 30-01-PLAN.md — Wave 1 — Motion foundation + KPI card hover pilot: reduced-motion global override, .hover-lift utility, check:motion grep guard, StatCard interactive prop, /tokens Motion tab reduced-motion + hover-lift demos (DS-25 pilot, A11Y-05)
- [x] 30-02-PLAN.md — Wave 2 — Drill cross-fade (DS-23): data-display.tsx drill boundary wrapped at --duration-normal × --ease-default, keyed on drill identity, symmetric for URL back/forward, Pitfall 3 scroll-jump guard, /tokens drill demo
- [x] 30-03-PLAN.md — Wave 2 — Buttons + cards sweep (DS-25, DS-26): default/secondary button press scale(1.01/0.98) + data-press-scale attr, Pitfall 7 translate-y removal, DataPanel interactive prop, /tokens button + panel demos
- [x] 30-04-PLAN.md — Wave 3 — Skeleton + chart expand (DS-24, DS-27): chart grid-template-rows 0fr↔1fr transition with overflow-hidden Pitfall 8 guard, skeleton→content dual-mount 150ms overlap cross-fade, /tokens demos
- [x] 30-05-PLAN.md — Wave 4 — Sidebar lockstep + close-out (DS-28 + all DS-23..27 + A11Y-05): sidebar.tsx token retarget with data-state direction-aware easing (Pitfall 2), /tokens sidebar demo + Phase 30 aggregator, human-verify checkpoint signing off full motion suite
**Status**: ✅ Complete (2026-04-18) — 5/5 plans shipped; DS-23..28 + A11Y-05 all complete; `npm run check:motion` guard live; human-verify checkpoint approved full motion suite end-to-end (9/9 browser checks pass)

### Phase 31: Visual Polish Pass

**Goal**: The finishing touches that make the difference — gradient dividers, dark-mode glass highlights, focus glows, scrollbar polish, consistent border opacities, and refined table row hover — all sitting on top of the tokens/surfaces/motion primitives shipped in Phases 26–28
**Depends on**: Phase 26 (tokens), Phase 28 (surface + shadow elevation pairs), Phase 30 (motion duration/easing tokens). Runs after Phase 30 (cosmetic pass on the polished, animated app).
**Effort**: Small-Medium (pure CSS, many small changes across globals + a handful of components)
**Requirements**: DS-29 through DS-34
**Success Criteria** (what must be TRUE):
  1. Horizontal section separators (KPI band ↔ charts ↔ table) and ToolbarGroup vertical dividers use gradient-fade (center-solid, transparent at both ends); everything else keeps hard borders
  2. Dark-mode `surface-raised` (KPI cards, chart cards, query cards) carries a ~6–8% white inset top-edge highlight via `box-shadow` (no border-top, no pseudo-elements); header/sidebar/overlays untouched
  3. Focus-visible on form controls + interactive containers (inputs, selects, comboboxes, buttons; `focus-within` on ToolbarGroups + saved-view rows) uses a soft spread-glow built from the existing `--ring` token, with hard-outline a11y fallback
  4. A single border-opacity standard (~8%, same token in both light and dark) replaces the existing border/50, border/30, and ad-hoc values across cards, panels, and table
  5. Table row hover uses a soft neutral bg tint (~muted/4) with `--duration-quick` + `--ease-default`; tint-only (no geometry shift, no leading-edge accent bar, no chevron fade-in)
  6. Named scroll containers (table, sidebar, popovers) render thin (8–10px), always-visible, theme-aware scrollbars; document/body scroll stays with OS default
  7. No raw border-color hex/rgb literals or per-component border-opacity overrides remain in app code outside the allowlist (guard-enforced, modeled on check:tokens / check:surfaces / check:components / check:motion)
  8. `/tokens` page gains a Visual Polish tab with live specimens of each treatment (gradient divider, glass highlight, focus glow, border standard, row hover, scrollbar)
**Plans**: 6 plans across 3 waves (Wave 1: 4 parallel foundation/utility plans; Wave 2: gradient divider consumer layer; Wave 3: enforcement + /tokens aggregator + human-verify)
Plans:
- [x] 31-01-PLAN.md — DS-32 border retune (8% in both modes, --input stays 15%) + DS-30 glass highlight bump (dark --shadow-elevation-raised inset 0.05→0.07) — globals.css token-level only, no consumer edits
- [x] 31-02-PLAN.md — DS-31 .focus-glow + .focus-glow-within utilities (`:has(:focus-visible)` per Pitfall 2) + migrate 2 legacy focus sites (filter-combobox, save-view-popover) + add focus-within to ToolbarGroup + saved-view row
- [x] 31-03-PLAN.md — DS-34 narrow scrollbar scope: remove global ::-webkit-scrollbar, add .thin-scrollbar utility + 3 scrollbar tokens, opt in 6 named containers (data-table, sidebar, filter-combobox, sort-dialog, query-response, curve-legend; reconcile sidebar no-scrollbar→thin-scrollbar)
- [x] 31-04-PLAN.md — DS-33 validate-first row hover retune: in-browser check current --hover-bg vs CONTEXT ~muted/4; no-op or soften (light 8→5, dark 6→4); Phase 30 wiring untouched
- [x] 31-05-PLAN.md — DS-29 gradient dividers: .divider-horizontal-fade + .divider-vertical-fade utilities, new SectionDivider component at 2 data-display junctions, ToolbarDivider internal recipe swap (3 consumers inherit) — depends on 31-01 for retuned --border
- [x] 31-06-PLAN.md — Enforcement + close-out: scripts/check-polish.sh POSIX guard + npm run check:polish + /tokens 7th "Polish" tab with 6 live specimens + human-verify checkpoint signing off full pass (DS-29..DS-34)
**Status**: ✅ Complete (2026-04-19) — 6/6 plans shipped; DS-29..DS-34 all ratified; `npm run check:polish` guard live; human-verify approved full pass end-to-end (11/11 browser + guard + build checks pass)

**After Phase 31, kick off:**
- **Phase 33** (Accessibility Audit) — audit the final polished state

### Phase 32: URL-Backed Navigation

**Goal**: Move drill-down state from React state to URL params — enable browser back button, deep-linking, and shareable URLs
**Depends on**: Phase 25 only. **Fully independent of design track** — ran in parallel with Phases 26-31.
**Effort**: Medium-Large (structural rewrite of useDrillDown, touches orchestrator + 5-6 components, known gotcha with useSearchParams freezes)
**Requirements**: NAV-01 through NAV-04
**Success Criteria** (what must be TRUE):
  1. Drill state (partner, batch) is reflected in URL params (?p=X&b=Y)
  2. Browser back button navigates up drill levels correctly
  3. Deep-linking to a URL with partner/batch params loads the correct drill state
  4. Saved views can optionally include drill state for shareable bookmarks
**Plans**: 2 plans
Plans:
- [x] 32-01-PLAN.md — URL-backed useDrillDown hook (useSearchParams/usePathname/useRouter, `?p=&b=` contract, router.push for history, stale-param toast in data-display.tsx)
- [x] 32-02-PLAN.md — Saved views optional drill field (ViewSnapshot.drill? + zod .optional(), conditional "Include current drill state" checkbox, canIncludeDrill prop threading, legacy view backward compat)
**Status**: ✅ Complete (2026-04-17) — 2/2 plans shipped; all NAV-01→NAV-04 verified (13/13 must-haves in 32-VERIFICATION.md)

---

### Phase 33: Accessibility Audit

**Goal**: Achieve WCAG AA accessibility baseline on core user views — axe-core zero critical/serious violations, proper ARIA labels and roles on all interactive elements, full keyboard navigation, and WCAG AA color contrast in both themes
**Depends on**: Phase 31 (Visual Polish Pass complete — audit the final polished visual state). Independent of Phase 32 (URL-back compat is direction-agnostic).
**Effort**: Medium (axe-core + Playwright setup is straightforward; fixing findings is unpredictable — scoped to 4 core route families, critical/serious only)
**Context**: [33-CONTEXT.md](phases/33-accessibility-audit/33-CONTEXT.md) (gathered 2026-04-18)
**Requirements**: A11Y-01, A11Y-02, A11Y-03, A11Y-04 (A11Y-05 prefers-reduced-motion already shipped in Phase 30-01 — do not re-implement)
**Success Criteria** (what must be TRUE):
  1. axe-core returns zero critical or serious violations on core user-facing routes (Dashboard, drill-downs, saved views, settings) in both light and dark themes
  2. All interactive elements (buttons, inputs, toolbar controls, dialogs, popovers, charts) have appropriate ARIA labels/roles; charts expose concise `aria-label` with sibling data table available for SR users
  3. Full keyboard navigation works on core flows: Tab through controls, Enter to activate, Escape to close dialogs/popovers, focus trapped in open modals and restored to trigger on close; row-level Tab stops on dense tables (Enter drills in, Escape returns)
  4. Color contrast meets WCAG AA for all text on all surfaces in both light and dark mode; any failing design token (Phase 26 infra) adjusted at the canonical `globals.css` source rather than per-component overrides
  5. Regression guardrail live — axe-core run inside Playwright E2E against core routes; blocking CI gate once baseline is green; keyboard-only walkthrough of Dashboard → drill → saved view completes end-to-end without a mouse
**Plans**: 5 plans across 4 waves (Wave 1: baseline harness; Wave 2: ARIA + Keyboard/focus parallel; Wave 3: contrast retune; Wave 4: enforcement flip + /tokens aggregator + human-verify)
Plans:
- [x] 33-01-PLAN.md — Wave 1 — Baseline & CI harness: install @playwright/test + @axe-core/playwright; playwright.config.ts with static-cache webServer; tests/a11y/axe-baseline.spec.ts (4 routes × 2 themes + popover-open); tests/a11y/baseline.json advisory artifact; scripts/check-a11y.sh + npm run check:a11y (A11Y-01 foundation) — **SHIPPED 2026-04-19**
- [x] 33-02-PLAN.md — Wave 2 — ARIA labels & roles: icon-only button aria-label sweep across toolbar/save-view/anomaly/sort-dialog/sidebar; chart role="img" + aria-label on 4 chart wrappers; aria-pressed on toggles; aria-current="page" on breadcrumb/sidebar active; aria-sort on sortable columns; Dialog/Sheet modal={true} explicit; skip-to-content link (A11Y-02) — **SHIPPED 2026-04-19**
- [x] 33-03-PLAN.md — Wave 2 — Keyboard nav & focus: row-level Tab+Enter+Escape on table-body drill-capable rows; drill cross-fade focus restoration useEffect → [data-breadcrumb-current]; input-typing guard; Playwright keyboard-flow.spec.ts validates Enter/Escape URL transitions + Cmd+K focus-return (A11Y-03) — **SHIPPED 2026-04-19**
- [x] 33-04-PLAN.md — Wave 3 — Color contrast & token adjustments: enumerate axe color-contrast failures; retune globals.css tokens in :root / .dark (atomic commits per variable); verify both themes; brand intent preserved; all other guards green (A11Y-04) — **SHIPPED 2026-04-20**
- [x] 33-05-PLAN.md — Wave 4 — Enforcement flip + close-out: DEFERRED_CATEGORIES drained to empty set (check:a11y BLOCKING — 6th guard in parity portfolio); scrollable-region-focusable debt closed on dashboard scroll wrapper (tabIndex=0 + role=region); /tokens 8th Accessibility tab with A11ySpecimen (6 live demos: focus-glow, aria-label icon button, aria-pressed toggle, Base UI modal Dialog, skip-to-content, row-level keyboard); human-verify keyboard-only walkthrough signed off; A11Y-01..04 all Complete (A11Y-01, A11Y-02, A11Y-03, A11Y-04) — **SHIPPED 2026-04-23**

**After Phase 33:** No new phases unlocked (end of design track). Feeds into overall milestone completion.

---

### Phase 35: Chart Schema & Migration

**Goal**: Existing saved views survive the transition to a flexible chart type system without data loss
**Depends on**: Phase 34
**Effort**: Small (type definitions + migration function, 2-3 files)
**Requirements**: CHRT-01, CHRT-02
**Success Criteria** (what must be TRUE):
  1. All existing saved views (3 defaults + any user-created) load without errors after the schema change
  2. ChartDefinition type accepts line, scatter, and bar configurations with validated axis and type fields
  3. Old ChartViewState objects in localStorage are automatically migrated to ChartDefinition on first load
**Context**: [35-CONTEXT.md](phases/35-chart-schema-migration/35-CONTEXT.md) (gathered 2026-04-18)
**Research**: [35-RESEARCH.md](phases/35-chart-schema-migration/35-RESEARCH.md) (2026-04-18)
**Plans**: 2 plans across 2 waves (type-layer migration + smoke test in Wave 1; browser human-verify in Wave 2)
Plans:
- [x] 35-01-PLAN.md — ChartDefinition discriminated union + migrateChartState function + smoke test + defaults.ts v2 rewrite + all 3 consumers retyped in one atomic commit (CHRT-01, CHRT-02) (shipped 2026-04-19)
- [x] 35-02-PLAN.md — Human-verify checkpoint: 4 browser scenarios (legacy→v2 round-trip, malformed fallback, defaults from empty storage, unknown-variant narrow) (closed 2026-04-19 — partial-verification: Scenario C observed live, A/B/D deferred to 5/5 smoke-test proof after browser seeding was overwritten by the useSavedViews hydration-then-persist effect)
**Status**: ✅ Complete (2026-04-19) — 2/2 plans shipped; CHRT-01 satisfied; CHRT-02 framework satisfied (line/scatter/bar variants land in Phase 36 as planned, `v4.0-REQUIREMENTS.md` CHRT-02 stays `[~]` until Phase 36 close-out); 35-VERIFICATION.md captures scenario table + root-cause for the browser-seed-vs-hydration collision + E2E-harness nice-to-have breadcrumb.

---

### Phase 36: Chart Builder (Renderer + UI)

**Goal**: Users can view and configure line, scatter, and bar charts with custom axes, save chart presets, and collection curves remain a built-in preset
**Depends on**: Phase 35
**Effort**: Large (generic renderer + builder UI + collection curve backward compat + view integration. ~10-12 files.)
**Requirements**: CHRT-03 through CHRT-13
**Success Criteria** (what must be TRUE):
  1. Line, scatter, and bar charts render correctly with user-selected axes
  2. Collection curves preset produces visually identical output to the current CollectionCurveChart
  3. User can select X/Y axes from filtered dropdowns, switch chart types, and see instant re-renders
  4. User can save/load chart presets and chart config persists with saved views
**Context**: [36-CONTEXT.md](phases/36-chart-builder/36-CONTEXT.md) (gathered 2026-04-18)
**Research**: [36-RESEARCH.md](phases/36-chart-builder/36-RESEARCH.md) (2026-04-18)
**Plans**: 5 plans across 3 waves (Wave 1: schema/types/axis-eligibility + chart-presets slice — parallel; Wave 2: GenericChart renderer + ChartBuilderToolbar/PresetMenu — parallel; Wave 3: ChartPanel dispatcher + data-display wiring + human-verify)
Plans:
- [ ] 36-01-PLAN.md — Wave 1 — Extend chartDefinitionSchema with line/scatter/bar variants + narrow type aliases + axis-eligibility helper (from COLUMN_CONFIGS) + extended smoke (CHRT-07, CHRT-08, CHRT-13 schema-half)
- [x] 36-02-PLAN.md — Wave 1 — chart-presets slice (types/schema/storage/defaults) + useChartPresets hook + BUILTIN_PRESETS (Collection Curves) + smoke (CHRT-10, CHRT-11, CHRT-12)
- [ ] 36-03-PLAN.md — Wave 2 — GenericChart renderer (line/scatter/bar dispatch via Recharts) + StaleColumnWarning banner + switchChartType/resolveColumnWithFallback helpers + smoke (CHRT-03, CHRT-04, CHRT-05, CHRT-09)
- [ ] 36-04-PLAN.md — Wave 2 — AxisPicker + ChartBuilderToolbar (icon segmented control + X/Y pickers) + PresetMenu (built-ins + user + save-new) + SavePresetPopover + isSameDefinition (CHRT-07..12)
- [ ] 36-05-PLAN.md — Wave 3 — ChartPanel dispatcher (preset vs generic) + CollectionCurveChart presetMenu prop + data-display.tsx integration + human-verify checkpoint (CHRT-03, CHRT-04, CHRT-05, CHRT-06, CHRT-09, CHRT-11, CHRT-13)

**After Phase 36:** No new phases unlocked. Feeds into overall milestone completion.

---

### Phase 37: Metabase SQL Import

**Goal**: Users can paste a Metabase SQL query and have it translated into an app view configuration
**Depends on**: Phase 35 (uses ChartDefinition type). Independent of Phase 36 — can run in parallel with Chart Builder.
**Effort**: Medium (SQL parser + preview UI + ViewSnapshot mapper. ~4-5 new files.)
**Requirements**: META-01 through META-05
**Success Criteria** (what must be TRUE):
  1. User can paste Metabase-exported SQL into an import dialog accessible from the sidebar
  2. User can see a preview of matched columns, skipped columns, extracted filters and sort order
  3. Clicking "Apply" creates a ViewSnapshot with correct table columns, filters, and chart config
  4. Imported configuration only references columns in the existing allow-list (no SQL injection)
**Context**: [37-CONTEXT.md](phases/37-metabase-sql-import/37-CONTEXT.md) (gathered 2026-04-19)
**Research**: [37-RESEARCH.md](phases/37-metabase-sql-import/37-RESEARCH.md) (2026-04-19)
**Plans**: 3 plans across 3 waves (Wave 1: parser + mapper + schema evolution; Wave 2: wizard UI; Wave 3: Apply integration + human-verify)
Plans:
- [x] 37-01-PLAN.md — Wave 1 — parseMetabaseSql + mapToSnapshot + chart-inference + ViewSnapshot.sourceQuery additive field + SOURCE_TABLE constant + smoke tests (META-02, META-04, META-05) (shipped 2026-04-19)
- [x] 37-02-PLAN.md — Wave 2 — ImportSheet (right-side Sheet, ~60vw), two-step wizard, sectioned preview (Columns / Filters / Sort / Chart) with icon+label signaling, sidebar entry (META-01) (shipped 2026-04-19)
- [x] 37-03-PLAN.md — Wave 3 — handleApplyImport in data-display.tsx + SidebarData.onImportSql wiring + drill reset + sourceQuery stamp + sonner toast with Undo + enum-aware parser (Round 5) + dim-filter promotion (Round 1) + exhaustive-hide (Round 2a) + toast-popover geometry fix (Round 3) + human-verify sign-off on 5 scenarios (META-03) (shipped 2026-04-23 after 5 defect rounds)
**Status**: ✅ Complete (2026-04-23) — 3/3 plans shipped; all META-01..05 requirements Complete in v4.0-REQUIREMENTS.md; META-03 closure required 5 defect rounds via human-verify gate (dim-filter promotion, imported-view visibility exhaustiveness, fixture-to-data integrity, toast-popover geometry, non-repro smoke lock-in, enum-aware parser); 6 smokes green (metabase-import 11, metabase-map 8, migrate-chart, axis-eligibility, chart-presets, plus new Playwright 37-03-import-toast-nonblocking).

**After Phase 37:** No new phases unlocked within v4.0. Metabase Import follow-up feedback ("will it pull in the graph type too?") routed to v4.1 Phase 38 as **MBI-01** — chart-type override control in the Preview step, mirroring Phase 36's `ChartBuilderToolbar` segmented control. Literal Metabase chart-type pass-through (MBI-02 via card JSON paste) + URL paste with network fetch (MBI-03) deferred to Future Requirements — heuristic + override covers ~90% of the value at ~10% of the scope.

---
*Last updated: 2026-04-23 — Phase 37 CLOSED (3/3 plans; 5-round defect closure on 37-03 human-verify gate; all META-01..05 requirements Complete); MBI-01 Metabase Import chart-type override added to v4.1 Phase 38 (bumping scope 17→18 items); Phase 33 Accessibility closed 2026-04-23 (5/5 plans; 6-guard parity portfolio live + BLOCKING); Phase 35 CLOSED (2/2 plans); Phase 34 Partner Lists closed 2026-04-18; Phase 30 Motion suite closed 2026-04-18; Phase 29 Component Patterns closed 2026-04-18; Phase 28 Surfaces closed 2026-04-17*
