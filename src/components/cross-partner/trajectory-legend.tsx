'use client';

interface TrajectoryLegendProps {
  /** Partner names in display order */
  partners: string[];
  /** Map of partner name → assigned color */
  colorMap: Map<string, string>;
  /** Currently hidden partners */
  hiddenPartners: Set<string>;
  /** Best-in-class partner name */
  bestPartnerName: string | null;
  onTogglePartner: (name: string) => void;
}

export function TrajectoryLegend({
  partners,
  colorMap,
  hiddenPartners,
  bestPartnerName,
  onTogglePartner,
}: TrajectoryLegendProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
      {/* Reference line legend entries (not toggleable) */}
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <span className="inline-block h-0 w-4 border-t-2 border-dashed border-foreground" />
        <span>Best-in-class{bestPartnerName ? ` (${bestPartnerName})` : ''}</span>
      </div>
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <span className="inline-block h-0 w-4 border-t-2 border-dashed border-muted-foreground" />
        <span>Portfolio Avg</span>
      </div>

      {/* Divider */}
      <span className="mx-1 h-3 w-px bg-border" />

      {/* Partner legend entries (clickable) */}
      {partners.map((name) => {
        const color = colorMap.get(name) ?? 'var(--muted-foreground)';
        const isHidden = hiddenPartners.has(name);
        return (
          <button
            key={name}
            type="button"
            className={`flex items-center gap-1.5 rounded px-1 py-0.5 transition-opacity hover:bg-muted ${
              isHidden ? 'opacity-40 line-through' : ''
            }`}
            onClick={() => onTogglePartner(name)}
          >
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: color }}
            />
            <span>{name}</span>
          </button>
        );
      })}
    </div>
  );
}
