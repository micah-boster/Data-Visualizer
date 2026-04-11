import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import type { Column } from '@tanstack/react-table';

interface SortIndicatorProps {
  column: Column<Record<string, unknown>>;
}

export function SortIndicator({ column }: SortIndicatorProps) {
  const sorted = column.getIsSorted();
  const sortIndex = column.getSortIndex();

  if (!sorted) {
    return (
      <ArrowUpDown className="ml-1 h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
    );
  }

  return (
    <span className="ml-1 inline-flex shrink-0 items-center gap-0.5">
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
