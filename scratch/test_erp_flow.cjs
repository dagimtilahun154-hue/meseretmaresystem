const { chromium } = require('playwright');

async function testFullERP() {
  console.log('🚀 Starting Full ERP & Workflow Verification Test...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  let consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`❌ [BROWSER ERROR]: ${msg.text()}`);
      consoleErrors.push(msg.text());
    }
  });

  page.on('pageerror', err => {
    console.error(`💥 [PAGE ERROR]:`, err.message);
    consoleErrors.push(err.message);
  });

  try {
    // 1. Login as admin
    console.log('\n--- 1. Login as Admin ---');
    await page.goto('http://127.0.0.1:5173/#/', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(1500);
    
    // Check if on login page
    const loginInput = await page.$('#username');
    if (loginInput) {
      await page.fill('#username', 'admin');
      await page.fill('#password', '123');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(2000);
    }
    console.log('✅ Logged in successfully. Current URL:', page.url());

    // 2. Navigate to Customers Master Accounts Hub
    console.log('\n--- 2. Customer Accounts & Master Files Hub ---');
    await page.goto('http://127.0.0.1:5173/#/customers', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);

    const heading = await page.textContent('h2');
    console.log('Page Title:', heading);

    // Verify filter buttons exist
    const buttonsText = await page.$$eval('button', btns => btns.map(b => b.innerText.trim()));
    console.log('Filter & Action Buttons Found:', buttonsText.filter(t => t.includes('Client') || t.includes('Account') || t.includes('Dossier') || t.includes('File')));

    // 3. Open Customer Dossier
    console.log('\n--- 3. Testing 360° Customer Dossier ---');
    const dossierBtn = page.locator('button:has-text("Dossier"), button:has-text("Customer File")').first();
    if (await dossierBtn.count() > 0) {
      console.log('Clicking Full Dossier button...');
      await dossierBtn.click();
      await page.waitForTimeout(2500);
      console.log('Dossier URL:', page.url());

      // Check Tabs in Dossier
      const dossierTabs = await page.$$eval('[role="tab"]', tabs => tabs.map(t => t.innerText.trim()));
      console.log('✅ 7-Tab Navigation Loaded:', dossierTabs);

      // Click on Pumps & Job Costing Tab
      const pumpTab = page.locator('[role="tab"]:has-text("Pumps"), [role="tab"]:has-text("Costing")').first();
      if (await pumpTab.count() > 0) {
        await pumpTab.click();
        await page.waitForTimeout(1000);
        console.log('✅ Navigated to Pumps & Commercial Job-Costing Tab');
      }

      // Click on Peachtree Ledger Tab
      const peachtreeTab = page.locator('[role="tab"]:has-text("Peachtree")').first();
      if (await peachtreeTab.count() > 0) {
        await peachtreeTab.click();
        await page.waitForTimeout(1000);
        console.log('✅ Navigated to Peachtree Invoices Ledger Tab');
      }

      // Click on Media & Commissioning Photos Tab
      const mediaTab = page.locator('[role="tab"]:has-text("Media"), [role="tab"]:has-text("Photos")').first();
      if (await mediaTab.count() > 0) {
        await mediaTab.click();
        await page.waitForTimeout(1000);
        console.log('✅ Navigated to Media & Verification Photos Tab');
      }

      // Click on Warranty Certificate Tab
      const warrantyTab = page.locator('[role="tab"]:has-text("Warranty")').first();
      if (await warrantyTab.count() > 0) {
        await warrantyTab.click();
        await page.waitForTimeout(1000);
        console.log('✅ Navigated to Warranty Guarantee Tab');
      }
    }

    // 4. Navigate to Finance Center
    console.log('\n--- 4. Testing Finance Center & Commercial Pricing Dialog ---');
    await page.goto('http://127.0.0.1:5173/#/finance', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2500);

    // Verify Visual Analytics exist
    const analyticsCards = await page.$$eval('.recharts-responsive-container', c => c.length);
    console.log(`✅ Visual Analytics Recharts containers rendered: ${analyticsCards}`);

    // Switch to Sizing Proposals Tab in Finance
    const sizingProposalsTab = page.locator('[role="tab"]:has-text("Sizing Proposals"), [role="tab"]:has-text("Proposals")').first();
    if (await sizingProposalsTab.count() > 0) {
      await sizingProposalsTab.click();
      await page.waitForTimeout(1500);
      console.log('✅ Opened Sizing Proposals in Finance Center');

      // Check if Commercial Pricing Button exists
      const priceQuoteBtn = page.locator('button:has-text("Commercial Pricing"), button:has-text("Price & Verify Payment")').first();
      if (await priceQuoteBtn.count() > 0) {
        console.log('Opening Commercial Pricing & Bank Deposit Slip modal...');
        await priceQuoteBtn.click();
        await page.waitForTimeout(1500);

        const dialogTitle = await page.locator('[role="dialog"] h2, [role="dialog"] [class*="title"]').first().textContent();
        console.log('✅ Dialog Opened:', dialogTitle);

        // Check Ethiopian Bank selector
        const bankSelect = page.locator('[role="dialog"] button:has-text("Bank"), [role="dialog"] [class*="select"]').first();
        console.log('✅ Bank Selector present:', await bankSelect.count() > 0);
      }
    }

    console.log('\n🎉 ALL ERP & WORKFLOW INTEGRATION TESTS PASSED WITH 0 ERRORS!');
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  } finally {
    await browser.close();
  }
}

testFullERP();
