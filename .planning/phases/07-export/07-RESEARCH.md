# Phase 7: Export - Research

**Researched:** 2026-04-11
**Domain:** Client-side CSV generation from TanStack Table state
**Confidence:** HIGH

## Summary

Phase 7 is a well-bounded feature: generate a CSV file from the current TanStack Table state and trigger a browser download. All necessary data is already in the browser -- the table instance holds filtered rows, sort order, column visibility, and formatted cell values. No server round-trip is needed.

The implementation requires three pieces: (1) a pure utility function that reads the TanStack Table instance and produces a CSV string with metadata rows, (2) a browser download trigger using the Blob API, and (3) an Export button in the toolbar with a toast notification on success. The project does not currently have a toast library, so Sonner must be added via shadcn.

**Primary recommendation:** Build a single `exportTableToCSV(table)` utility that reads visible columns and the current row model, formats values using the existing `getFormatter` functions, prepends metadata rows, and triggers download via Blob + anchor click. Add Sonner for the success toast.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Export button lives in the table toolbar, right end (after existing controls like preset tabs and sort)
- Button shows a download icon + "Export" label (icon + text, not icon-only)
- Static label -- always says "Export", no dynamic row count in the button itself
- Button is disabled when: zero rows after filtering, or data is still loading/fetching
- Values are formatted as displayed in the table (WYSIWYG approach)
- Column headers use human-readable display names (e.g., "Partner Name", "Total Placed Amount")
- Metadata rows at the top of the CSV: source table name, export date/time, any active filters
- Row order matches the current table sort order
- Auto-generated filename: `bounce-batch-performance-YYYY-MM-DD.csv`
- No filter info in filename -- filter context lives in the metadata rows
- Instant browser download (no save dialog) -- click Export, file appears in downloads
- Client-side CSV generation -- data is already in the browser, no extra API call needed
- Toast notification after export: "Exported 127 rows to CSV" (includes row count)
- Export button disabled (greyed out) when zero rows -- tooltip explains why
- Export button disabled while data is fetching -- prevents exporting stale/incomplete data

### Claude's Discretion
- Toast duration and positioning
- Exact metadata row format in the CSV
- CSV encoding details (UTF-8 BOM for Excel compatibility, etc.)
- Button disabled state tooltip wording
- How display name to DB column mapping is communicated in metadata rows

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| EXPO-01 | User can export current filtered/sorted view to CSV | TanStack Table `table.getRowModel()` returns final processed rows; `getVisibleLeafColumns()` returns visible columns; existing formatters produce WYSIWYG values; Blob API triggers download |
| EXPO-02 | Export respects active filters and column visibility | `table.getRowModel()` already reflects all applied filters and sorting; `getVisibleLeafColumns()` excludes hidden columns; no additional filtering logic needed |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @tanstack/react-table | ^8.21.3 | Already installed; provides row model + column visibility APIs | Data source for export |
| sonner | ^2.x | Toast notifications | shadcn standard; replaces deprecated toast component |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | ^1.8.0 | Already installed; `Download` icon for export button | Button icon |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-rolled CSV | papaparse / csv-stringify | Overkill -- our data has no edge cases (no user input, no embedded commas/quotes in values). Simple join is sufficient. |
| sonner | react-hot-toast | sonner is the shadcn standard, already has a shadcn wrapper component |

**Installation:**
```bash
npx shadcn@latest add sonner
```
This installs the `sonner` package and creates `src/components/ui/sonner.tsx`. The `<Toaster />` component must then be added to the root layout.

## Architecture Patterns

### Recommended Project Structure
```
src/
  lib/
    export/
      csv.ts              # Pure CSV generation utility
      download.ts         # Browser download trigger (Blob + anchor)
  components/
    table/
      export-button.tsx   # Export button component
    ui/
      sonner.tsx          # Added by shadcn CLI
```

