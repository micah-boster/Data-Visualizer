---
status: resolved
phase: 27-typography-and-information-hierarchy
source: [27-01-SUMMARY.md, 27-02-SUMMARY.md, 27-03-SUMMARY.md, 27-04-SUMMARY.md, 27-05-SUMMARY.md, 27-06-SUMMARY.md]
started: 2026-04-17T22:48:16Z
updated: 2026-04-23T00:00:00Z
---

## Current Test

[All tests complete.]

## Tests

### 1. /tokens — SectionHeader live demo
expected: Visit /tokens. You see a SectionHeader demo section with 3 examples — title-only, title+eyebrow+description, title+eyebrow+description+actions — each in a raised card. Titles are heading-tier prominent; eyebrows are small uppercased overline; descriptions are smaller muted body.
result: pass

### 2. /tokens — Numeric variants in-situ demo
expected: On /tokens, a demo shows (a) a KPI-style card with uppercase overline label, a large display-numeric value, and a small colored delta, and (b) a three-row block of right-aligned numbers like 1,234,567.89 / 987,654.32 / 4,321.10 that visibly line up at the decimal point (tabular alignment, JetBrains Mono).
result: pass
resolved_by: 27-07 (commit 593a313) — text-right applied to parent inset container, cosmetic leading spaces dropped from rows 2/3

### 3. KPI summary cards — tabular alignment + state colors
expected: On the main page, the KPI cards at the top show large numeric values in JetBrains Mono with tabular (column-aligned) digits. Each card's trend delta (e.g. ▲ 4.2%) is green for positive and red for negative using the success/error token colors — and those greens/reds match the greens/reds used elsewhere (table trend arrows).
result: pass

### 4. Chart axes — mono tabular digits
expected: On a collection curve chart (or trajectory chart), the X-axis month numbers and Y-axis percentage/dollar values render in JetBrains Mono with tabular-nums — digits visibly line up vertically across ticks, no wobble between e.g. 10 / 20 / 30.
result: pass

### 5. Chart tooltip — prominent name + mono values
expected: Hover a chart line. Tooltip shows the series display name slightly prominent (title-tier, weight 500), with numeric values (e.g. recovery rate %) in mono + tabular. The old shadcn weight/font-mono/tabular-nums stacking is gone — just clean tiered text.
result: pass

### 6. Data table trend indicators — color tokens match KPI cards
expected: In the main data table, the trend arrow column shows ↑ in green and ↓ in red. The exact green/red hues are identical to the KPI card trend-delta colors (both now driven by text-success-fg / text-error-fg tokens). No off-greens or off-reds.
result: pass

### 7. Filter popover — heading title, consistent chips, mono count badge
expected: Open a filter popover from the toolbar. The popover title is heading-tier prominent. Active filter chips inside and in the toolbar row below share the same small caption-tier size (no font-weight emphasis on values). If there are active filters, the toolbar trigger shows a small circular count badge with the digit in JetBrains Mono tabular.
result: pass
note: "Surfaced a pre-existing (out-of-Phase-27) tanstack-table error: `[Table] Column with id 'ACCOUNT_TYPE' does not exist.` on CrossPartnerDataTable when ACCOUNT_TYPE filter state persists into cross-partner view. Not a typography regression; spawned as a separate side-task."

### 8. Column picker sheet — heading title, overline groups
expected: Open the column picker (Columns button in toolbar). Sheet title is heading-tier prominent. Each column group name appears as a small uppercase overline label (text-label tier, weight 500, letter-spaced); the count next to it is plain caption-tier muted text.
result: pass

### 9. Sidebar pill counts — mono digits at 12px
expected: In the left sidebar, the small count pills next to Partners and Saved Views sections render their digits in JetBrains Mono at ~12px with tabular alignment. Digits are slightly bigger than before (was ~10px) but cleaner — no weight paired.
result: pass

### 10. Empty state — proper heading + body, not fine-print
expected: Trigger an empty state (e.g. apply filters that return zero rows, or open views sidebar with no saved views). The empty-state headline reads as a proper ~18px heading (text-heading), not small muted fine-print; the description sits below in normal body size. Feels like a destination, not an afterthought.
result: pass-by-code-inspection
note: |
  Live verification blocked by the out-of-Phase-27 ACCOUNT_TYPE filter bug
  (applying a filter that would yield zero rows trips the tanstack error first).
  ViewsSidebar exists in the codebase but isn't wired to any trigger in the app.
  Source inspection of src/components/empty-state.tsx confirms the implementation
  matches the spec exactly:
    <p className="text-heading text-foreground">No data matches your filters</p>
    <p className="text-body text-muted-foreground">Try adjusting your filters or refreshing the data</p>
  Flagged: re-verify live after the ACCOUNT_TYPE filter side-task ships.

## Summary

total: 10
passed: 10 (1 by code inspection — Test 10; Test 2 resolved by 27-07)
issues: 0
pending: 0
skipped: 0
deferred: 1 (Test 10 — live re-verification pending ACCOUNT_TYPE filter fix)

## Gaps

### Gap #1: /tokens numeric-variants demo — rows left-aligned, decimals don't align
status: resolved
resolved_by: 27-07 (commit 593a313, 2026-04-17)
source_test: 2
surface: /tokens — Numeric variants (in-situ) section, three-row inset block
file: src/components/tokens/type-specimen.tsx:209-213
diagnosis: |
  The three demo rows attempt to pad with leading spaces in the text content:
    <div className="text-body-numeric">1,234,567.89</div>
    <div className="text-body-numeric">  987,654.32</div>
    <div className="text-body-numeric">    4,321.10</div>
  HTML collapses leading whitespace in text nodes, so all three rows render
  left-aligned at the container edge. tabular-nums (baked into text-body-numeric)
  keeps every digit the same width, but alignment of the decimal points requires
  the right edges of the rows to line up — either via text-right on each row
  or on the parent, or via a fixed column layout.
fix: |
  Add 'text-right' to each row (or to the parent div). Remove the cosmetic
  leading spaces from the text content — they do nothing.
    <div className="flex flex-col gap-stack p-card-padding bg-surface-inset rounded-lg text-right">
      <div className="text-body-numeric">1,234,567.89</div>
      <div className="text-body-numeric">987,654.32</div>
      <div className="text-body-numeric">4,321.10</div>
    </div>
severity: minor-visual (demo page only, no production surface impact)

### Deferred: Test 10 live re-verification
reason: |
  The heading-tier EmptyState is only reachable by filtering to zero rows, which
  currently triggers an out-of-Phase-27 tanstack-table bug ("Column with id
  'ACCOUNT_TYPE' does not exist"). A Test-7-linked side-task covers the filter
  bug. Once that fix ships, re-trigger the zero-rows empty state and confirm the
  headline is heading-tier (~18px) rather than the old text-sm font-medium.
blocked_on: side-task "Fix ACCOUNT_TYPE filter leak in cross-partner view"
