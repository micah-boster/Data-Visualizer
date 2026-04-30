# ADR 007: Dollar-weighted penetration is canonical primary; account-weighted is column-picker only

**Status:** Accepted (v4.5 Phase 41-04)
**Date:** 2026-04-27
**Supersedes:** any prior ambiguity about which weighting drives the headline
penetration metric. (Implementation lands in Plan 41-01.)
**Cross-references:** ADR 006 (`MIN_PLACED_DENOMINATOR_DOLLARS` — also
canonicalises dollars as the meaningful denominator on a related KPI surface),
`docs/AGGREGATION-CONTRACT.md`, `docs/POLARITY-AUDIT.md`

## Context

Penetration rate is "what fraction of placed accounts (or placed dollars)
entered a payment plan." Two natural weightings exist when aggregating
penetration across multiple batches into a single partner-level rate:

- **Dollar-weighted**: `Σ(rate_i × placed_dollars_i) / Σ placed_dollars_i`.
  Reflects "what fraction of the *value* placed converted." A $1M-placed
  batch with 10% penetration matters more than a $50K-placed batch with 90%
  penetration in this weighting because the dollar exposure is what the
  partnerships team optimises for.
- **Account-weighted**: `Σ(rate_i × placed_accounts_i) / Σ placed_accounts_i`.
  Reflects "what fraction of the *people* placed converted." Diagnostic for
  digital-channel performance (clicks, opens, etc. correlate with people, not
  dollars).

Both are legitimate views of the same underlying funnel. The question is
which one drives headline KPIs and matrix comparisons (the canonical primary)
vs. which one is available as a secondary diagnostic.

## Decision

**Dollar-weighted is the canonical primary metric.** It is the value shown in:

- KPI summary cards (the headline penetration number on every partner page).
- The default `Penetration ($-wt)` column in the comparison matrix.
- Any cross-partner aggregations.

**Account-weighted ships as a secondary column** available via the column
picker for digital-channel diagnostics. Labeled `Penetration (acct-wt)` so a
user reading the column header can't misinterpret the weighting.

**Code:**
- Dollar-weighted compute: `src/lib/columns/root-columns.ts` `weightedByPlaced`
  (introduced by Plan 41-01).
- ColumnDef declaration: `src/lib/columns/definitions.ts` (Plan 41-01) —
  `aggregation: 'avgWeighted', aggregationWeight: 'TOTAL_AMOUNT_PLACED'`.

## Alternatives considered

### Alternative A: Show both as parallel KPI cards

Rejected — KPI shelf density gets noisy fast (the cascade in ADR 005 already
caps the strip at 2 cards in most tiers), and the secondary metric splits
user attention. Account-weighted is diagnostic, not headline. Putting both at
the headline level forces the partnerships team to context-switch between
weightings on every glance.

### Alternative B: Account-weighted as primary

Aligns with intuition for digital-channel teams (the people who care about
SMS open rate, email open rate, etc., and who reason in account-counts). But
mismatches the dollar-recovery business value the partnerships team
optimises for — Bounce's contracts are denominated in dollar collection, not
people-percentage. The Wave-0 `MIN_PLACED_DENOMINATOR_DOLLARS` decision
(ADR 006) already canonicalises dollars as the meaningful denominator on the
KPI side; making penetration's primary weighting consistent with that choice
preserves a clean mental model across the dashboard.

### Alternative C: Per-partner choice (toggle in Setup UI)

Rejected — invites apples-and-oranges across partners (one shows
dollar-weighted, another shows account-weighted, the cross-partner matrix
becomes meaningless). Triangulation requires uniform weighting. This is the
direct contradiction of the v5.0 triangulation design and is locked out by
the CONTEXT.md "no partner overrides" rule.

### Alternative D: Geometric mean across batches

Statistically defensible for ratios but harder to explain and breaks the
mental model "this is the weighted average rate I'd see if all dollars were
in one bucket." Rejected for v4.5 — pragmatism wins over statistical purity
for a daily-driver tool.

### Alternative E: Simple (unweighted) average across batches

Rejected — gives a $50K test batch the same weight as a $5M production
batch when computing the partner-level rate. This is the bug Phase 41-01
explicitly fixes.

## Why dollar-weighted as primary

- **Aligns with Bounce's business model.** Contracts are denominated in
  dollar recovery, not account-percentage. The headline metric should match
  what the partnerships team is held accountable for.
- **Consistent with ADR 006's denominator choice.** Both decisions
  canonicalise dollars as the meaningful denominator on rate metrics, which
  preserves a clean mental model.
- **Resilient to mix-shift.** When a partner starts placing a different mix
  of batch sizes (e.g., mostly small batches one quarter, then a big bulk
  placement the next), dollar-weighting keeps the rate moving with the
  weight of money rather than the count of batches — which is what "the
  rate that matters" should track.

## Why account-weighted is preserved as secondary

- **Diagnostic for digital-channel performance.** When SMS/email open rates
  shift, the underlying mechanism is people-driven (each account = a person
  with a phone or inbox). An account-weighted penetration rate on the same
  surface enables direct comparison between funnel performance and channel
  performance.
- **Ships as a column-picker option, not a KPI card.** Lower discoverability,
  matching its lower-frequency-of-use profile.
- **Same underlying compute, different weight key.** Account-weighted uses
  `aggregationWeight: 'TOTAL_ACCOUNTS'` against the same `avgWeighted`
  aggregation pipeline. Maintenance cost is one column-def line.

## Partner overrides

NONE. Per CONTEXT lock — partner-overrides invite p-hacking and erode
triangulation. The weighting is global. v5.5+ revisits if specific partners
need tuning that doesn't compromise the cross-partner comparison surface.

## When to revisit

- If digital-channel diagnostics become a primary use case and the column-
  picker discoverability is insufficient — promote `Penetration (acct-wt)`
  to a cascade-tier card alongside `Penetration ($-wt)`.
- If the partnerships team's compensation model shifts to account-percentage
  metrics (unlikely but worth flagging).
- If new weighting axes emerge (e.g., experian-score-weighted penetration as
  a credit-quality-adjusted view) — they ship as additional column-picker
  options under the same pattern, not as KPI cards.

## References

- Implementation: Plan 41-01 (`src/lib/columns/root-columns.ts`
  `weightedByPlaced`, `definitions.ts` `avgWeighted` aggregation)
- Aggregation contract: `docs/AGGREGATION-CONTRACT.md`
- Polarity audit: `docs/POLARITY-AUDIT.md`
- Roadmap: `.planning/milestones/v4.5-ROADMAP.md` (Phase 41 — DCR-01,
  DCR-11)
- Context: `.planning/phases/41-data-correctness-audit/41-CONTEXT.md`
  § "Penetration weighting + threshold ADRs"
- Related ADRs: 006 (`MIN_PLACED_DENOMINATOR_DOLLARS` — same dollar-canonical
  pattern on the KPI surface)
