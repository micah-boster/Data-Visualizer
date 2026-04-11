# Phase 2: Core Table and Performance - Research

**Researched:** 2026-04-10
**Domain:** TanStack Table + TanStack Virtual, interactive data table with sorting, column pinning, and virtualized scrolling
**Confidence:** HIGH

## Summary

Phase 2 replaces the Phase 1 data preview (a simple HTML table showing 5 rows) with a full-featured interactive table powered by TanStack Table v8 and TanStack Virtual v3. The table must render all ~533 rows with virtual scrolling, support single and multi-column sorting (Shift+click), pin identity columns to the left, offer column presets via a tab bar, display a sticky header and summary footer, and support user-resizable columns.

The existing codebase already has TanStack Query for data fetching (`useData` hook), a column config system (`lib/columns/config.ts`), and a working API route that queries Snowflake. The current `COLUMN_CONFIGS` has only 5 starter columns -- this phase must expand it to cover all 61 columns from the Snowflake schema, organized into named presets. The `DataDisplay` component will be replaced/refactored into the new table component.

**Primary recommendation:** Use `@tanstack/react-table` v8.21.x with `@tanstack/react-virtual` v3.13.x. Client-side sorting on the full 533-row dataset (no server-side sorting needed at this scale). Column pinning via CSS `position: sticky` with the official `getCommonPinningStyles` pattern. Tab bar for preset switching built with simple state, not a routing change.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Comfortable row height** (~40-44px) -- balanced between data density and readability, like Linear's issue list
- **Horizontal scroll with frozen columns** -- first 1-2 identity columns (partner name, batch) pinned left while user scrolls right through metrics
- **Smart default column widths, user-resizable** -- each column gets a sensible width by data type (narrow for %, wider for names), users can drag column borders to resize
- **Virtualized scrolling** -- all ~533 rows rendered in a single scrollable view, only visible rows in the DOM for performance. No pagination.
- **8-12 columns per preset** -- curated starting sets, not the full 61
- **Multiple named column presets** -- launch with at least 2-3 presets:
  - **Finance**: identity columns + placed balance, gross collected, net revenue, collection rate
  - **Outreach / Penetration**: identity columns + contact rates, payment counts, unique payers, penetration metrics
  - (Claude to curate exact column lists from schema based on these themes)
- **Tab bar above the table** to switch presets -- horizontal tabs like "Finance | Outreach | All", one-click switching
- **Identity columns always present** across all presets: partner name, batch identifier, account type, key dates
- **Shift+click for quick multi-sort** -- click = single sort on that column, Shift+click = add as next sort level
- **Sort dialog for explicit control** -- separate panel/popover to build multi-sort rules, reorder priority, remove sorts
- **Default sort: partner name ascending** on first load
- **Arrow icon + numbered badge** on sorted column headers -- up/down arrow for direction, small circled number (1, 2, 3) for multi-sort priority
- **Sort state persists across data refresh** -- user's sort stays when they hit refresh, only data updates
- **Subtle row hover highlight** -- light tint on mouseover for row tracking
- **Subtle zebra striping** -- alternating very light background on even rows for scanning wide tables
- **Sticky header with distinct background** -- pinned as user scrolls, slightly darker/tinted background, bold text, clear separator
- **Sticky summary footer** -- pinned at bottom with aggregates (sum, avg, count) for key numeric columns. Updates dynamically as data changes.

### Claude's Discretion
- Exact column widths per data type
- Specific columns in each preset (using schema knowledge and domain judgment)
- Summary footer aggregate functions per column type
- Exact color values for zebra striping, hover states, header tint (within dark mode and light mode themes)
- Sort dialog design details
- Virtual scroll implementation approach (TanStack Virtual vs alternatives)

