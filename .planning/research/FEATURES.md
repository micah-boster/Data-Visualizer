# Feature Landscape: v3.0 Intelligence & Cross-Partner Comparison

**Domain:** Debt collection batch analytics -- AI query, anomaly detection, cross-partner benchmarking
**Researched:** 2026-04-12
**Overall confidence:** MEDIUM-HIGH (patterns well-established in analytics tooling; implementation specifics validated against codebase)

---

## Pillar 1: Anomaly Detection (Passive, In-App)

### Table Stakes

Features users expect from any anomaly detection surface. Without these, the feature feels like a gimmick.

#### AD-TS-1: Anomaly Badges on Table Rows

| Attribute | Detail |
|-----------|--------|
| **What** | Visual badge/icon on partner rows (root level) and batch rows (partner drill-down) flagging statistically anomalous performance. A colored dot or icon (warning triangle, red circle) in a dedicated "Status" column. |
| **Why expected** | Every monitoring dashboard uses inline status indicators. If the system detects anomalies but the user has to navigate to a separate screen to see them, it defeats the purpose. Anomalies must surface where the user already looks: the table. |
| **Complexity** | Low |
| **Depends on** | Existing `computeNorms()` (mean/stddev already computed per partner), existing `FormattedCell` component |
| **Notes** | Use the existing norm computation as baseline. A batch is anomalous when 2+ key metrics deviate beyond 2 SD from the partner mean. At root level, a partner is anomalous when their latest batch is flagged. |

#### AD-TS-2: Anomaly Summary Panel

| Attribute | Detail |
|-----------|--------|
| **What** | A collapsible summary section at the top of the root-level view showing count of flagged partners/batches with one-line descriptions: "Affirm MAR_26: penetration rate 42% below partner average." Clickable to drill into the flagged entity. |
| **Why expected** | Badges tell you something is wrong; the summary tells you what and where. Without it, users must scan every row looking for badges. The summary is the "inbox" of anomalies -- it answers "what should I look at today?" |
| **Complexity** | Medium |
| **Depends on** | AD-TS-1 (anomaly computation), existing `drillToPartner`/`drillToBatch` navigation |
| **Notes** | Sort anomalies by severity (largest deviation first). Limit to top 5-10 to avoid alarm fatigue. Collapsible so it doesn't dominate when not needed. |

#### AD-TS-3: Anomaly Detail in Tooltip/Popover

| Attribute | Detail |
|-----------|--------|
| **What** | Hovering or clicking an anomaly badge shows a popover explaining: which metrics are anomalous, the actual value vs expected range, and the deviation magnitude. |
| **Why expected** | A badge without explanation is worse than no badge. Users need to trust the detection before acting on it. Explainability is table stakes per the project constraint ("every data transformation must have an explicit, documented algorithm"). |
| **Complexity** | Low |
| **Depends on** | AD-TS-1, existing tooltip infrastructure (shadcn Tooltip/Popover) |
| **Notes** | Format: "Penetration Rate: 3.2% (expected 8.1% - 14.3%). 2.4 SD below mean." Keep language non-technical for the partnerships team. |

#### AD-TS-4: Deterministic, Explainable Detection Algorithm

| Attribute | Detail |
|-----------|--------|
| **What** | Statistical anomaly detection using z-scores against partner norms. No black-box ML. The algorithm must be documentable in a markdown file (like TRENDING-ALGORITHM.md). |
| **Why expected** | Per project constraints, all transformations must be explainable. The partnerships team needs to trust the flags before acting. "The model said so" is not acceptable for 2-3 internal users who know their data. |
| **Complexity** | Medium |
| **Depends on** | Existing `computeNorms()` which already computes mean/stddev per metric |
| **Notes** | Z-score is the right method here. The existing norm computation gives us mean and population stddev. A z-score > 2 flags as anomalous. IQR is more robust to outliers but z-score is simpler and the team already understands standard deviation from the conditional formatting. Consistency matters more than statistical perfection for 2-3 users. |

