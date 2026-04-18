'use client';

/**
 * EmptyState — canonical zero-state pattern (DS-22).
 *
 * Variant semantics (classify by TRIGGER CONDITION, not by existing copy):
 *   - 'no-data'     — dataset itself is empty (no batches/rows exist yet).
 *                     Icon: Database. Default CTA: none.
 *   - 'no-results'  — user's filters/query produced zero rows from a non-empty dataset.
 *                     Icon: SearchX. Default CTA: "Clear filters".
 *   - 'error'       — section-scoped fetch failure (Snowflake / cache error).
 *                     Icon: AlertTriangle (accent color). Default CTA: "Retry".
 *   - 'permissions' — viewer lacks access. Icon: Lock. Default CTA: none.
 *
 * Layout: self-centered with min-h-[40vh]; caller just drops it in.
 *
 * Action prop behavior:
 *   - undefined → render the variant's default CTA if defaultCtaLabel && onAction are present.
 *   - null      → suppress the CTA entirely.
 *   - ReactNode → render the provided node as the action slot (full override).
 *
 * onAction is the click handler for the DEFAULT CTA only. When `action` is a
 * ReactNode, onAction is ignored — the caller owns its own button/link wiring.
 */

import type { ReactNode } from 'react';
import {
  AlertTriangle,
  Database,
  Lock,
  SearchX,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type EmptyStateVariant = 'no-data' | 'no-results' | 'error' | 'permissions';

export interface EmptyStateProps {
  variant: EmptyStateVariant;
  /** Override the variant's default title. */
  title?: string;
  /** Override the variant's default description. */
  description?: string;
  /**
   * Action slot override:
   *   - undefined → render default CTA (if variant has one AND onAction is provided)
   *   - null      → suppress the CTA entirely
   *   - ReactNode → render the provided node as the action
   */
  action?: ReactNode | null;
  /** Handler for the DEFAULT CTA only. Ignored when `action` is a ReactNode. */
  onAction?: () => void;
  className?: string;
}

interface VariantConfig {
  Icon: LucideIcon;
  iconClass: string;
  defaultTitle: string;
  defaultDescription: string;
  defaultCtaLabel: string | null;
}

const VARIANT_CONFIG: Record<EmptyStateVariant, VariantConfig> = {
  'no-data': {
    Icon: Database,
    iconClass: 'text-muted-foreground/40',
    defaultTitle: 'No data yet',
    defaultDescription: 'Data will appear here once batches load.',
    defaultCtaLabel: null,
  },
  'no-results': {
    Icon: SearchX,
    iconClass: 'text-muted-foreground/40',
    defaultTitle: 'No data matches your filters',
    defaultDescription: 'Try adjusting your filters or refreshing the data.',
    defaultCtaLabel: 'Clear filters',
  },
  error: {
    Icon: AlertTriangle,
    iconClass: 'text-error-fg/70',
    defaultTitle: 'Something went wrong',
    defaultDescription: "We couldn't load this section. Please try again.",
    defaultCtaLabel: 'Retry',
  },
  permissions: {
    Icon: Lock,
    iconClass: 'text-muted-foreground/40',
    defaultTitle: 'No access',
    defaultDescription: "You don't have permission to view this section.",
    defaultCtaLabel: null,
  },
};

export function EmptyState({
  variant,
  title,
  description,
  action,
  onAction,
  className,
}: EmptyStateProps) {
  const config = VARIANT_CONFIG[variant];
  const { Icon, iconClass, defaultTitle, defaultDescription, defaultCtaLabel } = config;

  // Resolve action slot:
  //   action === null         → suppress
  //   action is ReactNode     → override
  //   action === undefined    → default CTA if label + handler present
  let actionNode: ReactNode = null;
  if (action === null) {
    actionNode = null;
  } else if (action !== undefined) {
    actionNode = action;
  } else if (defaultCtaLabel && onAction) {
    actionNode = (
      <Button variant="outline" onClick={onAction}>
        {defaultCtaLabel}
      </Button>
    );
  }

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center min-h-[40vh] gap-3 text-center',
        className,
      )}
    >
      <Icon className={cn('h-10 w-10', iconClass)} aria-hidden />
      <div className="flex flex-col gap-1">
        <p className="text-heading text-foreground">{title ?? defaultTitle}</p>
        <p className="text-body text-muted-foreground">
          {description ?? defaultDescription}
        </p>
      </div>
      {actionNode}
    </div>
  );
}
