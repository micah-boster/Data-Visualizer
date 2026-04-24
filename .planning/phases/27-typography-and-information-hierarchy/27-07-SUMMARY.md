---
phase: 27-typography-and-information-hierarchy
plan: 07
subsystem: ui
tags: [typography, design-tokens, tokens-demo, ux-fix, uat-gap, tabular-nums, retroactive]

requires:
  - phase: 27-06
    provides: "Shipped /tokens numeric-variants in-situ demo (carried left-align layout bug fixed here)"
  - source: 27-UAT.md Gap #1
    provides: "UAT-surfaced gap: three-row numeric inset rendered left-aligned because leading-space padding in text content was collapsed by HTML"

provides:
  - "/tokens Numeric variants in-situ demo: right-aligned three-row inset block so tabular-nums visibly aligns decimal points across varying-width numbers"

affects: []

tech-stack:
  added: []
  patterns:
    - "Tabular-alignment demo recipe: text-right on the parent container + tabular-nums (baked into .text-body-numeric) + plain numeric text content (no cosmetic leading whitespace — HTML collapses it anyway)"

key-files:
  created:
    - ".planning/phases/27-typography-and-information-hierarchy/27-07-SUMMARY.md"
  modified:
    - "src/components/tokens/type-specimen.tsx"

key-decisions:
  - "Added text-right to the parent inset container (not to each child row) — one class vs three, same visual result."
  - "Dropped the cosmetic leading spaces in the text content ('  987,654.32' → '987,654.32', '    4,321.10' → '4,321.10'). HTML collapses them, so they were no-ops — removing noise, not changing behavior."
  - "Retroactive SUMMARY close-out: plan text + the single-commit fix landed together in 593a313 on 2026-04-17 as part of the Phase 27 UAT close-out flow. SUMMARY authored 2026-04-23 to formally close 27-07 (last open plan in Phase 27) through the standard execute-plan flow."

requirements-completed: []  # Plan has no requirements: field in frontmatter — UAT-gap fix, not a requirement-owning plan.

metrics:
  duration: <2 min (original fix) + retroactive close-out
  tasks: 1
  files_created: 1 (this summary)
  files_modified: 1
  commits: 1 (593a313, already landed)
  completed: "2026-04-17"  # fix landed; SUMMARY authored 2026-04-23
---

# Phase 27 Plan 07: /tokens Numeric Demo Alignment Fix Summary

**Closed UAT Gap #1 from Phase 27 verification — the three-row numeric inset on /tokens was rendering left-aligned because HTML collapses leading whitespace in text nodes, defeating the point of a tabular-nums demo. Fix: `text-right` on the parent container plus stripping the dead cosmetic leading spaces from each row.**

## Performance

- **Duration:** ~2 min (original fix, 2026-04-17); retroactive SUMMARY authored 2026-04-23 via standard execute-plan flow
- **Original fix commit:** 593a313 (2026-04-17T22:20:28-04:00) — included Plan 07 + UAT doc + side-task doc + the code fix in a single commit
- **Tasks:** 1
- **Files modified:** 1 (src/components/tokens/type-specimen.tsx)

## Accomplishments

- **Three-row numeric inset now right-aligns at the container edge** — decimal points visually line up across `1,234,567.89` / `987,654.32` / `4,321.10`, which is the point of the `tabular-nums` demonstration.
- **Dead leading-space padding removed** — the original author's `"  987,654.32"` and `"    4,321.10"` were no-ops (HTML collapses leading whitespace in text nodes); cleanup removes misleading source noise without changing rendered output relative to the fix.
- **UAT Gap #1 closes** — re-test "2. /tokens — Numeric variants in-situ demo" now reads `pass`.
- **Build remains clean** — `npm run build` verified at 2026-04-23 post-fact: Next.js 16.2.3 Turbopack compiled successfully in 3.6s; TypeScript clean in 3.3s; all 5 static pages generated.
- **Scope discipline preserved** — no other /tokens demo changes, no unrelated component touches.

