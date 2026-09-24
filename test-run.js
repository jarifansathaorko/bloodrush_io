const puppeteer = require('puppeteer');

(async () => {
  console.log("Launching browser...");
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  page.on('requestfailed', request =>
    console.log('REQUEST FAILED:', request.url(), request.failure().errorText)
  );
  
  console.log("Navigating to http://localhost:3000...");
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  
  console.log("Clicking play button...");
  // Try to type a name and click play
  try {
    await page.type('#input-player-name', 'TestBot');
    await page.click('#btn-play');
    console.log("Waiting 3 seconds...");
    await new Promise(r => setTimeout(r, 3000));
    await page.click('#btn-play');
  } catch (e) {
    console.log("Error interacting:", e.message);
  }

  console.log("Waiting 5 seconds to catch runtime errors...");
  await new Promise(r => setTimeout(r, 5000));
  
  await browser.close();
  console.log("Done.");
})();
