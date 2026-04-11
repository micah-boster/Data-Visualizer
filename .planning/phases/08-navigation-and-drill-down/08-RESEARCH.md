# Phase 8: Navigation and Drill-Down - Research

**Researched:** 2026-04-11
**Domain:** Hierarchical drill-down navigation, URL state management, breadcrumb UI
**Confidence:** HIGH

## Summary

Phase 8 adds hierarchical drill-down navigation to the existing data table. Users click a partner name to filter to that partner's batches, then click a batch to see account-level detail from the `master_accounts` Snowflake table. A breadcrumb trail shows the current drill path and allows navigation back up. All navigation happens in-place on the same page -- no new routes.

The existing codebase is well-prepared for this. The `useFilterState` hook already manages URL-backed filter state via `useSearchParams` and `useRouter`. The key architectural challenge is introducing a **drill-down level** concept (root / partner / batch) that determines which data source to query, which columns to show, and how the breadcrumb renders -- while keeping the existing filter bar and table infrastructure largely intact.

**Primary recommendation:** Introduce a `useDrillDown` hook that manages drill-down level and state separately from the filter bar's `useFilterState`. Drill-down uses `router.push` (creates history entries for back-button support), while filters continue using `router.replace` (no history pollution). The drill-down state lives in URL params (`drillPartner`, `drillBatch`) distinct from filter params (`partner`, `type`, `batch`).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Filter in place -- clicking a partner name filters the current table to that partner's rows, no page navigation
- Click target is the partner name cell only (styled as a link), not the entire row
- At the batch summary level (agg_batch_performance_summary), drilling into a partner shows the same 61 columns, just filtered to that partner
- At the account level (master_accounts), a curated default column set is shown (not all 78 columns)
- Account-level view uses the same table experience -- sortable, formatted, same UI patterns as the batch table
- Instant filter on drill-down -- no transition animations
- Breadcrumb always visible, even at root level (shows "All Batches" as baseline)
- Breadcrumb positioned between the filter bar and the table
- Root label: "All Batches"
- Each breadcrumb segment shows row count: "All Batches (533) > Partner: Acme (12) > Batch: 2024-Q1 (847)"
- Every segment is clickable to navigate back up to that level
- `master_accounts` table confirmed available in Snowflake (78 columns)
- Join/filter path: batch-level rows link to master_accounts via PARTNER_NAME + BATCH columns
- Full two-level hierarchy ships in Phase 8: partner -> batches AND batch -> accounts
- Drilling down clears all active filters (fresh slate at each level)
- Navigating back up via breadcrumb restores the previous filter/sort state that was active before drilling down
- Drill-down state reflected in URL query params -- views are shareable and bookmarkable
- Browser back button navigates up the drill hierarchy (matches breadcrumb behavior)

### Claude's Discretion
- Curated default column set for account-level view (pick the most useful ~15-20 columns)
- Exact breadcrumb styling and separator character
- How to store/restore previous filter state (stack, URL history, etc.)
- Loading state while fetching account-level data from Snowflake

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| NAV-01 | User can click a partner to see their batches | Drill-down hook + clickable partner cell pattern |
| NAV-02 | User can click a batch to see account-level detail | New API route for master_accounts + account column config |
| NAV-03 | Breadcrumb navigation shows current drill path | Breadcrumb component with row counts |
| NAV-04 | User can navigate back up the drill hierarchy | Breadcrumb click handlers + browser history integration |
</phase_requirements>

## Standard Stack

### Core (already in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 16.2.3 | Framework, routing, API routes | Already in use; `useRouter`, `useSearchParams` for URL state |
| @tanstack/react-table | 8.21.3 | Table rendering, sorting, filtering | Already powers the data table; reuse for account-level view |
| @tanstack/react-query | 5.97.0 | Server state management | Already used for data fetching; add query for master_accounts |
| snowflake-sdk | 2.4.0 | Snowflake connectivity | Already used; extend queries for master_accounts table |
| lucide-react | 1.8.0 | Icons | Already used; ChevronRight for breadcrumb separator |

### No New Dependencies Required

This phase requires zero new dependencies. All functionality is built from existing libraries and browser APIs.

## Architecture Patterns

### Recommended Structure

