'use client';

import { DataPanel } from '@/components/patterns/data-panel';

/**
 * /tokens Component Patterns demo — DataPanel slot-combo specimens (DS-19).
 *
 * Rendered inside the Component Patterns section on /tokens (wired by Plan
 * 29-05). Shows the four primary slot combinations: header-only, full-header
 * with footer-metadata, header+footer-actions, header+footer-totals.
 */
export function DataPanelSpecimen() {
  return (
    <section className="flex flex-col gap-stack">
      <h2 className="text-heading">DataPanel (DS-19)</h2>
      <p className="text-body text-muted-foreground">
        Composed panel shell — surface chrome + SectionHeader + optional
        footer. Header is required; footer is not reserved when empty.
      </p>

      {/* 1. Header-only (no footer) */}
      <div className="flex flex-col gap-inline">
        <h3 className="text-title">Header + content only</h3>
        <DataPanel title="Collection Trajectories">
          <div className="flex h-32 items-center justify-center text-caption text-muted-foreground">
            Chart body
          </div>
        </DataPanel>
      </div>

      {/* 2. Full header (eyebrow + description + actions) + footer metadata line */}
      <div className="flex flex-col gap-inline">
        <h3 className="text-title">Full header + footer metadata</h3>
        <DataPanel
          eyebrow="Analysis"
          title="Partner performance"
          description="Rolling 12-month comparison across partners"
          actions={
            <>
              <button type="button" className="text-body text-muted-foreground">
                Reset
              </button>
              <button type="button" className="text-body text-foreground">
                Save
              </button>
            </>
          }
          footer={
            <span className="text-caption text-muted-foreground">
              source: snowflake · fetched 2 min ago · 1,234 rows
            </span>
          }
        >
          <div className="flex h-32 items-center justify-center text-caption text-muted-foreground">
            Chart body
          </div>
        </DataPanel>
      </div>

      {/* 3. Header + footer (action cluster) */}
      <div className="flex flex-col gap-inline">
        <h3 className="text-title">Header + footer actions</h3>
        <DataPanel
          title="Batch Overview"
          footer={
            <div className="flex justify-end gap-inline">
              <button type="button" className="text-body text-muted-foreground">
                Export
              </button>
              <button type="button" className="text-body text-foreground">
                Refresh
              </button>
            </div>
          }
        >
          <div className="flex h-32 items-center justify-center text-caption text-muted-foreground">
            Table body
          </div>
        </DataPanel>
      </div>

      {/* 4. Header + footer (aggregate/totals row) */}
      <div className="flex flex-col gap-inline">
        <h3 className="text-title">Header + footer totals</h3>
        <DataPanel
          title="Aggregate Collections"
          footer={
            <div className="flex justify-between text-body-numeric">
              <span>Total</span>
              <span>1,234.56</span>
            </div>
          }
        >
          <div className="flex h-32 items-center justify-center text-caption text-muted-foreground">
            Rows
          </div>
        </DataPanel>
      </div>
    </section>
  );
}
