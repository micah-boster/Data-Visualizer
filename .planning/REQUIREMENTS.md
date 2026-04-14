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

- [x] **AD-07**: Anomaly badge (colored dot / warning icon) displayed in a dedicated Status column on partner rows (root level) and batch rows (partner drill-down)
- [x] **AD-08**: Hovering/clicking an anomaly badge shows a popover explaining: which metrics are anomalous, actual value vs expected range, deviation magnitude (e.g., "Penetration Rate: 3.2% (expected 8.1% - 14.3%). 2.4 SD below mean.")
- [x] **AD-09**: Collapsible anomaly summary panel at the top of root-level view showing top 5-10 flagged partners/batches sorted by severity, with one-line descriptions and click-to-drill navigation
- [x] **AD-10**: Anomalous batches visually distinguished on collection curve charts (bold line, different color, or annotation marker)

### Claude Natural Language Query — Infrastructure

- [x] **NLQ-01**: `POST /api/query` route handler accepts a natural language question + context (current drill state, applied filters) and returns a streaming Claude response
- [x] **NLQ-02**: Vercel AI SDK (`ai` + `@ai-sdk/anthropic`) used for `streamText` server-side and `useChat` client-side — no custom streaming plumbing
- [x] **NLQ-03**: System prompt injects relevant data as JSON context (aggregated/summarized, not raw 477×61 matrix) to keep within token budget
- [x] **NLQ-04**: Claude constrained to only reference data present in context — if a question cannot be answered from available data, responds with an explicit "I don't have that data" message
- [x] **NLQ-05**: ANTHROPIC_API_KEY stored as Vercel environment variable, never exposed to client

### Claude Natural Language Query — UI

- [x] **NLQ-06**: Search bar input (not chat interface) where users type natural language questions about their data
- [x] **NLQ-07**: 3-5 suggested starter prompts displayed below the search bar, contextualized to the current drill level (root = cross-partner questions, partner = within-partner questions, batch = account-level questions)
- [x] **NLQ-08**: AI responses rendered as a short narrative paragraph (2-4 sentences) accompanied by specific data points referenced, with streaming display
- [x] **NLQ-09**: Query automatically scoped to current view context — if drilled into Affirm, questions about "the latest batch" resolve to Affirm's latest batch without user needing to specify
- [x] **NLQ-10**: Clear loading indicator during streaming, graceful error handling for API failures/rate limits, 30-second timeout with retry option

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

