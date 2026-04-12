# Plan 13-01 Summary

## Result: COMPLETE

**Phase:** 13 - Conditional Formatting
**Plan:** 01 — Deviation computation, heatmap persistence, PartnerNormsContext
**Duration:** ~5 min

## What Was Built

Created the data foundation for conditional formatting:

1. **Deviation computation module** (`src/lib/formatting/deviation.ts`) — `computeDeviation()` converts a value + norm into z-score, opacity (continuous 0-0.35), direction (above/below/neutral), and percent deviation. Neutral zone within 1.5 stddev. `HEATMAP_COLUMNS` set defines the 7 eligible columns. `formatDeviationTooltip()` produces the user-specified format.

2. **Heatmap preference hook** (`src/hooks/use-heatmap-preference.ts`) — localStorage-persisted toggle (key: `bounce-heatmap-enabled`), defaults to true, SSR-safe.

3. **PartnerNormsContext** (`src/contexts/partner-norms.tsx`) — React Context providing `{ norms, heatmapEnabled, toggleHeatmap }`. Automatically disables heatmap when norms is null (root level).

4. **Updated formatting/index.ts** — Re-exports deviation utilities.

## Key Files

<key-files>
  <created>
    - src/lib/formatting/deviation.ts
    - src/hooks/use-heatmap-preference.ts
    - src/contexts/partner-norms.tsx
  </created>
  <modified>
    - src/lib/formatting/index.ts
  </modified>
</key-files>

## Deviations

None — implemented exactly per plan.

## Self-Check: PASSED

- [x] computeDeviation returns null for stddev === 0 or count < 2
- [x] computeDeviation returns opacity 0 for values within 1.5 stddev
- [x] HEATMAP_COLUMNS contains exactly 7 column keys
- [x] formatDeviationTooltip produces correct format
- [x] useHeatmapPreference reads/writes localStorage
- [x] PartnerNormsProvider provides null norms when prop is null
- [x] All files pass npx tsc --noEmit
