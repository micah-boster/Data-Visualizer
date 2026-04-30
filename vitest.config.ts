/**
 * Vitest config — minimal v4.5 seed.
 *
 * Pulled forward from v5.5 DEBT-09 to host the DCR-07 young-batch
 * synthetic test. v5.5 DEBT-09 will:
 *   - Port the 7+ existing *.smoke.ts scripts under src/lib/ to Vitest
 *   - Move tests under tests/
 *   - Add coverage reporting (>=95% on src/lib/computation/**)
 *   - Add property-based tests via fast-check
 *
 * For now the config covers JUST the .test.ts files in src/lib/, and
 * the existing *.smoke.ts scripts continue to run via node --experimental-strip-types
 * per the package.json "smoke:*" entries.
 */
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/.next/**'],
    environment: 'node', // pure-compute tests; no DOM needed
    globals: false, // explicit imports — no global describe/it
  },
});
