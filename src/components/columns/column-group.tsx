'use client';

import { useState } from 'react';
import { ChevronRight, GripVertical } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { COLUMN_CONFIGS, IDENTITY_COLUMNS } from '@/lib/columns/config';
import type { ColumnGroup as ColumnGroupType } from '@/lib/columns/groups';
import type { VisibilityState } from '@tanstack/react-table';

const identitySet = new Set(IDENTITY_COLUMNS);

/** Map column key to label for display */
const labelMap = new Map(COLUMN_CONFIGS.map((c) => [c.key, c.label]));

/** Draggable column row within a group — uses native HTML drag */
function DraggableColumnRow({
  columnKey,
  isVisible,
  isIdentity,
  onToggle,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isDragging,
  isDragOver,
}: {
  columnKey: string;
  isVisible: boolean;
  isIdentity: boolean;
  onToggle: () => void;
  onDragStart?: (key: string) => void;
  onDragOver?: (key: string) => void;
  onDrop?: (key: string) => void;
  onDragEnd?: () => void;
  isDragging?: boolean;
  isDragOver?: boolean;
}) {
  const label = labelMap.get(columnKey) ?? columnKey;

  return (
    <div
      draggable={!isIdentity}
      onDragStart={(e) => {
        if (isIdentity) return;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', columnKey);
        onDragStart?.(columnKey);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        onDragOver?.(columnKey);
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDrop?.(columnKey);
      }}
      onDragEnd={() => onDragEnd?.()}
      className={`group/row flex items-center gap-2 px-3 py-1 pl-6 text-body hover:bg-muted/30${isDragging ? ' opacity-40' : ''}${isDragOver ? ' border-t-2 border-primary' : ''}`}
    >
      {!isIdentity && (
        <span
          className="shrink-0 cursor-grab opacity-0 group-hover/row:opacity-100 transition-opacity text-muted-foreground hover:text-foreground active:cursor-grabbing"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </span>
      )}
      {isIdentity && <div className="w-3.5 shrink-0" />}
      <label className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer">
        <Checkbox
          checked={isVisible}
          onCheckedChange={() => onToggle()}
          className="shrink-0"
        />
        <span className="truncate">{label}</span>
      </label>
    </div>
  );
}

interface ColumnGroupProps {
  group: ColumnGroupType;
  columnVisibility: VisibilityState;
  onToggleColumn: (key: string) => void;
  onToggleGroup: (groupKey: string, visible: boolean) => void;
  searchFilter?: string;
  dragId?: string | null;
  dragOverId?: string | null;
  onDragStart?: (key: string) => void;
  onDragOver?: (key: string) => void;
  onDrop?: (key: string) => void;
  onDragEnd?: () => void;
}

export function ColumnGroup({
  group,
  columnVisibility,
  onToggleColumn,
  onToggleGroup,
  searchFilter,
  dragId,
  dragOverId,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: ColumnGroupProps) {
  // `manualExpanded` is the user's explicit choice via the header toggle.
  // When undefined, the group's expanded state is derived from whether a
  // search filter has matches. This replaces a previous setState-in-effect
  // pattern that auto-expanded on search — now it's pure derived state.
  const [manualExpanded, setManualExpanded] = useState<boolean | undefined>(
    undefined,
  );

  // Filter columns by search term
  const filteredColumns = searchFilter
    ? group.columns.filter((key) => {
        const label = labelMap.get(key) ?? key;
        return label.toLowerCase().includes(searchFilter.toLowerCase());
      })
    : group.columns;

  // Auto-expand when search matches columns in this group (derived state).
  // Manual override wins: once the user clicks the header toggle, their
  // preference is respected until they clear it by toggling back twice.
  const searchAutoExpanded = Boolean(
    searchFilter && filteredColumns.length > 0,
  );
  const expanded = manualExpanded ?? searchAutoExpanded;

  // If search is active and no columns match, hide the group
  if (searchFilter && filteredColumns.length === 0) return null;

  // Count visible (non-identity) columns in this group
  const toggleableColumns = group.columns.filter((k) => !identitySet.has(k));
  const visibleCount = toggleableColumns.filter(
    (k) => columnVisibility[k],
  ).length;
  const totalToggleable = toggleableColumns.length;

  // Group-level checkbox state
  const allVisible = totalToggleable > 0 && visibleCount === totalToggleable;
  const someVisible = visibleCount > 0 && visibleCount < totalToggleable;

  return (
    <div className="border-b border-border last:border-b-0">
      {/* Header row */}
      <div className="flex items-center gap-2 px-3 py-2 hover:bg-muted/50">
        <button
          onClick={() => setManualExpanded(!expanded)}
          className="flex items-center gap-1.5 flex-1 min-w-0 text-left"
        >
          <ChevronRight
            className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform ${
              expanded ? 'rotate-90' : ''
            }`}
          />
          <span className="text-label uppercase text-muted-foreground truncate">{group.name}</span>
          <span className="text-caption text-muted-foreground shrink-0">
            {visibleCount + group.columns.filter((k) => identitySet.has(k) && columnVisibility[k]).length}/{group.columns.length}
          </span>
        </button>
        {totalToggleable > 0 && (
          <Checkbox
            checked={allVisible}
            indeterminate={someVisible && !allVisible}
            onCheckedChange={(checked) => {
              onToggleGroup(group.key, !!checked);
            }}
            className="shrink-0"
          />
        )}
      </div>

      {/* Column list */}
      {expanded && (
        <div className="pb-1">
          {filteredColumns.map((key) => (
            <DraggableColumnRow
              key={key}
              columnKey={key}
              isVisible={columnVisibility[key] ?? false}
              isIdentity={identitySet.has(key)}
              onToggle={() => onToggleColumn(key)}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDrop={onDrop}
              onDragEnd={onDragEnd}
              isDragging={dragId === key}
              isDragOver={dragOverId === key}
            />
          ))}
        </div>
      )}
    </div>
  );
}
