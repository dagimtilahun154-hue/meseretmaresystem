const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));
  page.on('requestfailed', request =>
    console.log('REQUEST FAILED:', request.url(), request.failure().errorText)
  );
  page.on('response', response => {
    if (response.status() >= 400) {
      console.log(`RESPONSE ERROR [${response.status()}]:`, response.url());
    }
  });

  await page.goto('http://localhost:5173/');
  
  await page.waitForSelector('#username');
  await page.fill('#username', 'manager');
  await page.fill('#password', '123');
  await page.click('button[type="submit"]');

  await page.waitForSelector('text=Dashboard');
  console.log('Logged in!');

  await page.click('text=Inventory');
  console.log('Clicked Inventory');
  
  // Wait a bit to see if products load
  await page.waitForTimeout(5000);
  
  await browser.close();
})();