| Requirement | Description | Phase(s) | Status | Last Verified | Notes |
|-------------|-------------|----------|--------|---------------|-------|
| AD-01 | Z-score anomaly computation per batch against partner norms | Phase 15 | Verified | 2026-04-12 | 15-VERIFICATION.md: z-scores via computeNorms() baseline |
| AD-02 | Anomaly detection respects metric polarity | Phase 15 | Verified | 2026-04-12 | 15-VERIFICATION.md: getPolarity() in evaluateMetric() |
| AD-03 | Batch flagged when 2+ metrics exceed 2 SD | Phase 15 | Verified | 2026-04-12 | 15-VERIFICATION.md: MIN_FLAGS=2, Z_THRESHOLD=2 |
| AD-04 | Partner flagged at root based on latest batch | Phase 15 | Verified | 2026-04-12 | 15-VERIFICATION.md: PartnerAnomaly.isFlagged derives from latestBatch |
| AD-05 | Algorithm documented in ANOMALY-ALGORITHM.md | Phase 15 | Verified | 2026-04-12 | 15-VERIFICATION.md: docs/ANOMALY-ALGORITHM.md, 134 lines |
| AD-06 | Severity score: count x avg deviation x log(totalPlaced) | Phase 15 | Verified | 2026-04-12 | 15-VERIFICATION.md: severity formula in batch evaluation |
| AD-07 | Anomaly badge in Status column at all drill levels | Phase 16, 21 | Verified | 2026-04-14 | 16-VERIFICATION.md: anomaly-column.tsx + anomaly-badge.tsx; 21-VERIFICATION.md: root-level column added |
| AD-08 | Popover with metrics, values, ranges, deviations | Phase 16 | Verified | 2026-04-12 | 16-VERIFICATION.md: anomaly-detail.tsx popover content |
| AD-09 | Collapsible summary panel with top flagged, click-to-drill | Phase 16 | Verified | 2026-04-12 | 16-VERIFICATION.md: anomaly-summary-panel.tsx, top 5 by severity |
| AD-10 | Anomalous batches visually distinct on curve charts | Phase 16 | Verified | 2026-04-12 | 16-VERIFICATION.md: red/amber stroke, 3px width, dimmed non-flagged |
| NLQ-01 | POST /api/query route with streaming response | Phase 17 | Verified | 2026-04-14 | 17-VERIFICATION.md: route.ts Zod validation + streamText + toUIMessageStreamResponse |
| NLQ-02 | AI SDK streamText (server) + useChat (client) | Phase 17 | Verified | 2026-04-14 | 17-VERIFICATION.md: ai@6.0.158, @ai-sdk/anthropic@3.0.69, @ai-sdk/react@3.0.160 |
| NLQ-03 | System prompt injects summarized data context | Phase 17, 21 | Verified | 2026-04-14 | 17-VERIFICATION.md: context-builder.ts drill-level summaries; 21-VERIFICATION.md: column mapping fix |
| NLQ-04 | Claude constrained to available data context | Phase 17, 21 | Verified | 2026-04-14 | 17-VERIFICATION.md: Critical Rule #1 in system prompt; 21-VERIFICATION.md: real data in context |
| NLQ-05 | ANTHROPIC_API_KEY server-only | Phase 17 | Verified | 2026-04-14 | 17-VERIFICATION.md: only in system-prompt.ts, zero client references |
| NLQ-06 | Search bar input (not chat interface) | Phase 18 | Verified | 2026-04-14 | 18-VERIFICATION.md: input element, setMessages([]) per query |
| NLQ-07 | 3-5 suggested prompts, drill-level-contextualized | Phase 18 | Verified | 2026-04-14 | 18-VERIFICATION.md: use-suggested-prompts.ts, 4 prompts per level |
| NLQ-08 | Streaming narrative paragraph with data points | Phase 18 | Verified | 2026-04-14 | 18-VERIFICATION.md: query-response.tsx, status-driven rendering |
| NLQ-09 | Query scoped to current drill context | Phase 18, 21 | Verified | 2026-04-14 | 18-VERIFICATION.md: drillState in transport body; 21-VERIFICATION.md: computeKpis fix |
| NLQ-10 | Loading indicator, error handling, 30s timeout + retry | Phase 18 | Verified | 2026-04-14 | 18-VERIFICATION.md: skeleton, AlertCircle, setTimeout 30s, RefreshCw retry |
| XPC-01 | Per-partner aggregate metrics for ALL partners | Phase 19 | Verified | 2026-04-13 | 19-VERIFICATION.md: computeCrossPartnerData, useAllPartnerStats hook |
| XPC-02 | Percentile rank via simple-statistics quantileRank | Phase 19 | Verified | 2026-04-13 | 19-VERIFICATION.md: computePercentileRanks on 5 metrics |
| XPC-03 | Average collection curve per partner | Phase 19 | Verified | 2026-04-13 | 19-VERIFICATION.md: buildAverageCurve, equal-weight + dollar-weighted |
| XPC-04 | Portfolio outlier flags below 10th percentile | Phase 19 | Verified | 2026-04-13 | 19-VERIFICATION.md: detectPercentileOutliers, OUTLIER_PERCENTILE=0.10 |
| XPC-05 | Percentile rank columns at root-level table | Phase 20 | Verified | 2026-04-14 | 20-VERIFICATION.md: PercentileCell "P{N} ({rank}/{total})", 4 columns |
| XPC-06 | Cross-partner trajectory overlay chart | Phase 20 | Verified | 2026-04-14 | 20-VERIFICATION.md: CrossPartnerTrajectoryChart, one line per partner |
| XPC-07 | Best-in-class + portfolio average reference lines | Phase 20 | Verified | 2026-04-14 | 20-VERIFICATION.md: __bestInClass__ black dashed, __portfolioAvg__ gray dashed |
| XPC-08 | Partner comparison matrix (heatmap, bar, table) | Phase 20 | Verified | 2026-04-14 | 20-VERIFICATION.md: PartnerComparisonMatrix, 3 view modes + orientation toggle |

**Coverage:**
- v3 requirements: 28 total
- Verified: 28/28
- Partial: 0/28
- Pending: 0/28
- Mapped to phases: 28/28
- Unmapped: 0

**Note:** All requirements verified against actual source code with evidence in VERIFICATION.md files. Requirements NLQ-01 through NLQ-10 depend on ANTHROPIC_API_KEY for live AI responses — the infrastructure is verified, but live end-to-end testing requires the API key configured in the deployment environment. Snowflake-dependent data loading (static cache mode) is the current operational mode; live Snowflake connection pending credential provisioning on Vercel.

---
*Requirements defined: 2026-04-12*
*Last updated: 2026-04-14 after Phase 23 verification housekeeping*
