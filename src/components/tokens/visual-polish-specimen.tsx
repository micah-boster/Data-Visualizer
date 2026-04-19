'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SectionHeader } from '@/components/layout/section-header';
import { SectionDivider } from '@/components/layout/section-divider';
import { ToolbarDivider } from '@/components/patterns/toolbar-divider';

/**
 * /tokens "Visual Polish" tab content. Aggregates six inline sub-demos, one per
 * Phase 31 treatment (DS-29..DS-34).
 *
 * 1. Gradient Divider (DS-29)   — SectionDivider + ToolbarDivider preview
 * 2. Glass Highlight (DS-30)    — light vs dark surface-raised top-edge highlight
 * 3. Focus Glow (DS-31)         — .focus-glow + .focus-glow-within sites
 * 4. Border Standard (DS-32)    — OLD 15% vs NEW 8% side-by-side
 * 5. Row Hover (DS-33)          — table row hover tint
 * 6. Scrollbar (DS-34)          — .thin-scrollbar opt-in vs OS default
 *
 * Structure mirrors ComponentPatternsSpecimen (Phase 29-05) and MotionDemo
 * (Phase 30-05): single aggregator, inline sub-sections, one SectionHeader per
 * sub-demo, shared gap-section rhythm.
 *
 * Allowlist note: this file lives in src/components/tokens/** which is
 * excluded from every check:* guard — so the Border Standard demo can
 * legitimately render a raw 15% color-mix border for the "OLD" comparison
 * card. Consumers outside this directory must use border-border.
 */
export function VisualPolishSpecimen() {
  return (
    <div className="flex flex-col gap-section">
      <GradientDividerDemo />
      <GlassHighlightDemo />
      <FocusGlowDemo />
      <BorderStandardDemo />
      <RowHoverDemo />
      <ScrollbarDemo />
    </div>
  );
}

/* ---------------- 1. Gradient Divider (DS-29) ---------------- */

