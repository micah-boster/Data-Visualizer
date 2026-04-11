'use client';

import { Combobox } from '@base-ui/react/combobox';
import { ChevronDown } from 'lucide-react';

interface FilterComboboxProps {
  label: string;
  placeholder: string;
  options: string[];
  value: string | null;
  onValueChange: (value: string | null) => void;
}

/**
 * Reusable searchable combobox for filter dimensions.
 * Uses Base UI Combobox with built-in type-to-filter search.
 * Single-select, controlled via value/onValueChange.
 */
export function FilterCombobox({
  label,
  placeholder,
  options,
  value,
  onValueChange,
}: FilterComboboxProps) {
  return (
    <Combobox.Root<string>
      value={value}
      onValueChange={(val) => {
        onValueChange(val);
      }}
    >
      <label className="sr-only">{label}</label>
      <Combobox.InputGroup className="relative flex items-center">
        <Combobox.Input
          placeholder={placeholder}
          className="h-9 w-44 rounded-md border border-input bg-background px-3 pr-8 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
        />
        <Combobox.Trigger className="absolute right-2 flex items-center text-muted-foreground">
          <ChevronDown className="h-4 w-4" />
        </Combobox.Trigger>
      </Combobox.InputGroup>
      <Combobox.Portal>
        <Combobox.Positioner className="z-50">
          <Combobox.Popup className="max-h-60 overflow-auto rounded-md border bg-popover shadow-md">
            <Combobox.List>
              <Combobox.Empty className="px-3 py-2 text-sm text-muted-foreground">
                No matches
              </Combobox.Empty>
              {options.map((option) => (
                <Combobox.Item
                  key={option}
                  value={option}
                  className="cursor-pointer px-3 py-1.5 text-sm data-[highlighted]:bg-accent data-[selected]:font-medium"
                >
                  {option}
                </Combobox.Item>
              ))}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}
