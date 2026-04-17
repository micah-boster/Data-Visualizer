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
- [ ] **Phase 27: Typography & Information Hierarchy** — Type scale applied across app, tabular figures, consistent labeling
- [ ] **Phase 28: Surfaces & Elevation** — Every container uses a named surface — cards float, tables recede, popovers lift
- [ ] **Phase 29: Component Patterns** — StatCard, DataPanel, SectionHeader, ToolbarGroup, EmptyState
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
| 27. Typography & Hierarchy | v4.0 | 0/6 | Not started | - |
| 28. Surfaces & Elevation | v4.0 | 0/TBD | Not started | - |
| 29. Component Patterns | v4.0 | 0/TBD | Not started | - |
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
*Last updated: 2026-04-17 — Phase 27 detail synced from v4.0-ROADMAP.md*
