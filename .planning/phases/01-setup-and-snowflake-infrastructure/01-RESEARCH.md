# Phase 1: Setup and Snowflake Infrastructure - Research

**Researched:** 2026-04-10
**Domain:** Next.js scaffolding, Snowflake Node.js connectivity, data layer architecture
**Confidence:** HIGH

## Summary

Phase 1 establishes the full project foundation: a Next.js app with shadcn/ui, dark mode, sidebar layout, a Snowflake-connected API route, TanStack Query for client-side data management, and loading/error/empty states. The Snowflake Node.js SDK (`snowflake-sdk`) provides connection pooling out of the box via `createPool()`, which is critical for serverless environments where cold connections add ~2 seconds of overhead per request. TanStack Query v5 handles client-side caching, stale data tracking, and refetch orchestration.

The primary risk is Snowflake warehouse cold start latency. If the warehouse auto-suspends, resuming it can take 5-30 seconds, which combined with connection setup could exceed Vercel Hobby tier's 60-second function timeout. The API route should use connection pooling with `clientSessionKeepAlive: true` and the loading UX should account for multi-second waits.

**Primary recommendation:** Use `snowflake-sdk` with `createPool()` for connection management, wrap the callback-based API in async/await helpers, and let TanStack Query handle all client-side caching and staleness tracking.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Full dataset load (~533 rows) -- fetch all rows at once, filter/sort client-side
- Session-scoped caching -- cache query results for the session, no manual refresh needed between interactions
- Curated default columns (~20 most-used) with easy opt-in to all 61. User can change which columns load.
- Static/rarely-changing dimension data (partner names, account types, batch list) cached locally for speed
- Single `/api/data` endpoint that accepts query parameters (columns, filters), server-side code structured as modular query builders
- Loading: centered spinner with descriptive message ("Loading data from Snowflake...")
- Errors: inline error message in the main content area with a retry button. No toast notifications.
- Data freshness: always-visible timestamp ("Data as of 2:30 PM") plus visual indicator/warning when data is stale
- Empty state: clear message "No data matches your filters" with suggestion to adjust filters
- Component library: shadcn/ui + Tailwind CSS
- Page layout: sidebar + main content area from day one
- Dark mode: supported from day one with theme toggle
- TanStack Table for data grid (Phase 2), but scaffolding includes the shell/layout
- Hardcoded column config for known columns (type mapping: currency, percentage, count, text, etc.)
- Auto-detect fallback for untyped/new columns
- Null values display as dash (--) in all contexts
- Schema validation on startup: verify Snowflake schema matches expected column list, show warning on mismatch
- Visual style: clean and readable with creative presentation and subtle details. Not generic enterprise -- should feel distinctive.

### Claude's Discretion
- Exact spinner design and animation
- Stale data threshold timing
- Modular query builder internal architecture
- Tailwind theme token structure
- Dark mode toggle placement and mechanism

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DATA-01 | App connects to Snowflake and loads data from `agg_batch_performance_summary` | snowflake-sdk connection pooling, query execution patterns, env var credential management |
| DATA-02 | Loading states shown during data fetch, errors handled gracefully | TanStack Query `isLoading`/`isError`/`error` states, shadcn/ui Skeleton and Alert components |
| DATA-03 | Data refreshable on demand without page reload | TanStack Query `refetch()` function, staleTime/gcTime configuration |
| DEPL-02 | Snowflake credentials stored securely in environment variables | Next.js `.env.local` convention, server-only access via route handlers, never exposed to client bundle |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 15.x (latest stable) | Framework | App Router, file-based routing, API route handlers, server/client component model |
| react / react-dom | 19.x | UI library | Ships with Next.js 15, required for App Router |
| snowflake-sdk | 2.4.x | Snowflake connectivity | Official Snowflake Node.js driver, includes connection pooling via node-pool |
| @tanstack/react-query | 5.x | Async state management | Caching, refetch, stale tracking, loading/error states |
| tailwindcss | 4.x | Utility CSS | Ships with create-next-app, required by shadcn/ui |
| next-themes | 0.4.x | Theme management | Official shadcn/ui recommendation for dark mode |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| shadcn/ui | latest (CLI-installed) | Component primitives | Button, Card, Skeleton, Alert, Sidebar, DropdownMenu, Separator |
| lucide-react | latest | Icons | Sun/Moon toggle, refresh icon, error icon, spinner |
| typescript | 5.x | Type safety | Ships with create-next-app |
| zod | 3.x | Schema validation | Validate API query params, Snowflake response shape |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| snowflake-sdk | snowflake-pool (wrapper) | Extra dependency for marginal API improvement; raw SDK is sufficient |
| @tanstack/react-query | SWR | TanStack Query has richer devtools, better mutation support, and will pair with TanStack Table in Phase 2 |
| next-themes | Custom CSS vars | next-themes handles SSR hydration, system preference detection, and localStorage persistence automatically |

