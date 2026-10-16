const puppeteer = require('puppeteer-core');

async function takeScreenshots() {
  const browser = await puppeteer.launch({
    executablePath: '/usr/local/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });

  try {
    // Screenshot 1: Login page
    console.log('Taking screenshot: login page');
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle0', timeout: 10000 });
    await page.screenshot({ path: '/tmp/screenshot-1-login.png', fullPage: false });

    // Login
    await page.type('input[type="password"]', 'mvo2024');
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 });

    // Screenshot 2: Dashboard
    console.log('Taking screenshot: dashboard');
    await page.screenshot({ path: '/tmp/screenshot-2-dashboard.png', fullPage: false });

    // Screenshot 3: New client page (AI URL input)
    console.log('Taking screenshot: new client AI input');
    await page.goto('http://localhost:3000/klanten/nieuw', { waitUntil: 'networkidle0', timeout: 10000 });
    await page.screenshot({ path: '/tmp/screenshot-3-nieuwe-klant-ai.png', fullPage: true });

    // Screenshot 4: Fill in URL
    console.log('Taking screenshot: URL filled in');
    await page.type('input[type="text"]', 'https://example-bedrijf.nl');
    await page.screenshot({ path: '/tmp/screenshot-4-url-input.png', fullPage: false });

    console.log('Screenshots completed!');
  } catch (error) {
    console.error('Screenshot error:', error);
  } finally {
    await browser.close();
  }
}

takeScreenshots();