### Deferred Ideas (OUT OF SCOPE)
- **Split work view** (graph top / table bottom, graph visualizes selected rows) -- future phase
- **Saved views as widgets, widgets on dashboards** -- future phase (v4)
- **Explainable transformations principle** -- applies across all phases, should be added to PROJECT.md as a constraint
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| TABL-01 | User can view batch performance data in an interactive table | TanStack Table provides the headless table engine; column config expansion covers all 61 columns; preset system provides curated views; sticky header/footer for usability |
| TABL-02 | User can sort any column ascending/descending (single and multi-column) | TanStack Table built-in sorting with `getSortedRowModel()`, `enableMultiSort`, Shift+click support via `isMultiSortEvent`, sort indicators via `getIsSorted()` and `getSortIndex()` |
| TABL-06 | Table handles full dataset without lag (virtual scrolling if needed) | TanStack Virtual `useVirtualizer` renders only visible rows; 533 rows is lightweight for the virtual model; column pinning via CSS sticky preserves native scrolling |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @tanstack/react-table | ^8.21.3 | Headless table engine -- sorting, column pinning, sizing, visibility | De facto standard for React data tables. Headless = full style control. Already using TanStack Query in the project. |
| @tanstack/react-virtual | ^3.13.23 | Row virtualization -- only renders visible DOM rows | Official TanStack companion to react-table. Lightweight, well-documented integration path. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @tanstack/react-query | ^5.97.0 | Data fetching (already installed) | Already powering `useData` hook from Phase 1 |
| lucide-react | ^1.8.0 | Sort arrow icons, UI icons (already installed) | ArrowUp, ArrowDown, ArrowUpDown icons for sort indicators |
| clsx + tailwind-merge | already installed | Conditional class composition | Already used via `cn()` utility in `lib/utils.ts` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @tanstack/react-virtual | react-virtuoso | react-virtuoso has simpler API but less control over table integration; TanStack Virtual is same ecosystem |
| Custom sort dialog | @radix-ui/react-popover | Project uses Base UI / shadcn v4 -- use shadcn's Popover component if available, otherwise build with Base UI primitives |

**Installation:**
```bash
npm install @tanstack/react-table @tanstack/react-virtual
```

## Architecture Patterns

### Recommended Project Structure
```
src/
  components/
    table/
      data-table.tsx          # Main table component (client component)
      table-header.tsx         # Sticky header with sort indicators
      table-body.tsx           # Virtualized row rendering
      table-footer.tsx         # Sticky summary footer with aggregates
      sort-indicator.tsx       # Arrow + numbered badge component
      sort-dialog.tsx          # Multi-sort builder popover
      column-preset-tabs.tsx   # Tab bar for preset switching
      pinning-styles.ts        # getCommonPinningStyles utility
  lib/
    columns/
      config.ts               # Expanded: all 61 columns with types (MODIFY existing)
      presets.ts               # Named column preset definitions
      widths.ts                # Default widths by data type
    table/
      hooks.ts                 # useTableInstance, useColumnPresets, useSortState
      aggregations.ts          # Footer aggregate calculations (sum, avg, count)
  hooks/
    use-data.ts                # Existing -- modify to accept full column list
```

### Pattern 1: Headless Table with TanStack Table
**What:** TanStack Table is headless -- it manages state and logic, you render the UI.
**When to use:** Always for this project -- full control over styling.
**Example:**
```typescript
// Source: TanStack Table docs - sorting guide
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  type ColumnDef,
  flexRender,
} from '@tanstack/react-table';

const [sorting, setSorting] = useState<SortingState>([
  { id: 'PARTNER_NAME', desc: false }, // Default sort
]);

const table = useReactTable({
  data,
  columns,
  state: { sorting, columnPinning, columnVisibility },
  onSortingChange: setSorting,
  getCoreRowModel: getCoreRowModel(),
  getSortedRowModel: getSortedRowModel(),
  enableMultiSort: true,
  isMultiSortEvent: (e) => e.shiftKey, // Shift+click for multi-sort
  enableSortingRemoval: false, // Always maintain a sort direction
  columnResizeMode: 'onChange',
});
```

