# Phase Analysis: Dependencies, LoE, and Complexity Ceiling

**Created:** 2026-04-12
**Context:** Understanding where each v3.0 phase sits relative to "world class" — what we're building, what's left on the table, and where future investment pays off.

---

## Phase 15: Anomaly Detection Engine
**Dependencies:** None — builds directly on existing `computeNorms()` and `metric-polarity.ts`
**LoE:** Low (~2 plans, ~1-2 hours)
**Gap to World Class:** Small

| What we're building | What Google would build |
|---------------------|------------------------|
| Z-score per metric, 2 SD threshold | Multivariate anomaly detection (correlations between metrics) |
| Static threshold (2 SD) | Adaptive thresholds that learn from user feedback (was this flag useful?) |
| Point-in-time detection | Seasonal decomposition (STL/Prophet) — "this looks bad for January" vs "this looks bad period" |
| Per-partner baseline | Cohort-aware baselines — "this is bad for a BNPL partner of this size" |

**Assessment:** For 477 rows across ~5-10 partners, z-scores are genuinely the right call. The marginal value of multivariate detection on this dataset is near zero — you'd be fitting a complex model to a handful of data points. This phase is close to optimal for this scale. The only thing worth revisiting later is adaptive thresholds (learning from which flags the team actually acts on), and that's a v4+ thing.

---

## Phase 16: Anomaly Detection UI
**Dependencies:** Phase 15
**LoE:** Medium (~2 plans, ~2-3 hours)
**Gap to World Class:** Medium — mostly about polish

| What we're building | What Google would build |
|---------------------|------------------------|
| Badge + popover explaining the anomaly | Auto-generated natural language explanation ("Affirm's March batch is underperforming because penetration rate dropped while placement volume stayed constant") |
| Summary panel with top 5-10 flags | Interactive anomaly explorer — filter by type, severity, time range, metric |
| Chart highlighting (bold line) | Anomaly-specific mini-charts inline — sparkline showing the anomalous trajectory vs expected band |
| Static severity ranking | Anomaly correlation view — "these 3 partners all degraded on the same metric in the same month, suggesting a systemic issue" |

**Assessment:** Badges + summary + tooltips cover ~80% of the value. The natural language explanation gap is essentially what Phases 17-18 (Claude query layer) give you. Once Claude can explain anomalies in plain English, you get the Google-level explanation feature "for free" by combining Phases 15-16 with 17-18. The real power isn't in making the anomaly UI fancier — it's in the cross-pillar integration.

---

