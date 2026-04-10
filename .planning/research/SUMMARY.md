# Project Research Summary

**Project:** Bounce Data Visualizer
**Domain:** Internal data analytics dashboard — debt collection partnerships team
**Researched:** 2026-04-10
**Confidence:** HIGH

## Executive Summary

The Bounce Data Visualizer is an internal data exploration dashboard connecting 2-3 partnerships team members to Snowflake batch performance data. The domain is well-trodden: a read-only analytics tool with interactive tables, saved views, and anomaly highlighting. Experts build this type of tool as a single Next.js application on Vercel, using TanStack Table for the data grid, Recharts for charts, TanStack Query for server-state caching, and the official `snowflake-sdk` via API routes that run server-side as Vercel Serverless Functions. The key architectural insight is that all Snowflake access happens in Route Handlers — credentials never reach the client, and the dataset (533 rows, 61 columns) is small enough to return in a single response and sort/filter client-side.

The recommended approach is to build in four progressive waves: first, validate the Snowflake data layer in isolation before touching any UI; second, ship a minimal but functional interactive table; third, add the differentiating features (anomaly highlighting, period-over-period tracking, saved views); and fourth, build the visualization and power-user features. This order is non-negotiable — two of the eleven identified pitfalls are Critical and both hit in the data foundation phase. The single biggest risk is building a beautiful UI on top of a data layer that has not been tested with real Snowflake data, which produces silent data quality failures that erode user trust permanently.

The project's core value proposition — deterministic, saveable views that replace ad-hoc Claude+Snowflake queries — is best protected by getting saved views right before adding any AI or query-editor features. The anti-features list is as important as the feature list: no auth, no write-back, no real-time streaming, no SQL editor, and no mobile support. Scope discipline is critical for a 2-3 user internal tool where every hour of engineering must pay direct workflow value.

---

## Key Findings

### Recommended Stack

The stack is a consolidated single Next.js 15 app (App Router) deployed to Vercel — no separate backend, no second deploy target, no CORS complexity. React Server Components enable server-side Snowflake queries on initial page load; Route Handlers handle all subsequent data fetching. TanStack Table v8 is the correct headless table engine, paired with Tailwind CSS and Shadcn/ui component primitives for styling. TanStack Query manages server-state caching with stale-while-revalidate, and Zustand handles client-state (filter configurations, saved view definitions). The `snowflake-sdk` Node.js driver runs exclusively inside Route Handlers, with credentials stored in Vercel environment variables.

**Core technologies:**
- **Next.js 15 (App Router):** Meta-framework — RSC for server-side data fetching, Route Handlers for Snowflake API, Vercel-native deployment
- **TanStack Table v8:** Data grid engine — headless, supports sort/filter/column reordering/visibility/resizing without paying for enterprise features
- **Recharts:** Charting — declarative JSX, handles all required chart types (line, area, bar, composed), SVG output for easy styling
- **TanStack Query v5:** Server-state caching — stale-while-revalidate makes tab switching feel instant, prevents redundant Snowflake queries
- **Zustand v5:** Client-state — tiny, no boilerplate, `persist` middleware writes saved views to localStorage for zero-infrastructure MVP
- **snowflake-sdk (Node.js):** Snowflake connectivity — official driver, server-side only, parameterized queries, keeps credentials off the client
- **Tailwind CSS v4 + Shadcn/ui:** Styling — full control over data-dense layout, no CSS-in-JS runtime overhead
- **nuqs v2:** URL-synced state — filter state encoded in URL for shareable/bookmarkable views
- **pnpm v9:** Package management — faster installs, strict dependency resolution

**Explicitly ruled out:** Python/FastAPI backend, Pages Router, AG Grid, Redux, MUI, Prisma/Drizzle, D3 as primary, tRPC, GraphQL, NextAuth, real database for MVP saved views.

### Expected Features

**Must have (table stakes) — deliver before claiming the tool is usable:**
- **TS-1: Interactive Data Table** — sort, filter, multi-column sort; users will click column headers on day one
- **TS-2: Column Visibility and Reordering** — 61 columns are unworkable without hide/show and drag-to-reorder
- **TS-3: Global and Dimension Filters** — filter by partner, account type, batch, time period; the core partnership workflow requirement
- **TS-4: Data Loading and Refresh** — reliable Snowflake fetch, loading states, error handling, stale data indicators
- **TS-5: Saved Views** — the primary reason to build this tool; non-determinism of Claude queries is the problem being solved
- **TS-6: Data Formatting** — currency, percentages, dates; raw Snowflake numbers are unreadable
- **TS-7: Export to CSV/Excel** — users will share data with non-tool stakeholders
- **TS-8: Grid Performance** — virtual scrolling or pagination; table lag makes users revert to Metabase

