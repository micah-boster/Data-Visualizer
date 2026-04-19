/**
 * Phase 33 Accessibility Audit — one-shot baseline capture
 *
 * This spec is intentionally separate from axe-baseline.spec.ts. Its job is
 * to run axe against every matrix cell WITHOUT fixme annotations, dump the
 * full violation set to stdout, and never fail. It exists so the Plan 01
 * baseline sweep can enumerate critical/serious hits for `tests/a11y/baseline.json`.
 *
 * Run via:
 *   CAPTURE_BASELINE=1 npx playwright test tests/a11y/baseline-capture.spec.ts --reporter=list
 *
 * Default-skipped so `npm run check:a11y` does not re-capture on every run.
 * Plans 02-04 re-run it after remediation to refresh baseline.json for
 * progress tracking; Plan 05 deletes this spec when the suite flips blocking.
 */
import { test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import type { Result } from 'axe-core';
import { setTheme } from './helpers/theme';
import * as fs from 'node:fs';
import * as path from 'node:path';

type Route = { name: string; url: string };

const ROUTES: Route[] = [
  { name: 'dashboard-root', url: '/' },
  { name: 'dashboard-partner', url: '/?p=Affirm' },
  { name: 'dashboard-batch', url: '/?p=Affirm&b=AFRM_MAR_26_PRI' },
  { name: 'dashboard-filtered', url: '/?partner=Affirm' },
];
const THEMES = ['light', 'dark'] as const;
const A11Y_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

// Shared in-memory aggregate across all matrix cells in this run.
type RuleAgg = {
  impact: string;
  count: number;
  sample_routes: string[];
};
const aggregate = new Map<string, RuleAgg>();

function addViolation(routeName: string, theme: string, v: Result) {
  const key = v.id;
  const impact = v.impact ?? 'unknown';
  const nodeCount = v.nodes.length;
  const label = `${routeName}[${theme}]`;
  const existing = aggregate.get(key);
  if (existing) {
    existing.count += nodeCount;
    if (!existing.sample_routes.includes(label) && existing.sample_routes.length < 5) {
      existing.sample_routes.push(label);
    }
  } else {
    aggregate.set(key, { impact, count: nodeCount, sample_routes: [label] });
  }
}

test.describe('baseline capture', () => {
  test.skip(
    process.env.CAPTURE_BASELINE !== '1',
    'Set CAPTURE_BASELINE=1 to run the one-shot baseline sweep.',
  );

  for (const route of ROUTES) {
    for (const theme of THEMES) {
      test(`baseline: ${route.name} [${theme}]`, async ({ page }) => {
        test.setTimeout(90_000);
        await setTheme(page, theme);
        await page.goto(route.url, { waitUntil: 'domcontentloaded' });
        // Skip networkidle — the dashboard has long-lived React Query polling
        // that keeps network active. DOM-ready + data-sentinel is the
        // deterministic ready signal.
        await page
          .waitForSelector('table tbody tr, [data-empty-state]', { timeout: 30_000 })
          .catch(() => {
            /* tolerate — still run axe against whatever rendered */
          });
        // Small settle to let post-hydration ARIA attrs (aria-expanded, etc.) stabilize.
        await page.waitForTimeout(500);

        const results = await new AxeBuilder({ page }).withTags(A11Y_TAGS).analyze();
        for (const v of results.violations) addViolation(route.name, theme, v);

        // Log per-cell summary (captured by --reporter=list in stdout).
        const perCellSummary = {
          critical: results.violations.filter((v) => v.impact === 'critical').length,
          serious: results.violations.filter((v) => v.impact === 'serious').length,
          moderate: results.violations.filter((v) => v.impact === 'moderate').length,
          minor: results.violations.filter((v) => v.impact === 'minor').length,
        };
        console.log(
          `[baseline] ${route.name}[${theme}]: ${JSON.stringify(perCellSummary)}`,
        );
      });
    }
  }

  test('baseline: popover-open [light]', async ({ page }) => {
    test.setTimeout(90_000);
    await setTheme(page, 'light');
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page
      .waitForSelector('table tbody tr, [data-empty-state]', { timeout: 30_000 })
      .catch(() => {});
    await page.waitForTimeout(500);
    // Best-effort popover click. Bounded timeout + catch so a flaky click
    // never hangs the run; axe still runs against whatever DOM is visible.
    try {
      const trigger = page.locator('[data-slot="popover-trigger"]').first();
      await trigger.click({ timeout: 3_000 });
      await page.waitForTimeout(300);
    } catch {
      /* tolerate — audit proceeds against closed-state DOM */
    }
    const results = await new AxeBuilder({ page }).withTags(A11Y_TAGS).analyze();
    for (const v of results.violations) addViolation('saved-view-popover-open', 'light', v);
    console.log(
      `[baseline] saved-view-popover-open[light]: ${JSON.stringify({
        critical: results.violations.filter((v) => v.impact === 'critical').length,
        serious: results.violations.filter((v) => v.impact === 'serious').length,
      })}`,
    );
  });

  test.afterAll(async () => {
    // Fold aggregate into baseline.json shape and write to disk.
    if (aggregate.size === 0) return; // nothing collected (e.g., env flag not set and tests skipped)

    const violations_by_rule: Record<string, RuleAgg> = {};
    let critical = 0;
    let serious = 0;
    let moderate = 0;
    let minor = 0;
    for (const [rule, agg] of aggregate.entries()) {
      violations_by_rule[rule] = agg;
      if (agg.impact === 'critical') critical += agg.count;
      else if (agg.impact === 'serious') serious += agg.count;
      else if (agg.impact === 'moderate') moderate += agg.count;
      else if (agg.impact === 'minor') minor += agg.count;
    }

    const baseline = {
      captured: new Date().toISOString().slice(0, 10),
      captured_by: 'Phase 33-01 baseline sweep',
      playwright_version: '1.59.x',
      axe_core_version: '4.10.x',
      routes_tested: [
        'dashboard-root',
        'dashboard-partner',
        'dashboard-batch',
        'dashboard-filtered',
        'saved-view-popover-open',
      ],
      themes_tested: ['light', 'dark'],
      summary: { critical, serious, moderate, minor },
      violations_by_rule,
      note: 'Advisory artifact — downstream Plans 02-04 consume this as context. NOT a skip-list. Plan 05 flips suite from advisory to blocking once zeroed.',
    };

    const out = path.resolve(process.cwd(), 'tests/a11y/baseline.json');
    fs.writeFileSync(out, JSON.stringify(baseline, null, 2) + '\n');
    console.log(`[baseline] wrote ${out}`);
  });
});