### Pattern 2: Row Virtualization with TanStack Virtual
**What:** Only render visible rows in the DOM, use spacer elements for scroll height.
**When to use:** When rendering 100+ rows. At 533 rows this is good practice even though the dataset isn't massive.
**Example:**
```typescript
// Source: TanStack Table virtualization guide + TanStack Virtual docs
import { useVirtualizer } from '@tanstack/react-virtual';

const tableContainerRef = useRef<HTMLDivElement>(null);
const { rows } = table.getRowModel();

const rowVirtualizer = useVirtualizer({
  count: rows.length,
  getScrollElement: () => tableContainerRef.current,
  estimateSize: () => 42, // ~40-44px row height per user decision
  overscan: 10, // Render 10 extra rows above/below viewport
});

// Render container with fixed height, overflow-y: auto
// Map virtualizer.getVirtualItems() to table rows
// Use paddingTop/paddingBottom spacers for scroll area
```

### Pattern 3: Sticky Column Pinning via CSS
**What:** Pin identity columns to the left using CSS `position: sticky` instead of split tables.
**When to use:** When pinning 1-2 columns with horizontal scroll.
**Example:**
```typescript
// Source: TanStack Table official sticky column pinning example
import { type Column, type CSSProperties } from '@tanstack/react-table';

const getCommonPinningStyles = <T,>(column: Column<T>): CSSProperties => {
  const isPinned = column.getIsPinned();
  const isLastLeftPinnedColumn =
    isPinned === 'left' && column.getIsLastColumn('left');
  const isFirstRightPinnedColumn =
    isPinned === 'right' && column.getIsFirstColumn('right');

  return {
    boxShadow: isLastLeftPinnedColumn
      ? '-4px 0 4px -4px gray inset'
      : isFirstRightPinnedColumn
        ? '4px 0 4px -4px gray inset'
        : undefined,
    left: isPinned === 'left' ? `${column.getStart('left')}px` : undefined,
    right: isPinned === 'right' ? `${column.getAfter('right')}px` : undefined,
    position: isPinned ? 'sticky' : 'relative',
    width: column.getSize(),
    zIndex: isPinned ? 1 : 0,
  };
};
```

### Pattern 4: Column Presets as Visibility State
**What:** Each preset is a `Record<string, boolean>` mapping column IDs to visibility.
**When to use:** To implement the tab bar preset switcher.
**Example:**
```typescript
// Preset definitions
const PRESETS = {
  finance: {
    PARTNER_NAME: true, BATCH_NAME: true, ACCOUNT_TYPE: true,
    PLACED_BALANCE: true, GROSS_COLLECTED: true, NET_REVENUE: true,
    COLLECTION_RATE: true, /* ... */
  },
  outreach: {
    PARTNER_NAME: true, BATCH_NAME: true, ACCOUNT_TYPE: true,
    CONTACT_RATE: true, PAYMENT_COUNT: true, UNIQUE_PAYERS: true,
    /* ... */
  },
} satisfies Record<string, Record<string, boolean>>;

// Switch preset
const [columnVisibility, setColumnVisibility] = useState(PRESETS.finance);
// Tab click handler: setColumnVisibility(PRESETS[presetName])
```

### Anti-Patterns to Avoid
- **Paginating instead of virtualizing:** User explicitly wants a single scrollable view, no pagination.
- **Server-side sorting for 533 rows:** Unnecessary network round-trips. Client-side sorting is instant at this scale.
- **Split tables for column pinning:** Creates alignment headaches between header/body. Use CSS sticky approach instead.
- **Rendering all 61 columns at once:** Use column visibility with presets. Only the active preset's columns render.
- **Recalculating aggregates on every render:** Memoize footer aggregates. Recompute only when data or visible columns change.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Table sorting logic | Custom sort comparators for every column | TanStack Table `getSortedRowModel()` with built-in sorting functions | Handles nulls, multi-sort priority, direction toggling, stable sort order |
| Virtual scrolling | Custom intersection observer or windowing | `@tanstack/react-virtual` `useVirtualizer` | Handles dynamic measurements, overscan, scroll restoration, momentum scrolling |
| Column pinning math | Manual `position: sticky` with hardcoded offsets | TanStack Table's `column.getStart()` / `column.getAfter()` | Auto-calculates offsets based on column widths, handles resize correctly |
| Column resize drag | Custom mousedown/mousemove/mouseup handlers | TanStack Table `header.getResizeHandler()` | Handles touch events, cursor styling, delta calculation, min/max constraints |
| Multi-sort state management | Custom reducer for sort array | TanStack Table's `SortingState` + `onSortingChange` | Handles shift-click, max sort count, sort removal, toggle direction |

