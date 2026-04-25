'use client';

/**
 * SegmentRow — single editable row in the SegmentEditorTable.
 *
 * Composition mirrors `AttributeFilterBar.AttributeMultiSelect` for the
 * values multi-select (Popover + Checkbox grid) — the same primitive recipe
 * already shipped in `src/components/partner-lists/attribute-filter-bar.tsx`.
 * Column dropdown reuses the same Popover pattern (single-select).
 *
 * Reorder uses up/down buttons (CONTEXT Claude's Discretion: drag deferred
 * to fast-follow). `up` is disabled when index === 0; `down` when
 * index === total - 1. Delete is always enabled.
 *
 * Type-token discipline (AGENTS.md): only the 6 named tiers in src/. No
 * ad-hoc Tailwind text size classes; tokens own weight.
 */

import { useMemo } from 'react';
import { ChevronDown, ChevronUp, Trash2, Check } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { SegmentRule } from '@/lib/partner-config/types';
import type { ViableSegmentColumn } from '@/lib/partner-config/viable-columns';

export interface SegmentRowProps {
  segment: SegmentRule;
  /** All viable segmenting columns for the active pair. */
  availableColumns: ViableSegmentColumn[];
  /**
   * Distinct values available for the currently-selected column. Computed
   * by the parent SegmentEditorTable from pair-scoped rows; passed in so
   * every row in the table shares one memoized lookup.
   */
  valueOptionsForColumn: (column: string) => string[];
  index: number;
  total: number;
  onChange: (next: SegmentRule) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
}

export function SegmentRow({
  segment,
  availableColumns,
  valueOptionsForColumn,
  index,
  total,
  onChange,
  onMoveUp,
  onMoveDown,
  onDelete,
}: SegmentRowProps) {
  const valueOptions = useMemo(
    () => valueOptionsForColumn(segment.column),
    [segment.column, valueOptionsForColumn],
  );

  const valuesSelected = useMemo(
    () => new Set(segment.values),
    [segment.values],
  );

  const handleNameChange = (next: string) => {
    onChange({ ...segment, name: next });
  };

  const handleColumnChange = (next: string) => {
    // When the column changes, drop the previously-selected values — the
    // value space is column-scoped and stale values would silently fail to
    // match anything.
    onChange({ ...segment, column: next, values: [] });
  };

  const toggleValue = (option: string) => {
    if (valuesSelected.has(option)) {
      onChange({
        ...segment,
        values: segment.values.filter((v) => v !== option),
      });
    } else {
      onChange({ ...segment, values: [...segment.values, option] });
    }
  };

  const clearValues = () => onChange({ ...segment, values: [] });

  const columnLabel = segment.column || 'Select column…';
  const valuesTriggerText =
    segment.values.length === 0
      ? 'Select values…'
      : segment.values.length === 1
        ? segment.values[0]
        : `${segment.values.length} selected`;

  return (
    <div className="grid grid-cols-[1fr_1fr_1fr_auto_auto] items-center gap-inline px-card-padding py-stack border-b last:border-b-0">
      {/* Name */}
      <Input
        value={segment.name}
        onChange={(e) => handleNameChange(e.target.value)}
        placeholder="Segment name"
        maxLength={60}
      />

      {/* Column dropdown */}
      <Popover>
        <PopoverTrigger
          render={
            <Button variant="outline" size="sm" className="justify-between">
              <span
                className={cn(
                  'text-body truncate',
                  !segment.column && 'text-muted-foreground',
                )}
              >
                {columnLabel}
              </span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          }
        />
        <PopoverContent align="start" className="w-72 p-0">
          <div className="px-card-padding py-stack border-b">
            <span className="text-label text-muted-foreground">Column</span>
          </div>
          {availableColumns.length === 0 ? (
            <div className="px-card-padding py-card-padding text-caption text-muted-foreground">
              No viable segmenting columns in the current dataset.
            </div>
          ) : (
            <ScrollArea className="max-h-64">
              <div className="py-1">
                {availableColumns.map((opt) => {
                  const isSelected = segment.column === opt.column;
                  return (
                    <button
                      key={opt.column}
                      type="button"
                      onClick={() => handleColumnChange(opt.column)}
                      className="flex w-full items-center gap-inline py-1 px-card-padding hover:bg-hover-bg text-left"
                    >
                      <span className="text-body flex-1 truncate">
                        {opt.column}
                      </span>
                      {opt.sampleValues.length > 0 && (
                        <span className="text-caption text-muted-foreground truncate">
                          {opt.sampleValues.slice(0, 2).join(', ')}
                          {opt.sampleValues.length > 2 ? '…' : ''}
                        </span>
                      )}
                      {isSelected && (
                        <Check className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </PopoverContent>
      </Popover>

      {/* Values multi-select */}
      <Popover>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              size="sm"
              className="justify-between"
              disabled={!segment.column}
            >
              <span
                className={cn(
                  'text-body truncate',
                  segment.values.length === 0 && 'text-muted-foreground',
                )}
              >
                {segment.column ? valuesTriggerText : 'Select a column first'}
              </span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          }
        />
        <PopoverContent align="start" className="w-64 p-0">
          <div className="flex items-center justify-between px-card-padding py-stack border-b">
            <span className="text-label text-muted-foreground">Values</span>
            {segment.values.length > 0 && (
              <Button variant="ghost" size="xs" onClick={clearValues}>
                <span className="text-caption">Clear</span>
              </Button>
            )}
          </div>
          {valueOptions.length === 0 ? (
            <div className="px-card-padding py-card-padding text-caption text-muted-foreground">
              No values found for this column.
            </div>
          ) : (
            <ScrollArea className="max-h-64">
              <div className="py-1">
                {valueOptions.map((option) => {
                  const isChecked = valuesSelected.has(option);
                  const rowId = `seg-${segment.id}-val-${option}`;
                  return (
                    <div
                      key={option}
                      className="flex items-center gap-inline py-1 px-card-padding hover:bg-hover-bg"
                    >
                      <Checkbox
                        id={rowId}
                        checked={isChecked}
                        onCheckedChange={() => toggleValue(option)}
                      />
                      <Label
                        htmlFor={rowId}
                        className="text-body cursor-pointer flex-1 truncate"
                      >
                        {option}
                      </Label>
                      {isChecked && (
                        <Check className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </PopoverContent>
      </Popover>

      {/* Reorder */}
      <div className="flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onMoveUp}
          disabled={index === 0}
          aria-label={`Move ${segment.name || 'segment'} up`}
        >
          <ChevronUp className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onMoveDown}
          disabled={index === total - 1}
          aria-label={`Move ${segment.name || 'segment'} down`}
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
      </div>

      {/* Delete */}
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onDelete}
        aria-label={`Delete ${segment.name || 'segment'}`}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