### Differentiators

#### AD-D-1: Anomaly Severity Ranking

| Attribute | Detail |
|-----------|--------|
| **What** | Rank anomalies by a composite severity score that weights multiple flagged metrics and their deviation magnitudes. "This partner has 4 flagged metrics with an average 3.1 SD deviation" outranks "1 flagged metric at 2.1 SD." |
| **Value proposition** | Prioritization. The team has limited time -- they need to know not just what is anomalous but what is most anomalous. |
| **Complexity** | Low (computation is straightforward once individual anomalies are detected) |

#### AD-D-2: Anomaly Highlighting in Charts

| Attribute | Detail |
|-----------|--------|
| **What** | On the collection curve chart, visually distinguish anomalous batches (bold line, different color, or annotation marker) from normal batches. |
| **Value proposition** | When a user drills into a partner, the anomalous batch immediately stands out on the curve chart without needing to cross-reference the table. |
| **Complexity** | Low (Recharts supports conditional line styling) |

#### AD-D-3: Metric Polarity Awareness

| Attribute | Detail |
|-----------|--------|
| **What** | Anomaly detection respects metric polarity: high penetration rate is good (flag when low), high delinquency is bad (flag when high). The existing `metric-polarity.ts` module already defines this. |
| **Value proposition** | Without polarity, the system flags a partner for having unusually HIGH collection rates, which is not a problem. Polarity-aware detection only flags in the bad direction. |
| **Complexity** | Low (existing `metric-polarity.ts` provides the mapping) |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| ML-based anomaly detection (isolation forest, DBSCAN) | Overkill for 477 rows across a handful of partners. Adds opaque model behavior that violates the explainability constraint. Z-scores cover 90% of the need. | Z-score against partner norms. Document the algorithm. |
| Active notifications (Slack/email) | Explicitly out of scope per PROJECT.md (v4+). Passive anomaly detection must prove its value first before investing in notification infrastructure. | In-app summary panel. Users check the dashboard daily anyway. |
| User-configurable thresholds | For 2-3 users, hardcoded 2 SD threshold is fine. Building a settings UI doubles the complexity for marginal benefit. | Hardcode 2 SD. Revisit if users request adjustment. |
| Anomaly history/timeline | Tracking how anomalies change over time requires state persistence beyond the current session. Premature for v3. | Show current anomalies only. Historical trending via the existing batch-over-batch trending indicators. |

---

## Pillar 2: Claude Natural Language Query Layer

### Table Stakes

Features users expect from an AI-powered data query interface integrated into an analytics tool.

#### NLQ-TS-1: Query Input with Suggested Prompts

| Attribute | Detail |
|-----------|--------|
| **What** | A text input (search bar style, not chat) where users type natural language questions about their data. Below it, 3-5 suggested starter prompts contextualized to the current view: "Which partner has the highest 6-month collection rate?" or "Compare Affirm's latest batch to their historical average." |
| **Why expected** | Every NLQ tool provides suggested prompts. The blank input box is intimidating -- users don't know what they can ask. Suggestions teach the system's capabilities through examples. The search bar pattern (vs chat) is correct here because these are point queries, not conversations. |
| **Complexity** | Low (UI), Medium (prompt engineering) |
| **Depends on** | New API route for Claude integration |
| **Notes** | Suggested prompts should update based on drill context: root level shows cross-partner questions, partner level shows within-partner questions, batch level shows account-level questions. |

#### NLQ-TS-2: Narrative Response with Supporting Data

