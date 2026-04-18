'use client';

import { useMemo } from 'react';
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
import type { PartnerListFilters } from '@/lib/partner-lists/types';

/**
 * AttributeFilterBar — additive row of attribute multi-selects.
 *
 * v1 renders ONLY ACCOUNT_TYPE (CONTEXT 2026-04-18 lock — PRODUCT_TYPE and
 * REVENUE_BAND deferred). Structure is data-driven through the ATTRIBUTES
 * constant so adding a future attribute is a one-line config change plus
 * backing data; no component signature change is needed.
 *
 * Adaptation note: the existing `@/components/filters/filter-combobox`
 * primitive is SINGLE-select (`value: string | null` / `onValueChange`). This
 * feature requires MULTI-select per attribute, so we compose a small local
 * multi-select combobox using the Popover + Checkbox primitives already in
 * the codebase. This matches Plan 03's explicit guidance: "If FilterCombobox's
 * API differs materially ... adapt ... Document any adaptation inline."
 */
export interface AttributeFilterBarProps {
  /**
   * Available values per attribute — derived from the dataset by the parent.
   * Keyed by AttributeKey; v1 only supplies ACCOUNT_TYPE. Future attributes
   * land here without any component signature change (additive by design).
   */
  availableValues: Partial<Record<'ACCOUNT_TYPE', string[]>>;
  value: PartnerListFilters;
  onChange: (next: PartnerListFilters) => void;
}

const ATTRIBUTES = [
  { key: 'ACCOUNT_TYPE', label: 'Account Type' },
  // Future: add { key: 'PRODUCT_TYPE', label: 'Product Type' }, etc. Rendering
  // is data-driven; schema.ts would also need the matching `.optional()` field.
] as const satisfies ReadonlyArray<{
  key: keyof PartnerListFilters;
  label: string;
}>;

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
        // (e.g. column missing from the current dataset).
        if (options.length === 0) return null;

        const selected = value[attr.key] ?? [];
        return (
          <AttributeMultiSelect
            key={attr.key}
            label={attr.label}
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
  label: string;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
}

function AttributeMultiSelect({
  label,
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

  const triggerText =
    selected.length === 0
      ? `Filter by ${label}`
      : selected.length === 1
        ? `${label}: ${selected[0]}`
        : `${label}: ${selected.length} selected`;

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
              const rowId = `attr-${label}-${option}`;
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
