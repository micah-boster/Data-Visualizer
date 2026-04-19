import { defineConfig } from '@playwright/test';

// Phase 33 Accessibility Audit — baseline config.
// Mirrors the 5-guard parity pattern (tokens/surfaces/components/motion/polish);
// `npm run check:a11y` becomes the sixth guard.
//
// webServer boots `next dev`. With no SNOWFLAKE_ACCOUNT set, isStaticMode()
// in src/lib/static-cache/fallback.ts returns true and a deterministic
// 5-batch × 2-partner fixture (Affirm, American First Finance) is served —
// axe runs get predictable DOM without any Snowflake plumbing.
export default defineConfig({
  testDir: './tests/a11y',
  timeout: 30_000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    // Force static-cache mode by unsetting the two vars isStaticMode() checks
    // (src/lib/static-cache/fallback.ts). Even if the developer has creds in
    // .env.local, Playwright's webServer.env overrides give us a deterministic
    // 5-batch × 2-partner fixture (Affirm, American First Finance) with zero
    // Snowflake plumbing. axe runs consistently across machines.
    env: {
      SNOWFLAKE_ACCOUNT: '',
      SNOWFLAKE_USERNAME: '',
    },
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
