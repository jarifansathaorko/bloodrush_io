const http = require('http');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/') reqPath = '/index.html';
  const filePath = path.join(__dirname, reqPath);
  const ext = path.extname(filePath);
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.json': 'application/json',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.svg': 'image/svg+xml'
  };
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(3000, async () => {
  console.log('Test server running at http://localhost:3000');
  try {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    const errors = [];
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => {
      console.log('PAGE ERROR:', err.message);
      errors.push(err.message);
    });
    page.on('requestfailed', req => {
      console.log('REQUEST FAILED:', req.url(), req.failure()?.errorText);
    });

    console.log('Navigating to game...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    console.log('Page loaded successfully!');

    // Type name and click play
    await page.type('#input-player-name', 'SpeedTest');
    await page.click('#btn-play');
    console.log('Clicked Play! Simulating gameplay for 6 seconds...');
    
    // Simulate mouse movements to move player
    for (let i = 0; i < 10; i++) {
      await page.mouse.move(100 + i * 50, 100 + (i % 3) * 60);
      await new Promise(r => setTimeout(r, 600));
    }

    console.log('Checking game state...');
    await page.evaluate(() => {
      if (window.game) {
        console.log('Entities count:', window.game.enemyManager?.enemies?.length);
        console.log('Foods count:', window.game.foodMgr?.foods?.length);
      }
    });

    await browser.close();
    console.log('Browser closed cleanly. Error count:', errors.length);
    server.close();
    if (errors.length > 0) {
      process.exit(1);
    }
  } catch (e) {
    console.error('Test failed:', e);
    server.close();
    process.exit(1);
  }
});
