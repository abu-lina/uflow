import { chromium } from '/Users/NARAFIQ/Projects/uflow/node_modules/playwright/index.mjs';
const BASE = 'https://uat.ummahflow.com';
const browser = await chromium.launch();
const ctx = await browser.newContext({ locale: 'de-DE', viewport: { width: 390, height: 844 } });
for (const path of ['/login', '/signup']) {
  const page = await ctx.newPage();
  await page.goto(BASE + path, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const r = await page.evaluate(() => {
    const h2 = document.querySelector('h2');
    const p = h2?.parentElement?.querySelector('p');
    const main = document.querySelector('main');
    const col = h2?.closest('div[class*="max-w"]');
    const box = el => el ? { w: Math.round(el.getBoundingClientRect().width), h: Math.round(el.getBoundingClientRect().height), top: Math.round(el.getBoundingClientRect().top), lines: el.getClientRects ? el.getClientRects().length : 0, cls: el.className?.toString().slice(0,120) } : null;
    const lineCount = el => el ? Math.round(el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight)) : 0;
    return {
      h2: box(h2), h2lines: lineCount(h2), h2text: h2?.textContent,
      p: box(p), plines: lineCount(p),
      col: box(col), main: box(main),
      mainCls: main?.className?.toString().slice(0,200),
      scrollTop: Math.round(document.scrollingElement.scrollTop),
    };
  });
  console.log(path, JSON.stringify(r, null, 1));
  await page.close();
}
await browser.close();
