---
phase: 42a-security-review-oauth-independent
plan: 01
subsystem: security
tags: [audit, credentials, sql-injection, dependencies, dependabot, pnpm, vercel, snowflake, anthropic]

# Dependency graph
requires:
  - phase: 41-data-correctness-audit
    provides: stable v4.5 surface to audit (no architectural churn during audit)
  - phase: 39-partner-config-module
    provides: ALLOWED_COLUMNS allow-list pattern that SEC-03 verifies
provides:
  - SEC-01 credential handling audit (Vercel env-var flow + sourcemap/bundle inspection verdict)
  - SEC-03 SQL injection per-surface review (6 surfaces — all safe via allow-list / parameterized binds)
  - SEC-06 dependency security baseline (9 → 0 advisories via pnpm-workspace overrides)
  - Dependabot security-advisory-only config
  - v5.5 DEBT major-upgrade backlog (TanStack v9, Vitest v4, ESLint v10, TypeScript v6, etc.)
affects:
  - phase 42a-02 (SEC-04 threat model — references SEC-01/03 patterns)
  - phase 42b (post-OAuth client-side audits SEC-02/05 — extend the SEC-01 bundle-inspection methodology)
  - phase 45 (v5.0 ingestion — inherits SEC-04 threat model + SEC-03 allow-list invariant)
  - phase v5.5 DEBT (consumes SEC-06 major-upgrade backlog)

tech-stack:
  added: [".github/dependabot.yml (Dependabot config)", "pnpm-workspace.yaml overrides (7 transitive pins)"]
  patterns:
    - "Severity-gated security audit (high/critical fix-now, medium/low documented inline)"
    - "Skunkworks rule (deferred findings stay in-repo, no Notion/Linear tickets)"
    - "Dependabot with open-pull-requests-limit: 0 (suppress version churn, surface CVEs only)"
    - "pnpm-workspace overrides for transitive-dep CVE patching (vs major-version bumps of direct deps)"

key-files:
  created:
    - .planning/phases/42a-security-review-oauth-independent/SEC-01-CREDENTIALS.md (215 lines)
    - .planning/phases/42a-security-review-oauth-independent/SEC-03-SQL-INJECTION.md (246 lines)
    - .planning/phases/42a-security-review-oauth-independent/SEC-06-DEPENDENCIES.md (159 lines)
    - .github/dependabot.yml (npm ecosystem, security-only)
  modified:
    - pnpm-workspace.yaml (added overrides block — 7 transitive pins)
    - pnpm-lock.yaml (resolved overrides; net -1 packages)

key-decisions:
  - "pnpm not npm — `pnpm audit --fix` writes overrides to pnpm-workspace.yaml (not package.json#overrides as npm/yarn do); plan template assumed npm so the actual files-modified list differs from the plan frontmatter"
  - "Dependabot open-pull-requests-limit: 0 to suppress weekly version-bump PR noise; security advisories bypass this limit and still get filed (verified pattern)"
  - "uuid@>=14.0.0 override crosses a major-version boundary on the TRANSITIVE dep, but does not bump the direct snowflake-sdk dep — this is the appropriate tool for the situation per CONTEXT (major bumps of direct deps are out of scope)"
  - "All 7 distinct advisories (9 paths) cleared via overrides; zero deferred findings remaining; phase severity gate fully clear"
  - "/api/query NLQ surface intentionally NOT a SQL-construction site — text-to-SQL generation is OUT of scope per .planning/REQUIREMENTS.md; risk shape there is prompt injection (covered in SEC-04, not SEC-03)"
  - "Bundle inspection method: Turbopack production build did not ship sourcemaps in .next/static/; case-insensitive substring sweep (snowflake|anthropic) surfaced 2 benign hits (node-sql-parser dialect literal + /tokens UI demo string) — verified NOT credential leakage"

patterns-established:
  - "Per-requirement audit doc convention: SEC-XX-NAME.md with consistent ## Scope, ## Findings, ## Verification commands sections (re-run methodology baked into every doc)"
  - "Severity-gate disposition vocabulary: high/critical → fix-or-escalate-to-decimal-phase, medium/low → document inline, theoretical CVEs in dev-only/unreachable paths → defer with reachability note"
  - "Reachability assessment column for advisory triage (path → 'Reachable from app?' verdict) so a future auditor can re-run pnpm audit and immediately know which rows actually matter"

