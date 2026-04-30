# SEC-01: Credential Handling Audit

**Phase:** 42a (Security Review — OAuth-independent)
**Date:** 2026-04-30
**Auditor:** Claude (gsd-executor) for Bounce eng team
**Status:** Closed — no high/critical findings

## Scope

This audit covers every secret credential the app reads at runtime:

1. **Snowflake credentials** (`SNOWFLAKE_*` family) — used by `src/lib/snowflake/connection.ts` to authenticate against `BOUNCE.BOUNCE.AGG_BATCH_PERFORMANCE_SUMMARY` and `BOUNCE.FINANCE.CURVES_RESULTS`. Three supported auth modes: `password`, `externalbrowser` (local Google SSO), `keypair` (Vercel-friendly RSA).
2. **Anthropic API key** (`ANTHROPIC_API_KEY`) — used by `src/lib/ai/system-prompt.ts` to gate the NLQ chat surface (`/api/query` route) against the Claude Sonnet model.

Non-secret build metadata (`VERCEL_GIT_COMMIT_SHA`, read by `/api/health` for the version banner) is excluded — it's a public commit SHA, not a credential.

## Read-sites (server-only)

| Env var | File:line | Auth mode | Notes |
| --- | --- | --- | --- |
| `SNOWFLAKE_AUTH` | `src/lib/snowflake/connection.ts:24` | n/a (selector) | Returns `password` \| `externalbrowser` \| `keypair`; default `password` |
| `SNOWFLAKE_ACCOUNT` | `src/lib/snowflake/connection.ts:67` | all | Required everywhere |
| `SNOWFLAKE_USERNAME` | `src/lib/snowflake/connection.ts:68` | all | Required everywhere |
| `SNOWFLAKE_WAREHOUSE` | `src/lib/snowflake/connection.ts:69` | all | Required everywhere |
| `SNOWFLAKE_DATABASE` | `src/lib/snowflake/connection.ts:70` | all | Required everywhere |
| `SNOWFLAKE_SCHEMA` | `src/lib/snowflake/connection.ts:71` | all | Required everywhere |
| `SNOWFLAKE_ROLE` | `src/lib/snowflake/connection.ts:72` | all | Optional |
| `SNOWFLAKE_PASSWORD` | `src/lib/snowflake/connection.ts:79` | password | Required only when `SNOWFLAKE_AUTH=password` |
| `SNOWFLAKE_PRIVATE_KEY` | `src/lib/snowflake/connection.ts:92` | keypair | PEM string OR base64-encoded PEM (Vercel-friendly) |
| `SNOWFLAKE_PRIVATE_KEY_PASS` | `src/lib/snowflake/connection.ts:93` | keypair | Optional (only if key is encrypted) |
| `ANTHROPIC_API_KEY` | `src/lib/ai/system-prompt.ts:18` | n/a | Gates `/api/query` route — absence yields a 503 with friendly message |
| `VERCEL_GIT_COMMIT_SHA` | `src/app/api/health/route.ts:11` | n/a | NON-SECRET (public commit SHA); excluded from the audit but listed here for completeness |

Surrounding code (verbatim, 2-3 lines each):

**Snowflake account/username (`connection.ts:67-71`)**
```ts
account: process.env.SNOWFLAKE_ACCOUNT!,
username: process.env.SNOWFLAKE_USERNAME!,
warehouse: process.env.SNOWFLAKE_WAREHOUSE!,
database: process.env.SNOWFLAKE_DATABASE!,
schema: process.env.SNOWFLAKE_SCHEMA!,
```

**Snowflake password (`connection.ts:78-79`, password-mode branch)**
```ts
case 'password':
  return { ...base, password: process.env.SNOWFLAKE_PASSWORD! };
```

**Snowflake keypair (`connection.ts:88-94`, keypair-mode branch)**
```ts
case 'keypair':
  return {
    ...base,
    authenticator: 'SNOWFLAKE_JWT',
    privateKey: parsePrivateKey(process.env.SNOWFLAKE_PRIVATE_KEY!),
    privateKeyPass: process.env.SNOWFLAKE_PRIVATE_KEY_PASS || undefined,
  };
```

**Anthropic API key (`system-prompt.ts:17-22`)**
```ts
export function validateAIConfig(): { available: boolean; reason?: string } {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { available: false, reason: 'ANTHROPIC_API_KEY not configured' };
  }
  return { available: true };
}
```

All read-sites are inside `src/lib/` modules consumed only by Next.js App Router server routes (`src/app/api/*/route.ts`). No `'use client'` file in `src/components/` or `src/app/` reads any of these env vars — verified by repo-wide grep (see Verification commands below).

