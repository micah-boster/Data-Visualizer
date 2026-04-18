'use client';

import { useEffect } from 'react';
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QuerySearchBar } from './query-search-bar';
import type { DrillState } from '@/hooks/use-drill-down';

interface QueryCommandDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  drillState: DrillState;
  dataContext: string;
  onRemoveScope: () => void;
}

/**
 * Command-palette-style dialog wrapping the AI query bar.
 * Opened via toolbar button or Cmd+K shortcut.
 */
export function QueryCommandDialog({
  open,
  onOpenChange,
  drillState,
  dataContext,
  onRemoveScope,
}: QueryCommandDialogProps) {
  // Cmd+K / Ctrl+K global shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpenChange(!open);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange]);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/30 data-ending-style:opacity-0 data-starting-style:opacity-0 transition-opacity duration-quick supports-backdrop-filter:backdrop-blur-xs" />
        <DialogPrimitive.Popup className="fixed left-1/2 top-[15%] z-50 w-full max-w-2xl -translate-x-1/2 rounded-xl bg-surface-floating p-0 shadow-elevation-floating transition duration-quick data-ending-style:opacity-0 data-ending-style:scale-95 data-starting-style:opacity-0 data-starting-style:scale-95">
          <DialogPrimitive.Title className="sr-only">
            Ask a question about your data
          </DialogPrimitive.Title>
          <div className="relative p-4">
            <QuerySearchBar
              drillState={drillState}
              dataContext={dataContext}
              onRemoveScope={onRemoveScope}
            />
            <DialogPrimitive.Close
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-2 h-7 w-7"
                />
              }
            >
              <X className="h-3.5 w-3.5" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