| Attribute | Detail |
|-----------|--------|
| **What** | AI responses rendered as a short narrative paragraph (2-4 sentences) accompanied by the specific data points referenced. Not just "the answer is 42" -- explain the context. Example: "Affirm's March batch penetration rate is 3.2%, significantly below their 6-batch average of 11.4%. This is the lowest penetration rate across all their batches. The next lowest was January at 7.8%." |
| **Why expected** | Narrative + data is the standard pattern in analytics NLQ tools (ThoughtSpot, Looker, Power BI Copilot all do this). Raw answers without context are not useful because the user doesn't know if the answer is good or bad without comparison. |
| **Complexity** | Medium |
| **Depends on** | NLQ-TS-1, Claude API, data context injection |
| **Notes** | The narrative must reference actual data from the dataset, not hallucinate. Include the specific numbers cited. This means the API route must pass relevant data rows to Claude as context. |

#### NLQ-TS-3: Data-Grounded Responses (No Hallucination)

| Attribute | Detail |
|-----------|--------|
| **What** | Every claim in the AI response must be verifiable against the actual dataset. The system prompt constrains Claude to only reference data present in the context window. If the question cannot be answered from available data, say so explicitly. |
| **Why expected** | Trust. The entire reason this tool exists (per PROJECT.md) is to replace "non-deterministic Claude + Snowflake queries." If the AI layer itself hallucinates, it defeats the tool's core value proposition. |
| **Complexity** | Medium (prompt engineering, context management) |
| **Depends on** | Data serialization strategy for context injection |
| **Notes** | Two approaches: (1) pass relevant data rows as JSON in the system prompt, or (2) give Claude SQL-generation capability against Snowflake. Approach 1 is safer and simpler for v3 -- the dataset is small enough (477 rows x key columns) to fit in context. Approach 2 (text-to-SQL) is v4 if data grows. |

#### NLQ-TS-4: Loading State and Error Handling

| Attribute | Detail |
|-----------|--------|
| **What** | Clear loading indicator while waiting for AI response (streaming preferred). Graceful error handling when Claude API fails or rate-limits. Timeout after 30 seconds with a retry option. |
| **Why expected** | AI responses take 2-10 seconds. Without a loading state, users think the UI is broken. Without error handling, a single API failure breaks trust in the entire feature. |
| **Complexity** | Low |
| **Depends on** | Existing loading/error state patterns in the codebase |

### Differentiators

#### NLQ-D-1: Context-Aware Queries Based on Current View

| Attribute | Detail |
|-----------|--------|
| **What** | The AI automatically knows what the user is looking at. If drilled into Affirm's partner view, questions like "why is the latest batch underperforming?" automatically scope to Affirm without the user needing to specify. If filters are applied, the AI knows. |
| **Value proposition** | Eliminates the most common NLQ failure mode: the user asks a scoped question but the AI answers about the entire dataset. Context awareness makes the AI feel like an assistant who is looking at the same screen. |
| **Complexity** | Medium |

#### NLQ-D-2: Response with Actionable Follow-Up Suggestions

| Attribute | Detail |
|-----------|--------|
| **What** | After each response, show 2-3 follow-up question suggestions based on the answer: "You might also want to know: Which accounts are driving the low penetration rate? How does this compare to other partners?" |
| **Value proposition** | Guides exploration. Most users ask one question and stop -- not because they're satisfied, but because they don't know what to ask next. Follow-ups keep the analysis going. |
| **Complexity** | Low (Claude can generate these as part of the response) |

#### NLQ-D-3: Response References Clickable Data Points

