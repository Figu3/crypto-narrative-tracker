import { test, expect } from '@playwright/test';

test('home page renders streamgraph and panel', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Crypto Narrative Mindshare' })).toBeVisible();
  await expect(page.getByText('RIGHT NOW')).toBeVisible();
  await expect(page.locator('svg').first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Monthly' })).toBeVisible();
});
