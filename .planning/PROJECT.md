# Bounce Data Visualizer

## What This Is

A custom interactive data exploration tool for Bounce's partnerships team to visualize account health, track changes across periods/batches/benchmarks, and quickly surface accounts or batches that need attention. Replaces static Metabase dashboards and non-deterministic Claude + Snowflake queries with a purpose-built, reorderable, saveable dashboard experience.

## Core Value

Surface abnormal account and batch performance data so the partnerships team can focus energy where it matters most — before problems compound.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Interactive table views of batch performance data from Snowflake
- [ ] Filtering by partner, batch, account type, time period
- [ ] Sorting and reordering columns and rows
- [ ] Saved views — both filtered table configurations and custom dashboard layouts
- [ ] Change tracking — period-over-period (MoM, WoW), batch-over-batch, and vs. portfolio benchmarks
- [ ] Visual indicators for metrics outside normal thresholds (anomaly highlighting)
- [ ] Collection curve visualization (1-60 month collection progression)
- [ ] Penetration rate and engagement metric displays
- [ ] Deployable to Vercel for team access via URL

### Out of Scope

- AI/Claude natural language query layer — v2 feature, not MVP
- Claude-powered anomaly detection — v2 feature
- Real-time data streaming — batch/scheduled refresh is sufficient
- Mobile-optimized UI — desktop-first for 2-3 internal users
- User authentication — small team, can add later if needed
- Editing or writing back to Snowflake — read-only tool

## Context

- Primary data source: `bounce.agg_batch_performance_summary` (61 columns covering collection curves, penetration rates, engagement metrics, batch demographics, balance distributions)
- Additional tables will be added over time: `master_accounts`, `master_outbound_interactions`, payment/collection tables
- Current tools: Metabase (too static, hard to use), Claude + Snowflake MCP (useful but non-deterministic, can't save/reorder views)
- Team size: 2 users now, maybe 3 later — all internal partnerships team members
- Use cases: find problem accounts in aggregate, check specific account health, review portfolio trends
- "Abnormal" means: metrics outside thresholds, sudden period-over-period changes, and accounts breaking from historical patterns

## Constraints

- **Data source**: Snowflake — all queries go through Snowflake connector
- **Deployment**: Vercel (or similar) — needs to be accessible via URL
- **Stack**: React/Next.js frontend, API layer for Snowflake queries
- **Users**: 2-3 internal people — no need for complex auth or multi-tenancy
- **Snowflake credentials**: Must be handled securely server-side, never exposed to client

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Custom React app over low-code (Retool) | Full control over UX, ability to add AI layer later, portability | — Pending |
| Start with `agg_batch_performance_summary` | Rich 61-column table covering core metrics, good foundation | — Pending |
| Deterministic views first, AI exploration later | Need reliable, saveable, reorderable views before adding non-deterministic AI layer | — Pending |
| Desktop-only MVP | Only 2-3 internal users, all on desktop | — Pending |

---
*Last updated: 2026-04-10 after initialization*