**Installation:**
```bash
# Scaffold project
pnpm create next-app@latest data-visualizer --yes
cd data-visualizer

# shadcn/ui init (sets up Tailwind, CSS vars, cn utility)
pnpm dlx shadcn@latest init

# Core dependencies
pnpm add snowflake-sdk @tanstack/react-query next-themes zod

# shadcn/ui components needed for Phase 1
pnpm dlx shadcn@latest add button card skeleton alert sidebar separator
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   ├── api/
│   │   └── data/
│   │       └── route.ts          # Single data endpoint (GET)
│   ├── layout.tsx                # Root layout (providers, sidebar shell)
│   ├── page.tsx                  # Main page (server component, prefetch)
│   ├── providers.tsx             # Client providers (QueryClient, ThemeProvider)
│   └── globals.css               # Tailwind + CSS custom properties
├── components/
│   ├── ui/                       # shadcn/ui components (auto-generated)
│   ├── layout/
│   │   ├── app-sidebar.tsx       # Sidebar navigation
│   │   ├── header.tsx            # Top bar with theme toggle, data freshness
│   │   └── main-content.tsx      # Content area wrapper
│   ├── data-display.tsx          # Data rendering (Phase 1: raw validation)
│   ├── loading-state.tsx         # Centered spinner with message
│   ├── error-state.tsx           # Inline error with retry button
│   ├── empty-state.tsx           # "No data" message
│   └── theme-toggle.tsx          # Dark/light mode switch
├── lib/
│   ├── snowflake/
│   │   ├── connection.ts         # Connection pool singleton
│   │   ├── queries.ts            # Query builder functions
│   │   └── types.ts              # Snowflake response types
│   ├── columns/
│   │   ├── config.ts             # Hardcoded column definitions (type, label, default visibility)
│   │   └── schema-validator.ts   # Compare Snowflake metadata to expected columns
│   ├── query-client.ts           # getQueryClient() helper
│   └── utils.ts                  # cn() and shared utilities
├── hooks/
│   └── use-data.ts               # useQuery wrapper for /api/data
└── types/
    └── data.ts                   # Shared TypeScript types
```

### Pattern 1: Snowflake Connection Pool Singleton
**What:** Create a single connection pool instance that persists across API route invocations in the same serverless container.
**When to use:** Every Snowflake query.
**Example:**
```typescript
// src/lib/snowflake/connection.ts
import snowflake from 'snowflake-sdk';

// Singleton pool -- survives across requests in the same serverless container
let pool: snowflake.ConnectionPool | null = null;

export function getPool(): snowflake.ConnectionPool {
  if (!pool) {
    pool = snowflake.createPool(
      {
        account: process.env.SNOWFLAKE_ACCOUNT!,
        username: process.env.SNOWFLAKE_USERNAME!,
        password: process.env.SNOWFLAKE_PASSWORD!,
        warehouse: process.env.SNOWFLAKE_WAREHOUSE!,
        database: process.env.SNOWFLAKE_DATABASE!,
        schema: process.env.SNOWFLAKE_SCHEMA!,
        role: process.env.SNOWFLAKE_ROLE,
        application: 'BounceDataVisualizer',
        clientSessionKeepAlive: true,
      },
      {
        max: 5,
        min: 0,
        evictionRunIntervalMillis: 60000,
        idleTimeoutMillis: 120000,
      }
    );
  }
  return pool;
}
```

