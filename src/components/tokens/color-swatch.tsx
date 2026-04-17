'use client';

import { TokenCard } from './token-card';

/**
 * Color swatch renderer. Single component handles five categories so the
 * token-browser can mount multiple sections with just a `category` prop.
 *
 * Categories:
 *   - surfaces:     five surface tiers (base/raised/inset/overlay/floating)
 *   - accent-state: --accent-warm + state colors (success/warning/error/info)
 *                   rendered as mini badges (bg/border/fg composite)
 *   - neutrals:     11-step --neutral-50..950 ladder
 *   - chart:        categorical 1..8 + diverging 3-stop gradient
 *   - interaction:  focus-ring, selection-bg, hover-bg demonstrations
 */

export type ColorSwatchCategory =
  | 'surfaces'
  | 'accent-state'
  | 'neutrals'
  | 'chart'
  | 'interaction';

const SURFACES: { name: string; label: string }[] = [
  { name: 'surface-base', label: 'Page background, sidebar' },
  { name: 'surface-raised', label: 'Cards, chart containers, header' },
  { name: 'surface-inset', label: 'Tables, recessed zones' },
  { name: 'surface-overlay', label: 'Popovers, dropdowns' },
  { name: 'surface-floating', label: 'Modals, toasts' },
];

const STATES = ['success', 'warning', 'error', 'info'] as const;

const NEUTRAL_STEPS = [
  '50',
  '100',
  '200',
  '300',
  '400',
  '500',
  '600',
  '700',
  '800',
  '900',
  '950',
] as const;

const CATEGORICAL = [1, 2, 3, 4, 5, 6, 7, 8] as const;

export function ColorSwatch({ category }: { category: ColorSwatchCategory }) {
  if (category === 'surfaces') return <SurfaceSwatches />;
  if (category === 'accent-state') return <AccentStateSwatches />;
  if (category === 'neutrals') return <NeutralSwatches />;
  if (category === 'chart') return <ChartSwatches />;
  if (category === 'interaction') return <InteractionSwatches />;
  return null;
}

function SurfaceSwatches() {
  return (
    <section className="flex flex-col gap-stack">
      <h2 className="text-heading">Surfaces</h2>
      <p className="text-body text-muted-foreground">
        Depth ladder. In light mode, raised is lighter than base. In dark mode
        the inversion is intentional: raised is LIGHTER than base, inset is
        DARKER (warm paper philosophy).
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-stack">
        {SURFACES.map(({ name, label }) => (
          <TokenCard
            key={name}
            label={name}
            cssVar={`--color-${name}`}
            tailwindClass={`bg-${name}`}
            value={label}
          >
            <div
              className="size-20 rounded-md border border-border shadow-xs flex items-center justify-center text-label text-muted-foreground"
              style={{ backgroundColor: `var(--color-${name})` }}
              aria-hidden
            >
              {name.replace('surface-', '')}
            </div>
          </TokenCard>
        ))}
      </div>
    </section>
  );
}

function AccentStateSwatches() {
  return (
    <section className="flex flex-col gap-stack">
      <h2 className="text-heading">Accent &amp; State</h2>
      <p className="text-body text-muted-foreground">
        Single warm accent (amber/ochre) used sparingly for focus, primary
        actions, and brand moments. State colors render as bg+border+fg
        composites — each is a complete self-contained badge recipe.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-stack">
        <TokenCard
          label="accent-warm"
          cssVar="--color-accent-warm"
          tailwindClass="bg-accent-warm"
          value="Focus rings, primary actions, selection"
        >
          <div className="bg-accent-warm size-20 rounded-md shadow-xs" aria-hidden />
        </TokenCard>

        {STATES.map((state) => (
          <TokenCard
            key={state}
            label={`${state} (bg / border / fg)`}
            cssVar={`--color-${state}-{bg,border,fg}`}
            tailwindClass={`bg-${state}-bg border-${state}-border text-${state}-fg`}
            value="Badge composite"
          >
            <div
              className="rounded-sm px-[var(--spacing-3)] py-[var(--spacing-1)] text-label uppercase border"
              style={{
                backgroundColor: `var(--color-${state}-bg)`,
                borderColor: `var(--color-${state}-border)`,
                color: `var(--color-${state}-fg)`,
              }}
            >
              {state}
            </div>
          </TokenCard>
        ))}
      </div>
    </section>
  );
}