function GradientDividerDemo() {
  return (
    <section className="flex flex-col gap-stack">
      <SectionHeader
        title="Gradient Divider (DS-29)"
        eyebrow="31-05"
        description="Center-solid var(--border), transparent at both ends. Horizontal: <SectionDivider /> between section bands. Vertical: <ToolbarDivider /> between toolbar clusters."
      />

      <div className="bg-surface-raised rounded-lg p-card-padding shadow-elevation-raised">
        <div className="flex items-center justify-between">
          <span className="text-label text-muted-foreground uppercase">KPI band</span>
          <span className="text-body-numeric text-foreground">Partner summary</span>
        </div>
        <SectionDivider />
        <div className="flex items-center justify-between">
          <span className="text-label text-muted-foreground uppercase">Charts</span>
          <span className="text-body text-foreground">Curves + comparison matrix</span>
        </div>
        <SectionDivider />
        <div className="flex items-center justify-between">
          <span className="text-label text-muted-foreground uppercase">Table</span>
          <span className="text-body text-foreground">Account rows</span>
        </div>
      </div>

      <div className="bg-surface-raised rounded-lg p-card-padding shadow-elevation-raised">
        <p className="text-caption text-muted-foreground mb-stack">
          Vertical gradient between toolbar clusters:
        </p>
        <div className="flex items-center">
          <div className="flex items-center gap-1">
            <Button size="sm" variant="outline">Columns</Button>
            <Button size="sm" variant="outline">Sort</Button>
          </div>
          <ToolbarDivider />
          <div className="flex items-center gap-1">
            <Button size="sm" variant="outline">Export</Button>
            <Button size="sm" variant="outline">Save view</Button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- 2. Glass Highlight (DS-30) ---------------- */

function GlassHighlightDemo() {
  return (
    <section className="flex flex-col gap-stack">
      <SectionHeader
        title="Glass Highlight (DS-30)"
        eyebrow="31-01"
        description="Dark-mode --shadow-elevation-raised carries an inset 7% white top-edge highlight. Light-mode has no analog by design (cards read as paper-on-paper)."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-inline">
        <div className="bg-surface-raised rounded-lg p-card-padding shadow-elevation-raised">
          <div className="flex flex-col gap-1">
            <span className="text-label text-muted-foreground uppercase">
              Light (no analog)
            </span>
            <span className="text-heading text-foreground">Paper on paper</span>
            <span className="text-caption text-muted-foreground">
              shadow-elevation-raised renders only the ambient + diffuse drop layers.
            </span>
          </div>
        </div>
        <div className="dark">
          <div className="bg-surface-raised rounded-lg p-card-padding shadow-elevation-raised">
            <div className="flex flex-col gap-1">
              <span className="text-label text-muted-foreground uppercase">
                Dark (~7% top edge)
              </span>
              <span className="text-heading text-foreground">Glass highlight</span>
              <span className="text-caption text-muted-foreground">
                Third shadow layer: inset 0 1px 0 0 oklch(1 0 0 / 0.07).
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- 3. Focus Glow (DS-31) ---------------- */

function FocusGlowDemo() {
  return (
    <section className="flex flex-col gap-stack">
      <SectionHeader
        title="Focus Glow (DS-31)"
        eyebrow="31-02"
        description="Tab through the input, button, and cluster. Soft spread-glow appears on :focus-visible (keyboard only — mouse clicks do not fire it). Cluster uses :has(:focus-visible) so the whole group lights up when a child is focused."
      />

      <div className="bg-surface-raised rounded-lg p-card-padding shadow-elevation-raised flex flex-col gap-stack">
        <div className="flex flex-col gap-1">
          <label htmlFor="focus-glow-input" className="text-label text-muted-foreground uppercase">
            Input (app-level, .focus-glow)
          </label>
          <Input
            id="focus-glow-input"
            placeholder="Tab here to see the soft spread-glow"
            className="focus:outline-none focus-glow max-w-sm"
          />
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-label text-muted-foreground uppercase">
            Standalone button (.focus-glow)
          </span>
          <Button size="sm" variant="outline" className="focus:outline-none focus-glow self-start">
            Tab into me
          </Button>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-label text-muted-foreground uppercase">
            Cluster (.focus-glow-within)
          </span>
          <div className="flex items-center gap-1 rounded-md focus-glow-within self-start">
            <Button size="sm" variant="outline">First</Button>
            <Button size="sm" variant="outline">Second</Button>
            <Button size="sm" variant="outline">Third</Button>
          </div>
          <span className="text-caption text-muted-foreground">
            Tab into any button — the whole cluster lights up. Click with the mouse — no glow.
          </span>
        </div>
      </div>
    </section>
  );
}

/* ---------------- 4. Border Standard (DS-32) ---------------- */

function BorderStandardDemo() {
  return (
    <section className="flex flex-col gap-stack">
      <SectionHeader
        title="Border Standard (DS-32)"
        eyebrow="31-01"
        description="--border retuned to 8% across :root and .dark. Side-by-side shows the OLD 15% recipe vs the NEW 8% token. Cards read as near-borderless at 8%."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-inline">
        {/* OLD: intentionally raw color-mix to document the prior baseline. Allowed inside tokens/ only. */}
        <div
          className="bg-surface-raised rounded-lg p-card-padding shadow-elevation-raised border"
          style={{
            borderColor:
              'color-mix(in oklch, var(--neutral-500) 15%, transparent)',
          }}
        >
          <div className="flex flex-col gap-1">
            <span className="text-label text-muted-foreground uppercase">OLD 15%</span>
            <span className="text-heading text-foreground">Louder border</span>
            <span className="text-caption text-muted-foreground">
              Pre-31-01 --border value. The frame reads as a deliberate line.
            </span>
          </div>
        </div>

        <div className="bg-surface-raised rounded-lg p-card-padding shadow-elevation-raised border border-border">
          <div className="flex flex-col gap-1">
            <span className="text-label text-muted-foreground uppercase">NEW 8%</span>
            <span className="text-heading text-foreground">Near-borderless</span>
            <span className="text-caption text-muted-foreground">
              Current --border (8%). The card reads as a surface, not a framed object.
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- 5. Row Hover (DS-33) ---------------- */

function RowHoverDemo() {
  const rows = [
    { id: 'r1', label: 'Acme Partners', value: '1,243' },
    { id: 'r2', label: 'Bolt Retail', value: '876' },
    { id: 'r3', label: 'Cobalt Logistics', value: '2,108' },
    { id: 'r4', label: 'Delta Health', value: '512' },
  ];
  return (
    <section className="flex flex-col gap-stack">
      <SectionHeader
        title="Row Hover (DS-33)"
        eyebrow="31-04"
        description="Hover a row. Soft neutral tint, no geometry shift, no accent bar. Uses the canonical table-body recipe: h-[var(--row-height)] transition-colors duration-quick ease-default hover:bg-hover-bg."
      />

      <div
        data-density="dense"
        className="bg-surface-raised rounded-lg shadow-elevation-raised overflow-hidden"
      >
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-label text-muted-foreground uppercase text-left px-[var(--row-padding-x)] py-[var(--row-padding-y)]">
                Partner
              </th>
              <th className="text-label text-muted-foreground uppercase text-right px-[var(--row-padding-x)] py-[var(--row-padding-y)]">
                Accounts
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.id}
                className="h-[var(--row-height)] transition-colors duration-quick ease-default hover:bg-hover-bg"
              >
                <td className="text-body text-foreground px-[var(--row-padding-x)] py-[var(--row-padding-y)]">
                  {r.label}
                </td>
                <td className="text-body-numeric text-foreground text-right px-[var(--row-padding-x)] py-[var(--row-padding-y)]">
                  {r.value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ---------------- 6. Scrollbar (DS-34) ---------------- */

function ScrollbarDemo() {
  const lines = Array.from({ length: 32 }, (_, i) => `Row ${i + 1} — overflow content`);
  return (
    <section className="flex flex-col gap-stack">
      <SectionHeader
        title="Scrollbar (DS-34)"
        eyebrow="31-03"
        description=".thin-scrollbar is opt-in on named containers (table, sidebar, filters, sort dialog, query response, curve legend). Document/body scroll falls back to OS default."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-inline">
        <div className="flex flex-col gap-1">
          <span className="text-label text-muted-foreground uppercase">
            .thin-scrollbar (themed)
          </span>
          <div className="bg-surface-raised rounded-lg shadow-elevation-raised h-48 overflow-auto thin-scrollbar p-card-padding">
            <ul className="flex flex-col gap-1">
              {lines.map((line) => (
                <li key={line} className="text-body text-foreground">
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-label text-muted-foreground uppercase">
            No class (OS default)
          </span>
          <div className="bg-surface-raised rounded-lg shadow-elevation-raised h-48 overflow-auto p-card-padding">
            <ul className="flex flex-col gap-1">
              {lines.map((line) => (
                <li key={line} className="text-body text-foreground">
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
