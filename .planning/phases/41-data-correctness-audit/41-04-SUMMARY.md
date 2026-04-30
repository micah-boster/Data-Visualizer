---
phase: 41-data-correctness-audit
plan: 04
subsystem: docs
tags: [adr, thresholds, computation, anomalies, trending, kpi, governance]

# Dependency graph
requires:
  - phase: 41-data-correctness-audit
    provides: "Plan 41-01 wired weightedByPlaced; Plan 41-02 wired metric-eligibility.ts. ADR 007/008 cite their implementations."
provides:
  - "Eight ADRs documenting every statistical threshold + weighting choice in src/lib/computation/"
  - "ADR README index with global no-partner-overrides convention codified"
  - "Inline `// ADR: .planning/adr/NNN-...md` comments wiring each constant to its decision record"
  - "Discrepancy flagged: trending baseline window is up-to-4 (not 3) — captured in ADR 004 with full reasoning"
affects: [41-05, v5.0, v5.5]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "ADR template: Status / Date / Supersedes / Cross-references / Context / Decision / Alternatives / Why / Partner overrides=NONE / When to revisit / References"
    - "Inline ADR comment shape: `// ADR: .planning/adr/NNN-kebab-name.md` directly above the constant or function"
    - "Global no-partner-overrides rule for all statistical thresholds (locks v4.5 against p-hacking, preserves v5.0 triangulation)"

key-files:
  created:
    - .planning/adr/001-z-threshold.md
    - .planning/adr/002-min-groups.md
    - .planning/adr/003-trending-pct.md
    - .planning/adr/004-baseline-window.md
    - .planning/adr/005-cascade-tiers.md
    - .planning/adr/006-min-placed-denom.md
    - .planning/adr/007-penetration-weighting.md
    - .planning/adr/008-young-batch-censoring.md
    - .planning/adr/README.md
  modified:
    - src/lib/computation/compute-anomalies.ts
    - src/lib/computation/compute-trending.ts
    - src/lib/computation/compute-kpis.ts
    - src/lib/computation/metric-eligibility.ts
    - src/lib/columns/root-columns.ts

key-decisions:
  - "Trending baseline window documented as 'up to 4 prior batches (min 2)' — the actual implementation, not the plan-anticipated '3 batches'. Plan 41-04 expected 3, code uses up to 4 since pre-Wave-0; ADR 004 captures the discrepancy explicitly with three rationale points (it's what shipped, 4 is more smoothing than 3, the min 2 floor is what actually constrains 'noisy on newish partners')."
  - "Trending pct threshold is named `THRESHOLD` (not `TRENDING_PCT_THRESHOLD`) — kept the existing name; ADR 003 cites `compute-trending.ts:17` directly so a reader can find it. Renaming would have been cosmetic + churn."
  - "ADR 007 names dollar-weighted as canonical primary; account-weighted ships as column-picker only with explicit labels (`Penetration ($-wt)`, `Penetration (acct-wt)`). Closes the per-partner-toggle alternative explicitly because triangulation requires uniform weighting across partners."
  - "ADR 008 names metric-age-eligibility filter (NOT per-age-bucket norms) as the chosen architecture. v5.5 candidate if filter proves too coarse."
  - "All eight ADRs explicitly state Partner overrides = NONE. README codifies this as a global convention so the rule survives even if individual ADRs are later amended."
  - "Comment shape `// ADR: .planning/adr/NNN-...md` chosen over JSDoc `@adr` tag for grep-ability. Single regex `ADR: \\.planning/adr/` finds all 8 occurrences across the codebase."

patterns-established:
  - "ADR template: 11 fixed sections (Status, Date, Supersedes, Cross-references, Context, Decision, Alternatives, Why, Partner overrides, When to revisit, References). Mandatory for any future statistical-threshold change."
  - "Discrepancy-note pattern: when implementation differs from plan anticipation, capture the actual behaviour AND the discrepancy AND the reasoning for keeping the actual (vs aligning with plan). Used in ADR 004 for the up-to-4 baseline window."
  - "Inline `// ADR: ...` reference comments — single-line, file-relative path, immediately above the constant. No JSDoc nesting, no multi-line block."
  - "Cross-ADR references via `**Cross-references:**` field in frontmatter and `Related ADRs:` in References. Establishes a cite-graph (e.g., ADRs 005/006/008 form a 'don't-pretend-to-know-what-we-don't-know' cluster)."

requirements-completed: [DCR-11]

# Metrics
duration: ~25 min (over 2 sessions; resumed after usage-limit interruption)
completed: 2026-04-27
---

# Phase 41 Plan 04: Threshold ADRs Summary

**Eight ADRs documenting every statistical threshold + weighting choice in `src/lib/computation/`, plus a README index, plus inline `// ADR: ...md` comments wiring each constant to its decision record. DCR-11 satisfied.**

