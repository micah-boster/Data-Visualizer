'use client';

import { useState, useCallback } from 'react';
import type { VisibilityState } from '@tanstack/react-table';
/** Move item from oldIndex to newIndex in array (immutable) */
function arrayMove<T>(arr: T[], from: number, to: number): T[] {
  const result = arr.slice();
  const [item] = result.splice(from, 1);
  result.splice(to, 0, item);
  return result;
}
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
import { COLUMN_CONFIGS } from '@/lib/columns/config';
import { ColumnSearch } from './column-search';
import { ColumnGroup } from './column-group';

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
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const totalColumns = COLUMN_CONFIGS.length;
  const visibleCount = Object.values(columnVisibility).filter(Boolean).length;

  const handleDragStart = useCallback((key: string) => {
    setDragId(key);
  }, []);

  const handleDragOver = useCallback((key: string) => {
    setDragOverId(key);
  }, []);

  const handleDrop = useCallback(
    (targetKey: string) => {
      if (!dragId || dragId === targetKey) return;
      const oldIndex = columnOrder.indexOf(dragId);
      const newIndex = columnOrder.indexOf(targetKey);
      if (oldIndex === -1 || newIndex === -1) return;
      setColumnOrder(arrayMove(columnOrder, oldIndex, newIndex));
      setDragId(null);
      setDragOverId(null);
    },
    [dragId, columnOrder, setColumnOrder],
  );

  const handleDragEnd = useCallback(() => {
    setDragId(null);
    setDragOverId(null);
  }, []);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex flex-col w-[360px] sm:max-w-[360px] p-0">
        <SheetHeader className="px-4 pt-4 pb-0">
          <SheetTitle className="text-heading">Manage Columns</SheetTitle>
          <p className="text-caption text-muted-foreground">
            {visibleCount} of {totalColumns} columns visible
          </p>
        </SheetHeader>

        {/* Search */}
        <div className="px-4 pt-2">
          <ColumnSearch value={search} onChange={setSearch} />
        </div>

        {/* Bulk actions */}
        <div className="flex items-center gap-2 px-4 pt-2">
          <Button variant="outline" size="sm" onClick={showAll} className="text-caption h-7">
            Show All
          </Button>
          <Button variant="outline" size="sm" onClick={hideAll} className="text-caption h-7">
            Hide All
          </Button>
        </div>

        {/* Column groups with native drag reorder */}
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
                dragId={dragId}
                dragOverId={dragOverId}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onDragEnd={handleDragEnd}
              />
            ))}
          </div>
        </ScrollArea>

        {/* Reset to defaults */}
        <div className="px-4 pb-4">
          <Separator className="mb-3" />
          <Button
            variant="ghost"
            size="sm"
            onClick={resetToDefaults}
            className="w-full text-caption text-muted-foreground hover:text-foreground"
          >
            Reset to Defaults
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
