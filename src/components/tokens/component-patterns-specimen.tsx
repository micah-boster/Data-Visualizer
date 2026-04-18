'use client';

import { TooltipProvider } from '@/components/ui/tooltip';
import { StatCardSpecimen } from './patterns-specimen-stat-card';
import { DataPanelSpecimen } from './patterns-specimen-data-panel';
import { EmptyStateSpecimen } from './patterns-specimen-empty-state';
import { ToolbarSpecimen } from './patterns-specimen-toolbar';

/**
 * /tokens "Component Patterns" tab content. Stacks the four Phase 29 pattern
 * specimens into a single scrollable panel.
 *
 * Wraps everything in TooltipProvider because StatCard's no-data /
 * insufficient-data states render Tooltip primitives (see 29-RESEARCH
 * Pitfall 7). Without the provider, hovering those states throws.
 */
export function ComponentPatternsSpecimen() {
  return (
    <TooltipProvider>
      <div className="flex flex-col gap-section">
        <StatCardSpecimen />
        <DataPanelSpecimen />
        <EmptyStateSpecimen />
        <ToolbarSpecimen />
      </div>
    </TooltipProvider>
  );
}
