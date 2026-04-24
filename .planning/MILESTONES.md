# Milestones

## v1.0 MVP (Shipped: 2026-04-12)

**Phases:** 9 | **Plans:** 18 | **LOC:** ~7,150 TypeScript
**Timeline:** 2 days (2026-04-10 → 2026-04-12) | **Commits:** 120
**Deployed:** https://data-visualizer-micah-bosters-projects.vercel.app

**Key accomplishments:**
1. Interactive 61-column batch performance table with virtual scrolling
2. Multi-level drill-down: partner → batch → account detail with breadcrumb navigation
3. Column management: show/hide, drag-reorder, presets (finance/outreach/all), column-level filters
4. Saved views with localStorage persistence and starter view presets
5. CSV export respecting filters and column visibility
6. Deployed to Vercel with static data cache fallback (no Snowflake credentials required)

**Known gaps (carried to v2):**
- DEPL-02: Snowflake credentials not yet configured in Vercel (static cache in use)
- Drill-down uses React state instead of URL params (no browser back button)
- Static data covers 477/533 batch rows and only Affirm March account drill-down
- Account drill-down rows lack unique identifier (using row number placeholder)

---


## v2.0 Within-Partner Comparison (Shipped: 2026-04-12)

**Phases:** 5 (10-14) | **Plans:** 9 | **LOC:** ~9,400 TypeScript
**Timeline:** 1 day (2026-04-12)

**Key accomplishments:**
1. usePartnerStats computation hook composing KPIs, norms, curves, and trending
2. Collection curve charts with multi-line overlay and metric toggle
3. KPI summary cards at partner drill-down level
4. Conditional formatting with deviation from partner norms
5. Batch-over-batch trending indicators on key metrics

---


## v3.0 Intelligence & Cross-Partner Comparison (Shipped: 2026-04-14)

**Phases:** 6 (15-20) | **Plans:** 9 | **LOC:** ~13,566 TypeScript
**Timeline:** 3 days (2026-04-12 -> 2026-04-14) | **Requirements:** 28/28 verified
**Deployed:** data-visualizer-micah-bosters-projects.vercel.app

**Key accomplishments:**
1. Deterministic anomaly detection engine: z-score computation with polarity awareness, 2-metric threshold, severity ranking, and algorithm documentation
2. Anomaly detection UI: colored badges in Status column, popover detail with metrics/ranges/deviations, collapsible summary panel, chart highlighting for flagged batches
3. Claude natural language query: POST /api/query with AI SDK streaming, system prompt with summarized data context, search bar UI with suggested prompts and 30s timeout
4. Cross-partner percentile rankings: quantileRank on 5 metrics, portfolio outlier flags at 10th percentile
5. Cross-partner trajectory overlay chart: one line per partner, best-in-class and portfolio average reference lines, dollar-weighted/equal-weight toggle
6. Partner comparison matrix: heatmap with percentile-tier coloring, horizontal bar ranking, plain table — all with sort and orientation toggle

**Known gaps (carried to v3.1):**
- Claude context sent all-zero KPIs (wrong Snowflake column names)
- Anomaly badge missing from root-level partner table
- Phase 17/18 missing VERIFICATION.md files
- Chart tooltip not updating on batch click
- No chart collapse control

---


## v3.1 Stabilization & Code Quality (Shipped: 2026-04-14)

**Phases:** 4 (21-24) | **Plans:** 8 | **LOC:** ~13,566 TypeScript
**Timeline:** 1 day (2026-04-14) | **Audit:** 28/28 requirements, 5/5 integration flows
**Codebase:** 147 files, ~13,566 LOC TypeScript

**Key accomplishments:**
1. Fixed Claude context: replaced buggy inline KPI computation with computeKpis(), sends real data to Claude
2. Added anomaly badge Status column to root-level partner table, completing all-level coverage
3. Chart tooltip fix, chart collapse control with sparkline preview, comparison button labeling
4. Cached data schema validation with Zod, missing column handling, empty string normalization
5. DRY utilities (getPartnerName/getBatchName), memoized render-path allocations, loading skeletons
6. Comprehensive known-issues document: 22 categorized issues (0 high, 9 medium, 13 low)

**Remaining tech debt:**
- ANTHROPIC_API_KEY not provisioned in Vercel
- 22 known issues in docs/KNOWN-ISSUES.md
- Snowflake credentials still pending

---


## v3.5 Flexible Charts & Metabase Import (Absorbed into v4.0)

**Phases:** 25-29 (planned, never started) | **Status:** Absorbed into v4.0 on 2026-04-16

v3.5 was planned with 5 phases: Partner Lists, Chart Schema, Chart Renderer, Chart Builder UI, Metabase SQL Import. Before any work started, the decision was made to invest in design foundation first. All v3.5 scope was absorbed into v4.0 as Phases 34-37 (after the design system phases).

