# Phase 9: Vercel Deployment and Launch - Research

**Researched:** 2026-04-11
**Domain:** Vercel deployment, Next.js 16 serverless, Snowflake connectivity
**Confidence:** HIGH

## Summary

This phase deploys an existing Next.js 16.2.3 App Router application (pnpm, Tailwind 4, snowflake-sdk 2.4.0) to Vercel via GitHub integration. The app already has two API routes (`/api/data` and `/api/accounts`) that query Snowflake using a connection pool pattern. The deployment is straightforward since Vercel is the native deployment target for Next.js, pnpm is auto-detected from the lock file, and snowflake-sdk is pure JavaScript (no native C++ bindings).

The key work items are: (1) connecting the GitHub repo to Vercel, (2) configuring Snowflake environment variables in the Vercel dashboard, (3) adding `snowflake-sdk` to `serverExternalPackages` in `next.config.ts` since it uses Node.js-specific features and is not in Next.js's auto-externalize list, (4) creating a `/api/health` endpoint that verifies Snowflake connectivity, and (5) running a smoke test checklist before sharing with the team.

**Primary recommendation:** Use the standard Vercel + GitHub integration with auto-deploy on `main`. Add `snowflake-sdk` to `serverExternalPackages` in `next.config.ts`. Set Snowflake credentials as environment variables in the Vercel dashboard (Production + Preview environments). Create a health check endpoint. Build and verify before sharing.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Vercel subdomain: `bounce-data-viz.vercel.app` (preferred name)
- Open access -- no password protection or auth for now (security improvements deferred)
- Primary audience is partnerships team, with potential expansion to other Bounce teams later
- Auto-deploy on push to main branch (standard Vercel + GitHub integration)
- Connect existing GitHub repo -- no new repo needed
- Enable preview deployments for pull requests
- Vercel account TBD -- decide during deployment (personal vs team account)
- Only Snowflake credentials needed (no analytics, feature flags, or other API keys)
- Same Snowflake warehouse/database as local development -- one source of truth
- Credentials need to be set up fresh in Vercel environment variables (not yet in .env.local)
- Include a `/api/health` endpoint that confirms Snowflake connectivity -- helps debug deploy issues
- Quick walkthrough (live demo or Loom video) when sharing with the team
- Smoke test checklist before sharing -- verify key features work on deployed URL
- No formal feedback mechanism for now -- handle informally
- No hard deadline -- ship when ready

### Claude's Discretion
- Exact Vercel project configuration settings
- vercel.json contents and build settings
- Smoke test checklist items (based on what features exist at deploy time)
- Health check endpoint implementation details

### Deferred Ideas (OUT OF SCOPE)
- Password protection or SSO auth -- add in a future iteration when access control matters
- Formal feedback mechanism (in-app link or dedicated channel) -- add if needed after launch
- Custom domain (e.g., data.bounce.com) -- upgrade from Vercel subdomain later if desired
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DEPL-01 | App deployed to Vercel and accessible via URL | Vercel GitHub integration auto-deploys on push to main; pnpm auto-detected; Next.js 16 is a verified adapter on Vercel |
| DEPL-02 | Snowflake credentials stored securely in environment variables | Vercel dashboard env vars are encrypted at rest; existing `.env.example` lists the 7 required vars; no `NEXT_PUBLIC_` prefix needed since all Snowflake access is server-side only |
</phase_requirements>

## Standard Stack

### Core
| Library/Tool | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vercel Platform | Current | Hosting and deployment | Native deployment target for Next.js; verified adapter in Next.js 16 |
| Vercel CLI | Latest | Local build testing, env pull | Optional but helpful for `vercel env pull` to sync env vars |
| Next.js | 16.2.3 | Framework (already in project) | Vercel auto-detects and builds Next.js projects |
| pnpm | Auto-detected | Package manager (already in project) | Vercel auto-detects from `pnpm-lock.yaml` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Vercel GitHub Integration | Built-in | Auto-deploy on push | Always -- this is the primary deploy mechanism |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Vercel GitHub integration | Vercel CLI manual deploy | Loses auto-deploy on push and PR previews |
| Vercel environment variables | `.env.local` in repo | Security risk -- credentials in source control |

