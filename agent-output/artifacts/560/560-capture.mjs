// Issue #560 — browser evidence: read-only status badge + Save gating.
// Real local Supabase, real admin session: password grant -> cookies via
// /api/auth/set (SSR) AND supabase-js session JSON in localStorage (client),
// which is what AuthProvider/useIsAdmin actually read.
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

// Keys come only from the repo's gitignored .env.local (three levels up from
// agent-output/artifacts/560/). Nothing credential-shaped is hardcoded here.
const repoRoot = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..', '..');
const envPath = join(repoRoot, '.env.local');
const env = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split('\n').filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; }),
);
const apiUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
const BASE = 'http://localhost:3000';

// S1 hard gate: this script mints an email-confirmed admin account with the
// service-role key. It must never run against a remote project. Assert the
// target is loopback before any client is constructed or request is made.
const supabaseHost = new URL(apiUrl).hostname;
if (!['localhost', '127.0.0.1', '::1'].includes(supabaseHost)) {
  console.error(
    `Refusing to run: NEXT_PUBLIC_SUPABASE_URL resolves to "${supabaseHost}", ` +
      'not localhost/127.0.0.1. This script creates a real admin user via the ' +
      'service-role key and is only safe against a local Supabase stack.',
  );
  process.exit(1);
}

const { createClient } = await import(
  join(repoRoot, 'node_modules', '@supabase', 'supabase-js', 'dist', 'index.mjs')
);
const { chromium } = await import(
  join(repoRoot, 'node_modules', 'playwright', 'index.mjs')
);

// Runtime-generated password, never persisted. Printed so a human can reuse
// the session for manual inspection.
const email = '560-shot-admin@uflow.test';
const password = `560-shot-${randomBytes(24).toString('hex')}`;
const admin = createClient(apiUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
let userId;
const { data: created, error: cErr } = await admin.auth.admin.createUser({
  email, password, email_confirm: true,
});
if (cErr && !/already/i.test(cErr.message)) throw cErr;
if (cErr) {
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const u = data.users.find((x) => x.email === email);
  userId = u.id;
  await admin.auth.admin.updateUserById(userId, { password });
} else {
  userId = created.user.id;
}
const { error: rErr } = await admin
  .from('users')
  .upsert({ user_id: userId, email, role: 'admin' }, { onConflict: 'user_id' });
if (rErr) throw rErr;
console.log('admin user:', email, userId);
console.log('admin password (this run only, not persisted):', password);

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block' });

const tokenRes = await ctx.request.post(`${apiUrl}/auth/v1/token?grant_type=password`, {
  headers: { apikey: anonKey, 'Content-Type': 'application/json' },
  data: { email, password },
});
if (!tokenRes.ok()) throw new Error('token grant failed: ' + (await tokenRes.text()));
const grant = await tokenRes.json();
const session = {
  access_token: grant.access_token,
  refresh_token: grant.refresh_token,
  token_type: grant.token_type ?? 'bearer',
  expires_in: grant.expires_in ?? 3600,
  expires_at: grant.expires_at ?? Math.floor(Date.now() / 1000) + (grant.expires_in ?? 3600),
  user: grant.user,
};
await ctx.request.post(`${BASE}/api/auth/set`, {
  data: { access_token: grant.access_token, refresh_token: grant.refresh_token },
});
await ctx.addCookies([
  { name: 'sb-access-token', value: grant.access_token, url: BASE, httpOnly: true, sameSite: 'Lax' },
  { name: 'sb-refresh-token', value: grant.refresh_token, url: BASE, httpOnly: true, sameSite: 'Lax' },
]);

const page = await ctx.newPage();
await page.addInitScript((sessionJson) => {
  localStorage.setItem('hasSeenSplashScreen', 'true');
  localStorage.setItem('ummahflow_onboarding', JSON.stringify({
    email: 'shot@uflow.test', waitlistSubmitted: true, earlyAccessUnlocked: true,
    submittedAt: new Date().toISOString(), waitlistToken: 'TEST-TOKEN',
  }));
  for (const k of ['sb-127-auth-token', 'sb-localhost-auth-token']) {
    localStorage.setItem(k, sessionJson);
  }
}, JSON.stringify(session));

const shot = async (url, name) => {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(7000); // role fetch + search + paint
  const stats = await page.evaluate(() => {
    const badgeTexts = ['pending', 'approved', 'rejected', 'needs revision'];
    const badges = [...document.querySelectorAll('span')].filter(
      (e) => badgeTexts.includes(e.textContent?.trim().toLowerCase() ?? ''),
    ).length;
    const saves = [...document.querySelectorAll('button')].filter(
      (b) => /^(save|saved)$/i.test(b.getAttribute('aria-label') ?? ''),
    ).length;
    const loggedIn = !document.body.innerText.includes('Register');
    return { badges, saves, loggedIn };
  });
  console.log(`${name}:`, JSON.stringify(stats), page.url());
  await page.screenshot({
    path: join(repoRoot, 'agent-output', 'artifacts', '560', `${name}.png`),
    fullPage: false,
  });
};

await shot(`${BASE}/food?status=pending`, '560-filtered-pending-badge-no-save');
await shot(`${BASE}/food`, '560-all-tab-badge-and-save');

await browser.close();
console.log('done');
