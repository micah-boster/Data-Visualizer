---
phase: 42a-security-review-oauth-independent
plan: 02
subsystem: security
tags: [threat-model, prompt-injection, ingestion, claude, snowflake, vercel, scorecard]

# Dependency graph
requires:
  - phase: 42a-security-review-oauth-independent
    provides: SEC-01 / SEC-03 / SEC-06 audits (companion plan 42a-01 — separate per-requirement docs in same directory; SEC-04 references their patterns: env-var flow, ALLOWED_COLUMNS allow-list, npm audit baseline)
provides:
  - SEC-04 forward threat model (load-bearing baseline for v5.0 Phase 45)
  - 13 LOCK mitigations seeding the Phase 45 ADR backlog
  - Per-surface risk taxonomy spanning upload / parse / Claude extract / stored PII / auth-rate-limit
  - Living-document protocol — Phase 45+ extends in place rather than forking
affects: [phase-45-scorecard-ingestion, phase-46-contract-targets, phase-47-triangulation, phase-48-reconciliation, phase-49-dynamic-curves, phase-42b-deep-auth-audit]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Per-surface threat-model structure (upload → parse → extract → store → auth) — explicitly NOT STRIDE / attack-tree"
    - "Plain-English severity scale (high/medium/low) — no CVSS overhead per CONTEXT lock"
    - "LOCK markers on mitigations that are clearly the right architectural call — Phase 45 ADRs each LOCK item"
    - "Living-document protocol — strike-through over delete; dated update entries; ADRs are formal record, doc is running narrative"

key-files:
  created:
    - .planning/phases/42a-security-review-oauth-independent/SEC-04-THREAT-MODEL.md
  modified: []

key-decisions:
  - "Doc shape locked to per-surface (upload → parse → Claude extract → store + lite auth), NOT STRIDE / attack-tree — per 42a-CONTEXT.md decision"
  - "13 LOCK mitigations across 5 surfaces — sized to seed Phase 45 ADR backlog without over-prescribing (Phase 45 must keep architectural authority)"
  - "Severity scale = plain English (high = stranger-exploitable today, medium = bad-partner-abusable, low = theoretical) — no CVSS overhead"
  - "Surface 5 (auth + rate-limit) intentionally lite — deep audit lives in 42b (OAuth-gated); just enough here to feed Phase 45 planning so Phase 45 doesn't have to redesign auth"
  - "Cross-references actual codebase paths (snowflake/connection.ts, /api/data, /api/query, system-prompt.ts, columns/config.ts) — Phase 45 builds ON existing primitives, doesn't reinvent. 21 such references in the doc."
  - "Skunkworks rule honored — all findings in-repo (no Notion / Linear / external tickets); deferred items captured in 'What this doc deliberately does NOT cover' + 'Living-document update protocol' sections"
  - "ADR home will be docs/adr/ (existing project convention via docs/adr/0001-list-view-hierarchy.md and docs/adr/0002-revenue-model-scoping.md), NOT .planning/adr/ — corrected the boilerplate path inside the doc to match the project's actual convention"

patterns-established:
  - "Forward threat model = baseline doc, not phase-bound deliverable: future phase planners can extend rather than fork"
  - "Anchor every recommended mitigation to an existing codebase primitive where one exists (executeWithReliability, X-Request-Id, ALLOWED_COLUMNS, sanitized error responses, Zod validation) — avoids reinvention drift"
  - "Surface 3 (Claude extraction) explicitly distinguishes user-trust posture: /api/query trusts the Bounce employee user; ingestion does NOT trust the partner-document content. Same Claude primitives, different threat model."

requirements-completed: [SEC-04]

# Metrics
duration: 22min
completed: 2026-04-30
---

# Phase 42a Plan 02: SEC-04 Forward Threat Model Summary

**237-line per-surface forward threat model for v5.0 Phase 45 ingestion — 5 surfaces, 13 LOCK mitigations, anchored to existing codebase primitives (snowflake/connection.ts, /api/data, /api/query, system-prompt.ts).**

## Performance

- **Duration:** ~22 min
- **Started:** 2026-04-30T18:05:00Z
- **Completed:** 2026-04-30T18:27:36Z
- **Tasks:** 1 of 1
- **Files modified:** 1 (created SEC-04-THREAT-MODEL.md)

## Accomplishments

