'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { TokenCard } from './token-card';
import { Button } from '@/components/ui/button';
import { DataPanel } from '@/components/patterns/data-panel';

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
        <div className="flex flex-col gap-[var(--spacing-1)]">
          <h2 className="text-heading">Reduced motion</h2>
          <p className="text-body text-muted-foreground">
            When your OS has{' '}
            <code className="text-caption">prefers-reduced-motion: reduce</code>{' '}
            set, every transition in the app collapses to instant. Translate
            and scale transforms neutralize to identity. Test by enabling
            Reduce Motion in System Settings → Accessibility → Display.
          </p>
          <p className="text-caption text-muted-foreground">
            This page&apos;s own demos respect the OS preference by design —
            faithful to user intent, not an exception.
          </p>
        </div>
      </section>

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
            className="text-label uppercase bg-brand-green text-primary-foreground px-[var(--spacing-3)] py-[var(--spacing-2)] rounded-sm shadow-xs transition-colors duration-quick ease-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                        'size-12 bg-brand-green rounded-md shadow-sm transition-transform',
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

      <section className="flex flex-col gap-stack">
        <div className="flex flex-col gap-[var(--spacing-1)]">
          <div className="flex items-baseline gap-inline">
            <h2 className="text-heading">Card hover lift</h2>
            <span className="text-label uppercase text-muted-foreground">
              DS-25
            </span>
          </div>
          <p className="text-body text-muted-foreground">
            Interactive cards use the{' '}
            <code className="text-caption">.hover-lift</code> utility —
            translate-Y -1px + shadow step from elevation-raised to
            elevation-overlay, duration-quick × ease-spring.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-stack">
          <div className="flex flex-col gap-[var(--spacing-1)]">
            <span className="text-label uppercase text-muted-foreground">
              Interactive
            </span>
            <div className="rounded-lg bg-surface-raised p-card-padding shadow-elevation-raised hover-lift">
              <span className="text-body">Hover me — I lift.</span>
            </div>
          </div>
          <div className="flex flex-col gap-[var(--spacing-1)]">
            <span className="text-label uppercase text-muted-foreground">
              Static
            </span>
            <div className="rounded-lg bg-surface-raised p-card-padding shadow-elevation-raised transition-colors duration-quick ease-default">
              <span className="text-body">Static card — I don&apos;t lift.</span>
            </div>
          </div>
        </div>
      </section>

      <DrillCrossFadeDemo />

      <section className="flex flex-col gap-stack">
        <div className="flex flex-col gap-[var(--spacing-1)]">
          <div className="flex items-baseline gap-inline">
            <h2 className="text-heading">Button press scale</h2>
            <span className="text-label uppercase text-muted-foreground">
              DS-26
            </span>
          </div>
          <p className="text-body text-muted-foreground">
            Primary + secondary buttons scale(1.01) on hover, scale(0.98) on
            active. Other variants (ghost, outline, destructive, link) use bg
            tint only — no scale. Dropdown triggers (aria-haspopup) opt out
            because the menu is the feedback.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-stack">
          <div className="flex flex-col gap-[var(--spacing-1)] items-start">
            <span className="text-label uppercase text-muted-foreground">
              Default (scales)
            </span>
            <Button variant="default">Hover me, press me</Button>
          </div>
          <div className="flex flex-col gap-[var(--spacing-1)] items-start">
            <span className="text-label uppercase text-muted-foreground">
              Secondary (scales)
            </span>
            <Button variant="secondary">Hover me, press me</Button>
          </div>
          <div className="flex flex-col gap-[var(--spacing-1)] items-start">
            <span className="text-label uppercase text-muted-foreground">
              Outline (no scale)
            </span>
            <Button variant="outline">Tint only</Button>
          </div>
          <div className="flex flex-col gap-[var(--spacing-1)] items-start">
            <span className="text-label uppercase text-muted-foreground">
              Ghost (no scale)
            </span>
            <Button variant="ghost">Tint only</Button>
          </div>
          <div className="flex flex-col gap-[var(--spacing-1)] items-start">
            <span className="text-label uppercase text-muted-foreground">
              Destructive (no scale)
            </span>
            <Button variant="destructive">Tint only</Button>
          </div>
          <div className="flex flex-col gap-[var(--spacing-1)] items-start">
            <span className="text-label uppercase text-muted-foreground">
              Link (no scale)
            </span>
            <Button variant="link">Underline only</Button>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-stack">
        <div className="flex flex-col gap-[var(--spacing-1)]">
          <div className="flex items-baseline gap-inline">
            <h2 className="text-heading">Panel hover lift</h2>
            <span className="text-label uppercase text-muted-foreground">
              DS-25
            </span>
          </div>
          <p className="text-body text-muted-foreground">
            DataPanel-based chart + matrix shells opt into the same{' '}
            <code className="text-caption">.hover-lift</code> recipe used by
            interactive StatCards. Non-interactive display panels stay static.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-stack">
          <DataPanel
            title="Interactive panel"
            eyebrow="click to expand / drill"
            interactive
          >
            <p className="text-body text-muted-foreground">
              Hover me — I lift (translate-Y -1px + elevation-raised →
              elevation-overlay, duration-quick × ease-spring).
            </p>
          </DataPanel>
          <DataPanel title="Static display panel" eyebrow="no interaction">
            <p className="text-body text-muted-foreground">
              I stay put. Static panels leave{' '}
              <code className="text-caption">interactive</code> unset.
            </p>
          </DataPanel>
        </div>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Drill cross-fade (DS-23)
