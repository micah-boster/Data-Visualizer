# Bounce Data Visualizer

## What This Is

A custom interactive data exploration tool for Bounce's partnerships team to visualize batch performance, compare within-partner trends, drill into account-level detail, track collection curves, detect anomalies, ask natural language questions about data, and benchmark partners against each other. Deployed on Vercel with live Snowflake data (or static cache when credentials aren't configured). Replaces static Metabase dashboards and non-deterministic Claude + Snowflake queries.

## Core Value

Surface abnormal account and batch performance data so the partnerships team can focus energy where it matters most — before problems compound.

## Requirements

### Validated

- ✓ Interactive table with 61-column batch performance data — v1.0
- ✓ Sorting (single and multi-column) — v1.0
- ✓ Column visibility, reordering, drag-and-drop — v1.0
- ✓ Dimension filtering (partner, account type, batch dropdowns) — v1.0
- ✓ Column-level filters (numeric range, text checklist) — v1.0
- ✓ Currency, percentage, count, date formatting — v1.0
- ✓ Saved views with localStorage persistence — v1.0
- ✓ CSV export respecting filters and column visibility — v1.0
- ✓ Drill-down: partner → batch → account detail — v1.0
- ✓ Breadcrumb navigation across drill levels — v1.0
- ✓ Deployed to Vercel with static data cache — v1.0
- ✓ Virtual scrolling for 400+ row performance — v1.0
- ✓ Sticky column pinning (Partner, Batch) — v1.0
- ✓ usePartnerStats computation hook (KPIs, norms, curves, trending) — v2.0
- ✓ Collection curve charts with multi-line overlay — v2.0
- ✓ KPI summary cards at partner drill-down level — v2.0
- ✓ Conditional formatting with deviation from partner norms — v2.0
- ✓ Batch-over-batch trending indicators on key metrics — v2.0
- ✓ Account-level unique identifiers (ACCOUNT_PUBLIC_ID) — v2.0
- ✓ Deterministic anomaly detection (z-scores, polarity-aware, 2-metric threshold) — v3.0
- ✓ Anomaly UI (badges, popovers, summary panel, chart highlighting) — v3.0
- ✓ Claude natural language query (streaming search bar, suggested prompts, context-scoped) — v3.0
- ✓ Cross-partner percentile rankings and portfolio outlier flags — v3.0
- ✓ Cross-partner trajectory overlay chart with reference lines — v3.0
- ✓ Partner comparison matrix (heatmap, bar ranking, plain table) — v3.0
- ✓ All v3.0 integration bugs resolved, codebase production-grade — v3.1
- ✓ Component patterns (StatCard, DataPanel, SectionHeader, ToolbarGroup/Divider, EmptyState) with CI-guarded enforcement — v4.0 Phase 29
- ✓ v4.0 Design System & Daily-Driver UX shipped end-to-end (Phases 25-37: tokens, typography, surfaces, component patterns, motion, visual polish, URL navigation, accessibility, Partner Lists, Chart Schema/Builder, Metabase SQL Import) — v4.0 (2026-04-24)
- ✓ v4.1 Feedback-Driven Polish shipped (Phases 38-40 + 40.1: branding/sidebar/columns/headers, chart correctness, KPI cascade, filters, laptop layout, Metabase chart-type override, `(partner, product)` canonical unit, segment config, Projected Curves v1, projection visibility scoping + table modeled+Δ columns) — v4.1 (2026-04-26)
- ✓ v4.5 Correctness & Foundation shipped (Phases 41 / 42a / 43 / 44; 42b OAuth-deferred): aggregation contract + per-column strategies (DCR-01/06), narrow parser + metric-eligibility + apples-and-oranges runtime invariant (DCR-07/08/10), polarity registry (DCR-09), eight statistical-threshold ADRs (DCR-11), metric-audit doc + 9 regression smokes (DCR-02..05), credential / SQL-injection / dependency audits (SEC-01/03/06), forward threat model for v5.0 ingestion (SEC-04 — load-bearing), canonical `BatchRow`/`AccountRow` typed substrate + compute-layer signature change (BND-01/02), versioned `createVersionedStore` persistence with migrations + verified writes + cross-tab sync (BND-03), Snowflake reliability primitives (retry / circuit-breaker / `X-Request-Id` / `Server-Timing` / `<DegradedBanner>`) (BND-04), unified `<ChartFrame>` primitive with polarity context (BND-05), tuned `unstable_cache` + `<RefreshButton>` + ADR 009 (BND-06), `TERMS` registry + `<Term>` primitive + `docs/GLOSSARY.md` (VOC-01/02/03), List-View hierarchy ADR (VOC-04), REVENUE_MODEL as third unit-of-analysis dimension with ADR + plumbing + sidebar/breadcrumb/Partner Setup UI (VOC-05/06/07) — v4.5 (2026-05-02)

