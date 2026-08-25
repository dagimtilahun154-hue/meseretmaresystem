import { test, expect } from '@playwright/test';

test.describe('SolarFlow Role-Based Sidebar & Every Page Navigation Verification', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();
  });

  test('Verify General Manager (manager) - Full Sidebar Access & Page Navigation', async ({ page }) => {
    await page.waitForSelector('#username');
    await page.fill('#username', 'manager');
    await page.fill('#password', '123');
    await page.click('button[type="submit"]');

    await expect(page.locator('text=General Manager Command Center').first()).toBeVisible({ timeout: 10000 });

    const sidebar = page.locator('aside, [data-sidebar="sidebar"], nav').first();
    await expect(sidebar.getByText('Dashboard').first()).toBeVisible();
    await expect(sidebar.getByText('Pump Products').first()).toBeVisible();
    await expect(sidebar.getByText('Pump Sizing').first()).toBeVisible();
    await expect(sidebar.getByText('Customer Files').first()).toBeVisible();
    await expect(sidebar.getByText('Field Work').first()).toBeVisible();
    await expect(sidebar.getByText('Reports').first()).toBeVisible();

    await page.goto('/#/pos');
    await page.waitForTimeout(1000);

    await page.goto('/#/inventory');
    await page.waitForTimeout(1000);

    await page.goto('/#/fieldwork/jobs');
    await page.waitForTimeout(1000);

    await page.goto('/#/finance/dashboard');
    await page.waitForTimeout(1000);

    await page.goto('/#/users');
    await page.waitForTimeout(1000);
  });

  test('Verify Storekeeper (store) - Strict Role-Scoped Sidebar & Page Navigation', async ({ page }) => {
    await page.waitForSelector('#username');
    await page.fill('#username', 'store');
    await page.fill('#password', '123');
    await page.click('button[type="submit"]');

    await expect(page.locator('text=Sales Hub Workspace').first()).toBeVisible({ timeout: 10000 });

    const sidebar = page.locator('aside, [data-sidebar="sidebar"], nav').first();

    await expect(sidebar.getByText('Dashboard').first()).toBeVisible();
    await expect(sidebar.getByText('Inventory').first()).toBeVisible();
    await expect(sidebar.getByText('Pump Products').first()).toBeVisible();

    await expect(sidebar.getByText('Finance Center')).toHaveCount(0);
    await expect(sidebar.getByText('HR & Attendance')).toHaveCount(0);
    await expect(sidebar.getByText('User Accounts')).toHaveCount(0);

    await page.goto('/#/pos');
    await page.waitForTimeout(1000);

    await page.goto('/#/inventory');
    await page.waitForTimeout(1000);
  });

  test('Verify Finance Admin (finance) - Strict Role-Scoped Sidebar & Page Navigation', async ({ page }) => {
    await page.waitForSelector('#username');
    await page.fill('#username', 'finance');
    await page.fill('#password', '123');
    await page.click('button[type="submit"]');

    await expect(page.locator('text=Finance Manager Workspace').first()).toBeVisible({ timeout: 10000 });

    const sidebar = page.locator('aside, [data-sidebar="sidebar"], nav').first();

    await expect(sidebar.getByText('Dashboard').first()).toBeVisible();
    await expect(sidebar.getByText('Point of Sale').first()).toBeVisible();
    await expect(sidebar.getByText('Field Work').first()).toBeVisible();
    await expect(sidebar.getByText('Finance Center').first()).toBeVisible();

    await expect(sidebar.getByText('HR & Attendance')).toHaveCount(0);
    await expect(sidebar.getByText('User Accounts')).toHaveCount(0);

    await page.goto('/#/finance/dashboard');
    await page.waitForTimeout(1000);

    await page.goto('/#/finance/cashflow');
    await page.waitForTimeout(1000);

    await page.goto('/#/finance/peachtree');
    await page.waitForTimeout(1000);
  });

  test('Verify Technical Manager (field) - Strict Role-Scoped Sidebar & Page Navigation', async ({ page }) => {
    await page.waitForSelector('#username');
    await page.fill('#username', 'field');
    await page.fill('#password', '123');
    await page.click('button[type="submit"]');

    await expect(page.locator('text=Technical Manager Workspace').first()).toBeVisible({ timeout: 10000 });

    const sidebar = page.locator('aside, [data-sidebar="sidebar"], nav').first();

    await expect(sidebar.getByText('Dashboard').first()).toBeVisible();
    await expect(sidebar.getByText('Pump Sizing').first()).toBeVisible();
    await expect(sidebar.getByText('Field Work').first()).toBeVisible();

    await expect(sidebar.getByText('Finance Center')).toHaveCount(0);
    await expect(sidebar.getByText('HR & Attendance')).toHaveCount(0);
    await expect(sidebar.getByText('User Accounts')).toHaveCount(0);

    await page.goto('/#/fieldwork/sizing');
    await page.waitForTimeout(1000);

    await page.goto('/#/fieldwork/jobs');
    await page.waitForTimeout(1000);
  });

  test('Verify Technical Team Lead (ttl) - Strict Role-Scoped Sidebar & Page Navigation', async ({ page }) => {
    await page.waitForSelector('#username');
    await page.fill('#username', 'ttl');
    await page.fill('#password', '123');
    await page.click('button[type="submit"]');

    await expect(page.locator('text=TTL Operational Workspace').first()).toBeVisible({ timeout: 10000 });

    const sidebar = page.locator('aside, [data-sidebar="sidebar"], nav').first();

    await expect(sidebar.getByText('Dashboard').first()).toBeVisible();
    await expect(sidebar.getByText('Field Work').first()).toBeVisible();

    await expect(sidebar.getByText('Finance Center')).toHaveCount(0);
    await expect(sidebar.getByText('HR & Attendance')).toHaveCount(0);
    await expect(sidebar.getByText('User Accounts')).toHaveCount(0);

    await page.goto('/#/fieldwork/jobs');
    await page.waitForTimeout(1000);
  });
});