| Attribute | Detail |
|-----------|--------|
| **What** | When the AI mentions a partner or batch by name, it is rendered as a clickable link that drills the user into that entity. "Affirm's March batch" links to `drillToPartner('Affirm')` then `drillToBatch('MAR_26')`. |
| **Value proposition** | Bridges AI answers to the existing deterministic UI. The user reads the narrative, clicks a reference, and sees the full table/chart context. This is what differentiates an embedded AI from a standalone chatbot. |
| **Complexity** | Medium (parsing entity references from AI response, linking to drill-down actions) |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Full chat/conversation interface | This is an analytics tool, not a chatbot. Multi-turn conversations add state management complexity and rarely provide value for data queries. Users ask one question at a time. | Search bar with suggested prompts. Each query is independent. Follow-up suggestions provide continuity without conversation state. |
| Text-to-SQL generation | The dataset is small enough to pass directly to Claude. Text-to-SQL introduces SQL injection risk, hallucinated table/column names, and requires a validation layer. Massively over-engineered for 477 rows. | Pass filtered data as JSON context to Claude. Simpler, safer, and more reliable. |
| AI-generated charts/visualizations | The tool already has excellent charts (Recharts). Having the AI generate separate charts creates a dual visualization system that is confusing and hard to maintain. | AI responses reference existing charts and suggest the user "check the collection curve chart for visual confirmation." |
| Autonomous data exploration agents | Agentic systems that run multiple queries iteratively are slow, expensive, and unpredictable. Not appropriate for a 2-3 person internal tool. | Single-turn query with data context. Fast, cheap, predictable. |
| Query history persistence | Adds storage complexity for minimal value with 2-3 users. The team discusses findings in Slack, not in the tool. | Session-only query display. Previous response visible until new query submitted. |

---

## Pillar 3: Cross-Partner Comparison

### Table Stakes

Features users expect from any cross-entity benchmarking surface.

#### XPC-TS-1: Percentile Rankings at Root Level

| Attribute | Detail |
|-----------|--------|
| **What** | At the root partner table, show each partner's percentile rank for key metrics (penetration rate, 6-month collection rate, 12-month collection rate) relative to all partners. Rendered as a percentile number (e.g., "P72") or a position indicator (e.g., "3 of 8"). |
| **Why expected** | "How does this partner compare to others?" is the most natural cross-partner question. Raw numbers are meaningless without context -- a 12% penetration rate could be excellent or terrible depending on the portfolio. Percentile ranks immediately answer "better or worse than peers." |
| **Complexity** | Low-Medium |
| **Depends on** | Root-level aggregation (new: must compute per-partner aggregates across all batches, similar to how `usePartnerStats` works but for ALL partners) |
| **Notes** | This requires a `useAllPartnerStats` or similar hook that computes aggregate metrics for every partner, not just the selected one. The existing `usePartnerStats` filters to one partner -- cross-partner needs all. |

#### XPC-TS-2: Normalized Trajectory Overlay Chart

| Attribute | Detail |
|-----------|--------|
| **What** | A chart showing collection curves from different partners normalized to enable comparison. Since partners have different balance sizes, absolute dollar amounts are not comparable. Normalize by showing recovery rate (% of placed amount collected) on the y-axis. Each line is a partner's average curve (mean across their batches). |
| **Why expected** | The existing collection curve chart shows within-partner batch comparison. The cross-partner equivalent is the obvious next question: "How does Affirm's typical curve compare to Klarna's?" Normalization via recovery rate makes this meaningful. |
| **Complexity** | Medium |
| **Depends on** | Existing `reshapeCurves()` computation, existing Recharts infrastructure |
| **Notes** | Recovery rate normalization already exists in `CurvePoint.recoveryRate`. The cross-partner chart averages each partner's batch curves into a single representative line per partner. Show at root level as a new chart section. |

#### XPC-TS-3: Partner Comparison Table/Matrix

| Attribute | Detail |
|-----------|--------|
| **What** | A summary comparison view showing key metrics for all partners side-by-side in a compact matrix. Rows = metrics, columns = partners. Or a horizontal bar chart ranking partners on a selected metric. |
| **Why expected** | The existing root table shows batches, not partner aggregates. Users currently have to mentally aggregate across batches to compare partners. A dedicated comparison view does this aggregation for them. |
| **Complexity** | Medium |
| **Depends on** | XPC-TS-1 (per-partner aggregation) |
| **Notes** | Could be a separate tab/view or a collapsible section at root level. Key metrics to compare: total placed volume, weighted penetration rate, 6-month and 12-month collection rates, total collected, batch count. |

### Differentiators

#### XPC-D-1: Partner Cohort Segmentation

