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


## v4.1 Feedback-Driven Polish (Shipped: 2026-04-27)

**Phases:** 4 (38, 39, 40, 40.1) | **Plans:** 14 | **Status:** Shipped
**Requirements:** 35 total — POL-01..06, CHT-01..04, KPI-01,02,04, FLT-01..03, MBI-01, PCFG-01..07, PRJ-01..05, PRJ-09..13. (KPI-03 deferred to Phase 41 pending new Snowflake column; PRJ-06..08 deferred to v5.0 Phase 49.)

**Goal:** Close the first-week daily-use feedback list from v4.0 and ship the two foundational features (Partner Config + Projected Curves v1) that unlock downstream v5.0 work. The app should feel like a daily-driver after this milestone.

**Phase breakdown:**
- Phase 38: Polish + Correctness Pass (logo, collapsible sidebar, column unlock, number formatting, chart avg truncation, tooltip hover, legend scroll, KPI horizon gating + delta labels + commitment rate, date-range filter, filter tooltips, partner-column dedup, laptop layout) — completed 2026-04-24
- Phase 39: Partner Config Module (product type + named segments per partner, Partner Lists extension, segment-aware charts/KPIs) — completed 2026-04-25
- Phase 40: Projected Curves v1 (per-batch modeled projection lines + KPI baseline selector) — completed 2026-04-25
- Phase 40.1: Projected Curves Polish (chart visibility scoping, table modeled+delta cols, footer+header gap closure, BaselineSelector unification + localStorage persistence) — completed 2026-04-27

**Key decision:** Ship a simpler static projection in v4.1 rather than waiting for v5.0's target-anchored dynamic projection — the team needs something to benchmark against now, and the v5.0 version extends this foundation.

**Carryover to v4.5 Phase 41.2:** Two unrelated bugs surfaced during 40.1 browser UAT (React duplicate-key warning under DataDisplay re-render path + 4 always-empty trailing footer cells at root drill). Both pre-date Plan 40.1-04 fixes — moved to v4.5 under Phase 41.2 to keep v4.1 close clean.

---


## v4.5 Correctness & Foundation (Shipped: 2026-05-02)

**Phases:** 4 closed (41 / 42a / 43 / 44; 42b OAuth-deferred) | **Plans:** 15 | **LOC:** ~41,085 TypeScript (+8,198 / −740 vs v4.1 close)
**Timeline:** 5 days (2026-04-27 → 2026-05-01) | **Commits:** 64 | **Tag:** `v4.5`
**Requirements:** 28 in-scope (was 27) — 25 closed (DCR-01..10 + SEC-01/03/04/06 + BND-01..06 + VOC-01..07); 2 deferred to Phase 42b (SEC-02 / SEC-05, OAuth-gated); 1 tracking-line cleanup pending (DCR-11 — eight ADRs implemented under Plan 41-04 with inline `// ADR:` callsite comments, requirement-line checkbox stays unchecked).

**Goal delivered:** Every visible number has a Snowflake-equivalence row in `docs/METRIC-AUDIT.md`. The compute layer reads `BatchRow[]` (typed, branded age, NULL-aware rate fields) instead of bag-of-strings. Persistence is versioned with explicit migration / verified-write / cross-tab sync. Snowflake calls retry with circuit-breaker + request-id correlation + Server-Timing. Charts compose from a single `<ChartFrame>` primitive with polarity context. v5.0's ingestion surface has a load-bearing forward threat model (SEC-04, 13 LOCK mitigations) that Phase 45 will consume. 15 domain terms live in a single `TERMS` registry with `<Term>` popovers wired into KPIs / breadcrumbs / sidebar / table headers, including REVENUE_MODEL as the third unit-of-analysis dimension.