## Performance

- **Duration:** ~25 min total (split across 2 sessions due to usage-limit interruption between ADRs 001-004 and ADRs 005-008 + README + inline-comments)
- **Started:** 2026-04-27 (initial session); resumed 2026-04-27
- **Completed:** 2026-04-27
- **Tasks:** 3 (ADRs 001-004 / ADRs 005-008 / README + inline-comments)
- **Files modified:** 5 (4 in src/lib/computation/, 1 in src/lib/columns/)
- **Files created:** 9 (.planning/adr/ — 8 ADRs + README)

## Accomplishments

- **All 8 statistical thresholds in `src/lib/computation/` now have ADRs.** Each captures: what / location / alternatives considered / why this value / partner-overrides=NONE / when to revisit / references.
- **Global no-partner-overrides rule codified** in the README and reinforced in every ADR. This locks v4.5 against p-hacking via per-partner threshold tuning and preserves v5.0 triangulation's apples-to-apples comparison surface.
- **Code-to-ADR backlinks via inline comments.** Eight `// ADR: .planning/adr/NNN-...md` comments wired across `compute-anomalies.ts`, `compute-trending.ts`, `compute-kpis.ts`, `metric-eligibility.ts`, `root-columns.ts` — grep-discoverable via the regex `ADR: \\.planning/adr/`.
- **Discrepancy captured.** The plan anticipated a 3-batch trending baseline window; the code uses up to 4 (with min 2). ADR 004 documents both, explains why the actual behaviour is preserved, and aligns the "Need 3+ batches for trending" UI message (which refers to total batches, not window size).

## Task Commits

1. **Task 1: ADRs 001-004 (anomaly + trending thresholds)** — `8bcfb09` (docs) — committed in prior session before usage-limit interruption.
2. **Task 2: ADRs 005-008 + README index** — `17343bb` (docs) — committed in resumed session. ADRs 005/006 (KPI cascade + denominator floor) and 007/008 (penetration weighting + young-batch censoring), plus the README with index of all 8 ADRs and the global no-overrides convention.
3. **Task 3: Inline ADR comments** — `91c524a` (docs) — single cohesive commit wiring all 8 comment locations. Comment-only diff (5 files, 9 insertions, 0 deletions). No behaviour change.

_Plan metadata commit_ (this SUMMARY + STATE/ROADMAP updates) follows below.

## Files Created/Modified

### Created (`.planning/adr/`)

- `001-z-threshold.md` (106 lines) — Z_THRESHOLD = 2 anomaly detection threshold
- `002-min-groups.md` (114 lines) — MIN_GROUPS = 2 (Wave 0 supersedes MIN_FLAGS)
- `003-trending-pct.md` (99 lines) — THRESHOLD = 0.05 (5% relative)
- `004-baseline-window.md` (111 lines) — up to 4 prior batches (min 2); discrepancy with plan documented
- `005-cascade-tiers.md` (114 lines) — KPI cascade breakpoints 3 / 6 / 12 mo
- `006-min-placed-denom.md` (124 lines) — MIN_PLACED_DENOMINATOR_DOLLARS = $100K (Wave 0)
- `007-penetration-weighting.md` (146 lines) — dollar-weighted canonical primary; no per-partner toggle
- `008-young-batch-censoring.md` (163 lines) — metric-age-eligibility filter, strict rule
- `README.md` (59 lines) — index + global no-overrides convention + adding-new-ADRs guide

All 9 files exceed their `min_lines` requirements from the plan frontmatter.

### Modified (inline `// ADR: ...md` comments only — no behaviour change)

- `src/lib/computation/compute-anomalies.ts` — comments above `Z_THRESHOLD` (line 83) and `MIN_GROUPS` (line 98)
- `src/lib/computation/compute-trending.ts` — comments above `THRESHOLD` (line 17) and `priorRows` slice (line 105)
- `src/lib/computation/compute-kpis.ts` — comments above `MIN_PLACED_DENOMINATOR_DOLLARS` (line 84) and `selectCascadeTier` (line 96)
- `src/lib/computation/metric-eligibility.ts` — `ADR:` line in JSDoc above `isMetricEligible`
- `src/lib/columns/root-columns.ts` — comment above `weightedByPlaced` helper (line 186)

## Decisions Made

