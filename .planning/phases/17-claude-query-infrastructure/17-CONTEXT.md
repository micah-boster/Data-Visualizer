# Phase 17: Claude Query Infrastructure - Context

**Gathered:** 2026-04-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Server-side Claude integration that accepts natural language questions with data context and streams safe, data-grounded responses. Covers: API route, system prompt builder, data context injection, streaming via AI SDK, and safety constraints. The UI (search bar, suggested prompts, response display) is Phase 18.

</domain>

<decisions>
## Implementation Decisions

### Data context strategy
- Root level: partner summaries (name, batch count, key aggregates) plus anomaly flags/severity from Phase 15
- Partner level: full detail for current partner, plus a one-line portfolio rank summary for each metric (e.g., "3rd of 8 partners on penetration"). Document the path to all-partners-always as a future enhancement.
- Batch level: batch aggregates plus top 5-10 outlier accounts (highest balance, worst performing) for specific questions. Include parent partner summary alongside.
- Data format in system prompt: Claude's discretion — pick the most effective format (likely hybrid JSON/markdown)

### Response personality
- Tone: smart colleague — conversational but informed, not stiff analyst briefings
- Proactivity: answer the question, then add one relevant follow-up insight if something notable exists
- Length: adaptive — simple lookups get 1-2 sentences, complex analytical questions get a short paragraph
- Specificity: always cite exact numbers. "Penetration is 12.3%, down 1.8pp" — not vague directional language

### Safety & boundaries
- Missing data: hard boundary. "I don't have data on [X]." Full stop. Never speculate or approximate.
- Off-topic questions: answer if harmless, then redirect back to data. Don't refuse simple non-data questions.
- Predictions/recommendations: light operational recommendations are OK ("this declining trend might warrant a check-in") but no financial advice. Always ground in the data.
- Rate limiting: none for now — internal tool, small user base. Add later if needed.

### Context scoping
- Drill state explicitly communicated to Claude in system prompt (e.g., "User is viewing Partner: Affirm, Batch: 2024-03")
- Batch level includes parent partner context (batch detail + partner summary)
- Active UI filters (date range, metric selection) passed to Claude so answers match what's on screen
- Context builder architecture: Claude's discretion

### Claude's Discretion
- Data format structure in system prompt (JSON, markdown tables, hybrid)
- Context builder architecture (single function vs per-level)
- Token budget allocation strategy
- Exact system prompt wording and structure
- Error message phrasing

</decisions>

<specifics>
## Specific Ideas

- Start with current-partner + portfolio-rank at partner level; document the roadmap to passing all partners' full data eventually
- Batch-level outliers should highlight the most notable accounts (highest balance, worst performing) — not a random sample
- The "smart colleague" tone means Claude should say things like "worth watching" or "that's a meaningful decline" — not robotic data recitation

</specifics>

<deferred>
## Deferred Ideas

- All-partners-always context at every drill level — future enhancement once token management is proven
- SQL query generation / direct database access — out of scope, Claude works from pre-computed context only
- Conversation history / multi-turn chat — Phase 18 scope if at all

</deferred>

---

*Phase: 17-claude-query-infrastructure*
*Context gathered: 2026-04-12*