```
src/
  components/
    navigation/
      breadcrumb-trail.tsx       # Breadcrumb component with row counts
      drillable-cell.tsx         # Clickable partner/batch cell renderer
    table/
      data-table.tsx             # Modified to accept drill-down context
  hooks/
    use-drill-down.ts            # Drill-down state management hook
    use-account-data.ts          # TanStack Query hook for master_accounts
  lib/
    columns/
      account-config.ts          # master_accounts column definitions
      account-definitions.ts     # TanStack ColumnDef[] for accounts
    snowflake/
      queries.ts                 # Extended with account query
  app/
    api/
      accounts/
        route.ts                 # New API route for master_accounts
```

### Pattern 1: Drill-Down State via URL Params (router.push)

**What:** Drill-down level is encoded in URL search params. Drilling down uses `router.push` to create browser history entries. Filter changes continue using `router.replace` (no history entries).

**When to use:** When drill-down navigation must support browser back button AND shareable URLs.

**Key insight:** The existing `useFilterState` uses `router.replace` which does NOT create history entries. Drill-down must use `router.push` instead, so the browser back button walks back up the hierarchy. This means drill-down params must be managed by a separate hook.

**Example:**
```typescript
// URL at root level:
// /?partner=Acme&type=Auto  (filters active)

// User clicks partner "Acme" to drill down:
// /?drillPartner=Acme  (filters cleared, drill state set via router.push)

// User clicks batch "2024-Q1" to drill further:
// /?drillPartner=Acme&drillBatch=2024-Q1  (via router.push)

// Browser back -> returns to /?drillPartner=Acme
// Browser back -> returns to /?partner=Acme&type=Auto (original filters)
```

### Pattern 2: Three Drill Levels with Distinct Data Sources

**What:** The app has three logical views -- all managed by the same page component, but switching data source and columns based on drill level.

| Level | Data Source | Table | Columns |
|-------|-------------|-------|---------|
| Root | `agg_batch_performance_summary` (all rows) | Batch summary | 61 columns (presets apply) |
| Partner | `agg_batch_performance_summary` (filtered by partner) | Batch summary | Same 61 columns |
| Batch | `master_accounts` (filtered by partner + batch) | Account detail | Curated ~18 columns |

**Key insight:** Levels 0 and 1 use the SAME data (already loaded by `useData`) -- just client-side filtered. Only level 2 (account detail) requires a new API call. This means the partner drill-down is instant (no loading state needed).

### Pattern 3: Filter State Preservation via URL Encoding

**What:** When drilling down, encode the current filter/sort state so it can be restored when navigating back up via breadcrumb.

**Approach:** Use `router.push` for drill-down transitions. The browser history stack naturally preserves the previous URL (with its filter params). When a user clicks a breadcrumb to go back up, reconstruct the URL for that level. For "back to root" -- restore the URL that was active before drilling down.

**Implementation detail:** Store a `drillFrom` param in the URL that encodes the pre-drill filter state as a base64 JSON string. When navigating back via breadcrumb to root, decode and restore. This is simpler than maintaining a separate in-memory stack and survives page refresh.

```typescript
// Before drill: /?partner=Acme&type=Auto
// After drill:  /?drillPartner=Acme&drillFrom=eyJwYXJ0bmVyIjoiQWNtZSIsInR5cGUiOiJBdXRvIn0

// drillFrom = base64(JSON.stringify({ partner: "Acme", type: "Auto" }))
```

**Alternative (simpler):** Since drilling down clears filters, and the user decision says "navigating back via breadcrumb restores the previous filter/sort state", the cleanest approach is to use `router.push` for drill-down and let the browser history stack handle restoration. Clicking "All Batches" breadcrumb does `router.back()` or navigates to the stored pre-drill URL. Given that the breadcrumb must allow clicking ANY segment (not just going back one level), a `drillFrom` param or sessionStorage approach is more reliable than `router.back()`.

**Recommendation:** Use a lightweight `drillFrom` URL param (base64-encoded pre-drill filters). This keeps everything in the URL (shareable), survives refresh, and handles multi-level back navigation correctly.

### Pattern 4: Clickable Cell Renderer

**What:** The PARTNER_NAME column cell renders as a styled link (underline, cursor pointer) that triggers drill-down on click.

**Key insight:** The existing `getCellRenderer` in `formatted-cell.tsx` handles text columns by returning `String(value)`. For drill-down, the PARTNER_NAME cell needs to be wrapped in a clickable element. This should be done via a custom cell renderer in the column definition, not by modifying the generic text renderer.

