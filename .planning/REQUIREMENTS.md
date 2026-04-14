# Requirements: Bounce Data Visualizer v3.0

**Defined:** 2026-04-12
**Milestone:** v3.0 Intelligence & Cross-Partner Comparison
**Core Value:** The tool tells you what to look at, lets you ask why, and benchmarks partners against each other.

## v3 Requirements

### Anomaly Detection — Foundation

- [x] **AD-01**: `compute-anomalies.ts` module computes z-scores for key metrics per batch against partner norms, using existing `computeNorms()` mean/stddev as baseline
- [x] **AD-02**: Anomaly detection respects metric polarity (existing `metric-polarity.ts`) — only flags deviations in the "bad" direction (low penetration = bad, high delinquency = bad)
- [x] **AD-03**: A batch is flagged as anomalous when 2+ key metrics deviate beyond 2 SD from the partner mean
- [x] **AD-04**: At root level, a partner is flagged when their latest batch is anomalous
- [x] **AD-05**: Anomaly detection algorithm documented in `docs/ANOMALY-ALGORITHM.md` per explainability constraint
- [x] **AD-06**: Anomalies ranked by composite severity score (count of flagged metrics × average deviation magnitude)

### Anomaly Detection — UI

- [ ] **AD-07**: Anomaly badge (colored dot / warning icon) displayed in a dedicated Status column on partner rows (root level) and batch rows (partner drill-down)
- [x] **AD-08**: Hovering/clicking an anomaly badge shows a popover explaining: which metrics are anomalous, actual value vs expected range, deviation magnitude (e.g., "Penetration Rate: 3.2% (expected 8.1% - 14.3%). 2.4 SD below mean.")
- [x] **AD-09**: Collapsible anomaly summary panel at the top of root-level view showing top 5-10 flagged partners/batches sorted by severity, with one-line descriptions and click-to-drill navigation
- [x] **AD-10**: Anomalous batches visually distinguished on collection curve charts (bold line, different color, or annotation marker)

### Claude Natural Language Query — Infrastructure

- [ ] **NLQ-01**: `POST /api/query` route handler accepts a natural language question + context (current drill state, applied filters) and returns a streaming Claude response
- [ ] **NLQ-02**: Vercel AI SDK (`ai` + `@ai-sdk/anthropic`) used for `streamText` server-side and `useChat` client-side — no custom streaming plumbing
- [ ] **NLQ-03**: System prompt injects relevant data as JSON context (aggregated/summarized, not raw 477×61 matrix) to keep within token budget
- [ ] **NLQ-04**: Claude constrained to only reference data present in context — if a question cannot be answered from available data, responds with an explicit "I don't have that data" message
- [ ] **NLQ-05**: ANTHROPIC_API_KEY stored as Vercel environment variable, never exposed to client

### Claude Natural Language Query — UI

- [ ] **NLQ-06**: Search bar input (not chat interface) where users type natural language questions about their data
- [ ] **NLQ-07**: 3-5 suggested starter prompts displayed below the search bar, contextualized to the current drill level (root = cross-partner questions, partner = within-partner questions, batch = account-level questions)
- [ ] **NLQ-08**: AI responses rendered as a short narrative paragraph (2-4 sentences) accompanied by specific data points referenced, with streaming display
- [ ] **NLQ-09**: Query automatically scoped to current view context — if drilled into Affirm, questions about "the latest batch" resolve to Affirm's latest batch without user needing to specify
- [ ] **NLQ-10**: Clear loading indicator during streaming, graceful error handling for API failures/rate limits, 30-second timeout with retry option

### Cross-Partner Comparison — Foundation

- [x] **XPC-01**: `useAllPartnerStats` hook (or equivalent) computes per-partner aggregate metrics for ALL partners (extends `usePartnerStats` pattern but runs across full dataset, not just selected partner)
- [x] **XPC-02**: Percentile rank computed for each partner on key metrics (penetration rate, 6-month collection rate, 12-month collection rate, total collected) using `simple-statistics` `quantileRank`
- [x] **XPC-03**: Average collection curve computed per partner (mean of all their batch curves at each month point) for cross-partner trajectory overlay
- [x] **XPC-04**: Cross-partner anomaly flags: partners whose aggregate performance falls below the 10th percentile on any key metric are flagged as portfolio outliers

### Cross-Partner Comparison — UI

