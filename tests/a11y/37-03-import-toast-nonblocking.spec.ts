import { test, expect, type Page } from '@playwright/test';

// 37-03 regression smoke — "can't get the filter off" defect (2026-04-19).
//
// Root cause: the global Sonner <Toaster position="bottom-right"> overlapped
// the FilterPopover's bottom region during the 8-second import-toast window.
// With the toast's pointer-events intercepting the chip-X and the combobox
// dropdowns, users couldn't clear the just-imported ACCOUNT_TYPE filter
// through any normal UI path.
//
// Fix (src/components/data-display.tsx): the import toast now renders at
// `bottom-left` via per-toast `position`; save/delete/update toasts keep
// the bottom-right default since they fire AFTER the user is done with
// filters.
//
// This smoke verifies:
//   1. Apply lands `?type=THIRD_PARTY` in the URL.
//   2. Opening the filter popover and clicking the chip-X clears the URL
//      param WHILE the import toast is still visible (i.e. within the 8s
//      Undo window).
//   3. The Undo button inside the toast restores the pre-import URL state.

const IMPORT_SQL = `SELECT partner_name, batch, total_accounts, batch_age_in_months
FROM agg_batch_performance_summary
WHERE account_type = 'THIRD_PARTY'
ORDER BY batch_age_in_months DESC`;

async function gotoReady(page: Page) {
  await page.goto('http://localhost:3000/');
  await page.waitForFunction(
    () => !document.body.textContent?.includes('Loading data from Snowflake'),
    { timeout: 60_000 },
  );
  await page.waitForTimeout(1000);
}

async function runImport(page: Page) {
  await page.getByRole('button', { name: /Import from Metabase/i }).click();
  await page.getByRole('textbox').first().fill(IMPORT_SQL);
  await page.getByRole('button', { name: 'Parse' }).click();
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: 'Apply' }).click();
  await page.waitForTimeout(500);
}

test.describe('37-03 sticky filter defect', () => {
  test.setTimeout(90_000);

  test('A: chip-X inside FilterPopover clears ?type= during import toast window', async ({ page }) => {
    await gotoReady(page);
    await runImport(page);

    // Apply should land ?type=THIRD_PARTY
    expect(page.url()).toContain('type=THIRD_PARTY');

    // Open filter popover (while the 8s import toast is still up)
    await page.getByRole('button', { name: /Manage filters/ }).click();
    await page.mouse.move(0, 0); // release tooltip hover so Playwright can click

    const removeBtn = page.getByRole('button', { name: 'Remove Account Type filter' });
    await expect(removeBtn).toBeVisible();
    // The real assertion — this click was blocked by the Sonner toast before the fix.
    await removeBtn.click({ timeout: 5_000 });

    // URL param must drop.
    await expect.poll(() => page.url(), { timeout: 3_000 }).not.toContain('type=THIRD_PARTY');
  });

  test('B: Undo button in import toast restores pre-import URL', async ({ page }) => {
    await gotoReady(page);
    await runImport(page);

    expect(page.url()).toContain('type=THIRD_PARTY');

    // Click the Undo action inside the toast (bottom-left after fix).
    await page.mouse.move(0, 0);
    await page.getByRole('button', { name: /^Undo$/ }).click();

    await expect.poll(() => page.url(), { timeout: 3_000 }).not.toContain('type=THIRD_PARTY');
  });
});