Phase 25 discussion context (Partner Lists) was preserved and moved to Phase 34.

---


## v4.0 Design System & Daily-Driver UX (Shipped: 2026-04-24)

**Phases:** 13 (25-37) | **Plans:** 105 | **LOC:** ~25,875 TypeScript
**Timeline:** 12 days (2026-04-12 → 2026-04-24) | **Commits:** ~281
**Requirements:** 67/67 complete (all phases closed, audit verdict: tech_debt → all gaps resolved via Phase 36 UAT closure 2026-04-23)

**Key accomplishments:**
1. Design token system end-to-end — spacing/type/elevation/motion/surface tokens owning presentation with 6 CI-enforced guards (check:tokens/surfaces/components/motion/polish/a11y) preventing regression
2. Component pattern library (StatCard, DataPanel, SectionHeader, ToolbarGroup, EmptyState) with legacy components deleted and CI grep guards blocking re-introduction
3. Full motion suite (drill cross-fade, chart expand/collapse, hover lifts, button scales, skeleton→content, sidebar lockstep) with `prefers-reduced-motion` honored globally
4. Visual polish pass (gradient dividers, dark-mode glass highlights, focus glows, border opacity standard, row hover retune, thin scrollbars) with /tokens page dogfooding every primitive across 8 tabs
5. WCAG AA accessibility baseline — axe-core + Playwright blocking CI gate, ARIA sweep, keyboard nav with row-level Tab+Enter+Escape on drill-capable rows, contrast retune at token source
6. URL-backed navigation (`?p=&b=` drill state, browser back/forward, optional drill in saved views) fully decoupled from design track
7. Flexible chart builder — ChartDefinition discriminated union (line/scatter/bar), ChartBuilderToolbar with segmented control + axis pickers, chart presets (built-in + user-saved), backward-compat migration for existing saved views
8. Metabase SQL Import wizard — paste SQL, preview matched/skipped columns and filters, Apply with drill reset and Undo toast, enum-aware parser, allow-list column mapping (closed after 5 defect rounds via human-verify gate)

**Key decisions:**
- v3.5 absorbed into v4.0 before any work — design foundation before features avoids retrofit debt
- Chart Renderer + Builder merged into single Phase 36 for tighter feedback loop
- Accessibility audit placed after visual polish (Phase 33) to audit the final state, not a moving target
- A11Y-05 (prefers-reduced-motion) shipped early in Phase 30-01 to avoid Phase 33 retrofit
- 6-guard parity portfolio (tokens/surfaces/components/motion/polish/a11y) — each phase lands with a grep guard wired into CI
- Metabase MBI-01 (chart-type override) routed forward to v4.1 Phase 38 — heuristic + override covers ~90% of value at ~10% of scope vs literal pass-through (MBI-02/MBI-03 deferred)

**Known gaps (carried to v4.1):**
- 14 first-week daily-use feedback items (POL-01..06, CHT-01..04, KPI-01..04, FLT-01..03) → v4.1 Phase 38
- Metabase Import chart-type override (MBI-01) → v4.1 Phase 38
- Cross-product blending at partner level (no `(partner, product)` unit enforcement yet) → v4.1 Phase 39
- No projected-curve benchmark line → v4.1 Phase 40

---


## v4.1 Feedback-Driven Polish (Planned)

**Phases:** 3 (38-40) | **Plans:** TBD | **Status:** Planned, follows v4.0
**Requirements:** 27 total across branding, chart correctness, KPI clarity, filters, partner config, and projected curves

**Goal:** Close the first-week daily-use feedback list from v4.0 and ship the two foundational features (Partner Config + Projected Curves v1) that unlock downstream v5.0 work. The app should feel like a daily-driver after this milestone.

**Phase breakdown:**
- Phase 38: Polish + Correctness Pass (logo, collapsible sidebar, column unlock, number formatting, chart avg truncation, tooltip hover, legend scroll, KPI horizon gating + delta labels + commitment rate, date-range filter, filter tooltips, partner-column dedup, laptop layout)
- Phase 39: Partner Config Module (product type + named segments per partner, Partner Lists extension, segment-aware charts/KPIs)
- Phase 40: Projected Curves v1 (historical-average projection overlay + "vs projected" KPI delta option)

**Key decision:** Ship a simpler static projection in v4.1 rather than waiting for v5.0's target-anchored dynamic projection — the team needs something to benchmark against now, and the v5.0 version extends this foundation.

---


## v4.5 Correctness & Security Foundation (Planned)

**Phases:** 2 (41-42) | **Plans:** TBD | **Status:** Planned, follows v4.1, precedes v5.0
**Requirements:** 12 total across data correctness and ingestion-surface security