- [x] **XPC-05**: Percentile rank columns displayed at root-level partner table for key metrics, rendered as "P72" or "3 of 8" format
- [x] **XPC-06**: Cross-partner trajectory overlay chart at root level showing each partner's average collection curve as a single line, normalized by recovery rate %
- [x] **XPC-07**: "Best-in-class" reference line on the cross-partner trajectory chart representing the top-performing partner's average curve, plus a "portfolio average" line
- [x] **XPC-08**: Partner comparison matrix/summary view showing key metrics for all partners side-by-side (rows = metrics, columns = partners, or horizontal bar chart ranking partners on selected metric)

## Deferred to v3.5

| Feature | Reason |
|---------|--------|
| Multi-select partners at root level (Ctrl+click) | Deferred from v3.0 UX polish — requires drill-down state machine changes |
| Metabase query import | Accept/translate Metabase queries (MBQL or SQL) into the app's query system |

## Deferred to v4

| Feature | Reason |
|---------|--------|
| NLQ follow-up suggestions | Nice-to-have, not needed for core query experience |
| NLQ clickable data references | Medium complexity, adds value after core NLQ is validated |
| Partner cohort segmentation (by account type) | Requires richer metadata than currently available |
| Time-period scoped comparison | Useful but not essential for initial cross-partner view |
| NLQ query history persistence | 2-3 users, discuss findings in Slack not in the tool |
| Active anomaly notifications (Slack/email) | Prove passive value first |
| Dynamic curve re-projection | Requires forecasting model |
| Dashboard drag-and-drop layout | Configurable widget arrangement |
| Exportable partner summary reports | PDF/Excel per-partner reports |

## Out of Scope

| Feature | Reason |
|---------|--------|
| ML-based anomaly detection (isolation forest, DBSCAN) | Overkill for 477 rows, violates explainability constraint |
| User-configurable anomaly thresholds | 2-3 users, hardcode 2 SD, revisit if requested |
| Text-to-SQL generation | Dataset fits in context, text-to-SQL adds SQL injection risk and hallucinated column names |
| Full chat/conversation interface | Point queries, not conversations — search bar is the right pattern |
| AI-generated charts | Existing Recharts charts are excellent, dual viz system is confusing |
| Statistical significance testing | Misleading with 5-10 partners, unequal groups, small samples |
| Weighted composite "partner health score" | Buries information, creates weight debates |
| Automated partner tiering (A/B/C) | False precision with 5-10 partners, relationship damage risk |
| External benchmarking data | Portfolio IS the benchmark universe |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AD-01 | Phase 15 | Satisfied |
| AD-02 | Phase 15 | Satisfied |
| AD-03 | Phase 15 | Satisfied |
| AD-04 | Phase 15 | Satisfied |
| AD-05 | Phase 15 | Satisfied |
| AD-06 | Phase 15 | Satisfied |
| AD-07 | Phase 16 → 21 | Pending |
| AD-08 | Phase 16 | Satisfied |
| AD-09 | Phase 16 | Satisfied |
| AD-10 | Phase 16 | Satisfied |
| NLQ-01 | Phase 17 → 23 | Pending |
| NLQ-02 | Phase 17 → 23 | Pending |
| NLQ-03 | Phase 17 → 21 | Pending |
| NLQ-04 | Phase 17 → 21 | Pending |
| NLQ-05 | Phase 17 → 23 | Pending |
| NLQ-06 | Phase 18 → 23 | Pending |
| NLQ-07 | Phase 18 → 23 | Pending |
| NLQ-08 | Phase 18 → 23 | Pending |
| NLQ-09 | Phase 18 → 21 | Pending |
| NLQ-10 | Phase 18 → 23 | Pending |
| XPC-01 | Phase 19 | Satisfied |
| XPC-02 | Phase 19 | Satisfied |
| XPC-03 | Phase 19 | Satisfied |
| XPC-04 | Phase 19 | Satisfied |
| XPC-05 | Phase 20 | Complete |
| XPC-06 | Phase 20 | Complete |
| XPC-07 | Phase 20 | Complete |
| XPC-08 | Phase 20 | Complete |

**Coverage:**
- v3 requirements: 28 total
- Satisfied: 14/28 (AD-01-06, AD-08-10, XPC-01-04)
- Pending (bug fix): 4/28 (NLQ-03/04/09, AD-07 → Phase 21)
- Pending (not started): 4/28 (XPC-05-08 → Phase 20)
- Pending (verification only): 6/28 (NLQ-01/02/05/06/07/08/10 → Phase 23)
- Mapped to phases: 28/28
- Unmapped: 0

---
*Requirements defined: 2026-04-12*
*Last updated: 2026-04-12 after roadmap creation*
