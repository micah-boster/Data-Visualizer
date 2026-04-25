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
import type { ActiveFilter, AgeBucket } from '@/hooks/use-filter-state';
import type { PartnerProductPair } from '@/lib/partner-config/pair';
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
  /** Phase 39 PCFG-03 — pair-aware drill (used by anomaly toolbar trigger). */
  onDrillToPair: (pair: PartnerProductPair) => void;
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

  // Filters (root only). Phase 39 PCFG-04: partnerOptions / selectedPartner
  // dropped — the partner combobox no longer renders in the filter popover.
  filterData: Record<string, unknown>[];
  typeOptions: string[];
  selectedType: string | null;
  /** Phase 38 FLT-01 — date-range bucket for the preset chip group. */
  age: AgeBucket;
  onAgeChange: (value: AgeBucket) => void;
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
  onDrillToPair,
  breadcrumbRowCounts,
  chartsExpanded,
  onToggleCharts,
  onOpenQuery,
  activePreset,
  onPresetChange,
  filterData,
  typeOptions,
  selectedType,
  age,
  onAgeChange,
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
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onOpenQuery}
                aria-label="Ask a question about your data"
              >
                <Sparkles className="h-4 w-4" />
              </Button>
            }
          />
          <TooltipContent>Ask AI (⌘K)</TooltipContent>
        </Tooltip>

        {/* Anomalies */}
        <AnomalyToolbarTrigger onDrillToPair={onDrillToPair} />

        {/* Charts toggle */}
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className={cn('h-8 w-8', chartsExpanded && 'bg-muted')}
                onClick={onToggleCharts}
                aria-label="Toggle charts"
                aria-pressed={chartsExpanded}
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
                  aria-label={`Manage columns (${visibleColumnCount} of ${totalColumnCount} visible)`}
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
                  aria-label={
                    sorting.length > 0
                      ? `Manage sort order (${sorting.length} active)`
                      : 'Manage sort order'
                  }
                >
                  <ArrowUpDown className="h-4 w-4" />
                  {sorting.length > 1 && (
                    <span
                      aria-hidden="true"
                      className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-label-numeric text-primary-foreground"
                    >
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
            typeOptions={typeOptions}
            selectedType={selectedType}
            age={age}
            onAgeChange={onAgeChange}
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
                  aria-label="Export data to CSV"
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