| Attribute | Detail |
|-----------|--------|
| **What** | Allow grouping partners by characteristics (account type, balance range, batch frequency) and compare cohort averages. "How do BNPL partners compare to traditional credit partners?" |
| **Value proposition** | Raw cross-partner comparison can be misleading if partners have fundamentally different account mixes. Cohort segmentation makes comparisons fair. |
| **Complexity** | Medium-High |
| **Notes** | Depends on having enough metadata to segment meaningfully. May not be possible with current data if all partners are BNPL. Check data diversity before building. |

#### XPC-D-2: Best-in-Class Benchmark Line

| Attribute | Detail |
|-----------|--------|
| **What** | On the cross-partner trajectory overlay, add a "best-in-class" reference line representing the top-performing partner's curve, plus a "portfolio average" line. Each partner can see where they sit relative to the best and the average. |
| **Value proposition** | Gives an aspirational target. "Affirm is tracking 15% below best-in-class at 6 months" is more actionable than just seeing all curves overlaid. |
| **Complexity** | Low (if XPC-TS-2 is built) |

#### XPC-D-3: Cross-Partner Anomaly Flags

| Attribute | Detail |
|-----------|--------|
| **What** | Flag partners whose aggregate performance is anomalous relative to the portfolio -- not just within their own history but compared to peers. "This partner's 6-month collection rate is in the bottom 10th percentile." |
| **Value proposition** | Combines anomaly detection with cross-partner comparison. A partner might be consistent with their own history but still be a portfolio outlier. |
| **Complexity** | Low (if both AD and XPC pillar table stakes are built) |

#### XPC-D-4: Time-Period Scoped Comparison

| Attribute | Detail |
|-----------|--------|
| **What** | Compare partners only across batches from the same time period. "How did all partners' Q1 2026 batches perform relative to each other?" filters out historical noise. |
| **Value proposition** | Macro conditions (economic environment, regulatory changes) affect all partners simultaneously. Comparing same-period batches isolates partner-specific performance from macro effects. |
| **Complexity** | Medium |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Statistical significance testing | For 5-10 partners with varying batch counts, formal hypothesis testing (t-tests, ANOVA) is misleading. Small samples, unequal groups, non-normal distributions. The math would be "correct" but the conclusions unreliable. | Show ranks and percentiles. Let the team apply domain judgment about whether differences are meaningful. |
| Weighted composite scoring | Creating a single "partner health score" by weighting metrics together buries information and creates debates about weights. | Show individual metric ranks. The team knows which metrics matter for each partner relationship. |
| Automated partner tiering (A/B/C classification) | Artificial bucketing with 5-10 partners creates false precision and potential relationship damage if shared externally. | Percentile ranks and visual position on charts convey relative standing without hard labels. |
| External benchmarking data | Comparing to industry averages requires external data sources the tool does not have. The portfolio IS the benchmark universe for now. | Compare within the portfolio. "Best in class" means best among Bounce's partners, which is the actionable comparison. |

---

## Feature Dependencies (Cross-Pillar)

