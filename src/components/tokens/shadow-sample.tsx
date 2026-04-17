'use client';

import { TokenCard } from './token-card';

/**
 * Multi-layer shadow samples + border-radius samples.
 *
 * Shadows scale from barely-visible (xs) through still-soft (lg); in dark mode
 * they re-tint darker per globals.css to remain visible against
 * surface-raised backgrounds.
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

export function ShadowSample() {
  return (
    <div className="flex flex-col gap-section">
      <section className="flex flex-col gap-stack">
        <h2 className="text-heading">Shadows</h2>
        <p className="text-body text-muted-foreground">
          Multi-layer (tight inner + wider soft blur), warm-tinted in light,
          darker-tinted in dark. Subtle by design.
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
