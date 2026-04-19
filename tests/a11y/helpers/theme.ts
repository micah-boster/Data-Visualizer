import type { Page } from '@playwright/test';

/**
 * Seeds next-themes before the first document navigation so the initial
 * server render already resolves to the requested theme class on <html>.
 *
 * next-themes persists the selected theme under the `theme` key in
 * localStorage. addInitScript runs before any page script, which beats the
 * next-themes hydration race that would otherwise flash light → dark mid-load.
 */
export async function setTheme(page: Page, theme: 'light' | 'dark'): Promise<void> {
  await page.addInitScript((t) => {
    window.localStorage.setItem('theme', t);
  }, theme);
}
