'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { TokenCard } from './token-card';

/**
 * Interactive motion playground — 9 duration × easing combinations.
 *
 * Each card contains a small amber box. Click the card's example area and the
 * box translates 80px to the right using the specific token combination
 * (e.g. duration-quick × ease-spring). Click again to return it.
 *
 * Per Phase 26 motion lock: motion lives on containers, never on data values.
 * These demos animate a decorative box — they intentionally do not tween
 * numbers.
 */

const DURATIONS = ['quick', 'normal', 'slow'] as const;
const DURATION_MS: Record<(typeof DURATIONS)[number], string> = {
  quick: '120ms',
  normal: '200ms',
  slow: '320ms',
};

const EASINGS = ['default', 'spring', 'decelerate'] as const;

const EASING_NOTES: Record<(typeof EASINGS)[number], string> = {
  default: 'Standard curve for most UI transitions',
  spring:
    'Mild overshoot — tactile feedback for hover/press. Use sparingly; never on data.',
  decelerate: 'Entrance curve — drill-downs, skeleton-to-content fades',
};

type ComboKey = `${(typeof DURATIONS)[number]}-${(typeof EASINGS)[number]}`;

export function MotionDemo() {
  const [active, setActive] = useState<Record<ComboKey, boolean>>(
    {} as Record<ComboKey, boolean>,
  );

  function toggle(key: ComboKey) {
    setActive((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function runAll() {
    setActive((prev) => {
      const anyActive = Object.values(prev).some(Boolean);
      const next = {} as Record<ComboKey, boolean>;
      for (const d of DURATIONS) {
        for (const e of EASINGS) {
          next[`${d}-${e}` as ComboKey] = !anyActive;
        }
      }
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-section">
      <section className="flex flex-col gap-stack">
        <div className="flex items-center justify-between gap-inline flex-wrap">
          <div className="flex flex-col gap-[var(--spacing-1)]">
            <h2 className="text-heading">Duration × Easing</h2>
            <p className="text-body text-muted-foreground">
              Click any card&apos;s example to translate the box 80px; click
              again to return. Compare curves side-by-side.
            </p>
          </div>
          <button
            type="button"
            onClick={runAll}
            className="text-label uppercase bg-accent-warm text-primary-foreground px-[var(--spacing-3)] py-[var(--spacing-2)] rounded-sm shadow-xs transition-colors duration-quick ease-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Run all
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-stack">
          {DURATIONS.flatMap((duration) =>
            EASINGS.map((easing) => {
              const key = `${duration}-${easing}` as ComboKey;
              const isActive = Boolean(active[key]);
              return (
                <TokenCard
                  key={key}
                  label={`duration-${duration} × ease-${easing}`}
                  cssVar={`--duration-${duration} / --ease-${easing}`}
                  tailwindClass={`duration-${duration} ease-${easing}`}
                  value={`${DURATION_MS[duration]} · ${EASING_NOTES[easing]}`}
                >
                  <button
                    type="button"
                    onClick={() => toggle(key)}
                    aria-label={`Trigger duration-${duration} ease-${easing} animation`}
                    className="w-full h-full flex items-center justify-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                  >
                    <div
                      className={cn(
                        'size-12 bg-accent-warm rounded-md shadow-sm transition-transform',
                        isActive && 'translate-x-20',
                      )}
                      style={{
                        transitionDuration: `var(--duration-${duration})`,
                        transitionTimingFunction: `var(--ease-${easing})`,
                      }}
                      aria-hidden
                    />
                  </button>
                </TokenCard>
              );
            }),
          )}
        </div>
      </section>
    </div>
  );
}
