---
phase: 42a-security-review-oauth-independent
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - .planning/phases/42a-security-review-oauth-independent/SEC-01-CREDENTIALS.md
  - .planning/phases/42a-security-review-oauth-independent/SEC-03-SQL-INJECTION.md
  - .planning/phases/42a-security-review-oauth-independent/SEC-06-DEPENDENCIES.md
  - .github/dependabot.yml
  - package.json
  - package-lock.json
autonomous: true
requirements: [SEC-01, SEC-03, SEC-06]

must_haves:
  truths:
    - "Reader of SEC-01-CREDENTIALS.md can answer: where do SNOWFLAKE_* and ANTHROPIC_API_KEY live, who can read them, what's the Vercel env-var flow end-to-end, and is anything reachable from the client bundle"
    - "Reader of SEC-03-SQL-INJECTION.md can enumerate every server-side SQL construction site, see how each is parameterized or allow-listed, and trust that no user-controlled string reaches Snowflake unguarded"
    - "Reader of SEC-06-DEPENDENCIES.md sees current `npm audit` state, which advisories were patched in this phase, which were triaged-and-deferred (with reason), and which majors are reserved for v5.5 DEBT"
    - "Dependabot is configured for security advisories only (not weekly version PRs)"
    - "All high/critical findings on reachable code paths are either fixed in this phase or escalated into a 42a.X decimal phase — none are silently deferred"
  artifacts:
    - path: ".planning/phases/42a-security-review-oauth-independent/SEC-01-CREDENTIALS.md"
      provides: "Credential handling audit"
      contains: "Vercel env-var flow"
      min_lines: 60
    - path: ".planning/phases/42a-security-review-oauth-independent/SEC-03-SQL-INJECTION.md"
      provides: "Per-surface SQL injection review"
      contains: "/api/data"
      min_lines: 60
    - path: ".planning/phases/42a-security-review-oauth-independent/SEC-06-DEPENDENCIES.md"
      provides: "Dependency security baseline + major-upgrade notes for v5.5"
      contains: "npm audit"
      min_lines: 50
    - path: ".github/dependabot.yml"
      provides: "Dependabot security-advisory-only config"
      contains: "security-updates"
  key_links:
    - from: "SEC-01-CREDENTIALS.md"
      to: "src/lib/snowflake/connection.ts + src/lib/ai/system-prompt.ts + .env.example"
      via: "audit references actual files where credentials are read"
      pattern: "snowflake/connection\\.ts|system-prompt\\.ts|\\.env\\.example"
    - from: "SEC-03-SQL-INJECTION.md"
      to: "/api/data, /api/accounts, /api/health, src/lib/metabase-import/parse-metabase-sql.ts, src/lib/ai/system-prompt.ts"
      via: "each surface enumerated with quoted SQL-construction snippet + verdict"
      pattern: "api/(data|accounts|health|query)|metabase-import|system-prompt"
    - from: ".github/dependabot.yml"
      to: "package.json"
      via: "scoped to npm ecosystem"
      pattern: "package-ecosystem:\\s*\"?npm\"?"
---

<objective>
Audit the existing security surface across three dimensions — credential handling (SEC-01), SQL injection (SEC-03), dependency advisories (SEC-06) — and produce one freestanding audit doc per requirement plus a security-only Dependabot config.

Each audit follows the severity gate from `42a-CONTEXT.md`: high/critical findings on reachable code paths are fixed inside this plan; medium/low findings are documented inline in the corresponding doc and deferred (in-repo only — no Notion / Linear tickets, project is skunkworks). If any high/critical fix balloons mid-task, the executor stops and recommends spinning a 42a.X decimal phase rather than blocking the deliverables.

Purpose: Close out the retrospective security work before v5.0 begins. Companion plan 42a-02 produces the load-bearing forward threat model (SEC-04).

