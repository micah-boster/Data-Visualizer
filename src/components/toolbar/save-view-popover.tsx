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
  onSave: (name: string) => void;
  onReplace: (name: string) => void;
  hasViewWithName: (name: string) => boolean;
}

/**
 * Compact popover for saving the current view configuration.
 */
export function SaveViewPopover({ onSave, onReplace, hasViewWithName }: SaveViewPopoverProps) {
  const [name, setName] = useState('');
  const [showReplace, setShowReplace] = useState(false);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus());
    } else {
      setName('');
      setShowReplace(false);
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
    if (isDuplicate) {
      onReplace(trimmed);
    } else {
      onSave(trimmed);
    }
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger render={<span />}>
          <PopoverTrigger
            render={
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Save className="h-4 w-4" />
              </Button>
            }
          />
        </TooltipTrigger>
        <TooltipContent>Save view</TooltipContent>
      </Tooltip>
      <PopoverContent className="w-56" align="end">
        <PopoverHeader>
          <PopoverTitle>Save View</PopoverTitle>
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
            className="flex-1 rounded-md border bg-transparent px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring"
          />
          <Button
            size="sm"
            variant={showReplace ? 'destructive' : 'default'}
            disabled={!trimmed}
            onClick={handleSubmit}
            className="h-8 text-xs"
          >
            {showReplace ? 'Replace?' : 'Save'}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
