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

  console.log('Navigating to page...');
  await page.goto('http://localhost:5173');
  
  await page.waitForSelector('#username');
  await page.fill('#username', 'manager');
  await page.fill('#password', '123');
  
  console.log('Clicking sign in...');
  await page.click('button[type="submit"]');
  
  // Wait 3 seconds to see what happens
  await page.waitForTimeout(3000);
  
  console.log('Current URL:', page.url());
  
  await browser.close();
})();
