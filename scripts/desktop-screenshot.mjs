import { chromium } from 'playwright';

const PAGES = [
  { name: 'home', url: 'http://localhost:3000' },
  { name: 'portfolio', url: 'http://localhost:3000/portfolio?demo=true' },
  { name: 'movers', url: 'http://localhost:3000/movers' },
  { name: 'stocks', url: 'http://localhost:3000/stocks' },
  { name: 'crypto', url: 'http://localhost:3000/crypto' },
  { name: 'forex', url: 'http://localhost:3000/forex' },
  { name: 'commodities', url: 'http://localhost:3000/commodities' },
  { name: 'etf', url: 'http://localhost:3000/etf' },
  { name: 'news', url: 'http://localhost:3000/news' },
  { name: 'economics', url: 'http://localhost:3000/economics' },
  { name: 'watchlist', url: 'http://localhost:3000/watchlist' },
  { name: 'asset-stock', url: 'http://localhost:3000/asset/stock/AAPL' },
  { name: 'asset-crypto', url: 'http://localhost:3000/asset/crypto/BTC' },
  { name: 'asset-commodity', url: 'http://localhost:3000/asset/commodity/CL%3DF' },
  { name: 'asset-forex', url: 'http://localhost:3000/asset/forex/EUR%2FUSD' },
  { name: 'asset-etf', url: 'http://localhost:3000/asset/etf/SPY' },
];

const VIEWPORT = { width: 1440, height: 900 };

async function run() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 2 });

  for (const page of PAGES) {
    const tab = await context.newPage();
    console.log(`📸 ${page.name}: ${page.url}`);
    try {
      await tab.goto(page.url, { waitUntil: 'networkidle', timeout: 30000 });
    } catch {
      await tab.goto(page.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    }
    await tab.waitForTimeout(3000);
    await tab.screenshot({ path: `screenshots/desktop-${page.name}-full.png`, fullPage: true });
    const totalHeight = await tab.evaluate(() => document.body.scrollHeight);
    let scrollY = 0, section = 1;
    while (scrollY < totalHeight && section <= 8) {
      await tab.evaluate((y) => window.scrollTo(0, y), scrollY);
      await tab.waitForTimeout(400);
      await tab.screenshot({ path: `screenshots/desktop-${page.name}-s${section}.png` });
      scrollY += VIEWPORT.height - 100;
      section++;
    }
    await tab.close();
  }
  await browser.close();
  console.log('✅ Done');
}
run().catch(console.error);
