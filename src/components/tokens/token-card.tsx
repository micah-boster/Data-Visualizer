'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

/**
 * Atomic display unit for a single design token.
 *
 * Renders a card with three zones:
 *   1. Live example (children) — rendered on a surface-inset square so the demo
 *      element reads against a distinct background.
 *   2. Label (uppercase text-label) + CSS variable row with copy button.
 *   3. Optional Tailwind class row with its own copy button.
 *
 * All of this card's own chrome (padding, radius, shadow, surfaces, type) is
 * driven by Phase 26 tokens — there are no hardcoded p-x, text-x, or shadow-x
 * utilities here. Demo utilities inside `children` are the only exception.
 */
export type TokenCardProps = {
  label: string;
  cssVar: string;
  tailwindClass?: string;
  value?: string;
  children: React.ReactNode;
  exampleClassName?: string;
};

export function TokenCard({
  label,
  cssVar,
  tailwindClass,
  value,
  children,
  exampleClassName,
}: TokenCardProps) {
  const [copied, setCopied] = useState<'var' | 'class' | null>(null);

  async function copy(kind: 'var' | 'class', text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      toast.success('Copied', { description: text });
      setTimeout(() => {
        // Reset only if we're still showing *this* copy-state (avoid stomping a newer copy).
        setCopied((current) => (current === kind ? null : current));
      }, 1500);
    } catch {
      toast.error('Copy failed');
    }
  }

  return (
    <div className="bg-surface-raised rounded-lg p-card-padding shadow-xs flex flex-col gap-stack">
      {/* Live example zone */}
      <div
        className={cn(
          'bg-surface-inset rounded-md flex items-center justify-center p-section min-h-[80px]',
          exampleClassName,
        )}
      >
        {children}
      </div>
      {/* Metadata */}
      <div className="flex flex-col gap-[var(--spacing-1)]">
        <div className="text-label uppercase text-muted-foreground">{label}</div>
        <div className="flex items-center gap-inline">
          <code className="text-body-numeric text-foreground flex-1 min-w-0 truncate">
            {cssVar}
            {value ? ` → ${value}` : ''}
          </code>
          <button
            type="button"
            onClick={() => copy('var', `var(${cssVar})`)}
            aria-label={`Copy ${cssVar} CSS variable`}
            className="focus-visible:ring-2 focus-visible:ring-ring rounded-sm p-[var(--spacing-1)] text-muted-foreground hover:text-foreground transition-colors duration-quick ease-default"
          >
            {copied === 'var' ? (
              <Check className="size-3.5" />
            ) : (
              <Copy className="size-3.5" />
            )}
          </button>
        </div>
        {tailwindClass ? (
          <div className="flex items-center gap-inline">
            <code className="text-caption text-muted-foreground flex-1 min-w-0 truncate">
              {tailwindClass}
            </code>
            <button
              type="button"
              onClick={() => copy('class', tailwindClass)}
              aria-label={`Copy ${tailwindClass} Tailwind class`}
              className="focus-visible:ring-2 focus-visible:ring-ring rounded-sm p-[var(--spacing-1)] text-muted-foreground hover:text-foreground transition-colors duration-quick ease-default"
            >
              {copied === 'class' ? (
                <Check className="size-3.5" />
              ) : (
                <Copy className="size-3.5" />
              )}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
