import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { Providers } from './providers';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { Header } from '@/components/layout/header';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Bounce Data Visualizer',
  description: 'Batch performance analytics for the partnerships team',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        {/*
          Skip-to-content link — keyboard-only affordance to jump past
          sidebar + header chrome straight to the main panel.
          Visible only on focus (sr-only + focus:not-sr-only reveal).
          Honors AGENTS.md type-token rule: text-body is the canonical tier
          for short interactive prose.
        */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus-glow bg-surface-raised px-inline py-inline rounded-md text-body"
        >
          Skip to content
        </a>
        <Providers>
          <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
              <Header />
              <main
                id="main"
                className="flex-1 overflow-x-hidden p-2 md:p-3 bg-surface-raised"
              >
                {children}
              </main>
            </SidebarInset>
          </SidebarProvider>
          <Toaster richColors position="bottom-right" duration={4000} />
        </Providers>
      </body>
    </html>
  );
}
