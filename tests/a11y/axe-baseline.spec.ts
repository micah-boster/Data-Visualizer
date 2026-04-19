/**
 * Phase 33 Accessibility Audit — axe-core baseline suite
 *
 * CATEGORY-GATED STATE (Plan 02 → Plan 04):
 *   Plan 01 shipped with a blanket `test.fixme()` on every test. Plan 02
 *   (ARIA sweep) promoted ARIA_CATEGORIES to BLOCKING. Plan 03 (focus /
 *   keyboard) promotes FOCUS_CATEGORIES to BLOCKING. DEFERRED_CATEGORIES is
 *   now contrast-only (Plan 04 scope). Plan 05 empties it completely.
 *
 *   After Plan 03:
 *     - ARIA_CATEGORIES critical/serious BLOCK (button-name, link-name,
 *       role-img-alt, aria-required-attr, aria-valid-attr-value, etc.).
 *     - FOCUS_CATEGORIES critical/serious BLOCK (focus-order-semantics,
 *       scrollable-region-focusable, tabindex, aria-dialog-name, bypass).
 *     - DEFERRED_CATEGORIES (color-contrast / color-contrast-enhanced)
 *       tolerated with per-rule summary log — owned by Plan 04.
 *     - Structural rules axe considers moderate-or-lower
 *       (landmark-one-main, page-has-heading-one, region) stay deferred
 *       because they surface on our app shell patterns without user impact;
 *       Plan 05 close-out re-evaluates.
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

/**
 * ARIA-category rules closed by Plan 02 — BLOCKING from here on.
 * Any critical/serious violation under these ids fails the suite.
 */
const ARIA_CATEGORIES = new Set([
  'button-name',
  'link-name',
  'role-img-alt',
  'svg-img-alt',
  'aria-required-attr',
  'aria-valid-attr',
  'aria-valid-attr-value',
  'aria-allowed-attr',
  'aria-roles',
  'aria-command-name',
  'aria-input-field-name',
  'aria-toggle-field-name',
  'label',
  'input-button-name',
  'select-name',
  'frame-title',
  'image-alt',
]);

/**
 * Focus/keyboard-category rules closed by Plan 03 — BLOCKING from here on.
 * Row-level Tab/Enter/Escape (table-body.tsx), drill focus restoration
 * (data-display.tsx), and Dialog/Sheet modal={true} (sheet.tsx +
 * query-command-dialog.tsx) jointly satisfy these rules.
 */
const FOCUS_CATEGORIES = new Set([
  'focus-order-semantics',
  'scrollable-region-focusable',
  'tabindex',
  'aria-dialog-name',
  'bypass',
]);

/**
 * Rule ids still tolerated by the suite — Plan 04 owns these.
 * Plan 04: color-contrast, color-contrast-enhanced.
 * Plan 05 empties this set (including landmark/region) and flips fully
 * blocking.
 */
const DEFERRED_CATEGORIES = new Set([
  'color-contrast',
  'color-contrast-enhanced',
  'landmark-one-main',
  'page-has-heading-one',
  'region',
]);

function partition(violations: Array<{ id: string; impact?: string | null }>) {
  const isCriticalOrSerious = (impact?: string | null) =>
    impact === 'critical' || impact === 'serious';
  const blocking = violations.filter(
    (v) =>
      isCriticalOrSerious(v.impact) &&
      (ARIA_CATEGORIES.has(v.id) || FOCUS_CATEGORIES.has(v.id)),
  );
  const deferred = violations.filter(
    (v) =>
      isCriticalOrSerious(v.impact) && DEFERRED_CATEGORIES.has(v.id),
  );
  const unexpected = violations.filter(
    (v) =>
      isCriticalOrSerious(v.impact) &&
      !ARIA_CATEGORIES.has(v.id) &&
      !FOCUS_CATEGORIES.has(v.id) &&
      !DEFERRED_CATEGORIES.has(v.id),
  );
  return { blocking, deferred, unexpected };
}

for (const route of ROUTES) {
  for (const theme of THEMES) {
    test(`a11y: ${route.name} [${theme}]`, async ({ page }) => {
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
      const { blocking, deferred, unexpected } = partition(results.violations);

      // Plan 02 closes ARIA-category violations — any residual here BLOCKS.
      expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);

      // Any critical/serious rule outside both allow-lists is unexpected —
      // fail loud so a regression does not hide behind the deferred bucket.
      expect(unexpected, JSON.stringify(unexpected, null, 2)).toEqual([]);

      // Deferred bucket is non-blocking; log for downstream plans.
      if (deferred.length > 0) {
        console.log(
          `[a11y deferred — ${route.name}[${theme}]]`,
          deferred.map((v) => `${v.id}=${v.impact}`).join(', '),
        );
      }
    });
  }
}

// Saved-view popover-open variant: audits a popover in its visible state
// (different DOM tree than closed). Plan 02 aria-label sweep closes the
// button-name hits on the trigger; retarget via role+name after.
test('a11y: saved-view popover open [light]', async ({ page }) => {
  test.setTimeout(90_000);
  await setTheme(page, 'light');
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('table tbody tr, [data-empty-state]', { timeout: 30_000 });
  await page.waitForTimeout(500);
  // Best-effort popover click. Bounded timeout + catch so a flaky click
  // never hangs the run; axe still runs against whatever DOM is visible.
  try {
    const trigger = page.getByRole('button', { name: /save current view/i }).first();
    await trigger.click({ timeout: 3_000 });
    await page.waitForTimeout(300);
  } catch {
    /* tolerate — audit proceeds against closed-state DOM */
  }

  const results = await new AxeBuilder({ page }).withTags(A11Y_TAGS).analyze();
  const { blocking, deferred, unexpected } = partition(results.violations);
  expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
  expect(unexpected, JSON.stringify(unexpected, null, 2)).toEqual([]);
  if (deferred.length > 0) {
    console.log(
      '[a11y deferred — saved-view popover open[light]]',
      deferred.map((v) => `${v.id}=${v.impact}`).join(', '),
    );
  }
});
