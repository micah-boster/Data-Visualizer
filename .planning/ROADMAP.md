# Roadmap: Bounce Data Visualizer

## Milestones

- ✅ **v1.0 MVP** — Phases 1-9 (shipped 2026-04-12) — [Archive](milestones/v1.0-ROADMAP.md)
- ✅ **v2.0 Within-Partner Comparison** — Phases 10-14 (shipped 2026-04-12) — [Archive](milestones/v2.0-ROADMAP.md)
- 🚧 **v3.0 Intelligence & Cross-Partner Comparison** — Phases 15-20 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-9) — SHIPPED 2026-04-12</summary>

- [x] Phase 1: Setup and Snowflake Infrastructure (2/2 plans)
- [x] Phase 2: Core Table and Performance (2/2 plans)
- [x] Phase 3: Data Formatting (2/2 plans)
- [x] Phase 4: Dimension Filtering (2/2 plans)
- [x] Phase 5: Column Management (3/3 plans)
- [x] Phase 6: Saved Views (3/3 plans)
- [x] Phase 7: Export (1/1 plan)
- [x] Phase 8: Navigation and Drill-Down (2/2 plans)
- [x] Phase 9: Vercel Deployment and Launch (1/1 plan)

</details>

<details>
<summary>✅ v2.0 Within-Partner Comparison (Phases 10-14) — SHIPPED 2026-04-12</summary>

- [x] Phase 10: Computation Layer & Charting Foundation (2/2 plans)
- [x] Phase 11: KPI Summary Cards (1/1 plan)
- [x] Phase 12: Collection Curve Charts (2/2 plans)
- [x] Phase 13: Conditional Formatting (2/2 plans)
- [x] Phase 14: Batch-over-Batch Trending (2/2 plans)

</details>

### 🚧 v3.0 Intelligence & Cross-Partner Comparison

**Milestone Goal:** The tool tells you what to look at, lets you ask why, and benchmarks partners against each other.

- [x] **Phase 15: Anomaly Detection Engine** — Deterministic z-score anomaly computation with polarity awareness and severity ranking (completed 2026-04-13)
- [x] **Phase 16: Anomaly Detection UI** — Badges, popovers, summary panel, and chart highlighting for flagged anomalies (completed 2026-04-13)
- [x] **Phase 17: Claude Query Infrastructure** — API route, AI SDK streaming, system prompt with data context, SQL safety layer (completed 2026-04-13)
- [ ] **Phase 18: Claude Query UI** — Search bar, suggested prompts, streaming narrative responses, context-aware scoping
- [ ] **Phase 19: Cross-Partner Computation** — Percentile rankings, normalized trajectories, and portfolio-level anomaly flags
- [ ] **Phase 20: Cross-Partner UI** — Percentile columns, trajectory overlay chart, benchmark lines, and partner comparison matrix

## Phase Details

### Phase 15: Anomaly Detection Engine
**Goal**: The system computes and exposes anomaly data for every partner and batch so downstream UI and AI features can consume it
**Depends on**: Nothing (builds on existing computeNorms/metric-polarity infrastructure from v2)
**Requirements**: AD-01, AD-02, AD-03, AD-04, AD-05, AD-06
**Success Criteria** (what must be TRUE):
  1. Opening the app computes anomaly scores for all partners and batches without any user action (passive detection)
  2. Only metrics deviating in the "bad" direction are flagged (low penetration = flagged, high penetration = not flagged)
  3. A batch is only flagged when 2+ metrics exceed 2 SD from the partner mean, preventing single-metric false positives
  4. Partners are flagged at root level based on their latest batch's anomaly status
  5. ANOMALY-ALGORITHM.md exists in docs/ and fully describes the detection logic, thresholds, and severity scoring
**Plans**: 2 plans

Plans:
- [ ] 15-01-PLAN.md — Anomaly types, polarity expansion, core computation module, and algorithm documentation
- [ ] 15-02-PLAN.md — Hook, context provider, and DataDisplay integration for passive anomaly computation

### Phase 16: Anomaly Detection UI
**Goal**: Users see at a glance which partners and batches need attention, with full explanation available on demand
**Depends on**: Phase 15 (anomaly data must be computed before it can be displayed)
**Requirements**: AD-07, AD-08, AD-09, AD-10
**Success Criteria** (what must be TRUE):
  1. Anomaly badges appear in a Status column on partner rows (root) and batch rows (drill-down) without the user configuring anything
  2. Clicking/hovering an anomaly badge shows a popover with the specific metrics, actual values, expected ranges, and deviation magnitudes
  3. A collapsible anomaly summary panel at the top of root view lists the top flagged partners/batches by severity, and clicking an entry drills into that entity
  4. Anomalous batches are visually distinguished on collection curve charts (bold line, different color, or annotation)
**Plans**: 2 plans

