'use client';

/**
 * Phase 36 Plan 04 — Save Preset popover.
 *
 * Mirrors SaveViewPopover 1:1 in shape — simpler because there's no
 * `includeDrill` checkbox. Opens a compact popover with a name input and a
 * Save / Replace? button. Duplicate names flip the button to destructive
 * "Replace?" on first submit; a second submit confirms replacement.
 *
 * Pure props-in / onSave-out: the parent PresetMenu is responsible for
 * invoking `savePreset(name, definition)` once the user confirms the name.
 * `definition` is passed to this component only so a future variant can
 * surface a preview — today it's unused by the popover itself.
 *
 * Input className mirrors the SaveViewPopover template so the two popovers
 * feel the same (same focus-glow on :focus, same border-chrome).
 */

import { useState, useRef, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
} from '@/components/ui/popover';
import type { ChartDefinition } from '@/lib/views/types';

interface SavePresetPopoverProps {
  /** Current definition — passed for future preview; unused by the popover today. */
  definition: ChartDefinition;
  /** Called on confirmed submit with the trimmed name. */
  onSave: (name: string) => void;
  /** True when a preset (user OR built-in) already exists with that name. */
  hasPresetWithName: (name: string) => boolean;
}

export function SavePresetPopover({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  definition: _definition,
  onSave,
  hasPresetWithName,
}: SavePresetPopoverProps) {
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
  const isDuplicate = trimmed.length > 0 && hasPresetWithName(trimmed);

  function handleSubmit() {
    if (!trimmed) return;
    if (isDuplicate && !showReplace) {
      setShowReplace(true);
      return;
    }
    onSave(trimmed);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-full justify-start gap-2"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="text-body">Save current as preset…</span>
          </Button>
        }
      />
      <PopoverContent className="w-64" align="start">
        <PopoverHeader>
          <PopoverTitle className="text-heading">Save Preset</PopoverTitle>
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
            placeholder="Preset name"
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
      </PopoverContent>
    </Popover>
  );
}
