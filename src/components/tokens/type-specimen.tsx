'use client';

import { cn } from '@/lib/utils';
import { TokenCard } from './token-card';

/**
 * Type specimen grid — renders a sample paragraph for each --text-* token tier
 * plus the bundled numeric variants from @layer utilities in globals.css.
 */

type TypeTier = {
  name: string;
  sample: string;
  size: string;
  lineHeight: string;
  weight?: string;
  tracking?: string;
  uppercase?: boolean;
};

const TIERS: TypeTier[] = [
  {
    name: 'display',
    sample: 'Data Visualizer',
    size: '24px',
    lineHeight: '1.2',
    weight: '600',
  },
  {
    name: 'heading',
    sample: 'Batch Performance',
    size: '18px',
    lineHeight: '1.35',
    weight: '600',
  },
  {
    name: 'title',
    sample: 'Last 90 days',
    size: '15px',
    lineHeight: '1.4',
    weight: '500',
  },
  {
    name: 'body',
    sample: 'Bounce helps partners surface anomalies before they compound.',
    size: '14px',
    lineHeight: '1.5',
  },
  {
    name: 'label',
    sample: 'Partner',
    size: '12px',
    lineHeight: '1.4',
    weight: '500',
    tracking: '0.04em',
    uppercase: true,
  },
  {
    name: 'caption',
    sample: 'Updated 2 min ago',
    size: '12px',
    lineHeight: '1.4',
  },
];

type NumericTier = {
  name: string;
  sample: string;
  description: string;
  uppercase?: boolean;
};

const NUMERIC: NumericTier[] = [
  {
    name: 'display-numeric',
    sample: '1,234,567.89',
    description: 'KPI hero values — tabular + lining nums, sans family',
  },
  {
    name: 'body-numeric',
    sample: '3.14159',
    description: 'Table cells / chart axes — tabular + lining nums, mono family',
  },
  {
    name: 'label-numeric',
    sample: 'NUM-042',
    description: 'Tabular labels — uppercase, tracked, mono family',
    uppercase: true,
  },
];

export function TypeSpecimen() {
  return (
    <div className="flex flex-col gap-section">
      <section className="flex flex-col gap-stack">
        <h2 className="text-heading">Type ramp</h2>
        <p className="text-body text-muted-foreground">
          Six-tier Linear-ish ramp. Each tier bakes in size, line-height,
          weight, and (for labels) letter-spacing via the{' '}
          <code className="text-body-numeric">--text-*</code> namespace.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-stack">
          {TIERS.map(({ name, sample, size, lineHeight, weight, tracking, uppercase }) => (
            <TokenCard
              key={name}
              label={`text-${name}`}
              cssVar={`--text-${name}`}
              tailwindClass={`text-${name}`}
              value={`${size} / ${lineHeight}${weight ? ` / ${weight}` : ''}${tracking ? ` / ${tracking}` : ''}`}
            >
              <p
                className={cn(
                  `text-${name}`,
                  uppercase && 'uppercase',
                  'text-foreground text-center',
                )}
              >
                {sample}
              </p>
            </TokenCard>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-stack">
        <h2 className="text-heading">Numeric variants</h2>
        <p className="text-body text-muted-foreground">
          Baked-in{' '}
          <code className="text-body-numeric">
            font-variant-numeric: tabular-nums lining-nums
          </code>
          . Use these anywhere digits need to align in a column (KPI values,
          table cells, chart axes).
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-stack">
          {NUMERIC.map(({ name, sample, description, uppercase }) => (
            <TokenCard
              key={name}
              label={name}
              cssVar={`.${name}`}
              tailwindClass={name}
              value={description}
            >
              <p className={cn(name, uppercase && 'uppercase', 'text-foreground')}>
                {sample}
              </p>
            </TokenCard>
          ))}
        </div>
      </section>
    </div>
  );
}