### Current Milestone — none active

v4.5 closed 2026-05-02. v5.0 (External Intelligence) kicks off via `/gsd:new-milestone`. Phase 45 architecture must consume the v4.5 SEC-04 forward threat model (`.planning/phases/42a-security-review-oauth-independent/SEC-04-THREAT-MODEL.md`).

### Active

- [ ] **Phase 42b — Deployed-Surface Security Review** (SEC-02 client-side data exposure audit, SEC-05 auth/access state docs) — DEFERRED, gated on OAuth on Vercel. NOT a v5.0 entry blocker; slots in mid-v5.0 or post-v5.0 whenever OAuth lands.
- [ ] **DCR-11 tracking-line cleanup** — eight statistical-threshold ADRs (`.planning/adr/001`..`008`) shipped via Plan 41-04 with inline `// ADR:` callsite comments; requirement-line checkbox in `v4.5-REQUIREMENTS.md` archive stays unchecked. Cosmetic only.

(Active section will repopulate when v5.0 is defined via `/gsd:new-milestone`.)

### Out of Scope

- Behavioral QA from observed usage + in-situ research infrastructure (telemetry, confusion button) — v5.5 Phase 50 (effective only after v5.0 is in daily use; IUR-01..03 telemetry plumbing co-built into v5.0)
- Decompose `data-display.tsx` (1458 lines), state consolidation (5 Contexts → Zustand), test pyramid inversion (Vitest + property tests), perf budget enforced in CI — v5.5 Phase 51 (right seams revealed by v5.0)
- First-run onboarding tour, `?` overlay surfacing definitions on canvas, filter rail on canvas, sidebar IA reorganization, mobile/responsive policy, motion palette deployment — v6.0 (informed by v5.0 use)
- Pure visual design review, performance specialist profile, production/SRE readiness, accessibility specialist deep-dive, full external security review, content strategy review — pending expert reviews (run after v5.0 ships when surface is feature-complete)
- Target-anchored dynamic curve re-projection with confidence bands — v5.0 (Phase 49; v4.1 Phase 40 ships a simpler historical-average projection)
- Partner scorecard ingestion & competitive intelligence — v5.0
- Contractual target tracking & triangulation views — v5.0
- MBR pipeline integration — v6.0
- Pattern alerts to Slack — v6.0
- Action connections (Slack, Notion) — v6.0
- Dashboard layout with drag/drop widgets — v6.5+
- Exportable partner summary reports — v6.5+
- Real-time data streaming — batch/scheduled refresh is sufficient
- Mobile-optimized UI — desktop-first for 2-3 internal users
- User authentication — small team, can add later if needed
- Editing or writing back to Snowflake — read-only tool
- ML-based anomaly detection — overkill for 477 rows, violates explainability constraint
- Text-to-SQL generation — dataset fits in context, SQL injection risk
- Full chat/conversation interface — point queries, not conversations
- AI-generated charts — existing Recharts charts are excellent
- Metabase query import — shipped in v4.0 Phase 37 (follow-up chart-type override in v4.1 Phase 38 as MBI-01)

## Context

