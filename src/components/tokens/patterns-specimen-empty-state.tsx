'use client';

import { EmptyState } from '@/components/patterns/empty-state';

/**
 * /tokens demo for the EmptyState pattern (DS-22).
 *
 * Six cells across a 2-column grid:
 *   1. no-data     — default, no CTA
 *   2. no-results  — default CTA wired ("Clear filters")
 *   3. error       — default CTA wired ("Retry")
 *   4. permissions — default, no CTA
 *   5. no-results  — full custom overrides (title, description, custom ReactNode action)
 *   6. error       — CTA suppressed via `action={null}`
 *
 * Wrapping each demo in a bordered box keeps the 40vh-min cells visually separated.
 * Plan 29-05 aggregator owns wiring this into token-browser.tsx.
 */
export function EmptyStateSpecimen() {
  return (
    <section className="flex flex-col gap-stack">
      <h2 className="text-heading">EmptyState (DS-22)</h2>
      <p className="text-body text-muted-foreground">
        Four first-class variants — <code className="text-body-numeric">no-data</code>,{' '}
        <code className="text-body-numeric">no-results</code>,{' '}
        <code className="text-body-numeric">error</code>,{' '}
        <code className="text-body-numeric">permissions</code> — each with a canonical
        Lucide icon and sensible default CTA. Callers override copy via{' '}
        <code className="text-body-numeric">title</code> /{' '}
        <code className="text-body-numeric">description</code>, swap the CTA via{' '}
        <code className="text-body-numeric">action</code>, or suppress it by passing{' '}
        <code className="text-body-numeric">action={'{null}'}</code>.
      </p>

      <div className="grid grid-cols-2 gap-stack">
        <div
          className="border border-border rounded-md overflow-hidden"
          style={{ minHeight: '40vh' }}
        >
          <EmptyState variant="no-data" />
        </div>

        <div
          className="border border-border rounded-md overflow-hidden"
          style={{ minHeight: '40vh' }}
        >
          <EmptyState
            variant="no-results"
            onAction={() => {
              // demo handler
              if (typeof window !== 'undefined') window.alert('clear filters');
            }}
          />
        </div>

        <div
          className="border border-border rounded-md overflow-hidden"
          style={{ minHeight: '40vh' }}
        >
          <EmptyState
            variant="error"
            onAction={() => {
              if (typeof window !== 'undefined') window.alert('retry');
            }}
          />
        </div>

        <div
          className="border border-border rounded-md overflow-hidden"
          style={{ minHeight: '40vh' }}
        >
          <EmptyState variant="permissions" />
        </div>

        <div
          className="border border-border rounded-md overflow-hidden"
          style={{ minHeight: '40vh' }}
        >
          <EmptyState
            variant="no-results"
            title="Custom title"
            description="Custom description with a non-default call to action."
            action={
              <a href="#" className="text-body text-primary hover:underline">
                Custom link CTA
              </a>
            }
          />
        </div>

        <div
          className="border border-border rounded-md overflow-hidden"
          style={{ minHeight: '40vh' }}
        >
          <EmptyState variant="error" action={null} />
        </div>
      </div>
    </section>
  );
}
