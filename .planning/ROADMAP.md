# Roadmap: Bounce Data Visualizer

## Milestones

- ✅ **v1.0 MVP** — Phases 1-9 (shipped 2026-04-12) — [Archive](milestones/v1.0-ROADMAP.md)
- ✅ **v2.0 Within-Partner Comparison** — Phases 10-14 (shipped 2026-04-12) — [Archive](milestones/v2.0-ROADMAP.md)
- ✅ **v3.0 Intelligence & Cross-Partner Comparison** — Phases 15-20 (shipped 2026-04-14) — [Archive](milestones/v3.0-ROADMAP.md)
- ✅ **v3.1 Stabilization & Code Quality** — Phases 21-24 (shipped 2026-04-14) — [Archive](milestones/v3.1-ROADMAP.md)
- ~~v3.5 Flexible Charts & Metabase Import~~ — Absorbed into v4.0 before work started
- 🚧 **v4.0 Design System & Daily-Driver UX** — Phases 25-37 (in progress) — [Roadmap](milestones/v4.0-ROADMAP.md)
- 📋 **v5.0 External Intelligence** — Phases 38-42 (planned) — [Roadmap](milestones/v5.0-ROADMAP.md)
- 📋 **v6.0 Proactive Intelligence & Action** — Phases 43-48 (planned) — [Roadmap](milestones/v6.0-ROADMAP.md)

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
- [ ] **Phase 30: Micro-Interactions & Motion** — Drill transitions, hover lifts, press feedback, loading reveals
- [ ] **Phase 31: Visual Polish Pass** — Gradient dividers, dark mode highlights, focus glows, border consistency

**Structural (Phase 32):**
- [x] **Phase 32: URL-Backed Navigation** — Drill state in URL params, browser back button, deep-linking (2/2 plans — URL-backed useDrillDown + saved views carry optional drill state, shipped 2026-04-17)

**Quality (Phase 33):**
- [ ] **Phase 33: Accessibility Audit** — axe-core, ARIA, keyboard nav, contrast, reduced motion

**Features (Phases 34-37, carried from v3.5):**
- [ ] **Phase 34: Partner Lists** — Named partner groupings for filtering
- [ ] **Phase 35: Chart Schema & Migration** — ChartDefinition type, backward-compatible view migration
- [ ] **Phase 36: Chart Builder** — Generic renderer + builder UI, collection curves as preset
- [ ] **Phase 37: Metabase SQL Import** — Parse SQL, map to app config, preview and apply

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1-9 | v1.0 | 18/18 | Complete | 2026-04-12 |
| 10-14 | v2.0 | 9/9 | Complete | 2026-04-12 |
| 15-20 | v3.0 | 9/9 | Complete | 2026-04-14 |
| 21-24 | v3.1 | 8/8 | Complete | 2026-04-14 |
| 25. Code Health & Bug Fixes | v4.0 | 4/4 | Complete | 2026-04-16 |
| 26. Design Tokens | v4.0 | 5/5 | Complete | 2026-04-17 |
| 27. Typography & Hierarchy | 6/6 | Complete    | 2026-04-17 | - |
| 28. Surfaces & Elevation | 8/8 | Complete   | 2026-04-18 | - |
| 29. Component Patterns | 5/5 | Complete    | 2026-04-18 | - |
| 30. Micro-Interactions & Motion | v4.0 | 0/TBD | Not started | - |
| 31. Visual Polish Pass | v4.0 | 0/TBD | Not started | - |
| 32. URL-Backed Navigation | v4.0 | 2/2 | Complete | 2026-04-17 |
| 33. Accessibility Audit | v4.0 | 0/TBD | Not started | - |
| 34. Partner Lists | v4.0 | 0/TBD | Not started | - |
| 35. Chart Schema & Migration | v4.0 | 0/TBD | Not started | - |
| 36. Chart Builder | v4.0 | 0/TBD | Not started | - |
| 37. Metabase SQL Import | v4.0 | 0/TBD | Not started | - |
| 38. Scorecard Ingestion Pipeline | v5.0 | 0/TBD | Planned | - |
| 39. Contractual Target Management | v5.0 | 0/TBD | Planned | - |
| 40. Triangulation Views | v5.0 | 0/TBD | Planned | - |
| 41. Scorecard Reconciliation | v5.0 | 0/TBD | Planned | - |
| 42. Dynamic Curve Re-Projection | v5.0 | 0/TBD | Planned | - |
| 43. Weekly Partner Highlights | v6.0 | 0/TBD | Planned* | - |
| 44. Pattern Alerts | v6.0 | 0/TBD | Planned | - |
| 45. MBR Pipeline Integration | v6.0 | 0/TBD | Planned | - |
| 46. Action Connections | v6.0 | 0/TBD | Planned | - |
| 47. Temporal Intelligence | v6.0 | 0/TBD | Planned | - |
| 48. NLQ Enhancements | v6.0 | 0/TBD | Planned | - |

\* Phase 43 flagged for review — may be deprioritized in favor of deeper MBR integration (Phase 45)

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
**Plans**: 6 plans
Plans:
- [ ] 27-01-PLAN.md — Foundation: migration table + SectionHeader component + pilot migration (anomaly-detail.tsx)
- [ ] 27-02-PLAN.md — Sweep: KPI summary, charts, cross-partner matrix, chart tooltip (axis NumericTick adoption)
- [ ] 27-03-PLAN.md — Sweep: table surfaces + state-color expansion in trend-indicator
- [ ] 27-04-PLAN.md — Sweep: toolbar, popovers, filters, column picker, saved views
- [ ] 27-05-PLAN.md — Sweep: sidebar, breadcrumb, query UI, anomaly panels, empty/error/loading states
- [ ] 27-06-PLAN.md — Enforcement: grep-in-CI guard + /tokens page SectionHeader + numeric-variant demos

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
- [ ] 29-05-PLAN.md — Enforcement: scripts/check-components.sh POSIX guard + npm alias + /tokens Component Patterns 6th tab aggregator + comparison-matrix:110 divider gap closure (DS-18, DS-19, DS-20, DS-21, DS-22)
**Status**: ⏸ Planning

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
*Last updated: 2026-04-17 — Phase 32 detail section added (backfill — phase shipped 2026-04-17); Phase 29 detail section added; Phase 28 complete: 8 plans across 4 waves (foundation + 3 pilots + 3 sweeps + enforcement)*
