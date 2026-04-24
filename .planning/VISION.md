# Product Vision: Bounce Data Visualizer

## One-liner

The single tool Bounce's partnerships team opens every morning to know where to focus.

## Arc

Each version builds on the last:
- **v1**: Can I find the data? → Yes
- **v2**: Does the data find me? → Yes
- **v3**: Can I see everything in one place? → Yes
- **v4**: Do I enjoy using this? → Yes
- **v5**: Do I see the full picture? → Yes
- **v6**: Does the tool work for me? → Yes

---

## v1 — Foundation (SHIPPED)
**Theme:** Replace Metabase with something you actually want to use

Interactive table, filters, saved views, export, drill-down. The goal is: open it, find what you need, save the view, come back tomorrow. If the team stops opening Metabase, v1 succeeded.

**Data:** `agg_batch_performance_summary` (61 columns, ~533 rows)
**Users:** 2-3 partnerships team members, desktop

### Milestone criteria
- Team uses this instead of Metabase for batch performance data
- Saved views are being created and reused

---

## v2 — Intelligence (SHIPPED)
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

## v3 — Cross-Partner Comparison & AI Query (SHIPPED)
**Theme:** See the whole portfolio, ask it questions

- Deterministic anomaly detection — z-scores with polarity awareness
- Claude natural language query — search bar with streaming responses
- Cross-partner percentile rankings and portfolio outlier flags
- Trajectory overlay charts with reference lines
- Partner comparison matrix (heatmap, bar ranking, plain table)

### Milestone criteria
- Team no longer queries Snowflake directly or uses Claude+Snowflake for ad hoc lookups
- Cross-partner comparison replaces manual spreadsheet ranking

---

## v4 — Design System & Daily-Driver UX (IN PROGRESS)
**Theme:** Looks like a product, not a prototype

- Design token system — spacing (4px grid), typography scale, elevation shadows, motion tokens, named surfaces
- Surface vocabulary — cards float, tables recede, popovers lift, header has presence
- Component patterns — StatCard, DataPanel, SectionHeader, ToolbarGroup, EmptyState
- Micro-interactions — drill transitions, hover lifts, press feedback, loading reveals
- Visual polish — gradient dividers, dark mode glass highlights, focus glows, border consistency
- URL-backed navigation — browser back button, deep-linking, shareable URLs
- Accessibility — WCAG AA, keyboard nav, screen readers, reduced motion
- Flexible charts — user-selectable axes, line/scatter/bar types, collection curves as preset
- Partner Lists — named partner groupings for filtering
- Metabase SQL import — paste SQL, preview mapping, apply as saved view

### Milestone criteria
- Someone outside partnerships sees it and asks "can we use this too?"
- The UI feels fast, quiet, and confident — every interaction is intentional
- New features inherit design consistency without per-feature visual decisions

---

## v5 — External Intelligence (PLANNED)
**Theme:** See the full picture — your data, their data, the targets

The tool stops being an internal-only dashboard and becomes a competitive intelligence platform. Three external data sources come in — partner scorecards, contractual targets, and the comparison views that triangulate all three.

- Scorecard ingestion — upload PDF/Excel/CSV/email, Claude extracts structured metrics, per-partner schema learning, human-in-the-loop confirmation
- Contractual target management — manual entry + contract PDF extraction, versioned with date ranges
- Triangulation views — internal vs. scorecard vs. target side-by-side, divergence highlighting, target traffic-lights
- Scorecard reconciliation — drift detection, partner reliability scoring, alignment history
- Dynamic curve re-projection — "at current pace" vs. "to hit target" vs. "partner-reported trajectory" overlays

### Milestone criteria
- MBR prep starts in this tool — data is pre-triangulated before the conversation
- Partner conversations shift from "here are our numbers" to "here's how our numbers, your numbers, and the targets all compare"
- The team catches scorecard discrepancies before partners raise them

---

## v6 — Proactive Intelligence & Action (PLANNED)
**Theme:** The tool works for you

The tool stops waiting to be opened. It generates briefings, alerts on patterns, feeds directly into MBR deck generation, and connects every insight to a downstream action.

- Weekly partner highlights — auto-generated summaries delivered to Notion
- Pattern alerts — consecutive declines, divergence widening, peer-group outlier emergence — delivered to Slack
- MBR pipeline integration — one-click from partner view to staged deck content with narrative talking points
- Action connections — "Flag in Slack", "Create Notion task", "Add to MBR agenda" from any data point
- Temporal intelligence — vintage comparison, cohort trending, forecasting, leading indicator discovery
- NLQ enhancements — follow-up suggestions, clickable references, multi-source + temporal queries

### Milestone criteria
- The team gets actionable intelligence without opening the tool
- MBR prep takes minutes instead of hours — data package is pre-built
- Every insight has a one-click path to action (Slack, Notion, MBR)

---

*Created: 2026-04-10*
*Updated: 2026-04-16 — v3 updated to match actual shipped scope, v4 refined, v5/v6 added*
