import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';

async function expectCleanRender(page: Page, path: string): Promise<void> {
  const pageErrors: Error[] = [];
  page.on('pageerror', (error) => pageErrors.push(error));

  await page.goto(path, { waitUntil: 'domcontentloaded' });

  // Real content rendered, not an error boundary or a blank shell.
  await expect(page.locator('body')).not.toBeEmpty();
  await expect(page.locator('main, [role="main"], header, nav').first()).toBeVisible();

  expect(pageErrors).toEqual([]);
}

test.describe('public pages', () => {
  test('/food renders without uncaught errors', async ({ page }) => {
    await expectCleanRender(page, '/food');
  });

  test('/ renders (or redirects to a landing page) without uncaught errors', async ({ page }) => {
    // / may redirect to /food depending on the isAppLaunched flag; assert tolerant.
    await expectCleanRender(page, '/');
    expect(new URL(page.url()).pathname).not.toBe('/login');
  });
});
