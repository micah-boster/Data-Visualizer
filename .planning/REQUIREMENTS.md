# Requirements: Bounce Data Visualizer

**Defined:** 2026-04-15
**Core Value:** Surface abnormal account and batch performance data so the partnerships team can focus energy where it matters most — before problems compound.

## v3.5 Requirements

Requirements for flexible charts and Metabase SQL import. Each maps to roadmap phases.

### Chart Schema

- [ ] **CHRT-01**: Chart state migration preserves all existing saved views without data loss
- [ ] **CHRT-02**: ChartDefinition type supports line, scatter, and bar chart configurations

### Chart Renderer

- [ ] **CHRT-03**: User can view a line chart with any numeric column on the Y-axis and a time/numeric column on the X-axis
- [ ] **CHRT-04**: User can view a scatter plot with any two numeric columns as X and Y axes
- [ ] **CHRT-05**: User can view a bar chart comparing a metric across batches or partners
- [ ] **CHRT-06**: Collection curves render identically to current behavior (anomaly colors, solo mode, batch visibility, average line)

### Chart Builder UI

- [ ] **CHRT-07**: User can select X-axis column from a filtered dropdown (numeric/date columns only)
- [ ] **CHRT-08**: User can select Y-axis column from a filtered dropdown (numeric columns only)
- [ ] **CHRT-09**: User can switch chart type (line, scatter, bar) and the chart re-renders
- [ ] **CHRT-10**: User can save the current chart configuration as a named preset
- [ ] **CHRT-11**: User can load a previously saved chart preset with one click
- [ ] **CHRT-12**: Collection curves are available as a built-in preset
- [ ] **CHRT-13**: Chart configuration persists with saved views (extends existing ChartViewState)

### Metabase SQL Import

- [ ] **META-01**: User can paste Metabase-exported SQL into an import dialog
- [ ] **META-02**: App parses the SQL and extracts referenced columns, filters, and sort order
- [ ] **META-03**: User can preview the mapped configuration before applying
- [ ] **META-04**: Imported SQL maps to a ViewSnapshot (table columns, filters, chart config)
- [ ] **META-05**: Imported configuration respects existing column allow-list (no SQL injection)

## Future Requirements

Deferred to v3.6+. Tracked but not in current roadmap.

### Metabase MBQL Import

- **META-06**: User can paste MBQL JSON and have it translated to app configuration
- **META-07**: Interactive field-ID mapper resolves Metabase numeric IDs to column names

### Advanced Charts

- **CHRT-14**: Group-by dimension for multi-series line/bar charts
- **CHRT-15**: Dual Y-axis support for overlaying metrics with different scales

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| MBQL import | Underdocumented format, deferred to v3.6 after SQL import proves value |
| New API routes for chart data | All charting operates on already-fetched client-side dataset |
| Chart data export (PNG/SVG) | Nice-to-have, not core workflow |
| Real-time chart updates | Batch refresh is sufficient for 2-3 users |
| Key pair auth / Vercel deploy | Punted — code written, needs admin setup |
| ML-based chart recommendations | Overkill for small dataset and user count |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| CHRT-01 | — | Pending |
| CHRT-02 | — | Pending |
| CHRT-03 | — | Pending |
| CHRT-04 | — | Pending |
| CHRT-05 | — | Pending |
| CHRT-06 | — | Pending |
| CHRT-07 | — | Pending |
| CHRT-08 | — | Pending |
| CHRT-09 | — | Pending |
| CHRT-10 | — | Pending |
| CHRT-11 | — | Pending |
| CHRT-12 | — | Pending |
| CHRT-13 | — | Pending |
| META-01 | — | Pending |
| META-02 | — | Pending |
| META-03 | — | Pending |
| META-04 | — | Pending |
| META-05 | — | Pending |

**Coverage:**
- v3.5 requirements: 18 total
- Mapped to phases: 0
- Unmapped: 18 ⚠️

---
*Requirements defined: 2026-04-15*
*Last updated: 2026-04-15 after initial definition*
