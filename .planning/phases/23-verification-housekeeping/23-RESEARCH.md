# Phase 23: Verification & Housekeeping — Research

## What This Phase Does

Documentation-only phase: generate VERIFICATION.md files for unverified phases, update REQUIREMENTS.md traceability, fix Phase 19 SUMMARY frontmatter. No application code changes.

## Current State of Verification Artifacts

### Phases WITH VERIFICATION.md (already verified)
| Phase | File | Status |
|-------|------|--------|
| 15 | 15-VERIFICATION.md | PASSED |
| 16 | 16-VERIFICATION.md | PASSED |
| 19 | 19-VERIFICATION.md | PASSED |
| 20 | 20-VERIFICATION.md | PASSED |
| 21 | 21-VERIFICATION.md | PASSED |
| 22 | 22-VERIFICATION.md | PASSED |

### Phases MISSING VERIFICATION.md
| Phase | Name | Requirements | Notes |
|-------|------|-------------|-------|
| 17 | NLQ Infrastructure | NLQ-01, NLQ-02, NLQ-03, NLQ-04, NLQ-05 | Has SUMMARY with `requirements-completed` frontmatter |
| 18 | NLQ UI | NLQ-06, NLQ-07, NLQ-08, NLQ-09, NLQ-10 | Has SUMMARY with `requirements-completed` frontmatter |

**Key finding**: CONTEXT.md says "verify ALL unverified phases (15-21)" but phases 15, 16, 19, 20, 21, 22 already have verification files. Only **Phase 17 and Phase 18** actually need new VERIFICATION.md files.

## Verification Format (from existing files)

All existing VERIFICATION.md files follow this pattern:
```yaml
---
phase: {phase-slug}
status: passed
verified: {date}
verifier: orchestrator-inline
---
```

Followed by:
1. **Phase Goal** — restate from roadmap
2. **Success Criteria Verification** — table with #, Criterion, Status, Evidence
3. **Requirement Coverage** — table with Req ID, Plan, Status, Evidence
4. **Context Compliance** — table of CONTEXT.md decisions honored
5. **Build Verification** — tsc + next build results
6. **Artifacts Created** — table of files and purposes

## REQUIREMENTS.md Traceability Table — Current vs. Target

### Current format (3 columns)
```
| Requirement | Phase | Status |
```
Statuses used: Satisfied, Complete, Pending

### Target format (from CONTEXT.md decisions — 6 columns)
```
| Requirement | Description | Phase(s) | Status | Last Verified | Notes |
```
Target statuses: Verified, Complete, Partial, Pending

### Status mapping needed
| Requirement | Current Status | Target Status | Reason |
|-------------|---------------|---------------|--------|
| AD-01 thru AD-06 | Satisfied | Verified | Phase 15 has VERIFICATION.md |
| AD-08, AD-09, AD-10 | Satisfied | Verified | Phase 16 has VERIFICATION.md |
| AD-07 | Pending | Complete or Verified | Phase 21 has VERIFICATION.md — check if AD-07 covered |
| NLQ-01, NLQ-02, NLQ-05 | Pending | Verified (after Phase 17 VERIFICATION.md created) | Phase 23 scope |
| NLQ-03, NLQ-04 | Pending | Verified | Phase 21 VERIFICATION.md exists — check coverage |
| NLQ-06, NLQ-07, NLQ-08, NLQ-10 | Pending | Verified (after Phase 18 VERIFICATION.md created) | Phase 23 scope |
| NLQ-09 | Pending | Verified | Phase 21 VERIFICATION.md exists — check coverage |
| XPC-01 thru XPC-04 | Satisfied | Verified | Phase 19 has VERIFICATION.md |
| XPC-05 thru XPC-08 | Complete | Verified | Phase 20 has VERIFICATION.md |

### Coverage summary note
The summary block at bottom of REQUIREMENTS.md is outdated — says "Pending (not started): 4/28 (XPC-05-08 → Phase 20)" but Phase 20 is complete with VERIFICATION.md. Needs full refresh.

## Phase 19 SUMMARY.md Fix

Current state: starts with `# Plan 19-01 Summary: Cross-Partner Computation` — NO YAML frontmatter.

Other summaries (17, 18, 20) have:
```yaml
---
phase: {slug}
plan: 01
requirements-completed: [REQ-01, REQ-02, ...]
---
```

Fix: add frontmatter with `requirements-completed: [XPC-01, XPC-02, XPC-03, XPC-04]`.

## Implementation Approach

### Plan structure recommendation
One plan is sufficient (per roadmap). Tasks:

1. **Generate Phase 17 VERIFICATION.md** — deep walkthrough of NLQ infrastructure code, verify NLQ-01 thru NLQ-05
2. **Generate Phase 18 VERIFICATION.md** — deep walkthrough of NLQ UI code, verify NLQ-06 thru NLQ-10
3. **Fix Phase 19 SUMMARY.md** — add YAML frontmatter
4. **Update REQUIREMENTS.md traceability table** — expand to 6-column format, re-score all 28 requirements, update coverage summary

### What the executor needs to do
- Read actual source code for Phase 17/18 to write accurate verification evidence
- Check Phase 21 VERIFICATION.md to see which NLQ/AD requirements it already covers
- Run `npx tsc --noEmit` and `npx next build` for build verification evidence
- Cross-reference every requirement against existing VERIFICATION.md files for accurate status

### Risk: Snowflake-dependent requirements
NLQ requirements that depend on live Snowflake (not connected on Vercel) should be marked **Partial** with note "Works with static cache; live Snowflake verification pending" per CONTEXT.md decisions.

## RESEARCH COMPLETE