//
// Mirrors the real data-display.tsx drill boundary mechanism: a content wrapper
// re-keys on drill identity, and `transition-opacity duration-normal ease-default`
// softens the swap. Clicking the level buttons triggers the same transition
// users will see in the app when drilling root → partner → batch.
// ---------------------------------------------------------------------------

const DRILL_LEVELS = ['root', 'partner', 'batch'] as const;
type DemoDrillLevel = (typeof DRILL_LEVELS)[number];

const DEMO_CONTENT: Record<DemoDrillLevel, { title: string; body: string }> = {
  root: {
    title: 'All partners',
    body: 'Cross-partner matrix + trajectory chart. One row per partner.',
  },
  partner: {
    title: 'Acme Corp',
    body: 'KPI cards + partner-level table. One row per batch.',
  },
  batch: {
    title: 'Batch 2024-Q3',
    body: 'Batch collection curve + row-level account detail.',
  },
};

function DrillCrossFadeDemo() {
  const [demoLevel, setDemoLevel] = useState<DemoDrillLevel>('root');

  return (
    <section className="flex flex-col gap-stack">
      <div className="flex flex-col gap-[var(--spacing-1)]">
        <div className="flex items-baseline gap-inline">
          <h2 className="text-heading">Drill cross-fade</h2>
          <span className="text-label uppercase text-muted-foreground">
            DS-23
          </span>
        </div>
        <p className="text-body text-muted-foreground">
          Drilling between root, partner, and batch levels cross-fades the
          content region at{' '}
          <code className="text-caption">--duration-normal</code> ×{' '}
          <code className="text-caption">--ease-default</code>. Header, sidebar,
          and sticky chrome stay steady. Symmetric cross-fade — browser back /
          forward replays identically.
        </p>
      </div>

      <div className="flex flex-col gap-stack">
        <div className="flex gap-inline">
          {DRILL_LEVELS.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setDemoLevel(l)}
              aria-pressed={demoLevel === l}
              className={cn(
                'px-[var(--spacing-3)] py-[var(--spacing-2)] rounded-sm text-label uppercase transition-colors duration-quick ease-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                demoLevel === l
                  ? 'bg-brand-green text-primary-foreground'
                  : 'bg-surface-inset text-foreground hover:bg-hover-bg',
              )}
            >
              {l}
            </button>
          ))}
        </div>
        <div
          key={`demo-drill-${demoLevel}`}
          data-drill-fade
          className="transition-opacity duration-normal ease-default rounded-lg bg-surface-raised p-card-padding shadow-elevation-raised min-h-[120px]"
        >
          <h3 className="text-title">{DEMO_CONTENT[demoLevel].title}</h3>
          <p className="text-body text-muted-foreground">
            {DEMO_CONTENT[demoLevel].body}
          </p>
        </div>
      </div>
    </section>
  );
}
