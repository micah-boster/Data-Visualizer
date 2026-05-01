'use client';

import { useMemo, type ReactNode } from 'react';
import { Check, ChevronDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Term } from '@/components/ui/term';
import type {
  AttributeKey,
  PartnerListFilters,
} from '@/lib/partner-lists/types';

/**
 * AttributeFilterBar — additive row of attribute multi-selects.
 *
 * Renders one combobox per entry in `ATTRIBUTES`, hidden if the parent's
 * `availableValues` provides no options for that key. Structure is data-
 * driven so adding a future attribute is a one-line config change plus
 * backing data; no component signature change is needed.
 *
 * Phase 39 (PCFG-06) attribute scope:
 *   - ACCOUNT_TYPE — raw partner classification (legacy).
 *   - PRODUCT_TYPE — display alias of ACCOUNT_TYPE; identical underlying
 *     values, different label. Selecting PRODUCT_TYPE is functionally
 *     equivalent to selecting ACCOUNT_TYPE; if the user picks BOTH
 *     simultaneously, the evaluator AND's them (cross-attribute AND
 *     semantics — a row must satisfy both filter sets).
 *   - SEGMENT — references SegmentRule.name values configured per pair
 *     in usePartnerConfig. Hidden when no segments exist (parent supplies
 *     empty array). Requires a segment resolver in evaluateFilters
 *     (wired by the create-list dialog from usePartnerConfigContext).
 *
 * Phase 44 VOC-07 attribute scope:
 *   - REVENUE_MODEL — third unit-of-analysis dimension (CONTINGENCY /
 *     DEBT_SALE). Hidden when no values exist in the dataset (parent
 *     supplies empty array — same hide-on-empty pattern as the other
 *     attributes). The control's label is wrapped in `<Term name="revenueModel">`
 *     as the first-instance-per-surface wrap on the Partner Lists / Create
 *     List dialog surface (per Plan 44-01 first-instance rule); subsequent
 *     occurrences of "Revenue Model" stay plain.
 *
 * Adaptation note: the existing `@/components/filters/filter-combobox`
 * primitive is SINGLE-select. This feature requires MULTI-select per
 * attribute, so we compose a small local multi-select combobox using the
 * Popover + Checkbox primitives already in the codebase.
 */
export interface AttributeFilterBarProps {
  /**
   * Available values per attribute — derived from the dataset (and config)
   * by the parent. Phase 39 supplies ACCOUNT_TYPE + PRODUCT_TYPE (same
   * values, different label) and SEGMENT (rule names from partner-config).
   * Phase 44 VOC-07 adds REVENUE_MODEL. Future attributes land here without
   * any component signature change.
   */
  availableValues: Partial<Record<AttributeKey, string[]>>;
  value: PartnerListFilters;
  onChange: (next: PartnerListFilters) => void;
}

/**
 * Phase 44 VOC-07 — `label` widened from `string` to `ReactNode` so the
 * REVENUE_MODEL entry can carry a `<Term>` wrap on its first-instance label.
 * The other entries still pass plain strings — no change in their visual
 * treatment.
 */
const ATTRIBUTES = [
  { key: 'ACCOUNT_TYPE', label: 'Account Type' as ReactNode },
  { key: 'PRODUCT_TYPE', label: 'Product Type' as ReactNode },
  { key: 'SEGMENT', label: 'Segment' as ReactNode },
  {
    key: 'REVENUE_MODEL',
    label: <Term name="revenueModel">Revenue Model</Term> as ReactNode,
  },
] as const satisfies ReadonlyArray<{
  key: AttributeKey;
  label: ReactNode;
}>;

/**
 * Phase 44 VOC-07 — plain-string fallback for the trigger / popover header
 * text content. The visible chip text uses this string (e.g. "Filter by
 * Revenue Model"); the in-popover header reuses the JSX label for the
 * `<Term>` wrap. Keeps the trigger string accessible to screen readers
 * without requiring them to traverse the popover trigger element.
 */
const ATTRIBUTE_TEXT_LABELS: Record<AttributeKey, string> = {
  ACCOUNT_TYPE: 'Account Type',
  PRODUCT_TYPE: 'Product Type',
  SEGMENT: 'Segment',
  REVENUE_MODEL: 'Revenue Model',
};

export function AttributeFilterBar({
  availableValues,
  value,
  onChange,
}: AttributeFilterBarProps) {
  return (
    <div className="flex flex-wrap gap-inline">
      {ATTRIBUTES.map((attr) => {
        const options = availableValues[attr.key] ?? [];
        // Hide the control entirely when no values exist for this attribute
        // (e.g. column missing from the current dataset). Phase 44 VOC-07:
        // the REVENUE_MODEL entry inherits this auto-hide — when the parent
        // supplies an empty array (no REVENUE_MODEL values in current
        // dataset), the chip never renders.
        if (options.length === 0) return null;

        const selected = value[attr.key] ?? [];
        return (
          <AttributeMultiSelect
            key={attr.key}
            label={attr.label}
            labelText={ATTRIBUTE_TEXT_LABELS[attr.key]}
            options={options}
            selected={selected}
            onChange={(next) => onChange({ ...value, [attr.key]: next })}
          />
        );
      })}
    </div>
  );
}

interface AttributeMultiSelectProps {
  /** Visual label — JSX so the REVENUE_MODEL entry can wrap in `<Term>`. */
  label: ReactNode;
  /** Plain-string variant for the chip text + tooltip / aria contexts. */
  labelText: string;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
}

function AttributeMultiSelect({
  label,
  labelText,
  options,
  selected,
  onChange,
}: AttributeMultiSelectProps) {
  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const toggle = (option: string) => {
    if (selectedSet.has(option)) {
      onChange(selected.filter((v) => v !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  const clear = () => onChange([]);

  // Phase 44 VOC-07 — chip text uses plain `labelText` so the trigger
  // remains a clean string-only render. The popover header carries the
  // JSX `label` (which may be a `<Term>` wrap) as the first-instance
  // discoverability surface for the term.
  const triggerText =
    selected.length === 0
      ? `Filter by ${labelText}`
      : selected.length === 1
        ? `${labelText}: ${selected[0]}`
        : `${labelText}: ${selected.length} selected`;

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant="outline" size="sm">
            <span className="text-body">{triggerText}</span>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </Button>
        }
      />
      <PopoverContent align="start" className="w-64 p-0">
        <div className="flex items-center justify-between px-card-padding py-stack border-b">
          <span className="text-label text-muted-foreground">{label}</span>
          {selected.length > 0 && (
            <Button variant="ghost" size="xs" onClick={clear}>
              <span className="text-caption">Clear</span>
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-64">
          <div className="py-1">
            {options.map((option) => {
              const isChecked = selectedSet.has(option);
              // Phase 44 VOC-07: use labelText (plain string), not label
              // (now ReactNode), to interpolate a stable id.
              const rowId = `attr-${labelText}-${option}`;
              return (
                <div
                  key={option}
                  className="flex items-center gap-inline py-1 px-card-padding hover:bg-hover-bg"
                >
                  <Checkbox
                    id={rowId}
                    checked={isChecked}
                    onCheckedChange={() => toggle(option)}
                  />
                  <Label
                    htmlFor={rowId}
                    className="text-body cursor-pointer flex-1 truncate"
                  >
                    {option}
                  </Label>
                  {isChecked && (
                    <Check className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
