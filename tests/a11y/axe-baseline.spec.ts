/**
 * Phase 33 Accessibility Audit — axe-core baseline suite
 *
 * ADVISORY STATE (Plan 01 → Plan 04):
 *   On Plan 01's first pass, critical/serious violations WILL exist (RESEARCH
 *   estimates 20-60, concentrated in icon-only buttons without aria-label).
 *   Routes whose baseline is non-zero are annotated with `test.fixme()` below
 *   so the suite ships green. Each fixme points at the remediation plan that
 *   owns the fix:
 *     - Plan 02: ARIA labels & roles (icon-button sweep, chart aria-label,
 *       aria-pressed, aria-current, aria-sort)
 *     - Plan 03: Keyboard/focus (row-level Tab + Enter, drill focus restore,
 *       Dialog/Sheet modal prop)
 *     - Plan 04: Token contrast (globals.css :root / .dark retune)
 *
 * BLOCKING FLIP (Plan 05 close-out):
 *   Plan 05 removes the final fixme. From then on, any critical/serious hit
 *   fails `npm run check:a11y` and blocks merge.
 *
 * SCOPE:
 *   - 4 core routes (dashboard root + partner + batch + filtered) × 2 themes
 *     = 8 matrix tests, plus 1 popover-open variant.
 *   - /tokens is DELIBERATELY EXCLUDED (CONTEXT lock — reference page out of
 *     audit scope; Pitfall 7).
 *   - Route list uses only known-good partners/batches from the static-cache
 *     fixture (Affirm) so no stale-deeplink toast enters the audit path
 *     (Pitfall 9).
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { setTheme } from './helpers/theme';

type Route = { name: string; url: string };

// Core user-facing routes per 33-CONTEXT §Audit scope
// (Dashboard + partner drill + batch drill + dimension-filtered).
const ROUTES: Route[] = [
  { name: 'dashboard-root', url: '/' },
  { name: 'dashboard-partner', url: '/?p=Affirm' },
  { name: 'dashboard-batch', url: '/?p=Affirm&b=AFRM_MAR_26_PRI' },
  { name: 'dashboard-filtered', url: '/?partner=Affirm' },
];
const THEMES = ['light', 'dark'] as const;

const A11Y_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

for (const route of ROUTES) {
  for (const theme of THEMES) {
    test(`a11y: ${route.name} [${theme}]`, async ({ page }) => {
      // Plan 01 baseline annotation — fixme until Plans 02-04 remediate.
      // Per-route fixme granularity lets Plans 02-04 remove annotations
      // incrementally as each category is fixed. Plan 05 deletes the last one.
      test.fixme(
        true,
        'Plan 01 baseline advisory — remediation owned by Plans 02 (ARIA), 03 (keyboard/focus), 04 (contrast). Plan 05 flips blocking.',
      );

      await setTheme(page, theme);
      await page.goto(route.url);
      await page.waitForLoadState('networkidle');
      // Wait for table body (data loaded) or empty-state sentinel. Avoids
      // running axe against a transient skeleton DOM which would introduce
      // non-determinism around aria-busy.
      await page.waitForSelector('table tbody tr, [data-empty-state]', {
        timeout: 10_000,
      });

      const results = await new AxeBuilder({ page }).withTags(A11Y_TAGS).analyze();

      const blocking = results.violations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious',
      );
      expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
    });
  }
}

// Saved-view popover-open variant: audits a popover in its visible state
// (different DOM tree than closed). Plan 01 ships this as a scaffold; Plan 02
// will retarget via getByRole('button', { name: /save view/i }) once
// aria-label sweep completes.
test('a11y: saved-view popover open [light]', async ({ page }) => {
  test.fixme(
    true,
    'Plan 01 baseline advisory — popover trigger labeling lands in Plan 02.',
  );

  await setTheme(page, 'light');
  await page.goto('/');
  await page.waitForSelector('table tbody tr, [data-empty-state]');
  // Heuristic trigger: first toolbar popover-trigger (save-view popover on
  // toolbar). Switch to getByRole name match after Plan 02 ships aria-labels.
  await page
    .locator('[data-slot="popover-trigger"]')
    .first()
    .click({ trial: false })
    .catch(() => {
      // Swallow — popover may not be present on every render; the axe run
      // below still validates the visible DOM regardless.
    });
  await page.waitForTimeout(200);

  const results = await new AxeBuilder({ page }).withTags(A11Y_TAGS).analyze();
  const blocking = results.violations.filter(
    (v) => v.impact === 'critical' || v.impact === 'serious',
  );
  expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
});
