/**
 * Phase 33 Plan 03 — Keyboard-interaction runtime assertions.
 *
 * Complements the static axe-baseline spec with behavior axe-core can't
 * observe from a DOM snapshot:
 *   - Pressing Enter on a focused drill-capable <tr> must advance the URL.
 *   - Pressing Escape must pop the drill one level (direction-agnostic).
 *   - After drill re-key remount, focus must land on the breadcrumb's
 *     current segment (data-breadcrumb-current, added by Plan 02 Task 2).
 *   - Cmd+K opens the query dialog; Escape closes; focus returns to the
 *     invoking trigger (Base UI Dialog modal={true} contract).
 *
 * These assertions are the runtime proof that Plan 03's keyboard contract
 * (A11Y-03) is actually wired end-to-end, not just that the markup passes
 * axe-core's focus-order-semantics / tabindex rules.
 *
 * Notes:
 *   - Tests use deterministic helpers (locator.focus, URL regex) rather than
 *     "press Tab N times" — the toolbar/sidebar/table-header absorb an
 *     unpredictable number of tab stops that would make the test flaky.
 *   - Theme-agnostic: the keyboard contract behaves identically in light and
 *     dark (contrast rules are Plan 04 scope).
 */
import { test, expect } from '@playwright/test';
import { setTheme } from './helpers/theme';

test('keyboard flow: root → partner drill → escape back to root', async ({
  page,
}) => {
  test.setTimeout(60_000);
  await setTheme(page, 'light');
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('table tbody tr', { timeout: 30_000 });
  await page.waitForTimeout(500); // post-hydration settle (matches axe-baseline recipe)

  // Focus the first keyboard-navigable row directly. Counting Tab keystrokes
  // would depend on toolbar/sidebar tab-stop count, which drifts as chrome
  // evolves. locator.focus() is deterministic and still exercises the same
  // onKeyDown handler the user would hit.
  const firstDrillableRow = page.locator('table tbody tr[tabindex="0"]').first();
  await expect(firstDrillableRow).toBeVisible();
  await firstDrillableRow.focus();

  // Press Enter → drill handler runs → URL should acquire ?p=.
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\?p=/, { timeout: 3_000 });

  // After the drill cross-fade remount, Plan 03's focus-restoration useEffect
  // lands focus on the breadcrumb's current segment.
  await expect(
    page.locator('[data-breadcrumb-current]'),
  ).toBeFocused({ timeout: 3_000 });

  // Press Escape from the focused breadcrumb — the <tr> keyboard handler
  // lives on the table rows, not the breadcrumb, so Escape here is a no-op
  // at the row layer. Tab back to the table to exercise Escape → pop one
  // level. Deterministic: focus a drillable row first, then Escape.
  const rowAfterDrill = page.locator('table tbody tr[tabindex="0"]').first();
  await rowAfterDrill.focus();
  await page.keyboard.press('Escape');
  await expect(page).toHaveURL(/^http:\/\/localhost:3000\/?$/, { timeout: 3_000 });
});

test('keyboard flow: Cmd+K opens query dialog, Escape closes and restores trigger focus', async ({
  page,
}) => {
  test.setTimeout(60_000);
  await setTheme(page, 'light');
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('table tbody tr', { timeout: 30_000 });
  await page.waitForTimeout(500);

  // Global Cmd+K binding (query-command-dialog.tsx:31).
  await page.keyboard.press('Meta+K');
  const dialog = page.locator('[role="dialog"]').first();
  await expect(dialog).toBeVisible({ timeout: 2_000 });

  // Close with Escape — Base UI Dialog modal={true} contract owns this.
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden({ timeout: 2_000 });

  // After close, focus returns to the invoking trigger. Plan 02 landed
  // aria-label="Ask a question about your data" on the toolbar Sparkles
  // button (unified-toolbar.tsx).
  await expect(
    page.getByRole('button', { name: /ask a question/i }),
  ).toBeFocused({ timeout: 2_000 });
});