## Vercel env-var flow (end-to-end)

### 1. Where the secret originates

- **Snowflake:** Snowflake admin UI (`Admin → Users → [user] → Reset password` for password mode; `Admin → Users → [user] → Add public key` for keypair mode after running `openssl genrsa 2048 | openssl pkcs8 -topk8 -inform PEM -nocrypt`). Externalbrowser SSO is local-dev-only — no static credential, the user authenticates with Bounce's Google SSO at runtime via a browser tab.
- **Anthropic:** Anthropic console (`console.anthropic.com → API Keys → Create Key`). API keys start with `sk-ant-`.

### 2. How it's stored in Vercel

Project Settings → Environment Variables → choose scope (Production / Preview / Development). Vercel encrypts values at rest. For Bounce's deploy:

- All `SNOWFLAKE_*` vars → Production scope only (no preview deploys hit Snowflake; previews fall through to static-cache mode via `isStaticMode()` in `src/lib/static-cache/fallback.ts`).
- `ANTHROPIC_API_KEY` → Production scope (preview deploys get 503 on `/api/query`, intentional).
- For keypair mode on Vercel, base64-encode the PEM (`base64 -i private_key.pem | pbcopy`) before pasting — Vercel's UI mangles raw newlines. `parsePrivateKey()` at `connection.ts:49-63` accepts either raw PEM (starts with `-----BEGIN`) or base64-encoded PEM (decodes and validates the `-----BEGIN` prefix).

### 3. How it reaches `process.env.*` at runtime

Next.js App Router routes run on Vercel Functions. Vercel injects environment variables at **runtime**, NOT at build time. Per Vercel's docs and Next.js's bundler behavior: only env vars prefixed `NEXT_PUBLIC_*` are inlined into the client bundle at build time. Everything else stays server-side and is read fresh on each function invocation via `process.env`.

This means:
- The Snowflake/Anthropic values never appear in any artifact shipped to the browser.
- Rotating a credential in Vercel's dashboard takes effect on the next function invocation (no rebuild needed for non-public env vars).

### 4. Why these secrets cannot leak to client

None of `SNOWFLAKE_*` or `ANTHROPIC_API_KEY` are prefixed `NEXT_PUBLIC_*`. Verified by grep:

```bash
grep -r "NEXT_PUBLIC_" src/
# (zero matches in src/ — no NEXT_PUBLIC_ vars exist in this codebase at all)
```

Even if a developer accidentally added `NEXT_PUBLIC_SNOWFLAKE_PASSWORD=...` to `.env.local`, the bundler would still need a `process.env.NEXT_PUBLIC_SNOWFLAKE_PASSWORD` reference somewhere in `src/` for it to be inlined — and there is none. Both layers (naming convention + reference site) would have to break for a leak.

### 5. Local dev path

`.env.example` (committed) provides the variable shape; developers `cp .env.example .env.local` and fill in their values. `.env.local` is gitignored (verified — see `.gitignore`).

For solo-dev convenience, `SNOWFLAKE_AUTH=externalbrowser` is the default in `.env.example` (line 9) — opens a browser tab and uses Bounce's Google SSO once per pool lifetime (24h default per snowflake-sdk's `clientStoreTemporaryCredential`). No password or PEM needs to live on the dev's disk.

Reference `.env.example` lines 7-26 for the supported auth modes.

## Client-bundle / sourcemap inspection

Built once with `npm run build` (Next.js 16.2.3 / Turbopack) — no errors, all 5 routes generated successfully.

### Static client bundle (`.next/static/`)

```bash
grep -rl "SNOWFLAKE_\|ANTHROPIC_API_KEY" .next/static/
# (zero matches — no env-var name literals in client bundle)

grep -r "process\.env\.SNOWFLAKE\|process\.env\.ANTHROPIC" .next/static/
# (zero matches — no process.env.SNOWFLAKE/ANTHROPIC reads in client bundle)
```

Case-insensitive sweep for the substrings `snowflake` / `anthropic` did surface two static chunks:

| File | Hit context | Verdict |
| --- | --- | --- |
| `.next/static/chunks/044zy_rm5ej3y.js` | `database:"snowflake"` (×5 occurrences inside switch-case blocks for SQL dialect selection) | **Benign — node-sql-parser dialect string** (used by Metabase SQL Import to parse Snowflake-flavored SQL into AST; structural-only, never authenticates against anything) |
| `.next/static/chunks/0qexd~w-iinm5.js` | `"source: snowflake · fetched 2 min ago · 1,234 rows"` | **Benign — UI demo string** in `src/components/tokens/patterns-specimen-data-panel.tsx:50` (visible only at `/tokens` design-system route) |