```
ANOMALY DETECTION
  AD-TS-4 (Algorithm)
    --> AD-TS-1 (Badges) -- algorithm powers badge display
    --> AD-TS-3 (Tooltips) -- algorithm provides explanation data
    --> AD-TS-2 (Summary Panel) -- aggregates badge results
    --> AD-D-1 (Severity Ranking) -- weights anomaly scores
    --> AD-D-2 (Chart Highlighting) -- feeds anomaly flags to charts
  Existing dependency: computeNorms() already provides mean/stddev

NATURAL LANGUAGE QUERY
  NLQ-TS-1 (Input UI)
    --> NLQ-TS-4 (Loading/Error) -- wraps the input interaction
    --> NLQ-TS-2 (Narrative Response) -- renders the result
    --> NLQ-TS-3 (Grounding) -- constrains the response
    --> NLQ-D-1 (Context-Aware) -- injects drill state
    --> NLQ-D-2 (Follow-Ups) -- extends response rendering
  New dependency: Claude API route (server-side), API key management

CROSS-PARTNER COMPARISON
  XPC-TS-1 (Percentile Rankings)
    --> XPC-TS-3 (Comparison Matrix) -- uses same aggregation
    --> XPC-D-3 (Cross-Partner Anomaly) -- uses same aggregation
  XPC-TS-2 (Trajectory Overlay)
    --> XPC-D-2 (Benchmark Line) -- adds reference lines to chart
  Existing dependency: reshapeCurves(), computeKpis(), Recharts

CROSS-PILLAR DEPENDENCIES
  XPC-TS-1 (Percentile Rankings) + AD-TS-4 (Algorithm)
    --> XPC-D-3 (Cross-Partner Anomaly Flags)
  XPC-TS-1 + NLQ (Context-Aware)
    --> NLQ can answer "how does this partner rank?" when drilled in
  AD-TS-2 (Summary Panel) + NLQ
    --> NLQ can explain flagged anomalies when asked
```

**Build order implication:** Anomaly detection builds directly on existing `computeNorms()` -- lowest new-code effort. Cross-partner comparison requires a new aggregation layer across all partners but reuses existing computation patterns. NLQ requires a new API route and Claude integration but is UI-independent of the other two pillars. All three can be built in parallel with a shared "all-partner aggregation" module as the common foundation.

---

## MVP Recommendation

**Phase 1 -- Foundation (shared infrastructure):**
1. **All-partner aggregation module** -- Compute per-partner aggregates for all partners (extends `usePartnerStats` pattern). Powers both anomaly detection and cross-partner comparison.
2. **Anomaly detection algorithm (AD-TS-4)** -- Z-score based, documented. Low complexity since norms already exist.
3. **Anomaly badges (AD-TS-1)** -- Immediate visual value in the existing table.

**Phase 2 -- Core features (parallel tracks):**
4. **Anomaly summary panel (AD-TS-2)** -- "What should I look at today?"
5. **Anomaly tooltips (AD-TS-3)** -- Explainability for badges.
6. **Percentile rankings (XPC-TS-1)** -- First cross-partner metric.
7. **Cross-partner trajectory overlay (XPC-TS-2)** -- Visual comparison at root level.

**Phase 3 -- AI layer:**
8. **NLQ input with suggested prompts (NLQ-TS-1)** -- UI entry point.
9. **Claude API route with data context (NLQ-TS-2, NLQ-TS-3)** -- Server-side integration.
10. **Context-aware scoping (NLQ-D-1)** -- Drill state injection.
11. **Loading/error handling (NLQ-TS-4)** -- Polish.

**Phase 4 -- Polish and differentiators:**
12. **Partner comparison matrix (XPC-TS-3)** -- Summary view.
13. **Anomaly severity ranking (AD-D-1)** -- Prioritization.
14. **Best-in-class benchmark line (XPC-D-2)** -- Chart enhancement.
15. **Follow-up suggestions (NLQ-D-2)** -- AI enhancement.
16. **Clickable data references (NLQ-D-3)** -- Bridge AI to drill-down.

**Defer to v4:**
- Partner cohort segmentation (XPC-D-1) -- Requires richer metadata than currently available.
- Time-period scoped comparison (XPC-D-4) -- Useful but not essential for initial cross-partner view.
- Cross-partner anomaly flags (XPC-D-3) -- Needs both AD and XPC mature before layering.
- Anomaly chart highlighting (AD-D-2) -- Nice but badges handle 80% of the need.

---

## Data Requirements

### Existing Data (No New Snowflake Queries)

| Feature | Data Source | Notes |
|---------|------------|-------|
| Anomaly detection | `agg_batch_performance_summary` (all 477 rows) | Already loaded at root level |
| Cross-partner percentiles | `agg_batch_performance_summary` (all 477 rows) | Aggregation computed client-side |
| Cross-partner curves | `agg_batch_performance_summary` (collection columns) | `reshapeCurves()` per partner, already exists |
| NLQ context data | `agg_batch_performance_summary` + `master_accounts` | Both already fetched by existing API routes |

