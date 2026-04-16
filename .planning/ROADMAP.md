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
- [ ] **Phase 26: Design Tokens** — Spacing, typography, elevation, motion, and surface token system
- [ ] **Phase 27: Typography & Information Hierarchy** — Type scale applied across app, tabular figures, consistent labeling
- [ ] **Phase 28: Surfaces & Elevation** — Every container uses a named surface — cards float, tables recede, popovers lift
- [ ] **Phase 29: Component Patterns** — StatCard, DataPanel, SectionHeader, ToolbarGroup, EmptyState
- [ ] **Phase 30: Micro-Interactions & Motion** — Drill transitions, hover lifts, press feedback, loading reveals
- [ ] **Phase 31: Visual Polish Pass** — Gradient dividers, dark mode highlights, focus glows, border consistency

**Structural (Phase 32):**
- [ ] **Phase 32: URL-Backed Navigation** — Drill state in URL params, browser back button, deep-linking

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
| 25. Code Health & Bug Fixes | 4/4 | Complete   | 2026-04-16 | - |
| 26. Design Tokens | v4.0 | 0/TBD | Not started | - |
| 27. Typography & Hierarchy | v4.0 | 0/TBD | Not started | - |
| 28. Surfaces & Elevation | v4.0 | 0/TBD | Not started | - |
| 29. Component Patterns | v4.0 | 0/TBD | Not started | - |
| 30. Micro-Interactions & Motion | v4.0 | 0/TBD | Not started | - |
| 31. Visual Polish Pass | v4.0 | 0/TBD | Not started | - |
| 32. URL-Backed Navigation | v4.0 | 0/TBD | Not started | - |
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

---
*Last updated: 2026-04-16 — v5.0 and v6.0 milestones added*
