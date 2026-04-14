# Roadmap: Bounce Data Visualizer

## Milestones

- ✅ **v1.0 MVP** — Phases 1-9 (shipped 2026-04-12) — [Archive](milestones/v1.0-ROADMAP.md)
- ✅ **v2.0 Within-Partner Comparison** — Phases 10-14 (shipped 2026-04-12) — [Archive](milestones/v2.0-ROADMAP.md)
- 🚧 **v3.0 Intelligence & Cross-Partner Comparison** — Phases 15-20 (in progress)
- 📋 **v3.1 Stabilization & Code Quality** — Phases 21-24 (planned)

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
- [x] **Phase 18: Claude Query UI** — Search bar, suggested prompts, streaming narrative responses, context-aware scoping (completed 2026-04-13)
- [x] **Phase 19: Cross-Partner Computation** — Percentile rankings, normalized trajectories, and portfolio-level anomaly flags (completed 2026-04-13)
- [x] **Phase 20: Cross-Partner UI** — Percentile columns, trajectory overlay chart, benchmark lines, and partner comparison matrix (completed 2026-04-14)

### 📋 v3.1 Stabilization & Code Quality

**Milestone Goal:** v3.0 features are bug-free, polished, verified, and the codebase is production-grade with a comprehensive known-issues list.

- [x] **Phase 21: Critical Bug Fixes** — Fix all-zero Claude context (wrong Snowflake column names) and root-level anomaly badge gap (completed 2026-04-14)
- [ ] **Phase 22: UI Polish & Data Reliability** — User-reported chart/UI issues and cached data loading fixes
- [ ] **Phase 23: Verification & Housekeeping** — Phase 17/18 VERIFICATION.md, REQUIREMENTS.md traceability update, Phase 19 SUMMARY fix
- [ ] **Phase 24: Code Review & Refactoring** — Full architecture review, type safety audit, performance pass, comprehensive known-issues list

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
**Plans**: 2 plans

Plans:
- [ ] 20-01-PLAN.md — Percentile rank columns in root table, cross-partner trajectory overlay chart with reference lines
- [ ] 20-02-PLAN.md — Partner comparison matrix with heatmap, bar ranking, and plain table view modes

### Phase 21: Critical Bug Fixes
**Goal**: Claude queries return real data and anomaly badges appear at every drill level — no broken integrations remain
**Depends on**: Phases 17, 18 (query infrastructure), Phase 16 (anomaly UI)
**Requirements**: NLQ-03, NLQ-04, NLQ-09, AD-07
**Gap Closure**: Closes integration bugs from v3.0 audit
**Success Criteria** (what must be TRUE):
  1. `QuerySearchBarWithContext` sends Claude accurate KPI values matching what the table displays (not zeros)
  2. Anomaly badge Status column appears at root-level partner table (not just partner/batch drill levels)
  3. Claude responses reference real data points that match the actual dataset
**Plans**: 1 plan

Plans:
- [ ] 21-01-PLAN.md — Fix Snowflake column name mapping in QuerySearchBarWithContext, add anomalyStatusColumn to buildRootColumnDefs()

### Phase 22: UI Polish & Data Reliability
**Goal**: User-reported chart/interaction issues resolved and cached data loads reliably with validation
**Depends on**: Phase 21 (bugs fixed first), Phase 12 (curve charts), Phase 20 (comparison button)
**Requirements**: None (UI issues and data reliability — not tied to v3.0 requirements)
**Gap Closure**: Closes user-reported issues UI-01 through UI-04 and data issues DATA-01 through DATA-03
**Success Criteria** (what must be TRUE):
  1. Clicking different batch lines on curve chart updates the tooltip to that batch's data
  2. A visible collapse/minimize control exists for the chart area, making table rows accessible on laptop screens
  3. Partner comparison button has clear labeling or visual transition explaining what the mode shows
  4. Switching metric views updates the chart to reflect the selected metric
  5. New account JSON files load without errors (missing column handled, empty strings normalized)
  6. Cached data files are schema-validated before serving in static mode
**Plans**: 2 plans