- **ADR 004 documents the actual baseline window, not the plan-anticipated value.** The plan said "3 batches"; the code uses `sorted.slice(max(0, n-5), n-1)` which is up to 4. ADR 004 has a `Discrepancy note` callout near the top + an Alternative D explaining why the actual behaviour is preserved (it's what shipped; 4 is more smoothing than 3 in this tradeoff space; the `priorRows.length < 2` floor is the constraint that actually matters). Future readers see both the anticipation and the resolution without git-archeology.
- **Comment shape `// ADR: .planning/adr/NNN-...md` chosen over JSDoc `@adr` tag** — grep-ability beats convention-conformance here. A single `rg "ADR: \\.planning/adr/"` finds all 8 occurrences for audit.
- **Inline comments did NOT touch the existing JSDoc above `selectCascadeTier`, `MIN_GROUPS`, or `MIN_PLACED_DENOMINATOR_DOLLARS`** — added the `// ADR:` line on its own immediately above the existing JSDoc / constant. Preserves the existing inline rationale; the ADR backlink is additive.
- **`metric-eligibility.ts` got the ADR reference inside its existing JSDoc** (a single `* ADR: .planning/adr/008-...md` line near the top) rather than as a sibling line — the file's JSDoc already establishes the architectural-rationale frame, so the ADR slots in naturally.

## Deviations from Plan

**Total deviations:** 1 documentation-only divergence (ADR 004 captures actual behaviour instead of anticipated value).

**1. [Rule 1 — Documentation correctness] ADR 004 documents up-to-4-batch baseline window, not 3-batch**

- **Found during:** Task 1 (writing ADR 004) — read `compute-trending.ts` per the plan's instruction to verify actual constant names + values.
- **Issue:** Plan 41-04 anticipated a "3-batch baseline window." Actual implementation at `compute-trending.ts:104-107` uses `sorted.slice(max(0, n-5), n-1)` — up to 4 prior batches, with a `priorRows.length < 2` floor.
- **Fix:** ADR 004 documents the actual behaviour. A `Discrepancy note` callout near the top explains the divergence; Alternative D ("Strict 3-batch window") explicitly addresses why the plan's anticipated value was reasonable but is not what shipped; "When to revisit" includes "If the discrepancy between 'up to 4' actual behaviour and the 'Need 3+ batches' UI copy causes confusion, align the copy or the implementation."
- **Files modified:** `.planning/adr/004-baseline-window.md` (created).
- **Verification:** ADR cites exact line numbers (`:104-107`, `:86-93`, `:109-116`) so a future reader can verify the documented behaviour matches the code.
- **Committed in:** `8bcfb09` (Task 1 commit).

**Inline-comment wire-up: NO deferrals.** Plans 41-01 (`weightedByPlaced` in `root-columns.ts`) and 41-02 (`metric-eligibility.ts`) had both landed before this plan completed (`9f5e0ec` and `5650a66` respectively), so all 8 inline comments were wired in this plan — none deferred to follow-up plans.

---

**Impact on plan:** Discrepancy is documentation-only. No code change required, no follow-up plan needed. The ADR is the canonical source-of-truth for "what is this threshold" going forward; future Phase-41-05 audit reads ADRs, not the plan's anticipated values.

## Issues Encountered

- **Pre-existing `axe-core` TS error in `tests/a11y/baseline-capture.spec.ts`** surfaced during `npx tsc --noEmit` verification. Unrelated to this plan's comment-only edits — out of scope per the SCOPE BOUNDARY rule. Not auto-fixed; deferred. Logged here for traceability; does not block Plan 41-04 success criteria.

## User Setup Required

None — pure documentation + comment-only edits.

## Next Phase Readiness

- **Phase 41-05 (final audit / Phase-41 close)** can cite ADRs 001-008 directly when reviewing whether each DCR-NN requirement has a documented decision behind it. The ADRs are the durable artefact for the audit.
- **v5.0 triangulation** inherits the global no-partner-overrides rule. Any future per-partner threshold proposal must first revisit the README convention and the relevant ADR's "Partner overrides: NONE" section.
- **v5.5 DEBT** has explicit revisit triggers documented per ADR. Examples: ADR 008's "per-age-bucket norms become viable when most partners have 5+ batches per bucket"; ADR 003/004's "per-metric thresholds if metrics with very different volatility profiles enter `TRENDING_METRICS`."
- **No blockers.** Plan 41-04 is the third of five plans in Phase 41 and was always documentation-focused; no behaviour change implies no risk to subsequent plans.

## Self-Check: PASSED

Verified before writing this section:

- All 9 files exist in `.planning/adr/`: 001-z-threshold.md, 002-min-groups.md, 003-trending-pct.md, 004-baseline-window.md, 005-cascade-tiers.md, 006-min-placed-denom.md, 007-penetration-weighting.md, 008-young-batch-censoring.md, README.md.
- All 8 inline `// ADR: .planning/adr/` comments present via `Grep` over `src/`.
- Three commits exist: `8bcfb09` (ADRs 001-004), `17343bb` (ADRs 005-008 + README), `91c524a` (inline comments).

---

_Phase: 41-data-correctness-audit_
_Completed: 2026-04-27_
