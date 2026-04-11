'use client';

import { useState, useEffect, type CSSProperties } from 'react';
import { ChevronRight, GripVertical } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Checkbox } from '@/components/ui/checkbox';
import { COLUMN_CONFIGS, IDENTITY_COLUMNS } from '@/lib/columns/config';
import type { ColumnGroup as ColumnGroupType } from '@/lib/columns/groups';
import type { VisibilityState } from '@tanstack/react-table';

const identitySet = new Set(IDENTITY_COLUMNS);

/** Map column key to label for display */
const labelMap = new Map(COLUMN_CONFIGS.map((c) => [c.key, c.label]));

/** Sortable column row within a group */
function SortableColumnRow({
  columnKey,
  isVisible,
  isIdentity,
  onToggle,
}: {
  columnKey: string;
  isVisible: boolean;
  isIdentity: boolean;
  onToggle: () => void;
}) {
  const label = labelMap.get(columnKey) ?? columnKey;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: columnKey,
    disabled: isIdentity,
  });

  const style: CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group/row flex items-center gap-2 px-3 py-1 pl-6 text-sm hover:bg-muted/30 ${
        isIdentity ? 'opacity-60' : ''
      }`}
    >
      {!isIdentity && (
        <button
          {...attributes}
          {...listeners}
          className="shrink-0 cursor-grab opacity-0 group-hover/row:opacity-100 transition-opacity text-muted-foreground hover:text-foreground active:cursor-grabbing"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
      )}
      {isIdentity && <div className="w-3.5 shrink-0" />}
      <label className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer">
        <Checkbox
          checked={isVisible}
          disabled={isIdentity}
          onCheckedChange={() => {
            if (!isIdentity) onToggle();
          }}
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
}

export function ColumnGroup({
  group,
  columnVisibility,
  onToggleColumn,
  onToggleGroup,
  searchFilter,
}: ColumnGroupProps) {
  const [expanded, setExpanded] = useState(false);

  // Filter columns by search term
  const filteredColumns = searchFilter
    ? group.columns.filter((key) => {
        const label = labelMap.get(key) ?? key;
        return label.toLowerCase().includes(searchFilter.toLowerCase());
      })
    : group.columns;

  // Auto-expand when search matches columns in this group
  useEffect(() => {
    if (searchFilter && filteredColumns.length > 0) {
      setExpanded(true);
    }
  }, [searchFilter, filteredColumns.length]);

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
          onClick={() => setExpanded((e) => !e)}
          className="flex items-center gap-1.5 flex-1 min-w-0 text-left"
        >
          <ChevronRight
            className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform ${
              expanded ? 'rotate-90' : ''
            }`}
          />
          <span className="text-sm font-medium truncate">{group.name}</span>
          <span className="text-xs text-muted-foreground shrink-0">
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
            <SortableColumnRow
              key={key}
              columnKey={key}
              isVisible={columnVisibility[key] ?? false}
              isIdentity={identitySet.has(key)}
              onToggle={() => onToggleColumn(key)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
