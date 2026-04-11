# Phase 4: Dimension Filtering - Research

**Researched:** 2026-04-11
**Domain:** Combobox filter controls + TanStack Table column filtering + Next.js URL search params
**Confidence:** HIGH

## Summary

Phase 4 adds three combobox filter controls (partner, account type, batch) above the data table, with active filter chips and URL-persisted state. The existing stack already contains everything needed: `@base-ui/react` provides a fully-featured `Combobox` component with built-in search/filter, `@tanstack/react-table` v8.21.3 exports `getFilteredRowModel` and `ColumnFiltersState` for client-side row filtering, and Next.js 16 provides `useSearchParams` / `useRouter` for URL query param persistence.

The architecture is straightforward: a `useFilterState` hook reads/writes URL search params as the source of truth, the combobox controls update those params, and TanStack Table's `columnFilters` state drives row visibility. The batch dropdown options should be derived from the current dataset filtered by the selected partner, preventing zero-result selections.

**Primary recommendation:** Use `@base-ui/react/combobox` for all three filter dropdowns, `@tanstack/react-table`'s built-in column filtering for row filtering, and Next.js `useSearchParams` + `useRouter` for URL persistence. No new dependencies needed.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Horizontal filter bar below the column preset tabs, above the table
- All three filter dropdowns (partner, account type, batch) visible at once — no progressive reveal
- Batch dropdown options scoped to selected partner when a partner filter is active (prevents zero-result selections)
- Combobox with search for all three filters (type to filter the list, click to select)
- Single-select only per dimension (one partner, one account type, one batch at a time)
- Table updates immediately on selection — no "Apply" button
- Consistent combobox style across all three filters (including batch)
- Active filter chips displayed in a row below the filter bar, above the table
- Each chip shows dimension label + selected value, with an X to remove
- "Clear all" text link appears at the end of the chip row when any filters are active
- Removing a chip resets the corresponding dropdown to its placeholder ("All partners", etc.)
- No row counts on chips
- Page loads with no filters active — full dataset visible
- Filter state persisted in URL query params (?partner=Acme&type=Medical) — shareable and survives refresh
- No quick-filter presets or recent selections (Saved Views in Phase 6 covers this)
- Zero-results state shows "No results match your filters" with a "Clear filters" link

### Claude's Discretion
- Exact combobox component choice and styling
- Filter bar spacing and responsive layout
- Loading state during filter transitions (if needed)
- Keyboard navigation within combobox dropdowns

### Deferred Ideas (OUT OF SCOPE)
- Multi-select within a dimension (e.g., select 2+ partners for comparison) — future enhancement after Phase 4
- Filter presets / recent selections — Phase 6 (Saved Views)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FILT-01 | User can filter by partner name (dropdown) | Base UI Combobox with search, bound to `PARTNER_NAME` column; TanStack `columnFilters` state |
| FILT-02 | User can filter by account type (dropdown) | Base UI Combobox bound to `ACCOUNT_TYPE` column; same pattern as FILT-01 |
| FILT-03 | User can filter by batch (dropdown/search) | Base UI Combobox bound to `BATCH` column; options scoped by selected partner |
| FILT-04 | Filters compose with AND logic | TanStack Table's `getFilteredRowModel` applies all `columnFilters` with AND logic by default |
| FILT-05 | Active filters clearly visible and individually removable | Custom chip row component reading from filter state; X button removes specific `columnFilter` entry |
</phase_requirements>

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@base-ui/react` | ^1.3.0 | Combobox UI component | Already in project; headless with full accessibility, search/filter built in |
| `@tanstack/react-table` | 8.21.3 | Column filtering + row model | Already powering the table; `getFilteredRowModel` + `ColumnFiltersState` handle AND-composed filtering |
| `next/navigation` | 16.2.3 | URL search param read/write | `useSearchParams` + `useRouter` + `usePathname` for URL persistence |
| `lucide-react` | ^1.8.0 | Icons (X for chips, ChevronDown for trigger) | Already in project |

### Supporting (already installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `clsx` + `tailwind-merge` | installed | Class composition | Styling combobox and chips |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Base UI Combobox | Custom `<select>` + search input | Base UI handles keyboard nav, ARIA, portal positioning, filtering — not worth rebuilding |
| TanStack column filters | Manual `data.filter()` before passing to table | Loses integration with TanStack row model pipeline, sorting, and future features |
| URL search params | React state only | Loses shareability and refresh persistence — explicit user requirement |

**Installation:**
```bash
# No new packages needed — all dependencies already installed
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── hooks/
│   └── use-filter-state.ts          # URL <-> filter state bridge
├── components/
│   └── filters/
│       ├── filter-bar.tsx            # Horizontal bar with 3 comboboxes
│       ├── filter-combobox.tsx       # Reusable combobox (shared across 3 dimensions)
│       ├── filter-chips.tsx          # Active filter chip row + "Clear all"
│       └── filter-empty-state.tsx    # "No results match" message
├── lib/
│   └── table/
│       └── hooks.ts                  # Extend existing hook with columnFilters state
```

### Pattern 1: URL Search Params as Source of Truth
**What:** Filter state lives in URL query params (`?partner=Acme&type=Medical&batch=2024-01`). A custom hook reads params on mount and writes params on change. The table's `columnFilters` state derives from the URL.
**When to use:** Always — this is the locked decision for persistence.
**Key insight:** Use `useRouter().replace()` (not `push()`) when updating filters to avoid polluting browser history with every filter change.

```typescript
// Source: Next.js 16 docs (node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-search-params.md)
'use client';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { useCallback, useMemo } from 'react';
import type { ColumnFiltersState } from '@tanstack/react-table';