### Pattern 2: Promise Wrapper for Snowflake Execute
**What:** The snowflake-sdk uses a callback-based API. Wrap it in promises for async/await usage.
**When to use:** Every query execution.
**Example:**
```typescript
// src/lib/snowflake/queries.ts
import { getPool } from './connection';

export async function executeQuery<T = Record<string, unknown>>(
  sqlText: string,
  binds?: (string | number)[]
): Promise<T[]> {
  const pool = getPool();
  return pool.use(async (connection) => {
    return new Promise<T[]>((resolve, reject) => {
      connection.execute({
        sqlText,
        binds,
        complete: (err, stmt, rows) => {
          if (err) reject(err);
          else resolve((rows ?? []) as T[]);
        },
      });
    });
  });
}
```

### Pattern 3: TanStack Query Provider Setup
**What:** Standard setup for TanStack Query v5 with Next.js App Router.
**When to use:** App-wide, in the root layout.
**Example:**
```typescript
// src/lib/query-client.ts
import { QueryClient, isServer } from '@tanstack/react-query';

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,  // 5 minutes -- data considered fresh
        gcTime: 30 * 60 * 1000,     // 30 minutes -- keep in cache
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

export function getQueryClient() {
  if (isServer) return makeQueryClient();
  if (!browserQueryClient) browserQueryClient = makeQueryClient();
  return browserQueryClient;
}
```

```typescript
// src/app/providers.tsx
'use client';
import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { getQueryClient } from '@/lib/query-client';

export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        {children}
      </ThemeProvider>
    </QueryClientProvider>
  );
}
```

### Pattern 4: API Route Handler with Error Handling
**What:** Next.js App Router route handler that queries Snowflake and returns JSON.
**When to use:** The `/api/data` endpoint.
**Example:**
```typescript
// src/app/api/data/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/snowflake/queries';

export const dynamic = 'force-dynamic'; // Never cache API responses

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const columns = searchParams.get('columns')?.split(',') ?? ['*'];

    // Build safe SQL (column whitelist validation)
    const columnList = columns[0] === '*'
      ? '*'
      : columns.filter(c => ALLOWED_COLUMNS.has(c)).join(', ');

    const rows = await executeQuery(
      `SELECT ${columnList} FROM agg_batch_performance_summary`
    );

    return NextResponse.json({
      data: rows,
      meta: {
        rowCount: rows.length,
        fetchedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Snowflake query error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data from Snowflake', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
```

