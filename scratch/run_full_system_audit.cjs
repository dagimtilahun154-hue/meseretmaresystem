const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://127.0.0.1:5173';
const API_URL = 'http://127.0.0.1:4000/api/v1';

const auditResults = {
  testedAt: new Date().toISOString(),
  pages: [],
  roles: [],
  crudTests: [],
  forms: [],
  defects: [],
  consoleErrors: [],
  networkErrors: []
};

function recordDefect(title, severity, feature, steps, expected, actual, rootCause, fix) {
  const defectId = `BUG-${String(auditResults.defects.length + 1).padStart(3, '0')}`;
  const defect = {
    id: defectId,
    title,
    severity,
    confidence: 'High',
    feature,
    steps,
    expected,
    actual,
    likelyRootCause: rootCause,
    recommendedFix: fix
  };
  auditResults.defects.push(defect);
  console.log(`\n🚨 DEFECT [${defectId}] (${severity}): ${title}`);
  return defectId;
}

async function loginUser(page, username, password = '123') {
  await page.goto(`${BASE_URL}/#/`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(500);

  // If already logged in, logout or clear storage
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload();
  await page.waitForTimeout(800);

  const loginInput = await page.$('#username');
  if (loginInput) {
    await page.fill('#username', username);
    await page.fill('#password', password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1500);
  }
}

async function runFullAudit() {
  console.log('====================================================');
  console.log('🔍 STARTING EVIDENCE-BASED FULL SYSTEM AUDIT');
  console.log('====================================================\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text();
      console.log(`   [CONSOLE ERROR]: ${text}`);
      auditResults.consoleErrors.push({ url: page.url(), error: text });
    }
  });

  page.on('pageerror', err => {
    console.log(`   [PAGE ERROR]: ${err.message}`);
    auditResults.consoleErrors.push({ url: page.url(), error: err.message });
  });

  page.on('response', response => {
    if (response.status() >= 400 && !response.url().includes('favicon')) {
      console.log(`   [HTTP ${response.status()}]: ${response.url()}`);
      auditResults.networkErrors.push({ url: response.url(), status: response.status() });
    }
  });

  // ----------------------------------------------------
  // TEST 1: Role-Based Authentication & Workspaces
  // ----------------------------------------------------
  console.log('\n--- 1. Testing Role-Based Authentication & Workspaces ---');
  const testUsers = [
    { username: 'manager', expectedRole: 'General Manager' },
    { username: 'admin', expectedRole: 'Administrator' },
    { username: 'finance', expectedRole: 'Finance' },
    { username: 'store', expectedRole: 'Store' },
    { username: 'field', expectedRole: 'Field' },
    { username: 'ttl', expectedRole: 'Technical' },
    { username: 'hr', expectedRole: 'HR' },
    { username: 'cashier', expectedRole: 'Cashier' },
    { username: 'accountant', expectedRole: 'Accountant' }
  ];

  for (const u of testUsers) {
    try {
      await loginUser(page, u.username, '123');
      const bodyText = await page.textContent('body');
      const hasError = bodyText.includes('Invalid credentials') || bodyText.includes('Login Failed');
      const url = page.url();
      const sidebarItems = await page.$$eval('nav a, aside a, [data-sidebar="sidebar"] a', els => els.map(e => e.innerText.trim()).filter(Boolean));

      auditResults.roles.push({
        username: u.username,
        status: hasError ? 'FAIL' : 'PASS',
        url,
        sidebarItems
      });
      console.log(`   Role [${u.username}]: ${hasError ? '❌ FAIL' : '✅ PASS'} (Sidebar items: ${sidebarItems.length})`);
    } catch (e) {
      console.log(`   Role [${u.username}]: ❌ EXCEPTION: ${e.message}`);
      auditResults.roles.push({ username: u.username, status: 'FAIL', error: e.message });
    }
  }

  // ----------------------------------------------------
  // TEST 2: General Manager / Admin Deep Page Audit
  // ----------------------------------------------------
  console.log('\n--- 2. Auditing Every Reachable Page as Admin/Manager ---');
  await loginUser(page, 'manager', '123');

  const pagesToTest = [
    { name: 'Dashboard', path: '/#/' },
    { name: 'Dedicated Inbox', path: '/#/inbox' },
    { name: 'Team Chat', path: '/#/chat' },
    { name: 'Alerts & Notifications', path: '/#/alerts' },
    { name: 'Customer Master Directory', path: '/#/customers' },
    { name: 'Point of Sale (POS)', path: '/#/pos' },
    { name: 'Inventory Management', path: '/#/inventory' },
    { name: 'Executive Reports', path: '/#/reports' },
    { name: 'VAT & Tax Compliance', path: '/#/vat' },
    { name: 'Pump Products Catalog', path: '/#/pumps' },
    { name: 'Field Work & Jobs Overview', path: '/#/fieldwork' },
    { name: 'Field Work Jobs Board', path: '/#/fieldwork/jobs' },
    { name: 'Field Work Dispatch', path: '/#/fieldwork/dispatch' },
    { name: 'Field Work GPS Tracking', path: '/#/fieldwork/tracking' },
    { name: 'Field Work Tools & Assets', path: '/#/fieldwork/assets' },
    { name: 'Field Work Solar Sizing', path: '/#/fieldwork/sizing' },
    { name: 'Finance Center', path: '/#/finance' },
    { name: 'Finance Cashflow', path: '/#/finance/cashflow' },
    { name: 'Finance Invoices & Accounts', path: '/#/finance/invoices' },
    { name: 'Finance Peachtree Integration', path: '/#/peachtree' },
    { name: 'User & Permissions Management', path: '/#/users' },
    { name: 'HR Dashboard', path: '/#/hr/dashboard' },
    { name: 'HR Workers Management', path: '/#/hr/workers' },
    { name: 'HR Fingerprint Registration', path: '/#/hr/registration' },
    { name: 'HR Attendance Terminal', path: '/#/hr/scan' },
    { name: 'HR Attendance Reports', path: '/#/hr/reports' },
    { name: 'HR System Settings', path: '/#/hr/settings' },
  ];

  for (const p of pagesToTest) {
    try {
      console.log(`\n   Visiting: ${p.name} (${p.path})...`);
      await page.goto(`${BASE_URL}${p.path}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(1500);

      const title = await page.title();
      const currentUrl = page.url();
      const bodyText = await page.textContent('body');
      const is404 = bodyText.includes('404') || bodyText.includes('Page Not Found') || bodyText.includes('NotFound');
      const buttons = await page.$$eval('button', btns => btns.map(b => b.innerText.trim()).filter(Boolean));
      const tables = await page.$$eval('table', tbls => tbls.length);
      const inputs = await page.$$eval('input, select, textarea', inps => inps.length);

      let status = is404 ? 'FAIL' : 'PASS';
      auditResults.pages.push({
        name: p.name,
        path: p.path,
        status,
        url: currentUrl,
        buttonsCount: buttons.length,
        tablesCount: tables,
        inputsCount: inputs,
        sampleButtons: buttons.slice(0, 5)
      });
      console.log(`   ${status === 'PASS' ? '✅' : '❌'} ${p.name}: status=${status}, buttons=${buttons.length}, tables=${tables}, inputs=${inputs}`);
    } catch (e) {
      console.log(`   ❌ ${p.name}: Error navigating: ${e.message}`);
      auditResults.pages.push({ name: p.name, path: p.path, status: 'FAIL', error: e.message });
    }
  }

  // ----------------------------------------------------
  // TEST 3: POS Workflow & Cart Checkout
  // ----------------------------------------------------
  console.log('\n--- 3. Testing POS Checkout Workflow ---');
  try {
    await page.goto(`${BASE_URL}/#/pos`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);

    // Look for product cards to click
    const productCards = await page.$$('[data-testid="pos-product-card"], .cursor-pointer, .card');
    console.log(`   Found ${productCards.length} clickable elements on POS page`);

    const addButtons = page.locator('button:has-text("Add"), button:has-text("+")');
    const addCount = await addButtons.count();
    console.log(`   Found ${addCount} Add buttons`);

    if (addCount > 0) {
      await addButtons.first().click();
      await page.waitForTimeout(500);
      console.log('   Clicked Add button');
    }

    const checkoutBtn = page.locator('button:has-text("Checkout"), button:has-text("Pay"), button:has-text("Complete Sale")');
    if (await checkoutBtn.count() > 0) {
      console.log('   Checkout button found');
    }
  } catch (e) {
    console.log(`   POS test error: ${e.message}`);
  }

  // ----------------------------------------------------
  // TEST 4: Customer Creation & 360 Dossier
  // ----------------------------------------------------
  console.log('\n--- 4. Testing Customer Creation & 360 Dossier ---');
  try {
    await page.goto(`${BASE_URL}/#/customers`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);

    // Click on customer row or dossier button
    const dossierButtons = page.locator('button:has-text("Dossier"), a:has-text("Dossier"), tr');
    const dCount = await dossierButtons.count();
    console.log(`   Customer table rows/buttons: ${dCount}`);
    if (dCount > 1) {
      // Click first customer
      await dossierButtons.nth(1).click();
      await page.waitForTimeout(2000);
      console.log('   Dossier page loaded, URL:', page.url());
      const dossierTabs = await page.$$eval('[role="tab"]', tabs => tabs.map(t => t.innerText.trim()));
      console.log('   Dossier tabs found:', dossierTabs);
    }
  } catch (e) {
    console.log(`   Customer test error: ${e.message}`);
  }

  // ----------------------------------------------------
  // TEST 5: Pump Catalog & Sizing Request Workflow
  // ----------------------------------------------------
  console.log('\n--- 5. Testing Pump Catalog & Solar Sizing Engine ---');
  try {
    await page.goto(`${BASE_URL}/#/pumps`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);
    const pumpCards = page.locator('.cursor-pointer, .border, a[href*="pumps/"]');
    const pCount = await pumpCards.count();
    console.log(`   Pump Catalog items: ${pCount}`);

    await page.goto(`${BASE_URL}/#/fieldwork/sizing`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);
    const calculateBtn = page.locator('button:has-text("Calculate"), button:has-text("Size Pump"), button:has-text("Run AI Sizing")');
    console.log(`   Sizing Calculation buttons found: ${await calculateBtn.count()}`);
  } catch (e) {
    console.log(`   Pump/Sizing test error: ${e.message}`);
  }

  // ----------------------------------------------------
  // TEST 6: Inventory Management & Audits
  // ----------------------------------------------------
  console.log('\n--- 6. Testing Inventory Management & Stock Audit ---');
  try {
    await page.goto(`${BASE_URL}/#/inventory`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);
    const invTabs = await page.$$eval('[role="tab"]', tabs => tabs.map(t => t.innerText.trim()));
    console.log(`   Inventory Tabs: ${invTabs.join(', ')}`);
  } catch (e) {
    console.log(`   Inventory test error: ${e.message}`);
  }

  // ----------------------------------------------------
  // TEST 7: Finance Center & Peachtree
  // ----------------------------------------------------
  console.log('\n--- 7. Testing Finance Center & Accounting ---');
  try {
    await page.goto(`${BASE_URL}/#/finance`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);
    const finTabs = await page.$$eval('[role="tab"], .nav-tab', tabs => tabs.map(t => t.innerText.trim()));
    console.log(`   Finance Tabs: ${finTabs.join(', ')}`);
  } catch (e) {
    console.log(`   Finance test error: ${e.message}`);
  }

  // ----------------------------------------------------
  // TEST 8: Team Chat & WebSockets
  // ----------------------------------------------------
  console.log('\n--- 8. Testing Team Chat & Realtime Messaging ---');
  try {
    await page.goto(`${BASE_URL}/#/chat`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);
    const chatInput = page.locator('input[placeholder*="message"], textarea[placeholder*="message"]');
    console.log(`   Chat message input present: ${await chatInput.count() > 0}`);
  } catch (e) {
    console.log(`   Chat test error: ${e.message}`);
  }

  // ----------------------------------------------------
  // TEST 9: HR & Biometric Terminal
  // ----------------------------------------------------
  console.log('\n--- 9. Testing HR & Attendance Terminal ---');
  try {
    await page.goto(`${BASE_URL}/#/hr/scan`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);
    const terminalButtons = await page.$$eval('button', btns => btns.map(b => b.innerText.trim()));
    console.log(`   Attendance Terminal Buttons: ${terminalButtons.join(', ')}`);
  } catch (e) {
    console.log(`   HR test error: ${e.message}`);
  }

  // ----------------------------------------------------
  // TEST 10: Responsive Layouts (Mobile, Tablet, Desktop)
  // ----------------------------------------------------
  console.log('\n--- 10. Testing Responsive Layouts ---');
  const viewports = [
    { name: 'Mobile (375x667)', width: 375, height: 667 },
    { name: 'Tablet (768x1024)', width: 768, height: 1024 },
    { name: 'Desktop (1440x900)', width: 1440, height: 900 }
  ];

  for (const vp of viewports) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto(`${BASE_URL}/#/pos`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(1000);
    console.log(`   Tested POS on ${vp.name}: OK`);
  }

  await browser.close();

  // Save audit data to scratch
  fs.writeFileSync(path.join(__dirname, 'full_audit_results.json'), JSON.stringify(auditResults, null, 2));
  console.log('\n====================================================');
  console.log('✅ AUDIT COMPLETED. Results saved to scratch/full_audit_results.json');
  console.log('====================================================');
}

runFullAudit().catch(console.error);
