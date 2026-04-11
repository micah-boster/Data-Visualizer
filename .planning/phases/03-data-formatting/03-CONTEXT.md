# Phase 3: Data Formatting - Context

**Gathered:** 2026-04-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Apply human-readable formatting to every numeric, currency, percentage, date, and count column in the table. This includes number formatting, alignment, null/zero visual treatment, and conditional formatting cues for outliers and negatives. Builds on the column type system from Phase 2.

</domain>

<decisions>
## Implementation Decisions

### Number precision & rounding
- **Percentages: 1 decimal place default (12.3%)** — configurable via a settings control (user can change precision)
- **Currency: always show cents ($1,234.56)** — no abbreviation, no truncation
- **Counts: full number with commas (1,234,567)** — no abbreviation
- **Very small values: show minimum significant digit** — display "<0.1%" instead of rounding to "0.0%". Preserves the signal that a non-zero value exists.
- **All numeric columns right-aligned**

### Date & time formatting
- **Dates: short readable format (Jan 15, 2024)** — no ambiguous numeric formats
- **Absolute dates only** — no relative time ("3 months ago")
- **Timestamps: show date only in cell, full timestamp in tooltip** — keeps cells clean, time available on hover
- Timezone: not relevant for this dataset (batch dates are date-only or UTC)

### Null & zero treatment
- **Nulls: em dash (—)** — decided in Phase 1, carried forward
- **Zeros: displayed normally but visually dimmed** — lighter text color to de-emphasize while keeping them visible
- **Null and zero styling are distinct** — em dash for null in muted style, "0" / "$0.00" / "0.0%" for zero in a different dimmed style. Users can tell at a glance: no data vs zero data.
- **Aggregates exclude nulls** — average of [10, null, 20] = 15, not 10. Count only counts non-null values.

### Conditional formatting cues
- **Negative numbers: red text** — instant visual signal for money going the wrong direction
- **Outlier emphasis: subtle background tint** — light red/green tint for values beyond fixed thresholds (e.g., collection rate <5% = red tint, >50% = green tint)
- **Thresholds: fixed per column type, hardcoded** — not statistical, not user-configurable in v1. Predictable and explainable.
- **Tooltip explanation on tinted cells** — hovering a conditionally-formatted cell shows why: "Collection rate below 5% threshold." Satisfies the explainability principle.

### Claude's Discretion
- Exact threshold values per column type (choose reasonable defaults for collection rates, penetration rates, payment amounts, etc.)
- Exact dimmed color values for zeros vs null styling (within dark/light mode themes)
- Exact red/green tint values for outlier backgrounds
- How to integrate the precision settings control (could be a popover from the table toolbar, or a settings panel)
- Whether to add the settings control in this phase or defer to Phase 5 (Column Management)

</decisions>

<specifics>
## Specific Ideas

- The distinction between null and zero is important for this dataset — null means "not measured" or "not applicable", zero means "measured and the result was zero." The visual treatment should make this immediately obvious.
- Threshold tooltips are a first expression of the explainability principle from PROJECT.md — every formatting decision should be traceable.
- The precision settings control is a seed of the broader "settings" concept. Keep it lightweight for now.

</specifics>

<deferred>
## Deferred Ideas

- User-configurable outlier thresholds — future phase (likely v2 Intelligence layer)
- Statistical outlier detection (mean ± 2σ) — v2 anomaly detection feature
- Abbreviated large values ($1.2M) — decided against for v1, could revisit for dashboard widgets

</deferred>

---

*Phase: 03-data-formatting*
*Context gathered: 2026-04-10*