### Pattern 5: Client Data Hook with Loading/Error States
**What:** useQuery hook that maps cleanly to the three UI states (loading, error, success).
**When to use:** Any component that displays Snowflake data.
**Example:**
```typescript
// src/hooks/use-data.ts
'use client';
import { useQuery } from '@tanstack/react-query';

interface DataResponse {
  data: Record<string, unknown>[];
  meta: { rowCount: number; fetchedAt: string };
}

export function useData(columns?: string[]) {
  const params = new URLSearchParams();
  if (columns?.length) params.set('columns', columns.join(','));

  return useQuery<DataResponse>({
    queryKey: ['data', columns],
    queryFn: async () => {
      const res = await fetch(`/api/data?${params}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Failed to fetch data');
      }
      return res.json();
    },
  });
}
```

### Anti-Patterns to Avoid
- **Creating a new Snowflake connection per request:** Each connection takes ~2s. Use the pool singleton.
- **Exposing Snowflake credentials to the client:** Never import snowflake-sdk in client components. All Snowflake access goes through route handlers only.
- **Building SQL with string concatenation from user input:** Always validate column names against an allow-list. Never interpolate raw user input into SQL.
- **Disabling TanStack Query caching and using custom state:** Let TanStack Query manage loading/error/stale states instead of manual `useState`/`useEffect`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Connection pooling | Custom pool manager | `snowflake.createPool()` | Built on node-pool, handles eviction, idle timeout, max connections |
| Dark mode toggle | Custom CSS class toggling + localStorage | `next-themes` + shadcn ThemeProvider | Handles SSR hydration, system preference, avoids flash of wrong theme |
| Loading/error state management | `useState` + `useEffect` + `fetch` | TanStack Query `useQuery` | Deduplication, caching, refetch, retry, devtools, stale tracking |
| Component primitives | Custom button/card/alert from scratch | shadcn/ui components | Accessible, themeable, Tailwind-native, source-owned |
| Sidebar layout | Custom flexbox/grid sidebar | shadcn/ui Sidebar component | Collapsible, mobile-aware, keyboard accessible, follows Radix patterns |
| API input validation | Manual `if` checks | zod schemas | Type inference, composable, clear error messages |

**Key insight:** Every "simple" thing on this list has 5-10 edge cases (hydration mismatch, focus trapping, connection leak, race conditions) that the standard tool handles and a hand-rolled version won't.

## Common Pitfalls

### Pitfall 1: Snowflake Warehouse Cold Start Timeout
**What goes wrong:** First query after warehouse auto-suspend takes 10-30 seconds. On Vercel Hobby tier (60s timeout), this can fail.
**Why it happens:** Snowflake warehouses auto-suspend after inactivity. Resuming provisions compute resources.
**How to avoid:** Set `clientSessionKeepAlive: true` in connection config. Show a clear loading message that accounts for multi-second waits. Consider a 45-second timeout in the API route to leave headroom. If the warehouse is XS size, cold starts are typically 5-10s.
**Warning signs:** Intermittent 504 Gateway Timeout errors, especially in mornings or after lunch.

### Pitfall 2: snowflake-sdk Callback API Misuse
**What goes wrong:** Forgetting to wrap callbacks in Promises, leading to unhandled errors or responses that never resolve.
**Why it happens:** The snowflake-sdk API is callback-based, not Promise-based. Mixing async/await with raw callbacks creates subtle bugs.
**How to avoid:** Create a single `executeQuery()` wrapper (see Pattern 2 above) and use it everywhere. Never call `connection.execute()` directly in route handlers.
**Warning signs:** API routes that hang indefinitely, unhandled promise rejections in logs.

### Pitfall 3: Client-Side Snowflake Import
**What goes wrong:** Importing `snowflake-sdk` in a file that gets bundled for the client causes a massive bundle and exposes credentials.
**Why it happens:** Next.js App Router bundles `'use client'` files for the browser. If snowflake code is imported transitively, it ends up in the client bundle.
**How to avoid:** Keep all Snowflake code in `src/lib/snowflake/` and only import it from `src/app/api/` route handlers (which are server-only). Never import from components.
**Warning signs:** Huge client bundle size, `fs` or `net` module errors in the browser console.

### Pitfall 4: Hydration Mismatch with Theme
**What goes wrong:** Server renders light mode, client detects dark mode preference, causing a flash and React hydration error.
**Why it happens:** Server has no access to `localStorage` or `prefers-color-scheme` media query.
**How to avoid:** Use `next-themes` with `suppressHydrationWarning` on `<html>`. The `next-themes` script injects the correct class before React hydrates.
**Warning signs:** Brief flash of white when loading in dark mode, console warnings about hydration mismatch.

### Pitfall 5: Stale Closure in TanStack Query Keys
**What goes wrong:** Changing selected columns doesn't trigger a refetch because the query key is stale.
**Why it happens:** Query key is a primitive instead of including the full dependency array.
**How to avoid:** Always include all variables that affect the query in the key: `queryKey: ['data', columns]`. TanStack Query automatically refetches when the key changes.
**Warning signs:** UI shows old data after changing column selection.

### Pitfall 6: SQL Injection via Column Names
**What goes wrong:** User-controlled column parameter injected directly into SQL string.
**Why it happens:** Column names can't be parameterized with bind variables in SQL -- they must be interpolated.
**How to avoid:** Maintain a server-side allow-list of valid column names. Filter requested columns against the allow-list before building the SQL string. Reject or ignore unknown column names.
**Warning signs:** Requested columns containing spaces, semicolons, or SQL keywords.

## Code Examples

### Dark Mode Theme Toggle
```typescript
// src/components/theme-toggle.tsx
'use client';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
    >
      <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