**Key insight:** TanStack Table is headless -- it gives you all the state management and logic but zero UI. This means you get full control over styling (critical for the dark mode theme, zebra striping, and custom sort indicators) while getting battle-tested sorting, pinning, and sizing logic for free.

## Common Pitfalls

### Pitfall 1: Virtualization + Sticky Header Conflict
**What goes wrong:** The virtualizer uses absolute positioning or padding spacers for rows, which can break `position: sticky` on the thead.
**Why it happens:** Sticky positioning requires specific overflow and positioning context.
**How to avoid:** Use a container with `overflow: auto` on the outer div. The `<thead>` gets `position: sticky; top: 0; z-index: 2`. The tbody uses padding-based virtualization (paddingTop/paddingBottom on tbody) rather than absolute positioning on individual rows. This keeps the native table layout which sticky headers need.
**Warning signs:** Header scrolls away with content, or header detaches from column alignment.

### Pitfall 2: Pinned Column Background Transparency
**What goes wrong:** Pinned columns show content scrolling behind them because the background is transparent/semi-transparent.
**Why it happens:** CSS `position: sticky` elements need an explicit opaque background; otherwise the non-pinned content shows through.
**How to avoid:** Always set an explicit background color on pinned cells -- match the row's background (including zebra stripe color for even rows). In dark mode, use the dark card/background color.
**Warning signs:** Text overlapping behind pinned columns during horizontal scroll.

### Pitfall 3: Column Width Inconsistency Between Header and Body
**What goes wrong:** Header column widths drift from body column widths after resize.
**Why it happens:** Using separate `<table>` elements for header and body, or using CSS grid instead of native table layout.
**How to avoid:** Use a single `<table>` element. Apply widths via `column.getSize()` on both `<th>` and `<td>`. Use `table-layout: fixed` to enforce width consistency. TanStack Table's `header.getSize()` and `cell.column.getSize()` return the same value.
**Warning signs:** Columns misalign after resizing or after data reload.

### Pitfall 4: Sort State Lost on Data Refresh
**What goes wrong:** Sorting resets to default when data refreshes.
**Why it happens:** Re-creating the table instance or resetting state on data change.
**How to avoid:** Keep sorting state in React state (`useState`) outside the table instance. Pass it via `state: { sorting }`. TanStack Query's `data` updates don't affect component state. The user decision explicitly requires sort persistence across refresh.
**Warning signs:** Sort arrows disappear after clicking the Refresh button.

### Pitfall 5: Fetching All 61 Columns When Only 8-12 Are Visible
**What goes wrong:** API fetches all 61 columns but only 8-12 are displayed, wasting bandwidth and Snowflake compute.
**Why it happens:** Not coordinating column visibility with the API request.
**How to avoid:** Two approaches -- (a) always fetch all columns and filter client-side (simpler, ~533 rows x 61 cols is small), or (b) fetch only visible columns per preset (more optimized). **Recommendation: Fetch all columns once, filter client-side.** At 533 rows x 61 columns (~32K cells), the payload is small. This avoids re-fetching when switching presets and makes the summary footer able to aggregate any column regardless of visibility.
**Warning signs:** Network waterfall on every preset switch if using approach (b).

### Pitfall 6: Summary Footer Not Updating With Sort/Filter Changes
**What goes wrong:** Footer shows stale aggregates when data is filtered in future phases.
**Why it happens:** Computing aggregates from the original data array instead of the table's current row model.
**How to avoid:** Compute aggregates from `table.getRowModel().rows` (the post-sort, post-filter row model). Use `useMemo` keyed on the row model. For Phase 2 (no filtering yet), this is the same as all rows, but building it correctly now prevents bugs in Phase 4.
**Warning signs:** Footer sums don't match visible rows after filtering is added.

