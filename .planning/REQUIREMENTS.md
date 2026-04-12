# Requirements: Bounce Data Visualizer v2.0

**Defined:** 2026-04-12
**Milestone:** v2.0 Within-Partner Comparison
**Core Value:** Enable within-partner batch comparison so the team instantly sees whether a partner's latest batches are performing better or worse than their historical norm.

## v2 Requirements

### Foundation & Data Layer

- [x] **FOUND-01**: `usePartnerStats` hook computes KPI aggregates, historical norms (mean/stddev per metric), collection curve series, and batch-over-batch trending from partner-filtered batch rows
- [x] **FOUND-02**: Collection curve data reshaped from wide (19 columns per row) to long (array of {month, amount} per batch), truncated at `BATCH_AGE_IN_MONTHS`
- [x] **FOUND-03**: Collection curves default to recovery rate % (collection / total_amount_placed), not absolute dollars, with toggle for absolute view
- [x] **FOUND-04**: Recharts 3.x and shadcn Chart component installed and working with React 19
- [x] **FOUND-05**: Chart CSS variables updated from grayscale to distinguishable colors for multi-line overlays

### KPI Summary Cards

- [ ] **KPI-01**: 4-6 KPI cards displayed above the batch table at partner drill-down level
- [ ] **KPI-02**: Cards show: total batches, total accounts placed, weighted avg penetration rate, avg collection rate at 6mo and 12mo, total lifetime collected
- [ ] **KPI-03**: Cards aggregate from the same filtered row set as the table (not raw data)
- [ ] **KPI-04**: Each card shows trend indicator (up/down/flat arrow) comparing latest batch to partner rolling average

### Collection Curve Charts

- [ ] **CURVE-01**: Multi-line chart at partner drill-down level overlaying collection curves for all batches from that partner
- [x] **CURVE-02**: X-axis is months-since-placement (numeric, proportionally spaced — not categorical), Y-axis is recovery rate %
- [x] **CURVE-03**: Lines truncate at each batch's `BATCH_AGE_IN_MONTHS` — no false zero cliffs for young batches
- [x] **CURVE-04**: Most recent batch highlighted (bold/primary color), older batches in muted colors
- [ ] **CURVE-05**: Hover tooltip shows batch name and exact value at that month
- [x] **CURVE-06**: Optional partner average reference line (mean of all batches at each month)
- [ ] **CURVE-07**: Charts lazy-loaded (not in initial bundle) — only loaded when user drills into a partner

### Conditional Formatting

- [ ] **COND-01**: Cells in the batch table color-coded by deviation from partner historical norm (green = above avg, red = below avg, neutral = within range)
- [ ] **COND-02**: Norms computed as partner mean ± 1.5 stddev per metric, pre-computed in `usePartnerStats` and provided via React Context
- [ ] **COND-03**: Color intensity proportional to deviation magnitude
- [ ] **COND-04**: Active at partner drill-down level only (root level uses existing static thresholds)
- [ ] **COND-05**: Applied to: collection curve milestones, penetration rates, conversion rate, total collected
- [ ] **COND-06**: Tooltip explains deviation: "12.3% vs partner avg 18.7% (-34%)"
- [ ] **COND-07**: Toggle on/off for users who prefer clean numbers

### Batch-over-Batch Trending

- [ ] **TREND-01**: Trending indicators (up/down/flat) shown next to key metrics in the batch table at partner level
- [ ] **TREND-02**: Comparison baseline is rolling partner average (last 4-6 batches), excluding the current batch
- [ ] **TREND-03**: Partners with fewer than 3 historical batches show "Insufficient history" instead of misleading trends
- [ ] **TREND-04**: Flat threshold: changes within ±5% count as flat
- [ ] **TREND-05**: Trending algorithm explicitly documented per project constraint

### Carry-Forward from v1

- [x] **CARRY-01**: Account drill-down rows use ACCOUNT_PUBLIC_ID from Snowflake as unique identifier (replacing row numbers)

## Out of Scope (v2)

| Feature | Reason |
|---------|--------|
| Cross-partner comparison | Requires normalization model — v3+ |
| Dynamic curve re-projection | Requires forecasting model — v3+ |
| AI/Claude query layer | v3 feature |
| Sparklines in table cells | Performance risk with virtual scrolling — defer to v2.1 if needed |
| Dashboard drag-and-drop | v3 feature |
| Editable threshold UI | 2-3 users, hardcode sensible defaults |
| Exportable partner summary report | Nice-to-have, not core comparison workflow |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| FOUND-01 | Phase 10 | Complete |
| FOUND-02 | Phase 10 | Complete |
| FOUND-03 | Phase 10 | Complete |
| FOUND-04 | Phase 10 | Complete |
| FOUND-05 | Phase 10 | Complete |
| KPI-01 | Phase 11 | Pending |
| KPI-02 | Phase 11 | Pending |
| KPI-03 | Phase 11 | Pending |
| KPI-04 | Phase 11 | Pending |
| CURVE-01 | Phase 12 | Pending |
| CURVE-02 | Phase 12 | Complete |
| CURVE-03 | Phase 12 | Complete |
| CURVE-04 | Phase 12 | Complete |
| CURVE-05 | Phase 12 | Pending |
| CURVE-06 | Phase 12 | Complete |
| CURVE-07 | Phase 12 | Pending |
| COND-01 | Phase 13 | Pending |
| COND-02 | Phase 13 | Pending |
| COND-03 | Phase 13 | Pending |
| COND-04 | Phase 13 | Pending |
| COND-05 | Phase 13 | Pending |
| COND-06 | Phase 13 | Pending |
| COND-07 | Phase 13 | Pending |
| TREND-01 | Phase 14 | Pending |
| TREND-02 | Phase 14 | Pending |
| TREND-03 | Phase 14 | Pending |
| TREND-04 | Phase 14 | Pending |
| TREND-05 | Phase 14 | Pending |
| CARRY-01 | Phase 10 | Complete |

---
*Requirements defined: 2026-04-12*