## Phase 17: Claude Query Infrastructure
**Dependencies:** Phase 15 (anomaly data enriches Claude's context)
**LoE:** Medium (~1 plan, ~2-3 hours)
**Gap to World Class:** Very Large — deepest rabbit hole

| What we're building | What Google would build |
|---------------------|------------------------|
| JSON context injection (pass summarized data in prompt) | RAG pipeline — vector embeddings of all historical data, semantic retrieval of relevant rows for each query |
| Single system prompt with data snapshot | Multi-step reasoning chains — Claude plans a query strategy, executes multiple tool calls, synthesizes results |
| Summarized aggregates in context | Tool use — Claude calls functions to query Snowflake directly, compute custom aggregations on-demand, access any granularity of data |
| ~50-100K token context per query | Semantic caching — similar questions return cached answers instantly, saving cost and latency |
| Flat JSON serialization | Structured knowledge graph — entities (partners, batches, accounts) with relationships, enabling graph traversal queries |

**Assessment:** JSON context injection is the right v3.0 choice for 477 rows and 2-3 users. But this is the phase with the most room to grow. The upgrade path goes: (1) context injection → (2) tool use (Claude calls functions to get specific data) → (3) RAG for historical query patterns → (4) multi-step reasoning agents. Each step roughly doubles the capability. If you wanted to invest disproportionately in one phase, this is the one — not for v3.0, but the architecture decisions here determine how smoothly you can upgrade later.

Google would also build evaluation: a test suite of 50-100 questions with expected answers, measuring accuracy/hallucination rate. For 2-3 users you'll do this informally by just using it, but if you ever scale beyond the team, structured eval becomes critical.

---

## Phase 18: Claude Query UI
**Dependencies:** Phase 17
**LoE:** Low-Medium (~1 plan, ~1-2 hours)
**Gap to World Class:** Medium — mostly UX polish that matters a lot

| What we're building | What Google would build |
|---------------------|------------------------|
| Search bar with 3-5 static suggested prompts | Query autocomplete that predicts what you're typing based on data schema and past queries |
| Plain text narrative response | Rich responses — inline tables, mini-charts, highlighted numbers, collapsible detail sections |
| Context-aware scoping (drill state) | Visual query builder — click a partner/metric and it pre-populates a structured query |
| Suggested prompts per drill level | Personalized suggestions based on what you've asked before and what anomalies exist now |
| Loading spinner + error toast | Confidence indicator per answer, source citations linking to exact data rows |

**Assessment:** The search bar + narrative pattern is solid and proven. The thing that would most dramatically improve UX is rich response formatting — inline tables and highlighted numbers instead of plain text. That's not architecturally hard (Claude can return markdown, you render it), but it's a polish pass. This phase is about getting the interaction right, not engineering complexity. The v3.1 conversation threading upgrade will matter more than anything on this list.

---

## Phase 19: Cross-Partner Computation
**Dependencies:** Phase 15 (anomaly flags for portfolio outlier detection)
**LoE:** Medium (~1 plan, ~2-3 hours)
**Gap to World Class:** Large — normalization is genuinely hard

| What we're building | What Google would build |
|---------------------|------------------------|
| Percentile rank on raw metrics | Risk-adjusted comparison — normalize by account type, balance range, vintage, and originator |
| Recovery rate % as normalization | Multi-factor normalization model — control for batch size, account age distribution, geographic mix, economic conditions |
| Average curve per partner | Vintage-aligned curves — only compare batches of the same age, controlling for macro effects |
| Portfolio-wide percentiles | Cohort-based percentiles — "top quartile among BNPL partners" not "top quartile among all partners" |
| Static computation | Dynamic benchmarking — "this partner was P75 last quarter, now P45, declining" |

**Assessment:** Percentile ranks + recovery rate normalization get you surprisingly far because the partners likely share similar characteristics (all debt buyers / BNPL). The normalization problem gets hard when comparing apples to oranges (student loans vs medical debt vs BNPL). If partners are mostly in the same category, this approach is 80% of optimal. If they're diverse, cohort segmentation (deferred to v3.1/v4) becomes important faster.

The thing that would matter most: time-period scoping (also deferred). Comparing partners across different economic environments is misleading. Same-quarter comparison is much more meaningful. That's a medium-complexity addition for v3.1.

---

## Phase 20: Cross-Partner UI
**Dependencies:** Phase 19
**LoE:** Medium-High (~2 plans, ~3-4 hours)
**Gap to World Class:** Medium-High — visualization is where polish pays off

| What we're building | What Google would build |
|---------------------|------------------------|
| Percentile columns in table ("P72") | Interactive leaderboard with sparkline trends — "P72 (was P58 last quarter)" |
| Line chart trajectory overlay | Small multiples — one mini-chart per partner for easier comparison |
| Best-in-class + portfolio avg reference lines | Confidence bands / shaded ranges showing expected performance envelope |
| Comparison matrix (metrics x partners) | Interactive scatter plot — x=penetration rate, y=collection rate, bubble size=volume, with quadrant labels |
| Static layout | User-selectable comparison — pick 2-3 partners and metrics for focused side-by-side |

**Assessment:** The trajectory overlay chart is the hero feature here and Recharts handles it well. The thing Google would add that matters most is the interactive scatter plot — it reveals clustering and outliers in a way that tables can't. That's a meaningful v3.1 add. The comparison matrix is solid; small multiples would be better but significantly more implementation work. This phase is where spending more time has the most visible payoff because it's what the team stares at every day.

---

## Summary Table

| Phase | LoE | Gap to World Class | Where Future Investment Pays Off |
|-------|-----|---------------------|----------------------------------|
| **15** Anomaly Engine | Low | **Small** — z-scores are right for this scale | Adaptive thresholds (v4) |
| **16** Anomaly UI | Medium | **Medium** — cross-pillar integration with NLQ closes the gap | Natural language explanations come from Phases 17-18 |
| **17** NLQ Infrastructure | Medium | **Very Large** — deepest rabbit hole | Architecture for tool use + multi-step reasoning (v4) |
| **18** NLQ UI | Low-Medium | **Medium** — rich response formatting + threading | v3.1 threading, rich markdown rendering |
| **19** XPC Computation | Medium | **Large** — normalization is genuinely hard | Cohort segmentation + time-period scoping (v3.1) |
| **20** XPC UI | Medium-High | **Medium-High** — visualization polish is visible | Interactive scatter plot, small multiples (v3.1) |

## Key Takeaways

- **Think hardest about architecturally:** Phases 17 (NLQ infra) and 19 (XPC computation). They have the deepest upgrade paths and decisions now determine how expensive future improvements are.
- **Closest to "done right" already:** Phase 15 (anomaly engine). Z-scores on small data is the correct tool, not a shortcut.
- **Most visible to users per hour invested:** Phase 20 (XPC UI). Every hour spent on visualization polish shows up directly in the daily workflow.
- **Cross-pillar integration is the multiplier:** Phases 15-16 + 17-18 combined deliver Google-level anomaly explanations without Google-level anomaly UI complexity.

---
*Analysis created: 2026-04-12 during v3.0 milestone planning*
