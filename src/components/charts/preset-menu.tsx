'use client';

/**
 * Phase 36 Plan 04 — Presets dropdown (built-ins + user presets + save action).
 *
 * Structural template: src/components/toolbar/preset-dropdown.tsx (Popover +
 * grouped list + trailing badges + delete-on-hover). Simpler where possible:
 *   - BUILTIN_PRESETS render first with a Lock icon and no Trash affordance.
 *   - User presets render below with a Trash2 button visible on row hover
 *     and an undo toast via sonner (mirrors handleSaveView / handleDeleteView
 *     in data-display.tsx:411-480).
 *   - Trailing "Save current as preset…" opens the nested SavePresetPopover.
 *
 * Active-preset detection uses `isSameDefinition` — a single `activeId` pass
 * over `presets` computes which row (if any) should render the ✓ badge.
 *
 * Pitfall 4 (36-RESEARCH): preset application deep-copies via structuredClone
 * before dispatching onDefinitionChange so downstream axis edits cannot mutate
 * the stored preset definition.
 */

import { useMemo, useState } from 'react';
import { ChevronDown, Lock, Check, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { SavePresetPopover } from './save-preset-popover';
import { useChartPresets } from '@/hooks/use-chart-presets';
import { isSameDefinition } from '@/lib/charts/chart-definition-equals';
import type { ChartDefinition } from '@/lib/views/types';
import type { ChartPreset } from '@/lib/chart-presets/types';

interface PresetMenuProps {
  definition: ChartDefinition;
  onDefinitionChange: (next: ChartDefinition) => void;
}

export function PresetMenu({
  definition,
  onDefinitionChange,
}: PresetMenuProps) {
  const {
    presets,
    savePreset,
    deletePreset,
    restorePreset,
    hasPresetWithName,
  } = useChartPresets();
  const [open, setOpen] = useState(false);

  const activeId = useMemo(
    () => presets.find((p) => isSameDefinition(definition, p.definition))?.id,
    [presets, definition],
  );

  const builtIns = useMemo(() => presets.filter((p) => p.locked), [presets]);
  const userPresets = useMemo(() => presets.filter((p) => !p.locked), [presets]);

  function handleApply(preset: ChartPreset) {
    // Pitfall 4 — deep-copy before dispatch so subsequent axis edits don't
    // mutate the stored preset definition.
    onDefinitionChange(structuredClone(preset.definition));
    setOpen(false);
  }

  function handleDelete(preset: ChartPreset) {
    const deleted = deletePreset(preset.id);
    if (!deleted) return;
    toast('Preset deleted', {
      description: `"${deleted.name}" was removed`,
      action: {
        label: 'Undo',
        onClick: () => restorePreset(deleted),
      },
      duration: 5000,
    });
  }

  function handleSaveNew(name: string) {
    const created = savePreset(name, definition);
    toast('Preset saved', {
      description: `"${created.name}" has been saved`,
      action: {
        label: 'Undo',
        onClick: () => deletePreset(created.id),
      },
      duration: 5000,
    });
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button variant="outline" size="sm" className="h-7">
            <span className="text-body">Presets</span>
            <ChevronDown className="ml-1 h-3.5 w-3.5 opacity-70" />
          </Button>
        }
      />
      <PopoverContent className="w-64 p-1" align="end">
        {/* Built-ins */}
        <div className="px-2 pt-1 pb-0.5">
          <span className="text-label text-muted-foreground">Built-in</span>
        </div>
        {builtIns.map((p) => {
          const isActive = p.id === activeId;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => handleApply(p)}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-body transition-colors hover:bg-muted focus:outline-none focus-glow"
            >
              <Lock className="h-3.5 w-3.5 opacity-70" />
              <span className="flex-1 text-left">{p.name}</span>
              {isActive && <Check className="h-3.5 w-3.5 text-primary" />}
            </button>
          );
        })}

        {/* Horizontal divider */}
        <div
          aria-hidden
          className="divider-horizontal-fade my-1 h-px w-full"
        />

        {/* User presets */}
        <div className="px-2 pt-1 pb-0.5">
          <span className="text-label text-muted-foreground">Your presets</span>
        </div>
        {userPresets.length === 0 ? (
          <div className="px-2 py-1.5 text-caption text-muted-foreground italic">
            No saved presets yet.
          </div>
        ) : (
          userPresets.map((p) => {
            const isActive = p.id === activeId;
            return (
              <div
                key={p.id}
                className="group/preset flex items-center gap-1 rounded-md transition-colors hover:bg-muted"
              >
                <button
                  type="button"
                  onClick={() => handleApply(p)}
                  className="flex flex-1 items-center gap-2 px-2 py-1.5 text-body focus:outline-none focus-glow"
                >
                  <span className="w-3.5" />
                  <span className="flex-1 text-left">{p.name}</span>
                  {isActive && <Check className="h-3.5 w-3.5 text-primary" />}
                </button>
                <button
                  type="button"
                  aria-label={`Delete preset ${p.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(p);
                  }}
                  className="mr-1 rounded-md p-1 text-muted-foreground opacity-0 transition-opacity duration-quick ease-default hover:text-destructive focus:outline-none focus-glow group-hover/preset:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })
        )}

        {/* Footer divider + Save action */}
        <div
          aria-hidden
          className="divider-horizontal-fade my-1 h-px w-full"
        />
        <SavePresetPopover
          definition={definition}
          onSave={handleSaveNew}
          hasPresetWithName={hasPresetWithName}
        />
      </PopoverContent>
    </Popover>
  );
}
