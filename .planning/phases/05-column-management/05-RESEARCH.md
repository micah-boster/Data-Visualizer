# Phase 5: Column Management - Research

**Researched:** 2026-04-11
**Domain:** Column visibility, drag reorder, in-column filtering (TanStack Table + React DnD)
**Confidence:** HIGH

## Summary

Phase 5 adds three capabilities to the existing TanStack Table setup: a sidebar column picker (show/hide + drag reorder), drag-to-reorder column headers, and per-column filtering (text search + numeric range). The codebase already has TanStack Table v8 with `columnVisibility`, `columnPinning`, sorting, and dimension filtering (Phase 4). The main new dependencies are a drag library for reorder and a popover/dropdown for in-column filters.

TanStack Table v8 natively supports column visibility toggling (`column.getToggleVisibilityHandler()`), column ordering state (`columnOrder`), and per-column filtering (`columnFilters` with custom filter functions). The primary gaps are: (1) a drag-and-drop library for reorder UX, (2) a sidebar UI for the column picker, and (3) filter popovers for individual column headers.

**Primary recommendation:** Use `@dnd-kit/core` + `@dnd-kit/sortable` for drag reorder (lightweight, React 19 compatible, accessible), shadcn Sheet component (already installed) for the sidebar picker, and shadcn Popover (needs install) for column filter popovers. Persist column visibility + order to localStorage.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Sidebar panel slides in from the right
- Columns grouped by domain with expand/collapse per group
- Search bar at top filters column list in real-time
- Bulk actions: Show All / Hide All + per-group toggle-all
- Badge on toolbar button showing visible vs total count
- Drag handle icon (grip) on hover in column header, separate from sort
- Column order also rearrangeable from sidebar picker via drag
- Visual feedback: semi-transparent ghost + blue drop indicator
- Column order and visibility persisted to localStorage
- Filter icon appears on hover in column header; popover with type-specific options
- Text columns: search box + value checklist
- Numeric columns: range inputs (min/max) with actual range as placeholder
- In-column filters AND together with Phase 4 dimension filters
- ~10-15 key columns visible by default
- Identifier columns pinned left, always visible, can't be hidden
- "Reset to defaults" button in sidebar

### Claude's Discretion
- Exact default column set selection based on schema analysis
- Domain grouping assignments for the 61 columns
- Popover positioning and animation details
- Drag library choice and implementation approach
- Loading/transition states during column changes

### Deferred Ideas (OUT OF SCOPE)
- Comparison operators for numeric filters (>, <, =, between)
- Named saved views / presets (Phase 6)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| TABL-03 | User can filter columns by text search, numeric range, or value selection | In-column filter popovers with custom TanStack filter functions; text = search + checklist, numeric = min/max range inputs |
| TABL-04 | User can show/hide columns from the 61-column schema | TanStack `columnVisibility` state already in `useDataTable`; sidebar picker with grouped toggles + search |
| TABL-05 | User can drag to reorder columns | TanStack `columnOrder` state + @dnd-kit/sortable for drag UX in both header row and sidebar |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @tanstack/react-table | ^8.21.3 | Column visibility, ordering, filtering state | Already installed; native support for all three features |
| @dnd-kit/core | ^6.3.1 | Drag-and-drop primitives | Most popular React DnD library, works with React 19, accessible, lightweight |
| @dnd-kit/sortable | ^10.0.0 | Sortable list abstraction | Built on @dnd-kit/core; handles reorder logic, keyboard support |
| @dnd-kit/utilities | ^3.2.2 | CSS transform utilities | Required by @dnd-kit/sortable for transforms |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| shadcn Sheet | installed | Sidebar panel (right slide) | Column picker sidebar |
| shadcn Popover | needs install | Floating panel anchored to element | Per-column filter dropdowns |
| shadcn Checkbox | needs install | Toggles in column picker + text filter checklist | Column visibility toggles |
| lucide-react | ^1.8.0 | Icons (GripVertical, Columns3, Filter, X) | Already installed |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @dnd-kit | react-beautiful-dnd | rbd is unmaintained (last release 2021), does not support React 18+ |
| @dnd-kit | HTML5 drag API | No keyboard accessibility, poor mobile support, hard to style ghost |
| Popover | Tooltip with form | Tooltips auto-dismiss; popovers stay open for interaction |