```

### Root Layout with Providers and Sidebar
```typescript
// src/app/layout.tsx
import { Providers } from './providers';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import './globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
              {children}
            </SidebarInset>
          </SidebarProvider>
        </Providers>
      </body>
    </html>
  );
}
```

### Column Configuration
```typescript
// src/lib/columns/config.ts
export interface ColumnConfig {
  key: string;           // Snowflake column name
  label: string;         // Display name
  type: 'text' | 'currency' | 'percentage' | 'count' | 'date' | 'number';
  defaultVisible: boolean;
  nullDisplay: string;   // Always '--'
}

export const COLUMN_CONFIGS: ColumnConfig[] = [
  { key: 'PARTNER_NAME', label: 'Partner', type: 'text', defaultVisible: true, nullDisplay: '\u2014' },
  { key: 'BATCH_NAME', label: 'Batch', type: 'text', defaultVisible: true, nullDisplay: '\u2014' },
  { key: 'TOTAL_BALANCE', label: 'Total Balance', type: 'currency', defaultVisible: true, nullDisplay: '\u2014' },
  { key: 'RECOVERY_RATE', label: 'Recovery Rate', type: 'percentage', defaultVisible: true, nullDisplay: '\u2014' },
  { key: 'ACCOUNT_COUNT', label: 'Accounts', type: 'count', defaultVisible: true, nullDisplay: '\u2014' },
  // ... remaining ~56 columns
];

export const DEFAULT_COLUMNS = COLUMN_CONFIGS
  .filter(c => c.defaultVisible)
  .map(c => c.key);

export const ALLOWED_COLUMNS = new Set(COLUMN_CONFIGS.map(c => c.key));
```

### Schema Validation
```typescript
// src/lib/columns/schema-validator.ts
import { executeQuery } from '@/lib/snowflake/queries';
import { COLUMN_CONFIGS } from './config';

interface SchemaColumn {
  COLUMN_NAME: string;
  DATA_TYPE: string;
}

export async function validateSchema(): Promise<{
  valid: boolean;
  missing: string[];
  unexpected: string[];
}> {
  const schemaRows = await executeQuery<SchemaColumn>(
    `SELECT COLUMN_NAME, DATA_TYPE
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_NAME = 'AGG_BATCH_PERFORMANCE_SUMMARY'
     ORDER BY ORDINAL_POSITION`
  );

  const snowflakeColumns = new Set(schemaRows.map(r => r.COLUMN_NAME));
  const expectedColumns = new Set(COLUMN_CONFIGS.map(c => c.key));

  const missing = [...expectedColumns].filter(c => !snowflakeColumns.has(c));
  const unexpected = [...snowflakeColumns].filter(c => !expectedColumns.has(c));

  return { valid: missing.length === 0, missing, unexpected };
}
```

### Environment Variables
```bash
# .env.local (never committed)
SNOWFLAKE_ACCOUNT=xy12345.us-east-1
SNOWFLAKE_USERNAME=bounce_data_viz
SNOWFLAKE_PASSWORD=<secure_password>
SNOWFLAKE_WAREHOUSE=COMPUTE_WH
SNOWFLAKE_DATABASE=ANALYTICS
SNOWFLAKE_SCHEMA=PUBLIC
SNOWFLAKE_ROLE=DATA_READER
```

```typescript
# .env.example (committed, shows required vars)
SNOWFLAKE_ACCOUNT=
SNOWFLAKE_USERNAME=
SNOWFLAKE_PASSWORD=
SNOWFLAKE_WAREHOUSE=
SNOWFLAKE_DATABASE=
SNOWFLAKE_SCHEMA=
SNOWFLAKE_ROLE=
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `pages/api/` route files | `app/api/*/route.ts` handlers | Next.js 13+ (stable 14+) | Web-standard Request/Response API, no `req.query` |
| React Query v3/v4 | TanStack Query v5 | 2023 | Simplified API, better SSR support, `gcTime` replaces `cacheTime` |
| `getServerSideProps` for data | Server Components + prefetchQuery | Next.js 13+ | No waterfall, streaming, simpler mental model |
| Manual dark mode CSS | next-themes + Tailwind `dark:` variant | Stable since 2023 | No flash, system preference, SSR-safe |
| snowflake-sdk callbacks only | Callbacks (still) but easily wrapped | Ongoing | SDK still callback-based; wrapping in Promises is the standard pattern |
| Tailwind v3 config file | Tailwind v4 CSS-first config | 2025 | `@theme` in CSS replaces `tailwind.config.ts` |