**Installation:**
No new packages needed. The project already has everything required.

## Architecture Patterns

### Recommended Project Structure Changes
```
src/
├── app/
│   ├── api/
│   │   ├── data/route.ts        # Existing -- Snowflake batch data
│   │   ├── accounts/route.ts    # Existing -- Snowflake account data
│   │   └── health/route.ts      # NEW -- Health check endpoint
├── lib/
│   └── snowflake/
│       ├── connection.ts         # Existing -- connection pool
│       └── queries.ts            # Existing -- query executor
next.config.ts                    # UPDATE -- add serverExternalPackages
```

### Pattern 1: serverExternalPackages for snowflake-sdk
**What:** Tell Next.js to not bundle `snowflake-sdk` into the serverless function and instead use native Node.js `require`. This is necessary because `snowflake-sdk` uses Node.js-specific features (file system, crypto, net) and has heavy dependencies (AWS SDK, Azure, Google Cloud libraries) that can cause bundling issues.
**When to use:** Always -- snowflake-sdk is NOT in Next.js 16's auto-externalize list.
**Example:**
```typescript
// next.config.ts
// Source: node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/serverExternalPackages.md
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['snowflake-sdk'],
};

export default nextConfig;
```

### Pattern 2: Health Check Endpoint with Snowflake Verification
**What:** A lightweight GET endpoint that confirms (a) the app is running and (b) Snowflake is reachable by executing a simple query.
**When to use:** Required by user decision. Helps debug deploy issues.
**Example:**
```typescript
// src/app/api/health/route.ts
import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/snowflake/queries';

export const dynamic = 'force-dynamic';

export async function GET() {
  const health: Record<string, unknown> = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'local',
  };

  try {
    const start = Date.now();
    await executeQuery('SELECT 1 AS ping');
    health.snowflake = {
      status: 'connected',
      latencyMs: Date.now() - start,
    };
  } catch (error) {
    health.status = 'degraded';
    health.snowflake = {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
    return NextResponse.json(health, { status: 503 });
  }

  return NextResponse.json(health);
}
```

### Pattern 3: Environment Variable Security
**What:** Snowflake credentials are server-side only. None use the `NEXT_PUBLIC_` prefix, so they are never exposed to the client bundle.
**When to use:** Always -- this is already correctly implemented in `src/lib/snowflake/connection.ts`.
**Verification:** The existing code reads from `process.env.SNOWFLAKE_*` without any `NEXT_PUBLIC_` prefix. These variables are only accessed in server-side API route handlers.

### Anti-Patterns to Avoid
- **Committing `.env.local` to git:** The `.gitignore` already excludes `.env*` files (except `.env.example`). Never override this.
- **Using `NEXT_PUBLIC_` prefix for Snowflake vars:** This would expose credentials in the client bundle. The current code correctly avoids this.
- **Setting `output: 'standalone'`:** Not needed for Vercel deployment. Vercel's adapter handles this automatically. Only needed for Docker/self-hosted deployments.
- **Creating a `vercel.json` for basic settings:** Not needed. Vercel auto-detects Next.js, pnpm, and build commands. Only add `vercel.json` if specific overrides are needed.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Deploy pipeline | Custom CI/CD scripts | Vercel GitHub integration | Auto-detects framework, package manager, build command |
| Environment variable management | `.env` file committed to repo | Vercel dashboard env vars | Encrypted at rest, scoped per environment |
| Preview deployments | Manual branch deploy scripts | Vercel PR previews | Automatic on every PR, comment with URL |
| SSL/HTTPS | Certificate management | Vercel automatic SSL | Free, auto-renewed, zero config |

**Key insight:** Vercel is the native host for Next.js. The default zero-config experience handles 95% of deployment needs. Only add configuration for specific requirements (like `serverExternalPackages`).

## Common Pitfalls

