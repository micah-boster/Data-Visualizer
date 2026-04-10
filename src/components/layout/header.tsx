'use client';

import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { ThemeToggle } from '@/components/theme-toggle';

export function Header() {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border/50 bg-background/80 backdrop-blur-sm px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 !h-4" />
      <div className="flex flex-1 items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold tracking-tight">
            Bounce Data Visualizer
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {/* Data freshness placeholder -- will be wired in Plan 02 */}
          <span className="text-xs text-muted-foreground hidden sm:inline">
          </span>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
