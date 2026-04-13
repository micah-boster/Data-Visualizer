---
phase: 16-anomaly-detection-ui
plan: 01
subsystem: ui-anomaly
tags: [anomaly-badge, popover, status-column, tanstack-table]

requires:
  - phase: 15-anomaly-detection-engine
    provides: AnomalyProvider context, PartnerAnomaly types, useAnomalyContext hook
provides:
  - Anomaly formatting utilities (severity classification, metric labels, range formatting)
  - AnomalyBadge component (yellow/red colored dots)
  - AnomalyDetail popover content (grouped metrics with values, ranges, deviations)
  - Status column as leftmost TanStack Table column
  - anomalyMap passed through table meta for cell rendering
affects: [16-02, phase-17-claude-query]

tech-stack:
  added: []
  patterns: [virtual-column-via-table-meta, popover-cell-renderer, severity-classification]

key-files:
  created:
    - src/lib/formatting/anomaly-labels.ts
    - src/components/anomaly/anomaly-badge.tsx
    - src/components/anomaly/anomaly-detail.tsx
    - src/lib/columns/anomaly-column.tsx
  modified:
    - src/lib/columns/definitions.ts
    - src/lib/table/hooks.ts
    - src/components/table/data-table.tsx

key-decisions:
  - "Severity: critical at 4+ flags, warning at 2-3 flags"
  - "Status column uses __anomaly_status id to avoid collision with data columns"
  - "Column is enableHiding: false, enableSorting: false, enableResizing: false"
  - "AnomalyDetail shows grouped metrics using AnomalyGroup structure from compute-anomalies"
  - "DataTable calls useAnomalyContext() directly since it's inside AnomalyProvider"

patterns-established:
  - "Virtual computed column: column reads from table meta, not row data"
  - "Popover cell: PopoverTrigger wraps badge, PopoverContent renders detail"
  - "Severity classification: single utility function as source of truth"

requirements-completed: [AD-07, AD-08]

duration: 5min
completed: 2026-04-12
---

# Plan 16-01: Anomaly Badge, Popover, and Status Column

**Status column with colored dot badges and click-triggered detail popovers for anomalous partners and batches**

## What Was Built

1. **Anomaly formatting utilities** (`anomaly-labels.ts`): Human-readable metric labels, severity classification (warning/critical), expected range formatting, deviation magnitude formatting. Single source of truth for anomaly display.

2. **AnomalyBadge component**: Colored dot (w-3 h-3 rounded-full) -- amber-500 for warning, red-500 for critical. Critical dots pulse. Click handler opens popover.

3. **AnomalyDetail component**: Popover content showing severity header, grouped metrics (using AnomalyGroup from Phase 15), actual values formatted by column type, expected ranges, and z-score deviations.

4. **Status column** (`anomaly-column.tsx`): TanStack ColumnDef that reads anomaly data from table meta. At root level: looks up partner by PARTNER_NAME. At partner level: looks up batch within partner's batches array. At batch level: returns null.

5. **Table integration**: anomalyMap added to TableDrillMeta interface and useDataTable options. DataTable calls useAnomalyContext() to get partnerAnomalies map and passes it through. Status column pinned to left.

## Deviations

None -- implementation follows plan exactly.