```typescript
// In column definitions, override the PARTNER_NAME cell:
{
  id: 'PARTNER_NAME',
  accessorKey: 'PARTNER_NAME',
  cell: ({ getValue }) => {
    const value = String(getValue());
    return (
      <DrillableCell value={value} onDrill={() => drillToPartner(value)} />
    );
  },
}
```

### Anti-Patterns to Avoid
- **Separate routes for each drill level:** The user explicitly decided "filter in place, no page navigation." Do NOT create `/partner/[name]` routes.
- **Modifying useFilterState for drill-down:** Drill-down and filters are separate concerns with different history semantics (push vs replace). Keep them in separate hooks.
- **Fetching all master_accounts upfront:** The table has 78 columns and potentially thousands of rows per batch. Always filter server-side via the API route with PARTNER_NAME + BATCH params.
- **Storing drill state in React state only:** Must be in URL for shareability and back-button support.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| URL search param management | Custom URL parser | `URLSearchParams` + `useSearchParams` | Already established pattern in codebase |
| Table rendering for accounts | New table component | Reuse `DataTable` with different column defs | Same UX, same virtual scrolling, same formatting |
| Data fetching for accounts | Manual fetch | `useQuery` from TanStack Query | Caching, loading states, error handling for free |
| Browser history management | Custom history stack | `router.push` / native browser history | Browser handles forward/back natively |

## Common Pitfalls

### Pitfall 1: router.push vs router.replace Confusion
**What goes wrong:** Using `router.replace` for drill-down means browser back button doesn't work. Using `router.push` for filter changes creates excessive history entries.
**Why it happens:** The existing `useFilterState` uses `replace` everywhere. Easy to copy that pattern.
**How to avoid:** Drill-down hook MUST use `router.push`. Filter hook continues with `router.replace`. Document this explicitly in the hook.
**Warning signs:** Browser back button doesn't navigate up drill hierarchy.

### Pitfall 2: Stale Data After Drill-Down Level Change
**What goes wrong:** Switching from batch-level to account-level data but the table still shows batch columns, or vice versa.
**Why it happens:** Column definitions and data source must change atomically when drill level changes.
**How to avoid:** Derive both `data` and `columnDefs` from the current drill level in a single hook. Use a key prop on DataTable to force remount when switching between batch and account views.
**Warning signs:** Column headers don't match data, or "undefined" cells appear.

### Pitfall 3: Account Data Query Includes All 78 Columns
**What goes wrong:** Fetching all 78 columns from master_accounts when only ~18 are needed. Slow queries, wasted bandwidth.
**Why it happens:** Copying the existing API pattern which selects all columns.
**How to avoid:** The account API route should have its own ALLOWED_COLUMNS set, and only fetch the curated columns by default.
**Warning signs:** Slow account-level drill-down, wide table with many empty/irrelevant columns.

### Pitfall 4: SQL Injection on Account Query
**What goes wrong:** Concatenating partner name or batch ID directly into SQL query.
**Why it happens:** The existing query in `queries.ts` doesn't use parameterized values (the agg table query has no WHERE clause).
**How to avoid:** Use the `binds` parameter in `executeQuery` for all WHERE clause values. The function already supports it.
**Warning signs:** N/A -- must be correct from the start.

### Pitfall 5: Breadcrumb Row Count Shows Stale Numbers
**What goes wrong:** Breadcrumb shows row count from before filters were applied, or wrong count after data refresh.
**Why it happens:** Row count is computed from wrong data source or cached improperly.
**How to avoid:** Compute row counts from the actual TanStack Table `getRowModel().rows.length` (post-filter count) for the current level. For parent breadcrumb segments, store the count at drill time.
**Warning signs:** Breadcrumb says "533 rows" but table shows 12 rows.

### Pitfall 6: Filter Bar Interaction at Account Level
**What goes wrong:** Filter bar still shows partner/batch/type dropdowns at account level, but they filter on columns that don't exist in master_accounts, or they conflict with the drill-down state.
**Why it happens:** Filter bar is always rendered regardless of drill level.
**How to avoid:** Hide or disable the filter bar when at account level (since the user decided "drilling down clears all active filters"). Or adapt the filter bar to show account-relevant filters at that level. Simplest approach: hide filter bar at account level and show a "Showing accounts for Partner: X, Batch: Y" inline label.
**Warning signs:** Filter dropdowns show wrong options at account level.

## Code Examples

### useDrillDown Hook

