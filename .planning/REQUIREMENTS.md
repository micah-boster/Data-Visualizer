# Requirements: Bounce Data Visualizer

**Defined:** 2026-04-10
**Core Value:** Surface abnormal account and batch performance data so the partnerships team can focus energy where it matters most — before problems compound.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Data Access

- [ ] **DATA-01**: App connects to Snowflake and loads data from `agg_batch_performance_summary`
- [ ] **DATA-02**: Loading states shown during data fetch, errors handled gracefully
- [ ] **DATA-03**: Data refreshable on demand without page reload

### Data Table

- [ ] **TABL-01**: User can view batch performance data in an interactive table
- [ ] **TABL-02**: User can sort any column ascending/descending (single and multi-column)
- [ ] **TABL-03**: User can filter columns by text search, numeric range, or value selection
- [ ] **TABL-04**: User can show/hide columns from the 61-column schema
- [ ] **TABL-05**: User can drag to reorder columns
- [ ] **TABL-06**: Table handles full dataset without lag (virtual scrolling if needed)

### Data Formatting

- [ ] **FMT-01**: Currency values display with $ and commas
- [ ] **FMT-02**: Percentages display with % symbol and appropriate decimal places
- [ ] **FMT-03**: Large numbers display with commas
- [ ] **FMT-04**: Numeric columns right-aligned

### Filtering

- [ ] **FILT-01**: User can filter by partner name (dropdown)
- [ ] **FILT-02**: User can filter by account type (dropdown)
- [ ] **FILT-03**: User can filter by batch (dropdown/search)
- [ ] **FILT-04**: Filters compose with AND logic
- [ ] **FILT-05**: Active filters clearly visible and individually removable

### Saved Views

- [ ] **VIEW-01**: User can save current table state (filters, columns, sort) as a named view
- [ ] **VIEW-02**: User can load a saved view from a list
- [ ] **VIEW-03**: User can delete saved views
- [ ] **VIEW-04**: Saved views persist across browser sessions

### Export

- [ ] **EXPO-01**: User can export current filtered/sorted view to CSV
- [ ] **EXPO-02**: Export respects active filters and column visibility

### Navigation

- [ ] **NAV-01**: User can click a partner to see their batches
- [ ] **NAV-02**: User can click a batch to see account-level detail (when additional tables available)
- [ ] **NAV-03**: Breadcrumb navigation shows current drill path
- [ ] **NAV-04**: User can navigate back up the drill hierarchy

### Deployment

- [ ] **DEPL-01**: App deployed to Vercel and accessible via URL
- [ ] **DEPL-02**: Snowflake credentials stored securely in environment variables

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Anomaly Detection

- **ANOM-01**: Anomaly highlighting with threshold-based cell coloring (red/yellow/green)
- **ANOM-02**: Configurable threshold rules per metric
- **ANOM-03**: Period-over-period change tracking (MoM, WoW, batch-over-batch)
- **ANOM-04**: Benchmark comparison vs portfolio/partner averages

### Visualization

- **VIZ-01**: Collection curve line charts (1-60 month progression)
- **VIZ-02**: KPI summary cards at top of page
- **VIZ-03**: Inline sparklines in table cells

### Dashboard

- **DASH-01**: Dashboard layout with drag/drop reorderable widgets
- **DASH-02**: Saved dashboard layouts

### AI Layer

- **AI-01**: Natural language query interface via Claude
- **AI-02**: Claude-powered anomaly detection and insights

## Out of Scope

| Feature | Reason |
|---------|--------|
| User authentication / multi-tenancy | 2-3 internal users, no access control needed |
| Write-back to Snowflake | Read-only analytics tool, avoid data integrity risks |
| Real-time data streaming | Debt collection data refreshes on batch cycles, not real-time |
| Mobile-responsive UI | Desktop-only for 2-3 internal users, 61 columns incompatible with mobile |
| Alerting / notifications | 2-3 users check tool regularly, anomaly highlighting sufficient for MVP |
| PDF report generation | CSV/Excel export covers sharing use case |
| Custom SQL editor | Reintroduces non-determinism problem, security surface area |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| DATA-01 | Phase 1 | Pending |
| DATA-02 | Phase 1 | Pending |
| DATA-03 | Phase 1 | Pending |
| DEPL-02 | Phase 1 | Pending |
| TABL-01 | Phase 2 | Pending |
| TABL-02 | Phase 2 | Pending |
| TABL-06 | Phase 2 | Pending |
| FMT-01 | Phase 3 | Pending |
| FMT-02 | Phase 3 | Pending |
| FMT-03 | Phase 3 | Pending |
| FMT-04 | Phase 3 | Pending |
| FILT-01 | Phase 4 | Pending |
| FILT-02 | Phase 4 | Pending |
| FILT-03 | Phase 4 | Pending |
| FILT-04 | Phase 4 | Pending |
| FILT-05 | Phase 4 | Pending |
| TABL-03 | Phase 5 | Pending |
| TABL-04 | Phase 5 | Pending |
| TABL-05 | Phase 5 | Pending |
| VIEW-01 | Phase 6 | Pending |
| VIEW-02 | Phase 6 | Pending |
| VIEW-03 | Phase 6 | Pending |
| VIEW-04 | Phase 6 | Pending |
| EXPO-01 | Phase 7 | Pending |
| EXPO-02 | Phase 7 | Pending |
| NAV-01 | Phase 8 | Pending |
| NAV-02 | Phase 8 | Pending |
| NAV-03 | Phase 8 | Pending |
| NAV-04 | Phase 8 | Pending |
| DEPL-01 | Phase 9 | Pending |

**Coverage:**
- v1 requirements: 30 total
- Mapped to phases: 30
- Unmapped: 0

---
*Requirements defined: 2026-04-10*
*Last updated: 2026-04-10 after roadmap creation*
