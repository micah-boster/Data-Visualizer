/**
 * Pure CSV generation utility for exporting TanStack Table state.
 *
 * Reads visible columns and the current row model (already filtered + sorted),
 * applies existing formatters for WYSIWYG output, and prepends metadata rows
 * for traceability.
 */

import type { Table } from '@tanstack/react-table';
import type { ActiveFilter } from '@/hooks/use-filter-state';
import { COLUMN_CONFIGS } from '@/lib/columns/config';
import { getFormatter, isNumericType } from '@/lib/formatting/numbers';
import { formatDate } from '@/lib/formatting/dates';

/**
 * Escape a value for RFC 4180 CSV.
 * Wraps in double quotes and escapes internal quotes when the value
 * contains commas, double-quotes, or newlines.
 */
export function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Build a complete CSV string from the current TanStack Table state.
 *
 * The output includes metadata rows (source, date, filters, column mapping),
 * a blank separator line, column headers, and formatted data rows.
 *
 * @returns The CSV string and the number of data rows exported.
 */
export function buildCSVFromTable(
  table: Table<Record<string, unknown>>,
  activeFilters: ActiveFilter[]
): { csv: string; rowCount: number } {
  const visibleColumns = table.getVisibleLeafColumns();
  const rows = table.getRowModel().rows;

  // --- Build metadata rows ---
  const lines: string[] = [];

  // Row 1: Source table
  lines.push(`${escapeCSV('Source')},${escapeCSV('agg_batch_performance_summary')}`);

  // Row 2: Export timestamp (local time)
  const now = new Date();
  const exportDate = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(now);
  lines.push(`${escapeCSV('Exported')},${escapeCSV(exportDate)}`);

  // Row 3: Active filters
  const filterString =
    activeFilters.length > 0
      ? activeFilters.map((f) => `${f.label}: ${f.value}`).join('; ')
      : 'None';
  lines.push(`${escapeCSV('Active Filters')},${escapeCSV(filterString)}`);

  // Row 4: Column mapping (display name -> Snowflake key)
  // Phase 44 VOC-03 — when a column header is JSX (PARTNER_NAME, BATCH carry
  // <Term> wrappers as of Plan 44-01 Task 4), fall back to the plain
  // `config.label` string for CSV-friendly output instead of the raw
  // Snowflake key. Plain-string headers pass through unchanged.
  const configLookup = new Map(COLUMN_CONFIGS.map((c) => [c.key, c]));
  const headerStringFor = (col: { id: string; columnDef: { header?: unknown } }): string => {
    if (typeof col.columnDef.header === 'string') return col.columnDef.header;
    const config = configLookup.get(col.id);
    if (config && typeof config.label === 'string') return config.label;
    return col.id;
  };
  const mappingPairs = visibleColumns.map((col) => {
    const header = headerStringFor(col);
    const config = configLookup.get(col.id);
    const snowflakeKey = config?.key ?? col.id;
    return `${header} = ${snowflakeKey}`;
  });
  lines.push(
    `${escapeCSV('Column Mapping')},${escapeCSV(mappingPairs.join(' | '))}`
  );

  // Row 5: Blank separator
  lines.push('');

  // --- Header row ---
  const headers = visibleColumns.map((col) => escapeCSV(headerStringFor(col)));
  lines.push(headers.join(','));

  // --- Data rows ---
  for (const row of rows) {
    const cells = visibleColumns.map((col) => {
      const value = row.getValue(col.id);

      if (value == null) {
        return '';
      }

      const meta = col.columnDef.meta as { type?: string } | undefined;
      const colType = meta?.type;

      if (colType === 'date') {
        return escapeCSV(formatDate(value as string));
      }

      if (colType && isNumericType(colType)) {
        const formatter = getFormatter(colType);
        return escapeCSV(formatter(value as number));
      }

      return escapeCSV(String(value));
    });
    lines.push(cells.join(','));
  }

  return { csv: lines.join('\n'), rowCount: rows.length };
}
