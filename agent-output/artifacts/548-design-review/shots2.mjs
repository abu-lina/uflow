import { randomUUID } from 'node:crypto';
import { chromium } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const API = 'http://127.0.0.1:54321';
const ANON = process.env.ANON;
const SVC = process.env.SVC;
const BASE = 'http://127.0.0.1:3100';
const OUT = process.env.OUT;

const ADMIN_EMAIL = `design-548b-admin-${randomUUID()}@uflow.test`;
const PW = `design-548b-${randomUUID()}`;
const USER_EMAIL = `design-548b-user-${randomUUID()}@uflow.test`;
const admin = createClient(API, SVC, { auth: { autoRefreshToken: false, persistSession: false } });
const created = { users: [], providers: [] };

async function main() {
  const { data: au, error: ae } = await admin.auth.admin.createUser({
    email: ADMIN_EMAIL, password: PW, email_confirm: true });
  if (ae) throw ae;
  created.users.push(au.user.id);
  await admin.from('users').upsert({ user_id: au.user.id, email: ADMIN_EMAIL, role: 'admin' }, { onConflict: 'user_id' });
  const { data: pu } = await admin.auth.admin.createUser({ email: USER_EMAIL, password: PW, email_confirm: true });
  created.users.push(pu.user.id);

  let firstId = null;
  for (let i = 0; i < 3; i++) {
    const { data, error } = await admin.from('providers').insert({
      provider_name: `Design Review 548 Restaurant ${i + 1}`,
      listing_type: 'food', address_city: 'Berlin', show_address: true,
      review_status: 'pending', user_created_id: pu.user.id,
    }).select('provider_id').single();
    if (error) throw error;
    created.providers.push(data.provider_id);
    if (!firstId) firstId = data.provider_id;
    await admin.from('food_providers').insert({ provider_id: data.provider_id,
      no_alcohol: false, no_pork: false, no_gambling: false,
      verification_method: 'online', has_certificate: false });
  }
  console.log('seeded', firstId);

  const tokRes = await fetch(`${API}/auth/v1/token?grant_type=password`, {
    method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: PW }),
  });
  const tok = await tokRes.json();
  const session = {
    access_token: tok.access_token, refresh_token: tok.refresh_token,
    expires_in: tok.expires_in, expires_at: Math.floor(Date.now() / 1000) + tok.expires_in,
    token_type: 'bearer', user: tok.user,
  };

  const browser = await chromium.launch();

  async function session_ctx(viewport, ip) {
    const ctx = await browser.newContext({ viewport, locale: 'de-DE',
      extraHTTPHeaders: { 'x-forwarded-for': ip } });
    // Hydrate the browser-side supabase session (localStorage) AND cookies.
    await ctx.addInitScript((s) => {
      const payload = JSON.stringify({ currentSession: s, expiresAt: s.expires_at });
      for (const k of ['sb-127-auth-token', 'sb-localhost-auth-token', 'supabase.auth.token']) {
        try { localStorage.setItem(k, k === 'supabase.auth.token' ? payload : JSON.stringify(s)); } catch {}
      }
    }, session);
    await ctx.request.post(`${BASE}/api/auth/set`, { data: { access_token: session.access_token, refresh_token: session.refresh_token } });
    await ctx.addCookies([
      { name: 'sb-access-token', value: session.access_token, url: BASE, httpOnly: true, sameSite: 'Lax' },
      { name: 'sb-refresh-token', value: session.refresh_token, url: BASE, httpOnly: true, sameSite: 'Lax' },
    ]);
    const page = await ctx.newPage();
    return { ctx, page };
  }

  async function shot(page, name) {
    await page.waitForTimeout(4000);
    await page.screenshot({ path: `${OUT}/${name}.png` });
    console.log('WROTE', name);
  }

  for (const [name, vp, ip] of [
    ['08-provider-list-moderation-desktop', { width: 1440, height: 900 }, '10.241.1.1'],
    ['09-provider-list-moderation-mobile', { width: 390, height: 844 }, '10.241.1.2'],
  ]) {
    const { ctx, page } = await session_ctx(vp, ip);
    await page.goto(`${BASE}/food?status=pending`, { waitUntil: 'networkidle' }).catch(() => {});
    await shot(page, name);
    const seen = await page.evaluate(() => document.body.innerText.includes('Design Review 548'));
    console.log(name, 'cards visible =', seen);
    await ctx.close();
  }

  await browser.close();
}

main().catch((e) => { console.error('FAILED', e); process.exitCode = 1; })
  .finally(async () => {
    for (const id of created.providers) {
      await admin.from('pending_enrichments').delete().eq('provider_id', id);
      await admin.from('food_providers').delete().eq('provider_id', id);
      await admin.from('providers').delete().eq('provider_id', id);
    }
    for (const u of created.users) await admin.auth.admin.deleteUser(u);
    console.log('cleaned up');
  });
