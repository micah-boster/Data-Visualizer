# Requirements: Bounce Data Visualizer

**Defined:** 2026-04-16
**Core Value:** Surface abnormal account and batch performance data so the partnerships team can focus energy where it matters most — before problems compound.

## v4.0 Requirements

Requirements for design system, code health, URL navigation, accessibility, and carried-forward features (Partner Lists, Chart Builder, Metabase Import). Full detail in [v4.0 Requirements](milestones/v4.0-REQUIREMENTS.md).

**67 requirements across 13 phases:**
- Code Health: HEALTH-01 through HEALTH-06 (Phase 25)
- Design Tokens: DS-01 through DS-06 (Phase 26)
- Typography: DS-07 through DS-10 (Phase 27)
- Surfaces: DS-11 through DS-17 (Phase 28)
- Component Patterns: DS-18 through DS-22 (Phase 29)
- Micro-Interactions: DS-23 through DS-28 (Phase 30)
- Visual Polish: DS-29 through DS-34 (Phase 31)
- URL Navigation: NAV-01 through NAV-04 (Phase 32)
- Accessibility: A11Y-01 through A11Y-05 (Phase 33)
- Partner Lists: LIST-01 through LIST-05 (Phase 34)
- Chart Schema: CHRT-01, CHRT-02 (Phase 35)
- Chart Builder: CHRT-03 through CHRT-13 (Phase 36)
- Metabase Import: META-01 through META-05 (Phase 37)

## Future Requirements

Deferred to v4.5+. Tracked but not in current roadmap.

### NLQ Improvements
- **NLQ-01**: Follow-up query suggestions after Claude responses
- **NLQ-02**: Clickable data references in Claude responses
- **NLQ-03**: Query history persistence

### Dashboards
- **DASH-01**: Dashboard drag-and-drop widget layout
- **DASH-02**: Per-user saved dashboards

### Export & Notifications
- **EXPORT-01**: Exportable partner summary reports (PDF/Excel)
- **NOTIFY-01**: Active anomaly notifications (Slack/email)

### Advanced Analytics
- **ANOM-01**: Adaptive anomaly thresholds (learn from user feedback)
- **ANOM-02**: Seasonal decomposition for time-aware detection
- **COHORT-01**: Partner cohort segmentation by account type
- **COHORT-02**: Time-period scoped comparison
- **CURVE-01**: Dynamic curve re-projection based on actuals

### Advanced Charts
- **CHRT-14**: Group-by dimension for multi-series line/bar charts
- **CHRT-15**: Dual Y-axis support for overlaying metrics with different scales

### Metabase MBQL Import
- **META-06**: User can paste MBQL JSON and have it translated to app configuration
- **META-07**: Interactive field-ID mapper resolves Metabase numeric IDs to column names

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| New API routes for chart data | All charting operates on already-fetched client-side dataset |
| Chart data export (PNG/SVG) | Nice-to-have, not core workflow |
| Real-time chart updates | Batch refresh is sufficient for 2-3 users |
| ML-based chart recommendations | Overkill for small dataset and user count |
| Framer Motion or heavy animation lib | CSS transitions + Web Animations API sufficient for scope |
| Mobile-optimized UI | Desktop-first for 2-3 internal users |
| User authentication | Small team, defer to v5 |

## Traceability

See [v4.0 Requirements](milestones/v4.0-REQUIREMENTS.md) for full traceability table.

**Coverage:**
- v4.0 requirements: 67 total
- Mapped to phases: 67
- Unmapped: 0

---
*Requirements defined: 2026-04-16 — v3.5 absorbed into v4.0*
