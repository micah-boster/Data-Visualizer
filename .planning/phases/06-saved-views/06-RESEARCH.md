# Phase 6: Saved Views - Research

**Researched:** 2026-04-11
**Domain:** Client-side state persistence (localStorage), React state management, sidebar UI
**Confidence:** HIGH

## Summary

Phase 6 adds named saved views that capture the current table configuration (filters, visible columns, column order, sort state, column widths) and persist them to localStorage. The implementation leverages existing patterns already established in the codebase: `loadColumnState`/`saveColumnState` in `src/lib/columns/persistence.ts` for localStorage, the Sheet component for sidebar panels, and Sonner toasts for feedback.

The primary technical challenge is **extracting a complete table state snapshot** from five separate state sources (sorting from `useDataTable`, visibility/order from `useColumnManagement`, column filters from `useColumnFilters`, dimension filters from URL search params, and column sizing from TanStack Table's internal resize state) and **restoring all five atomically** when loading a view. This requires a coordination layer that sits above the existing hooks.

**Primary recommendation:** Create a `SavedView` type that captures all five state slices as a raw JSON-serializable snapshot, a `useSavedViews` hook for CRUD operations against localStorage, and a `ViewsSidebar` component using the existing Sheet pattern. Wire the save/load into `DataTable` where all state sources are already accessible.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Inline save flow in the toolbar — "Save View" button expands an inline name input + save button, no modal
- Duplicate names trigger a "Replace existing view?" confirmation before overwriting
- No dirty-state tracking — views are snapshots, users freely change things after loading without any unsaved-changes indicator
- Deleting a view is immediate with an undo Sonner toast (no confirmation dialog)
- Sidebar panel (collapsible), collapsed by default — user clicks a "Views" button to open it
- Each view shows name only — no summary or metadata subtitle
- Include a "Reset" / "Clear" option in the sidebar to return to the default unfiltered table state
- Filters, visible columns, column order, sort state, and column widths — all captured as a raw snapshot
- Column preset references are NOT saved — always save the actual column list regardless of how the user arrived at it
- Persisted in localStorage for now (per-device/browser)
- No limit on number of saved views
- Ship with 2-3 pre-built starter views (Claude picks based on data model and partnerships use case)
- Starter views are restorable defaults — users can delete/modify them, but a "Restore defaults" option brings them back
- First load shows the default unfiltered table, not a starter view

### Claude's Discretion
- Exact starter view configurations (which columns, filters, sort for each)
- Sidebar panel width, animation, and toggle button placement
- Inline save input styling and keyboard shortcuts (Enter to save, Escape to cancel)
- localStorage key naming and data structure
- How "Restore defaults" is surfaced in the UI

### Deferred Ideas (OUT OF SCOPE)
- User authentication / login mechanism — future phase
- Server-side view persistence (tied to login) — future phase
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| VIEW-01 | User can save current table state (filters, columns, sort) as a named view | SavedView type captures all 5 state slices; `useSavedViews` hook provides `saveView(name, snapshot)` method; inline toolbar input for naming |
| VIEW-02 | User can load a saved view from a list | ViewsSidebar lists saved views; clicking one calls `loadView(id)` which atomically restores all 5 state slices via existing setters |
| VIEW-03 | User can delete saved views | Delete button on each sidebar item; immediate removal with Sonner undo toast (5-second window) matching existing export toast pattern |
| VIEW-04 | Saved views persist across browser sessions | localStorage persistence using existing `try/catch` + SSR-safe pattern from `src/lib/columns/persistence.ts` |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| localStorage (Web API) | N/A | Persist saved views across sessions | User decision: localStorage for now, no external deps needed |
| sonner | ^2.0.7 | Undo toast on view deletion | Already installed and configured in the project; CONTEXT.md specifies undo toast pattern |
| @tanstack/react-table | ^8.21.3 | Table state types (SortingState, VisibilityState, ColumnSizingState) | Already installed; provides the state types we need to serialize |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zod | ^4.3.6 | Validate saved view data on load from localStorage | Already installed; guards against corrupt/stale localStorage data |
| lucide-react | ^1.8.0 | Icons for Views button, save, delete, reset | Already installed; project standard for icons |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| localStorage | IndexedDB | Overkill for JSON blobs under 5MB; localStorage is simpler and the project already uses it |
| Raw JSON.parse | Zod validation | Zod adds safety for schema migration; worth it since saved views may outlive code changes |

**Installation:**
```bash
# No new dependencies needed — everything is already installed
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── lib/views/
│   ├── types.ts           # SavedView interface, ViewSnapshot type
│   ├── storage.ts          # localStorage CRUD (load, save, delete, list)
│   ├── defaults.ts         # 2-3 starter view configurations
│   └── schema.ts           # Zod schema for validating stored views
├── hooks/
│   └── use-saved-views.ts  # React hook wrapping storage + state
├── components/views/
│   ├── views-sidebar.tsx   # Sheet-based sidebar panel listing saved views
│   ├── view-item.tsx       # Individual view row (name + delete button)
│   └── save-view-input.tsx # Inline name input + save button for toolbar
```

### Pattern 1: Snapshot Serialization
**What:** Capture the complete table configuration as a single JSON-serializable object
**When to use:** When saving a view
**Example:**
```typescript
// Types for the saved view snapshot
interface ViewSnapshot {
  sorting: SortingState;           // from useDataTable
  columnVisibility: VisibilityState; // from useColumnManagement
  columnOrder: string[];           // from useColumnManagement
  columnFilters: Record<string, unknown>; // from useColumnFilters (in-column filters only)
  dimensionFilters: Record<string, string>; // URL-backed filters (partner, type, batch)
  columnSizing: ColumnSizingState; // from table.getState().columnSizing
}

interface SavedView {
  id: string;           // crypto.randomUUID()
  name: string;
  snapshot: ViewSnapshot;
  createdAt: number;    // Date.now()
  isDefault?: boolean;  // true for starter views
}
```

### Pattern 2: Atomic State Restoration
**What:** When loading a view, set all 5 state slices in one React render cycle
**When to use:** When user clicks a saved view in the sidebar
**Example:**
```typescript
// All setters fire synchronously — React batches them into one re-render
function loadView(view: SavedView) {
  setSorting(view.snapshot.sorting);
  setColumnVisibility(view.snapshot.columnVisibility);
  setColumnOrder(view.snapshot.columnOrder);
  restoreColumnFilters(view.snapshot.columnFilters);
  restoreDimensionFilters(view.snapshot.dimensionFilters);
  // Column sizing: table.setColumnSizing(view.snapshot.columnSizing)
}
```

### Pattern 3: Undo Delete with Sonner Toast
**What:** Delete view from state immediately, show toast with undo action, commit to localStorage after toast dismisses
**When to use:** When user deletes a saved view
**Example:**
```typescript
function deleteView(id: string) {
  const deleted = views.find(v => v.id === id);
  if (!deleted) return;

  // Remove from state immediately
  setViews(prev => prev.filter(v => v.id !== id));

  // Show undo toast
  toast('View deleted', {
    action: {
      label: 'Undo',
      onClick: () => {
        // Re-insert the view
        setViews(prev => [...prev, deleted]);
      },
    },
  });
}
```

### Pattern 4: Hydration-Safe localStorage Read
**What:** Initialize with empty/default state, then apply localStorage in useEffect
**When to use:** Any localStorage read in a Next.js app (SSR hydration mismatch prevention)
**Example:**
```typescript
// Existing pattern from useColumnManagement — reuse exactly
const [views, setViews] = useState<SavedView[]>([]);
const hasHydrated = useRef(false);

useEffect(() => {
  const saved = loadSavedViews();
  if (saved.length > 0) {
    setViews(saved);
  } else {
    // First-ever load: seed with default starter views
    setViews(getDefaultViews());
  }
  hasHydrated.current = true;
}, []);

useEffect(() => {
  if (!hasHydrated.current) return;
  persistSavedViews(views);
}, [views]);
```

### Anti-Patterns to Avoid
- **Storing TanStack Table instance directly:** Table objects contain functions and circular refs — only serialize plain state slices
- **Syncing URL params on view load via router.replace in a loop:** Set all dimension filters in a single URL update to avoid multiple re-renders and history entries
- **Saving column preset name instead of actual visibility:** CONTEXT.md explicitly says "always save the actual column list regardless of how the user arrived at it"
- **Using the existing `STORAGE_KEY` for views:** Column persistence and view persistence are separate concerns — use a distinct key like `bounce-dv-saved-views`

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| UUID generation | Custom ID generator | `crypto.randomUUID()` | Browser-native, cryptographically random, supported in all modern browsers |
| Data validation on load | Manual shape checking | Zod schema `.safeParse()` | Handles schema evolution, type narrowing, and error reporting in one call |
| Toast with undo | Custom toast + timer | Sonner `toast()` with `action` prop | Already in the project, handles auto-dismiss, animation, and action callbacks |
| Sidebar panel | Custom slide-out div | Sheet component from `@/components/ui/sheet` | Already used by ColumnPickerSidebar, consistent UX, handles overlay/close/animation |

**Key insight:** Every UI pattern needed (sidebar, toast, inline input) already exists in the codebase. The new work is the state serialization layer and wiring, not UI primitives.

## Common Pitfalls

### Pitfall 1: URL Filter State Not Captured in Snapshot
**What goes wrong:** Dimension filters (partner, type, batch) live in URL search params via `useFilterState`, not in React state. Saving a view without capturing URL params means filters are lost on restore.
**Why it happens:** The other 4 state slices are React state, but dimension filters use `router.replace()` — a different mechanism.
**How to avoid:** When saving, read current `searchParams` and extract the 3 dimension filter values. When loading, use `router.replace()` to set all URL params in one update.
**Warning signs:** Loaded view has correct columns/sort but wrong filter state.

### Pitfall 2: Column Sizing State Not Exposed by Default
**What goes wrong:** TanStack Table tracks column widths internally via `columnSizing` state, but `useDataTable` doesn't currently expose it or persist it.
**Why it happens:** Column resize was enabled (`columnResizeMode: 'onChange'`) but the sizing state was never lifted out of the table instance.
**How to avoid:** Access column sizing via `table.getState().columnSizing` when saving. When loading, pass the sizing state into the table via `state.columnSizing` and add `onColumnSizingChange` handler.
**Warning signs:** Views restore everything except column widths.

### Pitfall 3: Stale Column Keys After Schema Changes
**What goes wrong:** A saved view references column keys (e.g., `TOTAL_ACCOUNTS`) that may not exist if the Snowflake schema changes. Loading such a view causes TanStack Table to silently ignore unknown columns but may also hide valid columns.
**Why it happens:** Views are persisted indefinitely in localStorage while the column schema evolves.
**How to avoid:** When loading a view, validate column keys against current `COLUMN_CONFIGS`. Strip unknown keys from visibility/order/sizing. Log a warning if keys were removed.
**Warning signs:** View loads with fewer visible columns than expected.

### Pitfall 4: Hydration Mismatch on First Render
**What goes wrong:** Server-rendered HTML shows default state, client reads localStorage and shows different state, React reports hydration mismatch.
**Why it happens:** localStorage is client-only; Next.js pre-renders on the server.
**How to avoid:** Follow the existing `hasHydrated` ref pattern from `useColumnManagement`. Initialize with defaults in `useState`, apply localStorage in `useEffect`.
**Warning signs:** Console warning about hydration mismatch; flash of default content.

### Pitfall 5: Replace Confirmation UX Ambiguity
**What goes wrong:** User types a name that already exists and clicks save without realizing they'll overwrite.
**Why it happens:** No visual warning before the save action.
**How to avoid:** When the typed name matches an existing view, show the "Replace existing view?" confirmation inline (not a modal per CONTEXT.md). Only proceed on explicit confirmation.
**Warning signs:** Users accidentally overwrite views.

## Code Examples

### Saving Current Table State as a Snapshot
```typescript
// Collect state from all 5 sources available in DataTable component
function captureSnapshot(
  table: Table<Record<string, unknown>>,
  sorting: SortingState,
  columnVisibility: VisibilityState,
  columnOrder: string[],
  columnFilterState: Record<string, unknown>,
  searchParams: URLSearchParams,
): ViewSnapshot {
  return {
    sorting,
    columnVisibility,
    columnOrder,
    columnFilters: { ...columnFilterState },
    dimensionFilters: {
      partner: searchParams.get('partner') ?? '',
      type: searchParams.get('type') ?? '',
      batch: searchParams.get('batch') ?? '',
    },
    columnSizing: table.getState().columnSizing,
  };
}
```

### Restoring Dimension Filters via URL
```typescript
// Set all URL params in one router.replace() call
function restoreDimensionFilters(
  dimensionFilters: Record<string, string>,
  pathname: string,
  router: ReturnType<typeof useRouter>,
) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(dimensionFilters)) {
    if (value) params.set(key, value);
  }
  const qs = params.toString();
  router.replace(qs ? `${pathname}?${qs}` : pathname);
}
```

### Zod Schema for Stored Views
```typescript
import { z } from 'zod';

const viewSnapshotSchema = z.object({
  sorting: z.array(z.object({ id: z.string(), desc: z.boolean() })),
  columnVisibility: z.record(z.string(), z.boolean()),
  columnOrder: z.array(z.string()),
  columnFilters: z.record(z.string(), z.unknown()),
  dimensionFilters: z.record(z.string(), z.string()),
  columnSizing: z.record(z.string(), z.number()).optional().default({}),
});

const savedViewSchema = z.object({
  id: z.string(),
  name: z.string(),
  snapshot: viewSnapshotSchema,
  createdAt: z.number(),
  isDefault: z.boolean().optional(),
});

export const savedViewsArraySchema = z.array(savedViewSchema);
```

### Sonner Undo Toast Pattern
```typescript
import { toast } from 'sonner';

// Matches the export button toast style already in the project
toast('View deleted', {
  description: `"${viewName}" was removed`,
  action: {
    label: 'Undo',
    onClick: () => restoreDeletedView(deletedView),
  },
  duration: 5000,
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| JSON.parse with manual validation | Zod `.safeParse()` for schema validation | Zod 4 (2025) | Type-safe parsing with automatic error handling |
| Custom UUID with Math.random | `crypto.randomUUID()` | Baseline 2023 | Browser-native, no polyfill needed |
| React 17 state batching workaround | React 18+ automatic batching | React 18 (2022) | Multiple `setState` calls in event handlers batch into one render automatically |

**Deprecated/outdated:**
- Manual state batching via `unstable_batchedUpdates`: Not needed in React 18+; all state updates in event handlers are automatically batched

## Open Questions

1. **Column sizing state integration**
   - What we know: `columnResizeMode: 'onChange'` is enabled in `useDataTable`, and `table.getState().columnSizing` returns a `Record<string, number>` of column widths
   - What's unclear: Whether `useDataTable` needs to expose `onColumnSizingChange` or if reading from `table.getState()` at save time is sufficient
   - Recommendation: For save, read from `table.getState().columnSizing`. For load, add `columnSizing` to the table's `state` option and wire up `onColumnSizingChange`. This mirrors how `columnVisibility` and `columnOrder` are already externalized.

2. **Starter view configurations**
   - What we know: Need 2-3 starter views for partnerships use case
   - What's unclear: Exact column/filter/sort combos that are most useful
   - Recommendation: Create these during planning based on the column config groups: (1) "Financial Overview" — identity + financials + payments + collection curves at 3/6/12 months, sorted by total placed desc; (2) "Outreach Performance" — identity + penetration + conversion + digital channels, sorted by penetration rate desc; (3) "New Batches" — identity + account counts + financials + timing, sorted by batch age asc. No pre-set filters — users can apply their own.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `src/lib/columns/persistence.ts` — existing localStorage pattern with SSR safety
- Codebase analysis: `src/hooks/use-column-management.ts` — hydration-safe state initialization pattern
- Codebase analysis: `src/lib/table/hooks.ts` — TanStack Table state management, `columnResizeMode: 'onChange'`
- Codebase analysis: `src/hooks/use-column-filters.ts` — in-column filter state shape
- Codebase analysis: `src/hooks/use-filter-state.ts` — URL-backed dimension filter pattern
- Codebase analysis: `src/components/table/export-button.tsx` — Sonner toast usage pattern
- Codebase analysis: `src/components/columns/column-picker-sidebar.tsx` — Sheet sidebar pattern

### Secondary (MEDIUM confidence)
- TanStack Table docs: `columnSizing` state, `ColumnSizingState` type (verified via codebase `columnResizeMode` usage)
- Sonner docs: `toast()` with `action` prop for undo pattern (verified via existing export button usage)
- Zod 4: `z.safeParse()` for validation (verified via `package.json` dependency)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries already installed and used in the project
- Architecture: HIGH - patterns directly mirror existing codebase conventions (persistence, hydration, sidebar)
- Pitfalls: HIGH - identified through direct codebase analysis of state management patterns

**Research date:** 2026-04-11
**Valid until:** 2026-05-11 (stable domain, no fast-moving dependencies)
