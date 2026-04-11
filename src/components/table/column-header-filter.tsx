'use client';

import { Filter } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { TextColumnFilter } from './text-column-filter';
import { NumericColumnFilter } from './numeric-column-filter';
import type { Column } from '@tanstack/react-table';

interface ColumnHeaderFilterProps {
  column: Column<Record<string, unknown>>;
  currentFilterValue: unknown;
  setColumnFilter: (columnId: string, value: unknown) => void;
  clearColumnFilter: (columnId: string) => void;
}

export function ColumnHeaderFilter({
  column,
  currentFilterValue,
  setColumnFilter,
  clearColumnFilter,
}: ColumnHeaderFilterProps) {
  const meta = column.columnDef.meta as { type?: string; identity?: boolean } | undefined;
  if (!meta || meta.identity) return null;
  if (!column.getCanFilter()) return null;

  const isText = meta.type === 'text';
  const isNumeric = ['currency', 'percentage', 'count', 'number'].includes(meta.type ?? '');

  if (!isText && !isNumeric) return null;

  const hasActiveFilter = currentFilterValue != null;

  return (
    <Popover>
      <PopoverTrigger
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
        className={`ml-1 shrink-0 transition-opacity ${
          hasActiveFilter
            ? 'text-primary opacity-100'
            : 'text-muted-foreground opacity-0 group-hover/header:opacity-100'
        }`}
        aria-label={`Filter ${column.columnDef.header as string}`}
      >
        <Filter className="h-3.5 w-3.5" />
      </PopoverTrigger>
      <PopoverContent
        className="p-3"
        align="start"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        {isText && (
          <TextColumnFilter
            column={column}
            currentValue={currentFilterValue as string[] | undefined}
            onApply={(value) => {
              if (value) {
                setColumnFilter(column.id, value);
              } else {
                clearColumnFilter(column.id);
              }
            }}
          />
        )}
        {isNumeric && (
          <NumericColumnFilter
            column={column}
            currentValue={
              currentFilterValue as { min?: number; max?: number } | undefined
            }
            onApply={(value) => {
              if (value) {
                setColumnFilter(column.id, value);
              } else {
                clearColumnFilter(column.id);
              }
            }}
          />
        )}
      </PopoverContent>
    </Popover>
  );
}
