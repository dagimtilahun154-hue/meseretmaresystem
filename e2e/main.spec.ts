import { test, expect } from '@playwright/test';

test.describe('SolarFlow Manager E2E', () => {
  test('Complete application walkthrough', async ({ page }) => {
    // 1. Login
    await page.goto('/');
    
    // Wait for login form
    await page.waitForSelector('#username');
    await page.fill('#username', 'manager');
    await page.fill('#password', '123');
    await page.click('button[type="submit"]');

    // Verify successful login by checking for Dashboard or navigation
    await expect(page.locator('text=Dashboard').first()).toBeVisible({ timeout: 10000 });

    // 2. Check POS Module
    await page.goto('/#/pos');
    await page.waitForTimeout(1000);
    
    // 3. Check Inventory Module
    await page.goto('/#/inventory');
    await page.waitForTimeout(1000);

    // 4. Check Field Work Module
    await page.goto('/#/fieldwork');
    await page.waitForTimeout(1000);

    // 5. Check Finance Module
    await page.goto('/#/finance');
    await page.waitForTimeout(1000);

  });
});
