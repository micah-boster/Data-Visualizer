'use client';

import { useState } from 'react';
import {
  Sparkles,
  BarChart3,
  Columns3,
  Download,
  ArrowUpDown,
} from 'lucide-react';
import type { Table, SortingState } from '@tanstack/react-table';
import type { DrillState, DrillLevel } from '@/hooks/use-drill-down';
import type { ActiveFilter } from '@/hooks/use-filter-state';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';
import { BreadcrumbTrail } from '@/components/navigation/breadcrumb-trail';
import { HeatmapToggle } from '@/components/table/heatmap-toggle';
import { AnomalyToolbarTrigger } from '@/components/anomaly/anomaly-toolbar-trigger';
import { PresetDropdown } from './preset-dropdown';
import { FilterPopover } from './filter-popover';
import { SaveViewPopover } from './save-view-popover';
import { SortDialog } from '@/components/table/sort-dialog';
import { ToolbarDivider } from '@/components/patterns/toolbar-divider';
import { cn } from '@/lib/utils';

interface UnifiedToolbarProps {
  // Drill state
  drillState: DrillState;
  onNavigateToLevel: (level: DrillLevel) => void;
  onDrillToPartner: (name: string) => void;
  breadcrumbRowCounts: {
    root?: number;
    partner?: number;
    batch?: number;
  };

  // Charts
  chartsExpanded: boolean;
  onToggleCharts: () => void;

  // Query
  onOpenQuery: () => void;

  // Presets (root only)
  activePreset: string;
  onPresetChange: (preset: string) => void;

  // Filters (root only)
  filterData: Record<string, unknown>[];
  partnerOptions: string[];
  typeOptions: string[];
  batchOptions: string[];
  selectedPartner: string | null;
  selectedType: string | null;
  selectedBatch: string | null;
  onFilterChange: (param: string, value: string | null) => void;
  activeFilters: ActiveFilter[];
  onClearAllFilters: () => void;

  // Column picker
  onOpenColumnPicker: () => void;
  visibleColumnCount: number;
  totalColumnCount: number;

  // Sort
  sorting: SortingState;
  onSortingChange: (sorting: SortingState) => void;

  // Export
  table: Table<Record<string, unknown>>;
  isFetching: boolean;

  // Save view
  onSaveView: (name: string, options?: { includeDrill?: boolean }) => void;
  onReplaceView: (name: string, options?: { includeDrill?: boolean }) => void;
  hasViewWithName: (name: string) => boolean;
  /** When true, SaveViewPopover renders the "Include current drill state" checkbox. */
  canIncludeDrill?: boolean;
}

/**
 * Single compact toolbar row replacing all the stacked chrome above the table.
 * Left: breadcrumb. Right: icon buttons opening popovers/sheets on demand.
 */
