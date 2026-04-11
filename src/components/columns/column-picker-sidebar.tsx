'use client';

import { useState, useMemo, useCallback } from 'react';
import type { VisibilityState } from '@tanstack/react-table';
import {
  DndContext,
  closestCenter,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { COLUMN_GROUPS } from '@/lib/columns/groups';
import { COLUMN_CONFIGS, IDENTITY_COLUMNS } from '@/lib/columns/config';
import { ColumnSearch } from './column-search';
import { ColumnGroup } from './column-group';

const identitySet = new Set(IDENTITY_COLUMNS);
const labelMap = new Map(COLUMN_CONFIGS.map((c) => [c.key, c.label]));

interface ColumnPickerSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  columnVisibility: VisibilityState;
  columnOrder: string[];
  setColumnOrder: (order: string[]) => void;
  toggleColumn: (key: string) => void;
  toggleGroup: (groupKey: string, visible: boolean) => void;
  showAll: () => void;
  hideAll: () => void;
  resetToDefaults: () => void;
}

export function ColumnPickerSidebar({
  open,
  onOpenChange,
  columnVisibility,
  columnOrder,
  setColumnOrder,
  toggleColumn,
  toggleGroup,
  showAll,
  hideAll,
  resetToDefaults,
}: ColumnPickerSidebarProps) {
  const [search, setSearch] = useState('');
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const totalColumns = COLUMN_CONFIGS.length;
  const visibleCount = Object.values(columnVisibility).filter(Boolean).length;

  // Non-identity column keys for the sortable context
  const sortableItems = useMemo(
    () => columnOrder.filter((key) => !identitySet.has(key)),
    [columnOrder],
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveDragId(null);
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = columnOrder.indexOf(active.id as string);
      const newIndex = columnOrder.indexOf(over.id as string);
      if (oldIndex === -1 || newIndex === -1) return;

      setColumnOrder(arrayMove(columnOrder, oldIndex, newIndex));
    },
    [columnOrder, setColumnOrder],
  );

  const activeLabel = activeDragId ? (labelMap.get(activeDragId) ?? activeDragId) : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex flex-col w-[360px] sm:max-w-[360px] p-0">
        <SheetHeader className="px-4 pt-4 pb-0">
          <SheetTitle>Manage Columns</SheetTitle>
          <p className="text-xs text-muted-foreground">
            {visibleCount} of {totalColumns} columns visible
          </p>
        </SheetHeader>

        {/* Search */}
        <div className="px-4 pt-2">
          <ColumnSearch value={search} onChange={setSearch} />
        </div>

        {/* Bulk actions */}
        <div className="flex items-center gap-2 px-4 pt-2">
          <Button variant="outline" size="sm" onClick={showAll} className="text-xs h-7">
            Show All
          </Button>
          <Button variant="outline" size="sm" onClick={hideAll} className="text-xs h-7">
            Hide All
          </Button>
        </div>

        {/* Column groups with sidebar drag reorder */}
        <DndContext
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sortableItems}
            strategy={verticalListSortingStrategy}
          >
            <ScrollArea className="flex-1 min-h-0">
              <div className="px-1">
                {COLUMN_GROUPS.map((group) => (
                  <ColumnGroup
                    key={group.key}
                    group={group}
                    columnVisibility={columnVisibility}
                    onToggleColumn={toggleColumn}
                    onToggleGroup={toggleGroup}
                    searchFilter={search}
                  />
                ))}
              </div>
            </ScrollArea>
          </SortableContext>
          <DragOverlay>
            {activeLabel ? (
              <div className="rounded bg-primary/10 border border-primary/30 px-3 py-1.5 text-xs font-medium shadow-md">
                {activeLabel}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        {/* Reset to defaults */}
        <div className="px-4 pb-4">
          <Separator className="mb-3" />
          <Button
            variant="ghost"
            size="sm"
            onClick={resetToDefaults}
            className="w-full text-xs text-muted-foreground hover:text-foreground"
          >
            Reset to Defaults
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
