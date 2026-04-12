# Bounce Data Visualizer

## What This Is

A custom interactive data exploration tool for Bounce's partnerships team to visualize batch performance, compare within-partner trends, drill into account-level detail, and track collection curves. Deployed on Vercel with live Snowflake data (or static cache when credentials aren't configured). Replaces static Metabase dashboards and non-deterministic Claude + Snowflake queries.

## Current State

**Shipped:** v2.0 (2026-04-12)
**No active milestone** — planning next

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

### Active

- [ ] Snowflake credentials in Vercel env vars (live data instead of static cache)

### Out of Scope

- AI/Claude natural language query layer — v3 feature
- Claude-powered anomaly detection — v3 feature
- Cross-partner comparison with normalization — requires baseline model, v3+
- Dynamic curve re-projection based on actuals — requires forecasting model, v3+
- Dashboard layout with drag/drop widgets — v3 feature
- Real-time data streaming — batch/scheduled refresh is sufficient
- Mobile-optimized UI — desktop-first for 2-3 internal users
- User authentication — small team, can add later if needed
- Editing or writing back to Snowflake — read-only tool
- Sparklines in table cells — performance risk with virtual scrolling, defer

## Context

- **Shipped:** v2.0 deployed 2026-04-12 at data-visualizer-micah-bosters-projects.vercel.app
- **Codebase:** ~9,400 LOC TypeScript/React
- **Stack:** Next.js 16, TanStack Table, React Query, Recharts, Tailwind CSS, shadcn/ui, base-ui
- **Data source:** `agg_batch_performance_summary` (61 columns), `master_accounts` (78 columns, drill-down)
- **Static cache:** 477 batch rows + Affirm March account drill-down. Auto-switches to live Snowflake when credentials are added.
- **Team:** 2-3 internal partnerships team members
- **Known tech debt:** drill-down uses React state not URL params (no browser back), dimension filter doesn't reduce table at root level, static cache covers partial data

## Constraints

- **Data source**: Snowflake — all queries go through Snowflake connector
- **Deployment**: Vercel — accessible via URL, auto-deploy on push to main
- **Stack**: Next.js / React / TanStack Table / Recharts
- **Users**: 2-3 internal people — no complex auth or multi-tenancy
- **Snowflake credentials**: Server-side only, never exposed to client
- **Explainable transformations**: Every data transformation must have an explicit, documented algorithm

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Custom React app over low-code (Retool) | Full control over UX, ability to add AI layer later | ✓ Good — enabled all v1+v2 features |
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

---
*Last updated: 2026-04-12 after v2.0 milestone completion*
