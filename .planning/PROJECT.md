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

### Current Milestone: v4.5 Correctness & Foundation

**Goal:** Tight, structural hardening pass before v5.0 — every visible number matches a direct Snowflake query, the ingestion surface has a documented threat model, the compute layer operates on typed canonical rows (not bag-of-strings), localStorage state survives schema changes with explicit feedback, and 17 domain terms (12 existing + 5 v5.0-bound) are defined once and surfaced in-product. Holds only the work whose value *degrades* when deferred past v5.0; behavioral QA, component decomposition, and test pyramid inversion intentionally pushed to v5.5 where post-v5.0 observation informs them.

**Target features:**
- Data Correctness Audit: seed bug fix + breadth-first metric verification + scope-rollup consistency + regression fixtures + aggregation contract docs + young-batch censoring + NULL-vs-zero semantics + polarity audit + apples-and-oranges runtime invariant + statistical threshold ADRs
- Ingestion-Surface Security Review: existing-surface audit (credentials, client exposure, SQL injection) + forward threat model for v5.0 file-upload + Claude-extraction surface
- Boundary Hardening: typed `BatchRow`/`AccountRow` parser + compute-layer signature change + versioned localStorage with migration chain + Snowflake reliability primitives + unified `<ChartFrame>` primitive + tuned caching
- Vocabulary Lock & Glossary: `docs/GLOSSARY.md` + `TERMS` registry + `<Term>` component + List/View/Workspace ADR + REVENUE_MODEL surfacing as product dimension (gated on ETL)

### Active

- [ ] Phase 41 — Data Correctness Audit (DCR-01..11)
- [ ] Phase 42 — Ingestion-Surface Security Review (SEC-01..06; gated on OAuth on Vercel)
- [ ] Phase 43 — Boundary Hardening (BND-01..06)
- [ ] Phase 44 — Vocabulary Lock & Glossary (VOC-01..07; VOC-05/06/07 gated on REVENUE_MODEL ETL ~2026-05-03)

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

- **Shipped:** v3.1 deployed 2026-04-14 at data-visualizer-micah-bosters-projects.vercel.app
- **Codebase:** ~25,875 LOC TypeScript/React (post-v4.0; v4.1 added segment config, projection overlay, table modeled+Δ cols)
- **Stack:** Next.js 16, TanStack Table, React Query, Recharts, Tailwind CSS, shadcn/ui, base-ui, AI SDK (ai + @ai-sdk/anthropic + @ai-sdk/react), simple-statistics
- **Data source:** `agg_batch_performance_summary` (61 columns), `master_accounts` (78 columns, drill-down)
- **Static cache:** 477 batch rows + Affirm March account drill-down. Auto-switches to live Snowflake when credentials are added.
- **Team:** 2-3 internal partnerships team members
- **Known tech debt:** 22 items in docs/KNOWN-ISSUES.md (0 high, 9 medium, 13 low). Drill-down uses React state not URL params (v4.0 Phase 32). ANTHROPIC_API_KEY and Snowflake credentials pending Vercel provisioning.

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

---
*Last updated: 2026-04-27 — v4.5 activated via /gsd:new-milestone. v4.1 closed gap-clean 2026-04-26 (Phases 38-40 + 40.1, all PCFG/PRJ/POL/CHT/KPI/FLT/MBI requirements validated). Current scope is Phases 41-44: Data Correctness Audit (DCR-01..11), Ingestion-Surface Security Review (SEC-01..06, gated on OAuth), Boundary Hardening (BND-01..06), Vocabulary Lock & Glossary (VOC-01..07, VOC-05/06/07 gated on REVENUE_MODEL ETL). Wave 0 quick fixes shipped 2026-04-26 (MIN_GROUPS gate, matrix bar default, KPI denominator floor).*
