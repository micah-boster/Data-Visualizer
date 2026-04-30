'use client';

/**
 * <Term> — in-product domain-vocabulary popover (Phase 44 VOC-03).
 *
 * Wraps any inline text with a registry-sourced definition popover. The
 * registry lives at `src/lib/vocabulary.ts`; this component is the only
 * UI surface that consumes it.
 *
 * Visual contract (locked by Phase 44 CONTEXT.md):
 *   - At rest: NO visual treatment — renders as plain inherited text.
 *   - On hover/focus: subtle dotted underline (`border-b border-dotted`)
 *     and `cursor-help` so the affordance is discoverable without being
 *     noisy. Standard pattern from Notion / Linear.
 *   - Hover after ~400ms: popover surfaces with the term's label as a
 *     title (.text-title), the one-sentence definition as the body
 *     (.text-body), and an optional "See also: ..." footer (.text-caption).
 *   - Click: pins the popover open (toggles between hover-controlled and
 *     pinned). Pinned popover dismisses on Esc or click-outside (Base UI
 *     Popover handles both for us via its built-in dismiss behavior).
 *   - Mobile / touch: tap-to-pin. Base UI Popover's openOnHover does not
 *     fire on touch devices; the click-to-pin path is the same code path
 *     and works identically.
 *   - Keyboard: trigger renders as a `<span role="button" tabIndex={0}>` so
 *     it composes safely inside any text context (breadcrumb buttons, table
 *     header sort buttons, sidebar menu buttons — all of which are themselves
 *     `<button>` elements; HTML disallows nested `<button>`). The popover
 *     primitive is told `nativeButton={false}` so Base UI doesn't insert a
 *     real button; we wire focus/Enter/Space/Esc via the role + tabIndex +
 *     a keydown handler that also clicks for Enter (Space is built in for
 *     elements with role="button").
 *
 * Type tokens (Phase 27): src/components/ui/** is in the Phase 27
 * allowlist, but this component still uses the named tokens (text-title /
 * text-body / text-caption) where typography is anchored. No font-weight
 * pairings — tokens own weight (Phase 27 rule).
 */

import * as React from 'react';
import { Popover as PopoverPrimitive } from '@base-ui/react/popover';

import { cn } from '@/lib/utils';
import { TERMS, type TermName } from '@/lib/vocabulary';

export interface TermProps {
  /** The term key in TERMS registry. Type-safe via TermName. */
  name: TermName;
  /**
   * The rendered text — usually the term itself, but the registry's `label`
   * is also valid. Children let callers control casing/pluralization
   * (e.g. "Batches" but name="batch").
   */
  children: React.ReactNode;
  /** Optional className override (forwarded to the trigger span). */
  className?: string;
}

/**
 * Hover delay (ms) before the popover surfaces. ~400ms balances
 * discoverability with avoiding accidental triggers when the cursor is
 * just passing through. Matches the Notion / Linear convention.
 */
const HOVER_OPEN_DELAY = 400;

/**
 * Trigger styling: NO visual at rest, dotted underline + help cursor on
 * hover/focus. The `border-b border-dotted` recipe inherits color from
 * `border-muted-foreground` (subtle, intentionally). focus-visible (not
 * focus) so mouse clicks don't leave a visible focus ring after release.
 *
 * Renders as a `<span>`, NOT a `<button>` — see component docstring above
 * for why (nested-button HTML invariant).
 */
const TRIGGER_CLASSNAME = cn(
  'inline cursor-help border-b border-dotted border-transparent outline-none',
  'hover:border-muted-foreground',
  'focus-visible:border-muted-foreground',
);

export function Term({ name, children, className }: TermProps): React.JSX.Element {
  const term = TERMS[name];

  return (
    <PopoverPrimitive.Root>
      <PopoverPrimitive.Trigger
        // openOnHover surfaces the popover on pointer-hover (no-op on
        // touch); a click toggles the popover and "pins" it open until
        // outside-press / Esc, which Base UI dismisses for us.
        openOnHover
        delay={HOVER_OPEN_DELAY}
        // Render as a <span>, not the default <button>, so this composes
        // safely inside other interactive ancestors (breadcrumb buttons,
        // sortable table headers, sidebar menu buttons). nativeButton=false
        // tells Base UI not to assume a native button; role + tabIndex give
        // us keyboard activation (Space is built in for role="button").
        nativeButton={false}
        render={
          <span
            role="button"
            tabIndex={0}
            className={cn(TRIGGER_CLASSNAME, className)}
          />
        }
      >
        {children}
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Positioner side="top" sideOffset={6} className="isolate z-50">
          <PopoverPrimitive.Popup
            data-slot="popover-content"
            className={cn(
              'z-50 flex w-72 origin-(--transform-origin) flex-col gap-1.5',
              'rounded-lg bg-surface-overlay p-3 text-popover-foreground',
              'shadow-elevation-overlay outline-hidden',
              'data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2',
              'data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95',
              'data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95',
              'duration-100',
            )}
          >
            <div className="text-title">{term.label}</div>
            <p className="text-body">{term.definition}</p>
            {term.seeAlso.length > 0 && (
              <p className="text-caption text-muted-foreground">
                See also:{' '}
                {term.seeAlso
                  .map((ref) => TERMS[ref as TermName]?.label ?? ref)
                  .join(', ')}
              </p>
            )}
          </PopoverPrimitive.Popup>
        </PopoverPrimitive.Positioner>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
