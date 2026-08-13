const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    console.log(`[BROWSER CONSOLE] ${msg.type().toUpperCase()}: ${msg.text()}`);
  });

  page.on('pageerror', err => {
    console.error(`[BROWSER PAGEERROR]:`, err);
  });

  console.log('Logging in as tech_leader...');
  await page.goto('http://localhost:5173');
  await page.waitForSelector('#username');
  await page.fill('#username', 'tech_leader');
  await page.fill('#password', '123');
  await page.click('button[type="submit"]');

  console.log('Waiting for redirect/dashboard...');
  await page.waitForTimeout(4000);
  console.log('Current URL after login:', page.url());

  console.log('Navigating to fieldwork jobs...');
  await page.goto('http://localhost:5173/#/fieldwork/jobs');
  await page.waitForTimeout(3000);

  // Click on the first accordion trigger if needed
  const accordionTrigger = page.locator('button[data-state="closed"]').first();
  if (await accordionTrigger.count() > 0) {
    console.log('Expanding fieldwork details...');
    await accordionTrigger.click();
    await page.waitForTimeout(1000);
  }

  // Check if Mark Completed button is visible and click it
  const completeButton = page.locator('text=Mark Completed').first();
  if (await completeButton.count() > 0 && await completeButton.isVisible()) {
    console.log('Clicking Mark Completed...');
    await completeButton.click();
    await page.waitForTimeout(3000);
  } else {
    console.log('Mark Completed button not found or not visible.');
    const buttons = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('button')).map(b => b.innerText);
    });
    console.log('All buttons on page:', buttons);
  }

  await browser.close();
})();
