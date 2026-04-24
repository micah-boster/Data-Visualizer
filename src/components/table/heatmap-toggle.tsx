'use client';

import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { usePartnerNorms } from '@/contexts/partner-norms';

/**
 * Toolbar toggle for deviation heatmap formatting.
 * Only renders when at partner drill-down level (norms available).
 *
 * POL-05 (Phase 38): wrapped in Tooltip to explain what heatmap does.
 */
export function HeatmapToggle() {
  const { heatmapEnabled, toggleHeatmap, norms } = usePartnerNorms();

  // Self-hide at root level — no norms means no heatmap
  if (!norms) return null;

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <div className="flex items-center gap-1.5">
            <Switch
              id="heatmap-toggle"
              checked={heatmapEnabled}
              onCheckedChange={toggleHeatmap}
              className="scale-75"
            />
            <Label
              htmlFor="heatmap-toggle"
              className="cursor-pointer text-caption"
            >
              Heatmap
            </Label>
          </div>
        }
      />
      <TooltipContent>
        Colors cells by how far each value deviates from the partner&apos;s norm range
      </TooltipContent>
    </Tooltip>
  );
}
