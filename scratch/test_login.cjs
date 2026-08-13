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
  await page.goto('http://localhost:5174');
  
  await page.waitForSelector('#username');
  await page.fill('#username', 'manager');
  await page.fill('#password', '123');
  
  console.log('Clicking sign in...');
  await page.click('button[type="submit"]');
  
  // Wait 5 seconds to see what happens
  await page.waitForTimeout(5000);

  const localState = await page.evaluate(() => {
    const header = document.querySelector('h2.text-2xl');
    return {
      url: window.location.href,
      headerText: header ? header.textContent : 'NOT FOUND',
      bodyText: document.body.innerText.substring(0, 500)
    };
  });
  console.log('State dump:', JSON.stringify(localState, null, 2));
  
  await browser.close();
})();