**Goal:** Tight, structural hardening pass before v5.0 — verified metrics (so triangulation doesn't amplify silent bugs) and a documented threat model for v5.0's file-upload + Claude-extraction surface. Scope deliberately narrow: only the audits whose value degrades when deferred.

**Phase breakdown:**
- Phase 41: Data Correctness Audit (seed bug fix + breadth-first metric verification + scope-rollup consistency + regression fixtures + aggregation contract docs)
- Phase 42: Ingestion-Surface Security Review (credential handling + client-side exposure + SQL injection surface + forward threat model for v5.0 Phase 45)

**Key decision:** Behavioral QA and tech-debt sweep moved to v5.5 (post-v5.0) — those audits improve with post-usage observation, while correctness and security architecture degrade when deferred. Split by the direction the work ages.

**Phases 43-44 reserved as insert-phase slack** (useful for urgent work discovered during v5.0; keeps v5.0 phase numbers stable).

---


## v5.0 External Intelligence (Planned)

**Phases:** 5 (45-49) | **Plans:** TBD | **Status:** Planned, follows v4.5
**Requirements:** 32 total across scorecard ingestion, contractual targets, triangulation views, reconciliation, and dynamic curves

**Goal:** Transform the tool from an internal-only dashboard into a competitive intelligence platform. Ingest partner scorecards (PDF/Excel/CSV/email), manage contractual targets, and triangulate all three data sources in a single view.

**Phase breakdown:**
- Phase 45: Scorecard Ingestion Pipeline (multi-format, per-partner schema learning, human-in-the-loop)
- Phase 46: Contractual Target Management (manual entry + contract PDF extraction, versioned)
- Phase 47: Triangulation Views (internal vs. scorecard vs. target, divergence highlighting, traffic-lights)
- Phase 48: Scorecard Reconciliation & History (drift detection, partner reliability scoring)
- Phase 49: Dynamic Curve Re-Projection (target-aware projections with confidence bands — extends v4.1 Phase 40)

**Key decision:** Human reviews every scorecard extraction in v5.0. Graduate to auto-ingest with exception handling in v6.0+ once per-partner schemas are proven.

---


## v5.5 Real-Use Hardening (Planned)

**Phases:** 2 (50-51) | **Plans:** TBD | **Status:** Planned, follows v5.0, precedes v6.0
**Requirements:** 12 total across behavioral QA and tech-debt sweep

**Goal:** Post-v5.0 hardening that improves when deferred — behavioral QA built from observed MBR-prep workflows, and a tech-debt sweep informed by v5.0's actual code additions. Complements v4.5's pre-v5.0 structural audits.

**Phase breakdown:**
- Phase 50: Behavioral QA from Usage (living `docs/QA-SCRIPT.md` grounded in real use + v5.0 feature regression battery + keyboard/mouse/browser/size parity)
- Phase 51: Tech Debt Sweep (close `docs/KNOWN-ISSUES.md` backlog + consolidate v5.0 computation-layer duplication + TanStack v9 migration + dependency upgrades + dead-code retirement + hot-path perf)

**Key decision:** Splitting hardening across v4.5 (load-bearing for v5.0) and v5.5 (informed by v5.0) lets each piece land at its most effective moment. Audits whose value degrades when deferred (correctness, security architecture) stay in v4.5; audits whose value grows with observation (behavioral QA, code consolidation) land in v5.5.

---


## v6.0 Proactive Intelligence & Action (Planned)

**Phases:** 6 (52-57) | **Plans:** TBD | **Status:** Planned, follows v5.5
**Requirements:** 35 total across weekly highlights, pattern alerts, MBR integration, action connections, temporal intelligence, and NLQ enhancements

**Goal:** The tool pushes intelligence to the team and connects insights to downstream action. Auto-generated briefings, pattern-based alerts to Slack, one-click MBR prep, and action connections to Notion.

**Phase breakdown:**
- Phase 52: Weekly Partner Highlights (flagged for review — may be subsumed by Phase 54)
- Phase 53: Pattern Alerts (consecutive declines, divergence widening, peer-group outliers → Slack)
- Phase 54: MBR Pipeline Integration (one-click data staging → existing MBR pipeline skill)
- Phase 55: Action Connections (Flag in Slack, Create Notion task, Add to MBR agenda)
- Phase 56: Temporal Intelligence (vintage comparison, cohort trending, forecasting, leading indicators)
- Phase 57: NLQ Enhancements (follow-up suggestions, clickable references, multi-source + temporal queries)

**Key decision:** Alerts to Slack, briefings to Notion, MBR deeply integrated. HubSpot action connections deferred to v6.5+ based on usage patterns.

---

