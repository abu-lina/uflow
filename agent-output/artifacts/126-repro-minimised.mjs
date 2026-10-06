// Issue #126 — minimised repro. Only variable: whether `pwaPromptDismissed`
// is in localStorage. Everything else (route, auth, onboarding, city) is held
// fixed. Red = tap on the mobile Profile nav icon does nothing.
import { chromium, devices } from '/Users/NARAFIQ/Projects/uflow-wt/126-profile-menu-mobile/node_modules/playwright/index.mjs';
const now = Math.floor(Date.now()/1000);
const jwt = (p) => [Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'),Buffer.from(JSON.stringify(p)).toString('base64url'),'FAKE-SIGNATURE-FOR-TESTING'].join('.');
const user = { id:'00000000-0000-4000-8000-000000000126', aud:'authenticated', role:'authenticated', email:'repro-126@example.test', user_metadata:{}, app_metadata:{}, created_at:new Date().toISOString() };
const session = { access_token: jwt({sub:user.id,role:'authenticated',exp:now+3600}), refresh_token:'FAKE-REFRESH-FOR-TESTING', expires_in:3600, expires_at:now+3600, token_type:'bearer', user };

async function run(dismissed) {
  const b = await chromium.launch();
  const ctx = await b.newContext({ ...devices['iPhone 13'], serviceWorkers:'block' });
  await ctx.addInitScript(({session, dismissed}) => {
    localStorage.setItem('hasSeenSplashScreen','true');
    localStorage.setItem('ummahflow_onboarding', JSON.stringify({email:'r@e.test',waitlistSubmitted:true,earlyAccessUnlocked:true,submittedAt:new Date().toISOString(),waitlistToken:'FAKE-TOKEN-FOR-TESTING'}));
    localStorage.setItem('selectedCity','Berlin');
    if (dismissed) localStorage.setItem('pwaPromptDismissed', String(Date.now()));
    for (const k of ['sb-localhost-auth-token','sb-127-auth-token']) localStorage.setItem(k, JSON.stringify(session));
  }, { session, dismissed });
  await ctx.route(/\/auth\/v1\/(token|user)/, (r) => r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(r.request().url().includes('/user')?user:session)}));
  await ctx.route(/\/rest\/v1\/rpc\/get_provider_count_by_city/, (r) => r.fulfill({status:200,contentType:'application/json',body:'42'}));
  await ctx.route(/\/rest\/v1\//, (r) => r.fulfill({status:200,contentType:'application/json',headers:{'content-range':'0-0/0'},body:'[]'}));
  const p = await ctx.newPage();
  await p.goto('http://localhost:3100/', { waitUntil:'domcontentloaded' });
  await p.waitForTimeout(5000); // PWA prompt fires at +3s

  const pt = (href) => p.evaluate((href) => {
    const a = [...document.querySelectorAll('nav a')].find(a => a.getAttribute('href') === href && getComputedStyle(a).visibility === 'visible');
    if (!a) return null;
    const r = a.getBoundingClientRect();
    const x = Math.round(r.x+r.width/2), y = Math.round(r.y+r.height/2);
    const top = document.elementFromPoint(x,y);
    return { point:[x,y], topmost: top.tagName + ' z=' + getComputedStyle(top).zIndex + ' ' + String(top.className).slice(0,40), hits: top.closest('a') === a };
  }, href);

  const label = `pwaPromptDismissed=${dismissed}`;
  for (const href of ['/profile', '/']) {
    const t = await pt(href);
    const before = new URL(p.url()).pathname;
    await p.touchscreen.tap(t.point[0], t.point[1]);
    await p.waitForTimeout(2500);
    const after = new URL(p.url()).pathname;
    console.log(`[${label}] nav link ${href}: topmost=${t.topmost} hitsLink=${t.hits} tap ${before} -> ${after}  ${after===href ? 'OK' : 'DEAD'}`);
    await p.goto('http://localhost:3100/', { waitUntil:'domcontentloaded' });
    await p.waitForTimeout(5000);
  }

  if (!dismissed) {
    // Dismissing via the X restores interactivity.
    await p.locator('button.pwa-close-btn').click();
    await p.waitForTimeout(500);
    const t = await pt('/profile');
    await p.touchscreen.tap(t.point[0], t.point[1]);
    await p.waitForTimeout(2500);
    console.log(`[${label}] after tapping the prompt's X: tap -> ${new URL(p.url()).pathname}`);
  }
  await b.close();
}
await run(true);
await run(false);
