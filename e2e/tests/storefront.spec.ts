import { expect, test } from '@playwright/test';
import { E2E, PORTS } from '../support/env';

const website = `http://localhost:${PORTS.website}`;
const [firstProduct] = E2E.products;

test.describe('storefront', () => {
  test('the catalogue shows products from the API', async ({ page }) => {
    await page.goto(`${website}/products`);
    await expect(page.getByText(firstProduct.title).first()).toBeVisible();
  });

  test('switching to Arabic flips the page right-to-left and survives a reload', async ({ page }) => {
    await page.goto(website);
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');

    await page.getByRole('button', { name: 'العربية' }).click();
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar');

    // Server-rendered from the tv_locale cookie: right on the first byte
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  });

  test('a signed-out shopper reaches checkout and is asked for an email (guest checkout)', async ({ page }) => {
    await page.goto(`${website}/products`);
    // Each card's cart button is "Add" (exact: not "Add to wishlist")
    await expect(page.getByRole('heading', { name: firstProduct.title })).toBeVisible();
    await page.getByRole('button', { name: 'Add', exact: true }).first().click();

    await page.goto(`${website}/checkout`);
    await expect(page).toHaveURL(/\/checkout$/); // not bounced to login
    const email = page.getByLabel(/email for your receipt/i);
    await expect(email).toBeVisible();

    await email.fill('not-an-email');
    await email.blur();
    await expect(page.getByRole('alert').filter({ hasText: /valid email/i })).toBeVisible();
  });

  test('the account area sends signed-out visitors to sign in and back', async ({ page }) => {
    await page.goto(`${website}/user/orders`);
    await expect(page).toHaveURL(/\/auth\/login\?redirect=%2Fuser%2Forders/);
  });
});