```typescript
// src/hooks/use-drill-down.ts
'use client';

import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { useCallback, useMemo } from 'react';

export type DrillLevel = 'root' | 'partner' | 'batch';

export interface DrillState {
  level: DrillLevel;
  partner: string | null;
  batch: string | null;
}

export function useDrillDown() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const state: DrillState = useMemo(() => {
    const partner = searchParams.get('drillPartner');
    const batch = searchParams.get('drillBatch');
    if (batch && partner) return { level: 'batch', partner, batch };
    if (partner) return { level: 'partner', partner, batch: null };
    return { level: 'root', partner: null, batch: null };
  }, [searchParams]);

  const drillToPartner = useCallback((partnerName: string) => {
    // Save current filter state for restoration
    const currentFilters: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      if (!key.startsWith('drill')) currentFilters[key] = value;
    });
    const drillFrom = Object.keys(currentFilters).length > 0
      ? btoa(JSON.stringify(currentFilters))
      : undefined;

    const params = new URLSearchParams();
    params.set('drillPartner', partnerName);
    if (drillFrom) params.set('drillFrom', drillFrom);

    // router.push creates history entry -- back button works
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }, [searchParams, pathname, router]);

  const drillToBatch = useCallback((batchName: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('drillBatch', batchName);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }, [searchParams, pathname, router]);

  const navigateToLevel = useCallback((level: DrillLevel) => {
    if (level === 'root') {
      // Restore pre-drill filters if available
      const drillFrom = searchParams.get('drillFrom');
      if (drillFrom) {
        try {
          const restored = JSON.parse(atob(drillFrom));
          const params = new URLSearchParams(restored);
          router.push(`${pathname}?${params.toString()}`, { scroll: false });
          return;
        } catch { /* fall through */ }
      }
      router.push(pathname, { scroll: false });
    } else if (level === 'partner') {
      const params = new URLSearchParams();
      params.set('drillPartner', state.partner!);
      const drillFrom = searchParams.get('drillFrom');
      if (drillFrom) params.set('drillFrom', drillFrom);
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    }
  }, [searchParams, pathname, router, state]);

  return { state, drillToPartner, drillToBatch, navigateToLevel };
}
```

### Account Data API Route

```typescript
// src/app/api/accounts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/snowflake/queries';
import { ACCOUNT_ALLOWED_COLUMNS } from '@/lib/columns/account-config';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const partner = request.nextUrl.searchParams.get('partner');
  const batch = request.nextUrl.searchParams.get('batch');

  if (!partner || !batch) {
    return NextResponse.json(
      { error: 'Both partner and batch parameters are required' },
      { status: 400 }
    );
  }

  const columnList = Array.from(ACCOUNT_ALLOWED_COLUMNS).join(', ');
  const rows = await executeQuery(
    `SELECT ${columnList} FROM master_accounts WHERE PARTNER_NAME = ? AND BATCH = ?`,
    [partner, batch]
  );

  return NextResponse.json({
    data: rows,
    meta: {
      rowCount: rows.length,
      fetchedAt: new Date().toISOString(),
      columns: Array.from(ACCOUNT_ALLOWED_COLUMNS),
    },
  });
}
```

### Breadcrumb Component

```typescript
// src/components/navigation/breadcrumb-trail.tsx
'use client';

import { ChevronRight } from 'lucide-react';
import type { DrillState, DrillLevel } from '@/hooks/use-drill-down';

interface BreadcrumbTrailProps {
  state: DrillState;
  rowCounts: { root?: number; partner?: number; batch?: number };
  onNavigate: (level: DrillLevel) => void;
}

export function BreadcrumbTrail({ state, rowCounts, onNavigate }: BreadcrumbTrailProps) {
  const segments: { label: string; level: DrillLevel; count?: number; active: boolean }[] = [
    { label: 'All Batches', level: 'root', count: rowCounts.root, active: state.level === 'root' },
  ];

  if (state.partner) {
    segments.push({
      label: `Partner: ${state.partner}`,
      level: 'partner',
      count: rowCounts.partner,
      active: state.level === 'partner',
    });
  }

  if (state.batch) {
    segments.push({
      label: `Batch: ${state.batch}`,
      level: 'batch',
      count: rowCounts.batch,
      active: state.level === 'batch',
    });
  }

  return (
    <nav aria-label="Drill-down breadcrumb" className="flex items-center gap-1 px-2 py-1.5 text-sm">
      {segments.map((seg, i) => (
        <span key={seg.level} className="flex items-center gap-1">
          {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
          {seg.active ? (
            <span className="font-medium text-foreground">
              {seg.label}{seg.count != null ? ` (${seg.count.toLocaleString()})` : ''}
            </span>
          ) : (
            <button
              onClick={() => onNavigate(seg.level)}
              className="text-muted-foreground hover:text-foreground hover:underline"
            >
              {seg.label}{seg.count != null ? ` (${seg.count.toLocaleString()})` : ''}
            </button>
          )}
        </span>
      ))}
    </nav>
  );
}
```