Output:
  - `.planning/phases/42a-security-review-oauth-independent/SEC-01-CREDENTIALS.md` (Vercel env-var flow + sourcemap/bundle inspection verdict)
  - `.planning/phases/42a-security-review-oauth-independent/SEC-03-SQL-INJECTION.md` (per-surface review against the column allow-list / parameterization patterns)
  - `.planning/phases/42a-security-review-oauth-independent/SEC-06-DEPENDENCIES.md` (current `npm audit` state, applied safe patch/minor updates, triaged deferrals, major-upgrade notes for v5.5)
  - `.github/dependabot.yml` (security-advisories-only)
  - Any safe `npm audit fix` patch/minor updates committed alongside, with build + smoke green
</objective>

<execution_context>
@/Users/micah/.claude/get-shit-done/workflows/execute-plan.md
@/Users/micah/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/ROADMAP.md
@.planning/milestones/v4.5-REQUIREMENTS.md
@.planning/phases/42a-security-review-oauth-independent/42a-CONTEXT.md

# Existing surface — auditor reads these directly, no exploration needed
@src/lib/snowflake/connection.ts
@src/lib/snowflake/queries.ts
@src/lib/snowflake/reliability.ts
@src/app/api/data/route.ts
@src/app/api/accounts/route.ts
@src/app/api/health/route.ts
@src/app/api/query/route.ts
@src/app/api/curves-results/route.ts
@src/lib/columns/config.ts
@src/lib/columns/account-config.ts
@src/lib/metabase-import/parse-metabase-sql.ts
@src/lib/ai/system-prompt.ts
@.env.example
@package.json

<interfaces>
<!-- Key facts the executor needs without re-deriving from the codebase. -->

CREDENTIAL READ-SITES (server-only, all `process.env.*`):
- Snowflake: src/lib/snowflake/connection.ts (lines 23-31, 33-42, 65-95) — reads SNOWFLAKE_ACCOUNT/USERNAME/WAREHOUSE/DATABASE/SCHEMA/ROLE/PASSWORD/PRIVATE_KEY/PRIVATE_KEY_PASS/AUTH
- Anthropic: src/lib/ai/system-prompt.ts (line 18) — reads ANTHROPIC_API_KEY
- Vercel build SHA (non-secret): src/app/api/health/route.ts (line 11) — reads VERCEL_GIT_COMMIT_SHA

SQL CONSTRUCTION SITES (per-surface enumeration target for SEC-03):
1. /api/data → `SELECT ${columnList} FROM agg_batch_performance_summary` — columnList composed from ALLOWED_COLUMNS allow-list (src/lib/columns/config.ts), no user-bound parameters; columns validated via `.filter(c => ALLOWED_COLUMNS.has(c))` before interpolation
2. /api/accounts → `SELECT ${columnList} FROM master_accounts WHERE PARTNER_NAME = ? AND BATCH = ?` — columnList from ACCOUNT_ALLOWED_COLUMNS allow-list; partner/batch passed as parameterized binds (`?`) through snowflake-sdk
3. /api/health → static `SELECT 1 AS ping` — no user input
4. /api/query (NLQ) → no SQL execution; user message is fed to Claude. Context for SEC-03 is system-prompt construction, not SQL — call out that NLQ does NOT generate SQL (per REQUIREMENTS.md "Out of Scope" line 91 — text-to-SQL is explicitly excluded)
5. /api/curves-results → read same pattern (verify: also allow-list-driven SELECT against a known table)
6. src/lib/metabase-import/parse-metabase-sql.ts → ingests user-pasted Metabase SQL, validates against ALLOWED_COLUMNS at the column-name boundary. SQL is parsed by `node-sql-parser` (Snowflake build) into AST then translated to a snapshot — raw user SQL never executes against Snowflake. Confirm this in the audit.

