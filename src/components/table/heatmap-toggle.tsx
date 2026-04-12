'use client';

import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { usePartnerNorms } from '@/contexts/partner-norms';

/**
 * Toolbar toggle for deviation heatmap formatting.
 * Only renders when at partner drill-down level (norms available).
 */
export function HeatmapToggle() {
  const { heatmapEnabled, toggleHeatmap, norms } = usePartnerNorms();

  // Self-hide at root level — no norms means no heatmap
  if (!norms) return null;

  return (
    <div className="flex items-center gap-1.5">
      <Switch
        id="heatmap-toggle"
        checked={heatmapEnabled}
        onCheckedChange={toggleHeatmap}
        className="scale-75"
      />
      <Label
        htmlFor="heatmap-toggle"
        className="cursor-pointer text-xs"
      >
        Heatmap
      </Label>
    </div>
  );
}
