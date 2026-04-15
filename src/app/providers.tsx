'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { TooltipProvider } from '@/components/ui/tooltip';
import { DataFreshnessProvider } from '@/contexts/data-freshness';
import { SidebarDataProvider } from '@/contexts/sidebar-data';
import { getQueryClient } from '@/lib/query-client';

export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <TooltipProvider>
          <DataFreshnessProvider>
            <SidebarDataProvider>
              {children}
            </SidebarDataProvider>
          </DataFreshnessProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