SNOWFLAKE PARAM-BIND CONTRACT:
- src/lib/snowflake/queries.ts — `executeQuery(sqlText, binds?: (string | number)[])` passes `binds` to snowflake-sdk's `connection.execute({ sqlText, binds, ... })` which uses native `?` parameter binding (NOT string interpolation). This is the safe path used by /api/accounts.

DEPENDENCY SCAN TARGETS:
- Runtime deps (package.json): @ai-sdk/anthropic ^3.0.69, ai ^6.0.158, next 16.2.3, react 19.2.4, recharts 3.8.0, snowflake-sdk ^2.4.0, node-sql-parser ^5.4.0, @tanstack/* (multiple), zod ^4.3.6, etc.
- Dev deps: @playwright/test, eslint, vitest, etc.
- Major-upgrade candidate the requirements call out for v5.5 DEBT: TanStack v9 (currently @tanstack/react-table ^8.21.3, react-query ^5.97.0). Note in SEC-06 doc, do NOT attempt the upgrade in this phase.

DEPENDABOT CONFIG SHAPE (security-advisories-only — minimal example):
```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    # Only PRs for security advisories — no version-bump noise
    open-pull-requests-limit: 0
    labels:
      - "security"
```
The `open-pull-requests-limit: 0` trick suppresses regular version-update PRs while still allowing security-advisory PRs (Dependabot security advisories ignore the limit). Verified pattern.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Author SEC-01-CREDENTIALS.md (credential handling audit)</name>
  <files>.planning/phases/42a-security-review-oauth-independent/SEC-01-CREDENTIALS.md</files>
  <action>
Write a single Markdown doc auditing every credential read-site in the codebase. Required sections (use `##` headers exactly):

## Scope
One paragraph naming the two secrets in scope: SNOWFLAKE_* family (used by `src/lib/snowflake/connection.ts`) and `ANTHROPIC_API_KEY` (used by `src/lib/ai/system-prompt.ts`). Note non-secrets like `VERCEL_GIT_COMMIT_SHA` are excluded.

## Read-sites (server-only)
Table: env var → file:line → auth mode (where relevant) → notes. Use the read-sites listed in `<interfaces>` above. For each, quote the surrounding 2-3 lines and confirm it's `process.env.X` access from a file that runs server-side only (Next.js App Router server route or `lib/` imported by server routes — not from anything that reaches `'use client'`).

## Vercel env-var flow (end-to-end)
Required by SEC-01 success criteria. Cover:
1. Where the secret originates (Snowflake admin UI for keypair / password; Anthropic console for API key)
2. How it's stored in Vercel (Project Settings → Environment Variables → Production/Preview/Development scope)
3. How it reaches `process.env.*` at runtime (build-time injection vs runtime injection — Next.js App Router routes run on Vercel Functions, env vars injected at runtime per Vercel's docs; only `NEXT_PUBLIC_*` is build-time-baked into client bundles)
4. Why none of the SNOWFLAKE_* or ANTHROPIC_* names are `NEXT_PUBLIC_*` and therefore cannot leak to client (verify by `grep -r "NEXT_PUBLIC_" src/` — should return zero hits for snowflake/anthropic)
5. Local dev path (`.env.local` / `externalbrowser` Google SSO mode for solo-dev convenience)

Reference `.env.example` lines 7-26 for the supported auth modes (password / externalbrowser / keypair).

## Client-bundle / sourcemap inspection
Run `npm run build` once. Then run `grep -r "SNOWFLAKE_\|ANTHROPIC_API_KEY\|process\.env\.SNOWFLAKE\|process\.env\.ANTHROPIC" .next/static/ 2>/dev/null` and `grep -r "SNOWFLAKE_\|ANTHROPIC_API_KEY" .next/server/app/ | head -20` (server bundles will contain these, that's fine; record the contrast). Capture findings (verbatim grep output, truncated if long) under this section. **Verdict:** "verified server-only" or specific finding.

If any SNOWFLAKE_* or ANTHROPIC_* literal appears in `.next/static/` (client bundle) or sourcemaps shipped to client, this is a HIGH severity finding — fix inline (likely an errant client component reading a server-only env var) and document the fix.

## Findings
Numbered list. For each: severity (high/critical/medium/low), description, exploitability ("could a stranger exploit this today?" → high; "could a bad partner abuse?" → medium; theoretical → low — per CONTEXT decisions), and disposition (fixed in this phase / deferred to NEXT-STEPS / escalate to 42a.X).

If zero high/critical findings, say so explicitly: "No high or critical findings; static analysis + bundle inspection verified server-only credential handling."

## Deferred (medium/low)
Inline list — keep all deferred findings in this doc, do NOT file external tickets.

## Verification commands (for re-running this audit later)
List the exact commands future auditors should re-run (`grep` invocations + `npm run build` + bundle inspection) so this audit is reproducible without re-deriving from scratch.

If a high-severity issue surfaces and the fix balloons (>~30 min of code changes), STOP and recommend creating phase 42a.1 — do NOT block this audit on a sprawling fix. Document the finding with full repro and exit cleanly.

Tone: Bounce eng team register — explain Bounce-specific paths (`agg_batch_performance_summary`, the externalbrowser SSO flow) but assume reader knows Next.js App Router basics.
  </action>
  <verify>
    <automated>
test -f .planning/phases/42a-security-review-oauth-independent/SEC-01-CREDENTIALS.md && \
  grep -q "## Vercel env-var flow" .planning/phases/42a-security-review-oauth-independent/SEC-01-CREDENTIALS.md && \
  grep -q "## Findings" .planning/phases/42a-security-review-oauth-independent/SEC-01-CREDENTIALS.md && \
  grep -qE "(snowflake/connection\.ts|system-prompt\.ts)" .planning/phases/42a-security-review-oauth-independent/SEC-01-CREDENTIALS.md && \
  wc -l .planning/phases/42a-security-review-oauth-independent/SEC-01-CREDENTIALS.md | awk '$1 >= 60 {exit 0} {exit 1}'
    </automated>
  </verify>
  <done>SEC-01-CREDENTIALS.md exists with all required sections, references the actual credential read-sites, includes the Vercel env-var flow end-to-end, has a `## Client-bundle / sourcemap inspection` section with the actual `npm run build` + grep result captured, and a `## Findings` section with explicit verdict. ≥60 lines.</done>
</task>

<task type="auto">
  <name>Task 2: Author SEC-03-SQL-INJECTION.md (per-surface review)</name>
  <files>.planning/phases/42a-security-review-oauth-independent/SEC-03-SQL-INJECTION.md</files>
  <action>
Write a single Markdown doc enumerating every server-side surface where SQL is constructed or where user input could conceivably reach SQL. Required sections:

## Scope
Name the surfaces in scope (use the list in `<interfaces>` above): /api/data, /api/accounts, /api/health, /api/query (NLQ context), /api/curves-results, src/lib/metabase-import/parse-metabase-sql.ts. Explicitly note that text-to-SQL generation is OUT of scope per `.planning/REQUIREMENTS.md` Out-of-Scope row ("Text-to-SQL generation").

## The two safe patterns
Briefly document the two patterns the codebase uses, so the per-surface verdicts can reference them by name:
1. **Column allow-list interpolation:** `${columnList}` is interpolated into SQL only after every column name is filtered through `ALLOWED_COLUMNS.has(c)` (defined in `src/lib/columns/config.ts`) — uppercase set membership check, no fuzzy matching. Quote the relevant lines from `src/lib/columns/config.ts` and `/api/data` route handler.
2. **Parameterized binds:** `executeQuery(sql, binds)` (`src/lib/snowflake/queries.ts` lines 8-41) forwards `binds` to snowflake-sdk's `connection.execute({ sqlText, binds })` which performs native `?` parameter binding. Quote the call shape from /api/accounts.

## Per-surface review
One subsection per surface. Each subsection: `### {surface}`, then quoted SQL-construction snippet (3-5 lines, verbatim from the file), then verdict (`✅ Safe via {pattern}` / `⚠️ Concern: {detail}` / `❌ Vulnerable: {detail}`), then 1-2 sentences of reasoning.

Cover all six surfaces:
1. **`/api/data`** — `src/app/api/data/route.ts` line 58 (the `SELECT ${columnList} FROM agg_batch_performance_summary` line). Verdict: ✅ via allow-list (filter at line 42).
2. **`/api/accounts`** — `src/app/api/accounts/route.ts` lines 44-50. Verdict: ✅ via allow-list (column list) + parameterized binds (partner/batch).
3. **`/api/health`** — static `SELECT 1 AS ping`. Verdict: ✅ no user input.
4. **`/api/query` (NLQ)** — `src/app/api/query/route.ts` + `src/lib/ai/system-prompt.ts`. Verdict: ✅ NOT a SQL surface — the route streams Claude responses based on a server-built system prompt + pre-formatted dataContext string. NO Snowflake call is made from this route. Risk is prompt injection, which is covered in SEC-04, not SEC-03.
5. **`/api/curves-results`** — read `src/app/api/curves-results/route.ts` and apply the same pattern verdict (likely allow-list).
6. **`src/lib/metabase-import/parse-metabase-sql.ts`** — user-pasted Metabase SQL is parsed into an AST by `node-sql-parser` (Snowflake build), then translated into a snapshot. The raw user SQL is NEVER executed against Snowflake — it's structurally validated and column names are case-folded then matched against `ALLOWED_COLUMNS` (parser file lines 14-20 comments). Verdict: ✅ no execution path; structural-only with allow-list at column boundary.

For each surface, also note: **what would have to change** for the surface to become unsafe (e.g., "if `/api/data` ever accepted a `where` query parameter and interpolated it directly, the allow-list wouldn't cover that — flag for any future PR adding filter clauses").

## Findings
Numbered list, severity + disposition, same scheme as SEC-01.

If zero high/critical findings, say so. The expected outcome is "all surfaces verified safe via allow-list or parameterized binds; metabase-import is structural-only and never executes user SQL."

## Regression-prevention notes
Short list — patterns to enforce in future PRs (e.g., "any new `executeQuery` call that interpolates a string into `sqlText` must come with a corresponding allow-list check"; "any new API route that accepts query parameters must declare the safe pattern in a comment").

If a high-severity issue surfaces and the fix balloons, same escalation rule as Task 1: STOP and recommend 42a.X.

Tone: Bounce eng team register — quote actual file:line references, explain the allow-list pattern once and reference it thereafter.
  </action>
  <verify>
    <automated>
test -f .planning/phases/42a-security-review-oauth-independent/SEC-03-SQL-INJECTION.md && \
  grep -q "## Per-surface review" .planning/phases/42a-security-review-oauth-independent/SEC-03-SQL-INJECTION.md && \
  grep -q "## Findings" .planning/phases/42a-security-review-oauth-independent/SEC-03-SQL-INJECTION.md && \
  grep -qE "/api/data" .planning/phases/42a-security-review-oauth-independent/SEC-03-SQL-INJECTION.md && \
  grep -qE "/api/accounts" .planning/phases/42a-security-review-oauth-independent/SEC-03-SQL-INJECTION.md && \
  grep -qE "metabase-import" .planning/phases/42a-security-review-oauth-independent/SEC-03-SQL-INJECTION.md && \
  grep -qE "ALLOWED_COLUMNS|allow-list" .planning/phases/42a-security-review-oauth-independent/SEC-03-SQL-INJECTION.md && \
  wc -l .planning/phases/42a-security-review-oauth-independent/SEC-03-SQL-INJECTION.md | awk '$1 >= 60 {exit 0} {exit 1}'
    </automated>
  </verify>
  <done>SEC-03-SQL-INJECTION.md exists with all 6 surfaces enumerated (data/accounts/health/query/curves-results/metabase-import), each with a verdict (✅/⚠️/❌) and quoted SQL snippet or pattern reference. The two safe patterns (allow-list + parameterized binds) are explicitly documented. `## Findings` and `## Regression-prevention notes` present. ≥60 lines.</done>
</task>

<task type="auto">
  <name>Task 3: Author SEC-06-DEPENDENCIES.md + configure Dependabot + apply safe patch updates</name>
  <files>.planning/phases/42a-security-review-oauth-independent/SEC-06-DEPENDENCIES.md, .github/dependabot.yml, package.json, package-lock.json</files>
  <action>
Three deliverables in this task — combined because they all touch the dependency story:

### A. Run baseline audit
```
npm audit --json > /tmp/sec06-audit-before.json 2>&1 || true
npm audit > /tmp/sec06-audit-before.txt 2>&1 || true
```
Capture summary counts (info/low/moderate/high/critical) — the JSON tail summary block has them.

### B. Apply safe patch updates
For any **patch or minor** updates that fix a known advisory and don't cross a major-version boundary:
```
npm audit fix
npm run build  # must pass
# Run a representative subset of smoke tests to catch regressions:
npm run smoke:parse-batch-row
npm run smoke:scope-rollup
npm run smoke:metabase-import
```
If any build/smoke fails, revert with `git checkout -- package.json package-lock.json` and document the failure in the doc as a deferred finding (e.g., "audit-fix bumped X but broke smoke Y; defer to v5.5 DEBT").

DO NOT run `npm audit fix --force` (that crosses major boundaries). Major upgrades are out of scope per CONTEXT decisions.

### C. Configure Dependabot for security advisories only
Create `.github/dependabot.yml` using the shape in `<interfaces>` above. Use `open-pull-requests-limit: 0` to suppress weekly version-update PR noise — Dependabot security advisories bypass this limit and still get filed. Add `labels: [security]` so they're easy to triage.

### D. Author SEC-06-DEPENDENCIES.md
Required sections:

## Scope
One paragraph: this is the dependency security baseline for the `bounce-data-visualizer` app at the v4.5 close. Lists the npm registry as the only ecosystem (no Python, no Docker base images yet).

## Baseline `npm audit` state (before this phase)
Paste the summary line from `/tmp/sec06-audit-before.txt` (e.g., "found N vulnerabilities (X moderate, Y high)"). If there were any, table them: package → severity → advisory ID → reachable-from-app? → action taken.

## Safe updates applied in this phase
List every package whose version changed in `package.json` / `package-lock.json` due to `npm audit fix`. Format: `{pkg}: {oldVer} → {newVer} (fixes {advisory-id}, severity {sev})`. If none, write "No safe patch/minor updates were applicable."

## Post-fix `npm audit` state
Re-run `npm audit` and paste the summary. Confirm build + the three listed smoke tests pass.

## Deferred findings
For each remaining advisory (post-fix): package, advisory ID, severity, **reachability assessment** (is this code path actually reachable from the app, or is it in a dev-only / unreachable code path?), and disposition. Per CONTEXT: only high/critical findings on actually-reachable paths block phase close. Theoretical CVEs in dev-only deps are documented and deferred. If a high/critical reachable-path advisory exists and the fix needs a major upgrade, ESCALATE to 42a.X (do not silently defer).

## Major upgrade backlog (for v5.5 DEBT phase)
Inline notes (per CONTEXT — no Notion / Linear tickets). At minimum cover:
- **TanStack Table v9** (currently `@tanstack/react-table ^8.21.3`) — current → target, breaking changes (cite TanStack v9 migration guide if known), estimated effort, why it's deferred (no current advisory; this is a forward-looking polish).
- **TanStack React Query v6** (if applicable — currently ^5.97.0) — same shape.
- Any other dep currently on `^X` where `X+1` is shipping.

Each entry: pkg, current, target major, breaking changes summary, estimated effort, blocking advisory? (yes/no).

## Dependabot config rationale
Brief paragraph: why `open-pull-requests-limit: 0` (suppresses weekly version PR noise; CONTEXT decision); security advisories still get filed because they bypass that limit; the `security` label routes them through GitHub's advisory UI.

## Re-running this audit
Document the commands an auditor should re-run quarterly: `npm audit`, `npm outdated`, check Dependabot tab on GitHub.

Tone: Bounce eng team register — concise, actionable. The deferred-findings + major-upgrade-backlog sections are what v5.5 DEBT will consume, so they need enough detail to be actionable without re-discovering.

If `npm audit fix` produces a high-severity finding that needs a major upgrade and the fix is non-trivial (>~1 hour), ESCALATE to 42a.X — do not attempt the major upgrade in this plan.
  </action>
  <verify>
    <automated>
test -f .planning/phases/42a-security-review-oauth-independent/SEC-06-DEPENDENCIES.md && \
  test -f .github/dependabot.yml && \
  grep -q "package-ecosystem" .github/dependabot.yml && \
  grep -q "open-pull-requests-limit" .github/dependabot.yml && \
  grep -q "## Baseline" .planning/phases/42a-security-review-oauth-independent/SEC-06-DEPENDENCIES.md && \
  grep -q "## Major upgrade backlog" .planning/phases/42a-security-review-oauth-independent/SEC-06-DEPENDENCIES.md && \
  grep -q "## Deferred findings" .planning/phases/42a-security-review-oauth-independent/SEC-06-DEPENDENCIES.md && \
  npm run build > /dev/null 2>&1 && \
  wc -l .planning/phases/42a-security-review-oauth-independent/SEC-06-DEPENDENCIES.md | awk '$1 >= 50 {exit 0} {exit 1}'
    </automated>
  </verify>
  <done>SEC-06-DEPENDENCIES.md exists (≥50 lines) with baseline + post-fix `npm audit` state, list of any patch/minor updates applied, deferred findings with reachability assessment, and a major-upgrade backlog with at minimum a TanStack v9 entry. `.github/dependabot.yml` exists and is configured for security advisories only (`open-pull-requests-limit: 0`). `npm run build` passes after any package.json changes.</done>
</task>

</tasks>

<verification>
- All three docs exist in `.planning/phases/42a-security-review-oauth-independent/`
- `.github/dependabot.yml` exists with security-advisory-only config
- `npm run build` passes (catches any breakage from `npm audit fix`)
- All three smoke tests run during Task 3 pass
- No high/critical findings on reachable code paths are silently deferred — they are either fixed in this plan or have a recommendation in their respective doc to spin into a 42a.X decimal phase
- No external tickets filed (no Notion / Linear / R&D Backlog) — all deferred findings stay in-repo per skunkworks rule
</verification>

<success_criteria>
1. SEC-01-CREDENTIALS.md fully covers the Vercel env-var flow end-to-end + sourcemap/bundle inspection verdict + actual file references
2. SEC-03-SQL-INJECTION.md enumerates all 6 SQL-adjacent surfaces with per-surface verdicts and quoted construction snippets
3. SEC-06-DEPENDENCIES.md captures before/after audit state, applied updates, deferred findings with reachability, and v5.5 major-upgrade backlog
4. Dependabot config in place and scoped to security-only
5. Build green; representative smoke tests green
6. No high/critical reachable-path findings remain unaddressed
</success_criteria>

<output>
After completion, create `.planning/phases/42a-security-review-oauth-independent/42a-01-SUMMARY.md` covering: which findings were fixed inline, which were deferred (with severity + reason), what `npm audit fix` changed, what `npm run build` reported, and any escalation recommendations (42a.X decimal phases).
</output>
