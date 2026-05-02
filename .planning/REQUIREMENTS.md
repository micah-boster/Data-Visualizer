# Requirements: Bounce Data Visualizer

**Defined:** 2026-04-16 — Last revised 2026-05-02 on v4.5 close
**Core Value:** Surface abnormal account and batch performance data so the partnerships team can focus energy where it matters most — before problems compound.

## Current Milestone — none active

v4.5 closed 2026-05-02. v5.0 (External Intelligence — scorecard ingestion, contractual targets, triangulation, reconciliation, dynamic curve re-projection) requirements will be defined via `/gsd:new-milestone` when it kicks off.

Phase 45 architecture must consume the v4.5 SEC-04 forward threat model (`.planning/phases/42a-security-review-oauth-independent/SEC-04-THREAT-MODEL.md`).

## Shipped Milestones

- **v1.0 MVP** — 9 phases / 18 plans, shipped 2026-04-12 — [Archive](milestones/v1.0-REQUIREMENTS.md)
- **v2.0 Within-Partner Comparison** — 5 phases / 9 plans, shipped 2026-04-12 — [Archive](milestones/v2.0-REQUIREMENTS.md)
- **v3.0 Intelligence & Cross-Partner Comparison** — 6 phases / 9 plans / 28 reqs, shipped 2026-04-14 — [Archive](milestones/v3.0-REQUIREMENTS.md)
- **v3.1 Stabilization & Code Quality** — 4 phases / 8 plans, shipped 2026-04-14
- **v4.0 Design System & Daily-Driver UX** — 13 phases / 105 plans / 67 reqs, shipped 2026-04-24 — [Archive](milestones/v4.0-REQUIREMENTS.md)
- **v4.1 Feedback-Driven Polish** — 4 phases (38-40 + 40.1) / 14 plans / 35 reqs (POL/CHT/KPI/FLT/MBI/PCFG/PRJ), shipped 2026-04-27 — [Archive](milestones/v4.1-REQUIREMENTS.md)
- **v4.5 Correctness & Foundation** — 4 phases (41 / 42a / 43 / 44) / 15 plans / 28 reqs (DCR/SEC/BND/VOC) — 25/28 closed, shipped 2026-05-02 — [Archive](milestones/v4.5-REQUIREMENTS.md). Known gaps: DCR-11 ADR-line tracking pending (ADRs themselves shipped); Phase 42b (SEC-02/05) deferred until OAuth on Vercel — NOT a v5.0 entry blocker.

## Future Requirements

Deferred to v5.0+. Tracked but not in current roadmap.

### v5.0 External Intelligence (Phases 45-49)

- **SCRD-\***: Scorecard ingestion pipeline (multi-format, per-partner schema learning, human-in-the-loop)
- **TGT-\***: Contractual target management (manual entry + contract PDF extraction, versioned)
- **TRI-\***: Triangulation views (internal vs scorecard vs target, divergence highlighting)
- **REC-\***: Scorecard reconciliation & history (drift detection, partner reliability scoring)
- **DCR-V5-\***: Dynamic curve re-projection (target-aware projections with confidence bands — extends v4.1 Phase 40)

### v5.5 Real-Use Hardening (Phases 50-51)

- **QA-01..06**: Behavioral QA from observed MBR-prep workflows (effective only after v5.0 in daily use)
- **IUR-01..03**: In-situ research infrastructure — telemetry sink, confusion-button feedback channel, weekly review ritual (telemetry plumbing co-built into v5.0)
- **DEBT-01..10**: Tech-debt sweep — KNOWN-ISSUES.md backlog + computation-layer consolidation + TanStack v9 migration + dependency upgrades + dead-code retirement + hot-path perf + decompose `data-display.tsx` + state consolidation into Zustand + test pyramid inversion (Vitest + property tests) + perf budget enforced in CI

### v6.0 Proactive Intelligence & Action (Phases 52-57)