### Pitfall 1: snowflake-sdk Bundling Failure
**What goes wrong:** Build succeeds but API routes crash at runtime with module resolution errors because `snowflake-sdk` and its heavy dependency tree (AWS SDK, Azure, Google Cloud) fail to bundle correctly into the serverless function.
**Why it happens:** Next.js 16 bundles server dependencies by default. `snowflake-sdk` is not in the auto-externalize list, but it has complex Node.js-specific dependencies.
**How to avoid:** Add `snowflake-sdk` to `serverExternalPackages` in `next.config.ts`.
**Warning signs:** Runtime `MODULE_NOT_FOUND` errors, "Cannot find module" in function logs, or extremely slow cold starts from bundling all transitive dependencies.

### Pitfall 2: Snowflake Cold Start Timeout
**What goes wrong:** First request to an API route after function hibernation takes too long because Snowflake warehouse needs to wake up.
**Why it happens:** Snowflake warehouses with auto-suspend may take several seconds to resume. Combined with serverless cold start, total latency can be high.
**How to avoid:** With fluid compute (enabled by default on new Vercel projects since April 2025), Hobby plan functions get up to 300 seconds (5 minutes) of execution time. The existing 45-second query timeout in `queries.ts` is well within this limit. The health check endpoint can also serve as a keep-warm probe if needed.
**Warning signs:** 504 errors on first request, then subsequent requests work fine.

### Pitfall 3: Missing Environment Variables
**What goes wrong:** Deploy succeeds but all API routes return 500 errors.
**Why it happens:** Forgot to set Snowflake environment variables in Vercel dashboard, or set them only for Production but not Preview.
**How to avoid:** Use the health check endpoint (`/api/health`) immediately after first deploy to verify Snowflake connectivity. Set env vars for both Production and Preview environments.
**Warning signs:** The existing `validateEnv()` function in `connection.ts` throws a descriptive error listing missing variables -- check Vercel function logs.

### Pitfall 4: NEXT_PUBLIC_ Credential Leak
**What goes wrong:** Snowflake credentials become visible in the browser JavaScript bundle.
**Why it happens:** Someone accidentally adds `NEXT_PUBLIC_` prefix to Snowflake env vars.
**How to avoid:** The existing code correctly uses `SNOWFLAKE_*` without the public prefix. Never add `NEXT_PUBLIC_` to these variables in the Vercel dashboard.
**Warning signs:** Credentials visible in browser DevTools Network tab or source maps.

### Pitfall 5: Function Size Limit
**What goes wrong:** Deployment fails with "function size exceeds limit" error.
**Why it happens:** `snowflake-sdk` has a massive dependency tree (AWS SDK, Azure SDK, Google Cloud libraries) -- potentially exceeding the 250 MB compressed limit if fully bundled.
**How to avoid:** Using `serverExternalPackages` prevents bundling the package, keeping function size manageable. Vercel resolves external packages at runtime instead.
**Warning signs:** Build errors mentioning size limits, or extremely long build times.

## Code Examples

### Required Environment Variables (from existing .env.example)
```bash
SNOWFLAKE_ACCOUNT=      # e.g., xy12345.us-east-1
SNOWFLAKE_USERNAME=     # Service account username
SNOWFLAKE_PASSWORD=     # Service account password
SNOWFLAKE_WAREHOUSE=    # e.g., COMPUTE_WH
SNOWFLAKE_DATABASE=     # e.g., BOUNCE
SNOWFLAKE_SCHEMA=       # e.g., BOUNCE
SNOWFLAKE_ROLE=         # Optional -- e.g., ANALYST_ROLE
```
These 7 variables must be set in Vercel dashboard under Settings > Environment Variables for both Production and Preview environments.

### next.config.ts Update
```typescript
// Source: Next.js 16 docs (node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/serverExternalPackages.md)
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['snowflake-sdk'],
};

export default nextConfig;
```

