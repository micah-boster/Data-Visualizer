# ADR 004: Trending baseline window = up to 4 prior batches (min 2)

**Status:** Accepted (v4.5 Phase 41-04)
**Date:** 2026-04-27
**Supersedes:** n/a
**Cross-references:** ADR 003 (THRESHOLD — companion threshold)

## Context

Trending is "latest batch vs rolling-average of prior batches" (see
`computeTrending` in `compute-trending.ts`). The baseline window determines
how many prior batches feed the rolling average. A 1-batch window is just
batch-over-batch comparison (high noise); a wide window is more stable but
slower to react to genuine shifts.

> **Discrepancy note vs Plan 41-04 anticipation:** The plan anticipated a
> "3-batch baseline window." The actual implementation in
> `compute-trending.ts:104-107` uses **up to 4 prior batches** (the latest 4
> excluding the current batch). The minimum-history gate at line 86 requires
> `rows.length >= 3` total (i.e. ≥2 prior batches), and the
> `priorRows.length < 2` re-check at line 109 enforces the same minimum. The
> "3 batches" UI message refers to **total** batches needed (latest + ≥2 prior),
> not the baseline window size. ADR 004 documents the actual `up to 4`
> behaviour. ADR 003 is the unambiguous companion (5% threshold).

## Decision

**Value:** baseline = `priorRows`, where `priorRows = sorted.slice(max(0, n-5), n-1)`
— i.e., **up to 4 batches immediately preceding the latest** (and at least 2,
otherwise the function returns `insufficientHistory: true`).
**Location:** `src/lib/computation/compute-trending.ts:104-107` (slice window)
and `:86-93` + `:109-116` (minimum-history guards).
**Applies to:** the rolling average computed once per metric in
`TRENDING_METRICS` for the latest batch's direction selection.

```ts
const priorRows = sorted.slice(
  Math.max(0, sorted.length - 5),
  sorted.length - 1,
);
// rollingAvg = mean of priorRows[metric]
```

## Alternatives considered

### Alternative A: 1-batch window

Too volatile — each new batch is compared against the immediately prior one,
so trend reads like noise. Single-batch comparison is what the trending arrow
explicitly tries *not* to be (otherwise we'd just render `value - prior`).

### Alternative B: Fixed 5+ batch window

Too smoothing — slow to react to genuine shifts, and many partners don't have
5+ recent batches to baseline against. The current implementation effectively
allows up to 4, which gives smoothing benefits without locking out
newer-on-platform partners.

### Alternative C: Time-windowed (e.g., last 90 days of batches)

Rejected for v4.5 — batch cadences vary across partners (some monthly, some
quarterly), so a fixed time window biases the comparison. A monthly partner
gets ~3 batches in 90 days; a quarterly partner gets 1. Counting batches keeps
the comparison apples-to-apples within a partner.

### Alternative D: Strict 3-batch window

The plan anticipated this exact value. The actual implementation is more
forgiving (up to 4 batches). Either would be defensible. The current
implementation is preserved because:
- It is what shipped and what the partnerships team has been seeing.
- 4 is more smoothing than 3 — slight bias toward stability vs reactivity in
  this exact tradeoff space.
- The `priorRows.length < 2` floor is what actually matters for the "noisy on
  newish partners" concern.

## Why this value

- **`up to 4`** dampens single-batch noise without over-smoothing.
- **`min 2`** is the smallest window where "average" has meaning — a 1-element
  rolling average is just the prior value.
- **Consistent with KPI suppression precedent** (`computeSuppression` requires
  ≥3 prior batches at horizon for a per-horizon trend pill in the KPI cards;
  see ADR 008 for related young-batch handling). The trending direction in
  the partner table is a coarser signal so it accepts the looser ≥2-prior gate.
- **Matches "Need 3+ batches for trending" UI message** — the message means
  "≥3 total batches", which under this window means ≥2 prior batches feeding
  the rolling average.

## Partner overrides

NONE.

## When to revisit

- If partners with high batch cadence (more frequent than monthly) consistently
  get noisy trends — that's evidence the window should widen.
- If partners with low cadence (quarterly) consistently lack trends — the
  `min 2` floor is the constraint then; consider whether to fall back to
  `vs-prior` semantics for ≤2-prior partners as an explicit UI state.
- If the discrepancy between "up to 4" actual behaviour and the "3 batches"
  UI copy causes confusion, align the copy or the implementation.

## References

- Code: `src/lib/computation/compute-trending.ts:104-107` (window),
  `:86-93` + `:109-116` (gates), `:130-131` (rolling-avg compute)
- Roadmap: `.planning/milestones/v4.5-ROADMAP.md` (Phase 41 — DCR-11)
- Companion ADR: 003 (THRESHOLD)
- Related ADR: 008 (`computeSuppression` for the per-horizon ≥3-prior rule on
  KPI cards — different surface, different semantic)