const FILTER_PARAMS = {
  partner: 'PARTNER_NAME',
  type: 'ACCOUNT_TYPE',
  batch: 'BATCH',
} as const;

export function useFilterState() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const columnFilters: ColumnFiltersState = useMemo(() => {
    const filters: ColumnFiltersState = [];
    for (const [param, columnId] of Object.entries(FILTER_PARAMS)) {
      const value = searchParams.get(param);
      if (value) {
        filters.push({ id: columnId, value });
      }
    }
    return filters;
  }, [searchParams]);

  const setFilter = useCallback(
    (param: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(param, value);
      } else {
        params.delete(param);
      }
      // replace() avoids history pollution
      router.replace(pathname + '?' + params.toString());
    },
    [searchParams, pathname, router]
  );

  const clearAll = useCallback(() => {
    router.replace(pathname);
  }, [pathname, router]);

  return { columnFilters, setFilter, clearAll, searchParams };
}
```

### Pattern 2: Reusable Filter Combobox
**What:** A single `FilterCombobox` component used for all three dimensions, parameterized by label, placeholder, options list, current value, and onChange handler.
**When to use:** All three filter dropdowns share the same interaction pattern.

```typescript
// Source: @base-ui/react combobox API (node_modules/@base-ui/react/combobox/)
import { Combobox } from '@base-ui/react/combobox';

interface FilterComboboxProps {
  label: string;
  placeholder: string;
  options: string[];
  value: string | null;
  onValueChange: (value: string | null) => void;
}
// Combobox.Root with value/onValueChange for controlled single-select
// Combobox.Input for type-to-filter
// Combobox.Portal > Combobox.Positioner > Combobox.Popup > Combobox.List
// Combobox.Item for each option
```

### Pattern 3: Cascading Batch Options
**What:** When a partner filter is active, the batch dropdown only shows batches belonging to that partner. Derived from the full dataset with `useMemo`.
**When to use:** Batch combobox options must be scoped to prevent zero-result selections (locked decision).

```typescript
const batchOptions = useMemo(() => {
  const rows = selectedPartner
    ? data.filter((row) => row.PARTNER_NAME === selectedPartner)
    : data;
  return [...new Set(rows.map((r) => String(r.BATCH)))].sort();
}, [data, selectedPartner]);
```

### Pattern 4: TanStack Table Column Filtering Integration
**What:** Add `getFilteredRowModel()` and `columnFilters` state to the existing `useDataTable` hook. The `columnFilters` array is passed in from the URL-derived state.
**When to use:** This is how TanStack Table applies row filtering.

```typescript
// Source: @tanstack/table-core v8.21.3 (ColumnFiltering.d.ts)
import { getFilteredRowModel, type ColumnFiltersState } from '@tanstack/react-table';

// In useDataTable, accept columnFilters as a parameter:
const table = useReactTable({
  data,
  columns,
  state: {
    sorting,
    columnVisibility,
    columnPinning,
    columnFilters, // <-- new
  },
  // onColumnFiltersChange not needed — URL is source of truth
  getCoreRowModel: getCoreRowModel(),
  getFilteredRowModel: getFilteredRowModel(), // <-- new
  getSortedRowModel: getSortedRowModel(),
  // ...existing config
});
```

### Pattern 5: Suspense Boundary for useSearchParams
**What:** Next.js 16 requires `useSearchParams` to be wrapped in a `<Suspense>` boundary during static prerendering, or the build will fail.
**When to use:** The component tree that calls `useSearchParams` must have a `<Suspense>` ancestor.

```typescript
// Source: Next.js 16 docs (use-search-params.md, line 179)
// In page.tsx or data-display.tsx:
import { Suspense } from 'react';

// Wrap the filter-aware component tree in Suspense
<Suspense fallback={<FilterBarSkeleton />}>
  <DataDisplay />
