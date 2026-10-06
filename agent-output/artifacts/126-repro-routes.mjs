// Issue #126 feedback loop: is the mobile Profile nav icon hit-testable, and
// does tapping it reach /profile?
//
// Usage:  node /tmp/126-repro.mjs [baseURL]
// Needs:  a dev server on baseURL (see /tmp/126-dev.sh)
//
// For each route it prints:
//   TOPMOST  = what document.elementFromPoint() returns at the centre of the
//              visible Profile nav link (i.e. what a real finger would hit)
//   TAP      = URL after a real tap at that point
import { chromium, devices } from '/Users/NARAFIQ/Projects/uflow-wt/126-profile-menu-mobile/node_modules/playwright/index.mjs';

const BASE = process.argv[2] ?? 'http://127.0.0.1:3100';
const ROUTES = process.env.ROUTES?.split(',') ?? ['/', '/food', '/saved', '/create'];
const LOGGED_IN = process.env.LOGGED_IN !== '0';
const DISMISS_PWA = process.env.DISMISS_PWA !== '0';

const now = Math.floor(Date.now() / 1000);
const jwt = (payload) =>
  [
    Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'),
    Buffer.from(JSON.stringify(payload)).toString('base64url'),
    'FAKE-SIGNATURE-FOR-TESTING',
  ].join('.');

const user = {
  id: '00000000-0000-4000-8000-000000000126',
  aud: 'authenticated',
  role: 'authenticated',
  email: 'repro-126@example.test',
  user_metadata: { full_name: 'Repro OneTwoSix' },
  app_metadata: {},
  created_at: new Date().toISOString(),
};
const session = {
  access_token: jwt({ sub: user.id, role: 'authenticated', exp: now + 3600 }),
  refresh_token: 'FAKE-REFRESH-FOR-TESTING',
  expires_in: 3600,
  expires_at: now + 3600,
  token_type: 'bearer',
  user,
};

const browser = await chromium.launch();
const ctx = await browser.newContext({
  ...devices['iPhone 13'],
  // devices[] sets webkit UA strings; keep touch + mobile viewport, chromium engine
  serviceWorkers: 'block',
});

await ctx.addInitScript(
  ({ session, loggedIn, dismissPwa }) => {
    try {
      localStorage.setItem('hasSeenSplashScreen', 'true');
      localStorage.setItem(
        'ummahflow_onboarding',
        JSON.stringify({
          email: 'repro-126@example.test',
          waitlistSubmitted: true,
          earlyAccessUnlocked: true,
          submittedAt: new Date().toISOString(),
          waitlistToken: 'FAKE-TOKEN-FOR-TESTING',
        }),
      );
      localStorage.setItem('selectedCity', 'Berlin');
      if (dismissPwa) localStorage.setItem('pwaPromptDismissed', String(Date.now()));
      if (loggedIn) {
        const payload = JSON.stringify(session);
        for (const key of [
          'sb-localhost-auth-token',
          'sb-127-auth-token',
          'supabase.auth.token',
        ]) {
          localStorage.setItem(key, payload);
        }
      }
    } catch {}
  },
  { session, loggedIn: LOGGED_IN, dismissPwa: DISMISS_PWA },
);

// Stub every Supabase call so the app behaves like a healthy logged-in session.
await ctx.route(/\/auth\/v1\/(token|user)/, (route) =>
  route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(route.request().url().includes('/user') ? user : session),
  }),
);
await ctx.route(/\/rest\/v1\/rpc\/get_provider_count_by_city/, (route) =>
  route.fulfill({ status: 200, contentType: 'application/json', body: '42' }),
);
await ctx.route(/\/rest\/v1\//, (route) =>
  route.fulfill({
    status: 200,
    contentType: 'application/json',
    headers: { 'content-range': '0-0/0' },
    body: '[]',
  }),
);

const page = await ctx.newPage();
page.on('console', (m) => {
  if (process.env.VERBOSE) console.log('   [console]', m.text().slice(0, 200));
});

const probe = `(() => {
  const links = [...document.querySelectorAll('nav a')].filter((a) => {
    const h = a.getAttribute('href') || '';
    return h === '/profile' || h === '/login';
  });
  return links.map((a) => {
    const r = a.getBoundingClientRect();
    const cs = getComputedStyle(a);
    const navCs = getComputedStyle(a.closest('nav'));
    const x = Math.round(r.x + r.width / 2);
    const y = Math.round(r.y + r.height / 2);
    const top = document.elementFromPoint(x, y);
    const topLink = top && top.closest ? top.closest('a,button') : null;
    return {
      href: a.getAttribute('href'),
      nav: a.closest('nav').parentElement.className,
      rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)],
      visibility: cs.visibility,
      navVisibility: navCs.visibility,
      point: [x, y],
      topmost: top ? top.tagName + '.' + (top.className || '').toString().slice(0, 60) : null,
      topmostIsThisLink: topLink === a,
      topmostLinkHref: topLink ? topLink.getAttribute('href') : null,
      topmostZ: top ? getComputedStyle(top).zIndex : null,
    };
  });
})()`;

for (const route of ROUTES) {
  console.log(`\n=== ${route}  (loggedIn=${LOGGED_IN} dismissPwa=${DISMISS_PWA}) ===`);
  await page.goto(BASE + route, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4500); // let auth, stage, PWA prompt (3s) settle
  const slot = await page
    .locator('.mobile-bottom-ui-slot')
    .getAttribute('data-mobile-ui')
    .catch(() => null);
  console.log('  data-mobile-ui =', slot);
  const found = await page.evaluate(probe);
  if (!found.length) {
    console.log('  NO profile link in any <nav>');
    continue;
  }
  for (const f of found) {
    console.log(
      `  link href=${f.href} vis=${f.visibility}/${f.navVisibility} rect=${f.rect} ` +
        `TOPMOST=${f.topmost} z=${f.topmostZ} hitsLink=${f.topmostIsThisLink} (href=${f.topmostLinkHref})`,
    );
  }
  const target = found.find((f) => f.visibility === 'visible');
  if (!target) {
    console.log('  no VISIBLE profile link -> nothing for the user to tap');
    continue;
  }
  const before = page.url();
  await page.touchscreen.tap(target.point[0], target.point[1]);
  await page.waitForTimeout(2500);
  console.log(`  TAP ${target.point} : ${new URL(before).pathname} -> ${new URL(page.url()).pathname}`);
}

await browser.close();
