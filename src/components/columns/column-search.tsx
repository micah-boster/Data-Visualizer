'use client';

import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface ColumnSearchProps {
  value: string;
  onChange: (value: string) => void;
}

export function ColumnSearch({ value, onChange }: ColumnSearchProps) {
  return (
    <div className="relative">
      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder="Search columns..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-8 pr-8 h-9 text-sm"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