**Should have (differentiators) — what justifies building custom over using Metabase:**
- **D-1: Anomaly Highlighting** — threshold-based cell/row color coding; the core value proposition from PROJECT.md
- **D-2: Period-over-Period Change Tracking** — MoM/WoW/batch-over-batch deltas with directional indicators
- **D-3: Collection Curve Visualization** — line charts of 1-60 month collection progression; transforms 60 opaque columns into a readable curve
- **D-4: Benchmark Comparison** — deviation from portfolio/partner averages contextualizes every metric
- **D-8: KPI Summary Cards** — portfolio-level metrics above the table, reactive to active filters

**Defer to v2+:**
- **D-5: Dashboard Layout (drag-and-drop widgets)** — high complexity, low urgency for 2-3 users
- **D-6: Drill-Down Navigation** — depends on additional Snowflake tables not yet available
- **D-7: Inline Sparklines** — nice-to-have, depends on D-2 data availability
- **AF-1: AI/Natural Language Query** — explicitly v2 in PROJECT.md; contradicts the determinism goal
- **AF-2: User Authentication** — overkill for 2-3 internal users
- Everything else in the anti-features list (write-back, real-time, mobile, alerting, PDF, SQL editor)

### Architecture Approach

The architecture is a three-tier system: a React client (TanStack Table + Recharts + Zustand), a Next.js Route Handler layer (stateless serverless functions that construct parameterized SQL), and Snowflake as the single data source. All Snowflake access is server-side. The client sends structured filter/sort/column parameters — never raw SQL. The API validates inputs against a column whitelist before constructing queries. Anomaly threshold calculations run client-side after data loads, keeping the API layer stateless. Saved views are JSON config objects (filters + column config + sort + thresholds) stored in Zustand/localStorage for MVP, with a clear upgrade path to Vercel KV when cross-user sharing is needed.

**Major components:**
1. **DataTable (client)** — TanStack Table v8, core interaction surface, most user time spent here
2. **FilterBar (client)** — partner/batch/account type/time period controls; drives all API query parameters
3. **AnomalyEngine (client)** — client-side threshold computation and row/cell highlighting; stateless, fast, user-adjustable
4. **ChartPanel (client)** — Recharts collection curves and distribution charts; reads selected rows from shared state
5. **/api/query Route Handler (server)** — parameterized SQL construction, Snowflake execution, JSON response; no persistent state
6. **ViewManager (client+server)** — serializes full UI state to JSON, persists via localStorage (MVP) or /api/views (v2)
7. **/api/meta Route Handler (server)** — returns distinct values for filter dropdowns; highly cacheable

**Boundary rules:** Client components never import `snowflake-sdk`. API routes never return raw Snowflake error messages. State management is the single source of truth — components read from it, API responses write to it.

### Critical Pitfalls

1. **Validate the data layer before building any UI** (Critical) — Write and test every Snowflake query with real data first. Assert row counts, NULL rates, value ranges, and aggregation level assumptions. Mock data hides schema surprises. This is the single highest-risk activity in the project.

2. **Snowflake cold warehouse latency** (Critical) — Warehouse auto-suspend means the first query of each session takes 5-30 seconds. Mitigate with: a loading skeleton UI from day one, aggressive server-side caching (15-60 min is safe for batch data), a "data as of [timestamp]" indicator, and optionally a scheduled keep-warm ping during business hours.

3. **Never SELECT * from the 61-column table** (High) — Design the API to accept an explicit column list from the first commit. Fetching all columns inflates response size, increases Snowflake compute costs, and creates browser memory pressure. Enforce this in code review.

4. **Saved views break silently on schema changes** (High) — Store column metadata including type and a schema version in each saved view. Validate column references against the live schema on view load and surface warnings instead of rendering broken data. Plan for the schema to evolve.

5. **Anomaly thresholds go stale and users stop trusting them** (High) — Use relative thresholds (standard deviations from peer group) not hardcoded absolute values. Make thresholds configurable per view from the start, not a future enhancement. Store threshold configurations in the saved view definition, not in code.

---

## Implications for Roadmap

Based on combined research, the dependency chain is clear and the phase structure follows directly from it.

