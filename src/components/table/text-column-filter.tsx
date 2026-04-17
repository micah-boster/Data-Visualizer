'use client';

import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import type { Column } from '@tanstack/react-table';

interface TextColumnFilterProps {
  column: Column<Record<string, unknown>>;
  currentValue: string[] | undefined;
  onApply: (value: string[] | null) => void;
}

const MAX_DISPLAY_VALUES = 100;

export function TextColumnFilter({
  column,
  currentValue,
  onApply,
}: TextColumnFilterProps) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(
    new Set(currentValue ?? []),
  );

  // Get unique values from the column's faceted values
  const allValues = useMemo(() => {
    const faceted = column.getFacetedUniqueValues();
    const entries: { value: string; count: number }[] = [];
    faceted.forEach((count, value) => {
      if (value != null) {
        entries.push({ value: String(value), count });
      }
    });
    entries.sort((a, b) => a.value.localeCompare(b.value));
    return entries;
  }, [column]);

  // Filter by search term
  const filteredValues = useMemo(() => {
    if (!search) return allValues;
    const lower = search.toLowerCase();
    return allValues.filter((e) => e.value.toLowerCase().includes(lower));
  }, [allValues, search]);

  const displayedValues = filteredValues.slice(0, MAX_DISPLAY_VALUES);
  const truncated = filteredValues.length > MAX_DISPLAY_VALUES;

  const toggleValue = (value: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(value)) {
        next.delete(value);
      } else {
        next.add(value);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelected(new Set(filteredValues.map((e) => e.value)));
  };

  const clearSelection = () => {
    setSelected(new Set());
  };

  const handleApply = () => {
    if (selected.size === 0) {
      onApply(null);
    } else {
      onApply(Array.from(selected));
    }
  };

  return (
    <div className="flex flex-col gap-2 w-[240px]">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Search values..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-7 h-8 text-body"
        />
      </div>

      {/* Select All / Clear */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={selectAll}
          className="h-6 text-caption px-2"
        >
          Select All
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearSelection}
          className="h-6 text-caption px-2"
        >
          Clear
        </Button>
      </div>

      {/* Value checklist */}
      <ScrollArea className="max-h-[200px]">
        <div className="flex flex-col">
          {displayedValues.map((entry) => (
            <label
              key={entry.value}
              className="flex items-center gap-2 px-1 py-0.5 text-body cursor-pointer hover:bg-muted/30 rounded"
            >
              <Checkbox
                checked={selected.has(entry.value)}
                onCheckedChange={() => toggleValue(entry.value)}
                className="h-3.5 w-3.5"
              />
              <span className="truncate flex-1">{entry.value}</span>
              <span className="text-muted-foreground shrink-0">
                ({entry.count})
              </span>
            </label>
          ))}
        </div>
        {truncated && (
          <p className="text-caption text-muted-foreground px-1 pt-1">
            Showing {MAX_DISPLAY_VALUES} of {filteredValues.length}
          </p>
        )}
      </ScrollArea>

      {/* Apply */}
      <Button size="sm" onClick={handleApply} className="h-7 text-caption">
        Apply
      </Button>
    </div>
  );
}
