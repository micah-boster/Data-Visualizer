import type { Metadata } from 'next';
import { TokenBrowser } from '@/components/tokens/token-browser';

/**
 * Unlisted token reference page.
 *
 * - `robots.index = false` keeps the route out of crawler indexes on production Vercel
 *   deploys. There is no nav link from the sidebar/header either — direct URL only.
 * - The page itself is dogfood for the Phase 26 token system: every style on the
 *   page is driven by tokens (no hardcoded padding/colors/shadows).
 */
export const metadata: Metadata = {
  title: 'Tokens — Bounce Data Visualizer',
  description: 'Design token reference. Unlisted.',
  robots: { index: false, follow: false },
};

export default function TokensPage() {
  return <TokenBrowser />;
}
