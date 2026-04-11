import type { Row, Column } from '@tanstack/react-table';

export interface AggregateResult {
  primary: number | null;
  label: string;
}

/**
 * Compute aggregate values for visible columns based on column type.
 *
 * - currency/number: sum
 * - count: sum
 * - percentage: average (summing percentages is meaningless)
 * - text/date: count of non-null values
 */
export function computeAggregates(
  rows: Row<Record<string, unknown>>[],
  visibleColumns: Column<Record<string, unknown>>[]
): Record<string, AggregateResult> {
  const result: Record<string, AggregateResult> = {};

  for (const column of visibleColumns) {
    const meta = column.columnDef.meta as { type?: string; identity?: boolean } | undefined;
    const colType = meta?.type ?? 'text';
    const colId = column.id;

    if (colType === 'text' || colType === 'date') {
      // Count non-null values
      let count = 0;
      for (const row of rows) {
        if (row.getValue(colId) != null) count++;
      }
      result[colId] = { primary: count, label: 'Count' };
      continue;
    }

    if (colType === 'percentage') {
      // Average of non-null values
      let sum = 0;
      let count = 0;
      for (const row of rows) {
        const val = row.getValue(colId);
        if (val != null && typeof val === 'number') {
          sum += val;
          count++;
        }
      }
      result[colId] = {
        primary: count > 0 ? sum / count : null,
        label: 'Avg',
      };
      continue;
    }

    // currency, count, number -> sum
    let sum = 0;
    let hasValue = false;
    for (const row of rows) {
      const val = row.getValue(colId);
      if (val != null && typeof val === 'number') {
        sum += val;
        hasValue = true;
      }
    }
    result[colId] = {
      primary: hasValue ? sum : null,
      label: 'Sum',
    };
  }

  return result;
}
