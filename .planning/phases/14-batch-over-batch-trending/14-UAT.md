---
status: complete
phase: 14-batch-over-batch-trending
source: 14-01-SUMMARY.md, 14-02-SUMMARY.md
started: 2026-04-12T10:30:00Z
updated: 2026-04-12T11:15:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Trend arrows on partner drill-down
expected: When you drill into a partner with 5+ batches (e.g. Advance Financial), metric columns show colored trend arrows (↑/↓/—) to the right of the value. Green ↑ means improving, gray — means flat (within ±5%).
result: pass

### 2. Tooltip shows baseline context
expected: Hovering over a trend arrow shows a tooltip like "Up 5.6% vs 4-batch avg ($249,581.71)" — showing the delta percentage and the rolling average baseline value.
result: pass

### 3. Context-aware coloring
expected: Arrow colors reflect whether the direction is good or bad for that metric. For revenue/collection metrics, up = green. For cost metrics, up = red. Flat = gray muted text.
result: pass

### 4. Curated metric subset
expected: Only a curated set of key metrics show trend arrows (e.g. Total Collected, Collected M6, Collected M12, Penetration Rate) — not every column in the table.
result: pass

### 5. Insufficient data handling
expected: Navigate to a partner with fewer than 3 batches. Those rows should show a gray dash (—) instead of an arrow, with a tooltip explaining "Need 3+ batches for trending."
result: pass

### 6. Low-confidence visual cue
expected: Partners with 3-4 total batches (baseline of only 2-3 batches instead of full 4) should show a faded/lower-opacity trend arrow to signal lower confidence.
result: pass

### 7. No trends at top-level or account drill-down
expected: The "All Batches" top-level table and any account-level drill-down should NOT show trend arrows — they only appear at the partner batch level.
result: pass

### 8. Algorithm documentation exists
expected: A file at docs/TRENDING-ALGORITHM.md documents the trending algorithm (rolling 4-batch window, ±5% flat threshold, relative change calculation, minimum batch requirements).
result: pass

## Summary

total: 8
passed: 8
issues: 0
pending: 0
skipped: 0

## Gaps

## Deferred Ideas

- Configurable trend comparator — let users switch between last batch, rolling average, curve projection, etc. (suggested during UAT, belongs in future phase)
