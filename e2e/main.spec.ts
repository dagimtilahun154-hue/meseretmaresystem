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
    await page.click('text=Point of Sale');
    await expect(page.locator('text=POS').first()).toBeVisible();
    
    // 3. Check Inventory Module
    await page.click('text=Inventory');
    await expect(page.locator('text=Inventory').first()).toBeVisible();
    
    // Check if the seeded product is visible
    await expect(page.locator('text=SolarPro 500').first()).toBeVisible({ timeout: 15000 });

    // 4. Check Field Work Module
    await page.click('text=Field Work');
    await expect(page.locator('text=Field Work').first()).toBeVisible();
    await expect(page.locator('text=Install SolarPro 500 at Farm').first()).toBeVisible({ timeout: 15000 });

    // 5. Check Finance Module
    await page.click('text=Finance Center');
    await expect(page.locator('text=Finance').first()).toBeVisible();
    
    // Wait a moment for chart/dashboard data
    await page.waitForTimeout(2000);

    // 6. Check HR Dashboard
    await page.click('text=HR & Attendance');
    await page.click('a[href="#/hr/workers"]');
    await expect(page.locator('text=Workers').first()).toBeVisible();
    await expect(page.locator('text=Dawit Alemu').first()).toBeVisible({ timeout: 15000 });

  });
});
