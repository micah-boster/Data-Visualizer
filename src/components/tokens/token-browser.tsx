'use client';

import { Tabs } from '@base-ui/react/tabs';
import { SpacingRuler } from './spacing-ruler';
import { TypeSpecimen } from './type-specimen';
import { ShadowSample } from './shadow-sample';
import { MotionDemo } from './motion-demo';
import { ColorSwatch } from './color-swatch';
import { ComponentPatternsSpecimen } from './component-patterns-specimen';
import { VisualPolishSpecimen } from './visual-polish-specimen';

/**
 * Main tabbed token browser used by the /tokens page.
 *
 * Tabs (7): Spacing / Typography / Surfaces & Shadows / Motion / Colors /
 *            Component Patterns / Visual Polish.
 * Surfaces & Shadows is a merged tab that renders surface swatches, shadow samples,
 * and radius samples together. Component Patterns (Phase 29) aggregates the
 * StatCard, DataPanel, EmptyState, and ToolbarDivider specimens. Visual Polish
 * (Phase 31) aggregates the six DS-29..DS-34 treatments (gradient divider, glass
 * highlight, focus glow, border standard, row hover, scrollbar).
 *
 * Tabs primitive: `@base-ui/react/tabs` (no shadcn Tabs in this repo).
 * Plan 26-05 notes: no `src/components/ui/tabs.tsx` existed at plan time, so Base UI
 * Tabs is the canonical choice for any future tabbed UI in this codebase until a
 * shadcn Tabs wrapper is scaffolded.
 */
export function TokenBrowser() {
  return (
    <div className="bg-surface-base min-h-screen p-page-gutter">
      <div className="max-w-6xl mx-auto flex flex-col gap-section">
        <header className="flex flex-col gap-stack">
          <h1 className="text-display">Design Tokens</h1>
          <p className="text-body text-muted-foreground">
            Phase 26 — reference of every design token. Unlisted. Bookmarkable.
            Click a token&apos;s icon to copy the CSS variable or Tailwind class.
          </p>
        </header>

        <Tabs.Root defaultValue="spacing" className="flex flex-col gap-section">
          <Tabs.List className="flex items-center gap-inline bg-surface-inset rounded-md p-[var(--spacing-1)] self-start">
            <Tabs.Tab
              value="spacing"
              className="text-label px-[var(--spacing-3)] py-[var(--spacing-2)] rounded-sm text-muted-foreground data-[selected]:text-foreground data-[selected]:bg-surface-raised data-[selected]:shadow-xs transition-colors duration-quick ease-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Spacing
            </Tabs.Tab>
            <Tabs.Tab
              value="typography"
              className="text-label px-[var(--spacing-3)] py-[var(--spacing-2)] rounded-sm text-muted-foreground data-[selected]:text-foreground data-[selected]:bg-surface-raised data-[selected]:shadow-xs transition-colors duration-quick ease-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Typography
            </Tabs.Tab>
            <Tabs.Tab
              value="surfaces-shadows"
              className="text-label px-[var(--spacing-3)] py-[var(--spacing-2)] rounded-sm text-muted-foreground data-[selected]:text-foreground data-[selected]:bg-surface-raised data-[selected]:shadow-xs transition-colors duration-quick ease-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Surfaces &amp; Shadows
            </Tabs.Tab>
            <Tabs.Tab
              value="motion"
              className="text-label px-[var(--spacing-3)] py-[var(--spacing-2)] rounded-sm text-muted-foreground data-[selected]:text-foreground data-[selected]:bg-surface-raised data-[selected]:shadow-xs transition-colors duration-quick ease-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Motion
            </Tabs.Tab>
            <Tabs.Tab
              value="colors"
              className="text-label px-[var(--spacing-3)] py-[var(--spacing-2)] rounded-sm text-muted-foreground data-[selected]:text-foreground data-[selected]:bg-surface-raised data-[selected]:shadow-xs transition-colors duration-quick ease-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Colors
            </Tabs.Tab>
            <Tabs.Tab
              value="patterns"
              className="text-label px-[var(--spacing-3)] py-[var(--spacing-2)] rounded-sm text-muted-foreground data-[selected]:text-foreground data-[selected]:bg-surface-raised data-[selected]:shadow-xs transition-colors duration-quick ease-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Component Patterns
            </Tabs.Tab>
            <Tabs.Tab
              value="polish"
              className="text-label px-[var(--spacing-3)] py-[var(--spacing-2)] rounded-sm text-muted-foreground data-[selected]:text-foreground data-[selected]:bg-surface-raised data-[selected]:shadow-xs transition-colors duration-quick ease-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Visual Polish
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="spacing" className="focus-visible:outline-none">
            <SpacingRuler />
          </Tabs.Panel>
          <Tabs.Panel value="typography" className="focus-visible:outline-none">
            <TypeSpecimen />
          </Tabs.Panel>
          <Tabs.Panel
            value="surfaces-shadows"
            className="focus-visible:outline-none"
          >
            <div className="flex flex-col gap-section">
              <ColorSwatch category="surfaces" />
              <ShadowSample />
            </div>
          </Tabs.Panel>
          <Tabs.Panel value="motion" className="focus-visible:outline-none">
            <MotionDemo />
          </Tabs.Panel>
          <Tabs.Panel value="colors" className="focus-visible:outline-none">
            <div className="flex flex-col gap-section">
              <ColorSwatch category="accent-state" />
              <ColorSwatch category="neutrals" />
              <ColorSwatch category="chart" />
              <ColorSwatch category="interaction" />
            </div>
          </Tabs.Panel>
          <Tabs.Panel value="patterns" className="focus-visible:outline-none">
            <ComponentPatternsSpecimen />
          </Tabs.Panel>
          <Tabs.Panel value="polish" className="focus-visible:outline-none">
            <VisualPolishSpecimen />
          </Tabs.Panel>
        </Tabs.Root>
      </div>
    </div>
  );
}