Plans:
- [ ] 22-01-PLAN.md — Fix chart tooltip, add chart collapse control, clarify comparison button, wire view switch to chart
- [ ] 22-02-PLAN.md — Handle missing ACCOUNT_PUBLIC_ID, normalize empty strings, add cached data schema validation

### Phase 23: Verification & Housekeeping
**Goal**: All completed phases have formal verification, REQUIREMENTS.md accurately reflects project state
**Depends on**: Phases 21, 22 (all code changes done before final verification pass)
**Requirements**: NLQ-01, NLQ-02, NLQ-05, NLQ-06, NLQ-07, NLQ-08, NLQ-10 (verification only)
**Gap Closure**: Closes verification gaps and tech debt from v3.0 audit
**Success Criteria** (what must be TRUE):
  1. Phase 17 has a VERIFICATION.md confirming NLQ-01/02/03/04/05 with evidence
  2. Phase 18 has a VERIFICATION.md confirming NLQ-06/07/08/09/10 with evidence
  3. REQUIREMENTS.md traceability table shows correct phase assignments and completion status for all 28 requirements
  4. Phase 19 SUMMARY.md has YAML frontmatter with requirements-completed field
**Plans**: 1 plan

Plans:
- [ ] 23-01-PLAN.md — Generate Phase 17/18 VERIFICATION.md files, update REQUIREMENTS.md traceability, fix Phase 19 SUMMARY frontmatter

### Phase 24: Code Review & Refactoring
**Goal**: The codebase reads like production software — clean architecture, strict types, no dead code, documented known issues
**Depends on**: Phases 20-23 (all features and fixes complete before refactoring)
**Requirements**: None (quality gate, not feature work)
**Success Criteria** (what must be TRUE):
  1. **Readability & consistency**: Consistent naming conventions across all files, no dead code or unused imports, consistent patterns for hooks/components/utilities, logical file organization
  2. **Type safety & correctness**: No `any` types except at genuine system boundaries, proper null/undefined handling, exhaustive switch/discriminated union coverage, strict TypeScript config
  3. **Performance & efficiency**: No unnecessary re-renders in hot paths, computation hooks properly memoized, bundle size reviewed (no oversized imports), lazy loading where appropriate
  4. **Maintainability & modularity**: Clean separation of concerns (data/computation/UI), shared utilities extracted where 3+ patterns repeat, component APIs documented where non-obvious, hook dependencies explicit
  5. **Architecture review**: Component tree structure validated, data flow patterns consistent, provider/context hierarchy justified, file/folder structure reflects domain boundaries
  6. **Known issues document**: `docs/KNOWN-ISSUES.md` comprehensively lists every known limitation, edge case, future improvement, and tech debt item with severity and suggested approach
**Plans**: TBD (will be determined during planning — likely 2-3 plans covering different subsystems)

Plans:
- [ ] 24-01-PLAN.md — Architecture review, type safety audit, dead code removal
- [ ] 24-02-PLAN.md — Performance optimization, computation memoization, bundle review
- [ ] 24-03-PLAN.md — Known issues documentation and final cleanup pass

## Progress

**Execution Order:** Phases execute in numeric order: 15 → 16 → 17 → 18 → 19 → 20 → 21 → 22 → 23 → 24

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 15. Anomaly Detection Engine | 2/2 | Complete    | 2026-04-13 | - |
| 16. Anomaly Detection UI | 2/2 | Complete    | 2026-04-13 | - |
| 17. Claude Query Infrastructure | 1/1 | Complete    | 2026-04-13 | - |
| 18. Claude Query UI | 1/1 | Complete    | 2026-04-13 | - |
| 19. Cross-Partner Computation | 1/1 | Complete    | 2026-04-13 | - |
| 20. Cross-Partner UI | 2/2 | Complete    | 2026-04-14 | - |
| 21. Critical Bug Fixes | 1/1 | Complete   | 2026-04-14 | - |
| 22. UI Polish & Data Reliability | v3.1 | 0/2 | Not started | - |
| 23. Verification & Housekeeping | v3.1 | 0/1 | Not started | - |
| 24. Code Review & Refactoring | v3.1 | 0/3 | Not started | - |

---
*Last updated: 2026-04-12 after Phase 15 planning*
