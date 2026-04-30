# Phase 42a: Security Review (OAuth-independent) - Context

**Gathered:** 2026-04-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Audit the existing security surface (credentials, SQL injection, dependencies) AND produce the forward threat model for v5.0's ingestion pipeline — the work that doesn't require a deployed authenticated surface.

**Requirements in scope:** SEC-01 (credential handling), SEC-03 (SQL injection surface), SEC-04 (forward threat model — load-bearing for Phase 45), SEC-06 (dependency baseline).

**Out of scope (→ 42b):** SEC-02 (client-side data exposure on deployed surface), SEC-05 (auth/access control state) — both gated on OAuth landing on Vercel.

</domain>

<decisions>
## Implementation Decisions

### Deliverable structure

- **Four separate per-requirement docs** in `.planning/phases/42a-security-review-oauth-independent/`:
  - `SEC-01-CREDENTIALS.md`
  - `SEC-03-SQL-INJECTION.md`
  - `SEC-04-THREAT-MODEL.md` (load-bearing for Phase 45 — written to be referenced from Phase 45 planning)
  - `SEC-06-DEPENDENCIES.md`
- **Audience:** Bounce engineering team — mid-formality, explains Bounce-specific context (codebase paths, partner-data shape, Snowflake/Anthropic API usage). NOT written for an external security pro and NOT for solo-operator shorthand.
- **ADRs:** Only SEC-04 mitigations that Phase 45 actually locks in become formal ADRs. Threat model itself stays as Markdown. SEC-01/03/06 produce no ADRs.

### Threat model depth (SEC-04)

- **Prescriptiveness:** Risks + recommended mitigations. Phase 45 planning makes final architectural calls — threat model informs but doesn't dictate.
- **Structure:** Freeform, organized per ingestion surface (file upload → parse → Claude extract → store). No STRIDE / attack-tree ceremony.
- **Surfaces covered:**
  1. File upload (PDF/Excel) — MIME validation, size limits, extension spoofing, ZIP-bomb-style attacks
  2. Claude extraction — prompt injection via uploaded docs, output validation, cost runaway
  3. Stored scorecard PII — what gets persisted, where, retention, cross-partner exposure
  4. Auth / rate-limit model — lite coverage (just enough to feed Phase 45 planning; deep auth audit lives in 42b)
- **Lifecycle:** Living artifact through v5.0 — Phase 42a establishes baseline; Phase 45+ planning updates it as decisions firm up. Stays current as the system evolves.

### Findings disposition

- **Severity gate:** Fix high/critical exploitable findings inside Phase 42a. Medium/low findings documented and deferred.
- **Severity scale:** Plain-English judgment ("could a stranger exploit this today?" → high; "could a bad partner abuse this?" → medium; theoretical → low). No CVSS scoring overhead.
- **Deferred-finding destination:** **In-repo only.** Captured in the audit doc itself (or `.planning/NEXT-STEPS.md`). DO NOT file Notion R&D Backlog tickets, Linear issues, or any ticket visible to Bounce eng without explicit user permission — this project is skunkworks.
- **Mid-phase ballooning fix:** If a high-severity fix proves larger than expected, spin it into its own decimal phase (e.g., 42a.1) rather than letting it block the audit deliverables. Hotfixing on main and pausing the audit are not preferred.

### Dependency stance (SEC-06)

- **Action level:** Document current state + apply safe patch/minor updates that pass build and smoke tests. Defer major-version upgrades (TanStack v9, etc.) to the v5.5 DEBT phase.
- **Dependabot:** Configure Dependabot (or equivalent) for **security advisories only** — not weekly version-update PRs. Avoids upgrade-PR noise; surfaces real risks.
- **Audit gate to close phase:** Only high/critical findings on actually-reachable code paths block phase close. Theoretical CVEs in dev-only dependencies or unreachable code are documented and deferred.
- **Major upgrade paths:** Captured inline in `SEC-06-DEPENDENCIES.md` — each major upgrade gets a short note (current version, target, breaking changes, estimated effort) for v5.5 planning to consume.

### Claude's Discretion

- SEC-01 audit rigor: how deep to inspect built sourcemaps / production bundles vs static grep on the codebase. Pick whatever gives a defensible "verified server-only" answer in the time budget.
- SEC-03 testing approach: whether to write unit tests proving column-allow-list rejection vs visual code review. Pick what's cheapest given existing test infrastructure.
- Phase plan split: one plan vs two (audit vs threat model). Roadmap suggested two; planner picks based on actual dependency between deliverables.
- Doc tone within "Bounce eng team" register — exact voice, headings, code-snippet inclusion.
- npm audit triage format inside SEC-06.

</decisions>

<specifics>
## Specific Ideas

- SEC-04 is load-bearing for v5.0 Phase 45 — write it as if Phase 45's planner agent will read it cold and need to make architecture calls from it. Concrete > generic. Reference actual files (`src/lib/snowflake/connection.ts`, `/api/data`, etc.) where relevant.
- The four ingestion surfaces in SEC-04 are the four explicit asks from the requirement (SEC-04 in `v4.5-REQUIREMENTS.md` line 71). Cover all four, even if briefly.
- SEC-01 has a specific deliverable: "Vercel env var flow is documented end-to-end." Don't skip the env-var flow diagram/description.
- `npm audit` is the SEC-06 baseline tool — phase doesn't need to invent a custom scanner.

</specifics>

<deferred>
## Deferred Ideas

- **Deep auth audit / access control documentation** (SEC-02, SEC-05) — Phase 42b, gated on OAuth landing on Vercel. Threat model touches auth lightly only to feed Phase 45 planning.
- **Major-version dependency upgrades** (TanStack v9, etc.) — v5.5 DEBT phase. Documented inline in SEC-06 doc with effort estimates.
- **Filing security findings as eng-visible tickets (Notion R&D Backlog / Linear)** — out until project graduates from skunkworks. All findings stay in-repo until explicit user permission.
- **Custom severity scoring (CVSS, Bounce-specific tiers)** — not needed at solo-operator scale; revisit if/when team grows.
- **Renovate as Dependabot alternative** — heavier setup not justified at current scope; revisit if Dependabot's defaults prove inadequate.

</deferred>

---

*Phase: 42a-security-review-oauth-independent*
*Context gathered: 2026-04-30*