**Installation:**
```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
npx shadcn@latest add popover checkbox scroll-area
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── lib/columns/
│   ├── config.ts           # Existing: add domain grouping metadata
│   ├── groups.ts           # NEW: domain group definitions + default visibility
│   ├── presets.ts          # Existing: keep as-is for preset tabs
│   ├── definitions.ts      # Existing: add enableColumnFilter to defs
│   └── persistence.ts      # NEW: localStorage read/write for visibility + order
├── hooks/
│   ├── use-column-management.ts  # NEW: visibility, order, localStorage sync
│   └── use-column-filters.ts     # NEW: per-column filter state (extends useFilterState pattern)
├── components/
│   ├── columns/
│   │   ├── column-picker-sidebar.tsx  # NEW: Sheet-based sidebar
│   │   ├── column-group.tsx           # NEW: collapsible group with toggles
│   │   └── column-search.tsx          # NEW: search input for column list
│   └── table/
│       ├── column-header-filter.tsx   # NEW: filter icon + popover per column
│       ├── text-column-filter.tsx     # NEW: search + checklist filter
│       ├── numeric-column-filter.tsx  # NEW: min/max range filter
│       └── table-header.tsx           # MODIFIED: add drag handle + filter icon
```

### Pattern 1: TanStack Column Visibility
**What:** Use `columnVisibility` state (already in `useDataTable`) with `column.getToggleVisibilityHandler()`
**When to use:** Column picker toggles
**Key detail:** The existing `useDataTable` already has `columnVisibility` + `setColumnVisibility` state. The sidebar picker calls these directly. Identity columns check `column.columnDef.meta.identity` and skip the toggle.

### Pattern 2: TanStack Column Order
**What:** Add `columnOrder` state to `useReactTable` config. TanStack uses this string array to determine column render order.
**When to use:** Drag reorder in both header and sidebar
**Key detail:** `columnOrder` is a `string[]` of column IDs. When empty/undefined, TanStack uses the original `columns` array order. Set it explicitly when user drags. Sync to localStorage.

### Pattern 3: @dnd-kit Sortable for Column Reorder
**What:** Wrap column headers (and sidebar items) in `SortableContext` with `useSortable` per item
**When to use:** Drag reorder
**Key detail:** `@dnd-kit/sortable` provides `useSortable` hook that returns drag listeners, transform, and transition. On `onDragEnd`, compute new order from `arrayMove(items, oldIndex, newIndex)` and call `setColumnOrder`.

### Pattern 4: Per-Column Filter Functions
**What:** TanStack Table supports custom `filterFn` on column definitions. Text columns use a "includesString" or custom checklist filter; numeric columns use a custom range filter.
**When to use:** In-column filtering
**Key detail:** Custom filter functions receive `(row, columnId, filterValue)`. For text checklist: `filterValue` is `string[]`, check if cell value is in the array. For numeric range: `filterValue` is `{ min?: number; max?: number }`, check bounds. These compose with existing Phase 4 dimension filters because TanStack ANDs all `columnFilters` entries.

### Pattern 5: localStorage Persistence
**What:** Save `columnVisibility` and `columnOrder` to localStorage on change; restore on mount
**When to use:** Page reload persistence
**Key detail:** Use a custom hook that reads from localStorage on init (with fallback to defaults) and writes on state change via `useEffect`. Key: `bounce-dv-columns` or similar. Do NOT persist in-column filters (those are transient).

