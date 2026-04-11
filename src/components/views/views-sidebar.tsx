'use client';

import { RotateCcw, RefreshCw } from 'lucide-react';
import type { SavedView } from '@/lib/views/types';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ViewItem } from './view-item';

interface ViewsSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  views: SavedView[];
  onLoad: (view: SavedView) => void;
  onDelete: (id: string) => void;
  onReset: () => void;
  onRestoreDefaults: () => void;
}

export function ViewsSidebar({
  open,
  onOpenChange,
  views,
  onLoad,
  onDelete,
  onReset,
  onRestoreDefaults,
}: ViewsSidebarProps) {
  // Sort views by createdAt descending (newest first)
  const sortedViews = [...views].sort((a, b) => b.createdAt - a.createdAt);

  // Check if any default views still exist
  const hasDefaults = views.some((v) => v.isDefault);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex flex-col w-80 sm:max-w-80 p-0"
      >
        <SheetHeader className="px-4 pt-4 pb-0">
          <SheetTitle>Saved Views</SheetTitle>
          <p className="text-xs text-muted-foreground">
            {views.length} view{views.length !== 1 ? 's' : ''}
          </p>
        </SheetHeader>

        {/* View list or empty state */}
        <ScrollArea className="flex-1 min-h-0 px-2 pt-2">
          {sortedViews.length > 0 ? (
            <div className="space-y-0.5">
              {sortedViews.map((view) => (
                <ViewItem
                  key={view.id}
                  view={view}
                  onLoad={(v) => {
                    onLoad(v);
                    onOpenChange(false);
                  }}
                  onDelete={onDelete}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <p className="text-sm text-muted-foreground">
                No saved views yet. Save your current table configuration using
                the Save View button.
              </p>
            </div>
          )}
        </ScrollArea>

        {/* Footer actions */}
        <div className="px-4 pb-4">
          <Separator className="mb-3" />
          <div className="space-y-1.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onReset();
                onOpenChange(false);
              }}
              className="w-full text-xs text-muted-foreground hover:text-foreground gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset to Default
            </Button>
            {!hasDefaults && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRestoreDefaults}
                className="w-full text-xs text-muted-foreground hover:text-foreground gap-1.5"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Restore Starter Views
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
