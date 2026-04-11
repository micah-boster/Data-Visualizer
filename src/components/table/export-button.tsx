'use client';

import { Download } from 'lucide-react';
import type { Table } from '@tanstack/react-table';
import type { ActiveFilter } from '@/hooks/use-filter-state';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { buildCSVFromTable } from '@/lib/export/csv';
import { downloadCSV, getExportFilename } from '@/lib/export/download';

interface ExportButtonProps {
  table: Table<Record<string, unknown>>;
  activeFilters: ActiveFilter[];
  isFetching: boolean;
  disabled: boolean;
}

export function ExportButton({
  table,
  activeFilters,
  isFetching,
  disabled,
}: ExportButtonProps) {
  function handleExport() {
    const { csv, rowCount } = buildCSVFromTable(table, activeFilters);
    downloadCSV(csv, getExportFilename());
    toast.success(`Exported ${rowCount} rows to CSV`);
  }

  const tooltipText = isFetching
    ? 'Waiting for data...'
    : 'No rows to export';

  const button = (
    <Button
      variant="outline"
      size="sm"
      disabled={disabled}
      onClick={handleExport}
    >
      <Download className="size-4" />
      Export
    </Button>
  );

  if (disabled) {
    return (
      <Tooltip>
        <TooltipTrigger
          className="inline-flex"
        >
          {button}
        </TooltipTrigger>
        <TooltipContent>{tooltipText}</TooltipContent>
      </Tooltip>
    );
  }

  return button;
}
