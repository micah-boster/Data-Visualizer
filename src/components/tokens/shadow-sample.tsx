'use client';

import { TokenCard } from './token-card';

/**
 * Multi-layer shadow samples + semantic elevation recipes + border-radius samples.
 *
 * Shadows scale from barely-visible (xs) through still-soft (lg); in dark mode
 * they re-tint darker per globals.css to remain visible against
 * surface-raised backgrounds.
 *
 * Semantic elevations (DS-11) are 3-layer compounds (key + ambient + rim) consumed
 * by every primary container — headers, KPI cards, chart shells, popovers, modals.
 * Raw --shadow-xs/sm/md/lg stay available for badges, chips, and one-off edges.
 *
 * Translucent surface (DS-11) is header-only; samples here demo the color-mix glass
 * effect against a vivid checkerboard so the blend is visible.
 *
 * Radius demos show the 3-step ladder sm/md/lg (4/8/12px).
 */

const SHADOWS = ['xs', 'sm', 'md', 'lg'] as const;
const RADII = ['sm', 'md', 'lg'] as const;
const RADII_PX: Record<(typeof RADII)[number], string> = {
  sm: '4px',
  md: '8px',
  lg: '12px',
};

// Semantic elevation samples. Each entry is hand-spelled (not template-literal
// interpolated) so Tailwind v4's content scanner picks up the class names.
const ELEVATION_SAMPLES: Array<{
  name: 'chrome' | 'raised' | 'overlay' | 'floating';
  cssVar: string;
  tailwindClass: string;
  description: string;
  consumer: string;
  sampleClass: string;
}> = [
  {
    name: 'chrome',
    cssVar: '--shadow-elevation-chrome',
    tailwindClass: 'shadow-elevation-chrome',
    description: 'Subtle lift for sticky chrome (app header).',
    consumer: 'header',
    sampleClass:
      'bg-surface-raised rounded-lg size-28 shadow-elevation-chrome',
  },
  {
    name: 'raised',
    cssVar: '--shadow-elevation-raised',
    tailwindClass: 'shadow-elevation-raised',
    description: 'Default primary container elevation.',
    consumer: 'KPI cards, chart shells, query cards',
    sampleClass:
      'bg-surface-raised rounded-lg size-28 shadow-elevation-raised',
  },
  {
    name: 'overlay',
    cssVar: '--shadow-elevation-overlay',
    tailwindClass: 'shadow-elevation-overlay',
    description: 'Clearly above content — popovers, dropdowns, tooltips.',
    consumer: 'Popover, Combobox popup, Recharts tooltip',
    sampleClass:
      'bg-surface-overlay rounded-lg size-28 shadow-elevation-overlay',
  },
  {
    name: 'floating',
    cssVar: '--shadow-elevation-floating',
    tailwindClass: 'shadow-elevation-floating',
    description: 'Decoupled from content — modals, sheets, command dialogs.',
    consumer: 'Sheet, command dialog, modal',
    sampleClass:
      'bg-surface-floating rounded-lg size-28 shadow-elevation-floating',
  },
];

export function ShadowSample() {
  return (
    <div className="flex flex-col gap-section">
      <section className="flex flex-col gap-stack">
        <h2 className="text-heading">Shadows (raw primitives)</h2>
        <p className="text-body text-muted-foreground">
          Multi-layer (tight inner + wider soft blur), warm-tinted in light,
          darker-tinted in dark. Use for badges, chips, and one-off edges —
          primary containers use the semantic elevations below.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-stack">
          {SHADOWS.map((s) => (
            <TokenCard
              key={s}
              label={`shadow-${s}`}
              cssVar={`--shadow-${s}`}
              tailwindClass={`shadow-${s}`}
            >
              {/* Intentional utility usage — we are demoing the exact class this card represents. */}
              <div
                className={`bg-surface-raised rounded-md size-20 shadow-${s}`}
                aria-hidden
              />
            </TokenCard>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-stack">
        <h2 className="text-heading">Semantic Elevations (DS-11)</h2>
        <p className="text-body text-muted-foreground">
          3-layer compounds: key shadow + ambient diffuse + inset rim highlight.
          Every primary container reaches for one of these — never for raw
          shadow-sm/md/lg. Dark-mode values are hand-tuned (pure black, higher
          opacity) to stay readable against warm near-black surfaces.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-stack">
          {ELEVATION_SAMPLES.map((e) => (
            <TokenCard
              key={e.name}
              label={`elevation-${e.name}`}
              cssVar={e.cssVar}
              tailwindClass={e.tailwindClass}
            >
              <div className="flex flex-col gap-inline">
                {/* Extra padding/radius so the 3-layer shadow is never clipped (Pitfall 1). */}
                <div className={e.sampleClass} aria-hidden />
                <span className="text-caption text-muted-foreground">
                  {e.description}
                </span>
                <span className="text-caption text-muted-foreground">
                  <span className="font-medium">Consumers:</span> {e.consumer}
                </span>
              </div>
            </TokenCard>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-stack">
        <h2 className="text-heading">Translucent Surface (DS-11, header-only)</h2>
        <p className="text-body text-muted-foreground">
          color-mix blend of surface-raised with transparency (80% light, 82%
          dark). Pair with <code className="text-body-numeric">backdrop-blur-md</code>
          {' '}on the header so content scrolling underneath shows through blurred.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-stack">
          <TokenCard
            label="surface-translucent"
            cssVar="--surface-translucent"
            tailwindClass="bg-surface-translucent"
          >
            {/* Checkerboard backdrop proves the blend — without it the glass looks opaque. */}
            <div
              className="relative size-28 rounded-md overflow-hidden"
              aria-hidden
              style={{
                backgroundImage:
                  'linear-gradient(45deg, var(--brand-green) 25%, transparent 25%), linear-gradient(-45deg, var(--brand-green) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, var(--brand-purple) 75%), linear-gradient(-45deg, transparent 75%, var(--brand-purple) 75%)',
                backgroundSize: '16px 16px',
                backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
              }}
            >
              <div className="absolute inset-2 rounded-sm bg-surface-translucent backdrop-blur-md flex items-center justify-center text-label text-foreground">
                glass
              </div>
            </div>
          </TokenCard>
        </div>
      </section>

      <section className="flex flex-col gap-stack">
        <h2 className="text-heading">Radius</h2>
        <p className="text-body text-muted-foreground">
          Three-step ladder. Inputs/small buttons use sm; cards/popovers use
          md; modals/large panels use lg.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-stack">
          {RADII.map((r) => (
            <TokenCard
              key={r}
              label={`radius-${r}`}
              cssVar={`--radius-${r}`}
              tailwindClass={`rounded-${r}`}
              value={RADII_PX[r]}
            >
              {/* Intentional: demoing the exact rounded utility. */}
              <div className={`bg-brand-green size-20 rounded-${r}`} aria-hidden />
            </TokenCard>
          ))}
        </div>
      </section>
    </div>
  );
}
