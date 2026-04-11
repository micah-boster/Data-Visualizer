'use client';

import { useState } from 'react';
import type { VisibilityState } from '@tanstack/react-table';
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
  toggleColumn,
  toggleGroup,
  showAll,
  hideAll,
  resetToDefaults,
}: ColumnPickerSidebarProps) {
  const [search, setSearch] = useState('');

  const totalColumns = COLUMN_CONFIGS.length;
  const visibleCount = Object.values(columnVisibility).filter(Boolean).length;

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

        {/* Column groups */}
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