function NeutralSwatches() {
  return (
    <section className="flex flex-col gap-stack">
      <h2 className="text-heading">Neutrals</h2>
      <p className="text-body text-muted-foreground">
        11-step warm ladder (stone/khaki undertone, hue ~75 in light / ~60 in
        dark). Darkens as the step number climbs in light mode; the scale
        inverts perceptually in dark so{' '}
        <code className="text-body-numeric">--neutral-900</code> still reads as
        the highest-contrast text color.
      </p>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-stack">
        {NEUTRAL_STEPS.map((step) => (
          <TokenCard
            key={step}
            label={`neutral-${step}`}
            cssVar={`--color-neutral-${step}`}
            tailwindClass={`bg-neutral-${step}`}
          >
            <div
              className="size-16 rounded-md border border-border"
              style={{ backgroundColor: `var(--color-neutral-${step})` }}
              aria-hidden
            />
          </TokenCard>
        ))}
      </div>
    </section>
  );
}

function ChartSwatches() {
  return (
    <section className="flex flex-col gap-stack">
      <h2 className="text-heading">Charts</h2>
      <p className="text-body text-muted-foreground">
        8 categorical hues for qualitative comparisons (partner series, account
        types). Diverging triplet for heatmaps and anomaly cells.
      </p>

      <div className="flex flex-col gap-stack">
        <h3 className="text-title">Categorical</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-stack">
          {CATEGORICAL.map((n) => (
            <TokenCard
              key={n}
              label={`chart-categorical-${n}`}
              cssVar={`--color-chart-categorical-${n}`}
              tailwindClass={`bg-chart-categorical-${n}`}
            >
              <div
                className="size-16 rounded-md shadow-xs"
                style={{ backgroundColor: `var(--color-chart-categorical-${n})` }}
                aria-hidden
              />
            </TokenCard>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-stack">
        <h3 className="text-title">Diverging</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-stack">
          <TokenCard
            label="chart-diverging-neg"
            cssVar="--color-chart-diverging-neg"
            tailwindClass="bg-chart-diverging-neg"
            value="Worse-than-baseline / negative anomalies"
          >
            <div
              className="size-16 rounded-md"
              style={{ backgroundColor: 'var(--color-chart-diverging-neg)' }}
              aria-hidden
            />
          </TokenCard>
          <TokenCard
            label="chart-diverging-neu"
            cssVar="--color-chart-diverging-neu"
            tailwindClass="bg-chart-diverging-neu"
            value="On-baseline / neutral"
          >
            <div
              className="size-16 rounded-md"
              style={{ backgroundColor: 'var(--color-chart-diverging-neu)' }}
              aria-hidden
            />
          </TokenCard>
          <TokenCard
            label="chart-diverging-pos"
            cssVar="--color-chart-diverging-pos"
            tailwindClass="bg-chart-diverging-pos"
            value="Better-than-baseline / positive anomalies"
          >
            <div
              className="size-16 rounded-md"
              style={{ backgroundColor: 'var(--color-chart-diverging-pos)' }}
              aria-hidden
            />
          </TokenCard>
        </div>

        <TokenCard
          label="Diverging gradient"
          cssVar="--chart-diverging-neg → neu → pos"
          value="Composed gradient for heatmap cells"
        >
          <div
            className="w-full h-8 rounded-md shadow-xs"
            style={{
              background:
                'linear-gradient(to right, var(--chart-diverging-neg), var(--chart-diverging-neu), var(--chart-diverging-pos))',
            }}
            aria-hidden
          />
        </TokenCard>
      </div>
    </section>
  );
}

function InteractionSwatches() {
  return (
    <section className="flex flex-col gap-stack">
      <h2 className="text-heading">Interaction</h2>
      <p className="text-body text-muted-foreground">
        Focus ring (warm accent), subtle hover tint, and selection background.
        Tab into the focus-ring demo to see the ring; hover the hover-bg demo
        to see the tint.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-stack">
        <TokenCard
          label="focus-ring"
          cssVar="--color-focus-ring"
          tailwindClass="ring-ring"
          value="Warm accent; tab to see"
        >
          <button
            type="button"
            className="bg-surface-raised text-foreground text-label uppercase px-[var(--spacing-3)] py-[var(--spacing-2)] rounded-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Focus me
          </button>
        </TokenCard>

        <TokenCard
          label="hover-bg"
          cssVar="--color-hover-bg"
          tailwindClass="hover:bg-hover-bg"
          value="Neutral tint on hover"
        >
          <button
            type="button"
            className="bg-surface-raised text-foreground text-label uppercase px-[var(--spacing-3)] py-[var(--spacing-2)] rounded-sm shadow-xs hover:bg-hover-bg transition-colors duration-quick ease-default"
          >
            Hover me
          </button>
        </TokenCard>

        <TokenCard
          label="selection-bg"
          cssVar="--color-selection-bg"
          value="Select the text below"
        >
          <p className="text-body text-foreground text-center">
            Drag across <span className="bg-selection-bg">this text</span> to see
            the selection tint.
          </p>
        </TokenCard>
      </div>
    </section>
  );
}
