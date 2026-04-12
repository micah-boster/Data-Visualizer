# Bounce Data Visualizer

## What This Is

A custom interactive data exploration tool for Bounce's partnerships team to visualize batch performance, drill into account-level detail, and track collection trends. Deployed on Vercel with live Snowflake data (or static cache when credentials aren't configured). Replaces static Metabase dashboards and non-deterministic Claude + Snowflake queries.

## Current Milestone: v2.0 Within-Partner Comparison

**Goal:** Enable within-partner batch comparison so the team can see whether a partner's latest batches are performing better or worse than their historical norm — through collection curve charts, conditional formatting, and trending metrics.

**Target features:**
- Collection curve charts (overlay batches from same partner)
- Conditional formatting (deviation from partner historical norms)
- Batch-over-batch trending for key metrics
- KPI summary cards at partner drill-down level
- Live Snowflake data (carry from v1)
- Account-level unique identifiers

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

### Active

- [ ] Snowflake credentials in Vercel env vars (live data instead of static cache)
- [ ] Within-partner batch comparison and collection curve visualization
- [ ] Conditional formatting based on deviation from partner historical norms
- [ ] Batch-over-batch trending for key metrics
- [ ] KPI summary cards at partner drill-down level
- [ ] Account-level unique identifiers (ACCOUNT_PUBLIC_ID from Snowflake)

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

## Context

- **Shipped:** v1.0 deployed 2026-04-11 at data-visualizer-micah-bosters-projects.vercel.app
- **Codebase:** ~7,150 LOC TypeScript/React, 188 files
- **Stack:** Next.js 16, TanStack Table, React Query, Tailwind CSS, shadcn/ui
- **Data source:** `agg_batch_performance_summary` (61 columns), `master_accounts` (78 columns, drill-down)
- **Static cache:** 477 batch rows + Affirm March account drill-down. Auto-switches to live Snowflake when credentials are added.
- **Team:** 2-3 internal partnerships team members
- **Known tech debt:** drill-down uses React state not URL params (no browser back), static cache covers partial data

## Constraints

- **Data source**: Snowflake — all queries go through Snowflake connector
- **Deployment**: Vercel — accessible via URL, auto-deploy on push to main
- **Stack**: Next.js / React / TanStack Table
- **Users**: 2-3 internal people — no complex auth or multi-tenancy
- **Snowflake credentials**: Server-side only, never exposed to client
- **Explainable transformations**: Every data transformation must have an explicit, documented algorithm

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Custom React app over low-code (Retool) | Full control over UX, ability to add AI layer later | ✓ Good — enabled all v1 features |
| Start with `agg_batch_performance_summary` | Rich 61-column table covering core metrics | ✓ Good — solid foundation |
| Deterministic views first, AI later | Need reliable, saveable views before AI layer | ✓ Good — v1 is fully deterministic |
| Desktop-only MVP | Only 2-3 internal users, all on desktop | ✓ Good — no mobile complaints |
| Static data cache for deployment | Snowflake credentials not immediately available | ✓ Good — unblocked deployment |
| React state for drill-down (not URL params) | useSearchParams caused navigation freezes | ⚠️ Revisit — lose browser back button |
| border-separate on table | Required for sticky column z-index to work | ✓ Good |

---
*Last updated: 2026-04-12 after v2.0 milestone start*
