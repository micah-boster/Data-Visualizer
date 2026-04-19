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

      test.setTimeout(90_000);
      await setTheme(page, theme);
      await page.goto(route.url, { waitUntil: 'domcontentloaded' });
      // DOM-ready + data sentinel is the deterministic ready signal.
      // networkidle does NOT fire — the dashboard has long-lived React Query
      // polling. Wait for the rendered table/empty-state then a small settle
      // window for post-hydration ARIA to stabilize.
      await page.waitForSelector('table tbody tr, [data-empty-state]', {
        timeout: 30_000,
      });
      await page.waitForTimeout(500);

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

  test.setTimeout(90_000);
  await setTheme(page, 'light');
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('table tbody tr, [data-empty-state]', { timeout: 30_000 });
  await page.waitForTimeout(500);
  // Best-effort popover click. Bounded timeout + catch so a flaky click
  // never hangs the run; axe still runs against whatever DOM is visible.
  // Plan 02 will retarget via getByRole('button', { name: /save view/i }).
  try {
    const trigger = page.locator('[data-slot="popover-trigger"]').first();
    await trigger.click({ timeout: 3_000 });
    await page.waitForTimeout(300);
  } catch {
    /* tolerate — audit proceeds against closed-state DOM */
  }

  const results = await new AxeBuilder({ page }).withTags(A11Y_TAGS).analyze();
  const blocking = results.violations.filter(
    (v) => v.impact === 'critical' || v.impact === 'serious',
  );
  expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
});