### Anti-Patterns to Avoid
- **Overriding Phase 4 filter state:** In-column filters should use TanStack's `columnFilters` array alongside dimension filters, NOT replace `useFilterState`. The existing `useFilterState` manages URL-backed dimension filters; in-column filters are session-only state managed separately.
- **Fighting TanStack column order:** Don't try to reorder the `columns` array directly. Use the `columnOrder` state — TanStack handles the rest.
- **Drag on identity/pinned columns:** Identity columns (PARTNER_NAME, BATCH, etc.) are pinned left. Don't allow dragging them. Filter them out of the sortable context.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Drag-and-drop reorder | Custom mouse event handlers | @dnd-kit/sortable | Keyboard accessibility, touch support, collision detection, animation |
| Column visibility state | Custom show/hide boolean map | TanStack columnVisibility | Already integrated; handles render, export, everything |
| Column order state | Custom array + column remapping | TanStack columnOrder | Integrated with all TanStack features (pinning, grouping, sizing) |
| Floating filter panel | Absolute-positioned div | shadcn Popover | Handles positioning, focus trap, click-outside, portal |
| Sidebar slide panel | Custom animation + overlay | shadcn Sheet (already installed) | Handles animation, focus trap, overlay, escape key |

## Common Pitfalls

### Pitfall 1: Column Order + Pinning Conflict
**What goes wrong:** Setting `columnOrder` can interfere with `columnPinning`. Pinned columns may appear in wrong position.
**Why it happens:** TanStack applies pinning AFTER ordering. If `columnOrder` doesn't include pinned columns, they vanish.
**How to avoid:** Always include ALL column IDs in `columnOrder` when setting it. Pinned columns should be first in the array. When user drags, prevent pinned columns from being moved.
**Warning signs:** Pinned columns disappear or jump position after drag.

### Pitfall 2: Filter State Collision Between Phase 4 and Phase 5
**What goes wrong:** Phase 4 dimension filters (partner, type, batch) use `useFilterState` which writes to URL params. Phase 5 in-column filters also write to TanStack `columnFilters`. They could collide.
**Why it happens:** Both write to the same `columnFilters` state on the table.
**How to avoid:** Keep Phase 4 filters URL-backed (existing behavior). Keep Phase 5 in-column filters as React state only (not URL-backed). Merge both into the `columnFilters` prop passed to `useReactTable`. The merge happens in `useDataTable`.
**Warning signs:** Clearing a dimension filter also clears an in-column filter, or vice versa.

### Pitfall 3: localStorage Hydration Mismatch
**What goes wrong:** Server-rendered HTML uses default columns; client hydrates with localStorage state. React hydration error.
**Why it happens:** Next.js server render doesn't have access to localStorage.
**How to avoid:** Initialize state with defaults, then apply localStorage in a `useEffect` after mount. This avoids hydration mismatch but causes a brief flash. Alternatively, use `suppressHydrationWarning` on the table container.
**Warning signs:** Hydration mismatch console errors, columns flickering on page load.

### Pitfall 4: Performance with 61 Column Toggles
**What goes wrong:** Toggling a column re-renders the entire table including all virtualized rows.
**Why it happens:** `columnVisibility` change triggers TanStack to recompute visible columns, which cascades to all rows.
**How to avoid:** Batch visibility changes (e.g., "Show All" toggles all at once, not one by one). Use `React.startTransition` for non-urgent visibility updates if needed.
**Warning signs:** Lag when clicking "Show All" or "Hide All" with large dataset.

### Pitfall 5: Ghost Element Styling During Drag
**What goes wrong:** The dragged column ghost looks broken (wrong width, missing styles, overlapping).
**Why it happens:** @dnd-kit creates a drag overlay that may not inherit table cell styles.
**How to avoid:** Use `DragOverlay` component from @dnd-kit with a custom render that matches the header cell styling. Set explicit width from the column's current size.
**Warning signs:** Ghost element has wrong size or no styling during drag.

## Code Examples

### TanStack Column Visibility Toggle
```typescript
// columnVisibility is already in useDataTable
// Toggle a single column:
table.getColumn('TOTAL_ACCOUNTS')?.toggleVisibility(false); // hide
table.getColumn('TOTAL_ACCOUNTS')?.toggleVisibility(true);  // show

// Get visibility state for UI:
const isVisible = table.getColumn('TOTAL_ACCOUNTS')?.getIsVisible();
```