requirements-completed: [SEC-01, SEC-03, SEC-06]

# Metrics
duration: 8 min
completed: 2026-04-30
---

# Phase 42a Plan 01: Security Review Audits Summary

**Three audit docs (SEC-01 credentials / SEC-03 SQL injection / SEC-06 dependencies) + Dependabot security-only config + 7 pnpm-workspace overrides clearing all 9 moderate advisories to 0/0/0/0 across info/low/moderate/high/critical**

## Performance

- **Duration:** 8 min
- **Started:** 2026-04-30T18:22:59Z
- **Completed:** 2026-04-30T18:31:47Z
- **Tasks:** 3
- **Files created:** 4 (3 audit docs + dependabot.yml)
- **Files modified:** 2 (pnpm-workspace.yaml + pnpm-lock.yaml)

## Accomplishments

- **SEC-01:** Verified server-only credential handling end-to-end. All 12 Snowflake/Anthropic env-var read-sites confirmed in server-only `lib/` modules. Zero `NEXT_PUBLIC_*` aliases. Bundle inspection: zero credential leakage in `.next/static/`; two benign substring hits (node-sql-parser dialect literal + `/tokens` UI demo string) documented. Vercel env-var flow documented end-to-end (origin → Vercel storage → runtime injection → no leak path → local dev).
- **SEC-03:** Enumerated all 6 SQL-adjacent surfaces. Verdict: 5x safe-via-pattern (allow-list interpolation OR parameterized binds OR fully static SQL); `/api/query` is NOT a SQL surface (NLQ doesn't generate SQL — text-to-SQL is explicitly out-of-scope per REQUIREMENTS). Two safe patterns formally documented (Pattern A: column allow-list; Pattern B: parameterized binds). Regression-prevention notes for future PRs.
- **SEC-06:** Baseline `pnpm audit` showed **9 moderate** advisories (7 distinct, 0 high, 0 critical). Applied 7 pnpm-workspace overrides covering all of them. Post-fix: **0 vulnerabilities** of any severity. Build + 3 representative smoke tests all green post-override. v5.5 DEBT major-upgrade backlog captured (TanStack v9, Vitest v4, ESLint v10, TypeScript v6, etc.).
- Configured `.github/dependabot.yml` for security-advisory-only mode (`open-pull-requests-limit: 0`).

## Task Commits

1. **Task 1: SEC-01-CREDENTIALS.md** — `5f7bcf2` (docs)
2. **Task 2: SEC-03-SQL-INJECTION.md** — `ab13527` (docs)
3. **Task 3: SEC-06-DEPENDENCIES.md + dependabot.yml + pnpm overrides** — `0cfa1e0` (chore)

**Plan metadata:** to be added by orchestrator (docs: complete plan commit)

## Files Created/Modified

- `.planning/phases/42a-security-review-oauth-independent/SEC-01-CREDENTIALS.md` — Credential-handling audit (215 lines)
- `.planning/phases/42a-security-review-oauth-independent/SEC-03-SQL-INJECTION.md` — SQL-injection per-surface review (246 lines)
- `.planning/phases/42a-security-review-oauth-independent/SEC-06-DEPENDENCIES.md` — Dependency baseline + v5.5 DEBT backlog (159 lines)
- `.github/dependabot.yml` — Security-advisory-only Dependabot config
- `pnpm-workspace.yaml` — Added 7 overrides (esbuild, vite, follow-redirects, hono, fast-xml-parser, uuid, postcss)
- `pnpm-lock.yaml` — Resolved overrides; net -1 packages (16 added, 17 removed via dedupe)

## Decisions Made

- **pnpm vs npm.** Plan frontmatter listed `package.json` + `package-lock.json` as files-modified, but project actually uses pnpm — `pnpm audit --fix` writes overrides to `pnpm-workspace.yaml` (not `package.json#overrides`). The project does not have a `package-lock.json`. Adapted to project reality (Rule 3 - Blocking). Documented the lockfile reality explicitly in the SEC-06 doc so future auditors don't waste time looking for npm artifacts.
- **Dependabot config shape.** `open-pull-requests-limit: 0` selected per CONTEXT decision (suppress weekly version-bump noise). Security advisories bypass the limit — verified pattern. The `security` label routes Dependabot-filed PRs through GitHub's advisory UI for triage.
- **`uuid@>=14.0.0` override.** Crosses a major boundary on the TRANSITIVE `uuid` dep but doesn't bump the direct `snowflake-sdk` dep. Per CONTEXT, major bumps of direct deps are out of scope; pnpm overrides are the right tool for transitive-CVE patching. Documented the rationale inline in SEC-06.
- **Bundle inspection scope.** Turbopack production build doesn't ship sourcemaps in `.next/static/`, so the sourcemap-leak grep returns zero hits structurally. Case-insensitive substring sweep (`snowflake|anthropic`) surfaced 2 benign hits in static chunks; both verified non-credential. Documented the methodology so re-runs have an explicit "expected benign" list.
- **`/api/query` SEC-03 verdict.** Initially considered it as a SQL surface, but verified that the route does not generate SQL — it only feeds Claude a server-built system prompt + pre-formatted dataContext string. Text-to-SQL generation is explicitly OUT of scope per `.planning/REQUIREMENTS.md`. Risk on this surface is prompt injection (covered in SEC-04, parallel plan 42a-02), not SQL injection. Documented the boundary explicitly.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Project uses pnpm not npm**
- **Found during:** Task 3 (baseline `npm audit` step)
- **Issue:** Plan template assumed npm + package-lock.json. Running `npm audit` errored with `ENOLOCK — This command requires an existing lockfile`. Project uses pnpm-lock.yaml exclusively (no package-lock.json exists, per Phase 41-02 lock note in STATE.md).
- **Fix:** Switched to `pnpm audit` for baseline + `pnpm audit --fix` for override generation. Adapted SEC-06 doc to document `pnpm audit --fix` writes overrides to `pnpm-workspace.yaml` (not `package.json#overrides`). Updated the plan-frontmatter `files_modified` list mismatch in the SEC-06 doc itself rather than re-writing the plan.
- **Files modified:** `pnpm-workspace.yaml` (added overrides block), `pnpm-lock.yaml` (resolved). NOT `package.json` / `package-lock.json` as the plan template suggested.
- **Verification:** `pnpm install` succeeded, `npm run build` passed, all 3 smoke tests green, post-fix `pnpm audit` shows 0/0/0/0/0.
- **Committed in:** `0cfa1e0` (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking — package manager mismatch). **Impact on plan:** Surface-level deviation only — the audit deliverables, severity gate verdict, and post-fix state all match the plan's intent. The deviation is documented inline in SEC-06 so future auditors don't waste time looking for npm-shape artifacts.

## Issues Encountered

None. The package-manager mismatch was caught immediately and resolved within the deviation rules. No checkpoints, no escalations to 42a.X decimal phases, no blocked tasks.

## User Setup Required

None — no external service configuration required. Dependabot activates automatically once `.github/dependabot.yml` lands on `main` and the GitHub repo is configured (already is, per existing `.github/` ecosystem expectations).

## Next Phase Readiness

- **Phase 42a-02 (SEC-04 threat model)** already completed in parallel by orchestrator (per `.planning/phases/42a-security-review-oauth-independent/42a-02-SUMMARY.md` present in the working tree). With 42a-01 complete, **Phase 42a is fully closed** — both audit deliverables (this plan) and forward threat model (parallel plan) shipped.
- **Phase 42b** (SEC-02 / SEC-05 — client-side data exposure + auth/access control state) remains gated on OAuth landing on Vercel. Methodology from SEC-01 (Vercel env-var flow + bundle inspection) extends naturally to SEC-02 once OAuth is live.
- **v5.0 Phase 45** (ingestion) inherits the SEC-03 allow-list invariant + SEC-04 threat model. SEC-03's regression-prevention notes (any new `executeQuery` interpolation needs allow-list; any new route accepting user values needs Pattern B binds) are the load-bearing contract.
- **v5.5 DEBT** consumes the SEC-06 major-upgrade backlog (TanStack v9, Vitest v4, ESLint v10, TypeScript v6, @types/node v25). All entries have current-version, target, breaking-changes summary, estimated effort, and "blocking advisory? No" status — actionable without re-discovery.

---

*Phase: 42a-security-review-oauth-independent*
*Completed: 2026-04-30*
