---
phase: 15-anomaly-detection-engine
plan: 01
subsystem: computation
tags: [z-score, anomaly-detection, polarity, severity-scoring]

requires:
  - phase: v2 (existing infrastructure)
    provides: computeNorms, metric-polarity, partner-stats types
provides:
  - Core anomaly detection engine (computeAnomalies, computeAllPartnerAnomalies)
  - Anomaly type definitions (MetricAnomaly, BatchAnomaly, PartnerAnomaly, AnomalyReport)
  - Expanded polarity map covering 11 metrics
  - Algorithm documentation (ANOMALY-ALGORITHM.md)
affects: [15-02, phase-16-anomaly-ui, phase-17-claude-query, phase-19-cross-partner]

tech-stack:
  added: []
  patterns: [polarity-aware-flagging, correlated-metric-grouping, log-volume-severity]

key-files:
  created:
    - src/lib/computation/compute-anomalies.ts
    - docs/ANOMALY-ALGORITHM.md
  modified:
    - src/types/partner-stats.ts
    - src/lib/computation/metric-polarity.ts

key-decisions:
  - "Population stddev (not sample) since batches are full history, not a sample"
  - "Portfolio fallback at <3 batches threshold for insufficient partner history"
  - "Severity formula: flagCount * avgDeviation * log(placementVolume)"
  - "Only latest batch determines partner flag status"
  - "Ungrouped flags collected into 'other' group rather than dropped"

patterns-established:
  - "Polarity-aware anomaly detection: getPolarity() determines bad direction per metric"
  - "Correlated grouping: METRIC_GROUPS maps group keys to member metrics"
  - "evaluateMetric helper: single-metric z-score evaluation with null/edge-case guards"

requirements-completed: [AD-01, AD-02, AD-03, AD-05, AD-06]

duration: 8min
completed: 2026-04-12
---

# Plan 15-01: Core Anomaly Detection Engine

**Z-score anomaly detection engine with polarity-aware flagging, correlated metric grouping, and log-volume severity scoring**

## What Was Built

1. **Anomaly types** in `partner-stats.ts`: MetricAnomaly, AnomalyGroup, BatchAnomaly, PartnerAnomaly, AnomalyReport. PartnerStats extended with optional `anomalies` field.

2. **Expanded polarity map** in `metric-polarity.ts`: Added 6 diagnostic metrics (accounts with payment, accounts with plans, avg amount placed, credit score, SMS/email open rates) to existing 5 performance metrics.

3. **Core computation** in `compute-anomalies.ts`:
   - `ANOMALY_METRICS`: 11 curated metrics (5 performance + 6 diagnostic)
   - `METRIC_GROUPS`: 4 correlated clusters (funnel, collection, portfolio quality, engagement)
   - `computeAnomalies()`: Per-partner z-score evaluation, 2-metric threshold, grouping, severity
   - `computeAllPartnerAnomalies()`: All-partner computation with portfolio fallback for <3-batch partners

4. **Algorithm documentation** in `docs/ANOMALY-ALGORITHM.md`: 134-line spec covering metrics, groups, z-score computation, polarity, thresholds, severity formula, portfolio fallback, and edge cases.

## Self-Check: PASSED

- [x] TypeScript compiles cleanly (npx tsc --noEmit)
- [x] All anomaly types exported from partner-stats.ts
- [x] METRIC_POLARITY covers all 11 curated metrics
- [x] compute-anomalies.ts exports all 4 required symbols
- [x] docs/ANOMALY-ALGORITHM.md exists (134 lines)
- [x] 3 atomic commits created

## Commits

1. `feat(15-01): add anomaly types and expand polarity map`
2. `feat(15-01): core anomaly detection computation module`
3. `docs(15-01): anomaly detection algorithm documentation`