### New API Requirements

| Feature | Endpoint | Notes |
|---------|----------|-------|
| NLQ | `POST /api/query` | Server-side Claude API call. Accepts question + context (drill state, relevant data). Returns narrative + data points. Snowflake credentials stay server-side. Claude API key needed as new env var. |

**No new Snowflake tables needed.** All v3 features derive from existing data. The NLQ feature needs a new Claude API key but no Snowflake schema changes.

---

## Existing Infrastructure to Extend

| Existing System | v3 Extension |
|----------------|--------------|
| `computeNorms()` (mean/stddev per metric) | Anomaly detection: add z-score computation and threshold flagging on top of existing norms |
| `computeKpis()` (partner-level KPI aggregation) | Cross-partner: run for ALL partners, not just selected one |
| `reshapeCurves()` (batch curve reshaping) | Cross-partner: compute average curve per partner for overlay |
| `metric-polarity.ts` (good/bad direction per metric) | Anomaly detection: only flag anomalies in the "bad" direction |
| `computeTrending()` (batch-over-batch trends) | Anomaly detection: trending + anomaly detection complement each other |
| `PartnerNormsProvider` (React context for norms) | Anomaly detection: extend to include anomaly flags, or create parallel `AnomalyProvider` |
| `data-display.tsx` (layout orchestrator) | All three pillars add new UI sections to this component |
| `use-drill-down.ts` (navigation state) | NLQ: inject current drill state as context for Claude |
| Existing Snowflake `executeQuery()` | NLQ: no change needed (data already in client; Claude call is separate) |
| shadcn/ui Tooltip, Popover, Card | Anomaly tooltips, NLQ response display, comparison cards |

---

## Sources

- [AI-Powered BI Tools Comparison 2026](https://www.holistics.io/bi-tools/ai-powered/) -- semantic layer importance, NLQ patterns across tools
- [Natural Language Query Analytics Guide](https://supaboard.ai/blog/natural-language-query-analytics) -- search bar vs chat interface patterns
- [NLQ Implementation Patterns](https://lansa.com/blog/business-intelligence/nlq-natural-language-query/) -- guided NLQ, suggested prompts
- [AI Design Patterns for Enterprise Dashboards](https://www.aufaitux.com/blog/ai-design-patterns-enterprise-dashboards/) -- anomaly insight cards, passive detection UX
- [Anomaly Detection in Time Series Using Statistics](https://medium.com/booking-com-development/anomaly-detection-in-time-series-using-statistical-analysis-cc587b21d008) -- z-score vs IQR for business metrics
- [Z-Score for Anomaly Detection in Seasonal Data](https://dev.to/qvfagundes/anomaly-detection-in-seasonal-data-why-z-score-still-wins-but-you-need-to-use-it-right-4ec1) -- z-score practical guidance
- [Simple Statistics for Anomaly Detection](https://www.tinybird.co/blog/anomaly-detection) -- when statistical methods beat ML
- [Status Indicator Patterns (Carbon Design)](https://carbondesignsystem.com/patterns/status-indicator-pattern/) -- badge and inline status UX patterns
- [NNGroup Indicators vs Notifications](https://www.nngroup.com/articles/indicators-validations-notifications/) -- passive vs active notification design
- [Dashboard Design Patterns Research](https://dashboarddesignpatterns.github.io/) -- comparison matrix and metrics-repeated-across-dimensions pattern
- [Text-to-SQL Best Practices (Google Cloud)](https://cloud.google.com/blog/products/databases/techniques-for-improving-text-to-sql) -- why to avoid text-to-SQL for small datasets
- [LLM Text-to-SQL Architectures](https://github.com/arunpshankar/LLM-Text-to-SQL-Architectures) -- architectural patterns and when they apply
