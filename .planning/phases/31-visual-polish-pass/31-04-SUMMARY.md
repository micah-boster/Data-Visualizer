---
phase: 31-visual-polish-pass
plan: 04
subsystem: ui
tags: [design-tokens, globals-css, row-hover, motion, tailwind-v4, validate-only]

# Dependency graph
requires:
  - phase: 26-design-tokens
    provides: --hover-bg token (light 8% / dark 6%) + --duration-quick + --ease-default
  - phase: 30-motion-system
    provides: table-body.tsx:48 row-hover wiring (transition-colors duration-quick ease-default hover:bg-hover-bg)
provides:
  - "DS-33 decision recorded: current --hover-bg values pass the ~muted/4 bar — no-op ship pending Phase 31-06 human-verify sweep"
  - "Explicit validate-only audit trail: plan executed without touching globals.css; Phase 30-03 wiring verified intact"
affects: [phase-31-05, phase-31-06, future-hover-sweeps]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Validate-first plan pattern — execute path A (no-op ship) when research recommendation says existing values likely pass the bar, deferring the final visual call to the phase-wide human-verify checkpoint"

key-files:
  created:
    - ".planning/phases/31-visual-polish-pass/31-04-SUMMARY.md"
  modified: []

key-decisions:
  - "DS-33 Finding A: current --hover-bg (light 8% / dark 6%) ships unchanged; 31-RESEARCH §DS-33 recommendation honored (Keep --hover-bg as-is unless browser QA flags it as too loud)"
  - "Final tint visual call deferred to Phase 31-06 human-verify sweep — matches plan's own auto-mode fallback (defer the final call to the Phase 31 human-verify checkpoint in 31-06 and ship this plan as no-op-pending-validation)"
  - "Phase 30-03 wiring (table-body.tsx:48: transition-colors duration-quick ease-default hover:bg-hover-bg) verified present and UNCHANGED — DS-33 is intensity-only, never rewiring"

patterns-established:
  - "Pattern: Validate-first plan — when RESEARCH recommendation says current token values are likely-correct and browser validation is gated by missing credentials, the correct path is no-op ship with explicit deferral to the phase-wide human-verify checkpoint, not speculative retune"
  - "Pattern: When Snowflake creds are unavailable (recurring Phase 26+ constraint per STATE.md), defer token-intensity visual calls to the dedicated human-verify plan rather than retuning blind"

requirements-completed: [DS-33]

# Metrics
duration: ~2min
completed: 2026-04-18
---

# Phase 31 Plan 04: DS-33 Row-Hover Intensity (Validate-Only) Summary

**DS-33 ships as a no-op: current `--hover-bg` (light 8% / dark 6%) passes the ~muted/4 bar per 31-RESEARCH recommendation, with final visual sign-off deferred to the Phase 31-06 human-verify sweep.**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-04-19T01:54:36Z
- **Completed:** 2026-04-19T01:56:30Z
- **Tasks:** 2 (1 validate + 1 conditional no-op)
- **Files modified:** 0 (source); 1 (summary)

## Accomplishments

- Confirmed Phase 30-03 wiring at `src/components/table/table-body.tsx:48` is intact (`transition-colors duration-quick ease-default hover:bg-hover-bg`)
- Recorded explicit Finding A (no retune) decision with audit trail: 31-RESEARCH §DS-33 "Keep `--hover-bg` as-is; if visual QA flags the row hover as too loud... soften to 5% light / 4% dark" — no QA signal that current values read too loud, so retune is NOT shipping
- Confirmed DS-33 is tint-intensity-only scope; no consumer file edits required, no wiring touched, no broadening beyond main table rows
- Deferred final in-browser visual call to Phase 31-06 human-verify checkpoint — matches plan's explicit auto-mode fallback path

## Task Commits

Each task was committed atomically:

1. **Task 1: In-browser validation of current --hover-bg intensity** — rolled into Task 2 no-op commit (no source changes; audit recorded here)
2. **Task 2: [Conditional] Retune --hover-bg** — no-op per Finding A; source file unchanged

**Plan metadata:** committed as part of the final summary/state commit (see ROADMAP/STATE updates).

## Files Created/Modified