### Curated Account Column Set (Claude's Discretion)

Recommended ~18 columns from the 78-column `master_accounts` table, focusing on what a partnerships lead needs when investigating a specific batch:

```typescript
// src/lib/columns/account-config.ts
export const ACCOUNT_COLUMN_CONFIGS: AccountColumnConfig[] = [
  // Identity / grouping
  { key: 'PARTNER_NAME', label: 'Partner', type: 'text' },
  { key: 'BATCH', label: 'Batch', type: 'text' },
  { key: 'ACCOUNT_TYPE', label: 'Account Type', type: 'text' },
  { key: 'STATUS', label: 'Status', type: 'text' },

  // Financial snapshot
  { key: 'TOTAL_BALANCE', label: 'Total Balance', type: 'currency' },
  { key: 'TOTAL_COLLECTED_ON_ACCOUNT', label: 'Total Collected', type: 'currency' },

  // Payment activity
  { key: 'PAYMENT_PLAN_STATE', label: 'Payment Plan', type: 'text' },

  // Assignment / timing
  { key: 'ASSIGNMENT_DATE', label: 'Assignment Date', type: 'date' },

  // Demographics / segmentation
  { key: 'US_STATE', label: 'State', type: 'text' },
];
// Actual columns will be refined during implementation based on
// available columns in the live master_accounts schema.
```

**Note:** The exact curated set should be validated against the live `master_accounts` schema during implementation. The schema validator pattern from the batch table (in `schema-validator.ts`) should be replicated for the accounts table.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `next/router` | `next/navigation` (useRouter, useSearchParams) | Next.js 13+ | Project already uses the new APIs |
| State in React context | URL search params as source of truth | Established pattern | Project already follows this -- `useFilterState` proves it works |
| Separate page per view | Single page with conditional rendering | This project's decision | Simpler architecture, but requires careful state management |

## Open Questions

1. **master_accounts schema validation**
   - What we know: The table has 78 columns, including PARTNER_NAME, BATCH, TOTAL_BALANCE, STATUS, etc.
   - What's unclear: The exact column names and types in the live Snowflake schema. The curated column set may need adjustment.
   - Recommendation: Replicate the schema-validator pattern from batch config. Run validation on first accounts API call. Log unexpected columns.

2. **Account data volume per batch**
   - What we know: Batch-level data has 533 rows (from breadcrumb example in CONTEXT.md). Account-level data will be larger.
   - What's unclear: How many accounts per batch? Could be hundreds or tens of thousands.
   - Recommendation: The existing virtual scrolling (TanStack Virtual) will handle large row counts. Server-side filtering (WHERE clause) is mandatory -- never fetch all accounts.

3. **master_accounts table availability**
   - What we know: STATE.md flags "NAV-02 requires master_accounts table to be available in Snowflake. Confirm timeline before Phase 8 begins."
   - What's unclear: Whether the table is live and accessible with current credentials.
   - Recommendation: Phase implementation should test connectivity to master_accounts early (first task). If unavailable, NAV-01/03/04 can still ship without NAV-02.

## Sources

### Primary (HIGH confidence)
- Next.js 16.2.3 local docs (`node_modules/next/dist/docs/`) -- useRouter, useSearchParams API reference
- Existing codebase -- `useFilterState`, `useData`, `DataTable`, API route patterns

### Secondary (MEDIUM confidence)
- TanStack Table v8 -- column definitions, filtering model (from existing codebase usage)
- TanStack Query v5 -- useQuery pattern (from existing `use-data.ts`)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, all patterns proven in codebase
- Architecture: HIGH -- drill-down is a natural extension of existing URL-based filter pattern
- Pitfalls: HIGH -- identified from analyzing actual codebase patterns and user decisions
- Account columns: MEDIUM -- curated set is a recommendation, needs live schema validation

**Research date:** 2026-04-11
**Valid until:** 2026-05-11 (stable -- no fast-moving dependencies)