Neither hit references credentials, env-var names, or `process.env`. The `node-sql-parser` library ships a Snowflake-dialect parser as a build target (`node-sql-parser/build/snowflake.js`) — the string `"snowflake"` is a dialect identifier, not a credential.

### Static sourcemaps

```bash
find .next/static -type f -name "*.map" -exec grep -l "snowflake\|anthropic" {} \;
# (no .map files exist in .next/static/ in this build — Turbopack production build does not ship sourcemaps to clients)
```

### Server bundle (`.next/server/app/`) — for contrast

```bash
grep -rl "SNOWFLAKE_\|ANTHROPIC_API_KEY" .next/server/chunks/ | head
# .next/server/chunks/[root-of-the-server]__0w7bu-h._.js.map  (Snowflake env-var names)
# .next/server/chunks/node_modules__pnpm_0g2n8nl._.js          (Anthropic SDK references)
```

Server chunks DO contain references — that's correct. They're the runtime evaluation site and never reach a browser.

### Verdict

**Verified server-only credential handling.** No `SNOWFLAKE_*` or `ANTHROPIC_API_KEY` env-var names, `process.env.SNOWFLAKE`, or `process.env.ANTHROPIC` patterns appear in any client-shipped artifact. The two case-insensitive `snowflake` substring hits in static chunks are benign (SQL parser dialect string + UI demo string). No sourcemaps ship to the client.

## Findings

1. **No high or critical findings.** Static analysis + bundle inspection verified server-only credential handling. All read-sites are in server-side `lib/` modules consumed by App Router routes; no `NEXT_PUBLIC_*` aliases exist for any secret; no leak path through bundles or sourcemaps.

2. **(Low / informational)** The two `process.env.SNOWFLAKE_*` non-null assertions (`!`) in `connection.ts:67-93` are unguarded — if `validateEnv()` fails to catch a missing var (it shouldn't, but defense-in-depth), the snowflake-sdk would receive `undefined` and throw a less-friendly error. **Disposition:** documented inline; no action — `validateEnv()` is the gate, the `!` assertions are accurate post-gate. No security impact (a missing env var is a startup failure, not a leak).

3. **(Low / informational)** `parsePrivateKey()` at `connection.ts:49-63` accepts either raw PEM or base64-encoded PEM. Both paths require the decoded value to start with `-----BEGIN` — bogus input throws a clear error rather than silently passing garbage to snowflake-sdk. **Disposition:** verified safe; no action.

## Deferred (medium/low)

None. The two informational items above are documented inline and require no action.

Per `42a-CONTEXT.md` skunkworks rule, any future findings stay in this doc — no Notion / Linear tickets are filed.

## Verification commands (for re-running this audit later)

Run these in repo root, in order:

```bash
# 1. Confirm no NEXT_PUBLIC_ aliases in src/ (zero hits expected)
grep -r "NEXT_PUBLIC_" src/

# 2. Confirm read-sites are server-only (only lib/ and api/route.ts files)
grep -rn "process\.env\.\(SNOWFLAKE_\|ANTHROPIC_\|VERCEL_\)" src/

# 3. Build for inspection
npm run build

# 4. Static client bundle — credential names (zero hits expected)
grep -rl "SNOWFLAKE_\|ANTHROPIC_API_KEY" .next/static/

# 5. Static client bundle — process.env access (zero hits expected)
grep -r "process\.env\.SNOWFLAKE\|process\.env\.ANTHROPIC" .next/static/

# 6. Static sourcemaps for credential leakage (zero hits expected)
find .next/static -type f -name "*.map" -exec grep -l "snowflake\|anthropic" {} \;

# 7. Confirm server chunks DO contain references (sanity check that the above grep is working — should produce 1+ hits)
grep -rl "SNOWFLAKE_\|ANTHROPIC_API_KEY" .next/server/chunks/ | head
```

Steps 1, 4, 5, 6 should produce **zero** hits. Step 7 should produce **at least one** hit (server chunks are correct read-sites). Any deviation from this is a finding.

For the case-insensitive substring sweep that surfaced the two benign hits in this audit:

```bash
find .next/static -type f -name "*.js" -exec grep -l "snowflake\|anthropic" {} \;
# For any hit, inspect with: grep -oE ".{0,60}(snowflake|anthropic).{0,60}" <file>
# Expected benign hits: node-sql-parser dialect string, /tokens demo UI string.
# Anything else (e.g., env-var name, base64-encoded PEM, sk-ant- API key prefix) is a finding.
```

---

*Phase: 42a-security-review-oauth-independent*
*Audit completed: 2026-04-30*
