'use client';

import { useState, useRef, useEffect } from 'react';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';

interface SaveViewPopoverProps {
  onSave: (name: string, options?: { includeDrill?: boolean }) => void;
  onReplace: (name: string, options?: { includeDrill?: boolean }) => void;
  hasViewWithName: (name: string) => boolean;
  /** When true, render the "Include current drill state" checkbox (unchecked by default). */
  canIncludeDrill?: boolean;
}

/**
 * Compact popover for saving the current view configuration.
 */
export function SaveViewPopover({ onSave, onReplace, hasViewWithName, canIncludeDrill }: SaveViewPopoverProps) {
  const [name, setName] = useState('');
  const [showReplace, setShowReplace] = useState(false);
  const [open, setOpen] = useState(false);
  const [includeDrill, setIncludeDrill] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus());
    } else {
      setName('');
      setShowReplace(false);
      setIncludeDrill(false);
    }
  }, [open]);

  const trimmed = name.trim();
  const isDuplicate = trimmed.length > 0 && hasViewWithName(trimmed);

  function handleSubmit() {
    if (!trimmed) return;
    if (isDuplicate && !showReplace) {
      setShowReplace(true);
      return;
    }
    const options = canIncludeDrill ? { includeDrill } : undefined;
    if (isDuplicate) {
      onReplace(trimmed, options);
    } else {
      onSave(trimmed, options);
    }
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger render={<span />}>
          <PopoverTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label="Save current view"
              >
                <Save className="h-4 w-4" />
              </Button>
            }
          />
        </TooltipTrigger>
        <TooltipContent>Save view</TooltipContent>
      </Tooltip>
      <PopoverContent className="w-56" align="end">
        <PopoverHeader>
          <PopoverTitle className="text-heading">Save View</PopoverTitle>
        </PopoverHeader>
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setShowReplace(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmit();
              if (e.key === 'Escape') setOpen(false);
            }}
            placeholder="View name"
            aria-label="Saved view name"
            className="flex-1 rounded-md border bg-transparent px-2 py-1.5 text-body focus:outline-none focus-glow"
          />
          <Button
            size="sm"
            variant={showReplace ? 'destructive' : 'default'}
            disabled={!trimmed}
            onClick={handleSubmit}
            className="h-8"
          >
            {showReplace ? 'Replace?' : 'Save'}
          </Button>
        </div>
        {canIncludeDrill && (
          <label className="mt-2 flex items-center gap-2 text-body text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={includeDrill}
              onChange={(e) => setIncludeDrill(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-border accent-primary"
            />
            Include current drill state
          </label>
        )}
      </PopoverContent>
    </Popover>
  );
}
