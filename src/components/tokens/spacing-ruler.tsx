'use client';

import { TokenCard } from './token-card';

/**
 * Visual ruler for every --spacing-* token.
 *
 * Renders two sub-sections:
 *   1. Numeric scale (--spacing-1..12) — the canonical source-of-truth tokens.
 *   2. Semantic aliases (--spacing-inline/stack/section/card-padding/page-gutter).
 *
 * Each card shows a horizontal amber bar whose width equals the token's
 * resolved value, so "spacing-1 = 4px" visibly corresponds to a 4px-wide bar.
 */

type NumericSpacing = { step: string; px: number };

const NUMERIC: NumericSpacing[] = [
  { step: '1', px: 4 },
  { step: '2', px: 8 },
  { step: '3', px: 12 },
  { step: '4', px: 16 },
  { step: '5', px: 20 },
  { step: '6', px: 24 },
  { step: '7', px: 32 },
  { step: '8', px: 40 },
  { step: '9', px: 48 },
  { step: '10', px: 64 },
  { step: '11', px: 80 },
  { step: '12', px: 96 },
];

type SemanticSpacing = { name: string; mapsTo: string; px: number };

const SEMANTIC: SemanticSpacing[] = [
  { name: 'inline', mapsTo: 'spacing-2', px: 8 },
  { name: 'stack', mapsTo: 'spacing-3', px: 12 },
  { name: 'section', mapsTo: 'spacing-6', px: 24 },
  { name: 'card-padding', mapsTo: 'spacing-4', px: 16 },
  { name: 'page-gutter', mapsTo: 'spacing-4', px: 16 },
];

export function SpacingRuler() {
  return (
    <div className="flex flex-col gap-section">
      <section className="flex flex-col gap-stack">
        <h2 className="text-heading">Numeric scale</h2>
        <p className="text-body text-muted-foreground">
          The 4px-grid source of truth. Tailwind auto-emits{' '}
          <code className="text-body-numeric">p-1..12</code>,{' '}
          <code className="text-body-numeric">m-1..12</code>,{' '}
          <code className="text-body-numeric">gap-1..12</code>, etc.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-stack">
          {NUMERIC.map(({ step, px }) => (
            <TokenCard
              key={step}
              label={`spacing-${step}`}
              cssVar={`--spacing-${step}`}
              tailwindClass={`p-${step}`}
              value={`${px}px`}
            >
              <div
                className="bg-brand-green rounded-sm"
                style={{ width: `var(--spacing-${step})`, height: '16px' }}
                aria-hidden
              />
            </TokenCard>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-stack">
        <h2 className="text-heading">Semantic aliases</h2>
        <p className="text-body text-muted-foreground">
          High-level intent names that resolve to the numeric scale. Prefer these
          in component code so intent stays readable.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-stack">
          {SEMANTIC.map(({ name, mapsTo, px }) => (
            <TokenCard
              key={name}
              label={`spacing-${name} → ${mapsTo}`}
              cssVar={`--spacing-${name}`}
              tailwindClass={`p-${name}`}
              value={`${px}px`}
            >
              <div
                className="bg-brand-green rounded-sm"
                style={{ width: `var(--spacing-${name})`, height: '16px' }}
                aria-hidden
              />
            </TokenCard>
          ))}
        </div>
      </section>
    </div>
  );
}