</Suspense>
```

### Anti-Patterns to Avoid
- **Storing filter state in React state AND URL:** Single source of truth. URL params are the source; derive `columnFilters` from them. Never have a separate `useState` for filters that could drift.
- **Using `router.push()` for filter changes:** Creates a history entry per filter change. Use `router.replace()` to update URL without history pollution.
- **Filtering data before passing to TanStack Table:** Let TanStack's `getFilteredRowModel` handle it. Manual pre-filtering breaks the row model pipeline (aggregations, sorting interact with filtering).
- **Extracting unique options from filtered data:** Options for partner and account type should come from the FULL dataset, not the currently filtered data. Only batch options cascade based on selected partner.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Searchable dropdown | Custom input + filtered list + keyboard nav + portal positioning | `@base-ui/react/combobox` | ARIA compliance, keyboard nav, scroll-into-view, portal z-index, focus management — dozens of edge cases |
| Row filtering with AND logic | Manual `data.filter()` chain | `getFilteredRowModel()` from `@tanstack/react-table` | Integrates with TanStack's row model pipeline; handles edge cases around empty filters, undefined values |
| URL param serialization | Custom parse/stringify | `URLSearchParams` (native) | Standard API, handles encoding, already what Next.js uses internally |

**Key insight:** The entire filtering pipeline (URL -> state -> table rows) can be built with zero new dependencies using existing project libraries.

## Common Pitfalls

### Pitfall 1: useSearchParams Build Failure
**What goes wrong:** Production build fails with "Missing Suspense boundary with useSearchParams" error.
**Why it happens:** Next.js 16 requires `useSearchParams` to be within a `<Suspense>` boundary for static prerendering.
**How to avoid:** Wrap the component tree that uses `useSearchParams` in `<Suspense>` with a fallback skeleton. The current `page.tsx` renders `<DataDisplay>` directly — it needs a `<Suspense>` wrapper.
**Warning signs:** Works fine in dev mode but fails during `next build`.

### Pitfall 2: Filter State Desync on Clear
**What goes wrong:** Clearing a filter chip updates the URL but the combobox still shows the old value.
**Why it happens:** Combobox has internal state for the input text that isn't synced with the controlled `value` prop.
**How to avoid:** Use controlled `value` + `onValueChange` on the Combobox.Root. When value becomes null (chip removed), the combobox resets to placeholder. Also pass `inputValue=""` (or let the component auto-clear) when value resets.
**Warning signs:** Chip disappears but combobox still shows the previous selection text.

### Pitfall 3: Batch Options Stale After Partner Change
**What goes wrong:** User selects partner A, then selects batch X. User changes to partner B — batch X is still selected but partner B doesn't have batch X, resulting in zero rows.
**Why it happens:** Changing the partner filter doesn't automatically clear the batch filter.
**How to avoid:** When partner filter changes, check if the currently selected batch exists in the new partner's batches. If not, clear the batch filter. Implement this in the `setFilter` callback.
**Warning signs:** Changing partner filter sometimes shows "No results match your filters" unexpectedly.

### Pitfall 4: URL Param Encoding
**What goes wrong:** Partner names with special characters (ampersands, spaces, etc.) break URL parsing.
**Why it happens:** Not using proper URL encoding.
**How to avoid:** `URLSearchParams` handles encoding automatically. Always use `params.set(key, value)` instead of string concatenation.
**Warning signs:** Filter values with `&` or `=` characters cause incorrect parsing.

### Pitfall 5: Combobox Portal Z-Index
**What goes wrong:** Dropdown popup appears behind the table or other elements.
**Why it happens:** The combobox popup needs to be portaled and have appropriate z-index.
**How to avoid:** Use `Combobox.Portal` which renders via React portal. Apply a z-index class (e.g., `z-50`) to the `Combobox.Positioner`.
**Warning signs:** Dropdown appears but is clipped or hidden behind adjacent content.

### Pitfall 6: Unnecessary Re-renders from useSearchParams
**What goes wrong:** Entire table re-renders on every filter change even when filters haven't meaningfully changed.
**Why it happens:** `useSearchParams` returns a new object reference on every URL change. Deriving `columnFilters` with `useMemo` avoids this, but the memo dependency (`searchParams`) changes reference each time.
**How to avoid:** Serialize the search params string as the memo dependency rather than the object: `useMemo(() => ..., [searchParams.toString()])`.
**Warning signs:** Sluggish filter interaction on large datasets.

## Code Examples

### Extracting Unique Filter Options from Data
```typescript
// Derive unique sorted options for each dimension from the full dataset
function useFilterOptions(data: Record<string, unknown>[]) {
  return useMemo(() => ({
    partners: [...new Set(data.map((r) => String(r.PARTNER_NAME ?? '')))].filter(Boolean).sort(),
    accountTypes: [...new Set(data.map((r) => String(r.ACCOUNT_TYPE ?? '')))].filter(Boolean).sort(),
    // Batch options need to be dynamic based on partner selection — handled separately
  }), [data]);
}
```

### Cascading Batch Filter with Auto-Clear
```typescript
// When partner changes, auto-clear batch if it's no longer valid
const handlePartnerChange = useCallback((value: string | null) => {
  setFilter('partner', value);
  // Check if current batch is still valid under new partner
  const currentBatch = searchParams.get('batch');
  if (currentBatch && value) {
    const partnerBatches = data
      .filter((r) => r.PARTNER_NAME === value)
      .map((r) => String(r.BATCH));
    if (!partnerBatches.includes(currentBatch)) {
      setFilter('batch', null);
    }
  }
}, [setFilter, searchParams, data]);
```

### Filter Chip Component Pattern
```typescript
interface FilterChipProps {
  label: string;    // "Partner"
  value: string;    // "Acme Corp"
  onRemove: () => void;
}
// Render: [Partner: Acme Corp  X]
// Use X icon from lucide-react, size 14
// Tailwind: rounded-full, bg-muted, text-sm, px-3 py-1, flex items-center gap-1.5
```

### Zero-Results Empty State
```typescript
// Show when table.getRowModel().rows.length === 0 AND columnFilters.length > 0
// "No results match your filters" + "Clear filters" link that calls clearAll()
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `nuqs` for URL state management | Native `useSearchParams` + `useRouter` | Always available in App Router | For 3 simple string params, native APIs are sufficient; `nuqs` adds value for complex types/arrays |
| Custom filter dropdowns | Base UI Combobox | @base-ui/react 1.x (2024+) | Full accessibility + keyboard nav out of the box |
| Global data filtering outside table | TanStack `getFilteredRowModel` | TanStack Table v8 | Integrates filtering into the table pipeline alongside sorting/pagination |

