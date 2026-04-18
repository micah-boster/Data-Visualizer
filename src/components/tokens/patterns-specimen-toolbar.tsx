'use client';

import { ToolbarDivider } from '@/components/patterns/toolbar-divider';
import { Button } from '@/components/ui/button';

/**
 * /tokens specimen — ToolbarDivider (DS-21).
 *
 * Renders a 3-cluster mock toolbar with 2 dividers to document the
 * canonical sibling-divider pattern used in unified-toolbar.tsx.
 */
export function ToolbarSpecimen() {
  return (
    <section className="flex flex-col gap-stack">
      <h2 className="text-heading">ToolbarDivider (DS-21)</h2>
      <p className="text-body text-muted-foreground">
        Sibling divider for separating semantically distinct button clusters in toolbars.
        Canonical recipe: <code>mx-0.5 h-4 w-px bg-border</code>.
      </p>
      <div className="flex items-center bg-surface-raised rounded-lg p-card-padding shadow-elevation-raised">
        <div className="flex items-center gap-1">
          <Button size="sm" variant="outline">Query</Button>
          <Button size="sm" variant="outline">Anomalies</Button>
          <Button size="sm" variant="outline">Charts</Button>
        </div>
        <ToolbarDivider />
        <div className="flex items-center gap-1">
          <Button size="sm" variant="outline">Preset</Button>
          <Button size="sm" variant="outline">Columns</Button>
          <Button size="sm" variant="outline">Sort</Button>
          <Button size="sm" variant="outline">Filters</Button>
        </div>
        <ToolbarDivider />
        <div className="flex items-center gap-1">
          <Button size="sm" variant="outline">Export</Button>
          <Button size="sm" variant="outline">Save view</Button>
        </div>
      </div>
    </section>
  );
}
