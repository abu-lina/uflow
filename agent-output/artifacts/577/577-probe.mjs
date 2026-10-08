import { chromium } from '/Users/NARAFIQ/Projects/uflow/node_modules/playwright/index.mjs';

const BASE = 'https://uat.ummahflow.com';

function probe(page) {
  return page.evaluate(() => {
    const out = [];
    const sel = 'h1,h2,p,label,input,button,a,span';
    document.querySelectorAll(sel).forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      const cs = getComputedStyle(el);
      const txt = (el.tagName === 'INPUT' ? el.placeholder : el.textContent || '').trim().slice(0, 60);
      if (!txt) return;
      out.push(`${el.tagName.toLowerCase().padEnd(6)} ${cs.fontSize.padStart(7)} lh=${cs.lineHeight.padStart(7)} w=${Math.round(r.width).toString().padStart(4)} | ${txt}`);
    });
    const main = document.querySelector('main');
    const mw = main ? Math.round(main.getBoundingClientRect().width) : -1;
    return { out, mw, html: document.documentElement.lang };
  });
}

const browser = await chromium.launch();
for (const vp of [{ width: 390, height: 844 }, { width: 1280, height: 900 }]) {
  const ctx = await browser.newContext({ locale: 'en-US', viewport: vp });
  for (const path of ['/login', '/signup']) {
    const page = await ctx.newPage();
    await page.goto(BASE + path, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    const r = await probe(page);
    console.log(`\n===== ${path} @ ${vp.width}x${vp.height} (main width ${r.mw}, lang=${r.html})`);
    console.log(r.out.join('\n'));
    await page.close();
  }
  await ctx.close();
}
await browser.close();