## Code Examples

### Complete Table Hook Setup
```typescript
// Source: TanStack Table docs - sorting, pinning, sizing guides
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  type ColumnPinningState,
  type VisibilityState,
  type ColumnDef,
} from '@tanstack/react-table';

export function useDataTable(data: Record<string, unknown>[]) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'PARTNER_NAME', desc: false },
  ]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [columnPinning] = useState<ColumnPinningState>({
    left: ['PARTNER_NAME', 'BATCH_NAME'],
    right: [],
  });

  const table = useReactTable({
    data,
    columns, // ColumnDef[] built from expanded COLUMN_CONFIGS
    state: {
      sorting,
      columnVisibility,
      columnPinning,
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableMultiSort: true,
    isMultiSortEvent: (e) => e.shiftKey,
    enableSortingRemoval: false,
    columnResizeMode: 'onChange',
  });

  return { table, sorting, setSorting, setColumnVisibility };
}
```

### Virtualized Table Body Rendering
```typescript
// Source: TanStack Virtual docs + TanStack Table virtualization guide
const tableContainerRef = useRef<HTMLDivElement>(null);
const { rows } = table.getRowModel();

const rowVirtualizer = useVirtualizer({
  count: rows.length,
  getScrollElement: () => tableContainerRef.current,
  estimateSize: () => 42,
  overscan: 10,
});

const virtualRows = rowVirtualizer.getVirtualItems();
const totalSize = rowVirtualizer.getTotalSize();

// Padding approach for scroll space
const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0;
const paddingBottom =
  virtualRows.length > 0
    ? totalSize - virtualRows[virtualRows.length - 1].end
    : 0;

// In JSX:
// <div ref={tableContainerRef} style={{ height: 'calc(100vh - 200px)', overflow: 'auto' }}>
//   <table style={{ tableLayout: 'fixed' }}>
//     <thead> ... sticky header ... </thead>
//     <tbody>
//       {paddingTop > 0 && <tr><td style={{ height: paddingTop }} /></tr>}
//       {virtualRows.map(virtualRow => {
//         const row = rows[virtualRow.index];
//         return <tr key={row.id}> ... </tr>;
//       })}
//       {paddingBottom > 0 && <tr><td style={{ height: paddingBottom }} /></tr>}
//     </tbody>
//     <tfoot> ... sticky footer ... </tfoot>
//   </table>
// </div>
```

### Sort Indicator Component
```typescript
// Source: Custom pattern based on TanStack Table sorting API
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';

function SortIndicator({ column }: { column: Column<any> }) {
  const sorted = column.getIsSorted();
  const sortIndex = column.getSortIndex();

  if (!sorted) {
    return <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground/50" />;
  }

  return (
    <span className="ml-1 inline-flex items-center gap-0.5">
      {sorted === 'asc' ? (
        <ArrowUp className="h-3.5 w-3.5" />
      ) : (
        <ArrowDown className="h-3.5 w-3.5" />
      )}
      {sortIndex > 0 && (
        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
          {sortIndex + 1}
        </span>
      )}
    </span>
  );
}
```

