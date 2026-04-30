# SEC-03: SQL Injection Surface Audit

**Phase:** 42a (Security Review — OAuth-independent)
**Date:** 2026-04-30
**Auditor:** Claude (gsd-executor) for Bounce eng team
**Status:** Closed — no high/critical findings

## Scope

This audit enumerates every server-side surface where SQL is constructed or where user input could conceivably reach Snowflake. Six surfaces in scope:

1. `/api/data` — `src/app/api/data/route.ts`
2. `/api/accounts` — `src/app/api/accounts/route.ts`
3. `/api/health` — `src/app/api/health/route.ts`
4. `/api/query` (NLQ context — see verdict for why this isn't actually a SQL surface) — `src/app/api/query/route.ts`
5. `/api/curves-results` — `src/app/api/curves-results/route.ts`
6. Metabase SQL Import parser — `src/lib/metabase-import/parse-metabase-sql.ts`

**Explicitly out of scope:** Text-to-SQL generation. Per `.planning/REQUIREMENTS.md` Out-of-Scope row: "Text-to-SQL generation" — the NLQ surface (`/api/query`) does NOT translate natural language into SQL. Claude only summarizes a server-pre-formatted `dataContext` string. No SQL-generating LLM path exists in this codebase today.

## The two safe patterns

The codebase uses exactly two patterns to construct SQL safely. Per-surface verdicts below reference these by name.

### Pattern A: Column allow-list interpolation

Column names are interpolated into the `SELECT` list via template literal (`${columnList}`), but **only after every column name has been filtered through an allow-list** (`ALLOWED_COLUMNS.has(c)` from `src/lib/columns/config.ts`, or `ACCOUNT_ALLOWED_COLUMNS.has(c)` from `account-config.ts`). The allow-list is a `Set<string>` of UPPERCASE Snowflake column names — exact membership check, no fuzzy matching, no regex.

The allow-list is built from `COLUMN_CONFIGS` (column registry), guaranteeing zero drift between displayable columns and queryable columns:

```ts
// src/lib/columns/config.ts:178
export const ALLOWED_COLUMNS = new Set(COLUMN_CONFIGS.map((c) => c.key));
```

Filter call shape (verbatim from `/api/data` route handler, `route.ts:39-42`):

```ts
selectedColumns = columnsParam
  .split(',')
  .map((c) => c.trim().toUpperCase())
  .filter((c) => ALLOWED_COLUMNS.has(c));
```

Any column name the user submits that is NOT in the allow-list is silently dropped. If the resulting list is empty, the route returns HTTP 400 — there is no path to a SQL query with attacker-controlled column names.

### Pattern B: Parameterized binds

Dynamic values (partner names, batch IDs, anything user-controlled that's not a column identifier) are passed as binds to snowflake-sdk's native `?` placeholder substitution — NOT string-interpolated.

Function signature (verbatim from `src/lib/snowflake/queries.ts:8-10`):

```ts
export async function executeQuery<T = Record<string, unknown>>(
  sqlText: string,
  binds?: (string | number)[]
): Promise<T[]> {
```

Forwarding to snowflake-sdk (`queries.ts:21-23`):

```ts
connection.execute({
  sqlText,
  binds,
```

snowflake-sdk performs server-side parameter binding — bind values never become part of the SQL text the warehouse parses. SQL injection via bind values is structurally impossible.

## Per-surface review

### `/api/data`

**File:** `src/app/api/data/route.ts:55-58`

```ts
// Build safe SQL -- column names are validated against the allow-list
const columnList = selectedColumns.join(', ');
const result = await executeWithReliability(
  () => executeQuery(`SELECT ${columnList} FROM agg_batch_performance_summary`),
```

User-controllable input: `request.nextUrl.searchParams.get('columns')` (a comma-separated column-name list).

Verdict: **✅ Safe via Pattern A (allow-list interpolation).**

The `columnList` template-literal interpolation is reachable, but `selectedColumns` is the post-filter result of `selectedColumns = columnsParam.split(',').map(c => c.trim().toUpperCase()).filter(c => ALLOWED_COLUMNS.has(c))` — every column has already been verified against the allow-list. Empty list → HTTP 400 (route.ts:44-49). The `FROM` clause is hard-coded (no user input touches the table name). No `WHERE`, `LIMIT`, `OFFSET` clauses accept user input on this surface today. No `executeQuery` binds — there's nothing user-controlled to bind.

**What would have to change to make this unsafe:** If `/api/data` ever accepted a `where`, `orderBy`, or `limit` query parameter and interpolated it directly, the allow-list wouldn't cover that. Any future PR adding filter clauses to `/api/data` MUST either (a) bind via Pattern B, or (b) introduce a new allow-list scoped to the new clause. Flagged for review checklist.

### `/api/accounts`

**File:** `src/app/api/accounts/route.ts:44-50`

```ts
const columnList = Array.from(ACCOUNT_ALLOWED_COLUMNS).join(', ');
const result = await executeWithReliability(
  () =>
    executeQuery(
      `SELECT ${columnList} FROM master_accounts WHERE PARTNER_NAME = ? AND BATCH = ?`,
      [partner, batch],
    ),
```

User-controllable input: `partner` and `batch` query parameters (validated as non-empty strings at `route.ts:22-28`).

Verdict: **✅ Safe via Pattern A + Pattern B.**

- Column list comes verbatim from `ACCOUNT_ALLOWED_COLUMNS` (`Array.from(ACCOUNT_ALLOWED_COLUMNS).join(', ')`) — no user input touches the column list at all.
- `partner` and `batch` are passed as the two `?` binds in the third argument to `executeQuery`. snowflake-sdk handles parameter binding server-side; the SQL text the warehouse parses is `SELECT ... FROM master_accounts WHERE PARTNER_NAME = ? AND BATCH = ?` regardless of what the user sends. SQL injection via these inputs is structurally impossible.

**What would have to change to make this unsafe:** If a developer ever inlined `${partner}` or `${batch}` into the template literal instead of using binds — that would be a Rule 1 bug, caught at code review. Reinforced in regression-prevention notes below.

### `/api/health`

**File:** `src/app/api/health/route.ts:22`

```ts
await executeQuery('SELECT 1 AS ping');
```

User-controllable input: **none.** The query is a static string literal with no interpolation, no binds, no user-derived components.

Verdict: **✅ Safe — no user input.**

### `/api/query` (NLQ chat surface)

**File:** `src/app/api/query/route.ts:117-122`

```ts
const result = streamText({
  model: anthropic(CLAUDE_MODEL),
  system: systemPrompt,
  messages: await convertToModelMessages(uiMessages),
  maxOutputTokens: 1024,
});
```

Verdict: **✅ NOT a SQL surface — no Snowflake call from this route.**

The `/api/query` route streams Claude responses based on:
1. A server-built system prompt (`buildSystemPrompt(drillState, dataContext, filters)` from `src/lib/ai/system-prompt.ts`)
2. A pre-formatted `dataContext` string supplied by the client (already-fetched data summary, plain text — not SQL)
3. The user's chat messages (UIMessages, plain text)

Zero SQL is generated, parsed, or executed by this route. The Snowflake connection pool (`getPool()`) is not called from `/api/query`'s code path, transitively or directly.

The risk shape on this surface is **prompt injection**, not SQL injection — covered in SEC-04 (forward threat model), not SEC-03. SEC-03 is closed for `/api/query`.

### `/api/curves-results`

**File:** `src/app/api/curves-results/route.ts:32-73, 93-95`

The query is a multi-CTE static string literal pinned at module scope (`CURVES_SQL` constant, lines 32-73), executed with zero binds:

```ts
const result = await executeWithReliability<CurvesResultsWireRow[]>(
  () => executeQuery<CurvesResultsWireRow>(CURVES_SQL),
  { requestId, queryDescription: 'curves-results' }
);
```

User-controllable input: **none.** The route is `GET` with no query parameters; the SQL has no template-literal interpolation, no binds, no derived components. The CTE references `BOUNCE.FINANCE.CURVES_RESULTS` (hard-coded) and emits cumulative-summed projection data for the entire warehouse fact table. Filtering happens client-side (per CONTEXT lock — chart renders actuals + all-batch projections).

Verdict: **✅ Safe — fully static SQL, no user input.**

**What would have to change to make this unsafe:** If the route ever accepted a `lender` or `batch` filter at the SQL level (rather than client-side), it would need Pattern B (parameterized binds). Today the all-data fetch is intentional per the CONTEXT lock.

### `src/lib/metabase-import/parse-metabase-sql.ts`

**File:** `src/lib/metabase-import/parse-metabase-sql.ts:546-560`

User-controllable input: a Metabase-flavored SQL string the user pastes into the import wizard (`parseMetabaseSql(sql)`).

Critical fact for this audit: **the user-pasted SQL is NEVER executed against Snowflake.** It is parsed by `node-sql-parser` (Snowflake-dialect build) into an AST and structurally translated into a normalized `ParseResult` (matched columns, filters, sort, chart inference, unsupported constructs). The `ParseResult` is then mapped into a `ViewSnapshot` that drives the existing client-side filter pipeline against already-fetched data — no new SQL ever reaches the warehouse.

Allow-list enforcement at the column boundary (`parse-metabase-sql.ts:166-178`):

```ts
const resolved = resolveColumnRef(expr);
if (resolved) {
  if (ALLOWED_COLUMNS.has(resolved.key)) {
    matched.push({
      key: resolved.key,
      alias,
      label: labelByKey.get(resolved.key) ?? resolved.key,
    });
  } else {
    skipped.push({ raw: resolved.raw, reason: 'column not in schema' });
  }
  continue;
}
```

Verdict: **✅ Safe — structural-only; never executes user SQL against Snowflake.**

The allow-list also gates filters (`parse-metabase-sql.ts:322`), `ORDER BY` (`parse-metabase-sql.ts:472`), and (via Phase 37 Defect 5) enum-value validation on `=` and `IN` (`parse-metabase-sql.ts:349-356, 381-397`). Aggregates, JOINs, CTEs, GROUP BY, window functions, OR branches, and non-SELECT statements are routed into `unsupportedConstructs` rather than translated. The parser explicitly drops Metabase template tags (`{{var}}`, `[[ ... ]]`) before parsing (`parse-metabase-sql.ts:59-63`) — these would otherwise crash the parser. Per the file's docstring (line 22): "This module is PURE: no DOM, no React, no localStorage, no network."

**What would have to change to make this unsafe:** If a future feature ever piped `parseMetabaseSql`'s input directly to `executeQuery(sql)` without the AST-to-snapshot-to-client-filter detour, all bets are off. The current architecture makes this a multi-file refactor — caught at design review.

## Findings

1. **No high or critical findings.** All six surfaces verified safe. Five surfaces hit Snowflake; the sixth (`/api/query`) doesn't generate SQL at all. Of the five that hit Snowflake:
   - 1 uses Pattern A only (`/api/data` — column allow-list)
   - 1 uses Pattern A + Pattern B (`/api/accounts` — column allow-list + parameterized binds for partner/batch)
   - 3 use static SQL with no user input (`/api/health`, `/api/curves-results`, `metabase-import` is structural-only)
2. **(Low / informational)** No `executeQuery` callsite outside `/api/accounts` currently uses the `binds` parameter. This is correct given the surfaces today (no other surface accepts user values that need binding) but means the bind path is exercised by exactly one route in production. Disposition: noted; no action.

## Regression-prevention notes

Patterns to enforce in future PRs:

1. **Any new `executeQuery(sqlText)` call that interpolates a string into `sqlText` MUST come with a corresponding allow-list check** for the interpolated identifier. The allow-list lives at `src/lib/columns/config.ts` (`ALLOWED_COLUMNS`) for the batch-summary table and `src/lib/columns/account-config.ts` (`ACCOUNT_ALLOWED_COLUMNS`) for master_accounts. New tables get their own allow-list registered alongside their column config.
2. **Any new `executeQuery` call that needs to filter on user-supplied values MUST use the `binds` parameter** (Pattern B) rather than template-literal interpolation. The signature `executeQuery(sqlText, binds?: (string | number)[])` is the contract; snowflake-sdk handles parameter binding server-side.
3. **Any new API route that accepts query parameters MUST declare its safe pattern in a code comment** above the SQL construction. The existing `/api/data` route's comment ("Build safe SQL -- column names are validated against the allow-list", `route.ts:55`) is the model. This makes the audit trail self-documenting.
4. **Metabase SQL Import is structural-only** — `parseMetabaseSql`'s output (`ParseResult`) feeds the AST-to-snapshot pipeline (`map-to-snapshot.ts`), which feeds the client-side filter evaluator. There is no path from parsed user SQL to `executeQuery`. Future Metabase-import features must preserve this invariant.
5. **NLQ (`/api/query`) does NOT generate SQL** — per `.planning/REQUIREMENTS.md` Out-of-Scope. If a future feature ever needs Claude-generated SQL, it MUST go through Pattern A (column allow-list) + Pattern B (binds for values), and the SQL it emits MUST be re-validated against the allow-list before reaching `executeQuery`. Prompt-injection-driven SQL crafting is the threat — re-validation post-LLM is the mitigation.

## Verification commands (for re-running this audit later)

```bash
# 1. Enumerate every executeQuery callsite (should match the 5 reviewed surfaces)
grep -rn "executeQuery(" src/app/ src/lib/

# 2. Confirm only /api/accounts uses parameterized binds today
grep -rn "executeQuery.*\[.*\]" src/app/

# 3. Confirm allow-list filter call shape exists in /api/data
grep -A 3 "ALLOWED_COLUMNS\.has" src/app/api/data/route.ts

# 4. Confirm no executeQuery anywhere uses dynamic FROM (table-name interpolation)
grep -rn "FROM \${" src/

# 5. Confirm the Metabase parser file imports ALLOWED_COLUMNS at the column boundary
grep -n "ALLOWED_COLUMNS" src/lib/metabase-import/parse-metabase-sql.ts

# 6. Confirm /api/query does NOT call executeQuery (zero hits expected)
grep -n "executeQuery" src/app/api/query/route.ts
```

Steps 4 and 6 should produce **zero** hits. Any new hit on step 4 is a Rule 1 bug (template-literal table-name interpolation). Any new hit on step 6 is an architectural change requiring SEC-04 review (Claude-generated-SQL would be a new threat surface).

---

*Phase: 42a-security-review-oauth-independent*
*Audit completed: 2026-04-30*