**Key accomplishments:**
1. **Data correctness baseline.** `docs/METRIC-AUDIT.md` (130 lines, 36 audit rows × 3 scopes; ✅ 17 verified / 🔧 17 fixed-this-phase / ⏭ 1 deferred / ❌ 0 outstanding) — what v5.0 triangulation reads to know which metrics are app-vs-Snowflake equal. 9 new `*.smoke.ts` regression scripts pin every fix with a three-way invariant pattern (direct math === pair summary === KPI card). DCR-01 seed bug fixed via per-column aggregation strategy (`sum`/`avgWeighted`/`none`/`range`). DCR-07 young-batch censoring fixed via `isMetricEligible(batchAge, metric)` gate before z-score. DCR-08 NULL semantics distinguished at parser boundary (rate-shaped fields carry `number | null`). DCR-09 polarity registry (28+ metrics) routed through `getPolarityWithAuditWarning`. DCR-10 apples-and-oranges runtime invariant (`assertSegmentsNonOverlapping`).
2. **Eight statistical-threshold ADRs.** `Z_THRESHOLD = 2`, `MIN_GROUPS = 2`, 5% relative trending, 3-batch baseline (actually up-to-4 — discrepancy captured in ADR 004), cascade tier breakpoints, `MIN_PLACED_DENOMINATOR_DOLLARS = $100K` from Wave 0, account-vs-dollar weighting choice. Inline `// ADR: .planning/adr/NNN-...md` callsite comments. Global no-partner-overrides convention codified — locks v4.5 against p-hacking, preserves v5.0 triangulation comparability.
3. **Typed substrate (BND-01/02).** `BatchRow` / `AccountRow` interfaces with branded `BatchAgeMonths`, `number | null` for rate-shaped fields, long-format `CurvePoint[]` baked in. 8 compute files migrated. Three duplicate `coerceAgeMonths` helpers collapsed to one. Static cache routes through `parseBatchRow` at boot.
4. **Versioned persistence (BND-03).** `createVersionedStore<T>` with `_meta: { schemaVersion, savedAt }` envelope, migration chain, verified writes, cross-tab `storage` event sync. 5 modules wrapped at schemaVersion 1 (views, columns, partner-lists, partner-config, chart-presets). `MissingMigratorError` policy: dev throws / prod drops with `console.error`.
5. **Snowflake reliability (BND-04).** `executeWithReliability` with retry (1s/2s backoff, 3 attempts) + circuit breaker (5 fails / 60s degraded mode using stale React Query cache) + `Server-Timing` queue/execute split + `X-Request-Id` correlation + sanitized client errors. `<DegradedBanner>` and `(stale)` badge surface stale-data state.
6. **Unified chart primitive (BND-05/06).** `<ChartFrame>` composing all four current charts (Curve / Trajectory / Matrix / Sparkline) with title / legend / state union (ready / loading / fetching / empty / error) / stale-column chip / polarity context. Tuned `unstable_cache(..., {tags:['batch-data']})` + `/api/revalidate` POST endpoint with shared-secret auth + `<RefreshButton>` with locked client cache-bust path + ⌘R interceptor + ADR 009.
7. **Ingestion-surface security architecture (Phase 42a).** Credential handling audit (SEC-01) — 12 server-only env-var read-sites verified, zero `NEXT_PUBLIC_*` aliases. SQL injection surface review (SEC-03) — all 6 surfaces ✅ via allow-list / parameterized binds. SEC-04 forward threat model for v5.0 Phase 45 — 5 surfaces × 13 LOCK mitigations seeding the Phase 45 ADR backlog (load-bearing). Dependency baseline (SEC-06) — 9→0 advisories via 7 pnpm-workspace overrides; Dependabot security-only config; v5.5 DEBT major-upgrade backlog (TanStack v9, Vitest v4, ESLint v10, TypeScript v6) captured.
8. **Vocabulary lock (Phase 44).** `TERMS` registry (15 entries) + `<Term>` popover primitive + `docs/GLOSSARY.md` + first-instance-per-surface wraps. ADR 0001 List-View hierarchy (View-contains-List explicit; rejects Workspace merge). ADR 0002 REVENUE_MODEL third-dimension scoping (`(partner, product, revenue_model)`); 38→42 sidebar rows; ZERO mixed-model batches in audit. REVENUE_MODEL surfaced via 3-segment `pairKey` (legacy 2-segment still parsed), AttributeFilterBar 4th attribute, `?rm=` URL round-trip, breadcrumb suffix, Partner Setup read-only Revenue Model section, defensive `MixedRevenueModelChip` substrate.
9. **First unit-test infra in the codebase.** Vitest 2.1.9 installed surgically in Plan 41-02 (young-batch-censoring synthetic test) + 11 reliability cases in Plan 43-02b. v5.5 DEBT-09 expansion seed.

**Wave 0 (shipped 2026-04-26 in advance of Phase 41):** Three quick correctness fixes — MIN_GROUPS gate on anomaly detection, comparison matrix defaults to bar mode, KPI suppression on insufficient 3mo denominator (`MIN_PLACED_DENOMINATOR_DOLLARS = $100K`).

**Known gaps:**
- **Phase 42b (SEC-02 / SEC-05) deferred** — gated on OAuth landing on Vercel. Split out 2026-04-30 to unblock v4.5 close. Slots in mid-v5.0 or post-v5.0; NOT a v5.0 entry blocker (SEC-04 from 42a is the only Phase-42 deliverable that gates Phase 45 start).
- **DCR-11 tracking-line pending** — eight ADRs (`.planning/adr/001`..`008`) shipped via Plan 41-04 with inline callsite comments; the requirement-line checkbox in `milestones/v4.5-REQUIREMENTS.md` stays `[ ]` because evidence was claimed against the plan rather than re-claimed against the requirement ID. Cosmetic; cleanup deferred.