## Task Commits

1. **Task 1: Right-align the numeric variants inset demo** — `593a313` (fix)
   - Combined commit with plan file + UAT doc + side-task doc (execution and authoring landed together during the UAT close-out session on 2026-04-17).

**Plan metadata (retroactive):** separate docs commit from this SUMMARY + STATE + ROADMAP update pass.

## Files Created/Modified

- `src/components/tokens/type-specimen.tsx` (modified) — added `text-right` to the parent `bg-surface-inset rounded-lg` div; dropped leading spaces from rows 2 and 3 of the numeric inset.
- `.planning/phases/27-typography-and-information-hierarchy/27-07-SUMMARY.md` (created, this file).

## Decisions Made

### Parent-level `text-right` over per-row `text-right`

The parent inset already owns the three rows via `flex flex-col`; adding `text-right` at that layer propagates to all children via normal text-align inheritance. Per-row would have been three class additions for identical visual outcome. Chose the one-class path.

### Drop leading-space padding (not preserve + correct it)

The original `"  987,654.32"` and `"    4,321.10"` text values suggested the author intended leading whitespace to shift rendered position — but HTML collapses leading whitespace in text nodes, so those padding spaces were dead code. Once `text-right` is in place, the actual alignment mechanism (tabular-nums + right-alignment) takes over. Keeping the dead padding would have misled future readers about how alignment works here. Removed.

### Retroactive SUMMARY authoring

The fix itself landed on 2026-04-17 in the same commit that introduced the plan file and UAT doc (commit 593a313) — the UAT close-out flow shipped the diagnosis, plan, and fix together. No separate SUMMARY was authored at the time because Phase 27 was already marked closed in ROADMAP.md. This SUMMARY is authored on 2026-04-23 to formally close 27-07 through the standard GSD execute-plan flow so STATE.md/ROADMAP.md reflect the 105/105 plans state and the phase's `/tokens` demos section has a properly-documented close.

## Deviations from Plan

None — plan executed exactly as written. The "Changes" block (add `text-right`, remove leading whitespace) matches the shipped diff 1:1.

## Issues Encountered

None. Trivial one-line-plus-whitespace-cleanup fix; build clean on first run.

## User Setup Required

None — no external service configuration touched.

## Next Phase Readiness

- **Phase 27 fully closed.** All seven plans (27-01 pilot + 27-02..27-05 sweeps + 27-06 enforcement + 27-07 UAT gap) have shipped SUMMARY files.
- **`/tokens` numeric-variants demo now demonstrates the intended contract** — tabular-nums + right-align producing visible decimal-point alignment across varying-width numbers. Users browsing /tokens for the first time will see the point of `text-body-numeric` immediately rather than wondering why the demo rows are flush-left.
- **No blockers** — Phase 27 is officially complete; v4.0 milestone close posture unchanged.

## Self-Check: PASSED

- `.planning/phases/27-typography-and-information-hierarchy/27-07-SUMMARY.md` exists on disk (this file)
- `.planning/phases/27-typography-and-information-hierarchy/27-07-PLAN.md` exists on disk (verified via git show)
- Commit `593a313` found in `git log --oneline --all` (verified: `fix(27-07): right-align /tokens numeric demo so decimals align`)
- `src/components/tokens/type-specimen.tsx` line 209 contains `text-right` on the inset-container div
- `src/components/tokens/type-specimen.tsx` lines 210-212 contain `1,234,567.89`, `987,654.32`, `4,321.10` without leading whitespace
- `npm run build` succeeds on the current tree (Next.js 16.2.3 Turbopack, TypeScript clean, 5 static pages generated)

---
*Phase: 27-typography-and-information-hierarchy*
*Completed: 2026-04-17 (fix), 2026-04-23 (retroactive close-out)*
