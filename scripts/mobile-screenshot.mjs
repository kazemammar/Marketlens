import { chromium } from 'playwright';

const PAGES = [
  { name: 'home',           url: 'http://localhost:3000' },
  { name: 'portfolio',      url: 'http://localhost:3000/portfolio?demo=true' },
  { name: 'movers',         url: 'http://localhost:3000/movers' },
  { name: 'stocks',         url: 'http://localhost:3000/stocks' },
  { name: 'crypto',         url: 'http://localhost:3000/crypto' },
  { name: 'forex',          url: 'http://localhost:3000/forex' },
  { name: 'commodities',    url: 'http://localhost:3000/commodities' },
  { name: 'etf',            url: 'http://localhost:3000/etf' },
  { name: 'news',           url: 'http://localhost:3000/news' },
  { name: 'economics',      url: 'http://localhost:3000/economics' },
  { name: 'watchlist',      url: 'http://localhost:3000/watchlist' },
  { name: 'asset-stock',    url: 'http://localhost:3000/asset/stock/AAPL' },
  { name: 'asset-crypto',   url: 'http://localhost:3000/asset/crypto/BTC' },
  { name: 'asset-commodity', url: 'http://localhost:3000/asset/commodity/CL%3DF' },
];

const VIEWPORT = { width: 375, height: 812 };

async function run() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
  });

  for (const page of PAGES) {
    const tab = await context.newPage();
    console.log(`Screenshotting ${page.name}: ${page.url}`);
    try {
      await tab.goto(page.url, { waitUntil: 'networkidle', timeout: 30000 });
    } catch {
      await tab.goto(page.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    }
    await tab.waitForTimeout(3000);

    // Full page screenshot
    await tab.screenshot({
      path: `screenshots/${page.name}-full.png`,
      fullPage: true,
    });

    // Scroll section screenshots (viewport-sized, overlapping)
    const totalHeight = await tab.evaluate(() => document.body.scrollHeight);
    let scrollY = 0;
    let section = 1;
    while (scrollY < totalHeight && section <= 6) {
      await tab.evaluate((y) => window.scrollTo(0, y), scrollY);
      await tab.waitForTimeout(500);
      await tab.screenshot({
        path: `screenshots/${page.name}-s${section}.png`,
      });
      scrollY += VIEWPORT.height - 100;
      section++;
    }
    await tab.close();
  }

  await browser.close();
  console.log('Done — all screenshots saved to screenshots/');
}

run().catch(console.error);
