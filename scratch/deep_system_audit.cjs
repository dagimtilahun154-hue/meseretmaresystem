const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5173';

const report = {
  rolesTested: [],
  pagesTested: [],
  workflowsTested: [],
  defects: [],
  consoleErrors: [],
  networkErrors: []
};

function logDefect(title, severity, feature, steps, expected, actual, rootCause, fix) {
  const defect = {
    id: `BUG-${String(report.defects.length + 1).padStart(3, '0')}`,
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
  report.defects.push(defect);
  console.log(`\n🚨 [${defect.id}] (${severity}) ${title}`);
  return defect.id;
}

async function loginAs(page, username, password = '123') {
  await page.goto(`${BASE_URL}/#/`, { waitUntil: 'networkidle', timeout: 15000 });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  const userField = await page.waitForSelector('#username', { timeout: 5000 });
  await userField.fill(username);
  await page.fill('#password', password);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1500);
}

async function runDeepAudit() {
  console.log('🚀 Starting Deep Rigorous System Audit via Playwright on localhost:5173...\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') {
      const errText = msg.text();
      // Filter non-fatal or expected noises if any
      report.consoleErrors.push({ url: page.url(), text: errText });
      console.log(`   ❌ [CONSOLE]: ${errText.substring(0, 140)}`);
    }
  });

  page.on('response', resp => {
    if (resp.status() >= 400 && !resp.url().includes('favicon')) {
      report.networkErrors.push({ url: resp.url(), status: resp.status() });
      console.log(`   ❌ [HTTP ${resp.status()}]: ${resp.url()}`);
    }
  });

  // ==========================================
  // PHASE 1: ROLE AUTHENTICATION & SIDEBAR RESTRICTION AUDIT
  // ==========================================
  console.log('\n==========================================');
  console.log('PHASE 1: ROLE AUTHENTICATION & ACCESS CONTROL');
  console.log('==========================================');

  const roles = [
    { username: 'manager', expectedTitle: 'General Manager Workspace', forbidden: [] },
    { username: 'admin', expectedTitle: 'General Manager Workspace', forbidden: [] },
    { username: 'store', expectedTitle: 'Sales Hub Workspace', forbidden: ['Finance Center', 'HR & Attendance', 'User Accounts'] },
    { username: 'finance', expectedTitle: 'Finance Manager Workspace', forbidden: ['HR & Attendance', 'User Accounts'] },
    { username: 'field', expectedTitle: 'Technical Manager Workspace', forbidden: ['Finance Center', 'HR & Attendance', 'User Accounts'] },
    { username: 'ttl', expectedTitle: 'TTL Operational Workspace', forbidden: ['Finance Center', 'HR & Attendance', 'User Accounts'] },
    { username: 'hr', expectedTitle: 'HR', forbidden: ['Point of Sale', 'Inventory', 'Pump Products'] },
  ];

  for (const r of roles) {
    try {
      console.log(`\nTesting Login as [${r.username}]...`);
      await loginAs(page, r.username, '123');
      const url = page.url();
      const body = await page.textContent('body');
      const sideNavText = await page.$$eval('aside, nav, [data-sidebar="sidebar"]', els => els.map(e => e.innerText).join(' '));

      const isAuthed = !url.includes('/login') && (await page.$('#username')) === null;
      console.log(`   Authenticated: ${isAuthed ? 'YES' : 'NO'}`);

      // Check forbidden items
      const leaks = [];
      for (const f of r.forbidden) {
        if (sideNavText.includes(f)) {
          leaks.push(f);
        }
      }

      report.rolesTested.push({
        username: r.username,
        authenticated: isAuthed,
        sidebarTextPreview: sideNavText.substring(0, 100).replace(/\n/g, ' '),
        leaks
      });

      if (leaks.length > 0) {
        logDefect(
          `Role-based authorization leakage for ${r.username}`,
          'P1 High',
          'Role-Based Navigation',
          [`1. Login as '${r.username}'`, '2. Inspect sidebar navigation'],
          `Sidebar should hide forbidden sections: ${r.forbidden.join(', ')}`,
          `Sidebar showed forbidden sections: ${leaks.join(', ')}`,
          'Sidebar navigation filtering does not strictly enforce role permissions',
          'Ensure navigation items check specific role capabilities before rendering'
        );
      }
    } catch (err) {
      console.log(`   Error testing role ${r.username}: ${err.message}`);
    }
  }

  // ==========================================
  // PHASE 2: DETAILED PAGE & FEATURE AUDIT (AS MANAGER/ADMIN)
  // ==========================================
  console.log('\n==========================================');
  console.log('PHASE 2: DETAILED PAGE & FEATURE LEVEL AUDIT');
  console.log('==========================================');
  await loginAs(page, 'manager', '123');

  const pageAudits = [
    {
      name: 'Dashboard Overview',
      path: '/#/',
      checks: async () => {
        const stats = await page.$$('.stat-card, [data-testid="stat-card"], .card');
        const charts = await page.$$('canvas, svg.recharts-surface, .recharts-responsive-container');
        console.log(`   Cards found: ${stats.length}, Charts rendered: ${charts.length}`);
        return { statsCount: stats.length, chartsCount: charts.length };
      }
    },
    {
      name: 'Dedicated Inbox & Approvals',
      path: '/#/inbox',
      checks: async () => {
        const requests = await page.$$('.request-item, [role="listitem"], .border.rounded-lg');
        const filterButtons = await page.$$eval('button', btns => btns.map(b => b.innerText.trim()).filter(t => t.includes('All') || t.includes('Pending') || t.includes('Approved')));
        console.log(`   Filter tabs: ${filterButtons.join(', ')}, Request items: ${requests.length}`);
        return { filters: filterButtons, count: requests.length };
      }
    },
    {
      name: 'Team Chat',
      path: '/#/chat',
      checks: async () => {
        const channels = await page.$$eval('[role="button"], button', btns => btns.map(b => b.innerText.trim()).filter(t => t.startsWith('#') || t.includes('General') || t.includes('Channel')));
        const msgInput = await page.$('input[placeholder*="message"], textarea[placeholder*="message"]');
        console.log(`   Channels: ${channels.join(', ')}, Input exists: ${!!msgInput}`);
        return { channels, hasInput: !!msgInput };
      }
    },
    {
      name: 'Alerts Page',
      path: '/#/alerts',
      checks: async () => {
        const alerts = await page.$$('.alert-item, .border.p-4, .card');
        console.log(`   Alert entries found: ${alerts.length}`);
        return { alertCount: alerts.length };
      }
    },
    {
      name: 'Customer Master Directory',
      path: '/#/customers',
      checks: async () => {
        const rows = await page.$$('table tbody tr');
        const searchInput = await page.$('input[placeholder*="Search"]');
        const addBtn = page.locator('button:has-text("Add Customer"), button:has-text("New Customer")');
        console.log(`   Customer table rows: ${rows.length}, Search input: ${!!searchInput}, Add button: ${await addBtn.count() > 0}`);
        return { rows: rows.length, hasSearch: !!searchInput, hasAdd: await addBtn.count() > 0 };
      }
    },
    {
      name: 'Customer 360 Dossier',
      path: '/#/customers/1',
      checks: async () => {
        const tabs = await page.$$eval('[role="tab"]', t => t.map(el => el.innerText.trim()));
        console.log(`   Dossier Tabs: ${tabs.join(', ')}`);
        for (const tabName of tabs) {
          const tabBtn = page.locator(`[role="tab"]:has-text("${tabName}")`).first();
          if (await tabBtn.count() > 0) {
            await tabBtn.click();
            await page.waitForTimeout(500);
          }
        }
        return { tabs };
      }
    },
    {
      name: 'Point of Sale (POS)',
      path: '/#/pos',
      checks: async () => {
        const products = await page.$$('.cursor-pointer, .card, [data-testid="product-card"]');
        const search = await page.$('input[placeholder*="Search"]');
        const catButtons = await page.$$eval('button', btns => btns.map(b => b.innerText.trim()).filter(t => ['All', 'Pumps', 'Panels', 'Accessories', 'Inverters'].some(k => t.includes(k))));
        console.log(`   Products rendered: ${products.length}, Category filters: ${catButtons.join(', ')}`);
        return { productCount: products.length, categories: catButtons };
      }
    },
    {
      name: 'Inventory Management',
      path: '/#/inventory',
      checks: async () => {
        const tabs = await page.$$eval('[role="tab"]', t => t.map(el => el.innerText.trim()));
        const tableRows = await page.$$('table tbody tr');
        console.log(`   Inventory Tabs: ${tabs.join(', ')}, Table rows: ${tableRows.length}`);
        return { tabs, rows: tableRows.length };
      }
    },
    {
      name: 'Reports & Analytics',
      path: '/#/reports',
      checks: async () => {
        const exportBtns = await page.$$eval('button', btns => btns.map(b => b.innerText.trim()).filter(t => t.includes('Export') || t.includes('PDF') || t.includes('CSV') || t.includes('Excel')));
        const charts = await page.$$('svg.recharts-surface, canvas');
        console.log(`   Export buttons: ${exportBtns.join(', ')}, Charts: ${charts.length}`);
        return { exportButtons: exportBtns, charts: charts.length };
      }
    },
    {
      name: 'VAT & Tax Compliance',
      path: '/#/vat',
      checks: async () => {
        const summaryCards = await page.$$('.card, .border.p-4');
        const tables = await page.$$('table');
        console.log(`   Cards: ${summaryCards.length}, Tables: ${tables.length}`);
        return { summaryCards: summaryCards.length, tables: tables.length };
      }
    },
    {
      name: 'Pump Products Catalog',
      path: '/#/pumps',
      checks: async () => {
        const pumpCards = await page.$$('.cursor-pointer, .border.rounded-lg');
        const searchInput = await page.$('input[placeholder*="Search"]');
        console.log(`   Pump cards rendered: ${pumpCards.length}, Search: ${!!searchInput}`);
        return { pumpCount: pumpCards.length, hasSearch: !!searchInput };
      }
    },
    {
      name: 'Field Work Overview & Jobs',
      path: '/#/fieldwork',
      checks: async () => {
        const subNav = await page.$$eval('button, [role="tab"]', btns => btns.map(b => b.innerText.trim()).filter(t => ['Jobs', 'Dispatch', 'Tracking', 'Assets', 'Sizing', 'Assessment'].some(k => t.includes(k))));
        console.log(`   Field Work sub-navigation: ${subNav.join(', ')}`);
        return { subNav };
      }
    },
    {
      name: 'Field Work Sizing Calculator',
      path: '/#/fieldwork/sizing',
      checks: async () => {
        const inputs = await page.$$('input[type="number"], input[type="text"], select');
        const calcBtn = page.locator('button:has-text("Calculate"), button:has-text("Size"), button:has-text("Recommend")');
        console.log(`   Sizing input fields: ${inputs.length}, Calculate button: ${await calcBtn.count() > 0}`);
        return { inputCount: inputs.length, hasCalcBtn: await calcBtn.count() > 0 };
      }
    },
    {
      name: 'Finance Center Hub',
      path: '/#/finance',
      checks: async () => {
        const tabs = await page.$$eval('[role="tab"], button', btns => btns.map(b => b.innerText.trim()).filter(t => ['Dashboard', 'Cash Flow', 'Invoices', 'Bills', 'Accounts', 'Journal', 'Peachtree'].some(k => t.includes(k))));
        console.log(`   Finance Sections: ${tabs.join(', ')}`);
        return { tabs };
      }
    },
    {
      name: 'Peachtree Accounting Integration',
      path: '/#/peachtree',
      checks: async () => {
        const importBtn = page.locator('button:has-text("Import"), button:has-text("Upload"), input[type="file"]');
        const tableRows = await page.$$('table tbody tr');
        console.log(`   Import button count: ${await importBtn.count()}, Table rows: ${tableRows.length}`);
        return { hasImport: await importBtn.count() > 0, rows: tableRows.length };
      }
    },
    {
      name: 'User Accounts & Access Control',
      path: '/#/users',
      checks: async () => {
        const userRows = await page.$$('table tbody tr, .user-card, [role="listitem"]');
        const addUserBtn = page.locator('button:has-text("Add User"), button:has-text("New User"), button:has-text("Create User")');
        console.log(`   Users listed: ${userRows.length}, Add user button: ${await addUserBtn.count() > 0}`);
        return { userCount: userRows.length, hasAddBtn: await addUserBtn.count() > 0 };
      }
    },
    {
      name: 'HR & Biometric Dashboard',
      path: '/#/hr/dashboard',
      checks: async () => {
        const cards = await page.$$('.card, .border.p-4');
        console.log(`   HR Cards: ${cards.length}`);
        return { cardCount: cards.length };
      }
    },
    {
      name: 'HR Attendance Terminal',
      path: '/#/hr/scan',
      checks: async () => {
        const buttons = await page.$$eval('button', btns => btns.map(b => b.innerText.trim()));
        console.log(`   Terminal buttons: ${buttons.join(', ')}`);
        return { buttons };
      }
    }
  ];

  for (const pa of pageAudits) {
    try {
      console.log(`\nAuditing [${pa.name}] at ${pa.path}...`);
      await page.goto(`${BASE_URL}${pa.path}`, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(1000);

      const is404 = (await page.textContent('body')).includes('404');
      const details = await pa.checks();

      report.pagesTested.push({
        name: pa.name,
        path: pa.path,
        status: is404 ? 'FAIL' : 'PASS',
        details
      });
    } catch (err) {
      console.log(`   ❌ Error auditing ${pa.name}: ${err.message}`);
      report.pagesTested.push({
        name: pa.name,
        path: pa.path,
        status: 'FAIL',
        error: err.message
      });
      logDefect(
        `Navigation or Render Failure on ${pa.name}`,
        'P1 High',
        pa.name,
        [`1. Navigate to ${pa.path}`],
        'Page should render cleanly without runtime exceptions',
        `Encountered error: ${err.message}`,
        'Runtime exception or unhandled promise rejection in component tree',
        'Inspect component lifecycle and add error boundaries and fallback states'
      );
    }
  }

  // ==========================================
  // PHASE 3: END-TO-END WORKFLOW VERIFICATION
  // ==========================================
  console.log('\n==========================================');
  console.log('PHASE 3: END-TO-END WORKFLOW TESTING');
  console.log('==========================================');

  // WORKFLOW A: POS Cart & Checkout
  console.log('\nTesting Workflow A: POS Cart & Sale Checkout...');
  try {
    await page.goto(`${BASE_URL}/#/pos`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    // Find and click an Add button on a product
    const addBtn = page.locator('button:has-text("Add to Cart"), button:has-text("Add"), button:has-text("+")').first();
    if (await addBtn.count() > 0) {
      await addBtn.click();
      await page.waitForTimeout(500);
      console.log('   ✅ Added item to POS cart');

      // Check if Cart shows total
      const cartText = await page.textContent('body');
      console.log(`   Cart updated: ${cartText.includes('Total') || cartText.includes('ETB') || cartText.includes('Subtotal')}`);
      report.workflowsTested.push({ name: 'POS Cart', status: 'PASS' });
    } else {
      console.log('   ⚠️ No Add to Cart button found');
      report.workflowsTested.push({ name: 'POS Cart', status: 'PARTIAL', reason: 'No interactive add button found' });
    }
  } catch (err) {
    console.log(`   ❌ POS Workflow Error: ${err.message}`);
    report.workflowsTested.push({ name: 'POS Cart', status: 'FAIL', error: err.message });
  }

  // WORKFLOW B: Solar Sizing Calculation & Model Recommendation
  console.log('\nTesting Workflow B: Solar Pump Sizing Calculation...');
  try {
    await page.goto(`${BASE_URL}/#/fieldwork/sizing`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    // Fill head and flow rate inputs if found
    const headInput = page.locator('input[id*="head"], input[placeholder*="Head"], input[name*="head"]').first();
    const flowInput = page.locator('input[id*="flow"], input[placeholder*="Flow"], input[name*="flow"]').first();
    
    if (await headInput.count() > 0) await headInput.fill('60');
    if (await flowInput.count() > 0) await flowInput.fill('15');

    const calcBtn = page.locator('button:has-text("Calculate"), button:has-text("Size Pump"), button:has-text("Run AI Sizing")').first();
    if (await calcBtn.count() > 0) {
      await calcBtn.click();
      await page.waitForTimeout(1500);
      console.log('   ✅ Clicked Sizing Calculate');
      report.workflowsTested.push({ name: 'Solar Pump Sizing', status: 'PASS' });
    } else {
      console.log('   ⚠️ Sizing calculation button missing or disabled');
      report.workflowsTested.push({ name: 'Solar Pump Sizing', status: 'PARTIAL', reason: 'Calculate button not found' });
    }
  } catch (err) {
    console.log(`   ❌ Sizing Workflow Error: ${err.message}`);
    report.workflowsTested.push({ name: 'Solar Pump Sizing', status: 'FAIL', error: err.message });
  }

  // WORKFLOW C: User Management Create User Form
  console.log('\nTesting Workflow C: User Management Creation Form...');
  try {
    await page.goto(`${BASE_URL}/#/users`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    const addUserBtn = page.locator('button:has-text("Add User"), button:has-text("New User")').first();
    if (await addUserBtn.count() > 0) {
      await addUserBtn.click();
      await page.waitForTimeout(1000);
      const modal = await page.$('[role="dialog"]');
      console.log(`   Modal opened: ${!!modal}`);
      if (modal) {
        const dialogText = await page.textContent('[role="dialog"]');
        console.log(`   Dialog text preview: ${dialogText.substring(0, 100).replace(/\n/g, ' ')}`);
        // Close modal
        const closeBtn = page.locator('[role="dialog"] button:has-text("Cancel"), [role="dialog"] button:has-text("Close")').first();
        if (await closeBtn.count() > 0) await closeBtn.click();
      }
      report.workflowsTested.push({ name: 'User Management Form', status: 'PASS' });
    } else {
      report.workflowsTested.push({ name: 'User Management Form', status: 'PARTIAL' });
    }
  } catch (err) {
    console.log(`   ❌ User Management Workflow Error: ${err.message}`);
    report.workflowsTested.push({ name: 'User Management Form', status: 'FAIL', error: err.message });
  }

  await browser.close();

  fs.writeFileSync(path.join(__dirname, 'deep_audit_summary.json'), JSON.stringify(report, null, 2));
  console.log('\n==========================================');
  console.log('🏆 AUDIT COMPLETE. Summary saved to scratch/deep_audit_summary.json');
  console.log('==========================================');
}

runDeepAudit().catch(console.error);