- **Shipped:** v4.5 deployed 2026-05-02 at data-visualizer-micah-bosters-projects.vercel.app
- **Codebase:** ~41,085 LOC TypeScript/React (post-v4.5; +8,198 / −740 vs v4.1 close — driven by typed `BatchRow` substrate, versioned persistence, Snowflake reliability primitives, ChartFrame, REVENUE_MODEL plumbing)
- **Stack:** Next.js 16, TanStack Table, React Query, Recharts, Tailwind CSS, shadcn/ui, base-ui, AI SDK (ai + @ai-sdk/anthropic + @ai-sdk/react), simple-statistics. Vitest installed in v4.5 (Plan 41-02) — first unit-test infra in the codebase; v5.5 DEBT-09 expansion seed.
- **Data source:** `agg_batch_performance_summary` (now 62 columns post-REVENUE_MODEL ETL 2026-04-29), `master_accounts` (78 columns, drill-down). REVENUE_MODEL surfaced as third dimension of `(partner, product, revenue_model)` per ADR 0002.
- **Static cache:** 477 batch rows + Affirm March account drill-down, routed through `parseBatchRow` at boot (v4.5 BND-01) so fixture corruption surfaces at startup. Auto-switches to live Snowflake when credentials are added.
- **Team:** 2-3 internal partnerships team members
- **Known tech debt:** 22 items in docs/KNOWN-ISSUES.md (0 high, 9 medium, 13 low). Drill-down still uses React state not URL params at root (v4.0 Phase 32 partial; `?p=&pr=&b=&rm=` round-trip exists for sidebar pair selection). ANTHROPIC_API_KEY and Snowflake credentials pending Vercel provisioning. OAuth on Vercel still pending — gates Phase 42b. v5.5 DEBT major-upgrade backlog captured in Plan 42a-01: TanStack v9, Vitest v4, ESLint v10, TypeScript v6.
- **Correctness baseline:** `docs/METRIC-AUDIT.md` (130-line living doc, 36 audit rows × 3 scopes; ✅ 17 / 🔧 17 / ⏭ 1 / ❌ 0) is what v5.0 triangulation reads to know which metrics are app-vs-Snowflake equal.

## Constraints

