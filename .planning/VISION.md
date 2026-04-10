# Product Vision: Bounce Data Visualizer

## One-liner

The single tool Bounce's partnerships team opens every morning to know where to focus.

## Arc

Each version builds on the last:
- **v1**: Can I find the data? → Yes
- **v2**: Does the data find me? → Yes
- **v3**: Can I see everything in one place? → Yes
- **v4**: Do I enjoy using this? → Yes
- **v5**: Can I ask questions in plain English? → Yes

---

## v1 — Foundation
**Theme:** Replace Metabase with something you actually want to use

Interactive table, filters, saved views, export, drill-down. The goal is: open it, find what you need, save the view, come back tomorrow. If the team stops opening Metabase, v1 succeeded.

**Data:** `agg_batch_performance_summary` (61 columns, ~533 rows)
**Users:** 2-3 partnerships team members, desktop

### Milestone criteria
- Team uses this instead of Metabase for batch performance data
- Saved views are being created and reused

---

## v2 — Intelligence
**Theme:** The tool tells you where to look

- Anomaly highlighting — cells/rows light up when metrics cross thresholds (red/yellow/green)
- Period-over-period deltas — MoM, batch-over-batch change columns with directional indicators
- Benchmark overlays — "this partner vs portfolio average" inline
- KPI summary cards — top-of-page aggregates that update with filters
- Collection curve charts — 1-60 month progression visualized, overlay batches for comparison

### Milestone criteria
- Team opens the tool and immediately sees what needs attention without searching
- Collection curve comparisons replace manual spreadsheet analysis

---

## v3 — Multi-Source & Scale
**Theme:** Everything in one place

- Additional Snowflake tables — `master_accounts`, `master_outbound_interactions`, payment data
- Cross-table joins — "show me accounts with high balance but low engagement"
- User authentication — personal views, role-based access as team grows
- Scheduled snapshots — daily data captures for true historical comparison
- Embedded in workflow — Slack notifications for threshold breaches, weekly digest emails

### Milestone criteria
- Team no longer queries Snowflake directly or uses Claude+Snowflake for ad hoc lookups
- All key data sources accessible from one tool

---

## v4 — Visual Polish & Dashboards
**Theme:** Looks like a product, not a prototype

- Dashboard builder — drag/drop widget layout (KPIs, charts, tables as widgets)
- Saved dashboards — each person arranges their own command center
- Design system polish — consistent spacing, typography, transitions, dark mode
- Sparklines in table cells — mini-trends at a glance
- URL state sync — share a link that reproduces exact view
- Shared views via Vercel KV — team members share saved views with each other

### Milestone criteria
- Someone outside partnerships sees it and asks "can we use this too?"
- Each team member has a personalized dashboard they use daily

---

## v5 — AI Layer
**Theme:** Ask questions, get answers

- Natural language query — "which partners had the biggest collection rate drop last month?"
- AI-powered anomaly narratives — Claude explains why something looks off, not just that it does
- Suggested explorations — "Partner X's batch 2024-Q3 is underperforming vs peers, want to drill in?"
- Query history — save and replay AI-generated views alongside manual saved views

### Milestone criteria
- Non-technical team members can get answers without knowing the schema
- AI suggestions surface insights the team wouldn't have found manually

---

*Created: 2026-04-10*