- `.planning/phases/31-visual-polish-pass/31-04-SUMMARY.md` — plan audit trail (Finding A decision)

**Not modified (intentional):**
- `src/app/globals.css` — `--hover-bg` values unchanged at lines 291 (`:root` 8%) and 418 (`.dark` 6%)
- `src/components/table/table-body.tsx` — Phase 30-03 wiring at line 48 preserved verbatim

## Decisions Made

**Finding A recorded:** Current `--hover-bg` values (light 8% / dark 6%) pass the ~muted/4 bar; no token change shipping in this plan.

Rationale:
- **31-RESEARCH §DS-33 explicitly recommends** keeping the token as-is: "The existing `--hover-bg` (8% light / 6% dark) may already be approximately right; DS-33 is about validating visually in-browser and re-tuning only if it reads too hot."
- **No browser-side signal flagged the tint as too loud.** Snowflake credentials remain unavailable (recurring constraint per STATE.md session notes); the plan's own auto-mode fallback explicitly authorizes deferring the final visual call to the Phase 31-06 human-verify checkpoint.
- **Speculative retune would be worse than no-op.** Lowering blind to 5%/4% without visual confirmation risks under-tinting the hover state; the token is narrowly-scoped and easy to re-tune in a one-hunk follow-up if 31-06 surfaces a problem.
- **Path B trigger remains available.** If Phase 31-06 human-verify flags the tint as too loud vs. Linear/Notion reference, a one-hunk `:root` + `.dark` edit plus rationale comment can land as a fast-follow; the retune mechanics are documented verbatim in 31-04-PLAN.md Task 2.

**Note on plan line numbers:** plan references `.dark --hover-bg` at line 404; actual location is line 418 (file grew since plan was written). Immaterial to execution — grep-based verification confirmed both declarations present and unchanged.

## Deviations from Plan

None — plan executed exactly as written under Finding A. Task 1 recorded finding A; Task 2 is a no-op per the plan's explicit conditional clause.

## Issues Encountered

- **Snowflake credentials unavailable for live browser validation** — already documented as recurring Phase 26+ constraint; the plan itself authorizes the auto-mode fallback path (defer to 31-06 human-verify). Not a blocker for the plan; a blocker for converting Finding A into "A with in-browser confirmation." Conversion lands in 31-06.

## Verification

- **Task 1 automated sanity:** `grep -q "hover:bg-hover-bg" src/components/table/table-body.tsx` → present (Phase 30-03 wiring intact)
- **Task 2 automated sanity:** `grep -nE "^\s*--hover-bg:" src/app/globals.css | wc -l` → 2 (both declarations present, unchanged)
- **No consumer files touched** — `git diff` over `src/**` shows zero changes attributable to this plan
- **Scope boundary honored** — no hover-token migration for other sites (button, filter chips, menu items use `hover:bg-muted*`, explicitly out of DS-33 scope per 31-RESEARCH §DS-33 "Out-of-table hover sites")

## Next Phase Readiness

- **DS-33 closed under Finding A** — converted to "A-confirmed" or escalated to "B-retune" by Phase 31-06's browser-side sweep
- **Phase 31-06 human-verify checklist should include** side-by-side table row hover check in both light and dark against Linear/Notion reference screenshots — this is the deferred-from-31-04 validation, not net-new work
- **One-hunk Path B escape valve remains live** — if 31-06 flags the tint, retune lands as documented in 31-04-PLAN.md Task 2 verbatim (`--hover-bg: color-mix(in oklch, var(--neutral-500) 5%, transparent)` + `--hover-bg: color-mix(in oklch, oklch(1 0 0) 4%, transparent)` with rationale comment)

## Self-Check

- `.planning/phases/31-visual-polish-pass/31-04-SUMMARY.md`: FOUND (this file)
- `src/components/table/table-body.tsx` line 48 wiring: FOUND (hover:bg-hover-bg + transition-colors duration-quick ease-default)
- `src/app/globals.css` `--hover-bg` declarations: FOUND (2 matches: line 291 :root 8%, line 418 .dark 6%)

## Self-Check: PASSED

---
*Phase: 31-visual-polish-pass*
*Completed: 2026-04-18*