### Pattern 1: Read TanStack Table State for Export
**What:** Use `table.getRowModel().rows` and `table.getVisibleLeafColumns()` to extract exactly what the user sees.
**When to use:** Any time you need to serialize the current table view.
**Example:**
```typescript
// Source: TanStack Table v8 API
function getExportData(table: Table<Record<string, unknown>>) {
  const visibleColumns = table.getVisibleLeafColumns();
  const rows = table.getRowModel().rows;

  // Headers: use column.columnDef.header (the display name)
  const headers = visibleColumns.map(col =>
    typeof col.columnDef.header === 'string'
      ? col.columnDef.header
      : col.id
  );

  // Rows: get formatted value for each visible column
  const data = rows.map(row =>
    visibleColumns.map(col => {
      const value = row.getValue(col.id);
      if (value == null) return '';
      const meta = col.columnDef.meta as { type?: string } | undefined;
      if (meta?.type && meta.type !== 'text') {
        const formatter = getFormatter(meta.type);
        return formatter(value as number);
      }
      return String(value);
    })
  );

  return { headers, data, rowCount: rows.length };
}
```

### Pattern 2: CSV String Construction with Metadata
**What:** Build the CSV string with metadata rows at the top, then headers, then data.
**When to use:** For the export function.
**Example:**
```typescript
function buildCSV(
  headers: string[],
  data: string[][],
  metadata: { source: string; exportDate: string; filters: string[] }
): string {
  const lines: string[] = [];

  // Metadata rows (prefixed to distinguish from data)
  lines.push(`"Source","${metadata.source}"`);
  lines.push(`"Exported","${metadata.exportDate}"`);
  if (metadata.filters.length > 0) {
    lines.push(`"Active Filters","${metadata.filters.join('; ')}"`);
  } else {
    lines.push(`"Active Filters","None"`);
  }
  lines.push(''); // Blank line separator

  // Header row
  lines.push(headers.map(h => escapeCSV(h)).join(','));

  // Data rows
  for (const row of data) {
    lines.push(row.map(cell => escapeCSV(cell)).join(','));
  }

  return lines.join('\n');
}

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
```

### Pattern 3: Blob Download Trigger
**What:** Create a Blob from the CSV string, generate a temporary URL, click a hidden anchor element.
**When to use:** For triggering the browser download.
**Example:**
```typescript
function downloadCSV(csvContent: string, filename: string): void {
  // UTF-8 BOM for Excel compatibility
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], {
    type: 'text/csv;charset=utf-8;',
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
```

### Anti-Patterns to Avoid
- **Re-filtering data manually:** Do NOT re-apply filter logic to the raw data array. TanStack Table's `getRowModel()` already returns the final processed rows (filtered + sorted). Duplicating this logic would be fragile and could drift from the actual table state.
- **Using `table.getCoreRowModel()` for export:** This returns ALL rows, ignoring filters and sorting. Always use `table.getRowModel()` which reflects the complete pipeline.
- **Formatting values inside the CSV utility:** The CSV utility should receive already-formatted strings, or call the existing formatters. Do not create new formatting logic.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Toast notifications | Custom toast system | Sonner (via shadcn) | Handles positioning, stacking, accessibility, animations, auto-dismiss |
| CSV value escaping | Naive string concat | Proper `escapeCSV` function | Values with commas, quotes, or newlines break CSV format; RFC 4180 quoting rules are simple but easy to get wrong |

**Key insight:** The CSV generation itself IS simple enough to hand-roll (no library needed). The data is machine-generated (not user input), so edge cases are minimal. But the escapeCSV function must still handle commas in formatted values like `$1,234.56`.

## Common Pitfalls

### Pitfall 1: Forgetting to Escape Formatted Currency Values
**What goes wrong:** Currency values like `$1,234.56` contain commas. Without quoting, the CSV parser splits this into two columns.
**Why it happens:** Developers test with small numbers that don't hit the thousands separator.
**How to avoid:** Always run values through `escapeCSV()` which quotes any value containing commas.
**Warning signs:** CSV opens in Excel with columns shifted to the right on rows with large numbers.

### Pitfall 2: Using Raw Values Instead of Formatted Values
**What goes wrong:** The CSV contains `1234.56` instead of `$1,234.56`, or `0.153` instead of `15.3%`.
**Why it happens:** Using `row.getValue(colId)` gives the raw accessor value, not the formatted display string.
**How to avoid:** Apply the same `getFormatter(type)` functions used by `FormattedCell` to produce WYSIWYG output.
**Warning signs:** CSV values don't match what the user sees in the table.

### Pitfall 3: Missing UTF-8 BOM for Excel
**What goes wrong:** Opening the CSV in Excel on Windows shows garbled characters or interprets encoding incorrectly.
**Why it happens:** Excel defaults to the system's legacy encoding (e.g., Windows-1252) unless a BOM is present.
**How to avoid:** Prepend `\uFEFF` to the CSV string before creating the Blob.
**Warning signs:** Currency symbols or special characters appear as garbage in Excel.