- Weekly Partner Highlights (flagged for review — may merge with MBR Pipeline)
- Pattern Alerts to Slack (consecutive declines, divergence widening, peer-group outliers)
- MBR Pipeline Integration (one-click data staging → existing MBR pipeline skill)
- Action Connections (Flag in Slack, Create Notion task, Add to MBR agenda)
- Temporal Intelligence (vintage comparison, cohort trending, forecasting, leading indicators)
- NLQ Enhancements (follow-up suggestions, clickable references, multi-source + temporal queries)

### v6.5+

- **DASH-01/02**: Dashboard drag-and-drop widget layout, per-user saved dashboards
- **EXPORT-01**: Exportable partner summary reports (PDF/Excel)
- **NLQ-01/02/03**: Follow-up query suggestions, clickable data references, query history persistence
- **ANOM-01/02**: Adaptive anomaly thresholds, seasonal decomposition
- **COHORT-01/02**: Partner cohort segmentation by account type, time-period scoped comparison
- **CHRT-14/15**: Group-by dimension for multi-series charts, dual Y-axis support
- **META-06/07**: MBQL JSON import, interactive field-ID mapper

## Pending Expert Reviews (not yet run)

Best deferred until after v5.0 ships when the surface is feature-complete:

- Pure visual design review (color theory, typography pairing, spacing rhythm, dark mode)
- Performance specialist profile (TTI, memory, bundle composition, hydration cost)
- Production / SRE readiness review (observability, alerting, cost monitoring, backup/DR, runbooks)
- Accessibility specialist deep-dive (NVDA/VoiceOver walkthroughs, WCAG 2.2 AA)
- Full external security review (penetration test, AI-query fuzzing, contract review)
- Content strategy / microcopy review (button labels, error messages, AI prose, notification copy)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| New API routes for chart data | All charting operates on already-fetched client-side dataset |
| Chart data export (PNG/SVG) | Nice-to-have, not core workflow |
| Real-time chart updates | Batch refresh is sufficient for 2-3 users |
| ML-based chart recommendations | Overkill for small dataset and user count |
| Framer Motion or heavy animation lib | CSS transitions + Web Animations API sufficient |
| Mobile-optimized UI | Desktop-first for 2-3 internal users (consult layout reconsidered v6.0) |
| User authentication | Small team; revisit when external access needed |
| Editing or writing back to Snowflake | Read-only tool |
| ML-based anomaly detection | Overkill for 477 rows; violates explainability constraint |
| Text-to-SQL generation | Dataset fits in context; SQL injection risk |
| Full chat/conversation interface | Point queries match usage pattern |

## Traceability

See per-milestone files for full traceability tables:
- [v4.5 Requirements](milestones/v4.5-REQUIREMENTS.md) — shipped
- [v4.1 Requirements](milestones/v4.1-REQUIREMENTS.md) — shipped
- [v4.0 Requirements](milestones/v4.0-REQUIREMENTS.md) — shipped

**v4.5 final coverage:**
- Total: 28 in-scope requirements (DCR-01..11 + SEC-01..06 + BND-01..06 + VOC-01..07; SEC-02 + SEC-05 split out into Phase 42b at milestone close)
- Closed: 25 (DCR-01..10 + SEC-01/03/04/06 + BND-01..06 + VOC-01..07)
- Deferred: 2 (SEC-02 + SEC-05 — gated on OAuth on Vercel; Phase 42b)
- Tracking-line pending: 1 (DCR-11 — ADR set is *implemented* under Plan 41-04 with inline `// ADR:` callsite comments; requirement-line cleanup deferred)

---
*Requirements defined: 2026-04-16 — v3.5 absorbed into v4.0*
*Last updated: 2026-05-02 — v4.5 closed; v4.5 archived to milestones/v4.5-REQUIREMENTS.md; current-milestone block cleared pending v5.0 kickoff via /gsd:new-milestone*