### Phase 1: Data Foundation and API Layer
**Rationale:** Two Critical pitfalls hit here. The Snowflake connection is the single riskiest integration point — serverless cold starts, credential management, query construction patterns, and data quality all need to be proven before any UI exists. Everything downstream is blocked on this.
**Delivers:** Working `/api/query`, `/api/meta` Route Handlers with Snowflake connectivity. Validated data quality for `agg_batch_performance_summary`. Column whitelist established. Loading skeleton UI. "Data as of" timestamp indicator. Basic Next.js app scaffolding (pnpm, TypeScript strict, ESLint, Tailwind, Shadcn/ui).
**Addresses:** TS-4 (Data Loading)
**Avoids:** Pitfall 5 (building UI before validating data), Pitfall 1 (cold warehouse), Pitfall 2 (SELECT *), Pitfall 6 (query cost spiral), Pitfall 9 (Vercel connection limits)
**Research flag:** Needs validation of actual Snowflake cold start behavior on Vercel Hobby vs. Pro, and whether module-scope connection caching works across warm invocations as expected.

### Phase 2: Core Interactive Table
**Rationale:** The table is the primary interface — more user time will be spent here than anywhere else. Getting this right before adding higher-level features (anomaly highlighting, saved views) ensures the foundation is solid. Filtering and formatting must ship with the table because an unfiltered, unformatted 61-column table is not usable even for testing.
**Delivers:** TanStack Table with sort, filter, column visibility, column reorder, column resize. Global FilterBar with partner/batch/account type/time period controls. Data formatting (currency, percentages, dates). Pagination or virtual scrolling for performance. CSV export.
**Addresses:** TS-1, TS-2, TS-3, TS-6, TS-7, TS-8
**Avoids:** Pitfall 7 (unmanageable client state — define Zustand store shape upfront), Pitfall 11 (stale data — freshness indicator already in place from Phase 1)
**Research flag:** Column grouping UX for 61-column table is a design problem without an obvious answer — needs early user observation (Pitfall 10) before locking in the column picker pattern.

### Phase 3: Anomaly Highlighting and Saved Views
**Rationale:** These are the core reasons to build this tool instead of continuing with Metabase. Anomaly highlighting surfaces the problem accounts automatically. Saved views make the tool persistent and deterministic — the explicit solution to the Claude+Snowflake non-determinism problem. Both require the full table and filter system to be in place first.
**Delivers:** AnomalyEngine with relative threshold computation (standard deviations from peer group). Configurable threshold presets per metric per view. Cell/row color coding. Zustand-persisted saved views (localStorage). View save/load/rename UI. KPI summary cards reactive to active filters.
**Addresses:** D-1 (Anomaly Highlighting), TS-5 (Saved Views), D-8 (KPI Cards)
**Avoids:** Pitfall 4 (hardcoded thresholds — relative thresholds from the start), Pitfall 3 (saved views breaking — schema version metadata in view config from the start)
**Research flag:** "What is abnormal?" requires a 30-minute user observation session with the partnerships team before writing any threshold logic. Default values cannot be guessed from data alone.

### Phase 4: Period-over-Period Tracking and Collection Curve Charts
**Rationale:** Change tracking and collection curve visualization are the power features that make this tool genuinely superior to Metabase for the partnerships team's core workflows. They depend on the full data layer and table being stable. Collection curves require working row selection in the table.
**Delivers:** MoM/WoW/batch-over-batch delta columns with directional indicators. Comparison semantics defined and documented (calendar month vs. rolling 30 days, NULL handling, zero-denominator convention). Collection curve line charts (1-60 month progression) from already-loaded row data. Multi-batch overlay. Portfolio benchmark reference line. Benchmark comparison deviations in the table.
**Addresses:** D-2 (Period-over-Period), D-3 (Collection Curves), D-4 (Benchmark Comparison)
**Avoids:** Pitfall 8 (wrong period-over-period calculations — build a comparison calculation library with unit tests for edge cases: zero-to-nonzero, NULL periods, February/short months)
**Research flag:** Standard patterns for period-over-period with debt collection data. The calculation semantics (how to handle irregular batch intervals) may need domain-specific input from the partnerships team.

### Phase 5: Polish, Power Features, and V2 Prep
**Rationale:** With all core and differentiating features stable, this phase tightens the UX, adds delight features, and prepares the upgrade paths that will be needed when the tool succeeds (more users, shared views, additional tables).
**Delivers:** URL state sync (nuqs) for shareable filter/view links. Inline sparklines for trend scanning. Vercel KV migration path for cross-user shared views. Additional Snowflake table support (`master_accounts`) scaffolded in the API layer. Drill-down navigation (if requested by users). Usage logging to identify unused features.
**Addresses:** D-6 (Drill-Down), D-7 (Sparklines), URL sharability
**Avoids:** Pitfall 10 (features nobody uses — only build D-6/D-7 if user observation confirms demand)
**Research flag:** Standard patterns. No deep research needed unless drill-down tables require significant new schema understanding.

### Phase Ordering Rationale