### maxDuration Configuration (if needed)
```typescript
// In any API route file (e.g., src/app/api/data/route.ts)
// Source: Next.js 16 docs (node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/02-route-segment-config/maxDuration.md)
export const maxDuration = 60; // 60 seconds -- well within Hobby plan's 300s limit
```
Note: This is optional. The default 300s with fluid compute is likely sufficient. Only add if you want to set explicit limits.

### Smoke Test Checklist Pattern
After deployment, verify these items on the live URL:
1. App loads without errors (main page renders)
2. `/api/health` returns `{ status: "ok", snowflake: { status: "connected" } }`
3. Data table loads with live Snowflake data
4. Column sorting works (click any column header)
5. Column filtering works (text search and numeric range)
6. Column show/hide works
7. Column drag-to-reorder works
8. Saved views can be created and loaded
9. CSV export downloads correctly
10. Navigation/drill-down works (if Phase 8 is complete)
11. No Snowflake credentials visible in browser DevTools (Network tab, Sources tab)

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Vercel Hobby 10s function timeout | 300s with fluid compute (enabled by default) | April 2025 | Eliminates previous concern about Snowflake cold start vs 10s limit |
| `serverComponentsExternalPackages` | `serverExternalPackages` | Next.js 15.0.0 | Config key was renamed; use new name in Next.js 16 |
| Manual pnpm configuration on Vercel | Auto-detected from lock file | 2023+ | Zero config needed for pnpm projects |

**Deprecated/outdated:**
- `serverComponentsExternalPackages`: Renamed to `serverExternalPackages` in Next.js 15.0.0. The old name may still work but use the current name.
- 10-second Hobby plan timeout: No longer the default. Fluid compute gives 300s on all plans.

## Open Questions

1. **Vercel account type (personal vs team)**
   - What we know: User said "TBD -- decide during deployment"
   - What's unclear: Which Vercel account will be used
   - Recommendation: Either works. Personal account is fine for a small team tool. Team account allows adding collaborators who can see deploy logs. This is a runtime decision, not a code decision.

2. **Snowflake credentials availability**
   - What we know: Context says "Credentials need to be set up fresh in Vercel environment variables (not yet in .env.local)"
   - What's unclear: Whether the user has the credential values ready to paste into Vercel dashboard
   - Recommendation: The plan should include a step for the user to manually enter credentials. Claude cannot see or enter these values.

3. **Preferred Vercel subdomain availability**
   - What we know: User wants `bounce-data-viz.vercel.app`
   - What's unclear: Whether this subdomain is available (Vercel assigns based on project name)
   - Recommendation: Set project name to `bounce-data-viz` during setup. If taken, Vercel will suggest alternatives.

## Sources

### Primary (HIGH confidence)
- Next.js 16.2.3 bundled docs (`node_modules/next/dist/docs/`) -- deployment guide, serverExternalPackages, maxDuration, environment variables
- Vercel official docs (vercel.com/docs/functions/limitations) -- function limits, timeout, memory, bundle size
- Vercel official docs (vercel.com/docs/git/vercel-for-github) -- GitHub integration, auto-deploy, preview deployments
- Vercel official docs (vercel.com/docs/environment-variables) -- env var setup, encryption, scoping
- Existing codebase (`src/lib/snowflake/connection.ts`, `src/app/api/data/route.ts`) -- current Snowflake integration pattern

### Secondary (MEDIUM confidence)
- Vercel official changelog -- pnpm auto-detection, fluid compute default enablement
- Vercel official docs (vercel.com/docs/package-managers) -- pnpm v10 automatic support
- snowflake-sdk npm package.json -- confirmed pure JavaScript (no native bindings, no `binding.gyp`)

### Tertiary (LOW confidence)
- None -- all findings verified with primary or secondary sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- Vercel is the verified adapter for Next.js 16, pnpm auto-detected, well-documented path
- Architecture: HIGH -- minimal changes needed (one config update, one new API route), existing code is deployment-ready
- Pitfalls: HIGH -- verified against official docs (function limits, env var security, bundling behavior)

**Research date:** 2026-04-11
**Valid until:** 2026-05-11 (stable domain, unlikely to change)
