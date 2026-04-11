'use client';

import { PRESET_NAMES } from '@/lib/columns/presets';
import { cn } from '@/lib/utils';

interface ColumnPresetTabsProps {
  activePreset: string;
  onPresetChange: (preset: string) => void;
}

export function ColumnPresetTabs({ activePreset, onPresetChange }: ColumnPresetTabsProps) {
  return (
    <div className="flex items-center gap-1 border-b">
      {PRESET_NAMES.map((preset) => (
        <button
          key={preset}
          onClick={() => onPresetChange(preset)}
          className={cn(
            'px-4 py-2 text-sm font-medium capitalize transition-colors',
            'hover:text-foreground',
            activePreset === preset
              ? 'border-b-2 border-primary text-foreground'
              : 'text-muted-foreground'
          )}
        >
          {preset}
        </button>
      ))}
    </div>
  );
}
