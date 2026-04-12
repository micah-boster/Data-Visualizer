# Research Summary: v2.0 Within-Partner Comparison

**Synthesized:** 2026-04-12

## Key Findings

1. **Only 2 new packages needed:** Recharts 3.x + react-is. Everything else (shadcn Card, cn(), Lucide icons) already exists.
2. **No new API endpoints or Snowflake queries.** All 19 collection curve columns and every metric for KPIs/trending are already in the React Query cache. v2 is entirely client-side derived state + new components.
3. **One keystone hook (`usePartnerStats`)** computes KPIs, historical norms (mean/stddev), collection curve series, and trending — all from existing partner-filtered rows.
4. **Collection curves need wide-to-long reshape** from 19 columns per row to arrays per batch. Must truncate at `BATCH_AGE_IN_MONTHS` and default to recovery rate %, not absolute dollars.
5. **Conditional formatting extends existing threshold system** — no replacement needed. Add norm-based dynamic thresholds via React Context.
6. **Charts must NOT go inside table cells** — detail panel or above-table dashboard only. SVG charts in virtualized rows kill scroll performance.
7. **Critical pitfall: truncation and normalization.** Young batches showing false zero cliffs, and absolute dollar comparison without normalization, produce plausible-looking wrong answers.

## Stack Decision

| Add | Version | Purpose |
|-----|---------|---------|
| recharts | ^3.8.1 | Collection curve charts, trending lines |
| react-is | ^19.2.0 | Required peer dep for Recharts on React 19 |
| shadcn chart component | N/A (copy-paste) | Themed chart wrappers |

No new libraries for: conditional formatting (cn() + Tailwind), KPI cards (existing Card), trending indicators (Lucide icons).

## Build Order (Dependency-Driven)

1. **Snowflake + foundation** — Live data, Recharts install, chart colors, usePartnerStats hook
2. **KPI Summary Cards** — Simplest viz, validates data flow, no Recharts needed
3. **Collection Curve Chart** — Core v2 value, highest-impact, uses Recharts
4. **Conditional Formatting** — Extends existing thresholds with partner norms
5. **Batch-over-Batch Trending** — Reuses norm computation, optional sparklines

## Top Pitfalls

| # | Pitfall | Severity | Prevention |
|---|---------|----------|------------|
| P1 | Curve truncation: young batches show false zero cliff | Critical | Truncate at BATCH_AGE_IN_MONTHS |
| P2 | Absolute dollars without normalization | Critical | Default to recovery rate % |
| P3 | Conditional formatting re-renders entire table | Critical | Pre-compute norms in useMemo, pass via Context |
| P5 | KPI cards disagree with table totals | Critical | Wire to same filtered row model |
| P4 | Charts in table cells kill virtual scrolling | Critical | Charts in detail panel only |

## Open Questions for Requirements

- Which 4-6 KPI metrics to display at partner level?
- Z-score threshold for norm-based formatting (1.5 stddev suggested)?
- Minimum batches for meaningful partner comparison (3 suggested)?
- Chart color palette update (current is grayscale, need distinguishable colors)?