### Column Width Defaults by Type
```typescript
// Recommended widths per CONTEXT.md: "sensible width by data type"
const WIDTH_BY_TYPE: Record<string, number> = {
  text: 180,        // Partner names, batch names
  currency: 130,    // Dollar amounts
  percentage: 90,   // Rates and percentages
  count: 100,       // Whole numbers
  date: 120,        // Date values
  number: 110,      // Generic numbers
};

// Apply in column definitions:
// size: WIDTH_BY_TYPE[config.type] ?? 150,
// minSize: 60,
// maxSize: 400,
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| react-table v7 (render props) | @tanstack/react-table v8 (hooks, headless) | 2022 | Complete API rewrite; v7 patterns are incompatible |
| react-window / react-virtualized | @tanstack/react-virtual v3 | 2023 | Simpler API, better TypeScript support, active maintenance |
| Split tables for column pinning | CSS `position: sticky` pinning | TanStack Table v8.5+ | Single table element, native scroll, no alignment bugs |
| Manual sort state management | Built-in multi-sort with `SortingState` | TanStack Table v8 | Shift-click, sort removal, custom events all built in |

**Deprecated/outdated:**
- `react-table` v7 (package name `react-table`): Completely different API, not compatible with v8 patterns
- `react-virtualized`: Larger bundle, more complex API, less active maintenance than TanStack Virtual

## Open Questions

1. **Full 61-column schema**
   - What we know: The schema validator queries `INFORMATION_SCHEMA.COLUMNS` and currently only 5 columns are configured. The `unexpected` array from schema validation would list all the columns we haven't configured.
   - What's unclear: Exact column names, data types, and which columns map to which presets. The current config has `PARTNER_NAME`, `BATCH_NAME`, `TOTAL_BALANCE`, `RECOVERY_RATE`, `ACCOUNT_COUNT`.
   - Recommendation: During implementation, first run the app to trigger schema validation and capture the full column list from the `unexpected` warnings. Then expand `COLUMN_CONFIGS` to cover all 61 columns with proper types, labels, and preset assignments. Alternatively, the implementer can query `INFORMATION_SCHEMA.COLUMNS` directly for column names and data types.

2. **API column fetching strategy**
   - What we know: Current API accepts a `columns` param and only selects requested columns.
   - What's unclear: Whether to modify API to always return all columns or keep the selective approach.
   - Recommendation: Modify the `useData` hook to request all columns (pass `*` or omit the param), and let column visibility be purely a client-side concern. This enables instant preset switching without re-fetching and lets the footer aggregate any column.

3. **Sort dialog UI components**
   - What we know: shadcn v4 with Base UI is the component library. The project has Button, Card, Alert, Input, Tooltip, Sheet available.
   - What's unclear: Whether shadcn Popover is installed or if it needs to be added.
   - Recommendation: Add shadcn Popover component for the sort dialog. If not available, use the Sheet component (already installed) as a slide-out panel.

## Sources

### Primary (HIGH confidence)
- [TanStack Table Sorting Guide](https://tanstack.com/table/v8/docs/guide/sorting) - Complete sorting API, multi-sort config, state management
- [TanStack Table Column Pinning Guide](https://tanstack.com/table/v8/docs/guide/column-pinning) - Pinning state, CSS sticky approach, getStart/getAfter API
- [TanStack Table Column Sizing Guide](https://tanstack.com/table/v8/docs/guide/column-sizing) - Default widths, resize mode, resize handlers
- [TanStack Table Virtualization Guide](https://tanstack.com/table/v8/docs/guide/virtualization) - Integration pattern with TanStack Virtual
- [TanStack Table Sticky Column Pinning Example](https://github.com/TanStack/table/tree/main/examples/react/column-pinning-sticky) - getCommonPinningStyles reference implementation
- [@tanstack/react-table npm](https://www.npmjs.com/package/@tanstack/react-table) - v8.21.3 latest
- [@tanstack/react-virtual npm](https://www.npmjs.com/package/@tanstack/react-virtual) - v3.13.23 latest

### Secondary (MEDIUM confidence)
- [GitHub Discussion #4471](https://github.com/TanStack/table/discussions/4471) - Working sticky column + header implementation with Tailwind
- [GitHub Discussion #4204](https://github.com/TanStack/table/discussions/4204) - Sticky column pinning patterns and known issues

### Tertiary (LOW confidence)
- Medium articles on TanStack Table virtualization patterns - confirm general architecture but code examples may be outdated

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - TanStack Table v8 + TanStack Virtual v3 are the clear standard for this use case, well-documented, active maintenance
- Architecture: HIGH - Patterns are well-established in official docs and examples; project structure follows standard React + Next.js conventions
- Pitfalls: HIGH - Based on official docs, GitHub discussions, and common patterns documented by the TanStack team
- Column presets/schema: MEDIUM - The exact 61 columns need to be discovered from Snowflake; preset curation will require domain judgment during implementation

**Research date:** 2026-04-10
**Valid until:** 2026-05-10 (stable libraries, unlikely to change)
