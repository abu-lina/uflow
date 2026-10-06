import { randomUUID } from 'node:crypto';
import { chromium } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const API = 'http://127.0.0.1:54321';
const ANON = process.env.ANON;
const SVC = process.env.SVC;
const BASE = 'http://127.0.0.1:3100';
const OUT = process.env.OUT;

const ADMIN_EMAIL = `design-548-admin-${randomUUID()}@uflow.test`;
const PW = `design-548-${randomUUID()}`;
const USER_EMAIL = `design-548-user-${randomUUID()}@uflow.test`;

const admin = createClient(API, SVC, { auth: { autoRefreshToken: false, persistSession: false } });

const created = { users: [], providers: [] };

async function main() {
  const { data: au, error: ae } = await admin.auth.admin.createUser({
    email: ADMIN_EMAIL, password: PW, email_confirm: true });
  if (ae) throw ae;
  created.users.push(au.user.id);
  const { error: re } = await admin.from('users').upsert(
    { user_id: au.user.id, email: ADMIN_EMAIL, role: 'admin' }, { onConflict: 'user_id' });
  if (re) throw re;

  const { data: pu, error: pe } = await admin.auth.admin.createUser({
    email: USER_EMAIL, password: PW, email_confirm: true });
  if (pe) throw pe;
  created.users.push(pu.user.id);

  // Seed 3 pending food providers so the list shows a queue
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
    const { error: fe } = await admin.from('food_providers').insert({
      provider_id: data.provider_id, no_alcohol: false, no_pork: false,
      no_gambling: false, verification_method: 'online', has_certificate: false });
    if (fe) throw fe;
  }
  console.log('seeded provider', firstId);

  const browser = await chromium.launch();

  async function session(viewport, locale, ip) {
    const ctx = await browser.newContext({
      viewport, locale,
      extraHTTPHeaders: { 'x-forwarded-for': ip },
    });
    const page = await ctx.newPage();
    const tok = await ctx.request.post(`${API}/auth/v1/token?grant_type=password`, {
      headers: { apikey: ANON, 'Content-Type': 'application/json' },
      data: { email: ADMIN_EMAIL, password: PW },
    });
    if (!tok.ok()) throw new Error('signin failed ' + (await tok.text()));
    const { access_token, refresh_token } = await tok.json();
    const setRes = await ctx.request.post(`${BASE}/api/auth/set`, { data: { access_token, refresh_token } });
    if (!setRes.ok()) throw new Error('cookie set failed ' + setRes.status());
    await ctx.addCookies([
      { name: 'sb-access-token', value: access_token, url: BASE, httpOnly: true, sameSite: 'Lax' },
      { name: 'sb-refresh-token', value: refresh_token, url: BASE, httpOnly: true, sameSite: 'Lax' },
    ]);
    return { ctx, page };
  }

  async function shot(page, name) {
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false });
    console.log('WROTE', name);
  }

  const halalUrl = `${BASE}/dashboard/providers/${firstId}/edit/halal`;

  // 1. Desktop halal footer
  {
    const { ctx, page } = await session({ width: 1440, height: 900 }, 'de-DE', '10.240.1.1');
    await page.goto(halalUrl, { waitUntil: 'networkidle' }).catch(() => {});
    await shot(page, '01-halal-footer-desktop-1440');
    await ctx.close();
  }
  // 2. Mobile halal footer
  {
    const { ctx, page } = await session({ width: 390, height: 844 }, 'de-DE', '10.240.1.2');
    await page.goto(halalUrl, { waitUntil: 'networkidle' }).catch(() => {});
    await shot(page, '02-halal-footer-mobile-390');
    // scrolled to bottom, to show occlusion
    await page.evaluate(() => {
      const m = document.querySelector('main');
      if (m) m.scrollTop = m.scrollHeight;
    });
    await shot(page, '03-halal-footer-mobile-scrolled-bottom');
    await ctx.close();
  }
  // 3. RTL (ar)
  {
    const { ctx, page } = await session({ width: 390, height: 844 }, 'ar', '10.240.1.3');
    await page.goto(`${BASE}/?lang=ar`, { waitUntil: 'domcontentloaded' }).catch(() => {});
    await page.evaluate(() => {
      try { localStorage.setItem('language', 'ar'); } catch {}
      try { localStorage.setItem('uflow-language', 'ar'); } catch {}
      try { localStorage.setItem('i18nextLng', 'ar'); } catch {}
    });
    await page.goto(halalUrl, { waitUntil: 'networkidle' }).catch(() => {});
    await shot(page, '04-halal-footer-rtl-ar-mobile');
    const dir = await page.evaluate(() => document.documentElement.dir || document.body.dir || 'unset');
    console.log('RTL dir attribute =', dir);
    await ctx.close();
  }
  // 4. Provider list card actions (desktop, moderation mode)
  {
    const { ctx, page } = await session({ width: 1440, height: 900 }, 'de-DE', '10.240.1.4');
    await page.goto(`${BASE}/food?status=pending`, { waitUntil: 'networkidle' }).catch(() => {});
    await shot(page, '05-provider-list-card-actions-desktop');
    await ctx.close();
  }
  // 5. Provider list card on mobile (to prove actions are hidden sm:)
  {
    const { ctx, page } = await session({ width: 390, height: 844 }, 'de-DE', '10.240.1.5');
    await page.goto(`${BASE}/food?status=pending`, { waitUntil: 'networkidle' }).catch(() => {});
    await shot(page, '06-provider-list-card-mobile-no-actions');
    await ctx.close();
  }
  // 6. Community-services footer for comparison
  {
    const { data: cs } = await admin.from('community_services').select('id').limit(1);
    if (cs && cs.length) {
      const { ctx, page } = await session({ width: 390, height: 844 }, 'de-DE', '10.240.1.6');
      await page.goto(`${BASE}/dashboard/community-services/${cs[0].id}/edit`, { waitUntil: 'networkidle' }).catch(() => {});
      await shot(page, '07-community-services-footer-mobile');
      await ctx.close();
    } else {
      console.log('NO community_services row to screenshot');
    }
  }

  await browser.close();
}

main()
  .catch((e) => { console.error('FAILED', e); process.exitCode = 1; })
  .finally(async () => {
    for (const id of created.providers) {
      await admin.from('pending_enrichments').delete().eq('provider_id', id);
      await admin.from('food_providers').delete().eq('provider_id', id);
      await admin.from('providers').delete().eq('provider_id', id);
    }
    for (const u of created.users) await admin.auth.admin.deleteUser(u);
    console.log('cleaned up');
  });