- **SEC-04-THREAT-MODEL.md (237 lines)** authored at `.planning/phases/42a-security-review-oauth-independent/SEC-04-THREAT-MODEL.md` — the load-bearing v5.0 Phase 45 prerequisite per `v4.5-REQUIREMENTS.md` line 71 ("must NOT slip past Phase 45 start regardless of OAuth timing").
- **Five ingestion surfaces** covered in the locked per-surface shape (NOT STRIDE):
  1. File upload + validation (MIME / extension / size-bomb / ZIP-bomb / polyglot / path-traversal)
  2. Parsing sandbox (parser CVEs / ReDoS / memory blowup / crash leak / no-isolation)
  3. Claude extraction (prompt injection / output schema deviation / cost runaway / PII-to-Anthropic / cache poisoning / system-prompt leak)
  4. Stored scorecard PII (cross-partner leakage / borrower PII storage / provenance loss / no retention / role over-privilege)
  5. Auth + rate-limit (lite — deep audit deferred to 42b)
- **13 LOCK mitigations** enumerated in the closing summary section, sized to seed Phase 45's ADR backlog: M1.1, M1.2, M1.3 (upload); M2.1, M2.2 (parsing); M3.1, M3.2, M3.3 (extraction); M4.1, M4.2 (storage); M5.1, M5.2, M5.3 (auth-rate-limit).
- **21 cross-references** to actual codebase paths (verified via grep: `snowflake/connection|/api/data|/api/query|system-prompt`) — the threat model extends from the existing surface, doesn't invent in a vacuum.
- **Living-document protocol** explicit at the top (Status section: "Living document. Established in Phase 42a as the baseline. v5.0 Phase 45+ planning extends this as architecture decisions firm up.") and bottom (full Living-document update protocol section + "Last updated:" date stamp).
- **Skunkworks rule honored** — all deferrals in-repo (companion 42a-01 docs cited, 42b coordination noted, future-phase addenda flagged in "What this doc deliberately does NOT cover"). Zero external tickets filed.

## Task Commits

Single task, single commit:

1. **Task 1: Author SEC-04-THREAT-MODEL.md** — `ed95ff8` (docs)

**No final-metadata commit yet** — final commit captures SUMMARY.md + STATE.md + ROADMAP.md after this Summary lands.

## Files Created/Modified

- `.planning/phases/42a-security-review-oauth-independent/SEC-04-THREAT-MODEL.md` (created, 237 lines) — the deliverable.

## Decisions Made

- **Doc shape: per-surface, NOT STRIDE.** Followed the locked CONTEXT decision; surfaces are upload → parse → extract → store → auth-rate-limit. Each surface has the same shape: Threat surface → Risks → Recommended mitigations → What Phase 45 must decide. Rationale: a Phase 45 planner agent reading the doc cold can navigate by ingestion stage (matching the planner's mental model) instead of by attacker class (an analytical lens that doesn't map to architectural choices).
- **Severity scale: plain English** ("high = stranger-exploitable today", "medium = bad-partner-abusable", "low = theoretical"). Per CONTEXT lock — no CVSS scoring overhead. Each risk gets one severity word inline so a reader can scan severity without reading the body.
- **LOCK count = 13.** Calibrated to seed Phase 45's ADR backlog without over-prescribing. Mitigations marked LOCK are calls that are clearly right (magic-byte validation, content-addressed storage, schema-locked output via generateObject + Zod, separate writer role, etc.). Mitigations not marked LOCK (M1.4/M1.5, M2.3/M2.4/M2.5, M3.4-M3.8, M4.3-M4.5) leave Phase 45 architectural authority intact for the closer-call decisions.
- **Surface 5 lite, not skipped.** CONTEXT decision was "lite coverage — deep auth audit lives in 42b". Resolved by: documenting current state explicitly (no app-level auth, OAuth not configured, deployment-level access only), enumerating Phase-45-specific risks (upload endpoint without auth = critical; rate-limit absent = high; no audit log = medium), and giving 3 LOCK mitigations (M5.1/M5.2/M5.3) Phase 45 can implement with whatever auth primitive is available at start time and revise once OAuth ships.
- **Cross-reference to existing primitives, not reinvention.** Every recommended mitigation that has an analog in the existing codebase cites the analog explicitly with file path + line range: `executeWithReliability` (reliability.ts) for retry semantics, `X-Request-Id` correlation pattern (data/route.ts:18, 25, 82), `ALLOWED_COLUMNS` allow-list (columns/config.ts) for the column-allow-list discipline, sanitized error responses (data/route.ts:107-111) for the error-shape contract, Zod request-body validation (query/route.ts:19-49) for the validation pattern. Reduces Phase 45's design burden — most of the security primitives already exist; Phase 45 just extends.
- **ADR home corrected mid-write.** Plan boilerplate said `.planning/adr/`; the project's actual ADR convention lives at `docs/adr/` (per `docs/adr/0001-list-view-hierarchy.md` and `docs/adr/0002-revenue-model-scoping.md` from Phase 44). Doc cites `docs/adr/` consistently in the Status section, the LOCK summary, and the Living-document update protocol. (Plan 42a-02 itself still says `.planning/adr/` in two places — captured here so a future reader doesn't trip on the discrepancy. The deliverable doc is canonical.)
- **Bounce eng audience register held throughout.** Concrete > generic. Avoided "attackers may attempt to..." filler. Each risk says what concretely could happen and to whom (e.g., "a 5 GB 'PDF' exhausts Function memory or fills the local Function disk before the parser even runs"). Mid-formality — explains Bounce-specific paths but assumes Next.js / Vercel / Anthropic SDK familiarity.

