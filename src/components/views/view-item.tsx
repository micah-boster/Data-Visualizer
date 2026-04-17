'use client';

import { Trash2, Star } from 'lucide-react';
import type { SavedView } from '@/lib/views/types';
import { Button } from '@/components/ui/button';

interface ViewItemProps {
  view: SavedView;
  onLoad: (view: SavedView) => void;
  onDelete: (id: string) => void;
}

export function ViewItem({ view, onLoad, onDelete }: ViewItemProps) {
  return (
    <div className="group flex items-center gap-1 rounded-md px-2 hover:bg-accent/50 transition-colors">
      <button
        type="button"
        className="flex-1 text-left text-body py-2 truncate cursor-pointer"
        onClick={() => onLoad(view)}
      >
        <span className="flex items-center gap-1.5">
          {view.isDefault && (
            <Star className="h-3 w-3 text-amber-500 fill-amber-500 shrink-0" />
          )}
          <span className="truncate">{view.name}</span>
        </span>
      </button>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(view.id);
        }}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
