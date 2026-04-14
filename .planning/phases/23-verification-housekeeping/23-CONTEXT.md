# Phase 23: Verification & Housekeeping - Context

**Gathered:** 2026-04-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Generate formal VERIFICATION.md files for all completed but unverified phases (15-21), update REQUIREMENTS.md traceability table to reflect true project state, and fix Phase 19 SUMMARY.md frontmatter. This is a documentation/bookkeeping phase — no application code changes. The v3.0-MILESTONE-AUDIT.md stays as a historical snapshot; REQUIREMENTS.md becomes the living status document.

</domain>

<decisions>
## Implementation Decisions

### Verification evidence depth
- Each VERIFICATION.md gets a **deep walkthrough**: what was built, where the code lives, how to verify it, edge cases covered
- Manual verification instructions should follow professional SWE standards — describe expected behavior clearly, include relevant file paths and observable outcomes, but don't script every click
- Each requirement gets a **Pass / Partial / Fail** rating
- "Partial" includes notes on what's missing or limited (e.g., "Works with static cache; live Snowflake verification pending")
- Verification docs are **standalone** — no cross-references to the v3.0 audit. They verify against the original requirements

### Verification scope
- **Expanded beyond roadmap scope**: verify ALL unverified phases (15, 16, 17, 18, 19, 20, 21), not just 17/18
- Check each phase for existing VERIFICATION.md — generate only where missing or incomplete
- **Same depth for all phases** — every unverified phase gets the full deep walkthrough treatment, not a lighter pass for some
- Larger phase with 3-4 plans is acceptable since it's all documentation work with no code risk

### Requirements traceability table
- **Four status tiers**: Verified (has VERIFICATION.md evidence), Complete (code works but unverified), Partial (works with caveats), Pending (not started)
- A requirement can only be "Verified" if there's a VERIFICATION.md entry with evidence. Code-exists-and-works = "Complete", not "Verified"
- Each row includes: Requirement ID, Description, Implementing Phase(s), Status, Last Verified (date), Notes
- The **Notes column** captures blockers or context for non-Verified items: "Needs live Snowflake", "Deferred to v4", etc.
- Requirements depending on live Snowflake (not connected on Vercel yet) are marked **Partial** with an environment dependency note

### Audit gap reconciliation
- **Claude's discretion** on whether to fresh re-score every requirement or update from phase claims — pick the approach that yields the most accurate result
- The v3.0-MILESTONE-AUDIT.md is left as a **historical snapshot** — not updated
- REQUIREMENTS.md becomes the authoritative living document for requirement status going forward

### Phase 19 SUMMARY fix
- Add missing `requirements-completed` YAML frontmatter field to Phase 19 SUMMARY.md

### Claude's Discretion
- Order of operations (which phases to verify first)
- How to handle phases that already have partial verification docs
- Whether to batch verification docs into one plan or split by phase group
- Re-score approach for audit reconciliation (fresh evaluation vs. trust phase claims)

</decisions>

<specifics>
## Specific Ideas

- Professional SWE standard for verification — think what a senior engineer would write in a design review or QA sign-off
- The traceability table should make it immediately obvious what's done, what's close, and what's blocked
- Notes column prevents someone from wondering "why is this still Partial?" — the answer is right there

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 23-verification-housekeeping*
*Context gathered: 2026-04-14*
