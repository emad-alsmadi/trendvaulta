import { expect, test } from '@playwright/test';
import { E2E, PORTS } from '../support/env';

const dashboard = `http://localhost:${PORTS.dashboard}`;

test.describe('dashboard', () => {
  test('staff sign in and handle a customer message', async ({ page }) => {
    await page.goto(`${dashboard}/login`);
    await page.locator('input[type=email]').fill(E2E.adminEmail);
    await page.locator('input[type=password]').fill(E2E.adminPassword);
    await page.locator('button[type=submit]').click();
    await expect(page).not.toHaveURL(/\/login/);

    // The unread badge counts the seeded message
    const messagesLink = page.locator('aside a[href="/messages"]');
    await expect(messagesLink).toContainText('1');

    await messagesLink.click();
    await page.getByRole('button', { name: E2E.messageSubject }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText('no tracking number');

    // Opening it marked it read: the badge goes away
    await expect(messagesLink).not.toContainText('1');
  });

  test('a wrong password is refused', async ({ page }) => {
    await page.goto(`${dashboard}/login`);
    await page.locator('input[type=email]').fill(E2E.adminEmail);
    await page.locator('input[type=password]').fill('wrong-password');
    await page.locator('button[type=submit]').click();
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });
});
