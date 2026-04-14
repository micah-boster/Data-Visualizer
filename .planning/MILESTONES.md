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