**Deprecated/outdated:**
- `next/router` (Pages Router): Use `next/navigation` hooks in App Router
- TanStack Table v7 `useFilters`: v8 uses `getFilteredRowModel()` + `ColumnFiltersState`

## Open Questions

1. **Exact column values for filter options**
   - What we know: The three filter columns are `PARTNER_NAME`, `ACCOUNT_TYPE`, and `BATCH` (all type `text` in config.ts)
   - What's unclear: Whether any values contain special characters or very long strings that would need truncation in the combobox
   - Recommendation: Extract options from data at runtime; no hardcoded lists. Truncate display in combobox items if > ~50 chars with title tooltip.

2. **Number of unique filter values per dimension**
   - What we know: This is a batch performance summary table — likely dozens of partners, a handful of account types, potentially hundreds of batches
   - What's unclear: Exact counts. If batches > 500, the combobox list may need virtual scrolling.
   - Recommendation: Start without virtual scrolling in the combobox. Base UI Combobox handles reasonable list sizes. If performance issues arise, add `Combobox.Collection` for virtualized rendering.

## Sources

### Primary (HIGH confidence)
- `@base-ui/react/combobox` — Examined type definitions and component parts directly from `node_modules/@base-ui/react/combobox/` (v1.3.0+). Confirmed: Root, Input, List, Item, Portal, Positioner, Popup, Clear, value/onValueChange controlled mode, useFilter hook.
- `@tanstack/table-core` v8.21.3 — Examined `ColumnFiltering.d.ts` and `getFilteredRowModel.d.ts` from `node_modules/.pnpm/@tanstack+table-core@8.21.3/`. Confirmed: `ColumnFiltersState`, `ColumnFilter { id, value }`, `getFilteredRowModel()`, AND logic by default.
- Next.js 16.2.3 docs — Read `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-search-params.md`. Confirmed: `useSearchParams` returns read-only `URLSearchParams`, must be in `<Suspense>` boundary, use `useRouter().replace()` to update.
- Base UI official docs (https://base-ui.com/react/components/combobox) — Verified controlled value API and component composition pattern.

### Secondary (MEDIUM confidence)
- Existing codebase analysis: `src/lib/table/hooks.ts`, `src/lib/columns/config.ts`, `src/components/table/data-table.tsx`, `src/components/data-display.tsx`, `src/app/page.tsx` — established patterns for table hook, column config, component composition, and data flow.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already installed and verified in node_modules
- Architecture: HIGH - Patterns verified against actual type definitions and Next.js docs
- Pitfalls: HIGH - Derived from actual API constraints (Suspense requirement, controlled state, URL encoding)

**Research date:** 2026-04-11
**Valid until:** 2026-05-11 (stable stack, no major releases expected)
