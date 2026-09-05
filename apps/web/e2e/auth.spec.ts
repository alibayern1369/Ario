import { expect, test } from '@playwright/test';

test('login screen is Persian and has no dead primary action', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'آریو' }).or(page.getByText('آریو'))).toBeVisible();
  await expect(page.getByRole('button', { name: 'ورود به آریو' })).toBeEnabled();
});
