'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { Column } from '@tanstack/react-table';

interface NumericColumnFilterProps {
  column: Column<Record<string, unknown>>;
  currentValue: { min?: number; max?: number } | undefined;
  onApply: (value: { min?: number; max?: number } | null) => void;
}

export function NumericColumnFilter({
  column,
  currentValue,
  onApply,
}: NumericColumnFilterProps) {
  const [min, setMin] = useState(
    currentValue?.min != null ? String(currentValue.min) : '',
  );
  const [max, setMax] = useState(
    currentValue?.max != null ? String(currentValue.max) : '',
  );

  // Get actual data range from faceted values
  const minMax = column.getFacetedMinMaxValues();
  const dataMin = minMax?.[0] != null ? Number(minMax[0]) : undefined;
  const dataMax = minMax?.[1] != null ? Number(minMax[1]) : undefined;

  const handleApply = () => {
    const parsedMin = min !== '' ? Number(min) : undefined;
    const parsedMax = max !== '' ? Number(max) : undefined;

    if (parsedMin == null && parsedMax == null) {
      onApply(null);
    } else {
      onApply({ min: parsedMin, max: parsedMax });
    }
  };

  const handleClear = () => {
    setMin('');
    setMax('');
    onApply(null);
  };

  return (
    <div className="flex flex-col gap-3 w-[200px]">
      <div className="flex flex-col gap-2">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Min</label>
          <Input
            type="number"
            placeholder={dataMin != null ? String(dataMin) : 'Min'}
            value={min}
            onChange={(e) => setMin(e.target.value)}
            className="h-8 text-xs"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Max</label>
          <Input
            type="number"
            placeholder={dataMax != null ? String(dataMax) : 'Max'}
            value={max}
            onChange={(e) => setMax(e.target.value)}
            className="h-8 text-xs"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button size="sm" onClick={handleApply} className="h-7 text-xs flex-1">
          Apply
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClear}
          className="h-7 text-xs"
        >
          Clear
        </Button>
      </div>
    </div>
  );
}