Plans:
- [ ] 16-01-PLAN.md — Anomaly badge component, popover detail, and Status column integration (Wave 1)
- [ ] 16-02-PLAN.md — Anomaly summary panel and chart highlighting for flagged batches (Wave 2)

### Phase 17: Claude Query Infrastructure
**Goal**: A working server-side Claude integration that accepts questions with context and streams safe, data-grounded responses
**Depends on**: Phase 15 (anomaly data enriches Claude's context, making answers more useful)
**Requirements**: NLQ-01, NLQ-02, NLQ-03, NLQ-04, NLQ-05
**Success Criteria** (what must be TRUE):
  1. POST /api/query accepts a natural language question plus current drill state and returns a streaming Claude response
  2. The system prompt includes summarized data context (not raw 477x61 matrix) that stays within token budget
  3. Claude only references data present in its context — asking about data that does not exist returns an explicit "I don't have that data" message
  4. ANTHROPIC_API_KEY is configured as a Vercel server-side env var and never exposed to the client bundle
  5. AI SDK streamText (server) and useChat (client) handle all streaming plumbing with no custom SSE/WebSocket code
**Plans**: 1 plan

Plans:
- [ ] 17-01-PLAN.md — AI SDK install, POST /api/query route with streamText, system prompt builder, data context summarizer

### Phase 18: Claude Query UI
**Goal**: Users can ask natural language questions about their data and receive useful, context-aware narrative answers
**Depends on**: Phase 17 (API route must exist before UI can consume it)
**Requirements**: NLQ-06, NLQ-07, NLQ-08, NLQ-09, NLQ-10
**Success Criteria** (what must be TRUE):
  1. A search bar input (not chat interface) is accessible from the main layout for typing natural language questions
  2. 3-5 suggested starter prompts appear below the search bar, changing based on drill level (root = cross-partner, partner = within-partner, batch = account-level)
  3. AI responses render as a short narrative paragraph with specific data points, streamed token-by-token as they arrive
  4. Questions automatically scope to the current drill context — asking "latest batch" while viewing Affirm resolves to Affirm's latest batch
  5. A loading indicator displays during streaming, errors show graceful messages with retry option, and queries timeout at 30 seconds
**Plans**: 1 plan

Plans:
- [ ] 18-01-PLAN.md — Search bar with useChat streaming, suggested prompts, scope pills, response display, loading/error states

### Phase 19: Cross-Partner Computation
**Goal**: The system computes per-partner rankings and normalized trajectories so users can benchmark partners against each other
**Depends on**: Phase 15 (anomaly data powers cross-partner anomaly flags at XPC-04)
**Requirements**: XPC-01, XPC-02, XPC-03, XPC-04
**Success Criteria** (what must be TRUE):
  1. Per-partner aggregate metrics are computed for ALL partners (not just the selected one) using the usePartnerStats pattern
  2. Percentile rank is computed for each partner on key metrics (penetration rate, 6mo collection rate, 12mo collection rate, total collected)
  3. An average collection curve per partner (mean of all their batch curves at each month point) is available for cross-partner overlay
  4. Partners falling below the 10th percentile on any key metric are flagged as portfolio outliers
**Plans**: TBD

Plans:
- [ ] 19-01: useAllPartnerStats hook, percentile computation, normalized trajectory computation, cross-partner anomaly flags

### Phase 20: Cross-Partner UI
**Goal**: Users can visually compare all partners' performance rankings and collection trajectories at root level
**Depends on**: Phase 19 (cross-partner data must be computed before display)
**Requirements**: XPC-05, XPC-06, XPC-07, XPC-08
**Success Criteria** (what must be TRUE):
  1. Percentile rank columns appear at root-level partner table for key metrics, rendered as "P72" or "3 of 8" format
  2. A cross-partner trajectory overlay chart at root level shows each partner's average collection curve normalized by recovery rate %
  3. Best-in-class and portfolio average reference lines appear on the trajectory chart for benchmarking
  4. A partner comparison matrix/summary view shows key metrics for all partners side-by-side with visual ranking
**Plans**: TBD

Plans:
- [ ] 20-01: Percentile rank columns in root table and cross-partner trajectory overlay chart
- [ ] 20-02: Best-in-class/portfolio-average reference lines and partner comparison matrix view

## Progress

**Execution Order:** Phases execute in numeric order: 15 → 16 → 17 → 18 → 19 → 20

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 15. Anomaly Detection Engine | 2/2 | Complete    | 2026-04-13 | - |
| 16. Anomaly Detection UI | 2/2 | Complete    | 2026-04-13 | - |
| 17. Claude Query Infrastructure | 1/1 | Complete    | 2026-04-13 | - |
| 18. Claude Query UI | v3.0 | 0/1 | Not started | - |
| 19. Cross-Partner Computation | v3.0 | 0/1 | Not started | - |
| 20. Cross-Partner UI | v3.0 | 0/2 | Not started | - |

---
*Last updated: 2026-04-12 after Phase 15 planning*