- **Data source**: Snowflake — all queries go through Snowflake connector
- **Deployment**: Vercel — accessible via URL, auto-deploy on push to main
- **Stack**: Next.js / React / TanStack Table / Recharts / AI SDK
- **Users**: 2-3 internal people — no complex auth or multi-tenancy
- **Snowflake credentials**: Server-side only, never exposed to client
- **ANTHROPIC_API_KEY**: Server-side only, never exposed to client
- **Explainable transformations**: Every data transformation must have an explicit, documented algorithm

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Custom React app over low-code (Retool) | Full control over UX, ability to add AI layer later | ✓ Good — enabled all v1-v3 features |
| Start with `agg_batch_performance_summary` | Rich 61-column table covering core metrics | ✓ Good — solid foundation |
| Deterministic views first, AI later | Need reliable, saveable views before AI layer | ✓ Good — v1+v2 fully deterministic |
| Desktop-only MVP | Only 2-3 internal users, all on desktop | ✓ Good — no mobile complaints |
| Static data cache for deployment | Snowflake credentials not immediately available | ✓ Good — unblocked deployment |
| React state for drill-down (not URL params) | useSearchParams caused navigation freezes | ⚠️ Revisit — lose browser back button |
| border-separate on table | Required for sticky column z-index to work | ✓ Good |
| usePartnerStats composing 4 computation modules | Separation of concerns, testable | ✓ Good — clean architecture |
| Recharts with shadcn Chart wrapper | Consistent theming, React 19 compatible | ✓ Good — oklch colors work well |
| Deviation coloring via React Context | Norms computed once, consumed by any cell | ✓ Good — no prop drilling |
| Trending algorithm documented in docs/ | Per project constraint on explainability | ✓ Good — TRENDING-ALGORITHM.md |
| Deterministic anomaly detection (z-scores, not ML) | Explainability constraint, 477 rows too small for ML | ✓ Good — interpretable results |
| Search bar pattern (not chat) for NLQ | Point queries match usage pattern, simpler UX | ✓ Good — clean, focused |
| AI SDK useChat + streamText for streaming | No custom SSE/WebSocket code needed | ✓ Good — clean plumbing |
| Cross-partner percentile via simple-statistics | Lightweight, well-tested, single dependency | ✓ Good — reliable |
| Dollar-weighted trajectory as default | Matches primary business use case | ✓ Good — sensible default |
| Comparison matrix shared types in matrix-types.ts | DRY across 3 view modes | ✓ Good — clean code |
| getPartnerName/getBatchName utilities | DRY, eliminated 14+ raw String coercions | ✓ Good — v3.1 cleanup |
| Known issues documented comprehensively | Production-grade codebase snapshot | ✓ Good — 22 issues catalogued |
| v4.5 expanded from 2 phases to 4 (boundary hardening + vocabulary lock added) | Multi-lens audit (data, structural, design-thinking, code-quality) surfaced two more "degrades-when-deferred" categories. v5.0 adds 3 new data shapes × 5 new terms — without typed boundaries and locked vocabulary first, debt compounds | ✓ Good — landed all four phases in 5 days |
| Phase 42 split into 42a (do now) + 42b (OAuth-deferred) on 2026-04-30 | OAuth on Vercel still pending. SEC-04 (forward threat model) is load-bearing for v5.0 Phase 45 and is OAuth-independent; SEC-02/05 genuinely need a deployed surface. Splitting let v4.5 close cleanly with the load-bearing piece preserved | ✓ Good — Phase 45 unblocked; 42b decoupled from v5.0 entry |
| Eight statistical-threshold ADRs with global no-partner-overrides convention | Locks v4.5 against p-hacking and preserves v5.0 triangulation comparability across partners. Every threshold (`Z_THRESHOLD`, `MIN_GROUPS`, 5% trending, 3-batch baseline, cascade tier breakpoints, `MIN_PLACED_DENOMINATOR_DOLLARS`) gets a record, every callsite gets an inline `// ADR:` comment | ✓ Good — single source of truth for stat thresholds; trending baseline discrepancy (up-to-4 not 3) discovered + captured in ADR 004 |
| `BatchRow`/`AccountRow` canonical substrate (branded `BatchAgeMonths`, `number \| null` for rate-shaped fields, long-format curve baked in) over the prior `Record<string, unknown>[]` | v5.0 introduces 3 new data shapes (scorecards, targets, triangulation) — without a typed parser pattern first, v5.0 inherits and amplifies bag-of-strings debt × 3 | ✓ Good — three duplicate `coerceAgeMonths` collapsed to one; static cache routes through parser at boot |
| `createVersionedStore<T>` with envelope + migration chain + verified writes + cross-tab sync | localStorage was previously direct reads/writes scattered across views/columns/lists/presets. v5.0 adds scorecard library + target versions + reconciliation flags — schema migration must be loud and recoverable, not silent drop | ✓ Good — 5 modules wrapped at schemaVersion 1; `MissingMigratorError` throws in dev / drops in prod with console.error |
| Snowflake reliability wrapper (retry + circuit breaker + `Server-Timing` + `X-Request-Id`) on every Snowflake-touching API route | Single-user-but-shared-infra means transient failures must self-heal; a circuit breaker prevents cascading slow paths from hammering a degraded warehouse. Request-id correlation makes ops debugging tractable | ✓ Good — `<DegradedBanner>` + `(stale)` badge surface stale-data state; sanitized client errors prevent schema leak |
| `<ChartFrame>` primitive composing all four current charts (Curve, Trajectory, Matrix, Sparkline) | v5.0 triangulation visualizations would otherwise repeat the title/legend/empty/loading/stale-column/polarity-context shell N times. Lift the shell once; chart bodies stay focused on data → marks | ✓ Good — `useChartFramePolarity()` hook eliminates prop-threading; `<StaleColumnWarning>` deleted (absorbed into ChartFrame title row) |
| REVENUE_MODEL as third dimension of unit-of-analysis `(partner, product, revenue_model)` (ADR 0002) | "Just a product" framing — a contingency-only deal and a debt-sale deal have different economics and shouldn't blend at the rollup. Sidebar audit recorded 38→42 rows (max 2 per partner; 4 multi-model partners), under the 50-row scanability ceiling — third-dimension threshold check passed | ✓ Good — pairKey emits 3-segment `::` key; legacy 2-segment keys still parsed; ZERO mixed-revenue-model batches in audit (defensive `MixedRevenueModelChip` substrate available) |
| Behavioral QA + component decomposition + test pyramid inversion + perf budget moved to v5.5 (DEBT-07..10) | These audits *grow* in value with post-v5.0 observation. The right component seams are the ones v5.0 reveals; the right test surface is the one v5.0 actually has; QA scripts written before v5.0 audit hypothetical flows. Build from observed use, not imagined use | — Pending — re-evaluate after v5.0 ships |

---
*Last updated: 2026-05-02 after v4.5 milestone — Correctness & Foundation shipped. 25/28 in-scope requirements closed across Phases 41 / 42a / 43 / 44; Phase 42b (SEC-02/05) deferred until OAuth lands on Vercel; DCR-11 ADRs implemented under Plan 41-04 with requirement-line cleanup pending. Codebase grew to ~41,085 LOC (typed `BatchRow` substrate, versioned persistence, Snowflake reliability primitives, `<ChartFrame>`, REVENUE_MODEL plumbing). Vitest installed (first unit-test infra; v5.5 DEBT-09 expansion seed). Next: `/gsd:new-milestone` for v5.0 External Intelligence (Phases 45-49 — Scorecard ingestion, contractual targets, triangulation, reconciliation, dynamic curve re-projection). Phase 45 architecture must consume the SEC-04 forward threat model.*
