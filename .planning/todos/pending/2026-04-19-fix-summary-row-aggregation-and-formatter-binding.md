---
created: 2026-04-19T02:17:34.750Z
title: Fix summary row aggregation and formatter binding
area: ui
files:
  - src/components/table/table-footer.tsx
  - src/lib/table/aggregations.ts
  - src/lib/columns/root-columns.ts
  - src/lib/columns/account-config.ts
---

## Problem

Summary row at the bottom of partner tables (observed on Affirm partner page) applies a blanket `sum` to every numeric column, ignoring column semantics. One underlying bug, five visible symptoms:

1. **Lender ID** — identifier column shows a numerical sum. Identifiers should never aggregate.
2. **Batch age in months** — non-additive metric is being summed, producing a nonsensical number.
3. **Total accounts** — renders as a huge dollar amount. Count column is getting a currency formatter at footer time.
4. **Total placed** — renders as a tiny, wrong number. Unit or formatter mismatch.
5. **Avg place** — sums to "not a number". Averages cannot be summed — needs weighted average.

Root cause (hypothesis, needs confirmation): the summary row has no per-column aggregation strategy declared on the column definition, so the footer either applies a default `sum` blindly or re-derives formatting at footer time instead of reusing the column's own formatter. Likely lives in `src/components/table/table-footer.tsx` + `src/lib/table/aggregations.ts`, with column definitions in `src/lib/columns/`.

## Solution

Two coupled changes:

1. **Per-column aggregation strategy.** Extend the column definition so each column declares one of: `sum` | `avgWeighted` (with a weight column) | `none` | `range` | `count`. Identifiers and non-additive dimensions get `none`. Averages and rates get `avgWeighted`. Currency totals and counts get `sum`. Ages get `none` or `range`.

2. **Footer reuses the column's formatter.** The footer row must render each aggregated value through the same formatter the column uses for body cells — do not guess or re-derive at footer time. This eliminates the "total accounts rendered as currency" class of bug.

Verification: walk through every column in root-columns.ts and account-config.ts and assign a strategy. Spot-check the Affirm partner table footer after the fix — every one of the five symptoms above should be cleanly gone.

## Context

Captured during v4.5 "Hardening" milestone planning as a seed example of the class of minor bugs systematic QA will surface. Representative case for:

- **Phase 39 (Security & Data Correctness Review)** — a real data-correctness bug to use as a test case for the review methodology
- **Phase 41 (Behavioral QA)** — first concrete entry in `docs/QA-SCRIPT.md` when that living checklist is created

**Do NOT fix now.** Wait until phase 37 ships and v4.5 kicks off. Fixing inline would bloat phase 37's scope and skip the systematic audit this bug was meant to seed.
