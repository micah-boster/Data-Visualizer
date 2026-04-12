# Research Summary: v3.0 Intelligence & Cross-Partner Comparison

**Domain:** AI-powered data analytics with anomaly detection and cross-partner benchmarking
**Researched:** 2026-04-12
**Overall confidence:** HIGH

## Executive Summary

The v3.0 milestone adds three capabilities to the Bounce Data Visualizer: a Claude-powered natural language query layer, passive anomaly detection, and cross-partner comparison with normalization. The good news is that the existing architecture -- pure computation modules composed by `usePartnerStats`, React Query cache holding all batch data client-side, and the established route handler pattern -- is well-suited for all three features with minimal structural changes.

The stack additions are small: Vercel AI SDK (`ai` + `@ai-sdk/anthropic`) for the query layer and `simple-statistics` for statistical computation. That is three new npm packages total. No new databases, no new services, no infrastructure changes beyond adding an `ANTHROPIC_API_KEY` environment variable to Vercel.

The key architectural insight is separation of concerns between deterministic computation and AI narration. Anomaly detection must be deterministic (z-scores, percentile thresholds) so the same data always produces the same flags. Claude's role is to explain anomalies and answer questions about them, not to detect them. This separation satisfies the project's "explainable transformations" constraint and avoids the non-determinism trap that plagued the original Claude + Snowflake queries the tool was built to replace.

Cross-partner comparison extends the existing within-partner norms pattern. The v2 computation layer already computes mean/stddev per metric within a partner. v3 adds a cross-partner layer that computes the same statistics across all partners, producing percentile rankings. The `recoveryRate` field already exists on `CurvePoint` in the types, so normalized curve overlays require no new data transformation -- just a new chart view that selects curves from multiple partners.

## Key Findings

**Stack:** 3 new packages: `ai` (Vercel AI SDK), `@ai-sdk/anthropic`, `simple-statistics`. Nothing else.
**Architecture:** Deterministic anomaly detection feeds into Claude context; Claude narrates, does not detect.
**Critical pitfall:** Context window management -- serializing all 477 rows x 61 columns into a Claude system prompt exceeds token limits. Must summarize/aggregate data before injection.

## Implications for Roadmap

Based on research, suggested phase structure:

1. **Anomaly Detection Engine** - Build the computation layer first
   - Addresses: `compute-anomalies.ts`, anomaly types, z-score/IQR thresholds
   - Avoids: Building AI without deterministic data to feed it
   - Rationale: Every subsequent feature (anomaly badges, Claude context, cross-partner flags) depends on having anomaly scores computed. This is pure TypeScript with no API dependencies.

2. **Anomaly UI (badges, highlights, summary)** - Surface anomalies in existing views
   - Addresses: Anomaly badges on partner/batch rows, anomaly summary panel, highlighting flagged metrics
   - Avoids: Premature AI integration before the data pipeline works
   - Rationale: Users get immediate value from passive anomaly flagging without needing Claude. Validates detection accuracy with the team before layering AI narration on top.

3. **Claude Query Layer** - Natural language data exploration
   - Addresses: Chat UI, route handler, system prompt with data context injection, streaming responses
   - Avoids: Token overflow from naive data serialization
   - Rationale: Depends on anomaly data being available to inject as context. Also benefits from user feedback on which anomalies are actually interesting (from Phase 2 usage).

4. **Cross-Partner Comparison** - Percentile rankings and normalized overlays
   - Addresses: Cross-partner norms computation, percentile rank table, normalized curve overlay chart
   - Avoids: Trying to normalize before within-partner anomaly detection is validated
   - Rationale: Cross-partner comparison is conceptually independent but benefits from anomaly detection being in place (anomalous partners are more interesting to compare). Can be built in parallel with Phase 3 if team capacity allows.

**Phase ordering rationale:**
- Anomaly detection is the foundation -- both the Claude layer and cross-partner comparison consume anomaly data
- Anomaly UI before Claude lets the team validate detection quality with zero API cost
- Claude layer third because it depends on having structured anomaly data to contextualize
- Cross-partner comparison last because it is the most self-contained and least dependent on other v3 features

**Research flags for phases:**
- Phase 3 (Claude Query Layer): Needs deeper research on prompt engineering for financial data narration and token budget management
- Phase 1-2 (Anomaly Detection): Standard statistical patterns, unlikely to need additional research
- Phase 4 (Cross-Partner): May need research on normalization approaches if partners have fundamentally different portfolio characteristics

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | AI SDK and simple-statistics are well-established, actively maintained, versions verified on npm |
| Features | HIGH | Feature scope is well-defined in PROJECT.md, clear boundaries with v4 |
| Architecture | HIGH | Extends existing computation module pattern, no structural changes needed |
| Pitfalls | MEDIUM-HIGH | Context window management and prompt engineering are less predictable than deterministic computation |

## Gaps to Address

- Token budget strategy for Claude context injection (how much data can fit in a system prompt?)
- Prompt engineering patterns for financial data narration (may need iteration)
- Whether anomaly thresholds should be configurable by users or hardcoded
- How to handle partners with very few batches (< 3) in cross-partner percentile rankings