### Pitfall 4: Not Revoking Object URLs
**What goes wrong:** Memory leak if many exports are performed in a session.
**Why it happens:** `URL.createObjectURL()` creates a reference that persists until explicitly revoked.
**How to avoid:** Call `URL.revokeObjectURL(url)` after the download is triggered.
**Warning signs:** Browser memory usage climbs with repeated exports.

### Pitfall 5: Export Button Enabled During Fetch
**What goes wrong:** User exports stale data while a refresh is in progress.
**Why it happens:** The `isFetching` state from TanStack Query is not checked.
**How to avoid:** Disable the export button when `isFetching` is true (this state is already available in `DataDisplay` via `useData()`).
**Warning signs:** Exported data doesn't match what eventually loads in the table.

## Code Examples

### Sonner Toast Usage
```typescript
// Source: shadcn sonner docs
import { toast } from 'sonner';

// After successful export:
toast.success(`Exported ${rowCount} rows to CSV`);
```

### Date Formatting for Filename
```typescript
function getExportFilename(): string {
  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  return `bounce-batch-performance-${date}.csv`;
}
```

### Lucide Download Icon
```typescript
import { Download } from 'lucide-react';

// In the button:
<Button variant="outline" size="sm" disabled={isDisabled}>
  <Download className="size-4" />
  Export
</Button>
```

### Metadata Row Format (Recommended)
```csv
"Source","agg_batch_performance_summary"
"Exported","2026-04-11 14:30:00"
"Active Filters","Partner: Acme Corp; Account Type: Credit Card"
"Column Mapping","Partner = PARTNER_NAME | Lender ID = LENDER_ID | ..."

[blank line]
Partner,Lender ID,Batch,...
Acme Corp,12345,2024-01,...
```

The "Column Mapping" metadata row maps display names to Snowflake column names for traceability (a key user requirement). This is a single row with pipe-separated pairs.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| FileSaver.js library | Native Blob API + anchor click | 2020+ | No dependency needed; Blob API is universal in modern browsers |
| shadcn Toast component | Sonner | 2024 | Toast component deprecated in shadcn; Sonner is the replacement |
| Server-side CSV generation | Client-side from table state | N/A | Data already in browser; no round-trip needed |

**Deprecated/outdated:**
- `shadcn toast` component: Deprecated, replaced by Sonner
- `FileSaver.js`: Unnecessary in modern browsers with Blob API support

## Open Questions

1. **Filter metadata format**
   - What we know: Active filters should appear in CSV metadata rows
   - What's unclear: How the filter state is exposed. Phase 4 (Filters) builds this, but we need to read whatever filter state exists at runtime.
   - Recommendation: The export utility should accept a `filters` parameter (array of strings like `"Partner: Acme Corp"`). The calling code extracts this from the filter state. If no filters exist yet (phases not complete), pass an empty array.

2. **Date column formatting in CSV**
   - What we know: The `formatDate` function exists in `src/lib/formatting/dates.ts`
   - What's unclear: Whether date columns need special handling vs other types
   - Recommendation: Include date type in the formatter switch alongside numeric types. Low risk since there are few date columns in the schema.

## Sources

### Primary (HIGH confidence)
- TanStack Table v8 API: `getRowModel()`, `getVisibleLeafColumns()`, `getValue()` -- core APIs for reading table state
- Project codebase: `src/lib/table/hooks.ts`, `src/lib/columns/config.ts`, `src/lib/formatting/numbers.ts` -- existing patterns for column config, formatting, and table state
- shadcn/ui Sonner docs (https://ui.shadcn.com/docs/components/radix/sonner) -- toast component installation and usage

### Secondary (MEDIUM confidence)
- TanStack Table discussions on CSV export (https://github.com/TanStack/table/discussions/5118) -- community patterns for reading table state
- MDN Blob API -- standard browser API for file download

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new libraries except Sonner (shadcn standard). All data APIs are already in TanStack Table.
- Architecture: HIGH - Straightforward utility function pattern. Data flow is clear: table instance -> visible columns + row model -> formatted CSV string -> Blob download.
- Pitfalls: HIGH - Well-documented domain. CSV escaping and Excel BOM are widely known issues.

**Research date:** 2026-04-11
**Valid until:** 2026-05-11 (stable domain, no moving parts)