**Deprecated/outdated:**
- `cacheTime` in TanStack Query v5 -- renamed to `gcTime`
- `pages/api/` directory -- still works in Next.js 15 but not recommended for new projects
- `tailwind.config.ts` -- Tailwind v4 uses CSS-first configuration with `@theme` directive

## Open Questions

1. **Snowflake warehouse auto-suspend configuration**
   - What we know: Cold starts add 5-30s depending on warehouse size
   - What's unclear: Current warehouse size and auto-suspend timeout for the Bounce account
   - Recommendation: Ask Micah to check warehouse settings. If auto-suspend is aggressive (e.g., 1 minute), consider requesting 5-10 minute suspend timeout for better UX.

2. **Data refresh frequency of `agg_batch_performance_summary`**
   - What we know: Debt collection data refreshes on batch cycles, not real-time
   - What's unclear: How often the table is updated (hourly? daily? weekly?)
   - Recommendation: This determines appropriate `staleTime` in TanStack Query. Default to 5 minutes for now; adjust once frequency is known. The "data freshness" timestamp will show actual age regardless.

3. **Snowflake authentication method**
   - What we know: Password auth is simplest; key pair auth is more secure for production
   - What's unclear: Whether Bounce's Snowflake admin prefers password or key pair auth
   - Recommendation: Start with password auth (simplest setup). Migrate to key pair auth before production deployment in Phase 9 if needed.

4. **Exact column names in `agg_batch_performance_summary`**
   - What we know: 61 columns exist, ~20 are most-used
   - What's unclear: The actual column names, types, and which 20 are defaults
   - Recommendation: First task should query `INFORMATION_SCHEMA.COLUMNS` and use the results to populate `columns/config.ts`. This is a prerequisite for everything else.

## Sources

### Primary (HIGH confidence)
- [Snowflake Node.js Driver - Managing Connections](https://docs.snowflake.com/en/developer-guide/node-js/nodejs-driver-connect) - Connection pooling API, createPool(), eviction config
- [Snowflake Node.js Driver - Options Reference](https://docs.snowflake.com/en/developer-guide/node-js/nodejs-driver-options) - All connection options including clientSessionKeepAlive
- [Snowflake Node.js Driver - Executing Statements](https://docs.snowflake.com/en/developer-guide/node-js/nodejs-driver-execute) - execute() API, callbacks, bind parameters
- [snowflake-sdk npm](https://www.npmjs.com/package/snowflake-sdk) - Latest version 2.4.x confirmed
- [TanStack Query Advanced SSR](https://tanstack.com/query/latest/docs/framework/react/guides/advanced-ssr) - getQueryClient pattern, HydrationBoundary, prefetching
- [shadcn/ui Dark Mode - Next.js](https://ui.shadcn.com/docs/dark-mode/next) - ThemeProvider setup, next-themes integration
- [shadcn/ui Installation - Next.js](https://ui.shadcn.com/docs/installation/next) - npx shadcn@latest init, component CLI
- [Vercel Function Limits](https://vercel.com/docs/limits) - Hobby tier: 60s function timeout (300s with Fluid Compute)

### Secondary (MEDIUM confidence)
- [Snowflake Cold Start Issue #407](https://github.com/snowflakedb/snowflake-connector-nodejs/issues/407) - Connection latency reports in Lambda environments
- [Snowflake Connection Pool Issue #961](https://github.com/snowflakedb/snowflake-connector-nodejs/issues/961) - Community discussion on pooling gaps

### Tertiary (LOW confidence)
- Warehouse cold start timing (5-30s range) -- based on community reports, not official benchmarks. Actual timing depends on warehouse size and region.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries are well-documented, actively maintained, and form the canonical Next.js + Snowflake stack
- Architecture: HIGH - Patterns follow official TanStack Query SSR guide and Snowflake driver docs
- Pitfalls: HIGH - Cold start, callback wrapping, and SQL injection are well-documented issues
- Snowflake latency specifics: LOW - Depends on Bounce's warehouse configuration

**Research date:** 2026-04-10
**Valid until:** 2026-05-10 (30 days -- stable ecosystem, no major releases expected)