## Deviations from Plan

None — plan executed exactly as written. The plan's `<action>` block specified the structure section-by-section with concrete risks and mitigation language; that structure was honored verbatim. The only addition not literally in the plan was the **Phase 45 ingestion flow orientation block** between "How to read this doc" and "Surface 1" — a 5-line numbered list that re-states the pipeline so the rest of the doc has a shared reference. Judged in-scope (the plan's `<context>` `<interfaces>` block contains the same pipeline description; surfacing it inside the doc makes it readable cold by Phase 45's planner without round-tripping back to the plan).

The ADR home path correction (`.planning/adr/` → `docs/adr/`) is not a deviation from the plan's intent — the plan said "ADRs in `.planning/adr/`" but the project's lived convention is `docs/adr/`. The deliverable doc cites the actual lived convention; logged here in Decisions for transparency.

## Issues Encountered

None.

## User Setup Required

None — pure documentation deliverable. No env vars, no external services, no dashboard configuration.

## Next Phase Readiness

- **Phase 45 (Scorecard Ingestion) — UNBLOCKED.** SEC-04 baseline shipped; the load-bearing v4.5 → v5.0 gate per `v4.5-REQUIREMENTS.md` line 71 is closed. Phase 45's planner agent can read SEC-04-THREAT-MODEL.md cold and make architecture calls on file-validation pattern, parser selection, Claude extraction shape, Snowflake role separation, and upload-endpoint auth/rate-limit posture without re-deriving risks from scratch.
- **Phase 45 ADR backlog seeded with 13 LOCK items** (M1.1, M1.2, M1.3, M2.1, M2.2, M3.1, M3.2, M3.3, M4.1, M4.2, M5.1, M5.2, M5.3). Phase 45 produces a `docs/adr/` entry for each as it commits to the implementation.
- **Cross-references to companion plan 42a-01** documented inline (Surface 4 / Cross-surface concerns / "What this doc deliberately does NOT cover" sections all cite the SEC-01 / SEC-03 / SEC-06 docs that 42a-01 ships). When 42a-01 lands, those cross-references resolve cleanly.
- **Phase 42b coordination point identified.** Surface 5 explicitly flags M5.1/M5.2/M5.3 as Phase-45-implementable-with-revision-once-OAuth-lands. Phase 42b's deep auth audit will refine; Phase 45 should not block on Phase 42b. Documented in the doc itself + here so the hand-off is unambiguous.
- **No follow-up tasks required** within Phase 42a for this plan. Companion plan 42a-01 (SEC-01 / SEC-03 / SEC-06 + Dependabot) is the remaining 42a work; once it lands, Phase 42a closes and v4.5 effectively closes (gates: 41/42a/43/44 — 41 ✅, 44 in flight at 3/4, 43 in flight at 1/3, 42a at 1/2).

## Self-Check: PASSED

- File exists: `.planning/phases/42a-security-review-oauth-independent/SEC-04-THREAT-MODEL.md` ✅
- Line count: 237 (≥150 required) ✅
- All 8 required headers present (Status, Surface 1-5, Summary of LOCK, plus prompt-injection / Phase 45 / living-document content checks) ✅
- Commit `ed95ff8` exists in `git log --oneline -5` ✅
- 21 cross-references to actual source files (matches `snowflake/connection|/api/data|/api/query|system-prompt`) — satisfies plan's `key_links` pattern ✅

---

*Phase: 42a-security-review-oauth-independent*
*Completed: 2026-04-30*
