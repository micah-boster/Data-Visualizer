# Phase 24: Code Review & Refactoring - Context

**Gathered:** 2026-04-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Make the codebase production-grade: clean architecture, strict types, no dead code, and a comprehensive known-issues document. This is a quality gate — no new features, no behavior changes. All features (phases 15-22) and verification (phase 23) must be complete before this phase runs.

</domain>

<decisions>
## Implementation Decisions

### Refactoring depth
- Claude's discretion on overall aggressiveness — assess what's needed, stay conservative where things already work
- Only split components that are egregiously doing too many things (data fetching + computation + rendering in one blob) — don't over-engineer working code
- Extract shared utilities when the same pattern repeats 3+ times (DRY it up)
- Audit the entire codebase evenly — no priority area; Claude identifies severity and addresses accordingly
- Keep current file/folder structure unless restructuring is clearly warranted

### Known issues document (docs/KNOWN-ISSUES.md)
- Comprehensive scope: bugs, tech debt, missing features, edge cases, future improvements — a complete picture of where the app stands
- Each item includes a suggested fix/approach (one-liner)
- Organization structure is Claude's discretion (by severity, by area, or hybrid — whatever fits the findings best)
- Keep it neutral — this is a snapshot of the codebase, not a roadmap input doc

### Type safety strictness
- `any` type removal: Claude's discretion — type it if it's straightforward, leave pragmatic exceptions at genuine system boundaries (Snowflake, AI SDK)
- TypeScript compiler flags: Claude evaluates current config and recommends/enables stricter flags based on effort-to-benefit ratio
- Zod runtime validation: Claude evaluates current coverage at external data boundaries and fills gaps where it matters (Phase 22 already added permissive schemas)
- Null/undefined handling: **Standardize across the codebase** — pick a convention (prefer `??` over `||`, explicit null checks) and apply consistently

### Dead code policy
- Delete unused code outright — git history preserves everything
- Commented-out code: Claude judges whether the comment has value (e.g., a TODO explaining why) or is just noise — delete noise
- Unused package.json dependencies: Claude checks what's unused and removes if clearly safe
- Unused CSS/Tailwind: Claude assesses whether meaningful bloat exists (Tailwind purges at build, so this may be a non-issue)

### Claude's Discretion
- Overall refactoring depth and file structure changes
- `any` removal aggressiveness (pragmatic exceptions allowed)
- TypeScript compiler flag changes
- Zod schema coverage decisions
- Known issues document organization structure
- Dependency pruning safety calls
- CSS cleanup necessity

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. The guiding principle is "production-grade readability" without over-engineering what already works.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 24-code-review-refactoring*
*Context gathered: 2026-04-14*
