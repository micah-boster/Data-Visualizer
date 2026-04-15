'use client';

import { LayoutGrid, Check } from 'lucide-react';
import { PRESET_NAMES } from '@/lib/columns/presets';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';

interface PresetDropdownProps {
  activePreset: string;
  onPresetChange: (preset: string) => void;
}

/**
 * Dropdown replacing the full-width preset tab bar.
 * Shows current preset name, opens a popover with options.
 */
export function PresetDropdown({ activePreset, onPresetChange }: PresetDropdownProps) {
  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger render={<span />}>
          <PopoverTrigger
            render={
              <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs capitalize">
                <LayoutGrid className="h-3.5 w-3.5" />
                {activePreset}
              </Button>
            }
          />
        </TooltipTrigger>
        <TooltipContent>Column preset</TooltipContent>
      </Tooltip>
      <PopoverContent className="w-40 p-1" align="end">
        {PRESET_NAMES.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => onPresetChange(preset)}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm capitalize transition-colors hover:bg-muted"
          >
            {activePreset === preset ? (
              <Check className="h-3.5 w-3.5 text-primary" />
            ) : (
              <span className="w-3.5" />
            )}
            {preset}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