**Key decisions:**
- v4.5 expanded from 2 to 4 phases (2026-04-26) after multi-lens audit surfaced boundary hardening (3 new v5.0 data shapes would inherit `Record<string, unknown>` debt × 3) and vocabulary lock (5 new v5.0 terms on top of 12 unowned) as same "degrades-when-deferred" profile.
- Phase 42 split into 42a (do now, OAuth-independent) + 42b (defer, OAuth-dependent) on 2026-04-30. ~70% of value (including SEC-04) was OAuth-independent; splitting let v4.5 close cleanly while preserving the load-bearing piece.
- Behavioral QA, component decomposition, state consolidation, test pyramid inversion, and perf budget deferred to v5.5 — those audits/refactors *grow* in value with post-v5.0 observation. v4.5 holds work whose value *degrades* when deferred; v5.5 holds work whose value *grows* with observation.
- ADR convention home moved from `.planning/adr/` to `docs/adr/` for v5.0-bound ADRs (Phase 44 0001 + 0002, future Phase 45 13 ADRs); statistical-threshold ADRs stayed in `.planning/adr/` as the historical home. Inline `// ADR:` comments link from code to records regardless of home.
- REVENUE_MODEL as third dimension of `(partner, product, revenue_model)` per ADR 0002 — 38→42 sidebar rows under 50/5 ceilings; threshold check passed. Defensive `MixedRevenueModelChip` substrate ships even though audit found ZERO mixed-model batches today (cheap insurance against future ETL anomalies).

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


## v5.5 Real-Use Hardening (Planned, expanded 2026-04-26)

**Phases:** 2 (50-51) | **Plans:** TBD | **Status:** Planned, follows v5.0, precedes v6.0
**Requirements:** 19 total (was 12) — across behavioral QA, in-situ research infrastructure, and an expanded tech-debt sweep

**Goal:** Post-v5.0 hardening that improves when deferred — behavioral QA from observed MBR-prep workflows, in-situ research infrastructure (telemetry + feedback channel) that's *built into v5.0* so observation has data to consume, and a tech-debt sweep informed by v5.0's actual code shape. Scope expanded 2026-04-26 to absorb the multi-lens audit's architectural refactors (data-display decomposition, state consolidation, test pyramid inversion, perf budget) — those are explicitly deferred from v4.5 because they benefit from v5.0's surface revealing the right seams.

**Phase breakdown:**
- Phase 50: Behavioral QA + In-situ Research Infrastructure — living `docs/QA-SCRIPT.md` grounded in real use + v5.0 feature regression battery + keyboard/mouse/browser/size parity + telemetry sink + confusion-button feedback channel + weekly review ritual (IUR-01..03 are *co-built into v5.0* as it ships, not retrofitted)
- Phase 51: Tech Debt Sweep (expanded) — close `docs/KNOWN-ISSUES.md` backlog + consolidate v5.0 computation-layer duplication + TanStack v9 migration + dependency upgrades + dead-code retirement + hot-path perf + **decompose `data-display.tsx`** + **state consolidation into typed Zustand store** + **test pyramid inversion (Vitest + property tests)** + **perf budget enforced in CI**

**Key decisions:**
- Splitting hardening across v4.5 (load-bearing for v5.0) and v5.5 (informed by v5.0) lets each piece land at its most effective moment. Audits whose value degrades when deferred (correctness, security architecture, boundary hardening, vocabulary lock) stay in v4.5; audits whose value grows with observation (behavioral QA, code consolidation, decomposition informed by v5.0's seams) land in v5.5.
- Architectural refactors (data-display decomposition, state consolidation) explicitly deferred to v5.5 because v5.0's triangulation/scorecard/reconciliation views will reveal the right seams. Premature decomposition creates abstractions v5.0 needs to rework.
- Test pyramid inversion lands in v5.5 (not earlier) because tests are most valuable on the *typed* substrate Phase 43 (Boundary Hardening) establishes — testing the bag-of-strings layer is wasted work.
- IUR-01..03 (telemetry, confusion button, weekly review) are *co-built into v5.0 plumbing*, not waiting for Phase 50 to start. Without that, "post-v5.0 observation" becomes "ask people sometimes" which is no data at all.
- Phase 51 effort upgraded from Medium to Large to reflect the expanded scope (4 architectural refactors added).

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