### TanStack Column Order State
```typescript
// Add to useReactTable config:
const [columnOrder, setColumnOrder] = useState<string[]>([]);

const table = useReactTable({
  // ...existing config
  state: {
    // ...existing state
    columnOrder,
  },
  onColumnOrderChange: setColumnOrder,
});

// On drag end, compute new order:
import { arrayMove } from '@dnd-kit/sortable';
const newOrder = arrayMove(columnOrder, oldIndex, newIndex);
setColumnOrder(newOrder);
```

### @dnd-kit Sortable Header
```typescript
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function DraggableHeader({ header }: { header: Header }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: header.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <th ref={setNodeRef} style={style}>
      <div {...attributes} {...listeners} className="cursor-grab">
        <GripVertical size={14} />
      </div>
      {/* rest of header content */}
    </th>
  );
}
```

### Custom Range Filter Function
```typescript
import { type FilterFn } from '@tanstack/react-table';

const rangeFilter: FilterFn<Record<string, unknown>> = (
  row, columnId, filterValue: { min?: number; max?: number }
) => {
  const value = row.getValue<number>(columnId);
  if (value == null) return false;
  if (filterValue.min != null && value < filterValue.min) return false;
  if (filterValue.max != null && value > filterValue.max) return false;
  return true;
};
```

### Custom Checklist Filter Function
```typescript
const checklistFilter: FilterFn<Record<string, unknown>> = (
  row, columnId, filterValue: string[]
) => {
  if (!filterValue.length) return true;
  const value = String(row.getValue(columnId) ?? '');
  return filterValue.includes(value);
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| react-beautiful-dnd | @dnd-kit | 2022+ | rbd unmaintained; @dnd-kit is the React ecosystem standard |
| Manual column show/hide | TanStack columnVisibility | TanStack Table v8 | Built-in state management, no custom logic needed |
| Custom column reorder | TanStack columnOrder | TanStack Table v8 | Single state array controls render order |
| Manual filter functions | TanStack custom filterFn | TanStack Table v8 | Composable with built-in filter pipeline |

## Open Questions

1. **@dnd-kit React 19 compatibility**
   - What we know: @dnd-kit v6 works with React 18. The project uses React 19.2.4.
   - What's unclear: Whether @dnd-kit v6 has any React 19 issues (ref callback changes, etc.)
   - Recommendation: Install and test. If issues arise, fall back to HTML5 drag events with manual accessibility. LOW risk — @dnd-kit is actively maintained.

2. **Column domain grouping assignments**
   - What we know: The 61 columns fall into natural groups (identity, financials, collection curves, outreach, conversion, etc.) visible from the config comments.
   - What's unclear: Exact grouping the user would expect.
   - Recommendation: Use the existing comment groups in `config.ts` as the basis. Groups: Identity, Account Counts, Financials, Balance Bands, Timing, Credit, Payments, Collection Curves, Penetration, Conversion, Digital Channels.

## Sources

### Primary (HIGH confidence)
- TanStack Table v8 column visibility API — `column.getToggleVisibilityHandler()`, `columnVisibility` state
- TanStack Table v8 column ordering — `columnOrder` state, `onColumnOrderChange`
- TanStack Table v8 custom filter functions — `filterFn` on column definition
- Existing codebase: `useDataTable` hook, `COLUMN_CONFIGS`, `columnDefs`, `useFilterState`

### Secondary (MEDIUM confidence)
- @dnd-kit documentation for sortable lists and DragOverlay usage
- shadcn/ui Sheet, Popover, Checkbox, ScrollArea component APIs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - TanStack features verified in existing codebase; @dnd-kit is ecosystem standard
- Architecture: HIGH - Patterns follow TanStack conventions and existing codebase patterns
- Pitfalls: HIGH - Based on known TanStack + DnD integration challenges

**Research date:** 2026-04-11
**Valid until:** 2026-05-11