- **Data before UI** is enforced by two Critical pitfalls that cost user trust permanently if violated.
- **Table before charts** because the table is the primary interaction surface; charts are secondary context.
- **Anomaly + saved views together** because they share the same saved view config object and both deliver the core value proposition; building one without the other leaves the tool incomplete.
- **Change tracking after table** because period-over-period requires stable data loading patterns and the temporal query logic is the most error-prone area (Pitfall 8).
- **Power features last** to avoid building complexity that users may not need (Pitfall 10).

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1:** Snowflake cold start behavior on Vercel Hobby tier specifically — the 10-second function timeout on Hobby may conflict with warehouse warm-up time. Validate before committing to Hobby tier.
- **Phase 3:** Anomaly threshold defaults require user observation, not research. Schedule a working session with the partnerships team before implementing AnomalyEngine.
- **Phase 4:** Period-over-period calculation edge cases with debt collection batch data (irregular intervals, partial cohorts) need domain validation.

Phases with standard patterns (skip research-phase):
- **Phase 2:** TanStack Table + Zustand + Next.js Route Handlers is extremely well-documented. No research phase needed.
- **Phase 5:** URL state sync with nuqs, Vercel KV integration — standard Vercel/Next.js patterns with excellent documentation.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All major technology choices are well-established with strong community consensus. Version recommendations based on stable releases. TanStack Table, Recharts, Zustand, and snowflake-sdk are all actively maintained with clear documentation. |
| Features | HIGH | Feature list derived directly from PROJECT.md requirements cross-referenced with internal analytics tooling patterns. The 8 table-stakes features are non-negotiable. Differentiator prioritization is informed by the core value proposition (deterministic views over Claude queries). |
| Architecture | HIGH | Architecture is based on actual Snowflake schema analysis (533 rows, 61 columns, 37 partners). The full-dataset-per-query decision is validated by data volume. Client-side anomaly computation is appropriate at this scale. |
| Pitfalls | HIGH | Pitfalls are drawn from Snowflake + Vercel serverless deployment patterns that are well-documented in production experience. The cold start and SELECT * pitfalls in particular are confirmed failure modes, not theoretical risks. |

**Overall confidence:** HIGH

### Gaps to Address

- **Anomaly threshold baseline values:** What is "normal" for penetration rate, collection curve deviation, engagement rates by partner/account type? This cannot be determined from research — requires 30 minutes with the partnerships team before Phase 3 begins.
- **Snowflake warehouse size and auto-suspend settings:** The existing Snowflake warehouse configuration (XS vs. S, auto-suspend interval) directly affects cold start UX. Confirm the current settings before finalizing the caching strategy in Phase 1.
- **Data refresh frequency:** How often does `agg_batch_performance_summary` update? This determines the appropriate `staleTime` in TanStack Query and whether the keep-warm cron strategy is necessary. Confirm with the data team.
- **Additional tables timeline:** When will `master_accounts` and `master_outbound_interactions` need to be added? This affects whether the drill-down feature (D-6) belongs in MVP or v2.
- **View storage decision (Vercel KV vs. localStorage):** The ARCHITECTURE.md notes a divergence from STACK.md on this point — ARCHITECTURE recommends Vercel KV from the start, STACK recommends localStorage first. Resolution: start with localStorage (zero infrastructure), migrate to Vercel KV in Phase 5 if users need to share views across machines.

---

## Sources

### Primary (HIGH confidence)
- PROJECT.md — requirements, scope constraints, user count, data source, explicit v2 deferral list
- `bounce.agg_batch_performance_summary` schema analysis — 61 columns documented by category, 533 rows, 37 partners, 532 batches
- Next.js 15 App Router documentation — RSC, Route Handlers, Vercel deployment model
- TanStack Table v8 documentation — column ordering, visibility, sorting, filtering APIs
- Snowflake Node.js SDK documentation — connection patterns, serverless considerations

### Secondary (MEDIUM confidence)
- Vercel serverless function behavior with Snowflake — cold start timing and connection reuse patterns derived from community production reports; actual behavior on this specific warehouse size needs validation
- Recharts v2 capability assessment — chart type coverage assessed against requirements; Observable Plot/D3 escape hatch available if a chart type proves unimplementable

### Tertiary (LOW confidence)
- Anomaly threshold ranges — no domain-specific source for "normal" penetration rates, collection curve benchmarks, or engagement rates; must be provided by the partnerships team
- Period-over-period calculation semantics for debt collection batch data — general financial time-series patterns applied; debt collection batch irregularity may introduce edge cases not covered by standard patterns

---

*Research completed: 2026-04-10*
*Ready for roadmap: yes*