export function UnifiedToolbar({
  drillState,
  onNavigateToLevel,
  onDrillToPartner,
  breadcrumbRowCounts,
  chartsExpanded,
  onToggleCharts,
  onOpenQuery,
  activePreset,
  onPresetChange,
  filterData,
  partnerOptions,
  typeOptions,
  batchOptions,
  selectedPartner,
  selectedType,
  selectedBatch,
  onFilterChange,
  activeFilters,
  onClearAllFilters,
  onOpenColumnPicker,
  visibleColumnCount,
  totalColumnCount,
  sorting,
  onSortingChange,
  table,
  isFetching,
  onSaveView,
  onReplaceView,
  hasViewWithName,
  canIncludeDrill,
}: UnifiedToolbarProps) {
  const isRoot = drillState.level === 'root';

  // Lazy-load sort dialog to avoid importing Sheet unconditionally
  const [sortOpen, setSortOpen] = useState(false);

  return (
    <div className="flex h-10 shrink-0 items-center justify-between gap-2 border-b px-2">
      {/* Left: breadcrumb */}
      <BreadcrumbTrail
        state={drillState}
        rowCounts={breadcrumbRowCounts}
        onNavigate={onNavigateToLevel}
      />

      {/* Right: compact icon buttons */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Query (Cmd+K) */}
        <Tooltip>
          <TooltipTrigger
            render={
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onOpenQuery}>
                <Sparkles className="h-4 w-4" />
              </Button>
            }
          />
          <TooltipContent>Ask AI (⌘K)</TooltipContent>
        </Tooltip>

        {/* Anomalies */}
        <AnomalyToolbarTrigger onDrillToPartner={onDrillToPartner} />

        {/* Charts toggle */}
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className={cn('h-8 w-8', chartsExpanded && 'bg-muted')}
                onClick={onToggleCharts}
              >
                <BarChart3 className="h-4 w-4" />
              </Button>
            }
          />
          <TooltipContent>{chartsExpanded ? 'Hide charts' : 'Show charts'}</TooltipContent>
        </Tooltip>

        <ToolbarDivider />

        {/* Preset dropdown (root only) */}
        {isRoot && (
          <PresetDropdown
            activePreset={activePreset}
            onPresetChange={onPresetChange}
          />
        )}

        {/* Heatmap toggle (partner+ only, self-hides at root) */}
        <HeatmapToggle />

        {/* Columns + Sort cluster — keyboard-focus glow via :has(:focus-visible) */}
        <div className="flex items-center gap-1 rounded-md focus-glow-within">
          {/* Columns */}
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={onOpenColumnPicker}
                >
                  <Columns3 className="h-4 w-4" />
                </Button>
              }
            />
            <TooltipContent>Columns ({visibleColumnCount}/{totalColumnCount})</TooltipContent>
          </Tooltip>

          {/* Sort */}
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn('h-8 w-8', sorting.length > 0 && 'bg-muted')}
                  onClick={() => setSortOpen(true)}
                >
                  <ArrowUpDown className="h-4 w-4" />
                  {sorting.length > 1 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-label-numeric text-primary-foreground">
                      {sorting.length}
                    </span>
                  )}
                </Button>
              }
            />
            <TooltipContent>Sort</TooltipContent>
          </Tooltip>
        </div>

        {/* Filters (root only) */}
        {isRoot && (
          <FilterPopover
            data={filterData}
            partnerOptions={partnerOptions}
            typeOptions={typeOptions}
            batchOptions={batchOptions}
            selectedPartner={selectedPartner}
            selectedType={selectedType}
            selectedBatch={selectedBatch}
            onFilterChange={onFilterChange}
            activeFilters={activeFilters}
            onClearAll={onClearAllFilters}
          />
        )}

        <ToolbarDivider />

        {/* Export + Save view cluster — keyboard-focus glow via :has(:focus-visible) */}
        <div className="flex items-center gap-1 rounded-md focus-glow-within">
          {/* Export */}
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  disabled={isFetching || table.getRowModel().rows.length === 0}
                  onClick={() => {
                    // Inline export — same as ExportButton logic
                    import('@/lib/export/csv').then(({ buildCSVFromTable }) => {
                      import('@/lib/export/download').then(({ downloadCSV, getExportFilename }) => {
                        import('sonner').then(({ toast }) => {
                          const { csv, rowCount } = buildCSVFromTable(table, activeFilters);
                          downloadCSV(csv, getExportFilename());
                          toast.success(`Exported ${rowCount} rows to CSV`);
                        });
                      });
                    });
                  }}
                >
                  <Download className="h-4 w-4" />
                </Button>
              }
            />
            <TooltipContent>Export CSV</TooltipContent>
          </Tooltip>

          {/* Save view */}
          <SaveViewPopover
            onSave={onSaveView}
            onReplace={onReplaceView}
            hasViewWithName={hasViewWithName}
            canIncludeDrill={canIncludeDrill}
          />
        </div>
      </div>

      {/* Sort dialog — controlled externally, trigger hidden */}
      <SortDialog
        sorting={sorting}
        onSortingChange={onSortingChange}
        open={sortOpen}
        onOpenChange={setSortOpen}
        hideTrigger
      />
    </div>
  );
}
